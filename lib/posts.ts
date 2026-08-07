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
