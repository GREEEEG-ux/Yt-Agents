import os
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.http
import config

# yt-analytics.readonly est requis pour les métriques de rétention / sources de
# trafic (analytics_agent). Ajouter ce scope invalide l'ancien token : une
# nouvelle autorisation (re-consentement) sera demandée une fois.
SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]
TOKEN_FILE = os.path.join(config.BASE_DIR, "token.json")


def get_credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE)

    has_required_scopes = creds and set(SCOPES).issubset(set(creds.scopes or []))

    if not creds or not creds.valid or not has_required_scopes:
        if creds and creds.expired and creds.refresh_token and has_required_scopes:
            creds.refresh(Request())
        else:
            secrets_path = os.path.join(config.BASE_DIR, config.YOUTUBE_CLIENT_SECRETS_FILE)
            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                secrets_path, SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds


def get_authenticated_service():
    return googleapiclient.discovery.build("youtube", "v3", credentials=get_credentials())


def upload_video(video_path, title, description, tags, as_short=True):
    youtube = get_authenticated_service()

    if as_short:
        if "#shorts" not in description.lower():
            description = f"{description}\n\n#Shorts"
        if "shorts" not in [t.lower() for t in tags]:
            tags = [*tags, "Shorts"]

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": "private",
        },
    }

    media = googleapiclient.http.MediaFileUpload(video_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()

    return response["id"]


def set_privacy(video_id, privacy_status):
    if privacy_status not in ("private", "unlisted", "public"):
        raise ValueError(f"privacy_status invalide : {privacy_status}")

    youtube = get_authenticated_service()
    youtube.videos().update(
        part="status",
        body={"id": video_id, "status": {"privacyStatus": privacy_status}},
    ).execute()


def _iso8601_duration_to_seconds(duration):
    """'PT1M38S' -> 98. Renvoie None si non parsable."""
    import re

    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or "")
    if not m:
        return None
    h, mn, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mn * 60 + s


def get_video_snippets(video_ids):
    """Titre, description, tags, date de publication et durée par video_id."""
    if not video_ids:
        return {}

    youtube = get_authenticated_service()
    out = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        response = (
            youtube.videos()
            .list(part="snippet,contentDetails", id=",".join(batch))
            .execute()
        )
        for item in response.get("items", []):
            snippet = item.get("snippet", {})
            out[item["id"]] = {
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "tags": snippet.get("tags", []),
                "published_at": snippet.get("publishedAt", ""),
                "duration_seconds": _iso8601_duration_to_seconds(
                    item.get("contentDetails", {}).get("duration", "")
                ),
            }
    return out


def set_metadata(video_id, title=None, description=None, tags=None):
    """Met à jour les métadonnées d'une vidéo existante (pour appliquer les
    recommandations de l'optimizer)."""
    youtube = get_authenticated_service()
    current = youtube.videos().list(part="snippet", id=video_id).execute()
    items = current.get("items", [])
    if not items:
        raise ValueError(f"Vidéo introuvable : {video_id}")
    snippet = items[0]["snippet"]
    if title is not None:
        snippet["title"] = title
    if description is not None:
        snippet["description"] = description
    if tags is not None:
        snippet["tags"] = tags
    youtube.videos().update(part="snippet", body={"id": video_id, "snippet": snippet}).execute()
    return {"ok": True, "video_id": video_id}


def list_channel_videos(max_results=24, page_token=None):
    """Liste les vidéos de la chaîne connectée (via la playlist 'uploads'),
    peu importe qu'elles aient été créées par ce projet ou non. Renvoie
    {items: [...], next_page_token}."""
    youtube = get_authenticated_service()

    channel = youtube.channels().list(part="contentDetails", mine=True).execute()
    items = channel.get("items", [])
    if not items:
        return {"items": [], "next_page_token": None}
    uploads_playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

    playlist = (
        youtube.playlistItems()
        .list(
            part="snippet,contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=max_results,
            pageToken=page_token,
        )
        .execute()
    )
    video_ids = [pi["contentDetails"]["videoId"] for pi in playlist.get("items", [])]
    if not video_ids:
        return {"items": [], "next_page_token": None}

    details = (
        youtube.videos()
        .list(part="snippet,statistics,status", id=",".join(video_ids))
        .execute()
    )
    by_id = {d["id"]: d for d in details.get("items", [])}

    out = []
    for pi in playlist.get("items", []):
        vid = pi["contentDetails"]["videoId"]
        d = by_id.get(vid)
        if not d:
            continue
        snippet = d.get("snippet", {})
        thumbs = snippet.get("thumbnails", {})
        thumb = (thumbs.get("medium") or thumbs.get("default") or {}).get("url", "")
        out.append(
            {
                "video_id": vid,
                "title": snippet.get("title", ""),
                "thumbnail": thumb,
                "published_at": snippet.get("publishedAt", ""),
                "privacy_status": d.get("status", {}).get("privacyStatus", "private"),
                "view_count": int(d.get("statistics", {}).get("viewCount", 0)),
                "like_count": int(d.get("statistics", {}).get("likeCount", 0)),
            }
        )

    return {"items": out, "next_page_token": playlist.get("nextPageToken")}


def get_video_stats(video_ids):
    if not video_ids:
        return {}

    youtube = get_authenticated_service()
    stats = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        response = youtube.videos().list(part="statistics,status", id=",".join(batch)).execute()
        for item in response.get("items", []):
            stats[item["id"]] = {
                "viewCount": int(item["statistics"].get("viewCount", 0)),
                "likeCount": int(item["statistics"].get("likeCount", 0)),
                "commentCount": int(item["statistics"].get("commentCount", 0)),
                "privacyStatus": item["status"]["privacyStatus"],
            }
    return stats
