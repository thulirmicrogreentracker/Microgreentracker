import { StrictMode } from 'react';
import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initPurchases } from './subscription/purchases';
import './index.css';

// Start RevenueCat early so the subscription status is ready by the time it's needed (no-op without API keys).
initPurchases().catch(e => console.warn('RevenueCat setup failed:', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// The native apps already ship every file inside the app bundle, so the offline
// service worker is only needed (and only registered) for the web/PWA version.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) =>
      console.error('SW registration failed:', e)
    );
  });
}
