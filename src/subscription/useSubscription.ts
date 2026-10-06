import { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { TRIAL_DAYS } from './config';
import { getProStatus, onProStatusChange, purchasesMode, ProStatus } from './purchases';

export interface SubscriptionState {
  mode: typeof purchasesMode;
  loaded: boolean;
  pro: ProStatus;
  trialEndsAt: Date | null;
  trialDaysLeft: number;
  trialEnded: boolean;
  // After the trial, starting a new batch needs Pro. Everything else (existing batches, reports, backups) stays
  // available. Nothing is locked while subscriptions are off, or before the status has loaded.
  locked: boolean;
}

export const useSubscription = (trialStartedAt: string | undefined): SubscriptionState => {
  const [pro, setPro] = useState<ProStatus>({ active: false });
  const [loaded, setLoaded] = useState(purchasesMode === 'off');

  useEffect(() => {
    if (purchasesMode === 'off') return;
    let alive = true;
    const unsubscribe = onProStatusChange(s => alive && setPro(s));
    getProStatus()
      .then(s => alive && setPro(s))
      .catch(e => console.warn('Could not load the subscription status:', e))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const trialEndsAt = trialStartedAt ? addDays(parseISO(trialStartedAt), TRIAL_DAYS) : null;
  const now = new Date();
  const trialEnded = trialEndsAt ? now >= trialEndsAt : false;
  const trialDaysLeft = trialEndsAt ? Math.max(0, differenceInCalendarDays(trialEndsAt, now)) : TRIAL_DAYS;

  return {
    mode: purchasesMode,
    loaded,
    pro,
    trialEndsAt,
    trialDaysLeft,
    trialEnded,
    locked: purchasesMode !== 'off' && loaded && !pro.active && trialEnded,
  };
};
