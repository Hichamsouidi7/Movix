/**
 * Intégration officielle iptv-org (Chaînes françaises légales / publiques)
 * https://github.com/iptv-org/iptv
 */

export interface IptvOrgChannel {
  id: string;
  name: string;
  poster?: string;
  url: string;
  group: string;
  type: 'tv';
}

export interface IptvOrgCatalog {
  type: 'tv';
  id: string;
  name: string;
  groupKey: string;
}

const M3U_FRANCE_URL = 'https://iptv-org.github.io/iptv/countries/fr.m3u';

let cachedChannels: IptvOrgChannel[] | null = null;
let cacheTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 heure

export const IPTV_ORG_CATALOGS: IptvOrgCatalog[] = [
  { type: 'tv', id: 'iptvorg_fr_all', name: '🇫🇷 Toutes les chaînes (250+)', groupKey: 'all' },
  { type: 'tv', id: 'iptvorg_fr_general', name: '📺 Généralistes & TNT', groupKey: 'general' },
  { type: 'tv', id: 'iptvorg_fr_news', name: '📰 Info & Actualités', groupKey: 'news' },
  { type: 'tv', id: 'iptvorg_fr_entertainment', name: '🎭 Divertissement & Séries', groupKey: 'entertainment' },
  { type: 'tv', id: 'iptvorg_fr_movies', name: '🎬 Cinéma & Films', groupKey: 'movies' },
  { type: 'tv', id: 'iptvorg_fr_sports', name: '⚽ Sports', groupKey: 'sports' },
  { type: 'tv', id: 'iptvorg_fr_kids', name: '🧸 Jeunesse & Dessins animés', groupKey: 'kids' },
  { type: 'tv', id: 'iptvorg_fr_music', name: '🎵 Musique', groupKey: 'music' },
];

export async function fetchIptvOrgChannels(): Promise<IptvOrgChannel[]> {
  if (cachedChannels && Date.now() - cacheTime < CACHE_DURATION_MS) {
    return cachedChannels;
  }

  try {
    const response = await fetch(M3U_FRANCE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch iptv-org M3U: ${response.status}`);
    }

    const text = await response.text();
    const parsed: IptvOrgChannel[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXTINF:')) continue;

      const titleMatch = line.split(',');
      const rawTitle = titleMatch[titleMatch.length - 1]?.trim() || 'Chaîne inconnue';
      
      // Nettoyer les suffixes comme (1080p), (720p) pour la lisibilité
      const cleanName = rawTitle.replace(/\s*\(\d+p\)$/i, '').trim();

      let logo = '';
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch && logoMatch[1]) {
        logo = logoMatch[1];
      }

      let group = 'Général';
      const groupMatch = line.match(/group-title="([^"]+)"/);
      if (groupMatch && groupMatch[1]) {
        group = groupMatch[1];
      }

      // Chercher l'URL HTTP dans les lignes suivantes
      let streamUrl = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('http')) {
          streamUrl = nextLine;
          i = j;
          break;
        }
      }

      if (streamUrl) {
        const safeId = `iptvorg_${encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '_'))}_${parsed.length}`;
        parsed.push({
          id: safeId,
          name: cleanName,
          poster: logo,
          url: streamUrl,
          group: group.toLowerCase(),
          type: 'tv',
        });
      }
    }

    cachedChannels = parsed;
    cacheTime = Date.now();
    return parsed;
  } catch (err) {
    console.error('[IPTV-Org] Error parsing French M3U playlist:', err);
    return cachedChannels || [];
  }
}

export async function getIptvOrgChannelsByCatalog(catalogId: string): Promise<IptvOrgChannel[]> {
  const allChannels = await fetchIptvOrgChannels();
  const catalog = IPTV_ORG_CATALOGS.find(c => c.id === catalogId);
  if (!catalog || catalog.groupKey === 'all') {
    return allChannels;
  }

  const gk = catalog.groupKey;
  return allChannels.filter(ch => {
    const grp = ch.group;
    if (gk === 'general') return grp.includes('general') || grp.includes('undefined') || grp.includes('culture');
    if (gk === 'news') return grp.includes('news') || grp.includes('legislative') || grp.includes('business');
    if (gk === 'entertainment') return grp.includes('entertainment') || grp.includes('series') || grp.includes('comedy');
    if (gk === 'movies') return grp.includes('movies') || grp.includes('cinema');
    if (gk === 'sports') return grp.includes('sport') || grp.includes('auto');
    if (gk === 'kids') return grp.includes('kids') || grp.includes('animation');
    if (gk === 'music') return grp.includes('music');
    return true;
  });
}

export function findIptvOrgChannelById(channelId: string): IptvOrgChannel | undefined {
  return cachedChannels?.find(c => c.id === channelId);
}

export function findIptvOrgChannelByName(name: string): IptvOrgChannel | undefined {
  if (!cachedChannels || !name) return undefined;
  const target = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!target) return undefined;
  return cachedChannels.find(c => {
    const cName = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    return cName === target || cName.includes(target) || target.includes(cName);
  });
}

// Prefetch channels in background when module is loaded
if (typeof window !== 'undefined') {
  void fetchIptvOrgChannels();
}

