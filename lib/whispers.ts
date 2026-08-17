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
  deleteDoc,
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
  lastRead?:    Record<string, Timestamp | null>;
  createdAt:    Timestamp | null;
}

export interface WhisperMessage {
  id:           string;
  senderUid:    string;
  senderHandle: string;
  text:         string;
  audioUrl?:    string;
  readBy:       string[];
  status?:      "SENT" | "DELIVERED" | "SEEN" | "IGNORED" | "DISMISSED";
  createdAt:    Timestamp | null;
}

/**
 * updateThreadLastRead
 * Updates conversation lastRead timestamp for thread-level read receipts.
 */
export async function updateThreadLastRead(conversationId: string, uid: string): Promise<void> {
  if (!conversationId || !uid) return;
  const db = getFirebaseDb();
  try {
    const convRef = doc(db, "whispers", conversationId);
    await updateDoc(convRef, {
      [`lastRead.${uid}`]: serverTimestamp(),
    });
  } catch {
    try {
      const wireRef = doc(db, "wire", conversationId);
      await updateDoc(wireRef, {
        [`lastRead.${uid}`]: serverTimestamp(),
      });
    } catch {}
  }
}

/**
 * getTelemetryStatus
 * Calculates message telemetry status dynamically based on thread lastRead and message status.
 */
export function getTelemetryStatus(
  message: WhisperMessage,
  peerLastReadTS?: any
): "SENT" | "DELIVERED" | "SEEN" | "DISMISSED" {
  if (message.status === "IGNORED" || message.status === "DISMISSED") {
    return "DISMISSED";
  }

  const getSec = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.seconds === "number") return ts.seconds;
    if (typeof ts.toDate === "function") return ts.toDate().getTime() / 1000;
    if (typeof ts === "number") return ts / 1000;
    return 0;
  };

  const msgSec = getSec(message.createdAt);
  const readSec = getSec(peerLastReadTS);

  if (readSec > 0 && readSec >= msgSec) {
    return "SEEN";
  }

  if (message.status === "DELIVERED") {
    return "DELIVERED";
  }

  return "SENT";
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

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        participants: [myUid, theirUid],
        handles: {
          [myUid]: myHandle || "@ANON",
          [theirUid]: theirHandle || "@ANON",
        },
        lastMessage: "",
        lastAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    // Fallback: If getDoc fails due to security rules on uncreated docs, setDoc directly with merge
    try {
      await setDoc(
        convRef,
        {
          participants: [myUid, theirUid],
          handles: {
            [myUid]: myHandle || "@ANON",
            [theirUid]: theirHandle || "@ANON",
          },
          lastMessage: "",
          lastAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (createErr) {
      console.warn("[startOrGetConversation] Fallback create error:", createErr);
    }
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
  const convRef = doc(db, "whispers", conversationId);
  const uids = conversationId.split("__").filter(Boolean);

  // 1. Try updating parent conversation doc (non-blocking)
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(
        convRef,
        {
          participants: uids.length > 0 ? uids : [senderUid],
          handles: {
            [senderUid]: senderHandle || "@ANON",
          },
          lastMessage: text || "🎙 Voice message",
          lastAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await updateDoc(convRef, {
        participants: arrayUnion(...(uids.length > 0 ? uids : [senderUid])),
        [`handles.${senderUid}`]: senderHandle || "@ANON",
        lastMessage: text || "🎙 Voice message",
        lastAt: serverTimestamp(),
      });
    }
  } catch (parentErr) {
    console.warn("[sendWhisper] Non-fatal parent conversation update error:", parentErr);
  }

  // 2. Add message document to messages subcollection
  let msgRefId = "";
  try {
    const messagesRef = collection(db, "whispers", conversationId, "messages");
    const msgRef = await addDoc(messagesRef, {
      senderUid,
      senderHandle,
      text,
      audioUrl: audioUrl || null,
      readBy: [senderUid],
      createdAt: serverTimestamp(),
    });
    msgRefId = msgRef.id;
  } catch (msgErr) {
    console.warn("[sendWhisper] Warning adding message to whispers subcollection:", msgErr);
    try {
      const wireMsgRef = collection(db, "wire", conversationId, "messages");
      const msgRef = await addDoc(wireMsgRef, {
        senderUid,
        senderHandle,
        text,
        audioUrl: audioUrl || null,
        readBy: [senderUid],
        createdAt: serverTimestamp(),
      });
      msgRefId = msgRef.id;
    } catch (aliasErr) {
      console.warn("[sendWhisper] Alias write warning:", aliasErr);
    }
  }

  // 3. Notify recipient
  try {
    const recipient = uids.find((p) => p !== senderUid);
    if (recipient) {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification(recipient, {
        type: "wire",
        fromUid: senderUid,
        fromHandle: senderHandle,
        text: text || "Sent you a wire",
      });
    }
  } catch (err) {
    // Silent catch
  }

  return msgRefId;
}

/**
 * deleteWhisperMessage / deleteWireMessage
 * Delete a text or voice message from a conversation thread.
 */
export async function deleteWhisperMessage(conversationId: string, messageId: string): Promise<void> {
  const db = getFirebaseDb();
  try {
    const msgRef = doc(db, "whispers", conversationId, "messages", messageId);
    await deleteDoc(msgRef);
  } catch (err) {
    console.warn("[deleteWhisperMessage] Error deleting message:", err);
  }
  try {
    const wireMsgRef = doc(db, "wire", conversationId, "messages", messageId);
    await deleteDoc(wireMsgRef);
  } catch {}
}

export const deleteWireMessage = deleteWhisperMessage;

/**
 * subscribeToConversations
 * Real-time list of conversations for a user.
 */
export function subscribeToConversations(
  uid: string,
  callback: (convs: WhisperConversation[]) => void
): () => void {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "whispers"),
    where("participants", "array-contains", uid),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const convs: WhisperConversation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhisperConversation, "id">),
      }));
      convs.sort((a, b) => {
        const getSec = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.seconds === "number") return ts.seconds;
          if (typeof ts.toDate === "function") return ts.toDate().getTime() / 1000;
          return 0;
        };
        return getSec(b.lastAt) - getSec(a.lastAt);
      });
      callback(convs);
    },
    (err) => {
      console.warn("[subscribeToConversations] Error:", err);
      callback([]);
    }
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
  if (!conversationId) {
    callback([]);
    return () => {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "whispers", conversationId, "messages"),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: WhisperMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WhisperMessage, "id">),
      }));
      msgs.sort((a, b) => {
        const getSec = (ts: any) => {
          if (!ts) return Date.now() / 1000;
          if (typeof ts.seconds === "number") return ts.seconds;
          if (typeof ts.toDate === "function") return ts.toDate().getTime() / 1000;
          return Date.now() / 1000;
        };
        return getSec(a.createdAt) - getSec(b.createdAt);
      });
      callback(msgs);
    },
    (err) => {
      console.warn("[subscribeToMessages] Fallback check due to err:", err);
      try {
        const qWire = query(
          collection(db, "wire", conversationId, "messages"),
          limit(100)
        );
        return onSnapshot(
          qWire,
          (snapWire) => {
            const msgs: WhisperMessage[] = snapWire.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<WhisperMessage, "id">),
            }));
            msgs.sort((a, b) => {
              const getSec = (ts: any) => {
                if (!ts) return Date.now() / 1000;
                if (typeof ts.seconds === "number") return ts.seconds;
                if (typeof ts.toDate === "function") return ts.toDate().getTime() / 1000;
                return Date.now() / 1000;
              };
              return getSec(a.createdAt) - getSec(b.createdAt);
            });
            callback(msgs);
          },
          () => callback([])
        );
      } catch {
        callback([]);
      }
    }
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
