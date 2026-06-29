import queue
import threading
import uuid

import main as pipeline

_jobs = {}


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
    video_format="short",
):
    job_id = str(uuid.uuid4())
    q = queue.Queue()
    _jobs[job_id] = q

    def on_progress(message):
        q.put({"type": "progress", "message": message})

    def worker():
        try:
            if mode == "film":
                result = pipeline.run(film=film, on_progress=on_progress)
            elif mode == "topic":
                result = pipeline.run(topic=topic, on_progress=on_progress)
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
                    video_format=video_format,
                    on_progress=on_progress,
                )
            else:
                result = pipeline.run(on_progress=on_progress)

            if result is None:
                q.put({"type": "skipped", "message": "Sujet déjà utilisé, génération arrêtée."})
            else:
                q.put({"type": "done", "result": result})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})

    threading.Thread(target=worker, daemon=True).start()
    return job_id


def get_queue(job_id):
    return _jobs.get(job_id)


def cleanup(job_id):
    _jobs.pop(job_id, None)
