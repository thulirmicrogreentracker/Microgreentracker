import { Batch, CropType, Order, StockLot, Subscription } from '../types';
import { activeTrays, batchYieldGrams, isBatchGrowing } from './batches';
import { addDaysToDate } from './dateUtils';
import { deliveriesBetween } from './orders';
import { shelfLife } from './stock';

// Used for a crop's yield per tray until one of its batches has been weighed.
export const DEFAULT_TRAY_YIELD = 150;
// How far ahead deliveries are planned, in days after a crop could be ready if sown today.
export const PLAN_AHEAD_DAYS = 14;

const sameCrop = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
}

// A delivery too soon to grow for: sown today, the crop isn't ready in time.
export interface Shortfall {
  crop: string;
  date: string;
  grams: number;
}

interface Source {
  from: string; // available from
  useBy: string;
  grams: number;
}

// Works through each crop's deliveries in date order, taking from stock and from growing batches (by their expected
// harvest and yield) that are ready by the delivery and not past their use-by date, earliest use-by first. Whatever
// is short is planned as new trays, ready for that delivery and the ones after it while they keep.
export const sowPlans = (
  batches: Batch[],
  stock: StockLot[],
  orders: Order[],
  subscriptions: Subscription[],
  cropTypes: CropType[],
  today: string
): { plans: SowPlan[]; short: Shortfall[] } => {
  const longest = Math.max(0, ...cropTypes.map(c => c.daysToHarvest));
  const deliveries = deliveriesBetween(orders, subscriptions, today, addDaysToDate(today, longest + PLAN_AHEAD_DAYS), true);
  const crops = [...new Set(deliveries.flatMap(d => d.items.map(i => i.crop)))];
  const plans: SowPlan[] = [];
  const short: Shortfall[] = [];
  for (const crop of crops) {
    const type = cropTypes.find(c => sameCrop(c.name, crop));
    const days = type?.daysToHarvest ?? 10;
    const keeps = shelfLife(crop, cropTypes);
    const horizon = addDaysToDate(today, days + PLAN_AHEAD_DAYS);
    const { grams: perTray, estimated } = yieldPerTray(batches, crop);
    const sources: Source[] = [
      ...stock.filter(l => sameCrop(l.crop, crop) && l.remaining > 0).map(l => ({ from: today, useBy: l.useBy, grams: l.remaining })),
      ...batches
        .filter(b => sameCrop(b.cropType, crop) && isBatchGrowing(b))
        .map(b => {
          const ready = b.expectedHarvestDate > today ? b.expectedHarvestDate : today;
          return { from: ready, useBy: addDaysToDate(ready, keeps), grams: activeTrays(b).length * perTray };
        }),
    ];
    for (const d of deliveries) {
      if (d.date > horizon) continue;
      let need = d.items.filter(i => sameCrop(i.crop, crop)).reduce((n, i) => n + i.grams, 0);
      if (!need) continue;
      // Overdue orders are counted as due today.
      const date = d.date < today ? today : d.date;
      for (const s of sources.filter(x => x.from <= date && x.useBy >= date && x.grams > 0).sort((a, b) => a.useBy.localeCompare(b.useBy))) {
        const take = Math.min(s.grams, need);
        s.grams -= take;
        need -= take;
        if (!need) break;
      }
      if (need <= 0) continue;
      const sowBy = addDaysToDate(date, -days);
      if (sowBy < today) {
        const same = short.find(x => x.crop === crop && x.date === date);
        if (same) same.grams += need;
        else short.push({ crop, date, grams: need });
        continue;
      }
      const trays = Math.ceil(need / perTray);
      // The trays' extra grams cover later deliveries while they keep.
      sources.push({ from: date, useBy: addDaysToDate(date, keeps), grams: trays * perTray - need });
      const same = plans.find(p => p.crop === crop && p.sowBy === sowBy);
      if (same) {
        same.trays += trays;
        same.grams += need;
      } else plans.push({ crop, trays, sowBy, forDate: date, grams: need, perTray, estimated });
    }
  }
  return {
    plans: plans.sort((a, b) => a.sowBy.localeCompare(b.sowBy) || a.crop.localeCompare(b.crop)),
    short: short.sort((a, b) => a.date.localeCompare(b.date) || a.crop.localeCompare(b.crop)),
  };
};
