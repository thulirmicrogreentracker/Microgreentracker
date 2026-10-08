import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

const EDGE = 28; // px from the left edge where a back swipe can start

// Follows a finger that starts at the left edge of `el` and moves right, like the iOS back gesture. Past a third of
// the width (or after a quick flick) `onBack` runs; otherwise the element springs back. `slideOut` animates the
// element off screen first (for pages); without it the element is just reset (for the tab screens).
export function attachSwipeBack(el: HTMLElement, onBack: () => void, { slideOut = true, enabled = () => true } = {}) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let state: 'idle' | 'pending' | 'dragging' = 'idle';
  let dx = 0;

  const setX = (x: number, animate: boolean) => {
    el.style.transition = animate ? 'transform 0.22s ease-out' : 'none';
    el.style.transform = x ? `translateX(${x}px)` : '';
  };
  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (e.touches.length !== 1 || !enabled() || t.clientX - el.getBoundingClientRect().left > EDGE) return;
    startX = t.clientX;
    startY = t.clientY;
    startTime = e.timeStamp;
    dx = 0;
    state = 'pending';
  };
  const onMove = (e: TouchEvent) => {
    if (state === 'idle') return;
    const t = e.touches[0];
    dx = Math.max(0, t.clientX - startX);
    if (state === 'pending') {
      if (Math.abs(t.clientY - startY) > 10 && Math.abs(t.clientY - startY) > dx) state = 'idle'; // a scroll
      else if (dx > 10) state = 'dragging';
      return;
    }
    e.preventDefault();
    setX(dx, false);
  };
  const onEnd = (e: TouchEvent) => {
    if (state !== 'dragging') {
      state = 'idle';
      return;
    }
    state = 'idle';
    const width = el.getBoundingClientRect().width;
    const fast = dx > 40 && dx / Math.max(1, e.timeStamp - startTime) > 0.5;
    if (dx < width / 3 && !fast) return setX(0, true);
    if (!slideOut) {
      setX(0, false);
      onBack();
      return;
    }
    setX(width, true);
    window.setTimeout(onBack, 220);
  };
  const onCancel = () => {
    if (state === 'dragging') setX(0, true);
    state = 'idle';
  };
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd);
  el.addEventListener('touchcancel', onCancel);
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('touchcancel', onCancel);
  };
}

interface SwipePageProps {
  onBack: () => void;
  title?: string; // shows a header with a back button and this title
  bare?: boolean; // the children are a complete full-screen page of their own (photo screens, info pages)
  children: React.ReactNode;
}

// A screen pushed on top of the app: it slides in from the right and goes back with a swipe from the left edge.
export default function SwipePage({ onBack, title, bare, children }: SwipePageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => attachSwipeBack(ref.current!, () => backRef.current()), []);

  return (
    <div ref={ref} className="swipe-page">
      {bare ? children : (
        <div className="farm-app swipe-page-body max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
          {title && (
            <header className="swipe-page-header">
              <button className="farm-icon-button" onClick={onBack} aria-label="Back">
                <ArrowLeft />
              </button>
              <h1>{title}</h1>
              <span aria-hidden="true" />
            </header>
          )}
          <div className={`swipe-page-scroll no-scrollbar ${title ? '' : 'no-header'}`}>{children}</div>
        </div>
      )}
    </div>
  );
}
