/**
 * lib/comments.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for Post Comments.
 * Supports text comments, nested replies, and likes on comments.
 */

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

const COMMENTS_COLLECTION = "post_comments";

export interface CommentItem {
  id: string;
  postId: string;
  parentId: string | null; // null for top-level comments, string for replies
  authorUid: string;
  authorHandle: string;
  text: string;
  likeCount: number;
  likedBy: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * createComment - Add a new comment to a post
 */
export async function createComment(data: {
  postId: string;
  parentId: string | null;
  authorUid: string;
  authorHandle: string;
  text: string;
}): Promise<string> {
  try {
    const db = getFirebaseDb();
    const commentsRef = collection(db, COMMENTS_COLLECTION);
    
    const docRef = await addDoc(commentsRef, {
      postId: data.postId,
      parentId: data.parentId || null,
      authorUid: data.authorUid,
      authorHandle: data.authorHandle,
      text: data.text,
      likeCount: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Increment post comment count
    try {
      await updateDoc(doc(db, "posts", data.postId), {
        commentCount: increment(1),
      });
    } catch (error) {
      console.error("[createComment] Error updating post comment count:", error);
    }

    return docRef.id;
  } catch (error) {
    console.error("[createComment] Error creating comment:", error);
    throw error;
  }
}

/**
 * subscribeToPostComments - Real-time listener for comments on a post
 */
export function subscribeToPostComments(
  postId: string,
  callback: (comments: CommentItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where("postId", "==", postId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommentItem, "id">),
      }));
      callback(comments);
    },
    (err) => {
      console.error("[subscribeToPostComments] Error:", err.message);
      callback([]);
    }
  );
}

/**
 * toggleLikeComment - Like or unlike a comment
 */
export async function toggleLikeComment(
  commentId: string,
  uid: string,
  currentlyLiked: boolean
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, COMMENTS_COLLECTION, commentId);
    
    if (currentlyLiked) {
      await updateDoc(ref, {
        likeCount: increment(-1),
        likedBy: arrayRemove(uid),
      });
    } else {
      await updateDoc(ref, {
        likeCount: increment(1),
        likedBy: arrayUnion(uid),
      });
    }
  } catch (error) {
    console.error("[toggleLikeComment] Error toggling like:", error);
    throw error;
  }
}

/**
 * deleteComment - Delete a comment
 */
export async function deleteComment(commentId: string, postId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Delete the comment
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    
    // Decrement post comment count
    try {
      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(-1),
      });
    } catch (error) {
      console.error("[deleteComment] Error updating post comment count:", error);
    }
  } catch (error) {
    console.error("[deleteComment] Error deleting comment:", error);
    throw error;
  }
}

/**
 * getCommentsByUser - Get all comments by a specific user
 */
export async function getCommentsByUser(uid: string, maxItems = 50): Promise<CommentItem[]> {
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("authorUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );
    
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CommentItem, "id">),
    }));
  } catch (error) {
    console.error("[getCommentsByUser] Error fetching user comments:", error);
    throw error;
  }
}

/**
 * subscribeToUserComments - Real-time listener for user's comments
 */
export function subscribeToUserComments(
  uid: string,
  callback: (comments: CommentItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where("authorUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommentItem, "id">),
      }));
      callback(comments);
    },
    (err) => {
      console.error("[subscribeToUserComments] Error:", err.message);
      callback([]);
    }
  );
}
