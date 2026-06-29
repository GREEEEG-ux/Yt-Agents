import re


def split_into_segments(script_text, max_segments=6):
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", script_text) if s.strip()]
    if not sentences:
        return [script_text]
    return sentences[:max_segments]
