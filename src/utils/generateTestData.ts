import { Batch, CropType, WateringRecord, BatchNote, Tray } from '../types';
import { defaultLossReasons } from '../data/lossReasons';
import { trayCode } from './batches';

const cropTypes: CropType[] = [
  { name: 'Radish', daysToGermination: 2, daysToHarvest: 6, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Broccoli', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Sunflower', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 2, lightingHours: 14, category: 'Other' },
  { name: 'Pea Shoots', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Arugula', daysToGermination: 2, daysToHarvest: 7, wateringFrequency: 1, lightingHours: 12, category: 'Leafy' },
  { name: 'Kale', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Basil', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 14, category: 'Herb' },
  { name: 'Mustard', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Lettuce', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Leafy' },
  { name: 'Cilantro', daysToGermination: 7, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Mizuna', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Cabbage', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
];

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function daysAgoDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDate(d);
}

function daysFromNowDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDate(d);
}

function randomId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateWateringRecords(sowingDaysAgo: number, crop: CropType): WateringRecord[] {
  const records: WateringRecord[] = [];
  const freq = crop.wateringFrequency;
  const amounts = [50, 75, 100, 125, 150];

  for (let day = 0; day <= sowingDaysAgo; day += freq) {
    if (day === 0) continue;
    records.push({
      id: randomId(),
      timestamp: daysAgoISO(day),
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      unit: 'ml',
      notes: Math.random() < 0.2 ? 'Soil looks dry, added extra' : undefined,
    });
  }
  return records;
}

const noteTemplates: { type: BatchNote['type']; content: string }[] = [
  { type: 'observation', content: 'Seeds are sprouting nicely, good germination rate' },
  { type: 'observation', content: 'Leaves are developing vibrant color' },
  { type: 'watering', content: 'Soil moisture looks good after watering' },
  { type: 'observation', content: 'Growth is progressing on schedule' },
  { type: 'issue', content: 'Some yellowing on edges, may need more light' },
  { type: 'observation', content: 'Cotyledons are fully open' },
  { type: 'fertilizer', content: 'Added diluted kelp extract to water' },
  { type: 'observation', content: 'Plants reaching for light, adjusted tray position' },
  { type: 'issue', content: 'Slight mold spotting on a few seeds, increased airflow' },
  { type: 'observation', content: 'True leaves starting to emerge' },
];

function generateNotes(sowingDaysAgo: number): BatchNote[] {
  const notes: BatchNote[] = [];
  const noteCount = Math.min(Math.floor(sowingDaysAgo / 2), 5);

  for (let i = 0; i < noteCount; i++) {
    const dayOffset = Math.floor(Math.random() * sowingDaysAgo);
    const template = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
    notes.push({
      id: randomId(),
      content: template.content,
      timestamp: daysAgoISO(dayOffset),
      type: template.type,
    });
  }
  return notes.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function determineStage(sowingDaysAgo: number, crop: CropType): {
  stage: Batch['stage'];
  actualHarvestDate?: string;
} {
  if (sowingDaysAgo >= crop.daysToHarvest + 2) {
    // Harvested on the crop's usual day after sowing; tray weights are added by the caller.
    return { stage: 'completed', actualHarvestDate: daysAgoDateStr(sowingDaysAgo - crop.daysToHarvest) };
  }
  if (sowingDaysAgo >= crop.daysToHarvest - 1) {
    return { stage: 'harvest' };
  }
  if (sowingDaysAgo >= crop.daysToGermination + 2) {
    return { stage: 'growth' };
  }
  if (sowingDaysAgo >= crop.daysToGermination) {
    return { stage: 'germination' };
  }
  return { stage: 'sowing' };
}

// Sample batches of 1-4 trays each. Growing trays get positions 1..totalTrays while there are free ones,
// and about one tray in eight is marked lost.
export function generateTestBatches(totalTrays: number): Batch[] {
  const batches: Batch[] = [];
  let nextTray = 0;
  let nextSlot = 1;

  // Spread batches across 30 days with staggered sowing dates
  const sowingSchedule: { cropIdx: number; daysAgo: number }[] = [];

  // Completed batches (sown 14-30 days ago)
  for (let i = 28; i >= 14; i -= 3) {
    sowingSchedule.push({ cropIdx: Math.floor(Math.random() * cropTypes.length), daysAgo: i });
  }
  // Harvest-ready batches (sown ~8-13 days ago)
  for (let i = 12; i >= 8; i -= 2) {
    sowingSchedule.push({ cropIdx: Math.floor(Math.random() * cropTypes.length), daysAgo: i });
  }
  // Growing batches (sown 4-7 days ago)
  for (let i = 7; i >= 4; i -= 1) {
    sowingSchedule.push({ cropIdx: Math.floor(Math.random() * cropTypes.length), daysAgo: i });
  }
  // Germination batches (sown 2-3 days ago)
  sowingSchedule.push({ cropIdx: 7, daysAgo: 3 });
  sowingSchedule.push({ cropIdx: 5, daysAgo: 2 });
  // Sowing batches (sown today or yesterday)
  sowingSchedule.push({ cropIdx: 8, daysAgo: 1 });
  sowingSchedule.push({ cropIdx: 2, daysAgo: 0 });

  sowingSchedule.forEach((schedule, idx) => {
    const crop = cropTypes[schedule.cropIdx];
    const sowingDate = daysAgoDateStr(schedule.daysAgo);
    const expectedHarvest = daysFromNowDateStr(crop.daysToHarvest - schedule.daysAgo);
    const stageInfo = determineStage(schedule.daysAgo, crop);

    const growing = stageInfo.stage !== 'completed';
    const trays: Tray[] = Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => {
      const lost = schedule.daysAgo >= 2 && Math.random() < 0.125;
      const slot = growing && !lost && nextSlot <= totalTrays ? nextSlot++ : undefined;
      return {
        id: randomId(),
        code: trayCode(++nextTray),
        slot,
        status: lost ? 'lost' : 'active',
        ...(stageInfo.stage === 'completed' && !lost ? { harvestWeight: Math.round(150 + Math.random() * 200) } : {}),
        ...(lost ? {
          lostDate: daysAgoDateStr(Math.floor(Math.random() * schedule.daysAgo)),
          lostReason: defaultLossReasons[Math.floor(Math.random() * 4)],
        } : {}),
      };
    });

    const batch: Batch = {
      id: randomId(),
      batchNumber: idx + 1,
      cropType: crop.name,
      trays,
      seedWeightPerTray: 10 + Math.round(Math.random() * 20),
      sowingDate,
      expectedHarvestDate: expectedHarvest,
      actualHarvestDate: stageInfo.actualHarvestDate,
      stage: stageInfo.stage,
      notes: generateNotes(schedule.daysAgo),
      photos: [],
      watering: generateWateringRecords(schedule.daysAgo, crop),
      lighting: [],
      ...(stageInfo.stage === 'completed' ? {
        yieldAmount: trays.reduce((sum, t) => sum + (t.harvestWeight ?? 0), 0),
        yieldUnit: 'grams' as const,
      } : {}),
      createdAt: daysAgoISO(schedule.daysAgo),
      updatedAt: daysAgoISO(Math.max(0, schedule.daysAgo - 1)),
    };

    batches.push(batch);
  });

  return batches;
}
