import { emptyTask, initialState, SAVE_VERSION, type GameState } from './state';

const KEY = 'dragon-keeper:proto-save';

/** Storage can be missing or throw (private mode, cleared site data); every access is guarded. */
export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s?.version === 4) migrate4(s);
    if (s?.version !== SAVE_VERSION || s.part === 'end') return null;
    return s;
  } catch {
    return null;
  }
}

/** Chapter 1 saves (version 4) keep working: Chapter 2–3 fields start empty. */
function migrate4(s: GameState) {
  const fresh = initialState();
  s.world = { ...fresh.world, ...s.world };
  s.activity = emptyTask();
  s.task = emptyTask();
  s.evening = { ...fresh.evening, ...s.evening, special: fresh.evening.special };
  s.version = SAVE_VERSION;
}

export function writeSave(s: GameState): void {
  try {
    if (s.part === 'end') localStorage.removeItem(KEY);
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
