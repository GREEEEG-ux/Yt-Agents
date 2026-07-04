import os
import subprocess
import sys

import config
from agents import (
    script_agent,
    image_agent,
    source_agent,
    clip_agent,
    transcription_agent,
    subtitle_agent,
    voice_agent,
    edit_agent,
    upload_agent,
    storage_agent,
    movie_agent,
)


def _imdb_context(film, on_progress):
    """Récupère le synopsis officiel IMDb pour ancrer le résumé (best-effort)."""
    if not (film and movie_agent.is_available()):
        return ""
    try:
        on_progress("Recherche du synopsis officiel (IMDb)...")
        info = movie_agent.get_plot(film)
        if info and info.get("description"):
            meta = f"Titre : {info['title']} ({info.get('year','')}). "
            meta += f"Genres : {', '.join(info.get('genres') or [])}. " if info.get("genres") else ""
            return meta + f"Synopsis : {info['description']}"
    except Exception:
        pass
    return ""


def _save_thumbnail(video_path, video_id):
    """Extrait une frame de la vidéo comme vignette locale (poster des cartes)."""
    dest = os.path.join(config.THUMBS_DIR, f"{video_id}.jpg")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-ss", "1", "-i", video_path, "-frames:v", "1", "-q:v", "3", dest],
            check=True,
            capture_output=True,
        )
    except Exception:
        pass  # vignette optionnelle : on n'échoue jamais la génération pour ça


def _preview_result(video_path, data, as_short):
    """Métadonnées renvoyées quand la vidéo est montée mais pas encore publiée."""
    return {
        "preview": True,
        "video_path": video_path,
        "title": data["title"],
        "description": data["description"],
        "tags": data["tags"],
        "topic": data["topic"],
        "as_short": as_short,
    }


def publish_built(video_path, title, description, tags, topic, as_short=True, on_progress=print):
    """Publie une vidéo déjà montée (après prévisualisation)."""
    on_progress("Upload sur YouTube (privé)...")
    video_id = upload_agent.upload_video(video_path, title, description, tags, as_short=as_short)
    storage_agent.save_history_entry(topic, title, video_id)
    on_progress(f"Terminé. Vidéo uploadée en privé : https://youtu.be/{video_id}")
    return {"video_id": video_id, "topic": topic, "title": title}


def run(topic=None, film=None, subtitle_style=None, auto_upload=True,
        llm_engine="groq", voice_engine="piper", voice=None, on_progress=print):
    on_progress("1/6 - Génération du script...")
    if film:
        context = _imdb_context(film, on_progress)
        data = script_agent.generate_film_analysis_script(film, engine=llm_engine, context=context)
    else:
        data = script_agent.generate_script(topic, engine=llm_engine)

    if storage_agent.topic_already_used(data["topic"]):
        on_progress(f"Sujet déjà utilisé : {data['topic']}. Arrêt.")
        return None

    on_progress(f"Sujet : {data['topic']}")

    captions = subtitle_agent.split_into_segments(data["script"])

    on_progress("2/6 - Génération des illustrations...")
    image_paths = image_agent.generate_images_for_segments(captions)

    on_progress("3/6 - Génération de la voix...")
    audio_path = voice_agent.generate_voice(data["script"], engine=voice_engine, voice=voice)

    on_progress("4/6 - Montage de la vidéo...")
    video_path = edit_agent.build_video_from_images(image_paths, captions, audio_path, subtitle_style=subtitle_style)

    if not auto_upload:
        on_progress("Prévisualisation prête.")
        return _preview_result(video_path, data, as_short=True)

    on_progress("5/6 - Upload sur YouTube (privé)...")
    video_id = upload_agent.upload_video(
        video_path, data["title"], data["description"], data["tags"]
    )

    on_progress("6/6 - Sauvegarde de l'historique...")
    storage_agent.save_history_entry(data["topic"], data["title"], video_id)
    _save_thumbnail(video_path, video_id)

    on_progress(f"Terminé. Vidéo uploadée en privé : https://youtu.be/{video_id}")
    return {"video_id": video_id, "topic": data["topic"], "title": data["title"]}


def run_from_clip(
    source_url=None,
    file_path=None,
    mine=False,
    clip_mode="manual",
    clip_start=0.0,
    clip_duration=30.0,
    voice_enabled=True,
    language="fr",
    script_text=None,
    topic_for_script=None,
    transcription_enabled=False,
    transcription_engine="whisper",
    video_format="short",
    video_quality="best",
    subtitle_style=None,
    llm_engine="groq",
    voice_engine="piper",
    voice=None,
    auto_upload=True,
    on_progress=print,
):
    on_progress("1/7 - Vérification de la source...")
    source_path = source_agent.validate_and_fetch(
        url=source_url, file_path=file_path, mine=mine, quality=video_quality
    )

    on_progress("2/7 - Découpage du clip...")
    clip_path = clip_agent.extract_clip(
        source_path, mode=clip_mode, start=clip_start, duration=clip_duration, on_progress=on_progress
    )

    audio_path = None
    captions = None
    timed_segments = None

    if voice_enabled:
        on_progress("3/7 - Préparation du script...")
        if script_text:
            data = script_agent.generate_metadata_for_script(script_text, engine=llm_engine)
        elif topic_for_script:
            data = script_agent.generate_script(topic_for_script, engine=llm_engine)
        else:
            raise ValueError("Voix off activée : fournis un script manuel ou un sujet.")
        captions = subtitle_agent.split_into_segments(data["script"])

        on_progress(f"4/7 - Génération de la voix ({language})...")
        audio_path = voice_agent.generate_voice(data["script"], language=language, engine=voice_engine, voice=voice)
    else:
        on_progress("3/7 - Sous-titres / métadonnées...")
        transcript_text = ""
        if transcription_enabled:
            on_progress(f"Transcription de l'audio du clip ({transcription_engine})...")
            timed_segments = transcription_agent.transcribe(
                clip_path, language=language, engine=transcription_engine
            )
            transcript_text = " ".join(s["text"] for s in timed_segments)

        basis = transcript_text or topic_for_script or "Clip vidéo"
        data = script_agent.generate_metadata_for_script(basis, engine=llm_engine)
        on_progress("4/7 - (voix off désactivée, audio d'origine conservé)")

    if storage_agent.topic_already_used(data["topic"]):
        on_progress(f"Sujet déjà utilisé : {data['topic']}. Arrêt.")
        return None

    on_progress(f"Sujet : {data['topic']}")

    on_progress("5/7 - Montage de la vidéo...")
    video_path = edit_agent.build_video_from_clip(
        clip_path,
        audio_path=audio_path,
        captions=captions,
        timed_segments=timed_segments,
        video_format=video_format,
        subtitle_style=subtitle_style,
    )

    if not auto_upload:
        on_progress("Prévisualisation prête.")
        return _preview_result(video_path, data, as_short=(video_format != "video"))

    label = "Short" if video_format == "short" else "vidéo"
    on_progress(f"6/7 - Upload sur YouTube ({label}, privé)...")
    video_id = upload_agent.upload_video(
        video_path, data["title"], data["description"], data["tags"], as_short=(video_format != "video")
    )

    on_progress("7/7 - Sauvegarde de l'historique...")
    storage_agent.save_history_entry(data["topic"], data["title"], video_id)
    _save_thumbnail(video_path, video_id)

    on_progress(f"Terminé. Vidéo uploadée en privé : https://youtu.be/{video_id}")
    return {"video_id": video_id, "topic": data["topic"], "title": data["title"]}


def _audio_duration(path):
    from moviepy import AudioFileClip

    a = AudioFileClip(path)
    d = a.duration
    a.close()
    return d


def run_recap_series(
    film,
    num_parts=3,
    subtitle_style=None,
    llm_engine="groq",
    voice_engine="piper",
    voice=None,
    source_url=None,
    file_path=None,
    mine=False,
    video_format="short",
    video_quality="best",
    on_progress=print,
):
    """Résumé condensé d'un film/série découpé en N Shorts (série de parties).

    Deux visuels possibles :
    - sans source : chaque partie est illustrée par IA (commentaire original) ;
    - avec un lien/fichier vidéo : la vidéo est découpée en N segments chronologiques
      et la narration/les sous-titres de chaque partie sont montés sur la vraie vidéo.
    Uploadé en privé. Renvoie la 1re vidéo + le nombre de parties."""
    context = _imdb_context(film, on_progress)
    on_progress("Génération du résumé condensé...")
    series = script_agent.generate_recap_series(film, parts=num_parts, engine=llm_engine, context=context)
    parts = series["parts"]
    total = len(parts)

    use_source = bool(source_url or file_path)
    source_path, src_total = None, 0.0
    if use_source:
        on_progress("Téléchargement de la vidéo source...")
        source_path = source_agent.validate_and_fetch(
            url=source_url, file_path=file_path, mine=mine, quality=video_quality
        )
        from moviepy import VideoFileClip

        with VideoFileClip(source_path) as v:
            src_total = v.duration

    results = []
    for i, part_script in enumerate(parts):
        step = i + 1
        title = f"{series['title']} (Part {step}/{total})"
        captions = subtitle_agent.split_into_segments(part_script)

        on_progress(f"{step}/{total} - Partie {step} : voix...")
        audio_path = voice_agent.generate_voice(part_script, engine=voice_engine, voice=voice)

        if use_source:
            dur = _audio_duration(audio_path)
            window = src_total / total
            seg_start = min(i * window, max(0.0, src_total - dur))
            on_progress(f"{step}/{total} - Partie {step} : montage sur la vidéo...")
            clip_i = clip_agent.extract_clip(
                source_path, mode="manual", start=seg_start, duration=max(dur, 2.0)
            )
            video_path = edit_agent.build_video_from_clip(
                clip_i, audio_path=audio_path, captions=captions,
                video_format=video_format, subtitle_style=subtitle_style,
            )
            as_short = video_format != "video"
        else:
            on_progress(f"{step}/{total} - Partie {step} : illustrations + montage...")
            image_paths = image_agent.generate_images_for_segments(captions)
            video_path = edit_agent.build_video_from_images(
                image_paths, captions, audio_path, subtitle_style=subtitle_style
            )
            as_short = True

        on_progress(f"{step}/{total} - Partie {step} : upload...")
        video_id = upload_agent.upload_video(
            video_path, title, series["description"], series["tags"], as_short=as_short
        )
        storage_agent.save_history_entry(series["topic"], title, video_id)
        _save_thumbnail(video_path, video_id)
        results.append({"video_id": video_id, "title": title})

    on_progress(f"Terminé. {total} parties uploadées en privé.")
    first = results[0]
    return {
        "video_id": first["video_id"],
        "title": f"{series['title']} — {total} parties",
        "topic": series["topic"],
    }


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "film":
        run(film=" ".join(args[1:]))
    elif args and args[0] == "recap":
        run_recap_series(film=" ".join(args[1:]))
    else:
        run(topic=" ".join(args) if args else None)
