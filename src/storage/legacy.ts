import { AppData, Batch, BatchPhoto } from '../types';
import { defaultCropTypes } from '../data/cropTypes';
import { isSafePhotoName } from './photos';

// Before version 1 of the storage format, data lived in localStorage under these keys,
// photos were embedded as data: URLs, and daily snapshots / downloaded .json backups
// used the same key → value shape.
const LEGACY_KEYS = {
  batches: 'microgreen-batches',
  cropTypes: 'microgreen-crop-types',
  config: 'microgreen-config',
  reminders: 'microgreen-reminders',
} as const;

export type LegacyRecord = Partial<Record<(typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS], unknown>>;

export const defaultAppData = (): AppData => ({
  batches: [],
  cropTypes: defaultCropTypes,
  config: { totalTrays: 10, trayNumberPrefix: 'Tray' },
  reminders: [],
});

// Fills in anything missing so older or hand-edited data can't crash the app.
export const normalizeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultAppData();
  return {
    batches: (Array.isArray(raw.batches) ? raw.batches : []).map((b: Batch) => ({
      ...b,
      notes: Array.isArray(b.notes) ? b.notes : [],
      photos: Array.isArray(b.photos) ? b.photos : [],
      watering: Array.isArray(b.watering) ? b.watering : [],
      lighting: Array.isArray(b.lighting) ? b.lighting : [],
    })),
    cropTypes: Array.isArray(raw.cropTypes) && raw.cropTypes.length > 0 ? raw.cropTypes : defaults.cropTypes,
    config: { ...defaults.config, ...(raw.config ?? {}) },
    reminders: Array.isArray(raw.reminders) ? raw.reminders : [],
  };
};

export const isLegacyRecord = (raw: unknown): raw is LegacyRecord =>
  typeof raw === 'object' && raw !== null && Object.values(LEGACY_KEYS).some(k => k in raw);

export const readLegacyLocalStorage = (): LegacyRecord | null => {
  const record: LegacyRecord = {};
  for (const key of Object.values(LEGACY_KEYS)) {
    try {
      const value = localStorage.getItem(key);
      if (value) record[key] = JSON.parse(value);
    } catch {
      // unreadable key; skip it
    }
  }
  return Object.keys(record).length > 0 ? record : null;
};

// Converts the old shape. Embedded photos are returned separately (name → base64) for the caller to write.
export const fromLegacy = (raw: LegacyRecord): { data: AppData; photos: Record<string, string> } => {
  const photos: Record<string, string> = {};
  const batches = (Array.isArray(raw[LEGACY_KEYS.batches]) ? raw[LEGACY_KEYS.batches] as Batch[] : []).map(batch => ({
    ...batch,
    photos: (Array.isArray(batch.photos) ? batch.photos : []).flatMap((photo: BatchPhoto & { url?: string }) => {
      if (photo.file) return [photo];
      const match = /^data:image\/([a-z]+);base64,(.+)$/s.exec(photo.url ?? '');
      if (!match) return [];
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const id = String(photo.id).replace(/[^A-Za-z0-9_-]/g, '') || Math.random().toString(36).slice(2);
      const name = `${id}.${ext}`;
      if (!isSafePhotoName(name)) return [];
      photos[name] = match[2];
      const { url: _url, ...rest } = photo; // eslint-disable-line @typescript-eslint/no-unused-vars
      return [{ ...rest, file: name }];
    }),
  }));

  return {
    data: normalizeAppData({
      batches,
      cropTypes: raw[LEGACY_KEYS.cropTypes] as AppData['cropTypes'],
      config: raw[LEGACY_KEYS.config] as AppData['config'],
      reminders: raw[LEGACY_KEYS.reminders] as AppData['reminders'],
    }),
    photos,
  };
};

// Daily snapshots used to be kept in IndexedDB. Reads them without creating the database if it never existed.
export const readLegacySnapshots = (): Promise<{ timestamp: string; data: LegacyRecord }[]> =>
  new Promise(resolve => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open('microgreen-backups');
    } catch {
      return resolve([]);
    }
    req.onupgradeneeded = () => req.transaction?.abort(); // database didn't exist
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.close();
        return resolve([]);
      }
      const all = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll();
      all.onsuccess = () => {
        db.close();
        resolve((all.result as { timestamp: string; data: LegacyRecord }[]).filter(s => s.timestamp && s.data));
      };
      all.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
