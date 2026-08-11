/**
 * lib/hashtags.ts
 * ─────────────────────────────────────────────────────
 * Hashtag System for Echo
 * Handles hashtag extraction, tracking, trending, and following
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createPostMentions, removePostMentions } from "@/lib/mentions";

export interface Hashtag {
  id: string; // The hashtag without # (e.g., "music")
  tag: string; // The hashtag with # (e.g., "#music")
  postCount: number;
  followerCount: number;
  createdAt: Timestamp;
  trendingScore: number;
}

export interface HashtagPost {
  id: string;
  hashtag: string;
  postId: string;
  postAuthorUid: string;
  postAuthorHandle: string;
  postCaption: string;
  postAudioUrl: string;
  postDuration: string;
  durationSec: number;
  postPulseCount: number;
  postedAt: Timestamp;
}

const HASHTAGS_COLLECTION = "hashtags";
const HASHTAG_POSTS_COLLECTION = "hashtag_posts";
const USER_HASHTAG_FOLLOWING = "user_hashtag_following";

// ── Extract hashtags from text ────────────────────────────────────────────────
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }

  return [...new Set(hashtags)]; // Remove duplicates
}

// ── Update hashtags for a post ───────────────────────────────────────────────
export async function updatePostHashtags(postId: string, caption: string, authorUid: string, authorHandle: string, audioUrl: string, duration: string, durationSec: number, pulseCount: number): Promise<void> {
  const hashtags = extractHashtags(caption);
  const db = getFirebaseDb();

  for (const hashtag of hashtags) {
    const tag = `#${hashtag}`;
    const hashtagId = hashtag;

    // Update or create hashtag document
    const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
    const hashtagSnap = await getDoc(hashtagRef);

    if (hashtagSnap.exists()) {
      await updateDoc(hashtagRef, {
        postCount: increment(1),
        trendingScore: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(hashtagRef, {
        id: hashtagId,
        tag,
        postCount: 1,
        followerCount: 0,
        createdAt: serverTimestamp(),
        trendingScore: 1,
        updatedAt: serverTimestamp(),
      });
    }

    // Add post to hashtag_posts collection
    const hashtagPostRef = doc(db, HASHTAG_POSTS_COLLECTION, `${hashtagId}_${postId}`);
    await setDoc(hashtagPostRef, {
      hashtag: hashtagId,
      postId,
      postAuthorUid: authorUid,
      postAuthorHandle: authorHandle,
      postCaption: caption,
      postAudioUrl: audioUrl,
      postDuration: duration,
      durationSec,
      postPulseCount: pulseCount,
      postedAt: serverTimestamp(),
    });
  }

  // Create mentions for this post
  try {
    await createPostMentions(postId, caption, authorUid, authorHandle, audioUrl);
  } catch (error) {
    console.error("[updatePostHashtags] Error creating mentions:", error);
  }
}

// ── Remove hashtags for a post ─────────────────────────────────────────────────
export async function removePostHashtags(postId: string, caption: string): Promise<void> {
  const hashtags = extractHashtags(caption);
  const db = getFirebaseDb();

  for (const hashtag of hashtags) {
    const hashtagId = hashtag;

    // Remove post from hashtag_posts collection
    const hashtagPostRef = doc(db, HASHTAG_POSTS_COLLECTION, `${hashtagId}_${postId}`);
    await deleteDoc(hashtagPostRef);

    // Decrement hashtag post count
    const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
    await updateDoc(hashtagRef, {
      postCount: increment(-1),
      trendingScore: increment(-1),
    });
  }

  // Remove mentions for this post
  try {
    await removePostMentions(postId);
  } catch (error) {
    console.error("[removePostHashtags] Error removing mentions:", error);
  }
}

// ── Get hashtag by ID ────────────────────────────────────────────────────────
export async function getHashtag(tag: string): Promise<Hashtag | null> {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
  const hashtagSnap = await getDoc(hashtagRef);

  if (!hashtagSnap.exists()) return null;

  return { id: hashtagSnap.id, ...hashtagSnap.data() } as Hashtag;
}

// ── Get posts for a hashtag ────────────────────────────────────────────────────
export async function getHashtagPosts(tag: string, limitCount: number = 50): Promise<HashtagPost[]> {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  
  const postsQuery = query(
    collection(db, HASHTAG_POSTS_COLLECTION),
    where("hashtag", "==", hashtagId),
    orderBy("postedAt", "desc"),
    limit(limitCount)
  );

  const postsSnap = await getDocs(postsQuery);
  return postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HashtagPost[];
}

// ── Subscribe to hashtag posts (real-time) ────────────────────────────────────
export function subscribeToHashtagPosts(tag: string, callback: (posts: HashtagPost[]) => void): () => void {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  
  const postsQuery = query(
    collection(db, HASHTAG_POSTS_COLLECTION),
    where("hashtag", "==", hashtagId),
    orderBy("postedAt", "desc"),
    limit(50)
  );

  const unsubscribe = onSnapshot(postsQuery, (querySnap) => {
    const posts = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HashtagPost[];
    callback(posts);
  }, (error) => {
    console.error("[subscribeToHashtagPosts] Error:", error);
  });

  return unsubscribe;
}

// ── Get trending hashtags ─────────────────────────────────────────────────────
export async function getTrendingHashtags(limitCount: number = 10): Promise<Hashtag[]> {
  const db = getFirebaseDb();
  
  const hashtagsQuery = query(
    collection(db, HASHTAGS_COLLECTION),
    where("postCount", ">", 0),
    orderBy("trendingScore", "desc"),
    limit(limitCount)
  );

  const hashtagsSnap = await getDocs(hashtagsQuery);
  return hashtagsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hashtag[];
}

// ── Follow a hashtag ───────────────────────────────────────────────────────────
export async function followHashtag(userId: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  const followRef = doc(db, USER_HASHTAG_FOLLOWING, `${userId}_${hashtagId}`);
  
  await setDoc(followRef, {
    userId,
    hashtag: hashtagId,
    followedAt: serverTimestamp(),
  });

  // Increment hashtag follower count
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
  await updateDoc(hashtagRef, {
    followerCount: increment(1),
  });
}

// ── Unfollow a hashtag ─────────────────────────────────────────────────────────
export async function unfollowHashtag(userId: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  const followRef = doc(db, USER_HASHTAG_FOLLOWING, `${userId}_${hashtagId}`);
  
  await deleteDoc(followRef);

  // Decrement hashtag follower count
  const hashtagRef = doc(db, HASHTAGS_COLLECTION, hashtagId);
  await updateDoc(hashtagRef, {
    followerCount: increment(-1),
  });
}

// ── Check if user follows a hashtag ────────────────────────────────────────────
export async function isFollowingHashtag(userId: string, tag: string): Promise<boolean> {
  const db = getFirebaseDb();
  const hashtagId = tag.replace('#', '').toLowerCase();
  const followRef = doc(db, USER_HASHTAG_FOLLOWING, `${userId}_${hashtagId}`);
  const followSnap = await getDoc(followRef);
  
  return followSnap.exists();
}

// ── Get user's followed hashtags ───────────────────────────────────────────────
export async function getUserFollowedHashtags(userId: string): Promise<Hashtag[]> {
  const db = getFirebaseDb();
  
  const followsQuery = query(
    collection(db, USER_HASHTAG_FOLLOWING),
    where("userId", "==", userId),
    orderBy("followedAt", "desc")
  );

  const followsSnap = await getDocs(followsQuery);
  const hashtagIds = followsSnap.docs.map(doc => doc.data().hashtag);

  if (hashtagIds.length === 0) return [];

  // Get hashtag details
  const hashtagsQuery = query(
    collection(db, HASHTAGS_COLLECTION),
    where("__name__", "in", hashtagIds.slice(0, 10))
  );

  const hashtagsSnap = await getDocs(hashtagsQuery);
  return hashtagsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hashtag[];
}

// ── Subscribe to user's followed hashtags (real-time) ─────────────────────────
export function subscribeToUserFollowedHashtags(userId: string, callback: (hashtags: Hashtag[]) => void): () => void {
  const db = getFirebaseDb();
  
  const followsQuery = query(
    collection(db, USER_HASHTAG_FOLLOWING),
    where("userId", "==", userId),
    orderBy("followedAt", "desc")
  );

  const unsubscribe = onSnapshot(followsQuery, async (followsSnap) => {
    const hashtagIds = followsSnap.docs.map(doc => doc.data().hashtag);

    if (hashtagIds.length === 0) {
      callback([]);
      return;
    }

    // Get hashtag details
    const hashtagsQuery = query(
      collection(db, HASHTAGS_COLLECTION),
      where("__name__", "in", hashtagIds.slice(0, 10))
    );

    const hashtagsSnap = await getDocs(hashtagsQuery);
    const hashtags = hashtagsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hashtag[];
    callback(hashtags);
  }, (error) => {
    console.error("[subscribeToUserFollowedHashtags] Error:", error);
  });

  return unsubscribe;
}

// ── Update trending scores (should be called periodically) ────────────────────
export async function updateTrendingScores(): Promise<void> {
  const db = getFirebaseDb();
  
  // Get all hashtags with posts in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const hashtagsQuery = query(
    collection(db, HASHTAGS_COLLECTION),
    where("createdAt", ">=", sevenDaysAgo)
  );

  const hashtagsSnap = await getDocs(hashtagsQuery);
  
  for (const hashtagDoc of hashtagsSnap.docs) {
    const hashtag = hashtagDoc.data() as Hashtag;
    
    // Calculate trending score based on recent activity
    // This is a simple algorithm - can be enhanced
    const timeDecay = Math.max(0.1, 1 - (Date.now() - hashtag.createdAt.toDate().getTime()) / (30 * 24 * 60 * 60 * 1000));
    const newTrendingScore = Math.floor(hashtag.postCount * timeDecay + hashtag.followerCount * 0.5);
    
    await updateDoc(hashtagDoc.ref, {
      trendingScore: newTrendingScore,
    });
  }
}
