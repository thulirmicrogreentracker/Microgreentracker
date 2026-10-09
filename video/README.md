# Promo videos

Short videos that show what Thulir MicroGreen Tracker does, in English and Tamil, with a free text-to-speech voice and
captions. Made with [Remotion](https://www.remotion.dev) (videos written in React).

| File (in `out/`) | Size | Use it for |
|---|---|---|
| `thulir-en-vertical.mp4`, `thulir-ta-vertical.mp4` | 1080 × 1920 | Instagram Reels, YouTube Shorts, WhatsApp status |
| `thulir-en-landscape.mp4`, `thulir-ta-landscape.mp4` | 1920 × 1080 | YouTube, the Play Store listing's video |
| `thumbnail-en.jpg`, `thumbnail-ta.jpg` | 1280 × 720 | YouTube thumbnail |

`out/` is not in git; make the files again with the steps below.

## Making them again

Needs Node and Python 3.

```bash
cd video
npm install
python3 -m venv .venv && .venv/bin/pip install edge-tts
```

1. **Words:** edit `script.json`. Each scene has a title (shown large) and what the voice says (also shown as the
   caption), in English (`en`) and Tamil (`ta`).
2. **Voice:** `npm run voice` makes one MP3 per scene in `public/voice/`, using Microsoft's free neural voices through
   [edge-tts](https://github.com/rany2/edge-tts) (`en-IN-NeerjaNeural`, `ta-IN-PallaviNeural`; change them in
   `script.json`). It needs an internet connection.
3. **App clips:** `public/clips/*.mp4` are screen recordings from the Android emulator (1080 × 2400), made with the
   screenshot sample data (see `docs/store/screenshots.md`) and Android's demo status bar:
   `adb shell screenrecord /sdcard/home.mp4`, then `adb pull`.
4. **Timing:** `.venv/bin/python measure.py` after changing clips or voice. Each scene lasts as long as its narration
   plus a second, and its clip is sped up (at most 1.8×) or slowed down to fit.
5. **Preview:** `npm run studio` opens Remotion Studio in the browser.
6. **Render:** `npm run render` writes the four videos to `out/`.

## Uploading

### YouTube (landscape video, and the vertical one as a Short)

**Title (English):** Thulir MicroGreen Tracker – track every microgreen tray, from seed to harvest

**Title (Tamil):** துளிர் மைக்ரோகிரீன் டிராக்கர் – விதை முதல் அறுவடை வரை ஒவ்வொரு டிரேயையும் கண்காணியுங்கள்

**Description (English):**

```
Thulir MicroGreen Tracker is a free app for microgreen growers. Track every tray from sowing to harvest:

• Your whole farm at a glance, with today's care tasks
• Start a batch of many trays in seconds; tray numbers and rack spots are filled in for you
• See your racks shelf by shelf, with every tray's batch and stage
• Weigh every tray at harvest and see your real yield by crop
• PDF and CSV reports
• Your data stays on your phone – no account needed; back up to Google Drive any time

Coming soon to Google Play.
Questions or feedback: thulirmicrogreentracker@gmail.com

#microgreens #microgreensfarming #urbanfarming #indoorfarming #hydroponics #farmingapp #growyourown
```

**Description (Tamil):**

```
துளிர் மைக்ரோகிரீன் டிராக்கர் – மைக்ரோகிரீன் வளர்ப்பவர்களுக்கான இலவச ஆப். விதைப்பு முதல் அறுவடை வரை ஒவ்வொரு டிரேயையும் கண்காணியுங்கள்:

• உங்கள் பண்ணை முழுவதும் ஒரே பார்வையில், இன்று செய்ய வேண்டிய வேலைகளுடன்
• சில நொடிகளில் புதிய பேட்ச்; டிரே எண்களும் ரேக் இடங்களும் தானாக நிரப்பப்படும்
• ரேக்குகளை ஷெல்ஃப் வாரியாகப் பாருங்கள்
• அறுவடையில் ஒவ்வொரு டிரேயையும் எடை போட்டு உண்மையான விளைச்சலை அறியுங்கள்
• PDF, CSV அறிக்கைகள்
• உங்கள் தகவல் உங்கள் போனிலேயே – கணக்கு தேவையில்லை; Google Drive-ல் பேக்கப்

விரைவில் Google Play-ல்.
கேள்விகள்: thulirmicrogreentracker@gmail.com

#microgreens #மைக்ரோகிரீன் #மாடித்தோட்டம் #இயற்கைவிவசாயம் #urbanfarming #farmingapp
```

- Upload the landscape video normally, with `thumbnail-*.jpg` as the thumbnail. Add the vertical one as a Short (YouTube
  treats vertical videos up to 3 minutes as Shorts).
- Audience: "No, it's not made for kids".
- After the English landscape video is public or unlisted, paste its link into Play Console → Store listings → Video, so
  it plays at the top of the Play Store listing.

### Instagram (vertical video as a Reel)

Use the same description as YouTube, shortened if you like; the hashtags matter more on Instagram. Pick a cover frame
that shows the app (for example the rack view). Add the Play Store link to your profile once the app is public.

## Notes

- The narration uses Microsoft's free online voices through edge-tts. They're fine for promotional videos, but check
  Microsoft's terms if the app becomes a big commercial business; you can switch to your own recorded voice by
  replacing the MP3 files in `public/voice/` (same names) and running `measure.py`.
- There's no background music. To add some, use a track from the YouTube Audio Library (free for YouTube and Instagram),
  put it in `public/` and add an `<Audio>` with a low volume in `src/Promo.tsx`.
- When the app is live, change "Coming soon to Google Play" in `script.json` (`playLine` and the `outro` scene) and
  render again.
