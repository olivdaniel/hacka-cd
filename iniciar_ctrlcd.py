"""CTRL+CD — abre a interface completa (front-end + back-ends) com um comando.

    python iniciar_ctrlcd.py            (Windows: py iniciar_ctrlcd.py, ou dois cliques em INICIAR_CTRLCD.bat)

O que faz
1. Back-end de usuários e registros (login, cadastro, perfis, /api/records, revisão) em http://127.0.0.1:8001
   - FastAPI (fastapi_app.py), se as dependências do requirements.txt estiverem instaladas;
   - senão, a versão sem dependências do próprio projeto (user_api.py): login e cadastro,
     sem gravação de registros nem revisão no servidor.
2. Interface (pasta frontend/) em http://127.0.0.1:4173
   - pelo serve.py do projeto (páginas + Assistente CTRL: /api/chats/messages e /api/health),
     se as dependências do agente estiverem instaladas; senão, só as páginas;
   - o agente lê o .env (EXPERIMENTAL_LAB_*) na pasta do projeto; sem ele, o chat mostra "Erro de conexão";
   - a porta 4173 é autorizada no CORS dos dois back-ends; não abra o index.html pelo arquivo.
3. Abre o navegador na tela de login e encerra tudo com Ctrl+C.

Opções:  --sem-navegador   --backend {auto,fastapi,simples}
Só escuta em 127.0.0.1. Sem .env, nada sai do computador. Com .env, o agente (serve.py/fastapi_app.py)
acessa o Experimental Lab e o serve.py sincroniza docs/training_docs, gravando .training_docs_manifest.json.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import mimetypes
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
HOST = "127.0.0.1"
FRONT_PORT = 4173
API_PORT = 8001

# Tipos corretos mesmo quando o registro do Windows está desconfigurado.
for ext, mime in {".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
                  ".glb": "model/gltf-binary", ".json": "application/json", ".html": "text/html", ".png": "image/png"}.items():
    mimetypes.add_type(mime, ext)


class FrontHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".glb": "model/gltf-binary"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # sempre a versão atual dos arquivos
        super().end_headers()

    def log_message(self, format, *args):  # silencioso; erros continuam no terminal
        if args and str(args[1]).startswith(("4", "5")) and "/favicon" not in str(args[0]):
            sys.stderr.write(f"[front] {format % args}\n")


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((HOST, port)) == 0


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=2) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for(url: str, seconds: float) -> bool:
    end = time.time() + seconds
    while time.time() < end:
        try:
            get_json(url)
            return True
        except Exception:
            time.sleep(0.3)
    return False


AGENT_MODULES = ("requests", "dotenv", "langchain_core")


def has_modules(*names: str) -> bool:
    return all(importlib.util.find_spec(m) is not None for m in names)


def has_fastapi() -> bool:
    # fastapi_app.py importa agent.py, que precisa das dependências do agente
    return has_modules("fastapi", "uvicorn", "pydantic", *AGENT_MODULES)


def start_backend(mode: str) -> tuple[subprocess.Popen | None, str]:
    if port_in_use(API_PORT):
        try:
            health = get_json(f"http://{HOST}:{API_PORT}/health")
            if health.get("service", "").startswith("portal-nc-users"):
                return None, "já estava em execução"
        except Exception:
            pass
        raise SystemExit(f"A porta {API_PORT} está ocupada por outro programa. Feche-o e tente de novo.")

    use_fastapi = mode == "fastapi" or (mode == "auto" and has_fastapi())
    if mode == "fastapi" and not has_fastapi():
        raise SystemExit("FastAPI não instalado. Rode: python -m pip install -r requirements.txt")
    if use_fastapi:
        cmd = [sys.executable, "-m", "uvicorn", "fastapi_app:app", "--host", HOST, "--port", str(API_PORT), "--log-level", "warning"]
        label = "FastAPI (fastapi_app.py)"
    else:
        cmd = [sys.executable, "user_api.py"]
        label = "versão sem dependências (user_api.py) — dependências do requirements.txt não encontradas"
    proc = subprocess.Popen(cmd, cwd=str(ROOT))
    if not wait_for(f"http://{HOST}:{API_PORT}/health", 20):
        proc.terminate()
        raise SystemExit(f"O back-end não respondeu em http://{HOST}:{API_PORT}/health. Veja as mensagens acima.")
    return proc, label


def start_frontend() -> tuple[ThreadingHTTPServer | None, subprocess.Popen | None, str]:
    if port_in_use(FRONT_PORT):
        raise SystemExit(f"A porta {FRONT_PORT} está ocupada (outro servidor aberto?). Feche-o e tente de novo.")
    if has_modules(*AGENT_MODULES) and (ROOT / "serve.py").is_file():
        proc = subprocess.Popen([sys.executable, "serve.py", "--port", str(FRONT_PORT)], cwd=str(ROOT))
        end = time.time() + 20
        while time.time() < end and proc.poll() is None:
            try:
                urllib.request.urlopen(f"http://{HOST}:{FRONT_PORT}/index.html", timeout=1).read(1)
                return None, proc, "serve.py (páginas + Assistente CTRL)"
            except Exception:
                time.sleep(0.3)
        proc.terminate()
        print("Aviso: o serve.py não respondeu; abrindo só as páginas (sem o Assistente CTRL).")
    server = ThreadingHTTPServer((HOST, FRONT_PORT), partial(FrontHandler, directory=str(FRONTEND)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, None, "só páginas — dependências do agente não encontradas (Assistente CTRL indisponível)"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Abre o CTRL+CD completo (front-end + back-ends).")
    parser.add_argument("--sem-navegador", action="store_true", help="não abre o navegador automaticamente")
    parser.add_argument("--backend", choices=("auto", "fastapi", "simples"), default="auto")
    args = parser.parse_args(argv)

    if sys.version_info < (3, 10):
        raise SystemExit("Use Python 3.10 ou mais recente.")
    if not (FRONTEND / "index.html").is_file() or not (ROOT / "user_api.py").is_file():
        raise SystemExit(f"Rode este arquivo a partir da pasta do projeto (não encontrei frontend/ e user_api.py em {ROOT}).")
    glb = FRONTEND / "models" / "e195-e2-demonstrativo.glb"
    if not glb.is_file():
        print("Aviso: frontend/models/e195-e2-demonstrativo.glb não encontrado — o 3D vai abrir as vistas técnicas (2D).")

    os.chdir(ROOT)
    if not (ROOT / ".env").is_file():
        print("Aviso: .env não encontrado. O Assistente CTRL e a revisão por IA precisam dele")
        print("       (copie .env.example para .env e preencha EXPERIMENTAL_LAB_*). O restante funciona sem ele.")
    backend, label = start_backend(args.backend)
    front, front_proc, front_label = start_frontend()
    url = f"http://{HOST}:{FRONT_PORT}/auth/"
    print()
    print("CTRL+CD em execução")
    print(f"  Back-end de usuários: http://{HOST}:{API_PORT}  [{label}]")
    print(f"  Interface:            {url}  [{front_label}]")
    print("  Login de demonstração: admin.demo@example.com / admin123 (ou crie uma conta em \"Cadastrar\")")
    print("  Para encerrar: Ctrl+C nesta janela.")
    print()
    if not args.sem_navegador:
        webbrowser.open(url)
    try:
        while True:
            time.sleep(1)
            if backend is not None and backend.poll() is not None:
                print("O back-end foi encerrado inesperadamente.")
                break
            if front_proc is not None and front_proc.poll() is not None:
                print("O servidor da interface (serve.py) foi encerrado inesperadamente.")
                break
    except KeyboardInterrupt:
        pass
    finally:
        print("\nEncerrando…")
        if front is not None:
            front.shutdown()
            front.server_close()
        for proc in (front_proc, backend):
            if proc is None:
                continue
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()
