/**
 * Verdicts AI - Frontend API Configuration.
 * Supports VITE_BASE_URL or VITE_API_BASE_URL, falling back to '' (same-origin / Vite proxy).
 */
const rawApiBase =
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

export const API_BASE = rawApiBase.replace(/\/+$/, '');

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
