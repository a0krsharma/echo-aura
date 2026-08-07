/**
 * lib/posts.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for "posts" collection.
 *
 * Collection: "posts"
 * Schema:
 *   audioUrl     string   — Cloudinary secure URL
 *   caption      string   — Post text / thought
 *   authorUid    string   — Firebase UID of creator
 *   authorHandle string   — Handle e.g. @ANON_4X7K
 *   pulseCount   number   — Upvote counter (default 0)
 *   pulsedBy     string[] — UIDs of users who pulsed
 *   duration     string   — Formatted mm:ss
 *   durationSec  number   — Audio duration in seconds
 *   createdAt    Timestamp
 */

import {
  collection,
  doc,
  addDoc,
  query,
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
  id:           string;
  audioUrl:     string;
  caption:      string;
  authorUid:    string;
  authorHandle: string;
  pulseCount:   number;
  pulsedBy?:    string[];
  duration?:    string;
  durationSec?: number;
  createdAt:    Timestamp | null;
}

/**
 * createPost
 * Save a new post document to the Firestore "posts" collection.
 */
export async function createPost(data: {
  audioUrl:     string;
  caption:      string;
  authorUid:    string;
  authorHandle: string;
  duration?:    string;
  durationSec?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  const postsRef = collection(db, "posts");
  const docRef = await addDoc(postsRef, {
    audioUrl:     data.audioUrl,
    caption:      data.caption,
    authorUid:    data.authorUid,
    authorHandle: data.authorHandle,
    pulseCount:   0,
    pulsedBy:     [],
    duration:     data.duration || "00:15",
    durationSec:  data.durationSec || 15,
    createdAt:    serverTimestamp(),
  });

  // Increment creator's aura score in `users` collection (+10 per post)
  try {
    const userRef = doc(db, "users", data.authorUid);
    await updateDoc(userRef, {
      auraScore: increment(10),
    });
  } catch (err) {
    console.error("Failed to bump user auraScore:", err);
  }

  return docRef.id;
}

/**
 * subscribeToPosts
 * Real-time listener for the "posts" collection ordered by createdAt descending.
 */
export function subscribeToPosts(
  callback: (posts: PostItem[]) => void,
  maxItems = 30
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: PostItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PostItem, "id">),
      }));
      callback(posts);
    },
    (err) => {
      console.warn("[Firestore] Posts permission notice:", err.message);
      callback([]);
    }
  );
}

/**
 * togglePulsePost
 * Upvote/pulse a post in the "posts" collection.
 */
export async function togglePulsePost(postId: string, uid: string, currentlyPulsed: boolean) {
  const db = getFirebaseDb();
  const postRef = doc(db, "posts", postId);

  if (currentlyPulsed) {
    await updateDoc(postRef, {
      pulseCount: increment(-1),
      pulsedBy: arrayRemove(uid),
    });
  } else {
    await updateDoc(postRef, {
      pulseCount: increment(1),
      pulsedBy: arrayUnion(uid),
    });
  }
}
