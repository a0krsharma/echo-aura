"use client";

/**
 * components/AuthProvider.tsx
 * ─────────────────────────────────────────────────────
 * Firebase Authentication context for Echo.
 *
 * Exposes:
 *  user          – EchoUser | null  (Firestore document, not raw Firebase user)
 *  firebaseUser  – FirebaseUser | null  (raw Firebase Auth user)
 *  isLoading     – true while auth state is resolving
 *  signInWithGoogle()
 *  signInWithEmail(email, password)
 *  signUpWithEmail(email, password)
 *  signOut()
 *  error         – string | null  (last auth error message)
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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, getFirebaseAnalytics } from "@/lib/firebase";
import { getOrCreateUserDoc, type EchoUser } from "@/lib/userDoc";

// ─── Context shape ───────────────────────────────────────────────
interface AuthContextValue {
  user:            EchoUser     | null;
  firebaseUser:    FirebaseUser | null;
  isLoading:       boolean;
  error:           string       | null;
  signInWithGoogle:   ()                               => Promise<void>;
  signInWithEmail:    (email: string, pass: string)    => Promise<void>;
  signUpWithEmail:    (email: string, pass: string)    => Promise<void>;
  signOut:            ()                               => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<EchoUser     | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Sync Firebase Auth state → Firestore user doc ──────────────
  useEffect(() => {
    // Boot Analytics once on the client — silently ignored on SSR
    getFirebaseAnalytics().catch(() => {});

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
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

  // ── Google Sign-In ──────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
      // onAuthStateChanged handles user state update
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      setError(msg);
      throw e;
    }
  }, []);

  // ── Email Sign-In ───────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, pass);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      setError(mapFirebaseError(msg));
      throw e;
    }
  }, []);

  // ── Email Sign-Up ───────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, pass);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign-up failed";
      setError(mapFirebaseError(msg));
      throw e;
    }
  }, []);

  // ── Sign-Out ────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setError(null);
    await firebaseSignOut(getFirebaseAuth());
  }, []);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Utilities ───────────────────────────────────────────────────
/** Map verbose Firebase error codes to human-readable Echo messages */
function mapFirebaseError(msg: string): string {
  if (msg.includes("user-not-found"))    return "NO ACCOUNT FOUND WITH THAT EMAIL.";
  if (msg.includes("wrong-password"))    return "INCORRECT PASSWORD.";
  if (msg.includes("email-already"))     return "EMAIL ALREADY IN USE.";
  if (msg.includes("weak-password"))     return "PASSWORD TOO WEAK — MIN 6 CHARACTERS.";
  if (msg.includes("invalid-email"))     return "INVALID EMAIL ADDRESS.";
  if (msg.includes("popup-closed"))      return "SIGN-IN CANCELLED.";
  if (msg.includes("network-request"))   return "NETWORK ERROR — CHECK YOUR CONNECTION.";
  return "AUTH ERROR — TRY AGAIN.";
}
