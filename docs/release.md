# Release builds (Google Play)

Google Play takes an **Android App Bundle (.aab)** signed with your **upload key**. Debug builds (Android Studio's
Run button, `assembleDebug`, the GitHub "Android APK" workflow) are for testing only and can't be uploaded.

## 1. Create the upload key (once)

Keep the key outside the project folder. You choose the password when the command asks for it.

```bash
mkdir -p ~/microgreen-keys
```

```bash
keytool -genkeypair -v -keystore ~/microgreen-keys/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

- For "first and last name" you can enter your name; the other questions can be left blank.
- **Back up** `upload-keystore.jks` and its password, for example the file in Google Drive and the password in a
  password manager. Google Play re-signs the app with its own key (Play App Signing), so if the upload key is lost
  you can ask Google to reset it, but that takes time.
- If `keytool` isn't found, use the one in Android Studio's JDK:
  `"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool"`.

## 2. Tell the build where the key is

```bash
cp android/keystore.properties.example android/keystore.properties
```

Open `android/keystore.properties` and fill in the key's full path and password. This file is git-ignored, so the
password never goes to GitHub. Without it, a release build stops with "Release builds need android/keystore.properties".

## 3. Build the bundle

```bash
npm run android:release
```

The bundle is at `android/app/build/outputs/bundle/release/app-release.aab`. Upload it in Play Console → your app →
Test and release → (Internal / Closed testing or Production) → Create release.

Gradle 8.14 doesn't run on Java 25. If the build fails with "Unsupported class file major version 69", build with
JDK 21 (for example `export JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home`), or in Android
Studio set Settings → Build Tools → Gradle → Gradle JDK to a JDK 21.

## 4. Every new upload

Google Play needs a higher **versionCode** for each upload. In `android/app/build.gradle`:

```gradle
versionCode 2        // +1 for every upload, never reused
versionName "1.1"    // what users see
```

On iPhone the matching settings are Xcode → App target → General → Version (users see this) and Build (+1 for every
upload).

## Notes

- **Phones that have a debug build** (installed from this Mac or from GitHub): a release build is signed with a
  different key, so Android refuses to install it over the debug app. Save a backup file first (Config → Save File),
  uninstall, install the release build, then Restore File. People who install from Google Play never meet this.
- **Google sign-in** (`feature/subscriptions` branch): add the **App signing key** and **Upload key** SHA-1
  fingerprints from Play Console → Test and release → App integrity to the Android app in Firebase, or Google sign-in
  won't work in the Play version.
- **Subscriptions** (`feature/subscriptions` branch): release builds must use the RevenueCat `goog_` / `appl_` keys,
  never the Test Store `test_` key.
