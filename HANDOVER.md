# Microgreen Manager: Handover

The state of the project as of 5 October 2026, for continuing work on a local machine.

- **Repository:** `universepdkt/Microgreentracker`
- **Branch with all the work:** `claude/gallant-hawking-b678x2`. It is **not merged into `main` yet**: `main` still has
  the original Bolt.new web app, with no `android/` or `ios/` folders.
- **Visual mockup of the photo screens:** https://claude.ai/artifact/Guk5dtYNvx7GWnkPVvybei (private to the owner)

---

## 1. What the app is

A phone app for microgreen growers. It tracks batches (trays) from sowing to harvest, with watering records,
notes, photos, reminders, reports and backups. It is a **React + TypeScript + Vite + Tailwind** web app,
wrapped as native **Android** and **iOS** apps with **Capacitor 8**.

**Everything is stored on the phone; there is no server, account or login.**

## 2. What was done on this branch

| Commit | What it did |
|---|---|
| `c6540f1` | Added Capacitor with Android and iOS projects, app icons and splash screens, notch/home-bar padding, the Android back button, the native share sheet for downloads, iOS camera permission text, and a GitHub Actions workflow that builds a debug APK |
| `0fd245f` | Fixed that workflow by using the runner's built-in Android SDK |
| `f5b49e9` | **Phase 1, on-device storage:** moved data out of browser `localStorage` into crash-safe files, photos into separate compressed files, and daily snapshots into files. Existing data is migrated on first launch. **Option A, backup file:** export and import a `.zip` (data + photos) through the share sheet, e.g. to and from Google Drive |
| `ac8b7b3` | **Photo gallery:** a photo strip on batch cards, a batch gallery grouped by stage, a full-screen viewer (swipe, pinch zoom, caption, share, delete), a compare screen, and photos by crop in Reports |
| *(this commit)* | This handover file plus the browser end-to-end tests in `tests/e2e/` |

Decisions made with the owner along the way:
- Data stays on the phone. Backup to Google Drive works **through the share sheet for now** (no Google sign-in).
- A **Google Drive connection** (each user signs in with their own Google account) is planned as **the next phase**.
  See §8.
- App id: `com.universepdkt.microgreentracker`. App name: "Microgreen Manager".

## 3. Set up locally

You need **Node.js 22+**, Git, and for Android, **Android Studio Narwhal 3 (2025.1.3) or newer** (the project
uses Android Gradle Plugin 8.13, compile SDK 36, min SDK 24, Java 21). iOS needs a Mac with Xcode.

```bash
git clone https://github.com/universepdkt/Microgreentracker.git
cd Microgreentracker
git checkout claude/gallant-hawking-b678x2
npm install
```

### Web (fastest for UI work)

```bash
npm run dev            # http://localhost:5173 ; use Chrome DevTools' phone view (F12 → device icon)
npm run dev -- --host  # also reachable from a phone on the same Wi-Fi
```

### Android

```bash
npm run build && npx cap sync android   # REQUIRED before Android Studio can build; see the gotchas below
```

1. In Android Studio, choose **File → Open → the `android/` folder** (not the repo root).
2. Wait for the Gradle sync.
3. Create an emulator in Tools → Device Manager (Pixel 8, API 35/36).
4. Press ▶ Run.

Or run `npm run android`, which builds, syncs and opens Android Studio.

- **After every change in `src/`:** run `npm run build && npx cap sync android`, then press Run again.
- **WebView console and debugger:** open `chrome://inspect` in desktop Chrome while the app runs.
- **Emulator tips:** Ctrl/Cmd + drag = pinch; drag an image file onto the emulator to put it in Downloads.

### iOS (Mac only)

Run `npm run ios`. Then, in Xcode, select the **App** target → **Signing & Capabilities**, pick your team, and press Run.

### Getting an APK without Android Studio

Every push runs `.github/workflows/android-apk.yml`. On GitHub, go to **Actions → Android APK → latest run →
Artifacts** and download `microgreen-manager-debug-apk`. It is a zip containing `app-debug.apk`.

## 4. Gotchas

- `android/app/src/main/assets/public` (the built web app) and the Capacitor config copies are **git-ignored**.
  A fresh clone **must** run `npm install && npm run build && npx cap sync` before a native build. Without it,
  Gradle sync fails on `node_modules/@capacitor/...`, or the app opens to a blank white screen.
- **Don't change the app id** once anything is published: Android and iOS treat a new id as a different app.
- **Don't rename storage paths** (`microgreen/data-a.json`, `photos/`, `snapshots/`); users' data lives there.
- `npm run build` does **not** type-check (Vite skips it). Run `npx tsc --noEmit -p tsconfig.app.json` yourself.
  It currently reports errors that existed before this branch; see §7.

## 5. How the code is organised

```
src/
  App.tsx                  App shell: loads data (useAppData), tabs, sheets, photo screens, back button
  types/index.ts           Batch, BatchPhoto { id, file, caption?, timestamp, stage }, AppData, …
  storage/                 Everything that touches device storage (Capacitor Filesystem, Directory.Data)
    fs.ts                  read/write helpers, base64 helpers; ROOT = "microgreen"
    appData.ts             load/save of all records: two alternating files with a sequence number,
                           saves queued and coalesced, one-time migration from localStorage, photo clean-up
    photos.ts              save (resize to 1600 px JPEG), 320 px thumbnails, photoSrc() for <img>,
                           sharePhoto(), deleteUnusedPhotos()
    snapshots.ts           daily on-device snapshots (last 30), restore/delete, legacy IndexedDB migration
    backupFile.ts          .zip export/import (backup.json + photos/*), validation, schema version check
    legacy.ts              old localStorage format → new format, normalizeAppData() (fills missing fields)
  hooks/
    useAppData.ts          loads data, saves every change, reports save errors (red banner + Retry)
    useBackup.ts           useDailySnapshot(): one snapshot on the first launch each day
    useReminders.ts        reminder generation (has known bugs, see §7)
  components/
    BatchCard.tsx          batch card, now with the PhotoStrip
    photos/                PhotoImage, PhotoStrip, BatchGallery, PhotoViewer (gestures), PhotoCompare, CropPhotos
    ConfigPanel.tsx        settings, backup section ("Backup Now", "Restore", "Save File", "Restore File")
    ReportsPanel.tsx       reports plus the "Photos by Crop" card
  data/stages.ts           stage labels, colours, order (shared)
  utils/saveFile.ts        download in the browser / write to cache + share sheet on the phone
  utils/dateUtils.ts       getDayNumber(sowingDate, timestamp) → "Day N"
android/  ios/             native projects (Capacitor). Android backup rules: res/xml/*backup*rules.xml
assets/                    icon/splash source PNGs → `npx capacitor-assets generate --android --ios`
tests/e2e/                 Playwright browser tests (see §6)
```

### Data model

- A **batch** (`B001`, `B002`, …) is one crop sown on one date. Stage, watering, photos and notes belong to the batch.
- A batch holds one or more **trays** (`Batch.trays`): each has a code (`T001`, …), an optional physical position
  (`slot`, 1..`config.totalTrays`) and a status (`active` or `lost`, with `lostReason`, `lostDate`, `lostNote`).
  A batch whose trays are all lost is shown as "Lost" and gets no reminders. Helpers live in `utils/batches.ts`.
- Batch and tray numbers come from `config.lastBatchNumber` / `config.lastTrayNumber`. They are saved with the data,
  so they travel in backups, and `syncCounters()` keeps them at or above the highest number in the data, so
  numbering carries on after a restore and numbers are never reused.
- Crop categories (`config.categories`) and loss reasons (`config.lossReasons`) are editable in Config.

### Storage format (version 2)

Version 2 added trays, numbering, categories and loss reasons. `normalizeAppData()` upgrades version 1 data (from
the device, snapshots or backup files): each old batch becomes a one-tray batch keeping its tray ID and position,
and gets a batch number in creation order.


- **On the device:**
  - `microgreen/data-a.json` and `data-b.json`, each `{ schemaVersion, seq, savedAt, data: AppData }`. The one
    with the higher valid `seq` wins.
  - `microgreen/photos/<name>.jpg` and `microgreen/thumbs/<name>.jpg`.
  - `microgreen/snapshots/snapshot-<epochMs>.json`.
- **Backup file:** `.zip` with `backup.json` = `{ format: "microgreen-manager-backup", schemaVersion: 2, createdAt,
  data }` and `photos/<name>`. Old `.json` backups (the localStorage key format) are still accepted on import.
- **Changing the data shape:** bump `SCHEMA_VERSION` in `storage/appData.ts` and teach `normalizeAppData()` to
  upgrade old data. Imports refuse backups from a *newer* schema version.
- **Android Auto Backup** copies the data and snapshots to the user's Google account but **excludes photos**, because
  of its 25 MB limit.

## 6. Tests

`tests/e2e/` holds 73 browser checks: migration, saving, crash recovery, photo compression, backup
export/import, snapshot restore, clean-up, and every photo screen including swipe and pinch gestures. Run them like this:

```bash
npx playwright install chromium      # once
npm run build && npx vite preview --port 4173 --strictPort &   # tests expect the built app on port 4173
npm run test:e2e                     # prints PASS/FAIL per check, then ALL PASSED
```

- `storage-and-backup.cjs` uses the `unzip` command to inspect the exported zip (Windows: run it in Git Bash or WSL).
- Set `E2E_OUT=<folder>` to keep the screenshots and downloaded files.
- They run against the **web** build. Native-only behaviour (share sheet, camera, file picker, back button,
  WebView file loading) still needs checking on a real phone or emulator (§7).

## 7. Known issues and loose ends

**Not yet checked on a real device** (everything passed in the browser and the APK builds in CI):
- First launch with existing data on a phone (the migration).
- Camera capture.
- Share sheet → Google Drive.
- Restore File through the Android/iOS file picker.
- Pinch and swipe feel.
- The Android back button order: viewer → compare → gallery → crop photos → sheets → tab → exit.
- The iOS build, which hasn't been built at all yet.

**Problems that were already there before this branch, still unfixed:**
- **Reminders** (`hooks/useReminders.ts`):
  - Each batch gets one watering reminder that never repeats.
  - Dismissing an automatic reminder brings it straight back.
  - The germination check is always day 2 instead of the crop's `daysToGermination`.
  - Watering ignores the crop's `wateringFrequency`.
- **Web/PWA only:** `public/sw.js` serves from cache first, so web users can get stuck on an old version. Native apps
  don't register it.
- **Unfinished code:**
  - `utils/exportUtils.ts` (PDF/CSV export) isn't reachable from the UI, so `jspdf` and `html2canvas` are unused.
  - Lighting records exist in the type but have no UI.
- **Accessibility:** stacked full-screen screens (gallery under viewer) stay in the accessibility tree. Consider
  `inert` on lower layers.

## 8. Next steps (suggested order)

1. **Test the APK on a real phone** (the list in §7), then merge this branch into `main` through a pull request.
2. **Google Drive connection (agreed next phase).** Each user signs in with their own Google account, and backups go
   to their Drive automatically. There is still no server. Plan:
   - **One-time setup by the owner in Google Cloud Console:**
     - Create a project and enable the Drive API.
     - Set up the OAuth consent screen. It needs a privacy policy URL, and must be published to **In production**
       (Testing mode = 100 users and 7-day logins).
     - Create OAuth clients:
       - **Android:** package `com.universepdkt.microgreentracker` + the SHA-1 of the debug key, the upload key and
         the Play app-signing key.
       - **iOS:** the bundle id.
       - **Web:** a web client id.
   - **Sign-in:** `@capgo/capacitor-social-login` (supports Capacitor 8 and custom scopes). Use the
     `drive.appdata` scope (hidden app folder, non-sensitive, no paid security review) or `drive.file` (visible folder).
   - **Backup:** a small `backup.json` plus each photo uploaded **once** (incremental), keeping the last 10 backups.
     Run it daily on app open or resume, Wi-Fi only by default, plus "Back up now".
   - **Restore:** list the backups (date, device, batch count), confirm, take a local snapshot first, download, then
     replace. Offer it on a fresh install.
   - **Reuse what's built:** `backupFile.ts` (format and validation), `snapshots.ts` (safety copy) and
     `photos.ts` (photo files).
3. **Fix the reminders** (§7). Consider native notifications (`@capacitor/local-notifications`).
4. **Publish the APK as a GitHub Release asset** (a direct `.apk` link for phones; currently only a zipped artifact).
5. **Store release:**
   - **Android:** create an upload keystore (keep it safe, since losing it means you can't update the app), raise
     `versionCode`/`versionName` in `android/app/build.gradle`, build an `.aab`, and fill in the Play Data Safety
     form (no data collected).
   - **iOS:** an Apple Developer account, App Store privacy labels, then Archive → Distribute.

## 9. Useful commands

```bash
npm run dev                         # web dev server
npm run build                       # production web build (no type-check)
npx tsc --noEmit -p tsconfig.app.json   # type-check
npm run lint                        # ESLint
npm run cap:sync                    # build + copy into android/ and ios/
npm run android / npm run ios       # build, sync, open the IDE
npm run test:e2e                    # browser tests (needs vite preview on :4173)
npx capacitor-assets generate --android --ios --iconBackgroundColor '#059669' --splashBackgroundColor '#059669'
```
