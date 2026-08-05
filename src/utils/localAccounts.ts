/**
 * Comptes locaux — remplacent entièrement les comptes serveur.
 *
 * L'application ne se connecte plus à rien : un compte n'est qu'une entrée
 * dans le `localStorage`, avec ses propres préférences. Au premier lancement,
 * un compte « Maison » est créé automatiquement et sélectionné, pour qu'on
 * arrive directement sur l'accueil sans jamais rien demander à l'utilisateur.
 *
 * ── Comment les préférences sont cloisonnées ────────────────────────────────
 *
 * Les préférences (favoris, progression, réglages, listes…) sont déjà des clés
 * plates du `localStorage`, lues telles quelles par des dizaines de pages.
 * Plutôt que de réécrire tous ces appels, on garde le compte actif « à plat »
 * dans le `localStorage` et on range les autres comptes dans des blocs à part :
 *
 *   local_accounts_v1              → la liste des comptes
 *   local_active_account_id        → le compte actuellement chargé
 *   local_account_data_v1:<id>     → les préférences des comptes INACTIFS
 *
 * Changer de compte revient donc à échanger deux blocs : on met de côté les
 * clés du compte courant, on les efface, puis on déplie celles du compte visé.
 * Aucun code appelant n'a besoin de savoir qu'un système de comptes existe.
 *
 * `isSyncableStorageKey` sert d'arbitre pour décider ce qui appartient à un
 * compte. C'est la même liste qui servait à décider quoi synchroniser avec le
 * serveur — donc exactement « les données d'un utilisateur », par construction.
 */
import { isSyncableStorageKey } from './syncStorage';
import { predefinedAvatars } from '../data/avatars';

export interface LocalAccount {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
  /** 0 = aucune restriction, sinon 7, 12, 16 ou 18. */
  ageRestriction?: number;
}

const ACCOUNTS_KEY = 'local_accounts_v1';
const ACTIVE_ID_KEY = 'local_active_account_id';
const accountDataKey = (id: string) => `local_account_data_v1:${id}`;

/** Nom du compte créé d'office au premier lancement. */
export const DEFAULT_ACCOUNT_NAME = 'Maison';

/** Émis après toute modification (création, renommage, bascule, suppression). */
export const ACCOUNTS_CHANGED_EVENT = 'local_accounts_changed';

const DEFAULT_AVATAR = predefinedAvatars[0] ?? '/avatars/disney/disney_avatar_1.png';

const notifyChange = () => {
  window.dispatchEvent(new CustomEvent(ACCOUNTS_CHANGED_EVENT));
};

const newId = () => {
  // randomUUID n'existe pas sur les contextes non sécurisés (http://) — on
  // garde une repli suffisant pour un identifiant purement local.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const readAccounts = (): LocalAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is LocalAccount =>
        !!a && typeof a.id === 'string' && typeof a.name === 'string',
    );
  } catch {
    return [];
  }
};

const writeAccounts = (accounts: LocalAccount[]) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

// ── Bascule des préférences ────────────────────────────────────────────────

/** Toutes les clés à plat qui appartiennent au compte actuellement chargé. */
const collectScopedKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isSyncableStorageKey(key)) keys.push(key);
  }
  return keys;
};

const snapshotScopedData = (): Record<string, string> => {
  const data: Record<string, string> = {};
  for (const key of collectScopedKeys()) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
};

const clearScopedData = () => {
  // On collecte d'abord : supprimer pendant l'itération décale les index.
  for (const key of collectScopedKeys()) {
    localStorage.removeItem(key);
  }
};

const applyScopedData = (data: Record<string, string>) => {
  for (const [key, value] of Object.entries(data)) {
    if (isSyncableStorageKey(key)) localStorage.setItem(key, value);
  }
};

const readStoredData = (id: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(accountDataKey(id));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

// ── API publique ───────────────────────────────────────────────────────────

export function listAccounts(): LocalAccount[] {
  return readAccounts();
}

export function getActiveAccountId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY);
}

export function getActiveAccount(): LocalAccount | null {
  const id = getActiveAccountId();
  if (!id) return null;
  return readAccounts().find((a) => a.id === id) ?? null;
}

/**
 * Garantit qu'il existe au moins un compte et qu'un compte est actif.
 *
 * Appelé au démarrage, avant le premier rendu. Les préférences déjà présentes
 * dans le `localStorage` lors du tout premier lancement ne sont pas jetées :
 * elles deviennent naturellement celles du compte « Maison », puisqu'on les
 * laisse à plat.
 */
export function ensureBootstrap(): LocalAccount {
  const accounts = readAccounts();
  const activeId = getActiveAccountId();

  if (accounts.length > 0) {
    const active = accounts.find((a) => a.id === activeId);
    if (active) return active;

    // Identifiant actif absent ou pointant vers un compte supprimé.
    localStorage.setItem(ACTIVE_ID_KEY, accounts[0].id);
    applyScopedData(readStoredData(accounts[0].id));
    return accounts[0];
  }

  const account: LocalAccount = {
    id: newId(),
    name: DEFAULT_ACCOUNT_NAME,
    avatar: DEFAULT_AVATAR,
    createdAt: Date.now(),
    ageRestriction: 0,
  };
  writeAccounts([account]);
  localStorage.setItem(ACTIVE_ID_KEY, account.id);
  return account;
}

export function createAccount(
  name: string,
  avatar?: string,
  ageRestriction = 0,
): LocalAccount {
  const account: LocalAccount = {
    id: newId(),
    name: name.trim() || 'Nouveau compte',
    avatar: avatar || DEFAULT_AVATAR,
    createdAt: Date.now(),
    ageRestriction,
  };

  writeAccounts([...readAccounts(), account]);
  // Un compte neuf part de préférences vierges, pas de celles du compte courant.
  localStorage.setItem(accountDataKey(account.id), JSON.stringify({}));
  notifyChange();
  return account;
}

export function updateAccount(
  id: string,
  changes: { name?: string; avatar?: string; ageRestriction?: number },
): void {
  const accounts = readAccounts().map((a) =>
    a.id === id
      ? {
        ...a,
        name: changes.name !== undefined ? changes.name.trim() || a.name : a.name,
        avatar: changes.avatar ?? a.avatar,
        ageRestriction: changes.ageRestriction ?? a.ageRestriction,
      }
      : a,
  );
  writeAccounts(accounts);
  notifyChange();
}

/**
 * Supprime un compte et ses préférences.
 *
 * Refuse de supprimer le dernier compte : l'application doit toujours avoir un
 * compte actif, sinon on retombe sur un écran de sélection — précisément ce
 * qu'on veut éviter au démarrage.
 */
export function deleteAccount(id: string): boolean {
  const accounts = readAccounts();
  if (accounts.length <= 1) return false;
  if (!accounts.some((a) => a.id === id)) return false;

  const remaining = accounts.filter((a) => a.id !== id);
  writeAccounts(remaining);
  localStorage.removeItem(accountDataKey(id));

  // Supprimer le compte actif : ses données à plat sont celles qu'on jette.
  if (getActiveAccountId() === id) {
    clearScopedData();
    localStorage.setItem(ACTIVE_ID_KEY, remaining[0].id);
    applyScopedData(readStoredData(remaining[0].id));
    localStorage.removeItem(accountDataKey(remaining[0].id));
  }

  notifyChange();
  return true;
}

/**
 * Bascule vers un autre compte.
 *
 * Range les préférences du compte courant, déplie celles du compte visé.
 * Ne recharge pas la page : c'est à l'appelant de le faire, car des dizaines
 * de contextes React ont déjà lu ces clés dans leur état local et ne les
 * reliraient pas d'eux-mêmes.
 */
export function switchAccount(id: string): boolean {
  const accounts = readAccounts();
  if (!accounts.some((a) => a.id === id)) return false;

  const currentId = getActiveAccountId();
  if (currentId === id) return true;

  if (currentId) {
    localStorage.setItem(accountDataKey(currentId), JSON.stringify(snapshotScopedData()));
  }

  clearScopedData();
  localStorage.setItem(ACTIVE_ID_KEY, id);
  applyScopedData(readStoredData(id));
  // Le compte actif vit à plat : son bloc de côté n'a plus lieu d'être.
  localStorage.removeItem(accountDataKey(id));

  notifyChange();
  return true;
}
