/**
 * Gestion des comptes locaux, dans les Paramètres.
 *
 * Remplace l'ancienne section « comptes liés » (Discord / Google), devenue
 * sans objet : les comptes ne sont plus rattachés à un service distant, ils
 * n'existent que dans l'application.
 *
 * On y renomme le compte, on change son avatar, on en crée d'autres, on
 * bascule de l'un à l'autre et on en supprime — sauf le dernier, car
 * l'application doit toujours avoir un compte actif.
 */
import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { predefinedAvatars } from '../../data/avatars';

const FALLBACK_AVATAR = '/avatars/disney/disney_avatar_1.png';

/** Échantillon d'avatars proposé — la liste complète en compte plus de 200. */
const AVATAR_CHOICES = predefinedAvatars.slice(0, 48);

const LocalAccountsPanel: React.FC = () => {
  const { profiles, currentProfile, selectProfile, createProfile, updateProfile, deleteProfile } =
    useProfile();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [avatarPickerFor, setAvatarPickerFor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setDraftName(name);
  };

  const commitName = async (id: string) => {
    const name = draftName.trim();
    if (name) await updateProfile(id, { name });
    setEditingId(null);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createProfile(name, AVATAR_CHOICES[profiles.length % AVATAR_CHOICES.length], 0);
    setNewName('');
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    await deleteProfile(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Les comptes sont enregistrés dans l'application. Chacun garde ses propres favoris,
        sa progression et ses réglages.
      </p>

      <div className="space-y-3">
        {profiles.map((profile) => {
          const isActive = profile.id === currentProfile?.id;
          const isEditing = editingId === profile.id;

          return (
            <div
              key={profile.id}
              className={`rounded-xl border p-4 transition-colors ${
                isActive
                  ? 'border-red-500/40 bg-red-500/[0.06]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setAvatarPickerFor(avatarPickerFor === profile.id ? null : profile.id)}
                  className="relative shrink-0 rounded-full"
                  title="Changer l'avatar"
                >
                  <img
                    src={profile.avatar || FALLBACK_AVATAR}
                    alt={profile.name}
                    className="h-14 w-14 rounded-full border-2 border-white/15 object-cover transition-colors hover:border-red-500/60"
                    onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-neutral-800 text-gray-300">
                    <Pencil className="h-3 w-3" />
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitName(profile.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => commitName(profile.id)}
                        className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-500"
                        title="Valider"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-neutral-800 p-2 text-gray-300 hover:bg-neutral-700"
                        title="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate text-lg font-semibold text-white">{profile.name}</span>
                      {isActive && (
                        <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                          Compte actif
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(profile.id, profile.name)}
                        className="text-gray-500 transition-colors hover:text-white"
                        title="Renommer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => selectProfile(profile.id)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-white/30 hover:bg-white/5"
                    >
                      Utiliser
                    </button>
                  )}
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(profile.id)}
                      className="rounded-lg border border-white/10 p-2 text-gray-500 transition-colors hover:border-red-500/40 hover:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {confirmDeleteId === profile.id && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-200">
                    Supprimer « {profile.name} » ? Ses favoris, sa progression et ses réglages
                    seront perdus.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(profile.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-neutral-700"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {avatarPickerFor === profile.id && (
                <div className="mt-3 grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-8">
                  {AVATAR_CHOICES.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => {
                        updateProfile(profile.id, { avatar });
                        setAvatarPickerFor(null);
                      }}
                      className="rounded-full"
                    >
                      <img
                        src={avatar}
                        alt=""
                        loading="lazy"
                        className={`h-11 w-11 rounded-full object-cover transition-transform hover:scale-110 ${
                          profile.avatar === avatar ? 'ring-2 ring-red-500' : ''
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCreating ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="text"
              value={newName}
              autoFocus
              placeholder="Nom du compte"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500/60"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="shrink-0 rounded-lg bg-neutral-800 p-2 text-gray-300 hover:bg-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-4 text-sm text-gray-300 transition-colors hover:border-red-500/40 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Ajouter un compte
        </button>
      )}
    </div>
  );
};

export default LocalAccountsPanel;
