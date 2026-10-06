# Privacy Policy for Microgreen Manager

- **Effective date:** 6 October 2026
- **App:** Microgreen Manager (Android and iOS)
- **Developer:** Rajeshkumar
- **Contact:** thulirmicrogreentracker@gmail.com

Microgreen Manager is a tool for tracking microgreen batches and trays. It is designed so that your information
stays on your own device. This policy explains what the app stores, where it is kept, and the choices you have.

## Summary

- **Signing in is optional.** If you choose to sign in (with Google or with an email and password), we keep your name
  and email address so your subscription works on all your devices and we can support you. You can use the app
  without signing in, and you can delete your account at any time.
- **Everything you enter stays on your device**: your batches, trays, notes, watering records, harvest weights and
  photos.
- **No advertising, analytics or tracking.** The app contains no ad networks, analytics or tracking tools.
- **Subscriptions:** to check whether you have a subscription, the app contacts our subscription service, RevenueCat,
  using a random ID. Payments are handled by Google Play or the App Store. See "Subscriptions and purchases" below.
- **One free trial per person:** the app records when the free trial started, against a one-way fingerprint of the
  device (and of your email, if you sign in). See "Free trial" below.
- **You decide when data leaves your device**, for example when you save a backup file to Google Drive or email it.

## Information the app stores on your device

When you use the app, it saves the following in the app's private storage on your phone:

- Batches and trays you create: crop, dates, tray numbers and positions, growth stage, seed weight.
- Watering records, notes, lost-tray reports and harvest weights.
- Photos you take or choose in the app, saved as compressed copies with smaller preview images.
- Your settings: crop list, categories, loss reasons, number of tray positions and numbering.
- Automatic daily copies ("snapshots") of this data, kept on the device so you can go back to an earlier day.

This information is never sent to us, and we cannot see it.

## Subscriptions and purchases

The app is free for 30 days; after that, starting new batches needs a subscription (monthly or yearly) or a one-time
lifetime purchase. Everything you have already recorded stays available either way.

- **Payments** are made through Google Play or the App Store. We never see your card or payment details.
- **RevenueCat** (RevenueCat, Inc.) is the service the app uses to check and restore your purchases. When the app
  starts, and when you buy or restore, it sends RevenueCat:
  - a random identifier created for this installation of the app (not linked to your name, email or store account);
  - the purchase and subscription information from Google Play or the App Store (which product, when it was bought,
    when it renews or expires);
  - technical details needed for this: app version, operating system, device model, country and currency.
- RevenueCat processes this on our behalf only to provide the subscription; it is not used for advertising or
  tracking. RevenueCat's privacy policy: https://www.revenuecat.com/privacy
- None of your growing data (batches, trays, notes, photos, harvests) is sent to RevenueCat or to us.
- To cancel a subscription, use your Google Play or App Store account settings.

## Optional sign-in (account)

You can sign in from Config → Account or from the subscription screen. It is never required.

- **What we keep:** your name, your email address, whether the email is confirmed, how you sign in (Google or
  email and password), a user ID, and when the account was created and last used. If you sign in with Google, Google
  shares your name and email with us; we do not get your Google password or contacts.
- **Passwords** are handled by Google Firebase Authentication and are never visible to us.
- **Who processes it:** Google Firebase (Google LLC) provides the sign-in service on our behalf. Firebase's privacy
  information: https://firebase.google.com/support/privacy
- **Why:** to identify you as a customer, so that your Pro subscription follows you to every device (including
  between Android and iPhone), to allow one free trial per person, and to answer support requests.
- **Subscriptions and accounts:** when you are signed in with a confirmed email, your account ID, name and email are
  also shared with RevenueCat (see below), so your purchases are linked to your account instead of a random ID.
- Your growing data (batches, trays, notes, photos, harvests) is **not** uploaded when you sign in; it stays on your
  device.

## Free trial

To give each person one free trial, the app keeps the date your trial started in Google Firebase (Cloud Firestore),
stored under:

- a **one-way fingerprint (SHA-256 hash) of your device's ID**, made on your phone, and
- if you sign in with a confirmed email, a **one-way fingerprint of your email address**.

A fingerprint cannot be turned back into the device ID or email address. Each record holds only the trial start date.
These records are kept after you delete the app or your account, so that the free trial isn't started again; they
contain no name, email or other details.

## Permissions

- **Camera**: only used when you tap "Take photo" to photograph a tray. Photos are saved inside the app.
- **Photos / files**: only used when you choose to attach an existing photo or open a backup file. The app only
  reads the item you pick.

The app does not use your location, contacts, microphone or any other personal information.

## Backups and sharing

- **Backup file:** when you tap "Save File", the app creates a single file containing your data and photos and opens
  your device's share sheet. You choose where it goes (for example Google Drive, Files or email). That service's own
  privacy policy then applies to the copy you send.
- **Restoring:** when you tap "Restore File", the app reads only the file you select.
- **Device backups:** your phone's own backup service may include the app's data:
  - On Android, Google's automatic app backup may copy your batch data and daily snapshots (photos are excluded) to
    your Google account, if backup is turned on in your phone's settings.
  - On iPhone, iCloud Backup may include the app's data and photos, if iCloud Backup is turned on.
  These backups are handled by Google or Apple under their privacy policies and your account settings.

## Data retention and deletion

Your data stays on your device until you delete it. You can delete individual batches, notes and photos in the app.
Uninstalling the app removes all of its data from the device (copies in backup files or device backups that you
made remain until you delete them).

Because we do not hold your growing data, deleting the app is all you need to remove it.

**Deleting your account:** if you signed in, open Config → Account → Delete account. This deletes your sign-in
account (name, email and user ID) from Firebase straight away and removes your name and email from RevenueCat. Your
batches and photos on the phone are not affected, and a purchase stays with your Google Play or App Store account
(use Restore purchases). If you no longer have the app, email us from the address of your account and we will delete
it within 30 days. Details: https://universepdkt.github.io/Microgreentracker/store/delete-account

Purchase records kept by RevenueCat are needed for your subscription and for our tax and accounting duties; to have
them deleted as well, email us (we will ask RevenueCat to delete them). The trial fingerprints described under "Free
trial" are kept, as they do not identify you.

## Children

The app is a general-purpose growing tool and is not directed at children. It does not knowingly collect information
from children; the optional account is meant for adults running a growing business or hobby.

## Security

Your data is stored in the app's private storage, which other apps cannot read, and is protected by your device's
lock screen and encryption. Account details and trial records are sent over encrypted connections (HTTPS) and
protected by Firebase's access rules, so only you can read your account. Please keep your device and any backup files you make secure.

## Changes to this policy

If this policy changes, we will update the effective date above and publish the new version at this address. If a
future version of the app collects more data, the policy will explain it before that version is released.

## Contact

Questions about this policy or the app: thulirmicrogreentracker@gmail.com
