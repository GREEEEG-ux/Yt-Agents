import os
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.http
import config

SCOPES = ["https://www.googleapis.com/auth/youtube"]
TOKEN_FILE = os.path.join(config.BASE_DIR, "token.json")


def get_authenticated_service():
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
            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                config.YOUTUBE_CLIENT_SECRETS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return googleapiclient.discovery.build("youtube", "v3", credentials=creds)


def upload_video(video_path, title, description, tags):
    youtube = get_authenticated_service()

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
