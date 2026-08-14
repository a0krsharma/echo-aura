/**
 * lib/posts.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for Posts.
 *
 * NOTE: Queries filtering by `authorUid` or `pulsedBy` sort client-side
 * to avoid requiring composite Firestore indexes which fail silently if missing.
 */

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs,
  getDoc,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createPostMentions, removePostMentions } from "@/lib/mentions";
import { addBookmark, removeBookmark, isPostBookmarked } from "@/lib/bookmarks";

export interface PostItem {
  id:              string;
  audioUrl:        string;
  caption:         string;
  authorUid:       string;
  authorHandle:    string;
  pulseCount:      number;
  pulsedBy?:       string[];
  orbitedBy?:      string[];
  orbitCount?:     number;
  reverbCount?:    number;
  commentCount?:   number;
  duration?:       string;
  durationSec?:    number;
  reverbOf?:       string;
  reverbOfHandle?: string;
  orbitOf?:        string;
  orbitOfHandle?:  string;
  createdAt:       Timestamp | null;
  // [ SPIKE ] - Trending metrics
  spikeScore?:     number;
  spikeCategory?:  "RISING" | "HOT" | "VIRAL" | null;
  // [ VAULT ] - Archiving
  vaulted?:        boolean;
  vaultedAt?:      Timestamp | null;
  // [ DUET ] - Collaborative audio
  duetOf?:         string;
  duetOfHandle?:   string;
  duetPartnerUid?: string;
  duetPartnerHandle?: string;
}

/** Inline voice comment on a post — stored in posts/{id}/reverbs subcollection */
export interface PostReverbItem {
  id:                string;
  postId:            string;
  uid:               string;
  handle:            string;
  audioUrl:          string;
  caption:           string;
  durationSec:       number;
  pulseCount:        number;
  pulsedBy:          string[];
  reverbCount:       number;
  reverbOfReverbId?: string;
  reverbOfHandle?:   string;
  createdAt:         Timestamp | null;
}

/**
 * createPost
 */
export async function createPost(data: {
  audioUrl:         string;
  caption:          string;
  authorUid:        string;
  authorHandle:     string;
  duration?:        string;
  durationSec?:     number;
  reverbOf?:        string;
  reverbOfHandle?:  string;
  orbitOf?:         string;
  orbitOfHandle?:   string;
  duetOf?:          string;
  duetOfHandle?:    string;
}): Promise<string> {
  try {
    const db = getFirebaseDb();
    const postsRef = collection(db, "posts");
    const docRef = await addDoc(postsRef, {
      audioUrl:        data.audioUrl,
      caption:         data.caption,
      authorUid:       data.authorUid,
      authorHandle:    data.authorHandle,
      pulseCount:      0,
      pulsedBy:        [],
      orbitedBy:       [],
      orbitCount:      0,
      reverbCount:     0,
      duration:        data.duration  || "00:15",
      durationSec:     data.durationSec || 15,
      reverbOf:        data.reverbOf        || null,
      reverbOfHandle:  data.reverbOfHandle  || null,
      orbitOf:         data.orbitOf         || null,
      orbitOfHandle:   data.orbitOfHandle   || null,
      duetOf:          data.duetOf          || null,
      duetOfHandle:    data.duetOfHandle    || null,
      duetPartnerUid:  null,
      duetPartnerHandle: null,
      createdAt:       serverTimestamp(),
      // [ SPIKE ] - Initialize trending metrics
      spikeScore:      0,
      spikeCategory:   null,
      // [ VAULT ] - Initialize vault status
      vaulted:         false,
      vaultedAt:       null,
    });

    // Bump aura
    try {
      await updateDoc(doc(db, "users", data.authorUid), { auraScore: increment(10) });
    } catch {}

    // Create mentions for this post
    try {
      await createPostMentions(docRef.id, data.caption, data.authorUid, data.authorHandle, data.audioUrl);
    } catch (error) {
      console.error("[createPost] Error creating mentions:", error);
    }

    // Increment parent reverbCount
    if (data.reverbOf) {
      try { 
        await updateDoc(doc(db, "posts", data.reverbOf), { reverbCount: increment(1) });
        await updateSpikeMetrics(data.reverbOf);
      } catch {}
    }

    // Increment parent orbitCount
    if (data.orbitOf) {
      try {
        await updateDoc(doc(db, "posts", data.orbitOf), {
          orbitCount: increment(1),
          orbitedBy:  arrayUnion(data.authorUid),
        });
        await updateSpikeMetrics(data.orbitOf);
      } catch {}
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

// ── Toggle bookmark on a post ───────────────────────────────────────────────────
export async function togglePostBookmark(
  userId: string,
  postId: string,
  postAuthorUid: string,
  postAuthorHandle: string,
  postCaption: string,
  postAudioUrl: string,
  postDuration: string,
  postDurationSec: number,
  postPulseCount: number
): Promise<boolean> {
  const isBookmarked = await isPostBookmarked(userId, postId);

  if (isBookmarked) {
    await removeBookmark(userId, postId);
    return false;
  } else {
    await addBookmark(
      userId,
      postId,
      postAuthorUid,
      postAuthorHandle,
      postCaption,
      postAudioUrl,
      postDuration,
      postDurationSec,
      postPulseCount
    );
    return true;
  }
}

/**
 * subscribeToPosts — all posts, newest first
 */
export function subscribeToPosts(
  callback: (posts: PostItem[]) => void,
  maxItems = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, "id">) }))),
    (err) => { console.warn("[Firestore] Posts:", err.message); callback([]); }
  );
}

/**
 * subscribeToUserPosts — posts by a specific uid
 * Uses simple where query + client-side sorting to avoid missing composite index errors.
 */
export function subscribeToUserPosts(
  uid: string,
  callback: (posts: PostItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "posts"),
    where("authorUid", "==", uid),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, "id">) }));
      posts.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(posts);
    },
    (err) => {
      console.warn("[Firestore] subscribeToUserPosts error:", err.message);
      callback([]);
    }
  );
}

/**
 * subscribeToUserPulsedPosts — posts the user has pulsed
 * Uses simple where query + client-side sorting to avoid missing composite index errors.
 */
export function subscribeToUserPulsedPosts(
  uid: string,
  callback: (posts: PostItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "posts"),
    where("pulsedBy", "array-contains", uid),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, "id">) }));
      posts.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(posts);
    },
    (err) => {
      console.warn("[Firestore] subscribeToUserPulsedPosts error:", err.message);
      callback([]);
    }
  );
}

/**
 * calculateSpikeScore
 * Calculate trending score based on engagement metrics
 */
function calculateSpikeScore(post: PostItem): number {
  const pulseWeight = 1;
  const reverbWeight = 2;
  const orbitWeight = 3;
  
  const pulseScore = post.pulseCount * pulseWeight;
  const reverbScore = (post.reverbCount || 0) * reverbWeight;
  const orbitScore = (post.orbitCount || 0) * orbitWeight;
  
  return pulseScore + reverbScore + orbitScore;
}

/**
 * updateSpikeMetrics
 * Update trending metrics for a post
 */
export async function updateSpikeMetrics(postId: string): Promise<void> {
  const db = getFirebaseDb();
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) return;
  
  const post = { id: postSnap.id, ...postSnap.data() } as PostItem;
  const spikeScore = calculateSpikeScore(post);
  
  // Determine spike category based on score
  let spikeCategory: "RISING" | "HOT" | "VIRAL" | null = null;
  if (spikeScore >= 100) spikeCategory = "VIRAL";
  else if (spikeScore >= 50) spikeCategory = "HOT";
  else if (spikeScore >= 20) spikeCategory = "RISING";
  
  await updateDoc(postRef, {
    spikeScore,
    spikeCategory,
  });
}

/**
 * getTrendingPosts
 * Get posts sorted by spike score
 */
export async function getTrendingPosts(limitCount: number = 20): Promise<PostItem[]> {
  const db = getFirebaseDb();
  const postsRef = collection(db, "posts");
  const q = query(postsRef, orderBy("createdAt", "desc"), limit(100));
  
  const snap = await getDocs(q);
  const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostItem[];
  
  // Sort by spike score (descending)
  return posts
    .sort((a, b) => (b.spikeScore || 0) - (a.spikeScore || 0))
    .slice(0, limitCount);
}
export async function togglePulsePost(
  postId: string,
  uid: string,
  currentlyPulsed: boolean
) {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "posts", postId);
    if (currentlyPulsed) {
      await updateDoc(ref, { pulseCount: increment(-1), pulsedBy: arrayRemove(uid) });
    } else {
      await updateDoc(ref, { pulseCount: increment(1), pulsedBy: arrayUnion(uid) });
    }
    // Update [ SPIKE ] metrics after pulse change
    await updateSpikeMetrics(postId);
  } catch (err) {
    console.warn("[Firestore] togglePulsePost error:", err);
    throw err;
  }
}

/**
 * vaultPost
 * Archive a post to the user's vault
 */
export async function vaultPost(postId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const postRef = doc(db, "posts", postId);
  
  await updateDoc(postRef, {
    vaulted: true,
    vaultedAt: serverTimestamp(),
  });
  
  // Add to user's vault collection
  const vaultRef = doc(db, "user_vault", `${uid}_${postId}`);
  await setDoc(vaultRef, {
    uid,
    postId,
    vaultedAt: serverTimestamp(),
  });
}

/**
 * unvaultPost
 * Remove a post from the user's vault
 */
export async function unvaultPost(postId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const postRef = doc(db, "posts", postId);
  
  await updateDoc(postRef, {
    vaulted: false,
    vaultedAt: null,
  });
  
  // Remove from user's vault collection
  const vaultRef = doc(db, "user_vault", `${uid}_${postId}`);
  await deleteDoc(vaultRef);
}

/**
 * isPostVaulted
 * Check if a post is vaulted by a user
 */
export async function isPostVaulted(postId: string, uid: string): Promise<boolean> {
  const db = getFirebaseDb();
  const vaultRef = doc(db, "user_vault", `${uid}_${postId}`);
  const snap = await getDoc(vaultRef);
  
  return snap.exists();
}

/**
 * getUserVaultedPosts
 * Get all posts vaulted by a user
 */
export async function getUserVaultedPosts(uid: string): Promise<PostItem[]> {
  const db = getFirebaseDb();
  const vaultQuery = query(
    collection(db, "user_vault"),
    where("uid", "==", uid)
  );
  
  const vaultSnap = await getDocs(vaultQuery);
  const postIds = vaultSnap.docs.map(doc => doc.data().postId);
  
  if (postIds.length === 0) return [];
  
  // Get post details
  const postsQuery = query(
    collection(db, "posts"),
    where("__name__", "in", postIds.slice(0, 10)) // Firestore limit for 'in' queries
  );
  
  const postsSnap = await getDocs(postsQuery);
  return postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostItem[];
}

/**
 * createDuet
 * Create a collaborative duet post
 */
export async function createDuet(data: {
  audioUrl:         string;
  caption:          string;
  authorUid:        string;
  authorHandle:     string;
  duration?:        string;
  durationSec?:     number;
  duetOf:           string;
  duetOfHandle:     string;
  duetPartnerUid:   string;
  duetPartnerHandle: string;
}): Promise<string> {
  try {
    const db = getFirebaseDb();
    const postsRef = collection(db, "posts");
    const docRef = await addDoc(postsRef, {
      audioUrl:        data.audioUrl,
      caption:         data.caption,
      authorUid:       data.authorUid,
      authorHandle:    data.authorHandle,
      pulseCount:      0,
      pulsedBy:        [],
      orbitedBy:       [],
      orbitCount:      0,
      reverbCount:     0,
      duration:        data.duration  || "00:15",
      durationSec:     data.durationSec || 15,
      reverbOf:        null,
      reverbOfHandle:  null,
      orbitOf:         null,
      orbitOfHandle:   null,
      duetOf:          data.duetOf,
      duetOfHandle:    data.duetOfHandle,
      duetPartnerUid:  data.duetPartnerUid,
      duetPartnerHandle: data.duetPartnerHandle,
      createdAt:       serverTimestamp(),
      // [ SPIKE ] - Initialize trending metrics
      spikeScore:      0,
      spikeCategory:   null,
      // [ VAULT ] - Initialize vault status
      vaulted:         false,
      vaultedAt:       null,
    });

    // Bump aura
    try {
      await updateDoc(doc(db, "users", data.authorUid), { auraScore: increment(10) });
    } catch {}

    // Create mentions for this duet
    try {
      await createPostMentions(docRef.id, data.caption, data.authorUid, data.authorHandle, data.audioUrl);
    } catch (error) {
      console.error("[createDuet] Error creating mentions:", error);
    }

    // Notify duet partner
    try {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification(data.duetPartnerUid, {
        type: "mention",
        fromUid: data.authorUid,
        fromHandle: data.authorHandle,
        postId: docRef.id,
        text: `${data.authorHandle} created a [ DUET ] with your audio`,
      });
    } catch (error) {
      console.error("[createDuet] Error notifying partner:", error);
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating duet:", error);
    throw error;
  }
}

/**
 * getDuetsForPost
 * Get all duets for a specific post
 */
export async function getDuetsForPost(postId: string): Promise<PostItem[]> {
  const db = getFirebaseDb();
  const duetsQuery = query(
    collection(db, "posts"),
    where("duetOf", "==", postId)
  );
  
  const snap = await getDocs(duetsQuery);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostItem[];
}

/**
 * getDuetsByUser
 * Get all duets created by a user
 */
export async function getDuetsByUser(uid: string): Promise<PostItem[]> {
  const db = getFirebaseDb();
  const duetsQuery = query(
    collection(db, "posts"),
    where("authorUid", "==", uid),
    where("duetOf", "!=", null)
  );
  
  const snap = await getDocs(duetsQuery);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostItem[];
}

export async function deletePost(postId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Delete all reverbs first
    const reverbsRef = collection(db, "posts", postId, "reverbs");
    const reverbsSnap = await getDocs(reverbsRef);
    for (const doc of reverbsSnap.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Delete the post
    await deleteDoc(doc(db, "posts", postId));
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}

/**
 * subscribeToPostReverbs — real-time listener for inline voice comments on a post
 */
export function subscribeToPostReverbs(
  postId: string,
  callback: (reverbs: PostReverbItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "posts", postId, "reverbs"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PostReverbItem, "id">) }))),
    () => callback([])
  );
}

/**
 * addPostReverb — add an inline voice comment (reverb) to a post
 */
export async function addPostReverb(
  postId: string,
  data: {
    uid:               string;
    handle:            string;
    audioUrl:          string;
    caption:           string;
    durationSec:       number;
    reverbOfReverbId?: string;
    reverbOfHandle?:   string;
  }
): Promise<string> {
  const db = getFirebaseDb();
  const reverbsRef = collection(db, "posts", postId, "reverbs");
  const docRef = await addDoc(reverbsRef, {
    postId,
    uid:              data.uid,
    handle:           data.handle,
    audioUrl:         data.audioUrl,
    caption:          data.caption,
    durationSec:      data.durationSec,
    pulseCount:       0,
    pulsedBy:         [],
    reverbCount:      0,
    reverbOfReverbId: data.reverbOfReverbId || null,
    reverbOfHandle:   data.reverbOfHandle   || null,
    createdAt:        serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, "posts", postId), { reverbCount: increment(1) });
  } catch {}
  return docRef.id;
}

/**
 * togglePulsePostReverb — like / unlike an inline voice comment
 */
export async function togglePulsePostReverb(
  postId: string,
  reverbId: string,
  uid: string,
  currentlyPulsed: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const reverbRef = doc(db, "posts", postId, "reverbs", reverbId);
  await updateDoc(reverbRef, {
    pulseCount: increment(currentlyPulsed ? -1 : 1),
    pulsedBy: currentlyPulsed ? arrayRemove(uid) : arrayUnion(uid),
  });
}
