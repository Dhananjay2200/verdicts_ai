/**
 * Verdicts - Frontend API Configuration Bridge.
 * Delegates to src/services/api.js so legacy callers (like AdminPortal) remain compatible.
 */
import { API_BASE_URL, buildApiUrl } from './services/api';

export const API_BASE = API_BASE_URL;

export function apiUrl(path) {
  return buildApiUrl(path);
}
