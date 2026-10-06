# Publishing Microgreen Manager to the App Store and Google Play

Everything needed for the store listings, and the steps to get there.

| File | What it is | Where it goes |
|---|---|---|
| [privacy-policy.md](privacy-policy.md) | Privacy policy | Publish at a public web address; link it in both stores and in the app |
| [faq.md](faq.md) | Questions and answers for users | Your support page, and optionally in the app |
| [store-listing.md](store-listing.md) | Names, descriptions, keywords, categories, privacy and content-rating answers | App Store Connect and Play Console |
| [screenshots.md](screenshots.md) and [screenshots/](screenshots/) | Ready-made store screenshots (iPhone and Android, captioned and plain), the Play feature graphic and icon, and how to remake them | App Store Connect and Play Console |

## 1. Publisher details (done)

| Detail | Value | Set in |
|---|---|---|
| Developer name | Rajeshkumar | `src/data/appInfo.ts`, the documents here |
| Support email | thulirmicrogreentracker@gmail.com | same |
| Privacy policy URL | https://universepdkt.github.io/Microgreentracker/store/privacy-policy | same |
| Support URL | https://universepdkt.github.io/Microgreentracker/store/faq | same |

To change one, edit `src/data/appInfo.ts` and the matching text in this folder.

## 2. Publish the privacy policy and FAQ

Both stores need a public **https** address that opens without a login. They are served by **GitHub Pages** from
the `docs` folder on `main` (repository Settings → Pages → Deploy from a branch → `main` / `/docs`; only the owner,
`universepdkt`, can change this setting). Every change to `docs/` on `main` updates the pages within a few minutes.

## 3. Changes still needed in the app

- [x] **Privacy policy and FAQ inside the app** (App Store guideline 5.1.1): Config → About opens both, from the same
      text as this folder, so they work offline. A "Contact support" link appears once `supportEmail` is filled in.
- [x] **Export compliance (iOS):** `ITSAppUsesNonExemptEncryption` = `NO` is set in `ios/App/App/Info.plist`.
- [x] **iPhone-only** (`TARGETED_DEVICE_FAMILY = 1`), so no iPad screenshots or iPad review. To support iPad later,
      set it back to `1,2` and add 13" iPad screenshots.
- [x] **Bolt.new tags removed** from `index.html`.
- [x] **Test Data button hidden in store builds** (only shown with `npm run dev`), so a grower can't replace their
      data by accident.
- [ ] **Screenshot with real tray photos** (see screenshots.md).
- [ ] **Version numbers** for each upload: Android `versionCode` (must increase every upload) and `versionName` in
      `android/app/build.gradle`; iOS `CURRENT_PROJECT_VERSION` (build) and `MARKETING_VERSION` in Xcode.
      Both are currently 1 / 1.0.

## 4. Accounts

- **Apple Developer Program**, US$99 per year. The free "Personal Team" used for testing can't publish to the App
  Store, and its builds stop opening after 7 days.
- **Google Play Console**, US$25 one-time. New personal accounts must run a **closed test with at least 12 testers for
  14 days** before they can publish to production.

## 5. Google Play steps

1. Create the **upload key** and build the signed **.aab** with `npm run android:release`: see
   [../release.md](../release.md). Keep the key file and password safe and out of git; losing them means asking
   Google to reset the key.
2. Play Console → Create app → fill in the store listing (store-listing.md), graphics (screenshots.md), Data safety,
   content rating, target audience and other declarations (store-listing.md).
3. Turn on **Play App Signing** (default) and upload the .aab to the closed test track; after 14 days with 12 testers,
   promote it to production.

## 6. App Store steps

1. In Xcode, select your paid team under Signing & Capabilities for the **App** target.
2. App Store Connect → My Apps → New App: bundle ID `com.universepdkt.microgreentracker`, name, primary language.
3. Xcode → Product → **Archive** → Distribute App → App Store Connect → Upload.
4. In App Store Connect, fill in the listing (store-listing.md), screenshots (screenshots.md), App Privacy ("Data Not
   Collected"), age rating (4+) and the privacy policy URL; choose the uploaded build and submit for review.
5. Optional but recommended: test the build with TestFlight first.

## Facts the answers rely on

If any of these change, update the privacy policy and the store questionnaires before releasing:

- The app makes no network requests and has no account, analytics, ads or tracking SDKs.
- Data and photos are stored only in the app's private storage on the device.
- Data leaves the device only when the user shares a backup file or photo through the share sheet, or through the
  phone's own backup (Google app backup excludes photos; iCloud Backup includes them).
- Permissions: camera (taking tray photos); photo library on iOS (attaching an existing photo).
