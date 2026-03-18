"""
Backfill histórico — Social Media KPIs
Executa o ETL para um intervalo de datas (ex.: jan/2026 até ontem).
Uso:
  python backfill.py
  # ou com env vars:
  BACKFILL_START_DATE=2026-01-01 BACKFILL_END_DATE=2026-03-17 python backfill.py
"""

import os
import time
import logging
from datetime import date, timedelta

# Importa o módulo etl para usar as funções e alterar TARGET_DATE/INSIGHTS_DATE
import etl

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def parse_date(s: str) -> date:
    """Converte 'YYYY-MM-DD' em date."""
    return date.fromisoformat(s.strip())


def date_range(start: date, end: date):
    """Gera datas de start até end (inclusive)."""
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def main():
    today = date.today()
    yesterday = today - timedelta(days=1)

    start_s = os.environ.get("BACKFILL_START_DATE", "2026-01-01")
    end_s = os.environ.get("BACKFILL_END_DATE", yesterday.isoformat())

    try:
        start_date = parse_date(start_s)
        end_date = parse_date(end_s)
    except ValueError as e:
        log.error("Datas inválidas. Use formato YYYY-MM-DD. %s", e)
        exit(1)

    if start_date > end_date:
        log.error("BACKFILL_START_DATE deve ser <= BACKFILL_END_DATE")
        exit(1)

    if end_date > yesterday:
        log.warning("BACKFILL_END_DATE após ontem; limitando a %s", yesterday)
        end_date = yesterday

    days = (end_date - start_date).days + 1
    log.info("=== Backfill: %s a %s (%d dias) ===", start_date, end_date, days)

    channels = [
        ("instagram", etl.fetch_instagram),
        ("facebook", etl.fetch_facebook),
        ("youtube", etl.fetch_youtube),
        ("linkedin", etl.fetch_linkedin),
    ]

    for d in date_range(start_date, end_date):
        etl.TARGET_DATE = d
        # Para backfill histórico, insights já estão disponíveis; usar mesma data
        etl.INSIGHTS_DATE = d

        log.info("--- Processando %s ---", d)
        for name, fn in channels:
            try:
                fn()
            except Exception as exc:
                log.error("%s — ERRO: %s", name, exc, exc_info=True)
                etl.log_run(name, "error", error=str(exc))

        # Pequena pausa entre dias para evitar rate limit
        if d < end_date:
            time.sleep(2)

    log.info("=== Backfill concluído ===")


if __name__ == "__main__":
    if not etl.supabase:
        log.error("SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios")
        exit(1)
    main()
