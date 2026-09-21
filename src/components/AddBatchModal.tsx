import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, CreditCard as Edit3 } from 'lucide-react';
import { Batch, CropType } from '../types';
import { addDaysToDate } from '../utils/dateUtils';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editBatch?: Batch | null;
  onUpdate?: (batch: Batch) => void;
  cropTypes: CropType[];
}

const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  editBatch,
  onUpdate,
  cropTypes
}) => {
  const [cropType, setCropType] = useState('');
  const [trayId, setTrayId] = useState('');
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [stage, setStage] = useState<Batch['stage']>('sowing');
  const [yieldAmount, setYieldAmount] = useState<number | ''>('');
  const [yieldUnit, setYieldUnit] = useState<'grams' | 'ounces' | 'pounds'>('grams');

  // Auto-calculate expected harvest date when crop type or sowing date changes
  useEffect(() => {
    if (cropType && sowingDate) {
      const selectedCrop = cropTypes.find(crop => crop.name === cropType);
      if (selectedCrop) {
        const harvestDate = addDaysToDate(sowingDate, selectedCrop.daysToHarvest);
        setExpectedHarvestDate(harvestDate);
      }
    }
  }, [cropType, sowingDate]);

  useEffect(() => {
    if (editBatch) {
      setCropType(editBatch.cropType);
      setTrayId(editBatch.trayId);
      setSowingDate(editBatch.sowingDate);
      setExpectedHarvestDate(editBatch.expectedHarvestDate);
      setStage(editBatch.stage);
      setYieldAmount(editBatch.yieldAmount || '');
      setYieldUnit(editBatch.yieldUnit || 'grams');
    } else {
      setCropType('');
      setTrayId('');
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
      onUpdate({ 
        ...editBatch, 
        ...batchData,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAdd(batchData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editBatch ? 'Edit Batch' : 'Add New Batch'}
          </h2>
          {editBatch && (
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {editBatch.cropType} - {editBatch.trayId}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              >
                <option value="">Select crop type</option>
                {cropTypes.map(crop => (
                  <option key={crop.name} value={crop.name}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tray ID
              </label>
              <input
                type="text"
                value={trayId}
                onChange={(e) => setTrayId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="e.g., T001, A1, etc."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sowing Date
              </label>
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Harvest
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Stage
            </label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yield Amount
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
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

          {/* Crop Information Display */}
          {cropType && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-emerald-900 mb-2">Crop Information</h4>
              {(() => {
                const selectedCrop = cropTypes.find(crop => crop.name === cropType);
                if (!selectedCrop) return null;
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm text-emerald-800">
                    <div>
                      <span className="font-medium">Germination:</span> {selectedCrop.daysToGermination} days
                    </div>
                    <div>
                      <span className="font-medium">Harvest:</span> {selectedCrop.daysToHarvest} days
                    </div>
                    <div>
                      <span className="font-medium">Watering:</span> Every {selectedCrop.wateringFrequency} day(s)
                    </div>
                    <div>
                      <span className="font-medium">Light:</span> {selectedCrop.lightingHours}h/day
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors font-medium flex items-center justify-center"
            >
              {editBatch ? (
                <>
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Update Batch
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Batch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBatchModal;