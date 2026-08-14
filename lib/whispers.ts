/**
 * lib/whispers.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for [ WIRE ] (private 1-on-1 DMs).
 *
 * Collection structure:
 *   whispers/{conversationId}/
 *     participants: [uid1, uid2]
 *     handles:     { uid1: "@HANDLE1", uid2: "@HANDLE2" }
 *     lastMessage: string
 *     lastAt:      Timestamp
 *     createdAt:   Timestamp
 *
 *   whispers/{conversationId}/messages/{messageId}/
 *     senderUid:   string
 *     senderHandle: string
 *     text:        string
 *     audioUrl?:   string
 *     readBy:      string[]
 *     createdAt:   Timestamp
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  arrayUnion,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface WhisperConversation {
  id:           string;
  participants: string[];
  handles:      Record<string, string>;
  lastMessage:  string;
  lastAt:       Timestamp | null;
  createdAt:    Timestamp | null;
}

export interface WhisperMessage {
  id:           string;
  senderUid:    string;
  senderHandle: string;
  text:         string;
  audioUrl?:    string;
  readBy:       string[];
  createdAt:    Timestamp | null;
}

/**
 * getConversationId
 * Deterministic ID for a 1-on-1 conversation.
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("__");
}

/**
 * startOrGetConversation
 * Creates conversation if it doesn't exist, returns conversationId.
 */
export async function startOrGetConversation(
  myUid: string,
  myHandle: string,
  theirUid: string,
  theirHandle: string
): Promise<string> {
  const db = getFirebaseDb();
  const convId = getConversationId(myUid, theirUid);
  const convRef = doc(db, "whispers", convId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    await setDoc(convRef, {
      participants: [myUid, theirUid],
      handles: {
        [myUid]: myHandle,
        [theirUid]: theirHandle,
      },
      lastMessage: "",
      lastAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  return convId;
}

/**
 * sendWhisper
 * Send a text or audio message in a conversation.
 */
export async function sendWhisper(
  conversationId: string,
  senderUid: string,
  senderHandle: string,
  text: string,
  audioUrl?: string
): Promise<string> {
  const db = getFirebaseDb();
  const messagesRef = collection(db, "whispers", conversationId, "messages");
  const msgRef = await addDoc(messagesRef, {
    senderUid,
    senderHandle,
    text,
    audioUrl: audioUrl || null,
    readBy: [senderUid],
    createdAt: serverTimestamp(),
  });

  // Update last message on conversation
  const convRef = doc(db, "whispers", conversationId);
  await updateDoc(convRef, {
    lastMessage: text || "🎙 Voice message",
    lastAt: serverTimestamp(),
  });

  // Notify the other participant about the new wire message
  try {
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const conv = convSnap.data() as any;
      const participants: string[] = conv.participants || [];
      const recipient = participants.find((p) => p !== senderUid);
      if (recipient) {
        // Importing here to avoid circular dependency at module load time
        const { createNotification } = await import("@/lib/notifications");
        await createNotification(recipient, {
          type: "wire",
          fromUid: senderUid,
          fromHandle: senderHandle,
          text: text || "Sent you a wire",
        });
      }
    }
  } catch (e) {
    console.error("sendWhisper: failed to notify recipient:", e);
  }

  return msgRef.id;
}

/**
 * subscribeToConversations
 * Real-time list of conversations for a user.
 */
export function subscribeToConversations(
  uid: string,
  callback: (convs: WhisperConversation[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "whispers"),
    where("participants", "array-contains", uid),
    orderBy("lastAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const convs: WhisperConversation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhisperConversation, "id">),
      }));
      callback(convs);
    },
    () => callback([])
  );
}

/**
 * subscribeToMessages
 * Real-time messages in a conversation.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (msgs: WhisperMessage[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "whispers", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: WhisperMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhisperMessage, "id">),
      }));
      callback(msgs);
    },
    () => callback([])
  );
}

/**
 * markMessagesRead
 * Mark all messages in a conversation as read by uid.
 */
export async function markMessagesRead(
  conversationId: string,
  uid: string
): Promise<void> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "whispers", conversationId, "messages"),
    where("readBy", "not-in", [[uid]])
  );
  try {
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) =>
      updateDoc(d.ref, { readBy: arrayUnion(uid) })
    );
    await Promise.all(updates);
  } catch {}
}

/**
 * searchUserByHandle
 * Find a user by their handle prefix (for starting new whispers).
 */
export async function searchUsersByHandle(handle: string): Promise<Array<{ uid: string; handle: string }>> {
  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "users"));
    const q = handle.toLowerCase().replace("@", "");
    return snap.docs
      .map((d) => d.data() as { uid: string; handle: string })
      .filter((u) => u.handle?.toLowerCase().includes(q))
      .slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Signaling helpers for P2P WebRTC 1v1 (uses a 'signaling' subcollection under whispers/{convId})
 */
export async function addSignalingMessage(conversationId: string, fromUid: string, type: string, payload: any) {
  try {
    const db = getFirebaseDb();
    const ref = collection(db, "whispers", conversationId, "signaling");
    await addDoc(ref, {
      fromUid,
      type,
      payload,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("addSignalingMessage failed:", e);
    return false;
  }
}

export function subscribeToSignaling(conversationId: string, callback: (msg: any) => void) {
  const db = getFirebaseDb();
  const q = query(collection(db, "whispers", conversationId, "signaling"), orderBy("createdAt", "asc"));
  const unsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        callback({ id: change.doc.id, ...(change.doc.data() as any) });
      }
    });
  });
  return unsub;
}
