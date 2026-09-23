import { useEffect, useRef, useState, useCallback } from 'react';

const BACKUP_DB_NAME = 'microgreen-backups';
const BACKUP_STORE = 'snapshots';
const LAST_BACKUP_KEY = 'microgreen-last-backup';
const MAX_BACKUPS = 30;

export interface BackupInfo {
  id: string;
  timestamp: string;
  size: number;
  label: string;
}

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createBackupSnapshot(): void {
  const keys = [
    'microgreen-batches',
    'microgreen-crop-types',
    'microgreen-config',
    'microgreen-reminders',
  ];
  const data: Record<string, unknown> = {};
  keys.forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw) data[k] = JSON.parse(raw);
  });

  const timestamp = new Date().toISOString();
  const snapshot = {
    id: `backup-${timestamp}`,
    timestamp,
    label: new Date().toLocaleString(),
    size: JSON.stringify(data).length,
    data,
  };

  openBackupDB().then((db) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    tx.objectStore(BACKUP_STORE).put(snapshot);
    tx.oncomplete = () => {
      localStorage.setItem(LAST_BACKUP_KEY, timestamp);
      pruneOldBackups(db);
    };
  }).catch((e) => console.error('Backup failed:', e));
}

async function pruneOldBackups(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(BACKUP_STORE, 'readwrite');
  const store = tx.objectStore(BACKUP_STORE);
  const allReq = store.getAll();
  allReq.onsuccess = () => {
    const all = allReq.result as BackupInfo[];
    if (all.length <= MAX_BACKUPS) return;
    all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const toDelete = all.slice(0, all.length - MAX_BACKUPS);
    toDelete.forEach((item) => store.delete(item.id));
  };
}

export async function listBackups(): Promise<BackupInfo[]> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const req = tx.objectStore(BACKUP_STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as BackupInfo[]).sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp)
      );
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function restoreBackup(id: string): Promise<void> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const req = tx.objectStore(BACKUP_STORE).get(id);
    req.onsuccess = () => {
      const snapshot = req.result;
      if (!snapshot) return reject(new Error('Backup not found'));
      const data = snapshot.data as Record<string, unknown>;
      Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBackup(id: string): Promise<void> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    const req = tx.objectStore(BACKUP_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function downloadBackup(id: string): void {
  openBackupDB().then((db) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const req = tx.objectStore(BACKUP_STORE).get(id);
    req.onsuccess = () => {
      const snapshot = req.result;
      if (!snapshot) return;
      const blob = new Blob([JSON.stringify(snapshot.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `microgreen-backup-${snapshot.timestamp.split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
  });
}

export function useDailyBackup(): { lastBackup: string | null; backupNow: () => void } {
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem(LAST_BACKUP_KEY)
  );
  const hasRunRef = useRef(false);

  const backupNow = useCallback(() => {
    createBackupSnapshot();
    setLastBackup(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const last = localStorage.getItem(LAST_BACKUP_KEY);
    const today = new Date().toISOString().split('T')[0];

    if (!last || last.split('T')[0] !== today) {
      createBackupSnapshot();
      setLastBackup(new Date().toISOString());
    }
  }, []);

  return { lastBackup, backupNow };
}
