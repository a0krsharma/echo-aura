/**
 * lib/viralMechanics.ts
 * ─────────────────────────────────────────────────────────────
 * The 5 High-Impact Viral Mega-Mechanics for Echo Aura:
 * 1. The Midnight Ghost Protocol (Time-Locked 11 PM - 4 AM & Sunrise Purge)
 * 2. Streak Bounties & The "Hit List" (5-Win Streak Server-Wide Targets)
 * 3. Mystery Node Roulette (90-Second Blind Audio Drop-In & Sync-or-Sever)
 * 4. Campus / City Turf Wars (Regional Pride & Grid Points)
 * 5. Locked Audio Capsules (4-Friend Synchronized Group Unlock Keys)
 */

// 1. Streak Bounty Target
export interface StreakBountyTarget {
  id: string;
  targetHandle: string;
  gameType: string;
  winStreak: number;
  bountyVolts: number;
  rewardBadge: string;
  activeSince: number;
}

export const INITIAL_BOUNTIES: StreakBountyTarget[] = [
  {
    id: "bounty_1",
    targetHandle: "@abhishek_k",
    gameType: "LUDO",
    winStreak: 6,
    bountyVolts: 500,
    rewardBadge: "KING_SLAYER 👑",
    activeSince: Date.now() - 15 * 60 * 1000,
  },
  {
    id: "bounty_2",
    targetHandle: "@rohit_sharma",
    gameType: "HAND_CRICKET",
    winStreak: 5,
    bountyVolts: 450,
    rewardBadge: "SNIPER_ACE 🎯",
    activeSince: Date.now() - 40 * 60 * 1000,
  },
  {
    id: "bounty_3",
    targetHandle: "@priya_poker",
    gameType: "TEEN_PATTI",
    winStreak: 7,
    bountyVolts: 800,
    rewardBadge: "BLUFF_HUNTER 🃏",
    activeSince: Date.now() - 5 * 60 * 1000,
  },
];

// 2. Mystery Node Conversation Starters
export const MYSTERY_CONVERSATION_STARTERS = [
  "If you had 24 hours to disappear completely without your phone, where would you hide?",
  "What is a popular trend right now that makes zero sense to you?",
  "Would you rather always speak in rhyme or always sing your sentences?",
  "What is the strangest food combination you secretly enjoy?",
  "If you had to switch lives with someone in this room for a week, who would it be?",
];

// 3. Campus & City Turf War Standings
export interface CampusTurfNode {
  id: string;
  name: string;
  type: "COLLEGE" | "CITY" | "HOSTEL";
  gridPoints: number;
  activePlayers: number;
  rank: number;
  flair: string;
}

export const CAMPUS_TURF_STANDINGS: CampusTurfNode[] = [
  { id: "dtu", name: "DTU Delhi", type: "COLLEGE", gridPoints: 14200, activePlayers: 184, rank: 1, flair: "👑 #1 METRO LEADER" },
  { id: "iit_patna", name: "IIT Patna", type: "COLLEGE", gridPoints: 12850, activePlayers: 142, rank: 2, flair: "⚡ ALPHA SECTOR" },
  { id: "bangalore_tech", name: "Bangalore Cyber Hub", type: "CITY", gridPoints: 11400, activePlayers: 210, rank: 3, flair: "🚀 SILICON GRID" },
  { id: "hostel_4", name: "Hostel 4 B-Block", type: "HOSTEL", gridPoints: 9800, activePlayers: 96, rank: 4, flair: "🔥 MIDNIGHT BRAWLERS" },
  { id: "delhi_ncr", name: "Delhi NCR Arena", type: "CITY", gridPoints: 9150, activePlayers: 160, rank: 5, flair: "⚔️ NORTH GRID" },
  { id: "mumbai_central", name: "Mumbai Central", type: "CITY", gridPoints: 8700, activePlayers: 130, rank: 6, flair: "🌊 COASTAL MATRIX" },
];

// 4. Locked Audio Capsules
export interface LockedAudioCapsule {
  id: string;
  creatorHandle: string;
  roomName: string;
  topic: string;
  requiredOnlineCount: number;
  currentOnlineCount: number;
  isUnlocked: boolean;
  createdAt: number;
}

export const DEMO_LOCKED_CAPSULES: LockedAudioCapsule[] = [
  {
    id: "capsule_101",
    creatorHandle: "@rohit_k",
    roomName: "🔥 3 AM DORM GOSSIP",
    topic: "Unfiltered confession about what happened at the college fest...",
    requiredOnlineCount: 4,
    currentOnlineCount: 3,
    isUnlocked: false,
    createdAt: Date.now() - 35 * 60 * 1000,
  },
  {
    id: "capsule_102",
    creatorHandle: "@sneha_m",
    roomName: "👑 HOSTEL B-302 SANCTUARY",
    topic: "Voice recording of our exam day prank call...",
    requiredOnlineCount: 4,
    currentOnlineCount: 2,
    isUnlocked: false,
    createdAt: Date.now() - 90 * 60 * 1000,
  },
];

/**
 * Generates a viral WhatsApp invite for a locked audio capsule.
 */
export function generateCapsuleWhatsAppInvite(capsule: LockedAudioCapsule): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const url = `${origin}/arcade`;

  const message = `🔒 *LOCKED AUDIO CAPSULE IN ECHO!*

"${capsule.topic}"
Dropped by: *${capsule.creatorHandle}*
Room: *${capsule.roomName}*

⚠️ *Status:* Requires 4 friends simultaneously online to decrypt (${capsule.currentOnlineCount}/4 online now!).
👉 *Join room & unlock audio live:* ${url}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
