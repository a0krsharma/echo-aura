/**
 * lib/notifications.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for real-time notifications.
 *
 * Collection: notifications/{uid}/items/{notifId}
 *   type:      "pulse" | "reverb" | "orbiter" | "stage" | "whisper"
 *   fromUid:   string
 *   fromHandle: string
 *   postId?:   string
 *   postCaption?: string
 *   read:      boolean
 *   createdAt: Timestamp
 */

import {
  collection,
  addDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  writeBatch,
  getDocs,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface EchoNotification {
  id:          string;
  type:        "pulse" | "reverb" | "orbiter" | "stage" | "whisper" | "wire" | "raise_hand" | "room_join" | "room_leave" | "room_promote" | "room_demote" | "mention" | "bookmark" | "room_ban" | "moderator_promotion";
  fromUid:     string;
  fromHandle:  string;
  postId?:     string;
  postCaption?: string;
  roomId?:     string;
  roomName?:   string;
  text:        string;
  read:        boolean;
  createdAt:   Timestamp | null;
  grouped?:    boolean;
  groupCount?: number;
}

/**
 * createNotification
 * Called when something happens (pulse, reverb, etc).
 */
export async function createNotification(
  targetUid: string,
  data: {
    type:         EchoNotification["type"];
    fromUid:      string;
    fromHandle:   string;
    postId?:      string;
    postCaption?: string;
    roomId?:      string;
    roomName?:    string;
    text:         string;
  }
): Promise<void> {
  // Don't notify yourself
  if (targetUid === data.fromUid) return;

  try {
    const db = getFirebaseDb();
    const itemsRef = collection(db, "notifications", targetUid, "items");
    await addDoc(itemsRef, {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("[Notifications] Failed to create notification:", err);
  }
}

/**
 * subscribeToNotifications
 * Real-time listener for a user's notification feed.
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifs: EchoNotification[]) => void,
  maxItems = 100
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notifications", uid, "items"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snap) => {
      const nowSec = Date.now() / 1000;
      const twentyFourHoursAgo = nowSec - 24 * 60 * 60; // 24 hours in seconds

      const notifs: EchoNotification[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EchoNotification, "id">),
        }))
        .filter((n) => {
          // If created recently without seconds timestamp yet, include it
          if (!n.createdAt?.seconds) return true;
          // Only keep notifications created in the last 24 hours
          return n.createdAt.seconds >= twentyFourHoursAgo;
        });

      // Sort newest first
      notifs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(notifs);
    },
    (err) => {
      console.warn("[Notifications] Error:", err.message);
      callback([]);
    }
  );
}

/**
 * markNotificationRead
 * Mark a single notification as read.
 */
export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "notifications", uid, "items", notifId), { read: true });
  } catch {}
}

/**
 * markAllNotificationsRead
 * Mark all unread notifications as read.
 */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "notifications", uid, "items"),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch {}
}

/**
 * getUnreadCount
 * Get the count of unread notifications (for dot indicator).
 */
export function subscribeToUnreadCount(
  uid: string,
  callback: (count: number) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false)
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.size),
    () => callback(0)
  );
}
