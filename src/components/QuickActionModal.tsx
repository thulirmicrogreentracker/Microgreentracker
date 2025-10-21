import React, { useState } from 'react';
import { X, Droplets, Camera, FileText, Plus } from 'lucide-react';
import { Batch, WateringRecord, BatchNote, BatchPhoto } from '../types';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  actionType: 'watering' | 'photo' | 'note' | null;
  onSave: (batchId: string, data: any) => void;
}

const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  batch,
  actionType,
  onSave
}) => {
  const [waterAmount, setWaterAmount] = useState<number | ''>('');
  const [waterUnit, setWaterUnit] = useState<'ml' | 'cups' | 'liters'>('ml');
  const [waterNotes, setWaterNotes] = useState('');
  
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'general' | 'watering' | 'fertilizer' | 'issue' | 'observation'>('general');
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    switch (actionType) {
      case 'watering':
        const wateringRecord: Omit<WateringRecord, 'id'> = {
          timestamp: new Date().toISOString(),
          amount: waterAmount ? Number(waterAmount) : undefined,
          unit: waterAmount ? waterUnit : undefined,
          notes: waterNotes.trim() || undefined
        };
        onSave(batch.id, { type: 'watering', data: wateringRecord });
        break;

      case 'note':
        const note: Omit<BatchNote, 'id'> = {
          content: noteContent.trim(),
          timestamp: new Date().toISOString(),
          type: noteType
        };
        onSave(batch.id, { type: 'note', data: note });
        break;

      case 'photo':
        if (photoFile) {
          // In a real app, you'd upload to a service like Cloudinary or AWS S3
          const reader = new FileReader();
          reader.onload = (e) => {
            const photo: Omit<BatchPhoto, 'id'> = {
              url: e.target?.result as string,
              caption: photoCaption.trim() || undefined,
              timestamp: new Date().toISOString(),
              stage: batch.stage
            };
            onSave(batch.id, { type: 'photo', data: photo });
          };
          reader.readAsDataURL(photoFile);
        }
        break;
    }

    // Reset form
    setWaterAmount('');
    setWaterUnit('ml');
    setWaterNotes('');
    setNoteContent('');
    setNoteType('general');
    setPhotoFile(null);
    setPhotoCaption('');
    
    onClose();
  };

  if (!isOpen || !batch || !actionType) return null;

  const getTitle = () => {
    switch (actionType) {
      case 'watering': return 'Record Watering';
      case 'photo': return 'Add Photo';
      case 'note': return 'Add Note';
      default: return 'Quick Action';
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'watering': return Droplets;
      case 'photo': return Camera;
      case 'note': return FileText;
      default: return Plus;
    }
  };

  const Icon = getIcon();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Icon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
              <p className="text-sm text-gray-600">{batch.cropType} - {batch.trayId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {actionType === 'watering' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value ? Number(e.target.value) : '')}
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
                    value={waterUnit}
                    onChange={(e) => setWaterUnit(e.target.value as 'ml' | 'cups' | 'liters')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="ml">ml</option>
                    <option value="cups">cups</option>
                    <option value="liters">liters</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={waterNotes}
                  onChange={(e) => setWaterNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Any observations about watering..."
                />
              </div>
            </>
          )}

          {actionType === 'note' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Type
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as BatchNote['type'])}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="general">General</option>
                  <option value="observation">Observation</option>
                  <option value="watering">Watering</option>
                  <option value="fertilizer">Fertilizer</option>
                  <option value="issue">Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Enter your note..."
                  required
                />
              </div>
            </>
          )}

          {actionType === 'photo' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Describe this photo..."
                />
              </div>
            </>
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
              <Plus className="w-4 h-4 mr-1.5" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickActionModal;