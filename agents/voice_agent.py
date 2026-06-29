import os
import subprocess
import config


def generate_voice(script_text, language="fr"):
    model = config.PIPER_VOICES.get(language, config.PIPER_VOICE_MODEL)
    output_path = os.path.join(config.AUDIO_DIR, "voice.wav")
    subprocess.run(
        [
            config.PIPER_EXE,
            "--model", model,
            "--output_file", output_path,
        ],
        input=script_text.encode("utf-8"),
        check=True,
    )
    return output_path
