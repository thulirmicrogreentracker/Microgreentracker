import React, { useState } from 'react';
import { Camera, ChevronLeft, Columns2 } from 'lucide-react';
import { format } from 'date-fns';
import { Batch } from '../../types';
import { STAGE_ORDER, stageConfig } from '../../data/stages';
import { getDayNumber } from '../../utils/dateUtils';
import PhotoImage from './PhotoImage';

interface BatchGalleryProps {
  batch: Batch;
  canCompare: boolean;
  onClose: () => void;
  onOpenPhoto: (photoId: string) => void;
  onAddPhoto: () => void;
  onCompare: () => void;
}

type Filter = 'all' | Batch['stage'];

// All photos of one batch, grouped by the growth stage they were taken in.
const BatchGallery: React.FC<BatchGalleryProps> = ({ batch, canCompare, onClose, onOpenPhoto, onAddPhoto, onCompare }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const photos = [...batch.photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const dayOf = (timestamp: string) => getDayNumber(batch.sowingDate, timestamp);

  const sections = STAGE_ORDER
    .map(stage => ({ stage, photos: photos.filter(p => p.stage === stage) }))
    .filter(s => s.photos.length > 0);
  const visible = sections.filter(s => filter === 'all' || s.stage === filter);
  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    ...sections.map(s => ({ key: s.stage, label: s.stage === 'harvest' ? 'Ready' : stageConfig[s.stage].label })),
  ];

  const today = batch.stage === 'completed' ? 'Completed' : `Day ${dayOf(new Date().toISOString())}`;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <header className="flex items-center justify-between px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] bg-white border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="flex items-center gap-0.5 min-h-[44px] px-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-center min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{batch.cropType} · {batch.trayId}</h2>
          <p className="text-[11px] text-gray-500">{photos.length} photo{photos.length === 1 ? '' : 's'} · {today}</p>
        </div>
        <button
          onClick={onCompare}
          disabled={!canCompare}
          aria-label="Compare photos"
          title={canCompare ? 'Compare photos' : 'Add another photo to compare'}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Columns2 className="w-5 h-5" />
        </button>
      </header>

      {sections.length > 1 && (
        <div role="group" aria-label="Filter by stage" className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar shrink-0">
          {chips.map(chip => {
            const on = chip.key === filter;
            return (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                aria-pressed={on}
                className={`shrink-0 min-h-[32px] px-3 rounded-full text-xs font-medium border transition-colors ${
                  on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2 pb-28 space-y-5">
        {photos.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No photos yet</h3>
            <p className="text-sm text-gray-500">Take a photo every day or two to see the batch grow.</p>
          </div>
        )}

        {visible.map(section => {
          const days = section.photos.map(p => dayOf(p.timestamp));
          const range = days[0] === days[days.length - 1] ? `Day ${days[0]}` : `Day ${days[0]}–${days[days.length - 1]}`;
          return (
            <section key={section.stage}>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stageConfig[section.stage].color}`}>
                  {stageConfig[section.stage].label}
                </span>
                <span className="text-[11px] text-gray-500">
                  {range} · {section.photos.length} photo{section.photos.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {section.photos.map(photo => {
                  const day = dayOf(photo.timestamp);
                  return (
                    <button
                      key={photo.id}
                      onClick={() => onOpenPhoto(photo.id)}
                      aria-label={`Day ${day}${photo.caption ? `, ${photo.caption}` : ''}, open photo`}
                      className="flex flex-col gap-1 text-left"
                    >
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                        <PhotoImage name={photo.file} size="thumb" alt="" className="w-full h-full" />
                        <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md bg-gray-900/70 text-white text-[10px] font-semibold">
                          Day {day}
                        </span>
                      </div>
                      <span className={`text-[11px] leading-tight truncate w-full ${photo.caption ? 'text-gray-700' : 'text-gray-400'}`}>
                        {photo.caption || 'No caption'}
                      </span>
                      <span className="text-[10px] text-gray-500 -mt-0.5">{format(new Date(photo.timestamp), 'MMM d')}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <button
        onClick={onAddPhoto}
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Camera className="w-[18px] h-[18px]" />
        Add photo
      </button>
    </div>
  );
};

export default BatchGallery;
