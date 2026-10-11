import { Batch, CropType, StockLot, StockMove } from '../types';
import { addDaysToDate } from './dateUtils';
import { newId } from './batches';

// Days a harvest keeps when its crop has no shelf life set.
export const DEFAULT_SHELF_LIFE = 7;
// Stock is "use soon" from this many days before its use-by date.
export const USE_SOON_DAYS = 1;

const round = (n: number) => Math.round(n * 10) / 10;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const shelfLife = (crop: string, cropTypes: CropType[]): number =>
  cropTypes.find(c => c.name.toLowerCase() === crop.toLowerCase())?.shelfLifeDays ?? DEFAULT_SHELF_LIFE;

// Fills in anything missing or invalid in saved stock.
export const normalizeStock = (raw: unknown): StockLot[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((l): l is Partial<StockLot> => !!l && typeof l === 'object' && typeof (l as StockLot).id === 'string')
    .map(l => {
      const grams = Math.max(0, round(Number(l.grams) || 0));
      const harvestedOn = isDate(l.harvestedOn) ? l.harvestedOn : new Date().toISOString().slice(0, 10);
      return {
        id: l.id!,
        crop: typeof l.crop === 'string' && l.crop.trim() ? l.crop.trim() : 'Microgreens',
        batchId: typeof l.batchId === 'string' ? l.batchId : undefined,
        harvestedOn,
        useBy: isDate(l.useBy) ? l.useBy : addDaysToDate(harvestedOn, DEFAULT_SHELF_LIFE),
        grams,
        remaining: Math.min(grams, Math.max(0, round(Number(l.remaining) || 0))),
        moves: (Array.isArray(l.moves) ? l.moves : []).filter(
          (m): m is StockMove => !!m && typeof m.id === 'string' && isDate(m.date) && Number.isFinite(Number(m.grams))
        ),
        note: typeof l.note === 'string' && l.note.trim() ? l.note : undefined,
      };
    });

export const isExpired = (lot: StockLot, today: string) => lot.useBy < today;
export const isUseSoon = (lot: StockLot, today: string) => !isExpired(lot, today) && lot.useBy <= addDaysToDate(today, USE_SOON_DAYS);

// Adds a harvest to stock, or updates it when the batch is weighed again (keeping what was already sold or wasted).
// A harvest without any weight leaves stock as it is.
export const addHarvestToStock = (stock: StockLot[], batch: Batch, grams: number, date: string, cropTypes: CropType[]): StockLot[] => {
  const id = `h-${batch.id}`;
  const existing = stock.find(l => l.id === id);
  const useBy = addDaysToDate(date, shelfLife(batch.cropType, cropTypes));
  if (existing) {
    const used = existing.grams - existing.remaining;
    return stock.map(l =>
      l.id === id ? { ...l, harvestedOn: date, useBy, grams: round(grams), remaining: Math.max(0, round(grams - used)) } : l
    );
  }
  if (!(grams > 0)) return stock;
  return [...stock, { id, crop: batch.cropType, batchId: batch.id, harvestedOn: date, useBy, grams: round(grams), remaining: round(grams), moves: [] }];
};

// Stock added by hand (bought in, or harvested before the app tracked it).
export const newStockLot = (crop: string, grams: number, harvestedOn: string, cropTypes: CropType[], note?: string): StockLot => ({
  id: newId(),
  crop,
  harvestedOn,
  useBy: addDaysToDate(harvestedOn, shelfLife(crop, cropTypes)),
  grams: round(grams),
  remaining: round(grams),
  moves: [],
  note,
});

// Takes grams out of one lot (wastage, or a correction when `kind` is 'adjust' and grams is the change).
export const moveStock = (stock: StockLot[], lotId: string, move: Omit<StockMove, 'id'>): StockLot[] =>
  stock.map(l => {
    if (l.id !== lotId) return l;
    const change = move.kind === 'adjust' ? move.grams : -move.grams;
    const remaining = Math.max(0, round(l.remaining + change));
    return { ...l, remaining, grams: Math.max(l.grams, remaining), moves: [...l.moves, { ...move, id: newId() }] };
  });

// The order stock of a crop is sold in: the use-by date that comes first, then the oldest harvest. Expired stock is
// never sold.
export const sellOrder = (stock: StockLot[], crop: string, today: string): StockLot[] =>
  stock
    .filter(l => l.crop.toLowerCase() === crop.toLowerCase() && l.remaining > 0 && !isExpired(l, today))
    .sort((a, b) => a.useBy.localeCompare(b.useBy) || a.harvestedOn.localeCompare(b.harvestedOn));

// Takes grams of a crop for a sale, from the lot to use first. Returns the updated stock and anything not in stock.
export const sellFromStock = (stock: StockLot[], crop: string, grams: number, today: string, ref?: string): { stock: StockLot[]; short: number } => {
  let left = round(grams);
  let next = stock;
  for (const lot of sellOrder(stock, crop, today)) {
    if (left <= 0) break;
    const take = round(Math.min(lot.remaining, left));
    next = moveStock(next, lot.id, { date: today, grams: take, kind: 'sold', ref });
    left = round(left - take);
  }
  return { stock: next, short: Math.max(0, left) };
};

export interface CropStock {
  crop: string;
  available: number; // grams not past use-by
  useSoon: number; // grams to use within USE_SOON_DAYS
  expired: number; // grams past use-by, still to be sold or thrown away
  nextUseBy?: string;
  lots: StockLot[]; // with stock left, the one to use first first
}

export const stockByCrop = (stock: StockLot[], today: string): CropStock[] => {
  const crops = new Map<string, CropStock>();
  for (const lot of stock) {
    if (lot.remaining <= 0) continue;
    const key = lot.crop.toLowerCase();
    const c = crops.get(key) ?? { crop: lot.crop, available: 0, useSoon: 0, expired: 0, lots: [] };
    if (isExpired(lot, today)) c.expired = round(c.expired + lot.remaining);
    else {
      c.available = round(c.available + lot.remaining);
      if (isUseSoon(lot, today)) c.useSoon = round(c.useSoon + lot.remaining);
      if (!c.nextUseBy || lot.useBy < c.nextUseBy) c.nextUseBy = lot.useBy;
    }
    c.lots.push(lot);
    crops.set(key, c);
  }
  return [...crops.values()]
    .map(c => ({ ...c, lots: c.lots.sort((a, b) => a.useBy.localeCompare(b.useBy)) }))
    .sort((a, b) => a.crop.localeCompare(b.crop));
};

// Grams wasted (and sold) since a date, from the stock moves.
export const movedSince = (stock: StockLot[], kind: StockMove['kind'], from: string): number =>
  round(stock.reduce((n, l) => n + l.moves.filter(m => m.kind === kind && m.date >= from).reduce((s, m) => s + m.grams, 0), 0));

// Lots with stock left that are past their use-by date or close to it.
export const stockAlerts = (stock: StockLot[], today: string) =>
  stock
    .filter(l => l.remaining > 0 && (isExpired(l, today) || isUseSoon(l, today)))
    .sort((a, b) => a.useBy.localeCompare(b.useBy))
    .map(l => ({ lot: l, expired: isExpired(l, today) }));
