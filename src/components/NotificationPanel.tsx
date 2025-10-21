import React from 'react';
import { Bell, X, CheckCircle, Droplets, Sprout, Calendar } from 'lucide-react';
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
  general: { icon: Bell, color: 'text-gray-600 bg-gray-50 border-gray-200' }
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onComplete, 
  onDismiss 
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Bell className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-600">{notifications.length} pending reminder{notifications.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map(notification => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          const isToday = isDateToday(notification.scheduledFor);
          const isTomorrow = isDateTomorrow(notification.scheduledFor);
          
          return (
            <div 
              key={notification.id}
              className={`flex items-start gap-3 p-4 rounded-lg border ${config.color}`}
            >
              <div className="flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(notification.scheduledFor)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onComplete(notification.id)}
                      className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Mark as complete"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDismiss(notification.id)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationPanel;