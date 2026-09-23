import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, CreditCard as Edit3, Hash, ChevronLeft } from 'lucide-react';
import { Batch, CropType } from '../types';
import { addDaysToDate } from '../utils/dateUtils';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editBatch?: Batch | null;
  onUpdate?: (batch: Batch) => void;
  cropTypes: CropType[];
  availableTrayNumbers: number[];
  totalTrays: number;
  trayNumberPrefix: string;
}

const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  editBatch,
  onUpdate,
  cropTypes,
  availableTrayNumbers,
  totalTrays,
  trayNumberPrefix,
}) => {
  const [cropType, setCropType] = useState('');
  const [trayId, setTrayId] = useState('');
  const [trayNumber, setTrayNumber] = useState<number | ''>('');
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [stage, setStage] = useState<Batch['stage']>('sowing');
  const [yieldAmount, setYieldAmount] = useState<number | ''>('');
  const [yieldUnit, setYieldUnit] = useState<'grams' | 'ounces' | 'pounds'>('grams');

  useEffect(() => {
    if (cropType && sowingDate) {
      const selectedCrop = cropTypes.find(crop => crop.name === cropType);
      if (selectedCrop) {
        setExpectedHarvestDate(addDaysToDate(sowingDate, selectedCrop.daysToHarvest));
      }
    }
  }, [cropType, sowingDate]);

  useEffect(() => {
    if (editBatch) {
      setCropType(editBatch.cropType);
      setTrayId(editBatch.trayId);
      setTrayNumber(editBatch.trayNumber ?? '');
      setSowingDate(editBatch.sowingDate);
      setExpectedHarvestDate(editBatch.expectedHarvestDate);
      setStage(editBatch.stage);
      setYieldAmount(editBatch.yieldAmount || '');
      setYieldUnit(editBatch.yieldUnit || 'grams');
    } else {
      setCropType('');
      setTrayId('');
      setTrayNumber(availableTrayNumbers.length > 0 ? availableTrayNumbers[0] : '');
      setSowingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('');
      setStage('sowing');
      setYieldAmount('');
      setYieldUnit('grams');
    }
  }, [editBatch, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropType.trim() || !trayId.trim()) return;

    const batchData = {
      cropType: cropType.trim(),
      trayId: trayId.trim(),
      trayNumber: trayNumber === '' ? undefined : Number(trayNumber),
      sowingDate,
      expectedHarvestDate,
      stage,
      notes: editBatch?.notes || [],
      photos: editBatch?.photos || [],
      watering: editBatch?.watering || [],
      lighting: editBatch?.lighting || [],
      yieldAmount: yieldAmount ? Number(yieldAmount) : undefined,
      yieldUnit: yieldAmount ? yieldUnit : undefined,
    };

    if (editBatch && onUpdate) {
      onUpdate({ ...editBatch, ...batchData, updatedAt: new Date().toISOString() });
    } else {
      onAdd(batchData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      {/* Mobile sheet header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {editBatch ? 'Edit Batch' : 'New Batch'}
        </h2>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Crop Type</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            >
              <option value="">Select crop</option>
              {cropTypes.map(crop => (
                <option key={crop.name} value={crop.name}>{crop.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tray ID</label>
            <input
              type="text"
              value={trayId}
              onChange={(e) => setTrayId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="e.g., T001"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Hash className="w-3.5 h-3.5 inline mr-1" />
            Physical Tray Number
          </label>
          {!editBatch && availableTrayNumbers.length === 0 ? (
            <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              All {totalTrays} trays are in use. Complete a batch to free up a tray, or increase your tray count in Config.
            </div>
          ) : (
            <select
              value={trayNumber}
              onChange={(e) => setTrayNumber(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              {editBatch && <option value="">Unassigned</option>}
              {editBatch && editBatch.trayNumber != null && !availableTrayNumbers.includes(editBatch.trayNumber) && (
                <option value={editBatch.trayNumber}>
                  {trayNumberPrefix} #{editBatch.trayNumber} (in use)
                </option>
              )}
              {availableTrayNumbers.map(n => (
                <option key={n} value={n}>{trayNumberPrefix} #{n}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {availableTrayNumbers.length} of {totalTrays} trays available
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sowing Date</label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Harvest</label>
            <input
              type="date"
              value={expectedHarvestDate}
              onChange={(e) => setExpectedHarvestDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Stage</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Batch['stage'])}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          >
            <option value="sowing">Sowing</option>
            <option value="germination">Germination</option>
            <option value="growth">Growing</option>
            <option value="harvest">Ready to Harvest</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {(stage === 'harvest' || stage === 'completed') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Yield Amount</label>
              <input
                type="number"
                value={yieldAmount}
                onChange={(e) => setYieldAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
              <select
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value as 'grams' | 'ounces' | 'pounds')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="grams">Grams</option>
                <option value="ounces">Ounces</option>
                <option value="pounds">Pounds</option>
              </select>
            </div>
          </div>
        )}

        {cropType && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-emerald-900 mb-2">Crop Information</h4>
            {(() => {
              const selectedCrop = cropTypes.find(crop => crop.name === cropType);
              if (!selectedCrop) return null;
              return (
                <div className="grid grid-cols-2 gap-2 text-sm text-emerald-800">
                  <div><span className="font-medium">Germination:</span> {selectedCrop.daysToGermination}d</div>
                  <div><span className="font-medium">Harvest:</span> {selectedCrop.daysToHarvest}d</div>
                  <div><span className="font-medium">Watering:</span> Every {selectedCrop.wateringFrequency}d</div>
                  <div><span className="font-medium">Light:</span> {selectedCrop.lightingHours}h/day</div>
                </div>
              );
            })()}
          </div>
        )}
      </form>

      <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors font-medium flex items-center justify-center"
        >
          {editBatch ? <Edit3 className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {editBatch ? 'Update' : 'Add Batch'}
        </button>
      </div>
    </div>
  );
};

export default AddBatchModal;
