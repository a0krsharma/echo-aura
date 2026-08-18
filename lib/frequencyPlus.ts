/**
 * lib/frequencyPlus.ts
 * ─────────────────────────────────────────────────────
 * Core Firestore & Cloudinary Service for FREQUENCY+
 * - 100% Freemium Listening (No Listener Paywalls)
 * - Rigorous Proof-of-Work Creator Clearance
 * - 15-Minute (900s) Daily Upload Quota Limiter
 * - Cloudinary-Exclusive Audio Storage (Zero Firebase Storage)
 * - Internal Proof-of-Transmission Volt Yield Mining & Spending Economy
 * - Interactive Audio Player with Timestamped Voice Replies
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  increment,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface FrequencyPlusEpisode {
  id: string;
  creatorUid: string;
  creatorHandle: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSeconds: number; // Max 900s (15 min)
  sizeBytes?: number;
  category: string;
  tags?: string[];
  metrics: {
    listens: number;
    pulses: number;
    voiceReplies: number;
    shares: number;
  };
  totalVoltsGenerated: number;
  createdAt: Timestamp | null;
}

export interface TimestampedVoiceReply {
  id: string;
  episodeId: string;
  uid: string;
  handle: string;
  audioUrl: string;
  durationSeconds: number;
  timestampSeconds: number;
  createdAt: Timestamp | null;
}

export interface UserMetrics {
  orbiters_count: number;          // Follower count (Target: 50)
  pulses_received: number;         // Total likes across audio posts (Target: 200)
  total_shares: number;            // Any share action triggered (Target: 100)
  rooms_and_stages_hosted: number; // Tally of live rooms/stages created (Target: 20)
  own_room_shares: number;         // Shares while host of active room (Target: 20)
  is_verified_creator?: boolean;
}

export interface ClearanceStatus {
  isEligible: boolean;
  progressPercent: number;
  goals: {
    orbiters: { current: number; target: number; met: boolean };
    pulses: { current: number; target: number; met: boolean };
    shares: { current: number; target: number; met: boolean };
    hosted: { current: number; target: number; met: boolean };
    ownShares: { current: number; target: number; met: boolean };
  };
}

/**
 * Target Thresholds for Tier 1 Creator Clearance
 */
export const CLEARANCE_GOALS = {
  ORBITERS: 50,
  PULSES: 200,
  SHARES: 100,
  HOSTED: 20,
  OWN_SHARES: 20,
};

/**
 * checkFrequencyPlusClearance
 * Evaluates whether a user qualifies to unlock the /frequency-plus/create studio.
 */
export function checkFrequencyPlusClearance(metrics: Partial<UserMetrics> = {}): ClearanceStatus {
  const orbiters = metrics.orbiters_count || 0;
  const pulses = metrics.pulses_received || 0;
  const shares = metrics.total_shares || 0;
  const hosted = metrics.rooms_and_stages_hosted || 0;
  const ownShares = metrics.own_room_shares || 0;

  if (metrics.is_verified_creator) {
    return {
      isEligible: true,
      progressPercent: 100,
      goals: {
        orbiters: { current: orbiters, target: CLEARANCE_GOALS.ORBITERS, met: true },
        pulses: { current: pulses, target: CLEARANCE_GOALS.PULSES, met: true },
        shares: { current: shares, target: CLEARANCE_GOALS.SHARES, met: true },
        hosted: { current: hosted, target: CLEARANCE_GOALS.HOSTED, met: true },
        ownShares: { current: ownShares, target: CLEARANCE_GOALS.OWN_SHARES, met: true },
      },
    };
  }

  const orbitMet = orbiters >= CLEARANCE_GOALS.ORBITERS;
  const pulseMet = pulses >= CLEARANCE_GOALS.PULSES;
  const shareMet = shares >= CLEARANCE_GOALS.SHARES;
  const hostMet = hosted >= CLEARANCE_GOALS.HOSTED;
  const ownShareMet = ownShares >= CLEARANCE_GOALS.OWN_SHARES;

  const orbitScore = Math.min(orbiters / CLEARANCE_GOALS.ORBITERS, 1);
  const pulseScore = Math.min(pulses / CLEARANCE_GOALS.PULSES, 1);
  const shareScore = Math.min(shares / CLEARANCE_GOALS.SHARES, 1);
  const hostScore = Math.min(hosted / CLEARANCE_GOALS.HOSTED, 1);
  const ownShareScore = Math.min(ownShares / CLEARANCE_GOALS.OWN_SHARES, 1);

  const progressPercent = Math.round(
    ((orbitScore + pulseScore + shareScore + hostScore + ownShareScore) / 5) * 100
  );

  const isEligible = orbitMet && pulseMet && shareMet && hostMet && ownShareMet;

  return {
    isEligible,
    progressPercent,
    goals: {
      orbiters: { current: orbiters, target: CLEARANCE_GOALS.ORBITERS, met: orbitMet },
      pulses: { current: pulses, target: CLEARANCE_GOALS.PULSES, met: pulseMet },
      shares: { current: shares, target: CLEARANCE_GOALS.SHARES, met: shareMet },
      hosted: { current: hosted, target: CLEARANCE_GOALS.HOSTED, met: hostMet },
      ownShares: { current: ownShares, target: CLEARANCE_GOALS.OWN_SHARES, met: ownShareMet },
    },
  };
}

/**
 * checkDailyQuota
 * Checks if creator has upload bandwidth remaining in the current 24-hour window (Max 900 seconds = 15 mins).
 */
export async function checkDailyQuota(
  creatorUid: string,
  incomingDurationSecs: number
): Promise<{ allowed: boolean; remainingSeconds: number; message?: string }> {
  const MAX_DAILY_SECONDS = 900; // 15 minutes
  if (incomingDurationSecs > MAX_DAILY_SECONDS) {
    return {
      allowed: false,
      remainingSeconds: 0,
      message: `[ FILE EXCEEDS 15-MINUTE CAP ] Duration is ${Math.round(incomingDurationSecs / 60)}m. Condense to 15m maximum.`,
    };
  }

  const db = getFirebaseDb();
  const oneDayAgoSec = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  try {
    const q = query(
      collection(db, "frequency_plus_episodes"),
      where("creatorUid", "==", creatorUid),
      limit(20)
    );
    const snap = await getDocs(q);

    let usedSeconds = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      const createdAtSec = data.createdAt?.seconds || 0;
      if (createdAtSec >= oneDayAgoSec) {
        usedSeconds += data.durationSeconds || 0;
      }
    });

    const remainingSeconds = Math.max(0, MAX_DAILY_SECONDS - usedSeconds);

    if (incomingDurationSecs > remainingSeconds) {
      const remMin = Math.floor(remainingSeconds / 60);
      const remSec = remainingSeconds % 60;
      return {
        allowed: false,
        remainingSeconds,
        message: `[ DAILY QUOTA EXCEEDED ] You have ${remMin}m ${remSec}s remaining in your 24h window.`,
      };
    }

    return { allowed: true, remainingSeconds };
  } catch (err) {
    console.warn("[Frequency+] Daily quota check fallback:", err);
    return { allowed: true, remainingSeconds: MAX_DAILY_SECONDS };
  }
}

/**
 * logShareAction
 * Tracks global shares and own-room shares for Proof-of-Work clearance telemetry.
 */
export async function logShareAction(uid: string, isHostOfRoom: boolean = false): Promise<void> {
  if (!uid) return;
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, "users", uid);
    const updates: Record<string, any> = {
      "metrics.total_shares": increment(1),
    };
    if (isHostOfRoom) {
      updates["metrics.own_room_shares"] = increment(1);
    }
    await updateDoc(userRef, updates);
  } catch (err) {
    console.warn("[Frequency+] logShareAction error:", err);
  }
}

/**
 * calculateVoltYield
 * Computes Volts mined: (Listens * 0.1) + (Pulses * 0.5) + (Voice Replies * 2.0)
 */
export function calculateVoltYield(metrics: {
  listens: number;
  pulses: number;
  voiceReplies: number;
}): number {
  const yieldScore = metrics.listens * 0.1 + metrics.pulses * 0.5 + metrics.voiceReplies * 2.0;
  return Math.floor(yieldScore);
}

/**
 * subscribeToEpisodes
 * Real-time listener for Frequency+ transmissions
 */
export function subscribeToEpisodes(
  category: string = "ALL",
  callback: (episodes: FrequencyPlusEpisode[]) => void
): () => void {
  const db = getFirebaseDb();
  let q = query(
    collection(db, "frequency_plus_episodes"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  if (category !== "ALL") {
    q = query(
      collection(db, "frequency_plus_episodes"),
      where("category", "==", category),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const metrics = {
          listens: data.metrics?.listens || data.listensCount || 0,
          pulses: data.metrics?.pulses || data.pulsesCount || 0,
          voiceReplies: data.metrics?.voiceReplies || data.voiceRepliesCount || 0,
          shares: data.metrics?.shares || 0,
        };
        const totalVoltsGenerated = data.totalVoltsGenerated || calculateVoltYield(metrics);
        return {
          id: d.id,
          creatorUid: data.creatorUid || "",
          creatorHandle: data.creatorHandle || "@CREATOR",
          title: data.title || "UNTITLED TRANSMISSION",
          description: data.description || "",
          audioUrl: data.audioUrl || "",
          durationSeconds: data.durationSeconds || 300,
          sizeBytes: data.sizeBytes || 0,
          category: data.category || "GENERAL",
          tags: data.tags || [],
          metrics,
          totalVoltsGenerated,
          createdAt: data.createdAt || null,
        } as FrequencyPlusEpisode;
      });

      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(list);
    },
    (err) => {
      console.warn("[Frequency+] Episodes fetch warning:", err);
      callback([]);
    }
  );
}

/**
 * getEpisodeById
 */
export async function getEpisodeById(episodeId: string): Promise<FrequencyPlusEpisode | null> {
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "frequency_plus_episodes", episodeId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const metrics = {
      listens: data.metrics?.listens || data.listensCount || 0,
      pulses: data.metrics?.pulses || data.pulsesCount || 0,
      voiceReplies: data.metrics?.voiceReplies || data.voiceRepliesCount || 0,
      shares: data.metrics?.shares || 0,
    };
    return {
      id: snap.id,
      creatorUid: data.creatorUid || "",
      creatorHandle: data.creatorHandle || "@CREATOR",
      title: data.title || "UNTITLED TRANSMISSION",
      description: data.description || "",
      audioUrl: data.audioUrl || "",
      durationSeconds: data.durationSeconds || 300,
      sizeBytes: data.sizeBytes || 0,
      category: data.category || "GENERAL",
      tags: data.tags || [],
      metrics,
      totalVoltsGenerated: data.totalVoltsGenerated || calculateVoltYield(metrics),
      createdAt: data.createdAt || null,
    } as FrequencyPlusEpisode;
  } catch (err) {
    console.error("[Frequency+] getEpisodeById error:", err);
    return null;
  }
}

/**
 * createEpisode
 * Publishes a 15-minute transmission to Frequency+ (Using Cloudinary URL)
 */
export async function createEpisode(data: {
  creatorUid: string;
  creatorHandle: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSeconds: number;
  sizeBytes?: number;
  category: string;
  tags?: string[];
}): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, "frequency_plus_episodes"), {
    ...data,
    metrics: {
      listens: 0,
      pulses: 0,
      voiceReplies: 0,
      shares: 0,
    },
    totalVoltsGenerated: 0,
    createdAt: serverTimestamp(),
  });

  // Credit 50 Volts & 50 Aura to creator for publishing transmission
  try {
    await updateDoc(doc(db, "users", data.creatorUid), {
      volts: increment(50),
      auraScore: increment(50),
      "metrics.echoes_published": increment(1),
    });
  } catch {}

  return ref.id;
}

/**
 * recordEpisodeListen
 */
export async function recordEpisodeListen(episodeId: string, creatorUid?: string): Promise<void> {
  if (!episodeId) return;
  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "frequency_plus_episodes", episodeId), {
      "metrics.listens": increment(1),
    });
    // Passively mine 1 Volt for creator every 10 listens
    if (creatorUid) {
      await updateDoc(doc(db, "users", creatorUid), {
        volts: increment(1),
      });
    }
  } catch {}
}

/**
 * pulseEpisode
 */
export async function pulseEpisode(episodeId: string, creatorUid?: string): Promise<void> {
  if (!episodeId) return;
  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "frequency_plus_episodes", episodeId), {
      "metrics.pulses": increment(1),
    });
    if (creatorUid) {
      await updateDoc(doc(db, "users", creatorUid), {
        volts: increment(1),
        auraScore: increment(5),
        "metrics.pulses_received": increment(1),
      });
    }
  } catch {}
}

/**
 * subscribeToTimestampedVoiceReplies
 */
export function subscribeToTimestampedVoiceReplies(
  episodeId: string,
  callback: (replies: TimestampedVoiceReply[]) => void
): () => void {
  if (!episodeId) {
    callback([]);
    return () => {};
  }
  const db = getFirebaseDb();
  const q = query(
    collection(db, "frequency_plus_episodes", episodeId, "voice_replies"),
    orderBy("timestampSeconds", "asc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TimestampedVoiceReply, "id">),
      }));
      callback(list);
    },
    () => callback([])
  );
}

/**
 * addTimestampedVoiceReply
 */
export async function addTimestampedVoiceReply(
  episodeId: string,
  creatorUid: string,
  reply: {
    uid: string;
    handle: string;
    audioUrl: string;
    durationSeconds: number;
    timestampSeconds: number;
  }
): Promise<void> {
  const db = getFirebaseDb();
  await addDoc(collection(db, "frequency_plus_episodes", episodeId, "voice_replies"), {
    ...reply,
    createdAt: serverTimestamp(),
  });

  try {
    await updateDoc(doc(db, "frequency_plus_episodes", episodeId), {
      "metrics.voiceReplies": increment(1),
    });
    // High engagement: award 2 Volts to creator for voice interaction
    if (creatorUid) {
      await updateDoc(doc(db, "users", creatorUid), {
        volts: increment(2),
        auraScore: increment(10),
      });
    }
  } catch {}
}
