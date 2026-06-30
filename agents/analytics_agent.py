"""Récupération des métriques avancées via la YouTube Analytics API.

Disponible via l'API publique : vues, likes, commentaires, partages, abonnés
gagnés, durée moyenne de visionnage, % moyen visionné (rétention), sources de
trafic. NON disponibles (Studio uniquement) : impressions et CTR — laissés à
None, le prompt SEO les traite comme données manquantes.

Toutes les requêtes dégradent gracieusement (renvoient {} en cas d'erreur) pour
ne jamais bloquer l'analyse globale.
"""

from datetime import date, timedelta

import googleapiclient.discovery

from agents import upload_agent

# Mapping insightTrafficSourceType -> clés du schéma SEO.
_TRAFFIC_MAP = {
    "SHORTS": "shorts_feed",
    "YT_SEARCH": "youtube_search",
    "RELATED_VIDEO": "suggested_videos",
    "EXT_URL": "external",
}


def get_analytics_service():
    return googleapiclient.discovery.build(
        "youtubeAnalytics", "v2", credentials=upload_agent.get_credentials()
    )


def _date_range(days):
    end = date.today()
    start = end - timedelta(days=days)
    return start.isoformat(), end.isoformat()


def _rows_by_video(response):
    """Transforme la réponse Analytics en {video_id: {colonne: valeur}}."""
    headers = [h["name"] for h in response.get("columnHeaders", [])]
    if "video" not in headers:
        return {}
    vid_idx = headers.index("video")
    out = {}
    for row in response.get("rows", []):
        out[row[vid_idx]] = dict(zip(headers, row))
    return out


def fetch_core_metrics(video_ids, days=90):
    """Métriques par vidéo. {} si indisponible (scope manquant, erreur API...)."""
    if not video_ids:
        return {}
    start, end = _date_range(days)
    try:
        service = get_analytics_service()
        resp = (
            service.reports()
            .query(
                ids="channel==MINE",
                startDate=start,
                endDate=end,
                metrics="views,likes,comments,shares,subscribersGained,"
                "averageViewDuration,averageViewPercentage,estimatedMinutesWatched",
                dimensions="video",
                filters="video==" + ",".join(video_ids[:200]),
                maxResults=200,
            )
            .execute()
        )
    except Exception:
        return {}

    out = {}
    for vid, row in _rows_by_video(resp).items():
        avg_pct = row.get("averageViewPercentage")
        out[vid] = {
            "views": int(row.get("views", 0) or 0),
            "likes": int(row.get("likes", 0) or 0),
            "comments": int(row.get("comments", 0) or 0),
            "shares": int(row.get("shares", 0) or 0),
            "subscribers_gained": int(row.get("subscribersGained", 0) or 0),
            "average_view_duration_seconds": _num(row.get("averageViewDuration")),
            "average_percentage_viewed": _num(avg_pct),
            "retention_rate": round(avg_pct / 100, 4) if avg_pct is not None else None,
            "estimated_minutes_watched": _num(row.get("estimatedMinutesWatched")),
            # Studio uniquement, pas exposés par l'API :
            "click_through_rate": None,
            "impressions": None,
        }
    return out


def fetch_traffic_sources(video_ids, days=90):
    """Fractions de trafic par vidéo. {} si indisponible."""
    if not video_ids:
        return {}
    start, end = _date_range(days)
    try:
        service = get_analytics_service()
        resp = (
            service.reports()
            .query(
                ids="channel==MINE",
                startDate=start,
                endDate=end,
                metrics="views",
                dimensions="video,insightTrafficSourceType",
                filters="video==" + ",".join(video_ids[:200]),
                maxResults=500,
            )
            .execute()
        )
    except Exception:
        return {}

    headers = [h["name"] for h in resp.get("columnHeaders", [])]
    if not {"video", "insightTrafficSourceType", "views"}.issubset(headers):
        return {}
    vi, si, wi = (headers.index(x) for x in ("video", "insightTrafficSourceType", "views"))

    raw = {}  # video -> {source_type: views}
    for row in resp.get("rows", []):
        raw.setdefault(row[vi], {})[row[si]] = (row[wi] or 0)

    out = {}
    for vid, sources in raw.items():
        total = sum(sources.values()) or 1
        dist = {"shorts_feed": 0.0, "youtube_search": 0.0, "suggested_videos": 0.0, "external": 0.0, "other": 0.0}
        for src_type, views in sources.items():
            key = _TRAFFIC_MAP.get(src_type, "other")
            dist[key] += views / total
        out[vid] = {k: round(v, 4) for k, v in dist.items()}
    return out


def _num(value):
    if value is None:
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None
