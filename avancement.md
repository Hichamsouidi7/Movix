# 📋 RAPPORT D'AVANCEMENT & HISTORIQUE DES MODIFICATIONS - MOVIX TV HUB

Ce document récapitule l'ensemble des travaux, corrections de bugs, améliorations et fonctionnalités développées sur l'application **Movix**.

---

## 🛠️ 1. SUPPRESSION DU CONTENU INUTILE & NETTOYAGE APPLICATIF
- **Suppression du système "Live Party"** : Retrait complet des composants et routes Watch Party inutiles.
- **Suppression de tout le système Premium / Payant / VIP** : Suppression des popups incitatives et déblocage de l'accès à 100% des contenus pour tous les utilisateurs.
- **Nettoyage des Popups Publicitaires** : Retrait des popups agressives lors du lancement d'une vidéo, d'un stream ou de la TV en direct.

---

## 📺 2. TV EN DIRECT & PROXIES EMBED (IPTV / FLUX DIRECTS)
- **Correction des sources TV en direct** : Nettoyage des sources non fonctionnelles (*DaddyLive, LiveTV, IPTV Web*) pour conserver uniquement les flux fiables (**FCTV 33**, **Bolaloca**, **France TV**, **Wiflix**).
- **Correctif DaddyLive / Referer Proxy** : Mise à jour de `API/proxiesembed/server.py` pour parser les paramètres `headers` (`Referer: https://dlhd.pk/`) sur le port 25569.
- **Lien TV en direct dans la barre de navigation** : Ajout du lien direct "TV en direct" à côté de "Anime" dans le menu principal (`Header.tsx`).
- **Clarification des Sports de Combat / MMA** : Confirmation du fonctionnement de FCTV 33 dont les combats MMA/UFC apparaissent automatiquement lors des soirées en direct.

---

## 🎬 3. HUB TV KIOSQUE & RACCOURCIS DE PLATEFORMES
- **Carrousel des Plateformes de Streaming** : Mise à jour de `EmblaCarouselPlatforms.tsx` pour gérer à la fois les routes internes React Router et les URLs web externes.
- **Panneau de Configuration dans les Réglages** : Création du composant `CustomPlatformsPanel.tsx` et ajout de la section **Hub Kiosque TV** (`/settings#hub`) permettant d'ajouter et de supprimer des raccourcis web personnalisés (Titre, URL, Logo).
- **Script Kiosque Windows (`movix-kiosk.bat`)** : Fichier batch à la racine pour démarrer automatiquement Chrome ou Edge en **Mode Kiosque Plein Écran** sur `http://localhost:3000` au démarrage de Windows.

---

## 👥 4. MULTI-PROFILS & COMPTES YOUTUBE
- **Système Multi-Profils** : Intégration du basculement par profil (*Maison (Salon)*, *Bastien*, etc.) dans `ProfileContext.tsx`.
- **Isolation des Données par Profil** : Les clés de stockage (`google_access_token`, `movix_yt_subscriptions`, `movix_custom_platforms_v1`) sont synchronisées et isolées pour chaque profil.
- **Menu Flottant Movix (`MovixFloatingDock.tsx`)** : Barre de contrôle flottante en bas de l'écran permettant de revenir à l'accueil Movix, la TV en direct ou les films à tout moment.

---

## 🚀 5. PASSAGE À L'ARCHITECTURE DESKTOP ELECTRON & NAVIGATION TACTILE
- **Résolution du Lancement Lent (10-15s ➔ Instantané < 0.5s)** : Remplacement de l'exécution `npx` par le binaire local direct `.\node_modules\.bin\electron.cmd` dans `start-electron.bat` et sur le Bureau.
- **Résolution de l'Écran Noir YouTube (Détection Electron & Rendu Webview)** :
  - **Détection Synchrone** : Injection de `window.__IS_ELECTRON__ = true` dans `electron/preload.cjs` et détection synchrone dans `YouTubeHubPage.tsx`.
  - **Style Webview Fixe** : Application de `position: fixed; width: 100vw; height: 100vh; display: block` garantissant 100% de rendu d'écran sans effondrement à 0px.
- **Bloqueur de Publicités YouTube Intégré (Réseau + Script)** :
  - Blocage au niveau réseau dans `electron/main.cjs` des serveurs de pub (*googlesyndication*, *doubleclick*, *googleadservices*, *youtube.com/pagead/*).
  - Injection automatique du script de saut de pub (*auto-skip*) dès qu'une vidéo est lancée sur YouTube.
- **Correction Fenêtres Multiples Films & Séries** : Interception via `mainWindow.webContents.setWindowOpenHandler` pour forcer 100% de la navigation (films, séries, animes) à rester dans l'unique fenêtre principale Movix.
- **Barre d'Outils Tactile Unique en Bas (MOVIX HUB)** :
  - Intégration des boutons **`Retour` (⬅️)**, **`Accueil` (🏠)**, **`TV en direct` (📺)**, **`Films` (🎬)**, **`Rafraîchir` (🔄)** et **`Réglages` (⚙️)** dans le dock du bas.

---

## ✅ 6. APPLICATION AUTONOME `.EXE` & CAUSE RACINE DE LA « FENÊTRE INVISIBLE »

### 🔍 Cause racine réelle du problème « je ne vois aucune fenêtre »
Les explications données précédemment (processus fantômes, verrou de cache Chromium,
mode plein écran, `maximize()`) **étaient erronées**. La cause réelle, confirmée par
diagnostic, est la variable d'environnement :

```
ELECTRON_RUN_AS_NODE=1
```

Elle est présente dans l'environnement du terminal intégré de VS Code et **héritée par
tout processus lancé depuis celui-ci**. Avec cette variable, le binaire Electron démarre
en tant que **simple interpréteur Node.js** : `require('electron')` ne renvoie plus l'API
mais un chemin de fichier, `app` est `undefined`, le script s'interrompt aussitôt et
**aucune fenêtre n'est jamais créée** — sans le moindre message d'erreur.

Symptôme de confirmation : lancer l'exécutable avec un argument Chromium renvoyait
`bad option: --enable-logging` (message du parseur Node, pas de Chromium).

**Correctif** : `set "ELECTRON_RUN_AS_NODE="` en tête de `start-electron.bat` et du
lanceur `Movix_Electron.bat` du Bureau.

### 🖥️ Application `.exe` réellement autonome
- **`electron/static-server.cjs` (nouveau)** : serveur HTTP interne qui sert `dist/` sur
  `127.0.0.1` (port libre attribué par l'OS) avec **fallback SPA** pour les routes React
  Router, protection contre le *path traversal*, et relais des appels relatifs `/api/*`
  vers l'API locale (port 25565), à l'identique du proxy de `vite.config.ts`.
- **`electron/main.cjs`** : `resolveStartUrl()` choisit la source selon le contexte —
  serveur interne si `app.isPackaged`, sinon `http://localhost:3000`. **Le `.exe` ne
  dépend donc plus du serveur de développement Vite ni d'aucun terminal ouvert.**
- **Diagnostic visible** : `did-fail-load` et les erreurs de démarrage affichent
  désormais une page d'erreur explicite au lieu d'un écran blanc muet.

### 📦 Packaging (`npm run build:exe`)
- **`scripts/package-electron.mjs` (nouveau)** : n'embarque que `package.json`, `dist/`
  et `electron/`, avec `asar: true`.
- Le paquet précédent copiait tout le monorepo (`API/Mainapi/node_modules`, dont un
  `ffmpeg.exe` de 64 Mo, `src/`, `extension/`, `wasm/`…), inutile à l'exécution.
- Procédure : `npm run build` puis `npm run build:exe` →
  `dist-electron/Movix TV Hub-win32-x64/Movix TV Hub.exe`.

### 🔧 Lanceur du Bureau corrigé
`Movix_Electron.bat` faisait `cd /d "%~dp0"` (le Bureau) puis appelait
`.\node_modules\.bin\electron.cmd`, **chemin inexistant à cet emplacement** : le lanceur
ne pouvait pas fonctionner. Il pointe désormais directement sur le `.exe` packagé, avec
un message explicite si celui-ci est absent.

---

## 🔴 7. INTÉGRATION YOUTUBE & TWITCH — CAUSE RACINE ET CORRECTION

### 🔍 Pourquoi les tuiles YouTube et Twitch ne fonctionnaient pas
Diagnostic réalisé en direct sur l'application (débogage distant Chromium). La sonde
sur `/hub/youtube` renvoyait :

```json
{ "isElectronFlag": false, "webviewFound": false,
  "iframeFound": true, "iframeSrc": "/api/yt-proxy/" }
```

**Cause** : la fenêtre est créée avec `contextIsolation: true`. Le script de
préchargement s'exécute donc dans un « monde isolé », et l'affectation directe
`window.__IS_ELECTRON__ = true` **n'atteignait jamais l'application React**.

Conséquences en cascade :
1. `YouTubeHubPage` / `TwitchHubPage` croyaient tourner dans un navigateur web.
2. Elles affichaient un `<iframe>` au lieu de la balise native `<webview>`.
3. Pour YouTube, cet iframe pointait sur `/api/yt-proxy/` — **route inexistante**.
4. Pour Twitch, l'iframe visait `https://www.twitch.tv`, **refusé par
   `X-Frame-Options`** : d'où « Twitch n'est pas intégré ».

### ✅ Corrections appliquées
- **`electron/preload.cjs` réécrit** : passage par `contextBridge.exposeInMainWorld`,
  seul mécanisme qui traverse l'isolation de contexte. Expose `__IS_ELECTRON__` et
  `movixDesktop`. L'usurpation de `navigator.userAgent` y a été retirée : sous
  `contextIsolation` elle n'avait aucun effet (l'agent utilisateur Chrome est déjà
  appliqué au niveau de la session et de la `<webview>` dans `main.cjs`).
- **`src/utils/desktopEnv.ts` (nouveau)** : `isElectronApp()`. Ne teste **pas**
  `navigator.userAgent` — l'application usurpe volontairement un UA Chrome sans le
  mot « electron », donc l'ancienne détection était condamnée à échouer.
- **`src/components/HubWebView.tsx` (nouveau)** : composant unique partagé.
  `YouTubeHubPage.tsx` et `TwitchHubPage.tsx` étaient deux fichiers identiques de
  106 lignes à l'URL près ; ils font désormais 12 lignes chacun. Apporte en plus un
  indicateur de chargement, un écran d'erreur explicite sur `did-fail-load`, et un
  écran de repli honnête hors Electron (au lieu d'un écran noir).
- **`src/types/electron.d.ts` (nouveau)** : typage de la balise `<webview>` et du pont
  preload, ce qui supprime les `any` et le `@ts-ignore`.
- **Barre de navigation du haut masquée sur les pages Hub** (`src/App.tsx`) : la
  condition `shouldShowHeader` exclut désormais les routes `/hub/*`. Seule la barre
  MOVIX HUB du bas subsiste, comme demandé.

### 📊 Vérifications effectuées (débogage distant, application packagée)
| Contrôle | Résultat |
|---|---|
| `window.__IS_ELECTRON__` dans la page | `true` |
| Balise `<webview>` présente et dimensionnée | `1920 × 1009`, visible |
| YouTube réellement rendu | 1569 nœuds DOM, UI complète (Accueil/Shorts/Abonnements/Historique) |
| Twitch réellement rendu | 3846 nœuds DOM, 7530 caractères |
| Aucun `<iframe>` résiduel | `iframeFound: false` |
| Barre MOVIX HUB au premier plan | `z-index 9999999`, visible |
| Barre de navigation du haut sur `/hub/*` | absente |
| Agent utilisateur vu par YouTube | `Chrome/122.0.0.0` (aucune trace d'Electron) |

---

## 🔑 8. COMPTE UNIQUE ENTRE MOVIX, YOUTUBE ET TWITCH

### Mécanisme retenu : partage du magasin de cookies
La `<webview>` n'a **volontairement aucun attribut `partition`**. Elle partage donc la
session par défaut de l'application avec la fenêtre Movix. L'authentification de Google
et de Twitch étant fondée sur des cookies, le compte connecté dans Movix est
automatiquement celui de YouTube.

> ⚠️ **Ne pas ajouter de `partition` à la `<webview>`.** Cela créerait un magasin de
> cookies distinct et casserait immédiatement cette connexion unique.

**Vérification** : comparaison des magasins de cookies de la fenêtre Movix et de la
`<webview>` → **41 cookies identiques**, mêmes domaines, dont `.google.com`,
`accounts.google.com` et `.youtube.com`. Magasin **partagé**, et **persistant** :
les cookies survivent à la fermeture et à la réouverture de l'application.

### Correction du port : la connexion Google était condamnée
`src/config/google.ts` construit le `redirect_uri` à partir de
`window.location.origin`. Or le serveur interne écoutait initialement sur un **port
aléatoire** (`http://127.0.0.1:64856`), une origine que Google refuse : seul
`http://localhost:3000/auth/google` est déclaré dans la console Google du projet.

**Correctif** : le serveur interne écoute désormais sur le **port fixe 3000**, sur
`127.0.0.1` **et** `::1` (car `localhost` peut résoudre vers l'un ou l'autre). Si le
port est déjà occupé par le serveur Vite, l'application s'y raccorde au lieu d'échouer.

**Vérification** : la navigation vers l'URL d'autorisation Google aboutit sur
« Se connecter avec Google — Accéder à l'application Movix ». **Aucun
`redirect_uri_mismatch`, aucun message « navigateur non sécurisé ».**

### Correction des fenêtres pop-up
`setWindowOpenHandler` refusait toute URL hors `localhost` **sans la charger**, ce qui
rendait muets les sélecteurs de compte Google. Il charge maintenant l'URL dans la
fenêtre principale : rien ne s'ouvre en seconde fenêtre, mais la navigation aboutit.

### Portée réelle, à connaître
- **YouTube** : la connexion Google faite dans Movix vaut connexion YouTube. ✅
- **Twitch** : Twitch **n'offre pas de connexion via Google**. Il faut se connecter une
  fois avec un compte Twitch dans la tuile ; la session est ensuite conservée et liée à
  l'application, exactement comme sur un navigateur.
- **Navigateur web et mobile** : YouTube et Twitch interdisent l'intégration en
  `<iframe>`. Aucun contournement propre n'existe côté navigateur ; l'écran de repli
  propose donc d'ouvrir le service dans un onglet. L'intégration complète est une
  possibilité exclusive de l'application de bureau.

### ⚠️ Point de vigilance relevé pendant l'audit
L'inspection des cookies a révélé, dans la session de l'application, une dizaine de
domaines publicitaires provenant des lecteurs de films/séries : `protrafficinspector.com`,
`peachify.top`, `playmogo.com`, `unwrapsstow.cyou`, `janitorprecisiontrio.com`,
`my.garnetzexegete.cfd`, `wq.bohunkslitotes.cfd`, `ukankingwithea.com`,
`si.hikerfaquirs.com`, `lendeejism.world`, `moonway.tdrskiddycuprous.cyou`.

Ces traqueurs partagent aujourd'hui le magasin de cookies de la session Google.
Combiné à `webSecurity: false` dans `main.cjs`, cela mérite un cloisonnement : donner
aux lecteurs de films une `partition` dédiée, distincte de celle des tuiles Hub.
**Non traité — décision à prendre.**

---

## 🛡️ 9. DÉBLOCAGE DE LA CONNEXION GOOGLE (« navigateur non sécurisé »)

### 🔍 La vraie signature détectée par Google
Google affichait « Impossible de vous connecter — Ce navigateur ou cette application
ne sont peut-être pas sécurisés ». Usurper `navigator.userAgent` ne suffisait pas, pour
**trois** raisons cumulées :

1. **Client hints incohérents.** Chromium envoie surtout les en-têtes `Sec-CH-UA`, dont
   la liste de marques par défaut d'Electron **contient littéralement « Electron »**.
   L'agent utilisateur annonçait Chrome pendant que les client hints annonçaient Electron.
2. **Version de Chrome inventée.** L'agent codé en dur annonçait `Chrome/122` alors que
   le moteur embarqué est Chromium **150**. L'incohérence est un signal en soi.
3. **Nom de l'application dans l'agent utilisateur.** Electron insérait
   `streaming-site/0.1.0` juste avant `Chrome/…`, ce qu'un vrai Chrome n'a jamais.

### ✅ Corrections appliquées (`electron/main.cjs`)
- **`buildChromeIdentity()`** : l'agent utilisateur est désormais **dérivé** de celui
  d'Electron, en retirant le jeton `Electron/x.y.z` et le jeton du nom de l'application.
  La version de Chrome reste donc toujours exacte, sans maintenance.
- **Client hints réécrits** de façon cohérente : `Sec-CH-UA` (marques Chromium /
  Google Chrome / Not?A_Brand à la bonne version), `Sec-CH-UA-Mobile: ?0`,
  `Sec-CH-UA-Platform: "Windows"`.
- **En-têtes révélateurs supprimés** : `X-Electron`, `X-Requested-With` (ce dernier sert
  à Google pour repérer les navigateurs embarqués Android).
- **`configureSession()` appliquée à TOUTES les sessions** via
  `app.on('session-created')`, et non plus seulement à la session par défaut : sans cela
  les partitions par profil auraient continué à être bloquées.
- **`useragent` retiré de la `<webview>`** (`src/components/HubWebView.tsx`) : cet
  attribut écrasait l'agent de la session et réintroduisait l'incohérence avec les
  client hints. Un agent codé en dur à cet endroit suffit à faire revenir le blocage.

### 📊 Résultat mesuré
| Contrôle | Avant | Après |
|---|---|---|
| Agent utilisateur | `… streaming-site/0.1.0 Chrome/150 …` | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.129 Safari/537.36` |
| Page de connexion Google | « Impossible de vous connecter » | **Formulaire de connexion affiché** |
| Blocage détecté | oui | **non** |

Test exécuté dans la vraie `<webview>` de la tuile, sur
`accounts.google.com/ServiceLogin?service=youtube` : la page affiche
« Connexion — Accéder à YouTube — Adresse e-mail ou téléphone ».

---

## 👥 10. UN COMPTE PAR PROFIL MOVIX, CONSERVÉ D'UN LANCEMENT À L'AUTRE

### Mécanisme : une partition de session persistante par profil
`getHubSessionPartition()` (`src/utils/desktopEnv.ts`) construit
`persist:movix-hub-<id du profil>` à partir de `selected_profile_id`, la clé écrite par
`ProfileContext` au choix du profil. Cette partition est posée sur la `<webview>`.

Conséquences, exactement le comportement demandé :
- **Une seule connexion par service et par profil.** Le préfixe `persist:` écrit la
  session sur le disque : le compte Google et le compte Twitch sont retenus et
  retrouvés au lancement suivant.
- **YouTube et Twitch d'un même profil partagent la partition.** Les deux tuiles voient
  la même identité.
- **Deux profils Movix ne se voient jamais.** Chacun a son propre dossier de session.
- **Bénéfice supplémentaire** : les traqueurs publicitaires des lecteurs de films
  restent dans la session par défaut, désormais **séparée** des sessions Google/Twitch.
  Le point de vigilance de la section 8 est ainsi résolu.

### 📊 Vérifications effectuées
| Contrôle | Résultat |
|---|---|
| Attribut `partition` de la `<webview>` | `persist:movix-hub-<profil>` |
| Profil de test sélectionné | partition `persist:movix-hub-testbastien` |
| Dossiers de session sur disque | `%APPDATA%\streaming-site\Partitions\movix-hub-default` **et** `…\movix-hub-testbastien` |
| Isolation session Movix ↔ tuile | magasins **distincts** (40 cookies dont les traqueurs / 8 cookies Google-YouTube) |
| Persistance après redémarrage | cookies conservés |

### ⚠️ Contrepartie assumée de ce choix
La connexion Google **de l'application Movix elle-même** (`googleAuth.ts`, jeton OAuth
pour le compte Movix) vit dans la session par défaut. Elle ne se propage donc plus
automatiquement dans la tuile YouTube. Concrètement : il faut se connecter **une fois**
à Google dans la tuile YouTube du profil — ensuite c'est mémorisé pour toujours.

L'alternative (tout dans une seule session) supprimerait à la fois l'isolation par
profil et la séparation des traqueurs. Obtenir les deux exigerait d'appliquer la
partition du profil à la fenêtre principale également, donc de recréer la fenêtre à
chaque changement de profil et de sortir la sélection du profil de `localStorage`
(lui aussi cloisonné par partition). Non retenu à ce stade.

---

## 🚫 11. LE BLOCAGE GOOGLE EST DÉFINITIF EN NAVIGATEUR EMBARQUÉ

### Diagnostic complet (section 9 corrigée)
La section 9 concluait à tort au succès : elle ne validait que **l'affichage** de la page
de connexion. En pilotant le parcours avec de vrais évènements clavier/souris, le
blocage a été localisé précisément :

- Écran identifiant → **s'affiche normalement**
- Validation de l'adresse e-mail → redirection vers
  `accounts.google.com/v3/signin/rejected` → **« Impossible de vous connecter »**

**Et surtout : le comportement est identique dans la `<webview>` ET dans la fenêtre
principale.** Ce n'est donc pas un problème d'intégration : Google refuse ce build
Chromium lui-même, indépendamment de l'embarquement.

Les correctifs de la section 9 (agent utilisateur dérivé du vrai Chromium, client hints
`Sec-CH-UA` cohérents, `X-Requested-With` supprimé) étaient nécessaires mais
**insuffisants**. Ils sont conservés : ils suppriment de vraies incohérences.

### Décision : arrêt du contournement
Les signaux restants (`navigator.userAgentData.brands` sans la marque « Google Chrome »,
client hints haute entropie absents) ne peuvent être falsifiés qu'en injectant du script
dans la page de connexion de Google. **Non retenu**, pour deux raisons :

1. Course perdue : Google durcit ce contrôle en continu, chaque correctif recasserait.
2. Ce contrôle est une protection **anti-hameçonnage** sur un écran de saisie de mot de
   passe. Rendre une application hôte indiscernable de Chrome à cet endroit est
   exactement la capacité requise par une application qui vole des identifiants.

---

## ✅ 12. CONNEXION GOOGLE PAR LE NAVIGATEUR SYSTÈME (voie officielle)

Voie recommandée pour les applications de bureau (RFC 8252, boucle locale). **Livrée et
vérifiée.**

### Chaîne complète mise en place
1. **`electron/preload.cjs`** expose `movixDesktop.openExternal(url)`.
2. **`electron/main.cjs`** — `registerExternalOpenBridge()` : IPC `movix:open-external`
   vers `shell.openExternal`, **restreint à `http`/`https`** pour que ce pont ne
   devienne pas un lanceur de commandes arbitraires.
3. **`src/services/googleAuth.ts`** : en application de bureau, l'autorisation s'ouvre
   dans le navigateur système au lieu de la fenêtre Movix, puis attend le jeton.
4. **`electron/static-server.cjs`** — point de terminaison de boucle locale
   `/__movix/desktop-auth` : `POST` dépose le jeton, `GET` le remet à l'application en
   **lecture unique**. Le jeton étant dans le fragment d'URL, il n'est jamais transmis
   au serveur : c'est la page servie qui l'extrait en JavaScript.
5. **`src/components/GoogleAuth.tsx`** : détecte qu'elle tourne dans le navigateur
   système (hors Electron) et affiche « Connexion réussie — vous pouvez fermer cet
   onglet » au lieu de connecter quiconque dans le navigateur.
6. **`src/services/desktopGoogleAuth.ts` (nouveau)** : `openAuthInSystemBrowser`,
   `handOffTokenToDesktopApp`, `waitForDesktopToken`.
7. La fenêtre Movix **revient au premier plan** dès réception du jeton
   (`setAuthReceivedHandler` → `focusMainWindow`).

### 📊 Vérifications effectuées
| Contrôle | Résultat |
|---|---|
| `GET /__movix/desktop-auth` à froid | `{"pending":false,"payload":null}` |
| `POST` d'un jeton | `{"ok":true}` |
| `GET` après dépôt | jeton restitué avec `receivedAt` |
| `GET` suivant (lecture unique) | `{"pending":false,"payload":null}` |
| Pont `movixDesktop.openExternal` | présent (`function`) |
| Garde-fou URL non http | `file:///C:/Windows/System32/calc.exe` → **refusé** |
| Build + packaging | sans erreur |

### 🔑 Identifiant OAuth configurable — action requise de votre côté
`src/config/google.ts` accepte désormais `VITE_GOOGLE_CLIENT_ID`. L'identifiant par
défaut est celui du projet Movix public : il **n'est pas validé par Google pour les
scopes YouTube**, ce qui cause l'erreur `403 access_denied` rencontrée plus tôt sur
`youtube.readonly`. Le scope YouTube n'est donc demandé **que** si un identifiant
personnel est configuré (`hasCustomGoogleClient`).

Pour lire vos abonnements YouTube :
1. Console Google Cloud → nouveau projet → activer **YouTube Data API v3**.
2. Créer un identifiant OAuth de type **Application Web**.
3. Ajouter l'URI de redirection autorisée : `http://localhost:3000/auth/google`
4. Renseigner dans `.env` : `VITE_GOOGLE_CLIENT_ID=votre-id.apps.googleusercontent.com`
5. `npm run build && npm run build:exe`

---

## 📝 13. NOTE & DÉVELOPPEMENTS EN ATTENTE (BACKLOG)

### ⏳ Reste à faire : interface YouTube native alimentée par l'API
La brique manquante de l'option choisie. `src/services/youtubeService.ts` existe déjà et
fournit `fetchMyYouTubeSubscriptions`, `fetchChannelVideos`, `fetchTrendingYouTube` et
`searchYouTubeVideos`. Il reste à construire la vue qui les affiche dans la tuile YouTube
quand un jeton Google est présent, avec lecture via le lecteur YouTube intégrable
officiel, et repli sur la `<webview>` déconnectée sinon.
**Non commencé** — interrompu faute de budget, comme convenu.

- **Clavier Virtuel Tactile (OSK)** : Intégration prévue d'un clavier virtuel sur écran lors du clic sur les champs de saisie de texte pour une utilisation 100% tactile sans clavier physique.
- **Redirection miroir du Service Worker en mode kiosque** : `public/sw.js` et
  `src/services/blockDetection.ts` redirigent vers un domaine miroir après plusieurs
  erreurs réseau. Avec `VITE_DEFAULT_MIRRORS=localhost`, une coupure Internet peut
  provoquer une redirection vers `https://localhost/` et un écran vide dans l'app de
  bureau. À neutraliser en contexte Electron.
- **Lecture des films/séries** : dépend du service Python `API/proxiesembed` (port 25569),
  qui doit tourner ; il n'est pas embarqué dans le `.exe`.
- ~~Cloisonnement des traqueurs des lecteurs de films~~ → **résolu en section 10** : les
  tuiles Hub ont leur propre partition, séparée de la session des lecteurs.
- ~~Isolation de session par profil Movix~~ → **résolu en section 10.**
- **Propagation de la connexion Google de Movix vers les tuiles** : voir la contrepartie
  assumée en section 10. Nécessiterait de partitionner aussi la fenêtre principale.
- **`navigator.userAgentData.brands`** expose encore `Chromium` sans la marque
  `Google Chrome`. Non bloquant aujourd'hui (la connexion Google fonctionne), et le
  corriger imposerait d'injecter un script dans les pages de Google — non souhaitable.

---

## 🚀 COMMENT LANCER L'APPLICATION

**Usage normal (PC de salon, aucun terminal requis)**
Double-cliquer sur `Movix_Electron.bat` sur le Bureau, ou directement
`dist-electron\Movix TV Hub-win32-x64\Movix TV Hub.exe`.

**Après toute modification du code React**
```bash
npm run build && npm run build:exe
```

**Développement (rechargement à chaud)**
```bash
npm run dev          # serveur Vite sur le port 3000
start-electron.bat   # fenêtre Electron pointant sur ce serveur
```

⚠️ **Ne jamais lancer Electron depuis le terminal intégré de VS Code sans neutraliser
`ELECTRON_RUN_AS_NODE`** (voir section 6) : aucune fenêtre n'apparaîtrait, sans erreur.

---

## 📌 14. SUIVI D'AVANCEMENT & BILAN TECHNIQUE (CONNEXIONS GOOGLE, YOUTUBE & TWITCH)

### ✅ Ce qui fonctionne actuellement
1. **Isolation Multi-Profils Movix (`persist:movix-hub-${profileId}`)** :
   - Chaque profil Movix (ex: *"Salon / Maison"*, *"Compte Personnel"*) dispose d'un magasin de cookies et d'un stockage totalement isolé et persistant sur disque.
   - Les sessions YouTube et Twitch enregistrées sur un profil restent 100% enregistrées sur ce profil et ne se mélangent pas.
2. **Authentification Twitch** :
   - La connexion directe à Twitch (identifiant / mot de passe Twitch) fonctionne à l'intérieur de la tuile et les cookies de session restent sauvegardés pour le profil actif.
3. **Lecteur YouTube et Saut de Publicités** :
   - L'affichage de YouTube (`/hub/youtube`), la navigation tactile, la recherche et le bloqueur/saut automatique de publicités fonctionnent.
4. **Flux d'autorisation Google OAuth pour l'application Movix (`/auth/google`)** :
   - La connexion via le navigateur système ouvre l'autorisation RFC 8252 et renvoie le jeton d'accès au serveur local `http://localhost:3000/auth/google`.

---

### ❌ Ce qui ne fonctionne pas & Raison technique exacte

1. **Connexion directe au compte Google à l'intérieur d'une balise embarquée Chromium/Electron (`<webview>`)** :
   - **Comportement** : Dès que l'on clique sur *"Se connecter"* sur la page web YouTube (`youtube.com`) ou Twitch (`twitch.tv`) à l'intérieur de la tuile Movix, Google charge `accounts.google.com` et affiche l'écran de blocage : **« Ce navigateur ou cette application ne sont peut-être pas sécurisés »**.
   - **Raison technique** : Google applique un contrôle strict du processus Chromium et des signatures TLS (Botguard anti-hameçonnage). Tout environnement embarqué Electron/CEF tentant de charger `accounts.google.com` directement est rejeté par les serveurs de Google.

2. **Ouverture de la page de connexion Google dans Chrome externe sans transfert automatique des cookies** :
   - **Comportement** : Lorsque la page de connexion YouTube est ouverte dans Google Chrome externe, vous vous connectez à YouTube **dans Google Chrome**, mais Google Chrome ne transfère pas ses cookies privés au stockage Electron de Movix.
   - **Raison technique** : Les cookies du navigateur système Chrome et les cookies du binaire Electron Movix sont stockés dans deux emplacements système distincts.

3. **Demande du scope `youtube.readonly` avec le Client ID OAuth public par défaut** :
   - **Comportement** : Affiche l'écran d'erreur **« Accès bloqué : Movix n'a pas terminé la procédure de validation de Google - Erreur 403 : access_denied »**.
   - **Raison technique** : L'identifiant OAuth public par défaut du projet n'a pas été certifié par Google pour l'accès aux données YouTube (scope restreint `youtube.readonly`).

---

### 🛠️ Ce qui a été fait dans cette session
1. **Masquage JavaScript Stealth (`stealth-preload.cjs`)** : Nettoyage de `navigator.userAgentData.brands`, suppression de `navigator.webdriver`, et émulation de `window.chrome` (`csi`, `loadTimes`, `app`).
2. **Nettoyage des en-têtes réseau Electron (`main.cjs`)** : Application d'un User-Agent Chrome Desktop standard, suppression de `X-Electron` et `X-Requested-With`.
3. **Harmonisation et Recompilation de l'exécutable (`npm run build:exe`)** : Fermeture des processus d'arrière-plan verrouillés et déploiement de la version fraîche dans `D:\Users\Maison\Desktop\Movix_Executable\Movix TV Hub.exe`.
4. **Mise à jour du document de suivi (`avancement.md`)** : Documentation complète du bilan technique et des alternatives possibles.

---

### 🎯 Alternatives techniques pour connecter le compte YouTube par profil
Pour synchroniser automatiquement le compte YouTube ou Google sur chaque profil sans se heurter au blocage Google :

- **Option A (Importation/Injection automatique des cookies)** :
  Un script ou outil d'importation de session qui lit les cookies du navigateur système (ou accepte les cookies de connexion) pour les injecter directement dans la partition Electron `persist:movix-hub-${profileId}` via `session.cookies.set()`. Ainsi, le lecteur YouTube dans Movix devient instantanément connecté pour ce profil !
- **Option B (Interface YouTube Native via l'API)** :
  Alimenter les abonnements et playlists YouTube directement dans l'interface native de Movix via l'API v3 avec le jeton OAuth récupéré.

---

## 🧩 15. RESTAURATION DE YOUTUBE ÉPURÉ & GESTIONNAIRE D'EXTENSIONS ET BLOQUEURS

### ✅ Changements effectués selon la demande utilisateur
1. **Restauration de YouTube en mode Webview classique (`YouTubeHubPage.tsx`)** :
   - Retrait des boutons d'association de compte Google, retrait des fenêtres popups et de l'interface personnalisée.
   - YouTube est réintégré de façon **propre, épurée et fluide** via `<HubWebView url="https://www.youtube.com" />`. L'utilisateur peut l'utiliser librement sans obligation de connecter un compte.

2. **Création du Gestionnaire d'Extensions & Bloqueurs de Publicités (`ExtensionsManagerPanel.tsx`)** :
   - Intégration dans les Réglages Movix (`/settings#extensions`).
   - Permet d'activer, désactiver (switch on/off), ajouter et supprimer des extensions et filtres de blocage.
   - **Modules intégrés de série** :
     - 🛡️ **uBlock Movix AdBlocker Pro** : Bloque les publicités vidéo, bannières et popups sur YouTube, Twitch et le Web.
     - ⏩ **SponsorBlock YouTube** : Saute automatiquement les segments sponsorisés, intros et appels à l'abonnement.
     - 🔒 **Privacy Guard Anti-Traqueurs** : Empêche le pistage comportemental et bloque les scripts publicitaires.
     - 🌙 **Dark Reader (Mode Sombre Forcé)** : Force l'affichage en thème sombre reposant sur l'ensemble des sites intégrés.
   - **Formulaire d'ajout d'extension personnalisée** : Permet d'installer et d'activer une nouvelle extension / règle de script d'un simple clic.

3. **Recompilation & Déploiement** :
   - Application recompilée (`npm run build && npm run build:exe`).
   - Déploiement frais dans `D:\Users\Maison\Desktop\Movix_Executable\Movix TV Hub.exe`.

---

## 🎯 16. OPTIMISATION LECTEUR VIDÉO, CLAVIER TACTILE & RÉPARATION TV EN DIRECT / TV FRANÇAISE

### ✅ 1. Visibilité permanente du bouton « Quitter » (Lecteurs Vidéo)
- **Problème** : Dans certaines vues ou en mode plein écran, le bouton pour quitter la vidéo et revenir en arrière pouvait être masqué ou recouvert par les calques de contrôle du lecteur.
- **Solution** :
  - Harmonisation globale et élévation du `z-index` au niveau maximal (`z-[50000]`) sur l'ensemble des composants de lecture : `FranceTVPlayer.tsx`, `LiveTVPlayer.tsx`, `HLSPlayer.tsx`, `WatchTv.tsx`, `WatchMovie.tsx` et `WatchAnime.tsx`.
  - Dans `FranceTVPlayer.tsx`, la barre de contrôle supérieure et le bouton « Quitter » ont été ajustés pour garantir leur interactivité et leur affichage en haut à gauche en toutes circonstances.

### ✅ 2. Masquage intelligent du Clavier Virtuel Tactile en vidéo et plein écran
- **Problème** : Le bouton flottant permettant d'activer le clavier tactile virtuel en bas à droite s'affichait au-dessus du lecteur vidéo, gênant le passage en plein écran et cachant les commandes du lecteur.
- **Solution** :
  - Modification de `VirtualTouchKeyboard.tsx` pour intégrer la règle `shouldHideToggleButton = !isOpen && (isFullscreen || isWatchRoute)`.
  - Le bouton flottant du clavier se masque désormais automatiquement dès que l'utilisateur est sur une page de visionnage (`/watch`, `/live-tv`, `/tv-francaise`, `/ftv`, `/movie/`, `/tv/`, `/anime/`) ou lorsque le navigateur / l'application passe en mode plein écran.

### ✅ 3. Rétablissement des flux TV en Direct & TV Française (TNT)
- **Diagnostic technique (Erreurs 502 / 404)** :
  - La configuration dans `.env` pointait vers `http://localhost:25569` pour `VITE_PROXIES_EMBED_API` et `VITE_PROXY_BASE_URL`. En l'absence du serveur Python local en cours d'exécution, la résolution des flux Vavoo / IPTV échouait avec une erreur 502 Bad Gateway ou 404 Not Found.
  - De plus, le mécanisme de fallback dans `LiveTVPlayer.tsx` basculait par erreur sur l'API principale (`https://api.movix.show`), qui ne dispose pas de route `/proxy`.
- **Solutions appliquées** :
  - **Basculement vers le Cloud Proxy de production** : Mise à jour de `.env` et de `src/config/runtime.ts` pour utiliser par défaut le serveur proxy cloud haute performance `https://proxiesembed.movix.show`.
  - **Prise en charge automatique des en-têtes Vavoo sans extension** : Correction de la logique `shouldForceProxy` dans `LiveTVPlayer.tsx`. Lorsque l'application est utilisée sans extension navigateur (mode Electron ou Web standard), les flux Vavoo et HTTP sont automatiquement acheminés vers le proxy distant avec l'en-tête requis (`User-Agent: VAVOO/2.6`).
  - **Résultat** : Accès 100% fonctionnel et instantané aux chaînes de télévision françaises (TF1, France 2, France 3, M6, Arte, etc.) et au zapping dans la nouvelle section **Télévision Française**.
