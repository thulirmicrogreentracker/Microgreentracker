import { Customer, Order, OrderItem, Subscription } from '../types';
import { addDaysToDate, todayLocal } from './dateUtils';

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
  order?: Order;
  subscription?: Subscription;
}

// Deliveries still to make from `from` to `to` (inclusive): open orders and subscription dates not delivered or
// skipped, by date. `includeOverdue` also includes open one-off orders from earlier dates.
export const deliveriesBetween = (orders: Order[], subs: Subscription[], from: string, to: string, includeOverdue = false): Delivery[] => {
  const list: Delivery[] = [];
  for (const o of orders) {
    if (o.status !== 'open') continue;
    if (o.deliverOn > to || (o.deliverOn < from && !includeOverdue)) continue;
    list.push({ key: `o-${o.id}`, date: o.deliverOn, customerId: o.customerId, items: o.items, order: o });
  }
  for (const s of subs) {
    for (let d = from; d <= to; d = addDaysToDate(d, 1)) {
      if (!deliversOn(s, d) || s.skipped.includes(d) || s.delivered.some(x => x.date === d)) continue;
      list.push({ key: `s-${s.id}-${d}`, date: d, customerId: s.customerId, items: s.items, subscription: s });
    }
  }
  return list.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
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

// Grams of each crop needed for deliveries between two dates (for planning sowing).
export const gramsNeeded = (orders: Order[], subs: Subscription[], from: string, to: string): Map<string, number> => {
  const need = new Map<string, number>();
  for (const d of deliveriesBetween(orders, subs, from, to)) {
    for (const i of d.items) need.set(i.crop, (need.get(i.crop) ?? 0) + i.grams);
  }
  return need;
};

// Today's delivery list as text, to share on WhatsApp.
export const deliveryListText = (deliveries: Delivery[], customers: Customer[], title: string) =>
  [
    title,
    '',
    ...deliveries.map((d, n) => {
      const c = customers.find(x => x.id === d.customerId);
      return [`${n + 1}. ${c?.name ?? 'Customer'}${c?.phone ? ` (${c.phone})` : ''}`, `   ${itemsText(d.items)}`, c?.address ? `   ${c.address}` : '']
        .filter(Boolean)
        .join('\n');
    }),
  ].join('\n');

const normalizeItems = (raw: unknown): OrderItem[] =>
  (Array.isArray(raw) ? raw : [])
    .filter(i => i && text(i.crop) && Number(i.grams) > 0)
    .map(i => ({ crop: i.crop.trim(), grams: Math.round(Number(i.grams) * 10) / 10 }));

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
      weekdays: [...new Set((Array.isArray(s.weekdays) ? s.weekdays : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))],
      everyWeeks: s.everyWeeks === 2 ? 2 : 1,
      startOn: isDate(s.startOn) ? s.startOn : today(),
      endOn: isDate(s.endOn) ? s.endOn : undefined,
      pausedUntil: isDate(s.pausedUntil) ? s.pausedUntil : undefined,
      skipped: (Array.isArray(s.skipped) ? s.skipped : []).filter(isDate),
      delivered: (Array.isArray(s.delivered) ? s.delivered : []).filter(x => x && isDate(x.date) && typeof x.saleId === 'string'),
      note: text(s.note),
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
    }));
