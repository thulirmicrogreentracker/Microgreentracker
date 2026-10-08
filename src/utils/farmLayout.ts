import { AppConfig, Batch, Tray } from "../types";
import {
  activeTrays,
  isBatchGrowing,
  MAX_TRAY_POSITIONS,
  wholeNumber,
} from "./batches";

export interface FarmLayout {
  rackCount: number;
  shelvesPerRack: number;
  traysPerShelf: number;
}
export const getLayout = (config: AppConfig): FarmLayout => {
  const layout = config.farmLayout;
  if (
    layout &&
    [layout.rackCount, layout.shelvesPerRack, layout.traysPerShelf].every(
      (n) => Number.isInteger(n) && n > 0,
    ) &&
    layout.rackCount * layout.shelvesPerRack * layout.traysPerShelf <=
      MAX_TRAY_POSITIONS
  )
    return layout;
  return {
    rackCount: Math.ceil(config.totalTrays / 6),
    shelvesPerRack: 6,
    traysPerShelf: 1,
  };
};
export const normalizeLayout = (value: unknown): FarmLayout | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Partial<FarmLayout>;
  const rackCount = wholeNumber(v.rackCount, 100),
    shelvesPerRack = wholeNumber(v.shelvesPerRack, 500),
    traysPerShelf = wholeNumber(v.traysPerShelf, 100);
  return rackCount &&
    shelvesPerRack &&
    traysPerShelf &&
    rackCount * shelvesPerRack * traysPerShelf <= MAX_TRAY_POSITIONS
    ? { rackCount, shelvesPerRack, traysPerShelf }
    : undefined;
};
export const rackName = (index: number) =>
  `Rack ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
export const slotLocation = (slot: number | undefined, config: AppConfig) => {
  if (slot == null || slot < 1 || slot > config.totalTrays) return null;
  const l = getLayout(config),
    rack = Math.floor((slot - 1) / (l.shelvesPerRack * l.traysPerShelf));
  return {
    rack,
    shelf: Math.floor(
      ((slot - 1) % (l.shelvesPerRack * l.traysPerShelf)) / l.traysPerShelf,
    ),
    position: ((slot - 1) % l.traysPerShelf) + 1,
  };
};
export const locationLabel = (slot: number | undefined, config: AppConfig) => {
  const loc = slotLocation(slot, config);
  return loc
    ? `${rackName(loc.rack)} / Shelf ${loc.shelf + 1} / Slot ${loc.position}`
    : "Unassigned";
};
export const occupiedSlots = (
  batches: Batch[],
): Map<number, { batch: Batch; tray: Tray }> =>
  new Map(
    batches.filter(isBatchGrowing).flatMap((batch) =>
      activeTrays(batch)
        .filter((t) => t.slot != null)
        .map((tray) => [tray.slot!, { batch, tray }] as const),
    ),
  );
