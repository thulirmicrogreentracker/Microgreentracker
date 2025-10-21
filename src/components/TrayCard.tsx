import React from 'react';
import { Calendar, Edit3, Trash2, Sprout, Leaf, CheckCircle2 } from 'lucide-react';
import { Tray } from '../types';

interface TrayCardProps {
  tray: Tray;
  onEdit: (tray: Tray) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tray['status']) => void;
}

const statusConfig = {
  seeded: { color: 'bg-amber-100 text-amber-800', icon: Sprout, label: 'Seeded' },
  germinating: { color: 'bg-yellow-100 text-yellow-800', icon: Sprout, label: 'Germinating' },
  growing: { color: 'bg-emerald-100 text-emerald-800', icon: Leaf, label: 'Growing' },
  ready: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Ready' },
  harvested: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle2, label: 'Harvested' }
};

const TrayCard: React.FC<TrayCardProps> = ({ tray, onEdit, onDelete, onStatusChange }) => {
  const config = statusConfig[tray.status];
  const StatusIcon = config.icon;
  
  const daysAgo = Math.floor((Date.now() - new Date(tray.plantingDate).getTime()) / (1000 * 60 * 60 * 24));

  const getNextStatus = (current: Tray['status']): Tray['status'] | null => {
    const progression: Tray['status'][] = ['seeded', 'germinating', 'growing', 'ready', 'harvested'];
    const currentIndex = progression.indexOf(current);
    return currentIndex < progression.length - 1 ? progression[currentIndex + 1] : null;
  };

  const nextStatus = getNextStatus(tray.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{tray.seedType}</h3>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(tray.plantingDate).toLocaleDateString()} ({daysAgo} days ago)
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(tray)}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(tray.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {config.label}
        </div>
      </div>

      {tray.notes && (
        <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">{tray.notes}</p>
      )}

      {nextStatus && (
        <button
          onClick={() => onStatusChange(tray.id, nextStatus)}
          className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          Mark as {statusConfig[nextStatus].label}
        </button>
      )}
    </div>
  );
};

export default TrayCard;