/**
 * Typages de l'environnement de bureau Electron (balise <webview> et pont preload).
 * Voir electron/preload.cjs et src/utils/desktopEnv.ts.
 */

/** Sous-ensemble de l'API <webview> Electron réellement utilisé par Movix. */
export interface ElectronWebView extends HTMLElement {
  src: string;
  canGoBack(): boolean;
  goBack(): void;
  reload(): void;
}

/** Détail de l'évènement `did-fail-load` d'une <webview>. */
export interface WebViewFailLoadEvent extends Event {
  errorCode: number;
  errorDescription: string;
  validatedURL?: string;
}

declare global {
  interface Window {
    /** Exposé par electron/preload.cjs via contextBridge. */
    __IS_ELECTRON__?: boolean;
    movixDesktop?: {
      isElectron: boolean;
      platform: string;
      /** Ouvre une URL dans le navigateur système (autorisation Google). */
      openExternal?: (url: string) => Promise<boolean>;
      /** Importe des cookies de session dans la partition d'un profil Movix. */
      importProfileCookies?: (data: { profileId: string; rawCookies: string }) => Promise<{ success: boolean; count: number }>;
    };
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        webview: React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            src?: string;
            useragent?: string;
            allowpopups?: string;
            partition?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}
