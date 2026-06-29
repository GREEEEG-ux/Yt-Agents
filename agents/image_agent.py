import os
import time
import urllib.parse
import requests
import config
from agents import subtitle_agent

STYLE_SUFFIX = (
    ", flat vector illustration, simple doodle character, minimalist line art, "
    "pastel solid color background, no text, no watermark"
)

MAX_RETRIES = 5
RETRY_DELAY_SECONDS = 8


def generate_image(prompt, filename, width=1080, height=1920):
    encoded = urllib.parse.quote(prompt + STYLE_SUFFIX)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true"
    path = os.path.join(config.IMAGES_DIR, filename)

    for attempt in range(1, MAX_RETRIES + 1):
        resp = requests.get(url, timeout=60)
        if resp.status_code == 429 and attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY_SECONDS * attempt)
            continue
        resp.raise_for_status()
        with open(path, "wb") as f:
            f.write(resp.content)
        return path

    raise RuntimeError(f"Echec génération image après {MAX_RETRIES} tentatives : {prompt}")


def generate_images_for_segments(segments):
    paths = []
    for i, sentence in enumerate(segments):
        paths.append(generate_image(sentence, f"scene_{i}.png"))
        time.sleep(6)
    return paths


def generate_images_for_script(script_text):
    segments = subtitle_agent.split_into_segments(script_text)
    return generate_images_for_segments(segments)
