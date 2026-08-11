/**
 * lib/rateLimit.ts
 * ─────────────────────────────────────────────────────
 * Rate Limiting System for Echo
 * API abuse prevention and per-user limits
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  where,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitState {
  uid: string;
  endpoint: string;
  requestCount: number;
  windowStart: Timestamp;
  blockedUntil: Timestamp | null;
}

const RATE_LIMIT_COLLECTION = "rate_limits";

// Default rate limit configurations per endpoint
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  "create_post": { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 posts per hour
  "create_comment": { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 comments per hour
  "send_whisper": { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 whispers per hour
  "create_room": { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 rooms per hour
  "vote_clash": { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 votes per hour
  "default": { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 requests per hour
};

// ── Check if user is rate limited ─────────────────────────────────────────────────
export async function checkRateLimit(
  uid: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Timestamp | null }> {
  try {
    const db = getFirebaseDb();
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS["default"];
    
    const rateLimitRef = doc(db, RATE_LIMIT_COLLECTION, `${uid}_${endpoint}`);
    const rateLimitSnap = await getDoc(rateLimitRef);
    
    const now = new Date();
    
    if (!rateLimitSnap.exists()) {
      // First request - create rate limit state
      await setDoc(rateLimitRef, {
        uid,
        endpoint,
        requestCount: 1,
        windowStart: serverTimestamp(),
        blockedUntil: null,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: null,
      };
    }
    
    const state = rateLimitSnap.data() as RateLimitState;
    const windowStart = state.windowStart?.toDate() || new Date();
    const blockedUntil = state.blockedUntil?.toDate();
    
    // Check if user is currently blocked
    if (blockedUntil && now < blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: state.blockedUntil,
      };
    }
    
    // Check if window has expired
    const windowElapsed = now.getTime() - windowStart.getTime();
    if (windowElapsed > config.windowMs) {
      // Reset window
      await updateDoc(rateLimitRef, {
        requestCount: 1,
        windowStart: serverTimestamp(),
        blockedUntil: null,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: null,
      };
    }
    
    // Check if user has exceeded limit
    if (state.requestCount >= config.maxRequests) {
      // Block user for the remainder of the window
      const blockUntil = new Date(windowStart.getTime() + config.windowMs);
      await updateDoc(rateLimitRef, {
        blockedUntil: blockUntil,
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: state.blockedUntil,
      };
    }
    
    // Increment request count
    await updateDoc(rateLimitRef, {
      requestCount: increment(1),
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - state.requestCount - 1,
      resetAt: state.blockedUntil,
    };
  } catch (error) {
    console.error("[checkRateLimit] Error:", error);
    // Allow request on error (fail open)
    return { allowed: true, remaining: 0, resetAt: null };
  }
}

// ── Get rate limit status for user ───────────────────────────────────────────────
export async function getRateLimitStatus(
  uid: string,
  endpoint: string
): Promise<RateLimitState | null> {
  try {
    const db = getFirebaseDb();
    const rateLimitRef = doc(db, RATE_LIMIT_COLLECTION, `${uid}_${endpoint}`);
    const rateLimitSnap = await getDoc(rateLimitRef);
    
    if (!rateLimitSnap.exists()) {
      return null;
    }
    
    return rateLimitSnap.data() as RateLimitState;
  } catch (error) {
    console.error("[getRateLimitStatus] Error:", error);
    return null;
  }
}

// ── Reset rate limit for user (admin function) ─────────────────────────────────────
export async function resetRateLimit(uid: string, endpoint: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const rateLimitRef = doc(db, RATE_LIMIT_COLLECTION, `${uid}_${endpoint}`);
    await updateDoc(rateLimitRef, {
      requestCount: 0,
      windowStart: serverTimestamp(),
      blockedUntil: null,
    });
  } catch (error) {
    console.error("[resetRateLimit] Error:", error);
  }
}

// ── Get all rate limit states for user ─────────────────────────────────────────────
export async function getUserRateLimits(uid: string): Promise<RateLimitState[]> {
  try {
    const db = getFirebaseDb();
    
    const limitsQuery = query(
      collection(db, RATE_LIMIT_COLLECTION),
      where("uid", "==", uid)
    );
    
    const limitsSnap = await getDocs(limitsQuery);
    return limitsSnap.docs.map(doc => doc.data() as RateLimitState);
  } catch (error) {
    console.error("[getUserRateLimits] Error:", error);
    return [];
  }
}

// ── Clean up expired rate limit states (maintenance function) ─────────────────────
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    const limitsQuery = query(collection(db, RATE_LIMIT_COLLECTION));
    const limitsSnap = await getDocs(limitsQuery);
    
    const now = new Date();
    const expiredDocs: string[] = [];
    
    limitsSnap.docs.forEach(doc => {
      const state = doc.data() as RateLimitState;
      const windowStart = state.windowStart?.toDate() || new Date();
      const config = RATE_LIMIT_CONFIGS[state.endpoint] || RATE_LIMIT_CONFIGS["default"];
      
      // If window has expired and no active block, mark for cleanup
      const windowElapsed = now.getTime() - windowStart.getTime();
      const blockedUntil = state.blockedUntil?.toDate();
      
      if (windowElapsed > config.windowMs * 2 && (!blockedUntil || now > blockedUntil)) {
        expiredDocs.push(doc.id);
      }
    });
    
    // Delete expired documents
    const batch = writeBatch(db);
    expiredDocs.forEach(docId => {
      batch.delete(doc(db, RATE_LIMIT_COLLECTION, docId));
    });
    
    if (expiredDocs.length > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("[cleanupExpiredRateLimits] Error:", error);
  }
}

// ── Middleware helper for API routes ─────────────────────────────────────────────
export function createRateLimitMiddleware(endpoint: string) {
  return async (uid: string): Promise<{ allowed: boolean; error?: string }> => {
    const result = await checkRateLimit(uid, endpoint);
    
    if (!result.allowed) {
      return {
        allowed: false,
        error: "Rate limit exceeded. Please try again later.",
      };
    }
    
    return { allowed: true };
  };
}

// ── Get rate limit configuration for endpoint ─────────────────────────────────────
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS["default"];
}

// ── Set custom rate limit configuration ───────────────────────────────────────────
export function setRateLimitConfig(endpoint: string, config: RateLimitConfig): void {
  RATE_LIMIT_CONFIGS[endpoint] = config;
}
