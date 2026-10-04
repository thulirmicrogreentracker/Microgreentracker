import React from 'react';
import { Camera, ChevronRight, Plus } from 'lucide-react';
import { Batch } from '../../types';
import { getDayNumber } from '../../utils/dateUtils';
import PhotoImage from './PhotoImage';

const TILES = 5;

interface PhotoStripProps {
  batch: Batch;
  onOpenGallery: () => void;
  onAddPhoto: () => void;
}

// The newest photos of a batch on its card. With more than five, the fifth tile shows "+N".
const PhotoStrip: React.FC<PhotoStripProps> = ({ batch, onOpenGallery, onAddPhoto }) => {
  const photos = [...batch.photos].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const overflow = photos.length > TILES;
  const shown = photos.slice(0, TILES);
  const hiddenCount = photos.length - (TILES - 1);

  // Keep taps here from also selecting the card underneath.
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <Camera className="w-3.5 h-3.5 text-purple-700" />
          Photos
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-1.5 rounded-full">{photos.length}</span>
        </div>
        {photos.length > 0 && (
          <button
            onClick={stop(onOpenGallery)}
            className="flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1 pl-2"
          >
            See all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {shown.map((photo, i) => {
          const isMoreTile = overflow && i === TILES - 1;
          const day = getDayNumber(batch.sowingDate, photo.timestamp);
          return (
            <button
              key={photo.id}
              onClick={stop(onOpenGallery)}
              aria-label={isMoreTile ? `${hiddenCount} more photos` : `Day ${day} photo`}
              className="flex flex-col gap-1 text-gray-500"
            >
              <div className="relative w-full aspect-square rounded-md overflow-hidden">
                <PhotoImage name={photo.file} size="thumb" alt="" className="w-full h-full" />
                {isMoreTile && (
                  <div className="absolute inset-0 bg-gray-900/60 text-white flex items-center justify-center text-sm font-bold">
                    +{hiddenCount}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-center w-full">{isMoreTile ? 'More' : `Day ${day}`}</span>
            </button>
          );
        })}
        {photos.length < TILES && (
          <button onClick={stop(onAddPhoto)} aria-label="Add photo" className="flex flex-col gap-1 text-gray-500">
            <div className="w-full aspect-square rounded-md border-[1.5px] border-dashed border-purple-300 bg-purple-50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-purple-700" />
            </div>
            <span className="text-[10px] text-center w-full">Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoStrip;
