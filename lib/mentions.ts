/**
 * lib/mentions.ts
 * ─────────────────────────────────────────────────────
 * Mention System for Echo
 * Handles @mention detection, user lookup, and mention notifications
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
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";

export interface Mention {
  id: string;
  mentionId: string; // Unique ID for the mention
  postId: string;
  postAuthorUid: string;
  postAuthorHandle: string;
  mentionedUid: string;
  mentionedHandle: string;
  mentionText: string; // The full @handle text
  postCaption: string;
  postAudioUrl: string;
  mentionedAt: Timestamp;
  read: boolean;
}

const MENTIONS_COLLECTION = "mentions";

// ── Extract mentions from text ─────────────────────────────────────────────────
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  return [...new Set(mentions)]; // Remove duplicates
}

// ── Get user UID by handle ─────────────────────────────────────────────────────
export async function getUserUidByHandle(handle: string): Promise<string | null> {
  const db = getFirebaseDb();
  const cleanHandle = handle.replace('@', '').toLowerCase();
  
  const usersQuery = query(
    collection(db, "users"),
    where("handle", "==", cleanHandle),
    limit(1)
  );

  const usersSnap = await getDocs(usersQuery);
  if (usersSnap.empty) return null;

  return usersSnap.docs[0].id;
}

// ── Get multiple user UIDs by handles ───────────────────────────────────────────
export async function getUserUidsByHandles(handles: string[]): Promise<Map<string, string>> {
  const db = getFirebaseDb();
  const cleanHandles = handles.map(h => h.replace('@', '').toLowerCase());
  const result = new Map<string, string>();

  if (cleanHandles.length === 0) return result;

  // Firestore 'in' queries are limited to 10 items
  const chunks = [];
  for (let i = 0; i < cleanHandles.length; i += 10) {
    chunks.push(cleanHandles.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const usersQuery = query(
      collection(db, "users"),
      where("handle", "in", chunk)
    );

    const usersSnap = await getDocs(usersQuery);
    usersSnap.forEach(doc => {
      const userData = doc.data();
      result.set(userData.handle || doc.id, doc.id);
    });
  }

  return result;
}

// ── Create mentions for a post ─────────────────────────────────────────────────
export async function createPostMentions(
  postId: string,
  caption: string,
  authorUid: string,
  authorHandle: string,
  audioUrl: string
): Promise<void> {
  const mentions = extractMentions(caption);
  if (mentions.length === 0) return;

  const db = getFirebaseDb();
  const userUidMap = await getUserUidsByHandles(mentions);

  for (const [handle, mentionedUid] of userUidMap.entries()) {
    // Don't mention yourself
    if (mentionedUid === authorUid) continue;

    const mentionId = `${postId}_${mentionedUid}`;
    const mentionRef = doc(db, MENTIONS_COLLECTION, mentionId);

    await setDoc(mentionRef, {
      id: mentionId,
      mentionId,
      postId,
      postAuthorUid: authorUid,
      postAuthorHandle: authorHandle,
      mentionedUid,
      mentionedHandle: `@${handle}`,
      mentionText: `@${handle}`,
      postCaption: caption,
      postAudioUrl: audioUrl,
      mentionedAt: serverTimestamp(),
      read: false,
    });

    // Send notification to mentioned user
    await createNotification(mentionedUid, {
      type: "mention",
      fromUid: authorUid,
      fromHandle: authorHandle,
      postId,
      postCaption: caption,
      text: `${authorHandle} mentioned you in a post`,
    });
  }
}

// ── Remove mentions for a post ─────────────────────────────────────────────────
export async function removePostMentions(postId: string): Promise<void> {
  const db = getFirebaseDb();
  
  const mentionsQuery = query(
    collection(db, MENTIONS_COLLECTION),
    where("postId", "==", postId)
  );

  const mentionsSnap = await getDocs(mentionsQuery);
  for (const doc of mentionsSnap.docs) {
    await deleteDoc(doc.ref);
  }
}

// ── Get mentions for a user ─────────────────────────────────────────────────────
export async function getUserMentions(userId: string, limitCount: number = 50): Promise<Mention[]> {
  const db = getFirebaseDb();
  
  const mentionsQuery = query(
    collection(db, MENTIONS_COLLECTION),
    where("mentionedUid", "==", userId),
    orderBy("mentionedAt", "desc"),
    limit(limitCount)
  );

  const mentionsSnap = await getDocs(mentionsQuery);
  return mentionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Mention[];
}

// ── Subscribe to user mentions (real-time) ─────────────────────────────────────
export function subscribeToUserMentions(userId: string, callback: (mentions: Mention[]) => void): () => void {
  const db = getFirebaseDb();
  
  const mentionsQuery = query(
    collection(db, MENTIONS_COLLECTION),
    where("mentionedUid", "==", userId),
    orderBy("mentionedAt", "desc"),
    limit(50)
  );

  const unsubscribe = onSnapshot(mentionsQuery, (querySnap) => {
    const mentions = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Mention[];
    callback(mentions);
  }, (error) => {
    console.error("[subscribeToUserMentions] Error:", error);
  });

  return unsubscribe;
}

// ── Mark mention as read ───────────────────────────────────────────────────────
export async function markMentionAsRead(mentionId: string): Promise<void> {
  const db = getFirebaseDb();
  const mentionRef = doc(db, MENTIONS_COLLECTION, mentionId);
  
  await updateDoc(mentionRef, {
    read: true,
  });
}

// ── Mark all mentions as read for a user ─────────────────────────────────────────
export async function markAllMentionsAsRead(userId: string): Promise<void> {
  const db = getFirebaseDb();
  
  const mentionsQuery = query(
    collection(db, MENTIONS_COLLECTION),
    where("mentionedUid", "==", userId),
    where("read", "==", false)
  );

  const mentionsSnap = await getDocs(mentionsQuery);
  for (const doc of mentionsSnap.docs) {
    await updateDoc(doc.ref, {
      read: true,
    });
  }
}

// ── Get unread mention count for a user ────────────────────────────────────────
export async function getUnreadMentionCount(userId: string): Promise<number> {
  const db = getFirebaseDb();
  
  const mentionsQuery = query(
    collection(db, MENTIONS_COLLECTION),
    where("mentionedUid", "==", userId),
    where("read", "==", false)
  );

  const mentionsSnap = await getDocs(mentionsQuery);
  return mentionsSnap.size;
}

// ── Parse caption with clickable mentions (returns plain text with mention positions) ─────────────────────────────────────────
export interface MentionMatch {
  text: string;
  isMention: boolean;
  handle?: string;
  startIndex: number;
  endIndex: number;
}

export function parseCaptionWithMentions(caption: string): MentionMatch[] {
  const matches: MentionMatch[] = [];
  const regex = /@(\w+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(caption)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      matches.push({
        text: caption.slice(lastIndex, match.index),
        isMention: false,
        startIndex: lastIndex,
        endIndex: match.index,
      });
    }

    const [fullMatch, handle] = match;
    matches.push({
      text: fullMatch,
      isMention: true,
      handle,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < caption.length) {
    matches.push({
      text: caption.slice(lastIndex),
      isMention: false,
      startIndex: lastIndex,
      endIndex: caption.length,
    });
  }

  return matches;
}
