from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from training_sync import TrainingSynchronizer


class FakeAgent:
    def __init__(self, failing_name: str):
        self.failing_name = failing_name
        self.calls = []

    def sync_training_document(self, path, object_key, content_type, content_length):
        self.calls.append(path.name)
        if path.name == self.failing_name:
            from agent import TrainingVectorizationError

            raise TrainingVectorizationError("Não foi possível vetorizar o documento de treinamento.")
        return {
            "fileType": path.suffix[1:],
            "totalChunks": 2,
            "totalVectorsStored": 2,
            "indexName": "ctrl-cd-training",
            "indexCreated": False,
        }


class TrainingSynchronizationTests(unittest.TestCase):
    def test_fifo_continues_after_one_document_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "training_docs"
            source.mkdir()
            for name in ("a.pdf", "b.pdf", "c.xlsx"):
                (source / name).write_bytes(name.encode())
            manifest = Path(directory) / "manifest.json"
            agent = FakeAgent("b.pdf")

            summary = TrainingSynchronizer(agent, source, manifest).run()

            self.assertEqual(agent.calls, ["a.pdf", "b.pdf", "c.xlsx"])
            self.assertEqual(summary, {"status": "completed", "processed": 3, "succeeded": 2, "failed": 1})
            data = __import__("json").loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(data["documents"]["a.pdf"]["status"], "vectorized")
            self.assertEqual(data["documents"]["b.pdf"]["status"], "error")
            self.assertEqual(data["documents"]["c.xlsx"]["status"], "vectorized")
            self.assertEqual(data["documents"]["b.pdf"]["errorCode"], "TRAINING_VECTORIZATION_FAILED")

    def test_completed_documents_are_not_processed_again(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "training_docs"
            source.mkdir()
            (source / "a.pdf").write_bytes(b"a")
            manifest = Path(directory) / "manifest.json"
            agent = FakeAgent("")
            synchronizer = TrainingSynchronizer(agent, source, manifest)

            synchronizer.run()
            synchronizer.run()

            self.assertEqual(agent.calls, ["a.pdf"])


if __name__ == "__main__":
    unittest.main()
