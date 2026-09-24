"""FastAPI entry point for the Portal NC user-management backend."""

from __future__ import annotations

import secrets
import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from user_api import (
    ROLES,
    SESSIONS,
    connect,
    initialize,
    password_hash,
    password_matches,
    public_user,
    utc_now,
)
from agent import AgentConfigurationError, AgentRemoteError, create_agent

app = FastAPI(title="Portal NC User API", version="0.1.0", docs_url="/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(HTTPException)
async def problem_details_handler(_: Request, exception: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exception.status_code, content={"title": str(exception.detail), "status": exception.status_code})


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=120)


class CreateUserRequest(RegisterRequest):
    role: str = Field(default="SOLICITANTE")
    externalId: str | None = Field(default=None, max_length=160)
    department: str = Field(default="", max_length=120)


class UpdateUserRequest(BaseModel):
    role: str
    department: str = Field(default="", max_length=120)


class ResetPasswordRequest(BaseModel):
    newPassword: str = Field(min_length=8, max_length=120)


class RecordRequest(BaseModel):
    record: dict
    status: str = Field(min_length=1, max_length=40)


def current_user(request: Request):
    authorization = request.headers.get("Authorization", "")
    token = authorization.removeprefix("Bearer ").strip()
    user_id = SESSIONS.get(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticação necessária")
    with connect() as connection:
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user or not user["active"] or user["blocked"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    return user


def administrator(user=Depends(current_user)):
    if user["role"] != "ADMINISTRADOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente")
    return user


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.on_event("startup")
def startup() -> None:
    initialize()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "portal-nc-users", "framework": "fastapi"}


@app.put("/api/records/{record_id}")
def save_record(record_id: str, payload: RecordRequest, user=Depends(current_user)):
    if payload.record.get("id") != record_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador do registro inválido")
    timestamp = now()
    serialized = json.dumps(payload.record, ensure_ascii=False, separators=(",", ":"))
    with connect() as connection:
        existing = connection.execute("SELECT owner_id FROM records WHERE id = ?", (record_id,)).fetchone()
        if existing and existing["owner_id"] != user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registro pertence a outro usuário")
        connection.execute(
            "INSERT INTO records (id, owner_id, payload_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, status = excluded.status, updated_at = excluded.updated_at",
            (record_id, user["id"], serialized, payload.status, timestamp, timestamp),
        )
    return {"id": record_id, "status": payload.status, "updatedAt": timestamp}


# Visão gerencial: perfis de gestão veem todos os registros; os demais, só os próprios.
MANAGEMENT_ROLES = {"ADMINISTRADOR", "APROVADOR", "VERIFICADOR", "CONSULTA"}


@app.get("/api/records")
def list_records(user=Depends(current_user)):
    everyone = user["role"] in MANAGEMENT_ROLES
    with connect() as connection:
        query = (
            "SELECT r.*, u.name AS owner_name FROM records r LEFT JOIN users u ON u.id = r.owner_id "
            + ("" if everyone else "WHERE r.owner_id = ? ")
            + "ORDER BY r.updated_at DESC LIMIT 2000"
        )
        rows = connection.execute(query, () if everyone else (user["id"],)).fetchall()
    return {
        "scope": "all" if everyone else "own",
        "items": [
            {"id": row["id"], "status": row["status"], "ownerName": row["owner_name"], "record": json.loads(row["payload_json"]), "createdAt": row["created_at"], "updatedAt": row["updated_at"]}
            for row in rows
        ],
    }


@app.get("/api/records/{record_id}")
def get_record(record_id: str, user=Depends(current_user)):
    with connect() as connection:
        row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro não encontrado")
    if row["owner_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registro pertence a outro usuário")
    return {
        "id": row["id"],
        "status": row["status"],
        "record": json.loads(row["payload_json"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


# Revisão: regras locais + agente, compartilhadas com user_api.py (record_review.py).
from record_review import local_review, review as review_with_agent  # noqa: E402


@app.post("/api/records/{record_id}/review")
def review_record(record_id: str, user=Depends(current_user)):
    with connect() as connection:
        row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro não encontrado")
    if row["owner_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registro pertence a outro usuário")
    record = json.loads(row["payload_json"])
    return {"recordId": record_id, **review_with_agent(record)}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    salt, digest = password_hash(payload.password)
    user_id = secrets.token_hex(16)
    timestamp = now()
    try:
        with connect() as connection:
            connection.execute(
                "INSERT INTO users (id, name, email, role, password_salt, password_digest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, payload.name.strip(), payload.email.strip().lower(), "SOLICITANTE", salt, digest, timestamp, timestamp),
            )
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    except Exception as error:
        if "UNIQUE" in str(error).upper():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado") from error
        raise
    return {"user": public_user(row)}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (payload.email.strip().lower(),)).fetchone()
        if not row or not password_matches(payload.password, row["password_salt"], row["password_digest"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
        if not row["active"] or row["blocked"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário desativado ou bloqueado")
        connection.execute("UPDATE users SET last_access_at = ?, updated_at = ? WHERE id = ?", (now(), now(), row["id"]))
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = row["id"]
    return {"token": token, "user": public_user(row)}


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request) -> Response:
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    SESSIONS.pop(token, None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/users")
def list_users(_: Annotated[object, Depends(administrator)]):
    with connect() as connection:
        rows = connection.execute("SELECT * FROM users WHERE deleted_at IS NULL AND NOT (active = 0 AND blocked = 1) ORDER BY created_at DESC").fetchall()
    return {"items": [public_user(row) for row in rows]}


@app.post("/api/users", status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserRequest, _: Annotated[object, Depends(administrator)]):
    role = payload.role.strip().upper()
    if role not in ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Perfil inválido")
    salt, digest = password_hash(payload.password)
    user_id = secrets.token_hex(16)
    timestamp = now()
    try:
        with connect() as connection:
            connection.execute(
                "INSERT INTO users (id, external_id, name, email, department, role, password_salt, password_digest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, payload.externalId, payload.name.strip(), payload.email.strip().lower(), payload.department, role, salt, digest, timestamp, timestamp),
            )
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    except Exception as error:
        if "UNIQUE" in str(error).upper():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail ou identidade externa já cadastrados") from error
        raise
    return {"user": public_user(row)}


@app.patch("/api/users/{user_id}")
def update_user(user_id: str, payload: UpdateUserRequest, administrator_user=Depends(administrator)):
    role = payload.role.strip().upper()
    if role not in ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Perfil inválido")
    if administrator_user["id"] == user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="O administrador não pode alterar o próprio perfil")
    with connect() as connection:
        cursor = connection.execute("UPDATE users SET role = ?, department = ?, updated_at = ?, version = version + 1 WHERE id = ?", (role, payload.department, now(), user_id))
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return {"user": public_user(row)}


@app.post("/api/users/{user_id}/reset-password")
def reset_password(user_id: str, payload: ResetPasswordRequest, administrator_user=Depends(administrator)):
    if administrator_user["id"] == user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Use o fluxo de troca de senha da própria conta")
    salt, digest = password_hash(payload.newPassword)
    with connect() as connection:
        cursor = connection.execute("UPDATE users SET password_salt = ?, password_digest = ?, updated_at = ?, version = version + 1 WHERE id = ?", (salt, digest, now(), user_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    for token, session_user_id in list(SESSIONS.items()):
        if session_user_id == user_id:
            SESSIONS.pop(token, None)
    return {"message": "Senha redefinida. As sessões anteriores foram encerradas."}


@app.post("/api/users/{user_id}/{action}")
def user_action(user_id: str, action: str, administrator_user=Depends(administrator)):
    if action not in {"activate", "deactivate", "block", "unblock"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ação não encontrada")
    field = "active" if action in {"activate", "deactivate"} else "blocked"
    value = int(action in {"activate", "block"})
    with connect() as connection:
        cursor = connection.execute(f"UPDATE users SET {field} = ?, updated_at = ?, version = version + 1 WHERE id = ?", (value, now(), user_id))
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return {"user": public_user(row)}


@app.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, administrator_user=Depends(administrator)) -> Response:
    if administrator_user["id"] == user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="O administrador não pode excluir a própria conta")
    with connect() as connection:
        cursor = connection.execute("UPDATE users SET active = 0, blocked = 1, deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?", (now(), now(), user_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
