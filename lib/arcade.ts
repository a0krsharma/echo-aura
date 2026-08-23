/**
 * lib/arcade.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Social Audio Gaming Engine
 *
 * $0 Infrastructure real-time multiplayer state synchronization for
 * turn-based and grid games (Sudoku Battle, Cyber Ludo) with integrated
 * voice channels and Aura rewards.
 * Uses production-whitelisted collection with clean serialization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { awardAura } from "@/lib/userDoc";

export type ArcadeGameType = "sudoku" | "ludo";

// Whitelisted collection in production Firebase
const ARCADE_COLLECTION = "rooms";

export interface ArcadePlayer {
  uid: string;
  handle: string;
  avatar?: string;
  score: number;
  mistakes?: number;
  team?: "RED" | "GREEN" | "BLUE" | "YELLOW";
  ready: boolean;
  joinedAt: number;
}

export interface SudokuState {
  initialGridStr: string;
  currentGridStr: string;
  solutionGridStr: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  completedCount: number;
  totalEmpty: number;
}

export interface LudoToken {
  id: number;
  color: "RED" | "GREEN" | "BLUE" | "YELLOW";
  position: number; // -1: Base, 0-51: Main track, 52-57: Home stretch, 99: Finished
  isHome: boolean;
}

export interface LudoState {
  currentTurn: "RED" | "GREEN" | "BLUE" | "YELLOW";
  lastDiceRoll: number | null;
  hasRolled: boolean;
  tokens: {
    [key: string]: LudoToken[]; // "RED": [t1, t2, t3, t4]
  };
  winnerOrder: string[];
}

export interface ArcadeMatch {
  id: string;
  isArcade?: boolean;
  roomId?: string; // If embedded inside a live audio room
  gameType: ArcadeGameType;
  title: string;
  hostUid: string;
  hostHandle: string;
  status: "WAITING" | "PLAYING" | "FINISHED";
  players: { [uid: string]: ArcadePlayer };
  maxPlayers: number;
  stakes: number; // Aura stakes
  winnerUid?: string;
  winnerHandle?: string;
  sudokuState?: SudokuState;
  ludoState?: LudoState;
  createdAt: any;
  updatedAt: any;
}

// ── Sample Valid Sudoku Templates ─────────────────────────────────────────────
const SUDOKU_TEMPLATES = [
  {
    initial: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
  {
    initial: [
      [0, 0, 0, 2, 6, 0, 7, 0, 1],
      [6, 8, 0, 0, 7, 0, 0, 9, 0],
      [1, 9, 0, 0, 0, 4, 5, 0, 0],
      [8, 2, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 7, 4],
      [0, 4, 0, 0, 5, 0, 0, 3, 6],
      [7, 0, 3, 0, 1, 8, 0, 0, 0],
    ],
    solution: [
      [4, 3, 5, 2, 6, 9, 7, 8, 1],
      [6, 8, 2, 5, 7, 1, 4, 9, 3],
      [1, 9, 7, 8, 3, 4, 5, 6, 2],
      [8, 2, 6, 1, 9, 5, 3, 4, 7],
      [3, 7, 4, 6, 8, 2, 9, 1, 5],
      [9, 5, 1, 7, 4, 3, 6, 2, 8],
      [5, 1, 9, 3, 2, 6, 8, 7, 4],
      [2, 4, 8, 9, 5, 7, 1, 3, 6],
      [7, 6, 3, 4, 1, 8, 2, 5, 9],
    ],
  },
];

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (
        val !== null &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        typeof val.toMillis !== "function"
      ) {
        result[key] = cleanData(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

// ── Create Arcade Match ───────────────────────────────────────────────────────
export async function createArcadeMatch(params: {
  gameType: ArcadeGameType;
  title: string;
  hostUid: string;
  hostHandle: string;
  hostAvatar?: string;
  roomId?: string;
  stakes?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  const matchRef = doc(collection(db, ARCADE_COLLECTION));
  const matchId = matchRef.id;

  const player: ArcadePlayer = {
    uid: params.hostUid,
    handle: params.hostHandle,
    avatar: params.hostAvatar || "",
    score: 0,
    mistakes: 0,
    team: params.gameType === "ludo" ? "RED" : undefined,
    ready: true,
    joinedAt: Date.now(),
  };

  let sudokuState: SudokuState | undefined;
  let ludoState: LudoState | undefined;

  if (params.gameType === "sudoku") {
    const tmpl = SUDOKU_TEMPLATES[Math.floor(Math.random() * SUDOKU_TEMPLATES.length)];
    let emptyCount = 0;
    tmpl.initial.forEach((row) => row.forEach((c) => { if (c === 0) emptyCount++; }));
    sudokuState = {
      initialGridStr: JSON.stringify(tmpl.initial),
      currentGridStr: JSON.stringify(tmpl.initial),
      solutionGridStr: JSON.stringify(tmpl.solution),
      difficulty: "MEDIUM",
      completedCount: 0,
      totalEmpty: emptyCount,
    };
  } else if (params.gameType === "ludo") {
    ludoState = {
      currentTurn: "RED",
      lastDiceRoll: null,
      hasRolled: false,
      tokens: {
        RED: [
          { id: 0, color: "RED", position: -1, isHome: false },
          { id: 1, color: "RED", position: -1, isHome: false },
          { id: 2, color: "RED", position: -1, isHome: false },
          { id: 3, color: "RED", position: -1, isHome: false },
        ],
        GREEN: [
          { id: 0, color: "GREEN", position: -1, isHome: false },
          { id: 1, color: "GREEN", position: -1, isHome: false },
          { id: 2, color: "GREEN", position: -1, isHome: false },
          { id: 3, color: "GREEN", position: -1, isHome: false },
        ],
        BLUE: [
          { id: 0, color: "BLUE", position: -1, isHome: false },
          { id: 1, color: "BLUE", position: -1, isHome: false },
          { id: 2, color: "BLUE", position: -1, isHome: false },
          { id: 3, color: "BLUE", position: -1, isHome: false },
        ],
        YELLOW: [
          { id: 0, color: "YELLOW", position: -1, isHome: false },
          { id: 1, color: "YELLOW", position: -1, isHome: false },
          { id: 2, color: "YELLOW", position: -1, isHome: false },
          { id: 3, color: "YELLOW", position: -1, isHome: false },
        ],
      },
      winnerOrder: [],
    };
  }

  const matchData: any = {
    id: matchId,
    isArcade: true,
    gameType: params.gameType,
    title: params.title || (params.gameType === "sudoku" ? "SUDOKU BATTLE" : "CYBER LUDO CLASH"),
    hostUid: params.hostUid,
    hostHandle: params.hostHandle,
    status: "WAITING",
    players: {
      [params.hostUid]: cleanData(player),
    },
    maxPlayers: params.gameType === "sudoku" ? 2 : 4,
    stakes: params.stakes || 50,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.roomId) matchData.roomId = params.roomId;
  if (sudokuState) matchData.sudokuState = sudokuState;
  if (ludoState) matchData.ludoState = ludoState;

  await setDoc(matchRef, cleanData(matchData));
  return matchId;
}

// ── Join Arcade Match ────────────────────────────────────────────────────────
export async function joinArcadeMatch(
  matchId: string,
  user: { uid: string; handle: string; avatar?: string }
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;

  const currentCount = Object.keys(match.players || {}).length;
  if (currentCount >= match.maxPlayers && !match.players[user.uid]) {
    throw new Error("Match lobby is full");
  }

  // Assign team color if Ludo
  const availableTeams: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = ["RED", "GREEN", "BLUE", "YELLOW"];
  const takenTeams = Object.values(match.players || {}).map((p) => p.team);
  const freeTeam = availableTeams.find((t) => !takenTeams.includes(t)) || "GREEN";

  const newPlayer: ArcadePlayer = {
    uid: user.uid,
    handle: user.handle,
    avatar: user.avatar || "",
    score: 0,
    mistakes: 0,
    team: match.gameType === "ludo" ? freeTeam : undefined,
    ready: true,
    joinedAt: Date.now(),
  };

  await updateDoc(matchRef, {
    [`players.${user.uid}`]: cleanData(newPlayer),
    status: currentCount + 1 >= 2 ? "PLAYING" : match.status,
    updatedAt: serverTimestamp(),
  });
}

// ── Subscribe to Match State ─────────────────────────────────────────────────
export function subscribeArcadeMatch(
  matchId: string,
  callback: (match: ArcadeMatch | null) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);

  return onSnapshot(
    matchRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as ArcadeMatch);
    },
    (err) => {
      console.error("[Arcade] subscribe error:", err);
      callback(null);
    }
  );
}

// ── Update Sudoku Cell Move ──────────────────────────────────────────────────
export async function submitSudokuCell(
  matchId: string,
  playerUid: string,
  row: number,
  col: number,
  val: number
): Promise<{ correct: boolean; isComplete: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.sudokuState) throw new Error("Not a sudoku match");

  const initialGrid: number[][] = JSON.parse(match.sudokuState.initialGridStr || "[]");
  const currentGrid: number[][] = JSON.parse(match.sudokuState.currentGridStr || "[]");
  const solutionGrid: number[][] = JSON.parse(match.sudokuState.solutionGridStr || "[]");

  const expected = solutionGrid[row]?.[col];
  const isCorrect = val === expected;

  if (isCorrect) {
    currentGrid[row][col] = val;
  }

  // Count completions
  let completedCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] === solutionGrid[r][c] && initialGrid[r][c] === 0) {
        completedCount++;
      }
    }
  }

  const isComplete = completedCount >= match.sudokuState.totalEmpty;

  const updates: any = {
    "sudokuState.currentGridStr": JSON.stringify(currentGrid),
    "sudokuState.completedCount": completedCount,
    updatedAt: serverTimestamp(),
  };

  if (isCorrect) {
    updates[`players.${playerUid}.score`] = increment(10);
  } else {
    updates[`players.${playerUid}.mistakes`] = increment(1);
  }

  if (isComplete) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    // Award winner Aura reward
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { correct: isCorrect, isComplete };
}

// ── Roll Ludo Dice ───────────────────────────────────────────────────────────
export async function rollLudoDice(matchId: string, playerUid: string): Promise<number> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.ludoState) throw new Error("Not a ludo match");

  const player = match.players[playerUid];
  if (!player || !player.team) throw new Error("Player not in match");
  if (match.ludoState.currentTurn !== player.team) throw new Error("Not your turn");
  if (match.ludoState.hasRolled) throw new Error("Already rolled");

  const roll = Math.floor(Math.random() * 6) + 1;

  await updateDoc(matchRef, {
    "ludoState.lastDiceRoll": roll,
    "ludoState.hasRolled": true,
    updatedAt: serverTimestamp(),
  });

  return roll;
}

// ── Move Ludo Token ──────────────────────────────────────────────────────────
export async function moveLudoToken(
  matchId: string,
  playerUid: string,
  tokenId: number
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.ludoState) throw new Error("Not a ludo match");

  const player = match.players[playerUid];
  const team = player?.team;
  if (!team || match.ludoState.currentTurn !== team) throw new Error("Not your turn");
  const roll = match.ludoState.lastDiceRoll;
  if (!roll || !match.ludoState.hasRolled) throw new Error("Must roll dice first");

  const tokens = { ...match.ludoState.tokens };
  const teamTokens = [...tokens[team]];
  const token = teamTokens.find((t) => t.id === tokenId);
  if (!token) throw new Error("Token not found");

  // Base to start
  if (token.position === -1) {
    if (roll === 6) {
      token.position = 0; // Starts on track
    } else {
      throw new Error("Need a 6 to deploy token");
    }
  } else if (token.position >= 0 && token.position < 57) {
    token.position += roll;
    if (token.position >= 57) {
      token.position = 99; // Finished
      token.isHome = true;
    }
  }

  tokens[team] = teamTokens;

  // Check if player won
  const allHome = teamTokens.every((t) => t.isHome);
  const nextTeams: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = ["RED", "GREEN", "BLUE", "YELLOW"];
  const currentIdx = nextTeams.indexOf(team);
  const nextTurn = roll === 6 ? team : nextTeams[(currentIdx + 1) % nextTeams.length];

  const updates: any = {
    "ludoState.tokens": tokens,
    "ludoState.currentTurn": nextTurn,
    "ludoState.hasRolled": false,
    "ludoState.lastDiceRoll": null,
    updatedAt: serverTimestamp(),
  };

  if (allHome) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = player.handle;
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
}
