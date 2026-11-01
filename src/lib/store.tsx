'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getBackend } from './backend';
import type { Kind, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

interface AppCtx {
  ready: boolean;
  mode: 'cloud' | 'local';
  name: string;
  email: string | null;
  settings: Settings;
  setName(name: string): void;
  updateSettings(fn: (s: Settings) => Settings): void;
  toast: string;
  say(msg: string): void;
  /** Bumped whenever a month document is saved so lists can refresh. */
  monthsRev: number;
  bumpMonths(): void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const backend = getBackend();
  const [ready, setReady] = useState(false);
  const [name, setNameState] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState('');
  const [monthsRev, setMonthsRev] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ name: '', settings: DEFAULT_SETTINGS });
  // Never write the profile until the real one has loaded, or defaults would overwrite it.
  const loaded = useRef(false);
  const dirty = useRef(false);

  const say = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const bumpMonths = useCallback(() => setMonthsRev((n) => n + 1), []);

  const persist = useCallback(() => {
    if (!loaded.current) { dirty.current = true; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async function run() {
      try {
        await backend.saveProfile(latest.current.name, latest.current.settings);
      } catch {
        say('Profile didn’t save. Retrying…');
        saveTimer.current = setTimeout(run, 4000);
      }
    }, 600);
  }, [backend, say]);

  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const load = async (attempt: number) => {
      try {
        const [p, e] = await Promise.all([backend.getProfile(), backend.email()]);
        if (!alive) return;
        // Edits made while loading win over what the server had.
        const merged = dirty.current ? latest.current : { name: p.name, settings: p.settings };
        latest.current = merged;
        setNameState(merged.name);
        setSettings(merged.settings);
        setEmail(e);
        loaded.current = true;
        setReady(true);
        if (dirty.current) { dirty.current = false; persist(); }
      } catch {
        if (!alive) return;
        setReady(true);
        if (attempt === 0) say('Couldn’t load your profile. Retrying…');
        retry = setTimeout(() => load(attempt + 1), Math.min(30000, 2000 * 2 ** attempt));
      }
    };
    void load(0);
    return () => { alive = false; if (retry) clearTimeout(retry); };
  }, [backend, say, persist]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const setName = useCallback((n: string) => {
    latest.current = { ...latest.current, name: n };
    setNameState(n);
    persist();
  }, [persist]);

  const updateSettings = useCallback((fn: (s: Settings) => Settings) => {
    setSettings((prev) => {
      const next = fn(prev);
      latest.current = { ...latest.current, settings: next };
      return next;
    });
    persist();
  }, [persist]);

  const value = useMemo<AppCtx>(() => ({
    ready, mode: backend.mode, name, email, settings, setName, updateSettings, toast, say, monthsRev, bumpMonths,
  }), [ready, backend.mode, name, email, settings, setName, updateSettings, toast, say, monthsRev, bumpMonths]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}

// ------------------------------------------------------------------ Unsaved backups (per user)
const BACKUP_PREFIX = 'nb:unsaved:';

interface Backup<T> { savedAt: string; data: T }

function readBackup<T>(k: string): Backup<T> | null {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const v = JSON.parse(raw) as Backup<T>;
    return v && typeof v.savedAt === 'string' && 'data' in v ? v : null;
  } catch { return null; }
}

/** Remove every unsaved backup on this device (on sign-out). */
export function clearBackups() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(BACKUP_PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

/**
 * Load a document and keep it saved. Edits apply immediately and are written after a short
 * pause, one save at a time. A failed save keeps a timestamped copy on this device and retries;
 * the copy is only used on the next load if it is newer than the server's.
 */
export function useDoc<T>(kind: Kind, key: string, init: () => T, titleOf?: (d: T) => string) {
  const backend = getBackend();
  const { say, bumpMonths } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const latest = useRef<T | null>(null);   // newest in-memory version
  const unsaved = useRef(false);           // latest has changes not yet written
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const backupKey = useRef<string | null>(null);
  const initRef = useRef(init);
  const titleRef = useRef(titleOf);
  titleRef.current = titleOf;
  const sayRef = useRef(say); sayRef.current = say;
  const bumpRef = useRef(bumpMonths); bumpRef.current = bumpMonths;

  const flushRef = useRef<() => Promise<void>>(async () => {});
  flushRef.current = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current || !unsaved.current || latest.current == null) return;
    const doc = latest.current;
    inFlight.current = true;
    unsaved.current = false;
    setStatus('saving');
    try {
      await backend.saveDoc(kind, key, titleRef.current ? titleRef.current(doc) : '', doc);
      attempts.current = 0;
      if (!unsaved.current && backupKey.current) {
        try { localStorage.removeItem(backupKey.current); } catch { /* ignore */ }
      }
      if (kind === 'month') bumpRef.current();
      inFlight.current = false;
      if (unsaved.current) void flushRef.current(); else setStatus('saved');
    } catch {
      inFlight.current = false;
      unsaved.current = true;
      if (backupKey.current) {
        const copy: Backup<T> = { savedAt: new Date().toISOString(), data: latest.current as T };
        try { localStorage.setItem(backupKey.current, JSON.stringify(copy)); } catch { /* ignore */ }
      }
      setStatus('error');
      attempts.current += 1;
      if (attempts.current === 1) sayRef.current('Not saved yet. Your changes are kept on this device.');
      timer.current = setTimeout(() => { void flushRef.current(); }, Math.min(30000, 2000 * 2 ** (attempts.current - 1)));
    }
  };

  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const flushThisDoc = flushRef.current; // bound to this kind/key
    latest.current = null; unsaved.current = false; attempts.current = 0;
    setStatus('loading');
    setData(null);
    const load = async (attempt: number) => {
      const uid = (await backend.userId()) ?? 'anon';
      backupKey.current = `${BACKUP_PREFIX}${uid}:${kind}:${key}`;
      const backup = readBackup<T>(backupKey.current);
      let row: { data: T; updatedAt: string } | null = null;
      try {
        row = await backend.getDoc<T>(kind, key);
      } catch {
        if (!alive) return;
        if (backup) {
          // Work from the device copy; it will be written once the server is reachable.
          latest.current = backup.data; unsaved.current = true;
          setData(backup.data); setStatus('error');
          timer.current = setTimeout(() => { void flushRef.current(); }, 3000);
          return;
        }
        if (attempt === 0) sayRef.current('Couldn’t reach your notebook. Retrying…');
        setStatus('error');
        retry = setTimeout(() => load(attempt + 1), Math.min(30000, 2000 * 2 ** attempt));
        return;
      }
      if (!alive) return;
      const useBackup = !!backup && (!row || backup.savedAt > row.updatedAt);
      const value = useBackup ? backup!.data : row ? row.data : initRef.current();
      latest.current = value;
      setData(value);
      setStatus('saved');
      if (useBackup) { unsaved.current = true; void flushRef.current(); }
      else if (backup) { try { localStorage.removeItem(backupKey.current!); } catch { /* ignore */ } }
    };
    void load(0);
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      void flushThisDoc();
    };
  }, [backend, kind, key]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flushRef.current(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  const update = useCallback((fn: (d: T) => T) => {
    const prev = latest.current;
    if (prev == null) return; // not loaded yet: edits are not accepted
    const next = fn(prev);
    if (next === prev) return;
    latest.current = next;
    unsaved.current = true;
    setData(next);
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flushRef.current(); }, 700);
  }, []);

  const flush = useCallback(() => flushRef.current(), []);

  return { data, update, status, flush };
}

/** List documents of a kind. Refreshes when `rev` changes. */
export function useDocList<T>(kind: Kind, rev = 0) {
  const backend = getBackend();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof backend.listDocs<T>>> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    backend.listDocs<T>(kind)
      .then((r) => { if (alive) { setRows(r); setError(false); } })
      .catch(() => { if (alive) { setError(true); setRows((x) => x ?? []); } });
    return () => { alive = false; };
  }, [backend, kind, rev]);
  return { rows, error };
}

/** Change another document safely (e.g. sending a note into the script). Retries on conflicts. */
export async function patchDoc<T>(kind: Kind, key: string, init: () => T, fn: (d: T) => T, title = '') {
  await getBackend().patchDoc(kind, key, init, fn, title);
}
