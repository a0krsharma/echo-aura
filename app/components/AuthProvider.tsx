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
import { getFirebaseAuth } from "@/lib/firebase";
import { getOrCreateUserDoc, type EchoUser, type UserSettings, DEFAULT_SETTINGS } from "@/lib/userDoc";
import { initializeChat, closeChat } from "@/lib/agoraChat";

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
          
          // Initialize Chat engine with Auth UID
          try {
            await initializeChat(fbUser.uid, echoUser.handle || "@ANON");
            console.log("[Auth] Audio engine initialized");
          } catch (chatError) {
            console.error("[Auth] Audio engine init note:", chatError);
            // Don't block auth if Chat fails
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
  // Always try popup first — it works on mobile when called directly from a
  // user click. Only fall back to redirect if the popup is actually blocked.
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth     = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will fire and set the user
    } catch (e: any) {
      const code = String(e?.code ?? "");

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return; // User dismissed — silent
      }

      if (code === "auth/popup-blocked") {
        // Rare case: browser blocked the popup (e.g. aggressive ad blocker)
        // Fall back to redirect as last resort
        try {
          await signInWithRedirect(auth, provider);
        } catch (re: any) {
          setError(mapError(re?.code ?? re?.message ?? ""));
        }
        return;
      }

      setError(mapError(code || e?.message || ""));
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
  if (raw.includes("unauthorized-domain")) return "DOMAIN NOT AUTHORIZED — ADD IT IN AUTH CONSOLE → AUTHORIZED DOMAINS.";
  if (raw.includes("network-request"))     return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  if (raw.includes("too-many-requests"))   return "TOO MANY ATTEMPTS — WAIT AND TRY AGAIN.";
  if (raw.includes("user-disabled"))       return "THIS ACCOUNT HAS BEEN DISABLED.";
  if (raw.includes("account-exists"))      return "ACCOUNT ALREADY EXISTS WITH A DIFFERENT METHOD.";
  return "SIGN-IN FAILED — PLEASE TRY AGAIN.";
}
