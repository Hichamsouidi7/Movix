import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, Tv, Sparkles, Check, RefreshCw } from 'lucide-react';
import {
  getCustomPlatforms,
  addCustomPlatform,
  removeCustomPlatform,
  DEFAULT_HUB_PLATFORMS,
  type CustomPlatformItem
} from '../../utils/customPlatforms';

export const CustomPlatformsPanel: React.FC = () => {
  const [customPlatforms, setCustomPlatforms] = useState<CustomPlatformItem[]>(getCustomPlatforms);

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [label, setLabel] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshList = () => {
    setCustomPlatforms(getCustomPlatforms());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    addCustomPlatform({
      title: title.trim(),
      route: url.trim(),
      src: logoUrl.trim() || 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Very_Basic_Globe_icon.svg/512px-Very_Basic_Globe_icon.svg.png',
      video: videoUrl.trim() || undefined,
      label: label.trim() || title.trim(),
    });

    setTitle('');
    setUrl('');
    setLogoUrl('');
    setVideoUrl('');
    setLabel('');
    setSuccessMsg('Plateforme ajoutée avec succès !');
    refreshList();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemove = (id: string) => {
    removeCustomPlatform(id);
    refreshList();
  };

  return (
    <div className="space-y-6">
      {/* Overview & Header */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Hub Kiosque & Raccourcis TV</h2>
            <p className="text-sm text-gray-400">
              Gérez les tuiles et services web affichés dans la section <span className="text-white font-semibold">Plateformes de streaming</span> de la page d'accueil.
            </p>
          </div>
        </div>

        {/* System Default Platforms */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Services Intégrés par Défaut
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEFAULT_HUB_PLATFORMS.map((plat) => (
              <div key={plat.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <img src={plat.src} alt={plat.title} className="w-10 h-10 object-contain rounded-lg p-1 bg-white" />
                <div>
                  <h4 className="text-sm font-semibold text-white">{plat.title}</h4>
                  <p className="text-xs text-gray-400">{plat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Custom Platform Form */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-md p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-red-500" />
          Ajouter un Nouveau Raccourci Web / Service
        </h3>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Nom du service / Titre *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Crunchyroll, France.tv, Spotify..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">URL Web ou Route interne *</label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: https://france.tv ou /live-tv"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">URL de l'image / Logo (Facultatif)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://domaine.com/logo.png"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Texte d'étiquette sous l'icône (Facultatif)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Regarder en direct, Streaming..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter la Tuile sur la Page d'Accueil
          </button>
        </form>
      </div>

      {/* User Custom Platforms List */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-md p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Vos Raccourcis Personnalisés ({customPlatforms.length})
        </h3>

        {customPlatforms.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun raccourci personnalisé ajouté pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {customPlatforms.map((plat) => (
              <div key={plat.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4 overflow-hidden">
                  <img src={plat.src} alt={plat.title} className="w-12 h-12 object-contain rounded-xl p-1 bg-white shrink-0" />
                  <div className="overflow-hidden">
                    <h4 className="text-base font-semibold text-white truncate">{plat.title}</h4>
                    <p className="text-xs text-gray-400 truncate">{plat.route}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(plat.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors shrink-0"
                  title="Supprimer ce raccourci"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomPlatformsPanel;
