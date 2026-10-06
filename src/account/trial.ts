import { Device } from '@capacitor/device';
import type { Timestamp } from 'firebase/firestore';
import { accountMode } from './config';
import { loadFirebase } from './firebase';
import { sha256Hex } from './sha256';
import type { Account } from './account';

// One free trial per person. The trial start is recorded in Firestore, once, under:
// - deviceTrials/{sha256(device ID)}: the device (Android's ID survives reinstalling the app), and
// - accountTrials/{sha256(email)}: a verified email, when signed in (survives new phones and re-registering).
// The app uses the earliest start it knows of. Only fingerprints are stored, never an email or device ID, and the
// Firestore rules (firebase/firestore.rules) make each record write-once with a date that can't be in the future.

const DEVICE_SALT = 'microgreen-manager:device:';

const deviceKey = async (): Promise<string | null> => {
  try {
    const { identifier } = await Device.getId();
    return identifier ? sha256Hex(DEVICE_SALT + identifier) : null;
  } catch {
    return null;
  }
};

// Reads the record, or creates it with the given start (never later than now). Returns the recorded start.
const claim = async (path: string, key: string, start: Date): Promise<Date | null> => {
  const { db, dbFns } = await loadFirebase();
  const { doc, getDoc, setDoc } = dbFns;
  const ref = doc(db, path, key);
  const existing = await getDoc(ref);
  if (existing.exists()) return (existing.data().startedAt as Timestamp).toDate();
  const startedAt = dbFns.Timestamp.fromDate(new Date(Math.min(start.getTime(), Date.now() - 60_000)));
  try {
    await setDoc(ref, { startedAt });
    return startedAt.toDate();
  } catch {
    // Created meanwhile (e.g. on another phone): read it again.
    const again = await getDoc(ref);
    return again.exists() ? (again.data().startedAt as Timestamp).toDate() : null;
  }
};

// Returns the earliest trial start for this device and account, recording it where missing. Offline or without
// Firebase, it returns the start saved on the phone.
export const syncTrialStart = async (localStart: string | undefined, account: Account | null): Promise<string | undefined> => {
  if (accountMode !== 'firebase' || !localStart) return localStart;
  const starts = [new Date(localStart)];
  try {
    const key = await deviceKey();
    if (key) {
      const d = await claim('deviceTrials', key, starts[0]);
      if (d) starts.push(d);
    }
    if (account?.verified) {
      const a = await claim('accountTrials', sha256Hex(account.email.trim().toLowerCase()), starts[0]);
      if (a) starts.push(a);
    }
  } catch (e) {
    console.warn('Could not check the free trial online:', e);
  }
  return new Date(Math.min(...starts.map(s => s.getTime()))).toISOString();
};
