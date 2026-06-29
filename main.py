import sys
from agents import (
    script_agent,
    image_agent,
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


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "film":
        run(film=" ".join(args[1:]))
    else:
        run(topic=" ".join(args) if args else None)
