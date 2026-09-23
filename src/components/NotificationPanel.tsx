import React from 'react';
import { Bell, CheckCircle, Droplets, Sprout, Calendar } from 'lucide-react';
import { Reminder } from '../types';
import { formatDate, isDateToday, isDateTomorrow } from '../utils/dateUtils';

interface NotificationPanelProps {
  notifications: Reminder[];
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}

const typeConfig = {
  watering: { icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  germination: { icon: Sprout, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  harvest: { icon: Calendar, color: 'text-green-600 bg-green-50 border-green-200' },
  general: { icon: Bell, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onComplete,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map(notification => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;
        const isToday = isDateToday(notification.scheduledFor);
        const isTomorrow = isDateTomorrow(notification.scheduledFor);

        return (
          <div
            key={notification.id}
            className={`flex items-start gap-2.5 p-3 rounded-lg border ${config.color}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
              <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(notification.scheduledFor)}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onComplete(notification.id)}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDismiss(notification.id)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationPanel;
