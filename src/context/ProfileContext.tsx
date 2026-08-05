/**
 * Contexte des comptes — désormais 100 % local.
 *
 * Cette implémentation remplace l'ancienne, qui chargeait les profils depuis
 * `/api/profiles` avec un JWT et synchronisait les préférences avec le serveur.
 * Il n'y a plus de serveur : tout vit dans le `localStorage`, via
 * `utils/localAccounts`.
 *
 * L'API publique (`ProfileContextType`) est volontairement inchangée : une
 * douzaine de composants consomment `useProfile()` (pages Watch, MovieDetails,
 * TVDetails, ProfileMenu, ProfileSwitcher…) et continuent de fonctionner sans
 * la moindre modification.
 *
 * Différence de comportement notable : `isLoading` est immédiatement `false`.
 * Il n'y a plus rien à attendre au démarrage, donc plus d'écran de chargement
 * ni de sélection de compte — on arrive directement sur l'accueil.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { Profile, ProfileContextType } from '../types/profile';
import {
  ACCOUNTS_CHANGED_EVENT,
  LocalAccount,
  createAccount,
  deleteAccount,
  ensureBootstrap,
  getActiveAccountId,
  listAccounts,
  switchAccount,
  updateAccount,
} from '../utils/localAccounts';

/** Le premier compte de la liste fait office de compte par défaut. */
const toProfile = (account: LocalAccount, index: number): Profile => ({
  id: account.id,
  name: account.name,
  avatar: account.avatar,
  createdAt: new Date(account.createdAt).toISOString(),
  isDefault: index === 0,
  ageRestriction: account.ageRestriction ?? 0,
});

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  // Le compte est créé avant le premier rendu : aucun état intermédiaire
  // « pas encore de compte » ne peut donc être observé par l'interface.
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    ensureBootstrap();
    return listAccounts().map(toProfile);
  });
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(
    () => getActiveAccountId(),
  );

  const refresh = useCallback(() => {
    setProfiles(listAccounts().map(toProfile));
    setCurrentProfileId(getActiveAccountId());
  }, []);

  useEffect(() => {
    window.addEventListener(ACCOUNTS_CHANGED_EVENT, refresh);
    // `storage` couvre le cas d'une seconde fenêtre de l'application.
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ACCOUNTS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentProfileId) ?? null,
    [profiles, currentProfileId],
  );

  /**
   * Bascule de compte.
   *
   * Le rechargement est nécessaire, pas cosmétique : les préférences viennent
   * d'être échangées dans le `localStorage`, mais des dizaines de contextes et
   * de composants les ont déjà lues dans leur état React et ne les reliraient
   * jamais. Recharger garantit que toute l'application repart du bon compte.
   */
  const selectProfile = useCallback((profileId: string) => {
    if (switchAccount(profileId)) {
      window.location.reload();
    }
  }, []);

  const handleCreate = useCallback(
    async (name: string, avatar: string, ageRestriction?: number) => {
      createAccount(name, avatar, ageRestriction ?? 0);
    },
    [],
  );

  const handleUpdate = useCallback(
    async (profileId: string, updates: Partial<Profile>) => {
      updateAccount(profileId, {
        name: updates.name,
        avatar: updates.avatar,
        ageRestriction: updates.ageRestriction,
      });
    },
    [],
  );

  const handleDelete = useCallback(async (profileId: string) => {
    deleteAccount(profileId);
  }, []);

  const value = useMemo<ProfileContextType>(
    () => ({
      currentProfile,
      profiles,
      selectProfile,
      createProfile: handleCreate,
      updateProfile: handleUpdate,
      deleteProfile: handleDelete,
      isLoading: false,
    }),
    [currentProfile, profiles, selectProfile, handleCreate, handleUpdate, handleDelete],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
