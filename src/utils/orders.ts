import { Customer, MixSpec, Order, OrderItem, StockLot, Subscription } from '../types';
import { addDaysToDate, todayLocal } from './dateUtils';
import { stockByCrop } from './stock';

// A subscription delivery that passed without being delivered, skipped or marked missed stays on the list (as
// overdue) for this many days; older ones show in its log as not recorded.
export const OVERDUE_DAYS = 7;
export const MAX_VARIETIES = 6;

export const WEEKDAYS = [
  { day: 1, short: 'Mon', label: 'Monday' },
  { day: 2, short: 'Tue', label: 'Tuesday' },
  { day: 3, short: 'Wed', label: 'Wednesday' },
  { day: 4, short: 'Thu', label: 'Thursday' },
  { day: 5, short: 'Fri', label: 'Friday' },
  { day: 6, short: 'Sat', label: 'Saturday' },
  { day: 0, short: 'Sun', label: 'Sunday' },
];

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const today = () => todayLocal();

export const orderCode = (n: number) => `O${String(n).padStart(3, '0')}`;

const dayOf = (date: string) => new Date(`${date}T00:00:00`).getDay();
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);

// "Mon and Thu", "Every day", "Mon, Wed and Fri, every other week".
export const scheduleText = (sub: Pick<Subscription, 'weekdays' | 'everyWeeks'>) => {
  const days = WEEKDAYS.filter(w => sub.weekdays.includes(w.day)).map(w => w.short);
  const list = days.length === 7 ? 'Every day' : days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : days[0] ?? 'No days';
  return sub.everyWeeks === 2 ? `${list}, every other week` : list;
};

export const itemsText = (items: OrderItem[]) => items.map(i => `${i.grams} g ${i.crop}`).join(', ');

// "300 g mix of 3" / "300 g mix of 3 (Sunflower, Pea Shoots, Radish, Beet)".
export const mixText = (mix: MixSpec, withCrops = false) =>
  `${mix.grams} g mix of ${mix.varieties}${withCrops && mix.crops?.length ? ` (${mix.crops.join(', ')})` : ''}`;

// What a delivery or subscription gets: chosen crops and/or a mixed box.
export const boxText = (b: { items: OrderItem[]; mix?: MixSpec }, withCrops = false) =>
  [b.items.length ? itemsText(b.items) : '', b.mix ? mixText(b.mix, withCrops) : ''].filter(Boolean).join(' + ');

export const boxGrams = (b: { items: OrderItem[]; mix?: MixSpec }) => b.items.reduce((n, i) => n + i.grams, 0) + (b.mix?.grams ?? 0);

const sameCrop = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Picks a mixed box from stock: `varieties` crops (only the mix's crops when it has a list), preferring crops the
// customer didn't get last time, then those to use first, then those with the most in stock; the grams are split
// evenly and topped up from the others when one runs short. Returns what's short when there isn't enough.
export const pickMix = (
  mix: MixSpec,
  stock: StockLot[],
  today: string,
  lastCrops: string[] = [],
  taken: OrderItem[] = [] // already set aside for this delivery's chosen crops
): { items: OrderItem[]; short: number } => {
  const left = new Map(
    stockByCrop(stock, today).map(c => [c.crop, { ...c, available: c.available - taken.filter(t => sameCrop(t.crop, c.crop)).reduce((n, t) => n + t.grams, 0) }])
  );
  const candidates = [...left.values()]
    .filter(c => c.available >= 5 && (!mix.crops?.length || mix.crops.some(x => sameCrop(x, c.crop))))
    .sort(
      (a, b) =>
        Number(lastCrops.some(x => sameCrop(x, a.crop))) - Number(lastCrops.some(x => sameCrop(x, b.crop))) ||
        (a.nextUseBy ?? '').localeCompare(b.nextUseBy ?? '') ||
        b.available - a.available
    );
  const chosen = candidates.slice(0, Math.max(1, mix.varieties));
  if (!chosen.length) return { items: [], short: mix.grams };
  const grams = new Map(chosen.map(c => [c.crop, 0]));
  let need = mix.grams;
  // Even shares first (in 5 g steps), then whatever is left from the crops that still have some.
  const share = Math.floor(mix.grams / chosen.length / 5) * 5;
  for (const c of chosen) {
    const g = Math.min(share, Math.floor(c.available), need);
    grams.set(c.crop, g);
    need -= g;
  }
  for (const c of [...chosen, ...candidates.slice(chosen.length)]) {
    if (need <= 0) break;
    const g = Math.min(Math.floor(c.available) - (grams.get(c.crop) ?? 0), need);
    if (g > 0) {
      grams.set(c.crop, (grams.get(c.crop) ?? 0) + g);
      need -= g;
    }
  }
  return { items: [...grams].filter(([, g]) => g > 0).map(([crop, g]) => ({ crop, grams: g })), short: Math.max(0, need) };
};

// Whether the subscription has a delivery on this date (ignoring skips and what's been delivered).
export const deliversOn = (sub: Subscription, date: string): boolean => {
  if (date < sub.startOn || (sub.endOn && date > sub.endOn)) return false;
  if (sub.pausedUntil && date < sub.pausedUntil) return false;
  if (!sub.weekdays.includes(dayOf(date))) return false;
  if (sub.everyWeeks > 1) {
    // Weeks counted from the Monday of the start week.
    const startMonday = addDaysToDate(sub.startOn, -((dayOf(sub.startOn) + 6) % 7));
    if (Math.floor(daysBetween(startMonday, date) / 7) % sub.everyWeeks !== 0) return false;
  }
  return true;
};

export const isEnded = (sub: Subscription, on: string) => !!sub.endOn && sub.endOn < on;

export const subStatus = (sub: Subscription, on: string): 'active' | 'paused' | 'ended' =>
  isEnded(sub, on) ? 'ended' : sub.pausedUntil && sub.pausedUntil > on ? 'paused' : 'active';

// One delivery to make: a one-off order, or one date of a subscription.
export interface Delivery {
  key: string;
  date: string;
  customerId: string;
  items: OrderItem[];
  mix?: MixSpec;
  order?: Order;
  subscription?: Subscription;
}

// Whether a subscription date still needs a decision: not delivered, skipped or marked missed.
const isOpenDate = (s: Subscription, d: string) => !s.skipped.includes(d) && !s.missed.includes(d) && !s.delivered.some(x => x.date === d);

// Deliveries still to make from `from` to `to` (inclusive): open orders and subscription dates not delivered,
// skipped or missed, by date. `includeOverdue` also includes open one-off orders from earlier dates, and subscription
// dates from the OVERDUE_DAYS before `from`.
export const deliveriesBetween = (orders: Order[], subs: Subscription[], from: string, to: string, includeOverdue = false): Delivery[] => {
  const list: Delivery[] = [];
  for (const o of orders) {
    if (o.status !== 'open') continue;
    if (o.deliverOn > to || (o.deliverOn < from && !includeOverdue)) continue;
    list.push({ key: `o-${o.id}`, date: o.deliverOn, customerId: o.customerId, items: o.items, order: o });
  }
  const start = includeOverdue ? addDaysToDate(from, -OVERDUE_DAYS) : from;
  for (const s of subs) {
    for (let d = start; d <= to; d = addDaysToDate(d, 1)) {
      if (!deliversOn(s, d) || !isOpenDate(s, d)) continue;
      list.push({ key: `s-${s.id}-${d}`, date: d, customerId: s.customerId, items: s.items, mix: s.mix, subscription: s });
    }
  }
  return list.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
};

export type LogStatus = 'delivered' | 'skipped' | 'missed' | 'overdue' | 'unrecorded';

// A subscription's past delivery dates (up to today, newest first) and what happened on each.
export const subscriptionLog = (sub: Subscription, today: string, days = 56): { date: string; status: LogStatus; saleId?: string }[] => {
  const from = addDaysToDate(today, -days) > sub.startOn ? addDaysToDate(today, -days) : sub.startOn;
  const log: { date: string; status: LogStatus; saleId?: string }[] = [];
  const dates = new Set([...sub.delivered.map(x => x.date), ...sub.missed]);
  for (let d = from; d <= today; d = addDaysToDate(d, 1)) if (deliversOn({ ...sub, pausedUntil: undefined }, d) || dates.has(d)) dates.add(d);
  for (const d of [...dates].filter(x => x >= from && x <= today).sort().reverse()) {
    const delivered = sub.delivered.find(x => x.date === d);
    if (delivered) log.push({ date: d, status: 'delivered', saleId: delivered.saleId });
    else if (sub.missed.includes(d)) log.push({ date: d, status: 'missed' });
    else if (sub.skipped.includes(d) || (sub.pausedUntil && d < sub.pausedUntil && d >= sub.startOn && !deliversOn(sub, d))) log.push({ date: d, status: 'skipped' });
    else if (d === today) continue; // today's is still to come
    else log.push({ date: d, status: d >= addDaysToDate(today, -OVERDUE_DAYS) ? 'overdue' : 'unrecorded' });
  }
  return log;
};

// The next `count` delivery dates of a subscription from a date, with whether each is skipped.
export const nextDates = (sub: Subscription, from: string, count: number): { date: string; skipped: boolean; delivered: boolean }[] => {
  const dates = [];
  for (let d = from, n = 0; dates.length < count && n < 400; d = addDaysToDate(d, 1), n++) {
    if (!deliversOn(sub, d)) continue;
    dates.push({ date: d, skipped: sub.skipped.includes(d), delivered: sub.delivered.some(x => x.date === d) });
  }
  return dates;
};

// Today's delivery list as text, to share on WhatsApp. `contents` gives what each box gets (a mix as picked).
export const deliveryListText = (deliveries: Delivery[], customers: Customer[], title: string, contents: (d: Delivery) => OrderItem[] = d => d.items) =>
  [
    title,
    '',
    ...deliveries.map((d, n) => {
      const c = customers.find(x => x.id === d.customerId);
      return [`${n + 1}. ${c?.name ?? 'Customer'}${c?.phone ? ` (${c.phone})` : ''}`, `   ${itemsText(contents(d)) || boxText(d)}`, c?.address ? `   ${c.address}` : '']
        .filter(Boolean)
        .join('\n');
    }),
  ].join('\n');

const normalizeItems = (raw: unknown): OrderItem[] =>
  (Array.isArray(raw) ? raw : [])
    .filter(i => i && text(i.crop) && Number(i.grams) > 0)
    .map(i => ({ crop: i.crop.trim(), grams: Math.round(Number(i.grams) * 10) / 10 }));

const normalizeMix = (raw: unknown): MixSpec | undefined => {
  const m = raw as Partial<MixSpec> | undefined;
  if (!m || typeof m !== 'object' || !(Number(m.grams) > 0)) return undefined;
  const crops = (Array.isArray(m.crops) ? m.crops : []).filter((c): c is string => !!text(c)).map(c => c.trim());
  return {
    grams: Math.round(Number(m.grams)),
    varieties: Math.min(MAX_VARIETIES, Math.max(1, Math.round(Number(m.varieties)) || 3)),
    crops: crops.length ? [...new Set(crops)] : undefined,
  };
};

export const normalizeOrders = (raw: unknown): Order[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((o): o is Partial<Order> => !!o && typeof o === 'object' && typeof (o as Order).id === 'string' && !!text((o as Order).customerId))
    .map(o => ({
      id: o.id!,
      number: Math.max(0, Math.floor(Number(o.number) || 0)),
      customerId: o.customerId!,
      deliverOn: isDate(o.deliverOn) ? o.deliverOn : today(),
      items: normalizeItems(o.items),
      note: text(o.note),
      status: o.status === 'delivered' || o.status === 'cancelled' ? o.status : 'open',
      saleId: text(o.saleId),
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    }));

export const normalizeSubscriptions = (raw: unknown): Subscription[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((s): s is Partial<Subscription> => !!s && typeof s === 'object' && typeof (s as Subscription).id === 'string' && !!text((s as Subscription).customerId))
    .map(s => ({
      id: s.id!,
      customerId: s.customerId!,
      items: normalizeItems(s.items),
      mix: normalizeMix(s.mix),
      weekdays: [...new Set((Array.isArray(s.weekdays) ? s.weekdays : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))],
      everyWeeks: s.everyWeeks === 2 ? 2 : 1,
      startOn: isDate(s.startOn) ? s.startOn : today(),
      endOn: isDate(s.endOn) ? s.endOn : undefined,
      pausedUntil: isDate(s.pausedUntil) ? s.pausedUntil : undefined,
      skipped: (Array.isArray(s.skipped) ? s.skipped : []).filter(isDate),
      missed: (Array.isArray(s.missed) ? s.missed : []).filter(isDate),
      delivered: (Array.isArray(s.delivered) ? s.delivered : []).filter(x => x && isDate(x.date) && typeof x.saleId === 'string'),
      note: text(s.note),
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
    }));
