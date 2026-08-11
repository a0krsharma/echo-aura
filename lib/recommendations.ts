/**
 * lib/recommendations.ts
 * ─────────────────────────────────────────────────────
 * Recommendation Engine for Echo
 * Implements personalized feed based on user listening behavior
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface UserListeningHistory {
  id?: string;
  postId: string;
  postAuthorUid: string;
  postAuthorHandle: string;
  postCaption: string;
  postAudioUrl: string;
  postDuration: string;
  postDurationSec: number;
  postHashtags: string[];
  listenedAt: Timestamp;
  listenDuration: number; // How long they listened in seconds
  completed: boolean; // Did they listen to the full audio?
}

export interface PostItem {
  id: string;
  audioUrl: string;
  caption: string;
  authorUid: string;
  authorHandle: string;
  pulseCount: number;
  durationSec?: number;
  createdAt: Timestamp | null;
}

export interface UserPreferences {
  uid: string;
  preferredHashtags: Record<string, number>;
  preferredAuthors: Record<string, number>;
  preferredDurationRange: { min: number; max: number };
  preferredCategories: string[];
  lastUpdated: Timestamp;
}

const LISTENING_HISTORY_COLLECTION = "user_listening_history";
const USER_PREFERENCES_COLLECTION = "user_preferences";

// ── Track user listening behavior ───────────────────────────────────────────────
export async function trackListeningBehavior(
  uid: string,
  postId: string,
  postAuthorUid: string,
  postAuthorHandle: string,
  postCaption: string,
  postAudioUrl: string,
  postDuration: string,
  postDurationSec: number,
  postHashtags: string[],
  listenDuration: number,
  completed: boolean
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    await addDoc(collection(db, LISTENING_HISTORY_COLLECTION), {
      uid,
      postId,
      postAuthorUid,
      postAuthorHandle,
      postCaption,
      postAudioUrl,
      postDuration,
      postDurationSec,
      postHashtags,
      listenedAt: serverTimestamp(),
      listenDuration,
      completed,
    });
    
    // Update user preferences based on this listening event
    await updateUserPreferences(
      uid,
      postHashtags,
      postAuthorUid,
      postDurationSec,
      completed
    );
  } catch (error) {
    console.error("[trackListeningBehavior] Error:", error);
  }
}

// ── Update user preferences ─────────────────────────────────────────────────────
export async function updateUserPreferences(
  uid: string,
  hashtags: string[],
  authorUid: string,
  durationSec: number,
  completed: boolean
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const prefRef = doc(db, USER_PREFERENCES_COLLECTION, uid);
    const prefSnap = await getDoc(prefRef);
    
    if (prefSnap.exists()) {
      const prefData = prefSnap.data() as UserPreferences;
      
      // Update preferred hashtags (weight completed listens more)
      const currentHashtags = prefData.preferredHashtags || {};
      hashtags.forEach(tag => {
        currentHashtags[tag] = (currentHashtags[tag] || 0) + (completed ? 2 : 1);
      });
      
      // Update preferred authors
      const currentAuthors = prefData.preferredAuthors || {};
      currentAuthors[authorUid] = (currentAuthors[authorUid] || 0) + (completed ? 2 : 1);
      
      // Update duration range
      const currentRange = prefData.preferredDurationRange || { min: 0, max: 300 };
      const newMin = Math.min(currentRange.min, durationSec);
      const newMax = Math.max(currentRange.max, durationSec);
      
      await updateDoc(prefRef, {
        preferredHashtags: currentHashtags,
        preferredAuthors: currentAuthors,
        preferredDurationRange: { min: newMin, max: newMax },
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Create new preferences
      const hashtagObj: Record<string, number> = {};
      hashtags.forEach(tag => {
        hashtagObj[tag] = completed ? 2 : 1;
      });
      
      const authorObj: Record<string, number> = {};
      authorObj[authorUid] = completed ? 2 : 1;
      
      await setDoc(prefRef, {
        uid,
        preferredHashtags: hashtagObj,
        preferredAuthors: authorObj,
        preferredDurationRange: { min: durationSec, max: durationSec },
        preferredCategories: [],
        lastUpdated: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("[updateUserPreferences] Error:", error);
  }
}

// ── Get user preferences ─────────────────────────────────────────────────────────
export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  try {
    const db = getFirebaseDb();
    const prefRef = doc(db, USER_PREFERENCES_COLLECTION, uid);
    const prefSnap = await getDoc(prefRef);
    
    if (!prefSnap.exists()) {
      return null;
    }
    
    return prefSnap.data() as UserPreferences;
  } catch (error) {
    console.error("[getUserPreferences] Error:", error);
    return null;
  }
}

// ── Get personalized recommendations ─────────────────────────────────────────────
export async function getPersonalizedRecommendations(
  uid: string,
  limitCount: number = 50
): Promise<any[]> {
  try {
    const db = getFirebaseDb();
    const preferences = await getUserPreferences(uid);
    
    if (!preferences) {
      // Return trending posts if no preferences
      return getTrendingPosts(limitCount);
    }
    
    // Get top preferred hashtags
    const topHashtags = Object.entries(preferences.preferredHashtags || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Get posts with matching hashtags
    const recommendations: any[] = [];
    
    for (const hashtag of topHashtags) {
      if (recommendations.length >= limitCount) break;
      
      const postsQuery = query(
        collection(db, "posts"),
        where("caption", "array-contains", `#${hashtag}`),
        orderBy("createdAt", "desc"),
        limit(Math.min(10, limitCount - recommendations.length))
      );
      
      const postsSnap = await getDocs(postsQuery);
      postsSnap.docs.forEach(doc => {
        if (!recommendations.find(r => r.id === doc.id)) {
          recommendations.push({ id: doc.id, ...doc.data() });
        }
      });
    }
    
    // If we still need more recommendations, get from preferred authors
    if (recommendations.length < limitCount) {
      const topAuthors = Object.entries(preferences.preferredAuthors || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([authorUid]) => authorUid);
      
      for (const authorUid of topAuthors) {
        if (recommendations.length >= limitCount) break;
        
        const postsQuery = query(
          collection(db, "posts"),
          where("authorUid", "==", authorUid),
          orderBy("createdAt", "desc"),
          limit(Math.min(5, limitCount - recommendations.length))
        );
        
        const postsSnap = await getDocs(postsQuery);
        postsSnap.docs.forEach(doc => {
          if (!recommendations.find(r => r.id === doc.id)) {
            recommendations.push({ id: doc.id, ...doc.data() });
          }
        });
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error("[getPersonalizedRecommendations] Error:", error);
    return [];
  }
}

// ── Get trending posts (fallback for recommendations) ───────────────────────────
async function getTrendingPosts(limitCount: number = 50): Promise<PostItem[]> {
  try {
    const db = getFirebaseDb();
    
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("pulseCount", "desc"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const postsSnap = await getDocs(postsQuery);
    return postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostItem));
  } catch (error) {
    console.error("[getTrendingPosts] Error:", error);
    return [];
  }
}

// ── Get user listening history ───────────────────────────────────────────────────
export async function getUserListeningHistory(
  uid: string,
  limitCount: number = 100
): Promise<UserListeningHistory[]> {
  try {
    const db = getFirebaseDb();
    
    const historyQuery = query(
      collection(db, LISTENING_HISTORY_COLLECTION),
      where("uid", "==", uid),
      orderBy("listenedAt", "desc"),
      limit(limitCount)
    );
    
    const historySnap = await getDocs(historyQuery);
    return historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserListeningHistory[];
  } catch (error) {
    console.error("[getUserListeningHistory] Error:", error);
    return [];
  }
}

// ── Subscribe to personalized recommendations (real-time) ───────────────────────
export function subscribeToPersonalizedRecommendations(
  uid: string,
  callback: (posts: PostItem[]) => void
): () => void {
  const db = getFirebaseDb();
  
  // Subscribe to posts and filter client-side based on preferences
  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  
  const unsubscribe = onSnapshot(postsQuery, async (querySnap) => {
    const allPosts = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostItem));
    
    // Get user preferences
    const preferences = await getUserPreferences(uid);
    
    if (!preferences) {
      // Return trending posts
      const trending = allPosts
        .sort((a, b) => (b.pulseCount || 0) - (a.pulseCount || 0))
        .slice(0, 50);
      callback(trending);
      return;
    }
    
    // Score posts based on preferences
    const scoredPosts = allPosts.map(post => {
      let score = 0;
      
      // Check hashtag matches
      const postHashtags = extractHashtags(post.caption);
      postHashtags.forEach(tag => {
        const weight = (preferences.preferredHashtags?.[tag] as number) || 0;
        score += weight;
      });
      
      // Check author match
      const authorWeight = (preferences.preferredAuthors?.[post.authorUid] as number) || 0;
      score += authorWeight * 2;
      
      // Check duration match
      const duration = post.durationSec || 15;
      const { min, max } = preferences.preferredDurationRange || { min: 0, max: 300 };
      if (duration >= min && duration <= max) {
        score += 1;
      }
      
      return { ...post, score };
    });
    
    // Sort by score and return top results
    const recommendations = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    
    callback(recommendations);
  }, (error) => {
    console.error("[subscribeToPersonalizedRecommendations] Error:", error);
  });
  
  return unsubscribe;
}

// ── Helper: Extract hashtags from caption ───────────────────────────────────────
function extractHashtags(caption: string): string[] {
  const regex = /#(\w+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(caption)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// ── Clear user listening history ─────────────────────────────────────────────────
export async function clearListeningHistory(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    const historyQuery = query(
      collection(db, LISTENING_HISTORY_COLLECTION),
      where("uid", "==", uid)
    );
    
    const historySnap = await getDocs(historyQuery);
    
    const batch = writeBatch(db);
    historySnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error("[clearListeningHistory] Error:", error);
  }
}

// ── Reset user preferences ─────────────────────────────────────────────────────────
export async function resetUserPreferences(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const prefRef = doc(db, USER_PREFERENCES_COLLECTION, uid);
    await deleteDoc(prefRef);
  } catch (error) {
    console.error("[resetUserPreferences] Error:", error);
  }
}
