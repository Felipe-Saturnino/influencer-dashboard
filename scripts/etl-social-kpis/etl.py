"""
Social Media KPI Pipeline
Canais: LinkedIn, Instagram, YouTube, Facebook
Roda via GitHub Actions todo dia às 06:00 BRT
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

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN", "")
YOUTUBE_CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "")

LINKEDIN_TOKEN = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_ORG_ID = os.environ.get("LINKEDIN_ORG_ID", "")

TARGET_DATE = date.today() - timedelta(days=1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _parse_iso_duration_seconds(duration: str) -> int:
    """Converte duração ISO 8601 (PT1M30S, PT45S, PT2H) para segundos."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not m:
        return 0
    h, mn, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mn * 60 + s


def _classify_video(duration: str, snippet: dict) -> str:
    """Classifica vídeo em 'short', 'live' ou 'upload'."""
    live_status = snippet.get("liveBroadcastContent", "none")
    if live_status in ("live", "upcoming"):
        return "live"
    if _parse_iso_duration_seconds(duration) <= 60:
        return "short"
    return "upload"


def get_youtube_token() -> str:
    """Troca o refresh token por um access token fresco."""
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
    supabase.table("pipeline_runs").insert(
        {
            "run_date": TARGET_DATE.isoformat(),
            "channel": channel,
            "status": status,
            "records_in": records,
            "error_msg": error,
            "duration_ms": ms,
        }
    ).execute()


# ------------------------------------------------------------
# Instagram
# ------------------------------------------------------------
def fetch_instagram():
    if not META_TOKEN or not META_PAGE_ID:
        log.warning("Instagram — META_ACCESS_TOKEN e META_PAGE_ID não configurados, pulando")
        return

    t0 = time.monotonic()
    log.info("Instagram — iniciando coleta para %s", TARGET_DATE)

    base = "https://graph.facebook.com/v19.0"
    since = int((TARGET_DATE - date(1970, 1, 1)).total_seconds())
    until = since + 86400

    page_resp = requests.get(
        f"{base}/{META_PAGE_ID}",
        params={"fields": "instagram_business_account", "access_token": META_TOKEN},
    )
    page_resp.raise_for_status()
    ig_id = page_resp.json()["instagram_business_account"]["id"]

    insights_resp = requests.get(
        f"{base}/{ig_id}/insights",
        params={
            "metric": "impressions,reach,follower_count,profile_views",
            "period": "day",
            "since": since,
            "until": until,
            "access_token": META_TOKEN,
        },
    )
    insights_resp.raise_for_status()
    metrics = {m["name"]: m["values"][0]["value"] for m in insights_resp.json().get("data", [])}

    media_resp = requests.get(
        f"{base}/{ig_id}/media",
        params={
            "fields": "id,timestamp,media_type,caption,permalink,like_count,comments_count",
            "since": since,
            "until": until,
            "access_token": META_TOKEN,
        },
    )
    media_resp.raise_for_status()
    posts_raw = media_resp.json().get("data", [])

    post_rows = []
    total_engagements = 0
    for p in posts_raw:
        ins = requests.get(
            f"{base}/{p['id']}/insights",
            params={"metric": "impressions,reach,saved,shares,video_views", "access_token": META_TOKEN},
        ).json().get("data", [])
        ins_map = {i["name"]: i["values"][0]["value"] for i in ins}

        likes = p.get("like_count", 0)
        comments = p.get("comments_count", 0)
        eng = likes + comments + ins_map.get("saved", 0) + ins_map.get("shares", 0)
        impr = ins_map.get("impressions", 1) or 1
        total_engagements += eng

        post_rows.append(
            {
                "post_id": p["id"],
                "date": TARGET_DATE.isoformat(),
                "type": p.get("media_type"),
                "caption": (p.get("caption") or "")[:500],
                "permalink": p.get("permalink"),
                "impressions": ins_map.get("impressions"),
                "reach": ins_map.get("reach"),
                "likes": likes,
                "comments": comments,
                "saves": ins_map.get("saved"),
                "shares": ins_map.get("shares"),
                "video_views": ins_map.get("video_views"),
                "engagement_rate": round(eng / impr, 4),
            }
        )

    followers = metrics.get("follower_count", 0)
    impressions = metrics.get("impressions", 1) or 1

    kpi_row = {
        "channel": "instagram",
        "date": TARGET_DATE.isoformat(),
        "followers": followers,
        "impressions": metrics.get("impressions"),
        "reach": metrics.get("reach"),
        "engagements": total_engagements,
        "engagement_rate": round(total_engagements / impressions, 4),
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

    base = "https://graph.facebook.com/v19.0"
    since = int((TARGET_DATE - date(1970, 1, 1)).total_seconds())
    until = since + 86400

    ins_resp = requests.get(
        f"{base}/{META_PAGE_ID}/insights",
        params={
            "metric": "page_impressions,page_reach,page_engaged_users,page_fans",
            "period": "day",
            "since": since,
            "until": until,
            "access_token": META_TOKEN,
        },
    )
    ins_resp.raise_for_status()
    metrics = {m["name"]: m["values"][0]["value"] for m in ins_resp.json().get("data", [])}

    posts_resp = requests.get(
        f"{base}/{META_PAGE_ID}/posts",
        params={
            "fields": "id,created_time,message,permalink_url,full_picture,status_type",
            "since": since,
            "until": until,
            "access_token": META_TOKEN,
        },
    )
    posts_resp.raise_for_status()
    posts_raw = posts_resp.json().get("data", [])

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

        post_rows.append(
            {
                "post_id": p["id"],
                "date": TARGET_DATE.isoformat(),
                "type": fb_type,
                "message": (p.get("message") or "")[:500],
                "permalink": p.get("permalink_url"),
                "impressions": ins_map.get("post_impressions"),
                "reach": ins_map.get("post_reach"),
                "reactions": reactions,
                "comments": 0,
                "shares": ins_map.get("post_shares"),
                "link_clicks": ins_map.get("post_clicks"),
                "engagement_rate": round(eng / impr, 4),
            }
        )

    impressions = metrics.get("page_impressions", 1) or 1
    kpi_row = {
        "channel": "facebook",
        "date": TARGET_DATE.isoformat(),
        "followers": metrics.get("page_fans"),
        "impressions": metrics.get("page_impressions"),
        "reach": metrics.get("page_reach"),
        "engagements": metrics.get("page_engaged_users"),
        "engagement_rate": round(metrics.get("page_engaged_users", 0) / impressions, 4),
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

    ana_resp = requests.get(
        f"{ana_base}/reports",
        headers=headers,
        params={
            "ids": f"channel=={YOUTUBE_CHANNEL_ID}",
            "startDate": date_str,
            "endDate": date_str,
            "metrics": "views,estimatedMinutesWatched,averageViewPercentage,likes,comments,shares,subscribersGained,impressions,impressionClickThroughRate",
        },
    )
    ana_resp.raise_for_status()
    rows = ana_resp.json().get("rows", [[]])
    row = rows[0] if rows else [0] * 9
    (views, watch_min, avg_view_pct, likes, comments, shares, subs_gained, impressions, ctr) = row

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
                    "title": v["snippet"]["title"],
                    "type": vtype,
                    "views": int(s.get("viewCount", 0)),
                    "watch_time_min": int(watch_min) if len(video_ids) == 1 else None,
                    "avg_view_pct": float(avg_view_pct) if len(video_ids) == 1 else None,
                    "likes": int(s.get("likeCount", 0)),
                    "comments": int(s.get("commentCount", 0)),
                    "impressions": int(impressions) if len(video_ids) == 1 else None,
                    "ctr": float(ctr) if len(video_ids) == 1 else None,
                    "subscribers_gained": int(subs_gained) if len(video_ids) == 1 else None,
                }
            )

    kpi_row = {
        "channel": "youtube",
        "date": date_str,
        "impressions": int(impressions),
        "video_views": int(views),
        "engagements": int(likes) + int(comments) + int(shares),
        "engagement_rate": round((int(likes) + int(comments)) / max(int(views), 1), 4),
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
        "engagement_rate": round(total_engagements / max(total_impressions, 1), 4),
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
