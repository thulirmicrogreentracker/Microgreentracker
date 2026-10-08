import React from 'react';
import { CreditCard as Edit3, Trash2, Camera, FileText, Droplets, AlertCircle, ChevronDown, AlertTriangle, X, Scale } from 'lucide-react';
import { Batch } from '../types';
import { formatDate, getDaysSince, getRelativeTimeString } from '../utils/dateUtils';
import { activeTrays, batchCode, batchSeedGrams, batchYieldGrams, formatGrams, isBatchGrowing, isBatchLost, lostTrays, slotLabel } from '../utils/batches';
import { categoryIcon } from '../data/categoryIcons';
import { STAGE_ORDER, stageConfig } from '../data/stages';
import TrayArt from './farm/TrayArt';
import PhotoStrip from './photos/PhotoStrip';

interface BatchCardProps {
  batch: Batch;
  expanded: boolean;
  onToggle: () => void;
  slotPrefix: string;
  onEdit: (batch: Batch) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: Batch['stage']) => void;
  onAddPhoto: (batchId: string) => void;
  onAddNote: (batchId: string) => void;
  onAddWatering: (batchId: string) => void;
  onOpenGallery: (batchId: string) => void;
  onReportLoss: (batchId: string) => void;
  onDeleteNote: (batchId: string, noteId: string) => void;
  onHarvest: (batchId: string) => void;
  onOpenTray?: (trayId: string) => void; // opens the tray's own screen
  iconKey?: string; // icon of the crop's category
}

const noteTypeLabels: Record<string, string> = {
  general: 'General',
  observation: 'Observation',
  watering: 'Watering',
  fertilizer: 'Fertilizer',
  issue: 'Issue',
};

const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  expanded,
  onToggle,
  slotPrefix,
  onEdit,
  onDelete,
  onStageChange,
  onAddPhoto,
  onAddNote,
  onAddWatering,
  onOpenGallery,
  onReportLoss,
  onDeleteNote,
  onHarvest,
  onOpenTray,
  iconKey,
}) => {
  const CropIcon = categoryIcon(iconKey);
  const allLost = isBatchLost(batch);
  const growing = isBatchGrowing(batch);
  const config = stageConfig[batch.stage];
  const StageIcon = config.icon;
  const nextStage = allLost ? null : config.next;

  const active = activeTrays(batch);
  const lost = lostTrays(batch);
  const daysSinceSowing = getDaysSince(batch.sowingDate);
  const harvestTimeframe = getRelativeTimeString(batch.expectedHarvestDate);

  const lastWatering = batch.watering[batch.watering.length - 1];
  const daysSinceWatering = lastWatering ? getDaysSince(lastWatering.timestamp) : null;
  const needsWatering = growing && (daysSinceWatering === null || daysSinceWatering >= 2);

  const progress = ((STAGE_ORDER.indexOf(batch.stage) + 1) / STAGE_ORDER.length) * 100;
  const notes = [...batch.notes].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const harvested = batch.stage === 'completed';
  const yieldGrams = batchYieldGrams(batch);
  const weighedTrays = active.filter(t => t.harvestWeight != null);
  const seedGrams = batchSeedGrams(batch);

  const summary = [
    `${batch.trays.length} tray${batch.trays.length === 1 ? '' : 's'}`,
    harvested ? null : `Day ${daysSinceSowing}`,
    harvested && batch.actualHarvestDate
      ? `Harvested ${formatDate(batch.actualHarvestDate)}`
      : growing ? `Harvest ${harvestTimeframe.toLowerCase()}` : null,
  ].filter(Boolean).join(' · ');

  return (
    // No box-shadow here: Android WebViews (at least with software rendering) left stale fragments of
    // shadowed cards on screen at startup until something was repainted.
    <div data-batch-card className={`bg-white rounded-xl border overflow-hidden ${allLost ? 'border-red-100' : 'border-gray-100'}`}>
      <div className="batch-visual-cover">
        <TrayArt stage={allLost ? 'lost' : batch.stage} />
        <span className={`stage-badge stage-${allLost ? 'lost' : batch.stage}`}>{allLost ? 'Lost' : config.label}</span>
      </div>
      {expanded && onOpenTray && (
        <div className="tray-chip-list">
          {batch.trays.map(t => (
            <button key={t.id} onClick={() => onOpenTray(t.id)} className={t.status === 'lost' ? 'lost' : ''}>
              {t.code} · {t.status === 'lost' ? 'Lost' : 'View tray'} →
            </button>
          ))}
        </div>
      )}
      {/* Summary row: always visible, tap to open or close the card */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
          {batchCode(batch.batchNumber)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CropIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{batch.cropType}</h3>
            {lost.length > 0 && !allLost && (
              <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">{lost.length} lost</span>
            )}
            {needsWatering && <Droplets className="w-3.5 h-3.5 text-red-500 shrink-0" aria-label="Needs watering" />}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {summary}
            {yieldGrams > 0 && <> · <span className="font-semibold text-emerald-700">{formatGrams(yieldGrams)}</span></>}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-3">
          {/* The list's section heading names the stage; the badge repeats it once the card is open. */}
          <div className="mb-2">
            {allLost ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />All trays lost
              </span>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.color}`}>
                <StageIcon className="w-3 h-3 mr-1" />{config.label}
              </span>
            )}
          </div>

          {/* Progress */}
          {!allLost && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Sowed {formatDate(batch.sowingDate)}</span>
                <span className="text-xs text-gray-500">
                  {growing ? <>Harvest <span className="font-medium text-gray-900">{harvestTimeframe}</span></> : `${Math.round(progress)}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Trays */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">
                Trays · {active.length} {harvested ? 'harvested' : 'growing'}{lost.length > 0 ? `, ${lost.length} lost` : ''}
              </span>
            </div>
            {/* Tray chips are labels only; losses are reported with the button below, undone in Edit. */}
            <div className="flex flex-wrap gap-1.5">
              {active.map(t => (
                <span
                  key={t.id}
                  title={t.slot != null ? slotLabel(slotPrefix, t.slot) : 'No position'}
                  className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md"
                >
                  {t.code}
                  {harvested && t.harvestWeight != null
                    ? <span className="text-emerald-700"> · {formatGrams(t.harvestWeight)}</span>
                    : t.slot != null && <span className="text-gray-400"> · #{t.slot}</span>}
                </span>
              ))}
              {lost.map(t => (
                <span
                  key={t.id}
                  title={t.lostNote}
                  className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-md"
                >
                  <span className="line-through">{t.code}</span> · {t.lostReason || 'Lost'}
                </span>
              ))}
            </div>
            {active.length > 0 && batch.stage !== 'completed' && (
              <button
                onClick={() => onReportLoss(batch.id)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Report lost trays
              </button>
            )}
          </div>

          <PhotoStrip batch={batch} onOpenGallery={() => onOpenGallery(batch.id)} onAddPhoto={() => onAddPhoto(batch.id)} />

          {needsWatering && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs text-red-800">
                {daysSinceWatering === null ? 'Not watered yet' : `Last watered ${daysSinceWatering} days ago`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => onAddWatering(batch.id)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Droplets className="w-3.5 h-3.5" />
              Water{daysSinceWatering !== null ? ` · ${daysSinceWatering}d` : ''}
            </button>
            <button
              onClick={() => onAddPhoto(batch.id)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Photo
            </button>
            <button
              onClick={() => onAddNote(batch.id)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Note{batch.notes.length > 0 ? ` · ${batch.notes.length}` : ''}
            </button>
          </div>

          {nextStage === 'completed' ? (
            <button
              onClick={() => onHarvest(batch.id)}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs mb-2"
            >
              <Scale className="w-3.5 h-3.5" />
              Harvest & weigh trays
            </button>
          ) : nextStage && (
            <button
              onClick={() => onStageChange(batch.id, nextStage)}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs mb-2"
            >
              Mark as {stageConfig[nextStage].label}
            </button>
          )}

          {(seedGrams > 0 || yieldGrams > 0 || harvested) && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2 space-y-1">
              {seedGrams > 0 && (
                <div>Seed: <span className="font-medium text-gray-900">{formatGrams(batch.seedWeightPerTray ?? 0)}</span> per tray · {formatGrams(seedGrams)} in total</div>
              )}
              {yieldGrams > 0 && (
                <div>
                  Harvest: <span className="font-semibold text-emerald-700">{formatGrams(yieldGrams)}</span>
                  {weighedTrays.length > 0 && <> · {formatGrams(yieldGrams / weighedTrays.length)} per tray</>}
                  {seedGrams > 0 && <> · {(yieldGrams / seedGrams).toFixed(1)}× seed weight</>}
                </div>
              )}
              {harvested && active.length > 0 && (
                <button onClick={() => onHarvest(batch.id)} className="font-medium text-emerald-700 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  {weighedTrays.length > 0 ? 'Edit tray weights' : 'Weigh trays'}
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-medium text-gray-700 mb-1.5">Notes</h4>
              <div className="space-y-1.5">
                {notes.map(note => (
                  <div key={note.id} className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg flex gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-500 mb-0.5">
                        {formatDate(note.timestamp)} · {noteTypeLabels[note.type] ?? note.type}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{note.content}</div>
                    </div>
                    <button
                      onClick={() => window.confirm('Delete this note?') && onDeleteNote(batch.id, note.id)}
                      aria-label="Delete note"
                      className="p-1 text-gray-400 hover:text-red-600 self-start"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onEdit(batch)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit batch & trays
            </button>
            <button
              onClick={() => onDelete(batch.id)}
              aria-label="Delete batch"
              className="px-3 flex items-center justify-center text-gray-500 bg-gray-50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchCard;
