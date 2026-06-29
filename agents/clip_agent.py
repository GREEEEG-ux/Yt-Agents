"""Découpage d'un extrait à partir d'une vidéo source déjà téléchargée.

3 modes :
- "manual" : extrait précis défini par l'utilisateur (début + durée).
- "speech" : repère via transcription le passage avec le plus de parole continue.
- "first"  : prend simplement les premières secondes.
"""

import os
from moviepy import VideoFileClip
import config
from agents import transcription_agent


def _write_subclip(clip, start, end):
    sub = clip.subclipped(start, end)
    output_path = os.path.join(config.VIDEOS_DIR, "clip.mp4")
    sub.write_videofile(output_path, codec="libx264", audio_codec="aac")
    return output_path


def extract_clip(source_path, mode="manual", start=0.0, duration=30.0, on_progress=print):
    clip = VideoFileClip(source_path)
    total = clip.duration

    try:
        if mode == "manual":
            s = max(0.0, min(start, max(0.0, total - 1)))
            e = min(total, s + duration)

        elif mode == "first":
            s = 0.0
            e = min(total, duration)

        elif mode == "speech":
            on_progress("Analyse de l'audio pour repérer le meilleur passage...")
            s, e = _best_speech_window(source_path, total, duration)

        else:
            raise ValueError(f"Mode de découpage inconnu : {mode}")

        return _write_subclip(clip, s, e)
    finally:
        clip.close()


def _best_speech_window(source_path, total, duration):
    """Choisit la fenêtre de `duration` secondes contenant le plus de parole."""
    segments = transcription_agent.transcribe(source_path)
    if not segments:
        return 0.0, min(total, duration)

    # Densité de parole : pour chaque début de segment candidat, somme de la
    # durée parlée tombant dans la fenêtre [start, start+duration].
    best_start, best_score = 0.0, -1.0
    for seg in segments:
        start = max(0.0, min(seg["start"], max(0.0, total - duration)))
        window_end = start + duration
        score = sum(
            min(s["end"], window_end) - max(s["start"], start)
            for s in segments
            if s["end"] > start and s["start"] < window_end
        )
        if score > best_score:
            best_start, best_score = start, score

    return best_start, min(total, best_start + duration)
