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
  createdAt: string;
  updatedAt: string;
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
}

export interface AppData {
  batches: Batch[];
  cropTypes: CropType[];
  config: AppConfig;
  reminders: Reminder[];
}
