/**
 * lib/presence.ts
 * ─────────────────────────────────────────────────────
 * Real-time presence engine powered by Firebase Realtime Database (RTDB)
 * with zero Firestore read/write costs for connection state toggles.
 */

import { getFirebaseApp } from "@/lib/firebase";
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  type Database,
} from "firebase/database";

let _rtdb: Database | null = null;

export function getFirebaseRtdb(): Database | null {
  if (typeof window === "undefined") return null;
  if (_rtdb) return _rtdb;
  try {
    const app = getFirebaseApp();
    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    _rtdb = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
    return _rtdb;
  } catch (err) {
    console.warn("[Presence] RTDB init warning:", err);
    return null;
  }
}

export interface UserPresence {
  state: "online" | "offline";
  last_active?: number;
}

/**
 * initializePresence
 * Connects user to RTDB presence system with auto-disconnect hook.
 */
export function initializePresence(uid: string): () => void {
  if (!uid || typeof window === "undefined") return () => {};
  const rtdb = getFirebaseRtdb();
  if (!rtdb) return () => {};

  try {
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    const connectedRef = ref(rtdb, ".info/connected");

    const unsub = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) return;

      onDisconnect(userStatusRef)
        .set({
          state: "offline",
          last_active: serverTimestamp(),
        })
        .then(() => {
          set(userStatusRef, {
            state: "online",
            last_active: serverTimestamp(),
          });
        })
        .catch((err) => {
          console.warn("[Presence] Set status error:", err);
        });
    });

    return () => {
      unsub();
      set(userStatusRef, {
        state: "offline",
        last_active: serverTimestamp(),
      }).catch(() => {});
    };
  } catch (err) {
    console.warn("[Presence] Listener setup error:", err);
    return () => {};
  }
}

/**
 * subscribeToUserPresence
 * Listens to a user's real-time online status.
 */
export function subscribeToUserPresence(
  uid: string,
  callback: (presence: UserPresence) => void
): () => void {
  if (!uid || typeof window === "undefined") {
    callback({ state: "offline" });
    return () => {};
  }
  const rtdb = getFirebaseRtdb();
  if (!rtdb) {
    callback({ state: "offline" });
    return () => {};
  }

  try {
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    return onValue(userStatusRef, (snap) => {
      const val = snap.val();
      if (val && typeof val === "object") {
        callback({
          state: val.state === "online" ? "online" : "offline",
          last_active: typeof val.last_active === "number" ? val.last_active : undefined,
        });
      } else {
        callback({ state: "offline" });
      }
    });
  } catch (err) {
    callback({ state: "offline" });
    return () => {};
  }
}
