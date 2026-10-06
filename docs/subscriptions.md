# Subscriptions with RevenueCat

This branch (`feature/subscriptions`) adds Microgreen Manager Pro. It is kept separate from `main` until it is ready.

## How it works

- **30-day free trial**, no card needed. It starts the first time the app opens (or, for existing users, the first
  time they open a version with subscriptions). The start date is saved with the app's data, so it travels in backups;
  restoring a backup keeps the earlier of the two dates, so it can't restart the trial.
- **After the trial**, starting a **new batch** needs Pro. Everything else keeps working without Pro: existing
  batches (watering, notes, photos, harvests, losses, edits), reports, backups and restore. Nobody's data is locked.
- **Pro** is one RevenueCat entitlement, `pro`, granted by any of three products: **monthly**, **yearly** and a
  one-time **lifetime** purchase.
- **Paywall:** Config → Subscription → See plans, the home-screen banner (last 7 days of the trial and after it), or
  tapping **+** after the trial. Prices come from the stores, in the user's currency.
- Users are **anonymous** unless they sign in: RevenueCat creates a random ID per install, and "Restore purchases"
  brings Pro back on a new phone signed in to the same store account. A user who signs in (optional) is linked to
  RevenueCat by their account, with name and email; see [accounts.md](accounts.md).

| Mode | When | What happens |
|---|---|---|
| Store | A RevenueCat key for the platform is set | Real plans and purchases |
| Off | No key (web, `npm run dev`, or a build without keys) | No subscription screens, nothing locked: behaves exactly like `main` |
| Test | `VITE_SUBSCRIPTION_TEST_MODE=1` | Made-up plans; "buying" unlocks Pro until the app restarts. For trying the paywall only |

Code: `src/subscription/` (settings, RevenueCat layer, `useSubscription` hook), `src/components/Paywall.tsx`, the
Subscription section in `ConfigPanel.tsx`, and the gate on the **+** buttons in `App.tsx`. Change the trial length
with `TRIAL_DAYS` in `src/subscription/config.ts`.

## Setting it up

### 1. Store products

Use the same product IDs on both stores so they're easy to match in RevenueCat.

| Product | Google Play | App Store |
|---|---|---|
| `mm_pro_monthly` | Subscription with a monthly base plan (auto-renewing) | Auto-renewable subscription, 1 month, in a subscription group "Microgreen Manager Pro" |
| `mm_pro_yearly` | Subscription with a yearly base plan (auto-renewing) | Auto-renewable subscription, 1 year, same group |
| `mm_pro_lifetime` | In-app product (one-time) | Non-consumable |

- **Google Play:** Play Console → your app → Monetise → Products. The app must be uploaded to a testing track (at least
  internal testing) before products can be bought, and you need a **payments profile** (merchant account).
- **App Store:** App Store Connect → your app → Monetization. You must accept the **Paid Apps agreement** and fill in
  banking and tax details first. Each product needs a display name, description, price and a review screenshot (the
  paywall screenshot is fine).
- Don't add a store free trial to the subscriptions: the app already gives 30 days free. (If you'd rather use the
  stores' trials, which need a card, set `TRIAL_DAYS` to 0 and add the trial to the subscription offers instead.)

### 2. RevenueCat

1. Create a free account at revenuecat.com and a **project** "Microgreen Manager".
2. Add the apps:
   - **Google Play**: package `com.universepdkt.microgreentracker`, plus a Google Cloud **service account** JSON key
     with access to Play Console's financial data (RevenueCat's setup page walks through it; it can take up to 36 hours
     to start working).
   - **App Store**: bundle ID `com.universepdkt.microgreentracker`, plus an **In-App Purchase key** (.p8) from App
     Store Connect → Users and Access → Integrations.
3. **Products**: import or add the three product IDs for each app.
4. **Entitlements**: create `pro` and attach all six products (three per store).
5. **Offerings**: create `default`, mark it **current**, and add three packages: **Monthly** → `mm_pro_monthly`,
   **Annual** → `mm_pro_yearly`, **Lifetime** → `mm_pro_lifetime` (each with both stores' product).
6. **API keys**: copy the public SDK key of each app (`goog_…` and `appl_…`).

### 3. Build with the keys

```bash
cp .env.example .env.local      # then paste the two keys into .env.local
npm run build && npx cap sync
```

`.env.local` is git-ignored. The public SDK keys aren't secret (they ship inside the app), but keeping them out of git
makes it easy to build test and release versions with different settings.

## Testing real purchases

- **Android:** add your Google account as a **licence tester** (Play Console → Settings → License testing), install the
  app from the internal testing track (or a debug build signed with the same key), and buy: testers aren't charged and
  subscriptions renew every few minutes.
- **iOS:** use a **Sandbox** account (App Store Connect → Users and Access → Sandbox) or TestFlight. Sandbox
  subscriptions also renew quickly.
- RevenueCat → Customers shows each test purchase and the `pro` entitlement.

## Before releasing

- Publish the updated privacy policy and FAQ (in `docs/store/`, on this branch) together with the release.
- Fill in the updated privacy answers (`docs/store/store-listing.md`): App Privacy → Purchases → Purchase History, and
  Play Data safety → Purchase history, and declare in-app purchases.
- App Store: subscriptions need a link to the Terms of Use (Apple's standard licence is linked from the paywall and
  the description) and the privacy policy.
- Merge this branch into `main` only when the store products and RevenueCat are set up and tested.
