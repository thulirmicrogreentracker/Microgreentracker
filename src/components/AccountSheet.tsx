import React, { useState } from 'react';
import { ChevronLeft, Loader2, Mail, MailCheck, UserRound } from 'lucide-react';
import {
  Account, AccountError, createAccount, refreshAccount, resendVerification, sendPasswordReset, signInWithEmail,
  signInWithGoogle, signOut,
} from '../account/account';
import { googleSignInAvailable } from '../account/config';

type Screen = 'start' | 'signin' | 'signup' | 'reset' | 'verify';

interface AccountSheetProps {
  account: Account | null; // an unverified email account opens on the "confirm your email" screen
  onClose: () => void;
  onOpenPrivacy: () => void;
}

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

// Google's "G" mark, drawn inline (no external image).
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

// Optional sign-in: Google (Android) or email + password with a confirmation email.
const AccountSheet: React.FC<AccountSheetProps> = ({ account, onClose, onOpenPrivacy }) => {
  const [screen, setScreen] = useState<Screen>(account && !account.verified ? 'verify' : 'start');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await task();
    } catch (e) {
      setError(e instanceof AccountError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const afterSignIn = (a: Account) => {
    if (a.verified) onClose();
    else setScreen('verify');
  };

  const title: Record<Screen, string> = {
    start: 'Sign in',
    signin: 'Sign in with email',
    signup: 'Create account',
    reset: 'Reset password',
    verify: 'Confirm your email',
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-gray-100 shrink-0">
        <button
          onClick={() => (screen === 'start' || screen === 'verify' ? onClose() : setScreen(screen === 'reset' ? 'signin' : 'start'))}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900">{title[screen]}</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">
        {screen === 'start' && (
          <>
            <div className="text-center">
              <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <UserRound className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-600">
                Signing in is optional. It lets your Pro subscription work on all your devices and helps us support you.
                Your batches and photos stay on your phone either way.
              </p>
            </div>
            {googleSignInAvailable && (
              <button
                onClick={() => run(async () => afterSignIn(await signInWithGoogle()))}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-300 bg-white font-medium text-gray-800 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleMark />}
                Continue with Google
              </button>
            )}
            <button
              onClick={() => setScreen('signin')}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-300 bg-white font-medium text-gray-800"
            >
              <Mail className="w-5 h-5 text-gray-500" />
              Continue with email
            </button>
          </>
        )}

        {(screen === 'signin' || screen === 'signup') && (
          <form
            onSubmit={e => {
              e.preventDefault();
              run(async () =>
                afterSignIn(screen === 'signup' ? await createAccount(name, email, password) : await signInWithEmail(email, password)),
              );
            }}
            className="space-y-3"
          >
            {screen === 'signup' && (
              <div>
                <label htmlFor="acct-name" className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                <input id="acct-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={inputClass} required />
              </div>
            )}
            <div>
              <label htmlFor="acct-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="acct-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" className={inputClass} required />
            </div>
            <div>
              <label htmlFor="acct-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                id="acct-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={screen === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                className={inputClass}
                required
              />
              {screen === 'signup' && <p className="text-xs text-gray-500 mt-1">At least 6 characters.</p>}
            </div>
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {screen === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setScreen(screen === 'signup' ? 'signin' : 'signup'); setError(''); }} className="text-emerald-700 font-medium">
                {screen === 'signup' ? 'I already have an account' : 'Create an account'}
              </button>
              {screen === 'signin' && (
                <button type="button" onClick={() => { setScreen('reset'); setError(''); }} className="text-gray-500">
                  Forgot password?
                </button>
              )}
            </div>
            {screen === 'signup' && (
              <p className="text-xs text-gray-500">
                We'll email you a link to confirm your address. See the{' '}
                <button type="button" onClick={onOpenPrivacy} className="underline">privacy policy</button>.
              </p>
            )}
          </form>
        )}

        {screen === 'reset' && (
          <form
            onSubmit={e => {
              e.preventDefault();
              run(async () => {
                await sendPasswordReset(email);
                setNote(`If there is an account for ${email}, we've emailed a link to set a new password.`);
              });
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="acct-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="acct-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" className={inputClass} required />
            </div>
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60">
              Send reset link
            </button>
          </form>
        )}

        {screen === 'verify' && (
          <div className="space-y-4 text-center">
            <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
              <MailCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600">
              We sent a confirmation link to <span className="font-semibold text-gray-900">{account?.email || email}</span>.
              Open the email, tap the link, then come back and tap the button below. (Check your spam folder if you
              can't find it.)
            </p>
            <button
              onClick={() => run(async () => {
                const a = await refreshAccount();
                if (a?.verified) onClose();
                else setNote('Not confirmed yet. Tap the link in the email first.');
              })}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              I've confirmed my email
            </button>
            <div className="flex justify-between text-sm">
              <button onClick={() => run(async () => { await resendVerification(); setNote('Sent again.'); })} className="text-emerald-700 font-medium">
                Send the email again
              </button>
              <button onClick={() => run(async () => { await signOut(); setScreen('start'); })} className="text-gray-500">
                Use another account
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
        {note && <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-3">{note}</p>}
      </div>
    </div>
  );
};

export default AccountSheet;
