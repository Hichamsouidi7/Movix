import React from 'react';
import { ChevronLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HubTopBarProps {
  /** Retour en arrière dans le site intégré, ou vers Movix si impossible. */
  onGoBack: () => void;
  /** Nom du service affiché (YouTube, Twitch…), à droite du logo. */
  serviceName?: string;
}

/**
 * Barre de navigation des pages Hub (YouTube, Twitch…).
 *
 * Reprend l'identité visuelle du Header Movix (logo rouge, hauteur h-16, dégradé
 * sombre, boutons en pilules), réduite à l'essentiel : Movix, Accueil, Retour.
 * Elle remplace l'ancien dock flottant du bas.
 */
export const HubTopBar: React.FC<HubTopBarProps> = ({ onGoBack, serviceName }) => (
  <header className="relative w-full flex-shrink-0 bg-black">
    <div
      className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black via-black/95 to-black/80"
      aria-hidden="true"
    />
    <div className="relative z-10 max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
      <div className="flex items-center h-16 px-4 md:px-6 lg:px-8 gap-3 md:gap-5">
        {/* Logo Movix */}
        <Link
          to="/"
          className="text-2xl md:text-3xl font-extrabold flex items-center hover:scale-105 transition-transform duration-300 flex-shrink-0"
        >
          <span className="text-red-600 tracking-wider">MOVIX</span>
        </Link>

        {serviceName && (
          <span className="hidden sm:inline text-sm text-gray-500 border-l border-white/10 pl-3 md:pl-5">
            {serviceName}
          </span>
        )}

        <div className="flex-1" />

        <nav className="flex items-center gap-1.5">
          {/* Retour : recule d'une page dans le site intégré */}
          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            title="Revenir à la page précédente"
          >
            <ChevronLeft size={16} />
            <span>Retour</span>
          </button>

          {/* Accueil : retour à Movix */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <Home size={16} />
            <span>Accueil</span>
          </Link>
        </nav>
      </div>
    </div>
  </header>
);

export default HubTopBar;
