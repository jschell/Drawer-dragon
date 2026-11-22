import { SAVE_VERSION, type GameState } from './state';

const KEY = 'dragon-keeper:proto-save';

/** Storage can be missing or throw (private mode, cleared site data); every access is guarded. */
export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s?.version !== SAVE_VERSION || s.phase === 'done') return null;
    return s;
  } catch {
    return null;
  }
}

export function writeSave(s: GameState): void {
  try {
    if (s.phase === 'done') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore: the prototype still plays without saving */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`dragon-keeper:pref:${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`dragon-keeper:pref:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
