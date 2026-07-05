"""Accès à l'API IMDb (api.market / magicapi) pour enrichir les modes film/récap.

Deux usages :
- suggestions de titres (autocomplétion / choix du bon film/série) ;
- récupération du synopsis officiel pour ANCRER le résumé du LLM sur des faits
  réels (résumés plus fidèles, moins d'hallucination).

Provider magicapi : traitement asynchrone (soumission → id → polling des
`predictions/{id}`). On gère aussi une réponse synchrone directe au cas où.

Nécessite IMDB_API_KEY (header x-api-market-key). Sans clé, les fonctions lèvent
une erreur claire — le pipeline retombe alors sur le LLM seul.
"""

import time

import requests
import config

POLL_INTERVAL = 1.0     # secondes entre deux vérifications de statut
POLL_TIMEOUT = 120.0    # abandon après 2 minutes


def _base():
    return config.IMDB_BASE_URL.rstrip("/")


def is_available():
    return bool(config.IMDB_API_KEY)


def _headers():
    if not config.IMDB_API_KEY:
        raise RuntimeError("Clé IMDb manquante (IMDB_API_KEY).")
    return {"x-api-market-key": config.IMDB_API_KEY}


def _request(path, params):
    """Appelle un endpoint et gère le mode asynchrone (prediction id + polling)."""
    resp = requests.get(f"{_base()}/{path}", headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Réponse synchrone directe.
    if isinstance(data, dict) and ("titles" in data or "suggestions" in data):
        return data

    # Réponse asynchrone : on récupère un id puis on interroge predictions/{id}.
    pred_id = data.get("id") if isinstance(data, dict) else None
    if not pred_id:
        return data if isinstance(data, dict) else {}

    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        poll = requests.get(f"{_base()}/predictions/{pred_id}", headers=_headers(), timeout=30)
        poll.raise_for_status()
        pj = poll.json()
        status = pj.get("status")
        if status == "succeeded":
            out = pj.get("output")
            return out if isinstance(out, dict) else pj
        if status == "failed":
            raise RuntimeError(f"IMDb : prédiction échouée ({pj.get('error')}).")
        time.sleep(POLL_INTERVAL)

    raise RuntimeError("IMDb : délai d'attente dépassé.")


def _title_to_suggestion(t):
    img = t.get("primaryImage") or {}
    return {
        "id": t.get("id"),
        "title": t.get("primaryTitle"),
        "year": t.get("startYear"),
        "image": img.get("url"),
        "description": t.get("description"),
    }


def suggest(query, limit=6):
    """Suggestions de titres via search/advanced : [{id, title, year, image, description}]."""
    data = _request(
        "search/advanced",
        {"query": query, "limit": limit, "sortBy": "POPULARITY", "sortOrder": "ASC"},
    )
    # Selon le provider : soit "suggestions", soit "titles".
    if data.get("suggestions"):
        out = []
        for s in data["suggestions"][:limit]:
            img = s.get("image") or {}
            out.append(
                {
                    "id": s.get("id"),
                    "title": s.get("label") or s.get("primaryTitle"),
                    "year": s.get("year") or s.get("startYear"),
                    "image": img.get("imageUrl") or img.get("url"),
                    "description": s.get("description"),
                }
            )
        return out
    return [_title_to_suggestion(t) for t in (data.get("titles") or [])[:limit]]


def get_plot(query):
    """Meilleur résultat pour `query` → synopsis officiel + méta, ou None."""
    data = _request(
        "search/advanced",
        {"query": query, "limit": 1, "sortBy": "POPULARITY", "sortOrder": "ASC"},
    )
    titles = data.get("titles") or []
    if not titles:
        return None
    t = titles[0]
    img = t.get("primaryImage") or {}
    return {
        "title": t.get("primaryTitle"),
        "year": t.get("startYear"),
        "description": t.get("description"),
        "genres": t.get("genres") or [],
        "rating": t.get("averageRating"),
        "poster": img.get("url"),
    }
