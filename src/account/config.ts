import { Capacitor } from '@capacitor/core';

// Firebase (free Spark plan) for optional sign-in and the one-trial-per-person records. See docs/accounts.md.
// The web config values come from Firebase console → Project settings → Your apps → Web app. They are not secret
// (they identify the project; access is controlled by the Firestore rules in firebase/firestore.rules).
export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '',
};

// The "Web client ID" of the Google sign-in provider (Firebase console → Authentication → Sign-in method → Google).
export const googleWebClientId = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined) || '';

// VITE_ACCOUNT_TEST_MODE=1 fakes sign-in (no Firebase), for checking the screens. Never set it for a store build.
const testMode = import.meta.env.VITE_ACCOUNT_TEST_MODE === '1';

export type AccountMode = 'firebase' | 'test' | 'off';
export const accountMode: AccountMode = testMode
  ? 'test'
  : firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId ? 'firebase' : 'off';

// Google sign-in is offered on Android only: on iPhone, Apple requires "Sign in with Apple" alongside any
// third-party sign-in, so the iPhone app offers email sign-in until Apple sign-in is added.
export const googleSignInAvailable =
  accountMode === 'test' || (accountMode === 'firebase' && Capacitor.getPlatform() === 'android' && !!googleWebClientId);
