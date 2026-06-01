"""
Valida META_ACCESS_TOKEN (Instagram + Facebook) antes do ETL diário.

Uso local ou CI:
  cd scripts/etl-social-kpis
  pip install -r requirements.txt
  $env:META_ACCESS_TOKEN = "..."
  $env:META_PAGE_ID = "..."
  $env:META_APP_ID = "..."      # opcional — inspeciona expiração via debug_token
  $env:META_APP_SECRET = "..."  # opcional
  python validate_meta_token.py

Exit code 0 = OK; 1 = token inválido ou expira em menos de WARN_DAYS dias.
"""

from __future__ import annotations

import os
import sys

from meta_token_utils import (
    format_expiry_label,
    inspect_meta_token,
    meta_preflight,
    meta_token_invalid_message,
    meta_token_renewal_hint,
    days_until_expiry,
)

WARN_DAYS = int(os.environ.get("META_TOKEN_WARN_DAYS", "14"))


def main() -> int:
    token = os.environ.get("META_ACCESS_TOKEN", "").strip()
    page_id = os.environ.get("META_PAGE_ID", "").strip() or None
    ig_id = os.environ.get("META_IG_ACCOUNT_ID", "").strip() or None

    if not token:
        print("META_ACCESS_TOKEN não definido — Instagram/Facebook serão pulados no ETL.")
        return 0

    print("=== Validação Meta (Instagram / Facebook) ===\n")

    ok, err, _debug = meta_preflight(token, page_id=page_id, ig_account_id=ig_id)
    if not ok:
        print("Preflight FALHOU (Page/IG inacessível com este token).")
        print(f"Erro: {err}")
        print()
        print(meta_token_renewal_hint())
        return 1

    print("Preflight OK — token aceito pela Graph API para Page/IG.")

    info = inspect_meta_token(token)
    if info.get("skipped_debug"):
        print(f"\nAviso: {info.get('error')}")
        print("Configure META_APP_ID + META_APP_SECRET para monitorar expiração automaticamente.")
        return 0

    is_valid = info.get("is_valid")
    expires_at = info.get("expires_at")
    scopes = info.get("scopes") or []
    print(f"\nTipo: {info.get('type') or '—'}")
    print(f"Válido (debug_token): {is_valid}")
    print(f"Expiração: {format_expiry_label(expires_at)}")
    if scopes:
        print(f"Escopos ({len(scopes)}): {', '.join(scopes[:12])}{'…' if len(scopes) > 12 else ''}")

    if is_valid is False:
        print(f"\nErro debug_token: {info.get('error') or 'token inválido'}")
        print(meta_token_renewal_hint())
        return 1

    if err and meta_token_invalid_message(err):
        print(f"\nErro: {err}")
        print(meta_token_renewal_hint())
        return 1

    days = days_until_expiry(expires_at)
    if days is not None and days < WARN_DAYS:
        print(f"\nAVISO: token expira em {days} dia(s) (< {WARN_DAYS}). Renove antes do vencimento.")
        print(meta_token_renewal_hint())
        if days < 0:
            return 1
        return 1

    print("\nToken Meta OK para o ETL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
