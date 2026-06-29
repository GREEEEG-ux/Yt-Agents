import json
import re
from groq import Groq
import config

client = Groq(api_key=config.GROQ_API_KEY)

# ---------------------------------------------------------------------------
# Bloc SEO partagé par tous les prompts.
# Titre, tags et hashtags TOUJOURS en anglais (préférence utilisateur).
# Niche auto-déduite du sujet / script.
# ---------------------------------------------------------------------------

_SEO_RULES = """RÈGLES SEO (obligatoires) :
- "title", "tags" et TOUS les hashtags doivent être en ANGLAIS, quelle que soit la langue du script.
- Déduis seul la niche (anime, cinéma, IA, basket, faits historiques, sitcom...) à partir du sujet/script et optimise hashtags + tags pour cette niche.
- title : moins de 80 caractères, clair, fort taux de clic, compréhensible en 1 seconde, sans clickbait mensonger.
- description : 1 à 2 phrases courtes en anglais, SANS hashtags (ils sont ajoutés séparément).
- hashtags_main : EXACTEMENT 3 hashtags courts, très pertinents, sur le sujet.
- hashtags_secondary : EXACTEMENT 5 hashtags courts et pertinents, aucun hors-sujet, aucun spam.
- tags : EXACTEMENT 10 tags YouTube en anglais (mots-clés pertinents), aucun spam.
- hooks : 3 variantes de hook fort (accroche des 3 premières secondes), dans la langue du script.
- Optimise pour YouTube Shorts : clarté, rétention, taux de clic."""

_SEO_KEYS = """  "title": "titre optimisé en anglais (< 80 caractères)",
  "description": "1-2 phrases courtes en anglais, sans hashtags",
  "hashtags_main": ["#tag1", "#tag2", "#tag3"],
  "hashtags_secondary": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "hooks": ["hook 1", "hook 2", "hook 3"]"""


DEFAULT_PROMPT = """Tu es un créateur de contenu YouTube Shorts.
Génère un short original sur un sujet intéressant (faits insolites, science, histoire, productivité...).

""" + _SEO_RULES + """

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
  "script": "script parlé de 20 à 45 secondes, phrases courtes, sans emoji",
""" + _SEO_KEYS + """
}}
Ne donne aucun texte hors du JSON."""


TOPIC_PROMPT = """Tu es un scénariste viral spécialisé en YouTube Shorts.
Écris un short percutant sur le sujet suivant : "{topic}".

Règles d'écriture impératives :
- Commence par un HOOK choc dans les 3 premières secondes (question intrigante, statistique surprenante, ou affirmation qui crée la curiosité). Jamais "Je vais vous montrer..." ou "Aujourd'hui on parle de...".
- Construis une montée en tension : chaque phrase doit donner envie d'entendre la suivante.
- Phrases courtes, rythme rapide, langage direct et imagé. Pas de ton de documentaire scolaire.
- Termine sur une chute marquante ou un twist, pas une conclusion plate.
- Durée orale visée : 20 à 45 secondes.
- Aucun emoji, aucun texte hors script dans le champ "script".

""" + _SEO_RULES + """

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
  "script": "script parlé percutant suivant les règles ci-dessus",
""" + _SEO_KEYS + """
}}
Ne donne aucun texte hors du JSON."""


FILM_ANALYSIS_PROMPT = """Tu es un créateur de contenu spécialisé en analyse de films et séries pour YouTube Shorts.
Écris un commentaire original sur : "{film}".

Important : tu ne décris jamais de scène comme si le spectateur la voyait à l'écran (pas d'extrait vidéo réel n'est utilisé, seulement des illustrations). Construis plutôt une analyse, un résumé, une théorie ou un détail caché, avec ton propre point de vue.

Règles d'écriture impératives :
- Commence par un HOOK choc dans les 3 premières secondes (question intrigante, affirmation provocante, ou révélation partielle).
- Construis une montée en tension, chaque phrase appelle la suivante.
- Phrases courtes, rythme rapide, ton direct, comme un commentateur passionné, pas un résumé Wikipédia.
- Termine sur une chute marquante, une question ouverte ou un twist.
- Durée orale visée : 20 à 45 secondes.
- Aucun emoji, aucun texte hors script dans le champ "script".
- N'utilise aucune citation mot pour mot tirée du film/de la série : commentaire et analyse uniquement.

""" + _SEO_RULES + """

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "titre du film/série + angle (ex: 'Inception - théorie de fin')",
  "script": "script parlé percutant suivant les règles ci-dessus",
""" + _SEO_KEYS + """
}}
Ne donne aucun texte hors du JSON."""


METADATA_PROMPT = """Tu es un expert en optimisation YouTube Shorts.
Voici un script de voix off (ou une transcription) déjà écrit, à ne pas modifier :
---
{script}
---

Génère uniquement les métadonnées SEO associées.

""" + _SEO_RULES + """

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
""" + _SEO_KEYS + """
}}
Ne donne aucun texte hors du JSON."""


SEO_TOOL_PROMPT = """Tu es un expert SEO YouTube Shorts.
Analyse la vidéo décrite ci-dessous et propose des métadonnées optimisées.

Sujet : {topic}
Niche : {niche}
Script / transcription :
---
{script}
---

""" + _SEO_RULES + """

Contraintes supplémentaires : hashtags courts, aucun hashtag hors sujet, aucun spam, privilégie la clarté et le taux de clic.

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
""" + _SEO_KEYS + """
}}
Ne donne aucun texte hors du JSON."""


# ---------------------------------------------------------------------------
# Génération
# ---------------------------------------------------------------------------

def generate_script(topic=None):
    prompt = TOPIC_PROMPT.format(topic=topic) if topic else DEFAULT_PROMPT
    return _finalize_seo(_call_groq(prompt))


def generate_film_analysis_script(film):
    return _finalize_seo(_call_groq(FILM_ANALYSIS_PROMPT.format(film=film)))


def generate_metadata_for_script(script):
    data = _finalize_seo(_call_groq(METADATA_PROMPT.format(script=script)))
    data["script"] = script
    return data


def generate_seo_metadata(topic="", script="", niche=""):
    """Outil SEO à la demande : renvoie le détail complet (titre, description,
    hashtags principaux/secondaires, tags, hooks) + une description assemblée."""
    prompt = SEO_TOOL_PROMPT.format(
        topic=topic or "(non précisé)",
        niche=niche or "(à déduire du sujet/script)",
        script=script or "(non précisé)",
    )
    raw = _call_groq(prompt)
    data = _finalize_seo(raw)
    return {
        "topic": data.get("topic", topic),
        "title": data["title"],
        "description": data["description"],          # description complète (avec hashtags)
        "short_description": data["short_description"],
        "hashtags_main": data["hashtags_main"],
        "hashtags_secondary": data["hashtags_secondary"],
        "tags": data["tags"],
        "hooks": data["hooks"],
    }


# ---------------------------------------------------------------------------
# Assemblage / normalisation conforme aux limites YouTube
# ---------------------------------------------------------------------------

YT_TITLE_MAX = 100        # limite YouTube
YT_TAGS_TOTAL_MAX = 460   # limite ~500, on garde de la marge pour le tag "Shorts"
YT_MAX_HASHTAGS = 15      # au-delà, YouTube ignore TOUS les hashtags


def _norm_hashtag(raw):
    """'#Two And A Half Men' -> '#TwoAndAHalfMen' ; garde lettres/chiffres/_."""
    cleaned = re.sub(r"[^0-9A-Za-z_]", "", str(raw))
    return "#" + cleaned if cleaned else ""


def _dedupe(items):
    seen, out = set(), []
    for it in items:
        key = it.lower()
        if it and key not in seen:
            seen.add(key)
            out.append(it)
    return out


def _finalize_seo(data):
    title = str(data.get("title", "")).strip()[:YT_TITLE_MAX]

    main = _dedupe(_norm_hashtag(h) for h in (data.get("hashtags_main") or []))[:3]
    secondary = _dedupe(_norm_hashtag(h) for h in (data.get("hashtags_secondary") or []))[:5]
    # On évite qu'un hashtag secondaire duplique un principal.
    secondary = [h for h in secondary if h.lower() not in {m.lower() for m in main}]
    all_hashtags = (main + secondary)[:YT_MAX_HASHTAGS]

    short_desc = str(data.get("description", "")).strip()
    full_desc = short_desc
    if all_hashtags:
        full_desc = f"{short_desc}\n\n{' '.join(all_hashtags)}".strip()

    # Tags : nettoyage, dédup, plafond de longueur totale.
    raw_tags = _dedupe(str(t).strip() for t in (data.get("tags") or []) if str(t).strip())
    tags, total = [], 0
    for t in raw_tags:
        if total + len(t) > YT_TAGS_TOTAL_MAX:
            break
        tags.append(t)
        total += len(t)

    return {
        "topic": str(data.get("topic", "")).strip(),
        "title": title,
        "description": full_desc,
        "short_description": short_desc,
        "tags": tags,
        "hashtags_main": main,
        "hashtags_secondary": secondary,
        "hooks": [str(h).strip() for h in (data.get("hooks") or []) if str(h).strip()][:3],
    }


# ---------------------------------------------------------------------------
# Appel Groq
# ---------------------------------------------------------------------------

MAX_RETRIES = 3


def _strip_code_fence(content):
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.rstrip().endswith("```"):
            content = content.rstrip()[:-3]
        content = content.removeprefix("json").strip() if content.strip().startswith("json") else content
    return content.strip()


def _call_groq(prompt):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
        )
        content = _strip_code_fence(response.choices[0].message.content)
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            last_error = e
    raise RuntimeError(f"Groq n'a pas renvoyé de JSON valide après {MAX_RETRIES} tentatives") from last_error
