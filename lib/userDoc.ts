/**
 * lib/userDoc.ts
 * ─────────────────────────────────────────────────────
 * Helper to create or fetch the Firestore `users` document
 * for an authenticated Firebase user.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, arrayUnion, arrayRemove, type Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

export interface EchoUser {
  uid:         string;
  handle:      string;
  email:       string;
  displayName: string;
  photoUrl:    string;
  photoURL?:   string;
  avatarUrl?:  string;
  bio?:        string;
  auraScore:   number;
  badges:      string[];
  tags:        string[];
  streak:      number;
  lastActiveDate: string | null;
  freqMap:     Record<string, number>; // Topic -> count
  signalStatus: "ONLINE" | "OFFLINE" | "SIGNAL-OFF";
  lastSignalChange: Timestamp | null;
  vibeRead:    {
    pitch: number;
    tempo: number;
    energy: number;
    clarity: number;
  } | null;
  settings?:   UserSettings;
}

export interface UserSettings {
  // Notifications
  pingPulses: boolean;
  pingReverbs: boolean;
  pingOnFire: boolean;
  pingLockIns: boolean;
  pingStage: boolean;
  // Privacy
  privateAcc: boolean;
  auraVisible: boolean;
  anonMode: boolean;
  lockApproval: boolean;
  // Audio
  audioQuality: string;
  autoTranscribe: boolean;
  autoPlay: boolean;
  // Permissions
  yapControl: string;
  echoControl: string;
  whoCanWire: string;
  // Content filtering
  hiddenWords: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  pingPulses: true,
  pingReverbs: true,
  pingOnFire: true,
  pingLockIns: false,
  pingStage: true,
  privateAcc: false,
  auraVisible: true,
  anonMode: false,
  lockApproval: false,
  audioQuality: "HIGH",
  autoTranscribe: false,
  autoPlay: true,
  yapControl: "EVERYONE",
  echoControl: "EVERYONE",
  whoCanWire: "[ ORBIT ]",
  hiddenWords: [],
};

/** Generate a random anonymous handle like @ANON_4X7K */
function generateAnonHandle(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `@ANON_${suffix}`;
}

/**
 * getOrCreateUserDoc
 * Called after every successful Firebase Auth sign-in.
 * Gracefully handles Firestore permission errors with fallback profile.
 */
export async function getOrCreateUserDoc(firebaseUser: FirebaseUser): Promise<EchoUser> {
  const fallbackUser: EchoUser = {
    uid:         firebaseUser.uid,
    handle:      generateAnonHandle(),
    email:       firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? "",
    photoUrl:    firebaseUser.photoURL ?? "",
    auraScore:   0,
    badges:      [],
    tags:        [],
    streak:      0,
    lastActiveDate: null,
    freqMap:     {},
    signalStatus: "ONLINE",
    lastSignalChange: null,
    vibeRead:    null,
    settings:    DEFAULT_SETTINGS,
  };

  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      // Existing user — bump lastSeen
      try {
        await updateDoc(ref, { lastSeen: serverTimestamp() });
      } catch {}
      return snap.data() as EchoUser;
    }

    // Brand-new user — create the document
    await setDoc(ref, {
      ...fallbackUser,
      createdAt: serverTimestamp(),
      lastSeen:  serverTimestamp(),
      streak: 0,
      lastActiveDate: null,
      tags: [],
      freqMap: {},
      signalStatus: "ONLINE",
      lastSignalChange: null,
      vibeRead: null,
      settings: DEFAULT_SETTINGS,
    });

    return fallbackUser;
  } catch (err: any) {
    console.warn("[Firestore] User doc permission notice (using fallback user):", err.message);
    return fallbackUser;
  }
}

export async function updateUserSettings(uid: string, updates: Partial<UserSettings>): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const settingsUpdate: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    settingsUpdate[`settings.${key}`] = value;
  }
  await updateDoc(ref, settingsUpdate);
}

export async function getUserSettings(uid: string): Promise<UserSettings> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_SETTINGS };
  const data = snap.data();
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

/**
 * analyzeVibeRead
 * Analyze audio blob for vocal biometrics (pitch, tempo, energy, clarity)
 * This is a simplified analysis - in production would use Web Audio API or ML
 */
export async function analyzeVibeRead(audioBlob: Blob): Promise<{
  pitch: number;
  tempo: number;
  energy: number;
  clarity: number;
}> {
  // Simplified analysis based on blob properties
  // In production, this would use Web Audio API for actual analysis
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Calculate basic metrics
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Energy (RMS)
  let sumSquares = 0;
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sumSquares / channelData.length);
  const energy = Math.min(100, rms * 1000); // Normalize to 0-100
  
  // Pitch (simplified zero-crossing rate)
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0 && channelData[i-1] < 0) || 
        (channelData[i] < 0 && channelData[i-1] >= 0)) {
      zeroCrossings++;
    }
  }
  const zeroCrossingRate = zeroCrossings / channelData.length;
  const pitch = Math.min(100, zeroCrossingRate * 10000); // Normalize to 0-100
  
  // Tempo (simplified - based on duration)
  const duration = audioBuffer.duration;
  const tempo = Math.min(100, (1 / duration) * 20); // Normalize to 0-100
  
  // Clarity (signal-to-noise ratio approximation)
  const signalLevel = rms;
  const noiseLevel = 0.001; // Simplified noise floor
  const clarity = Math.min(100, (signalLevel / (signalLevel + noiseLevel)) * 100);
  
  return {
    pitch: Math.round(pitch),
    tempo: Math.round(tempo),
    energy: Math.round(energy),
    clarity: Math.round(clarity),
  };
}

/**
 * updateVibeRead
 * Update user's vocal biometrics
 */
export async function updateVibeRead(uid: string, vibeRead: {
  pitch: number;
  tempo: number;
  energy: number;
  clarity: number;
}): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    vibeRead: vibeRead,
  });
}

/**
 * getVibeRead
 * Get user's vocal biometrics
 */
export async function getVibeRead(uid: string): Promise<{
  pitch: number;
  tempo: number;
  energy: number;
  clarity: number;
} | null> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return null;
  }
  
  const userData = snap.data() as EchoUser;
  return userData.vibeRead || null;
}

/**
 * setSignalStatus
 * Update user's signal status (ONLINE/OFFLINE/SIGNAL-OFF)
 */
export async function setSignalStatus(uid: string, status: "ONLINE" | "OFFLINE" | "SIGNAL-OFF"): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    signalStatus: status,
    lastSignalChange: serverTimestamp(),
  });
}

/**
 * getSignalStatus
 * Get user's current signal status
 */
export async function getSignalStatus(uid: string): Promise<"ONLINE" | "OFFLINE" | "SIGNAL-OFF"> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return "OFFLINE";
  }
  
  const userData = snap.data() as EchoUser;
  return userData.signalStatus || "OFFLINE";
}

/**
 * updateFreqMap
 * Update user's frequency map when they consume content
 */
export async function updateFreqMap(uid: string, topic: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const topicKey = topic.toUpperCase();
  
  // Increment the topic count in freqMap
  await updateDoc(ref, {
    [`freqMap.${topicKey}`]: increment(1),
  });
}

/**
 * getFreqMap
 * Get user's frequency map
 */
export async function getFreqMap(uid: string): Promise<Record<string, number>> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return {};
  }
  
  const userData = snap.data() as EchoUser;
  return userData.freqMap || {};
}

/**
 * addTag
 * Add a tag to user's profile
 */
export async function addTag(uid: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    tags: arrayUnion(tag.toUpperCase()),
  });
}

/**
 * removeTag
 * Remove a tag from user's profile
 */
export async function removeTag(uid: string, tag: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  
  await updateDoc(ref, {
    tags: arrayRemove(tag.toUpperCase()),
  });
}

/**
 * getUserTags
 * Get user's tags
 */
export async function getUserTags(uid: string): Promise<string[]> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return [];
  }
  
  const userData = snap.data() as EchoUser;
  return userData.tags || [];
}

/**
 * incrementStreak
 * Check and increment user's daily streak
 */
export async function incrementStreak(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return 0;
  }
  
  const userData = snap.data() as EchoUser;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastActive = userData.lastActiveDate;
  
  let newStreak = userData.streak || 0;
  
  if (lastActive === today) {
    // Already active today, no change
    return newStreak;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (lastActive === yesterdayStr) {
    // Consecutive day, increment streak
    newStreak += 1;
  } else if (lastActive !== today) {
    // Streak broken or first day, reset to 1
    newStreak = 1;
  }
  
  await updateDoc(ref, {
    streak: newStreak,
    lastActiveDate: today,
    lastSeen: serverTimestamp(),
  });
  
  return newStreak;
}

/**
 * getStreak
 * Get current user streak
 */
export async function getStreak(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return 0;
  }
  
  const userData = snap.data() as EchoUser;
  return userData.streak || 0;
}
