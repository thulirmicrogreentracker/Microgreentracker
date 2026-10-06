# Thulir MicroGreen Tracker

Track microgreen batches from sowing to harvest: trays, watering, notes, photos, reminders, reports and daily backups.

See [HANDOVER.md](HANDOVER.md) for the project status, architecture, known issues and next steps.

The app is a React + Vite web app that also ships as native **Android** and **iOS** apps through [Capacitor](https://capacitorjs.com). All data is stored on the device; there is no server or account.

## Where data is stored

Everything stays on the phone, in the app's private storage (`src/storage/`):

- `microgreen/data-a.json` / `data-b.json`: all batches, crops, settings and reminders. Saves alternate between
  the two files, so if the app is killed mid-save the previous copy is still intact.
- `microgreen/photos/`: one compressed JPEG per photo (longest side 1600 px).
- `microgreen/snapshots/`: an automatic copy of the data taken each day (last 30 kept), shown under
  **Config → Restore**.

In a browser the same files live in IndexedDB. Data from older versions of the app (browser localStorage)
is moved over automatically the first time the new version opens.

### Backup files

**Config → Save File** creates `thulir-microgreen-backup-YYYY-MM-DD.zip` (all data plus photos) and opens the
phone's share sheet, so it can be saved to Google Drive, Files, or emailed. **Config → Restore File** (or
*Restore from a backup file* on a fresh install) opens it again; the data that gets replaced is kept as a
snapshot first. On Android, Auto Backup additionally copies the data (not photos) to the user's Google
account.

## Project layout

| Path | What it is |
|---|---|
| `src/` | The app itself (React + TypeScript + Tailwind); `src/storage/` holds on-device storage and backups |
| `android/` | Native Android project (open in Android Studio) |
| `ios/` | Native iOS project (open in Xcode) |
| `assets/` | Source images for the app icon and splash screen |
| `capacitor.config.ts` | App id (`com.universepdkt.microgreentracker`), app name, native settings |

## Web

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## Android

**Quickest way to get an installable APK (no Android Studio needed):** every push to GitHub runs the
**Android APK** workflow. Open the repo on GitHub → **Actions** → the latest *Android APK* run →
download `thulir-microgreen-tracker-debug-apk`, unzip it and copy `app-debug.apk` to your phone. Allow
"install unknown apps" when Android asks.

**With Android Studio** (needed for Play Store releases):

```bash
npm install
npm run android   # builds the web app, copies it into android/ and opens Android Studio
```

Then press ▶ Run to install on a connected phone or emulator. For the Play Store use
**Build → Generate Signed App Bundle** and upload the `.aab` in the Google Play Console.

## iOS

iOS apps can only be built on a **Mac with Xcode** installed.

```bash
npm install
npm run ios       # builds the web app, copies it into ios/ and opens Xcode
```

In Xcode, select the **App** target → **Signing & Capabilities** → pick your Apple ID team, then
choose your iPhone and press ▶ Run. Publishing to the App Store needs an Apple Developer account
($99/year): **Product → Archive** → **Distribute App**.

## After changing the code

Native projects contain a copy of the built web app. After any change in `src/`, run:

```bash
npm run cap:sync
```

## App icon and splash screen

Replace the PNGs in `assets/` (icon 1024×1024, splash 2732×2732), then run:

```bash
npx capacitor-assets generate --android --ios --iconBackgroundColor '#059669' --splashBackgroundColor '#059669'
```
