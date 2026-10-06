import { strFromU8, strToU8, unzipSync, zipSync, Zippable } from 'fflate';
import { AppData } from '../types';
import { saveFile } from '../utils/saveFile';
import { SCHEMA_VERSION } from './appData';
import { base64ToBytes, bytesToBase64 } from './fs';
import { fromLegacy, isLegacyRecord, normalizeAppData } from './legacy';
import { isSafePhotoName, photoNamesIn, readPhotoBase64, savePhotoBase64 } from './photos';
import { appInfo } from '../data/appInfo';

// A backup file is a .zip holding backup.json (all records) and photos/<name> for every photo.
const FORMAT = 'microgreen-manager-backup';
const MANIFEST = 'backup.json';

export interface ParsedBackup {
  data: AppData;
  photos: Record<string, string>; // name → base64
  createdAt?: string;
}

const localDateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const exportBackupFile = async (data: AppData): Promise<void> => {
  const manifest = { format: FORMAT, schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), data };
  const files: Zippable = { [MANIFEST]: strToU8(JSON.stringify(manifest)) };
  for (const name of new Set(photoNamesIn(data))) {
    try {
      files[`photos/${name}`] = [base64ToBytes(await readPhotoBase64(name)), { level: 0 }]; // already compressed
    } catch {
      // photo file missing on this device; the record is still backed up
    }
  }
  await saveFile(`thulir-microgreen-backup-${localDateStamp()}.zip`, zipSync(files), 'application/zip');
};

// Reads a backup chosen by the user without changing anything yet.
// Also accepts the .json files the app produced before backups became .zip files.
export const parseBackupFile = async (file: File): Promise<ParsedBackup> => {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] === 0x7b /* '{' */) {
    let raw: unknown;
    try {
      raw = JSON.parse(strFromU8(bytes));
    } catch {
      throw new Error(`This file is not a ${appInfo.appName} backup.`);
    }
    if (!isLegacyRecord(raw)) throw new Error(`This file is not a ${appInfo.appName} backup.`);
    return fromLegacy(raw);
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error(`This file is not a ${appInfo.appName} backup.`);
  }
  const manifestBytes = entries[MANIFEST];
  if (!manifestBytes) throw new Error(`This file is not a ${appInfo.appName} backup.`);
  const manifest = JSON.parse(strFromU8(manifestBytes));
  if (manifest.format !== FORMAT || !manifest.data) throw new Error(`This file is not a ${appInfo.appName} backup.`);
  if (manifest.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Please update the app first.');
  }

  const photos: Record<string, string> = {};
  for (const [path, content] of Object.entries(entries)) {
    const name = path.startsWith('photos/') ? path.slice('photos/'.length) : '';
    if (isSafePhotoName(name)) photos[name] = bytesToBase64(content);
  }
  return { data: normalizeAppData(manifest.data), photos, createdAt: manifest.createdAt };
};

// Writes the backup's photos; the caller then replaces the app data with `backup.data`.
export const writeBackupPhotos = async (backup: ParsedBackup): Promise<void> => {
  for (const [name, base64] of Object.entries(backup.photos)) await savePhotoBase64(name, base64);
};
