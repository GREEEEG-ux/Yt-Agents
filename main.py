import sys
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
)


def run(topic=None, film=None, on_progress=print):
    on_progress("1/6 - Génération du script...")
    if film:
        data = script_agent.generate_film_analysis_script(film)
    else:
        data = script_agent.generate_script(topic)

    if storage_agent.topic_already_used(data["topic"]):
        on_progress(f"Sujet déjà utilisé : {data['topic']}. Arrêt.")
        return None

    on_progress(f"Sujet : {data['topic']}")

    captions = subtitle_agent.split_into_segments(data["script"])

    on_progress("2/6 - Génération des illustrations...")
    image_paths = image_agent.generate_images_for_segments(captions)

    on_progress("3/6 - Génération de la voix...")
    audio_path = voice_agent.generate_voice(data["script"])

    on_progress("4/6 - Montage de la vidéo...")
    video_path = edit_agent.build_video_from_images(image_paths, captions, audio_path)

    on_progress("5/6 - Upload sur YouTube (privé)...")
    video_id = upload_agent.upload_video(
        video_path, data["title"], data["description"], data["tags"]
    )

    on_progress("6/6 - Sauvegarde de l'historique...")
    storage_agent.save_history_entry(data["topic"], data["title"], video_id)

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
            data = script_agent.generate_metadata_for_script(script_text)
        elif topic_for_script:
            data = script_agent.generate_script(topic_for_script)
        else:
            raise ValueError("Voix off activée : fournis un script manuel ou un sujet.")
        captions = subtitle_agent.split_into_segments(data["script"])

        on_progress(f"4/7 - Génération de la voix ({language})...")
        audio_path = voice_agent.generate_voice(data["script"], language=language)
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
        data = script_agent.generate_metadata_for_script(basis)
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
    )

    label = "Short" if video_format == "short" else "vidéo"
    on_progress(f"6/7 - Upload sur YouTube ({label}, privé)...")
    video_id = upload_agent.upload_video(
        video_path, data["title"], data["description"], data["tags"], as_short=(video_format == "short")
    )

    on_progress("7/7 - Sauvegarde de l'historique...")
    storage_agent.save_history_entry(data["topic"], data["title"], video_id)

    on_progress(f"Terminé. Vidéo uploadée en privé : https://youtu.be/{video_id}")
    return {"video_id": video_id, "topic": data["topic"], "title": data["title"]}


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "film":
        run(film=" ".join(args[1:]))
    else:
        run(topic=" ".join(args) if args else None)
