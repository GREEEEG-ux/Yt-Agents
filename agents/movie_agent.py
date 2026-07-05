"""Accès à l'API IMDb (api.market / sleeyax) pour enrichir les modes film/récap.

Deux usages :
- suggestions de titres (choix du bon film/série) ;
- récupération du synopsis officiel pour ANCRER le résumé du LLM sur des faits
  réels (résumés plus fidèles, moins d'hallucination).

Provider sleeyax : endpoints GET synchrones sous `/api/imdb/...`.
Nécessite IMDB_API_KEY (header x-api-market-key) + un abonnement actif au produit
sur api.market. Sans clé/abonnement, les fonctions lèvent une erreur claire — le
pipeline retombe alors sur le LLM seul.
"""

import requests
import config


def _base():
    return config.IMDB_BASE_URL.rstrip("/")


def is_available():
    return bool(config.IMDB_API_KEY)


def _headers():
    if not config.IMDB_API_KEY:
        raise RuntimeError("Clé IMDb manquante (IMDB_API_KEY).")
    return {"x-api-market-key": config.IMDB_API_KEY}


def suggest(query, limit=6):
    """Suggestions de titres : [{id, title, year, image, description}]."""
    resp = requests.get(
        f"{_base()}/api/imdb/search/suggestions",
        headers=_headers(),
        params={"query": query},
        timeout=30,
    )
    resp.raise_for_status()
    out = []
    for s in resp.json().get("suggestions", [])[:limit]:
        img = s.get("image") or {}
        out.append(
            {
                "id": s.get("id"),
                "title": s.get("label"),
                "year": s.get("year"),
                "image": img.get("imageUrl"),
                "description": s.get("description"),
            }
        )
    return out


def get_plot(query):
    """Identifie l'œuvre la plus pertinente via l'endpoint suggestions (meilleur
    matching) → {title, year, descriptor, poster}. L'API ne fournit pas de
    synopsis complet ; on renvoie l'identité + le descripteur (année · genres ·
    durée) qui sert à ancrer/désambiguïser l'œuvre pour le LLM."""
    results = suggest(query, limit=1)
    if not results:
        return None
    s = results[0]
    return {
        "title": s.get("title"),
        "year": s.get("year"),
        "descriptor": s.get("description"),  # ex: "2010 · Sci-Fi, Thriller · 2h 28m"
        "poster": s.get("image"),
    }
