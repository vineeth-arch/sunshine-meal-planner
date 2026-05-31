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
  - Vite PWA build output for static hosting deployment

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

## Cloudflare Pages Deployment

Deploy Mom's Kitchen to Cloudflare Pages as a static Vite app.

### Deployment Checklist

1. Push this repo to GitHub if it is not already there.
2. In Cloudflare, go to Workers & Pages and create a new Pages project.
3. Connect the GitHub repository for this app.
4. Use the repo root as the Root directory.
5. Set the build command to `npm run build`.
6. Set the build output directory to `dist`.
7. If Cloudflare asks for a framework preset, choose `Vite`. Manual settings are also fine.
8. Add these environment variables in the Pages project settings before the first production deploy:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
9. Deploy and note the assigned production URL in the form `https://<project>.pages.dev`.
10. After deploy, test `/`, `/login`, and a direct refresh on `/dashboard` to confirm SPA routing works.

### Cloudflare Pages Settings

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repo root
- Framework preset: `Vite` if selected, otherwise configure manually

The repo includes [`public/_redirects`](/Users/vineethnair/Vibe%20Code/AI%20SESH%20WEB%20APP/public/_redirects) with:

```text
/* /index.html 200
```

Cloudflare Pages already has default SPA behavior when no top-level `404.html` is present, but keeping this file makes client-side routing explicit and portable across static hosts.

### Firebase Settings Needed After Deployment

- Add the Cloudflare production domain `<project>.pages.dev` to Firebase Authentication authorized domains.
- If you plan to test auth flows on Cloudflare preview deployments, add the relevant preview domain(s) too.
- Keep using only Firebase web app config in Vite client env vars.
- Do not add any private AI key, server token, or third-party secret to Cloudflare Pages environment variables for this frontend app.

### Production Verification

After the first successful deploy:

1. Open the production `https://<project>.pages.dev` URL.
2. Confirm the app shell loads over HTTPS.
3. Open `/login` and confirm Firebase auth no longer reports an unauthorized domain after the Pages domain is added in Firebase.
4. Refresh `/dashboard` directly to confirm SPA routing resolves to the app instead of a 404.
