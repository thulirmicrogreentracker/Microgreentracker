import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.universepdkt.microgreentracker',
  appName: 'Thulir MicroGreen Tracker',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // index.html uses viewport-fit=cover; the layout pads itself with env(safe-area-inset-*).
      initialViewportFitValueHint: 'cover',
      // Dark status-bar icons on the app's white header.
      style: 'LIGHT',
    },
  },
};

export default config;
