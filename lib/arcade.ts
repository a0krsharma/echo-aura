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
  | "wordle"
  | "pool"
  | "carrom"
  | "glow_hockey"
  | "gomoku"
  | "reversi"
  | "dots_and_boxes"
  | "snakes_and_ladders"
  | "puzzle15"
  | "mastermind";

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

export interface PoolBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  number?: number;
  type: "cue" | "solid" | "stripe" | "8ball";
  isPocketed: boolean;
}

export interface PoolState {
  ballsStr: string;
  currentTurnUid: string;
  p1Type: "SOLIDS" | "STRIPES" | null;
  p2Type: "SOLIDS" | "STRIPES" | null;
  p1Score: number;
  p2Score: number;
  lastShotStr?: string;
  lastActionLog?: string;
}

export interface CarromPiece {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: "white" | "black" | "queen" | "striker";
  isPocketed: boolean;
}

export interface CarromState {
  piecesStr: string;
  currentTurnUid: string;
  p1Score: number;
  p2Score: number;
  hasQueen: string | null;
  lastShotStr?: string;
  lastActionLog?: string;
}

export interface GlowHockeyState {
  p1Score: number;
  p2Score: number;
  puckStr: string;
  p1PaddleStr: string;
  p2PaddleStr: string;
  lastActionLog?: string;
}

export interface GomokuState {
  gridStr: string; // 15x15 (string | null)[][]
  currentTurn: "BLACK" | "WHITE";
  lastMove?: [number, number];
  lastActionLog?: string;
}

export interface ReversiState {
  boardStr: string; // 8x8 (string | null)[][]
  currentTurn: "DARK" | "LIGHT";
  darkCount: number;
  lightCount: number;
  lastActionLog?: string;
}

export interface DotsAndBoxesState {
  linesStr: string; // Record<string, string>
  boxesStr: string; // Record<string, string>
  p1Score: number;
  p2Score: number;
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface SnakesLaddersState {
  positionsStr: string; // Record<string, number>
  currentTurnUid: string;
  lastDiceRoll: number | null;
  lastActionLog?: string;
}

export interface Puzzle15State {
  tilesStr: string; // number[]
  moves: number;
  isWon: boolean;
  lastActionLog?: string;
}

export interface MastermindState {
  secretCode: number[];
  guessesStr: string; // { guess: number[]; strikes: number; balls: number }[]
  isWon: boolean;
  isGameOver: boolean;
  maxAttempts: number;
  lastActionLog?: string;
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
  poolState?: PoolState;
  carromState?: CarromState;
  glowHockeyState?: GlowHockeyState;
  gomokuState?: GomokuState;
  reversiState?: ReversiState;
  dotsAndBoxesState?: DotsAndBoxesState;
  snakesLaddersState?: SnakesLaddersState;
  puzzle15State?: Puzzle15State;
  mastermindState?: MastermindState;
  chatMessages?: ArcadeChatMessage[];
  recentReaction?: ArcadeReaction;
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
  } else if (params.gameType === "pool") {
    const poolBalls: PoolBall[] = [
      { id: "cue", x: 200, y: 320, vx: 0, vy: 0, radius: 10, color: "#ffffff", type: "cue", isPocketed: false },
      { id: "b1", x: 200, y: 150, vx: 0, vy: 0, radius: 10, color: "#eab308", number: 1, type: "solid", isPocketed: false },
      { id: "b2", x: 190, y: 133, vx: 0, vy: 0, radius: 10, color: "#3b82f6", number: 2, type: "solid", isPocketed: false },
      { id: "b3", x: 210, y: 133, vx: 0, vy: 0, radius: 10, color: "#ef4444", number: 3, type: "solid", isPocketed: false },
      { id: "b8", x: 200, y: 116, vx: 0, vy: 0, radius: 10, color: "#000000", number: 8, type: "8ball", isPocketed: false },
      { id: "b9", x: 180, y: 116, vx: 0, vy: 0, radius: 10, color: "#eab308", number: 9, type: "stripe", isPocketed: false },
      { id: "b10", x: 220, y: 116, vx: 0, vy: 0, radius: 10, color: "#3b82f6", number: 10, type: "stripe", isPocketed: false },
      { id: "b11", x: 170, y: 99, vx: 0, vy: 0, radius: 10, color: "#ef4444", number: 11, type: "stripe", isPocketed: false },
      { id: "b4", x: 190, y: 99, vx: 0, vy: 0, radius: 10, color: "#8b5cf6", number: 4, type: "solid", isPocketed: false },
      { id: "b5", x: 210, y: 99, vx: 0, vy: 0, radius: 10, color: "#f97316", number: 5, type: "solid", isPocketed: false },
      { id: "b12", x: 230, y: 99, vx: 0, vy: 0, radius: 10, color: "#8b5cf6", number: 12, type: "stripe", isPocketed: false },
    ];
    matchData.poolState = {
      ballsStr: JSON.stringify(poolBalls),
      currentTurnUid: params.hostUid,
      p1Type: null,
      p2Type: null,
      p1Score: 0,
      p2Score: 0,
      lastActionLog: "8-Ball Table active. Break the rack!",
    };
  } else if (params.gameType === "carrom") {
    const carromPieces: CarromPiece[] = [
      { id: "queen", x: 200, y: 200, vx: 0, vy: 0, radius: 11, color: "#ef4444", type: "queen", isPocketed: false },
      { id: "w1", x: 200, y: 178, vx: 0, vy: 0, radius: 11, color: "#ffffff", type: "white", isPocketed: false },
      { id: "b1", x: 200, y: 222, vx: 0, vy: 0, radius: 11, color: "#262626", type: "black", isPocketed: false },
      { id: "w2", x: 181, y: 189, vx: 0, vy: 0, radius: 11, color: "#ffffff", type: "white", isPocketed: false },
      { id: "b2", x: 219, y: 189, vx: 0, vy: 0, radius: 11, color: "#262626", type: "black", isPocketed: false },
      { id: "w3", x: 181, y: 211, vx: 0, vy: 0, radius: 11, color: "#ffffff", type: "white", isPocketed: false },
      { id: "b3", x: 219, y: 211, vx: 0, vy: 0, radius: 11, color: "#262626", type: "black", isPocketed: false },
      { id: "striker", x: 200, y: 325, vx: 0, vy: 0, radius: 16, color: "#10b981", type: "striker", isPocketed: false },
    ];
    matchData.carromState = {
      piecesStr: JSON.stringify(carromPieces),
      currentTurnUid: params.hostUid,
      p1Score: 0,
      p2Score: 0,
      hasQueen: null,
      lastActionLog: "Carrom Board set. Line up your striker & shoot!",
    };
  } else if (params.gameType === "glow_hockey") {
    matchData.glowHockeyState = {
      p1Score: 0,
      p2Score: 0,
      puckStr: JSON.stringify({ x: 200, y: 250, vx: 0, vy: 0 }),
      p1PaddleStr: JSON.stringify({ x: 200, y: 420 }),
      p2PaddleStr: JSON.stringify({ x: 200, y: 80 }),
      lastActionLog: "Glow Hockey arena ready. Drag paddle to defend & score!",
    };
  } else if (params.gameType === "gomoku") {
    const grid = Array.from({ length: 15 }, () => Array(15).fill(null));
    matchData.gomokuState = {
      gridStr: JSON.stringify(grid),
      currentTurn: "BLACK",
      lastActionLog: "Gomoku matrix initialized. BLACK places first stone.",
    };
  } else if (params.gameType === "reversi") {
    const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[3][3] = "LIGHT";
    board[3][4] = "DARK";
    board[4][3] = "DARK";
    board[4][4] = "LIGHT";
    matchData.reversiState = {
      boardStr: JSON.stringify(board),
      currentTurn: "DARK",
      darkCount: 2,
      lightCount: 2,
      lastActionLog: "Reversi board set. DARK moves first.",
    };
  } else if (params.gameType === "dots_and_boxes") {
    matchData.dotsAndBoxesState = {
      linesStr: JSON.stringify({}),
      boxesStr: JSON.stringify({}),
      p1Score: 0,
      p2Score: 0,
      currentTurnUid: params.hostUid,
      lastActionLog: "Dots and Boxes active. Connect dots to claim boxes!",
    };
  } else if (params.gameType === "snakes_and_ladders") {
    const posMap: Record<string, number> = { [params.hostUid]: 1 };
    matchData.snakesLaddersState = {
      positionsStr: JSON.stringify(posMap),
      currentTurnUid: params.hostUid,
      lastDiceRoll: null,
      lastActionLog: "Circuit Jumpers ready. Roll dice to climb!",
    };
  } else if (params.gameType === "puzzle15") {
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]; // Shuffled solvable layout
    matchData.puzzle15State = {
      tilesStr: JSON.stringify(tiles),
      moves: 0,
      isWon: false,
      lastActionLog: "15-Puzzle initialized. Slide tiles into 1-15 order.",
    };
  } else if (params.gameType === "mastermind") {
    const code = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    matchData.mastermindState = {
      secretCode: code,
      guessesStr: JSON.stringify([]),
      isWon: false,
      isGameOver: false,
      maxAttempts: 10,
      lastActionLog: "Mastermind Cipher engaged. 10 attempts to crack 4-digit code.",
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

// ── 8-Ball Pool Actions ───────────────────────────────────────────────────────
export async function firePoolShot(
  matchId: string,
  playerUid: string,
  impulseX: number,
  impulseY: number,
  updatedBalls: PoolBall[]
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.poolState) return;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids.find((id) => id !== playerUid) || playerUid;
  const eightBall = updatedBalls.find((b) => b.type === "8ball");
  const isEightBallSunk = eightBall?.isPocketed;

  const updates: any = {
    "poolState.ballsStr": JSON.stringify(updatedBalls),
    "poolState.lastShotStr": JSON.stringify({ impulseX, impulseY, timestamp: Date.now() }),
    "poolState.currentTurnUid": nextTurnUid,
    "poolState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} struck the cue ball!`,
    updatedAt: serverTimestamp(),
  };

  if (isEightBallSunk) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
}

// ── Carrom Board Actions ──────────────────────────────────────────────────────
export async function fireCarromShot(
  matchId: string,
  playerUid: string,
  impulseX: number,
  impulseY: number,
  strikerX: number,
  strikerY: number,
  updatedPieces: CarromPiece[]
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.carromState) return;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids.find((id) => id !== playerUid) || playerUid;
  const remainingTargets = updatedPieces.filter((p) => p.type !== "striker" && !p.isPocketed);

  const updates: any = {
    "carromState.piecesStr": JSON.stringify(updatedPieces),
    "carromState.lastShotStr": JSON.stringify({ impulseX, impulseY, strikerX, strikerY, timestamp: Date.now() }),
    "carromState.currentTurnUid": nextTurnUid,
    "carromState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} released the striker!`,
    updatedAt: serverTimestamp(),
  };

  if (remainingTargets.length === 0) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
}

// ── Glow Hockey Actions ───────────────────────────────────────────────────────
export async function updateGlowHockeyScore(
  matchId: string,
  scorerUid: string,
  p1Score: number,
  p2Score: number
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;

  const isWon = p1Score >= 7 || p2Score >= 7;
  const updates: any = {
    "glowHockeyState.p1Score": p1Score,
    "glowHockeyState.p2Score": p2Score,
    "glowHockeyState.lastActionLog": `GOAL! ${match.players[scorerUid]?.handle || "Player"} scored!`,
    updatedAt: serverTimestamp(),
  };

  if (isWon) {
    updates.status = "FINISHED";
    updates.winnerUid = scorerUid;
    updates.winnerHandle = match.players[scorerUid]?.handle || "@ANON";
    await awardAura(scorerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
}

// ── Gomoku Actions (Five in a Row) ───────────────────────────────────────────
export async function makeGomokuMove(
  matchId: string,
  playerUid: string,
  r: number,
  c: number
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.gomokuState) throw new Error("Not a gomoku match");

  const grid: (string | null)[][] = JSON.parse(match.gomokuState.gridStr || "[]");
  if (grid[r][c] !== null) throw new Error("Cell occupied");

  const color = match.gomokuState.currentTurn;
  grid[r][c] = color;

  // Check 5 in a row in 4 directions
  const checkWin = (row: number, col: number, clr: string): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let count = 1;
      // Forward
      for (let i = 1; i < 5; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr][nc] === clr) count++;
        else break;
      }
      // Backward
      for (let i = 1; i < 5; i++) {
        const nr = row - dr * i;
        const nc = col - dc * i;
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr][nc] === clr) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const won = checkWin(r, c, color);
  const nextTurn = color === "BLACK" ? "WHITE" : "BLACK";

  const updates: any = {
    "gomokuState.gridStr": JSON.stringify(grid),
    "gomokuState.currentTurn": nextTurn,
    "gomokuState.lastMove": [r, c],
    "gomokuState.lastActionLog": `${match.players[playerUid]?.handle || color} placed at [${r + 1}, ${c + 1}].`,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { won };
}

// ── Reversi / Othello Actions ─────────────────────────────────────────────────
export async function makeReversiMove(
  matchId: string,
  playerUid: string,
  r: number,
  c: number
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.reversiState) throw new Error("Not a reversi match");

  const board: (string | null)[][] = JSON.parse(match.reversiState.boardStr || "[]");
  const currentTurn = match.reversiState.currentTurn;
  const oppColor = currentTurn === "DARK" ? "LIGHT" : "DARK";

  if (board[r][c] !== null) throw new Error("Cell occupied");

  // Flip in 8 directions
  const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  let totalFlipped = 0;

  directions.forEach(([dr, dc]) => {
    let nr = r + dr;
    let nc = c + dc;
    const toFlip: [number, number][] = [];

    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === oppColor) {
      toFlip.push([nr, nc]);
      nr += dr;
      nc += dc;
    }

    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === currentTurn && toFlip.length > 0) {
      toFlip.forEach(([fr, fc]) => {
        board[fr][fc] = currentTurn;
      });
      totalFlipped += toFlip.length;
    }
  });

  if (totalFlipped === 0) throw new Error("Illegal move");
  board[r][c] = currentTurn;

  let darkCount = 0;
  let lightCount = 0;
  let emptyCount = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === "DARK") darkCount++;
      else if (board[row][col] === "LIGHT") lightCount++;
      else emptyCount++;
    }
  }

  const isFinished = emptyCount === 0 || darkCount === 0 || lightCount === 0;
  const nextTurn = currentTurn === "DARK" ? "LIGHT" : "DARK";

  const updates: any = {
    "reversiState.boardStr": JSON.stringify(board),
    "reversiState.currentTurn": nextTurn,
    "reversiState.darkCount": darkCount,
    "reversiState.lightCount": lightCount,
    "reversiState.lastActionLog": `${match.players[playerUid]?.handle || currentTurn} placed disk at [${r + 1}, ${c + 1}] and flipped ${totalFlipped}!`,
    updatedAt: serverTimestamp(),
  };

  if (isFinished) {
    updates.status = "FINISHED";
    const winnerUid = darkCount > lightCount ? match.hostUid : Object.keys(match.players).find(u => u !== match.hostUid) || match.hostUid;
    updates.winnerUid = winnerUid;
    updates.winnerHandle = match.players[winnerUid]?.handle || "@ANON";
    await awardAura(winnerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { won: isFinished };
}

// ── Dots and Boxes Actions ────────────────────────────────────────────────────
export async function claimDotsLine(
  matchId: string,
  playerUid: string,
  lineKey: string
): Promise<{ extraTurn: boolean; won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.dotsAndBoxesState) throw new Error("Not a dots and boxes match");

  const lines: Record<string, string> = JSON.parse(match.dotsAndBoxesState.linesStr || "{}");
  const boxes: Record<string, string> = JSON.parse(match.dotsAndBoxesState.boxesStr || "{}");

  if (lines[lineKey]) throw new Error("Line already claimed");
  lines[lineKey] = playerUid;

  // Check 3x3 completed boxes
  let newBoxesClaimed = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const boxKey = `b_${r}_${c}`;
      if (!boxes[boxKey]) {
        const top = `h_${r}_${c}`;
        const bottom = `h_${r + 1}_${c}`;
        const left = `v_${r}_${c}`;
        const right = `v_${r}_${c + 1}`;

        if (lines[top] && lines[bottom] && lines[left] && lines[right]) {
          boxes[boxKey] = playerUid;
          newBoxesClaimed++;
        }
      }
    }
  }

  const isP1 = playerUid === match.hostUid;
  let p1Score = match.dotsAndBoxesState.p1Score + (isP1 ? newBoxesClaimed : 0);
  let p2Score = match.dotsAndBoxesState.p2Score + (!isP1 ? newBoxesClaimed : 0);

  const totalBoxes = Object.keys(boxes).length;
  const isFinished = totalBoxes >= 9;
  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = newBoxesClaimed > 0 ? playerUid : playerUids.find((id) => id !== playerUid) || playerUid;

  const updates: any = {
    "dotsAndBoxesState.linesStr": JSON.stringify(lines),
    "dotsAndBoxesState.boxesStr": JSON.stringify(boxes),
    "dotsAndBoxesState.p1Score": p1Score,
    "dotsAndBoxesState.p2Score": p2Score,
    "dotsAndBoxesState.currentTurnUid": nextTurnUid,
    "dotsAndBoxesState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} drew line ${lineKey}${newBoxesClaimed > 0 ? ` and captured ${newBoxesClaimed} box(es)!` : "!"}`,
    updatedAt: serverTimestamp(),
  };

  if (isFinished) {
    updates.status = "FINISHED";
    const winnerUid = p1Score >= p2Score ? match.hostUid : playerUids.find((id) => id !== match.hostUid) || match.hostUid;
    updates.winnerUid = winnerUid;
    updates.winnerHandle = match.players[winnerUid]?.handle || "@ANON";
    await awardAura(winnerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { extraTurn: newBoxesClaimed > 0, won: isFinished };
}

// ── Snakes & Ladders Actions ──────────────────────────────────────────────────
const CIRCUIT_SHORTCUTS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91, // Ladders / Bypass
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78, // Snakes / Glitches
};

export async function rollSnakesLaddersDice(
  matchId: string,
  playerUid: string
): Promise<{ roll: number; newPos: number; won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.snakesLaddersState) throw new Error("Not a snakes & ladders match");

  const roll = Math.floor(Math.random() * 6) + 1;
  const positions: Record<string, number> = JSON.parse(match.snakesLaddersState.positionsStr || "{}");
  let currentPos = positions[playerUid] || 1;
  let nextPos = currentPos + roll;

  if (nextPos > 100) nextPos = currentPos; // Exact roll needed to land on 100
  if (CIRCUIT_SHORTCUTS[nextPos]) nextPos = CIRCUIT_SHORTCUTS[nextPos];

  positions[playerUid] = nextPos;
  const won = nextPos >= 100;
  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = roll === 6 ? playerUid : playerUids.find((id) => id !== playerUid) || playerUid;

  const updates: any = {
    "snakesLaddersState.positionsStr": JSON.stringify(positions),
    "snakesLaddersState.currentTurnUid": nextTurnUid,
    "snakesLaddersState.lastDiceRoll": roll,
    "snakesLaddersState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} rolled a ${roll}! Position: ${nextPos}/100.`,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { roll, newPos: nextPos, won };
}

// ── 15-Puzzle Actions ────────────────────────────────────────────────────────
export async function slide15PuzzleTile(
  matchId: string,
  playerUid: string,
  index: number
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.puzzle15State) throw new Error("Not a 15-puzzle match");

  const tiles: number[] = JSON.parse(match.puzzle15State.tilesStr || "[]");
  const emptyIndex = tiles.indexOf(0);

  const row = Math.floor(index / 4);
  const col = index % 4;
  const emptyRow = Math.floor(emptyIndex / 4);
  const emptyCol = emptyIndex % 4;

  const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                     (Math.abs(col - emptyCol) === 1 && row === emptyRow);

  if (!isAdjacent) return { won: false };

  // Swap
  tiles[emptyIndex] = tiles[index];
  tiles[index] = 0;

  // Check 1-15 order
  let won = true;
  for (let i = 0; i < 15; i++) {
    if (tiles[i] !== i + 1) {
      won = false;
      break;
    }
  }

  const updates: any = {
    "puzzle15State.tilesStr": JSON.stringify(tiles),
    "puzzle15State.moves": increment(1),
    "puzzle15State.isWon": won,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, 150);
  }

  await updateDoc(matchRef, updates);
  return { won };
}

// ── Mastermind Actions ───────────────────────────────────────────────────────
export async function submitMastermindGuess(
  matchId: string,
  playerUid: string,
  guess: number[]
): Promise<{ strikes: number; balls: number; won: boolean; isGameOver: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.mastermindState) throw new Error("Not a mastermind match");

  const secret = match.mastermindState.secretCode;
  let strikes = 0;
  let balls = 0;

  const secretCounts: Record<number, number> = {};
  const guessCounts: Record<number, number> = {};

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      strikes++;
    } else {
      secretCounts[secret[i]] = (secretCounts[secret[i]] || 0) + 1;
      guessCounts[guess[i]] = (guessCounts[guess[i]] || 0) + 1;
    }
  }

  for (const digit in guessCounts) {
    const d = Number(digit);
    if (secretCounts[d]) {
      balls += Math.min(guessCounts[d], secretCounts[d]);
    }
  }

  const guesses: { guess: number[]; strikes: number; balls: number }[] = JSON.parse(match.mastermindState.guessesStr || "[]");
  guesses.push({ guess, strikes, balls });

  const isWon = strikes === 4;
  const isGameOver = isWon || guesses.length >= match.mastermindState.maxAttempts;

  const updates: any = {
    "mastermindState.guessesStr": JSON.stringify(guesses),
    "mastermindState.isWon": isWon,
    "mastermindState.isGameOver": isGameOver,
    updatedAt: serverTimestamp(),
  };

  if (isGameOver) {
    updates.status = "FINISHED";
    if (isWon) {
      updates.winnerUid = playerUid;
      updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
      await awardAura(playerUid, 150);
    }
  }

  await updateDoc(matchRef, updates);
  return { strikes, balls, won: isWon, isGameOver };
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

// ── In-Game Live Chat Engine (Zero Permission Issues // Match Doc Sync) ───────
export async function sendArcadeChatMessage(
  matchId: string,
  user: { uid: string; handle: string; avatar?: string },
  text: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const currentMessages: ArcadeChatMessage[] = match.chatMessages || [];
  const newMsg: ArcadeChatMessage = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    uid: user.uid,
    handle: user.handle,
    avatar: user.avatar || "",
    text: text.trim(),
    timestamp: Date.now(),
  };
  const updatedMessages = [...currentMessages.slice(-49), newMsg];
  await updateDoc(matchRef, {
    chatMessages: updatedMessages,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeArcadeChat(
  matchId: string,
  callback: (messages: ArcadeChatMessage[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);

  return onSnapshot(
    matchRef,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const data = snap.data() as ArcadeMatch;
      callback(data.chatMessages || []);
    },
    (err) => {
      console.warn("[Arcade] chat listener note:", err.message);
      callback([]);
    }
  );
}

// ── Stage-Style Reaction Surge Engine (Match Doc Sync) ────────────────────────
export async function sendArcadeReaction(
  matchId: string,
  user: { uid: string; handle: string },
  emoji: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  await updateDoc(matchRef, {
    recentReaction: {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uid: user.uid,
      handle: user.handle,
      emoji,
      timestamp: Date.now(),
    },
    updatedAt: serverTimestamp(),
  });
}

export function subscribeArcadeReactions(
  matchId: string,
  callback: (reaction: ArcadeReaction) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);

  let lastReactionId = "";
  return onSnapshot(
    matchRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as ArcadeMatch;
      if (data.recentReaction && data.recentReaction.id !== lastReactionId) {
        lastReactionId = data.recentReaction.id;
        callback(data.recentReaction);
      }
    },
    (err) => {
      console.warn("[Arcade] reaction listener note:", err.message);
    }
  );
}
