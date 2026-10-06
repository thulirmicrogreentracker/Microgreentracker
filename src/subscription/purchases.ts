import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { PRO_ENTITLEMENT, revenueCatKeys, subscriptionTestMode } from './config';

// A thin layer over RevenueCat, with two other modes so the rest of the app doesn't care which one is active:
// - 'store': RevenueCat with the App Store / Google Play
// - 'test':  made-up plans (VITE_SUBSCRIPTION_TEST_MODE=1)
// - 'off':   no API key for this platform (web, development, or a build without keys); nothing is locked

export type PurchasesMode = 'store' | 'test' | 'off';
export type PlanKind = 'monthly' | 'yearly' | 'lifetime';

export interface Plan {
  id: string;
  kind: PlanKind;
  title: string;
  priceString: string; // localised by the store, e.g. "₹299.00"
  price: number;
  currencyCode: string;
  pkg?: PurchasesPackage; // the RevenueCat package, in store mode
}

export interface ProStatus {
  active: boolean;
  plan?: PlanKind | 'other';
  expiresAt?: string | null; // null for lifetime
  willRenew?: boolean;
  managementURL?: string | null; // the store's subscription settings
}

export class PurchaseCancelled extends Error {}

const platformKey = () => (Capacitor.getPlatform() === 'ios' ? revenueCatKeys.ios : Capacitor.getPlatform() === 'android' ? revenueCatKeys.android : '');

export const purchasesMode: PurchasesMode = subscriptionTestMode
  ? 'test'
  : Capacitor.isNativePlatform() && platformKey() ? 'store' : 'off';

const planKind = (packageType: string, productId = ''): PlanKind | 'other' => {
  if (packageType === 'MONTHLY') return 'monthly';
  if (packageType === 'ANNUAL') return 'yearly';
  if (packageType === 'LIFETIME') return 'lifetime';
  if (/month/i.test(productId)) return 'monthly';
  if (/year|annual/i.test(productId)) return 'yearly';
  if (/lifetime/i.test(productId)) return 'lifetime';
  return 'other';
};

const statusFrom = (info: CustomerInfo): ProStatus => {
  const pro = info.entitlements.active[PRO_ENTITLEMENT];
  if (!pro?.isActive) return { active: false, managementURL: info.managementURL };
  return {
    active: true,
    plan: pro.expirationDate ? planKind('', pro.productIdentifier) : 'lifetime',
    expiresAt: pro.expirationDate,
    willRenew: pro.willRenew,
    managementURL: info.managementURL,
  };
};

// ---- test mode: in-memory only, so a restart goes back to "not subscribed" ----
let testStatus: ProStatus = { active: false };
const testPlans: Plan[] = [
  { id: 'test_yearly', kind: 'yearly', title: 'Yearly', priceString: '₹1,999.00', price: 1999, currencyCode: 'INR' },
  { id: 'test_monthly', kind: 'monthly', title: 'Monthly', priceString: '₹249.00', price: 249, currencyCode: 'INR' },
  { id: 'test_lifetime', kind: 'lifetime', title: 'Lifetime', priceString: '₹4,999.00', price: 4999, currencyCode: 'INR' },
];

const listeners = new Set<(s: ProStatus) => void>();
const emit = (s: ProStatus) => listeners.forEach(l => l(s));

let configured: Promise<void> | null = null;

// Sets RevenueCat up once (store mode). Customers are anonymous: RevenueCat makes a random ID per install, and the
// store account restores purchases on another phone.
export const initPurchases = (): Promise<void> => {
  if (purchasesMode !== 'store') return Promise.resolve();
  if (!configured) {
    configured = (async () => {
      if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey: platformKey() });
      await Purchases.addCustomerInfoUpdateListener(info => emit(statusFrom(info)));
    })();
  }
  return configured;
};

export const onProStatusChange = (listener: (s: ProStatus) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getProStatus = async (): Promise<ProStatus> => {
  if (purchasesMode === 'test') return testStatus;
  if (purchasesMode === 'off') return { active: false };
  await initPurchases();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return statusFrom(customerInfo);
};

// The plans on sale, yearly first. Comes from the "current" offering in RevenueCat.
export const getPlans = async (): Promise<Plan[]> => {
  if (purchasesMode === 'test') return testPlans;
  if (purchasesMode === 'off') return [];
  await initPurchases();
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const order: Record<string, number> = { yearly: 0, monthly: 1, lifetime: 2, other: 3 };
  return packages
    .map(pkg => {
      const kind = planKind(pkg.packageType, pkg.product.identifier);
      return {
        id: pkg.identifier,
        kind: kind === 'other' ? 'monthly' : kind,
        title: pkg.product.title,
        priceString: pkg.product.priceString,
        price: pkg.product.price,
        currencyCode: pkg.product.currencyCode,
        pkg,
      } as Plan;
    })
    .sort((a, b) => order[a.kind] - order[b.kind]);
};

// Buys a plan. Throws PurchaseCancelled when the user backs out of the store's sheet.
export const purchasePlan = async (plan: Plan): Promise<ProStatus> => {
  if (purchasesMode === 'test') {
    testStatus = {
      active: true,
      plan: plan.kind,
      expiresAt: plan.kind === 'lifetime' ? null : new Date(Date.now() + (plan.kind === 'yearly' ? 365 : 30) * 864e5).toISOString(),
      willRenew: plan.kind !== 'lifetime',
    };
    emit(testStatus);
    return testStatus;
  }
  if (purchasesMode === 'off' || !plan.pkg) throw new Error('Purchases are not available in this version of the app.');
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: plan.pkg });
    const status = statusFrom(customerInfo);
    emit(status);
    return status;
  } catch (e) {
    if ((e as { userCancelled?: boolean | null }).userCancelled) throw new PurchaseCancelled();
    throw e;
  }
};

// Restores earlier purchases made with the same App Store / Google Play account (e.g. on a new phone).
export const restorePurchases = async (): Promise<ProStatus> => {
  if (purchasesMode === 'test') return testStatus;
  if (purchasesMode === 'off') return { active: false };
  await initPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  const status = statusFrom(customerInfo);
  emit(status);
  return status;
};

// Links purchases to a signed-in customer: the RevenueCat customer ID becomes their account ID, so Pro follows them
// to every device (Android and iPhone), and their name and email show in RevenueCat. Purchases made before signing
// in move to the account.
export const linkCustomer = async (uid: string, email: string, name: string): Promise<void> => {
  if (purchasesMode !== 'store') return;
  await initPurchases();
  const { customerInfo } = await Purchases.logIn({ appUserID: uid });
  emit(statusFrom(customerInfo));
  await Purchases.setAttributes({ $email: email, $displayName: name || null });
};

// Back to an anonymous customer after signing out. With clearDetails (account deletion), the name and email are
// removed from RevenueCat first.
export const unlinkCustomer = async ({ clearDetails = false } = {}): Promise<void> => {
  if (purchasesMode !== 'store') return;
  await initPurchases();
  const { isAnonymous } = await Purchases.isAnonymous();
  if (isAnonymous) return;
  if (clearDetails) await Purchases.setAttributes({ $email: null, $displayName: null });
  const { customerInfo } = await Purchases.logOut();
  emit(statusFrom(customerInfo));
};
