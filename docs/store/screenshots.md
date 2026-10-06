# Screenshots and Store Graphics

The finished store images are in [`screenshots/`](screenshots/). This page lists what is there, the captions, the
sizes each store accepts, and how to make them again after the app changes. Sizes are the requirements as of
October 2026; App Store Connect and the Play Console show the current ones when you upload.

## Ready to upload

| Folder / file | Use it for | Size |
|---|---|---|
| `screenshots/ios-store/01…08.jpg` | **App Store** iPhone screenshots (captioned) | 1320 × 2868 |
| `screenshots/android-store/01…08.jpg` | **Google Play** phone screenshots (captioned) | 1080 × 1920 (9:16) |
| `screenshots/feature-graphic-1024x500.jpg` | **Google Play** feature graphic (required) | 1024 × 500 |
| `screenshots/play-icon-512.png` | **Google Play** app icon | 512 × 512 |
| `screenshots/ios/`, `screenshots/android/` | The same screens without captions, if you prefer plain screenshots or want to design your own frames | as above |

The App Store icon (1024 × 1024) is already in the Xcode project. The iOS app is iPhone-only, so no iPad screenshots
are needed.

## The screenshots (in store order)

| # | Screen | Headline | Sub-line |
|---|---|---|---|
| 1 | Home: stat tiles, trays growing / lost, batches grouped by stage | Every tray at a glance | Batches grouped by stage, ready for 50+ trays |
| 2 | New Batch: Broccoli, 6 trays, tray IDs and positions, seed per tray | Sow a batch in seconds | Tray numbers and rack positions filled in for you |
| 3 | Batch card opened: stage, harvest countdown, tray chips, actions | Track every tray | Positions, stages, watering and notes in one place |
| 4 | Config → Crop Categories with their icons | 53 microgreens built in | Add your own crops and categories, each with an icon |
| 5 | Harvest sheet: a weight for each tray and the total | Weigh every tray at harvest | Yield per tray, recorded in seconds |
| 6 | Reports → Harvested Weight: total, per tray, seed-to-yield, by crop and month | Know your real yield | Grams per tray and seed-to-yield by crop |
| 7 | Report lost trays: one tray and a reason selected | Learn why trays fail | Log losses by reason and spot patterns |
| 8 | Config → Backup & Restore | Your data stays on your phone | No account. Back up to Drive in one tap |

If you only upload four, use 1, 2, 5 and 6.

**Still to add: a photo screenshot.** A screenshot of the batch gallery or Compare screen needs real photos of
microgreen trays (the simulator has no camera, and stock photos of something else would misrepresent the app). Take a
few tray photos in the app on your phone, then capture the gallery with headline **Watch each tray grow** and sub-line
**Photos by stage and by tray, compared day by day**, and add it as screenshot 4 (moving the categories one later).

## Sizes the stores accept

| Asset | Store | Size |
|---|---|---|
| iPhone screenshots (1–10) | App Store | 1320 × 2868 portrait (6.9" display); smaller iPhones are scaled from it |
| Phone screenshots (2–8; 4+ recommended) | Google Play | PNG or JPEG up to 8 MB, **9:16 or 16:9**, each side 320–3840 px (Play Console's rule as of October 2026; earlier it allowed up to 2:1). The captioned images are 1080 × 1920; the plain captures in `screenshots/android/` are 1080 × 2160 and go inside them |
| Feature graphic | Google Play | 1024 × 500 PNG or JPG, no transparency |
| App icon | Google Play | 512 × 512 PNG |

## Making them again

The tools are in [`screenshots/tools/`](screenshots/tools/).

1. **Sample data.** `python3 make-sample-data.py` writes `data-sample.json`: 17 batches and 91 trays on 60 positions,
   with harvests in the last two months, lost trays and seed weights (dates are relative to the day you run it).
   Copy it into a test install as the app's data file, with the app stopped:
   - iOS simulator: `cp data-sample.json "$(xcrun simctl get_app_container booted com.universepdkt.microgreentracker data)/Documents/microgreen/data-b.json"`
     and delete `data-a.json` next to it.
   - Android emulator: `adb push data-sample.json /data/local/tmp/` then
     `adb shell run-as com.universepdkt.microgreentracker sh -c 'cp /data/local/tmp/data-sample.json files/microgreen/data-b.json; rm -f files/microgreen/data-a.json'`.
     Back up the emulator's own data first if you want to keep it.
   (Config → Load Test Data also works, but only in development builds, `npm run dev`; store builds don't show it.)
2. **Devices.**
   - iPhone: the **iPhone 17 Pro Max** simulator gives exactly 1320 × 2868. Tidy the status bar with
     `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --batteryState discharging --cellularBars 4 --wifiBars 3`,
     then capture with `xcrun simctl io booted screenshot 01-home.png`.
   - Android: make the emulator draw at Play's 2:1 shape with `adb shell wm size 1080x2160` (undo with
     `adb shell wm size reset`). Tidy the status bar with Android's demo mode
     (`adb shell settings put global sysui_demo_allowed 1`, then `am broadcast -a com.android.systemui.demo -e command
     clock -e hhmm 0941` and similar), and capture with `adb exec-out screencap -p > 01-home.png`.
3. **Captions.** `compose.sh` places a screenshot on the green background with its headline and sub-line (from
   `captions.txt`), using ImageMagick:
   ```bash
   ./compose.sh ../ios/01-home.png ../ios-store/01-home.jpg 1320 2868 1060 "Every tray at a glance" "Batches grouped by stage, ready for 50+ trays"
   ./compose.sh ../android/01-home.png ../android-store/01-home.jpg 1080 1920 740 "Every tray at a glance" "Batches grouped by stage, ready for 50+ trays"
   ```

4. **Feature graphic** (Google Play, 1024 × 500), from the app icon and the plain Android home screen, run from the
   project folder:
   ```bash
   S=docs/store/screenshots; BOLD="/System/Library/Fonts/Supplemental/Arial Bold.ttf"; REG="/System/Library/Fonts/Supplemental/Arial.ttf"; T=$(mktemp -d)
   magick assets/icon-only.png -resize 120x120 \( -size 120x120 xc:none -fill white -draw "roundrectangle 0,0 119,119 28,28" \) -compose DstIn -composite $T/icon.png
   magick $S/android/01-home.png -resize x470 \( -size 235x470 xc:none -fill white -draw "roundrectangle 0,0 234,469 20,20" \) -compose DstIn -composite $T/phone.png
   magick $T/phone.png -background none -rotate -7 \( +clone -background '#00000070' -shadow 50x12+0+10 \) +swap -background none -layers merge +repage $T/phone-r.png
   magick -size 1024x500 gradient:'#10b981-#065f46' $T/icon.png -gravity northwest -geometry +64+56 -composite \
     -font "$BOLD" -pointsize 50 -fill white -annotate +64+200 "Thulir" -annotate +64+258 "MicroGreen Tracker" \
     -font "$REG" -pointsize 28 -fill '#d1fae5' -annotate +66+340 "Track every tray, from seed to harvest." \
     $T/phone-r.png -gravity northeast -geometry +36+44 -composite -flatten -quality 92 $S/feature-graphic-1024x500.jpg
   ```

Use a US-English device region (Settings → General → Language & Region on the simulator, or
`xcrun simctl spawn booted defaults write -g AppleLocale en_US`) so dates read month/day as in the other screenshots.

## Optional: App Store preview video

15–30 seconds at 1320 × 2868: add a batch with several trays → mark a stage → take a tray photo → harvest and weigh →
open the harvest report. Record with `xcrun simctl io booted recordVideo preview.mov`.
