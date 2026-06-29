# Prompt Antigravity — Dashboard local de gestion de contenu (yt-shorts-agent)

Copie-colle ce prompt dans Antigravity pour générer l'interface.

````md
Tu es un expert en développement full-stack (FastAPI + React/Next.js), UI/UX design, et intégration de pipelines IA d'automatisation de contenu.

Contexte du projet existant :
J'ai déjà un backend Python fonctionnel nommé `yt-shorts-agent` situé dans `D:\botAutomatisation\yt-shorts-agent\`. Il génère et publie automatiquement des YouTube Shorts via une chaîne d'agents :

- `agents/script_agent.py` — génère script/titre/description/tags via Groq (modes : sujet libre, sujet imposé, analyse de film/série)
- `agents/subtitle_agent.py` — découpe le script en segments (sous-titres)
- `agents/image_agent.py` — génère une illustration par segment via Pollinations.ai (style doodle/flat illustration)
- `agents/asset_agent.py` — alternative : clips vidéo réels via Pexels/Pixabay, ou liens manuels vérifiés Creative Commons via yt-dlp
- `agents/voice_agent.py` — texte → voix via Piper TTS (local, gratuit)
- `agents/edit_agent.py` — monte un slideshow 9:16 avec sous-titres incrustés (MoviePy)
- `agents/upload_agent.py` — upload YouTube en privé (OAuth Data API v3)
- `agents/storage_agent.py` — historique JSON (`data/history.json`) + anti-doublon par sujet
- `main.py` — orchestre tout, utilisable en CLI : `python main.py`, `python main.py "sujet"`, `python main.py film "titre - angle"`
- Config dans `.env` (clés Groq/Pexels/Pixabay, chemins Piper, OAuth)

Je veux une interface graphique locale pour piloter ce backend sans taper de commandes, dans le style d'un studio de production de contenu IA (cf. capture d'écran fournie séparément : sidebar sombre avec icônes, sections Accueil/Créer/Bibliothèque/Séries/Inspiration/Publier/Performances/Réglages, panneaux de configuration des moteurs IA et voix avec statut de connexion).

## Objectif

Construire une application web locale (lancée en `localhost`, pas besoin de déploiement cloud) avec :
1. Un backend **FastAPI** qui wrappe les agents Python existants (ne pas les réécrire, les importer et les exposer via endpoints REST + WebSocket pour le suivi de progression en temps réel).
2. Un frontend **React/Next.js** avec **Tailwind CSS + shadcn/ui**, thème sombre, qui consomme cette API.

## Stack imposée

- Backend : FastAPI, Uvicorn, WebSocket pour les logs de génération en direct
- Frontend : Next.js (App Router), Tailwind CSS, shadcn/ui (utilise le MCP shadcn/ui si disponible pour la recherche de composants)
- Pas de base de données nouvelle : continuer à utiliser `data/history.json` existant en lecture/écriture (le backend FastAPI lit/écrit ce même fichier, pas de migration SQLite pour cette V1)
- Communication frontend ↔ backend : REST pour les actions ponctuelles (lister, configurer), WebSocket pour le suivi d'une génération en cours (avancement étape par étape, comme les logs `1/6 - ... 2/6 - ...` déjà produits par `main.py`)

## Directives de design (utilise les compétences UI/UX disponibles)

Applique les principes des skills `ui-ux-pro-max`, `design-system` et `ui-styling` :
- Thème sombre par défaut, palette neutre avec un accent coloré (orange/ambre comme sur la référence, ou propose une palette cohérente)
- Sidebar de navigation fixe à gauche avec icônes + labels
- Composants accessibles (shadcn/ui : Dialog, DropdownMenu, Table, Tabs, Switch, Badge, Toast)
- Layout responsive desktop-first (l'usage principal est un grand écran, pas mobile)
- Indicateurs d'état clairs (badge "Moteur connecté" / "Clé détectée" / "Erreur") avec icônes
- Pas de jargon technique brut dans l'UI utilisateur final — les noms d'agents techniques (`script_agent`, etc.) sont à traduire en libellés compréhensibles ("Génération du script", "Illustrations IA", "Voix off", "Montage", "Publication")

## Structure de navigation (sidebar)

1. **Accueil** — vue d'ensemble : nombre de vidéos générées, dernières publications, bouton "Nouvelle génération" en évidence
2. **Créer** — formulaire de génération :
   - Choix du mode : sujet libre / sujet imposé (champ texte) / analyse de film (champ titre + angle)
   - Choix de la source visuelle : illustrations IA (Pollinations) ou clips vidéo réels (Pexels/Pixabay) ou liens manuels
   - Bouton "Générer" → lance le pipeline, affiche la progression en direct (étape par étape, via WebSocket) avec les logs actuels de `main.py` (1/6 Script, 2/6 Illustrations, 3/6 Voix, 4/6 Montage, 5/6 Upload, 6/6 Historique)
   - Aperçu vidéo (lecteur HTML5) une fois `output/final/short.mp4` généré, avant upload si possible
3. **Bibliothèque** — liste des vidéos déjà générées, lue depuis `data/history.json` : titre, sujet, date, lien YouTube, statut (privé/public). Actions : ouvrir sur YouTube, supprimer l'entrée d'historique
4. **Séries** — gestion de thématiques récurrentes (ex: "Mafia italienne", "Analyse de films") pour lancer des générations groupées sur un même angle
5. **Inspiration** — suggestions de sujets (génération IA de 5-10 idées de sujets via Groq, à la demande), et la liste des sources/outils déjà identifiés dans le projet (Pexels, Pixabay) pour parcourir manuellement
6. **Publier** — file d'attente des vidéos en attente de passage privé → public, avec confirmation explicite avant de rendre une vidéo publique (jamais d'action automatique de passage en public sans clic utilisateur)
7. **Performances** — statistiques basiques par vidéo (titre, date, lien) ; les vues/statistiques YouTube réelles sont une amélioration future via l'API YouTube Analytics, à prévoir en placeholder
8. **Réglages** — panneaux de configuration, organisés en sous-onglets :
   - **Intelligence IA** : statut clé Groq détectée ou non (lecture de `.env`, jamais d'affichage de la clé en clair), test de connexion
   - **Voix et narration** : sélection du moteur vocal — Piper (local, gratuit, déjà intégré) — avec emplacement prévu pour ajouter d'autres moteurs plus tard (ElevenLabs, Edge TTS) sans casser l'existant ; liste des voix Piper disponibles dans `piper/`, bouton "Tester" qui joue un échantillon
   - **Sources visuelles** : statut clés Pexels/Pixabay, configuration `data/video_links.json` (ajout/suppression de liens avec flag "mes vidéos" ou "à vérifier CC")
   - **Moteur local** : statut de connexion au backend FastAPI local (ping), version Python, chemins Piper/FFmpeg détectés ou non

## Contraintes importantes

- **Aucune clé API ne doit apparaître en clair dans l'interface** une fois saisie — uniquement un statut "détectée/non détectée" et un champ masqué pour la modifier.
- **Aucun passage automatique d'une vidéo en public** : toute action de publication publique doit être un clic explicite et confirmé dans l'onglet "Publier".
- Le backend FastAPI doit **réutiliser le code existant** (`import` des modules `agents/*.py` et `config.py`) plutôt que de dupliquer la logique métier.
- L'interface doit fonctionner même si certaines clés API ne sont pas encore configurées (état "non configuré" plutôt qu'un crash).
- Respecter la structure de dossiers existante (`output/`, `data/`, `piper/`) sans la réorganiser.

## Livrables attendus

1. Arborescence complète du nouveau dossier `dashboard/` (frontend) et `api/` (backend FastAPI), à la racine de `yt-shorts-agent/`
2. Le rôle précis de chaque fichier/dossier
3. Le code des endpoints FastAPI principaux (lancement de génération avec WebSocket de progression, lecture de l'historique, lecture/écriture de configuration `.env` sans exposer les valeurs sensibles)
4. Le code des pages frontend principales (Accueil, Créer, Bibliothèque, Réglages) avec composants shadcn/ui
5. Les commandes d'installation et de lancement en local (`npm install`, `uvicorn`, scripts npm/concurrently pour lancer les deux en même temps)
6. Une checklist de vérification finale

Réponds en français, sois concret, et donne du code directement utilisable plutôt que des descriptions abstraites.
````
