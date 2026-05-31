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

The app intentionally does not support storing private third-party API keys in the browser anymore.

## Firestore Bootstrap

Cloud sync requires a signed-in Firebase user with a `users/{uid}` profile document that already has:

- `role: "admin"`
- `householdId: "<existing-household-id>"`

This first admin bootstrap is manual by design so the hosted app does not self-elevate privileges.

## Coolify Notes

- Deploy as a static Vite app.
- Build command: `npm run build`
- Output directory: `dist`
- Serve over HTTPS for Firebase Auth and PWA installability.
- If you use preview/staging domains, add them to Firebase Auth authorized domains.
