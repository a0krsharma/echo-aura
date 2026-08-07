"use client";

/**
 * components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────
 * Firebase Authentication context for Echo.
 *
 * Android/Capacitor fix:
 * - Uses signInWithPopup on BOTH web and native.
 * - On Capacitor, signInWithPopup opens a system-style popup within the
 *   WebView context — works fine with Capacitor's WebView bridge.
 * - signInWithRedirect was causing users to leave the app entirely.
 * - getRedirectResult is still checked on mount as a safety net for any
 *   pending redirect sessions.
 *
 * The key insight: Capacitor WebView on modern Android (API 24+) fully
 * supports window.open() which is what Firebase uses for popup auth.
 * The popup stays within the app's WebView context, not external browser.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, getFirebaseAnalytics } from "@/lib/firebase";
import { getOrCreateUserDoc, type EchoUser } from "@/lib/userDoc";

// ─── Detect Capacitor / native WebView ───────────────────────────────────────
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNative;
}

// ─── Context shape ───────────────────────────────────────────────────────────
interface AuthContextValue {
  user:            EchoUser     | null;
  firebaseUser:    FirebaseUser | null;
  isLoading:       boolean;
  error:           string       | null;
  signInWithGoogle:   ()                            => Promise<void>;
  signInWithEmail:    (email: string, pass: string) => Promise<void>;
  signUpWithEmail:    (email: string, pass: string) => Promise<void>;
  signOut:            ()                            => Promise<void>;
  clearError:         ()                            => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<EchoUser     | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Sync Firebase Auth state → Firestore user doc ──────────────────────────
  useEffect(() => {
    getFirebaseAnalytics().catch(() => {});

    const auth = getFirebaseAuth();

    // Safety net: check for any pending redirect result on app resume/load.
    // This handles the edge case where a previous signInWithRedirect completed.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // onAuthStateChanged will pick this up automatically
          console.log("[Auth] Redirect result resolved:", result.user.email);
        }
      })
      .catch((e) => {
        // "no-auth-event" is normal when there's no pending redirect
        if (!e.message?.includes("no-auth-event") && !e.message?.includes("No pending")) {
          console.warn("[Auth] redirect result check:", e.message);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const echoUser = await getOrCreateUserDoc(fbUser);
          setUser(echoUser);
        } catch (e) {
          console.error("[AuthProvider] getOrCreateUserDoc failed:", e);
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
  // Uses signInWithPopup on BOTH web and native Capacitor.
  // This keeps Google auth within the app on Android (no external browser).
  // Firebase's popup on Capacitor WebView uses an in-app modal, not system Chrome.
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();

    try {
      // Configure popup for better Capacitor compatibility
      googleProvider.setCustomParameters({
        prompt: "select_account",
      });

      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will fire automatically
    } catch (e: any) {
      const code = e?.code || "";
      const msg = e?.message || "";

      // Popup was blocked by browser/WebView — this can happen in some WebViews
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        // On Capacitor with very restricted WebView, show helpful error
        if (isCapacitorNative()) {
          setError("GOOGLE SIGN-IN REQUIRES INTERNET CONNECTION AND WEBVIEW SUPPORT.");
        } else {
          setError("POPUP BLOCKED — PLEASE ALLOW POPUPS FOR THIS SITE.");
        }
        return;
      }

      // User closed the popup — not really an error
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("SIGN-IN CANCELLED.");
        return;
      }

      // Domain not authorized in Firebase console
      if (code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
        setError("DOMAIN NOT AUTHORIZED. ADD IT IN FIREBASE CONSOLE → AUTH → AUTHORIZED DOMAINS.");
        return;
      }

      setError(mapFirebaseError(msg || code));
      throw e;
    }
  }, []);

  // ── Email Sign-In ───────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, pass);
    } catch (e: any) {
      setError(mapFirebaseError(e?.message || "Sign-in failed"));
      throw e;
    }
  }, []);

  // ── Email Sign-Up ───────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, pass);
    } catch (e: any) {
      setError(mapFirebaseError(e?.message || "Sign-up failed"));
      throw e;
    }
  }, []);

  // ── Sign-Out ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setError(null);
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  // ── Clear Error ─────────────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function mapFirebaseError(msg: string): string {
  if (msg.includes("user-not-found"))       return "NO ACCOUNT FOUND WITH THAT EMAIL.";
  if (msg.includes("wrong-password"))       return "INCORRECT PASSWORD.";
  if (msg.includes("invalid-credential"))   return "WRONG EMAIL OR PASSWORD.";
  if (msg.includes("email-already"))        return "EMAIL ALREADY IN USE.";
  if (msg.includes("weak-password"))        return "PASSWORD TOO WEAK — MIN 6 CHARACTERS.";
  if (msg.includes("invalid-email"))        return "INVALID EMAIL ADDRESS.";
  if (msg.includes("popup-closed"))         return "SIGN-IN CANCELLED.";
  if (msg.includes("network-request"))      return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  if (msg.includes("unauthorized-domain"))  return "DOMAIN NOT AUTHORIZED IN FIREBASE CONSOLE.";
  if (msg.includes("too-many-requests"))    return "TOO MANY ATTEMPTS — WAIT AND TRY AGAIN.";
  return "AUTH ERROR — TRY AGAIN.";
}
