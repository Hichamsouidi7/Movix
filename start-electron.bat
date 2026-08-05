@echo off
title Movix TV Hub - Mode developpement
cd /d "%~dp0"

rem IMPORTANT : si cette variable est heritee (terminal de VS Code notamment),
rem Electron demarre comme un simple Node.js et AUCUNE fenetre ne s'affiche jamais.
set "ELECTRON_RUN_AS_NODE="

echo Lancement de Movix TV Hub (mode developpement - necessite "npm run dev")...
".\node_modules\.bin\electron.cmd" .
