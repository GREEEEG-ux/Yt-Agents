import queue
import re
import threading
import uuid

import main as pipeline

_jobs = {}
_pending = {}  # job_id -> métadonnées d'une vidéo montée en attente de publication

_STEP_RE = re.compile(r"^(\d+)\s*/\s*(\d+)")


def _percent_from_message(message):
    """Déduit un pourcentage à partir d'un préfixe 'X/Y' dans le message, sinon None."""
    m = _STEP_RE.match(message.strip())
    if not m:
        return None
    current, total = int(m.group(1)), int(m.group(2))
    if total <= 0:
        return None
    return round(current / total * 100)


def start_generation(
    mode,
    topic=None,
    film=None,
    source_url=None,
    file_path=None,
    mine=False,
    script_text=None,
    clip_mode="manual",
    clip_start=0.0,
    clip_duration=30.0,
    voice_enabled=True,
    language="fr",
    transcription_enabled=False,
    transcription_engine="whisper",
    video_format="short",
    video_quality="best",
    subtitle_style=None,
    llm_engine="groq",
    voice_engine="piper",
    auto_upload=True,
):
    job_id = str(uuid.uuid4())
    q = queue.Queue()
    _jobs[job_id] = q

    def on_progress(message):
        event = {"type": "progress", "message": message}
        percent = _percent_from_message(message)
        if percent is not None:
            event["percent"] = percent
        q.put(event)

    def worker():
        try:
            if mode == "film":
                result = pipeline.run(film=film, subtitle_style=subtitle_style, llm_engine=llm_engine, voice_engine=voice_engine, auto_upload=auto_upload, on_progress=on_progress)
            elif mode == "topic":
                result = pipeline.run(topic=topic, subtitle_style=subtitle_style, llm_engine=llm_engine, voice_engine=voice_engine, auto_upload=auto_upload, on_progress=on_progress)
            elif mode == "clip":
                result = pipeline.run_from_clip(
                    source_url=source_url,
                    file_path=file_path,
                    mine=mine,
                    clip_mode=clip_mode,
                    clip_start=clip_start,
                    clip_duration=clip_duration,
                    voice_enabled=voice_enabled,
                    language=language,
                    script_text=script_text,
                    topic_for_script=topic,
                    transcription_enabled=transcription_enabled,
                    transcription_engine=transcription_engine,
                    video_format=video_format,
                    video_quality=video_quality,
                    subtitle_style=subtitle_style,
                    llm_engine=llm_engine,
                    voice_engine=voice_engine,
                    auto_upload=auto_upload,
                    on_progress=on_progress,
                )
            else:
                result = pipeline.run(subtitle_style=subtitle_style, llm_engine=llm_engine, voice_engine=voice_engine, auto_upload=auto_upload, on_progress=on_progress)

            if result is None:
                q.put({"type": "skipped", "message": "Sujet déjà utilisé, génération arrêtée."})
            elif result.get("preview"):
                _pending[job_id] = result
                q.put({
                    "type": "preview",
                    "job_id": job_id,
                    "result": {
                        "title": result["title"],
                        "topic": result["topic"],
                        "preview_url": "/videos/short.mp4",
                    },
                })
            else:
                q.put({"type": "done", "result": result})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})

    threading.Thread(target=worker, daemon=True).start()
    return job_id


def start_publish(preview_job_id):
    """Lance l'upload d'une vidéo déjà montée et prévisualisée."""
    meta = _pending.get(preview_job_id)
    if meta is None:
        return None

    job_id = str(uuid.uuid4())
    q = queue.Queue()
    _jobs[job_id] = q

    def on_progress(message):
        q.put({"type": "progress", "message": message})

    def worker():
        try:
            result = pipeline.publish_built(
                video_path=meta["video_path"],
                title=meta["title"],
                description=meta["description"],
                tags=meta["tags"],
                topic=meta["topic"],
                as_short=meta["as_short"],
                on_progress=on_progress,
            )
            _pending.pop(preview_job_id, None)
            q.put({"type": "done", "result": result})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})

    threading.Thread(target=worker, daemon=True).start()
    return job_id


def discard_pending(preview_job_id):
    _pending.pop(preview_job_id, None)


def get_queue(job_id):
    return _jobs.get(job_id)


def cleanup(job_id):
    _jobs.pop(job_id, None)
