# 📋 AVANCEMENT — Bascule vers des comptes 100 % locaux

Session du **25 juillet 2026**. Ce document couvre le passage d'une
authentification serveur (Discord / Google / BIP39) à des **comptes stockés
dans l'application**, ainsi que la suppression des fonctionnalités qui
dépendaient du serveur.

Fichier séparé de `avancement.md` volontairement : ce dernier est le journal
cumulatif du projet, celui-ci ne couvre qu'un chantier.

---

## 🔒 0. FILET DE SÉCURITÉ — DÉPÔT GIT

Le projet **n'était pas sous gestion de version**. Avant toute suppression
définitive, un dépôt a été initialisé et l'état d'origine committé intact.

| Commit | Contenu |
|--------|---------|
| `c4718fd` | **État de départ**, avant toute modification (2391 fichiers) |
| `aaccba0` | Socle des comptes locaux + rebranchement de `ProfileContext` |
| `8ed8002` | Suppression des connexions distantes et des fonctionnalités serveur |
| `99c786c` | Paramètres : gestion des comptes locaux |
| `1940638` | Exclusion de `dist-electron` du suivi de version |

Tout est réversible : `git checkout c4718fd -- <chemin>` restaure n'importe quel
fichier dans son état d'origine.

---

## 🧱 1. SOCLE DES COMPTES LOCAUX

**Nouveau fichier : `src/utils/localAccounts.ts`**

Un compte n'est plus qu'une entrée du `localStorage`. Au premier lancement, un
compte **« Maison »** est créé et sélectionné automatiquement — on arrive
directement sur l'accueil, sans jamais rien demander.

Clés utilisées :

```
local_accounts_v1              → la liste des comptes
local_active_account_id        → le compte actuellement chargé
local_account_data_v1:<id>     → les préférences des comptes INACTIFS
```

### Cloisonnement des préférences — le point clé

Les préférences (favoris, progression, réglages…) sont des clés plates du
`localStorage`, lues telles quelles par des dizaines de pages. Plutôt que de
réécrire tous ces appels, **le compte actif reste à plat** et les autres comptes
sont rangés dans des blocs à part. Changer de compte revient à échanger deux
blocs.

Aucun code appelant n'a besoin de savoir qu'un système de comptes existe.

L'arbitre de « ce qui appartient à un compte » est `isSyncableStorageKey()` de
`src/utils/syncStorage.ts` — la liste qui servait déjà à décider quoi
synchroniser avec le serveur, donc exactement « les données d'un utilisateur ».

### `ProfileContext` réécrit

`src/context/ProfileContext.tsx` passe de 689 à ~140 lignes, adossé à
`localAccounts`. **L'API publique `useProfile()` est inchangée** : les 13
composants qui la consomment (pages Watch, MovieDetails, TVDetails,
ProfileMenu, ProfileSwitcher…) fonctionnent sans modification.

`isLoading` vaut désormais toujours `false` : il n'y a plus rien à attendre au
démarrage.

---

## 🗑️ 2. SUPPRESSIONS

**34 fichiers supprimés.**

### Connexions distantes
Discord, Google **et BIP39** (les trois, sur décision explicite) :
`DiscordAuth.tsx`, `GoogleAuth.tsx`, `LoginBip39.tsx`, `CreateAccount.tsx`,
`OAuthAuthorizePage.tsx`, `AccessCodeForm.tsx`.

### Fonctionnalités adossées au serveur
- **Commentaires** : `CommentsSection.tsx`, `AdminComments.tsx`
- **Notifications** : `NotificationsPopup.tsx`, `NotificationToast.tsx`,
  `AlertButton.tsx`, `AlertMenu.tsx`, `AlertsPage.tsx`
- **VIP** : 6 pages `Vip*.tsx`, `VipModal.tsx`, `VipModalContext.tsx`,
  `VipKeysManager.tsx`, `VipInvoicesManager.tsx`
- **Watch party** : 4 pages `WatchParty*.tsx` + 3 modales
- **Listes partagées** : `SharedListPage.tsx`, `SharedListsCatalogPage.tsx`,
  `AdminSharedLists.tsx`

### Fichiers survivants corrigés
`Header.tsx` (cloche + état d'authentification), `MovieDetails.tsx`,
`TVDetails.tsx`, `AdminDashboard.tsx` (4 onglets), `HLSPlayer.tsx` (bouton
watch party), `App.tsx`, `routing/registry.tsx`.

`ProfileMenu.tsx` a été **réécrit en sélecteur de comptes locaux** : c'est ce
qui supprime d'un coup les boutons de connexion, le VIP et la déconnexion.

`ProfileGate` devient un passe-plat : un compte local existe toujours, il n'y a
plus rien à garder.

---

## ⚙️ 3. PARAMÈTRES → COMPTES

**Nouveau fichier : `src/components/Settings/LocalAccountsPanel.tsx`**

Renommer, changer d'avatar, créer, basculer, supprimer. Le **dernier compte est
non supprimable** par construction — sinon on retomberait sur un écran de
sélection au démarrage.

Sections VIP et sessions retirées du sommaire ; l'ancienne section « comptes
liés » (Discord / Google) est remplacée par ce panneau.

### ⚠️ Piège rencontré

Le sommaire des Paramètres filtrait sur `isAuthenticated`, **désormais toujours
faux**. Les sections **Comptes, Confidentialité et Données étaient devenues
invisibles** — le panneau de comptes aurait été inatteignable. Corrigé : les 11
sections s'affichent.

---

## ✅ 4. VÉRIFICATIONS MESURÉES DANS L'APPLICATION

Pilotage de l'app packagée en CDP (`--remote-debugging-port=9333`).

| Vérification | Résultat |
|--------------|----------|
| Premier lancement, stockage vidé | Compte « Maison » créé seul, actif, arrivée directe sur l'accueil |
| Écran « Qui regarde ? » | Absent |
| Bouton Connexion / cloche notifications | Absents |
| `/vip`, `/watchparty/create`, `/login-bip39`, `/auth/google`, `/list-catalog`, `/alerts` | Les 6 tombent en 404 |
| Création d'un 2ᵉ compte (« Enfants ») | OK, bouton « Utiliser » proposé |
| Cloisonnement | Valeur posée sur Maison → invisible depuis Enfants → rangée dans le bloc de Maison → **retrouvée intacte au retour** |
| Erreurs console | 0 |

---

## 🔍 5. POINT SUR LE RENOMMAGE H-FLIX

Le renommage a été fait **par une autre IA**, avant cette session. Vérifié :
l'arbre de travail était propre à mon dernier commit, donc **aucune
divergence** — le renommage est bien inclus dans les commits ci-dessus.

Il est en revanche **partiel** :

| Déjà renommé | Encore « Movix » |
|--------------|------------------|
| `index.html` (meta `application-name`, description) | Titre de fenêtre : `electron/main.cjs:215` → `title: 'Movix TV Hub'` |
| `scripts/package-electron.mjs` → `appName = 'H-Flix'` | Favicon : `index.html` → `/movix.png` |
| Logo de l'en-tête : `Header.tsx:281` → `H-FLIX` | ~112 fichiers dans `src/` contiennent encore « Movix » |
| `VirtualTouchKeyboard.tsx:231` → « Clavier Tactile H-Flix » | Titres de pages (« Accueil - Movix ») |

### 🚨 À NE PAS RENOMMER SANS PRÉCAUTION

Deux identifiants techniques contiennent « movix » et **doivent rester
identiques des deux côtés**, sous peine de casser des fonctionnalités
silencieusement :

1. **Partition de session des webviews** — `persist:movix-hub-<id>`
   - `electron/main.cjs:150`
   - `src/utils/desktopEnv.ts:34`

   Les renommer séparément fait **perdre les sessions YouTube / Twitch** de tous
   les profils.

2. **Canaux IPC** — `movix:open-external`, `movix:import-profile-cookies`
   - `electron/main.cjs:136` et `144`
   - `electron/preload.cjs:71` et `72`

   Un décalage casse l'ouverture des liens externes et l'import de cookies,
   **sans erreur visible**.

---

## 📌 6. RESTE À FAIRE

- **Liens morts** vers `/vip` et `/watchparty` dans `DebridPage.tsx`,
  `FranceTV/FranceTVPlayer.tsx`, les pages `Greenlight/*` et plusieurs pages
  d'aide (`VipHelpPage.tsx`, `ListesPartageesPage.tsx`). Ils mènent au 404 —
  rien ne casse, mais c'est sale.
- **Modules orphelins** encore sur le disque, plus importés donc exclus du
  bundle : `services/discordAuth`, `services/googleAuth`, `services/commentService`,
  `services/apiNotificationService`, `services/alertService`, `utils/accountAuth`,
  `utils/vipUtils`, `hooks/useWatchParty`, moteur WASM de synchronisation.
- **API backend intacte** : elle expose toujours les routes profils,
  commentaires, VIP et watch party. Sans conséquence puisque l'application ne
  l'appelle plus.
- **Renommage à terminer** (voir §5), en respectant les deux exceptions.
- **Chaînes i18n** des fonctionnalités supprimées, toujours dans
  `src/i18n/locales/*.json`.
