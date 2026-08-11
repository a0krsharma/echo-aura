/**
 * lib/bookmarks.ts
 * ─────────────────────────────────────────────────────
 * Bookmark/Save System for Echo
 * Allows users to save/bookmark posts for later viewing
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface Bookmark {
  id: string; // userId_postId
  userId: string;
  postId: string;
  postAuthorUid: string;
  postAuthorHandle: string;
  postCaption: string;
  postAudioUrl: string;
  postDuration: string;
  postDurationSec: number;
  postPulseCount: number;
  bookmarkedAt: Timestamp;
}

const BOOKMARKS_COLLECTION = "bookmarks";

// ── Add bookmark ───────────────────────────────────────────────────────────────
export async function addBookmark(
  userId: string,
  postId: string,
  postAuthorUid: string,
  postAuthorHandle: string,
  postCaption: string,
  postAudioUrl: string,
  postDuration: string,
  postDurationSec: number,
  postPulseCount: number
): Promise<void> {
  const db = getFirebaseDb();
  const bookmarkId = `${userId}_${postId}`;
  const bookmarkRef = doc(db, BOOKMARKS_COLLECTION, bookmarkId);

  await setDoc(bookmarkRef, {
    id: bookmarkId,
    userId,
    postId,
    postAuthorUid,
    postAuthorHandle,
    postCaption,
    postAudioUrl,
    postDuration,
    postDurationSec,
    postPulseCount,
    bookmarkedAt: serverTimestamp(),
  });
}

// ── Remove bookmark ────────────────────────────────────────────────────────────
export async function removeBookmark(userId: string, postId: string): Promise<void> {
  const db = getFirebaseDb();
  const bookmarkId = `${userId}_${postId}`;
  const bookmarkRef = doc(db, BOOKMARKS_COLLECTION, bookmarkId);

  await deleteDoc(bookmarkRef);
}

// ── Check if post is bookmarked by user ───────────────────────────────────────────
export async function isPostBookmarked(userId: string, postId: string): Promise<boolean> {
  const db = getFirebaseDb();
  const bookmarkId = `${userId}_${postId}`;
  const bookmarkRef = doc(db, BOOKMARKS_COLLECTION, bookmarkId);
  const bookmarkSnap = await getDoc(bookmarkRef);

  return bookmarkSnap.exists();
}

// ── Get user's bookmarks ────────────────────────────────────────────────────────
export async function getUserBookmarks(userId: string, limitCount: number = 50): Promise<Bookmark[]> {
  const db = getFirebaseDb();

  const bookmarksQuery = query(
    collection(db, BOOKMARKS_COLLECTION),
    where("userId", "==", userId),
    orderBy("bookmarkedAt", "desc"),
    limit(limitCount)
  );

  const bookmarksSnap = await getDocs(bookmarksQuery);
  return bookmarksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bookmark[];
}

// ── Subscribe to user's bookmarks (real-time) ─────────────────────────────────────
export function subscribeToUserBookmarks(userId: string, callback: (bookmarks: Bookmark[]) => void): () => void {
  const db = getFirebaseDb();

  const bookmarksQuery = query(
    collection(db, BOOKMARKS_COLLECTION),
    where("userId", "==", userId),
    orderBy("bookmarkedAt", "desc"),
    limit(50)
  );

  const unsubscribe = onSnapshot(bookmarksQuery, (querySnap) => {
    const bookmarks = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bookmark[];
    callback(bookmarks);
  }, (error) => {
    console.error("[subscribeToUserBookmarks] Error:", error);
  });

  return unsubscribe;
}

// ── Get bookmark count for a post ────────────────────────────────────────────────
export async function getPostBookmarkCount(postId: string): Promise<number> {
  const db = getFirebaseDb();

  const bookmarksQuery = query(
    collection(db, BOOKMARKS_COLLECTION),
    where("postId", "==", postId),
    limit(100)
  );

  const bookmarksSnap = await getDocs(bookmarksQuery);
  return bookmarksSnap.size;
}
