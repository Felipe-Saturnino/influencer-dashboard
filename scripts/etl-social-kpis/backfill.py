"""
Backfill histórico — Social Media KPIs
Executa o ETL para um intervalo de datas (ex.: jan/2026 até ontem).

Uso:
  python backfill.py

Variáveis de ambiente:
  BACKFILL_START_DATE=2026-01-01
  BACKFILL_END_DATE=2026-06-01
  BACKFILL_SLEEP_SECONDS=2          # pausa entre dias (rate limit Meta)
  BACKFILL_CHANNELS=instagram,facebook   # vazio = todos os canais configurados
  BACKFILL_FAIL_FAST_META=1         # para no primeiro OAuth 190 / token expirado
  SKIP_META_PREFLIGHT=1             # só se souber o que está fazendo
"""

import os
import time
import logging
from datetime import date, timedelta

import etl
from etl import MetaTokenExpiredError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

_ALL_CHANNELS: tuple[tuple[str, object], ...] = (
    ("instagram", etl.fetch_instagram),
    ("facebook", etl.fetch_facebook),
    ("youtube", etl.fetch_youtube),
    ("linkedin", etl.fetch_linkedin),
    ("meta_ads", etl.fetch_meta_ads),
)


def parse_date(s: str) -> date:
    return date.fromisoformat(s.strip())


def date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _parse_channels_env() -> list[tuple[str, object]]:
    raw = os.environ.get("BACKFILL_CHANNELS", "").strip()
    if not raw:
        return list(_ALL_CHANNELS)
    wanted = {c.strip().lower() for c in raw.split(",") if c.strip()}
    known = {name for name, _ in _ALL_CHANNELS}
    unknown = wanted - known
    if unknown:
        log.error(
            "BACKFILL_CHANNELS inválido: %s. Use: %s",
            ", ".join(sorted(unknown)),
            ", ".join(sorted(known)),
        )
        exit(1)
    selected = [(n, fn) for n, fn in _ALL_CHANNELS if n in wanted]
    if not selected:
        log.error("BACKFILL_CHANNELS não selecionou nenhum canal.")
        exit(1)
    return selected


def _meta_fail_fast_enabled() -> bool:
    return os.environ.get("BACKFILL_FAIL_FAST_META", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _should_abort_on_meta_error(exc: BaseException) -> bool:
    if isinstance(exc, MetaTokenExpiredError):
        return True
    if not _meta_fail_fast_enabled():
        return False
    exc_s = str(exc).lower()
    return (
        "expired" in exc_s
        or "session has expired" in exc_s
        or "session is invalid" in exc_s
        or "user logged out" in exc_s
        or "oauth" in exc_s
        or "error validating access token" in exc_s
    )


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

    channels = _parse_channels_env()
    channel_names = [n for n, _ in channels]
    days = (end_date - start_date).days + 1
    sleep_sec = float(os.environ.get("BACKFILL_SLEEP_SECONDS", "2"))

    log.info(
        "=== Backfill: %s a %s (%d dias) | canais: %s | pausa: %ss ===",
        start_date,
        end_date,
        days,
        ", ".join(channel_names),
        sleep_sec,
    )

    if os.environ.get("SKIP_META_PREFLIGHT", "").strip().lower() not in ("1", "true", "yes"):
        needs_meta = "instagram" in channel_names or "facebook" in channel_names
        if needs_meta:
            ok, err = etl.meta_backfill_preflight()
            if not ok:
                log.error(
                    "Backfill abortado: Meta inválido ou Page Access Token indisponível. "
                    "Use System User no Business Manager e atualize META_ACCESS_TOKEN no GitHub. "
                    "Detalhe: %s",
                    err,
                )
                exit(1)
        if "meta_ads" in channel_names:
            if not etl.META_AD_ACCOUNT_ID:
                log.error(
                    "Backfill inclui meta_ads mas META_AD_ACCOUNT_ID não está definido. "
                    "Cadastre o secret act_… no GitHub Actions."
                )
                exit(1)
            ok_ads, err_ads = etl.meta_ads_account_preflight()
            if not ok_ads:
                log.error("Backfill abortado: Meta Ads inacessível. Detalhe: %s", err_ads)
                exit(1)

    day_idx = 0
    for d in date_range(start_date, end_date):
        day_idx += 1
        etl.TARGET_DATE = d
        etl.INSIGHTS_DATE = d

        log.info("--- Dia %d/%d: %s ---", day_idx, days, d)
        for name, fn in channels:
            try:
                fn()
            except Exception as exc:
                log.error("%s — ERRO: %s", name, exc, exc_info=True)
                etl.log_run(name, "error", error=str(exc))
                if name in ("instagram", "facebook") and _should_abort_on_meta_error(exc):
                    log.error(
                        "Backfill interrompido: corrija o token Meta / Page Access Token e rode de novo."
                    )
                    exit(1)

        if d < end_date and sleep_sec > 0:
            time.sleep(sleep_sec)

    log.info("=== Backfill concluído (%d dias, canais: %s) ===", days, ", ".join(channel_names))


if __name__ == "__main__":
    if not etl.supabase:
        log.error("SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios")
        exit(1)
    main()
