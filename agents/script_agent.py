import json
from groq import Groq
import config

client = Groq(api_key=config.GROQ_API_KEY)

DEFAULT_PROMPT = """Tu es un créateur de contenu YouTube Shorts.
Génère un short original sur un sujet intéressant (faits insolites, science, histoire, productivité...).
Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
  "script": "script parlé de 20 à 45 secondes, phrases courtes, sans emoji",
  "title": "titre accrocheur de moins de 80 caractères",
  "description": "description YouTube avec hashtags",
  "tags": ["tag1", "tag2", "tag3"]
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

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "sujet en quelques mots",
  "script": "script parlé percutant suivant les règles ci-dessus",
  "title": "titre accrocheur de moins de 80 caractères, qui crée de la curiosité",
  "description": "description YouTube avec hashtags",
  "tags": ["tag1", "tag2", "tag3"]
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

Réponds STRICTEMENT en JSON avec ces clés :
{{
  "topic": "titre du film/série + angle (ex: 'Inception - théorie de fin')",
  "script": "script parlé percutant suivant les règles ci-dessus",
  "title": "titre accrocheur de moins de 80 caractères, qui crée de la curiosité",
  "description": "description YouTube avec hashtags",
  "tags": ["tag1", "tag2", "tag3"]
}}
Ne donne aucun texte hors du JSON."""


def generate_script(topic=None):
    prompt = TOPIC_PROMPT.format(topic=topic) if topic else DEFAULT_PROMPT
    return _call_groq(prompt)


def generate_film_analysis_script(film):
    prompt = FILM_ANALYSIS_PROMPT.format(film=film)
    return _call_groq(prompt)


MAX_RETRIES = 3


def _call_groq(prompt):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
        )
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            last_error = e
    raise RuntimeError(f"Groq n'a pas renvoyé de JSON valide après {MAX_RETRIES} tentatives") from last_error
