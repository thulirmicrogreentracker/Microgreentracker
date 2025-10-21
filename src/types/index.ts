export interface Batch {
  id: string;
  cropType: string;
  trayId: string;
  sowingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  stage: 'sowing' | 'germination' | 'growth' | 'harvest' | 'completed';
  notes: BatchNote[];
  photos: BatchPhoto[];
  watering: WateringRecord[];
  lighting: LightingRecord[];
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
  url: string;
  caption?: string;
  timestamp: string;
  stage: Batch['stage'];
}

export interface WateringRecord {
  id: string;
  timestamp: string;
  amount?: number;
  unit?: 'ml' | 'cups' | 'liters';
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
}

export interface CropType {
  name: string;
  daysToGermination: number;
  daysToHarvest: number;
  wateringFrequency: number; // days
  lightingHours: number;
  category: 'leafy' | 'herb' | 'brassica' | 'legume' | 'other';
}