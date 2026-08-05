/**
 * Détection de l'application de bureau Electron.
 *
 * Le drapeau est exposé par electron/preload.cjs via `contextBridge`. On ne peut
 * PAS se reposer sur `navigator.userAgent` : l'application de bureau usurpe
 * volontairement un agent utilisateur Chrome (sans le mot « electron ») pour que
 * la connexion Google ne soit pas refusée.
 */
export function isElectronApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__IS_ELECTRON__ === true || window.movixDesktop?.isElectron === true;
}

/**
 * Partition de session persistante des tuiles Hub, propre au profil Movix actif.
 *
 * Ce nom est ce qui donne à chaque profil ses propres comptes :
 *  - YouTube et Twitch d'un même profil partagent la partition, donc une connexion
 *    suffit et elle est conservée d'un lancement à l'autre (`persist:`) ;
 *  - deux profils Movix ne voient jamais les comptes l'un de l'autre ;
 *  - la session par défaut (lecteurs de films et leurs traqueurs) reste à part.
 *
 * `selected_profile_id` est écrit par ProfileContext lors du choix du profil.
 */
export function getHubSessionPartition(): string {
  let profileId = 'default';
  try {
    profileId = window.localStorage.getItem('selected_profile_id') || 'default';
  } catch {
    // localStorage indisponible : on retombe sur la partition par défaut
  }
  // Un nom de partition doit rester un identifiant simple
  const safeId = profileId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
  return `persist:movix-hub-${safeId}`;
}
