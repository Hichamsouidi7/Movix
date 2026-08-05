import { GOOGLE_CONFIG } from '../config/google';
import { clearPendingAuthAction, setPendingAuthAuthorize, setPendingAuthLink } from '../utils/accountAuth';
import {
  canUseSystemBrowserAuth,
  openAuthInSystemBrowser,
  waitForDesktopToken,
} from './desktopGoogleAuth';

interface GoogleLoginOptions {
  mode?: 'login' | 'link' | 'authorize';
  returnTo?: string;
  clientId?: string;
  /** Demande aussi l'accès en lecture à YouTube (abonnements, playlists). */
  withYouTube?: boolean;
  /** Notifie l'attente du retour du navigateur système (application de bureau). */
  onAwaitingBrowser?: () => void;
}

function buildAuthUrl(scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
    response_type: 'token',
    scope: scopes.join(' '),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export const googleAuth = {
  login: async (options: GoogleLoginOptions = {}) => {
    if (options.mode === 'link') {
      setPendingAuthLink('google', options.returnTo);
    } else if (options.mode === 'authorize') {
      setPendingAuthAuthorize(
        options.returnTo || `${window.location.pathname}${window.location.search}`,
        options.clientId
      );
    } else {
      clearPendingAuthAction();
    }

    const scopes = options.withYouTube ? GOOGLE_CONFIG.YOUTUBE_SCOPES : GOOGLE_CONFIG.SCOPES;
    const googleAuthUrl = buildAuthUrl(scopes);

    // Application de bureau : l'autorisation DOIT passer par le navigateur
    // système, Google refusant la connexion dans un navigateur embarqué.
    if (canUseSystemBrowserAuth()) {
      await openAuthInSystemBrowser(googleAuthUrl);
      options.onAwaitingBrowser?.();

      const payload = await waitForDesktopToken();
      if (!payload) return false;

      // On rejoue le retour d'autorisation habituel : la page /auth/google
      // traite le jeton présent dans le fragment.
      window.location.replace(
        `${GOOGLE_CONFIG.REDIRECT_URI}#access_token=${encodeURIComponent(payload.accessToken)}`
      );
      return true;
    }

    window.location.replace(googleAuthUrl);
    return true;
  },
};
