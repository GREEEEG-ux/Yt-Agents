"""Agent d'analyse SEO piloté par les statistiques.

Assemble un jeu de données par vidéo (historique + YouTube Data API + Analytics
API) puis demande à Groq un rapport d'optimisation JSON structuré.
"""

import json
import re

from agents import analytics_agent, script_agent, storage_agent, upload_agent

PROMPT = """Tu agis comme l'agent seo_optimizer_agent : expert YouTube Shorts (SEO, rétention, titres, hashtags, algorithme).

Analyse les statistiques fournies et renvoie UN SEUL objet JSON d'optimisation pour les prochaines vidéos. Objectif : amélioration progressive, mesurable, pilotée par les données (pas de triche).

RÈGLES FONDAMENTALES :
1. Basé sur les données uniquement : n'invente jamais une métrique ou une conclusion non appuyée par les chiffres. Aucune promesse de résultat.
2. Donnée manquante (absente/null) = à signaler dans data_quality.missing_or_unreliable_fields, jamais à inventer ; baisse la confidence concernée.
3. Échantillon < 8 vidéos ou vues très dispersées : sample_size_warning=true et confidence plafonnée à 0.5.
4. Compare d'abord chaque vidéo à la MÉDIANE de la chaîne (channel_benchmarks), puis seulement aux seuils absolus.
5. Titres, hashtags et tags TOUJOURS en ANGLAIS (le script peut être dans une autre langue ; les hooks suivent la langue du script).
6. Limites YouTube : titre <= 100 caractères ; max 15 hashtags ; tags <= 500 caractères au total ; pas de spam ; pas de titre mensonger.
7. Spécificité Shorts : si shorts_feed domine, priorise rétention/hook ; le CTR ne compte que pour youtube_search/suggested.
8. videos_to_update : ne propose de réécrire QUE des vidéos sous-performantes ET récentes (<= 30 jours). Ne touche pas à une vidéo au-dessus de la médiane ni trop ancienne.

Note : click_through_rate et impressions ne sont pas exposés par l'API publique (souvent null) ; appuie-toi sur la rétention (average_percentage_viewed), la durée moyenne, les partages, les abonnés gagnés et les sources de trafic.

Réponds UNIQUEMENT avec un JSON valide (aucun texte ni Markdown avant/après, aucun commentaire). Tous les champs présents, tableaux vides si rien. confidence = nombre entre 0 et 1.

{
  "data_quality": {"total_videos_received": 0, "usable_videos": 0, "sample_size_warning": false, "missing_or_unreliable_fields": [], "notes": ""},
  "channel_benchmarks": {"median_views": 0, "median_average_percentage_viewed": 0, "median_ctr": 0, "median_likes_per_1000_views": 0, "median_subscribers_per_1000_views": 0},
  "global_analysis": {"total_videos_analyzed": 0, "average_views": 0, "average_retention_rate": 0, "average_ctr": 0, "best_performing_topics": [], "worst_performing_topics": [], "main_strengths": [], "main_weaknesses": []},
  "top_videos": [{"video_id": "", "title": "", "reason": "", "metrics": {"views": 0, "retention_rate": 0, "ctr": 0, "likes": 0, "shares": 0, "subscribers_gained": 0}, "what_to_repeat": []}],
  "underperforming_videos": [{"video_id": "", "title": "", "problem": "", "root_cause": "hook | title | topic | retention | conversion | unknown", "metrics": {"views": 0, "retention_rate": 0, "ctr": 0}, "fixes": []}],
  "seo_recommendations": {"recommended_title_patterns": [], "recommended_description_structure": "", "recommended_hashtags": [], "hashtags_to_avoid": [], "recommended_tags": [], "best_keywords": [], "keywords_to_avoid": []},
  "content_strategy": {"topics_to_repeat": [], "topics_to_avoid": [], "new_video_ideas": [{"idea": "", "reason": "", "suggested_hook": "", "suggested_title": "", "suggested_hashtags": [], "estimated_potential": "low | medium | high", "confidence": 0}], "recommended_video_duration_seconds": {"min": 20, "max": 45}, "recommended_posting_times": []},
  "next_upload_settings": {"title_formula": "", "description_template": "", "hashtags": [], "tags": [], "hook_style": "", "voiceover_style": "", "editing_style": "", "subtitle_style": "", "publish_time": "", "confidence": 0},
  "videos_to_update": [{"video_id": "", "current_title": "", "new_title": "", "current_description": "", "new_description": "", "current_hashtags": [], "new_hashtags": [], "reason": "", "confidence": 0}],
  "automation_rules": [],
  "summary": {"main_action_to_take": "", "priority_level": "low | medium | high", "confidence": 0, "next_3_actions": []}
}

Statistiques à analyser :
"""


def _extract_hashtags(text):
    seen, out = set(), []
    for tag in re.findall(r"#(\w+)", text or ""):
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            out.append("#" + tag)
    return out


def build_dataset(limit=20, days=90):
    """Construit la liste de vidéos enrichies (historique + Data + Analytics)."""
    recent = list(reversed(storage_agent.load_history()))[:limit]
    video_ids = [h["video_id"] for h in recent if h.get("video_id")]
    if not video_ids:
        return []

    topics = {h["video_id"]: h.get("topic", "") for h in recent}
    snippets = upload_agent.get_video_snippets(video_ids)
    stats = upload_agent.get_video_stats(video_ids)
    core = analytics_agent.fetch_core_metrics(video_ids, days)
    traffic = analytics_agent.fetch_traffic_sources(video_ids, days)

    dataset = []
    for vid in video_ids:
        sn = snippets.get(vid, {})
        st = stats.get(vid, {})
        co = core.get(vid, {})
        desc = sn.get("description", "")
        dataset.append({
            "video_id": vid,
            "title": sn.get("title", ""),
            "description": desc,
            "hashtags": _extract_hashtags(desc),
            "tags": sn.get("tags", []),
            "topic": topics.get(vid, ""),
            "script": "",  # non stocké dans l'historique
            "duration_seconds": sn.get("duration_seconds"),
            "published_at": sn.get("published_at", ""),
            "views": co.get("views", st.get("viewCount", 0)),
            "likes": co.get("likes", st.get("likeCount", 0)),
            "comments": co.get("comments", st.get("commentCount", 0)),
            "shares": co.get("shares"),
            "subscribers_gained": co.get("subscribers_gained"),
            "average_view_duration_seconds": co.get("average_view_duration_seconds"),
            "average_percentage_viewed": co.get("average_percentage_viewed"),
            "retention_rate": co.get("retention_rate"),
            "click_through_rate": co.get("click_through_rate"),
            "impressions": co.get("impressions"),
            "traffic_sources": traffic.get(vid),
        })
    return dataset


def analyze(limit=20, days=90):
    dataset = build_dataset(limit, days)
    if not dataset:
        return {
            "data_quality": {
                "total_videos_received": 0,
                "usable_videos": 0,
                "sample_size_warning": True,
                "missing_or_unreliable_fields": [],
                "notes": "Aucune vidéo dans l'historique à analyser.",
            },
            "summary": {
                "main_action_to_take": "Publie quelques vidéos avant de lancer l'analyse.",
                "priority_level": "low",
                "confidence": 1,
                "next_3_actions": [],
            },
        }
    has_analytics = any(v.get("average_percentage_viewed") is not None for v in dataset)
    report = script_agent._call_groq(
        PROMPT + json.dumps(dataset, ensure_ascii=False, indent=2),
        temperature=0.3,
    )
    report["_meta"] = {"videos_analyzed": len(dataset), "analytics_available": has_analytics}
    return report
