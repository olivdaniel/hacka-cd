"""Local user-management API for the Portal NC demo.

This is a development backend only. Production requires corporate identity,
server-side authorization, HTTPS, durable sessions, audit storage and tests.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "usuarios"
DATABASE = DATA_DIR / "users.sqlite3"
HOST = "127.0.0.1"
PORT = 8001
ROLES = {"SOLICITANTE", "ANALISTA", "VERIFICADOR", "APROVADOR", "ADMINISTRADOR", "CONSULTA"}
SESSIONS: dict[str, str] = {}
# Origens da interface autorizadas (mesma lista do fastapi_app.py).
ALLOWED_ORIGINS = {
    "http://127.0.0.1:4173", "http://localhost:4173",
    "http://127.0.0.1:5173", "http://localhost:5173",
    "http://127.0.0.1:8000", "http://localhost:8000",
}
MAX_RECORD_BYTES = 4 * 1024 * 1024
MANAGEMENT_ROLES = {"ADMINISTRADOR", "APROVADOR", "VERIFICADOR", "CONSULTA"}
RECORD_ID = re.compile(r"[A-Za-z0-9._-]{1,120}")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def password_hash(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return salt.hex(), digest.hex()


def password_matches(password: str, salt_hex: str, digest_hex: str) -> bool:
    _, digest = password_hash(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(digest, digest_hex)


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize() -> None:
    with connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                external_id TEXT UNIQUE,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                department TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                blocked INTEGER NOT NULL DEFAULT 0,
                deleted_at TEXT,
                password_salt TEXT NOT NULL,
                password_digest TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_access_at TEXT,
                version INTEGER NOT NULL DEFAULT 1
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
        if "deleted_at" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN deleted_at TEXT")
        if connection.execute("SELECT 1 FROM users WHERE email = ?", ("admin.demo@example.com",)).fetchone() is None:
            salt, digest = password_hash("admin123")
            now = utc_now()
            connection.execute(
                "INSERT INTO users (id, name, email, role, password_salt, password_digest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("demo-admin", "Administrador Demo", "admin.demo@example.com", "ADMINISTRADOR", salt, digest, now, now),
            )


def public_user(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "externalId": row["external_id"],
        "name": row["name"],
        "email": row["email"],
        "department": row["department"],
        "role": row["role"],
        "active": bool(row["active"]),
        "blocked": bool(row["blocked"]),
        "deletedAt": row["deleted_at"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "lastAccessAt": row["last_access_at"],
        "version": row["version"],
    }


class ApiHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        origin = self.headers.get("Origin", "")
        self.send_header("Access-Control-Allow-Origin", origin if origin in ALLOWED_ORIGINS else "http://127.0.0.1:4173")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self, limit: int = 64 * 1024) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length < 0 or length > limit:
            raise ValueError("Payload muito grande")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_OPTIONS(self) -> None:
        self.send_json(HTTPStatus.NO_CONTENT, {})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok", "service": "portal-nc-users", "framework": "stdlib"})
            return
        if path == "/api/records":
            self.list_records()
            return
        if path.startswith("/api/records/"):
            self.get_record(path.split("/")[3])
            return
        if path == "/api/users":
            if not self.require_admin():
                return
            with connect() as connection:
                rows = connection.execute("SELECT * FROM users WHERE deleted_at IS NULL AND NOT (active = 0 AND blocked = 1) ORDER BY created_at DESC").fetchall()
            self.send_json(HTTPStatus.OK, {"items": [public_user(row) for row in rows]})
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/records/") and path.endswith("/review"):
            self.review_record(path.split("/")[3])
            return
        try:
            payload = self.read_json()
        except (ValueError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Payload inválido"})
            return
        if path == "/api/auth/register":
            self.register(payload, "SOLICITANTE")
            return
        if path == "/api/auth/login":
            self.login(payload)
            return
        if path == "/api/auth/logout":
            token = self.token()
            if token:
                SESSIONS.pop(token, None)
            self.send_json(HTTPStatus.NO_CONTENT, {})
            return
        if path == "/api/users":
            if self.require_admin():
                self.create_user(payload)
            return
        if path.startswith("/api/users/") and path.endswith("/deactivate"):
            if self.require_admin():
                self.change_status(path.split("/")[3], active=False)
            return
        if path.startswith("/api/users/") and path.endswith("/activate"):
            if self.require_admin():
                self.change_status(path.split("/")[3], active=True)
            return
        if path.startswith("/api/users/") and path.endswith("/block"):
            if self.require_admin():
                self.change_block(path.split("/")[3], blocked=True)
            return
        if path.startswith("/api/users/") and path.endswith("/unblock"):
            if self.require_admin():
                self.change_block(path.split("/")[3], blocked=False)
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        parts = path.split("/")
        if len(parts) == 4 and path.startswith("/api/records/"):
            try:
                payload = self.read_json(MAX_RECORD_BYTES)
            except (ValueError, json.JSONDecodeError):
                self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Payload inválido"})
                return
            self.save_record(parts[3], payload)
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})

    # ---- Registros de NC (mesmo contrato do fastapi_app.py) ------------------------------
    def owned_record(self, record_id: str):
        user = self.authenticated_user()
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"title": "Autenticação necessária"})
            return None, None
        with connect() as connection:
            row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
        if row and row["owner_id"] != user["id"]:
            self.send_json(HTTPStatus.FORBIDDEN, {"title": "Registro pertence a outro usuário"})
            return None, None
        return user, row

    def save_record(self, record_id: str, payload: dict) -> None:
        if not isinstance(payload, dict) or not RECORD_ID.fullmatch(record_id):
            self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Registro inválido"})
            return
        record, status = payload.get("record"), payload.get("status")
        if not isinstance(record, dict) or not isinstance(status, str) or not 1 <= len(status) <= 40:
            self.send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"title": "Registro inválido"})
            return
        if record.get("id") != record_id:
            self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Identificador do registro inválido"})
            return
        user, _ = self.owned_record(record_id)
        if not user:
            return
        timestamp = utc_now()
        serialized = json.dumps(record, ensure_ascii=False, separators=(",", ":"))
        with connect() as connection:
            connection.execute(
                "INSERT INTO records (id, owner_id, payload_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, status = excluded.status, updated_at = excluded.updated_at",
                (record_id, user["id"], serialized, status, timestamp, timestamp),
            )
        self.send_json(HTTPStatus.OK, {"id": record_id, "status": status, "updatedAt": timestamp})

    def list_records(self) -> None:
        """Visão gerencial: perfis de gestão veem todos os registros; os demais, só os próprios."""
        user = self.authenticated_user()
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"title": "Autenticação necessária"})
            return
        everyone = user["role"] in MANAGEMENT_ROLES
        query = (
            "SELECT r.*, u.name AS owner_name FROM records r LEFT JOIN users u ON u.id = r.owner_id "
            + ("" if everyone else "WHERE r.owner_id = ? ")
            + "ORDER BY r.updated_at DESC LIMIT 2000"
        )
        with connect() as connection:
            rows = connection.execute(query, () if everyone else (user["id"],)).fetchall()
        items = []
        for row in rows:
            try:
                record = json.loads(row["payload_json"])
            except json.JSONDecodeError:
                continue
            items.append({"id": row["id"], "status": row["status"], "ownerName": row["owner_name"], "record": record, "createdAt": row["created_at"], "updatedAt": row["updated_at"]})
        self.send_json(HTTPStatus.OK, {"scope": "all" if everyone else "own", "items": items})

    def get_record(self, record_id: str) -> None:
        user, row = self.owned_record(record_id)
        if not user:
            return
        if not row:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Registro não encontrado"})
            return
        self.send_json(HTTPStatus.OK, {"id": row["id"], "status": row["status"], "record": json.loads(row["payload_json"]), "createdAt": row["created_at"], "updatedAt": row["updated_at"]})

    def review_record(self, record_id: str) -> None:
        user, row = self.owned_record(record_id)
        if not user:
            return
        if not row:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Registro não encontrado"})
            return
        from record_review import review  # importa o agente só quando a revisão é pedida
        self.send_json(HTTPStatus.OK, {"recordId": record_id, **review(json.loads(row["payload_json"]))})

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/users/") and self.require_admin():
            try:
                payload = self.read_json()
            except (ValueError, json.JSONDecodeError):
                self.send_json(HTTPStatus.BAD_REQUEST, {"title": "Payload inválido"})
                return
            self.update_user(path.split("/")[-1], payload)
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/users/") and self.require_admin():
            self.delete_user(path.split("/")[-1])
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"title": "Recurso não encontrado"})

    def token(self) -> str | None:
        value = self.headers.get("Authorization", "")
        return value.removeprefix("Bearer ").strip() or None

    def authenticated_user(self) -> sqlite3.Row | None:
        user_id = SESSIONS.get(self.token() or "")
        if not user_id:
            return None
        with connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return row if row and row["active"] and not row["blocked"] else None

    def require_admin(self) -> bool:
        user = self.authenticated_user()
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"title": "Autenticação necessária"})
            return False
        if user["role"] != "ADMINISTRADOR":
            self.send_json(HTTPStatus.FORBIDDEN, {"title": "Permissão insuficiente"})
            return False
        return True

    def register(self, payload: dict, role: str) -> None:
        self.create_user(payload, role, public=True)

    def create_user(self, payload: dict, role: str | None = None, public: bool = False) -> None:
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))
        selected_role = role or str(payload.get("role", "")).strip().upper()
        if not name or len(name) > 80 or not email or len(email) > 160 or len(password) < 8 or selected_role not in ROLES:
            self.send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"title": "Dados de usuário inválidos"})
            return
        if public and selected_role != "SOLICITANTE":
            self.send_json(HTTPStatus.FORBIDDEN, {"title": "Perfil não permitido no cadastro público"})
            return
        salt, digest = password_hash(password)
        user_id = secrets.token_hex(16)
        now = utc_now()
        try:
            with connect() as connection:
                connection.execute(
                    "INSERT INTO users (id, external_id, name, email, department, role, password_salt, password_digest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (user_id, payload.get("externalId"), name, email, str(payload.get("department", ""))[:120], selected_role, salt, digest, now, now),
                )
                row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        except sqlite3.IntegrityError:
            self.send_json(HTTPStatus.CONFLICT, {"title": "E-mail ou identidade externa já cadastrados"})
            return
        self.send_json(HTTPStatus.CREATED, {"user": public_user(row)})

    def login(self, payload: dict) -> None:
        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))
        with connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not row or not password_matches(password, row["password_salt"], row["password_digest"]):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"title": "Credenciais inválidas"})
                return
            if not row["active"] or row["blocked"]:
                self.send_json(HTTPStatus.FORBIDDEN, {"title": "Usuário desativado ou bloqueado"})
                return
            now = utc_now()
            connection.execute("UPDATE users SET last_access_at = ?, updated_at = ? WHERE id = ?", (now, now, row["id"]))
        token = secrets.token_urlsafe(32)
        SESSIONS[token] = row["id"]
        self.send_json(HTTPStatus.OK, {"token": token, "user": public_user(row)})

    def change_status(self, user_id: str, active: bool) -> None:
        with connect() as connection:
            cursor = connection.execute("UPDATE users SET active = ?, updated_at = ?, version = version + 1 WHERE id = ?", (int(active), utc_now(), user_id))
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if cursor.rowcount == 0:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Usuário não encontrado"})
            return
        self.send_json(HTTPStatus.OK, {"user": public_user(row)})

    def update_user(self, user_id: str, payload: dict) -> None:
        role = str(payload.get("role", "")).strip().upper()
        if role not in ROLES:
            self.send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"title": "Perfil inválido"})
            return
        current = self.authenticated_user()
        if current and current["id"] == user_id:
            self.send_json(HTTPStatus.CONFLICT, {"title": "O administrador não pode alterar o próprio perfil"})
            return
        with connect() as connection:
            cursor = connection.execute("UPDATE users SET role = ?, department = ?, updated_at = ?, version = version + 1 WHERE id = ?", (role, str(payload.get("department", ""))[:120], utc_now(), user_id))
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if cursor.rowcount == 0:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Usuário não encontrado"})
            return
        self.send_json(HTTPStatus.OK, {"user": public_user(row)})

    def change_block(self, user_id: str, blocked: bool) -> None:
        with connect() as connection:
            cursor = connection.execute("UPDATE users SET blocked = ?, updated_at = ?, version = version + 1 WHERE id = ?", (int(blocked), utc_now(), user_id))
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if cursor.rowcount == 0:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Usuário não encontrado"})
            return
        self.send_json(HTTPStatus.OK, {"user": public_user(row)})

    def delete_user(self, user_id: str) -> None:
        current = self.authenticated_user()
        if current and current["id"] == user_id:
            self.send_json(HTTPStatus.CONFLICT, {"title": "O administrador não pode excluir a própria conta"})
            return
        with connect() as connection:
            cursor = connection.execute("UPDATE users SET active = 0, blocked = 1, deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?", (utc_now(), utc_now(), user_id))
        if cursor.rowcount == 0:
            self.send_json(HTTPStatus.NOT_FOUND, {"title": "Usuário não encontrado"})
            return
        self.send_json(HTTPStatus.NO_CONTENT, {})


if __name__ == "__main__":
    initialize()
    print(f"Portal NC users API: http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), ApiHandler).serve_forever()
