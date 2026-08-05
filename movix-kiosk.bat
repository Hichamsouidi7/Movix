@echo off
title Movix TV Kiosk Startup
echo ========================================================
echo        MOVIX TV KIOSK - DEMARRAGE PLEIN ECRAN
echo ========================================================
echo.

rem Attendre 3 secondes que le serveur Node/Vite soit prêt
timeout /t 3 /nobreak >nul

rem Essayer de lancer Chrome en mode Kiosque Plein Écran
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Lancement de Google Chrome en Mode Kiosque...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk "http://localhost:3000" --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required
    exit /b
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo Lancement de Google Chrome (32-bit) en Mode Kiosque...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk "http://localhost:3000" --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required
    exit /b
)

rem Fallback vers Microsoft Edge en mode Kiosque
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo Lancement de Microsoft Edge en Mode Kiosque...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:3000" --edge-kiosk-type=fullscreen --no-first-run
    exit /b
)

rem Navigateur par défaut
echo Lancement dans le navigateur par défaut...
start http://localhost:3000
