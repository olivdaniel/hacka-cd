from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import agent
from agent import AgentConfig, CtrlCdAgent, TrainingVectorizationError


class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise agent.requests.HTTPError(response=self)

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []
        self.headers = {}

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return next(self.responses)


class FakeSocket:
    def settimeout(self, value):
        self.timeout = value


class FakeS3Response:
    status = 200

    def close(self):
        self.closed = True


class FakeS3Connection:
    last = None

    def __init__(self, *args, **kwargs):
        self.sock = FakeSocket()
        self.headers = []
        self.body = bytearray()
        self.response = FakeS3Response()
        FakeS3Connection.last = self

    def putrequest(self, method, target, **kwargs):
        self.method = method
        self.target = target

    def putheader(self, name, value):
        self.headers.append((name, value))

    def endheaders(self):
        pass

    def send(self, data):
        self.body.extend(data)

    def getresponse(self):
        return self.response

    def close(self):
        self.closed = True


class TrainingVectorizationAgentTests(unittest.TestCase):
    def setUp(self):
        self.client = CtrlCdAgent(AgentConfig("https://lab.example/aws-bedrock", "key", True, 60))
        self.client.session = FakeSession([])
        self.object_key = "uploads/12345678-1234-5678-1234-567812345678.pdf"

    def test_authorization_payload_and_vectorization_payload(self):
        authorization_payload = {
            "method": "PUT",
            "url": "https://bucket.s3.us-east-1.amazonaws.com/training/file.pdf?signature=abc",
            "objectKey": self.object_key,
            "requiredHeaders": {"content-type": "application/pdf"},
        }
        vectorization_payload = {
            "fileType": "pdf",
            "totalChunks": 2,
            "totalVectorsStored": 2,
            "indexName": agent.TRAINING_INDEX_NAME,
            "indexCreated": False,
        }
        self.client.session = FakeSession([FakeResponse(authorization_payload), FakeResponse(vectorization_payload)])
        chat_payload = self.client._chat_payload([agent.HumanMessage(content="Pergunta")])
        self.assertEqual(chat_payload["vectorIndexName"], agent.TRAINING_INDEX_NAME)
        authorization = self.client.authorize_training_upload(self.object_key, "application/pdf", 8)
        result = self.client.vectorize_training_document(self.object_key)

        auth_call = self.client.session.calls[0][1]
        vector_call = self.client.session.calls[1][1]
        self.assertEqual(auth_call["json"]["action"], "create_presigned_upload")
        self.assertEqual(auth_call["json"]["objectKey"], self.object_key)
        self.assertEqual(auth_call["json"]["contentLength"], 8)
        self.assertEqual(auth_call["timeout"], 60)
        self.assertEqual(vector_call["json"], {"action": "vectorize", "objectKey": self.object_key, "vectorIndexName": agent.TRAINING_INDEX_NAME})
        self.assertEqual(authorization.required_headers["content-type"], "application/pdf")
        self.assertEqual(result["totalVectorsStored"], 2)

    def test_authorization_rejects_api_key_and_invalid_contract(self):
        payload = {
            "method": "PUT",
            "url": "https://bucket.s3.us-east-1.amazonaws.com/training/file.pdf",
            "objectKey": self.object_key,
            "requiredHeaders": {"content-type": "application/pdf", "x-api-key": "secret"},
        }
        self.client.session = FakeSession([FakeResponse(payload)])

        with self.assertRaises(TrainingVectorizationError):
            self.client.authorize_training_upload(self.object_key, "application/pdf", 8)

    def test_put_preserves_bytes_and_does_not_send_api_key(self):
        content = b"document bytes"
        authorization = agent.TrainingUploadAuthorization(
            "PUT",
            "https://bucket.s3.us-east-1.amazonaws.com/training/file.pdf?signature=abc",
            self.object_key,
            {"content-type": "application/pdf"},
        )
        with tempfile.TemporaryDirectory() as directory:
            temporary_path = Path(directory) / "training.pdf"
            temporary_path.write_bytes(content)
            with patch("agent.http.client.HTTPSConnection", FakeS3Connection):
                self.client.put_training_document(temporary_path, authorization, len(content))

        connection = FakeS3Connection.last
        self.assertEqual(bytes(connection.body), content)
        self.assertEqual(connection.target, "/training/file.pdf?signature=abc")
        self.assertIn(("Host", "bucket.s3.us-east-1.amazonaws.com"), connection.headers)
        self.assertIn(("Content-Length", str(len(content))), connection.headers)
        self.assertNotIn("x-api-key", {name.lower() for name, _ in connection.headers})

    def test_vectorization_rejects_mismatched_counts(self):
        self.client.session = FakeSession(
            [
                FakeResponse(
                    {
                        "fileType": "pdf",
                        "totalChunks": 2,
                        "totalVectorsStored": 1,
                        "indexName": agent.TRAINING_INDEX_NAME,
                        "indexCreated": False,
                    }
                )
            ]
        )

        with self.assertRaises(TrainingVectorizationError):
            self.client.vectorize_training_document(self.object_key)


if __name__ == "__main__":
    unittest.main()
