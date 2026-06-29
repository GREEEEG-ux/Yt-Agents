import json
import os
from datetime import datetime
import config


def load_history():
    if not os.path.exists(config.HISTORY_FILE):
        return []
    with open(config.HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_history_entry(topic, title, video_id):
    history = load_history()
    history.append({
        "topic": topic,
        "title": title,
        "video_id": video_id,
        "date": datetime.now().isoformat(),
    })
    with open(config.HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)


def topic_already_used(topic):
    history = load_history()
    return any(entry["topic"].lower() == topic.lower() for entry in history)
