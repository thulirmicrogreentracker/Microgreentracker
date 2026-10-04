import { CheckCircle2, Leaf, Sprout } from 'lucide-react';
import { Batch } from '../types';

export const STAGE_ORDER: Batch['stage'][] = ['sowing', 'germination', 'growth', 'harvest', 'completed'];

export const stageConfig: Record<Batch['stage'], {
  color: string;
  icon: typeof Sprout;
  label: string;
  next: Batch['stage'] | null;
}> = {
  sowing: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Sprout, label: 'Sowing', next: 'germination' },
  germination: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Sprout, label: 'Germination', next: 'growth' },
  growth: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Leaf, label: 'Growing', next: 'harvest' },
  harvest: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'Ready to Harvest', next: 'completed' },
  completed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle2, label: 'Completed', next: null },
};
