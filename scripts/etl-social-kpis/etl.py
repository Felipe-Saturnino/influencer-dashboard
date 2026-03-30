"""
Social Media KPI Pipeline
Canais: LinkedIn, Instagram, YouTube, Facebook
Roda via GitHub Actions todo dia às 06:00 BRT

v2:
- Instagram: follower_count removido dos insights → followers_count no objeto IG
- Instagram/Facebook: engagement_rate limitado a 99.9999 (overflow no banco)
- Facebook: page_impressions + page_post_engagements (page_engaged_users inválido na API); post_impressions nos posts
- YouTube: subscriberCount (Channels API); Analytics day report sem métrica impressions; followers no kpi_daily
"""

import os
import re
import time
import logging
from datetime import date, timedelta

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

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN", "")
YOUTUBE_CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "")

LINKEDIN_TOKEN = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_ORG_ID = os.environ.get("LINKEDIN_ORG_ID", "")

TARGET_DATE = date.today() - timedelta(days=1)
INSIGHTS_DATE = date.today() - timedelta(days=2)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

_MAX_ENGAGEMENT_RATE = 99.9999


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
    base = "https://graph.facebook.com/v21.0"
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
        try:
            body = r.json()
            err = body.get("error", {}) if isinstance(body.get("error"), dict) else {}
            msg = err.get("message", r.text[:400] if r.text else "unknown")
        except Exception:
            msg = (r.text or "")[:400]
        return False, msg
    except requests.RequestException as e:
        log.error("Meta preflight — falha de rede: %s", e)
        return False, str(e)


def _cap_engagement_rate(x: float) -> float:
    return min(round(x, 4), _MAX_ENGAGEMENT_RATE)


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
    base = "https://graph.facebook.com/v21.0"

    ins_since = int((INSIGHTS_DATE - date(1970, 1, 1)).total_seconds())
    ins_until = ins_since + 86400
    since = int((TARGET_DATE - date(1970, 1, 1)).total_seconds())
    until = since + 86400

    ig_id = META_IG_ACCOUNT_ID
    if not ig_id:
        page_resp = requests.get(
            f"{base}/{META_PAGE_ID}",
            params={"fields": "instagram_business_account", "access_token": META_TOKEN},
        )
        if page_resp.status_code != 200:
            _log_api_error(page_resp, "Instagram (Page lookup)")
            if "expired" in (page_resp.text or "").lower():
                log.error("Instagram — Token expirado. Renove META_ACCESS_TOKEN em Meta for Developers.")
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
    else:
        log.warning("Instagram — falha ao buscar followers_count: %s", profile_resp.text[:200])

    reach = None
    insights_resp = requests.get(
        f"{base}/{ig_id}/insights",
        params={
            "metric": "reach",
            "period": "day",
            "since": ins_since,
            "until": ins_until,
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

    posts_raw = []
    next_url = None
    params = {
        "fields": "id,timestamp,media_type,caption,permalink,thumbnail_url,media_url,like_count,comments_count",
        "since": since,
        "until": until,
        "limit": 100,
        "access_token": META_TOKEN,
    }
    while True:
        if next_url:
            media_resp = requests.get(next_url)
        else:
            media_resp = requests.get(f"{base}/{ig_id}/media", params=params)
        media_resp.raise_for_status()
        data = media_resp.json()
        batch = data.get("data", [])
        posts_raw.extend(batch)
        next_url = data.get("paging", {}).get("next")
        if not next_url or not batch:
            break
        time.sleep(0.3)

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
    base = "https://graph.facebook.com/v21.0"

    ins_since = int((INSIGHTS_DATE - date(1970, 1, 1)).total_seconds())
    ins_until = ins_since + 86400
    since = int((TARGET_DATE - date(1970, 1, 1)).total_seconds())
    until = since + 86400

    page_resp = requests.get(
        f"{base}/{META_PAGE_ID}",
        params={"fields": "followers_count", "access_token": META_TOKEN},
    )
    page_data = page_resp.json() if page_resp.status_code == 200 else {}
    followers_count = page_data.get("followers_count")

    metrics = {}
    # page_engaged_users não é métrica válida no endpoint atual → (#100) valid insights metric
    ins_resp = requests.get(
        f"{base}/{META_PAGE_ID}/insights",
        params={
            "metric": "page_impressions,page_post_engagements",
            "period": "day",
            "since": ins_since,
            "until": ins_until,
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

    posts_raw = []
    next_url = None
    params = {
        "fields": "id,created_time,message,permalink_url,full_picture,thumbnail_url,status_type",
        "since": since,
        "until": until,
        "limit": 100,
        "access_token": META_TOKEN,
    }
    while True:
        if next_url:
            posts_resp = requests.get(next_url)
        else:
            posts_resp = requests.get(f"{base}/{META_PAGE_ID}/posts", params=params)
        posts_resp.raise_for_status()
        data = posts_resp.json()
        batch = data.get("data", [])
        posts_raw.extend(batch)
        next_url = data.get("paging", {}).get("next")
        if not next_url or not batch:
            break
        time.sleep(0.3)

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
        ins = requests.get(
            f"{base}/{p['id']}/insights",
            params={
                "metric": "post_impressions,post_reach,post_reactions_by_type_total,post_clicks,post_shares",
                "access_token": META_TOKEN,
            },
        ).json().get("data", [])
        ins_map = {i["name"]: i["values"][0]["value"] for i in ins}

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
        thumb = p.get("full_picture") or p.get("thumbnail_url")

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

    rows = ana_resp.json().get("rows", [[]])
    row = rows[0] if rows else ["", 0, 0, 0, 0, 0]

    views = int(row[1]) if len(row) > 1 else 0
    watch_min = row[2] if len(row) > 2 else 0
    likes = int(row[3]) if len(row) > 3 else 0
    comments = int(row[4]) if len(row) > 4 else 0
    subs_gained = int(row[5]) if len(row) > 5 else 0
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

    eng_total = likes + comments + shares
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

    channels = {
        "instagram": fetch_instagram,
        "facebook": fetch_facebook,
        "youtube": fetch_youtube,
        "linkedin": fetch_linkedin,
    }
    for name, fn in channels.items():
        try:
            fn()
        except Exception as exc:
            log.error("%s — ERRO: %s", name, exc, exc_info=True)
            log_run(name, "error", error=str(exc))
