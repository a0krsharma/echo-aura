/**
 * lib/echoes.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for Echoes and [ REPLIES ].
 * Collection: "echoes"
 *
 * Echo Document Schema:
 *   id            string   — Auto-generated doc ID
 *   uid           string   — Creator's Firebase UID
 *   handle        string   — Creator's handle (e.g. @ANON_4X7K)
 *   title         string   — Echo caption / topic
 *   audioUrl      string   — Cloudinary audio URL
 *   duration      string   — e.g. "00:42"
 *   durationSec   number   — duration in seconds
 *   vibeTag       string   — e.g. "HOT TAKE", "RANT"
 *   accentColor   string   — Hex or CSS color
 *   pulses        number   — Vote count
 *   reverbsCount  number   — [ REPLIES ] count
 *   listeners     number   — Audience play count
 *   createdAt     Timestamp
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
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
import { incrementStreak } from "@/lib/userDoc";

export interface EchoPost {
  id:           string;
  uid:          string;
  handle:       string;
  title:        string;
  audioUrl:     string;
  duration:     string;
  durationSec:  number;
  vibeTag:      string;
  accentColor?: string;
  pulses:       number;
  reverbsCount: number;
  listeners:    number;
  pulsedBy?:    string[];
  createdAt:    Timestamp | null;
}

export interface ReverbItem {
  id:          string;
  echoId:      string;
  uid:         string;
  handle:      string;
  audioUrl:    string;
  durationSec: number;
  label:       string;
  createdAt:   Timestamp | null;
}

/**
 * createEcho
 * Add a new echo to Firestore "echoes" collection.
 */
export async function createEcho(data: {
  uid:          string;
  handle:       string;
  title:        string;
  audioUrl:     string;
  duration:     string;
  durationSec:  number;
  vibeTag?:     string;
  accentColor?: string;
}): Promise<string> {
  const db = getFirebaseDb();
  const echoesRef = collection(db, "echoes");
  const docRef = await addDoc(echoesRef, {
    uid:          data.uid,
    handle:       data.handle,
    title:        data.title,
    audioUrl:     data.audioUrl,
    duration:     data.duration,
    durationSec:  data.durationSec,
    vibeTag:      data.vibeTag || "ECHO",
    accentColor:  data.accentColor || "#000000",
    pulses:       0,
    reverbsCount: 0,
    listeners:    1,
    pulsedBy:     [],
    createdAt:    serverTimestamp(),
  });

  // Increment creator's aura score (+10 per echo dropped)
  try {
    const userRef = doc(db, "users", data.uid);
    await updateDoc(userRef, {
      auraScore: increment(10),
    });
  } catch (e) {
    console.error("Failed to update auraScore:", e);
  }

  // Increment user's daily streak
  try {
    await incrementStreak(data.uid);
  } catch (e) {
    console.error("Failed to update streak:", e);
  }

  return docRef.id;
}

/**
 * subscribeToEchoes
 * Real-time listener for the home feed.
 */
export function subscribeToEchoes(
  callback: (echoes: EchoPost[]) => void,
  maxItems = 20
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "echoes"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(q, (snapshot) => {
    const echoes: EchoPost[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EchoPost, "id">),
    }));
    callback(echoes);
  }, (err) => {
    console.warn("Firestore echoes subscription warning:", err);
    callback([]);
  });
}

/**
 * togglePulseEcho
 * Upvote/pulse an echo post.
 */
export async function togglePulseEcho(echoId: string, uid: string, currentlyPulsed: boolean) {
  const db = getFirebaseDb();
  const echoRef = doc(db, "echoes", echoId);

  if (currentlyPulsed) {
    await updateDoc(echoRef, {
      pulses: increment(-1),
      pulsedBy: arrayRemove(uid),
    });
  } else {
    await updateDoc(echoRef, {
      pulses: increment(1),
      pulsedBy: arrayUnion(uid),
    });
  }
}

/**
 * recordPlay
 * Increment listener count when audio is played.
 */
export async function recordPlay(echoId: string) {
  try {
    const db = getFirebaseDb();
    const echoRef = doc(db, "echoes", echoId);
    await updateDoc(echoRef, {
      listeners: increment(1),
    });
  } catch {}
}

/**
 * addReverb
 * Add a voice reply (reverb) to an echo.
 */
export async function addReverb(echoId: string, data: {
  uid:         string;
  handle:      string;
  audioUrl:    string;
  durationSec: number;
  label?:      string;
}): Promise<string> {
  const db = getFirebaseDb();
  const reverbsRef = collection(db, "echoes", echoId, "reverbs");
  const docRef = await addDoc(reverbsRef, {
    echoId,
    uid:         data.uid,
    handle:      data.handle,
    audioUrl:    data.audioUrl,
    durationSec: data.durationSec,
    label:       data.label || "reverb",
    createdAt:   serverTimestamp(),
  });

  // Increment echo's reverbsCount
  const echoRef = doc(db, "echoes", echoId);
  await updateDoc(echoRef, {
    reverbsCount: increment(1),
  });

  return docRef.id;
}

/**
 * subscribeToReverbs
 * Get live voice replies (reverbs) for an echo.
 */
export function subscribeToReverbs(
  echoId: string,
  callback: (reverbs: ReverbItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "echoes", echoId, "reverbs"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const reverbs: ReverbItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ReverbItem, "id">),
    }));
    callback(reverbs);
  }, () => callback([]));
}
