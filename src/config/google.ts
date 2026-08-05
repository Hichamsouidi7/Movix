// Fonction pour obtenir l'URL de redirection de manière dynamique
const getRedirectUri = () => {
  // Utiliser le domaine actuel du site dans tous les cas
  // Tous les domaines sont maintenant configurés dans Google Cloud Console
  return `${window.location.origin}/auth/google`;
};

/**
 * Identifiant OAuth par défaut du projet Movix public.
 * Il n'est PAS validé par Google pour les scopes YouTube : demander
 * `youtube.readonly` avec cet identifiant renvoie une erreur 403 access_denied.
 * Pour lire vos abonnements YouTube, renseignez votre propre identifiant dans
 * `VITE_GOOGLE_CLIENT_ID` (voir README / avancement.md).
 */
const DEFAULT_CLIENT_ID = '803260771655-6uk6p477ec6im3th4qe9mh8emakes0ja.apps.googleusercontent.com';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

/** Vrai si un identifiant OAuth personnel est configuré (donc scopes YouTube possibles). */
export const hasCustomGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export const GOOGLE_CONFIG = {
  CLIENT_ID,

  get REDIRECT_URI() {
    return getRedirectUri();
  },
  SCOPES: ['email', 'profile'],

  /**
   * Scopes à demander pour le hub YouTube. Le scope YouTube n'est ajouté que si
   * un identifiant OAuth personnel est configuré, sinon Google refuse tout.
   */
  get YOUTUBE_SCOPES(): string[] {
    return hasCustomGoogleClient
      ? ['email', 'profile', YOUTUBE_READONLY_SCOPE]
      : ['email', 'profile'];
  },
};
