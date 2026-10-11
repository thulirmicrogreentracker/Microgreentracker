import { Batch, SupplyItem, SupplyKind, SupplyLot, SupplyUse } from '../types';
import { formatDate } from './dateUtils';

export const SUPPLY_KINDS: { kind: SupplyKind; label: string; plural: string }[] = [
  { kind: 'seed', label: 'Seed', plural: 'Seeds' },
  { kind: 'media', label: 'Growing media', plural: 'Growing media' },
  { kind: 'packaging', label: 'Packaging', plural: 'Packaging' },
  { kind: 'other', label: 'Other', plural: 'Other supplies' },
];

// Stock amounts are kept to 3 decimals, so repeated fractions of a block don't leave 0.30000000000000004.
const round = (n: number) => Math.round(n * 1000) / 1000;

const positive = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? round(n) : undefined;
};
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Fills in anything missing or invalid in saved supplies, so hand-edited or damaged data can't crash the app.
export const normalizeSupplies = (raw: unknown): SupplyItem[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((i): i is Partial<SupplyItem> => !!i && typeof i === 'object' && typeof (i as SupplyItem).id === 'string')
    .map(i => {
      const kind: SupplyKind = SUPPLY_KINDS.some(k => k.kind === i.kind) ? i.kind! : 'other';
      const lots: SupplyLot[] = (Array.isArray(i.lots) ? i.lots : [])
        .filter(l => l && typeof l.id === 'string')
        .map(l => {
          const quantity = positive(l.quantity) ?? 0;
          return {
            id: l.id,
            purchasedOn: isDate(l.purchasedOn) ? l.purchasedOn : new Date().toISOString().slice(0, 10),
            quantity,
            remaining: Math.min(quantity, Math.max(0, round(Number(l.remaining) || 0))),
            price: positive(l.price),
            supplier: text(l.supplier),
            lotNumber: text(l.lotNumber),
            expiresOn: isDate(l.expiresOn) ? l.expiresOn : undefined,
            note: text(l.note),
          };
        });
      return {
        id: i.id!,
        kind,
        name: text(i.name) ?? 'Supply',
        crop: kind === 'seed' ? text(i.crop) : undefined,
        unit: kind === 'seed' ? 'g' : text(i.unit) ?? 'pcs',
        traysPerUnit: kind === 'media' ? positive(i.traysPerUnit) : undefined,
        autoUse: kind === 'media' ? i.autoUse !== false : undefined,
        lowAt: positive(i.lowAt),
        lots,
        createdAt: typeof i.createdAt === 'string' ? i.createdAt : new Date().toISOString(),
      };
    });

export const stockOf = (item: SupplyItem): number => round(item.lots.reduce((n, l) => n + l.remaining, 0));

export const isLow = (item: SupplyItem): boolean => item.lowAt != null && stockOf(item) <= item.lowAt;

// Units that read better in the plural ("3 blocks"); others, like g, kg and pcs, stay as they are.
const PLURALS: Record<string, string> = { block: 'blocks', bag: 'bags', box: 'boxes', roll: 'rolls', litre: 'litres', packet: 'packets', tray: 'trays' };

// "1,250 g", "2.5 blocks", "1 block", "40 pcs".
export const formatAmount = (amount: number, unit: string): string =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: unit === 'g' ? 0 : 2 })} ${amount === 1 ? unit : PLURALS[unit] ?? unit}`;

// The order stock is used in: lots that expire first, then the oldest purchase.
const useOrder = (a: SupplyLot, b: SupplyLot) =>
  (a.expiresOn ?? '9999').localeCompare(b.expiresOn ?? '9999') || a.purchasedOn.localeCompare(b.purchasedOn);

// Takes up to `amount` from the item's lots. Returns the updated item, what was taken from which lot, and any amount
// that wasn't in stock.
export const takeFromStock = (item: SupplyItem, amount: number): { item: SupplyItem; use: SupplyUse[]; short: number } => {
  let left = round(amount);
  const use: SupplyUse[] = [];
  const taken = new Map<string, number>();
  for (const lot of [...item.lots].sort(useOrder)) {
    if (left <= 0) break;
    const take = round(Math.min(lot.remaining, left));
    if (take <= 0) continue;
    taken.set(lot.id, take);
    use.push({ itemId: item.id, lotId: lot.id, amount: take, cost: lot.price ? round((lot.price / lot.quantity) * take) : 0 });
    left = round(left - take);
  }
  return {
    item: { ...item, lots: item.lots.map(l => (taken.has(l.id) ? { ...l, remaining: round(l.remaining - taken.get(l.id)!) } : l)) },
    use,
    short: Math.max(0, left),
  };
};

const sameCrop = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// The seed item for a crop: the one with stock, else the first.
export const seedFor = (supplies: SupplyItem[], crop: string): SupplyItem | undefined => {
  const items = supplies.filter(i => i.kind === 'seed' && sameCrop(i.crop, crop));
  return items.find(i => stockOf(i) > 0) ?? items[0];
};

// What a new batch takes from stock: its seed (trays × seed per tray) and every growing medium used for each batch.
export const suppliesForBatch = (
  supplies: SupplyItem[],
  batch: Pick<Batch, 'cropType' | 'trays' | 'seedWeightPerTray'>
): { supplies: SupplyItem[]; use: SupplyUse[]; short: { item: SupplyItem; amount: number }[] } => {
  const trays = batch.trays.filter(t => t.status === 'active').length;
  const needs = new Map<string, number>();
  const seed = seedFor(supplies, batch.cropType);
  if (seed && batch.seedWeightPerTray) needs.set(seed.id, trays * batch.seedWeightPerTray);
  for (const item of supplies) {
    if (item.kind === 'media' && item.autoUse && item.traysPerUnit) needs.set(item.id, trays / item.traysPerUnit);
  }
  const use: SupplyUse[] = [];
  const short: { item: SupplyItem; amount: number }[] = [];
  const next = supplies.map(item => {
    const need = needs.get(item.id);
    if (!need) return item;
    const result = takeFromStock(item, need);
    use.push(...result.use);
    if (result.short > 0) short.push({ item, amount: result.short });
    return result.item;
  });
  return { supplies: next, use, short };
};

export const batchSupplyCost = (batch: Batch): number => round((batch.supplyUse ?? []).reduce((n, u) => n + u.cost, 0));

export interface SupplyAlert {
  item: SupplyItem;
  kind: 'low' | 'expired' | 'expiring';
  text: string;
}

// Low stock, and lots with stock left that have expired or expire within 30 days.
export const supplyAlerts = (supplies: SupplyItem[], today: string): SupplyAlert[] => {
  const soon = new Date(`${today}T00:00:00`);
  soon.setDate(soon.getDate() + 30);
  const soonDate = soon.toISOString().slice(0, 10);
  const alerts: SupplyAlert[] = [];
  for (const item of supplies) {
    if (isLow(item)) alerts.push({ item, kind: 'low', text: `${formatAmount(stockOf(item), item.unit)} left` });
    const live = item.lots.filter(l => l.remaining > 0 && l.expiresOn);
    const expired = live.filter(l => l.expiresOn! < today);
    if (expired.length) {
      const amount = round(expired.reduce((n, l) => n + l.remaining, 0));
      alerts.push({ item, kind: 'expired', text: `${formatAmount(amount, item.unit)} past its expiry date` });
    } else {
      const expiring = live.filter(l => l.expiresOn! <= soonDate).sort(useOrder)[0];
      if (expiring) alerts.push({ item, kind: 'expiring', text: `${formatAmount(expiring.remaining, item.unit)} expires ${formatDate(expiring.expiresOn!)}` });
    }
  }
  return alerts;
};

// About how many more trays the item covers: seed by the crop's last seed weight per tray, media by trays per unit.
export const traysCovered = (item: SupplyItem, batches: Batch[]): number | undefined => {
  if (item.kind === 'media' && item.traysPerUnit) return Math.floor(stockOf(item) * item.traysPerUnit);
  if (item.kind !== 'seed') return undefined;
  const last = [...batches]
    .filter(b => sameCrop(b.cropType, item.crop) && b.seedWeightPerTray)
    .sort((a, b) => b.sowingDate.localeCompare(a.sowingDate))[0];
  return last ? Math.floor(stockOf(item) / last.seedWeightPerTray!) : undefined;
};
