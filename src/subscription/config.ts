// Subscription settings. See docs/subscriptions.md for setting up RevenueCat and the store products.

// RevenueCat public SDK keys (RevenueCat → Project settings → API keys). They are meant to ship inside the app.
// Set them in .env.local (see .env.example). Without a key for the platform, subscriptions are switched off and
// nothing in the app is locked.
export const revenueCatKeys = {
  ios: (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined) || '',
  android: (import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined) || '',
};

// VITE_SUBSCRIPTION_TEST_MODE=1 shows made-up plans whose "purchase" just unlocks Pro until the app restarts.
// For checking the paywall without a store account; never set it for a store build.
export const subscriptionTestMode = import.meta.env.VITE_SUBSCRIPTION_TEST_MODE === '1';

// The RevenueCat entitlement that the monthly, yearly and lifetime products all grant (its identifier in RevenueCat →
// Product catalog → Entitlements).
export const PRO_ENTITLEMENT = 'thulir_microgreen_tracker_pro';

// Free period from the first launch, during which everything works without a subscription.
export const TRIAL_DAYS = 30;

// Apple's standard licence agreement, which applies when the app has no terms of its own.
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
