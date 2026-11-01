import { getSupabase, supabaseConfigured } from './supabase/client';
import type { Kind, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { uid } from './util';

export interface DocRow<T = unknown> {
  key: string;
  title: string;
  status: 'draft' | 'finished';
  data: T;
  updatedAt: string;
}

export interface Backend {
  mode: 'cloud' | 'local';
  userId(): Promise<string | null>;
  email(): Promise<string | null>;
  getDoc<T>(kind: Kind, key: string): Promise<DocRow<T> | null>;
  saveDoc<T>(kind: Kind, key: string, title: string, data: T): Promise<void>;
  /** Read-modify-write guarded against concurrent changes. */
  patchDoc<T>(kind: Kind, key: string, init: () => T, fn: (d: T) => T, title: string): Promise<void>;
  listDocs<T>(kind: Kind): Promise<DocRow<T>[]>;
  getProfile(): Promise<{ name: string; settings: Settings }>;
  saveProfile(name: string, settings: Settings): Promise<void>;
  uploadMedia(blob: Blob, ext: string): Promise<string>;
  mediaUrl(path: string): Promise<string>;
  signOut(): Promise<void>;
}

class BackendError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

function mergeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  return {
    works: { ...DEFAULT_SETTINGS.works, ...(s.works || {}) },
    theme: s.theme === 'dark' ? 'dark' : 'light',
    reflectDay: typeof s.reflectDay === 'string' ? s.reflectDay : DEFAULT_SETTINGS.reflectDay,
    eventsDone: s.eventsDone && typeof s.eventsDone === 'object' ? s.eventsDone : {},
  };
}

// ---------------------------------------------------------------- Supabase
function cloudBackend(): Backend {
  const sb = getSupabase();
  const urlCache = new Map<string, { url: string; exp: number }>();
  let cachedUser: string | null = null;

  async function uidOrThrow(): Promise<string> {
    if (cachedUser) return cachedUser;
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new BackendError('Not signed in', error);
    cachedUser = data.user.id;
    return cachedUser;
  }

  return {
    mode: 'cloud',
    async userId() {
      try { return await uidOrThrow(); } catch { return null; }
    },
    async email() {
      const { data } = await sb.auth.getUser();
      return data.user?.email ?? null;
    },
    async getDoc<T>(kind: Kind, key: string) {
      const owner = await uidOrThrow();
      const { data, error } = await sb.from('documents')
        .select('key,title,status,data,updated_at')
        .eq('owner_id', owner).eq('kind', kind).eq('key', key).maybeSingle();
      if (error) throw new BackendError('Could not load', error);
      if (!data) return null;
      return { key: data.key, title: data.title, status: data.status, data: data.data as T, updatedAt: data.updated_at };
    },
    async saveDoc<T>(kind: Kind, key: string, title: string, data: T) {
      const owner = await uidOrThrow();
      const { error } = await sb.from('documents').upsert(
        { owner_id: owner, kind, key, title, data },
        { onConflict: 'owner_id,kind,key' },
      );
      if (error) throw new BackendError('Could not save', error);
    },
    async patchDoc<T>(kind: Kind, key: string, init: () => T, fn: (d: T) => T, title: string) {
      const owner = await uidOrThrow();
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: row, error } = await sb.from('documents').select('data,version')
          .eq('owner_id', owner).eq('kind', kind).eq('key', key).maybeSingle();
        if (error) throw new BackendError('Could not load', error);
        if (!row) {
          const { error: insErr } = await sb.from('documents').insert({ owner_id: owner, kind, key, title, data: fn(init()) });
          if (!insErr) return;
          if (insErr.code === '23505') continue; // created meanwhile: retry as an update
          throw new BackendError('Could not save', insErr);
        }
        const { data: updated, error: upErr } = await sb.from('documents').update({ data: fn(row.data as T) })
          .eq('owner_id', owner).eq('kind', kind).eq('key', key).eq('version', row.version).select('version');
        if (upErr) throw new BackendError('Could not save', upErr);
        if (updated && updated.length) return;
      }
      throw new BackendError('Another change was saving. Try again.');
    },
    async listDocs<T>(kind: Kind) {
      const owner = await uidOrThrow();
      const { data, error } = await sb.from('documents')
        .select('key,title,status,data,updated_at')
        .eq('owner_id', owner).eq('kind', kind).order('updated_at', { ascending: false });
      if (error) throw new BackendError('Could not load', error);
      return (data || []).map((r) => ({ key: r.key, title: r.title, status: r.status, data: r.data as T, updatedAt: r.updated_at }));
    },
    async getProfile() {
      const owner = await uidOrThrow();
      const { data, error } = await sb.from('profiles').select('display_name,settings').eq('id', owner).maybeSingle();
      if (error) throw new BackendError('Could not load profile', error);
      return { name: data?.display_name ?? '', settings: mergeSettings(data?.settings) };
    },
    async saveProfile(name: string, settings: Settings) {
      const owner = await uidOrThrow();
      const { error } = await sb.from('profiles').upsert({ id: owner, display_name: name, settings });
      if (error) throw new BackendError('Could not save profile', error);
    },
    async uploadMedia(blob: Blob, ext: string) {
      const owner = await uidOrThrow();
      const path = `${owner}/${uid()}.${ext}`;
      const { error } = await sb.storage.from('media').upload(path, blob, { contentType: blob.type || undefined, upsert: false });
      if (error) throw new BackendError('Upload failed', error);
      return path;
    },
    async mediaUrl(path: string) {
      const hit = urlCache.get(path);
      if (hit && hit.exp > Date.now()) return hit.url;
      const { data, error } = await sb.storage.from('media').createSignedUrl(path, 60 * 60);
      if (error || !data) throw new BackendError('Could not open file', error);
      urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
      return data.signedUrl;
    },
    async signOut() {
      cachedUser = null;
      await sb.auth.signOut();
    },
  };
}

// ---------------------------------------------------------------- Local (this browser only)
const LS = 'nb:v1:';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('notebook-media', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function localBackend(): Backend {
  const urls = new Map<string, string>();
  const read = <T,>(k: string): T | null => {
    try { const v = localStorage.getItem(LS + k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  };
  const write = (k: string, v: unknown) => {
    try { localStorage.setItem(LS + k, JSON.stringify(v)); }
    catch (e) { throw new BackendError('Browser storage is full', e); }
  };
  return {
    mode: 'local',
    async userId() { return 'local'; },
    async email() { return null; },
    async getDoc<T>(kind: Kind, key: string) {
      return read<DocRow<T>>(`doc:${kind}:${key}`);
    },
    async saveDoc<T>(kind: Kind, key: string, title: string, data: T) {
      const prev = read<DocRow<T>>(`doc:${kind}:${key}`);
      write(`doc:${kind}:${key}`, { key, title, status: prev?.status ?? 'draft', data, updatedAt: new Date().toISOString() });
      const idx = read<string[]>(`idx:${kind}`) || [];
      if (!idx.includes(key)) write(`idx:${kind}`, [...idx, key]);
    },
    async patchDoc<T>(kind: Kind, key: string, init: () => T, fn: (d: T) => T, title: string) {
      const prev = read<DocRow<T>>(`doc:${kind}:${key}`);
      await this.saveDoc(kind, key, prev?.title || title, fn(prev ? prev.data : init()));
    },
    async listDocs<T>(kind: Kind) {
      const idx = read<string[]>(`idx:${kind}`) || [];
      return idx.map((k) => read<DocRow<T>>(`doc:${kind}:${k}`)).filter((x): x is DocRow<T> => !!x)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProfile() {
      const p = read<{ name: string; settings: Settings }>('profile');
      return { name: p?.name ?? '', settings: mergeSettings(p?.settings) };
    },
    async saveProfile(name: string, settings: Settings) { write('profile', { name, settings }); },
    async uploadMedia(blob: Blob, ext: string) {
      const path = `local/${uid()}.${ext}`;
      const db = await idb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(blob, path);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new BackendError('Could not store file', tx.error));
      });
      return path;
    },
    async mediaUrl(path: string) {
      const hit = urls.get(path);
      if (hit) return hit;
      const db = await idb();
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const req = db.transaction('files').objectStore('files').get(path);
        req.onsuccess = () => resolve(req.result as Blob | undefined);
        req.onerror = () => reject(req.error);
      });
      if (!blob) throw new BackendError('File not found');
      const url = URL.createObjectURL(blob);
      urls.set(path, url);
      return url;
    },
    async signOut() { /* nothing to do locally */ },
  };
}

let backend: Backend | null = null;
export function getBackend(): Backend {
  if (!backend) backend = supabaseConfigured() ? cloudBackend() : localBackend();
  return backend;
}
