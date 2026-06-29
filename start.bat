@echo off
REM Lanceur tout-en-un pour yt-shorts-agent (backend FastAPI + dashboard Electron)
cd /d "%~dp0"

echo [1/2] Build du dashboard (frontend)...
if not exist "dashboard\index.html" (
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo [2/2] Lancement de l'application...
cd desktop
if not exist "node_modules" call npm install
call npm start
