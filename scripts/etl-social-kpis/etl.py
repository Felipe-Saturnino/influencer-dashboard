"""
Social Media KPI Pipeline
Canais: LinkedIn, Instagram, YouTube, Facebook
Roda via GitHub Actions todo dia às 06:00 BRT

v2:
- Instagram: follower_count removido dos insights → followers_count no objeto IG
- Instagram/Facebook: engagement_rate limitado a 99.9999 (overflow no banco)
- Facebook: page_media_view + page_post_engagements (page_impressions deprecado nov/2025); post_media_view nos posts
- Facebook: Page Access Token derivado do System User (insights/posts exigem Page token #190)
- YouTube: subscriberCount (Channels API); Analytics day report sem métrica impressions; followers no kpi_daily

v3 (Meta):
- Facebook: não solicitar thumbnail_url em /posts (campo inválido no Post → 400); usar picture; fan_count na Page
- IG/FB: fallback de listagem sem since/until + filtro UTC; FB tenta published_posts; IG tenta fields mínimos
- Janelas since/until via _utc_day_unix_bounds; versão da API em META_GRAPH_VERSION (padrão v21.0)
- OAuth 190 / token expirado: preflight no job diário; collectors não retentam endpoints se o token já falhou
- YouTube: parse Analytics via columnHeaders + fallback views/engajamento somando vídeos do dia (Analytics vazio/atrasado)
- YouTube: vídeos do dia via playlistItems (uploads), não search.list (quota ~100/dia por chamada)
- FB/IG: insights de página/conta usam a mesma janela UTC que `TARGET_DATE` (posts e `kpi_daily.date`), não “hoje-2”
- Facebook: métricas de insights de página uma por requisição (evita #100 se um nome do lote for inválido)
"""

import os
import re
import time
import logging
from datetime import date, datetime, timedelta, timezone

import requests
from supabase import create_client, Client

from meta_token_utils import (
    days_until_expiry,
    format_expiry_label,
    meta_preflight as meta_preflight_api,
    meta_token_invalid_message,
    meta_token_invalid_response,
    meta_token_renewal_hint,
    resolve_page_access_token,
)

# ------------------------------------------------------------
# Config
# ------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))

META_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
META_PAGE_ID = os.environ.get("META_PAGE_ID", "")
META_IG_ACCOUNT_ID = os.environ.get("META_IG_ACCOUNT_ID", "")
# Ex.: v21.0, v22.0 — manter alinhado ao app em developers.facebook.com
_META_VER = (os.environ.get("META_GRAPH_VERSION") or "v21.0").strip()
if _META_VER and not _META_VER.startswith("v"):
    _META_VER = "v" + _META_VER


def graph_base() -> str:
    return f"https://graph.facebook.com/{_META_VER}"

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN", "")
YOUTUBE_CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "")

# channel_id -> uploads playlist id (evita channels.list repetido no mesmo processo)
_YT_UPLOADS_PLAYLIST_CACHE: dict[str, str] = {}

LINKEDIN_TOKEN = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_ORG_ID = os.environ.get("LINKEDIN_ORG_ID", "")

TARGET_DATE = date.today() - timedelta(days=1)
# Backfill (`backfill.py`) atribui `INSIGHTS_DATE` por dia; no job diário insights FB/IG usam o mesmo dia que `TARGET_DATE`.
INSIGHTS_DATE = date.today() - timedelta(days=2)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

_MAX_ENGAGEMENT_RATE = 99.9999
_CACHED_PAGE_ACCESS_TOKEN: str | None = None


class MetaTokenExpiredError(Exception):
    """Page/User access token da Meta expirado, revogado ou inválido (ex.: OAuth code 190)."""


def _meta_graph_error_dict(resp: requests.Response) -> dict | None:
    try:
        body = resp.json()
        err = body.get("error")
        return err if isinstance(err, dict) else None
    except Exception:
        return None


def _meta_graph_error_message(resp: requests.Response) -> str:
    err = _meta_graph_error_dict(resp)
    if err:
        return str(err.get("message") or "")[:800]
    return (resp.text or "")[:400]


def _meta_token_invalid_response(resp: requests.Response | None) -> bool:
    return meta_token_invalid_response(resp)


def _meta_token_invalid_message(text: str | None) -> bool:
    return meta_token_invalid_message(text)


def _redact_secrets_for_log(msg: str | None) -> str | None:
    """Nunca gravar access_token ou segredos em tech_logs / pipeline_runs."""
    if not msg:
        return msg
    s = str(msg)
    s = re.sub(r"([?&])access_token=[^&\s\"']+", r"\1access_token=REDACTED", s, flags=re.I)
    s = re.sub(r"(?i)access_token=[^&\s\"']+", "access_token=REDACTED", s)
    if META_TOKEN and len(META_TOKEN) > 12:
        s = s.replace(META_TOKEN, "REDACTED_META_TOKEN")
    return s[:2000]


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _log_api_error(resp: requests.Response, context: str = ""):
    """Loga o corpo da resposta quando a API retorna erro."""
    try:
        body = resp.json()
        err = body.get("error", {}) if isinstance(body.get("error"), dict) else {}
        err_msg = err.get("message", str(body))
        log.error("%s API erro %s: %s", context, resp.status_code, err_msg)
        if "expired" in err_msg.lower() or "session" in err_msg.lower():
            log.error("Meta — Token expirado. Gere novo Page Access Token em Meta for Developers.")
    except Exception:
        txt = (resp.text or "")[:500]
        log.error("%s API erro %s: %s", context, resp.status_code, txt)
        if "expired" in txt.lower():
            log.error("Meta — Token expirado. Gere novo Page Access Token em Meta for Developers.")


def _parse_api_datetime(val: object) -> str | None:
    """Normaliza timestamp ISO da Meta/YouTube para string compatível com timestamptz no Postgres."""
    if not val or not isinstance(val, str):
        return None
    s = val.strip()
    if s.endswith("+0000"):
        s = s[:-5] + "+00:00"
    s = s.replace("Z", "+00:00")
    try:
        from datetime import datetime

        return datetime.fromisoformat(s).isoformat()
    except ValueError:
        return None


def _utc_day_unix_bounds(d: date) -> tuple[int, int]:
    """Início inclusivo e fim exclusivo do dia calendário em UTC (since/until da Graph API)."""
    start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return int(start.timestamp()), int(end.timestamp())


def _meta_datetime_to_unix(s: str | None) -> float | None:
    """Parse de created_time (Facebook) ou timestamp (Instagram) em segundos UTC."""
    if not s or not isinstance(s, str):
        return None
    t = s.strip()
    if t.endswith("+0000"):
        t = t[:-5] + "+00:00"
    t = t.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except ValueError:
        return None


def _parse_iso_duration_seconds(duration: str) -> int:
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not m:
        return 0
    h, mn, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mn * 60 + s


def _classify_video(duration: str, snippet: dict) -> str:
    live_status = snippet.get("liveBroadcastContent", "none")
    if live_status in ("live", "upcoming"):
        return "live"
    if _parse_iso_duration_seconds(duration) <= 60:
        return "short"
    return "upload"


def _fetch_fb_insight_value(
    base: str,
    object_id: str,
    metric: str,
    token: str,
    *,
    period: str = "day",
    since_ts: int | None = None,
    until_ts: int | None = None,
) -> int | None:
    """Uma métrica por GET — evita #100 se um nome do lote for inválido."""
    params: dict[str, str | int] = {
        "metric": metric,
        "period": period,
        "access_token": token,
    }
    if since_ts is not None and until_ts is not None:
        params["since"] = since_ts
        params["until"] = until_ts
    r = requests.get(f"{base}/{object_id}/insights", params=params, timeout=60)
    if r.status_code != 200:
        return None
    for row in r.json().get("data", []):
        if row.get("name") == metric and row.get("values"):
            return int(row["values"][0]["value"] or 0)
    return None


def _fetch_fb_page_day_metrics(
    base: str, page_id: str, token: str, since_ts: int, until_ts: int
) -> dict[str, int]:
    """
    Insights de página com period=day, uma métrica por GET.
    page_impressions deprecado (nov/2025) → page_media_view.
    """
    out: dict[str, int] = {}
    views_key = "page_media_view"
    for i, metric in enumerate(("page_media_view", "page_impressions")):
        val = _fetch_fb_insight_value(
            base, page_id, metric, token, since_ts=since_ts, until_ts=until_ts
        )
        if val is not None:
            out[views_key] = val
            break
        if i == 1:
            log.warning(
                "Facebook — métricas page_media_view e page_impressions indisponíveis no dia."
            )

    eng_key = "page_post_engagements"
    for i, metric in enumerate(("page_post_engagements", "page_engaged_users")):
        val = _fetch_fb_insight_value(
            base, page_id, metric, token, since_ts=since_ts, until_ts=until_ts
        )
        if val is not None:
            out[eng_key] = val
            break
        if i == 0:
            log.warning("Facebook — page_post_engagements indisponível no dia.")
    return out


def _fetch_fb_post_insights(base: str, post_id: str, token: str) -> dict:
    """
    Métricas lifetime por post. post_impressions deprecado → post_media_view.
    """
    out: dict = {}

    for api_metric in ("post_media_view", "post_impressions"):
        if out.get("views") is not None:
            break
        r = requests.get(
            f"{base}/{post_id}/insights",
            params={"metric": api_metric, "period": "lifetime", "access_token": token},
            timeout=60,
        )
        if r.status_code != 200:
            if api_metric == "post_impressions":
                _log_api_error(r, f"Facebook post {post_id} views")
            continue
        for row in r.json().get("data", []):
            if row.get("name") == api_metric and row.get("values"):
                out["views"] = row["values"][0]["value"]
                break

    for api_metric, key in (
        ("post_reach", "reach"),
        ("post_clicks", "clicks"),
        ("post_shares", "shares"),
    ):
        val = _fetch_fb_insight_value(base, post_id, api_metric, token, period="lifetime")
        if val is not None:
            out[key] = val

    r = requests.get(
        f"{base}/{post_id}/insights",
        params={
            "metric": "post_reactions_by_type_total",
            "period": "lifetime",
            "access_token": token,
        },
        timeout=60,
    )
    if r.status_code == 200:
        for row in r.json().get("data", []):
            if row.get("name") == "post_reactions_by_type_total" and row.get("values"):
                out["reactions"] = row["values"][0]["value"]
                break
    else:
        _log_api_error(r, f"Facebook post {post_id} reactions")

    return out


def _youtube_uploads_playlist_id(base: str, channel_id: str, headers: dict) -> str | None:
    cached = _YT_UPLOADS_PLAYLIST_CACHE.get(channel_id)
    if cached:
        return cached
    if channel_id.startswith("UC") and len(channel_id) > 2:
        pid = "UU" + channel_id[2:]
        _YT_UPLOADS_PLAYLIST_CACHE[channel_id] = pid
        return pid
    ch = requests.get(
        f"{base}/channels",
        headers=headers,
        params={"part": "contentDetails", "id": channel_id},
        timeout=60,
    )
    if ch.status_code != 200:
        log.warning("YouTube — channels (uploads playlist): %s", ch.text[:200])
        return None
    items = ch.json().get("items") or []
    if not items:
        return None
    rel = (items[0].get("contentDetails") or {}).get("relatedPlaylists") or {}
    pid = rel.get("uploads")
    if pid:
        _YT_UPLOADS_PLAYLIST_CACHE[channel_id] = pid
    return pid


def _youtube_video_ids_published_on_day(
    base: str, playlist_id: str, headers: dict, target: date
) -> list[str]:
    """Lista videoIds publicados no dia UTC `target` via playlist de uploads (mais barato que search.list)."""
    day_start = datetime(target.year, target.month, target.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    out: list[str] = []
    page_token: str | None = None
    while True:
        params: dict[str, str | int] = {
            "part": "snippet",
            "playlistId": playlist_id,
            "maxResults": 50,
        }
        if page_token:
            params["pageToken"] = page_token
        r = requests.get(f"{base}/playlistItems", headers=headers, params=params, timeout=60)
        if r.status_code != 200:
            _log_api_error(r, "YouTube playlistItems")
            break
        data = r.json()
        for it in data.get("items", []):
            sn = it.get("snippet") or {}
            published = sn.get("publishedAt")
            if not published:
                continue
            try:
                ts = published.replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if dt >= day_end:
                continue
            if day_start <= dt < day_end:
                vid = (sn.get("resourceId") or {}).get("videoId")
                if vid:
                    out.append(vid)
            elif dt < day_start:
                return out
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return out


def _parse_yt_analytics_report(payload: dict) -> dict[str, int]:
    """
    Lê a 1ª linha do relatório YouTube Analytics v2 usando columnHeaders.
    Evita índices fixos (a 1ª coluna é a dimensão `day`, não views).
    Se columnHeaders vier vazio, tenta layout legado [day, views, watchMin, likes, comments, subsGained].
    """
    rows = payload.get("rows") or []
    if not rows:
        return {}
    row0 = rows[0]
    if not isinstance(row0, (list, tuple)) or len(row0) < 2:
        return {}

    headers = payload.get("columnHeaders") or []
    names: list[str] = []
    for h in headers:
        if isinstance(h, dict) and h.get("name"):
            names.append(str(h["name"]))

    out: dict[str, int] = {}
    if names:
        for i, name in enumerate(names):
            if i >= len(row0):
                break
            if name == "day":
                continue
            val = row0[i]
            if isinstance(val, bool):
                continue
            if isinstance(val, (int, float)):
                out[name] = int(val)
            elif isinstance(val, str) and val.strip():
                try:
                    out[name] = int(float(val.replace(",", ".")))
                except ValueError:
                    pass
        if out:
            return out

    # Legado: day + 5 métricas na ordem pedida pelo ETL
    if len(row0) >= 6:
        try:
            return {
                "views": int(row0[1]),
                "estimatedMinutesWatched": int(float(row0[2])),
                "likes": int(row0[3]),
                "comments": int(row0[4]),
                "subscribersGained": int(row0[5]),
            }
        except (TypeError, ValueError):
            pass
    return {}


def _fetch_yt_analytics_for_day(
    ana_base: str,
    headers: dict,
    channel_id: str,
    date_str: str,
) -> dict[str, int]:
    """
    Métricas diárias do canal. Tenta dimensions=day; se vier vazio (atraso comum),
    repete sem dimensão (totais agregados do dia).
    """
    metrics = "views,estimatedMinutesWatched,likes,comments,shares,subscribersGained"
    base_params = {
        "ids": f"channel=={channel_id}",
        "startDate": date_str,
        "endDate": date_str,
        "metrics": metrics,
    }
    for with_day in (True, False):
        params = dict(base_params)
        if with_day:
            params["dimensions"] = "day"
        resp = requests.get(f"{ana_base}/reports", headers=headers, params=params, timeout=60)
        if resp.status_code != 200:
            _log_api_error(resp, "YouTube Analytics")
            if with_day:
                log.warning(
                    "YouTube — Analytics (dimensions=day) HTTP %s para %s; tentando agregado.",
                    resp.status_code,
                    date_str,
                )
                continue
            resp.raise_for_status()
        parsed = _parse_yt_analytics_report(resp.json())
        if parsed:
            if not with_day:
                log.info("YouTube — Analytics agregado (sem dimensão day) para %s", date_str)
            return parsed
        if with_day:
            log.warning(
                "YouTube — Analytics sem linhas (dimensions=day) para %s; tentando agregado.",
                date_str,
            )
    return {}


def get_youtube_token() -> str:
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": YOUTUBE_CLIENT_ID,
            "client_secret": YOUTUBE_CLIENT_SECRET,
            "refresh_token": YOUTUBE_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def upsert(table: str, rows: list[dict], conflict_col: str = None):
    if not rows or not supabase:
        return 0
    opts = {"on_conflict": conflict_col} if conflict_col else {}
    supabase.table(table).upsert(rows, **opts).execute()
    return len(rows)


def log_run(channel: str, status: str, records: int = 0, error: str = None, ms: int = 0):
    if not supabase:
        return
    safe_err = _redact_secrets_for_log(error) if error else None
    supabase.table("pipeline_runs").insert(
        {
            "run_date": TARGET_DATE.isoformat(),
            "channel": channel,
            "status": status,
            "records_in": records,
            "error_msg": safe_err,
            "duration_ms": ms,
        }
    ).execute()
    if status == "error" and safe_err:
        try:
            supabase.table("tech_logs").insert(
                {"integracao_slug": None, "tipo": channel, "descricao": safe_err[:500]}
            ).execute()
        except Exception as e:
            log.warning("Falha ao registrar tech_log: %s", e)


def get_meta_page_access_token(force_refresh: bool = False) -> tuple[str | None, str]:
    """System User token → Page Access Token (cache por processo; backfill reutiliza)."""
    global _CACHED_PAGE_ACCESS_TOKEN
    if not force_refresh and _CACHED_PAGE_ACCESS_TOKEN:
        return _CACHED_PAGE_ACCESS_TOKEN, ""
    if not META_TOKEN or not META_PAGE_ID:
        return None, "META_ACCESS_TOKEN ou META_PAGE_ID ausente"
    pt, err = resolve_page_access_token(META_PAGE_ID, META_TOKEN)
    if pt:
        _CACHED_PAGE_ACCESS_TOKEN = pt
    else:
        _CACHED_PAGE_ACCESS_TOKEN = None
    return pt, err


def meta_backfill_preflight() -> tuple[bool, str]:
    """Preflight diário + Page Access Token (obrigatório para Facebook no backfill)."""
    ok, err = meta_preflight()
    if not ok:
        return False, err
    if META_TOKEN and META_PAGE_ID:
        pt, pt_err = get_meta_page_access_token()
        if not pt:
            msg = pt_err or "Page Access Token indisponível"
            return False, msg
        log.info("Meta Page Access Token OK (Facebook).")
    return True, ""


def meta_preflight() -> tuple[bool, str]:
    """Valida META_ACCESS_TOKEN (Page/IG) + log de expiração quando META_APP_* configurado."""
    ok, err, debug = meta_preflight_api(
        META_TOKEN,
        page_id=META_PAGE_ID or None,
        ig_account_id=META_IG_ACCOUNT_ID or None,
    )
    if ok:
        log.info("Meta preflight OK (token válido para Page/IG).")
        if debug and debug.get("is_valid") is not False:
            log.info("Meta token — %s", format_expiry_label(debug.get("expires_at")))
            days = days_until_expiry(debug.get("expires_at"))
            warn_days = int(os.environ.get("META_TOKEN_WARN_DAYS", "14"))
            if days is not None and days < warn_days:
                warn = (
                    f"META_ACCESS_TOKEN expira em {days} dia(s) ({format_expiry_label(debug.get('expires_at'))}). "
                    f"{meta_token_renewal_hint()}"
                )
                log.warning(warn)
                if supabase:
                    try:
                        supabase.table("tech_logs").insert(
                            {
                                "integracao_slug": "social_kpis",
                                "tipo": "meta_token_aviso",
                                "descricao": warn[:500],
                            }
                        ).execute()
                    except Exception as e:
                        log.warning("Falha ao registrar tech_log de aviso Meta: %s", e)
        return True, ""
    _log_api_error_from_msg(err, "Meta preflight")
    return False, err


def _log_api_error_from_msg(msg: str, context: str = ""):
    if msg:
        log.error("%s API erro: %s", context, msg)
        if "expired" in msg.lower() or "logged out" in msg.lower():
            log.error("Meta — Token expirado ou sessão invalidada. %s", meta_token_renewal_hint())


def _cap_engagement_rate(x: float) -> float:
    return min(round(x, 4), _MAX_ENGAGEMENT_RATE)


def _collect_ig_media_for_day(ig_id: str, token: str, day_start: int, day_end: int) -> list[dict]:
    """
    Lista mídias publicadas no dia [day_start, day_end) em UTC.
    Se since/until retornar erro, pagina sem filtro e filtra no cliente (feed mais recente primeiro).
    """
    base = graph_base()
    fields = (
        "id,timestamp,media_type,caption,permalink,thumbnail_url,media_url,"
        "like_count,comments_count"
    )

    def in_window(p: dict) -> bool:
        ts = _meta_datetime_to_unix(p.get("timestamp"))
        return ts is not None and day_start <= ts < day_end

    def add_batch(batch: list[dict], collected: list[dict], seen: set[str]) -> None:
        for p in batch:
            pid = str(p.get("id") or "")
            if not pid:
                continue
            if not in_window(p):
                continue
            if pid not in seen:
                seen.add(pid)
                collected.append(p)

    def walk_media(params: dict, open_paging: bool) -> tuple[list[dict], requests.Response | None]:
        """Percorre páginas; em open_paging para quando o item mais recente do lote for anterior ao dia."""
        collected: list[dict] = []
        seen: set[str] = set()
        next_url = None
        first = True
        while True:
            r = requests.get(
                next_url or f"{base}/{ig_id}/media",
                params=None if next_url else params,
                timeout=60,
            )
            if r.status_code != 200:
                if first:
                    return collected, r
                r.raise_for_status()
            data = r.json()
            batch = data.get("data", [])
            add_batch(batch, collected, seen)
            if not batch:
                break
            if open_paging:
                first_ts = _meta_datetime_to_unix(batch[0].get("timestamp"))
                if first_ts is not None and first_ts < day_start:
                    break
            next_url = data.get("paging", {}).get("next")
            if not next_url:
                break
            first = False
            time.sleep(0.3)
        return collected, None

    posts, err = walk_media(
        {
            "fields": fields,
            "since": day_start,
            "until": day_end,
            "limit": 100,
            "access_token": token,
        },
        open_paging=False,
    )
    if err is None:
        return posts

    if _meta_token_invalid_response(err):
        raise MetaTokenExpiredError(
            _meta_graph_error_message(err)
            or "META_ACCESS_TOKEN expirado ou inválido. Atualize o secret META_ACCESS_TOKEN no GitHub (Page Token em Meta for Developers)."
        )

    _log_api_error(err, "Instagram media (since/until)")
    log.warning("Instagram — fallback: listagem sem since/until + filtro UTC no servidor.")
    posts2, err2 = walk_media(
        {"fields": fields, "limit": 100, "access_token": token},
        open_paging=True,
    )
    if err2 is None:
        return posts2

    if _meta_token_invalid_response(err2):
        raise MetaTokenExpiredError(
            _meta_graph_error_message(err2)
            or "META_ACCESS_TOKEN expirado ou inválido."
        )

    _log_api_error(err2, "Instagram media (sem filtro)")
    fields_min = (
        "id,timestamp,media_type,caption,permalink,thumbnail_url,media_url"
    )
    log.warning(
        "Instagram — último fallback: fields sem like_count/comments_count no nó."
    )
    posts3, err3 = walk_media(
        {"fields": fields_min, "limit": 100, "access_token": token},
        open_paging=True,
    )
    if err3 is not None:
        if _meta_token_invalid_response(err3):
            raise MetaTokenExpiredError(
                _meta_graph_error_message(err3)
                or "META_ACCESS_TOKEN expirado ou inválido."
            )
        _log_api_error(err3, "Instagram media (fields mínimos)")
        err3.raise_for_status()
    return posts3


def _collect_fb_posts_for_day(page_id: str, token: str, day_start: int, day_end: int) -> list[dict]:
    """
    Posts da página no dia [day_start, day_end) em UTC.
    Não usar thumbnail_url em fields (não existe no objeto Post → 400).
    """
    base = graph_base()
    fields = "id,created_time,message,permalink_url,full_picture,status_type,picture"

    def in_window(p: dict) -> bool:
        ts = _meta_datetime_to_unix(p.get("created_time"))
        return ts is not None and day_start <= ts < day_end

    def add_batch(
        batch: list[dict], collected: list[dict], seen: set[str]
    ) -> None:
        for p in batch:
            pid = str(p.get("id") or "")
            if not pid:
                continue
            if not in_window(p):
                continue
            if pid not in seen:
                seen.add(pid)
                collected.append(p)

    def walk_posts(
        edge: str, params: dict, open_paging: bool
    ) -> tuple[list[dict], requests.Response | None]:
        collected: list[dict] = []
        seen: set[str] = set()
        next_url = None
        first = True
        while True:
            r = requests.get(
                next_url or f"{base}/{page_id}/{edge}",
                params=None if next_url else params,
                timeout=60,
            )
            if r.status_code != 200:
                if first:
                    return collected, r
                r.raise_for_status()
            data = r.json()
            batch = data.get("data", [])
            add_batch(batch, collected, seen)
            if not batch:
                break
            if open_paging:
                first_ts = _meta_datetime_to_unix(batch[0].get("created_time"))
                if first_ts is not None and first_ts < day_start:
                    break
            next_url = data.get("paging", {}).get("next")
            if not next_url:
                break
            first = False
            time.sleep(0.3)
        return collected, None

    posts, err = walk_posts(
        "posts",
        {
            "fields": fields,
            "since": day_start,
            "until": day_end,
            "limit": 100,
            "access_token": token,
        },
        open_paging=False,
    )
    if err is None:
        return posts

    if _meta_token_invalid_response(err):
        raise MetaTokenExpiredError(
            _meta_graph_error_message(err)
            or "META_ACCESS_TOKEN expirado ou inválido. Atualize o secret META_ACCESS_TOKEN no GitHub."
        )

    _log_api_error(err, "Facebook posts (since/until)")
    log.warning("Facebook — fallback: /posts sem since/until + filtro UTC no servidor.")
    posts2, err2 = walk_posts(
        "posts",
        {"fields": fields, "limit": 100, "access_token": token},
        open_paging=True,
    )
    if err2 is None:
        return posts2

    if _meta_token_invalid_response(err2):
        raise MetaTokenExpiredError(
            _meta_graph_error_message(err2)
            or "META_ACCESS_TOKEN expirado ou inválido."
        )

    _log_api_error(err2, "Facebook posts (sem filtro)")
    log.warning("Facebook — fallback: aresta published_posts.")
    posts3, err3 = walk_posts(
        "published_posts",
        {"fields": fields, "limit": 100, "access_token": token},
        open_paging=True,
    )
    if err3 is not None:
        if _meta_token_invalid_response(err3):
            raise MetaTokenExpiredError(
                _meta_graph_error_message(err3)
                or "META_ACCESS_TOKEN expirado ou inválido."
            )
        _log_api_error(err3, "Facebook published_posts")
        err3.raise_for_status()
    return posts3


# ------------------------------------------------------------
# Instagram
# ------------------------------------------------------------
def fetch_instagram():
    if not META_TOKEN:
        log.warning("Instagram — META_ACCESS_TOKEN não configurado, pulando")
        return
    if not META_IG_ACCOUNT_ID and not META_PAGE_ID:
        log.warning("Instagram — META_IG_ACCOUNT_ID ou META_PAGE_ID necessário, pulando")
        return

    t0 = time.monotonic()
    log.info("Instagram — iniciando coleta para %s", TARGET_DATE)
    base = graph_base()
    day_start, day_end = _utc_day_unix_bounds(TARGET_DATE)

    ig_id = META_IG_ACCOUNT_ID
    if not ig_id:
        page_resp = requests.get(
            f"{base}/{META_PAGE_ID}",
            params={"fields": "instagram_business_account", "access_token": META_TOKEN},
        )
        if page_resp.status_code != 200:
            _log_api_error(page_resp, "Instagram (Page lookup)")
            if _meta_token_invalid_response(page_resp):
                ms = int((time.monotonic() - t0) * 1000)
                log_run(
                    "instagram",
                    "error",
                    0,
                    error=_meta_graph_error_message(page_resp)
                    or "META_ACCESS_TOKEN expirado ou inválido.",
                    ms=ms,
                )
                return
            page_resp.raise_for_status()
        data = page_resp.json()
        ig_biz = data.get("instagram_business_account")
        if not ig_biz:
            log.error(
                "Instagram — Página %s não tem Instagram Business Account vinculada. Use META_IG_ACCOUNT_ID ou vincule no Meta Business.",
                META_PAGE_ID,
            )
            log_run("instagram", "error", 0, "Page sem IG Business Account")
            return
        ig_id = ig_biz.get("id")
        if not ig_id:
            log.error("Instagram — instagram_business_account.id não encontrado")
            log_run("instagram", "error", 0, "instagram_business_account.id ausente")
            return

    followers = 0
    profile_resp = requests.get(
        f"{base}/{ig_id}",
        params={"fields": "followers_count", "access_token": META_TOKEN},
    )
    if profile_resp.status_code == 200:
        followers = profile_resp.json().get("followers_count", 0) or 0
    elif _meta_token_invalid_response(profile_resp):
        ms = int((time.monotonic() - t0) * 1000)
        log_run(
            "instagram",
            "error",
            0,
            error=_meta_graph_error_message(profile_resp)
            or "META_ACCESS_TOKEN expirado ou inválido.",
            ms=ms,
        )
        return
    else:
        log.warning("Instagram — falha ao buscar followers_count: %s", profile_resp.text[:200])

    reach = None
    insights_resp = requests.get(
        f"{base}/{ig_id}/insights",
        params={
            "metric": "reach",
            "period": "day",
            "since": day_start,
            "until": day_end,
            "access_token": META_TOKEN,
        },
    )
    if insights_resp.status_code == 200:
        for m in insights_resp.json().get("data", []):
            if m["name"] == "reach" and m.get("values"):
                reach = m["values"][0]["value"]
    else:
        err_text = (insights_resp.text or "").lower()
        if "30 days" in err_text or "outside" in err_text or "range" in err_text or "follower_count" in err_text:
            log.warning("Instagram — Insights fora da janela de 30 dias (ignorando). Prosseguindo com posts.")
        else:
            _log_api_error(insights_resp, "Instagram insights")

    posts_raw = _collect_ig_media_for_day(ig_id, META_TOKEN, day_start, day_end)

    post_rows = []
    total_engagements = 0
    for p in posts_raw:
        ins_map = {}
        try:
            ins_resp = requests.get(
                f"{base}/{p['id']}/insights",
                params={"metric": "impressions,reach,saved,shares,video_views", "access_token": META_TOKEN},
            )
            if ins_resp.status_code == 200:
                ins_map = {i["name"]: i["values"][0]["value"] for i in ins_resp.json().get("data", [])}
        except Exception as e:
            log.debug("Instagram post %s insights: %s", p.get("id"), e)

        likes = p.get("like_count", 0)
        comments = p.get("comments_count", 0)
        eng = likes + comments + ins_map.get("saved", 0) + ins_map.get("shares", 0)
        impr = ins_map.get("impressions", 1) or 1
        total_engagements += eng
        thumbnail = p.get("thumbnail_url") or p.get("media_url")

        post_rows.append(
            {
                "post_id": p["id"],
                "date": TARGET_DATE.isoformat(),
                "published_at": _parse_api_datetime(p.get("timestamp")),
                "type": p.get("media_type"),
                "caption": (p.get("caption") or "")[:500],
                "permalink": p.get("permalink"),
                "thumbnail_url": thumbnail[:2048] if thumbnail else None,
                "impressions": ins_map.get("impressions"),
                "reach": ins_map.get("reach"),
                "likes": likes,
                "comments": comments,
                "saves": ins_map.get("saved"),
                "shares": ins_map.get("shares"),
                "video_views": ins_map.get("video_views"),
                "engagement_rate": _cap_engagement_rate(eng / impr),
            }
        )

    impressions_proxy = max(reach or 0, 1)
    kpi_row = {
        "channel": "instagram",
        "date": TARGET_DATE.isoformat(),
        "followers": followers,
        "impressions": reach,
        "reach": reach,
        "engagements": total_engagements,
        "engagement_rate": _cap_engagement_rate(total_engagements / impressions_proxy),
        "posts_published": len(post_rows),
    }

    upsert("instagram_posts", post_rows, "post_id")
    upsert("kpi_daily", [kpi_row], "channel,date")

    ms = int((time.monotonic() - t0) * 1000)
    log_run("instagram", "success", len(post_rows), ms=ms)
    log.info("Instagram — %d posts salvos (%dms)", len(post_rows), ms)


# ------------------------------------------------------------
# Facebook
# ------------------------------------------------------------
def fetch_facebook():
    if not META_TOKEN or not META_PAGE_ID:
        log.warning("Facebook — META_ACCESS_TOKEN e META_PAGE_ID não configurados, pulando")
        return

    page_token, pt_err = get_meta_page_access_token()
    if not page_token:
        msg = pt_err or "Page Access Token indisponível"
        log.error("Facebook — %s", msg)
        log_run("facebook", "error", 0, _redact_secrets_for_log(msg))
        return

    t0 = time.monotonic()
    log.info("Facebook — iniciando coleta para %s (Page Access Token)", TARGET_DATE)
    base = graph_base()
    day_start, day_end = _utc_day_unix_bounds(TARGET_DATE)

    page_resp = requests.get(
        f"{base}/{META_PAGE_ID}",
        params={"fields": "fan_count", "access_token": page_token},
    )
    page_data = page_resp.json() if page_resp.status_code == 200 else {}
    if page_resp.status_code != 200:
        _log_api_error(page_resp, "Facebook page fan_count")
    followers_count = page_data.get("fan_count")

    metrics = _fetch_fb_page_day_metrics(base, META_PAGE_ID, page_token, day_start, day_end)
    if not metrics:
        log.warning("Facebook — insights de página não obtidos; continuando com posts apenas.")

    posts_raw = _collect_fb_posts_for_day(META_PAGE_ID, page_token, day_start, day_end)

    _STATUS_MAP = {
        "added_photos": "photo",
        "added_video": "video",
        "shared_story": "link",
        "mobile_status_update": "status",
        "published_story": "status",
    }

    post_rows = []
    total_eng = 0
    for p in posts_raw:
        ins_map = _fetch_fb_post_insights(base, p["id"], page_token)

        val = ins_map.get("reactions")
        if isinstance(val, dict):
            reactions = sum(val.values())
        elif isinstance(val, (int, float)):
            reactions = int(val)
        else:
            reactions = 0

        clicks = ins_map.get("clicks") or 0
        shares = ins_map.get("shares") or 0
        eng = reactions + clicks + shares
        views = ins_map.get("views")
        impr = views if views not in (None, 0) else 1
        total_eng += eng

        fb_type = _STATUS_MAP.get(p.get("status_type", ""), "status")
        thumb = p.get("full_picture") or p.get("picture")

        post_rows.append(
            {
                "post_id": p["id"],
                "date": TARGET_DATE.isoformat(),
                "published_at": _parse_api_datetime(p.get("created_time")),
                "type": fb_type,
                "message": (p.get("message") or "")[:500],
                "permalink": p.get("permalink_url"),
                "thumbnail_url": (thumb[:2048] if thumb else None),
                "impressions": views if isinstance(views, (int, float)) else None,
                "reach": ins_map.get("reach"),
                "reactions": reactions,
                "comments": 0,
                "shares": shares if isinstance(shares, (int, float)) else None,
                "link_clicks": clicks if isinstance(clicks, (int, float)) else None,
                "engagement_rate": _cap_engagement_rate(eng / impr),
            }
        )

    page_views = metrics.get("page_media_view") or metrics.get("page_impressions") or 1
    engagements = metrics.get("page_post_engagements", total_eng)
    if engagements is None:
        engagements = total_eng

    kpi_row = {
        "channel": "facebook",
        "date": TARGET_DATE.isoformat(),
        "followers": followers_count,
        "impressions": metrics.get("page_media_view") or metrics.get("page_impressions"),
        "reach": metrics.get("page_media_view") or metrics.get("page_impressions"),
        "engagements": engagements,
        "engagement_rate": _cap_engagement_rate(
            int(engagements or 0) / max(1, int(page_views or 1))
        ),
        "posts_published": len(post_rows),
        "link_clicks": sum(r.get("link_clicks") or 0 for r in post_rows),
    }

    upsert("facebook_posts", post_rows, "post_id")
    upsert("kpi_daily", [kpi_row], "channel,date")

    ms = int((time.monotonic() - t0) * 1000)
    log_run("facebook", "success", len(post_rows), ms=ms)
    log.info("Facebook — %d posts salvos (%dms)", len(post_rows), ms)


# ------------------------------------------------------------
# YouTube
# ------------------------------------------------------------
def fetch_youtube():
    if not all([YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, YOUTUBE_CHANNEL_ID]):
        log.warning("YouTube — credenciais não configuradas, pulando")
        return

    t0 = time.monotonic()
    log.info("YouTube — iniciando coleta para %s", TARGET_DATE)
    base = "https://www.googleapis.com/youtube/v3"
    ana_base = "https://youtubeanalytics.googleapis.com/v2"
    headers = {"Authorization": f"Bearer {get_youtube_token()}"}
    date_str = TARGET_DATE.isoformat()

    subscribers = None
    channel_resp = requests.get(
        f"{base}/channels",
        headers=headers,
        params={"part": "statistics", "id": YOUTUBE_CHANNEL_ID},
    )
    if channel_resp.status_code == 200:
        items = channel_resp.json().get("items", [])
        if items:
            stats = items[0].get("statistics", {})
            subscribers = int(stats.get("subscriberCount", 0))
            log.info("YouTube — inscritos: %s", subscribers)
    else:
        log.warning("YouTube — falha ao buscar inscritos: %s", channel_resp.text[:200])

    # YouTube Analytics v2: impressions não entra neste report; likes/comments podem atrasar com dimensions=day.
    am = _fetch_yt_analytics_for_day(ana_base, headers, YOUTUBE_CHANNEL_ID, date_str)
    views = int(am.get("views", 0) or 0)
    watch_min = float(am.get("estimatedMinutesWatched", 0) or 0)
    likes = int(am.get("likes", 0) or 0)
    comments = int(am.get("comments", 0) or 0)
    subs_gained = int(am.get("subscribersGained", 0) or 0)
    if not am:
        log.warning("YouTube — Analytics sem dados para %s (day + agregado).", date_str)
    channel_impressions = None  # não disponível neste report; dashboard usa video_views no fallback
    channel_ctr = None

    shares = int(am.get("shares", 0) or 0)

    playlist_id = _youtube_uploads_playlist_id(base, YOUTUBE_CHANNEL_ID, headers)
    video_ids: list[str] = []
    if playlist_id:
        video_ids = _youtube_video_ids_published_on_day(base, playlist_id, headers, TARGET_DATE)
        log.info("YouTube — playlist uploads: %d vídeo(s) no dia %s", len(video_ids), date_str)
    else:
        log.warning("YouTube — uploads playlistId não resolvido; sem linhas em youtube_videos para o dia.")

    video_rows = []
    if video_ids:
        for off in range(0, len(video_ids), 50):
            chunk = video_ids[off : off + 50]
            stats_resp = requests.get(
                f"{base}/videos",
                headers=headers,
                params={"part": "statistics,contentDetails,snippet", "id": ",".join(chunk)},
                timeout=60,
            )
            if stats_resp.status_code != 200:
                _log_api_error(stats_resp, "YouTube videos")
                stats_resp.raise_for_status()
            for v in stats_resp.json().get("items", []):
                s = v.get("statistics", {})
                duration = v["contentDetails"].get("duration", "PT0S")
                vtype = _classify_video(duration, v["snippet"])
                video_rows.append(
                    {
                        "video_id": v["id"],
                        "date": date_str,
                        "published_at": _parse_api_datetime(v["snippet"].get("publishedAt")),
                        "title": v["snippet"]["title"],
                        "type": vtype,
                        "views": int(s.get("viewCount", 0)),
                        "watch_time_min": int(watch_min) if len(video_ids) == 1 else None,
                        "avg_view_pct": None,
                        "likes": int(s.get("likeCount", 0)),
                        "comments": int(s.get("commentCount", 0)),
                        "impressions": channel_impressions if len(video_ids) == 1 else None,
                        "ctr": channel_ctr if len(video_ids) == 1 else None,
                        "subscribers_gained": int(subs_gained) if len(video_ids) == 1 else None,
                    }
                )

    # Analytics pode vir vazio ou atrasado para o dia; o dashboard usa video_views do kpi_daily.
    v_views = sum(int(r.get("views", 0) or 0) for r in video_rows)
    v_likes = sum(int(r.get("likes", 0) or 0) for r in video_rows)
    v_comments = sum(int(r.get("comments", 0) or 0) for r in video_rows)
    if views == 0 and v_views > 0:
        log.warning(
            "YouTube — KPI: views do Analytics = 0; usando soma das views dos vídeos publicados no dia (%s).",
            v_views,
        )
        views = v_views
    eng_analytics = likes + comments + shares
    eng_videos = v_likes + v_comments
    eng_total = max(eng_analytics, eng_videos)
    if eng_videos > eng_analytics:
        log.warning(
            "YouTube — KPI: engajamento Analytics=%s; usando max com likes+comentários dos vídeos do dia (%s).",
            eng_analytics,
            eng_videos,
        )

    eng_base = max(views, 1)

    kpi_row = {
        "channel": "youtube",
        "date": date_str,
        "followers": subscribers,
        "impressions": channel_impressions,
        "video_views": views,
        "engagements": eng_total,
        "engagement_rate": _cap_engagement_rate(eng_total / eng_base),
        "posts_published": len(video_rows),
    }

    upsert("youtube_videos", video_rows, "video_id,date")
    upsert("kpi_daily", [kpi_row], "channel,date")

    ms = int((time.monotonic() - t0) * 1000)
    log_run("youtube", "success", len(video_rows), ms=ms)
    log.info("YouTube — %d vídeos salvos (%dms)", len(video_rows), ms)


# ------------------------------------------------------------
# LinkedIn
# ------------------------------------------------------------
def fetch_linkedin():
    if not LINKEDIN_TOKEN or not LINKEDIN_ORG_ID:
        log.warning("LinkedIn — LINKEDIN_ACCESS_TOKEN e LINKEDIN_ORG_ID não configurados, pulando")
        return

    t0 = time.monotonic()
    log.info("LinkedIn — iniciando coleta para %s", TARGET_DATE)
    base = "https://api.linkedin.com/v2"
    headers = {
        "Authorization": f"Bearer {LINKEDIN_TOKEN}",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    date_str = TARGET_DATE.isoformat()
    since_ms = int((TARGET_DATE - date(1970, 1, 1)).total_seconds()) * 1000
    until_ms = since_ms + 86400000

    followers_resp = requests.get(
        f"{base}/networkSizes/{LINKEDIN_ORG_ID}",
        headers=headers,
        params={"edgeType": "CompanyFollowedByMember"},
    )
    followers_resp.raise_for_status()
    followers = followers_resp.json().get("firstDegreeSize", 0)

    posts_resp = requests.get(
        f"{base}/posts",
        headers=headers,
        params={
            "q": "author",
            "author": LINKEDIN_ORG_ID,
            "count": 50,
            "sortBy": "LAST_MODIFIED",
        },
    )
    posts_resp.raise_for_status()
    posts_raw = posts_resp.json().get("elements", [])

    post_rows = []
    total_impressions = 0
    total_engagements = 0

    for p in posts_raw:
        post_id = p.get("id", "")
        if not post_id:
            continue

        ana_resp = requests.get(
            f"{base}/organizationalEntityShareStatistics",
            headers=headers,
            params={
                "q": "organizationalEntity",
                "organizationalEntity": LINKEDIN_ORG_ID,
                "shares[0]": post_id,
                "timeIntervals.timeRange.start": since_ms,
                "timeIntervals.timeRange.end": until_ms,
            },
        )
        if ana_resp.status_code != 200:
            continue
        elements = ana_resp.json().get("elements", [{}])
        if not elements:
            continue
        stats = elements[0].get("totalShareStatistics", {})

        impressions = stats.get("impressionCount", 0)
        clicks = stats.get("clickCount", 0)
        reactions = stats.get("likeCount", 0)
        comments = stats.get("commentCount", 0)
        shares = stats.get("shareCount", 0)
        engagement = clicks + reactions + comments + shares
        total_impressions += impressions
        total_engagements += engagement

        post_rows.append(
            {
                "post_id": post_id,
                "date": date_str,
                "impressions": impressions,
                "unique_impressions": stats.get("uniqueImpressionsCount"),
                "clicks": clicks,
                "reactions": reactions,
                "comments": comments,
                "shares": shares,
                "engagement_rate": round(engagement / max(impressions, 1), 4),
                "ctr": round(clicks / max(impressions, 1), 4),
            }
        )

    kpi_row = {
        "channel": "linkedin",
        "date": date_str,
        "followers": followers,
        "impressions": total_impressions,
        "engagements": total_engagements,
        "engagement_rate": _cap_engagement_rate(total_engagements / max(total_impressions, 1)),
        "posts_published": len(post_rows),
        "link_clicks": sum(r.get("clicks") or 0 for r in post_rows),
    }

    upsert("linkedin_posts", post_rows, "post_id")
    upsert("kpi_daily", [kpi_row], "channel,date")

    ms = int((time.monotonic() - t0) * 1000)
    log_run("linkedin", "success", len(post_rows), ms=ms)
    log.info("LinkedIn — %d posts salvos (%dms)", len(post_rows), ms)


# ------------------------------------------------------------
# Entry point
# ------------------------------------------------------------
if __name__ == "__main__":
    if not supabase:
        log.error("SUPABASE_URL e SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) são obrigatórios")
        exit(1)

    skip_meta = False
    meta_skip_msg = ""
    if META_TOKEN and (META_PAGE_ID or META_IG_ACCOUNT_ID):
        ok_pf, err_pf = meta_preflight()
        if not ok_pf and _meta_token_invalid_message(err_pf):
            skip_meta = True
            meta_skip_msg = (
                "META_ACCESS_TOKEN expirado ou inválido (Meta). "
                f"{meta_token_renewal_hint()} "
                f"Detalhe: {err_pf[:700] if err_pf else ''}"
            )
            log.error("Meta preflight — Instagram e Facebook serão pulados neste job. %s", meta_skip_msg[:900])
            if supabase:
                try:
                    supabase.table("tech_logs").insert(
                        {
                            "integracao_slug": "social_kpis",
                            "tipo": "meta_token_expirado",
                            "descricao": meta_skip_msg[:500],
                        }
                    ).execute()
                except Exception as e:
                    log.warning("Falha ao registrar tech_log Meta expirado: %s", e)

    channels = {
        "instagram": fetch_instagram,
        "facebook": fetch_facebook,
        "youtube": fetch_youtube,
        "linkedin": fetch_linkedin,
    }
    for name, fn in channels.items():
        try:
            if skip_meta and name in ("instagram", "facebook"):
                log.warning("Pulando %s — token Meta inválido no preflight.", name)
                log_run(name, "error", 0, error=meta_skip_msg)
                continue
            fn()
        except MetaTokenExpiredError as exc:
            log.error("%s — token Meta inválido: %s", name, exc)
            log_run(name, "error", 0, error=str(exc))
        except Exception as exc:
            log.error("%s — ERRO: %s", name, exc, exc_info=True)
            log_run(name, "error", error=str(exc))
