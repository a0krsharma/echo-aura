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
  addDoc, setDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
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
  clashId?:    string;
  clashTitle?: string;
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
    clashId?:     string;
    clashTitle?:  string;
    text:         string;
  }
): Promise<void> {
  // Don't notify yourself or empty target
  if (!targetUid || !data.fromUid || targetUid === data.fromUid) return;

  try {
    const db = getFirebaseDb();
    const itemsRef = collection(db, "notifications", targetUid, "items");
    await addDoc(itemsRef, {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Silent catch so permission notices on target uids resolve quietly
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
  if (!uid) {
    callback([]);
    return () => {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notifications", uid, "items"),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snap) => {
      const notifs: EchoNotification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EchoNotification, "id">),
      }));

      // Sort newest first
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      callback(notifs);
    },
    (err) => {
      // Silent graceful fallback if user auth token is refreshing
      callback([]);
    }
  );
}

/**
 * markNotificationRead
 * Mark a single notification as read.
 */
export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  if (!uid || !notifId) return;
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
  if (!uid) return;
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
 * deleteNotification
 * Delete a single notification.
 */
export async function deleteNotification(uid: string, notifId: string): Promise<void> {
  if (!uid || !notifId) return;
  try {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, "notifications", uid, "items", notifId));
  } catch (err) {
    console.error("[deleteNotification] Error:", err);
  }
}

/**
 * clearAllNotifications
 * Delete all notifications for a user.
 */
export async function clearAllNotifications(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "notifications", uid, "items"));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.error("[clearAllNotifications] Error:", err);
  }
}

/**
 * getUnreadCount
 * Get the count of unread notifications (for dot indicator).
 */
export function subscribeToUnreadCount(
  uid: string,
  callback: (count: number) => void
): () => void {
  if (!uid) {
    callback(0);
    return () => {};
  }
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

// ── Web Push & Browser Push Notification System ──────────────────────────────
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("[Notifications] Request permission error:", err);
    return "denied";
  }
}

export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission === "granted") {
    try {
      return new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    } catch (err) {
      console.warn("[Notifications] Show notification error:", err);
      return null;
    }
  }

  return null;
}

export async function dispatchNativeMobileNotification(notif: EchoNotification): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const titleMap: Record<string, string> = {
    pulse: "⚡ [ PULSED YOUR ECHO ]",
    reverb: "🎙 [ REPLY / RE-ECHO ]",
    orbiter: "🌐 [ NEW ORBITER ]",
    wire: "💬 [ WIRE DIRECT MESSAGE ]",
    whisper: "💬 [ WIRE MESSAGE ]",
    room_join: "📻 [ NODE JOINED ROOM ]",
    room_leave: "📻 [ NODE LEFT ROOM ]",
    raise_hand: "✋ [ MIC REQUEST IN ROOM ]",
    room_promote: "🎙 [ PROMOTED TO SPEAKER ]",
    room_demote: "🎧 [ DEMOTED TO LISTENER ]",
    stage: "⚔ [ LIVE STAGE DEBATE ]",
    bookmark: "⭐ [ ROOM BOOKMARKED ]",
    mention: "@ [ YOU WERE MENTIONED ]",
  };

  const title = titleMap[notif.type] || "// [ ECHO TRANSMISSION ]";
  const body = notif.text || `${notif.fromHandle} interacted with your frequency.`;
  const targetUrl = notif.roomId
    ? `/room/${notif.roomId}`
    : notif.type === "wire" || notif.type === "whisper"
    ? "/wire"
    : notif.type === "orbiter"
    ? `/${notif.fromHandle.replace("@", "")}`
    : notif.postId
    ? `/#${notif.postId}`
    : "/notifications";

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: notif.id,
          data: { url: targetUrl },
        });
        return;
      }
    }

    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: notif.id,
    });
  } catch (err) {
    console.warn("[Notifications] Native mobile dispatch error:", err);
  }
}

export function notifyDebateStart(clashTitle: string, user1: string, user2: string) {
  showNotification("🔴 LIVE DEBATE STARTED", {
    body: `${user1} vs ${user2} is live on Stage: "${clashTitle}"`,
    tag: `clash-${Date.now()}`,
  });
}

export function notifyRoomStart(roomTitle: string, hostHandle: string) {
  showNotification("🎙 LIVE ROOM ACTIVE", {
    body: `${hostHandle} started a live room: "${roomTitle}"`,
    tag: `room-${Date.now()}`,
  });
}


export interface AppNotification {
  id: string;
  toUid: string;
  fromUid: string;
  fromHandle: string;
  type: string;
  matchId?: string;
  gameType?: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export async function sendChallengeNotification(
  toUid: string,
  fromUid: string,
  fromHandle: string,
  matchId: string,
  gameType: string
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, "notifications"));
  
  await setDoc(ref, {
    id: ref.id,
    toUid,
    fromUid,
    fromHandle,
    type: "CHALLENGE",
    matchId,
    gameType,
    message: `${fromHandle} has challenged you to ${gameType.toUpperCase()}!`,
    createdAt: Date.now(),
    read: false,
  });
}

export function subscribeToChallengeNotifications(
  uid: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "notifications"),
    where("toUid", "==", uid),
    where("type", "==", "CHALLENGE"),
    where("read", "==", false),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const notifs: AppNotification[] = [];
    snap.forEach((doc) => notifs.push(doc.data() as AppNotification));
    onUpdate(notifs);
  });
}
