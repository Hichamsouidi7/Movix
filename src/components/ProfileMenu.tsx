/**
 * Menu de compte de l'en-tête.
 *
 * Remplace l'ancien menu d'authentification (Discord, Google, phrase secrète
 * BIP39, VIP, déconnexion) : il n'y a plus de connexion distante, seulement
 * des comptes locaux. Le menu sert donc à voir le compte courant, basculer
 * vers un autre, et rejoindre les Paramètres où on les gère.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings, Check, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';

const FALLBACK_AVATAR = '/avatars/disney/disney_avatar_1.png';

const ProfileMenu: React.FC = () => {
  const { t } = useTranslation();
  const { currentProfile, profiles, selectProfile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  const name = currentProfile?.name ?? '';
  const avatar = currentProfile?.avatar || FALLBACK_AVATAR;
  const others = profiles.filter((p) => p.id !== currentProfile?.id);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    // Recharge la page : les préférences du compte viennent d'être échangées.
    selectProfile(id);
  };

  return (
    <div className="relative z-50 flex items-center justify-center">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative group">
            <img
              src={avatar}
              alt={name}
              className="w-7 h-7 rounded-full object-cover border-2 border-transparent group-hover:border-red-600 transition-all duration-300 shadow-md"
              onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
              key={avatar}
            />
          </div>
          <span className="hidden sm:inline text-sm font-medium truncate max-w-[80px] lg:max-w-[120px]">
            {name.length > 12 ? `${name.substring(0, 12)}...` : name}
          </span>
        </div>

        <ChevronDown className="w-4 h-4 hidden sm:inline transition-transform duration-300" />
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl border border-gray-700 overflow-hidden z-[100]"
            >
              <div className="absolute right-3 -top-2 w-4 h-4 bg-gray-900 transform rotate-45 border-t border-l border-gray-700" />

              {/* Compte courant */}
              <div className="px-5 py-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-red-600/70"
                    onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                  />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{name}</p>
                    <p className="text-xs text-gray-400">{t('nav.profile')}</p>
                  </div>
                </div>
              </div>

              {/* Bascule vers un autre compte */}
              {others.length > 0 && (
                <div className="py-1 border-b border-gray-700/30">
                  {others.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleSelect(profile.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-700/50 transition-colors cursor-pointer text-left"
                    >
                      <img
                        src={profile.avatar || FALLBACK_AVATAR}
                        alt={profile.name}
                        className="w-7 h-7 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                      />
                      <span className="text-gray-200 truncate">{profile.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="py-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <UserRound className="w-4 h-4 text-gray-400" />
                  <span>{t('nav.profile')}</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-700/50 transition-colors cursor-pointer border-t border-gray-700/30"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>{t('settings.title')}</span>
                </Link>
              </div>

              {others.length === 0 && (
                <div className="px-5 py-3 border-t border-gray-700/30 flex items-center gap-2 text-xs text-gray-500">
                  <Check className="w-3 h-3" />
                  <span>{t('nav.settingsDesc')}</span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
