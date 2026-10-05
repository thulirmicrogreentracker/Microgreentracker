import { useCallback, useEffect, useRef, useState } from 'react';
import { AppData } from '../types';
import { cleanUpPhotos, loadAppData, saveAppData } from '../storage/appData';

export type UpdateAppData = (fn: (prev: AppData) => AppData) => void;

// Loads the app data from device storage and writes every change back.
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef<AppData | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    loadAppData()
      .then(loaded => {
        savedRef.current = loaded;
        setData(loaded);
        cleanUpPhotos(loaded, startedAt).catch(e => console.error('Photo clean-up failed:', e));
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const save = useCallback((next: AppData) => {
    saveAppData(next).then(
      () => setSaveError(null),
      e => {
        console.error('Save failed:', e);
        setSaveError(e instanceof Error ? e.message : String(e));
      }
    );
  }, []);

  useEffect(() => {
    if (!data || data === savedRef.current) return;
    savedRef.current = data;
    save(data);
  }, [data, save]);

  // Always derive from the latest state so quick successive changes can't overwrite each other.
  const update: UpdateAppData = useCallback(fn => setData(prev => (prev ? fn(prev) : prev)), []);

  const retrySave = useCallback(() => {
    if (data) save(data);
  }, [data, save]);

  return { data, loadError, saveError, retrySave, update };
}
