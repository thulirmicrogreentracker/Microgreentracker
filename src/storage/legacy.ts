import { normalizeLayout } from "../utils/farmLayout";
import {
  AppConfig,
  AppData,
  Batch,
  BatchPhoto,
  CropType,
  Tray,
} from "../types";
import {
  defaultCategories,
  defaultCategoryIcons,
  defaultCropTypes,
  renamedCategories,
} from "../data/cropTypes";
import { defaultLossReasons } from "../data/lossReasons";
import {
  codeNumber,
  highestBatchNumber,
  MAX_NUMBER,
  MAX_TRAY_POSITIONS,
  syncCounters,
  trayCode,
  wholeNumber,
} from "../utils/batches";
import { isSafePhotoName } from "./photos";

// Before version 1 of the storage format, data lived in localStorage under these keys,
// photos were embedded as data: URLs, and daily snapshots / downloaded .json backups
// used the same key → value shape.
const LEGACY_KEYS = {
  batches: "microgreen-batches",
  cropTypes: "microgreen-crop-types",
  config: "microgreen-config",
  reminders: "microgreen-reminders",
} as const;

export type LegacyRecord = Partial<
  Record<(typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS], unknown>
>;

export const defaultAppData = (): AppData => ({
  batches: [],
  cropTypes: defaultCropTypes,
  config: {
    totalTrays: 10,
    trayNumberPrefix: "Tray",
    categories: defaultCategories,
    categoryIcons: defaultCategoryIcons,
    lossReasons: defaultLossReasons,
    lastBatchNumber: 0,
    lastTrayNumber: 0,
  },
  reminders: [],
});

// Schema version 1 stored a single tray per batch, and lower-case fixed crop categories.
type StoredBatch = Batch & { trayId?: string; trayNumber?: number };

const normalizeTray = (t: Partial<Tray>, fallbackId: string): Tray => ({
  ...t,
  id: t.id || fallbackId,
  code: t.code || "",
  status: t.status === "lost" ? "lost" : "active",
});

const categoryName = (category: unknown): string => {
  const name = typeof category === "string" ? category.trim() : "";
  if (!name) return "Other";
  const renamed = renamedCategories[name.toLowerCase()];
  return (
    renamed ??
    defaultCategories.find((c) => c.toLowerCase() === name.toLowerCase()) ??
    name
  );
};

// Fills in anything missing so older or hand-edited data can't crash the app, and upgrades
// version 1 data: each batch becomes a batch with one tray, keeping its tray ID and position.
export const normalizeAppData = (raw: Partial<AppData>): AppData => {
  const defaults = defaultAppData();
  const rawConfig: Partial<AppConfig> = raw.config ?? {};

  const cropTypes: CropType[] = (
    Array.isArray(raw.cropTypes) && raw.cropTypes.length > 0
      ? raw.cropTypes
      : defaults.cropTypes
  ).map((c) => ({ ...c, category: categoryName(c.category) }));
  const categories = [
    ...new Set([
      ...(Array.isArray(rawConfig.categories) && rawConfig.categories.length > 0
        ? rawConfig.categories
        : defaultCategories
      ).map(categoryName),
      ...cropTypes.map((c) => c.category),
    ]),
  ];
  const storedIcons =
    rawConfig.categoryIcons && typeof rawConfig.categoryIcons === "object"
      ? rawConfig.categoryIcons
      : {};
  const categoryIcons = Object.fromEntries(
    categories.map((c) => [
      c,
      storedIcons[c] ?? defaultCategoryIcons[c] ?? "tag",
    ]),
  );

  let batches = (
    Array.isArray(raw.batches) ? (raw.batches as StoredBatch[]) : []
  ).map((b) => {
    const { trayId, trayNumber, ...rest } = b;
    const trays = Array.isArray(b.trays)
      ? b.trays.map((t, i) => normalizeTray(t, `${b.id}-t${i + 1}`))
      : [
          normalizeTray(
            { code: trayId?.trim() || "", slot: trayNumber ?? undefined },
            `${b.id}-t1`,
          ),
        ];
    return {
      ...rest,
      batchNumber: Number(b.batchNumber) || 0,
      trays,
      notes: Array.isArray(b.notes) ? b.notes : [],
      photos: Array.isArray(b.photos) ? b.photos : [],
      watering: Array.isArray(b.watering) ? b.watering : [],
      lighting: Array.isArray(b.lighting) ? b.lighting : [],
    } as Batch;
  });

  // Number the batches and trays that have no number yet, oldest first, after the highest existing ones.
  // Out-of-range counters (e.g. 4e+123 typed into an older version) fall back to the highest number in use.
  let nextBatch = Math.max(
    wholeNumber(rawConfig.lastBatchNumber, MAX_NUMBER),
    highestBatchNumber(batches),
  );
  let nextTray = Math.max(
    wholeNumber(rawConfig.lastTrayNumber, MAX_NUMBER),
    ...batches.flatMap((b) => b.trays.map((t) => codeNumber(t.code))),
  );
  const byAge = [...batches].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || ""),
  );
  const numbered = new Map(
    byAge.map((b) => [
      b.id,
      {
        ...b,
        batchNumber: b.batchNumber || ++nextBatch,
        trays: b.trays.map((t) =>
          t.code ? t : { ...t, code: trayCode(++nextTray) },
        ),
      },
    ]),
  );
  batches = batches.map((b) => numbered.get(b.id) ?? b);

  const config: AppConfig = syncCounters(
    {
      ...defaults.config,
      ...rawConfig,
      farmLayout: normalizeLayout(rawConfig.farmLayout),
      categories,
      categoryIcons,
      totalTrays:
        wholeNumber(rawConfig.totalTrays, MAX_TRAY_POSITIONS, 0) ||
        defaults.config.totalTrays,
      lossReasons:
        Array.isArray(rawConfig.lossReasons) && rawConfig.lossReasons.length > 0
          ? rawConfig.lossReasons
          : defaultLossReasons,
      lastBatchNumber: nextBatch,
      lastTrayNumber: nextTray,
    },
    batches,
  );

  if (
    config.farmLayout &&
    config.farmLayout.rackCount *
      config.farmLayout.shelvesPerRack *
      config.farmLayout.traysPerShelf !==
      config.totalTrays
  )
    config.farmLayout = undefined;
  return {
    batches,
    cropTypes,
    config,
    reminders: Array.isArray(raw.reminders) ? raw.reminders : [],
  };
};

export const isLegacyRecord = (raw: unknown): raw is LegacyRecord =>
  typeof raw === "object" &&
  raw !== null &&
  Object.values(LEGACY_KEYS).some((k) => k in raw);

export const readLegacyLocalStorage = (): LegacyRecord | null => {
  const record: LegacyRecord = {};
  for (const key of Object.values(LEGACY_KEYS)) {
    try {
      const value = localStorage.getItem(key);
      if (value) record[key] = JSON.parse(value);
    } catch {
      // unreadable key; skip it
    }
  }
  return Object.keys(record).length > 0 ? record : null;
};

// Converts the old shape. Embedded photos are returned separately (name → base64) for the caller to write.
export const fromLegacy = (
  raw: LegacyRecord,
): { data: AppData; photos: Record<string, string> } => {
  const photos: Record<string, string> = {};
  const batches = (
    Array.isArray(raw[LEGACY_KEYS.batches])
      ? (raw[LEGACY_KEYS.batches] as Batch[])
      : []
  ).map((batch) => ({
    ...batch,
    photos: (Array.isArray(batch.photos) ? batch.photos : []).flatMap(
      (photo: BatchPhoto & { url?: string }) => {
        if (photo.file) return [photo];
        const match = /^data:image\/([a-z]+);base64,(.+)$/s.exec(
          photo.url ?? "",
        );
        if (!match) return [];
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        const id =
          String(photo.id).replace(/[^A-Za-z0-9_-]/g, "") ||
          Math.random().toString(36).slice(2);
        const name = `${id}.${ext}`;
        if (!isSafePhotoName(name)) return [];
        photos[name] = match[2];
        const { url: _url, ...rest } = photo; // eslint-disable-line @typescript-eslint/no-unused-vars
        return [{ ...rest, file: name }];
      },
    ),
  }));

  return {
    data: normalizeAppData({
      batches,
      cropTypes: raw[LEGACY_KEYS.cropTypes] as AppData["cropTypes"],
      config: raw[LEGACY_KEYS.config] as AppData["config"],
      reminders: raw[LEGACY_KEYS.reminders] as AppData["reminders"],
    }),
    photos,
  };
};

// Daily snapshots used to be kept in IndexedDB. Reads them without creating the database if it never existed.
export const readLegacySnapshots = (): Promise<
  { timestamp: string; data: LegacyRecord }[]
> =>
  new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open("microgreen-backups");
    } catch {
      return resolve([]);
    }
    req.onupgradeneeded = () => req.transaction?.abort(); // database didn't exist
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("snapshots")) {
        db.close();
        return resolve([]);
      }
      const all = db
        .transaction("snapshots", "readonly")
        .objectStore("snapshots")
        .getAll();
      all.onsuccess = () => {
        db.close();
        resolve(
          (all.result as { timestamp: string; data: LegacyRecord }[]).filter(
            (s) => s.timestamp && s.data,
          ),
        );
      };
      all.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
