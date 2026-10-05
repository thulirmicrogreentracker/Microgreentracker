import React, { useState, useEffect } from 'react';
import { Plus, Minus, CreditCard as Edit3, Hash, ChevronLeft, Trash2 } from 'lucide-react';
import { AppConfig, Batch, CropType, Tray } from '../types';
import { addDaysToDate, formatDate, todayLocal } from '../utils/dateUtils';
import { batchCode, newId, slotLabel, trayCode } from '../utils/batches';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBatch?: Batch | null;
  // New trays have an empty code and a new batch has batchNumber 0; the app numbers them when saving.
  onSave: (batch: Batch) => void;
  cropTypes: CropType[];
  config: AppConfig;
  freeSlots: number[]; // positions not held by any growing tray
}

const MAX_TRAYS = 200;

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors';

const AddBatchModal: React.FC<AddBatchModalProps> = ({ isOpen, onClose, editBatch, onSave, cropTypes, config, freeSlots }) => {
  const [cropType, setCropType] = useState('');
  const [sowingDate, setSowingDate] = useState(todayLocal());
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [stage, setStage] = useState<Batch['stage']>('sowing');
  const [seedText, setSeedText] = useState(''); // grams per tray
  const [trays, setTrays] = useState<Tray[]>([]);
  const [showPositions, setShowPositions] = useState(false);
  const [countText, setCountText] = useState('1');
  const [error, setError] = useState('');

  // Positions this form may hand out: the free ones plus those the batch's growing trays already hold.
  // A lost tray's old position may have been taken since, so it doesn't count.
  const ownSlots = (editBatch?.trays ?? []).filter(t => t.status === 'active').map(t => t.slot).filter((s): s is number => s != null);
  const selectableSlots = [...new Set([...freeSlots, ...ownSlots])].sort((a, b) => a - b);

  const draftTray = (taken: Set<number | undefined>): Tray => ({
    id: newId(),
    code: '',
    slot: selectableSlots.find(s => !taken.has(s)),
    status: 'active',
  });

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editBatch) {
      setCropType(editBatch.cropType);
      setSowingDate(editBatch.sowingDate);
      setExpectedHarvestDate(editBatch.expectedHarvestDate);
      setStage(editBatch.stage);
      setSeedText(editBatch.seedWeightPerTray != null ? String(editBatch.seedWeightPerTray) : '');
      setTrays(editBatch.trays.map(t => ({ ...t })));
      setShowPositions(true);
    } else {
      setCropType('');
      setSowingDate(todayLocal());
      setExpectedHarvestDate('');
      setStage('sowing');
      setSeedText('');
      setTrays([draftTray(new Set())]);
      setCountText('1');
      setShowPositions(false);
    }
  }, [editBatch, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // The expected harvest follows the crop and sowing date, but only when the user changes one of them,
  // so opening a batch for editing keeps a harvest date that was set by hand.
  const recalcHarvest = (crop: string, sown: string) => {
    const selected = cropTypes.find(c => c.name === crop);
    if (selected && sown) setExpectedHarvestDate(addDaysToDate(sown, selected.daysToHarvest));
  };

  const setTrayCount = (n: number) => {
    const count = Math.max(1, Math.min(MAX_TRAYS, Math.round(n) || 1));
    setCountText(String(count));
    setTrays(prev => {
      if (count <= prev.length) return prev.slice(0, count);
      const next = [...prev];
      const taken = new Set(next.map(t => t.slot));
      while (next.length < count) {
        const t = draftTray(taken);
        taken.add(t.slot);
        next.push(t);
      }
      return next;
    });
  };

  const addTray = () => setTrays(prev => [...prev, draftTray(new Set(prev.map(t => t.slot)))]);
  const removeTray = (id: string) => setTrays(prev => prev.filter(t => t.id !== id));
  const setSlot = (id: string, slot: number | undefined) => setTrays(prev => prev.map(t => (t.id === id ? { ...t, slot } : t)));

  // Mark a lost tray as growing again. It keeps its old position if that is still free.
  const restoreTray = (id: string) => setTrays(prev => prev.map(t => {
    if (t.id !== id) return t;
    const slotFree = t.slot != null && selectableSlots.includes(t.slot)
      && !prev.some(o => o.id !== id && o.status === 'active' && o.slot === t.slot);
    return { ...t, status: 'active', slot: slotFree ? t.slot : undefined, lostReason: undefined, lostDate: undefined, lostNote: undefined };
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropType) return setError('Choose a crop.');
    if (trays.length === 0) return setError('A batch needs at least one tray.');
    if (!sowingDate || !expectedHarvestDate) return setError('Set the sowing and harvest dates.');

    const now = new Date().toISOString();
    const base: Batch = editBatch ?? {
      id: newId(),
      batchNumber: 0,
      cropType,
      trays: [],
      sowingDate,
      expectedHarvestDate,
      stage,
      notes: [],
      photos: [],
      watering: [],
      lighting: [],
      createdAt: now,
      updatedAt: now,
    };
    onSave({
      ...base,
      cropType,
      trays,
      sowingDate,
      expectedHarvestDate,
      stage,
      actualHarvestDate: stage === 'completed' ? base.actualHarvestDate || todayLocal() : base.actualHarvestDate,
      seedWeightPerTray: Number(seedText) > 0 ? Math.round(Number(seedText) * 10) / 10 : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  const newTrays = trays.filter(t => !t.code);
  const firstNewCode = config.lastTrayNumber + 1;
  const codeFor = (t: Tray) => t.code || trayCode(firstNewCode + newTrays.indexOf(t));
  const activeDrafts = trays.filter(t => t.status === 'active');
  const withoutPosition = activeDrafts.filter(t => t.slot == null).length;
  const prefix = config.trayNumberPrefix;
  const selectedCrop = cropTypes.find(crop => crop.name === cropType);
  const categories = [...new Set(cropTypes.map(c => c.category))];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {editBatch ? `Edit ${batchCode(editBatch.batchNumber)}` : `New Batch ${batchCode(config.lastBatchNumber + 1)}`}
        </h2>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Crop</label>
          <select
            value={cropType}
            onChange={e => { setCropType(e.target.value); recalcHarvest(e.target.value, sowingDate); }}
            className={inputClass}
            required
          >
            <option value="">Select crop</option>
            {categories.map(cat => (
              <optgroup key={cat} label={cat}>
                {cropTypes.filter(c => c.category === cat).map(crop => (
                  <option key={crop.name} value={crop.name}>{crop.name}</option>
                ))}
              </optgroup>
            ))}
            {editBatch && cropType && !selectedCrop && <option value={cropType}>{cropType}</option>}
          </select>
        </div>

        {/* Trays */}
        {editBatch ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-sm font-medium text-gray-700">Trays ({trays.length})</span>
              <button type="button" onClick={addTray} className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add tray
              </button>
            </div>
            <div className="space-y-2">
              {trays.map(t => (
                <div key={t.id} className={`flex items-center gap-2 p-2 rounded-lg border ${t.status === 'lost' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <span className="text-xs font-semibold text-gray-800 w-14 shrink-0">
                    {t.code || <span className="text-emerald-700">{codeFor(t)}</span>}
                  </span>
                  {t.status === 'lost' ? (
                    <>
                      <span className="flex-1 min-w-0 text-xs text-red-700">
                        <span className="block truncate">Lost · {t.lostReason || 'no reason'}{t.lostDate ? ` · ${formatDate(t.lostDate)}` : ''}</span>
                        {t.lostNote && <span className="block truncate text-red-500">“{t.lostNote}”</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => restoreTray(t.id)}
                        className="shrink-0 px-2 py-1 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-md"
                      >
                        Growing again
                      </button>
                    </>
                  ) : (
                    <select
                      value={t.slot ?? ''}
                      onChange={e => setSlot(t.id, e.target.value ? Number(e.target.value) : undefined)}
                      aria-label={`Position of ${codeFor(t)}`}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">No position</option>
                      {selectableSlots
                        .filter(s => s === t.slot || !trays.some(o => o.id !== t.id && o.status === 'active' && o.slot === s))
                        .map(s => <option key={s} value={s}>{slotLabel(prefix, s)}</option>)}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTray(t.id)}
                    disabled={trays.length === 1}
                    aria-label={`Remove tray ${codeFor(t)}`}
                    className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Removing a tray deletes it from the batch. To record a failed tray, use “Report loss” on the batch instead.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of trays</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setTrayCount(trays.length - 1)} aria-label="One tray fewer" className="p-2.5 rounded-lg bg-gray-100 text-gray-700">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={countText}
                min={1}
                max={MAX_TRAYS}
                onChange={e => {
                  setCountText(e.target.value);
                  if (Number(e.target.value) >= 1) setTrayCount(Number(e.target.value));
                }}
                onBlur={() => setCountText(String(trays.length))}
                aria-label="Number of trays"
                className={`${inputClass} text-center font-semibold`}
              />
              <button type="button" onClick={() => setTrayCount(trays.length + 1)} aria-label="One tray more" className="p-2.5 rounded-lg bg-gray-100 text-gray-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              <div>
                Tray IDs: <span className="font-semibold text-gray-900">
                  {trays.length <= 1 ? trays.map(codeFor).join('') : `${codeFor(trays[0])} – ${codeFor(trays[trays.length - 1])}`}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span>
                  <Hash className="w-3 h-3 inline mr-0.5" />
                  Positions: <span className="font-semibold text-gray-900">
                    {trays.filter(t => t.slot != null).map(t => `#${t.slot}`).join(', ') || 'none'}
                  </span>
                </span>
                <button type="button" onClick={() => setShowPositions(v => !v)} className="text-emerald-700 font-medium shrink-0">
                  {showPositions ? 'Done' : 'Change'}
                </button>
              </div>
              {withoutPosition > 0 && (
                <div className="text-amber-700">
                  {withoutPosition} tray{withoutPosition === 1 ? ' has' : 's have'} no position: only {selectableSlots.length} of {config.totalTrays} are free.
                  You can raise the number of positions in Config.
                </div>
              )}
            </div>
            {showPositions && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {trays.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-800 w-11 shrink-0">{codeFor(t)}</span>
                    <select
                      value={t.slot ?? ''}
                      onChange={e => setSlot(t.id, e.target.value ? Number(e.target.value) : undefined)}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">None</option>
                      {selectableSlots
                        .filter(s => s === t.slot || !trays.some(o => o.id !== t.id && o.slot === s))
                        .map(s => <option key={s} value={s}>#{s}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sowing Date</label>
            <input
              type="date"
              value={sowingDate}
              onChange={e => { setSowingDate(e.target.value); recalcHarvest(cropType, e.target.value); }}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Harvest</label>
            <input
              type="date"
              value={expectedHarvestDate}
              onChange={e => setExpectedHarvestDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Seed per tray (grams)</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={seedText}
            onChange={e => setSeedText(e.target.value)}
            placeholder="e.g. 25"
            className={inputClass}
          />
          {Number(seedText) > 0 && trays.length > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              Same for all {trays.length} trays · {Math.round(Number(seedText) * trays.length * 10) / 10} g of seed in total
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value as Batch['stage'])} className={inputClass}>
            <option value="sowing">Sowing</option>
            <option value="germination">Germination</option>
            <option value="growth">Growing</option>
            <option value="harvest">Ready to Harvest</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {stage === 'completed' && (
          <p className="text-xs text-gray-500 -mt-2">Harvest weights are entered per tray with “Weigh trays” on the batch card.</p>
        )}

        {selectedCrop && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-emerald-900 mb-2">{selectedCrop.name} · {selectedCrop.category}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-emerald-800">
              <div><span className="font-medium">Germination:</span> {selectedCrop.daysToGermination}d</div>
              <div><span className="font-medium">Harvest:</span> {selectedCrop.daysToHarvest}d</div>
              <div><span className="font-medium">Watering:</span> Every {selectedCrop.wateringFrequency}d</div>
              <div><span className="font-medium">Light:</span> {selectedCrop.lightingHours}h/day</div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors font-medium flex items-center justify-center"
        >
          {editBatch ? <Edit3 className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {editBatch ? 'Save' : `Add ${trays.length} tray${trays.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
};

export default AddBatchModal;
