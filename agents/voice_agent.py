import glob
import os
import subprocess

import requests
import config

# Voix ElevenLabs "premade" publiques (id → label). Pas besoin de lister via l'API.
ELEVENLABS_VOICES = [
    {"id": "n1PvBOwxb8X6m7tahp2h", "label": "Michael (h)"},
    {"id": "21m00Tcm4TlvDq8ikWAM", "label": "Rachel (f)"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "label": "Bella (f)"},
    {"id": "MF3mGyEYCl7XYWbV9V6O", "label": "Elli (f)"},
    {"id": "ErXwobaYiN019PkySvjV", "label": "Antoni (h)"},
    {"id": "TxGEqnHWrfWFTfGW9XjX", "label": "Josh (h)"},
]


def list_piper_voices():
    """Voix Piper disponibles : chaque .onnx du dossier piper/ ayant son .onnx.json."""
    voices = []
    for onnx in sorted(glob.glob(os.path.join(config.PIPER_DIR, "*.onnx"))):
        if not os.path.exists(onnx + ".json"):
            continue
        stem = os.path.splitext(os.path.basename(onnx))[0]
        lang = "fr" if stem.lower().startswith("fr") else "en"
        voices.append({"id": stem, "label": stem, "language": lang})
    return voices


def list_voices():
    return {"piper": list_piper_voices(), "elevenlabs": ELEVENLABS_VOICES}


def generate_voice(script_text, language="fr", engine="piper", voice=None, output_name="voice"):
    if engine == "elevenlabs":
        return _elevenlabs(script_text, voice, output_name)
    return _piper(script_text, language, voice, output_name)


def _piper(script_text, language, voice, output_name):
    if voice:
        model = os.path.join(config.PIPER_DIR, f"{voice}.onnx")
        if not os.path.exists(model):
            model = config.PIPER_VOICES.get(language, config.PIPER_VOICE_MODEL)
    else:
        model = config.PIPER_VOICES.get(language, config.PIPER_VOICE_MODEL)

    output_path = os.path.join(config.AUDIO_DIR, f"{output_name}.wav")
    subprocess.run(
        [config.PIPER_EXE, "--model", model, "--output_file", output_path],
        input=script_text.encode("utf-8"),
        check=True,
    )
    return output_path


def _elevenlabs(script_text, voice, output_name):
    if not config.ELEVENLABS_API_KEY:
        raise RuntimeError("Clé ElevenLabs manquante (ELEVENLABS_API_KEY).")
    voice_id = voice or config.ELEVENLABS_VOICE_ID
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    resp = requests.post(
        url,
        headers={"xi-api-key": config.ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json={"text": script_text, "model_id": "eleven_multilingual_v2"},
        timeout=120,
    )
    resp.raise_for_status()
    output_path = os.path.join(config.AUDIO_DIR, f"{output_name}.mp3")
    with open(output_path, "wb") as f:
        f.write(resp.content)
    return output_path
