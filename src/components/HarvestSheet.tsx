import React, { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { AppConfig, Batch } from '../types';
import { shortLocation } from '../utils/farmLayout';
import { activeTrays, batchCode, formatGrams } from '../utils/batches';
import { todayLocal } from '../utils/dateUtils';

interface HarvestSheetProps {
  batch: Batch;
  config: AppConfig; // for each tray's rack and shelf
  onSave: (weights: Record<string, number | undefined>, date: string) => void; // tray id → grams
  onClose: () => void;
}

// Harvests a batch (or corrects an earlier harvest): one weight per growing tray, in grams.
const HarvestSheet: React.FC<HarvestSheetProps> = ({ batch, config, onSave, onClose }) => {
  const trays = activeTrays(batch);
  const editing = batch.stage === 'completed';
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(trays.map(t => [t.id, t.harvestWeight != null ? String(t.harvestWeight) : ''])),
  );
  const [date, setDate] = useState(batch.actualHarvestDate || todayLocal());
  const [fillAll, setFillAll] = useState('');

  const parsed = (text: string) => (text.trim() === '' || !(Number(text) >= 0) ? undefined : Number(text));
  const entered = trays.map(t => parsed(weights[t.id] ?? '')).filter((w): w is number => w != null);
  const total = entered.reduce((a, b) => a + b, 0);

  const save = () => onSave(Object.fromEntries(trays.map(t => [t.id, parsed(weights[t.id] ?? '')])), date);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            {editing ? 'Harvest weights' : 'Harvest'} · {batchCode(batch.batchNumber)} {batch.cropType}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Harvest date</label>
            <input
              type="date"
              value={date}
              max={todayLocal()}
              onChange={e => setDate(e.target.value || todayLocal())}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {trays.length > 1 && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Same weight for every tray (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={fillAll}
                  onChange={e => setFillAll(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={() => parsed(fillAll) != null && setWeights(Object.fromEntries(trays.map(t => [t.id, fillAll])))}
                disabled={parsed(fillAll) == null}
                className="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg disabled:opacity-40"
              >
                Fill all
              </button>
            </div>
          )}

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Weight per tray (grams)</span>
            <div className="space-y-2">
              {trays.map(t => (
                <label key={t.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-800 w-14 shrink-0">{t.code}</span>
                  <span className="text-xs text-gray-400 w-10 shrink-0">{shortLocation(t.slot, config) ?? ''}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={weights[t.id] ?? ''}
                    onChange={e => setWeights(prev => ({ ...prev, [t.id]: e.target.value }))}
                    aria-label={`Weight of tray ${t.code} in grams`}
                    placeholder="0"
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm bg-white"
                  />
                  <span className="text-xs text-gray-500">g</span>
                </label>
              ))}
            </div>
            {batch.trays.length > trays.length && (
              <p className="text-xs text-gray-400 mt-1.5">Lost trays aren't weighed.</p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg text-sm">
            <span className="text-emerald-800">
              Total · {entered.length} of {trays.length} tray{trays.length === 1 ? '' : 's'} weighed
            </span>
            <span className="font-bold text-emerald-900">{formatGrams(total)}</span>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
            Cancel
          </button>
          <button onClick={save} className="flex-1 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium">
            {editing ? 'Save weights' : 'Harvest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HarvestSheet;
