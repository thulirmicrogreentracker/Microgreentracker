import React from 'react';
import { BatchStats } from '../types';
import { Sprout, Leaf, CheckCircle2, BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface DashboardProps {
  stats: BatchStats;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const statItems = [
    { 
      key: 'total', 
      label: 'Total Batches', 
      value: stats.total, 
      color: 'bg-slate-100 text-slate-800 border-slate-200', 
      icon: BarChart3,
      trend: null
    },
    { 
      key: 'sowing', 
      label: 'Sowing', 
      value: stats.sowing, 
      color: 'bg-amber-100 text-amber-800 border-amber-200', 
      icon: Sprout,
      trend: null
    },
    { 
      key: 'germination', 
      label: 'Germinating', 
      value: stats.germination, 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: Sprout,
      trend: null
    },
    { 
      key: 'growth', 
      label: 'Growing', 
      value: stats.growth, 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      icon: Leaf,
      trend: null
    },
    { 
      key: 'harvest', 
      label: 'Ready', 
      value: stats.harvest, 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircle2,
      trend: null
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      value: stats.completed, 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: CheckCircle2,
      trend: null
    },
  ];

  const performanceStats = [
    {
      label: 'Avg. Days to Harvest',
      value: stats.avgDaysToHarvest > 0 ? `${stats.avgDaysToHarvest.toFixed(1)} days` : 'N/A',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      label: 'Total Yield',
      value: stats.totalYield > 0 ? `${stats.totalYield.toFixed(1)}g` : 'N/A',
      icon: TrendingUp,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-all duration-200 hover:-translate-y-1 ${item.color.includes('border') ? item.color : item.color + ' border-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-').replace('-800', '-100')}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.trend && (
                  <span className="text-xs text-green-600 font-medium">
                    {item.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{item.value}</div>
              <div className="text-sm text-gray-600">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performanceStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-gray-50`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;