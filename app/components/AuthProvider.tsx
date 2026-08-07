"use client";

/**
 * app/components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean-room Google-only Firebase Auth provider.
 *
 * Strategy:
 *  - Desktop  → signInWithPopup
 *  - Mobile browser → signInWithRedirect (popup is blocked on mobile Safari/Chrome)
 *  - On every page load → getRedirectResult() picks up any pending redirect result
 *  - onAuthStateChanged keeps user state in sync at all times
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
import { getOrCreateUserDoc, type EchoUser } from "@/lib/userDoc";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:             EchoUser     | null;
  firebaseUser:     FirebaseUser | null;
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
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Bootstrap: handle redirect result + listen to auth state ──────────────
  useEffect(() => {
    const auth = getFirebaseAuth();

    // Pick up any pending redirect sign-in result (mobile flow)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          // onAuthStateChanged below will handle setting user state
          console.log("[Auth] Redirect sign-in OK:", result.user.email);
        }
      })
      .catch((e: any) => {
        const code = String(e?.code ?? "");
        // Suppress benign "no pending redirect" errors
        if (!code.includes("no-current-user") && !code.includes("null-user")) {
          console.error("[Auth] getRedirectResult error:", e);
          setError("GOOGLE SIGN-IN FAILED. PLEASE TRY AGAIN.");
        }
      });

    // Subscribe to auth state — this is the single source of truth
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const echoUser = await getOrCreateUserDoc(fbUser);
          setUser(echoUser);
        } catch (e) {
          console.error("[Auth] getOrCreateUserDoc failed:", e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth     = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });

    if (isMobile()) {
      // Mobile browsers block popups — use redirect
      try {
        await signInWithRedirect(auth, provider);
      } catch (e: any) {
        setError(mapError(e?.code ?? e?.message ?? ""));
      }
      return;
    }

    // Desktop — use popup
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        // User dismissed — not an error
        return;
      }
      if (code === "auth/popup-blocked") {
        // Popup was blocked — fallback to redirect
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
      value={{ user, firebaseUser, isLoading, error, signInWithGoogle, signOut, clearError }}
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
  if (raw.includes("unauthorized-domain")) return "DOMAIN NOT AUTHORIZED — ADD IT IN FIREBASE CONSOLE → AUTH → AUTHORIZED DOMAINS.";
  if (raw.includes("network-request"))     return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  if (raw.includes("too-many-requests"))   return "TOO MANY ATTEMPTS — WAIT AND TRY AGAIN.";
  if (raw.includes("user-disabled"))       return "THIS ACCOUNT HAS BEEN DISABLED.";
  if (raw.includes("account-exists"))      return "ACCOUNT ALREADY EXISTS WITH A DIFFERENT METHOD.";
  return "SIGN-IN FAILED — PLEASE TRY AGAIN.";
}
