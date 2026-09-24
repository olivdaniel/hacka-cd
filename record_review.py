"""Revisão de registros de NC: regras locais + agente de IA (compartilhado por fastapi_app.py e user_api.py).

- compact_record(): envia ao agente só o que importa para a revisão (tipo, AS IS/TO BE,
  requisitos do Anexo 6.2, normas, localização, evidências). Rascunhos completos trazem
  versões, auditoria e metadados que aumentam o prompt sem ajudar a revisão.
- review(): chama o agente (agent.create_agent().review_record) e, se ele não estiver
  disponível, usa as regras locais. A resposta diz qual foi a fonte e, quando for o caso,
  por que o agente não respondeu.
- Sugestões: o campo alvo é normalizado para "asIs", "toBe" ou "req:<id>:asIs|toBe".
  Alvos desconhecidos viram sugestões informativas (não alteram o registro).
"""
from __future__ import annotations

import re
import unicodedata

MAX_TEXT = 4000


def _text(value, limit: int = MAX_TEXT) -> str:
    return str(value or "").strip()[:limit]


def _norm(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", value)


def compact_record(record: dict) -> dict:
    """Subconjunto do registro usado na revisão (sem imagens, versões nem auditoria)."""
    description = record.get("description") if isinstance(record.get("description"), dict) else {}
    requirements = []
    for item in record.get("requirements") or []:
        if not isinstance(item, dict):
            continue
        requirements.append({
            "id": _text(item.get("id"), 120),
            "label": _text(item.get("label"), 300),
            "asIs": _text(item.get("asIs") if item.get("asIs") is not None else item.get("value"), 1500),
            "toBe": _text(item.get("toBe"), 1500),
        })
    photos = [
        {"purpose": _text(p.get("purpose"), 40), "caption": _text(p.get("caption"), 300), "status": _text(p.get("status"), 30)}
        for p in (record.get("photos") or []) if isinstance(p, dict)
    ]
    location = record.get("aircraftLocation") if isinstance(record.get("aircraftLocation"), dict) else None
    return {
        "id": _text(record.get("id"), 80),
        "tipoNC": _text(record.get("ncSelected"), 200),
        "temAR": record.get("hasAR"),
        "notaCD": _text(record.get("cdNumber"), 80),
        "ar": _text(record.get("arNumber"), 80),
        "pn": _text(record.get("pn"), 80),
        "numeroSerie": _text(record.get("serial"), 80),
        "asIs": _text(record.get("asIs") or description.get("asIs")),
        "toBe": _text(record.get("toBe") or description.get("toBe")),
        "fonteRequisitos": _text(record.get("requirementSource"), 200),
        "normasAplicaveis": [_text(s, 120) for s in (record.get("applicableStandards") or [])][:20],
        "requisitos": requirements[:40],
        "instaladaNaAeronave": record.get("installedOnAircraft"),
        "localizacao": _text(record.get("regionSelected") or record.get("offAircraftLocation"), 300),
        "localizacaoConfirmadaPeloUsuario": bool(location and location.get("confirmed")),
        "evidencias": photos[:30],
    }


def local_review(record: dict) -> dict:
    """Regras locais (as mesmas do fastapi_app.py original, ampliadas para os itens do Anexo 6.2)."""
    missing = []
    suggestions = []
    description = record.get("description") if isinstance(record.get("description"), dict) else {}
    as_is = record.get("asIs") or description.get("asIs") or ""
    to_be = record.get("toBe") or description.get("toBe") or ""
    if not str(as_is).strip():
        missing.append("AS IS não informado")
    if not str(to_be).strip():
        missing.append("TO-BE não informado")
    if not record.get("evidence") and not record.get("photos"):
        missing.append("Evidências não informadas")
    if as_is and len(str(as_is).split()) < 5:
        suggestions.append({"id": "local-as-is", "field": "asIs", "current": as_is, "suggested": f"Descrever tecnicamente: {as_is}.", "reason": "A descrição está curta para permitir rastreabilidade.", "status": "pending"})
    for item in record.get("requirements") or []:
        if isinstance(item, dict) and "asIs" in item and not (str(item.get("asIs") or "").strip() and str(item.get("toBe") or "").strip()):
            missing.append(f"Requisito sem AS IS/TO BE: {item.get('label', item.get('id', ''))}")
    return {"suggestions": suggestions, "missing": missing, "inconsistencies": []}


def normalize_target(field: str, record: dict) -> str | None:
    """Converte o campo citado pelo agente em um alvo aplicável no registro, ou None."""
    key = _norm(field)
    if key in {"asis", "comoesta", "descricaoasis", "descriptionasis", "condicaoatual"}:
        return "asIs"
    if key in {"tobe", "comodeveriaestar", "descricaotobe", "descriptiontobe", "condicaoesperada"}:
        return "toBe"
    for item in record.get("requirements") or []:
        if not isinstance(item, dict) or "asIs" not in item or not str(item.get("id") or "").strip():
            continue
        for side in ("asIs", "toBe"):
            candidates = {_norm(f"{item['id']}{side}"), _norm(f"req{item['id']}{side}"), _norm(f"requirements{item['id']}{side}")}
            if str(item.get("label") or "").strip():
                candidates.add(_norm(f"{item['label']}{side}"))
            if key in candidates:
                return f"req:{item['id']}:{side}"
    return None


def normalize_suggestions(suggestions: list, record: dict) -> list:
    result = []
    for index, suggestion in enumerate(suggestions or []):
        if not isinstance(suggestion, dict):
            continue
        field = _text(suggestion.get("field") or suggestion.get("target"), 200) or "Registro"
        target = normalize_target(field, record)
        result.append({
            "id": _text(suggestion.get("id"), 80) or f"review-{index + 1}",
            "field": field,
            "target": target,
            "applicable": target is not None,
            "current": _text(suggestion.get("current")),
            "suggested": _text(suggestion.get("suggested")),
            "reason": _text(suggestion.get("reason") or suggestion.get("justification"), 1500),
            "status": "pending",
        })
    return result


def review(record: dict) -> dict:
    """Revisa o registro: agente de IA quando disponível; senão, regras locais (com o motivo)."""
    local = local_review(record)
    try:
        from agent import AgentConfigurationError, AgentRemoteError, create_agent  # import tardio: o módulo continua útil sem o agente
    except ImportError:
        return _local_result(record, local, "Dependências do agente não instaladas (requirements.txt).")
    try:
        remote = create_agent().review_record(compact_record(record))
    except AgentConfigurationError as error:
        return _local_result(record, local, f"Configuração do agente incompleta: {error}")
    except AgentRemoteError as error:
        return _local_result(record, local, f"Assistente CTRL + CD indisponível: {error}")
    except Exception:  # falha inesperada: não derruba a revisão
        return _local_result(record, local, "Falha interna ao consultar o agente.")
    return {
        "status": "completed",
        "source": "ctrl-cd-agent",
        "opinion": _text(remote.get("opinion"), 8000) or None,
        "suggestions": normalize_suggestions(remote.get("suggestions") or [], record),
        "missing": [_text(m, 500) for m in (remote.get("missing") or [])] or local["missing"],
        "inconsistencies": [_text(m, 500) for m in (remote.get("inconsistencies") or [])],
        "agentError": None,
    }


def _local_result(record: dict, local: dict, reason: str) -> dict:
    return {
        "status": "completed",
        "source": "local-rules",
        "opinion": None,
        "suggestions": normalize_suggestions(local["suggestions"], record),
        "missing": local["missing"],
        "inconsistencies": local["inconsistencies"],
        "agentError": reason,
    }
