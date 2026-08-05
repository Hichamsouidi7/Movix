#!/bin/bash
# ========================================================
# H-FLIX TV KIOSK - SCRIPT DE DEMARRAGE LINUX
# ========================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Démarrage de H-Flix TV Kiosk..."

# 1. Tenter de lancer l'application Electron compilée
if [ -f "$DIR/dist-electron/H-Flix-linux-x64/H-Flix" ]; then
    echo "Lancement de l'application H-Flix (Electron)..."
    "$DIR/dist-electron/H-Flix-linux-x64/H-Flix" --no-sandbox --kiosk
    exit 0
fi

# 2. Alternative : Lancer Chromium en mode Kiosque
if command -v chromium-browser &> /dev/null; then
    echo "Lancement via Chromium Kiosk..."
    chromium-browser --kiosk "http://localhost:3000" --disable-pinch --autoplay-policy=no-user-gesture-required
    exit 0
fi

if command -v google-chrome &> /dev/null; then
    echo "Lancement via Google Chrome Kiosk..."
    google-chrome --kiosk "http://localhost:3000" --disable-pinch --autoplay-policy=no-user-gesture-required
    exit 0
fi

# 3. Fallback Firefox
if command -v firefox &> /dev/null; then
    echo "Lancement via Firefox Kiosk..."
    firefox --kiosk "http://localhost:3000"
    exit 0
fi

echo "Aucun navigateur ou binaire trouvé."
