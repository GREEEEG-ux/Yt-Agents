"""Accès à l'API IMDb (api.market / sleeyax) pour enrichir les modes film/récap.

Deux usages :
- suggestions de titres (autocomplétion / choix du bon film/série) ;
- récupération du synopsis officiel pour ANCRER le résumé du LLM sur des faits
  réels (résumés plus fidèles, moins d'hallucination).

Nécessite une clé IMDB_API_KEY (header x-api-market-key). Sans clé, les fonctions
lèvent une erreur claire — le pipeline retombe alors sur le LLM seul.
"""

import requests
import config

BASE = "https://prod.api.market/api/v1/sleeyax/imdb"


def is_available():
    return bool(config.IMDB_API_KEY)


def _headers():
    if not config.IMDB_API_KEY:
        raise RuntimeError("Clé IMDb manquante (IMDB_API_KEY).")
    return {"x-api-market-key": config.IMDB_API_KEY}


def suggest(query, limit=6):
    """Suggestions de titres pour l'autocomplétion : [{id, title, year, image, description}]."""
    resp = requests.get(
        f"{BASE}/api/imdb/search/suggestions",
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
    """Meilleur résultat pour `query` → synopsis officiel + méta, ou None."""
    resp = requests.get(
        f"{BASE}/api/imdb/search/advanced",
        headers=_headers(),
        params={"query": query, "limit": 1, "sortBy": "POPULARITY", "sortOrder": "ASC"},
        timeout=30,
    )
    resp.raise_for_status()
    titles = resp.json().get("titles", [])
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
