#!/bin/bash
# ========================================================
# H-FLIX TV - SCRIPT D'INSTALLATION ET DE CONFIGURATION AUTOMATIQUE
# ========================================================

echo "========================================================"
echo "      INSTALLATION AUTOMATIQUE DE H-FLIX TV KIOSK"
echo "========================================================"
echo ""

# Récupérer le dossier courant où se trouve le script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1. Rendre l'application H-Flix exécutable
if [ -f "$DIR/H-Flix" ]; then
    chmod +x "$DIR/H-Flix"
    echo "[OK] Application H-Flix rendue exécutable."
elif [ -f "$DIR/H-Flix-linux-x64/H-Flix" ]; then
    chmod +x "$DIR/H-Flix-linux-x64/H-Flix"
    DIR="$DIR/H-Flix-linux-x64"
    echo "[OK] Application H-Flix rendue exécutable."
else
    echo "[X] Erreur : Fichier 'H-Flix' introuvable dans $DIR"
    exit 1
fi

# 2. Créer le dossier autostart s'il n'existe pas
mkdir -p ~/.config/autostart

# 3. Générer automatiquement le fichier de démarrage automatique
AUTOSTART_FILE="$HOME/.config/autostart/hflix.desktop"
ICON_PATH="$DIR/resources/app/public/flix.png"

# Si l'icône flix.png n'est pas dans le dossier d'application, chercher une fallback
if [ ! -f "$ICON_PATH" ]; then
    ICON_PATH="$DIR/flix.png"
fi

cat <<EOT > "$AUTOSTART_FILE"
[Desktop Entry]
Type=Application
Name=H-Flix TV
Comment=Lancement automatique H-Flix TV Kiosk
Exec="$DIR/H-Flix" --no-sandbox
Icon=$ICON_PATH
Terminal=false
X-GNOME-Autostart-enabled=true
EOT

# 4. Rendre le fichier autostart exécutable
chmod +x "$AUTOSTART_FILE"

echo "[OK] Configuration de démarrage automatique générée dans :"
echo "     $AUTOSTART_FILE"
echo ""
echo "========================================================"
echo " 🎉 INSTALLATION REUSSIE !"
echo " H-Flix se lancera désormais automatiquement en Plein Écran"
echo " à chaque allumage de cet ordinateur Linux."
echo "========================================================"
echo ""
read -p "Appuyez sur Entrée pour quitter..."
