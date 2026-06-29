import os
from moviepy import AudioFileClip, ImageClip, VideoFileClip, TextClip, CompositeVideoClip, concatenate_videoclips
from moviepy.video.fx import Crop, Resize, CrossFadeIn, Loop
import config

TRANSITION = 0.3
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"

DEFAULT_SUBTITLE_STYLE = {
    "font_size": 64,       # taille à la largeur de référence 1080 px
    "color": "#FFFFFF",    # couleur du texte (hex)
    "mode": "sentence",    # "sentence" ou "word" (mot par mot)
    "max_words": 3,        # mots max par sous-titre en mode phrase (groupes dynamiques)
}


def _style(subtitle_style):
    return {**DEFAULT_SUBTITLE_STYLE, **(subtitle_style or {})}


def _scaled_font(style, frame_width):
    # La taille est définie pour 1080 px de large ; on l'adapte à la largeur réelle.
    return max(12, round(style["font_size"] * frame_width / config.VIDEO_WIDTH))


def _make_caption_clip(text, start, duration, frame_width, frame_height, style):
    font_size = _scaled_font(style, frame_width)
    # method="caption" sous-estime la hauteur : sans cette marge verticale, le
    # contour et le bas de la dernière ligne sont rognés dans le bitmap du texte.
    v_margin = round(font_size * 0.35)
    clip = TextClip(
        font=FONT_PATH,
        text=text,
        font_size=font_size,
        color=style["color"],
        stroke_color="black",
        stroke_width=3,
        method="caption",
        size=(int(frame_width * 0.85), None),
        margin=(0, v_margin),
        text_align="center",
        horizontal_align="center",
        vertical_align="center",
    )
    # On centre le bloc sur la ligne des 78 % (comme l'aperçu du frontend) puis
    # on le borne pour qu'il reste toujours entièrement visible dans le cadre.
    margin = round(frame_height * 0.02)
    y = round(frame_height * 0.78 - clip.h / 2)
    y = max(margin, min(y, frame_height - clip.h - margin))
    return clip.with_start(start).with_duration(duration).with_position(("center", y))


def _word_timings(captions, timed_segments, total_duration):
    """Liste de (mot, start, end) en secondes."""
    words = []
    if timed_segments:
        for seg in timed_segments:
            # Timestamps précis par mot (Whisper word_timestamps) si disponibles.
            seg_words = seg.get("words")
            if seg_words:
                for w in seg_words:
                    tok = w["text"].strip()
                    if tok:
                        words.append((tok, w["start"], max(w["end"], w["start"] + 0.05)))
                continue
            # Repli : répartition uniforme sur la durée du segment.
            tokens = seg["text"].split()
            if not tokens:
                continue
            seg_dur = max(0.1, seg["end"] - seg["start"])
            per = seg_dur / len(tokens)
            for i, tok in enumerate(tokens):
                ws = seg["start"] + i * per
                words.append((tok, ws, ws + per))
    elif captions:
        tokens = [t for c in captions for t in c.split()]
        if not tokens:
            return []
        per = total_duration / len(tokens)
        for i, tok in enumerate(tokens):
            words.append((tok, i * per, (i + 1) * per))
    return words


def _build_caption_timeline(captions, timed_segments, total_duration, style):
    """Retourne une liste de (start, duration, text) selon le style choisi."""
    words = _word_timings(captions, timed_segments, total_duration)
    if not words:
        return []

    if style["mode"] == "word":
        return [(w[1], max(0.1, w[2] - w[1]), w[0]) for w in words]

    n = max(1, int(style["max_words"]))
    groups = []
    for i in range(0, len(words), n):
        group = words[i : i + n]
        text = " ".join(w[0] for w in group)
        groups.append((group[0][1], group[-1][2], text))

    # On prolonge chaque groupe jusqu'au début du suivant pour éviter les
    # clignotements, sans dépasser sa fin naturelle de plus de 0,4 s (silences).
    chunks = []
    for i, (start, end, text) in enumerate(groups):
        next_start = groups[i + 1][0] if i + 1 < len(groups) else end
        display_end = min(max(end, next_start), end + 0.4)
        chunks.append((start, max(0.1, display_end - start), text))
    return chunks


def _fit_short(video):
    """Recadre la vidéo en 9:16 (1080x1920)."""
    video = video.with_effects([Resize(height=config.VIDEO_HEIGHT)])
    if video.w > config.VIDEO_WIDTH:
        video = video.with_effects([Crop(x_center=video.w / 2, width=config.VIDEO_WIDTH)])
    elif video.w < config.VIDEO_WIDTH:
        video = video.with_effects([Resize(width=config.VIDEO_WIDTH)])
        # Biais vers le haut (42 %) : on garde les visages, souvent hauts dans le cadre.
        y_center = max(config.VIDEO_HEIGHT / 2, video.h * 0.42)
        y_center = min(y_center, video.h - config.VIDEO_HEIGHT / 2)
        video = video.with_effects([Crop(y_center=y_center, height=config.VIDEO_HEIGHT)])
    return video


def _scene_image(image_path, duration, is_first):
    clip = ImageClip(image_path).with_duration(duration)
    clip = clip.with_effects([Resize(height=config.VIDEO_HEIGHT)])
    if clip.w > config.VIDEO_WIDTH:
        clip = clip.with_effects([Crop(x_center=clip.w / 2, width=config.VIDEO_WIDTH)])
    if not is_first:
        clip = clip.with_effects([CrossFadeIn(TRANSITION)])
    return clip


def build_video_from_images(image_paths, captions, audio_path, subtitle_style=None):
    style = _style(subtitle_style)
    audio = AudioFileClip(audio_path)
    duration_each = audio.duration / len(image_paths)

    scenes = []
    for i, path in enumerate(image_paths):
        clip_duration = duration_each + (TRANSITION if i > 0 else 0)
        scenes.append(_scene_image(path, clip_duration, is_first=(i == 0)))

    slideshow = concatenate_videoclips(scenes, method="compose", padding=-TRANSITION)

    timeline = _build_caption_timeline(captions, None, audio.duration, style)
    caption_clips = [
        _make_caption_clip(text, start, dur, config.VIDEO_WIDTH, config.VIDEO_HEIGHT, style)
        for (start, dur, text) in timeline
    ]

    final = CompositeVideoClip([slideshow, *caption_clips], size=(config.VIDEO_WIDTH, config.VIDEO_HEIGHT))
    final = final.with_audio(audio)

    output_path = os.path.join(config.FINAL_DIR, "short.mp4")
    final.write_videofile(output_path, fps=30, codec="libx264", audio_codec="aac")

    audio.close()
    return output_path


def build_video_from_clip(
    video_path,
    audio_path=None,
    captions=None,
    timed_segments=None,
    video_format="short",
    subtitle_style=None,
):
    """Monte une vidéo à partir d'un clip réel.

    - audio_path=None  → on garde l'audio d'origine du clip.
    - audio_path donné → voix off TTS, la vidéo est bouclée/coupée à sa durée.
    - timed_segments   → sous-titres synchronisés [{start, end, text}] (transcription).
    - captions         → sous-titres répartis uniformément (liste de phrases).
    - video_format     → "short" (9:16 recadré) ou "video" (aspect d'origine conservé).
    - subtitle_style   → {font_size, color, mode, max_words}.
    """
    style = _style(subtitle_style)
    video = VideoFileClip(video_path)
    audio = None

    if audio_path:
        audio = AudioFileClip(audio_path)
        if video.duration < audio.duration:
            video = video.with_effects([Loop(duration=audio.duration)])
        video = video.subclipped(0, audio.duration)
        target_duration = audio.duration
    else:
        target_duration = video.duration

    if video_format == "short":
        video = _fit_short(video)

    frame_width = video.w
    frame_height = video.h

    timeline = _build_caption_timeline(captions, timed_segments, target_duration, style)
    caption_clips = [
        _make_caption_clip(text, start, dur, frame_width, frame_height, style)
        for (start, dur, text) in timeline
        if start < target_duration
    ]

    final = CompositeVideoClip([video, *caption_clips], size=(video.w, video.h))
    if audio is not None:
        final = final.with_audio(audio)

    output_path = os.path.join(config.FINAL_DIR, "short.mp4")
    final.write_videofile(output_path, fps=30, codec="libx264", audio_codec="aac")

    video.close()
    if audio is not None:
        audio.close()
    return output_path
