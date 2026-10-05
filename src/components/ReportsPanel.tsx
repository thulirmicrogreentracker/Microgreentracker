import React, { useMemo } from 'react';
import { TrendingUp, Droplets, Calendar, BarChart3, PieChart, Target, Clock, AlertTriangle, CheckCircle2, Sprout, Leaf, Images, ChevronRight } from 'lucide-react';
import { Batch, BatchStats, CropType } from '../types';
import { getDaysSince, formatDate } from '../utils/dateUtils';
import { activeTrays, batchCode, batchSeedGrams, batchYieldGrams, formatGrams, isBatchGrowing, lostTrays } from '../utils/batches';
import { format, parseISO } from 'date-fns';

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
        acc[b.cropType] = { total: 0, completed: 0, totalYield: 0, avgDays: 0, daysSum: 0, trays: 0, lostTrays: 0, harvestedTrays: 0 };
      }
      acc[b.cropType].total++;
      acc[b.cropType].trays += b.trays.length;
      acc[b.cropType].lostTrays += lostTrays(b).length;
      if (b.stage === 'completed') acc[b.cropType].harvestedTrays += activeTrays(b).length;
      if (b.stage === 'completed' && b.actualHarvestDate) {
        acc[b.cropType].completed++;
        const days = getDaysSince(b.sowingDate) - getDaysSince(b.actualHarvestDate);
        acc[b.cropType].daysSum += Math.abs(days);
      }
      acc[b.cropType].totalYield += batchYieldGrams(b);
      return acc;
    }, {} as Record<string, { total: number; completed: number; totalYield: number; avgDays: number; daysSum: number; trays: number; lostTrays: number; harvestedTrays: number }>);

    return Object.entries(byCrop)
      .map(([name, data]) => ({
        name,
        ...data,
        avgDays: data.completed > 0 ? data.daysSum / data.completed : 0,
        survivalRate: data.trays > 0 ? ((data.trays - data.lostTrays) / data.trays) * 100 : 0,
        yieldPerTray: data.harvestedTrays > 0 ? data.totalYield / data.harvestedTrays : 0,
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

  const lossReport = useMemo(() => {
    const lost = batches.flatMap(b => lostTrays(b).map(t => ({ crop: b.cropType, reason: t.lostReason || 'Unknown' })));
    const totalTrays = batches.reduce((n, b) => n + b.trays.length, 0);
    const count = (key: 'crop' | 'reason') => [...lost.reduce((m, l) => m.set(l[key], (m.get(l[key]) ?? 0) + 1), new Map<string, number>())]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n);
    return { lost: lost.length, totalTrays, byReason: count('reason'), byCrop: count('crop') };
  }, [batches]);

  const timelineReport = useMemo(() => {
    return batches
      .filter(isBatchGrowing)
      .map(b => {
        const cropConfig = cropTypes.find(ct => ct.name === b.cropType);
        const daysSinceSow = getDaysSince(b.sowingDate);
        const daysToHarvest = cropConfig ? cropConfig.daysToHarvest - daysSinceSow : 0;
        const isOverdue = daysToHarvest < 0 && b.stage !== 'harvest';
        return {
          id: b.id,
          cropType: b.cropType,
          code: `${batchCode(b.batchNumber)} · ${activeTrays(b).length} tray${activeTrays(b).length === 1 ? '' : 's'}`,
          stage: b.stage,
          sowingDate: b.sowingDate,
          daysSinceSow,
          daysToHarvest,
          isOverdue,
        };
      })
      .sort((a, b) => a.daysToHarvest - b.daysToHarvest);
  }, [batches, cropTypes]);

  // Harvested weight: everything in grams, from the per-tray weights (or an older batch total).
  const harvestReport = useMemo(() => {
    const harvested = batches
      .filter(b => b.stage === 'completed' && batchYieldGrams(b) > 0)
      .map(b => {
        const trays = activeTrays(b).filter(t => t.harvestWeight != null);
        const grams = batchYieldGrams(b);
        const seed = batchSeedGrams(b);
        return {
          batch: b,
          grams,
          seed,
          weighedTrays: trays.length,
          minTray: trays.length ? Math.min(...trays.map(t => t.harvestWeight ?? 0)) : 0,
          maxTray: trays.length ? Math.max(...trays.map(t => t.harvestWeight ?? 0)) : 0,
        };
      });
    const total = harvested.reduce((n, h) => n + h.grams, 0);
    const weighedTrays = harvested.reduce((n, h) => n + h.weighedTrays, 0);
    const weighedGrams = harvested.filter(h => h.weighedTrays > 0).reduce((n, h) => n + h.grams, 0);
    // Seed-to-yield only counts batches with both a seed weight and a harvest.
    const withSeed = harvested.filter(h => h.seed > 0);
    const ratio = withSeed.length ? withSeed.reduce((n, h) => n + h.grams, 0) / withSeed.reduce((n, h) => n + h.seed, 0) : 0;

    const byCrop = [...harvested.reduce((m, h) => {
      const e = m.get(h.batch.cropType) ?? { grams: 0, weighedGrams: 0, trays: 0, seedGrams: 0, seedYield: 0 };
      e.grams += h.grams;
      if (h.weighedTrays > 0) { e.weighedGrams += h.grams; e.trays += h.weighedTrays; }
      if (h.seed > 0) { e.seedGrams += h.seed; e.seedYield += h.grams; }
      return m.set(h.batch.cropType, e);
    }, new Map<string, { grams: number; weighedGrams: number; trays: number; seedGrams: number; seedYield: number }>())]
      .map(([name, e]) => ({ name, ...e }))
      .sort((a, b) => b.grams - a.grams);

    const byMonth = [...harvested.reduce((m, h) => {
      const key = (h.batch.actualHarvestDate || h.batch.updatedAt).slice(0, 7);
      return m.set(key, (m.get(key) ?? 0) + h.grams);
    }, new Map<string, number>())]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, grams]) => ({ month, label: format(parseISO(`${month}-01`), 'MMM yyyy'), grams }));

    const recent = [...harvested]
      .sort((a, b) => (b.batch.actualHarvestDate || '').localeCompare(a.batch.actualHarvestDate || '') || b.batch.batchNumber - a.batch.batchNumber)
      .slice(0, 8);

    return { total, weighedTrays, avgPerTray: weighedTrays ? weighedGrams / weighedTrays : 0, ratio, byCrop, byMonth, recent };
  }, [batches]);

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
            {stats.totalYield > 0 ? formatGrams(stats.totalYield) : 'N/A'}
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
                  <span className="text-xs text-gray-500">{crop.total} batch{crop.total === 1 ? '' : 'es'} · {crop.trays} tray{crop.trays === 1 ? '' : 's'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Survival</div>
                    <div className={`font-semibold ${crop.survivalRate < 90 ? 'text-red-600' : 'text-gray-900'}`}>{crop.survivalRate.toFixed(0)}%</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Per tray</div>
                    <div className="font-semibold text-gray-900">{crop.yieldPerTray > 0 ? formatGrams(crop.yieldPerTray) : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Avg Days</div>
                    <div className="font-semibold text-gray-900">{crop.avgDays > 0 ? crop.avgDays.toFixed(1) : '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-gray-500">Yield</div>
                    <div className="font-semibold text-gray-900">{crop.totalYield > 0 ? formatGrams(crop.totalYield) : '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tray losses */}
      {lossReport.totalTrays > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900">Tray Losses</h3>
            </div>
            <span className="text-xs text-gray-500">
              {lossReport.lost} of {lossReport.totalTrays} trays ({((lossReport.lost / lossReport.totalTrays) * 100).toFixed(1)}%)
            </span>
          </div>
          {lossReport.lost === 0 ? (
            <p className="text-xs text-gray-500">No trays lost. Report one from a batch card with “Report loss”.</p>
          ) : (
            <div className="space-y-4">
              {([['By reason', lossReport.byReason], ['By crop', lossReport.byCrop]] as const).map(([title, rows]) => (
                <div key={title}>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">{title}</h4>
                  <div className="space-y-2">
                    {rows.map(r => (
                      <div key={r.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{r.name}</span>
                          <span className="text-xs text-gray-500">{r.n} tray{r.n === 1 ? '' : 's'}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-400" style={{ width: `${(r.n / rows[0].n) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <div className="font-medium text-gray-900 truncate">{b.cropType} · {b.code}</div>
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

      {/* Harvested weight */}
      {harvestReport.total > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Harvested Weight</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mb-4">
            <div className="bg-emerald-50 rounded-lg px-2 py-2 text-center">
              <div className="text-emerald-700">Total</div>
              <div className="font-bold text-emerald-900 text-sm">{formatGrams(harvestReport.total)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
              <div className="text-gray-500">Per tray</div>
              <div className="font-bold text-gray-900 text-sm">{harvestReport.avgPerTray > 0 ? formatGrams(harvestReport.avgPerTray) : '-'}</div>
              <div className="text-[10px] text-gray-400">{harvestReport.weighedTrays} trays weighed</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
              <div className="text-gray-500">Seed → yield</div>
              <div className="font-bold text-gray-900 text-sm">{harvestReport.ratio > 0 ? `${harvestReport.ratio.toFixed(1)}×` : '-'}</div>
              <div className="text-[10px] text-gray-400">g harvested per g seed</div>
            </div>
          </div>

          <h4 className="text-xs font-medium text-gray-500 mb-2">By crop</h4>
          <div className="space-y-3 mb-4">
            {harvestReport.byCrop.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-medium text-gray-700 truncate">{c.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatGrams(c.grams)}
                    {c.trays > 0 && <> · {formatGrams(c.weighedGrams / c.trays)}/tray</>}
                    {c.seedGrams > 0 && <> · {(c.seedYield / c.seedGrams).toFixed(1)}×</>}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.grams / harvestReport.byCrop[0].grams) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {harvestReport.byMonth.length > 1 && (
            <>
              <h4 className="text-xs font-medium text-gray-500 mb-2">By month</h4>
              <div className="space-y-2 mb-4">
                {harvestReport.byMonth.map(m => (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16 shrink-0">{m.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(m.grams / Math.max(...harvestReport.byMonth.map(x => x.grams))) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right shrink-0">{formatGrams(m.grams)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h4 className="text-xs font-medium text-gray-500 mb-2">Recent harvests</h4>
          <div className="divide-y divide-gray-50">
            {harvestReport.recent.map(h => (
              <div key={h.batch.id} className="flex items-center justify-between py-2 gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{batchCode(h.batch.batchNumber)} · {h.batch.cropType}</div>
                  <div className="text-[11px] text-gray-500">
                    {h.batch.actualHarvestDate ? formatDate(h.batch.actualHarvestDate) : ''}
                    {h.weighedTrays > 0 && <> · {h.weighedTrays} tray{h.weighedTrays === 1 ? '' : 's'}{h.weighedTrays > 1 ? ` · ${formatGrams(h.minTray)}–${formatGrams(h.maxTray)}` : ''}</>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-700 shrink-0">{formatGrams(h.grams)}</span>
              </div>
            ))}
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
