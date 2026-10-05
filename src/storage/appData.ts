import { AppData } from '../types';
import { ROOT, readText, writeText } from './fs';
import { defaultAppData, fromLegacy, normalizeAppData, readLegacyLocalStorage } from './legacy';
import { deleteUnusedPhotos, photoNamesIn, savePhotoBase64 } from './photos';
import { migrateLegacySnapshots, photosInSnapshots } from './snapshots';

// 2: batches hold several trays (Batch.trays), batch/tray numbering counters, editable crop categories and loss reasons.
export const SCHEMA_VERSION = 2;

// The data is written alternately to two files, each stamped with an increasing sequence
// number. If the app is killed mid-write only the file being written is damaged, and the
// loader falls back to the other one, so a crash can never lose more than the last change.
const SLOTS = [`${ROOT}/data-a.json`, `${ROOT}/data-b.json`];

interface Envelope {
  schemaVersion: number;
  seq: number;
  savedAt: string;
  data: AppData;
}

let seq = 0;
let pending: AppData | null = null;
let writing: Promise<void> | null = null;
let loading: Promise<AppData> | null = null;

const readSlot = async (path: string): Promise<Envelope | null> => {
  const text = await readText(path);
  if (!text) return null;
  try {
    const env = JSON.parse(text) as Envelope;
    return typeof env.seq === 'number' && env.data ? env : null;
  } catch {
    return null; // partially written
  }
};

const flush = async (): Promise<void> => {
  while (pending) {
    const data = pending;
    pending = null;
    const next = seq + 1;
    const env: Envelope = { schemaVersion: SCHEMA_VERSION, seq: next, savedAt: new Date().toISOString(), data };
    try {
      await writeText(SLOTS[next % 2], JSON.stringify(env));
    } catch (e) {
      // Keep the unsaved data queued so the next change retries it, and leave seq alone so
      // the retry goes to the same file instead of overwriting the last good copy.
      pending = pending ?? data;
      throw e;
    }
    seq = next;
  }
};

// Saves are queued and coalesced: only the newest data is written once the current write finishes.
export const saveAppData = (data: AppData): Promise<void> => {
  pending = data;
  if (!writing) writing = flush().finally(() => { writing = null; });
  return writing;
};

const load = async (): Promise<AppData> => {
  const slots = (await Promise.all(SLOTS.map(readSlot))).filter((e): e is Envelope => e !== null);
  if (slots.length > 0) {
    const latest = slots.reduce((a, b) => (b.seq > a.seq ? b : a));
    seq = latest.seq;
    return normalizeAppData(latest.data);
  }

  // First launch with file storage: move data over from the old browser storage.
  // localStorage and the old IndexedDB snapshots are left untouched as a fallback.
  const legacy = readLegacyLocalStorage();
  if (!legacy) {
    const fresh = defaultAppData();
    await saveAppData(fresh);
    return fresh;
  }
  const { data, photos } = fromLegacy(legacy);
  for (const [name, base64] of Object.entries(photos)) await savePhotoBase64(name, base64);
  await migrateLegacySnapshots();
  await saveAppData(data);
  return data;
};

export const loadAppData = (): Promise<AppData> => {
  loading = loading ?? load();
  return loading;
};

// Removes photo files left behind by deleted batches. `current` must be the data as of `asOf`.
export const cleanUpPhotos = async (current: AppData, asOf: number): Promise<void> => {
  const inUse = new Set([...photoNamesIn(current), ...(await photosInSnapshots())]);
  await deleteUnusedPhotos(inUse, asOf);
};
