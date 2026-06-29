"""Transcription de l'audio réel d'une vidéo, 3 moteurs au choix :

- "whisper"   : faster-whisper, local et gratuit (aucune clé requise).
- "assemblyai": API cloud AssemblyAI (clé requise).
- "deepgram"  : API cloud Deepgram (clé requise).

Tous retournent une liste uniforme de segments [{start, end, text}] en secondes.
"""

import os
import subprocess
import time

import requests
import config

_whisper_model = None


def _extract_audio(media_path):
    """Extrait l'audio en WAV mono 16 kHz. Retourne None si le média n'a pas d'audio."""
    wav_path = os.path.join(config.AUDIO_DIR, "transcribe_input.wav")
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", media_path, "-vn", "-ac", "1", "-ar", "16000", wav_path],
        capture_output=True,
    )
    if result.returncode != 0 or not os.path.exists(wav_path):
        return None
    return wav_path


def transcribe(media_path, language=None, engine="whisper"):
    if engine in ("assemblyai", "deepgram"):
        audio = _extract_audio(media_path)
        if audio is None:
            return []  # pas de piste audio → pas de sous-titres
        if engine == "assemblyai":
            return _transcribe_assemblyai(audio, language)
        return _transcribe_deepgram(audio, language)
    return _transcribe_whisper(media_path, language)


# --- Whisper (local) ---

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_model


def _transcribe_whisper(media_path, language):
    model = _get_whisper()
    segments, _info = model.transcribe(media_path, language=language, vad_filter=True)
    return [
        {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
        for seg in segments
        if seg.text.strip()
    ]


# --- AssemblyAI (cloud) ---

def _transcribe_assemblyai(audio_path, language):
    if not config.ASSEMBLYAI_API_KEY:
        raise RuntimeError("Clé AssemblyAI manquante (ASSEMBLYAI_API_KEY).")
    headers = {"authorization": config.ASSEMBLYAI_API_KEY}

    with open(audio_path, "rb") as f:
        up = requests.post("https://api.assemblyai.com/v2/upload", headers=headers, data=f)
    up.raise_for_status()
    audio_url = up.json()["upload_url"]

    body = {"audio_url": audio_url}
    if language:
        body["language_code"] = language
    create = requests.post(
        "https://api.assemblyai.com/v2/transcript", headers=headers, json=body
    )
    create.raise_for_status()
    transcript_id = create.json()["id"]

    while True:
        poll = requests.get(
            f"https://api.assemblyai.com/v2/transcript/{transcript_id}", headers=headers
        )
        poll.raise_for_status()
        data = poll.json()
        if data["status"] == "completed":
            break
        if data["status"] == "error":
            raise RuntimeError(f"AssemblyAI erreur : {data.get('error')}")
        time.sleep(2)

    sent = requests.get(
        f"https://api.assemblyai.com/v2/transcript/{transcript_id}/sentences", headers=headers
    )
    sent.raise_for_status()
    return [
        {"start": s["start"] / 1000.0, "end": s["end"] / 1000.0, "text": s["text"].strip()}
        for s in sent.json().get("sentences", [])
        if s["text"].strip()
    ]


# --- Deepgram (cloud) ---

def _transcribe_deepgram(audio_path, language):
    if not config.DEEPGRAM_API_KEY:
        raise RuntimeError("Clé Deepgram manquante (DEEPGRAM_API_KEY).")
    headers = {
        "Authorization": f"Token {config.DEEPGRAM_API_KEY}",
        "Content-Type": "audio/wav",
    }
    params = {"model": "nova-2", "smart_format": "true", "utterances": "true"}
    if language:
        params["language"] = language

    with open(audio_path, "rb") as f:
        resp = requests.post(
            "https://api.deepgram.com/v1/listen", headers=headers, params=params, data=f
        )
    resp.raise_for_status()
    data = resp.json()

    utterances = data.get("results", {}).get("utterances", [])
    if utterances:
        return [
            {"start": u["start"], "end": u["end"], "text": u["transcript"].strip()}
            for u in utterances
            if u["transcript"].strip()
        ]

    # Repli : regrouper les mots si pas d'utterances.
    alt = data["results"]["channels"][0]["alternatives"][0]
    words = alt.get("words", [])
    if not words:
        return []
    return [{"start": words[0]["start"], "end": words[-1]["end"], "text": alt["transcript"].strip()}]
