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
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

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
  const db = getFirebaseDb();
  const ref = doc(db, "posts", postId);
  if (currentlyPulsed) {
    await updateDoc(ref, { pulseCount: increment(-1), pulsedBy: arrayRemove(uid) });
  } else {
    await updateDoc(ref, { pulseCount: increment(1),  pulsedBy: arrayUnion(uid)  });
  }
}

/**
 * deletePost — hard-deletes a post document.
 */
export async function deletePost(postId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "posts", postId));
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
  const ref = doc(db, "posts", postId, "reverbs", reverbId);
  if (currentlyPulsed) {
    await updateDoc(ref, { pulseCount: increment(-1), pulsedBy: arrayRemove(uid) });
  } else {
    await updateDoc(ref, { pulseCount: increment(1), pulsedBy: arrayUnion(uid) });
  }
}
