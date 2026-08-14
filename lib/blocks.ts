/**
 * lib/blocks.ts
 * ─────────────────────────────────────────────────────
 * Block/Mute System for Echo
 * Block users and mute content
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface Block {
  id: string;
  blockerUid: string;
  blockedUid: string;
  blockedHandle: string;
  reason?: string;
  createdAt: Timestamp;
}

export interface Mute {
  id: string;
  muterUid: string;
  mutedUid: string;
  mutedHandle: string;
  mutePosts: boolean;
  muteWhispers: boolean;
  muteRooms: boolean;
  createdAt: Timestamp;
}

const BLOCKS_COLLECTION = "blocks";
const MUTES_COLLECTION = "mutes";

// ── Block a user ───────────────────────────────────────────────────────────────
export async function blockUser(
  blockerUid: string,
  blockedUid: string,
  blockedHandle: string,
  reason?: string
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const blockRef = doc(collection(db, BLOCKS_COLLECTION));
    const blockId = blockRef.id;
    
    await setDoc(blockRef, {
      id: blockId,
      blockerUid,
      blockedUid,
      blockedHandle,
      reason,
      createdAt: serverTimestamp(),
    });
    
    return blockId;
  } catch (error) {
    console.error("[blockUser] Error:", error);
    throw error;
  }
}

// ── Unblock a user ─────────────────────────────────────────────────────────────
export async function unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    const blockQuery = query(
      collection(db, BLOCKS_COLLECTION),
      where("blockerUid", "==", blockerUid),
      where("blockedUid", "==", blockedUid)
    );
    
    const blockSnap = await getDocs(blockQuery);
    
    if (!blockSnap.empty) {
      await deleteDoc(blockSnap.docs[0].ref);
    }
  } catch (error) {
    console.error("[unblockUser] Error:", error);
    throw error;
  }
}

// ── Check if user is blocked ─────────────────────────────────────────────────────
export async function isUserBlocked(
  blockerUid: string,
  blockedUid: string
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    
    const blockQuery = query(
      collection(db, BLOCKS_COLLECTION),
      where("blockerUid", "==", blockerUid),
      where("blockedUid", "==", blockedUid)
    );
    
    const blockSnap = await getDocs(blockQuery);
    return !blockSnap.empty;
  } catch (error) {
    console.error("[isUserBlocked] Error:", error);
    return false;
  }
}

// ── Get blocked users ─────────────────────────────────────────────────────────
export async function getBlockedUsers(
  uid: string,
  limitCount: number = 100
): Promise<Block[]> {
  try {
    const db = getFirebaseDb();
    
    const blocksQuery = query(
      collection(db, BLOCKS_COLLECTION),
      where("blockerUid", "==", uid),
      limit(limitCount)
    );
    
    const blocksSnap = await getDocs(blocksQuery);
    const list = blocksSnap.docs.map(doc => doc.data() as Block);
    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return list;
  } catch (error) {
    console.error("[getBlockedUsers] Error:", error);
    return [];
  }
}

// ── Get users who blocked current user ───────────────────────────────────────────
export async function getUsersWhoBlocked(
  uid: string,
  limitCount: number = 100
): Promise<Block[]> {
  try {
    const db = getFirebaseDb();
    
    const blocksQuery = query(
      collection(db, BLOCKS_COLLECTION),
      where("blockedUid", "==", uid),
      limit(limitCount)
    );
    
    const blocksSnap = await getDocs(blocksQuery);
    const list = blocksSnap.docs.map(doc => doc.data() as Block);
    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return list;
  } catch (error) {
    console.error("[getUsersWhoBlocked] Error:", error);
    return [];
  }
}

// ── Mute a user ─────────────────────────────────────────────────────────────────
export async function muteUser(
  muterUid: string,
  mutedUid: string,
  mutedHandle: string,
  options: {
    mutePosts?: boolean;
    muteWhispers?: boolean;
    muteRooms?: boolean;
  } = {}
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const muteRef = doc(collection(db, MUTES_COLLECTION));
    const muteId = muteRef.id;
    
    await setDoc(muteRef, {
      id: muteId,
      muterUid,
      mutedUid,
      mutedHandle,
      mutePosts: options.mutePosts ?? true,
      muteWhispers: options.muteWhispers ?? true,
      muteRooms: options.muteRooms ?? false,
      createdAt: serverTimestamp(),
    });
    
    return muteId;
  } catch (error) {
    console.error("[muteUser] Error:", error);
    throw error;
  }
}

// ── Unmute a user ─────────────────────────────────────────────────────────────
export async function unmuteUser(muterUid: string, mutedUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    const muteQuery = query(
      collection(db, MUTES_COLLECTION),
      where("muterUid", "==", muterUid),
      where("mutedUid", "==", mutedUid)
    );
    
    const muteSnap = await getDocs(muteQuery);
    
    if (!muteSnap.empty) {
      await deleteDoc(muteSnap.docs[0].ref);
    }
  } catch (error) {
    console.error("[unmuteUser] Error:", error);
    throw error;
  }
}

// ── Update mute settings ───────────────────────────────────────────────────────
export async function updateMuteSettings(
  muterUid: string,
  mutedUid: string,
  options: {
    mutePosts?: boolean;
    muteWhispers?: boolean;
    muteRooms?: boolean;
  }
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    const muteQuery = query(
      collection(db, MUTES_COLLECTION),
      where("muterUid", "==", muterUid),
      where("mutedUid", "==", mutedUid)
    );
    
    const muteSnap = await getDocs(muteQuery);
    
    if (muteSnap.empty) {
      throw new Error("Mute not found");
    }
    
    const updateData: any = {};
    if (options.mutePosts !== undefined) updateData.mutePosts = options.mutePosts;
    if (options.muteWhispers !== undefined) updateData.muteWhispers = options.muteWhispers;
    if (options.muteRooms !== undefined) updateData.muteRooms = options.muteRooms;
    
    await updateDoc(muteSnap.docs[0].ref, updateData);
  } catch (error) {
    console.error("[updateMuteSettings] Error:", error);
    throw error;
  }
}

// ── Check if user is muted ─────────────────────────────────────────────────────
export async function isUserMuted(
  muterUid: string,
  mutedUid: string
): Promise<Mute | null> {
  try {
    const db = getFirebaseDb();
    
    const muteQuery = query(
      collection(db, MUTES_COLLECTION),
      where("muterUid", "==", muterUid),
      where("mutedUid", "==", mutedUid)
    );
    
    const muteSnap = await getDocs(muteQuery);
    
    if (muteSnap.empty) {
      return null;
    }
    
    return muteSnap.docs[0].data() as Mute;
  } catch (error) {
    console.error("[isUserMuted] Error:", error);
    return null;
  }
}

// ── Get muted users ───────────────────────────────────────────────────────────
export async function getMutedUsers(
  uid: string,
  limitCount: number = 100
): Promise<Mute[]> {
  try {
    const db = getFirebaseDb();
    
    const mutesQuery = query(
      collection(db, MUTES_COLLECTION),
      where("muterUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const mutesSnap = await getDocs(mutesQuery);
    return mutesSnap.docs.map(doc => doc.data() as Mute);
  } catch (error) {
    console.error("[getMutedUsers] Error:", error);
    return [];
  }
}

// ── Filter content based on blocks/mutes ─────────────────────────────────────────
export async function filterContent(
  uid: string,
  content: Array<{ authorUid: string; authorHandle?: string }>
): Promise<Array<{ authorUid: string; authorHandle?: string }>> {
  try {
    const db = getFirebaseDb();
    
    // Get blocked users
    const blockedQuery = query(
      collection(db, BLOCKS_COLLECTION),
      where("blockerUid", "==", uid)
    );
    const blockedSnap = await getDocs(blockedQuery);
    const blockedUids = new Set(blockedSnap.docs.map(doc => doc.data().blockedUid));
    
    // Get muted users
    const mutedQuery = query(
      collection(db, MUTES_COLLECTION),
      where("muterUid", "==", uid),
      where("mutePosts", "==", true)
    );
    const mutedSnap = await getDocs(mutedQuery);
    const mutedUids = new Set(mutedSnap.docs.map(doc => doc.data().mutedUid));
    
    // Filter content
    return content.filter(item => {
      return !blockedUids.has(item.authorUid) && !mutedUids.has(item.authorUid);
    });
  } catch (error) {
    console.error("[filterContent] Error:", error);
    return content;
  }
}

// ── Subscribe to blocked users (real-time) ───────────────────────────────────────
export function subscribeToBlockedUsers(
  uid: string,
  callback: (blocks: Block[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const blocksQuery = query(
    collection(db, BLOCKS_COLLECTION),
    where("blockerUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  
  const unsubscribe = onSnapshot(blocksQuery, (querySnap) => {
    const blocks = querySnap.docs.map(doc => doc.data() as Block);
    callback(blocks);
  }, (error) => {
    console.error("[subscribeToBlockedUsers] Error:", error);
  });
  
  return unsubscribe;
}

// ── Subscribe to muted users (real-time) ────────────────────────────────────────
export function subscribeToMutedUsers(
  uid: string,
  callback: (mutes: Mute[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const mutesQuery = query(
    collection(db, MUTES_COLLECTION),
    where("muterUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  
  const unsubscribe = onSnapshot(mutesQuery, (querySnap) => {
    const mutes = querySnap.docs.map(doc => doc.data() as Mute);
    callback(mutes);
  }, (error) => {
    console.error("[subscribeToMutedUsers] Error:", error);
  });
  
  return unsubscribe;
}
