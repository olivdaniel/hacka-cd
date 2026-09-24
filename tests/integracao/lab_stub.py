"""Simulador local do Experimental Lab (somente para testes).

- HTTPS em 127.0.0.1 com certificado autoassinado gerado na hora (o agente roda
  com EXPERIMENTAL_LAB_VERIFY_TLS=false apenas no teste).
- Um único endpoint POST .../aws-bedrock, com as ações usadas pelo agent.py:
  health, chat (conversa, quiz e mapa mental) e create_presigned_upload.
- Não contém nenhuma chave real. Grava cada requisição recebida (corpo JSON e se
  havia x-api-key) em um arquivo JSONL para os testes de paridade.

Gatilhos na mensagem do usuário (conversa):
  #erro429    → 429 RATE_LIMIT_EXCEEDED (o agente devolve USAGE_LIMIT_EXCEEDED)
  #fallback   → ragApplied=false, ragFallbackReason="no_results"
  #lento      → responde após 1,5 s (para observar o estado "Pensando…")
"""
from __future__ import annotations

import argparse
import json
import ssl
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_INDEX = "procedimento-5529"
LOCK = threading.Lock()


def make_cert(directory: Path) -> tuple[Path, Path]:
    cert, key = directory / "stub-cert.pem", directory / "stub-key.pem"
    subprocess.run(
        ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
         "-subj", "/CN=127.0.0.1", "-keyout", str(key), "-out", str(cert)],
        check=True, capture_output=True,
    )
    return cert, key


def chat_reply(text: str, index: str | None, rag: bool = True, reason: str | None = None) -> dict:
    return {
        "output": {"message": {"role": "assistant", "content": [{"text": text}]}},
        "indexName": index or DEFAULT_INDEX,
        "ragApplied": rag,
        "ragFallbackReason": reason,
    }


QUIZ = {"questions": [
    {"question": "Qual documento trata o produto não conforme?", "options": ["Procedimento 5529", "Manual de voo", "Ordem de compra", "Plano de férias"], "answerIndex": 0},
    {"question": "Quem confirma a localização da peça na aeronave?", "options": ["O sistema", "O usuário", "O fornecedor", "Ninguém"], "answerIndex": 1},
    {"question": "O que deve acompanhar a descrição AS IS?", "options": ["Nada", "Um palpite", "Evidências objetivas", "Uma opinião"], "answerIndex": 2},
]}

MIND_MAP = {"label": "Registro de NC", "children": [
    {"label": "Identificação", "children": [{"label": "Peça"}, {"label": "Localização"}]},
    {"label": "Descrição", "children": [{"label": "AS IS"}, {"label": "SHOULD BE"}]},
    {"label": "Evidências", "children": [{"label": "Fotos"}]},
]}


class Handler(BaseHTTPRequestHandler):
    server_version = "LabStub/1.0"
    log_path: Path
    counter = 0

    def log_message(self, format, *args):  # silencioso
        pass

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw)
        except ValueError:
            body = None
        with LOCK:
            Handler.counter += 1
            n = Handler.counter
            with self.log_path.open("a", encoding="utf-8") as log:
                log.write(json.dumps({"n": n, "path": self.path, "hasApiKey": bool(self.headers.get("x-api-key")), "body": body}, ensure_ascii=False) + "\n")

        if not self.path.rstrip("/").endswith("/aws-bedrock") or not isinstance(body, dict):
            self._json(404, {"code": "NOT_FOUND"})
            return
        if not self.headers.get("x-api-key"):
            self._json(401, {"code": "UNAUTHORIZED"})
            return
        action = body.get("action")
        if action == "health":
            self._json(200, {"status": "ok"})
            return
        if action == "create_presigned_upload":
            self._json(403, {"code": "FORBIDDEN"})  # upload real não é simulado
            return
        if action != "chat":
            self._json(400, {"code": "UNSUPPORTED_ACTION"})
            return

        system = " ".join(block.get("text", "") for block in body.get("system", []) if isinstance(block, dict))
        index = body.get("vectorIndexName")
        if "Crie exatamente 3 perguntas" in system:
            self._json(200, chat_reply(json.dumps(QUIZ, ensure_ascii=False), index))
            return
        if "Gere um mapa mental" in system:
            self._json(200, chat_reply(json.dumps(MIND_MAP, ensure_ascii=False), index))
            return

        messages = body.get("messages") or []
        last = messages[-1] if messages else {}
        text = "".join(block.get("text", "") for block in last.get("content", []) if isinstance(block, dict))
        turns = sum(1 for m in messages if m.get("role") == "user")
        if text.startswith("Atue como revisor"):
            # revisão de NC (agent.review_record): devolve o JSON pedido no prompt
            try:
                record = json.loads(text.split("Dados da NC:\n", 1)[1])
            except (IndexError, ValueError):
                record = {}
            reqs = record.get("requisitos") or []
            review = {
                "opinion": f"Parecer simulado: a NC do tipo {record.get('tipoNC') or 'não informado'} cita {len(record.get('normasAplicaveis') or [])} norma(s) aplicável(is).",
                "suggestions": [
                    {"id": "r1", "field": "asIs", "current": record.get("asIs", ""), "suggested": (record.get("asIs") or "") + " Medição registrada conforme a norma aplicável.", "reason": "Explicitar a referência normativa.", "status": "pending"},
                    {"id": "r3", "field": "pn", "current": record.get("pn", ""), "suggested": "Conferir o PN no sistema corporativo.", "reason": "Campo fora do escopo de edição.", "status": "pending"},
                ],
                "missing": ["Referência de desenho não informada"],
                "inconsistencies": [],
            }
            if reqs:
                review["suggestions"].insert(1, {"id": "r2", "field": f"{reqs[0]['id']}.toBe", "current": reqs[0].get("toBe", ""), "suggested": "Sem vazamento visível após 30 min de teste.", "reason": "Critério de aceitação mensurável.", "status": "pending"})
            self._json(200, chat_reply(json.dumps(review, ensure_ascii=False), index))
            return
        if "#erro429" in text:
            self._json(429, {"code": "RATE_LIMIT_EXCEEDED"})
            return
        if "#lento" in text:
            time.sleep(1.5)
        if "#fallback" in text:
            self._json(200, chat_reply(f"Resposta simulada (conhecimento geral) para: {text}", index, rag=False, reason="no_results"))
            return
        answer = (
            f"**Resposta simulada {turns}** para: {text}\n\n"
            f"- histórico recebido: {len(messages)} mensagem(ns)\n"
            "- fonte: Procedimento 5529 (simulado)\n\n"
            "<script>window.__xss = 1</script>"
        )
        self._json(200, chat_reply(answer, index))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--log", required=True)
    args = parser.parse_args()
    Handler.log_path = Path(args.log)
    Handler.log_path.write_text("", encoding="utf-8")
    tmp = Path(tempfile.mkdtemp(prefix="labstub-"))
    cert, key = make_cert(tmp)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert, key)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    print(f"lab-stub https://127.0.0.1:{args.port}/aws-bedrock", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
