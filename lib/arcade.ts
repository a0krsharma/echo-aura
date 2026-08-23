/**
 * lib/arcade.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Social Audio Gaming Engine
 *
 * $0 Infrastructure real-time multiplayer & AI Bot state synchronization for
 * turn-based and grid games:
 * 1. Cyber Ludo (15x15 Physical Board)
 * 2. Chess (Grid Protocol 8x8)
 * 3. Connect Four (Data-Stream Grid)
 * 4. Battleship (Sub-Grid Radar Command)
 * 5. Sudoku (Matrix Data-Grid)
 * 6. Minesweeper (Hex-Node Logic Bomb Clearing)
 * 7. 2048 (Binary Merge Matrix)
 * 8. Retro Snake (Terminal Phosphor Canvas)
 * 9. Wordle / Cipher (Code-Breaker Protocol)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { awardAura } from "@/lib/userDoc";

export type ArcadeGameType =
  | "ludo"
  | "chess"
  | "connect4"
  | "battleship"
  | "sudoku"
  | "minesweeper"
  | "2048"
  | "snake"
  | "wordle";

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
  team?: "RED" | "GREEN" | "BLUE" | "YELLOW" | "WHITE" | "BLACK";
  ready: boolean;
  isBot?: boolean;
  joinedAt: number;
}

// ── Game States ─────────────────────────────────────────────────────────────
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
  stepCount: number;
  boardPosition: number;
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

export interface ChessPiece {
  type: "p" | "r" | "n" | "b" | "q" | "k";
  color: "w" | "b";
}

export interface ChessState {
  boardStr: string; // 8x8 JSON string of (ChessPiece | null)[][]
  currentTurn: "w" | "b";
  moveHistory: string[];
  capturedW: string[];
  capturedB: string[];
  isCheck: boolean;
  isCheckmate: boolean;
  lastActionLog?: string;
}

export interface Connect4State {
  gridStr: string; // 6 rows x 7 cols JSON string of (string | null)[][]
  currentTurn: "RED" | "YELLOW";
  winner?: string;
  isDraw?: boolean;
  lastActionLog?: string;
}

export interface BattleshipState {
  p1Uid: string;
  p2Uid: string;
  p1ShipsStr: string; // [row, col][] coordinates
  p2ShipsStr: string;
  p1ShotsStr: string; // [row, col, hit][] coordinates
  p2ShotsStr: string;
  currentTurnUid: string;
  p1Hits: number;
  p2Hits: number;
  totalShipCells: number;
  phase: "DEPLOYING" | "BATTLE";
  lastActionLog?: string;
}

export interface MinesweeperState {
  rows: number;
  cols: number;
  mines: number;
  gridStr: string; // 2D array of { mine: boolean, count: number, revealed: boolean, flagged: boolean }
  revealedCount: number;
  flaggedCount: number;
  isWon: boolean;
  isLost: boolean;
  startedAt: number;
}

export interface Game2048State {
  gridStr: string; // 4x4 matrix
  score: number;
  bestScore: number;
  isWon: boolean;
  isGameOver: boolean;
}

export interface SnakeState {
  score: number;
  highScore: number;
  isGameOver: boolean;
  level: number;
}

export interface WordleState {
  secretWord: string;
  guesses: string[]; // List of 5-letter guesses
  maxAttempts: number;
  isWon: boolean;
  isGameOver: boolean;
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
  chessState?: ChessState;
  connect4State?: Connect4State;
  battleshipState?: BattleshipState;
  minesweeperState?: MinesweeperState;
  game2048State?: Game2048State;
  snakeState?: SnakeState;
  wordleState?: WordleState;
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

// ── Initial Helpers ─────────────────────────────────────────────────────────
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

export function createInitialChessBoard(): (ChessPiece | null)[][] {
  const board: (ChessPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  // Black pieces (row 0 & 1)
  const backRow: ChessPiece["type"][] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
  }
  // White pieces (row 6 & 7)
  for (let c = 0; c < 8; c++) {
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: backRow[c], color: "w" };
  }
  return board;
}

const WORDLE_WORDS = [
  "AUDIO", "CYBER", "VOICE", "ECHOX", "RADAR", "PULSE", "TRACK", "STAGE", "MUSIC", "SOUND",
  "BEATS", "FREQUENCY", "LASER", "NEURAL", "SOLAR", "MATRIX", "WAVES", "SIGNAL", "CHORD", "MICRO"
];

// ── Create Arcade Match (All Games) ──────────────────────────────────────────
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
  let maxPlayers = params.maxPlayers || 2;
  if (params.gameType === "ludo") maxPlayers = params.maxPlayers || 4;
  if (params.gameType === "minesweeper" || params.gameType === "2048" || params.gameType === "snake" || params.gameType === "wordle") {
    maxPlayers = 1;
  }

  const hostPlayer: ArcadePlayer = {
    uid: params.hostUid,
    handle: params.hostHandle,
    avatar: params.hostAvatar || "",
    score: 0,
    mistakes: 0,
    team: params.gameType === "ludo" ? "RED" : params.gameType === "chess" ? "WHITE" : undefined,
    ready: true,
    isBot: false,
    joinedAt: Date.now(),
  };

  const players: { [uid: string]: ArcadePlayer } = {
    [params.hostUid]: cleanData(hostPlayer),
  };

  // If VS Computer, instantiate AI Bots
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
    } else if (params.gameType === "chess") {
      const botUid = `bot_${matchId}_chess`;
      players[botUid] = {
        uid: botUid,
        handle: "@GRANDMASTER_AI",
        score: 0,
        mistakes: 0,
        team: "BLACK",
        ready: true,
        isBot: true,
        joinedAt: Date.now(),
      };
    } else if (params.gameType === "connect4") {
      const botUid = `bot_${matchId}_c4`;
      players[botUid] = {
        uid: botUid,
        handle: "@CYBER_C4_BOT",
        score: 0,
        mistakes: 0,
        ready: true,
        isBot: true,
        joinedAt: Date.now(),
      };
    } else if (params.gameType === "battleship") {
      const botUid = `bot_${matchId}_naval`;
      players[botUid] = {
        uid: botUid,
        handle: "@RADAR_ADMIRAL_AI",
        score: 0,
        mistakes: 0,
        ready: true,
        isBot: true,
        joinedAt: Date.now(),
      };
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

  const matchData: any = {
    id: matchId,
    isArcade: true,
    mode,
    enableVoice,
    gameType: params.gameType,
    title: params.title || `${params.gameType.toUpperCase()} ARENA`,
    hostUid: params.hostUid,
    hostHandle: params.hostHandle,
    status: mode === "VS_COMPUTER" || maxPlayers === 1 ? "PLAYING" : "WAITING",
    players,
    maxPlayers,
    stakes: params.stakes || 50,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.roomId) matchData.roomId = params.roomId;

  // Initialize Game-Specific States
  if (params.gameType === "ludo") {
    matchData.ludoState = {
      currentTurn: "RED",
      lastDiceRoll: null,
      hasRolled: false,
      lastActionLog: "Match initiated. RED to roll first.",
      tokens: {
        RED: makeInitialTokens("RED"),
        GREEN: makeInitialTokens("GREEN"),
        BLUE: makeInitialTokens("BLUE"),
        YELLOW: makeInitialTokens("YELLOW"),
      },
      winnerOrder: [],
    };
  } else if (params.gameType === "chess") {
    matchData.chessState = {
      boardStr: JSON.stringify(createInitialChessBoard()),
      currentTurn: "w",
      moveHistory: [],
      capturedW: [],
      capturedB: [],
      isCheck: false,
      isCheckmate: false,
      lastActionLog: "Chess battle initiated. White to move first.",
    };
  } else if (params.gameType === "connect4") {
    const grid = Array.from({ length: 6 }, () => Array(7).fill(null));
    matchData.connect4State = {
      gridStr: JSON.stringify(grid),
      currentTurn: "RED",
      lastActionLog: "Connect Four data-stream online. RED to drop token.",
    };
  } else if (params.gameType === "battleship") {
    const botShips = [[0, 0], [0, 1], [0, 2], [2, 3], [3, 3], [5, 5], [6, 5], [7, 5]];
    matchData.battleshipState = {
      p1Uid: params.hostUid,
      p2Uid: mode === "VS_COMPUTER" ? `bot_${matchId}_naval` : "",
      p1ShipsStr: JSON.stringify([[1, 1], [1, 2], [1, 3], [3, 4], [4, 4], [6, 6], [7, 6], [8, 6]]),
      p2ShipsStr: JSON.stringify(botShips),
      p1ShotsStr: JSON.stringify([]),
      p2ShotsStr: JSON.stringify([]),
      currentTurnUid: params.hostUid,
      p1Hits: 0,
      p2Hits: 0,
      totalShipCells: 8,
      phase: "BATTLE",
      lastActionLog: "Radar Command active. Fire your first grid shot!",
    };
  } else if (params.gameType === "sudoku") {
    matchData.sudokuState = {
      initialGridStr: JSON.stringify([
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ]),
      currentGridStr: JSON.stringify([
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ]),
      solutionGridStr: JSON.stringify([
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ]),
      difficulty: "MEDIUM",
      completedCount: 0,
      totalEmpty: 51,
    };
  } else if (params.gameType === "minesweeper") {
    const rows = 9;
    const cols = 9;
    const mines = 10;
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        mine: false,
        count: 0,
        revealed: false,
        flagged: false,
      }))
    );
    let planted = 0;
    while (planted < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!grid[r][c].mine) {
        grid[r][c].mine = true;
        planted++;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c].mine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) {
                count++;
              }
            }
          }
          grid[r][c].count = count;
        }
      }
    }
    matchData.minesweeperState = {
      rows,
      cols,
      mines,
      gridStr: JSON.stringify(grid),
      revealedCount: 0,
      flaggedCount: 0,
      isWon: false,
      isLost: false,
      startedAt: Date.now(),
    };
  } else if (params.gameType === "2048") {
    const grid = [
      [0, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 0],
    ];
    matchData.game2048State = {
      gridStr: JSON.stringify(grid),
      score: 0,
      bestScore: 0,
      isWon: false,
      isGameOver: false,
    };
  } else if (params.gameType === "snake") {
    matchData.snakeState = {
      score: 0,
      highScore: 0,
      isGameOver: false,
      level: 1,
    };
  } else if (params.gameType === "wordle") {
    const randomWord = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
    matchData.wordleState = {
      secretWord: randomWord,
      guesses: [],
      maxAttempts: 6,
      isWon: false,
      isGameOver: false,
    };
  }

  await setDoc(matchRef, cleanData(matchData));
  return matchId;
}

// ── Delete / Terminate Arcade Match ──────────────────────────────────────────
export async function deleteArcadeMatch(matchId: string, hostUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.hostUid === hostUid) {
    await deleteDoc(matchRef);
  }
}

// ── Join Match ───────────────────────────────────────────────────────────────
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

  let team: any;
  if (match.gameType === "ludo") {
    const taken = Object.values(match.players || {}).map((p) => p.team);
    const available = ["RED", "GREEN", "BLUE", "YELLOW"] as const;
    team = available.find((t) => !taken.includes(t)) || "GREEN";
  } else if (match.gameType === "chess") {
    team = "BLACK";
  }

  const updates: any = {
    [`players.${user.uid}`]: cleanData({
      uid: user.uid,
      handle: user.handle,
      avatar: user.avatar || "",
      score: 0,
      mistakes: 0,
      team,
      ready: true,
      isBot: false,
      joinedAt: Date.now(),
    }),
    status: currentCount + 1 >= 2 ? "PLAYING" : match.status,
    updatedAt: serverTimestamp(),
  };

  if (match.gameType === "battleship" && !match.battleshipState?.p2Uid) {
    updates["battleshipState.p2Uid"] = user.uid;
  }

  await updateDoc(matchRef, updates);
}

// ── Subscribe to Match ───────────────────────────────────────────────────────
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

// ── Chess Moves ──────────────────────────────────────────────────────────────
export async function makeChessMove(
  matchId: string,
  playerUid: string,
  from: [number, number],
  to: [number, number]
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.chessState) throw new Error("Not a chess match");

  const board: (ChessPiece | null)[][] = JSON.parse(match.chessState.boardStr);
  const movingPiece = board[from[0]][from[1]];
  if (!movingPiece) throw new Error("No piece at source");

  const targetPiece = board[to[0]][to[1]];
  board[to[0]][to[1]] = movingPiece;
  board[from[0]][from[1]] = null;

  const capturedW = [...match.chessState.capturedW];
  const capturedB = [...match.chessState.capturedB];
  let won = false;

  if (targetPiece) {
    if (targetPiece.color === "w") capturedW.push(targetPiece.type);
    else capturedB.push(targetPiece.type);
    if (targetPiece.type === "k") won = true; // King captured
  }

  const nextTurn: "w" | "b" = match.chessState.currentTurn === "w" ? "b" : "w";
  const fromNotation = `${String.fromCharCode(65 + from[1])}${8 - from[0]}`;
  const toNotation = `${String.fromCharCode(65 + to[1])}${8 - to[0]}`;
  const moveStr = `${movingPiece.type.toUpperCase()}:${fromNotation}➔${toNotation}`;

  const updates: any = {
    "chessState.boardStr": JSON.stringify(board),
    "chessState.currentTurn": nextTurn,
    "chessState.capturedW": capturedW,
    "chessState.capturedB": capturedB,
    "chessState.moveHistory": [...match.chessState.moveHistory.slice(-19), moveStr],
    "chessState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} moved ${moveStr}!`,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    if (!match.players[playerUid]?.isBot) {
      await awardAura(playerUid, match.stakes * 2 || 100);
    }
  }

  await updateDoc(matchRef, updates);
  return { won };
}

// ── Connect Four Moves ───────────────────────────────────────────────────────
export async function dropConnect4Token(
  matchId: string,
  playerUid: string,
  col: number
): Promise<{ won: boolean; isDraw: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.connect4State) throw new Error("Not a connect4 match");

  const grid: (string | null)[][] = JSON.parse(match.connect4State.gridStr);
  const turn = match.connect4State.currentTurn;

  // Drop to lowest available row
  let targetRow = -1;
  for (let r = 5; r >= 0; r--) {
    if (grid[r][col] === null) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) throw new Error("Column is full");

  grid[targetRow][col] = turn;

  // Win checking (horizontal, vertical, diagonal)
  let won = false;
  const checkLine = (cells: (string | null)[]) => {
    let count = 0;
    for (const c of cells) {
      if (c === turn) {
        count++;
        if (count >= 4) return true;
      } else {
        count = 0;
      }
    }
    return false;
  };

  // Horizontal
  if (checkLine(grid[targetRow])) won = true;
  // Vertical
  if (!won && checkLine(grid.map((r) => r[col]))) won = true;
  // Diagonals
  if (!won) {
    const diag1: (string | null)[] = [];
    const diag2: (string | null)[] = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        if (r - c === targetRow - col) diag1.push(grid[r][c]);
        if (r + c === targetRow + col) diag2.push(grid[r][c]);
      }
    }
    if (checkLine(diag1) || checkLine(diag2)) won = true;
  }

  const isFull = grid.every((r) => r.every((c) => c !== null));
  const nextTurn = turn === "RED" ? "YELLOW" : "RED";

  const updates: any = {
    "connect4State.gridStr": JSON.stringify(grid),
    "connect4State.currentTurn": nextTurn,
    "connect4State.lastActionLog": `${match.players[playerUid]?.handle || turn} dropped token in column ${col + 1}.`,
    updatedAt: serverTimestamp(),
  };

  if (won || isFull) {
    updates.status = "FINISHED";
    if (won) {
      updates.winnerUid = playerUid;
      updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
      if (!match.players[playerUid]?.isBot) {
        await awardAura(playerUid, match.stakes * 2 || 100);
      }
    } else {
      updates["connect4State.isDraw"] = true;
    }
  }

  await updateDoc(matchRef, updates);
  return { won, isDraw: isFull && !won };
}

// ── Battleship Shot ──────────────────────────────────────────────────────────
export async function fireBattleshipShot(
  matchId: string,
  playerUid: string,
  row: number,
  col: number
): Promise<{ hit: boolean; won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.battleshipState) throw new Error("Not a battleship match");

  const bs = match.battleshipState;
  const isP1 = playerUid === bs.p1Uid;
  const targetShips: [number, number][] = JSON.parse(isP1 ? bs.p2ShipsStr : bs.p1ShipsStr);
  const shots: [number, number, boolean][] = JSON.parse(isP1 ? bs.p1ShotsStr : bs.p2ShotsStr);

  const isHit = targetShips.some(([r, c]) => r === row && c === col);
  shots.push([row, col, isHit]);

  const newHits = (isP1 ? bs.p1Hits : bs.p2Hits) + (isHit ? 1 : 0);
  const won = newHits >= bs.totalShipCells;

  const otherUid = isP1 ? bs.p2Uid : bs.p1Uid;
  const nextTurnUid = isHit ? playerUid : otherUid;

  const coordNotation = `${String.fromCharCode(65 + col)}${row + 1}`;
  const updates: any = {
    [isP1 ? "battleshipState.p1ShotsStr" : "battleshipState.p2ShotsStr"]: JSON.stringify(shots),
    [isP1 ? "battleshipState.p1Hits" : "battleshipState.p2Hits"]: newHits,
    "battleshipState.currentTurnUid": nextTurnUid,
    "battleshipState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} fired at ${coordNotation}: ${isHit ? "💥 DIRECT HIT!" : "🌊 MISS"}`,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    if (!match.players[playerUid]?.isBot) {
      await awardAura(playerUid, match.stakes * 2 || 100);
    }
  }

  await updateDoc(matchRef, updates);
  return { hit: isHit, won };
}

// ── Minesweeper Cell Action ──────────────────────────────────────────────────
export async function revealMinesweeperCell(
  matchId: string,
  playerUid: string,
  row: number,
  col: number
): Promise<{ isLost: boolean; isWon: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.minesweeperState) throw new Error("Not minesweeper match");

  const ms = match.minesweeperState;
  const grid = JSON.parse(ms.gridStr);

  if (grid[row][col].flagged || grid[row][col].revealed) {
    return { isLost: false, isWon: false };
  }

  let isLost = false;
  let isWon = false;

  if (grid[row][col].mine) {
    // Game over: hit mine
    isLost = true;
    grid.forEach((r: any[]) => r.forEach((c) => { if (c.mine) c.revealed = true; }));
  } else {
    // Flood fill uncover 0s
    const reveal = (r: number, c: number) => {
      if (r < 0 || r >= ms.rows || c < 0 || c >= ms.cols) return;
      if (grid[r][c].revealed || grid[r][c].flagged || grid[r][c].mine) return;
      grid[r][c].revealed = true;
      if (grid[r][c].count === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            reveal(r + dr, c + dc);
          }
        }
      }
    };
    reveal(row, col);

    let unrevealedSafe = 0;
    grid.forEach((r: any[]) =>
      r.forEach((c) => {
        if (!c.mine && !c.revealed) unrevealedSafe++;
      })
    );
    if (unrevealedSafe === 0) {
      isWon = true;
    }
  }

  const updates: any = {
    "minesweeperState.gridStr": JSON.stringify(grid),
    "minesweeperState.isLost": isLost,
    "minesweeperState.isWon": isWon,
    updatedAt: serverTimestamp(),
  };

  if (isLost || isWon) {
    updates.status = "FINISHED";
    if (isWon) {
      updates.winnerUid = playerUid;
      updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
      await awardAura(playerUid, 100);
    }
  }

  await updateDoc(matchRef, updates);
  return { isLost, isWon };
}

// ── Minesweeper Toggle Flag ──────────────────────────────────────────────────
export async function toggleMinesweeperFlag(
  matchId: string,
  row: number,
  col: number
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.minesweeperState) return;

  const grid = JSON.parse(match.minesweeperState.gridStr);
  if (grid[row][col].revealed) return;
  grid[row][col].flagged = !grid[row][col].flagged;

  await updateDoc(matchRef, {
    "minesweeperState.gridStr": JSON.stringify(grid),
    updatedAt: serverTimestamp(),
  });
}

// ── 2048 State Sync ──────────────────────────────────────────────────────────
export async function update2048State(
  matchId: string,
  playerUid: string,
  grid: number[][],
  score: number,
  isWon: boolean,
  isGameOver: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const updates: any = {
    "game2048State.gridStr": JSON.stringify(grid),
    "game2048State.score": score,
    "game2048State.isWon": isWon,
    "game2048State.isGameOver": isGameOver,
    updatedAt: serverTimestamp(),
  };
  if (isGameOver || isWon) {
    updates.status = "FINISHED";
    if (isWon) {
      updates.winnerUid = playerUid;
      await awardAura(playerUid, 150);
    }
  }
  await updateDoc(matchRef, updates);
}

// ── Snake Score Sync ─────────────────────────────────────────────────────────
export async function updateSnakeScore(
  matchId: string,
  playerUid: string,
  score: number,
  isGameOver: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const updates: any = {
    "snakeState.score": score,
    "snakeState.isGameOver": isGameOver,
    updatedAt: serverTimestamp(),
  };
  if (isGameOver) {
    updates.status = "FINISHED";
    if (score >= 50) {
      await awardAura(playerUid, score);
    }
  }
  await updateDoc(matchRef, updates);
}

// ── Wordle / Cipher Guess ────────────────────────────────────────────────────
export async function submitWordleGuess(
  matchId: string,
  playerUid: string,
  guess: string
): Promise<{ isWon: boolean; isGameOver: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.wordleState) throw new Error("Not a wordle match");

  const ws = match.wordleState;
  const uppercaseGuess = guess.toUpperCase();
  const guesses = [...ws.guesses, uppercaseGuess];
  const isWon = uppercaseGuess === ws.secretWord.toUpperCase();
  const isGameOver = isWon || guesses.length >= ws.maxAttempts;

  const updates: any = {
    "wordleState.guesses": guesses,
    "wordleState.isWon": isWon,
    "wordleState.isGameOver": isGameOver,
    updatedAt: serverTimestamp(),
  };

  if (isGameOver) {
    updates.status = "FINISHED";
    if (isWon) {
      updates.winnerUid = playerUid;
      updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
      await awardAura(playerUid, 100);
    }
  }

  await updateDoc(matchRef, updates);
  return { isWon, isGameOver };
}

// ── Sudoku Cell Move ─────────────────────────────────────────────────────────
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

// ── Ludo Actions ─────────────────────────────────────────────────────────────
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

      if (!LUDO_CONFIG.SAFE_STARS.includes(newPos)) {
        const otherTeams: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = (["RED", "GREEN", "BLUE", "YELLOW"] as const).filter(
          (t) => t !== team
        );
        for (const oTeam of otherTeams) {
          if (tokens[oTeam]) {
            tokens[oTeam] = tokens[oTeam].map((opp) => {
              if (opp.boardPosition === newPos && !opp.isHome) {
                captured = true;
                actionLog = `⚔️ ${player.handle || team} CAPTURED ${oTeam}'s Token on square ${newPos}!`;
                return { ...opp, stepCount: 0, boardPosition: -1 };
              }
              return opp;
            });
          }
        }
      }
      if (!captured) {
        actionLog = `${player.handle || team} moved Token ${tokenId + 1} to track square ${newPos}.`;
      }
    } else {
      token.boardPosition = 100 + (newStep - 51);
      actionLog = `${player.handle || team} moved Token ${tokenId + 1} into Home Corridor (${newStep - 51}/5).`;
    }
  }

  teamTokens[tokenIndex] = token;
  tokens[team] = teamTokens;

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

export async function passLudoTurn(matchId: string, playerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.ludoState) return;

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

// ── In-Game Live Chat Engine (Whitelisted room_messages collection) ───────────
export async function sendArcadeChatMessage(
  matchId: string,
  user: { uid: string; handle: string; avatar?: string },
  text: string
): Promise<void> {
  const db = getFirebaseDb();
  const msgRef = collection(db, "room_messages");
  const newDoc = doc(msgRef);
  await setDoc(newDoc, {
    roomId: matchId,
    uid: user.uid,
    handle: user.handle,
    avatar: user.avatar || "",
    text: text.trim(),
    createdAt: Date.now(),
    timestamp: serverTimestamp(),
  });
}

export function subscribeArcadeChat(
  matchId: string,
  callback: (messages: ArcadeChatMessage[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "room_messages"),
    where("roomId", "==", matchId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: ArcadeChatMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          handle: data.handle || "@ANON",
          avatar: data.avatar || "",
          text: data.text || "",
          timestamp: data.createdAt || (data.timestamp ? data.timestamp.toMillis() : Date.now()),
        };
      });
      // Client-side sort by timestamp
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    },
    (err) => {
      console.warn("[Arcade] chat listener note:", err.message);
      callback([]);
    }
  );
}

// ── Stage-Style Reaction Surge Engine (Whitelisted room_reactions collection) ──
export async function sendArcadeReaction(
  matchId: string,
  user: { uid: string; handle: string },
  emoji: string
): Promise<void> {
  const db = getFirebaseDb();
  const reactionRef = collection(db, "room_reactions");
  await addDoc(reactionRef, {
    roomId: matchId,
    uid: user.uid,
    handle: user.handle,
    emoji,
    createdAt: Date.now(),
    timestamp: serverTimestamp(),
  });
}

export function subscribeArcadeReactions(
  matchId: string,
  callback: (reaction: ArcadeReaction) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "room_reactions"),
    where("roomId", "==", matchId),
    limit(40)
  );

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
          const data = change.doc.data();
          if (data.emoji && data.uid) {
            callback({
              id: change.doc.id,
              uid: data.uid,
              handle: data.handle || "@ANON",
              emoji: data.emoji,
              timestamp: data.createdAt || Date.now(),
            });
          }
        }
      });
    },
    (err) => {
      console.warn("[Arcade] reaction listener note:", err.message);
    }
  );
}
