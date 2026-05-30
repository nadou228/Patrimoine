/** URL de base de l'API (vide en dev = proxy Vite vers :8082). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:8082');

export const resolveApiUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalized;
  }
  return `${API_BASE_URL.replace(/\/$/, '')}${normalized}`;
};
