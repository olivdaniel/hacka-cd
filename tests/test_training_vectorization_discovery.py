from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from training_docs import discover_and_save, discover_documents, load_manifest


class TrainingDocumentDiscoveryTests(unittest.TestCase):
    def test_discovers_supported_files_in_stable_order_and_ignores_other_extensions(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            (source / "zeta.pdf").write_bytes(b"pdf")
            (source / "Alfa.xlsx").write_bytes(b"xlsx")
            (source / "ignore.txt").write_bytes(b"ignore")
            (source / "nested").mkdir()
            (source / "nested" / "ignored.pdf").write_bytes(b"nested")

            documents = discover_documents(source)

            self.assertEqual([item["relativePath"] for item in documents], ["Alfa.xlsx", "zeta.pdf"])
            self.assertEqual([item["extension"] for item in documents], [".xlsx", ".pdf"])
            self.assertTrue(all(item["status"] == "discovered" for item in documents))

    def test_hash_is_stable_and_manifest_is_written_without_content(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            source.mkdir()
            manifest_path = Path(directory) / "manifest.json"
            content = b"training content"
            document = source / "manual.pdf"
            document.write_bytes(content)

            first = discover_and_save(source, manifest_path)
            second = discover_and_save(source, manifest_path)
            expected_hash = hashlib.sha256(content).hexdigest()

            self.assertEqual(first[0]["sha256"], expected_hash)
            self.assertEqual(second[0]["sha256"], expected_hash)
            manifest = load_manifest(manifest_path)
            serialized = json.dumps(manifest)
            self.assertNotIn(content.decode(), serialized)
            self.assertEqual(manifest["documents"]["manual.pdf"]["status"], "discovered")

    def test_preserves_completed_hash_without_reprocessing(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            source.mkdir()
            manifest_path = Path(directory) / "manifest.json"
            document = source / "manual.xlsx"
            document.write_bytes(b"same document")
            digest = hashlib.sha256(b"same document").hexdigest()
            manifest_path.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "documents": {
                            "manual.xlsx": {
                                "relativePath": "manual.xlsx",
                                "sha256": digest,
                                "status": "vectorized",
                                "attempts": 1,
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )

            documents = discover_documents(source, load_manifest(manifest_path))

            self.assertEqual(documents[0]["status"], "vectorized")
            self.assertEqual(documents[0]["attempts"], 1)


if __name__ == "__main__":
    unittest.main()
