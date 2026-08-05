import React, { useState } from 'react';
import { Home, Tv, Film, Settings, X, ChevronUp, Sparkles, ChevronLeft, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface MovixFloatingDockProps {
  onGoBack?: () => void;
  onReload?: () => void;
}

export const MovixFloatingDock: React.FC<MovixFloatingDockProps> = ({ onGoBack, onReload }) => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onGoBack) {
      onGoBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const handleReloadClick = () => {
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-auto select-none">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/20 shadow-2xl ring-1 ring-red-500/40"
          >
            {/* MOVIX HUB Logo */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-white/15">
              <span className="font-extrabold text-red-600 text-sm tracking-wider">MOVIX</span>
              <span className="text-[9px] uppercase font-bold text-gray-300 bg-white/10 px-1.5 py-0.5 rounded">HUB</span>
            </div>

            {/* Bouton Retour ⬅️ */}
            <button
              type="button"
              onClick={handleBackClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
              title="Précédent (Revenir en arrière d'une fois)"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
              <span>Retour</span>
            </button>

            {/* Bouton Accueil Movix 🏠 */}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </Link>

            {/* Bouton TV en direct 📺 */}
            <Link
              to="/live-tv"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <Tv className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">TV en direct</span>
            </Link>

            {/* Bouton Films 🎬 */}
            <Link
              to="/movies"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <Film className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Films</span>
            </Link>

            {/* Bouton Rafraîchir 🔄 */}
            <button
              type="button"
              onClick={handleReloadClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title="Rafraîchir la page"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Bouton Réglages ⚙️ */}
            <Link
              to="/settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white text-xs font-semibold transition-all active:scale-95"
              title="Réglages"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Bouton Réduire */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-0.5"
              title="Réduire le menu Movix"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-red-500/40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>MOVIX HUB</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MovixFloatingDock;
