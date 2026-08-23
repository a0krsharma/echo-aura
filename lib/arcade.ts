/**
 * lib/arcade.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Social Audio Gaming Engine
 *
 * $0 Infrastructure real-time multiplayer & AI Bot state synchronization for
 * turn-based and grid games (Sudoku Battle, Cyber Ludo) with integrated
 * voice channels, real-time chat, and stage-style reaction surge.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { awardAura } from "@/lib/userDoc";

export type ArcadeGameType = "sudoku" | "ludo";
export type ArcadeMatchMode = "MULTIPLAYER" | "VS_COMPUTER";

// Whitelisted collection in production Firebase
const ARCADE_COLLECTION = "rooms";

export const LUDO_CONFIG = {
  START_POS: {
    RED: 0,
    GREEN: 13,
    YELLOW: 26,
    BLUE: 39,
  },
  SAFE_STARS: [0, 8, 13, 21, 26, 34, 39, 47],
  TOTAL_STEPS_TO_HOME: 57,
};

export interface ArcadePlayer {
  uid: string;
  handle: string;
  avatar?: string;
  score: number;
  mistakes?: number;
  team?: "RED" | "GREEN" | "BLUE" | "YELLOW";
  ready: boolean;
  isBot?: boolean;
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
  stepCount: number; // 0: in base, 1..51: on track, 52..56: in home column, 57: home finished
  boardPosition: number; // -1 if Base, 0..51 if on main track, 101..105 home path, 999 finished
  isHome: boolean;
}

export interface LudoState {
  currentTurn: "RED" | "GREEN" | "BLUE" | "YELLOW";
  lastDiceRoll: number | null;
  hasRolled: boolean;
  lastActionLog?: string;
  tokens: {
    RED: LudoToken[];
    GREEN: LudoToken[];
    BLUE: LudoToken[];
    YELLOW: LudoToken[];
  };
  winnerOrder: string[];
}

export interface ArcadeMatch {
  id: string;
  isArcade?: boolean;
  roomId?: string; // If embedded inside a live audio room
  mode: ArcadeMatchMode;
  enableVoice: boolean;
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

export interface ArcadeChatMessage {
  id: string;
  uid: string;
  handle: string;
  avatar?: string;
  text: string;
  timestamp: number;
}

export interface ArcadeReaction {
  id: string;
  uid: string;
  handle: string;
  emoji: string;
  timestamp: number;
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

function makeInitialTokens(color: "RED" | "GREEN" | "BLUE" | "YELLOW"): LudoToken[] {
  return [
    { id: 0, color, stepCount: 0, boardPosition: -1, isHome: false },
    { id: 1, color, stepCount: 0, boardPosition: -1, isHome: false },
    { id: 2, color, stepCount: 0, boardPosition: -1, isHome: false },
    { id: 3, color, stepCount: 0, boardPosition: -1, isHome: false },
  ];
}

// ── Create Arcade Match (Multiplayer or Solo VS Bot) ──────────────────────────
export async function createArcadeMatch(params: {
  gameType: ArcadeGameType;
  title: string;
  hostUid: string;
  hostHandle: string;
  hostAvatar?: string;
  roomId?: string;
  mode?: ArcadeMatchMode;
  maxPlayers?: number;
  enableVoice?: boolean;
  stakes?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  const matchRef = doc(collection(db, ARCADE_COLLECTION));
  const matchId = matchRef.id;

  const mode = params.mode || "MULTIPLAYER";
  const enableVoice = params.enableVoice ?? true;
  const maxPlayers = params.maxPlayers || (params.gameType === "sudoku" ? 2 : 4);

  const player: ArcadePlayer = {
    uid: params.hostUid,
    handle: params.hostHandle,
    avatar: params.hostAvatar || "",
    score: 0,
    mistakes: 0,
    team: params.gameType === "ludo" ? "RED" : undefined,
    ready: true,
    isBot: false,
    joinedAt: Date.now(),
  };

  const players: { [uid: string]: ArcadePlayer } = {
    [params.hostUid]: cleanData(player),
  };

  // If VS Computer, add AI Bots immediately
  if (mode === "VS_COMPUTER") {
    if (params.gameType === "ludo") {
      const botTeams: ("GREEN" | "YELLOW" | "BLUE")[] = ["GREEN", "YELLOW", "BLUE"];
      const botNames = ["@NEURAL_BOT_01", "@CYBER_AI_02", "@ECHO_BOT_03"];
      const botCount = Math.min(maxPlayers - 1, 3);
      for (let i = 0; i < botCount; i++) {
        const botUid = `bot_${matchId}_${i + 1}`;
        players[botUid] = {
          uid: botUid,
          handle: botNames[i],
          score: 0,
          mistakes: 0,
          team: botTeams[i],
          ready: true,
          isBot: true,
          joinedAt: Date.now(),
        };
      }
    } else if (params.gameType === "sudoku") {
      const botUid = `bot_${matchId}_ai`;
      players[botUid] = {
        uid: botUid,
        handle: "@NEURAL_SUDOKU_AI",
        score: 0,
        mistakes: 0,
        ready: true,
        isBot: true,
        joinedAt: Date.now(),
      };
    }
  }

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
      lastActionLog: mode === "VS_COMPUTER" ? "Match started vs Computer AI! RED to roll first." : "Match initiated. RED to roll first.",
      tokens: {
        RED: makeInitialTokens("RED"),
        GREEN: makeInitialTokens("GREEN"),
        BLUE: makeInitialTokens("BLUE"),
        YELLOW: makeInitialTokens("YELLOW"),
      },
      winnerOrder: [],
    };
  }

  const matchData: any = {
    id: matchId,
    isArcade: true,
    mode,
    enableVoice,
    gameType: params.gameType,
    title: params.title || (params.gameType === "sudoku" ? "SUDOKU BATTLE" : "CYBER LUDO CLASH"),
    hostUid: params.hostUid,
    hostHandle: params.hostHandle,
    status: mode === "VS_COMPUTER" ? "PLAYING" : "WAITING",
    players,
    maxPlayers,
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
    isBot: false,
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
    if (!match.players[playerUid]?.isBot) {
      await awardAura(playerUid, match.stakes * 2 || 100);
    }
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
    "ludoState.lastActionLog": `${player.handle || player.team} rolled a ${roll}!`,
    updatedAt: serverTimestamp(),
  });

  return roll;
}

// Helper to find next player with active team
export function getNextTurn(
  current: "RED" | "GREEN" | "BLUE" | "YELLOW",
  players: { [uid: string]: ArcadePlayer }
): "RED" | "GREEN" | "BLUE" | "YELLOW" {
  const order: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = ["RED", "GREEN", "BLUE", "YELLOW"];
  const activeTeams = Object.values(players).map((p) => p.team).filter(Boolean) as ("RED" | "GREEN" | "BLUE" | "YELLOW")[];

  if (activeTeams.length <= 1) return current;

  let idx = order.indexOf(current);
  for (let i = 1; i <= 4; i++) {
    const candidate = order[(idx + i) % 4];
    if (activeTeams.includes(candidate)) {
      return candidate;
    }
  }
  return current;
}

// ── Move Ludo Token ──────────────────────────────────────────────────────────
export async function moveLudoToken(
  matchId: string,
  playerUid: string,
  tokenId: number
): Promise<{ captured: boolean; extraTurn: boolean; won: boolean }> {
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
  const teamTokens = tokens[team] ? [...tokens[team]] : makeInitialTokens(team);
  const tokenIndex = teamTokens.findIndex((t) => t.id === tokenId);
  if (tokenIndex === -1) throw new Error("Token not found");

  const token = { ...teamTokens[tokenIndex] };
  let captured = false;
  let reachedHome = false;
  let actionLog = "";

  // Base to start
  if (token.stepCount === 0) {
    if (roll === 6) {
      token.stepCount = 1;
      token.boardPosition = LUDO_CONFIG.START_POS[team];
      actionLog = `${player.handle || team} deployed Token ${tokenId + 1} onto the track!`;
    } else {
      throw new Error("Need a 6 to deploy token");
    }
  } else {
    const newStep = token.stepCount + roll;
    if (newStep > LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
      throw new Error("Roll exceeds steps needed to reach Home");
    }

    token.stepCount = newStep;

    if (newStep === LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
      token.isHome = true;
      token.boardPosition = 999;
      reachedHome = true;
      actionLog = `🏆 ${player.handle || team} Token ${tokenId + 1} REACHED THE HOME TRIANGLE!`;
    } else if (newStep <= 51) {
      const newPos = (LUDO_CONFIG.START_POS[team] + newStep - 1) % 52;
      token.boardPosition = newPos;

      // Check capture on non-safe square
      if (!LUDO_CONFIG.SAFE_STARS.includes(newPos)) {
        const otherTeams: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = (["RED", "GREEN", "BLUE", "YELLOW"] as const).filter(
          (t) => t !== team
        );

        for (const oTeam of otherTeams) {
          if (tokens[oTeam]) {
            const oppTokens = tokens[oTeam].map((opp) => {
              if (opp.boardPosition === newPos && !opp.isHome) {
                captured = true;
                actionLog = `⚔️ ${player.handle || team} CAPTURED ${oTeam}'s Token on square ${newPos}!`;
                return { ...opp, stepCount: 0, boardPosition: -1 };
              }
              return opp;
            });
            tokens[oTeam] = oppTokens;
          }
        }
      }
      if (!captured) {
        actionLog = `${player.handle || team} moved Token ${tokenId + 1} to track square ${newPos}.`;
      }
    } else {
      // Home stretch (52..56)
      token.boardPosition = 100 + (newStep - 51);
      actionLog = `${player.handle || team} moved Token ${tokenId + 1} into Home Corridor (${newStep - 51}/5).`;
    }
  }

  teamTokens[tokenIndex] = token;
  tokens[team] = teamTokens;

  // Check if player won
  const allHome = teamTokens.every((t) => t.isHome);
  const givesExtraTurn = roll === 6 || captured || reachedHome;
  const nextTurn = givesExtraTurn ? team : getNextTurn(team, match.players);

  const updates: any = {
    "ludoState.tokens": tokens,
    "ludoState.currentTurn": nextTurn,
    "ludoState.hasRolled": false,
    "ludoState.lastDiceRoll": null,
    "ludoState.lastActionLog": givesExtraTurn ? `${actionLog} (BONUS TURN GRANTED!)` : actionLog,
    updatedAt: serverTimestamp(),
  };

  if (allHome) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = player.handle;
    if (!player.isBot) {
      await awardAura(playerUid, match.stakes * 2 || 100);
    }
  }

  await updateDoc(matchRef, updates);
  return { captured, extraTurn: givesExtraTurn, won: allHome };
}

// ── Pass Ludo Turn (when no valid moves exist) ────────────────────────────────
export async function passLudoTurn(matchId: string, playerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.ludoState) throw new Error("Not a ludo match");

  const player = match.players[playerUid];
  const team = player?.team;
  if (!team || match.ludoState.currentTurn !== team) return;

  const nextTurn = getNextTurn(team, match.players);
  await updateDoc(matchRef, {
    "ludoState.currentTurn": nextTurn,
    "ludoState.hasRolled": false,
    "ludoState.lastDiceRoll": null,
    "ludoState.lastActionLog": `${player.handle || team} had no valid moves. Passed turn to ${nextTurn}.`,
    updatedAt: serverTimestamp(),
  });
}

// ── In-Game Live Chat Engine ───────────────────────────────────────────────────
export async function sendArcadeChatMessage(
  matchId: string,
  user: { uid: string; handle: string; avatar?: string },
  text: string
): Promise<void> {
  const db = getFirebaseDb();
  const msgRef = collection(db, ARCADE_COLLECTION, matchId, "chat_messages");
  await addDoc(msgRef, {
    uid: user.uid,
    handle: user.handle,
    avatar: user.avatar || "",
    text: text.trim(),
    timestamp: Date.now(),
  });
}

export function subscribeArcadeChat(
  matchId: string,
  callback: (messages: ArcadeChatMessage[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const msgRef = collection(db, ARCADE_COLLECTION, matchId, "chat_messages");
  const q = query(msgRef, orderBy("timestamp", "asc"), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const msgs: ArcadeChatMessage[] = [];
      snap.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ArcadeChatMessage);
      });
      callback(msgs);
    },
    (err) => {
      console.warn("[Arcade] chat listener note:", err.message);
      callback([]);
    }
  );
}

// ── Stage-Style Reaction Surge Engine ─────────────────────────────────────────
export async function sendArcadeReaction(
  matchId: string,
  user: { uid: string; handle: string },
  emoji: string
): Promise<void> {
  const db = getFirebaseDb();
  const reactionRef = collection(db, ARCADE_COLLECTION, matchId, "reactions");
  await addDoc(reactionRef, {
    uid: user.uid,
    handle: user.handle,
    emoji,
    timestamp: Date.now(),
  });
}

export function subscribeArcadeReactions(
  matchId: string,
  callback: (reaction: ArcadeReaction) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const reactionRef = collection(db, ARCADE_COLLECTION, matchId, "reactions");
  const q = query(reactionRef, orderBy("timestamp", "desc"), limit(5));

  let initialLoad = true;
  return onSnapshot(
    q,
    (snap) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          callback({ id: change.doc.id, ...change.doc.data() } as ArcadeReaction);
        }
      });
    },
    (err) => {
      console.warn("[Arcade] reaction listener note:", err.message);
    }
  );
}
