import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { accountMode, firebaseConfig } from './config';

// Firebase is loaded only when the app is configured for it (and only on first use), so builds without Firebase
// settings never download or start it.
export interface FirebaseKit {
  auth: Auth;
  db: Firestore;
  authFns: typeof import('firebase/auth');
  dbFns: typeof import('firebase/firestore');
}

let kit: Promise<FirebaseKit> | null = null;

export const loadFirebase = (): Promise<FirebaseKit> => {
  if (accountMode !== 'firebase') return Promise.reject(new Error('Sign-in is not set up in this version of the app.'));
  if (!kit) {
    kit = (async () => {
      const [{ initializeApp }, authFns, dbFns] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(firebaseConfig);
      // IndexedDB keeps the sign-in across restarts inside the app's web view.
      const auth = authFns.initializeAuth(app, { persistence: authFns.indexedDBLocalPersistence });
      return { auth, db: dbFns.getFirestore(app), authFns, dbFns };
    })();
  }
  return kit;
};
