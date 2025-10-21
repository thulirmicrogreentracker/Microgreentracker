import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Tray } from '../types';

interface AddTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tray: Omit<Tray, 'id'>) => void;
  editTray?: Tray | null;
  onUpdate?: (tray: Tray) => void;
}

const commonSeeds = [
  'Arugula', 'Basil', 'Broccoli', 'Cabbage', 'Cilantro', 'Kale', 
  'Lettuce', 'Mizuna', 'Mustard', 'Pea Shoots', 'Radish', 'Sunflower'
];

const AddTrayModal: React.FC<AddTrayModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  editTray, 
  onUpdate 
}) => {
  const [seedType, setSeedType] = useState('');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<Tray['status']>('seeded');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editTray) {
      setSeedType(editTray.seedType);
      setPlantingDate(editTray.plantingDate);
      setStatus(editTray.status);
      setNotes(editTray.notes || '');
    } else {
      setSeedType('');
      setPlantingDate(new Date().toISOString().split('T')[0]);
      setStatus('seeded');
      setNotes('');
    }
  }, [editTray, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedType.trim()) return;

    const trayData = {
      seedType: seedType.trim(),
      plantingDate,
      status,
      notes: notes.trim() || undefined,
    };

    if (editTray && onUpdate) {
      onUpdate({ ...editTray, ...trayData });
    } else {
      onAdd(trayData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editTray ? 'Edit Tray' : 'Add New Tray'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seed Type
            </label>
            <input
              type="text"
              value={seedType}
              onChange={(e) => setSeedType(e.target.value)}
              list="seed-suggestions"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Enter seed type"
              required
            />
            <datalist id="seed-suggestions">
              {commonSeeds.map(seed => (
                <option key={seed} value={seed} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planting Date
            </label>
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Tray['status'])}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="seeded">Seeded</option>
              <option value="germinating">Germinating</option>
              <option value="growing">Growing</option>
              <option value="ready">Ready</option>
              <option value="harvested">Harvested</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
              placeholder="Add any notes about this tray..."
            />
          </div>

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
              <Plus className="w-4 h-4 mr-1.5" />
              {editTray ? 'Update' : 'Add'} Tray
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTrayModal;