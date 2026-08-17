"use client";

/**
 * app/components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean-room Google-only Firebase Auth provider.
 *
 * WHY signInWithPopup everywhere (including mobile):
 *  signInWithRedirect is BROKEN on modern Android Chrome / Samsung Internet
 *  because storage partitioning (introduced in Chrome 115+) clears the
 *  sessionStorage that Firebase uses to track redirect state, causing the
 *  "Unable to process request due to missing initial state" error.
 *
 * Strategy:
 *  1. Use signInWithPopup on ALL platforms — works on both desktop and mobile
 *     when triggered by a direct user gesture (button tap/click).
 *  2. Only fall back to signInWithRedirect if the popup is explicitly blocked
 *     (auth/popup-blocked). This is rare on mobile because the popup IS
 *     allowed when opened synchronously from a click handler.
 *  3. getRedirectResult() still runs on boot to catch any rare redirect cases.
 *  4. onAuthStateChanged is the single source of truth for user state.
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
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<EchoUser     | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [settings,     setSettings]     = useState<UserSettings | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getFirebaseAuth();

    // Catch any lingering redirect result (fallback path only)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          console.log("[Auth] Redirect sign-in OK:", result.user.email);
          // onAuthStateChanged handles state update
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
          setSettings(echoUser.settings || { ...DEFAULT_SETTINGS });
          
          // Initialize RTDB presence with auto-disconnect
          initializePresence(fbUser.uid);

          // Initialize Chat engine with Auth UID
          try {
            await initializeChat(fbUser.uid, echoUser.handle || "@ANON");
            console.log("[Auth] Audio engine initialized");
          } catch (chatError) {
            console.error("[Auth] Audio engine init note:", chatError);
          }
        } catch (e) {
          console.error("[Auth] getOrCreateUserDoc failed:", e);
          setUser(null);
        }
      } else {
        setUser(null);
        setSettings(null);
        // Close Chat engine connection when user signs out
        await closeChat();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  // Uses popup on desktop and auto-fallback to redirect on mobile browsers / popup failures
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth     = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });

    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (e: any) {
        console.warn("[Auth] Mobile redirect sign-in error, trying popup:", e);
      }
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = String(e?.code ?? e?.message ?? "");
      console.warn("[Auth] Popup sign-in error:", code, e);

      if (
        code.includes("popup-closed-by-user") ||
        code.includes("cancelled-popup-request")
      ) {
        return; // User dismissed
      }

      // Fallback to redirect for mobile/popup restrictions
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
