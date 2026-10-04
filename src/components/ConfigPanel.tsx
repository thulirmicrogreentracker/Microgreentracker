import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Droplets, Sun, Timer, Tag, ChevronDown, ChevronUp, Flower2, Leaf, UtensilsCrossed, Wheat, Hash, HardDrive, History, Database, Upload, FolderOpen } from 'lucide-react';
import { CropType, AppConfig, Batch } from '../types';

interface ConfigPanelProps {
  cropTypes: CropType[];
  onUpdateCropTypes: (crops: CropType[]) => void;
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  usedTrayCount: number;
  onBackupNow: () => void;
  onShowRestore: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onLoadTestData: () => void;
  hasBatches: boolean;
}

const categoryIcons: Record<CropType['category'], React.FC<{ className?: string }>> = {
  leafy: Leaf,
  herb: Flower2,
  brassica: UtensilsCrossed,
  legume: Wheat,
  other: Tag,
};

const categoryColors: Record<CropType['category'], string> = {
  leafy: 'text-green-600 bg-green-50',
  herb: 'text-emerald-600 bg-emerald-50',
  brassica: 'text-teal-600 bg-teal-50',
  legume: 'text-amber-600 bg-amber-50',
  other: 'text-gray-600 bg-gray-50',
};

const defaultCrop: Omit<CropType, 'name'> = {
  daysToGermination: 3,
  daysToHarvest: 10,
  wateringFrequency: 1,
  lightingHours: 12,
  category: 'other',
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ cropTypes, onUpdateCropTypes, config, onUpdateConfig, usedTrayCount, onBackupNow, onShowRestore, onExportBackup, onImportBackup, onLoadTestData, hasBatches }) => {
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCrop, setNewCrop] = useState<Omit<CropType, 'name'> & { name: string }>({
    name: '',
    ...defaultCrop,
  });
  const [editForm, setEditForm] = useState<CropType | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const grouped = cropTypes.reduce((acc, crop) => {
    if (!acc[crop.category]) acc[crop.category] = [];
    acc[crop.category].push(crop);
    return acc;
  }, {} as Record<string, CropType[]>);

  const handleAdd = () => {
    if (!newCrop.name.trim()) return;
    const exists = cropTypes.some(c => c.name.toLowerCase() === newCrop.name.trim().toLowerCase());
    if (exists) return;
    onUpdateCropTypes([...cropTypes, { ...newCrop, name: newCrop.name.trim() }]);
    setNewCrop({ name: '', ...defaultCrop });
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editForm) return;
    onUpdateCropTypes(cropTypes.map(c => c.name === editingCrop ? editForm : c));
    setEditingCrop(null);
    setEditForm(null);
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete "${name}" crop configuration?`)) {
      onUpdateCropTypes(cropTypes.filter(c => c.name !== name));
    }
  };

  const startEdit = (crop: CropType) => {
    setEditingCrop(crop.name);
    setEditForm({ ...crop });
  };

  return (
    <div className="space-y-6">
      {/* Backup & Restore */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <HardDrive className="w-4 h-4" />
          Backup & Restore
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          A copy of your data is saved on this phone automatically every day. You can also save one now or go back to an earlier copy.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBackupNow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <HardDrive className="w-4 h-4" />
            Backup Now
          </button>
          <button
            onClick={onShowRestore}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <History className="w-4 h-4" />
            Restore
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-1">Backup file</h4>
          <p className="text-xs text-gray-500 mb-3">
            Save everything, including photos, as one file to Google Drive, Files or email. Open it on a new phone to restore.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Save File
            </button>
            <button
              onClick={onImportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Restore File
            </button>
          </div>
        </div>
      </div>

      {/* Test Data */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <Database className="w-4 h-4" />
          Test Data
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Populate the app with a full month of sample batches across all growth stages, complete with watering records and notes.
        </p>
        <button
          onClick={onLoadTestData}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Database className="w-4 h-4" />
          {hasBatches ? 'Replace Data with Test Batches' : 'Load Test Data (1 Month)'}
        </button>
      </div>

      {/* Tray Settings */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Tray Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Hash className="w-3 h-3 inline mr-1" />
              Total Physical Trays
            </label>
            <input
              type="number"
              value={config.totalTrays}
              onChange={e => onUpdateConfig({ ...config, totalTrays: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              min={1}
            />
            <p className="text-xs text-gray-500 mt-1">
              {usedTrayCount} in use, {config.totalTrays - usedTrayCount} available
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tray Label Prefix</label>
            <input
              type="text"
              value={config.trayNumberPrefix}
              onChange={e => onUpdateConfig({ ...config, trayNumberPrefix: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g., Tray, Rack, Shelf"
            />
            <p className="text-xs text-gray-500 mt-1">
              Shown as "{config.trayNumberPrefix || 'Tray'} #1", "{config.trayNumberPrefix || 'Tray'} #2", etc.
            </p>
          </div>
        </div>
      </div>

      {/* General settings section */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">General Settings</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between py-2">
            <span>Date Format</span>
            <span className="font-medium text-gray-900">MMM dd, yyyy</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>Default Yield Unit</span>
            <span className="font-medium text-gray-900">Grams</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>Total Crop Types</span>
            <span className="font-medium text-gray-900">{cropTypes.length}</span>
          </div>
        </div>
      </div>

      {/* Add crop button */}
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Crop Type
      </button>

      {/* Add crop form */}
      {isAdding && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-emerald-900">New Crop Type</h4>
            <button onClick={() => setIsAdding(false)} className="p-1 text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={newCrop.name}
            onChange={e => setNewCrop({ ...newCrop, name: e.target.value })}
            placeholder="Crop name"
            className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Timer className="w-3 h-3 inline mr-1" />Germination (days)
              </label>
              <input
                type="number"
                value={newCrop.daysToGermination}
                onChange={e => setNewCrop({ ...newCrop, daysToGermination: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Timer className="w-3 h-3 inline mr-1" />Harvest (days)
              </label>
              <input
                type="number"
                value={newCrop.daysToHarvest}
                onChange={e => setNewCrop({ ...newCrop, daysToHarvest: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Droplets className="w-3 h-3 inline mr-1" />Watering (days)
              </label>
              <input
                type="number"
                value={newCrop.wateringFrequency}
                onChange={e => setNewCrop({ ...newCrop, wateringFrequency: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Sun className="w-3 h-3 inline mr-1" />Light (h/day)
              </label>
              <input
                type="number"
                value={newCrop.lightingHours}
                onChange={e => setNewCrop({ ...newCrop, lightingHours: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
                max={24}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-800 mb-1">Category</label>
            <select
              value={newCrop.category}
              onChange={e => setNewCrop({ ...newCrop, category: e.target.value as CropType['category'] })}
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="leafy">Leafy</option>
              <option value="herb">Herb</option>
              <option value="brassica">Brassica</option>
              <option value="legume">Legume</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newCrop.name.trim()}
              className="flex-1 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Crop types list by category */}
      {Object.entries(grouped).map(([category, crops]) => {
        const Icon = categoryIcons[category as CropType['category']] || Tag;
        const colorClass = categoryColors[category as CropType['category']] || 'text-gray-600 bg-gray-50';
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-900 capitalize">{category}</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">{crops.length}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="divide-y divide-gray-50">
                {crops.map(crop => {
                  const isEditing = editingCrop === crop.name;

                  if (isEditing && editForm) {
                    return (
                      <div key={crop.name} className="p-4 bg-amber-50 space-y-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Germination (days)</label>
                            <input
                              type="number"
                              value={editForm.daysToGermination}
                              onChange={e => setEditForm({ ...editForm, daysToGermination: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Harvest (days)</label>
                            <input
                              type="number"
                              value={editForm.daysToHarvest}
                              onChange={e => setEditForm({ ...editForm, daysToHarvest: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Watering (days)</label>
                            <input
                              type="number"
                              value={editForm.wateringFrequency}
                              onChange={e => setEditForm({ ...editForm, wateringFrequency: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Light (h/day)</label>
                            <input
                              type="number"
                              value={editForm.lightingHours}
                              onChange={e => setEditForm({ ...editForm, lightingHours: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                              max={24}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-800 mb-1">Category</label>
                          <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value as CropType['category'] })}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="leafy">Leafy</option>
                            <option value="herb">Herb</option>
                            <option value="brassica">Brassica</option>
                            <option value="legume">Legume</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCrop(null); setEditForm(null); }}
                            className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdate}
                            className="flex-1 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={crop.name} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{crop.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(crop)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(crop.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          <span>{crop.daysToGermination}d germ</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          <span>{crop.daysToHarvest}d harvest</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          <span>Every {crop.wateringFrequency}d</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun className="w-3 h-3" />
                          <span>{crop.lightingHours}h/day</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConfigPanel;
