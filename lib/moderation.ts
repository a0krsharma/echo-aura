/**
 * lib/moderation.ts
 * ─────────────────────────────────────────────────────
 * Content Moderation System for Echo
 * AI-powered audio content filtering and moderation queue
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

export interface ModerationFlag {
  id: string;
  contentType: "post" | "comment" | "whisper" | "wire" | "room";
  contentId: string;
  flagType: "spam" | "harassment" | "hate_speech" | "explicit" | "misinformation" | "other";
  severity: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "approved" | "rejected";
  flaggedBy: string;
  flaggedByHandle: string;
  reason: string;
  aiConfidence: number; // 0-1 confidence score from AI moderation
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const MODERATION_FLAGS_COLLECTION = "moderation_flags";

// ── Flag content for moderation ───────────────────────────────────────────────────
export async function flagContent(
  contentType: ModerationFlag["contentType"],
  contentId: string,
  flagType: ModerationFlag["flagType"],
  severity: ModerationFlag["severity"],
  flaggedBy: string,
  flaggedByHandle: string,
  reason: string,
  aiConfidence: number = 0.5
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const flagRef = doc(collection(db, MODERATION_FLAGS_COLLECTION));
    const flagId = flagRef.id;
    
    await setDoc(flagRef, {
      id: flagId,
      contentType,
      contentId,
      flagType,
      severity,
      status: "pending",
      flaggedBy,
      flaggedByHandle,
      reason,
      aiConfidence,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return flagId;
  } catch (error) {
    console.error("[flagContent] Error:", error);
    throw error;
  }
}

// ── Get pending moderation flags ─────────────────────────────────────────────────
export async function getPendingFlags(limitCount: number = 50): Promise<ModerationFlag[]> {
  try {
    const db = getFirebaseDb();
    
    const flagsQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("status", "==", "pending"),
      orderBy("severity", "desc"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const flagsSnap = await getDocs(flagsQuery);
    return flagsSnap.docs.map(doc => doc.data() as ModerationFlag);
  } catch (error) {
    console.error("[getPendingFlags] Error:", error);
    return [];
  }
}

// ── Subscribe to pending flags (real-time) ───────────────────────────────────────
export function subscribeToPendingFlags(
  callback: (flags: ModerationFlag[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const flagsQuery = query(
    collection(db, MODERATION_FLAGS_COLLECTION),
    where("status", "==", "pending"),
    orderBy("severity", "desc"),
    limit(50)
  );
  
  const unsubscribe = onSnapshot(flagsQuery, (querySnap) => {
    const flags = querySnap.docs.map(doc => doc.data() as ModerationFlag);
    callback(flags);
  }, (error) => {
    console.error("[subscribeToPendingFlags] Error:", error);
  });
  
  return unsubscribe;
}

// ── Review moderation flag ───────────────────────────────────────────────────────
export async function reviewFlag(
  flagId: string,
  reviewerUid: string,
  action: "approve" | "reject"
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const flagRef = doc(db, MODERATION_FLAGS_COLLECTION, flagId);
    
    await updateDoc(flagRef, {
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // If approved, take action on the content
    if (action === "approve") {
      const flagSnap = await getDoc(flagRef);
      const flagData = flagSnap.data() as ModerationFlag;
      await takeModerationAction(flagData);
    }
  } catch (error) {
    console.error("[reviewFlag] Error:", error);
    throw error;
  }
}

// ── Take moderation action on content ───────────────────────────────────────────
async function takeModerationAction(flag: ModerationFlag): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    switch (flag.contentType) {
      case "post":
        // Delete or hide the post
        await updateDoc(doc(db, "posts", flag.contentId), {
          isHidden: true,
          moderationFlagId: flag.id,
        });
        break;
      
      case "comment":
        // Delete the comment
        await deleteDoc(doc(db, "comments", flag.contentId));
        break;
      
      case "whisper":
      case "wire":
        // Delete the whisper/wire document if present (support both collections during migration)
        try {
          const wRef = doc(db, "whispers", flag.contentId);
          const wSnap = await getDoc(wRef);
          if (wSnap.exists()) {
            await deleteDoc(wRef);
            break;
          }
        } catch (e) {
          console.warn("[takeModerationAction] delete whisper check failed:", e);
        }

        try {
          const wireRef = doc(db, "wire", flag.contentId);
          const wireSnap = await getDoc(wireRef);
          if (wireSnap.exists()) {
            await deleteDoc(wireRef);
            break;
          }
        } catch (e) {
          console.warn("[takeModerationAction] delete wire check failed:", e);
        }

        // If neither exists, just log
        console.warn("[takeModerationAction] no whisper/wire doc found for", flag.contentId);
        break;
      
      case "room":
        // Close or suspend the room
        await updateDoc(doc(db, "rooms", flag.contentId), {
          isSuspended: true,
          moderationFlagId: flag.id,
        });
        break;
    }
  } catch (error) {
    console.error("[takeModerationAction] Error:", error);
  }
}

// ── Get moderation stats ───────────────────────────────────────────────────────
export async function getModerationStats(): Promise<{
  total: number;
  pending: number;
  reviewed: number;
  approved: number;
  rejected: number;
}> {
  try {
    const db = getFirebaseDb();
    
    const totalSnap = await getDocs(collection(db, MODERATION_FLAGS_COLLECTION));
    const total = totalSnap.size;
    
    const pendingQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("status", "==", "pending")
    );
    const pendingSnap = await getDocs(pendingQuery);
    const pending = pendingSnap.size;
    
    const reviewedQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("status", "in", ["approved", "rejected"])
    );
    const reviewedSnap = await getDocs(reviewedQuery);
    const reviewed = reviewedSnap.size;
    
    const approvedQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("status", "==", "approved")
    );
    const approvedSnap = await getDocs(approvedQuery);
    const approved = approvedSnap.size;
    
    const rejectedQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("status", "==", "rejected")
    );
    const rejectedSnap = await getDocs(rejectedQuery);
    const rejected = rejectedSnap.size;
    
    return { total, pending, reviewed, approved, rejected };
  } catch (error) {
    console.error("[getModerationStats] Error:", error);
    return { total: 0, pending: 0, reviewed: 0, approved: 0, rejected: 0 };
  }
}

// ── Auto-moderate content using AI (placeholder) ───────────────────────────────────
export async function autoModerateContent(
  contentType: ModerationFlag["contentType"],
  contentId: string,
  contentText: string,
  authorUid: string,
  authorHandle: string
): Promise<void> {
  try {
    // This is a placeholder for AI moderation
    // In production, this would call an AI content moderation API
    // For now, we'll use basic keyword detection
    
    const prohibitedWords = ["spam", "abuse", "hate", "violence"];
    const foundProhibited = prohibitedWords.some(word => 
      contentText.toLowerCase().includes(word)
    );
    
    if (foundProhibited) {
      await flagContent(
        contentType,
        contentId,
        "explicit",
        "medium",
        "system",
        "AI Moderator",
        "Auto-flagged by content filter",
        0.8
      );
    }
  } catch (error) {
    console.error("[autoModerateContent] Error:", error);
  }
}

// ── Get user's moderation history ───────────────────────────────────────────────
export async function getUserModerationHistory(
  uid: string,
  limitCount: number = 50
): Promise<ModerationFlag[]> {
  try {
    const db = getFirebaseDb();
    
    const flagsQuery = query(
      collection(db, MODERATION_FLAGS_COLLECTION),
      where("flaggedBy", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const flagsSnap = await getDocs(flagsQuery);
    return flagsSnap.docs.map(doc => doc.data() as ModerationFlag);
  } catch (error) {
    console.error("[getUserModerationHistory] Error:", error);
    return [];
  }
}

// ── Bulk approve/reject flags ───────────────────────────────────────────────────
export async function bulkReviewFlags(
  flagIds: string[],
  reviewerUid: string,
  action: "approve" | "reject"
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    
    flagIds.forEach(flagId => {
      const flagRef = doc(db, MODERATION_FLAGS_COLLECTION, flagId);
      batch.update(flagRef, {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: reviewerUid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("[bulkReviewFlags] Error:", error);
    throw error;
  }
}
