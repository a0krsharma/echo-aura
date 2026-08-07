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
  type:        "pulse" | "reverb" | "orbiter" | "stage" | "whisper";
  fromUid:     string;
  fromHandle:  string;
  postId?:     string;
  postCaption?: string;
  text:        string;
  read:        boolean;
  createdAt:   Timestamp | null;
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
  maxItems = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snap) => {
      const notifs: EchoNotification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EchoNotification, "id">),
      }));
      callback(notifs);
    },
    () => callback([])
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
