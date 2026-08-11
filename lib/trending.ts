/**
 * lib/trending.ts
 * ─────────────────────────────────────────────────────
 * Trending Algorithm for Echo
 * Calculates trending scores for posts, hashtags, and topics
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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

export interface TrendingTopic {
  id: string;
  topic: string;
  type: "hashtag" | "keyword" | "category";
  score: number;
  postCount: number;
  engagementCount: number;
  lastUpdated: Timestamp;
  timeWindow: string; // "1h", "6h", "24h", "7d"
}

export interface TrendingPost {
  id: string;
  postId: string;
  caption: string;
  authorUid: string;
  authorHandle: string;
  pulseCount: number;
  reverbCount: number;
  orbitCount: number;
  trendingScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const TRENDING_TOPICS_COLLECTION = "trending_topics";
const TRENDING_POSTS_COLLECTION = "trending_posts";

// ── Calculate trending score for a post ───────────────────────────────────────────
export function calculateTrendingScore(
  pulseCount: number,
  reverbCount: number,
  orbitCount: number,
  createdAt: Timestamp,
  currentTime: Date = new Date()
): number {
  const createdTime = createdAt?.toDate() || new Date();
  const hoursSinceCreation = (currentTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
  
  // Engagement metrics
  const totalEngagement = pulseCount + (reverbCount * 2) + (orbitCount * 3);
  
  // Time decay factor (newer posts get higher scores)
  const timeDecay = Math.exp(-hoursSinceCreation / 24); // 24-hour half-life
  
  // Calculate final score
  const score = totalEngagement * timeDecay * 100;
  
  return Math.round(score);
}

// ── Update trending score for a post ─────────────────────────────────────────────
export async function updatePostTrendingScore(postId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return;
    }
    
    const postData = postSnap.data();
    const trendingScore = calculateTrendingScore(
      postData.pulseCount || 0,
      postData.reverbCount || 0,
      postData.orbitCount || 0,
      postData.createdAt,
      new Date()
    );
    
    // Update trending posts collection
    const trendingRef = doc(db, TRENDING_POSTS_COLLECTION, postId);
    await setDoc(trendingRef, {
      id: postId,
      postId,
      caption: postData.caption,
      authorUid: postData.authorUid,
      authorHandle: postData.authorHandle,
      pulseCount: postData.pulseCount || 0,
      reverbCount: postData.reverbCount || 0,
      orbitCount: postData.orbitCount || 0,
      trendingScore,
      createdAt: postData.createdAt,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("[updatePostTrendingScore] Error:", error);
  }
}

// ── Get trending posts ───────────────────────────────────────────────────────────
export async function getTrendingPosts(limitCount: number = 50): Promise<TrendingPost[]> {
  try {
    const db = getFirebaseDb();
    
    const trendingQuery = query(
      collection(db, TRENDING_POSTS_COLLECTION),
      orderBy("trendingScore", "desc"),
      orderBy("updatedAt", "desc"),
      limit(limitCount)
    );
    
    const trendingSnap = await getDocs(trendingQuery);
    return trendingSnap.docs.map(doc => doc.data() as TrendingPost);
  } catch (error) {
    console.error("[getTrendingPosts] Error:", error);
    return [];
  }
}

// ── Subscribe to trending posts (real-time) ───────────────────────────────────────
export function subscribeToTrendingPosts(
  callback: (posts: TrendingPost[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const trendingQuery = query(
    collection(db, TRENDING_POSTS_COLLECTION),
    orderBy("trendingScore", "desc"),
    limit(50)
  );
  
  const unsubscribe = onSnapshot(trendingQuery, (querySnap) => {
    const posts = querySnap.docs.map(doc => doc.data() as TrendingPost);
    callback(posts);
  }, (error) => {
    console.error("[subscribeToTrendingPosts] Error:", error);
  });
  
  return unsubscribe;
}

// ── Update trending topics (hashtags, keywords) ───────────────────────────────────
export async function updateTrendingTopics(): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get recent posts from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const postsQuery = query(
      collection(db, "posts"),
      where("createdAt", ">=", twentyFourHoursAgo),
      limit(1000)
    );
    
    const postsSnap = await getDocs(postsQuery);
    const posts = postsSnap.docs.map(doc => doc.data());
    
    // Extract hashtags and keywords
    const hashtagCounts: Record<string, { count: number; engagement: number }> = {};
    
    posts.forEach(post => {
      const hashtags = extractHashtags(post.caption);
      const engagement = (post.pulseCount || 0) + (post.reverbCount || 0) + (post.orbitCount || 0);
      
      hashtags.forEach(tag => {
        if (!hashtagCounts[tag]) {
          hashtagCounts[tag] = { count: 0, engagement: 0 };
        }
        hashtagCounts[tag].count += 1;
        hashtagCounts[tag].engagement += engagement;
      });
    });
    
    // Calculate trending scores and update collection
    const batch = writeBatch(db);
    
    Object.entries(hashtagCounts).forEach(([tag, data]) => {
      const topicId = `hashtag_${tag}`;
      const topicRef = doc(db, TRENDING_TOPICS_COLLECTION, topicId);
      
      const score = data.count * 10 + data.engagement;
      
      batch.set(topicRef, {
        id: topicId,
        topic: tag,
        type: "hashtag",
        score,
        postCount: data.count,
        engagementCount: data.engagement,
        lastUpdated: serverTimestamp(),
        timeWindow: "24h",
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("[updateTrendingTopics] Error:", error);
  }
}

// ── Get trending topics ────────────────────────────────────────────────────────────
export async function getTrendingTopics(limitCount: number = 20): Promise<TrendingTopic[]> {
  try {
    const db = getFirebaseDb();
    
    const topicsQuery = query(
      collection(db, TRENDING_TOPICS_COLLECTION),
      orderBy("score", "desc"),
      orderBy("lastUpdated", "desc"),
      limit(limitCount)
    );
    
    const topicsSnap = await getDocs(topicsQuery);
    return topicsSnap.docs.map(doc => doc.data() as TrendingTopic);
  } catch (error) {
    console.error("[getTrendingTopics] Error:", error);
    return [];
  }
}

// ── Subscribe to trending topics (real-time) ──────────────────────────────────────
export function subscribeToTrendingTopics(
  callback: (topics: TrendingTopic[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const topicsQuery = query(
    collection(db, TRENDING_TOPICS_COLLECTION),
    orderBy("score", "desc"),
    limit(20)
  );
  
  const unsubscribe = onSnapshot(topicsQuery, (querySnap) => {
    const topics = querySnap.docs.map(doc => doc.data() as TrendingTopic);
    callback(topics);
  }, (error) => {
    console.error("[subscribeToTrendingTopics] Error:", error);
  });
  
  return unsubscribe;
}

// ── Get trending hashtags specifically ────────────────────────────────────────────
export async function getTrendingHashtags(limitCount: number = 10): Promise<TrendingTopic[]> {
  try {
    const db = getFirebaseDb();
    
    const hashtagsQuery = query(
      collection(db, TRENDING_TOPICS_COLLECTION),
      where("type", "==", "hashtag"),
      orderBy("score", "desc"),
      limit(limitCount)
    );
    
    const hashtagsSnap = await getDocs(hashtagsQuery);
    return hashtagsSnap.docs.map(doc => doc.data() as TrendingTopic);
  } catch (error) {
    console.error("[getTrendingHashtags] Error:", error);
    return [];
  }
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

// ── Manually trigger trending calculation (for scheduled jobs) ───────────────────
export async function recalculateAllTrending(): Promise<void> {
  try {
    // Update all post trending scores
    const db = getFirebaseDb();
    const postsQuery = query(collection(db, "posts"), limit(500));
    const postsSnap = await getDocs(postsQuery);
    
    for (const postDoc of postsSnap.docs) {
      await updatePostTrendingScore(postDoc.id);
    }
    
    // Update trending topics
    await updateTrendingTopics();
  } catch (error) {
    console.error("[recalculateAllTrending] Error:", error);
  }
}

// ── Get posts by trending topic ────────────────────────────────────────────────────
export async function getPostsByTrendingTopic(
  topic: string,
  limitCount: number = 50
): Promise<any[]> {
  try {
    const db = getFirebaseDb();
    
    const postsQuery = query(
      collection(db, "posts"),
      where("caption", "array-contains", `#${topic}`),
      orderBy("pulseCount", "desc"),
      limit(limitCount)
    );
    
    const postsSnap = await getDocs(postsQuery);
    return postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("[getPostsByTrendingTopic] Error:", error);
    return [];
  }
}
