/**
 * lib/clashes.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for The Stage (Clashes / Debates).
 * Collection: "clashes"
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface ClashItem {
  id:           string;
  title:        string;
  topic:        string;
  sideA:        { handle: string; position: string; votes: number };
  sideB:        { handle: string; position: string; votes: number };
  listeners:    number;
  status:       "live" | "upcoming" | "ended";
  createdAt:    Timestamp | null;
}

/**
 * createClash
 * Launch a live clash/debate doc in Firestore.
 */
export async function createClash(data: {
  title:    string;
  topic:    string;
  handleA:  string;
  posA:     string;
  handleB:  string;
  posB:     string;
}): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "clashes"), {
    title:     data.title,
    topic:     data.topic,
    sideA:     { handle: data.handleA, position: data.posA, votes: 0 },
    sideB:     { handle: data.handleB, position: data.posB, votes: 0 },
    listeners: 1,
    status:    "live",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * subscribeToClashes
 * Stream live and upcoming clashes from Firestore.
 */
export function subscribeToClashes(
  callback: (clashes: ClashItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(collection(db, "clashes"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const items: ClashItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClashItem, "id">),
    }));
    callback(items);
  }, () => callback([]));
}

/**
 * voteOnClash
 * Vote for Side A or Side B in a debate.
 */
export async function voteOnClash(clashId: string, side: "A" | "B") {
  const db = getFirebaseDb();
  const ref = doc(db, "clashes", clashId);

  if (side === "A") {
    await updateDoc(ref, { "sideA.votes": increment(1) });
  } else {
    await updateDoc(ref, { "sideB.votes": increment(1) });
  }
}
