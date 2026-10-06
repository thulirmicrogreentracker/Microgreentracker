import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.universepdkt.microgreentracker',
  appName: 'Microgreen Manager',
  webDir: 'dist',
  ios: {
    // Google sign-in is Android-only (Apple would also require Sign in with Apple), so the social-login plugin and the
    // Google and Facebook SDKs it brings are left out of the iPhone app. Add new plugins here too.
    includePlugins: [
      '@capacitor/app',
      '@capacitor/device',
      '@capacitor/filesystem',
      '@capacitor/share',
      '@revenuecat/purchases-capacitor',
    ],
  },
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
