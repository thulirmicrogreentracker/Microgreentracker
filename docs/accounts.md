# Optional sign-in and one free trial per person (Firebase)

This branch (`feature/subscriptions`) adds an optional customer account, so you can see who your customers are by name
and email, and limits the free trial to one per person. It uses **Google Firebase on the free Spark plan**: no card,
no monthly fee.

## How it works

- **Signing in is optional.** Config → Account, or "Sign in to use Pro on all your devices" on the subscription
  screen. The app works exactly the same without it.
- **Sign-in methods:**
  - **Google** (Android only, using the Google account already on the phone).
  - **Email and password** (Android and iPhone). New accounts get an email with a confirmation link; the account
    counts as confirmed after the link is tapped and the user taps "I've confirmed my email".
  - Google sign-in is not offered on iPhone, because Apple then requires "Sign in with Apple" as well.
- **Customers by name and email:** a confirmed account is linked to RevenueCat. The RevenueCat customer ID becomes the
  account's user ID, and the name and email are added to the customer. Pro then follows the customer to every device,
  including between Android and iPhone. Purchases made before signing in move to the account.
- **One free trial per person.** The trial start date is recorded once in Cloud Firestore, under:
  - `deviceTrials/{sha256(salt + device ID)}`: Android's device ID survives reinstalling the app.
  - `accountTrials/{sha256(email)}`: a confirmed email, so a new phone or a re-made account doesn't get a new trial.

  The app uses the earliest start it finds. Only these fingerprints and dates are stored, never an email or device
  ID. The security rules make each record write-once, with a date that can't be in the future.
- **Growing data is not uploaded.** Batches, photos and harvests stay on the phone, as before.
- **Deleting an account:** Config → Account → Delete account. This removes the Firebase account and the name and
  email in RevenueCat. Batches stay on the phone, and Pro stays with the store account (Restore purchases).

| Mode | When | What happens |
|---|---|---|
| Firebase | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` are set | Real sign-in and trial records |
| Off | Not set | No Account section; the trial is kept on the phone only (as before) |
| Test | `VITE_ACCOUNT_TEST_MODE=1` | Simulated sign-in on the phone, no emails. For trying the screens only |

Firebase is loaded only in Firebase mode, so other builds don't include its download or start-up cost.

Code:
- `src/account/`: settings, Firebase loader, account functions, `useAccount` hook, trial records, SHA-256.
- `src/components/AccountSheet.tsx`.
- The Account section in `ConfigPanel.tsx` and the sign-in line in `Paywall.tsx`.
- The trial sync effect in `App.tsx`.
- `linkCustomer`/`unlinkCustomer` in `src/subscription/purchases.ts`.
- `firebase/firestore.rules`.

## Setting it up (about 30 minutes)

### 1. Create the Firebase project

1. Go to https://console.firebase.google.com, sign in with the Google account you use for the app (for example
   thulirmicrogreentracker@gmail.com), and choose **Create a project**.
2. Name it, for example `microgreen-manager`. Google Analytics: **turn it off** (the privacy policy says there's no
   analytics).
3. The project starts on the free **Spark** plan. Leave it there; don't upgrade to Blaze.

### 2. Turn on sign-in

1. **Build → Authentication → Get started**.
2. **Sign-in method → Email/Password → Enable** (leave "Email link" off) → Save.
3. **Sign-in method → Add new provider → Google → Enable**.
   - Set the project's public name to "Microgreen Manager".
   - Set the support email to thulirmicrogreentracker@gmail.com.
   - Save.
   - Open the **Web SDK configuration** panel on the same page and copy the **Web client ID** (it ends in
     `.apps.googleusercontent.com`). This is `VITE_GOOGLE_WEB_CLIENT_ID`.
4. **Templates** tab: for "Email address verification" and "Password reset", set the sender name to "Microgreen
   Manager" and the reply-to address to your support email. Emails come from `noreply@<project>.firebaseapp.com`; ask
   new users to check spam.
5. **Settings → User actions:** keep "Email enumeration protection" on.

### 3. Create the database for trial records

1. **Build → Firestore Database → Create database**.
2. Choose the **Standard** edition and location **asia-south1 (Mumbai)**. The location can't be changed later.
3. Start in **production mode**.
4. Open the **Rules** tab, replace everything with the contents of [`firebase/firestore.rules`](../firebase/firestore.rules),
   and **Publish**.

### 4. Register the apps

**Web app (this gives the config the app uses):**

1. Project settings (gear icon) → **Your apps → Add app → Web** (</>).
2. Use the nickname "Microgreen Manager app". Don't turn on Hosting.
3. Copy `apiKey`, `authDomain`, `projectId` and `appId` into `.env.local`. These values are not secret: they identify
   the project, and the security rules protect the data.

**Android app (needed for Google sign-in):**

1. **Your apps → Add app → Android**, package name `com.universepdkt.microgreentracker`.
2. Add the **SHA-1** fingerprints of every key that signs the app. Under the Android app in Project settings → **Add
   fingerprint**:
   - Debug builds (Android Studio, `assembleDebug`):
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
     ```
   - Play Store builds: Play Console → your app → **Test and release → App integrity → App signing**. Add both the
     **App signing key** SHA-1 and the **Upload key** SHA-1.
3. You don't need to download `google-services.json`; the app doesn't use it. Adding the fingerprints is what lets
   Google sign-in work for that package.

Google sign-in that fails with "Developer error" or "No credentials available" almost always means a missing SHA-1
or the wrong web client ID.

### 5. Build with the settings

`.env.local` (git-ignored), next to the RevenueCat keys:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=microgreen-manager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=microgreen-manager
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
VITE_GOOGLE_WEB_CLIENT_ID=1234567890-xxxx.apps.googleusercontent.com
```

Then build as usual:

```bash
npm run build && npx cap sync
```

### 6. Test it

1. Config → Account → **Continue with email → Create an account**. Check that the email arrives, tap the link, then
   tap **I've confirmed my email**. The Account section shows the name, the email and "Verified".
2. Firebase → Authentication → **Users**: the account is listed. Firestore → Data: there's a `deviceTrials` record
   and, after confirming, an `accountTrials` record.
3. With RevenueCat set up, buy a plan in a sandbox or test account. RevenueCat → Customers → search for the email:
   the customer has the Firebase user ID, the name and the email.
4. Sign out, then on Android tap **Continue with Google**.
5. Uninstall, reinstall and sign in again: the trial carries on from the first start instead of restarting.
6. Delete account, then check that the user is gone from Firebase → Authentication.

## Finding a customer

- **By email or name:** Firebase → Authentication → Users lists every account, with email, sign-in method, created
  date and last sign-in. Search by email.
- **Their purchases:** RevenueCat → Customers → search by the email or by the Firebase **User UID**. This shows the
  plan, renewals, refunds and the store order IDs.
- Customers who never signed in are still anonymous in RevenueCat, so ask for their Google Play or App Store order ID,
  as before.

## Free-plan limits

The Spark plan easily covers a small app. Each app start does at most a few Firestore reads and writes. Spark gives
tens of thousands of reads and writes a day and 1 GB of storage, and email/password and Google sign-in are free.
Current limits are listed at https://firebase.google.com/pricing.

**Phone-number sign-in** (SMS codes) is not used, because sending SMS needs the paid Blaze plan.

## Store and privacy updates

These are already updated on this branch:

- `docs/store/privacy-policy.md`: optional account, Firebase, trial fingerprints, account deletion.
- `docs/store/faq.md`: Account questions.
- `docs/store/store-listing.md`: App Privacy and Data safety answers, the account-deletion URL.
- `docs/store/delete-account.md`: the page for Play's "Delete account URL".

GitHub Pages publishes from `main`, so the delete-account page goes live only when this branch is merged. Merge
before you submit a build with sign-in.
