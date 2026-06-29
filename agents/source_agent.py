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


def _download_any(url, quality):
    """Télécharge depuis n'importe quel site : fichier direct ou via yt-dlp."""
    if _is_direct_file(url):
        return asset_agent.download_video(url, f"source_{uuid.uuid4().hex[:8]}.mp4")
    return asset_agent.download_via_ytdlp(url, quality=quality)


def validate_and_fetch(url=None, file_path=None, mine=False, quality="best"):
    """Retourne le chemin local d'une vidéo source.

    - file_path : fichier local déjà sur disque, accepté tel quel.
    - url + mine=True : l'utilisateur confirme avoir les droits → n'importe quel site est accepté
      (yt-dlp gère des centaines de plateformes : YouTube, Vimeo, Twitch, Dailymotion, etc.).
    - url + domaine de banque libre (Pexels/Pixabay/Wikimedia Commons/Internet Archive) : accepté.
    - url + mine=False sur un autre site : tentative de vérification Creative Commons ; si la licence
      n'est pas CC, rejet avec invitation à cocher la confirmation de droits.
    - quality : 'best'/'1080'/'720'/'480'/'360' pour les téléchargements yt-dlp.
    """
    if file_path:
        if not os.path.exists(file_path):
            raise ValueError("Fichier introuvable.")
        return file_path

    if not url:
        raise ValueError("Aucune source fournie (ni lien, ni fichier local).")

    # Droits confirmés par l'utilisateur ou banque d'images libre → n'importe quel lien.
    if mine or _domain_allowed(url):
        return _download_any(url, quality)

    # Sinon, on tente une vérification de licence Creative Commons (best-effort).
    if _is_direct_file(url):
        raise ValueError(
            "Impossible de vérifier la licence d'un lien de fichier direct. "
            "Coche « Je confirme avoir les droits » si tu es autorisé à utiliser cette vidéo."
        )
    try:
        asset_agent.check_creative_commons(url)
    except Exception as e:
        raise ValueError(
            f"{e}\n\nPour utiliser ce lien quand même, coche « Je confirme avoir les droits » "
            "(tu deviens responsable du respect du droit d'auteur)."
        )
    return asset_agent.download_via_ytdlp(url, quality=quality)
