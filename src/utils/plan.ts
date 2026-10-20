import { Batch, CropPrice, CropType, Order, StockLot, Subscription } from '../types';
import { activeTrays, batchCode, batchYieldGrams, isBatchGrowing } from './batches';
import { addDaysToDate } from './dateUtils';
import { Delivery, deliveriesBetween } from './orders';
import { shelfLife } from './stock';

// Used for a crop's yield per tray until one of its batches has been weighed.
export const DEFAULT_TRAY_YIELD = 150;
// How far ahead deliveries are planned, in days after a crop could be ready if sown today.
export const PLAN_AHEAD_DAYS = 14;

const sameCrop = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const daysApart = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86_400_000);

// Average grams per growing tray from the crop's last five weighed batches; the default if none were weighed.
export const yieldPerTray = (batches: Batch[], crop: string): { grams: number; estimated: boolean } => {
  const weighed = batches
    .filter(b => sameCrop(b.cropType, crop) && b.stage === 'completed' && batchYieldGrams(b) > 0 && activeTrays(b).length > 0)
    .sort((a, b) => (b.actualHarvestDate ?? b.expectedHarvestDate).localeCompare(a.actualHarvestDate ?? a.expectedHarvestDate))
    .slice(0, 5);
  if (!weighed.length) return { grams: DEFAULT_TRAY_YIELD, estimated: true };
  const grams = weighed.reduce((n, b) => n + batchYieldGrams(b), 0) / weighed.reduce((n, b) => n + activeTrays(b).length, 0);
  return { grams: Math.round(grams), estimated: false };
};

// Crops for mixed boxes that don't list their own: those you price or have grown, or all crops if neither.
export const defaultMixCrops = (batches: Batch[], prices: CropPrice[], cropTypes: CropType[]): string[] => {
  const known = new Set([...prices.map(p => p.crop), ...batches.map(b => b.cropType)].map(c => c.toLowerCase()));
  const crops = cropTypes.filter(c => known.has(c.name.toLowerCase())).map(c => c.name);
  return crops.length ? crops : cropTypes.map(c => c.name);
};

// One sowing to make: enough trays of a crop, sown by a date, for deliveries that stock and growing batches won't
// cover.
export interface SowPlan {
  crop: string;
  trays: number;
  sowBy: string;
  forDate: string; // the first delivery it's for
  grams: number; // grams short for those deliveries
  perTray: number;
  estimated: boolean; // perTray is the default, not from a weighed harvest
  forMix: boolean; // some of it is for mixed boxes
}

// A delivery too soon to grow for: sown today, the crop isn't ready in time.
export interface Shortfall {
  crop: string; // "Mix" for a mixed box
  date: string;
  grams: number;
}

// Where part of a delivery comes from.
export interface Allocation {
  crop: string;
  grams: number;
  from: 'stock' | 'batch' | 'sow' | 'short';
  mix: boolean; // part of a mixed box
  batchId?: string;
  batchCode?: string;
  readyOn?: string; // batch: expected harvest
  sowBy?: string; // sow: sow by this date
}

export interface SupplyPlan {
  plans: SowPlan[];
  short: Shortfall[];
  deliveries: Map<string, Allocation[]>; // by Delivery.key
}

interface Source {
  crop: string;
  from: string; // available from
  useBy: string;
  grams: number;
  kind: 'stock' | 'batch' | 'sow';
  batch?: Batch;
  sowBy?: string;
}

// Works through every delivery (orders and subscriptions, chosen crops and mixed boxes) in date order, taking from
// stock and from growing batches (by their expected harvest and yield per tray) that are ready by the delivery and
// not past their use-by date, earliest use-by first. Whatever is short is planned as new trays: for a mixed box, from
// its crops that can be ready in time, rotating week to week. The trays' extra grams cover later deliveries while
// they keep. Each delivery gets the list of where its microgreens come from.
export const supplyPlan = (
  batches: Batch[],
  stock: StockLot[],
  orders: Order[],
  subscriptions: Subscription[],
  cropTypes: CropType[],
  today: string,
  mixCrops: string[]
): SupplyPlan => {
  const longest = Math.max(10, ...cropTypes.map(c => c.daysToHarvest));
  const deliveries = deliveriesBetween(orders, subscriptions, today, addDaysToDate(today, longest + PLAN_AHEAD_DAYS), true);
  const type = (crop: string) => cropTypes.find(c => sameCrop(c.name, crop));
  const growDays = (crop: string) => type(crop)?.daysToHarvest ?? 10;
  const perTray = new Map<string, { grams: number; estimated: boolean }>();
  const yieldOf = (crop: string) => {
    const key = crop.toLowerCase();
    if (!perTray.has(key)) perTray.set(key, yieldPerTray(batches, crop));
    return perTray.get(key)!;
  };
  const sources: Source[] = [
    ...stock.filter(l => l.remaining > 0).map(l => ({ crop: l.crop, from: today, useBy: l.useBy, grams: l.remaining, kind: 'stock' as const })),
    ...batches.filter(isBatchGrowing).map(b => {
      const ready = b.expectedHarvestDate > today ? b.expectedHarvestDate : today;
      return { crop: b.cropType, from: ready, useBy: addDaysToDate(ready, shelfLife(b.cropType, cropTypes)), grams: activeTrays(b).length * yieldOf(b.cropType).grams, kind: 'batch' as const, batch: b };
    }),
  ];
  const plans: SowPlan[] = [];
  const short: Shortfall[] = [];
  const result = new Map<string, Allocation[]>();

  const usable = (crop: string, date: string) =>
    sources.filter(s => sameCrop(s.crop, crop) && s.from <= date && s.useBy >= date && s.grams > 0).sort((a, b) => a.useBy.localeCompare(b.useBy));
  const available = (crop: string, date: string) => usable(crop, date).reduce((n, s) => n + s.grams, 0);
  // Takes up to `grams` of a crop from what's ready by the date.
  const take = (crop: string, grams: number, date: string, mix: boolean, out: Allocation[]) => {
    let need = grams;
    for (const s of usable(crop, date)) {
      const g = Math.min(s.grams, need);
      s.grams -= g;
      need -= g;
      out.push({
        crop: s.crop,
        grams: g,
        from: s.kind,
        mix,
        batchId: s.batch?.id,
        batchCode: s.batch ? batchCode(s.batch.batchNumber) : undefined,
        readyOn: s.kind === 'batch' ? s.from : undefined,
        sowBy: s.sowBy,
      });
      if (!need) break;
    }
    return need;
  };
  // Plans trays of a crop for what's still needed on the date, or notes it as too soon to grow.
  const sow = (crop: string, grams: number, date: string, mix: boolean, out: Allocation[]) => {
    const sowBy = addDaysToDate(date, -growDays(crop));
    const { grams: g, estimated } = yieldOf(crop);
    const trays = Math.ceil(grams / g);
    sources.push({ crop, from: date, useBy: addDaysToDate(date, shelfLife(crop, cropTypes)), grams: trays * g - grams, kind: 'sow', sowBy });
    out.push({ crop, grams, from: 'sow', mix, sowBy });
    const same = plans.find(p => sameCrop(p.crop, crop) && p.sowBy === sowBy);
    if (same) {
      same.trays += trays;
      same.grams += grams;
      same.forMix ||= mix;
    } else plans.push({ crop, trays, sowBy, forDate: date, grams, perTray: g, estimated, forMix: mix });
  };
  const noteShort = (crop: string, grams: number, date: string, mix: boolean, out: Allocation[]) => {
    out.push({ crop, grams, from: 'short', mix });
    const same = short.find(x => x.crop === crop && x.date === date);
    if (same) same.grams += grams;
    else short.push({ crop, date, grams });
  };
  const canGrow = (crop: string, date: string) => addDaysToDate(date, -growDays(crop)) >= today;

  for (const d of deliveries) {
    // Overdue deliveries are counted as due today.
    const date = d.date < today ? today : d.date;
    const out: Allocation[] = [];
    for (const item of d.items) {
      const need = take(item.crop, item.grams, date, false, out);
      if (need <= 0) continue;
      if (canGrow(item.crop, date)) sow(item.crop, need, date, false, out);
      else noteShort(item.crop, need, date, false, out);
    }
    if (d.mix) planMix(d, date, out);
    result.set(d.key, out);
  }

  // A mixed box of `varieties` crops: an even share from each crop with the most ready by the date; the shares of
  // crops that aren't ready are sown, rotating through the crops that can grow in time so each week's box (and
  // sowing) differs; then it's topped up from what's ready, and any rest is sown too.
  function planMix(d: Delivery, date: string, out: Allocation[]) {
    const mix = d.mix!;
    const pool = (mix.crops?.length ? mix.crops : mixCrops).filter(c => type(c));
    if (!pool.length) return noteShort('Mix', mix.grams, date, true, out);
    const varieties = Math.min(mix.varieties, pool.length);
    const share = Math.round(mix.grams / varieties);
    const picked = pool
      .map(c => ({ crop: c, grams: available(c, date) }))
      .filter(c => c.grams > 0)
      .sort((a, b) => b.grams - a.grams)
      .slice(0, varieties)
      .map(c => c.crop);
    let need = mix.grams;
    for (const c of picked) {
      const g = Math.min(share, available(c, date));
      need -= g - take(c, g, date, true, out);
    }
    const week = Math.floor(daysApart('2026-01-05', date) / 7);
    const growable = pool.filter(c => canGrow(c, date));
    const rotated = growable.length ? [...growable.slice(week % growable.length), ...growable.slice(0, week % growable.length)] : [];
    const toSow = new Map<string, number>();
    for (const c of rotated.filter(x => !picked.includes(x)).slice(0, varieties - picked.length)) {
      const g = Math.min(share, need);
      if (g <= 0) break;
      toSow.set(c, g);
      need -= g;
    }
    for (const c of picked) if (need > 0) need = take(c, need, date, true, out);
    if (need > 0 && rotated.length) {
      // The rest goes to the crops already being sown for this box, or the next in the rotation.
      const into = toSow.size ? [...toSow.keys()] : [rotated[0]];
      const each = Math.ceil(need / into.length / 5) * 5;
      for (const c of into) {
        const g = Math.min(each, need);
        toSow.set(c, (toSow.get(c) ?? 0) + g);
        need -= g;
      }
    }
    for (const [c, g] of toSow) sow(c, g, date, true, out);
    if (need > 0) noteShort('Mix', Math.round(need), date, true, out);
  }

  return {
    plans: plans.sort((a, b) => a.sowBy.localeCompare(b.sowBy) || a.crop.localeCompare(b.crop)),
    short: short.sort((a, b) => a.date.localeCompare(b.date) || a.crop.localeCompare(b.crop)),
    deliveries: result,
  };
};

// One line on where a delivery's microgreens come from: "Ready from stock", "From B012 (ready Oct 21)", "Sow
// Radish by Oct 15", "Short 100 g".
export const coverage = (allocations: Allocation[] | undefined): { tone: 'ok' | 'grow' | 'sow' | 'short'; parts: Allocation[] } => {
  const list = allocations ?? [];
  const tone = list.some(a => a.from === 'short') ? 'short' : list.some(a => a.from === 'sow') ? 'sow' : list.some(a => a.from === 'batch') ? 'grow' : 'ok';
  return { tone, parts: list };
};

// The sowings and shortfalls on their own.
export const sowPlans = (
  batches: Batch[],
  stock: StockLot[],
  orders: Order[],
  subscriptions: Subscription[],
  cropTypes: CropType[],
  today: string,
  mixCrops: string[] = cropTypes.map(c => c.name)
): { plans: SowPlan[]; short: Shortfall[] } => {
  const { plans, short } = supplyPlan(batches, stock, orders, subscriptions, cropTypes, today, mixCrops);
  return { plans, short };
};
