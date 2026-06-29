# yt-shorts-agent

Système d'agents IA pour générer et uploader automatiquement des YouTube Shorts.

Voir le prompt d'architecture d'origine et les notes de conception dans le coffre Obsidian "Automatisation" ([[yt-shorts-agent]]).

## Setup

1. `python -m venv venv && venv\Scripts\activate`
2. `pip install -r requirements.txt`
3. Copier `.env.example` en `.env` et remplir les clés API
4. Placer le fichier OAuth YouTube (`client_secret.json`) à la racine
5. Télécharger [Piper TTS](https://github.com/rhasspy/piper/releases) (binaire Windows) et un modèle de voix (ex: `fr_FR-siwis-medium`), les placer dans `piper/` (dossier non versionné, trop volumineux pour git)
6. `python main.py`

## Dashboard (React + Tailwind + shadcn/ui)

Le code source du dashboard est dans `frontend/`. Il se build en fichiers statiques servis par le backend FastAPI depuis `dashboard/` (généré, non versionné).

```
cd frontend
npm install
npm run build
```

Pour développer avec rechargement à chaud (le backend FastAPI doit tourner sur le port 8000) :
```
cd frontend
npm run dev
```

## Dashboard desktop (Electron)

```
cd desktop
npm install
npm start
```

Lance automatiquement le backend FastAPI (`api/`) et ouvre le dashboard (`dashboard/`, donc faire `npm run build` dans `frontend/` au moins une fois avant) dans une fenêtre native. Interface : Accueil, Créer, Bibliothèque, Performances, Réglages.

## Fournir ses propres clips vidéo

Par défaut, `asset_agent.py` télécharge des clips libres de droits via Pexels.

Pour utiliser tes propres sources à la place, remplis `data/video_links.json` :

```json
[
  { "url": "https://...", "mine": true },
  { "url": "https://...", "mine": false }
]
```

- `mine: true` → tes propres vidéos, téléchargées sans vérification.
- `mine: false` → vidéos d'autres créateurs : le système vérifie automatiquement que la licence YouTube est **Creative Commons** avant de télécharger, et refuse sinon. Ne mets jamais ici un lien vers une vidéo protégée par le droit d'auteur que tu n'as pas le droit de réutiliser.

Si `video_links.json` contient des entrées, un lien est choisi au hasard à chaque génération et un extrait aléatoire en est découpé. Si le fichier est vide (`[]`), le système retombe sur Pexels.
