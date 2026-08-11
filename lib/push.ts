/**
 * lib/push.ts
 * ─────────────────────────────────────────────────────
 * Push Notification System for Echo
 * Firebase Cloud Messaging (FCM) for web push notifications
 */

import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase";

// ── Request notification permission ───────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// ── Get FCM token for push notifications ───────────────────────────────────────────
export async function getFCMToken(): Promise<string | null> {
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    
    return token;
  } catch (error) {
    console.error("[getFCMToken] Error:", error);
    return null;
  }
}

// ── Save FCM token to user profile ───────────────────────────────────────────────────
export async function saveFCMTokenToProfile(uid: string, token: string): Promise<void> {
  try {
    // This would typically save to Firestore user profile
    // For now, we'll just log it
    console.log(`[saveFCMTokenToProfile] Saving token for user ${uid}:`, token);
    
    // Implementation would be:
    // await updateDoc(doc(db, "users", uid), {
    //   fcmToken: token,
    //   fcmTokenUpdatedAt: serverTimestamp(),
    // });
  } catch (error) {
    console.error("[saveFCMTokenToProfile] Error:", error);
  }
}

// ── Delete FCM token ───────────────────────────────────────────────────────────────
export async function deleteFCMToken(): Promise<void> {
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    await deleteToken(messaging);
  } catch (error) {
    console.error("[deleteFCMToken] Error:", error);
  }
}

// ── Listen for incoming push messages ─────────────────────────────────────────────
export function onPushMessage(callback: (payload: any) => void): () => void {
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error("[onPushMessage] Error:", error);
    return () => {};
  }
}

// ── Check if notifications are supported ───────────────────────────────────────────
export function areNotificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

// ── Check notification permission status ────────────────────────────────────────────
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

// ── Show local notification (fallback) ─────────────────────────────────────────────
export function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): void {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...options,
    });
  }
}

// ── Initialize push notifications ─────────────────────────────────────────────────
export async function initializePushNotifications(uid: string): Promise<void> {
  try {
    // Check if notifications are supported
    if (!areNotificationsSupported()) {
      console.warn("Push notifications not supported");
      return;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    
    if (permission === "granted") {
      // Get FCM token
      const token = await getFCMToken();
      
      if (token) {
        // Save token to user profile
        await saveFCMTokenToProfile(uid, token);
      }
    }
  } catch (error) {
    console.error("[initializePushNotifications] Error:", error);
  }
}

// ── Subscribe to push notifications for specific topics ─────────────────────────────
export async function subscribeToTopic(topic: string): Promise<void> {
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    // This requires Firebase Cloud Functions to handle topic subscriptions
    // For now, we'll just log it
    console.log(`[subscribeToTopic] Subscribing to topic: ${topic}`);
    
    // Implementation would be:
    // await subscribeToTopic(messaging, topic);
  } catch (error) {
    console.error("[subscribeToTopic] Error:", error);
  }
}

// ── Unsubscribe from push notifications for specific topics ───────────────────────
export async function unsubscribeFromTopic(topic: string): Promise<void> {
  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    console.log(`[unsubscribeFromTopic] Unsubscribing from topic: ${topic}`);
    
    // Implementation would be:
    // await unsubscribeFromTopic(messaging, topic);
  } catch (error) {
    console.error("[unsubscribeFromTopic] Error:", error);
  }
}
