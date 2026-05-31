import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase web config is safe to expose in the browser.
// Do not put non-Firebase AI or third-party API secrets in Vite client env vars.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const

const requiredFirebaseConfig = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
] as const

let cachedApp: FirebaseApp | null = null

export function hasFirebaseConfig(): boolean {
  return requiredFirebaseConfig.every(([, value]) => Boolean(value))
}

export function getFirebaseConfigError(): string | null {
  const missingKeys = requiredFirebaseConfig
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (!missingKeys.length) return null

  return `Firebase is not configured for this app yet. Add the missing Vite variables to your local .env file: ${missingKeys.join(', ')}.`
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) return null
  if (!cachedApp) cachedApp = initializeApp(firebaseConfig)
  return cachedApp
}

export function getFirebaseServices() {
  const app = getFirebaseApp()
  if (!app) return null

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  }
}
