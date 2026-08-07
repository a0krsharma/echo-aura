/**
 * lib/firebase.ts
 * ─────────────────────────────────────────────────────
 * Lazy Firebase singleton.
 *
 * initializeApp() is deferred to the first runtime call so
 * Next.js static-export builds succeed without real env vars.
 * Analytics is also lazy and guarded by typeof window so it
 * never runs server-side.
 *
 * Project: echo-aura
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return val;
  return val.replace(/[\r\n]/g, "").trim();
}

const firebaseConfig = {
  apiKey:            cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain:        cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId:         cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket:     cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId:             cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId:     cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

// ── App singleton ─────────────────────────────────────────────────
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// ── Auth ──────────────────────────────────────────────────────────
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

// ── Firestore ─────────────────────────────────────────────────────
export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

// ── Analytics ─────────────────────────────────────────────────────
// Safe to call anywhere — returns null during SSR or if unsupported.
let _analytics: Analytics | null = null;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (_analytics) return _analytics;
  const supported = await isSupported();
  if (!supported) return null;
  _analytics = getAnalytics(getFirebaseApp());
  return _analytics;
}

// ── Google Auth Provider (stateless — safe at module level) ───────
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");
