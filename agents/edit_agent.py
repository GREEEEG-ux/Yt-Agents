import os
from moviepy import AudioFileClip, ImageClip, VideoFileClip, TextClip, CompositeVideoClip, concatenate_videoclips
from moviepy.video.fx import Crop, Resize, CrossFadeIn, Loop
import config

TRANSITION = 0.3
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"


def _build_scene_clip(image_path, caption, duration, is_first):
    clip = ImageClip(image_path).with_duration(duration)
    clip = clip.with_effects([Resize(height=config.VIDEO_HEIGHT)])
    if clip.w > config.VIDEO_WIDTH:
        clip = clip.with_effects([Crop(x_center=clip.w / 2, width=config.VIDEO_WIDTH)])
    if not is_first:
        clip = clip.with_effects([CrossFadeIn(TRANSITION)])

    subtitle = TextClip(
        font=FONT_PATH,
        text=caption,
        font_size=64,
        color="white",
        stroke_color="black",
        stroke_width=3,
        method="caption",
        size=(int(config.VIDEO_WIDTH * 0.85), None),
        text_align="center",
        horizontal_align="center",
        vertical_align="center",
    ).with_duration(duration).with_position(("center", 0.78), relative=True)

    return CompositeVideoClip([clip, subtitle], size=(config.VIDEO_WIDTH, config.VIDEO_HEIGHT))


def build_video_from_images(image_paths, captions, audio_path):
    audio = AudioFileClip(audio_path)
    duration_each = audio.duration / len(image_paths)

    clips = []
    for i, (path, caption) in enumerate(zip(image_paths, captions)):
        clip_duration = duration_each + (TRANSITION if i > 0 else 0)
        clips.append(_build_scene_clip(path, caption, clip_duration, is_first=(i == 0)))

    video = concatenate_videoclips(clips, method="compose", padding=-TRANSITION)
    final = video.with_audio(audio)

    output_path = os.path.join(config.FINAL_DIR, "short.mp4")
    final.write_videofile(output_path, fps=30, codec="libx264", audio_codec="aac")

    audio.close()
    return output_path


def _caption_clip(text, start, duration):
    return (
        TextClip(
            font=FONT_PATH,
            text=text,
            font_size=64,
            color="white",
            stroke_color="black",
            stroke_width=3,
            method="caption",
            size=(int(config.VIDEO_WIDTH * 0.85), None),
            text_align="center",
            horizontal_align="center",
            vertical_align="center",
        )
        .with_start(start)
        .with_duration(duration)
        .with_position(("center", 0.78), relative=True)
    )


def build_video_from_clip(video_path, audio_path, captions):
    audio = AudioFileClip(audio_path)
    video = VideoFileClip(video_path)

    if video.duration < audio.duration:
        video = video.with_effects([Loop(duration=audio.duration)])
    video = video.subclipped(0, audio.duration)

    video = video.with_effects([Resize(height=config.VIDEO_HEIGHT)])
    if video.w > config.VIDEO_WIDTH:
        video = video.with_effects([Crop(x_center=video.w / 2, width=config.VIDEO_WIDTH)])

    duration_each = audio.duration / len(captions)
    caption_clips = [
        _caption_clip(caption, i * duration_each, duration_each)
        for i, caption in enumerate(captions)
    ]

    final = CompositeVideoClip([video, *caption_clips], size=(config.VIDEO_WIDTH, config.VIDEO_HEIGHT))
    final = final.with_audio(audio)

    output_path = os.path.join(config.FINAL_DIR, "short.mp4")
    final.write_videofile(output_path, fps=30, codec="libx264", audio_codec="aac")

    video.close()
    audio.close()
    return output_path
