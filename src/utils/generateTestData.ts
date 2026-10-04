import { Batch, CropType, WateringRecord, BatchNote } from '../types';

const cropTypes: CropType[] = [
  { name: 'Radish', daysToGermination: 2, daysToHarvest: 6, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
  { name: 'Broccoli', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
  { name: 'Sunflower', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 2, lightingHours: 14, category: 'other' },
  { name: 'Pea Shoots', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'legume' },
  { name: 'Arugula', daysToGermination: 2, daysToHarvest: 7, wateringFrequency: 1, lightingHours: 12, category: 'leafy' },
  { name: 'Kale', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
  { name: 'Basil', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 14, category: 'herb' },
  { name: 'Mustard', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
  { name: 'Lettuce', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'leafy' },
  { name: 'Cilantro', daysToGermination: 7, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'herb' },
  { name: 'Mizuna', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
  { name: 'Cabbage', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'brassica' },
];

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysAgoDateStr(days: number): string {
  return daysAgoISO(days).split('T')[0];
}

function daysFromNowDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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

function generateNotes(sowingDaysAgo: number, crop: CropType): BatchNote[] {
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
  yieldAmount?: number;
  yieldUnit?: 'grams' | 'ounces' | 'pounds';
} {
  if (sowingDaysAgo >= crop.daysToHarvest + 2) {
    const harvestDay = sowingDaysAgo - 2;
    const baseYield = 80 + Math.random() * 120;
    return {
      stage: 'completed',
      actualHarvestDate: daysAgoDateStr(harvestDay),
      yieldAmount: Math.round(baseYield * 10) / 10,
      yieldUnit: 'grams',
    };
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

export function generateTestBatches(): Batch[] {
  const batches: Batch[] = [];
  let trayNumber = 1;
  const totalTrays = 10;

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

    const trayNum = trayNumber;
    trayNumber = (trayNumber % totalTrays) + 1;

    const batch: Batch = {
      id: randomId(),
      cropType: crop.name,
      trayId: `T${String(idx + 1).padStart(3, '0')}`,
      trayNumber: trayNum,
      sowingDate,
      expectedHarvestDate: expectedHarvest,
      actualHarvestDate: stageInfo.actualHarvestDate,
      stage: stageInfo.stage,
      notes: generateNotes(schedule.daysAgo, crop),
      photos: [],
      watering: generateWateringRecords(schedule.daysAgo, crop),
      lighting: [],
      yieldAmount: stageInfo.yieldAmount,
      yieldUnit: stageInfo.yieldUnit,
      createdAt: daysAgoISO(schedule.daysAgo),
      updatedAt: daysAgoISO(Math.max(0, schedule.daysAgo - 1)),
    };

    batches.push(batch);
  });

  return batches;
}
