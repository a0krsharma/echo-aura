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
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { createNotification } from "./notifications";

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

  // Fire orbit (follow) notification
  try {
    await createNotification(followingUid, {
      type: "orbiter",
      fromUid: followerUid,
      fromHandle: followerHandle,
      text: `${followerHandle} started orbiting you`,
    });
  } catch (e) {
    console.warn("[followUser] Notification failed:", e);
  }
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

/**
 * Subscribe to a user's followers list (real-time)
 */
export function subscribeToFollowers(
  uid: string,
  callback: (follows: Follow[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "follows"),
    where("followingUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Follow, "id">) })));
  }, (err) => {
    console.error("[subscribeToFollowers] Error:", err);
    callback([]);
  });
}

/**
 * Subscribe to users this uid is following (real-time)
 */
export function subscribeToFollowing(
  uid: string,
  callback: (follows: Follow[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "follows"),
    where("followerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Follow, "id">) })));
  }, (err) => {
    console.error("[subscribeToFollowing] Error:", err);
    callback([]);
  });
}
