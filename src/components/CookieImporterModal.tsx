import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Info, X, Key, Laptop } from 'lucide-react';
import { isElectronApp, getHubSessionPartition } from '../utils/desktopEnv';

interface CookieImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookieImporterModal: React.FC<CookieImporterModalProps> = ({ isOpen, onClose }) => {
  const [cookieInput, setCookieInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedConsoleCode, setCopiedConsoleCode] = useState(false);
  const [targetProfile, setTargetProfile] = useState<'maison' | 'personnel'>('maison');

  if (!isOpen) return null;

  const isElectron = isElectronApp();

  const handleCopyConsoleCode = () => {
    navigator.clipboard.writeText('copy(document.cookie)');
    setCopiedConsoleCode(true);
    setTimeout(() => setCopiedConsoleCode(false), 2000);
  };

  const handleImportCookies = async () => {
    if (!cookieInput.trim()) {
      setStatusMsg('Veuillez coller le texte de vos cookies.');
      setIsSuccess(false);
      return;
    }

    if (!isElectron || !window.movixDesktop?.importProfileCookies) {
      setStatusMsg("L'importation nécessite l'application de bureau Movix.");
      setIsSuccess(false);
      return;
    }

    try {
      const res = await window.movixDesktop.importProfileCookies({
        profileId: targetProfile,
        rawCookies: cookieInput,
      });

      if (res.success) {
        setIsSuccess(true);
        setStatusMsg(`✅ ${res.count} cookies injectés avec succès dans le profil "${targetProfile === 'maison' ? 'Salon / Toute la maison' : 'Personnel'}" ! YouTube & Twitch sont maintenant connectés.`);
        setCookieInput('');
      } else {
        setIsSuccess(false);
        setStatusMsg('Erreur lors de l\'injection des cookies.');
      }
    } catch (err) {
      setIsSuccess(false);
      setStatusMsg('Erreur : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Importer la session Google & YouTube</h3>
            <p className="text-xs text-gray-400">Associe votre compte au profil Movix sélectionné</p>
          </div>
        </div>

        {/* Choix du profil */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-300 mb-2">
            Profil Movix de destination :
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetProfile('maison')}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                targetProfile === 'maison'
                  ? 'bg-red-600/20 border-red-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              🏠 Salon / Maison
            </button>
            <button
              type="button"
              onClick={() => setTargetProfile('personnel')}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                targetProfile === 'personnel'
                  ? 'bg-red-600/20 border-red-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              👤 Personnel
            </button>
          </div>
        </div>

        {/* Explication ultra simple F12 */}
        <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-gray-300 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Info className="w-4 h-4" />
            Comment récupérer votre session depuis Chrome / Edge (2 sec) :
          </div>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Ouvrez <strong className="text-white">youtube.com</strong> dans Chrome avec votre compte connecté.</li>
            <li>Appuyez sur <strong className="text-white">F12</strong>, puis cliquez sur l'onglet <strong className="text-white">Console</strong>.</li>
            <li>
              Tapez et validez la commande :{' '}
              <button
                type="button"
                onClick={handleCopyConsoleCode}
                className="inline-flex items-center gap-1 bg-black px-2 py-0.5 rounded border border-white/20 text-red-400 font-mono text-[11px] hover:border-red-500"
              >
                copy(document.cookie)
                {copiedConsoleCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </li>
            <li>Collez le texte copié ci-dessous.</li>
          </ol>
        </div>

        {/* Zone de saisie */}
        <div className="mb-4">
          <textarea
            value={cookieInput}
            onChange={(e) => setCookieInput(e.target.value)}
            placeholder="Collez ici vos cookies (ex: SID=...; HSID=...; LOGIN_INFO=...)"
            rows={4}
            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* Message de statut */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-medium border ${
              isSuccess
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {statusMsg}
          </div>
        )}

        {/* Boutons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleImportCookies}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Injecter & Connecter YouTube
          </button>
        </div>
      </div>
    </div>
  );
};
