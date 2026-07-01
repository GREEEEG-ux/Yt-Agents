import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
YOUTUBE_CLIENT_SECRETS_FILE = os.getenv("YOUTUBE_CLIENT_SECRETS_FILE", "client_secret.json")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
AUDIO_DIR = os.path.join(OUTPUT_DIR, "audio")
VIDEOS_DIR = os.path.join(OUTPUT_DIR, "videos")
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")
FINAL_DIR = os.path.join(OUTPUT_DIR, "final")
THUMBS_DIR = os.path.join(OUTPUT_DIR, "thumbs")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
VIDEO_LINKS_FILE = os.path.join(DATA_DIR, "video_links.json")

for _dir in (DATA_DIR, AUDIO_DIR, VIDEOS_DIR, IMAGES_DIR, FINAL_DIR, THUMBS_DIR):
    os.makedirs(_dir, exist_ok=True)

PIPER_EXE = os.path.join(BASE_DIR, os.getenv("PIPER_EXE", "piper.exe"))
PIPER_VOICE_MODEL = os.path.join(BASE_DIR, os.getenv("PIPER_VOICE_MODEL", "voice.onnx"))

# Modèles de voix par langue (le défaut fr reste PIPER_VOICE_MODEL pour compat).
PIPER_VOICES = {
    "fr": os.path.join(BASE_DIR, os.getenv("PIPER_VOICE_FR", "piper/fr_FR-siwis-medium.onnx")),
    "en": os.path.join(BASE_DIR, os.getenv("PIPER_VOICE_EN", "piper/en_US-amy-medium.onnx")),
}

VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920
