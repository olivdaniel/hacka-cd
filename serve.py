"""Local static server for the Portal NC frontend."""

from __future__ import annotations

import argparse
import json
import mimetypes
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from uuid import uuid4
from urllib.parse import unquote, urlsplit

from agent import AgentConfigurationError, AgentRemoteError, create_agent
from training_sync import TrainingSynchronizer

ROOT = Path(__file__).resolve().parent / "frontend"


class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        relative = Path(unquote(urlsplit(path).path.lstrip("/")))
        candidate = (ROOT / relative).resolve()
        if candidate != ROOT and ROOT not in candidate.parents:
            return str(ROOT / "index.html")
        if candidate.is_dir():
            candidate = candidate / "index.html"
        return str(candidate)

    def do_GET(self) -> None:
        if urlsplit(self.path).path == "/api/health":
            self.send_health()
            return
        super().do_GET()

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/api/chats/messages":
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})
            return
        try:
            payload = self.read_json()
            message = payload.get("message")
            chat_id = payload.get("chatId") or f"local-{uuid4().hex}"
            if not isinstance(chat_id, str) or not chat_id.strip() or len(chat_id) > 128:
                raise ValueError("chatId inválido")
            if not isinstance(message, str) or not message.strip() or len(message) > 20000:
                raise ValueError("message inválida")
            result = create_agent().ask_with_metadata(chat_id.strip(), message.strip())
            self.send_json(HTTPStatus.OK, {"chatId": chat_id.strip(), **result})
        except (json.JSONDecodeError, ValueError, TypeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Mensagem inválida."})
        except AgentConfigurationError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Configuração ou mensagem inválida."})
        except AgentRemoteError:
            self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"title": "Assistente CTRL + CD indisponível."})

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("Content-Length inválido") from error
        if length < 1 or length > 64 * 1024:
            raise ValueError("Payload inválido")
        payload = json.loads(self.rfile.read(length))
        if not isinstance(payload, dict):
            raise ValueError("Payload inválido")
        return payload

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_health(self) -> None:
        try:
            create_agent().health()
            body = json.dumps({"status": "ok", "agent": "ctrl-cd"}).encode()
            status = 200
        except AgentConfigurationError:
            body = json.dumps({"status": "error", "detail": "Configuração do agente incompleta."}).encode()
            status = 503
        except AgentRemoteError:
            body = json.dumps({"status": "error", "detail": "Assistente CTRL + CD indisponível."}).encode()
            status = 503
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        print(f"{self.address_string()} - {format % args}")

    def guess_type(self, path: str) -> str:
        content_type, _ = mimetypes.guess_type(path)
        return content_type or "application/octet-stream"


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve o Portal NC localmente")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), FrontendHandler)
    print(f"Servidor ouvindo em http://127.0.0.1:{args.port}")
    Thread(target=run_training_sync, name="ctrl-cd-training-sync", daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Servidor encerrado.")
    finally:
        server.server_close()


def run_training_sync() -> None:
    try:
        summary = TrainingSynchronizer(create_agent()).run()
        print(
            "Base de treinamento: "
            f"processados={summary['processed']} "
            f"sucessos={summary['succeeded']} "
            f"falhas={summary['failed']}"
        )
    except AgentConfigurationError:
        print("Base de treinamento não iniciada: configuração do agente incompleta.")
    except Exception:
        print("Base de treinamento não concluída: falha interna segura.")


if __name__ == "__main__":
    main()
