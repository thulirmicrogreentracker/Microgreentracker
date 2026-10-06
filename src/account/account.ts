import type { User } from 'firebase/auth';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { accountMode, googleWebClientId } from './config';
import { loadFirebase } from './firebase';
import { linkCustomer, unlinkCustomer } from '../subscription/purchases';

// Optional sign-in. A signed-in, verified customer is linked to RevenueCat (so Pro follows them to every device)
// and shows up by name and email in RevenueCat and in Firebase → Authentication.

export interface Account {
  uid: string;
  email: string;
  name: string;
  provider: 'google' | 'password';
  verified: boolean; // email confirmed (always true for Google)
}

export class AccountError extends Error {}

const toAccount = (user: User | null): Account | null =>
  user && user.email
    ? {
        uid: user.uid,
        email: user.email,
        name: user.displayName ?? '',
        provider: user.providerData.some(p => p.providerId === 'google.com') ? 'google' : 'password',
        verified: user.emailVerified,
      }
    : null;

// Friendly messages for the Firebase errors people can actually run into.
const explain = (e: unknown): AccountError => {
  const code = (e as { code?: string }).code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'That email and password don\'t match.',
    'auth/wrong-password': 'That email and password don\'t match.',
    'auth/user-not-found': 'There is no account with that email.',
    'auth/email-already-in-use': 'There is already an account with this email. Sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Please choose a password of at least 6 characters.',
    'auth/missing-password': 'Please enter your password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Please try again when you are online.',
    'auth/requires-recent-login': 'For your security, please sign out, sign in again, and then delete the account.',
    'auth/account-exists-with-different-credential': 'This email already has an account with a different sign-in method.',
  };
  if (messages[code]) return new AccountError(messages[code]);
  // Set-up problems (wrong keys, sign-in method not switched on, app not registered): say so instead of a generic error.
  if (/^auth\/(api-key-not-valid|invalid-api-key|configuration-not-found|operation-not-allowed|unauthorized-domain|app-not-authorized|invalid-app-credential)/.test(code)) {
    console.warn('Account set-up error:', e);
    return new AccountError(`Sign-in isn't available right now (set-up error: ${code.replace('auth/', '').split('.')[0]}). Please contact support.`);
  }
  if (e instanceof AccountError) return e;
  console.warn('Account error:', e);
  return new AccountError('Something went wrong. Please try again.');
};

// ---- test mode: in-memory accounts, so the screens can be tried without Firebase ----
let testAccount: Account | null = null;
const listeners = new Set<(a: Account | null) => void>();
const emitTest = () => listeners.forEach(l => l(testAccount));

// Keeps RevenueCat in step with who is signed in (verified accounts only).
const syncCustomer = async (account: Account | null) => {
  try {
    if (account?.verified) await linkCustomer(account.uid, account.email, account.name);
    else if (!account) await unlinkCustomer();
  } catch (e) {
    console.warn('Could not link the subscription to the account:', e);
  }
};

export const onAccountChange = (listener: (a: Account | null) => void): (() => void) => {
  if (accountMode === 'off') {
    listener(null);
    return () => {};
  }
  if (accountMode === 'test') {
    listeners.add(listener);
    listener(testAccount);
    return () => listeners.delete(listener);
  }
  let unsubscribe: (() => void) | null = null;
  let stopped = false;
  loadFirebase()
    .then(({ auth, authFns }) => {
      if (stopped) return;
      unsubscribe = authFns.onAuthStateChanged(auth, user => {
        const account = toAccount(user);
        listener(account);
        void syncCustomer(account);
      });
    })
    .catch(e => {
      console.warn('Sign-in could not start:', e);
      listener(null);
    });
  return () => {
    stopped = true;
    unsubscribe?.();
  };
};

let googleReady: Promise<void> | null = null;

export const signInWithGoogle = async (): Promise<Account> => {
  if (accountMode === 'test') {
    testAccount = { uid: 'test-google', email: 'grower@example.com', name: 'Test Grower', provider: 'google', verified: true };
    emitTest();
    return testAccount;
  }
  try {
    if (!googleReady) googleReady = SocialLogin.initialize({ google: { webClientId: googleWebClientId, mode: 'online' } });
    await googleReady;
    const res = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
    const idToken = res.result.responseType === 'online' ? res.result.idToken : null;
    if (!idToken) throw new AccountError('Google sign-in didn\'t return an account. Please try again.');
    const { auth, authFns } = await loadFirebase();
    const { user } = await authFns.signInWithCredential(auth, authFns.GoogleAuthProvider.credential(idToken));
    return toAccount(user)!;
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) throw new AccountError('');
    throw explain(e);
  }
};

export const createAccount = async (name: string, email: string, password: string): Promise<Account> => {
  if (accountMode === 'test') {
    testAccount = { uid: 'test-email', email, name, provider: 'password', verified: false };
    emitTest();
    return testAccount;
  }
  try {
    const { auth, authFns } = await loadFirebase();
    const { user } = await authFns.createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) await authFns.updateProfile(user, { displayName: name.trim() });
    await authFns.sendEmailVerification(user);
    return toAccount(user)!;
  } catch (e) {
    throw explain(e);
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<Account> => {
  if (accountMode === 'test') {
    testAccount = { uid: 'test-email', email, name: '', provider: 'password', verified: true };
    emitTest();
    return testAccount;
  }
  try {
    const { auth, authFns } = await loadFirebase();
    const { user } = await authFns.signInWithEmailAndPassword(auth, email.trim(), password);
    return toAccount(user)!;
  } catch (e) {
    throw explain(e);
  }
};

export const resendVerification = async (): Promise<void> => {
  if (accountMode !== 'firebase') return;
  const { auth, authFns } = await loadFirebase();
  const user = auth.currentUser;
  if (!user) return;
  try {
    await authFns.sendEmailVerification(user);
  } catch (e) {
    throw explain(e);
  }
};

// After the user taps the link in the email: reload the account to pick up "verified".
export const refreshAccount = async (): Promise<Account | null> => {
  if (accountMode === 'test') {
    if (testAccount) testAccount = { ...testAccount, verified: true };
    emitTest();
    return testAccount;
  }
  const { auth } = await loadFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    await user.reload();
    await user.getIdToken(true); // so the database sees the verified email too
    const account = toAccount(auth.currentUser);
    void syncCustomer(account);
    return account;
  } catch (e) {
    throw explain(e);
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  if (accountMode !== 'firebase') return;
  try {
    const { auth, authFns } = await loadFirebase();
    await authFns.sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    throw explain(e);
  }
};

export const signOut = async (): Promise<void> => {
  if (accountMode === 'test') {
    testAccount = null;
    emitTest();
    return;
  }
  const { auth, authFns } = await loadFirebase();
  await authFns.signOut(auth);
};

// Deletes the sign-in account. The batches on the phone are not affected. The one-trial record (a fingerprint of
// the email, no address) is kept so that re-registering does not start a new trial.
export const deleteAccount = async (): Promise<void> => {
  if (accountMode === 'test') {
    testAccount = null;
    emitTest();
    return;
  }
  const { auth } = await loadFirebase();
  const user = auth.currentUser;
  if (!user) return;
  try {
    await unlinkCustomer({ clearDetails: true });
    await user.delete();
  } catch (e) {
    throw explain(e);
  }
};
