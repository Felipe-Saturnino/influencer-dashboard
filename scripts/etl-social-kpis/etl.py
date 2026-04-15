"""
Social Media KPI Pipeline
Canais: LinkedIn, Instagram, YouTube, Facebook
Roda via GitHub Actions todo dia às 06:00 BRT

v2:
- Instagram: follower_count removido dos insights → followers_count no objeto IG
- Instagram/Facebook: engagement_rate limitado a 99.9999 (overflow no banco)
- Facebook: page_impressions + page_post_engagements (page_engaged_users inválido na API); post_impressions nos posts
- YouTube: subscriberCount (Channels API); Analytics day report sem métrica impressions; followers no kpi_daily

v3 (Meta):
- Facebook: não solicitar thumbnail_url em /posts (campo inválido no Post → 400); usar picture; fan_count na Page
- IG/FB: fallback de listagem sem since/until + filtro UTC; FB tenta published_posts; IG tenta fields mínimos
- Janelas since/until via _utc_day_unix_bounds; versão da API em META_GRAPH_VERSION (padrão v21.0)
- OAuth 190 / token expirado: preflight no job diário; collectors não retentam endpoints se o token já falhou
- YouTube: parse Analytics via columnHeaders + fallback views/engajamento somando vídeos do dia (Analytics vazio/atrasado)
"""

import os
import re
import time
import logging
from datetime import date, datetime, timedelta, timezone

import requests
from supabase import create_client, Client

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

LINKEDIN_TOKEN = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_ORG_ID = os.environ.get("LINKEDIN_ORG_ID", "")

TARGET_DATE = date.today() - timedelta(days=1)
# Backfill redefine por dia; no job diário não usar “hoje-2” para insights — alinhar ao TARGET_DATE (mesmo dia dos posts e de kpi_daily.date)
INSIGHTS_DATE = date.today() - timedelta(days=2)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

_MAX_ENGAGEMENT_RATE = 99.9999


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
    """HTTP 400/401 com OAuth 190 ou mensagem típica de sessão/token expirado."""
    if resp is None or resp.status_code not in (400, 401, 403):
        return False
    err = _meta_graph_error_dict(resp)
    if err:
        if err.get("code") == 190:
            return True
        msg = (err.get("message") or "").lower()
        if "error validating access token" in msg:
            return True
        if "session has expired" in msg or ("has expired" in msg and "token" in msg):
            return True
        if "has been invalidated" in msg or "invalidated" in msg:
            return True
    raw = (resp.text or "").lower()
    return "session has expired" in raw or '"code":190' in raw.replace(" ", "")


def _meta_token_invalid_message(text: str | None) -> bool:
    if not text:
        return False
    t = text.lower()
    compact = text.replace(" ", "").replace("\n", "")
    return (
        "session has expired" in t
        or "error validating access token" in t
        or '"code":190' in compact
        or ("expired" in t and "access token" in t)
    )


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


def meta_preflight() -> tuple[bool, str]:
    """
    Valida META_ACCESS_TOKEN com uma chamada mínima à Graph API.
    Use no início do backfill para evitar centenas de erros quando o token expirou.
    Se Meta não estiver configurado, retorna (True, '').
    """
    if not META_TOKEN:
        return True, ""
    if not META_PAGE_ID and not META_IG_ACCOUNT_ID:
        return True, ""
    base = graph_base()
    try:
        if META_PAGE_ID:
            r = requests.get(
                f"{base}/{META_PAGE_ID}",
                params={"fields": "id,name", "access_token": META_TOKEN},
                timeout=30,
            )
        else:
            r = requests.get(
                f"{base}/{META_IG_ACCOUNT_ID}",
                params={"fields": "id,username", "access_token": META_TOKEN},
                timeout=30,
            )
        if r.status_code == 200:
            log.info("Meta preflight OK (token válido para Page/IG).")
            return True, ""
        _log_api_error(r, "Meta preflight")
        msg = _meta_graph_error_message(r)
        if not msg:
            msg = (r.text or "")[:400]
        return False, msg
    except requests.RequestException as e:
        log.error("Meta preflight — falha de rede: %s", e)
        return False, str(e)


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

    t0 = time.monotonic()
    log.info("Facebook — iniciando coleta para %s", TARGET_DATE)
    base = graph_base()
    day_start, day_end = _utc_day_unix_bounds(TARGET_DATE)

    page_resp = requests.get(
        f"{base}/{META_PAGE_ID}",
        params={"fields": "fan_count", "access_token": META_TOKEN},
    )
    page_data = page_resp.json() if page_resp.status_code == 200 else {}
    followers_count = page_data.get("fan_count")

    metrics = {}
    # page_engaged_users não é métrica válida no endpoint atual → (#100) valid insights metric
    ins_resp = requests.get(
        f"{base}/{META_PAGE_ID}/insights",
        params={
            "metric": "page_impressions,page_post_engagements",
            "period": "day",
            "since": day_start,
            "until": day_end,
            "access_token": META_TOKEN,
        },
    )
    if ins_resp.status_code == 200:
        for m in ins_resp.json().get("data", []):
            if m.get("values"):
                metrics[m["name"]] = m["values"][0]["value"]
    else:
        _log_api_error(ins_resp, "Facebook insights")
        log.warning("Facebook — insights indisponíveis, continuando sem métricas de página.")

    posts_raw = _collect_fb_posts_for_day(META_PAGE_ID, META_TOKEN, day_start, day_end)

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
        ins_resp_p = requests.get(
            f"{base}/{p['id']}/insights",
            params={
                "metric": "post_impressions,post_reach,post_reactions_by_type_total,post_clicks,post_shares",
                "access_token": META_TOKEN,
            },
            timeout=60,
        )
        if ins_resp_p.status_code != 200:
            _log_api_error(ins_resp_p, f"Facebook post {p.get('id')} insights")
            ins_map = {}
        else:
            ins_map = {
                i["name"]: i["values"][0]["value"]
                for i in ins_resp_p.json().get("data", [])
                if i.get("values")
            }

        val = ins_map.get("post_reactions_by_type_total")
        if isinstance(val, dict):
            reactions = sum(val.values())
        elif isinstance(val, (int, float)):
            reactions = int(val)
        else:
            reactions = 0

        eng = reactions + ins_map.get("post_clicks", 0) + ins_map.get("post_shares", 0)
        impr = ins_map.get("post_impressions", 1) or 1
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
                "impressions": ins_map.get("post_impressions"),
                "reach": ins_map.get("post_reach"),
                "reactions": reactions,
                "comments": 0,
                "shares": ins_map.get("post_shares"),
                "link_clicks": ins_map.get("post_clicks"),
                "engagement_rate": _cap_engagement_rate(eng / impr),
            }
        )

    page_impressions = metrics.get("page_impressions", 1) or 1
    engagements = metrics.get("page_post_engagements", total_eng)
    if engagements is None:
        engagements = total_eng

    kpi_row = {
        "channel": "facebook",
        "date": TARGET_DATE.isoformat(),
        "followers": followers_count,
        "impressions": metrics.get("page_impressions"),
        "reach": metrics.get("page_impressions"),
        "engagements": engagements,
        "engagement_rate": _cap_engagement_rate(int(engagements or 0) / max(1, int(page_impressions or 1))),
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

    # YouTube Analytics v2: a métrica "impressions" não é válida com dimensions=day neste relatório
    # (400 Unknown identifier). Métricas suportadas: views, estimatedMinutesWatched, likes, etc.
    ana_resp = requests.get(
        f"{ana_base}/reports",
        headers=headers,
        params={
            "ids": f"channel=={YOUTUBE_CHANNEL_ID}",
            "startDate": date_str,
            "endDate": date_str,
            "dimensions": "day",
            "metrics": "views,estimatedMinutesWatched,likes,comments,subscribersGained",
        },
    )
    if ana_resp.status_code != 200:
        _log_api_error(ana_resp, "YouTube Analytics")
        ana_resp.raise_for_status()

    ana_payload = ana_resp.json()
    am = _parse_yt_analytics_report(ana_payload)
    views = int(am.get("views", 0) or 0)
    watch_min = float(am.get("estimatedMinutesWatched", 0) or 0)
    likes = int(am.get("likes", 0) or 0)
    comments = int(am.get("comments", 0) or 0)
    subs_gained = int(am.get("subscribersGained", 0) or 0)
    if not am:
        log.warning(
            "YouTube — Analytics sem linhas ou formato inesperado para %s (rows=%s).",
            date_str,
            len(ana_payload.get("rows") or []),
        )
    channel_impressions = None  # não disponível neste report; dashboard usa video_views no fallback
    channel_ctr = None

    shares = 0

    search_resp = requests.get(
        f"{base}/search",
        headers=headers,
        params={
            "part": "id,snippet",
            "channelId": YOUTUBE_CHANNEL_ID,
            "type": "video",
            "publishedAfter": f"{date_str}T00:00:00Z",
            "publishedBefore": f"{date_str}T23:59:59Z",
            "maxResults": 50,
        },
    )
    search_resp.raise_for_status()
    video_items = search_resp.json().get("items", [])
    video_ids = [v["id"]["videoId"] for v in video_items]

    video_rows = []
    if video_ids:
        stats_resp = requests.get(
            f"{base}/videos",
            headers=headers,
            params={"part": "statistics,contentDetails,snippet", "id": ",".join(video_ids)},
        )
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
    eng_total = likes + comments + shares
    if eng_total == 0 and (v_likes + v_comments) > 0:
        log.warning(
            "YouTube — KPI: engajamentos do Analytics = 0; usando likes+comentários dos vídeos do dia (%s).",
            v_likes + v_comments,
        )
        eng_total = v_likes + v_comments + shares

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
                "Gere um novo Page Access Token em developers.facebook.com → seu App → Ferramentas, "
                "estenda para longa duração e atualize o secret META_ACCESS_TOKEN no GitHub Actions. "
                f"Detalhe: {err_pf[:700] if err_pf else ''}"
            )
            log.error("Meta preflight — Instagram e Facebook serão pulados neste job. %s", meta_skip_msg[:900])

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
