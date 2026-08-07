/**
 * lib/userDoc.ts
 * ─────────────────────────────────────────────────────
 * Helper to create or fetch the Firestore `users` document
 * for an authenticated Firebase user.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

export interface EchoUser {
  uid:         string;
  handle:      string;
  email:       string;
  displayName: string;
  photoUrl:    string;
  auraScore:   number;
  badges:      string[];
}

/** Generate a random anonymous handle like @ANON_4X7K */
function generateAnonHandle(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `@ANON_${suffix}`;
}

/**
 * getOrCreateUserDoc
 * Called after every successful Firebase Auth sign-in.
 * Gracefully handles Firestore permission errors with fallback profile.
 */
export async function getOrCreateUserDoc(firebaseUser: FirebaseUser): Promise<EchoUser> {
  const fallbackUser: EchoUser = {
    uid:         firebaseUser.uid,
    handle:      generateAnonHandle(),
    email:       firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? "",
    photoUrl:    firebaseUser.photoURL ?? "",
    auraScore:   0,
    badges:      [],
  };

  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      // Existing user — bump lastSeen
      try {
        await updateDoc(ref, { lastSeen: serverTimestamp() });
      } catch {}
      return snap.data() as EchoUser;
    }

    // Brand-new user — create the document
    await setDoc(ref, {
      ...fallbackUser,
      createdAt: serverTimestamp(),
      lastSeen:  serverTimestamp(),
    });

    return fallbackUser;
  } catch (err: any) {
    console.warn("[Firestore] User doc permission notice (using fallback user):", err.message);
    return fallbackUser;
  }
}
