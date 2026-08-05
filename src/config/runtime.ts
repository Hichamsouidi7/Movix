const normalizeBaseUrl = (value?: string): string => (value || '').trim().replace(/\/+$/, '');

export const SITE_URL = normalizeBaseUrl(import.meta.env.VITE_SITE_URL as string) ||
  (typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '');

export const WATCHPARTY_API = normalizeBaseUrl(import.meta.env.VITE_WATCHPARTY_API as string) ||
  normalizeBaseUrl(import.meta.env.VITE_MAIN_API as string);

const getProxyEmbedUrl = (val?: string): string => {
  const norm = normalizeBaseUrl(val);
  if (!norm || norm.includes('localhost:25569')) {
    return 'https://proxiesembed.movix.show';
  }
  return norm;
};

export const PROXY_BASE_URL = getProxyEmbedUrl(import.meta.env.VITE_PROXY_BASE_URL as string);
export const MAIN_API = normalizeBaseUrl(import.meta.env.VITE_MAIN_API as string) || 'https://api.movix.show';
export const PROXIES_EMBED_API = getProxyEmbedUrl(import.meta.env.VITE_PROXIES_EMBED_API as string);
export const BESTDEBRID_API_BASE = 'https://bestdebrid.com/api/v1';

export const buildSiteUrl = (path: string): string => {
  if (!SITE_URL) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const buildProxyUrl = (url: string): string => {
  if (!PROXY_BASE_URL) return url;
  return `${PROXY_BASE_URL}/proxy/${url}`;
};
