import React from 'react';
import { BatchStats } from '../types';
import { Sprout, Leaf, CheckCircle2, BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface DashboardProps {
  stats: BatchStats;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const statItems = [
    { key: 'total', label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-800 border-slate-200', icon: BarChart3 },
    { key: 'sowing', label: 'Sowing', value: stats.sowing, color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Sprout },
    { key: 'germination', label: 'Germin.', value: stats.germination, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Sprout },
    { key: 'growth', label: 'Growing', value: stats.growth, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Leaf },
    { key: 'harvest', label: 'Ready', value: stats.harvest, color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    { key: 'completed', label: 'Done', value: stats.completed, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-3">
      {/* Compact Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`rounded-lg p-2.5 border ${item.color}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className="w-3.5 h-3.5" />
                {item.trend && <span className="text-xs text-green-600 font-medium">{item.trend}</span>}
              </div>
              <div className="text-xl font-bold leading-tight">{item.value}</div>
              <div className="text-[10px] leading-tight">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-[10px] text-gray-500">Avg. Days to Harvest</div>
              <div className="text-sm font-bold text-gray-900">
                {stats.avgDaysToHarvest > 0 ? `${stats.avgDaysToHarvest.toFixed(1)} days` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-[10px] text-gray-500">Total Yield</div>
              <div className="text-sm font-bold text-gray-900">
                {stats.totalYield > 0 ? `${stats.totalYield.toFixed(1)}g` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
