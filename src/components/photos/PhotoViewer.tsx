import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Share2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Batch } from '../../types';
import { batchCode, photoTrayCode } from '../../utils/batches';
import { stageConfig } from '../../data/stages';
import { getDayNumber } from '../../utils/dateUtils';
import { sharePhoto } from '../../storage/photos';
import PhotoImage from './PhotoImage';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;

type Gesture =
  | { kind: 'pinch'; dist: number; scale: number; x: number; y: number }
  | { kind: 'pan'; sx: number; sy: number; x: number; y: number; dx: number; dy: number; moved: boolean };

const distance = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

// Pinch or double-tap to zoom, drag to pan while zoomed, swipe sideways to change photo.
const ZoomableImage: React.FC<{ name: string; alt: string; onSwipe: (direction: 1 | -1) => void }> = ({ name, alt, onSwipe }) => {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef(0);
  const lastTouchEnd = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const clampPan = (scale: number, x: number, y: number) => {
    const box = boxRef.current;
    if (!box) return { x, y };
    const maxX = (box.clientWidth * (scale - 1)) / 2;
    const maxY = (box.clientHeight * (scale - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const toggleZoom = () => setView(v => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: DOUBLE_TAP_ZOOM, x: 0, y: 0 }));

  const startPan = (touch: React.Touch, moved: boolean) => {
    gesture.current = { kind: 'pan', sx: touch.clientX, sy: touch.clientY, x: view.x, y: view.y, dx: 0, dy: 0, moved };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setGesturing(true);
    if (e.touches.length === 2) {
      gesture.current = { kind: 'pinch', dist: distance(e.touches[0], e.touches[1]), scale: view.scale, x: view.x, y: view.y };
    } else if (e.touches.length === 1) {
      startPan(e.touches[0], false);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch' && e.touches.length === 2) {
      const scale = Math.max(1, Math.min(MAX_ZOOM, (g.scale * distance(e.touches[0], e.touches[1])) / g.dist));
      setView({ scale, ...clampPan(scale, g.x, g.y) });
    } else if (g.kind === 'pan' && e.touches.length === 1) {
      g.dx = e.touches[0].clientX - g.sx;
      g.dy = e.touches[0].clientY - g.sy;
      if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) g.moved = true;
      if (view.scale > 1) setView(v => ({ ...v, ...clampPan(v.scale, g.x + g.dx, g.y + g.dy) }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (e.touches.length === 1) {
      // One finger lifted after a pinch: carry on panning with the other.
      startPan(e.touches[0], true);
      return;
    }
    gesture.current = null;
    lastTouchEnd.current = Date.now();
    setGesturing(false);
    if (view.scale < 1.05) setView({ scale: 1, x: 0, y: 0 });
    if (!g || g.kind !== 'pan') return;
    if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        toggleZoom();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    } else if (view.scale === 1 && Math.abs(g.dx) > 60 && Math.abs(g.dx) > Math.abs(g.dy)) {
      onSwipe(g.dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      ref={boxRef}
      className="w-full h-full overflow-hidden touch-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      // Mouse only: Android WebViews also fire dblclick after a touch double-tap, which onTouchEnd already handled.
      onDoubleClick={() => { if (Date.now() - lastTouchEnd.current > 800) toggleZoom(); }}
    >
      <div
        className={`w-full h-full ${gesturing ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        <PhotoImage name={name} size="full" alt={alt} contain className="w-full h-full" />
      </div>
    </div>
  );
};

interface PhotoViewerProps {
  batch: Batch;
  photoId: string;
  onClose: () => void;
  onUpdateCaption: (photoId: string, caption: string) => void;
  onDelete: (photoId: string) => void;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({ batch, photoId, onClose, onUpdateCaption, onDelete }) => {
  const photos = [...batch.photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const [currentId, setCurrentId] = useState(photoId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const lastIndex = useRef(0);

  // After a delete the current photo is gone; stay at the same position instead.
  let index = photos.findIndex(p => p.id === currentId);
  if (index === -1) index = Math.min(lastIndex.current, photos.length - 1);
  lastIndex.current = index;
  const photo = photos[index];

  useEffect(() => {
    if (!photo) onClose();
    else if (photo.id !== currentId) setCurrentId(photo.id);
  }, [photo, currentId, onClose]);

  useEffect(() => setEditing(false), [currentId]);

  const go = (direction: 1 | -1) => {
    if (photos.length < 2) return;
    setCurrentId(photos[(index + direction + photos.length) % photos.length].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!photo) return null;

  const day = getDayNumber(batch.sowingDate, photo.timestamp);
  const stage = stageConfig[photo.stage];

  const handleShare = () =>
    sharePhoto(photo.file, `${batch.cropType}-${batchCode(batch.batchNumber)}-day-${day}`).catch(e => {
      console.error(e);
      window.alert('This photo could not be shared.');
    });

  const handleDelete = () => {
    if (window.confirm('Delete this photo?')) onDelete(photo.id);
  };

  const saveCaption = () => {
    onUpdateCaption(photo.id, draft.trim());
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0f0d] text-gray-50 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <header className="flex items-center justify-between px-2 pb-1 pt-[calc(0.5rem+env(safe-area-inset-top))] shrink-0">
        <button onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10">
          <X className="w-[22px] h-[22px]" />
        </button>
        <div className="text-center min-w-0">
          <div className="text-sm font-semibold truncate">{batchCode(batch.batchNumber)} · {batch.cropType}</div>
          <div className="text-xs text-gray-400">{index + 1} of {photos.length}</div>
        </div>
        <div className="w-11" />
      </header>

      <div className="relative flex-1 min-h-0">
        <ZoomableImage key={photo.id} name={photo.file} alt={photo.caption || `Day ${day} photo`} onSwipe={go} />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
            >
              <ChevronLeft className="w-[22px] h-[22px]" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
            >
              <ChevronRight className="w-[22px] h-[22px]" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && photos.length <= 15 && (
        <div className="flex justify-center gap-1.5 pt-3 shrink-0" aria-hidden="true">
          {photos.map((p, i) => (
            <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-[18px] bg-white' : 'w-1.5 bg-gray-600'}`} />
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-gray-400 pt-1 shrink-0">Swipe for more · pinch or double-tap to zoom</p>

      <section aria-label="Photo details" className="px-5 pt-4 pb-3 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stage.color}`}>{stage.label}</span>
          <span className="text-[13px] text-gray-300">
            {photoTrayCode(batch, photo) ? `${photoTrayCode(batch, photo)} · ` : ''}Day {day} · {format(new Date(photo.timestamp), 'MMM d, yyyy · h:mm a')}
          </span>
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={2}
              autoFocus
              aria-label="Caption"
              placeholder="Describe this photo…"
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 min-h-[40px] rounded-lg bg-white/10 text-sm font-medium">Cancel</button>
              <button onClick={saveCaption} className="flex-1 min-h-[40px] rounded-lg bg-emerald-600 text-sm font-semibold">Save</button>
            </div>
          </div>
        ) : (
          <p className={`text-lg leading-snug ${photo.caption ? 'text-gray-50' : 'text-gray-400'}`}>
            {photo.caption || 'No caption'}
          </p>
        )}
      </section>

      <nav aria-label="Photo actions" className="grid grid-cols-3 gap-2 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 shrink-0">
        <button
          onClick={() => { setDraft(photo.caption ?? ''); setEditing(true); }}
          className="min-h-[56px] rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-xs"
        >
          <Pencil className="w-5 h-5" />
          Edit caption
        </button>
        <button onClick={handleShare} className="min-h-[56px] rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-xs">
          <Share2 className="w-5 h-5" />
          Share
        </button>
        <button onClick={handleDelete} className="min-h-[56px] rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-xs text-red-300">
          <Trash2 className="w-5 h-5" />
          Delete
        </button>
      </nav>
    </div>
  );
};

export default PhotoViewer;
