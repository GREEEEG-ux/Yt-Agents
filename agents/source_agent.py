import os
import uuid
import requests
import config
from agents import asset_agent

ALLOWED_DOMAINS = ("pexels.com", "pixabay.com", "commons.wikimedia.org", "archive.org")
DIRECT_FILE_EXTENSIONS = (".mp4", ".mov", ".webm", ".mkv")


def _domain_allowed(url):
    return any(domain in url for domain in ALLOWED_DOMAINS)


def _is_direct_file(url):
    return url.lower().split("?")[0].endswith(DIRECT_FILE_EXTENSIONS)


def validate_and_fetch(url=None, file_path=None, mine=False, quality="best"):
    """Retourne le chemin local d'une vidéo source, après vérification des droits.

    - file_path : fichier local déjà sur disque (vidéo de l'utilisateur), accepté sans vérification.
    - url + mine=True : l'utilisateur affirme être propriétaire, téléchargement sans vérification.
    - url + domaine autorisé (Pexels/Pixabay/Wikimedia Commons/Internet Archive) : accepté.
    - url + mine=False sur un autre domaine : vérification de licence Creative Commons via yt-dlp,
      rejet si la licence n'est pas explicitement Creative Commons.
    - quality : 'best'/'1080'/'720'/'480'/'360' pour les téléchargements yt-dlp.
    """
    if file_path:
        if not os.path.exists(file_path):
            raise ValueError("Fichier introuvable.")
        return file_path

    if not url:
        raise ValueError("Aucune source fournie (ni lien, ni fichier local).")

    if mine or _domain_allowed(url):
        if _is_direct_file(url):
            return asset_agent.download_video(url, f"source_{uuid.uuid4().hex[:8]}.mp4")
        if ("pexels.com" in url or "pixabay.com" in url) and not mine:
            raise ValueError(
                "Colle le lien direct du fichier vidéo (terminant par .mp4), pas la page de la vidéo. "
                "Sur Pexels/Pixabay, clic droit sur le bouton de téléchargement → 'Copier l'adresse du lien'."
            )
        return asset_agent.download_via_ytdlp(url, quality=quality)

    if _is_direct_file(url):
        raise ValueError(
            "Impossible de vérifier la licence d'un lien de fichier direct. "
            "Coche 'cette vidéo m'appartient' si c'est ta vidéo, ou utilise un lien "
            "de plateforme vérifiable (ex: YouTube avec licence Creative Commons)."
        )

    asset_agent.check_creative_commons(url)
    return asset_agent.download_via_ytdlp(url, quality=quality)
