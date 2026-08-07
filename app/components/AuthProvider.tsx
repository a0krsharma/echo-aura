"use client";

/**
 * components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Auth with NATIVE Google Sign-In on Android.
 *
 * HOW IT WORKS:
 * ─────────────────────────────────────────────────────────────────────────────
 * ON ANDROID (Capacitor native):
 *   Uses @codetrix-studio/capacitor-google-auth which calls the native
 *   Android Google Sign-In SDK. This shows the NATIVE "Choose Account"
 *   bottom sheet with accounts already saved on the device — no web form,
 *   no external browser, one tap to select an account.
 *
 *   Flow:
 *   1. GoogleAuth.signIn() → native picker → returns { authentication.idToken }
 *   2. Build GoogleAuthProvider.credential(idToken)
 *   3. signInWithCredential(auth, credential) → Firebase user
 *
 * ON WEB:
 *   Uses standard Firebase signInWithPopup — opens Google OAuth popup.
 *
 * ─────────────────────────────────────────────────────────────────────────────
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
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, getFirebaseAnalytics } from "@/lib/firebase";
import { getOrCreateUserDoc, type EchoUser } from "@/lib/userDoc";

// ─── Detect Capacitor native ──────────────────────────────────────────────────
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// ─── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:             EchoUser     | null;
  firebaseUser:     FirebaseUser | null;
  isLoading:        boolean;
  error:            string       | null;
  signInWithGoogle: ()                            => Promise<void>;
  signInWithEmail:  (email: string, pass: string) => Promise<void>;
  signUpWithEmail:  (email: string, pass: string) => Promise<void>;
  signOut:          ()                            => Promise<void>;
  clearError:       ()                            => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<EchoUser     | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Sync Firebase Auth state → Firestore user doc ──────────────────────────
  useEffect(() => {
    getFirebaseAnalytics().catch(() => {});
    const auth = getFirebaseAuth();

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
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();

    // ── ANDROID NATIVE OR WEB ────────────────────────────────────────────────
    if (isCapacitorNative()) {
      try {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

        await GoogleAuth.initialize({
          clientId: "29569599076-pgr9nrm95l4n9f6ot3s71qdk3l2e0qiu.apps.googleusercontent.com",
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          return;
        }
      } catch (e: any) {
        console.warn("[Auth] Native Google Auth failed, falling back to popup:", e);
      }
    }

    // ── WEB & FALLBACK: Firebase Popup ───────────────────────────────────────
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      const code = e?.code || "";
      const msg  = e?.message || "";

      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("SIGN-IN CANCELLED.");
        return;
      }
      if (code === "auth/popup-blocked") {
        setError("POPUP BLOCKED — ALLOW POPUPS FOR THIS SITE.");
        return;
      }
      if (code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
        setError("DOMAIN NOT AUTHORIZED — ADD IT IN FIREBASE CONSOLE → AUTH → AUTHORIZED DOMAINS.");
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
    // Also sign out from native Google on Android
    if (isCapacitorNative()) {
      try {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        await GoogleAuth.signOut();
      } catch {}
    }
    await firebaseSignOut(getFirebaseAuth());
  }, []);

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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Error mapper ─────────────────────────────────────────────────────────────
function mapFirebaseError(msg: string): string {
  if (msg.includes("user-not-found"))      return "NO ACCOUNT FOUND WITH THAT EMAIL.";
  if (msg.includes("wrong-password"))      return "INCORRECT PASSWORD.";
  if (msg.includes("invalid-credential"))  return "WRONG EMAIL OR PASSWORD.";
  if (msg.includes("email-already"))       return "EMAIL ALREADY IN USE.";
  if (msg.includes("weak-password"))       return "PASSWORD TOO WEAK — MIN 6 CHARACTERS.";
  if (msg.includes("invalid-email"))       return "INVALID EMAIL ADDRESS.";
  if (msg.includes("popup-closed"))        return "SIGN-IN CANCELLED.";
  if (msg.includes("network-request"))     return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  if (msg.includes("unauthorized-domain")) return "DOMAIN NOT AUTHORIZED IN FIREBASE CONSOLE.";
  if (msg.includes("too-many-requests"))   return "TOO MANY ATTEMPTS — WAIT AND TRY AGAIN.";
  return "AUTH ERROR — TRY AGAIN.";
}
