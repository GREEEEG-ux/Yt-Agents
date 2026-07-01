import os
import subprocess

import requests
import config


def generate_voice(script_text, language="fr", engine="piper"):
    if engine == "elevenlabs":
        return _elevenlabs(script_text)
    return _piper(script_text, language)


def _piper(script_text, language):
    model = config.PIPER_VOICES.get(language, config.PIPER_VOICE_MODEL)
    output_path = os.path.join(config.AUDIO_DIR, "voice.wav")
    subprocess.run(
        [config.PIPER_EXE, "--model", model, "--output_file", output_path],
        input=script_text.encode("utf-8"),
        check=True,
    )
    return output_path


def _elevenlabs(script_text):
    if not config.ELEVENLABS_API_KEY:
        raise RuntimeError("Clé ElevenLabs manquante (ELEVENLABS_API_KEY).")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{config.ELEVENLABS_VOICE_ID}"
    resp = requests.post(
        url,
        headers={"xi-api-key": config.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json={
            "text": script_text,
            "model_id": "eleven_multilingual_v2",  # gère FR et EN
        },
        timeout=120,
    )
    resp.raise_for_status()
    output_path = os.path.join(config.AUDIO_DIR, "voice.mp3")
    with open(output_path, "wb") as f:
        f.write(resp.content)
    return output_path
