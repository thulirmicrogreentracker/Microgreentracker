import { AppConfig, Batch, Tray } from '../types';
import { activeTrays, isBatchGrowing, MAX_TRAY_POSITIONS, wholeNumber } from './batches';

export interface FarmLayout {
  rackCount: number;
  shelvesPerRack: number;
  traysPerShelf: number;
}

// Real racks stay within these; larger numbers can't be drawn sensibly on a phone. The total is also capped at
// MAX_TRAY_POSITIONS.
export const MAX_SHELVES_PER_RACK = 10;
export const MAX_TRAYS_PER_SHELF = 8;
export const MAX_RACKS = 400;

export const getLayout = (config: AppConfig): FarmLayout => {
  const layout = normalizeLayout(config.farmLayout);
  if (layout) return layout;
  return {
    rackCount: Math.ceil(config.totalTrays / 6),
    shelvesPerRack: 6,
    traysPerShelf: 1,
  };
};
export const normalizeLayout = (value: unknown): FarmLayout | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Partial<FarmLayout>;
  const rackCount = wholeNumber(v.rackCount, MAX_RACKS),
    shelvesPerRack = wholeNumber(v.shelvesPerRack, MAX_SHELVES_PER_RACK),
    traysPerShelf = wholeNumber(v.traysPerShelf, MAX_TRAYS_PER_SHELF);
  return rackCount &&
    shelvesPerRack &&
    traysPerShelf &&
    rackCount * shelvesPerRack * traysPerShelf <= MAX_TRAY_POSITIONS
    ? { rackCount, shelvesPerRack, traysPerShelf }
    : undefined;
};
export const rackName = (index: number) => `Rack ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
export const slotLocation = (slot: number | undefined, config: AppConfig) => {
  if (slot == null || slot < 1 || slot > config.totalTrays) return null;
  const l = getLayout(config),
    rack = Math.floor((slot - 1) / (l.shelvesPerRack * l.traysPerShelf));
  return {
    rack,
    shelf: Math.floor(((slot - 1) % (l.shelvesPerRack * l.traysPerShelf)) / l.traysPerShelf),
    position: ((slot - 1) % l.traysPerShelf) + 1,
  };
};
// "Rack A / Shelf 2", plus "/ Slot 3" when shelves hold more than one tray.
export const locationLabel = (slot: number | undefined, config: AppConfig) => {
  const loc = slotLocation(slot, config);
  if (!loc) return 'Unassigned';
  const slotPart = getLayout(config).traysPerShelf > 1 ? ` / Slot ${loc.position}` : '';
  return `${rackName(loc.rack)} / Shelf ${loc.shelf + 1}${slotPart}`;
};
// "A2" for Rack A, shelf 2 (or "A2.3" for its third slot), for small tray labels.
export const shortLocation = (slot: number | undefined, config: AppConfig) => {
  const loc = slotLocation(slot, config);
  if (!loc) return null;
  const rack = rackName(loc.rack).slice('Rack '.length);
  return `${rack}${loc.shelf + 1}${getLayout(config).traysPerShelf > 1 ? `.${loc.position}` : ''}`;
};
// "Shelf 2", "Shelves 1–3, 5".
const shelfList = (shelves: number[]) => {
  const sorted = [...new Set(shelves)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (sorted[j + 1] === sorted[j] + 1) j++;
    ranges.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
    i = j;
  }
  return `${sorted.length === 1 ? 'Shelf' : 'Shelves'} ${ranges.join(', ')}`;
};
// Where a group of trays is, one line per rack: ["Rack A · Shelves 1–3", "Rack B · Shelf 1"]. Empty when no tray
// has a position.
export const rackShelves = (slots: (number | undefined)[], config: AppConfig) => {
  const byRack = new Map<number, number[]>();
  for (const slot of slots) {
    const loc = slotLocation(slot, config);
    if (loc) byRack.set(loc.rack, [...(byRack.get(loc.rack) ?? []), loc.shelf + 1]);
  }
  return [...byRack].sort(([a], [b]) => a - b).map(([rack, shelves]) => ({ rack: rackName(rack), shelves: shelfList(shelves) }));
};
export const occupiedSlots = (batches: Batch[]): Map<number, { batch: Batch; tray: Tray }> =>
  new Map(
    batches.filter(isBatchGrowing).flatMap((batch) =>
      activeTrays(batch)
        .filter((t) => t.slot != null)
        .map((tray) => [tray.slot!, { batch, tray }] as const)
    )
  );
