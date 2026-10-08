# Store Listing Text and Store Questionnaires

Ready-to-paste text for App Store Connect and the Google Play Console, plus the answers to the privacy and
content-rating questionnaires. Character limits are in brackets; every field below is within its limit.

## App name

**Thulir MicroGreen Tracker** (both stores). Under the icon on the phone's home screen the app is labelled **Thulir MGT**,
because the full name would be cut off there.

## Apple App Store

| Field | Text |
|---|---|
| Name [30] | Thulir MicroGreen Tracker |
| Subtitle [30] | Tray tracker for growers |
| Primary category | Productivity |
| Secondary category | Food & Drink |
| Promotional text [170] | Track every tray from sowing to harvest: auto-numbered batches, per-tray photos, harvest weights and yield reports. Free for 30 days. |
| Keywords [100] | microgreens,tray,grow,harvest,yield,seed,sprouts,farm,garden,crop,log,tracker,batch,hydroponic |
| Support URL | https://universepdkt.github.io/Microgreentracker/store/faq |
| Privacy Policy URL | https://universepdkt.github.io/Microgreentracker/store/privacy-policy |
| Copyright | 2026 Rajeshkumar |
| Age rating | 4+ (answer "None" to every content question) |

### Description [4000] (same text for Google Play's full description)

```
Thulir MicroGreen Tracker helps growers track every tray from sowing to harvest, so you always know what is growing, what needs attention and how much each crop really yields.

BATCHES AND TRAYS
• Sow a batch of many trays in one step: batch numbers (B001…) and tray numbers (T001…) are created for you and never reused
• Assign each tray to a rack or shelf position, picked automatically from the free ones
• Collapsible batch cards grouped by stage keep 50+ trays easy to scan
• Edit batches and trays at any time

FROM SOWING TO HARVEST
• Move batches through Sowing, Germination, Growing, Ready to Harvest and Completed
• Harvest countdown for every batch
• Log watering in ml, cups, liters or sprays, and add notes
• Record seed weight per tray

PHOTOS
• Photograph the whole batch or individual trays at each stage
• Gallery by stage and by tray, full-screen viewer with zoom, and side-by-side comparison

LOSSES
• Report lost trays with a reason (fungus, pests, physical damage and more), a date and a note
• See loss rates by reason and by crop

HARVEST AND REPORTS
• Weigh each tray at harvest and see the batch total in grams
• Yield per tray and seed-to-yield ratio
• Reports by crop and by month, crop performance, tray survival, watering and harvest timeline

CROPS
• 53 common microgreens in 10 categories, from brassicas and pulses to herbs and alliums
• Add your own crops and categories, and choose an icon for each category

YOUR DATA STAYS YOURS
• No account needed (signing in is optional); everything is stored on your phone
• Automatic daily copies on the device
• Save a single backup file (data and photos) to Google Drive, Files or email, and restore it on a new phone
• No ads, no tracking

FREE FOR 30 DAYS
Try everything free for 30 days. After that, Thulir MicroGreen Tracker Pro (monthly, yearly or a one-time lifetime purchase) is needed to start new batches; everything you've recorded stays available. Subscriptions renew automatically until cancelled in your Google Play or App Store account settings.

Terms of use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy policy: https://universepdkt.github.io/Microgreentracker/store/privacy-policy
```

### What's New (first release)

```
First release: batches with multiple trays, per-tray photos and harvest weights, lost-tray tracking, yield reports and backups.
```

## Google Play

| Field | Text |
|---|---|
| App name [30] | Thulir MicroGreen Tracker |
| Short description [80] | Track microgreen trays from sowing to harvest, with photos and yield reports. |
| Full description [4000] | Same as the App Store description above |
| App category | Productivity |
| Tags | Productivity, Gardening, Agriculture (pick the closest ones offered) |
| Email | thulirmicrogreentracker@gmail.com |
| Website | https://universepdkt.github.io/Microgreentracker/store/faq |
| Privacy policy | https://universepdkt.github.io/Microgreentracker/store/privacy-policy |

## Privacy questionnaires

Data that leaves the device:

- **RevenueCat** (purchases): the store's purchase information, with a random per-install ID, or the account ID, name
  and email when the user has signed in.
- **Firebase Authentication** (optional sign-in): name, email address and user ID.
- **Cloud Firestore** (one free trial per person): the trial start date under a SHA-256 hash of the device ID and,
  when signed in, of the email.

Growing data and photos never leave the device (except when the user shares a backup file or photo through the share
sheet, to a destination they pick).

These answers apply to a build with sign-in turned on (Firebase settings filled in; see docs/accounts.md). A build
without them collects only the purchase history, as before.

Check these answers against RevenueCat's own guidance before submitting, in case the SDK has changed:
[Apple App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy) and
[Google Play Data safety](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety).

### Apple: App Privacy ("nutrition label")

- **Do you or your third-party partners collect data from this app?** Yes.
- **Contact Info → Name** and **Email Address**: collected; used for **App Functionality** (and **Customer Support**);
  **linked** to the user's identity; not used for tracking.
- **Identifiers → User ID**: collected; **App Functionality**; **linked**; not used for tracking.
- **Identifiers → Device ID**: collected (as a one-way hash, for one free trial per device); **App Functionality**;
  **not linked**; not used for tracking.
- **Purchases → Purchase History**: collected; **App Functionality**; **linked** to the user's identity (when signed
  in); not used for tracking.
- No other data types. **Tracking:** No.
- Sign in with Apple: the iPhone app offers only email sign-in (Google sign-in is Android-only), so Apple's rule
  requiring Sign in with Apple alongside third-party logins does not apply. If Google sign-in is ever added on iPhone,
  add Sign in with Apple too.
- **Account deletion** (Apple guideline 5.1.1(v)): available in the app under Settings → Account → Delete account.

### Google Play: Data safety

- **Does your app collect or share any of the required user data types?** Yes (collected, not shared: RevenueCat is a
  service provider acting on the developer's behalf, which Play does not count as sharing).
- **Personal info → Name** and **Email address**: collected; not processed ephemerally; **optional** (users can
  choose not to sign in); purposes **App functionality** and **Account management**.
- **Personal info → User IDs**: collected; **optional**; **App functionality**, **Account management**.
- **Financial info → Purchase history**: collected; **processed ephemerally: No**; **required** (to use
  subscriptions); purpose **App functionality**.
- **Device or other IDs**: collected (a one-way hash of the device ID, used to allow one free trial per device);
  **required**; purposes **App functionality** and **Fraud prevention, security, and compliance**.
- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS).
- **Do you provide a way for users to request that their data is deleted?** Yes: in the app (Settings → Account →
  Delete account) or by email to the support address (see the privacy policy).
- **Account creation:** Yes, **username and password** and **OAuth** (Google). Account-deletion URL:
  https://universepdkt.github.io/Microgreentracker/store/delete-account
- **In-app purchases:** declare that the app contains in-app purchases (subscriptions and a one-time purchase).

### Google Play: other declarations

| Declaration | Answer |
|---|---|
| Ads | No, the app contains no ads |
| App access | All functionality is available without special access (sign-in is optional) |
| Target audience | 18 and over (avoids the Families programme requirements; the app is for growers) |
| News app | No |
| COVID-19 contact tracing / status | No |
| Government app | No |
| Financial features | None |
| Health | No |

### Content rating (IARC questionnaire, Google Play)

Category: **Utility, Productivity, Communication or Other**. Answer **No** to every question (violence, sexual
content, language, controlled substances, gambling, user interaction, sharing location), except **digital purchases:
Yes** (the Pro subscription). Expected rating: Everyone / PEGI 3 / 3+.
