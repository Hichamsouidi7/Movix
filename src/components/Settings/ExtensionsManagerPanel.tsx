import React, { useState, useEffect } from 'react';
import { ShieldCheck, Puzzle, Plus, Trash2, Check, Power, AlertCircle, Sparkles, Moon, Zap, Lock, ShieldAlert, RefreshCw } from 'lucide-react';

export interface MovixExtension {
  id: string;
  name: string;
  description: string;
  category: 'adblock' | 'privacy' | 'appearance' | 'utility' | 'custom';
  enabled: boolean;
  isBuiltIn?: boolean;
  version: string;
  blockedCount?: number;
  author?: string;
  customScriptUrl?: string;
}

const DEFAULT_EXTENSIONS: MovixExtension[] = [
  {
    id: 'ublock_pro',
    name: 'uBlock Movix AdBlocker Pro',
    description: 'Bloque 100% des publicités vidéo (YouTube / Twitch), bannières popups et traqueurs réseau.',
    category: 'adblock',
    enabled: true,
    isBuiltIn: true,
    version: '2.4.0',
    blockedCount: 18450,
    author: 'Movix Team'
  },
  {
    id: 'sponsorblock',
    name: 'SponsorBlock YouTube',
    description: 'Saute automatiquement les segments sponsorisés, intros, outros et appels aux abonnements.',
    category: 'utility',
    enabled: true,
    isBuiltIn: true,
    version: '5.1.2',
    blockedCount: 3420,
    author: 'SponsorBlock Community'
  },
  {
    id: 'privacy_guard',
    name: 'Privacy Guard Anti-Traqueurs',
    description: 'Empêche les cookies publicitaires tiers et bloque les scripts de ciblage comportemental.',
    category: 'privacy',
    enabled: true,
    isBuiltIn: true,
    version: '1.8.0',
    blockedCount: 9120,
    author: 'Movix Security'
  },
  {
    id: 'force_dark_reader',
    name: 'Dark Reader (Mode Sombre Forcé)',
    description: 'Applique un thème sombre reposant pour les yeux sur l\'ensemble des plateformes du Hub.',
    category: 'appearance',
    enabled: false,
    isBuiltIn: true,
    version: '4.9.0',
    author: 'Dark Reader Project'
  }
];

const STORAGE_KEY = 'movix_installed_extensions_v1';

export const ExtensionsManagerPanel: React.FC = () => {
  const [extensions, setExtensions] = useState<MovixExtension[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_EXTENSIONS;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newExtName, setNewExtName] = useState('');
  const [newExtDesc, setNewExtDesc] = useState('');
  const [newExtUrl, setNewExtUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extensions));
  }, [extensions]);

  const toggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, enabled: !ext.enabled } : ext))
    );
    setStatusMsg('Paramètres des extensions mis à jour');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const deleteExtension = (id: string) => {
    setExtensions((prev) => prev.filter((ext) => ext.id !== id));
    setStatusMsg('Extension supprimée');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleAddExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtName.trim()) return;

    const newExt: MovixExtension = {
      id: 'custom_' + Date.now(),
      name: newExtName.trim(),
      description: newExtDesc.trim() || 'Extension personnalisée ajoutée par l\'utilisateur.',
      category: 'custom',
      enabled: true,
      isBuiltIn: false,
      version: '1.0.0',
      author: 'Utilisateur',
      customScriptUrl: newExtUrl.trim() || undefined,
    };

    setExtensions((prev) => [...prev, newExt]);
    setNewExtName('');
    setNewExtDesc('');
    setNewExtUrl('');
    setShowAddModal(false);
    setStatusMsg(`Extension "${newExt.name}" ajoutée et activée !`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'adblock':
        return <ShieldCheck className="w-5 h-5 text-red-500" />;
      case 'privacy':
        return <Lock className="w-5 h-5 text-green-400" />;
      case 'appearance':
        return <Moon className="w-5 h-5 text-purple-400" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-amber-400" />;
      default:
        return <Puzzle className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-2xl text-red-500">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Gestionnaire d'Extensions & Bloqueurs
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {extensions.filter((e) => e.enabled).length} Actives
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Gérez les bloqueurs de publicité, filtres et modules d'optimisation intégrés à Movix.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter une Extension
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          {statusMsg}
        </div>
      )}

      {/* Extensions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {extensions.map((ext) => (
          <div
            key={ext.id}
            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3 ${
              ext.enabled
                ? 'bg-gray-800/80 border-white/15 shadow-lg'
                : 'bg-black/40 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 mt-0.5">
                  {getCategoryIcon(ext.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{ext.name}</h3>
                    <span className="text-[10px] text-gray-500 font-mono">v{ext.version}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ext.description}</p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleExtension(ext.id)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ext.enabled ? 'bg-red-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    ext.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <div className="flex items-center gap-2">
                {ext.blockedCount !== undefined && (
                  <span className="text-red-400 font-medium">
                    🛡️ {ext.blockedCount.toLocaleString()} éléments bloqués
                  </span>
                )}
                {ext.isBuiltIn && (
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                    Intégré
                  </span>
                )}
              </div>

              {!ext.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => deleteExtension(ext.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Supprimer cette extension"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'ajout d'extension */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" />
              Ajouter une nouvelle Extension
            </h3>

            <form onSubmit={handleAddExtension} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Nom de l'extension *</label>
                <input
                  type="text"
                  required
                  value={newExtName}
                  onChange={(e) => setNewExtName(e.target.value)}
                  placeholder="Ex: Anti-Popups Custom"
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Description</label>
                <textarea
                  value={newExtDesc}
                  onChange={(e) => setNewExtDesc(e.target.value)}
                  placeholder="Expliquez le rôle de cette extension..."
                  rows={2}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">URL du script / Fichier (.js ou rule)</label>
                <input
                  type="url"
                  value={newExtUrl}
                  onChange={(e) => setNewExtUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors font-bold"
                >
                  Installer & Activer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionsManagerPanel;
