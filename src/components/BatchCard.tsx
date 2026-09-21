import React, { useState } from 'react';
import { Calendar, CreditCard as Edit3, Trash2, Sprout, Leaf, CheckCircle2, Camera, FileText, Droplets, Sun, AlertCircle, Hash } from 'lucide-react';
import { Batch } from '../types';
import { formatDate, getDaysSince, getRelativeTimeString } from '../utils/dateUtils';

interface BatchCardProps {
  batch: Batch;
  onEdit: (batch: Batch) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: Batch['stage']) => void;
  onAddPhoto: (batchId: string) => void;
  onAddNote: (batchId: string) => void;
  onAddWatering: (batchId: string) => void;
}

const stageConfig = {
  sowing: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Sprout, label: 'Sowing', next: 'germination' },
  germination: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Sprout, label: 'Germination', next: 'growth' },
  growth: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Leaf, label: 'Growing', next: 'harvest' },
  harvest: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'Ready to Harvest', next: 'completed' },
  completed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle2, label: 'Completed', next: null }
};

const BatchCard: React.FC<BatchCardProps> = ({ 
  batch, 
  onEdit, 
  onDelete, 
  onStageChange, 
  onAddPhoto, 
  onAddNote, 
  onAddWatering 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const config = stageConfig[batch.stage];
  const StageIcon = config.icon;
  
  const daysSinceSowing = getDaysSince(batch.sowingDate);
  const harvestTimeframe = getRelativeTimeString(batch.expectedHarvestDate);
  
  const lastWatering = batch.watering[batch.watering.length - 1];
  const daysSinceWatering = lastWatering ? getDaysSince(lastWatering.timestamp) : null;
  const needsWatering = daysSinceWatering === null || daysSinceWatering >= 2;

  const getProgressPercentage = () => {
    const stages = ['sowing', 'germination', 'growth', 'harvest', 'completed'];
    const currentIndex = stages.indexOf(batch.stage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{batch.cropType}</h3>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {batch.trayId}
              </span>
              {batch.trayNumber != null && (
                <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {batch.trayNumber}
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-3">
              <Calendar className="w-4 h-4 mr-1" />
              Sowed {formatDate(batch.sowingDate)} ({daysSinceSowing} days ago)
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(batch)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Edit batch details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(batch.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete batch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Status and Harvest Info */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}>
            <StageIcon className="w-4 h-4 mr-1.5" />
            {config.label}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Harvest</div>
            <div className="text-sm font-medium text-gray-900">{harvestTimeframe}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm font-medium text-gray-900">{batch.notes.length}</div>
            <div className="text-xs text-gray-500">Notes</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Camera className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm font-medium text-gray-900">{batch.photos.length}</div>
            <div className="text-xs text-gray-500">Photos</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Droplets className={`w-4 h-4 ${needsWatering ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <div className="text-sm font-medium text-gray-900">
              {daysSinceWatering !== null ? `${daysSinceWatering}d` : 'Never'}
            </div>
            <div className="text-xs text-gray-500">Last Water</div>
          </div>
        </div>

        {/* Alerts */}
        {needsWatering && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">Needs watering</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => onAddWatering(batch.id)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Droplets className="w-4 h-4" />
            Water
          </button>
          <button
            onClick={() => onAddPhoto(batch.id)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Camera className="w-4 h-4" />
            Photo
          </button>
        </div>

        {config.next && (
          <button
            onClick={() => onStageChange(batch.id, config.next as Batch['stage'])}
            className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            Mark as {stageConfig[config.next as Batch['stage']].label}
          </button>
        )}
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <div className="space-y-4">
            {/* Recent Notes */}
            {batch.notes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Notes</h4>
                <div className="space-y-2">
                  {batch.notes.slice(-2).map(note => (
                    <div key={note.id} className="text-sm text-gray-600 bg-white p-2 rounded border">
                      <div className="font-medium text-gray-900">{formatDate(note.timestamp)}</div>
                      {note.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yield Information */}
            {batch.yieldAmount && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Yield</h4>
                <div className="text-sm text-gray-600">
                  {batch.yieldAmount} {batch.yieldUnit}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        {showDetails ? 'Show Less' : 'Show More'}
      </button>
    </div>
  );
};

export default BatchCard;