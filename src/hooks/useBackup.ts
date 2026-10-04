import { useCallback, useEffect, useRef, useState } from 'react';
import { AppData } from '../types';
import { createSnapshot, listSnapshots } from '../storage/snapshots';

// Takes an on-device snapshot the first time the app is opened each day (local time).
export function useDailySnapshot(data: AppData): { lastBackup: string | null; snapshotNow: () => Promise<void> } {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const checkedRef = useRef(false);

  const snapshotNow = useCallback(async () => {
    const at = new Date();
    await createSnapshot(data, at);
    setLastBackup(at.toISOString());
  }, [data]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    listSnapshots()
      .then(list => {
        const latest = list[0]?.timestamp;
        if (latest && new Date(latest).toDateString() === new Date().toDateString()) setLastBackup(latest);
        else return snapshotNow();
      })
      .catch(e => console.error('Daily snapshot failed:', e));
  }, [snapshotNow]);

  return { lastBackup, snapshotNow };
}
