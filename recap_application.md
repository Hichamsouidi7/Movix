# 📖 PRÉSENTATION & RÉCAPITULATIF COMPLET - MOVIX TV HUB

## 💡 À quoi sert Movix ?
**Movix** est une plateforme multimédia tout-en-un conçue pour transformer n'importe quel ordinateur ou PC de salon tactile connecté à une TV en un **véritable Hub Smart TV Kiosque moderne** (style Apple TV / Netflix).

Il réunit en une seule interface fluide :
1. **Les Films & Séries en Streaming VF/VOSTFR** (sans aucune limitation ni abonnement payant).
2. **La TV en Direct & Sports (MMA / UFC / Foot)** via des flux IPTV et proxies dédiés.
3. **Le Hub YouTube Officiel Sans Pub** avec comptes personnels, abonnements et historique.
4. **Le Hub Twitch Officiel** pour les streams et tchats en direct.
5. **Le Système Multi-Profils Familial** (ex: *Maison (Salon)*, *Bastien*...).

---

## 🛠️ Architecture & Composants Principaux

### 1. Application Desktop Electron (`electron/main.cjs`)
- Mode Kiosque Plein Écran pour TV et écrans tactiles.
- Gestion native des balises `<webview>` pour intégrer YouTube et Twitch en évitant les blocages `X-Frame-Options` et les popups parasites.
- Contournement automatique de la sécurité Google OAuth (`AutomationControlled`) pour permettre la connexion aux comptes Google.
- Empêchement de l'ouverture de nouvelles fenêtres externes : tous les contenus (films, séries, animes) restent **100% à l'intérieur de l'application Movix**.

### 2. Barre de Navigation Tactile Flottante (`MovixFloatingDock.tsx`)
Positionnée en bas au centre de l'écran, elle permet à tout moment de :
- 🔴 **MOVIX HUB** : Logo réductible.
- ⬅️ **Retour** : Revenir d'une page en arrière dans l'historique ou débloquer une page web.
- 🏠 **Accueil Movix** : Revenir instantanément au menu principal.
- 📺 **TV en direct** : Accéder aux flux en direct (FCTV33, Bolaloca, France TV).
- 🎬 **Films & Séries** : Explorer le catalogue de streaming.
- 🔄 **Rafraîchir** : Recharger la page en cours en 1 tap.
- ⚙️ **Réglages** : Configurer les tuiles kiosque et les profils.

### 3. Proxies Embed & Serveurs Backend (`API/Mainapi` & `API/proxiesembed`)
- **Port 25565 (Node.js Main API)** : Gère l'authentification, les recherches TMDB, les profils et le proxy inverse `/api/yt-proxy/`.
- **Port 25569 (Python Referer Proxy)** : Décode et contourne les restrictions d'origine pour les flux en direct (ex: DaddyLive / DLHD).

---

## 🚀 Comment Lancer l'Application ?

### En Mode Application Desktop Autonome (.exe) (Recommandé) :
Double-cliquez directement sur le lanceur créé sur votre Bureau :
📄 **`Lancer_Movix.bat`** (ou ouvrez `d:\Users\Maison\Desktop\Movix_Executable\Movix TV Hub.exe`).

### En Mode Développement Electron :
Double-cliquez sur `Movix_Electron.bat` sur votre Bureau ou exécutez `start-electron.bat`.

### En Mode Web classique :
Ouvrez votre navigateur sur `http://localhost:3000`.
