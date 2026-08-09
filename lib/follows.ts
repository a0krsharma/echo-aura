/**
 * lib/follows.ts
 * ─────────────────────────────────────────────────────
 * User follow system
 */

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface Follow {
  id: string;
  followerUid: string;
  followingUid: string;
  followerHandle: string;
  followingHandle: string;
  createdAt: Timestamp;
}

/**
 * Follow a user
 */
export async function followUser(followerUid: string, followerHandle: string, followingUid: string, followingHandle: string): Promise<void> {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  // Check if already following
  const existingQuery = query(
    followsRef,
    where("followerUid", "==", followerUid),
    where("followingUid", "==", followingUid)
  );
  const existingSnap = await getDocs(existingQuery);
  
  if (!existingSnap.empty) {
    return; // Already following
  }
  
  await addDoc(followsRef, {
    followerUid,
    followerHandle,
    followingUid,
    followingHandle,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerUid: string, followingUid: string): Promise<void> {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  const queryRef = query(
    followsRef,
    where("followerUid", "==", followerUid),
    where("followingUid", "==", followingUid)
  );
  
  const snap = await getDocs(queryRef);
  for (const doc of snap.docs) {
    await deleteDoc(doc.ref);
  }
}

/**
 * Check if current user follows another user
 */
export async function isFollowing(followerUid: string, followingUid: string): Promise<boolean> {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  const queryRef = query(
    followsRef,
    where("followerUid", "==", followerUid),
    where("followingUid", "==", followingUid)
  );
  
  const snap = await getDocs(queryRef);
  return !snap.empty;
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  const queryRef = query(followsRef, where("followingUid", "==", uid));
  const snap = await getDocs(queryRef);
  
  return snap.size;
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  const queryRef = query(followsRef, where("followerUid", "==", uid));
  const snap = await getDocs(queryRef);
  
  return snap.size;
}

/**
 * Subscribe to follow status (real-time)
 */
export function subscribeToFollowStatus(followerUid: string, followingUid: string, callback: (isFollowing: boolean) => void): () => void {
  const db = getFirebaseDb();
  const followsRef = collection(db, "follows");
  
  const queryRef = query(
    followsRef,
    where("followerUid", "==", followerUid),
    where("followingUid", "==", followingUid)
  );
  
  return onSnapshot(queryRef, (snap) => {
    callback(!snap.empty);
  }, (error) => {
    console.error("[subscribeToFollowStatus] Error:", error);
  });
}
