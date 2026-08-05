"""Découverte de contenu YouTube public : tendances + recherche globale.

Réutilise le client OAuth déjà authentifié (agents/upload_agent.py) — les
endpoints publics (chart=mostPopular, search) fonctionnent avec ce même
client, pas besoin d'une clé API séparée.
"""

import re

from agents import upload_agent

_HASHTAG_RE = re.compile(r"#(\w+)")


def _video_to_card(item):
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    thumbs = snippet.get("thumbnails", {})
    thumb = (thumbs.get("medium") or thumbs.get("default") or {}).get("url", "")
    return {
        "video_id": item["id"],
        "title": snippet.get("title", ""),
        "channel_title": snippet.get("channelTitle", ""),
        "thumbnail": thumb,
        "published_at": snippet.get("publishedAt", ""),
        "view_count": int(stats.get("viewCount", 0)) if stats.get("viewCount") else None,
        "like_count": int(stats.get("likeCount", 0)) if stats.get("likeCount") else None,
    }


def get_video_info(video_id):
    """Métadonnées d'une vidéo publique quelconque : titre, description (bio),
    hashtags extraits de la description, tags, durée — utilisé pour "Reprendre
    comme source" (récupère le contexte de la vidéo d'origine)."""
    snippets = upload_agent.get_video_snippets([video_id])
    data = snippets.get(video_id)
    if not data:
        return None

    description = data.get("description", "")
    hashtags = sorted(set(f"#{m}" for m in _HASHTAG_RE.findall(description)), key=description.find)

    return {
        "video_id": video_id,
        "title": data.get("title", ""),
        "description": description,
        "hashtags": hashtags,
        "tags": data.get("tags", []),
        "duration_seconds": data.get("duration_seconds"),
    }


def get_trending(region="FR", category_id=None, max_results=24, page_token=None):
    """Vidéos tendances YouTube (chart officiel) pour une région donnée."""
    youtube = upload_agent.get_authenticated_service()
    params = {
        "part": "snippet,statistics",
        "chart": "mostPopular",
        "regionCode": region,
        "maxResults": max_results,
    }
    if category_id:
        params["videoCategoryId"] = category_id
    if page_token:
        params["pageToken"] = page_token

    response = youtube.videos().list(**params).execute()
    items = [_video_to_card(v) for v in response.get("items", [])]
    return {"items": items, "next_page_token": response.get("nextPageToken")}


def search_videos(query, duration="any", order="relevance", max_results=24, page_token=None):
    """Recherche YouTube globale (tout contenu public).

    duration: 'any' | 'short' (< 4 min, la meilleure approximation dispo pour
    les Shorts — l'API n'expose pas de filtre Shorts natif) | 'medium' | 'long'.
    order: 'relevance' | 'viewCount' | 'date' | 'rating'.
    """
    if not query.strip():
        return {"items": [], "next_page_token": None}

    youtube = upload_agent.get_authenticated_service()
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "order": order,
        "maxResults": max_results,
        "safeSearch": "moderate",
    }
    if duration != "any":
        params["videoDuration"] = duration
    if page_token:
        params["pageToken"] = page_token

    search_resp = youtube.search().list(**params).execute()
    video_ids = [it["id"]["videoId"] for it in search_resp.get("items", []) if it.get("id", {}).get("videoId")]
    if not video_ids:
        return {"items": [], "next_page_token": search_resp.get("nextPageToken")}

    details = youtube.videos().list(part="snippet,statistics", id=",".join(video_ids)).execute()
    items = [_video_to_card(v) for v in details.get("items", [])]
    return {"items": items, "next_page_token": search_resp.get("nextPageToken")}
