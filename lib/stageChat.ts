/**
 * lib/stageChat.ts
 * ─────────────────────────────────────────────────────
 * Firestore real-time service for [ STAGE ] Vibe Chat.
 * Collection: "clashes/{clashId}/messages"
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface VibeChatMessage {
  id:        string;
  clashId:   string;
  handle:    string;
  text:      string;
  timeStr:   string;
  createdAt: Timestamp | null;
}

/** Format current time as HH:MM:SS */
function getFormattedTime(): string {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * sendVibeMessage
 * Post a new live text message to a Stage debate stream.
 */
export async function sendVibeMessage(
  clashId: string,
  handle:  string,
  text:    string,
  uid?:    string
): Promise<string> {
  const db = getFirebaseDb();
  const ref = collection(db, "clashes", clashId, "messages");
  const docRef = await addDoc(ref, {
    clashId,
    handle,
    uid:       uid || "",
    text:      text.trim(),
    timeStr:   getFormattedTime(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * subscribeToVibeChat
 * Real-time listener for the Vibe Chat stream.
 */
export function subscribeToVibeChat(
  clashId:  string,
  callback: (messages: VibeChatMessage[]) => void,
  maxItems = 40
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "clashes", clashId, "messages"),
    orderBy("createdAt", "asc"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: VibeChatMessage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VibeChatMessage, "id">),
      }));
      callback(msgs);
    },
    () => callback([])
  );
}
