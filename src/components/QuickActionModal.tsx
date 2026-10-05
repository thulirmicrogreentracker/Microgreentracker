import React, { useEffect, useState } from 'react';
import { Droplets, Camera, FileText, Plus, ChevronLeft } from 'lucide-react';
import { Batch, WateringRecord, BatchNote, BatchPhoto } from '../types';
import { savePhotoFromFile } from '../storage/photos';
import { activeTrays, batchCode } from '../utils/batches';
import { stageConfig, STAGE_ORDER } from '../data/stages';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  actionType: 'watering' | 'photo' | 'note' | null;
  trayId?: string; // pre-selected tray for a photo
  onSave: (batchId: string, data: { type: string; data: Record<string, unknown> }) => void;
}

const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  batch,
  actionType,
  trayId,
  onSave,
}) => {
  const [waterAmount, setWaterAmount] = useState<number | ''>('');
  const [waterUnit, setWaterUnit] = useState<NonNullable<WateringRecord['unit']>>('ml');
  const [waterNotes, setWaterNotes] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'general' | 'watering' | 'fertilizer' | 'issue' | 'observation'>('general');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoTrayId, setPhotoTrayId] = useState(''); // '' = whole batch
  const [photoStage, setPhotoStage] = useState<Batch['stage']>('sowing');
  const [preview, setPreview] = useState<string | null>(null);

  // Start every opening with an empty form. This component stays mounted while closed, so without
  // this a photo taken and then cancelled for one batch was still selected (and saved) for the next.
  useEffect(() => {
    if (!isOpen || !batch) return;
    setWaterAmount('');
    setWaterUnit('ml');
    setWaterNotes('');
    setNoteContent('');
    setNoteType('general');
    setPhotoFile(null);
    setPhotoCaption('');
    setPhotoTrayId(trayId ?? '');
    setPhotoStage(batch.stage);
  }, [isOpen, batch?.id, actionType, trayId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!photoFile) return setPreview(null);
    const url = URL.createObjectURL(photoFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    // The Save button sits outside the <form>, so `required` isn't enforced by the browser.
    if (actionType === 'note' && !noteContent.trim()) return;
    if (actionType === 'photo' && !photoFile) return;

    switch (actionType) {
      case 'watering': {
        const wateringRecord: Omit<WateringRecord, 'id'> = {
          timestamp: new Date().toISOString(),
          amount: waterAmount ? Number(waterAmount) : undefined,
          unit: waterAmount ? waterUnit : undefined,
          notes: waterNotes.trim() || undefined,
        };
        onSave(batch.id, { type: 'watering', data: wateringRecord as unknown as Record<string, unknown> });
        break;
      }
      case 'note': {
        const note: Omit<BatchNote, 'id'> = {
          content: noteContent.trim(),
          timestamp: new Date().toISOString(),
          type: noteType,
        };
        onSave(batch.id, { type: 'note', data: note as unknown as Record<string, unknown> });
        break;
      }
      case 'photo': {
        if (photoFile) {
          const caption = photoCaption.trim() || undefined;
          const timestamp = new Date().toISOString();
          const stage = photoStage;
          const trayId = photoTrayId || undefined;
          savePhotoFromFile(photoFile)
            .then(file => {
              const photo: Omit<BatchPhoto, 'id'> = { file, caption, timestamp, stage, ...(trayId ? { trayId } : {}) };
              onSave(batch.id, { type: 'photo', data: photo as unknown as Record<string, unknown> });
            })
            .catch(err => {
              console.error('Saving photo failed:', err);
              window.alert('The photo could not be saved. Please try again.');
            });
        }
        break;
      }
    }

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
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-gray-100 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900">{getTitle()}</h2>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon className="w-4 h-4" />
          {batchCode(batch.batchNumber)} · {batch.cropType} · {batch.trays.length} tray{batch.trays.length === 1 ? '' : 's'}
        </div>

        {actionType === 'watering' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (Optional)</label>
                <input
                  type="number"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="0"
                  min="0"
                  step={waterUnit === 'sprays' ? 1 : 0.1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                <select
                  value={waterUnit}
                  onChange={(e) => setWaterUnit(e.target.value as NonNullable<WateringRecord['unit']>)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="ml">ml</option>
                  <option value="cups">cups</option>
                  <option value="liters">liters</option>
                  <option value="sprays">sprays</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Note Type</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Note Content</label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Which tray?</label>
                <select
                  value={photoTrayId}
                  onChange={(e) => setPhotoTrayId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Whole batch</option>
                  {activeTrays(batch).map(t => (
                    <option key={t.id} value={t.id}>{t.code}{t.slot != null ? ` · #${t.slot}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage</label>
                <select
                  value={photoStage}
                  onChange={(e) => setPhotoStage(e.target.value as Batch['stage'])}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {STAGE_ORDER.map(st => <option key={st} value={st}>{stageConfig[st].label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo</label>
              <label className="flex items-center justify-center gap-2 w-full min-h-[48px] px-3 py-2.5 border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 rounded-lg font-medium cursor-pointer">
                <Camera className="w-4 h-4" />
                {photoFile ? 'Retake photo' : 'Take photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
              {preview && <img src={preview} alt="Selected photo" className="mt-3 w-full max-h-72 object-contain rounded-lg bg-gray-100" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption (Optional)</label>
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
      </form>

      <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
          <Plus className="w-4 h-4 mr-1.5" />
          Save
        </button>
      </div>
    </div>
  );
};

export default QuickActionModal;
