import { STORAGE_KEY } from './config.js';

/** @returns {Object|null} */
export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {Object} state */
export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage unavailable */ }
}

export function clearAppState() {
  localStorage.removeItem(STORAGE_KEY);
}
