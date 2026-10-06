import { AppConfig, Batch, BatchPhoto, Tray } from '../types';

export const newId = (): string => Date.now().toString() + Math.random().toString(36).slice(2, 11);

export const batchCode = (n: number): string => `B${String(n).padStart(3, '0')}`;
export const trayCode = (n: number): string => `T${String(n).padStart(3, '0')}`;

// Batch and tray numbers go up to B99999 / T99999.
export const MAX_NUMBER = 99999;
export const MAX_TRAY_POSITIONS = 2000;

// A whole number from 0 to max, or the fallback for anything else (text, decimals, 4e+123, negative).
export const wholeNumber = (value: unknown, max: number, fallback = 0): number => {
  const n = typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
};

// The number at the end of a tray code ("T014" → 14, "Rack-7" → 7); 0 when there is none or it is out of range.
export const codeNumber = (code: string): number => {
  const match = /(\d+)\s*$/.exec(code);
  return match ? wholeNumber(Number(match[1]), MAX_NUMBER) : 0;
};

// Code of the tray a photo shows ("T003"), or undefined for a whole-batch photo or a tray since removed.
export const photoTrayCode = (batch: Batch, photo: BatchPhoto): string | undefined =>
  photo.trayId ? batch.trays.find(t => t.id === photo.trayId)?.code : undefined;

export const activeTrays = (batch: Batch): Tray[] => batch.trays.filter(t => t.status === 'active');
export const lostTrays = (batch: Batch): Tray[] => batch.trays.filter(t => t.status === 'lost');

// Harvested weight of a batch in grams: the trays' weights when they were weighed, otherwise the older total.
export const batchYieldGrams = (batch: Batch): number => {
  const weighed = activeTrays(batch).filter(t => t.harvestWeight != null);
  if (weighed.length > 0) return weighed.reduce((sum, t) => sum + (t.harvestWeight ?? 0), 0);
  if (!batch.yieldAmount) return 0;
  if (batch.yieldUnit === 'ounces') return batch.yieldAmount * 28.35;
  if (batch.yieldUnit === 'pounds') return batch.yieldAmount * 453.59;
  return batch.yieldAmount;
};

// Seed sown in the whole batch, lost trays included (the seed was still used).
export const batchSeedGrams = (batch: Batch): number => (batch.seedWeightPerTray ?? 0) * batch.trays.length;

// "1,250 g"; one decimal below 10 g.
export const formatGrams = (grams: number): string =>
  `${grams < 10 ? Math.round(grams * 10) / 10 : Math.round(grams).toLocaleString('en-IN')} g`;

// Every tray of the batch was lost, so it will never be harvested.
export const isBatchLost = (batch: Batch): boolean => batch.trays.length > 0 && batch.trays.every(t => t.status === 'lost');

// Still growing: takes up tray positions, gets reminders.
export const isBatchGrowing = (batch: Batch): boolean => batch.stage !== 'completed' && !isBatchLost(batch);

export const highestBatchNumber = (batches: Batch[]): number =>
  batches.reduce((max, b) => Math.max(max, wholeNumber(b.batchNumber, MAX_NUMBER)), 0);

export const highestTrayNumber = (batches: Batch[]): number =>
  batches.reduce((max, b) => b.trays.reduce((m, t) => Math.max(m, codeNumber(t.code)), max), 0);

// Counters never go below the numbers already in the data, e.g. after restoring a backup or loading test data.
export const syncCounters = (config: AppConfig, batches: Batch[]): AppConfig => ({
  ...config,
  lastBatchNumber: Math.max(wholeNumber(config.lastBatchNumber, MAX_NUMBER), highestBatchNumber(batches)),
  lastTrayNumber: Math.max(wholeNumber(config.lastTrayNumber, MAX_NUMBER), highestTrayNumber(batches)),
});

// Positions held by trays that are still growing.
export const usedSlots = (batches: Batch[]): Set<number> =>
  new Set(
    batches
      .filter(isBatchGrowing)
      .flatMap(b => activeTrays(b).map(t => t.slot))
      .filter((s): s is number => s != null),
  );

export const freeSlots = (batches: Batch[], totalTrays: number): number[] => {
  const used = usedSlots(batches);
  return Array.from({ length: totalTrays }, (_, i) => i + 1).filter(n => !used.has(n));
};

export const slotLabel = (prefix: string, slot: number): string => `${prefix || 'Tray'} #${slot}`;

// "T014–T018" for consecutive codes, otherwise "T014, T016".
export const trayRange = (trays: Tray[]): string => {
  const codes = trays.map(t => t.code).filter(Boolean);
  if (codes.length <= 2) return codes.join(', ');
  const nums = codes.map(codeNumber);
  const consecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return consecutive ? `${codes[0]}–${codes[codes.length - 1]}` : `${codes[0]} … ${codes[codes.length - 1]}`;
};
