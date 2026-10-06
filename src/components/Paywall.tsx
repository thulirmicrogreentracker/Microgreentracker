import React, { useEffect, useState } from 'react';
import { X, Sprout, Check, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getPlans, Plan, PurchaseCancelled, purchasePlan, purchasesMode, restorePurchases } from '../subscription/purchases';
import { TERMS_OF_USE_URL, TRIAL_DAYS } from '../subscription/config';
import type { SubscriptionState } from '../subscription/useSubscription';
import { openExternal } from '../utils/openExternal';

export type PaywallReason = 'trial-ended' | 'upgrade';

interface PaywallProps {
  reason: PaywallReason;
  subscription: SubscriptionState;
  onClose: () => void;
  onOpenPrivacy: () => void;
}

const kindLabel: Record<Plan['kind'], string> = { yearly: 'Yearly', monthly: 'Monthly', lifetime: 'Lifetime' };
const periodLabel: Record<Plan['kind'], string> = { yearly: 'per year', monthly: 'per month', lifetime: 'one-time payment' };

const benefits = [
  'Keep starting new batches after the free trial',
  'Every feature: trays, photos, harvest weights, reports and backups',
  'Your data stays on your phone, as always',
  'Supports the development of the app',
];

const Paywall: React.FC<PaywallProps> = ({ reason, subscription, onClose, onOpenPrivacy }) => {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPlans()
      .then(p => {
        if (!alive) return;
        setPlans(p);
        setSelected(p[0]?.id ?? null);
      })
      .catch(e => {
        console.warn('Could not load plans:', e);
        if (alive) setLoadError(true);
      });
    return () => { alive = false; };
  }, []);

  const monthly = plans?.find(p => p.kind === 'monthly');
  const savingFor = (p: Plan) =>
    p.kind === 'yearly' && monthly && monthly.price > 0 && p.currencyCode === monthly.currencyCode
      ? Math.round((1 - p.price / (monthly.price * 12)) * 100)
      : 0;

  const buy = async () => {
    const plan = plans?.find(p => p.id === selected);
    if (!plan) return;
    setBusy('buy');
    setMessage(null);
    try {
      const status = await purchasePlan(plan);
      if (status.active) onClose();
      else setMessage('The purchase is pending. Pro unlocks as soon as the store confirms it.');
    } catch (e) {
      if (!(e instanceof PurchaseCancelled)) {
        console.warn('Purchase failed:', e);
        setMessage('The purchase didn\'t go through. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    try {
      const status = await restorePurchases();
      if (status.active) onClose();
      else setMessage('No earlier purchase was found for this store account.');
    } catch (e) {
      console.warn('Restore failed:', e);
      setMessage('Couldn\'t check for earlier purchases. Please check your internet connection.');
    } finally {
      setBusy(null);
    }
  };

  const store = Capacitor.getPlatform() === 'ios' ? 'App Store' : 'Google Play';
  const selectedPlan = plans?.find(p => p.id === selected);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <div className="flex justify-end px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] shrink-0">
        <button onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4">
        <div className="text-center mb-5">
          <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sprout className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Microgreen Manager Pro</h2>
          <p className="text-sm text-gray-500 mt-1">
            {reason === 'trial-ended'
              ? `Your ${TRIAL_DAYS}-day free trial has ended. Subscribe to start new batches; everything you've recorded stays available.`
              : subscription.trialEnded
                ? 'Subscribe to keep starting new batches.'
                : `${subscription.trialDaysLeft} day${subscription.trialDaysLeft === 1 ? '' : 's'} left in your free trial. Subscribe any time to keep going afterwards.`}
          </p>
        </div>

        <ul className="space-y-2 mb-5">
          {benefits.map(b => (
            <li key={b} className="flex gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>

        {subscription.pro.active ? (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm text-center font-medium">You have Pro. Thank you!</div>
        ) : plans === null && !loadError ? (
          <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : loadError || plans === null || plans.length === 0 ? (
          <div className="p-4 rounded-xl bg-gray-50 text-gray-600 text-sm text-center">
            {purchasesMode === 'off'
              ? 'Subscriptions aren\'t available in this version of the app.'
              : 'Plans couldn\'t be loaded. Please check your internet connection and try again.'}
          </div>
        ) : (
          <div role="radiogroup" aria-label="Plans" className="space-y-2">
            {plans.map(p => {
              const on = p.id === selected;
              const saving = savingFor(p);
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelected(p.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    on ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'border-emerald-600' : 'border-gray-300'}`}>
                    {on && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{kindLabel[p.kind]}</span>
                      {p.kind === 'yearly' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-emerald-600 px-1.5 py-0.5 rounded">
                          Best value{saving > 0 ? ` · save ${saving}%` : ''}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500">{periodLabel[p.kind]}</span>
                  </span>
                  <span className="text-sm font-bold text-gray-900">{p.priceString}</span>
                </button>
              );
            })}
          </div>
        )}

        {message && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mt-3">{message}</p>}
      </div>

      <div className="shrink-0 border-t border-gray-100 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
        {!subscription.pro.active && plans && plans.length > 0 && (
          <button
            onClick={buy}
            disabled={busy !== null || !selectedPlan}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy === 'buy' && <Loader2 className="w-4 h-4 animate-spin" />}
            {selectedPlan?.kind === 'lifetime' ? `Buy lifetime for ${selectedPlan.priceString}` : `Subscribe for ${selectedPlan?.priceString ?? ''}`}
          </button>
        )}
        {purchasesMode !== 'off' && !subscription.pro.active && (
          <button onClick={restore} disabled={busy !== null} className="w-full py-2 text-sm font-medium text-emerald-700 flex items-center justify-center gap-2">
            {busy === 'restore' && <Loader2 className="w-4 h-4 animate-spin" />}
            Restore purchases
          </button>
        )}
        <p className="text-[10px] leading-snug text-gray-400 text-center">
          Monthly and yearly plans renew automatically until cancelled. Cancel at least 24 hours before the renewal date
          in your {store} account settings. Lifetime is a one-time purchase.{' '}
          <button onClick={onOpenPrivacy} className="underline">Privacy policy</button>
          {' · '}
          <button onClick={() => openExternal(TERMS_OF_USE_URL)} className="underline">Terms of use</button>
        </p>
      </div>
    </div>
  );
};

export default Paywall;
