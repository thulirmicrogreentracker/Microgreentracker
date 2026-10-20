// The daily reminders' settings and content, worked out from the app's data (no phone APIs here, so it can be tested).
import { AppData, Batch, NotificationSettings } from '../types';
import { activeTrays, batchCode, formatGrams, isBatchGrowing } from './batches';
import { addDaysToDate } from './dateUtils';
import { boxText, deliveriesBetween } from './orders';
import { SowPlan } from './plan';

export const defaultNotificationSettings = (): NotificationSettings => ({
  enabled: false,
  morning: '07:00',
  evening: '18:00',
  watering: true,
  deliveries: true,
  sowHarvest: true,
  stock: true,
});

const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export const normalizeNotificationSettings = (raw: unknown): NotificationSettings => {
  const d = defaultNotificationSettings();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<NotificationSettings>;
  const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    enabled: flag(r.enabled, d.enabled),
    morning: isTime(r.morning) ? r.morning : d.morning,
    // An evening time that was turned off is saved as absent; a missing key (older data) gets the default.
    evening: 'evening' in r ? (isTime(r.evening) ? r.evening : undefined) : d.evening,
    watering: flag(r.watering, d.watering),
    deliveries: flag(r.deliveries, d.deliveries),
    sowHarvest: flag(r.sowHarvest, d.sowHarvest),
    stock: flag(r.stock, d.stock),
  };
};

const daysApart = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86_400_000);
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const names = (list: string[], max = 4) => (list.length > max ? `${list.slice(0, max).join(', ')} +${list.length - max} more` : list.join(', '));

// Batches due for watering on a date: from their last watering (or sowing) and their crop's interval. For a later
// day it assumes each batch is watered whenever it's due.
export const wateringOn = (batches: Batch[], data: Pick<AppData, 'cropTypes'>, date: string, today: string): Batch[] =>
  batches.filter(b => {
    if (!isBatchGrowing(b) || b.sowingDate > date || (date > today && b.expectedHarvestDate < date)) return false;
    const every = Math.max(1, data.cropTypes.find(c => c.name === b.cropType)?.wateringFrequency ?? 1);
    const last = [...b.watering].map(w => w.timestamp.slice(0, 10)).sort().pop() ?? b.sowingDate;
    const firstDue = addDaysToDate(last, every);
    if (date === today) return firstDue <= today;
    const start = firstDue > today ? firstDue : today;
    return date >= start && daysApart(start, date) % every === 0;
  });

export interface DaySummary {
  lines: string[];
  farm: number; // farm tasks (watering, sowing, harvest)
  shop: number; // shop tasks (deliveries, stock)
}

// What there is to do on a day, in the kinds the settings ask for: one line per kind.
export const daySummary = (data: AppData, plans: SowPlan[], settings: NotificationSettings, date: string, today: string): DaySummary => {
  const lines: string[] = [];
  let farm = 0,
    shop = 0;
  const isToday = date === today;
  if (settings.watering) {
    const water = wateringOn(data.batches, data, date, today);
    if (water.length) {
      lines.push(`💧 Water ${plural(water.length, 'batch', 'batches')}: ${names([...new Set(water.map(b => b.cropType))])}`);
      farm += water.length;
    }
  }
  if (settings.deliveries && data.config.shop.enabled) {
    const due = deliveriesBetween(data.orders, data.subscriptions, date, date, isToday);
    if (due.length) {
      const counts = new Map<string, number>();
      for (const d of due) {
        const name = data.customers.find(c => c.id === d.customerId)?.name ?? 'Customer';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      const who = [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
      const late = due.filter(d => d.date < date).length;
      lines.push(`🚚 ${plural(due.length, 'delivery', 'deliveries')}${late ? ` (${late} overdue)` : ''}: ${names(who)}`);
      if (due.length === 1) lines[lines.length - 1] += ` · ${boxText(due[0])}`;
      shop += due.length;
    }
  }
  if (settings.sowHarvest) {
    const sow = plans.filter(p => (isToday ? p.sowBy <= date : p.sowBy === date));
    if (sow.length) {
      lines.push(`🌱 Sow ${sow.map(p => `${plural(p.trays, 'tray')} ${p.crop}`).join(', ')}`);
      farm += sow.length;
    }
    const harvest = data.batches.filter(
      b => isBatchGrowing(b) && (isToday ? b.stage === 'harvest' || b.expectedHarvestDate <= date : b.expectedHarvestDate === date)
    );
    if (harvest.length) {
      lines.push(`✂️ Harvest ${names(harvest.map(b => `${b.cropType} ${batchCode(b.batchNumber)} (${plural(activeTrays(b).length, 'tray')})`), 3)}`);
      farm += harvest.length;
    }
  }
  if (settings.stock && data.config.shop.enabled) {
    const tomorrow = addDaysToDate(date, 1);
    const lots = data.stock.filter(l => l.remaining > 0 && (isToday ? l.useBy <= tomorrow : l.useBy === tomorrow));
    if (lots.length) {
      const expired = lots.filter(l => l.useBy < date).length;
      lines.push(
        `⏳ Sell soon: ${names(lots.map(l => `${formatGrams(l.remaining)} ${l.crop}`), 3)}${expired ? ` (${expired} past use-by)` : ''}`
      );
      shop += lots.length;
    }
  }
  return { lines, farm, shop };
};

const MORNING_ID = 1000;
const EVENING_ID = 2000;
const DAYS_AHEAD = 7;

const at = (date: string, time: string) => new Date(`${date}T${time}:00`);

// The notifications for the next week: a morning summary each day, and an evening reminder of what's left. Today's
// evening reminder uses what's still to do now; later days use what's expected.
export const plannedNotifications = (data: AppData, plans: SowPlan[], settings: NotificationSettings, now: Date, today: string) => {
  const list: { id: number; title: string; body: string; at: Date; tab: 'home' | 'today' }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDaysToDate(today, i);
    const day = daySummary(data, plans, settings, date, today);
    if (!day.lines.length) continue;
    const tab = day.farm >= day.shop ? 'home' : 'today';
    const total = day.farm + day.shop;
    const morning = at(date, settings.morning);
    if (morning > now) list.push({ id: MORNING_ID + i, title: `Today: ${plural(total, 'thing')} to do`, body: day.lines.join('\n'), at: morning, tab });
    if (settings.evening) {
      const evening = at(date, settings.evening);
      if (evening > now) list.push({ id: EVENING_ID + i, title: `Still to do today: ${plural(total, 'thing')}`, body: day.lines.join('\n'), at: evening, tab });
    }
  }
  return list;
};

