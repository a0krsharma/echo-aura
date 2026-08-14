/**
 * lib/clashes.ts
 * ─────────────────────────────────────────────────────
 * Firestore service for [ STAGE ] (Clashes / Debates).
 * Collection: "clashes"
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  deleteDoc,
  getDoc,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface ClashItem {
  id:           string;
  title:        string;
  topic:        string;
  sideA:        { handle: string; position: string; votes: number };
  sideB:        { handle: string; position: string; votes: number };
  listeners:    number;
  status:       "live" | "upcoming" | "ended";
  createdAt:    Timestamp | null;
  // Timer fields
  timerEnabled: boolean;
  timerDuration: number; // Total duration in seconds per side
  currentSide: "A" | "B" | null;
  sideATimeRemaining: number;
  sideBTimeRemaining: number;
  timerStartedAt: Timestamp | null;
  timerPausedAt: Timestamp | null;
  // Q&A fields
  qaEnabled: boolean;
  qaModerated: boolean;
}

export interface ClashQuestion {
  id: string;
  clashId: string;
  question: string;
  askedBy: string; // User handle
  askedByUid: string;
  upvotes: number;
  upvotedBy: string[];
  answered: boolean;
  answeredBy: "A" | "B" | null;
  answeredAt: Timestamp | null;
  createdAt: Timestamp;
}

/**
 * createClash
 * Launch a live clash/debate doc in Firestore.
 */
export async function createClash(data: {
  title:    string;
  topic:    string;
  handleA:  string;
  posA:     string;
  handleB:  string;
  posB:     string;
  timerDuration?: number; // Optional timer duration in seconds
}): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "clashes"), {
    title:     data.title,
    topic:     data.topic,
    sideA:     { handle: data.handleA, position: data.posA, votes: 0 },
    sideB:     { handle: data.handleB, position: data.posB, votes: 0 },
    listeners: 1,
    status:    "live",
    createdAt: serverTimestamp(),
    // Timer fields
    timerEnabled: !!data.timerDuration,
    timerDuration: data.timerDuration || 300, // Default 5 minutes
    currentSide: null,
    sideATimeRemaining: data.timerDuration || 300,
    sideBTimeRemaining: data.timerDuration || 300,
    timerStartedAt: null,
    timerPausedAt: null,
    // Q&A fields
    qaEnabled: false,
    qaModerated: true,
  });

  return docRef.id;
}

/**
 * subscribeToClashes
 * Stream live and upcoming clashes from Firestore.
 */
export function subscribeToClashes(
  callback: (clashes: ClashItem[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(collection(db, "clashes"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const items: ClashItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClashItem, "id">),
    }));
    callback(items);
  }, () => callback([]));
}

/**
 * voteOnClash
 * Vote for Side A or Side B in a debate.
 */
export async function voteOnClash(clashId: string, side: "A" | "B") {
  const db = getFirebaseDb();
  const ref = doc(db, "clashes", clashId);

  if (side === "A") {
    await updateDoc(ref, { "sideA.votes": increment(1) });
  } else {
    await updateDoc(ref, { "sideB.votes": increment(1) });
  }
}

/**
 * deleteClash
 * Delete a clash/debate.
 */
export async function deleteClash(clashId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "clashes", clashId));
}

// ── Debate Timer Functions ───────────────────────────────────────────────────────

/**
 * startClashTimer
 * Start the debate timer for a specific side
 */
export async function startClashTimer(clashId: string, side: "A" | "B"): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      currentSide: side,
      timerStartedAt: serverTimestamp(),
      timerPausedAt: null,
    });
  } catch (error) {
    console.error("[startClashTimer] Error:", error);
    throw error;
  }
}

/**
 * pauseClashTimer
 * Pause the current debate timer
 */
export async function pauseClashTimer(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      timerPausedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[pauseClashTimer] Error:", error);
    throw error;
  }
}

/**
 * resumeClashTimer
 * Resume the paused debate timer
 */
export async function resumeClashTimer(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      timerPausedAt: null,
    });
  } catch (error) {
    console.error("[resumeClashTimer] Error:", error);
    throw error;
  }
}

/**
 * switchClashTimerSide
 * Switch the timer from one side to the other
 */
export async function switchClashTimerSide(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    // This will be handled by the client-side timer logic
    // The server just records the switch
    await updateDoc(ref, {
      timerStartedAt: serverTimestamp(),
      timerPausedAt: null,
    });
  } catch (error) {
    console.error("[switchClashTimerSide] Error:", error);
    throw error;
  }
}

/**
 * updateClashTimer
 * Update the remaining time for a side (called periodically by client)
 */
export async function updateClashTimer(
  clashId: string,
  side: "A" | "B",
  timeRemaining: number
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    const field = side === "A" ? "sideATimeRemaining" : "sideBTimeRemaining";
    
    await updateDoc(ref, {
      [field]: timeRemaining,
    });
  } catch (error) {
    console.error("[updateClashTimer] Error:", error);
    throw error;
  }
}

/**
 * resetClashTimer
 * Reset the timer to initial duration
 */
export async function resetClashTimer(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    const clashSnap = await getDoc(ref);
    if (!clashSnap.exists()) {
      throw new Error("Clash not found");
    }
    
    const clashData = clashSnap.data();
    const timerDuration = clashData.timerDuration || 300;
    
    await updateDoc(ref, {
      currentSide: null,
      sideATimeRemaining: timerDuration,
      sideBTimeRemaining: timerDuration,
      timerStartedAt: null,
      timerPausedAt: null,
    });
  } catch (error) {
    console.error("[resetClashTimer] Error:", error);
    throw error;
  }
}

/**
 * setClashTimerDuration
 * Set a new timer duration for a clash
 */
export async function setClashTimerDuration(clashId: string, duration: number): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      timerDuration: duration,
      timerEnabled: true,
      sideATimeRemaining: duration,
      sideBTimeRemaining: duration,
    });
  } catch (error) {
    console.error("[setClashTimerDuration] Error:", error);
    throw error;
  }
}

/**
 * disableClashTimer
 * Disable the timer for a clash
 */
export async function disableClashTimer(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      timerEnabled: false,
      currentSide: null,
      timerStartedAt: null,
      timerPausedAt: null,
    });
  } catch (error) {
    console.error("[disableClashTimer] Error:", error);
    throw error;
  }
}

// ── Audience Q&A Functions ───────────────────────────────────────────────────────

const CLASH_QUESTIONS_COLLECTION = "clash_questions";

/**
 * submitClashQuestion
 * Submit a question for a debate
 */
export async function submitClashQuestion(
  clashId: string,
  question: string,
  askedBy: string,
  askedByUid: string
): Promise<string> {
  try {
    const db = getFirebaseDb();
    
    // Check if Q&A is enabled for this clash
    const clashRef = doc(db, "clashes", clashId);
    const clashSnap = await getDoc(clashRef);
    
    if (!clashSnap.exists()) {
      throw new Error("Clash not found");
    }
    
    const clashData = clashSnap.data();
    if (!clashData.qaEnabled) {
      throw new Error("Q&A is not enabled for this clash");
    }
    
    const docRef = await addDoc(collection(db, CLASH_QUESTIONS_COLLECTION), {
      clashId,
      question,
      askedBy,
      askedByUid,
      upvotes: 0,
      upvotedBy: [],
      answered: false,
      answeredBy: null,
      answeredAt: null,
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error("[submitClashQuestion] Error:", error);
    throw error;
  }
}

/**
 * upvoteClashQuestion
 * Upvote a question
 */
export async function upvoteClashQuestion(questionId: string, userUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, CLASH_QUESTIONS_COLLECTION, questionId);
    
    const questionSnap = await getDoc(ref);
    if (!questionSnap.exists()) {
      throw new Error("Question not found");
    }
    
    const questionData = questionSnap.data();
    const hasUpvoted = questionData.upvotedBy?.includes(userUid);
    
    if (hasUpvoted) {
      // Remove upvote
      await updateDoc(ref, {
        upvotes: increment(-1),
        upvotedBy: arrayRemove(userUid),
      });
    } else {
      // Add upvote
      await updateDoc(ref, {
        upvotes: increment(1),
        upvotedBy: arrayUnion(userUid),
      });
    }
  } catch (error) {
    console.error("[upvoteClashQuestion] Error:", error);
    throw error;
  }
}

/**
 * answerClashQuestion
 * Mark a question as answered by a specific side
 */
export async function answerClashQuestion(questionId: string, side: "A" | "B"): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, CLASH_QUESTIONS_COLLECTION, questionId);
    
    await updateDoc(ref, {
      answered: true,
      answeredBy: side,
      answeredAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[answerClashQuestion] Error:", error);
    throw error;
  }
}

/**
 * getClashQuestions
 * Get all questions for a clash
 */
export async function getClashQuestions(clashId: string, limitCount: number = 50): Promise<ClashQuestion[]> {
  try {
    const db = getFirebaseDb();
    
    const questionsQuery = query(
      collection(db, CLASH_QUESTIONS_COLLECTION),
      where("clashId", "==", clashId),
      orderBy("upvotes", "desc"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const questionsSnap = await getDocs(questionsQuery);
    return questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClashQuestion[];
  } catch (error) {
    console.error("[getClashQuestions] Error:", error);
    return [];
  }
}

/**
 * subscribeToClashQuestions
 * Real-time subscription to clash questions
 */
export function subscribeToClashQuestions(
  clashId: string,
  callback: (questions: ClashQuestion[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const questionsQuery = query(
    collection(db, CLASH_QUESTIONS_COLLECTION),
    where("clashId", "==", clashId),
    orderBy("upvotes", "desc"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  
  const unsubscribe = onSnapshot(questionsQuery, (querySnap) => {
    const questions = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClashQuestion[];
    callback(questions);
  }, (error) => {
    console.error("[subscribeToClashQuestions] Error:", error);
  });
  
  return unsubscribe;
}

/**
 * deleteClashQuestion
 * Delete a question (for moderators)
 */
export async function deleteClashQuestion(questionId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, CLASH_QUESTIONS_COLLECTION, questionId));
  } catch (error) {
    console.error("[deleteClashQuestion] Error:", error);
    throw error;
  }
}

/**
 * enableClashQA
 * Enable Q&A for a clash
 */
export async function enableClashQA(clashId: string, moderated: boolean = true): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      qaEnabled: true,
      qaModerated: moderated,
    });
  } catch (error) {
    console.error("[enableClashQA] Error:", error);
    throw error;
  }
}

/**
 * disableClashQA
 * Disable Q&A for a clash
 */
export async function disableClashQA(clashId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "clashes", clashId);
    
    await updateDoc(ref, {
      qaEnabled: false,
    });
  } catch (error) {
    console.error("[disableClashQA] Error:", error);
    throw error;
  }
}
