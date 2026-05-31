# Mom's Kitchen PWA

Mom's Kitchen is now scaffolded as a React + Vite + TypeScript PWA with a local-first migration bridge from the original single-file app.

## What Changed

- The original app was preserved in [`legacy/`](/Users/vineethnair/Vibe%20Code/AI%20SESH%20WEB%20APP/legacy).
- The active app now lives in [`src/`](/Users/vineethnair/Vibe%20Code/AI%20SESH%20WEB%20APP/src) with:
  - typed domain models
  - localStorage + IndexedDB adapters
  - React tabbed meal-planning UI
  - cookbook and pantry management
  - JSON export/import
  - full migration backup export including IndexedDB image blobs
  - Firebase Auth + Firestore scaffolding
  - Vite PWA build output for Coolify deployment

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Firebase Setup

Copy `.env.example` to `.env` and fill in the public Firebase client config:

```bash
cp .env.example .env
```

Required environment variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Firebase initialization is isolated in [`src/lib/firebase.ts`](/Users/vineethnair/Vibe%20Code/AI%20SESH%20WEB%20APP/src/lib/firebase.ts). The rest of the app remains local-first when these values are missing.

The app intentionally does not support storing private third-party API keys in the browser anymore. Only Firebase web app config belongs in Vite client env vars.

## Firebase Console Steps

1. Create or open your Firebase project in the Firebase console.
2. Add a Web app to the project and copy its config values into your local `.env`.
3. Enable Firebase Authentication and add the sign-in providers you plan to support later.
4. Add your local and deployed domains to Firebase Auth authorized domains.
5. Create a Firestore database in production or test mode, depending on your current rollout stage.
6. Apply the repo's Firestore rules and indexes when you are ready to validate cloud sync behavior.

## Firestore Bootstrap

Cloud sync requires a signed-in Firebase user with a `users/{uid}` profile document that already has:

- `role: "admin"`
- `householdId: "<existing-household-id>"`

This first admin bootstrap is manual by design so the hosted app does not self-elevate privileges.

## Local Testing

1. Run `npm install` if dependencies are not installed yet.
2. Leave `.env` empty or absent and run `npm run dev`.
3. Confirm `/dashboard` and other kitchen screens still work without Firebase.
4. Open `/login` and `/admin` and confirm they show a clear Firebase configuration message.
5. Add valid Firebase env vars to `.env` and rerun `npm run dev`.
6. Confirm those warnings disappear while the app still behaves as a local-first kitchen app.

## Coolify Notes

- Deploy as a static Vite app.
- Build command: `npm run build`
- Output directory: `dist`
- Serve over HTTPS for Firebase Auth and PWA installability.
- If you use preview/staging domains, add them to Firebase Auth authorized domains.
