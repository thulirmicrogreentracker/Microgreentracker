import { ShopSettings } from '../types';

// Colours offered for Shop mode (the switch, the bottom bar's bubble and Shop's highlights). Each is dark enough for
// white text on it.
export const shopAccents: { key: string; label: string; color: string }[] = [
  { key: 'terracotta', label: 'Terracotta', color: '#c2552d' },
  { key: 'blue', label: 'Blue', color: '#2563a8' },
  { key: 'purple', label: 'Purple', color: '#6b4fbb' },
  { key: 'pink', label: 'Pink', color: '#b83a6e' },
  { key: 'amber', label: 'Amber', color: '#a86412' },
  { key: 'teal', label: 'Teal', color: '#0f7a73' },
];

// Currencies offered for prices; any ISO 4217 code works with formatMoney.
export const currencies: { code: string; label: string }[] = [
  { code: 'INR', label: 'Indian rupee (₹)' },
  { code: 'LKR', label: 'Sri Lankan rupee (Rs)' },
  { code: 'MYR', label: 'Malaysian ringgit (RM)' },
  { code: 'SGD', label: 'Singapore dollar (S$)' },
  { code: 'AED', label: 'UAE dirham (AED)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British pound (£)' },
  { code: 'CAD', label: 'Canadian dollar (CA$)' },
  { code: 'AUD', label: 'Australian dollar (A$)' },
];

export const defaultShopSettings = (): ShopSettings => ({ enabled: true, accent: 'terracotta', currency: 'INR' });

export const accentColor = (key: string): string =>
  (shopAccents.find(a => a.key === key) ?? shopAccents[0]).color;

const isCurrencyCode = (code: unknown): code is string => {
  if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
};

// Fills in anything missing or invalid in saved Shop settings.
export const normalizeShopSettings = (value: unknown): ShopSettings => {
  const defaults = defaultShopSettings();
  const v = (value && typeof value === 'object' ? value : {}) as Partial<ShopSettings>;
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : defaults.enabled,
    accent: shopAccents.some(a => a.key === v.accent) ? v.accent! : defaults.accent,
    currency: isCurrencyCode(v.currency) ? v.currency : defaults.currency,
  };
};

// "₹1,250" or "₹1,250.50", in the phone's number format.
export const formatMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
