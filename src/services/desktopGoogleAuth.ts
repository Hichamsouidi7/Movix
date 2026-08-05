/**
 * Connexion Google de l'application de bureau, via le navigateur système.
 *
 * Google refuse la connexion dans un navigateur embarqué : la page
 * « Impossible de vous connecter — ce navigateur ou cette application ne sont
 * peut-être pas sécurisés » apparaît à la validation de l'adresse e-mail, aussi
 * bien dans une <webview> que dans la fenêtre principale. Ce n'est pas
 * contournable proprement, et c'est une protection anti-hameçonnage volontaire.
 *
 * La voie officielle pour une application de bureau (RFC 8252) est donc :
 *   1. ouvrir l'autorisation dans le VRAI navigateur de l'utilisateur ;
 *   2. Google le redirige vers http://localhost:3000/auth/google#access_token=… ;
 *   3. cette page, servie par le serveur interne de Movix, dépose le jeton sur
 *      le point de terminaison de boucle locale ;
 *   4. l'application récupère le jeton et poursuit normalement.
 */

const HANDOFF_URL = '/__movix/desktop-auth';

export interface DesktopAuthPayload {
  accessToken: string;
  expiresIn?: string | null;
  state?: string | null;
}

interface HandoffResponse {
  pending: boolean;
  payload: (DesktopAuthPayload & { receivedAt: number }) | null;
}

/** Vrai si le pont vers le navigateur système est disponible. */
export function canUseSystemBrowserAuth(): boolean {
  return typeof window !== 'undefined' && typeof window.movixDesktop?.openExternal === 'function';
}

/** Ouvre l'URL d'autorisation Google dans le navigateur par défaut. */
export async function openAuthInSystemBrowser(authUrl: string): Promise<void> {
  if (!canUseSystemBrowserAuth()) {
    throw new Error("Le pont vers le navigateur système n'est pas disponible");
  }
  await window.movixDesktop!.openExternal!(authUrl);
}

/**
 * Dépose le jeton récupéré dans le navigateur système.
 * Appelé par la page /auth/google lorsqu'elle s'exécute hors de Movix.
 * Renvoie `false` si le point de terminaison n'existe pas (mode web classique).
 */
export async function handOffTokenToDesktopApp(payload: DesktopAuthPayload): Promise<boolean> {
  try {
    const response = await fetch(HANDOFF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Attend que le jeton revienne du navigateur système.
 * @param timeoutMs abandon au bout de ce délai (connexion abandonnée par l'utilisateur)
 */
export async function waitForDesktopToken(
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 1500
): Promise<DesktopAuthPayload | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(HANDOFF_URL, { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        const data: HandoffResponse = await response.json();
        if (data.pending && data.payload?.accessToken) {
          return data.payload;
        }
      }
    } catch {
      // Serveur interne momentanément indisponible : on retentera
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}
