import { useState } from 'react';
import { BadgeCheck, LogOut, UserX } from 'lucide-react';
import { format } from 'date-fns';
import type { SubscriptionState } from '../subscription/useSubscription';
import { restorePurchases } from '../subscription/purchases';
import type { AccountState } from '../account/useAccount';
import { AccountError, deleteAccount, signOut } from '../account/account';
import { openExternal } from '../utils/openExternal';

// One line about the plan: Pro and when it renews, or how much of the free trial is left.
export const subscriptionSummary = (subscription: SubscriptionState) => {
  const { pro } = subscription;
  const planName = pro.plan === 'yearly' ? 'Yearly' : pro.plan === 'monthly' ? 'Monthly' : pro.plan === 'lifetime' ? 'Lifetime' : '';
  if (pro.active) {
    return pro.plan === 'lifetime' || !pro.expiresAt
      ? `Pro${planName ? ` · ${planName}` : ''}. Thank you!`
      : `Pro · ${planName} · ${pro.willRenew ? 'renews' : 'ends'} ${format(new Date(pro.expiresAt), 'MMM d, yyyy')}`;
  }
  if (subscription.trialEnded) return 'Free trial ended. Subscribe to start new batches; everything else keeps working.';
  return `Free trial · ${subscription.trialDaysLeft} day${subscription.trialDaysLeft === 1 ? '' : 's'} left${
    subscription.trialEndsAt ? ` (until ${format(subscription.trialEndsAt, 'MMM d, yyyy')})` : ''
  }`;
};

// Settings → Account: the optional sign-in, so Pro works on all the grower's devices.
export function AccountSettings({ accountState, onOpenAccount }: { accountState: AccountState; onOpenAccount: () => void }) {
  const [message, setMessage] = useState('');
  const { account } = accountState;

  const removeAccount = async () => {
    if (!window.confirm('Delete your account? Your name and email are removed from our sign-in service. Your batches and photos on this phone are kept, and a Pro purchase stays with your store account (use Restore purchases).')) return;
    setMessage('Deleting…');
    try {
      await deleteAccount();
      setMessage('Your account has been deleted.');
    } catch (e) {
      setMessage(e instanceof AccountError ? e.message : 'Couldn\'t delete the account right now. Please try again.');
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      {!accountState.loaded ? (
        <p className="text-sm text-gray-700">Checking…</p>
      ) : !account ? (
        <>
          <p className="text-sm text-gray-700 mb-3">Optional. Sign in so your Pro plan works on all your devices.</p>
          <button onClick={onOpenAccount} className="w-full py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            Sign in or create account
          </button>
        </>
      ) : (
        <>
          <div className="mb-3 min-w-0">
            {account.name && <p className="text-sm font-semibold text-gray-900 truncate">{account.name}</p>}
            <p className="text-sm text-gray-700 truncate">{account.email}</p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${account.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
              <BadgeCheck className="w-3.5 h-3.5" />
              {account.verified ? `Verified${account.provider === 'google' ? ' · Google' : ''}` : 'Email not confirmed yet'}
            </p>
          </div>
          <div className="flex gap-2">
            {!account.verified && (
              <button onClick={onOpenAccount} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                Confirm email
              </button>
            )}
            <button
              onClick={() => { setMessage(''); signOut().catch(() => setMessage('Couldn\'t sign out. Please try again.')); }}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
          <button onClick={removeAccount} className="mt-3 text-xs text-red-600 flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" />
            Delete account
          </button>
        </>
      )}
      {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
      {accountState.mode === 'test' && (
        <p className="text-[11px] text-amber-700 mt-2">Test mode: sign-in is simulated on this phone and no email is sent.</p>
      )}
    </div>
  );
}

// Settings → Pro plan: the trial or plan, with plans, restore and store management.
export function SubscriptionSettings({ subscription, onOpenPaywall }: { subscription: SubscriptionState; onOpenPaywall: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const { pro } = subscription;

  const restore = async () => {
    setMessage('Checking…');
    try {
      const status = await restorePurchases();
      setMessage(status.active ? 'Pro restored.' : 'No earlier purchase was found for this store account.');
    } catch {
      setMessage('Couldn\'t check right now. Please check your internet connection.');
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      <p className="text-sm text-gray-700 mb-3">{subscription.loaded ? subscriptionSummary(subscription) : 'Checking your subscription…'}</p>
      <div className="flex gap-2">
        {!pro.active && (
          <button onClick={onOpenPaywall} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            See plans
          </button>
        )}
        {pro.active && pro.managementURL && pro.plan !== 'lifetime' && (
          <button onClick={() => openExternal(pro.managementURL!)} className="flex-1 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">
            Manage subscription
          </button>
        )}
        {!pro.active && (
          <button onClick={restore} className="flex-1 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
            Restore purchases
          </button>
        )}
      </div>
      {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
      {subscription.mode === 'test' && (
        <p className="text-[11px] text-amber-700 mt-2">Test mode: plans are made up and nothing is charged.</p>
      )}
    </div>
  );
}
