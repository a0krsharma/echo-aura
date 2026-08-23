"use client";

/**
 * app/components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-Latency Auth Provider with Instant Local Storage Pre-Hydration.
 *
 * Performance Optimizations:
 * 1. Synchronous Cache Read: Reads cached user & settings from localStorage on line 1,
 *    eliminating cold-start delay and rendering the app in 0ms!
 * 2. Silent Background Token Revalidation: onAuthStateChanged validates in the background
 *    without locking the UI in loading skeletons.
 * 3. Mobile & WebView Fast Google Sign-In: Optimized popup + redirect fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getOrCreateUserDoc, type EchoUser, type UserSettings, DEFAULT_SETTINGS } from "@/lib/userDoc";
import { initializeChat, closeChat } from "@/lib/agoraChat";
import { initializePresence } from "@/lib/presence";

// ─── Context ─────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:             EchoUser     | null;
  firebaseUser:     FirebaseUser | null;
  settings:         UserSettings | null;
  isLoading:        boolean;
  error:            string       | null;
  signInWithGoogle: ()           => Promise<void>;
  signOut:          ()           => Promise<void>;
  clearError:       ()           => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_CACHE_KEY = "echo_cached_user";
const SETTINGS_CACHE_KEY = "echo_cached_settings";

function getCachedUser(): EchoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCachedSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ⚡ Synchronously initialize from cache for 0ms Instant Cold-Start
  const [user, setUser] = useState<EchoUser | null>(() => getCachedUser());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(() => getCachedSettings());
  const [isLoading, setIsLoading] = useState<boolean>(() => !getCachedUser());
  const [error, setError] = useState<string | null>(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getFirebaseAuth();

    // Catch any redirect result on mobile
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          console.log("[Auth] Redirect sign-in success:", result.user.email);
        }
      })
      .catch((e: any) => {
        const code = String(e?.code ?? "");
        if (!code.includes("no-current-user") && !code.includes("null-user")) {
          console.error("[Auth] getRedirectResult error:", e);
        }
      });

    // Single source of truth for auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const echoUser = await getOrCreateUserDoc(fbUser);
          setUser(echoUser);
          const userSettings = echoUser.settings || { ...DEFAULT_SETTINGS };
          setSettings(userSettings);

          // Save to local cache for instant future loads
          try {
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(echoUser));
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(userSettings));
          } catch {}

          // Initialize presence & audio engine
          initializePresence(fbUser.uid);
          try {
            await initializeChat(fbUser.uid, echoUser.handle || "@ANON");
          } catch (chatError) {
            console.error("[Auth] Audio engine init note:", chatError);
          }
        } catch (e) {
          console.error("[Auth] getOrCreateUserDoc failed:", e);
          // Keep cached user if offline/temporary error
          if (!getCachedUser()) setUser(null);
        }
      } else {
        setUser(null);
        setSettings(null);
        try {
          localStorage.removeItem(USER_CACHE_KEY);
          localStorage.removeItem(SETTINGS_CACHE_KEY);
        } catch {}
        await closeChat();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Fast Google Sign-In ───────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = String(e?.code ?? e?.message ?? "");
      console.warn("[Auth] Popup sign-in note:", code, e);

      if (
        code.includes("popup-closed-by-user") ||
        code.includes("cancelled-popup-request")
      ) {
        return; // User dismissed window
      }

      // Automatically fall back to redirect if popup is blocked or in Android WebView
      try {
        await signInWithRedirect(auth, provider);
      } catch (re: any) {
        const reCode = String(re?.code ?? re?.message ?? "");
        console.error("[Auth] Redirect fallback error:", reCode, re);
        setError(mapError(reCode || code));
      }
    }
  }, []);

  // ── Sign-Out ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setError(null);
    try {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(SETTINGS_CACHE_KEY);
    } catch {}
    setUser(null);
    setSettings(null);
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, settings, isLoading, error, signInWithGoogle, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Error messages ───────────────────────────────────────────────────────────
function mapError(raw: string): string {
  const code = String(raw).toLowerCase();
  if (code.includes("unauthorized-domain")) return "DOMAIN NOT AUTHORIZED — ADD DOMAIN TO FIREBASE CONSOLE → AUTH → AUTHORIZED DOMAINS.";
  if (code.includes("network-request"))     return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  if (code.includes("too-many-requests"))   return "TOO MANY ATTEMPTS — WAIT AND TRY AGAIN.";
  if (code.includes("user-disabled"))       return "THIS ACCOUNT HAS BEEN DISABLED.";
  if (code.includes("account-exists"))      return "ACCOUNT ALREADY EXISTS WITH A DIFFERENT METHOD.";
  if (code.includes("disallowed_useragent") || code.includes("disallowed-useragent")) return "IN-APP BROWSER RESTRICTED — OPEN IN BROWSER (CHROME / SAFARI).";
  if (code.includes("web-storage-unsupported")) return "COOKIES / STORAGE DISABLED IN BROWSER SETTINGS.";
  return `SIGN-IN FAILED (${raw || "UNKNOWN ERROR"}) — PLEASE TRY AGAIN.`;
}
