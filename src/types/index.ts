export interface Tray {
  id: string;
  code: string; // "T001": numbered from AppConfig.lastTrayNumber, never reused
  slot?: number; // physical tray position, 1..AppConfig.totalTrays
  status: 'active' | 'lost';
  lostDate?: string; // local YYYY-MM-DD
  lostReason?: string; // one of AppConfig.lossReasons
  lostNote?: string;
  harvestWeight?: number; // grams, entered when the batch is harvested
}

export interface Batch {
  id: string;
  batchNumber: number; // shown as "B001": numbered from AppConfig.lastBatchNumber
  cropType: string;
  trays: Tray[];
  seedWeightPerTray?: number; // grams of seed sown in each tray
  sowingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  stage: 'sowing' | 'germination' | 'growth' | 'harvest' | 'completed';
  notes: BatchNote[];
  photos: BatchPhoto[];
  watering: WateringRecord[];
  lighting: LightingRecord[];
  // Total harvest. Set to the sum of the trays' harvestWeight (grams) when weighed per tray;
  // older data may have a total in ounces or pounds instead. Read it with batchYieldGrams().
  yieldAmount?: number;
  yieldUnit?: 'grams' | 'ounces' | 'pounds';
  // Supplies taken from stock when the batch was started (seed, growing media), with what they cost.
  supplyUse?: SupplyUse[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplyUse {
  itemId: string;
  lotId: string;
  amount: number; // in the item's unit
  cost: number; // amount × the lot's price per unit; 0 when no price was entered
}

// Things bought for the farm. Each item (e.g. "Sunflower seed", "Coco peat block") holds the lots bought, and stock is
// taken from the oldest lot first.
export type SupplyKind = 'seed' | 'media' | 'packaging' | 'other';

export interface SupplyItem {
  id: string;
  kind: SupplyKind;
  name: string;
  crop?: string; // seed: the crop it's for (CropType.name); new batches of that crop use it
  unit: string; // 'g' for seed; e.g. 'block', 'kg', 'bag', 'pcs' for the rest
  traysPerUnit?: number; // growing media: trays one unit fills (a 5 kg block → 8 trays)
  autoUse?: boolean; // growing media: taken off for every new batch
  lowAt?: number; // shown as running low at or below this much (in the unit)
  lots: SupplyLot[];
  createdAt: string;
}

export interface SupplyLot {
  id: string;
  purchasedOn: string; // YYYY-MM-DD
  quantity: number; // bought, in the item's unit
  remaining: number;
  price?: number; // paid for the whole lot, in the shop currency
  supplier?: string;
  lotNumber?: string;
  expiresOn?: string; // YYYY-MM-DD
  note?: string;
}

export interface BatchNote {
  id: string;
  content: string;
  timestamp: string;
  type: 'general' | 'watering' | 'fertilizer' | 'issue' | 'observation';
}

export interface BatchPhoto {
  id: string;
  file: string; // file name inside the app's photos folder (see src/storage/photos.ts)
  caption?: string;
  timestamp: string;
  stage: Batch['stage'];
  trayId?: string; // Tray.id when the photo shows one tray; absent for the whole batch
}

export interface WateringRecord {
  id: string;
  timestamp: string;
  amount?: number;
  unit?: 'ml' | 'cups' | 'liters' | 'sprays';
  notes?: string;
}

export interface LightingRecord {
  id: string;
  timestamp: string;
  duration: number; // hours
  intensity?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface Reminder {
  id: string;
  batchId: string;
  type: 'watering' | 'germination' | 'harvest' | 'general';
  title: string;
  message: string;
  scheduledFor: string;
  completed: boolean;
  createdAt: string;
}

export interface BatchStats {
  total: number;
  sowing: number;
  germination: number;
  growth: number;
  harvest: number;
  completed: number;
  avgDaysToHarvest: number;
  totalYield: number;
  lost: number; // batches whose trays were all lost (not counted in the stages above)
  traysGrowing: number;
  traysLost: number;
}

export interface CropType {
  name: string;
  daysToGermination: number;
  daysToHarvest: number;
  wateringFrequency: number; // days
  lightingHours: number;
  category: string; // one of AppConfig.categories
  shelfLifeDays?: number; // days a harvest keeps; DEFAULT_SHELF_LIFE when not set
}

// Shop mode: whether it's shown, its colour (a key from data/shop.ts) and the currency for prices (ISO 4217 code).
export interface ShopSettings {
  enabled: boolean;
  accent: string;
  currency: string;
}

export interface AppConfig {
  // Rack / shelf arrangement of the tray positions (1..totalTrays); absent means the default vertical racks.
  farmLayout?: {
    rackCount: number;
    shelvesPerRack: number;
    traysPerShelf: number;
  };
  totalTrays: number;
  trayNumberPrefix: string;
  categories: string[];
  categoryIcons: Record<string, string>; // category → icon key from data/categoryIcons.ts
  lossReasons: string[];
  // Highest batch / tray number handed out so far. Saved with the data (and so in backups), and never
  // lower than the numbers already in use, so new batches and trays keep counting up after a restore.
  lastBatchNumber: number;
  lastTrayNumber: number;
  shop: ShopSettings;
}

export interface AppData {
  batches: Batch[];
  cropTypes: CropType[];
  config: AppConfig;
  reminders: Reminder[];
  supplies: SupplyItem[];
  stock: StockLot[];
}

// Harvested microgreens waiting to be sold, in grams. A harvest adds a lot; sales and wastage take from it, from the
// lot whose use-by date comes first.
export interface StockLot {
  id: string; // 'h-<batch id>' for a harvest, so weighing again updates the same lot
  crop: string;
  batchId?: string;
  harvestedOn: string; // YYYY-MM-DD
  useBy: string; // YYYY-MM-DD: harvestedOn + the crop's shelf life
  grams: number; // added to stock
  remaining: number;
  moves: StockMove[];
  note?: string;
}

export interface StockMove {
  id: string;
  date: string; // YYYY-MM-DD
  grams: number; // taken out (sold, waste) or the change (adjust, + or −)
  kind: 'sold' | 'waste' | 'adjust';
  ref?: string; // the order or sale it went to
  note?: string;
}
