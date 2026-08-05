import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import HubTopBar from './HubTopBar';
import { isElectronApp, getHubSessionPartition } from '../utils/desktopEnv';
import type { ElectronWebView, WebViewFailLoadEvent } from '../types/electron';

// Aucun attribut `useragent` n'est posé sur la <webview> : il écraserait l'agent
// utilisateur de la session, or celui-ci est dérivé du vrai Chromium embarqué et
// doit rester cohérent avec les client hints Sec-CH-UA (voir electron/main.cjs).
// Un agent codé en dur ici suffirait à faire réapparaître le blocage Google.

interface HubWebViewProps {
  /** URL du service à intégrer (ex: https://www.youtube.com). */
  url: string;
  /** Nom affiché du service (ex: « YouTube »). */
  serviceName: string;
  /** Couleur d'accentuation de l'écran de repli. */
  accentClass?: string;
}

/**
 * Intègre un site complet (YouTube, Twitch…) sans quitter Movix.
 *
 * Dans l'application de bureau, on utilise la balise native <webview>, seule
 * capable d'afficher ces sites : ils refusent l'intégration en <iframe> via
 * l'en-tête X-Frame-Options.
 *
 * La <webview> reçoit une partition persistante propre au profil Movix actif
 * (voir `getHubSessionPartition`). Toutes les tuiles d'un même profil la
 * partagent : une seule connexion Google ou Twitch suffit, elle est conservée
 * d'un lancement à l'autre, et deux profils Movix ne se voient jamais.
 */
export const HubWebView: React.FC<HubWebViewProps> = ({
  url,
  serviceName,
  accentClass = 'text-red-500',
}) => {
  const navigate = useNavigate();
  const webviewRef = useRef<ElectronWebView | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isElectron = isElectronApp();
  // Fixé au montage : changer de partition en cours de vie recréerait la webview
  const [partition] = useState(getHubSessionPartition);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Suivi du chargement de la <webview> pour cacher le spinner dès que le DOM est prêt
  useEffect(() => {
    const webview = webviewRef.current;
    if (!isElectron || !webview) return;

    const onStart = () => {
      setIsLoading(true);
      setLoadError(null);
    };

    const onDomReady = () => {
      setIsLoading(false);
    };

    const onStop = () => {
      setIsLoading(false);
    };

    const onFail = (event: Event) => {
      const e = event as WebViewFailLoadEvent;
      if (e.errorCode === -3) return;
      setIsLoading(false);
      setLoadError(`${e.errorDescription || 'Chargement impossible'} (code ${e.errorCode})`);
    };

    // Timeout de secours (max 1.5s) pour ne jamais bloquer l'écran avec le spinner
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    webview.addEventListener('did-start-loading', onStart);
    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-stop-loading', onStop);
    webview.addEventListener('did-fail-load', onFail);

    return () => {
      clearTimeout(timer);
      webview.removeEventListener('did-start-loading', onStart);
      webview.removeEventListener('dom-ready', onDomReady);
      webview.removeEventListener('did-stop-loading', onStop);
      webview.removeEventListener('did-fail-load', onFail);
    };
  }, [isElectron, reloadKey]);

  const handleGoBack = () => {
    const webview = webviewRef.current;
    if (isElectron && webview) {
      try {
        if (webview.canGoBack()) {
          webview.goBack();
          return;
        }
      } catch {
        // <webview> pas encore prête : on retombe sur la navigation Movix
      }
    }
    navigate('/');
  };

  const handleReload = () => {
    const webview = webviewRef.current;
    if (isElectron && webview) {
      try {
        webview.reload();
        return;
      } catch {
        // ignore : on force un remontage ci-dessous
      }
    }
    setReloadKey((prev) => prev + 1);
  };

  // Geste tactile : glisser du bord gauche vers la droite pour revenir en arrière
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

    if (touchStartX.current < 150 && deltaX > 80 && deltaY < 100) {
      handleGoBack();
    }
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black z-[9990] overflow-hidden select-none flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barre Movix en haut : logo, Retour, Accueil */}
      <HubTopBar onGoBack={handleGoBack} serviceName={serviceName} />

      {/* Le site intégré occupe tout l'espace restant sous la barre */}
      <div className="relative flex-1 min-h-0">
      {isElectron ? (
        <>
          {/* Balise native Electron, typée dans src/types/electron.d.ts */}
          <webview
            ref={webviewRef}
            key={reloadKey}
            src={url}
            partition={partition}
            allowpopups="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'flex',
              backgroundColor: '#000000',
            }}
          />

          {isLoading && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black pointer-events-none">
              <Loader2 className={`w-9 h-9 animate-spin ${accentClass}`} />
              <p className="text-sm text-gray-400">Chargement de {serviceName}…</p>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <h2 className="text-lg font-bold text-white">
                {serviceName} n'a pas pu être chargé
              </h2>
              <p className="max-w-md text-sm text-gray-400">{loadError}</p>
              <button
                type="button"
                onClick={handleReload}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}
        </>
      ) : (
        // Dans un navigateur web, YouTube et Twitch interdisent l'intégration en
        // <iframe> (X-Frame-Options). Plutôt qu'un écran noir, on l'explique.
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
          <ExternalLink className={`w-10 h-10 ${accentClass}`} />
          <h2 className="text-xl font-bold text-white">
            {serviceName} nécessite l'application de bureau Movix
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-gray-400">
            {serviceName} refuse d'être affiché à l'intérieur d'un autre site web
            (en-tête <code className="text-gray-300">X-Frame-Options</code>). L'intégration
            complète, avec votre compte et vos abonnements, fonctionne dans
            l'application de bureau Movix TV Hub.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir {serviceName} dans un onglet
            </a>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
            >
              Retour à Movix
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HubWebView;
