import React, { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Batch, BatchPhoto } from '../../types';
import { batchCode, batchYieldGrams, formatGrams, photoTrayCode } from '../../utils/batches';
import { stageConfig } from '../../data/stages';
import { getDayNumber } from '../../utils/dateUtils';
import PhotoImage from './PhotoImage';

interface PhotoCompareProps {
  batch: Batch;
  batches: Batch[];
  onClose: () => void;
}

type Mode = 'same' | 'other';

const byTime = (photos: BatchPhoto[]) => [...photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const dayOf = (batch: Batch, photo: BatchPhoto) => getDayNumber(batch.sowingDate, photo.timestamp);

// The photo of `batch` whose day number is closest to `day`.
const closestTo = (batch: Batch, day: number) =>
  byTime(batch.photos).reduce((best, p) => (Math.abs(dayOf(batch, p) - day) < Math.abs(dayOf(batch, best) - day) ? p : best));

const describeBatch = (b: Batch) => {
  const parts = [`Sown ${format(new Date(`${b.sowingDate}T00:00:00`), 'MMM d')}`];
  if (b.actualHarvestDate) parts.push(`harvested ${format(new Date(`${b.actualHarvestDate}T00:00:00`), 'MMM d')}`);
  if (batchYieldGrams(b) > 0) parts.push(formatGrams(batchYieldGrams(b)));
  return parts.join(' · ');
};

const selectClass =
  'w-full min-h-[40px] appearance-none pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

const Select: React.FC<{ label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <div className="relative">
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
      {children}
    </select>
    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const Side: React.FC<{ title: string; batch: Batch; photo: BatchPhoto; children: React.ReactNode }> = ({ title, batch, photo, children }) => (
  <div className="flex flex-col gap-2 min-w-0">
    <div className="text-xs font-semibold text-gray-700 truncate">{title}</div>
    <PhotoImage name={photo.file} size="full" alt={`Day ${dayOf(batch, photo)} photo`} className="w-full aspect-[3/4] rounded-xl" />
    {children}
    <div className="text-[11px] text-gray-500 leading-snug">
      {photoTrayCode(batch, photo) ? `${photoTrayCode(batch, photo)} · ` : ''}
      {stageConfig[photo.stage].label}
      {photo.caption ? ` · “${photo.caption}”` : ''}
    </div>
  </div>
);

const photoOptions = (batch: Batch) =>
  byTime(batch.photos).map(p => (
    <option key={p.id} value={p.id}>
      {photoTrayCode(batch, p) ? `${photoTrayCode(batch, p)} · ` : ''}Day {dayOf(batch, p)} · {format(new Date(p.timestamp), 'MMM d')}
    </option>
  ));

const PhotoCompare: React.FC<PhotoCompareProps> = ({ batch, batches, onClose }) => {
  const photos = byTime(batch.photos);
  const others = batches
    .filter(b => b.id !== batch.id && b.cropType === batch.cropType && b.photos.length > 0)
    .sort((a, b) => b.sowingDate.localeCompare(a.sowingDate));

  const [mode, setMode] = useState<Mode>(photos.length >= 2 ? 'same' : 'other');
  const [leftId, setLeftId] = useState(photos[0]?.id ?? '');
  const [rightId, setRightId] = useState(photos[photos.length - 1]?.id ?? '');
  const [mineId, setMineId] = useState(photos[photos.length - 1]?.id ?? '');
  const [otherBatchId, setOtherBatchId] = useState(others[0]?.id ?? '');
  const [otherPhotoId, setOtherPhotoId] = useState<string | null>(null);

  const find = (id: string) => photos.find(p => p.id === id) ?? photos[0];
  const left = find(leftId);
  const right = find(rightId);
  const mine = find(mineId);
  const otherBatch = others.find(b => b.id === otherBatchId) ?? others[0];
  // Until the user picks one, show the other batch's photo from the closest day.
  const otherPhoto = otherBatch && mine
    ? otherBatch.photos.find(p => p.id === otherPhotoId) ?? closestTo(otherBatch, dayOf(batch, mine))
    : undefined;

  const tabs: { key: Mode; label: string; disabled: boolean }[] = [
    { key: 'same', label: 'Same batch', disabled: photos.length < 2 },
    { key: 'other', label: 'Another batch', disabled: false },
  ];

  let summary = '';
  if (mode === 'same' && left && right) {
    const gap = Math.abs(dayOf(batch, right) - dayOf(batch, left));
    summary = gap === 0 ? 'Both photos are from the same day.' : `${gap} day${gap === 1 ? '' : 's'} apart.`;
  } else if (mode === 'other' && mine && otherBatch && otherPhoto) {
    summary = `Day ${dayOf(batch, mine)} of ${batchCode(batch.batchNumber)} next to day ${dayOf(otherBatch, otherPhoto)} of ${batchCode(otherBatch.batchNumber)}. ${batchCode(otherBatch.batchNumber)}: ${describeBatch(otherBatch)}.`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <header className="flex items-center justify-between px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] bg-white border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="flex items-center gap-0.5 min-h-[44px] px-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <h2 className="text-base font-semibold text-gray-900">Compare</h2>
        <div className="w-[72px]" />
      </header>

      <div role="tablist" aria-label="Compare with" className="mx-4 mt-3.5 grid grid-cols-2 gap-1 p-1 bg-gray-200 rounded-[10px] shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={mode === tab.key}
            disabled={tab.disabled}
            onClick={() => setMode(tab.key)}
            className={`min-h-[36px] rounded-lg text-[13px] font-semibold disabled:opacity-40 ${
              mode === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
        {mode === 'same' && left && right && (
          <div className="grid grid-cols-2 gap-2.5">
            <Side title="Before" batch={batch} photo={left}>
              <Select label="Before photo" value={left.id} onChange={setLeftId}>{photoOptions(batch)}</Select>
            </Side>
            <Side title="After" batch={batch} photo={right}>
              <Select label="After photo" value={right.id} onChange={setRightId}>{photoOptions(batch)}</Select>
            </Side>
          </div>
        )}

        {mode === 'other' && (!otherBatch || !mine) && (
          <div className="text-center py-16 px-6 text-sm text-gray-500">
            {!mine
              ? 'Add a photo to this batch first.'
              : `No other ${batch.cropType} batches have photos yet. Once they do, you can compare them here.`}
          </div>
        )}

        {mode === 'other' && otherBatch && mine && otherPhoto && (
          <div className="grid grid-cols-2 gap-2.5">
            <Side title={`This batch (${batchCode(batch.batchNumber)})`} batch={batch} photo={mine}>
              <Select label="Photo from this batch" value={mine.id} onChange={id => { setMineId(id); setOtherPhotoId(null); }}>
                {photoOptions(batch)}
              </Select>
            </Side>
            <Side title={`${otherBatch.cropType} ${batchCode(otherBatch.batchNumber)}`} batch={otherBatch} photo={otherPhoto}>
              <Select label="Other batch" value={otherBatch.id} onChange={id => { setOtherBatchId(id); setOtherPhotoId(null); }}>
                {others.map(b => (
                  <option key={b.id} value={b.id}>
                    {batchCode(b.batchNumber)} · sown {format(new Date(`${b.sowingDate}T00:00:00`), 'MMM d')}
                  </option>
                ))}
              </Select>
              <Select label="Photo from other batch" value={otherPhoto.id} onChange={setOtherPhotoId}>
                {photoOptions(otherBatch)}
              </Select>
            </Side>
          </div>
        )}

        {summary && (
          <div className="bg-white border border-gray-100 rounded-xl p-3.5 text-[13px] leading-relaxed text-gray-700">{summary}</div>
        )}
      </main>
    </div>
  );
};

export default PhotoCompare;
