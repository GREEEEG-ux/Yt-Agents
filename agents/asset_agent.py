import json
import os
import random
import requests
import yt_dlp
from moviepy import VideoFileClip
import config


def search_video(query):
    headers = {"Authorization": config.PEXELS_API_KEY}
    params = {"query": query, "orientation": "portrait", "per_page": 5}
    resp = requests.get("https://api.pexels.com/videos/search", headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    videos = data.get("videos", [])
    if not videos:
        raise RuntimeError(f"Aucune vidéo Pexels trouvée pour '{query}'")
    files = videos[0]["video_files"]
    files = [f for f in files if f.get("height", 0) >= f.get("width", 1)]
    if not files:
        files = videos[0]["video_files"]
    best = max(files, key=lambda f: f.get("height", 0))
    return best["link"]


def download_video(url, filename):
    path = os.path.join(config.VIDEOS_DIR, filename)
    resp = requests.get(url, stream=True)
    resp.raise_for_status()
    with open(path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return path


def load_video_links():
    if not os.path.exists(config.VIDEO_LINKS_FILE):
        return []
    with open(config.VIDEO_LINKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def check_creative_commons(url):
    with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(url, download=False)
    license_str = (info.get("license") or "")
    if "creative commons" not in license_str.lower():
        raise RuntimeError(
            f"Licence non Creative Commons pour {url} "
            f"(licence détectée : '{license_str or 'inconnue'}'). Téléchargement refusé."
        )


def download_via_ytdlp(url, quality="best"):
    """quality : 'best', '1080', '720', '480' ou '360' (hauteur max en pixels)."""
    output_path = os.path.join(config.VIDEOS_DIR, "manual_source.mp4")
    if quality and quality != "best":
        height = int(quality)
        fmt = (
            f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
            f"best[height<={height}][ext=mp4]/best[height<={height}]/best"
        )
    else:
        fmt = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    ydl_opts = {
        "outtmpl": output_path,
        "format": fmt,
        "merge_output_format": "mp4",
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    return output_path


def extract_random_clip(source_path, duration=30):
    clip = VideoFileClip(source_path)
    if clip.duration <= duration:
        sub = clip
    else:
        start = random.uniform(0, clip.duration - duration)
        sub = clip.subclipped(start, start + duration)

    output_path = os.path.join(config.VIDEOS_DIR, "background.mp4")
    sub.write_videofile(output_path, codec="libx264", audio_codec="aac")
    clip.close()
    return output_path


def get_clip_from_manual_links(duration=30):
    links = load_video_links()
    if not links:
        return None

    entry = random.choice(links)
    url = entry["url"]
    is_mine = entry.get("mine", False)

    if not is_mine:
        check_creative_commons(url)

    raw_path = download_via_ytdlp(url)
    return extract_random_clip(raw_path, duration)


def get_background_clip(topic, duration=30):
    manual_clip = get_clip_from_manual_links(duration)
    if manual_clip:
        return manual_clip

    url = search_video(topic)
    return download_video(url, "background.mp4")
