"""Discovery and local manifest for CTRL + CD training documents."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

SUPPORTED_EXTENSIONS = {".pdf", ".xlsx"}
EXCLUDED_DOCUMENTS = {"NE03-007.pdf"}
HASH_CHUNK_BYTES = 1024 * 1024
DEFAULT_SOURCE_DIR = Path(__file__).resolve().parent / "docs" / "training_docs"
DEFAULT_MANIFEST_PATH = Path(__file__).resolve().parent / ".training_docs_manifest.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(HASH_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(path: Path = DEFAULT_MANIFEST_PATH) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {"version": 1, "documents": {}}
    if not isinstance(data, dict) or not isinstance(data.get("documents"), dict):
        return {"version": 1, "documents": {}}
    return {"version": 1, "documents": data["documents"]}


def write_manifest(manifest: dict, path: Path = DEFAULT_MANIFEST_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        json.dump(manifest, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, path)


def discover_documents(
    source_dir: Path = DEFAULT_SOURCE_DIR,
    manifest: dict | None = None,
) -> list[dict]:
    previous = (manifest or {}).get("documents", {})
    documents = []
    if not source_dir.is_dir():
        return documents

    for path in sorted(source_dir.iterdir(), key=lambda item: item.name.casefold()):
        if not path.is_file() or path.name in EXCLUDED_DOCUMENTS or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        relative_path = path.name
        try:
            size = path.stat().st_size
            digest = sha256_file(path)
        except OSError:
            documents.append(
                {
                    "relativePath": relative_path,
                    "extension": path.suffix.lower(),
                    "size": 0,
                    "sha256": "",
                        "objectKey": None,
                    "status": "error",
                    "attempts": 0,
                    "errorCode": "TRAINING_DOCUMENT_READ_FAILED",
                }
            )
            continue

        old = previous.get(relative_path, {})
        unchanged = old.get("sha256") == digest and old.get("status") == "vectorized"
        documents.append(
            {
                "relativePath": relative_path,
                "extension": path.suffix.lower(),
                "size": size,
                "sha256": digest,
                "objectKey": old.get("objectKey") if old.get("sha256") == digest else None,
                "status": "vectorized" if unchanged else "discovered",
                "attempts": int(old.get("attempts", 0)) if isinstance(old.get("attempts", 0), int) else 0,
                "errorCode": None if unchanged else old.get("errorCode"),
            }
        )
    return documents


def discover_and_save(
    source_dir: Path = DEFAULT_SOURCE_DIR,
    manifest_path: Path = DEFAULT_MANIFEST_PATH,
) -> list[dict]:
    manifest = load_manifest(manifest_path)
    documents = discover_documents(source_dir, manifest)
    write_manifest(
        {"version": 1, "documents": {item["relativePath"]: item for item in documents}},
        manifest_path,
    )
    return documents
