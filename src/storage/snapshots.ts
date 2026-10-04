import { AppData } from '../types';
import { ROOT, deleteFile, listFiles, readText, writeText } from './fs';
import { fromLegacy, normalizeAppData, readLegacySnapshots } from './legacy';
import { photoNamesIn, savePhotoBase64 } from './photos';

// On-device snapshots of the records (photos are shared files, referenced by name).
const SNAPSHOTS = `${ROOT}/snapshots`;
const MAX_SNAPSHOTS = 30;

export interface SnapshotInfo {
  id: string;
  timestamp: string;
  label: string;
  size: number;
}

const pathOf = (id: string) => `${SNAPSHOTS}/${id}.json`;

export const listSnapshots = async (): Promise<SnapshotInfo[]> => {
  return (await listFiles(SNAPSHOTS))
    .map(f => ({ match: /^snapshot-(\d+)\.json$/.exec(f.name), size: f.size }))
    .filter(f => f.match)
    .map(({ match, size }) => {
      const date = new Date(Number(match![1]));
      return { id: `snapshot-${match![1]}`, timestamp: date.toISOString(), label: date.toLocaleString(), size };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const createSnapshot = async (data: AppData, at: Date = new Date()): Promise<void> => {
  await writeText(pathOf(`snapshot-${at.getTime()}`), JSON.stringify({ timestamp: at.toISOString(), data }));
  const all = await listSnapshots();
  await Promise.all(all.slice(MAX_SNAPSHOTS).map(s => deleteFile(pathOf(s.id)).catch(() => {})));
};

export const readSnapshot = async (id: string): Promise<AppData> => {
  const text = await readText(pathOf(id));
  if (!text) throw new Error('Snapshot not found');
  return normalizeAppData(JSON.parse(text).data ?? {});
};

export const deleteSnapshot = (id: string): Promise<void> => deleteFile(pathOf(id));

export const photosInSnapshots = async (): Promise<string[]> => {
  const names: string[] = [];
  for (const s of await listSnapshots()) {
    try {
      names.push(...photoNamesIn(await readSnapshot(s.id)));
    } catch {
      // unreadable snapshot; ignore
    }
  }
  return names;
};

// One-time move of the old IndexedDB snapshots into snapshot files.
export const migrateLegacySnapshots = async (): Promise<void> => {
  for (const legacy of await readLegacySnapshots()) {
    const { data, photos } = fromLegacy(legacy.data);
    for (const [name, base64] of Object.entries(photos)) await savePhotoBase64(name, base64);
    await createSnapshot(data, new Date(legacy.timestamp));
  }
};
