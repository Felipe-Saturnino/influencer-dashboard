"""
Utilitários Meta Graph API — validação de token e mensagens de erro.

Usado por etl.py, backfill.py e validate_meta_token.py.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import requests

_META_VER = (os.environ.get("META_GRAPH_VERSION") or "v21.0").strip()
if _META_VER and not _META_VER.startswith("v"):
    _META_VER = "v" + _META_VER


def graph_base() -> str:
    return f"https://graph.facebook.com/{_META_VER}"


def meta_graph_error_message(resp: requests.Response) -> str:
    try:
        body = resp.json()
        err = body.get("error", {}) if isinstance(body.get("error"), dict) else {}
        return str(err.get("message") or body)[:800]
    except Exception:
        return (resp.text or "")[:400]


def meta_token_invalid_message(text: str | None) -> bool:
    if not text:
        return False
    t = text.lower()
    compact = text.replace(" ", "").replace("\n", "")
    return (
        "session has expired" in t
        or "session is invalid" in t
        or "user logged out" in t
        or "error validating access token" in t
        or '"code":190' in compact
        or ("expired" in t and "access token" in t)
        or "has been invalidated" in t
    )


def meta_token_invalid_response(resp: requests.Response | None) -> bool:
    if resp is None or resp.status_code not in (400, 401, 403):
        return False
    try:
        body = resp.json()
        err = body.get("error", {}) if isinstance(body.get("error"), dict) else {}
    except Exception:
        err = {}
    if err:
        if err.get("code") == 190:
            return True
        if meta_token_invalid_message(err.get("message")):
            return True
    return meta_token_invalid_message(resp.text)


def inspect_meta_token(
    access_token: str,
    app_id: str | None = None,
    app_secret: str | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    """
    Chama debug_token quando app_id + app_secret existem.
    Retorna dict normalizado: is_valid, expires_at (unix ou 0), scopes, error, raw.
    """
    if not access_token:
        return {"is_valid": False, "error": "META_ACCESS_TOKEN vazio", "expires_at": None}

    app_id = (app_id or os.environ.get("META_APP_ID") or "").strip()
    app_secret = (app_secret or os.environ.get("META_APP_SECRET") or "").strip()

    if not app_id or not app_secret:
        return {
            "is_valid": None,
            "error": "META_APP_ID e META_APP_SECRET não configurados — não foi possível inspecionar expiração.",
            "expires_at": None,
            "skipped_debug": True,
        }

    app_token = f"{app_id}|{app_secret}"
    try:
        r = requests.get(
            f"{graph_base()}/debug_token",
            params={"input_token": access_token, "access_token": app_token},
            timeout=timeout,
        )
        if r.status_code != 200:
            return {
                "is_valid": False,
                "error": meta_graph_error_message(r),
                "expires_at": None,
                "http_status": r.status_code,
            }
        data = (r.json() or {}).get("data") or {}
        expires_at = data.get("expires_at")
        if expires_at == 0:
            expires_at = None  # token que não expira (System User / long-lived page)
        return {
            "is_valid": bool(data.get("is_valid")),
            "expires_at": expires_at,
            "data_access_expires_at": data.get("data_access_expires_at"),
            "scopes": data.get("scopes") or [],
            "type": data.get("type"),
            "error": (data.get("error") or {}).get("message") if isinstance(data.get("error"), dict) else None,
            "raw": data,
        }
    except requests.RequestException as exc:
        return {"is_valid": False, "error": str(exc), "expires_at": None}


def days_until_expiry(expires_at: int | None) -> int | None:
    if not expires_at:
        return None
    try:
        exp = datetime.fromtimestamp(int(expires_at), tz=timezone.utc)
        delta = exp - datetime.now(timezone.utc)
        return delta.days
    except (TypeError, ValueError, OSError):
        return None


def format_expiry_label(expires_at: int | None) -> str:
    if expires_at is None or expires_at == 0:
        return "sem data de expiração (token estável / System User)"
    days = days_until_expiry(expires_at)
    exp = datetime.fromtimestamp(int(expires_at), tz=timezone.utc)
    iso = exp.strftime("%Y-%m-%d %H:%M UTC")
    if days is None:
        return iso
    if days < 0:
        return f"expirado em {iso}"
    return f"expira em {iso} ({days} dia(s))"


def meta_preflight(
    access_token: str,
    page_id: str | None = None,
    ig_account_id: str | None = None,
    timeout: int = 30,
) -> tuple[bool, str, dict[str, Any] | None]:
    """
    Valida token com chamada mínima à Page ou IG.
    Retorna (ok, mensagem_erro, info_debug opcional).
    """
    if not access_token:
        return True, "", None
    if not page_id and not ig_account_id:
        return True, "", None

    base = graph_base()
    try:
        if page_id:
            r = requests.get(
                f"{base}/{page_id}",
                params={"fields": "id,name", "access_token": access_token},
                timeout=timeout,
            )
        else:
            r = requests.get(
                f"{base}/{ig_account_id}",
                params={"fields": "id,username", "access_token": access_token},
                timeout=timeout,
            )
        if r.status_code == 200:
            debug = inspect_meta_token(access_token)
            return True, "", debug if not debug.get("skipped_debug") else None
        msg = meta_graph_error_message(r)
        if not msg:
            msg = (r.text or "")[:400]
        return False, msg, None
    except requests.RequestException as exc:
        return False, str(exc), None


def meta_token_renewal_hint() -> str:
    return (
        "Gere um Page Access Token estável (System User no Meta Business — recomendado) ou "
        "renove via developers.facebook.com → App → Ferramentas → Graph API Explorer / Access Token Tool. "
        "Atualize o secret META_ACCESS_TOKEN no GitHub Actions (Settings → Secrets). "
        "Não use token de usuário pessoal que expira ao fazer logout."
    )


def resolve_page_access_token(
    page_id: str,
    access_token: str,
    timeout: int = 30,
) -> tuple[str | None, str]:
    """
    Converte token de System User / usuário em Page Access Token.
    Insights e posts do Facebook exigem Page token (#190 com user token).
    """
    page_id = (page_id or "").strip()
    access_token = (access_token or "").strip()
    if not page_id or not access_token:
        return None, "META_PAGE_ID ou META_ACCESS_TOKEN ausente"

    base = graph_base()
    try:
        r = requests.get(
            f"{base}/{page_id}",
            params={"fields": "access_token", "access_token": access_token},
            timeout=timeout,
        )
        if r.status_code == 200:
            pt = (r.json() or {}).get("access_token")
            if pt:
                return str(pt), ""
        else:
            err = meta_graph_error_message(r)

        r2 = requests.get(
            f"{base}/me/accounts",
            params={"fields": "id,access_token", "access_token": access_token, "limit": 100},
            timeout=timeout,
        )
        if r2.status_code == 200:
            for acc in (r2.json() or {}).get("data") or []:
                if str(acc.get("id")) == page_id and acc.get("access_token"):
                    return str(acc["access_token"]), ""

        if r.status_code == 200:
            return None, "access_token da Página não retornado — confira ativos do System User na Page"
        return None, err or meta_graph_error_message(r2)
    except requests.RequestException as exc:
        return None, str(exc)
