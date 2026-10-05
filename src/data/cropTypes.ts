import { CropType } from '../types';

// A standard microgreen list: one entry per crop, with typical days to germination and harvest.
export const defaultCropTypes: CropType[] = [
  // Brassica
  { name: 'Arugula', daysToGermination: 2, daysToHarvest: 7, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Broccoli', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Cabbage', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Red Cabbage', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Cauliflower', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Collards', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Cress', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Kale', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Kohlrabi', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Mizuna', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Mustard', daysToGermination: 3, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Pak Choi', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Radish', daysToGermination: 2, daysToHarvest: 6, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Tatsoi', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  { name: 'Turnip', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Brassica' },
  // Legumes & Pulses
  { name: 'Adzuki Bean', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Alfalfa', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Chickpea', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Fenugreek', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Lentil', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Mung Bean', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  { name: 'Red Clover', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Legumes & Pulses' },
  // Grains & Grasses
  { name: 'Barley', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Grains & Grasses' },
  { name: 'Oats', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Grains & Grasses' },
  { name: 'Rye', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Grains & Grasses' },
  { name: 'Wheatgrass', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Grains & Grasses' },
  // Herb
  { name: 'Basil', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 14, category: 'Herb' },
  { name: 'Celery', daysToGermination: 7, daysToHarvest: 18, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Chervil', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Cilantro', daysToGermination: 7, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Dill', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Fennel', daysToGermination: 4, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Parsley', daysToGermination: 7, daysToHarvest: 18, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  { name: 'Shiso', daysToGermination: 5, daysToHarvest: 16, wateringFrequency: 1, lightingHours: 12, category: 'Herb' },
  // Leafy
  { name: 'Chicory', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Leafy' },
  { name: 'Endive', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Leafy' },
  { name: 'Lettuce', daysToGermination: 2, daysToHarvest: 8, wateringFrequency: 1, lightingHours: 12, category: 'Leafy' },
  // Allium
  { name: 'Chives', daysToGermination: 6, daysToHarvest: 16, wateringFrequency: 1, lightingHours: 12, category: 'Allium' },
  { name: 'Garlic Chives', daysToGermination: 6, daysToHarvest: 16, wateringFrequency: 1, lightingHours: 12, category: 'Allium' },
  { name: 'Leek', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Allium' },
  { name: 'Onion', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Allium' },
  // Beet & Amaranth
  { name: 'Amaranth', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Beet & Amaranth' },
  { name: 'Beet', daysToGermination: 4, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Beet & Amaranth' },
  { name: 'Quinoa', daysToGermination: 3, daysToHarvest: 10, wateringFrequency: 1, lightingHours: 12, category: 'Beet & Amaranth' },
  { name: 'Spinach', daysToGermination: 4, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Beet & Amaranth' },
  { name: 'Swiss Chard', daysToGermination: 4, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Beet & Amaranth' },
  // Shoots
  { name: 'Buckwheat', daysToGermination: 2, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Shoots' },
  { name: 'Pea Shoots', daysToGermination: 3, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Shoots' },
  { name: 'Popcorn Shoots', daysToGermination: 3, daysToHarvest: 9, wateringFrequency: 1, lightingHours: 12, category: 'Shoots' },
  { name: 'Sunflower', daysToGermination: 2, daysToHarvest: 10, wateringFrequency: 2, lightingHours: 14, category: 'Shoots' },
  // Flowers
  { name: 'Borage', daysToGermination: 5, daysToHarvest: 12, wateringFrequency: 1, lightingHours: 12, category: 'Flowers' },
  { name: 'Marigold', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Flowers' },
  { name: 'Nasturtium', daysToGermination: 5, daysToHarvest: 14, wateringFrequency: 1, lightingHours: 12, category: 'Flowers' },
  // Other
];

export const defaultCategories = ['Brassica', 'Legumes & Pulses', 'Grains & Grasses', 'Herb', 'Leafy', 'Allium', 'Beet & Amaranth', 'Shoots', 'Flowers', 'Other'];

export const defaultCategoryIcons: Record<string, string> = {
  'Brassica': 'leafy-green',
  'Legumes & Pulses': 'bean',
  'Grains & Grasses': 'wheat',
  'Herb': 'leaf',
  'Leafy': 'salad',
  'Allium': 'feather',
  'Beet & Amaranth': 'carrot',
  'Shoots': 'sprout',
  'Flowers': 'flower',
  'Other': 'tag',
};

// Earlier default category names, renamed when data is loaded.
export const renamedCategories: Record<string, string> = { legume: 'Legumes & Pulses' };
