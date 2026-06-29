import asyncio
import os
import shutil
import uuid

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import config
from agents import storage_agent, upload_agent
from api import jobs

app = FastAPI(title="yt-shorts-agent dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/videos", StaticFiles(directory=config.FINAL_DIR), name="videos")


class GenerateRequest(BaseModel):
    mode: str = "free"
    topic: str | None = None
    film: str | None = None
    source_url: str | None = None
    file_path: str | None = None
    mine: bool = False
    script_text: str | None = None
    clip_mode: str = "manual"
    clip_start: float = 0.0
    clip_duration: float = 30.0
    voice_enabled: bool = True
    language: str = "fr"
    transcription_enabled: bool = False
    transcription_engine: str = "whisper"
    video_format: str = "short"
    video_quality: str = "best"


class PublishRequest(BaseModel):
    video_id: str
    privacy_status: str


@app.get("/api/history")
def get_history():
    return list(reversed(storage_agent.load_history()))


@app.delete("/api/history/{video_id}")
def delete_history_entry(video_id: str):
    history = storage_agent.load_history()
    history = [entry for entry in history if entry["video_id"] != video_id]
    import json

    with open(config.HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    return {"ok": True}


@app.get("/api/config/status")
def get_config_status():
    return {
        "groq": bool(config.GROQ_API_KEY),
        "pexels": bool(config.PEXELS_API_KEY),
        "pixabay": bool(config.PIXABAY_API_KEY),
        "assemblyai": bool(config.ASSEMBLYAI_API_KEY),
        "deepgram": bool(config.DEEPGRAM_API_KEY),
        "piper_exe": os.path.exists(config.PIPER_EXE),
        "piper_voice": os.path.exists(config.PIPER_VOICE_MODEL),
        "ffmpeg": shutil.which("ffmpeg") is not None,
        "client_secret": os.path.exists(
            os.path.join(config.BASE_DIR, config.YOUTUBE_CLIENT_SECRETS_FILE)
        ),
        "token": os.path.exists(upload_agent.TOKEN_FILE),
    }


@app.post("/api/generate")
def generate(req: GenerateRequest):
    job_id = jobs.start_generation(
        req.mode,
        topic=req.topic,
        film=req.film,
        source_url=req.source_url,
        file_path=req.file_path,
        mine=req.mine,
        script_text=req.script_text,
        clip_mode=req.clip_mode,
        clip_start=req.clip_start,
        clip_duration=req.clip_duration,
        voice_enabled=req.voice_enabled,
        language=req.language,
        transcription_enabled=req.transcription_enabled,
        transcription_engine=req.transcription_engine,
        video_format=req.video_format,
        video_quality=req.video_quality,
    )
    return {"job_id": job_id}


UPLOADS_DIR = os.path.join(config.VIDEOS_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@app.post("/api/upload-local")
async def upload_local(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    dest = os.path.join(UPLOADS_DIR, f"{uuid.uuid4().hex[:8]}{ext}")
    with open(dest, "wb") as f:
        f.write(await file.read())
    return {"file_path": dest}


@app.websocket("/ws/jobs/{job_id}")
async def job_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    q = jobs.get_queue(job_id)
    if q is None:
        await websocket.send_json({"type": "error", "message": "Job inconnu."})
        await websocket.close()
        return

    try:
        while True:
            try:
                item = q.get_nowait()
            except Exception:
                await asyncio.sleep(0.3)
                continue

            await websocket.send_json(item)
            if item["type"] in ("done", "error", "skipped"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        jobs.cleanup(job_id)
        await websocket.close()


@app.post("/api/publish")
def publish(req: PublishRequest):
    upload_agent.set_privacy(req.video_id, req.privacy_status)
    return {"ok": True}


@app.get("/api/stats")
def get_stats():
    history = storage_agent.load_history()
    video_ids = [entry["video_id"] for entry in history]
    stats = upload_agent.get_video_stats(video_ids)

    enriched = []
    for entry in history:
        s = stats.get(entry["video_id"], {})
        enriched.append({**entry, **s})

    totals = {
        "videos": len(history),
        "views": sum(e.get("viewCount", 0) for e in enriched),
        "likes": sum(e.get("likeCount", 0) for e in enriched),
    }
    return {"totals": totals, "videos": enriched}


app.mount("/", StaticFiles(directory=os.path.join(config.BASE_DIR, "dashboard"), html=True), name="dashboard")
