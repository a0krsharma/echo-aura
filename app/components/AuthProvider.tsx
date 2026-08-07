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
import { Capacitor } from "@capacitor/core";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  return Capacitor.isNativePlatform();
}

// ─── Detect mobile browser (not native app) ───────────────────────────────────
// signInWithPopup is blocked on mobile browsers — use signInWithRedirect instead
function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
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

const GOOGLE_WEB_CLIENT_ID = "29569599076-kco7vvdltgv52fjr92qbjq3a6og1321g.apps.googleusercontent.com";

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

    // Handle the return from signInWithRedirect (mobile browser)
    // This runs ONCE when the page loads after Google redirect returns
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        console.log("[AuthProvider] Redirect sign-in successful:", result.user.email);
        // onAuthStateChanged below will handle setting user state
      }
    }).catch((e: any) => {
      const code = e?.code || "";
      if (code !== "auth/no-current-user" && code !== "auth/null-user") {
        console.warn("[AuthProvider] getRedirectResult error:", e);
        setError("GOOGLE SIGN-IN FAILED — TRY AGAIN.");
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
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();

    // ── ANDROID NATIVE: Native Google Account Picker ────────────────────────
    // CRITICAL: NO fallback to signInWithPopup on native.
    // If native fails we show an alert so we can see the exact error on device.
    if (isCapacitorNative()) {
      try {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

        await GoogleAuth.initialize({
          clientId:           "29569599076-kco7vvdltgv52fjr92qbjq3a6og1321g.apps.googleusercontent.com",
          scopes:             ["profile", "email"],
          grantOfflineAccess: true,
        });

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;

        if (!idToken) {
          alert("[Echo Auth] Native Google Sign-In returned no idToken.\nUser object: " + JSON.stringify(googleUser));
          setError("NATIVE AUTH FAILED — NO TOKEN RETURNED.");
          return;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        return; // ✅ success — do NOT fall through to web popup

      } catch (e: any) {
        const msg  = e?.message || "";
        const code = String(e?.code || "");

        // User cancelled — silent
        if (
          msg.includes("cancel") ||
          msg.includes("12501") ||
          msg.includes("closed") ||
          code === "12501"
        ) {
          setError("SIGN-IN CANCELLED.");
          return;
        }

        // Any other native error — show alert on device (diagnostic net)
        alert("[Echo Auth] Native Google Sign-In Error:\nCode: " + code + "\nMessage: " + msg + "\nFull: " + JSON.stringify(e));
        setError("NATIVE GOOGLE AUTH FAILED — SEE ALERT FOR DETAILS.");
        return; // ← STOP. Never fall through to web popup on native.
      }
    }

    // ── MOBILE BROWSER: Use redirect (popup is blocked on mobile browsers) ───
    if (isMobileBrowser()) {
      try {
        googleProvider.setCustomParameters({ prompt: "select_account" });
        // This navigates away — page will reload and getRedirectResult() above catches the result
        await signInWithRedirect(auth, googleProvider);
      } catch (e: any) {
        const msg = e?.message || "";
        setError(mapFirebaseError(msg || e?.code));
      }
      return;
    }

    // ── DESKTOP BROWSER: Firebase Popup ──────────────────────────────────────
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
        // Fallback: try redirect if popup was blocked
        googleProvider.setCustomParameters({ prompt: "select_account" });
        await signInWithRedirect(auth, googleProvider);
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
