import React, { useMemo } from 'react';
import { TrendingUp, Droplets, Sun, Calendar, BarChart3, PieChart, Target, Clock, AlertTriangle, CheckCircle2, Sprout, Leaf, Images, ChevronRight } from 'lucide-react';
import { Batch, BatchStats, CropType } from '../types';
import { getDaysSince, formatDate } from '../utils/dateUtils';

interface ReportsPanelProps {
  batches: Batch[];
  stats: BatchStats;
  cropTypes: CropType[];
  onOpenCropPhotos: (crop: string) => void;
}

const stageColors: Record<string, string> = {
  sowing: 'bg-amber-500',
  germination: 'bg-yellow-500',
  growth: 'bg-emerald-500',
  harvest: 'bg-green-500',
  completed: 'bg-gray-400',
};

const ReportsPanel: React.FC<ReportsPanelProps> = ({ batches, stats, cropTypes, onOpenCropPhotos }) => {
  const photosByCrop = useMemo(() => {
    const byCrop = new Map<string, { photos: number; batches: number }>();
    batches.forEach(b => {
      if (b.photos.length === 0) return;
      const entry = byCrop.get(b.cropType) ?? { photos: 0, batches: 0 };
      entry.photos += b.photos.length;
      entry.batches += 1;
      byCrop.set(b.cropType, entry);
    });
    return [...byCrop.entries()].map(([crop, v]) => ({ crop, ...v })).sort((a, b) => b.photos - a.photos);
  }, [batches]);

  const cropReport = useMemo(() => {
    const byCrop = batches.reduce((acc, b) => {
      if (!acc[b.cropType]) {
        acc[b.cropType] = { total: 0, completed: 0, totalYield: 0, avgDays: 0, daysSum: 0 };
      }
      acc[b.cropType].total++;
      if (b.stage === 'completed' && b.actualHarvestDate) {
        acc[b.cropType].completed++;
        const days = getDaysSince(b.sowingDate) - getDaysSince(b.actualHarvestDate);
        acc[b.cropType].daysSum += Math.abs(days);
      }
      if (b.yieldAmount) {
        let yieldInGrams = b.yieldAmount;
        if (b.yieldUnit === 'ounces') yieldInGrams *= 28.35;
        if (b.yieldUnit === 'pounds') yieldInGrams *= 453.59;
        acc[b.cropType].totalYield += yieldInGrams;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; totalYield: number; avgDays: number; daysSum: number }>);

    return Object.entries(byCrop)
      .map(([name, data]) => ({
        name,
        ...data,
        avgDays: data.completed > 0 ? data.daysSum / data.completed : 0,
        successRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [batches]);

  const stageDistribution = useMemo(() => {
    const total = Math.max(batches.length, 1);
    return [
      { stage: 'sowing', count: stats.sowing, pct: (stats.sowing / total) * 100 },
      { stage: 'germination', count: stats.germination, pct: (stats.germination / total) * 100 },
      { stage: 'growth', count: stats.growth, pct: (stats.growth / total) * 100 },
      { stage: 'harvest', count: stats.harvest, pct: (stats.harvest / total) * 100 },
      { stage: 'completed', count: stats.completed, pct: (stats.completed / total) * 100 },
    ].filter(s => s.count > 0);
  }, [batches, stats]);

  const wateringReport = useMemo(() => {
    return cropTypes.map(ct => {
      const cropBatches = batches.filter(b => b.cropType === ct.name);
      const totalWaterings = cropBatches.reduce((sum, b) => sum + b.watering.length, 0);
      const avgWaterings = cropBatches.length > 0 ? totalWaterings / cropBatches.length : 0;
      const adherence = avgWaterings > 0 && ct.daysToHarvest > 0
        ? Math.min(100, (avgWaterings / (ct.daysToHarvest / ct.wateringFrequency)) * 100)
        : 0;
      return {
        name: ct.name,
        expectedWaterings: ct.daysToHarvest / ct.wateringFrequency,
        avgWaterings: Math.round(avgWaterings * 10) / 10,
        adherence: Math.round(adherence),
        batchCount: cropBatches.length,
      };
    }).filter(r => r.batchCount > 0).sort((a, b) => b.adherence - a.adherence);
  }, [batches, cropTypes]);

  const timelineReport = useMemo(() => {
    return batches
      .filter(b => b.stage !== 'completed')
      .map(b => {
        const cropConfig = cropTypes.find(ct => ct.name === b.cropType);
        const daysSinceSow = getDaysSince(b.sowingDate);
        const daysToHarvest = cropConfig ? cropConfig.daysToHarvest - daysSinceSow : 0;
        const isOverdue = daysToHarvest < 0 && b.stage !== 'harvest';
        return {
          id: b.id,
          cropType: b.cropType,
          trayId: b.trayId,
          stage: b.stage,
          sowingDate: b.sowingDate,
          daysSinceSow,
          daysToHarvest,
          isOverdue,
        };
      })
      .sort((a, b) => a.daysToHarvest - b.daysToHarvest);
  }, [batches, cropTypes]);

  const yieldByCrop = useMemo(() => {
    return cropReport
      .filter(c => c.totalYield > 0)
      .sort((a, b) => b.totalYield - a.totalYield);
  }, [cropReport]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Total Batches</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800">Total Yield</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {stats.totalYield > 0 ? `${stats.totalYield.toFixed(0)}g` : 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">Avg Harvest</span>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {stats.avgDaysToHarvest > 0 ? `${stats.avgDaysToHarvest.toFixed(1)}d` : 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-800">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
        </div>
      </div>

      {/* Photos by crop */}
      {photosByCrop.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Images className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Photos by Crop</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {photosByCrop.map(c => (
              <button
                key={c.crop}
                onClick={() => onOpenCropPhotos(c.crop)}
                className="w-full flex items-center justify-between py-2.5 text-left hover:bg-gray-50 -mx-1 px-1 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900">{c.crop}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {c.photos} photo{c.photos === 1 ? '' : 's'} · {c.batches} batch{c.batches === 1 ? '' : 'es'}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stage Distribution */}
      {stageDistribution.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Stage Distribution</h3>
          </div>
          <div className="space-y-3">
            {stageDistribution.map(s => (
              <div key={s.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 capitalize">{s.stage}</span>
                  <span className="text-xs text-gray-500">{s.count} ({s.pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stageColors[s.stage] || 'bg-gray-300'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Performance */}
      {cropReport.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Crop Performance</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {cropReport.map(crop => (
              <div key={crop.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-900">{crop.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{crop.total} batches</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Success</div>
                    <div className="font-semibold text-gray-900">{crop.successRate.toFixed(0)}%</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Avg Days</div>
                    <div className="font-semibold text-gray-900">{crop.avgDays > 0 ? crop.avgDays.toFixed(1) : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Yield</div>
                    <div className="font-semibold text-gray-900">{crop.totalYield > 0 ? `${crop.totalYield.toFixed(0)}g` : '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watering Adherence */}
      {wateringReport.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Watering Adherence</h3>
          </div>
          <div className="space-y-3">
            {wateringReport.map(r => (
              <div key={r.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{r.name}</span>
                  <span className={`text-xs font-semibold ${r.adherence >= 80 ? 'text-green-600' : r.adherence >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {r.adherence}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      r.adherence >= 80 ? 'bg-green-500' : r.adherence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(r.adherence, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Avg {r.avgWaterings} waterings</span>
                  <span>Expected ~{r.expectedWaterings.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Harvest Timeline */}
      {timelineReport.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Harvest Timeline</h3>
          </div>
          <div className="space-y-2">
            {timelineReport.map(b => (
              <div
                key={b.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  b.isOverdue ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                }`}
              >
                {b.isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                ) : b.daysToHarvest <= 2 ? (
                  <Leaf className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{b.cropType} - {b.trayId}</div>
                  <div className="text-xs text-gray-500 capitalize">{b.stage} &middot; Sown {formatDate(b.sowingDate)}</div>
                </div>
                <div className="text-right shrink-0">
                  {b.isOverdue ? (
                    <span className="text-xs font-semibold text-red-600">{Math.abs(b.daysToHarvest)}d overdue</span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-700">{b.daysToHarvest}d left</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yield by Crop */}
      {yieldByCrop.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Yield by Crop</h3>
          </div>
          <div className="space-y-3">
            {yieldByCrop.map(c => {
              const max = yieldByCrop[0].totalYield;
              const pct = (c.totalYield / max) * 100;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.totalYield.toFixed(0)}g</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {batches.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Add batches to see reports</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPanel;
