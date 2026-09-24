"""Sequential automatic synchronization of CTRL + CD training documents."""

from __future__ import annotations

from pathlib import Path
from threading import BoundedSemaphore
from uuid import uuid4

from agent import TrainingVectorizationError
from training_docs import DEFAULT_MANIFEST_PATH, DEFAULT_SOURCE_DIR, discover_documents, load_manifest, write_manifest

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class TrainingSynchronizer:
    def __init__(self, agent, source_dir: Path = DEFAULT_SOURCE_DIR, manifest_path: Path = DEFAULT_MANIFEST_PATH):
        self.agent = agent
        self.source_dir = source_dir
        self.manifest_path = manifest_path
        self._semaphore = BoundedSemaphore(1)

    def run(self) -> dict:
        if not self._semaphore.acquire(blocking=False):
            return {"status": "already_running", "processed": 0, "succeeded": 0, "failed": 0}
        try:
            manifest = load_manifest(self.manifest_path)
            documents = discover_documents(self.source_dir, manifest)
            manifest["documents"] = {item["relativePath"]: item for item in documents}
            write_manifest(manifest, self.manifest_path)
            summary = {"status": "completed", "processed": 0, "succeeded": 0, "failed": 0}
            for document in documents:
                if document["status"] == "vectorized":
                    continue
                summary["processed"] += 1
                self._process_document(document, manifest)
                if document["status"] == "vectorized":
                    summary["succeeded"] += 1
                else:
                    summary["failed"] += 1
                write_manifest(manifest, self.manifest_path)
            return summary
        finally:
            self._semaphore.release()

    def _process_document(self, document: dict, manifest: dict) -> None:
        relative_path = document["relativePath"]
        path = self.source_dir / relative_path
        attempts = document.get("attempts", 0) + 1
        document["attempts"] = attempts
        document["status"] = "uploading"
        document["errorCode"] = None
        manifest["documents"][relative_path] = document
        try:
            object_key = document.get("objectKey") or f"uploads/{uuid4()}{document['extension']}"
            document["objectKey"] = object_key
            manifest["documents"][relative_path] = document
            result = self.agent.sync_training_document(
                path,
                object_key,
                CONTENT_TYPES[document["extension"]],
                document["size"],
            )
            document.update(
                {
                    "status": "vectorized",
                    "errorCode": None,
                    "fileType": result["fileType"],
                    "totalChunks": result["totalChunks"],
                    "totalVectorsStored": result["totalVectorsStored"],
                    "indexName": result["indexName"],
                    "indexCreated": result["indexCreated"],
                }
            )
        except TrainingVectorizationError as error:
            document["status"] = "error"
            document["errorCode"] = _safe_error_code(error)
        except OSError:
            document["status"] = "error"
            document["errorCode"] = "TRAINING_DOCUMENT_READ_FAILED"
        manifest["documents"][relative_path] = document


def _safe_error_code(error: TrainingVectorizationError) -> str:
    message = str(error).lower()
    if "tempo limite" in message:
        return "TRAINING_TIMEOUT"
    if "autorizar" in message:
        return "TRAINING_UPLOAD_AUTHORIZATION_FAILED"
    if "enviar" in message or "armazenamento" in message:
        return "TRAINING_S3_UPLOAD_FAILED"
    if "vetor" in message:
        return "TRAINING_VECTORIZATION_FAILED"
    return "TRAINING_SYNC_FAILED"
