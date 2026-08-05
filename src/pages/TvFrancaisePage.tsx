import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Tv,
  X,
  List,
  Play,
  Zap,
  Globe,
  Film,
  Trophy,
  Newspaper,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio
} from 'lucide-react';
import { FRENCH_TV_CHANNELS, type FrenchTvChannel } from '../data/frenchTvChannels';
import { fetchIptvOrgChannels, type IptvOrgChannel } from '../utils/iptvOrgFrance';
import LiveTVPlayer from '../components/LiveTVPlayer';

type TvCategoryKey = 'tnt' | 'sports' | 'info' | 'cinema' | 'all';

interface TvCategoryOption {
  key: TvCategoryKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TV_CATEGORIES: TvCategoryOption[] = [
  { key: 'tnt', label: '🇫🇷 TNT & Françaises', icon: Tv, color: 'from-red-600 to-red-800' },
  { key: 'sports', label: '⚽ Football & Sports', icon: Trophy, color: 'from-amber-600 to-yellow-600' },
  { key: 'info', label: '📰 Info & Actualités', icon: Newspaper, color: 'from-blue-600 to-indigo-700' },
  { key: 'cinema', label: '🎬 Cinéma & Séries', icon: Film, color: 'from-purple-600 to-pink-600' },
  { key: 'all', label: '🌐 Catalogue Complet (IPTV)', icon: Globe, color: 'from-emerald-600 to-teal-700' },
];

export default function TvFrancaisePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TvCategoryKey>('tnt');
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [iptvChannels, setIptvChannels] = useState<IptvOrgChannel[]>([]);
  const [onlyWorking, setOnlyWorking] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [osdChannel, setOsdChannel] = useState<FrenchTvChannel | null>(null);
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clock in header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch full IPTV-Org catalog for "Catalogue Complet"
  useEffect(() => {
    void fetchIptvOrgChannels().then((data) => {
      if (Array.isArray(data)) setIptvChannels(data);
    });
  }, []);

  // Convert IPTV-Org channels into FrenchTvChannel shape if on "all"
  const allCombinedChannels = useMemo<FrenchTvChannel[]>(() => {
    if (selectedCategory === 'all' && iptvChannels.length > 0) {
      const converted: FrenchTvChannel[] = iptvChannels.map((c, i) => ({
        num: i + 1,
        name: c.name,
        category: c.group.includes('sport') ? 'Sport' : c.group.includes('news') ? 'Info' : 'TNT',
        logo: c.poster || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200&auto=format&fit=crop&q=80',
        catalogId: c.id,
        fallbackUrl: c.url,
      }));
      return converted;
    }
    return FRENCH_TV_CHANNELS;
  }, [selectedCategory, iptvChannels]);

  // Filter channels based on selected category, search, and working filter
  const filteredChannels = useMemo(() => {
    let source = FRENCH_TV_CHANNELS;
    if (selectedCategory === 'all') {
      source = allCombinedChannels;
    }

    return source.filter((c) => {
      let matchesCat = true;
      if (selectedCategory === 'tnt') {
        matchesCat = c.category === 'TNT' || c.num <= 31;
      } else if (selectedCategory === 'sports') {
        matchesCat = c.category === 'Sport' || c.name.toLowerCase().includes('sport') || c.name.toLowerCase().includes('foot');
      } else if (selectedCategory === 'info') {
        matchesCat = c.category === 'Info' || c.name.toLowerCase().includes('news') || c.name.toLowerCase().includes('info');
      } else if (selectedCategory === 'cinema') {
        matchesCat = c.category === 'Divertissement' || c.category === 'Thématique' || c.name.toLowerCase().includes('action') || c.name.toLowerCase().includes('film');
      }

      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.num) === searchQuery.trim();

      const matchesWorking = !onlyWorking || !!c.fallbackUrl;

      return matchesCat && matchesSearch && matchesWorking;
    });
  }, [selectedCategory, searchQuery, onlyWorking, allCombinedChannels]);

  const activeChannelList = selectedCategory === 'all' ? allCombinedChannels : FRENCH_TV_CHANNELS;

  const activeChannel: FrenchTvChannel | null =
    currentChannelIndex !== null ? activeChannelList[currentChannelIndex] ?? null : null;

  // Show On-Screen Banner (OSD) whenever active channel changes
  const triggerOsd = useCallback((channel: FrenchTvChannel) => {
    setOsdChannel(channel);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setOsdChannel(null);
    }, 2800);
  }, []);

  useEffect(() => {
    if (activeChannel) {
      triggerOsd(activeChannel);
    }
  }, [activeChannel, triggerOsd]);

  const handleNextChannel = useCallback(() => {
    if (currentChannelIndex === null) return;
    const nextIdx = (currentChannelIndex + 1) % activeChannelList.length;
    setCurrentChannelIndex(nextIdx);
  }, [currentChannelIndex, activeChannelList.length]);

  const handlePrevChannel = useCallback(() => {
    if (currentChannelIndex === null) return;
    const prevIdx =
      (currentChannelIndex - 1 + activeChannelList.length) % activeChannelList.length;
    setCurrentChannelIndex(prevIdx);
  }, [currentChannelIndex, activeChannelList.length]);

  // Keyboard shortcut listener for numeric keys (1-31), arrows, and Tab/L
  useEffect(() => {
    if (currentChannelIndex === null) return;

    let digitBuffer = '';
    let bufferTimer: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing inside text inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextChannel();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevChannel();
      } else if (e.key === 'Tab' || e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCurrentChannelIndex(null);
        setIsDrawerOpen(false);
      } else if (/^[0-9]$/.test(e.key)) {
        digitBuffer += e.key;
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => {
          const targetNum = parseInt(digitBuffer, 10);
          const foundIdx = activeChannelList.findIndex((c) => c.num === targetNum);
          if (foundIdx !== -1) {
            setCurrentChannelIndex(foundIdx);
          }
          digitBuffer = '';
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [currentChannelIndex, handleNextChannel, handlePrevChannel, activeChannelList]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-20 pb-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top TV Hero Header (Smart TV Style) */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-red-950/60 via-neutral-900/80 to-blue-950/40 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-900/40 text-xl font-bold">
                  📺
                </span>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  Télévision en Direct
                </h1>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  DIRECT TNT OK
                </div>
              </div>
              <p className="text-gray-300 text-sm max-w-2xl">
                Accédez à toutes les chaînes gratuites de la TNT (TF1, France 2, M6...) et zappez en temps réel comme sur une vraie télévision de salon.
              </p>
            </div>

            {/* Time display & Status counter */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex flex-col items-end border-r border-white/10 pr-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-red-500" />
                  <span>HEURE LOCALE</span>
                </div>
                <span className="text-2xl font-black tracking-wider text-white font-mono">{timeString || '20:35'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-red-500">{FRENCH_TV_CHANNELS.length}</span>
                <span className="text-xs text-gray-400 font-medium">Chaînes TNT</span>
              </div>
            </div>
          </div>

          {/* Search bar & Filter toggles */}
          <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher par nom ou N° TNT (ex: 1, M6)..."
                className="w-full rounded-2xl border border-white/15 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Only working streams toggle */}
            <button
              type="button"
              onClick={() => setOnlyWorking((prev) => !prev)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold border transition-all ${
                onlyWorking
                  ? 'border-emerald-500 bg-emerald-600/30 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Uniquement chaînes vérifiées</span>
            </button>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {TV_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-bold transition-all shrink-0 border ${
                  isSelected
                    ? 'border-red-500 bg-red-600 text-white shadow-xl shadow-red-950/40 scale-105'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Channel Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
          {filteredChannels.map((channel) => {
            const globalIndex = activeChannelList.findIndex((c) => c.num === channel.num || c.catalogId === channel.catalogId);
            const hasFallback = !!channel.fallbackUrl;

            return (
              <motion.div
                key={channel.catalogId || channel.num}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCurrentChannelIndex(globalIndex !== -1 ? globalIndex : 0)}
                className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] via-neutral-900/60 to-black/80 p-4 transition-all hover:border-red-500/60 hover:shadow-2xl hover:shadow-red-950/30 cursor-pointer overflow-hidden aspect-[4/3]"
              >
                {/* TNT Number & Status Badge */}
                <div className="flex items-center justify-between z-10">
                  <span className="rounded-xl bg-black/80 px-2.5 py-1 text-xs font-black text-white border border-white/15 backdrop-blur-md shadow-md">
                    N° {String(channel.num).padStart(2, '0')}
                  </span>
                  {hasFallback ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      EN DIRECT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      DIRECT
                    </span>
                  )}
                </div>

                {/* Channel Logo */}
                <div className="my-auto flex items-center justify-center p-2 z-10">
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="max-h-14 max-w-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-20 gap-2">
                  <div className="rounded-full bg-red-600 p-3.5 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Play className="h-7 w-7 text-white fill-white ml-0.5" />
                  </div>
                  <span className="text-[11px] font-bold text-white tracking-wider uppercase">Regarder</span>
                </div>

                {/* Channel Footer Title */}
                <div className="z-10 text-center">
                  <p className="text-xs font-bold text-gray-200 truncate group-hover:text-white">
                    {channel.name}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 space-y-4 rounded-3xl border border-white/10 bg-white/5">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-xl font-bold text-white">Aucune chaîne trouvée</p>
            <p className="text-sm text-gray-400 max-w-md">
              Aucune chaîne ne correspond à votre recherche ou vos filtres. Réessayez avec d'autres mots-clés.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('tnt');
                setOnlyWorking(false);
              }}
              className="rounded-2xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-lg"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen TV Player & Zapping Overlay (HIGHEST Z-INDEX TO OVERRIDE SITE HEADER) */}
      <AnimatePresence>
        {activeChannel !== null && (
          <div className="fixed inset-0 z-[25000] bg-black">

            {/* On-Screen Display (OSD Banner) when switching channel */}
            <AnimatePresence>
              {osdChannel && (
                <motion.div
                  initial={{ opacity: 0, y: -30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="fixed top-6 right-6 z-[30000] pointer-events-none flex items-center gap-4 rounded-3xl border border-white/20 bg-neutral-950/90 px-6 py-4.5 shadow-2xl backdrop-blur-2xl"
                >
                  <span className="rounded-2xl bg-red-600 px-3.5 py-1.5 text-base font-black text-white shadow-lg">
                    N° {String(osdChannel.num).padStart(2, '0')}
                  </span>
                  {osdChannel.logo && (
                    <img
                      src={osdChannel.logo}
                      alt={osdChannel.name}
                      className="h-9 w-auto max-w-[80px] object-contain drop-shadow-md"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="font-black text-white text-lg tracking-tight leading-tight">{osdChannel.name}</span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-emerald-400" /> EN DIRECT
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Zapping Control Bar */}
            <div className="absolute top-0 left-0 right-0 z-[25010] flex items-center justify-between p-4 bg-gradient-to-b from-black/95 via-black/60 to-transparent pointer-events-auto">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentChannelIndex(null)}
                  className="rounded-2xl bg-neutral-900/90 px-4 py-2.5 text-gray-200 hover:bg-red-600 hover:text-white border border-white/15 shadow-xl transition-all font-bold text-xs flex items-center gap-2"
                  title="Fermer le lecteur (Touche Échap)"
                >
                  <X className="h-4 w-4 text-red-400" />
                  <span>Quitter</span>
                </button>

                <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/90 px-4 py-2 border border-white/15 backdrop-blur-xl shadow-xl">
                  <span className="rounded-xl bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                    N° {String(activeChannel.num).padStart(2, '0')}
                  </span>
                  {activeChannel.logo && (
                    <img
                      src={activeChannel.logo}
                      alt={activeChannel.name}
                      className="h-6 w-auto max-w-[65px] object-contain"
                    />
                  )}
                  <span className="font-black text-white text-sm sm:text-base leading-tight">{activeChannel.name}</span>
                </div>
              </div>

              {/* Prev / Next / Zapping Drawer Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevChannel}
                  className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/90 px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-red-600 hover:text-white transition-all border border-white/15 shadow-lg active:scale-95"
                  title="Chaîne Précédente (Flèche Gauche)"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédente</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextChannel}
                  className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/90 px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-red-600 hover:text-white transition-all border border-white/15 shadow-lg active:scale-95"
                  title="Chaîne Suivante (Flèche Droite)"
                >
                  <span className="hidden sm:inline">Suivante</span>
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen((prev) => !prev)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border shadow-lg active:scale-95 ${
                    isDrawerOpen
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-neutral-900/90 text-gray-200 border-white/15 hover:bg-neutral-800 hover:text-white'
                  }`}
                  title="Liste des chaînes (Touche L ou Tab)"
                >
                  <List className="h-4 w-4 text-red-400" />
                  <span>Liste Chaînes (Zapper)</span>
                </button>
              </div>
            </div>

            {/* Video Player */}
            <LiveTVPlayer
              channelId={activeChannel.catalogId}
              channelName={activeChannel.name}
              channelPoster={activeChannel.logo}
              onClose={() => setCurrentChannelIndex(null)}
            />

            {/* Lateral Zapping Drawer (Molotov Sidebar) */}
            <AnimatePresence>
              {isDrawerOpen && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 z-[25020] bg-neutral-950/95 border-l border-white/15 p-5 overflow-y-auto backdrop-blur-2xl shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/15">
                    <div className="flex items-center gap-2 font-black text-white text-base">
                      <Tv className="h-5 w-5 text-red-500" />
                      <span>Zapper de Chaîne</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-xl bg-white/10 p-2 text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2 mt-5">
                    {activeChannelList.map((ch, idx) => {
                      const isActive = idx === currentChannelIndex;
                      return (
                        <button
                          key={ch.catalogId || ch.num}
                          type="button"
                          onClick={() => {
                            setCurrentChannelIndex(idx);
                          }}
                          className={`flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all ${
                            isActive
                              ? 'bg-red-600 text-white font-black shadow-xl shadow-red-950/50 scale-[1.02]'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className={`rounded-xl px-2.5 py-1 text-xs font-mono font-bold ${isActive ? 'bg-black/40 text-white' : 'bg-black/60 text-gray-300'}`}>
                            {String(ch.num).padStart(2, '0')}
                          </span>
                          {ch.logo && (
                            <img
                              src={ch.logo}
                              alt=""
                              className="h-6 w-auto max-w-[45px] object-contain"
                            />
                          )}
                          <span className="truncate text-xs font-bold flex-1">{ch.name}</span>
                          {isActive && <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
