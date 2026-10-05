# Screenshots and Store Graphics

What to capture, the caption for each screenshot, and the sizes each store accepts. Sizes are the requirements as of
October 2026; App Store Connect and the Play Console show the current ones when you upload.

## Sizes

| Asset | Store | Size | How to get it |
|---|---|---|---|
| iPhone screenshots (required, 1–10) | App Store | **1320 × 2868** portrait (6.9" display) | iPhone 17 Pro Max simulator: File → Save Screen (or `xcrun simctl io booted screenshot file.png`) |
| iPad screenshots (only if iPad stays supported) | App Store | **2064 × 2752** portrait (13" display) | iPad Pro 13-inch simulator |
| App icon | App Store | 1024 × 1024, no transparency | Already in the Xcode project (from `assets/icon-only.png`) |
| Phone screenshots (2–8; 4+ recommended) | Google Play | **1080 × 1920** portrait recommended. Each side 320–3840 px and the long side at most **2× the short side** | Android emulator screenshot, then crop (see below) |
| App icon | Google Play | 512 × 512 PNG | `sips -Z 512 assets/icon-only.png --out play-icon-512.png` |
| Feature graphic (required) | Google Play | 1024 × 500 PNG or JPG, no transparency | Design it (see the brief below) |

**Android crop:** the Pixel emulator captures 1080 × 2400, which is more than 2:1 and is rejected by Play. Remove
the status bar (top 128 px) and the gesture bar at the bottom to get exactly 1080 × 2160, with ImageMagick (already
installed on this Mac):

```bash
magick shot.png -crop 1080x2160+0+128 +repage shot-play.png
```

(`sips` can't do this crop: it always trims equally from the top and bottom.)

## Preparing the app for screenshots

1. Use a fresh install (simulator or emulator) so your own data isn't shown.
2. Config → Tray Settings: set **Tray Positions** to about 60, so the app looks like a real farm.
3. Config → **Load Test Data (1 Month)**. It creates a month of batches in every stage, with lost trays, seed weights
   and harvest weights.
4. Add two or three photos to one growing batch (whole batch and one tray) so the photo screens have content.
5. Set the device clock bar to look tidy: on the iOS simulator run
   `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4`.

## Screenshots (in store order)

Each screenshot has a short **headline** to place above the phone image and an optional **sub-line**. Keep the
headline on one line (about 30 characters).

| # | Screen to capture | Headline | Sub-line |
|---|---|---|---|
| 1 | **Home**: stat tiles, "trays growing / lost" row and a few collapsed batches grouped by stage | Every tray at a glance | Batches grouped by stage, ready for 50+ trays |
| 2 | **New Batch**: crop chosen, 6 trays, tray IDs T0xx–T0xx and positions shown, seed per tray filled in | Sow a batch in seconds | Tray numbers and rack positions filled in for you |
| 3 | **Batch card opened**: stage badge, harvest countdown, tray chips with positions, Water / Photo / Note buttons | Track every tray | Positions, stages, watering and notes in one place |
| 4 | **Batch gallery** filtered to one tray, or **Compare** with two days side by side | Watch each tray grow | Photos by stage and by tray, compared day by day |
| 5 | **Harvest sheet**: weights entered for each tray and the total in grams | Weigh every tray at harvest | Yield per tray, recorded in seconds |
| 6 | **Reports → Harvested Weight**: total, per tray, seed-to-yield ratio and by-crop bars | Know your real yield | Grams per tray and seed-to-yield by crop |
| 7 | **Report lost trays** sheet with a reason selected, or **Reports → Tray Losses** | Learn why trays fail | Log losses by reason and spot patterns |
| 8 | **Config → Backup & Restore** | Your data stays on your phone | No account. Back up to Drive in one tap |

Screenshots 1, 2, 5 and 6 tell the story on their own; if you only make four, use those.

## Feature graphic brief (Google Play, 1024 × 500)

- Background: the app's emerald green (#059669) or a soft photo of microgreen trays.
- Left: the app icon and **Microgreen Manager** in white, bold.
- Below the name: **Track every tray, from seed to harvest.**
- Right: a phone frame showing screenshot 1 (home screen), slightly tilted.
- Keep important content away from the edges; Google may crop or overlay text on some surfaces.

## Optional: App Store preview video

15–30 seconds, 1320 × 2868 (or the size App Store Connect asks for): add a batch with several trays → mark a stage →
take a tray photo → harvest and weigh → open the harvest report. Record with
`xcrun simctl io booted recordVideo preview.mov`.
