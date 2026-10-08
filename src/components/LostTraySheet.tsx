import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { AppConfig, Batch } from '../types';
import { shortLocation } from '../utils/farmLayout';
import { activeTrays, batchCode } from '../utils/batches';
import { todayLocal } from '../utils/dateUtils';

export interface TrayLoss {
  reason: string;
  date: string;
  note?: string;
}

interface LostTraySheetProps {
  batch: Batch;
  config: AppConfig; // for each tray's rack and shelf
  initialTrayIds: string[];
  reasons: string[];
  onSave: (trayIds: string[], loss: TrayLoss) => void;
  onClose: () => void;
}

const LostTraySheet: React.FC<LostTraySheetProps> = ({ batch, config, initialTrayIds, reasons, onSave, onClose }) => {
  const trays = activeTrays(batch);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialTrayIds));
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = selected.size === trays.length;
  const canSave = selected.size > 0 && reason !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Report lost trays · {batchCode(batch.batchNumber)}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">Which trays? ({selected.size} of {trays.length})</span>
              <button
                onClick={() => setSelected(allSelected ? new Set() : new Set(trays.map(t => t.id)))}
                className="text-xs font-medium text-emerald-700"
              >
                {allSelected ? 'Select none' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trays.map(t => {
                const on = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    aria-pressed={on}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
                      on ? 'bg-red-50 border-red-300 text-red-800' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {on && <Check className="w-3 h-3 inline mr-1" />}
                    {t.code}{shortLocation(t.slot, config) && <span className="text-gray-400"> · {shortLocation(t.slot, config)}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Reason</span>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  aria-pressed={reason === r}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-full border ${
                    reason === r ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Edit this list under Settings → Loss reasons.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              max={todayLocal()}
              onChange={e => setDate(e.target.value || todayLocal())}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="What happened?"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave([...selected], { reason, date, note: note.trim() || undefined })}
            disabled={!canSave}
            className="flex-1 px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium disabled:opacity-40"
          >
            Mark {selected.size || ''} lost
          </button>
        </div>
      </div>
    </div>
  );
};

export default LostTraySheet;
