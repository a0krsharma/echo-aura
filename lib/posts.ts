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
  duration?:       string;
  durationSec?:    number;
  reverbOf?:       string;
  reverbOfHandle?: string;
  orbitOf?:        string;
  orbitOfHandle?:  string;
  createdAt:       Timestamp | null;
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
      createdAt:       serverTimestamp(),
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
      try { await updateDoc(doc(db, "posts", data.reverbOf), { reverbCount: increment(1) }); } catch {}
    }

    // Increment parent orbitCount
    if (data.orbitOf) {
      try {
        await updateDoc(doc(db, "posts", data.orbitOf), {
          orbitCount: increment(1),
          orbitedBy:  arrayUnion(data.authorUid),
        });
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
 * togglePulsePost
 */
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
      await updateDoc(ref, { pulseCount: increment(1),  pulsedBy: arrayUnion(uid)  });
    }
  } catch (error) {
    console.error("Error toggling pulse:", error);
    throw error;
  }
}

/**
 * deletePost — delete a post and all its reverbs
 */
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
