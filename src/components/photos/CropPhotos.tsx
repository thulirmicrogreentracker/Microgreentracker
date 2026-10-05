import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Batch, BatchPhoto } from '../../types';
import { batchCode, batchYieldGrams, formatGrams } from '../../utils/batches';
import { stageConfig } from '../../data/stages';
import { getDayNumber } from '../../utils/dateUtils';
import PhotoImage from './PhotoImage';

const TILES = 5;

interface CropPhotosProps {
  crop: string;
  batches: Batch[];
  onClose: () => void;
  onOpenGallery: (batchId: string) => void;
}

// Up to five photos spread evenly from first to last, so each row shows the whole grow.
const spread = (photos: BatchPhoto[]) => {
  if (photos.length <= TILES) return photos;
  return Array.from({ length: TILES }, (_, i) => photos[Math.round((i * (photos.length - 1)) / (TILES - 1))]);
};

const shortDate = (date: string) => format(new Date(`${date}T00:00:00`), 'MMM d');

// Every batch of one crop that has photos, newest sowing first, to see which grew best.
const CropPhotos: React.FC<CropPhotosProps> = ({ crop, batches, onClose, onOpenGallery }) => {
  const withPhotos = batches
    .filter(b => b.cropType === crop && b.photos.length > 0)
    .sort((a, b) => b.sowingDate.localeCompare(a.sowingDate));
  const photoCount = withPhotos.reduce((n, b) => n + b.photos.length, 0);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <header className="flex items-center justify-between px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] bg-white border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="flex items-center gap-0.5 min-h-[44px] px-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
          Reports
        </button>
        <div className="text-center min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{crop} photos</h2>
          <p className="text-[11px] text-gray-500">
            {withPhotos.length} batch{withPhotos.length === 1 ? '' : 'es'} · {photoCount} photo{photoCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="w-[72px]" />
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
        {withPhotos.map(batch => {
          const photos = [...batch.photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          const meta = [`Sown ${shortDate(batch.sowingDate)}`, `${photos.length} photo${photos.length === 1 ? '' : 's'}`];
          if (batch.actualHarvestDate) meta.push(`harvested ${shortDate(batch.actualHarvestDate)}`);
          if (batchYieldGrams(batch) > 0) meta.push(formatGrams(batchYieldGrams(batch)));
          return (
            <section key={batch.id} className="bg-white border border-gray-100 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-gray-900">{batchCode(batch.batchNumber)}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${stageConfig[batch.stage].color}`}>
                      {stageConfig[batch.stage].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.join(' · ')}</p>
                </div>
                <button onClick={() => onOpenGallery(batch.id)} className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-2 pl-2">
                  Open
                </button>
              </div>
              <button onClick={() => onOpenGallery(batch.id)} aria-label={`Open ${batchCode(batch.batchNumber)} photos`} className="grid grid-cols-5 gap-1.5 w-full">
                {spread(photos).map(photo => (
                  <span key={photo.id} className="flex flex-col gap-1">
                    <PhotoImage name={photo.file} size="thumb" alt="" className="w-full aspect-square rounded-md" />
                    <span className="text-[10px] text-center text-gray-500">Day {getDayNumber(batch.sowingDate, photo.timestamp)}</span>
                  </span>
                ))}
              </button>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default CropPhotos;
