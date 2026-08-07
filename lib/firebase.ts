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
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // KEY FIX: Use vercel.app as authDomain so Google OAuth signs into the SAME
  // origin as the app. Using firebaseapp.com causes mobile browsers to block
  // the auth token (cross-origin storage partitioning / ITP).
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ── App singleton ───────────────────────────────────────────────────
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// ── Auth singleton with explicit local persistence ────────────────────────
let _auth: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  // Ensure tokens survive page reloads and cross-domain redirects on mobile
  setPersistence(_auth, browserLocalPersistence).catch((e) =>
    console.warn("[Firebase] setPersistence failed:", e)
  );
  return _auth;
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
