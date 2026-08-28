/**
 * lib/arcadeChallenges.ts
 * ─────────────────────────────────────────────────────────────
 * Auto-Poke & Trash-Talk Challenge Engine (Viral Rivalry Growth Loop).
 * 1. 1-Tap WhatsApp "Trash-Talk" launcher with dynamic ego-driven taunts.
 * 2. In-App Real-Time Challenges & Live Push Overlay with $0 server cost
 *    synced via the production-whitelisted 'rooms' collection.
 */

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface ArcadeChallenge {
  id: string;
  isChallenge: boolean;
  challengerId: string;
  challengerHandle: string;
  challengerPhotoUrl?: string;
  targetUserId: string;
  targetHandle?: string;
  gameType: string;
  gameName: string;
  roomId: string;
  matchId: string;
  trashTalkText: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  createdAt: number;
  expiresAt: number; // 10 minutes auto-expiry
}

export const GAME_TRASH_TALK_PRESETS: Record<string, string[]> = {
  ludo: [
    "Thinks your tokens won't even make it past home base.",
    "Betting you get wiped on the first safe square.",
    "Says your 6 rolls are purely mythical. Prove otherwise.",
    "Claims you'll rage-quit before your first token enters home.",
  ],
  teen_patti: [
    "Says you fold under zero pressure in Teen Patti.",
    "Betting you play seen and fold on the first chaal.",
    "Table is hot & mic is live. Come back up your blind bet.",
    "Claims your hand is high card at best.",
  ],
  poker: [
    "Says you have zero poker face over live mic.",
    "Betting your stack is mine before the river card flips.",
    "Claims your all-in is a pure bluff.",
  ],
  hand_cricket: [
    "Says you won't survive 3 deliveries in Hand Cricket.",
    "Betting you get clean bowled on ball 1.",
    "Claims your batting score won't cross single digits.",
  ],
  chess: [
    "Claims you fall for Scholar's Mate in 4 moves.",
    "Betting your queen gets trapped before move 15.",
    "Says you'll run out of clock before you find a check.",
  ],
  uno: [
    "Says you'll be holding +4 cards till sunrise.",
    "Betting you forget to shout UNO and eat 2 penalty cards.",
    "Claims you can't survive a reverse card chain.",
  ],
  carrom: [
    "Says your striker has zero angle precision.",
    "Betting the Queen and cover are going to my pocket.",
    "Claims you pocket your own striker on the first turn.",
  ],
  pool: [
    "Says you scratch on the 8-ball break.",
    "Betting I run the table before you pocket a single stripe.",
    "Claims your bank shots are pure luck.",
  ],
  default: [
    "Betting you won't last 2 minutes in this 1v1 duel.",
    "Claims you're dodging the match. Step up to the grid.",
    "Says your win streak ends right now.",
  ],
};

export function getTrashTalkTaunts(gameType: string): string[] {
  return GAME_TRASH_TALK_PRESETS[gameType.toLowerCase()] || GAME_TRASH_TALK_PRESETS.default;
}

/**
 * Formats a dynamic 1-tap WhatsApp challenge link with pre-baked taunts and deep room link.
 */
export function generateWhatsAppTrashTalkLink(params: {
  gameType: string;
  gameName: string;
  roomId: string;
  challengerHandle: string;
  taunt: string;
}): string {
  const { gameName, roomId, challengerHandle, taunt } = params;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const roomUrl = `${origin}/arcade?join=${roomId}`;

  const message = `⚔️ *${challengerHandle.toUpperCase()} JUST POKED YOU TO A DUEL!*

"${taunt}"

🎯 *Arena:* ${gameName} (🎙️ Live Audio ON)
⚡ *Accept Challenge Instantly:* ${roomUrl}

_No download needed. Open link & tap mic to battle._`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Creates and dispatches an in-app challenge to another user.
 */
export async function sendArcadeChallenge(params: {
  challengerId: string;
  challengerHandle: string;
  challengerPhotoUrl?: string;
  targetUserId: string;
  targetHandle?: string;
  gameType: string;
  gameName: string;
  roomId: string;
  matchId: string;
  trashTalkText: string;
}): Promise<string> {
  const db = getFirebaseDb();
  const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const docRef = doc(db, "rooms", challengeId);

  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const challengeData: ArcadeChallenge = {
    id: challengeId,
    isChallenge: true,
    challengerId: params.challengerId,
    challengerHandle: params.challengerHandle,
    challengerPhotoUrl: params.challengerPhotoUrl || "",
    targetUserId: params.targetUserId,
    targetHandle: params.targetHandle || "@RIVAL",
    gameType: params.gameType,
    gameName: params.gameName,
    roomId: params.roomId,
    matchId: params.matchId,
    trashTalkText: params.trashTalkText,
    status: "PENDING",
    createdAt: now,
    expiresAt,
  };

  await setDoc(docRef, challengeData);
  
  // Flag the match as a challenge so it doesn't auto-start with a Ghost AI
  const matchRef = doc(db, "rooms", params.matchId);
  await updateDoc(matchRef, { isChallenge: true }).catch(() => {});
  
  return challengeId;
}

/**
 * Subscribes to real-time incoming challenges directed at the current user.
 */
export function subscribeIncomingChallenges(
  currentUserId: string,
  onChallenge: (challenges: ArcadeChallenge[]) => void
): () => void {
  if (!currentUserId) return () => {};
  const db = getFirebaseDb();

  const q = query(
    collection(db, "rooms"),
    where("isChallenge", "==", true),
    where("targetUserId", "==", currentUserId),
    limit(5)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const list: ArcadeChallenge[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ArcadeChallenge;
        if (data.status === "PENDING" && data.expiresAt > now) {
          list.push({ ...data, id: d.id });
        }
      });
      onChallenge(list);
    },
    (err) => {
      console.warn("Challenge listener fallback:", err.message);
      onChallenge([]);
    }
  );
}

/**
 * Accepts or declines an in-app challenge.
 */
export async function respondToChallenge(
  challengeId: string,
  response: "ACCEPTED" | "DECLINED"
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "rooms", challengeId);
  try {
    await updateDoc(docRef, { status: response });
  } catch (e) {
    // If update fails, delete
    await deleteDoc(docRef).catch(() => {});
  }
}
