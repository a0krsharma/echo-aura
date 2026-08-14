/**
 * lib/userDoc.ts
 * ─────────────────────────────────────────────────────
 * Helper to create or fetch the Firestore `users` document
 * for an authenticated Firebase user.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, arrayUnion, arrayRemove } from "firebase/firestore";
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
  tags:        string[];
  streak:      number;
  lastActiveDate: string | null;
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
    tags:        [],
    streak:      0,
    lastActiveDate: null,
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
      streak: 0,
      lastActiveDate: null,
      tags: [],
    });

    return fallbackUser;
  } catch (err: any) {
    console.warn("[Firestore] User doc permission notice (using fallback user):", err.message);
    return fallbackUser;
  }
}

/**
 * addTag
 * Add a tag to user's profile
 */
export async function addTag(uid: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    tags: arrayUnion(tag.toUpperCase()),
  });
}

/**
 * removeTag
 * Remove a tag from user's profile
 */
export async function removeTag(uid: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    tags: arrayRemove(tag.toUpperCase()),
  });
}

/**
 * getUserTags
 * Get user's tags
 */
export async function getUserTags(uid: string): Promise<string[]> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return [];
  }
  
  const userData = snap.data() as EchoUser;
  return userData.tags || [];
}

/**
 * incrementStreak
 * Check and increment user's daily streak
 */
export async function incrementStreak(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return 0;
  }
  
  const userData = snap.data() as EchoUser;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastActive = userData.lastActiveDate;
  
  let newStreak = userData.streak || 0;
  
  if (lastActive === today) {
    // Already active today, no change
    return newStreak;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (lastActive === yesterdayStr) {
    // Consecutive day, increment streak
    newStreak += 1;
  } else if (lastActive !== today) {
    // Streak broken or first day, reset to 1
    newStreak = 1;
  }
  
  await updateDoc(ref, {
    streak: newStreak,
    lastActiveDate: today,
    lastSeen: serverTimestamp(),
  });
  
  return newStreak;
}

/**
 * getStreak
 * Get current user streak
 */
export async function getStreak(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return 0;
  }
  
  const userData = snap.data() as EchoUser;
  return userData.streak || 0;
}
