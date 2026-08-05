/**
 * Custom Platforms & Hub Services Manager
 * Manages default hub platforms (YouTube Ad-Free, Twitch) and user-added web tiles.
 */

export interface CustomPlatformItem {
  id: string;
  title: string;
  src: string;        // Logo image URL
  video?: string;     // Video/GIF preview URL
  route: string;      // Internal route or external URL
  isExternal?: boolean;
  label?: string;
  isAdFreeYouTube?: boolean;
  category?: string;
}

const STORAGE_KEY = 'movix_custom_platforms_v1';
const CHANGE_EVENT = 'movix-custom-platforms-changed';

export const DEFAULT_HUB_PLATFORMS: CustomPlatformItem[] = [
  {
    id: 'youtube-adfree',
    title: 'YouTube',
    src: '/platforms/youtube.svg',
    video: 'https://media.tenor.com/P43wY01Yf_YAAAAC/youtube-logo.gif',
    route: '/hub/youtube',
    label: 'YouTube',
  },
  {
    id: 'twitch-tv',
    title: 'Twitch',
    src: '/platforms/twitch.svg',
    video: 'https://media.tenor.com/6E2h_R9lX0AAAAAC/twitch-logo.gif',
    route: '/hub/twitch',
    label: 'Twitch',
  },
];

export function getCustomPlatforms(): CustomPlatformItem[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllHubPlatforms(defaultPlatforms: CustomPlatformItem[]): CustomPlatformItem[] {
  const custom = getCustomPlatforms();
  const defaultHubIds = new Set(DEFAULT_HUB_PLATFORMS.map(p => p.id));
  const userCustom = custom.filter(p => !defaultHubIds.has(p.id));
  const customIds = new Set(userCustom.map(p => p.id));
  const filteredDefaults = defaultPlatforms.filter(p => !customIds.has(p.id));
  return [...DEFAULT_HUB_PLATFORMS, ...filteredDefaults, ...userCustom];
}

export function saveCustomPlatforms(items: CustomPlatformItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: items }));
  } catch (e) {
    console.warn('[customPlatforms] Save failed:', e);
  }
}

export function addCustomPlatform(item: Omit<CustomPlatformItem, 'id'>): CustomPlatformItem {
  const current = getCustomPlatforms();
  const newItem: CustomPlatformItem = {
    ...item,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    isExternal: item.route.startsWith('http://') || item.route.startsWith('https://'),
  };
  const updated = [...current, newItem];
  saveCustomPlatforms(updated);
  return newItem;
}

export function removeCustomPlatform(id: string): void {
  const current = getCustomPlatforms();
  const updated = current.filter(p => p.id !== id);
  saveCustomPlatforms(updated);
}

export function subscribeCustomPlatforms(cb: (items: CustomPlatformItem[]) => void): () => void {
  const handler = () => cb(getCustomPlatforms());
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
