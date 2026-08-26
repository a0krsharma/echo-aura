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
  type Unsubscribe, runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { awardAura } from "@/lib/userDoc";

export type ArcadeGameType =
  | "roast_ring"
  | "one_breath"
  | "laughing_trap"
  | "tone_shift"
  | "mushaira"
  | "singer_roleplay"
  | "news_anchor"
  | "courtroom_debate"
  | "antakshari"
  | "ludo"
  | "chess"
  | "connect4"
  | "sudoku"
  | "minesweeper"
  | "2048"
  | "snake"
  | "wordle"
  | "glow_hockey"
  | "gomoku"
  | "reversi"
  | "dots_and_boxes"
  | "snakes_and_ladders"
  | "puzzle15"
  | "mastermind"
  | "poker"
  | "blackjack"
  | "uno"
  | "rummy"
  | "call_break"
  | "teen_patti"
  | "satte_pe_satta"
  | "bhabhi_thulla"
  | "mendicot"
  | "cheat_bluff"
  | "hearts"
  | "speed"
  | "solitaire"
  | "codenames"
  | "spyfall"
  | "skribbl"
  | "trivia"
  | "quoridor"
  | "go"
  | "taboo"
  | "melody_buzzer"
  | "pitch_arena"
  | "twenty_questions"
  | "raja_mantri"
  | "hand_cricket"
  | "book_cricket"
  | "bingo"
  | "npat"
  | "bagh_chal"
  | "nine_mens_morris"
  | "chain_reaction"
  | "neon_pong"
  | "two_truths"
  | "hot_potato"
  | "dilemma_debate"
  | "hangman"
  | "math_blitz"
  | "pool"
  | "carrom"
  | "liars_dice"
  | "battleship"
  | "yahtzee"
  | "pen_fight"
  | "monopoly";

export type ArcadeMatchMode = "MULTIPLAYER" | "VS_COMPUTER";

// Whitelisted collection in production Firebase
const ARCADE_COLLECTION = "arcade_matches";

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
  p1Due?: number;
  p2Due?: number;
  dueCount?: number;
  hasQueen: string | null;
  queenCovered?: boolean;
  queenCoverAttempt?: boolean;
  queenPendingUid?: string | null;
  playerColors?: Record<string, "WHITE" | "BLACK">;
  foulCount?: Record<string, number>;
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

export interface PokerState {
  communityCards: string[];
  pot: number;
  currentBet: number;
  round: "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";
  currentTurnUid: string;
  playerBets: Record<string, number>;
  playerHands: Record<string, string[]>;
  foldedUids: string[];
  lastActionLog?: string;
}

export interface BlackjackState {
  playerHands: Record<string, string[]>;
  dealerHand: string[];
  playerBets: Record<string, number>;
  playerStatuses: Record<string, "PLAYING" | "STAND" | "BUST" | "BLACKJACK">;
  dealerRevealed: boolean;
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface UnoCard {
  color: "RED" | "BLUE" | "GREEN" | "YELLOW" | "WILD";
  value: string;
}

export interface UnoState {
  discardTop: UnoCard;
  handsStr: string; // Record<string, UnoCard[]>
  drawDeckStr?: string; // UnoCard[]
  currentTurnUid: string;
  direction: 1 | -1;
  drawCountPenalty: number;
  hasCalledUno?: Record<string, boolean>;
  pendingDrawStack?: number;
  pendingDrawType?: "+2" | "+4" | null;
  pendingSwapUid?: string | null;
  discardHistoryStr?: string;
  lastActionLog?: string;
}

export function createUnoDeck(): UnoCard[] {
  const colors: ("RED" | "BLUE" | "GREEN" | "YELLOW")[] = ["RED", "BLUE", "GREEN", "YELLOW"];
  const deck: UnoCard[] = [];

  // Build standard 108-card deck
  for (const color of colors) {
    deck.push({ color, value: "0" });
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: i.toString() });
      deck.push({ color, value: i.toString() });
    }
    deck.push({ color, value: "SKIP" });
    deck.push({ color, value: "SKIP" });
    deck.push({ color, value: "REVERSE" });
    deck.push({ color, value: "REVERSE" });
    deck.push({ color, value: "+2" });
    deck.push({ color, value: "+2" });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: "WILD", value: "WILD" });
    deck.push({ color: "WILD", value: "+4" });
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface LiarsDiceState {
  diceRollsStr: string; // Record<string, number[]>
  currentBid: { count: number; face: number; bidderUid: string } | null;
  currentTurnUid: string;
  bluffCalled: boolean;
  lastActionLog?: string;
}

export interface CodenamesState {
  words: string[];
  cardTypes: string[]; // RED, BLUE, NEUTRAL, ASSASSIN
  revealed: boolean[];
  currentTeamTurn: "RED" | "BLUE";
  spymasterUids: string[];
  lastClue?: { clue: string; count: number };
  lastActionLog?: string;
}

export interface SpyfallState {
  secretLocation: string;
  impostorUid: string;
  roles: Record<string, string>;
  votes: Record<string, string>;
  isRevealed: boolean;
  lastActionLog?: string;
}

export interface SkribblState {
  currentDrawerUid: string;
  secretWord: string;
  wordHint: string;
  pathsStr: string;
  correctGuessers: string[];
  lastActionLog?: string;
}

export interface TriviaState {
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: { id: string; question: string; options: string[]; answerIndex: number };
  scores: Record<string, number>;
  answersSubmitted: Record<string, number>;
  lastActionLog?: string;
}

export interface QuoridorState {
  p1Pos: [number, number];
  p2Pos: [number, number];
  wallsStr: string; // { r: number; c: number; orientation: "H" | "V" }[]
  p1WallsLeft: number;
  p2WallsLeft: number;
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface GoState {
  boardStr: string; // 19x19 (string | null)[][]
  currentTurn: "BLACK" | "WHITE";
  capturedBlack: number;
  capturedWhite: number;
  lastActionLog?: string;
}

export interface YahtzeeState {
  dice: number[];
  rollsRemaining: number;
  lockedDice: boolean[];
  scorecardsStr: string; // Record<string, Record<string, number | null>>
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface TabooState {
  activeSpeakerUid: string;
  targetWord: string;
  forbiddenWords: string[];
  scores: Record<string, number>;
  lastActionLog?: string;
}

export interface MelodyBuzzerState {
  currentTrackTitle: string;
  hummerUid: string;
  buzzedPlayerUid: string | null;
  roundState: "HUMMING" | "BUZZED" | "SCORED";
  scores: Record<string, number>;
  lastActionLog?: string;
}

export interface PitchArenaState {
  currentPitcherUid: string;
  absurdPrompt: string;
  voltTips: Record<string, number>;
  lastActionLog?: string;
}

export interface TwentyQuestionsState {
  targetSubject: string;
  questionsRemaining: number;
  questionLogStr: string; // { askerHandle: string; question: string; answer: "YES" | "NO" | "IRRELEVANT" }[]
  lastActionLog?: string;
}

export interface RajaMantriState {
  chitsStr: string; // Record<string, "RAJA" | "MANTRI" | "CHOR" | "SIPAHI">
  rajaUid: string;
  mantriUid: string;
  guessedChorUid: string | null;
  scores: Record<string, number>;
  phase: "REVEAL" | "INTERROGATION" | "RESOLVED";
  lastActionLog?: string;
}

export interface HandCricketState {
  batsmanUid: string;
  bowlerUid: string;
  currentInnings: 1 | 2;
  innings1Score: number;
  innings2Score: number;
  currentBatsmanChoice: number | null;
  currentBowlerChoice: number | null;
  lastActionLog?: string;
}

export interface BookCricketState {
  currentBatsmanUid: string;
  runs: number;
  wickets: number;
  balls: number;
  lastFlippedPage: number | null;
  target: number | null;
  lastActionLog?: string;
}

export interface BingoState {
  gridsStr: string; // Record<string, number[][]>
  crossedNumbers: number[];
  completedLines: Record<string, number>;
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface NPATState {
  currentLetter: string;
  submissionsStr: string; // Record<string, { name: string; place: string; animal: string; thing: string }>
  roundScores: Record<string, number>;
  lastActionLog?: string;
}

export interface BaghChalState {
  tigersStr: string; // [number, number][]
  goatsStr: string; // [number, number][]
  goatsPlaced: number;
  goatsCaptured: number;
  currentTurn: "TIGER" | "GOAT";
  lastActionLog?: string;
}

export interface NineMensMorrisState {
  boardNodesStr: string; // Record<string, string | null>
  phase: "PLACEMENT" | "MOVEMENT";
  p1PiecesPlaced: number;
  p2PiecesPlaced: number;
  currentTurn: "P1" | "P2";
  lastActionLog?: string;
}

export interface ChainReactionState {
  gridStr: string; // { count: number; color: "RED" | "GREEN" | null }[][]
  currentTurn: "RED" | "GREEN";
  lastActionLog?: string;
}

export interface PenFightState {
  pensStr: string; // [{ id: string, x: number, y: number, vx: number, vy: number, isOffDesk: boolean }]
  currentTurnUid: string;
  lastActionLog?: string;
}

export interface NeonPongState {
  p1Score: number;
  p2Score: number;
  ballStr: string; // { x: number, y: number, vx: number, vy: number }
  p1PaddleY: number;
  p2PaddleY: number;
  lastActionLog?: string;
}

export interface TwoTruthsState {
  speakerUid: string;
  statements: string[];
  lieIndex: number;
  votes: Record<string, number>;
  isRevealed: boolean;
  lastActionLog?: string;
}

export interface HotPotatoState {
  currentHolderUid: string;
  question: string;
  lastActionLog?: string;
}

export interface DilemmaDebateState {
  dilemmaOptionA: string;
  dilemmaOptionB: string;
  votesA: string[];
  votesB: string[];
  lastActionLog?: string;
}

export interface HangmanState {
  secretWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrong: number;
  isWon: boolean;
  isGameOver: boolean;
  lastActionLog?: string;
}

export interface MathBlitzState {
  p1Score: number;
  p2Score: number;
  currentProblem: { num1: number; op: string; num2: number; answer: number };
  lastActionLog?: string;
}

export interface MonopolyPropertyMeta {
  id: number;
  name: string;
  group: "BROWN" | "LIGHT_BLUE" | "PINK" | "ORANGE" | "RED" | "YELLOW" | "GREEN" | "DARK_BLUE" | "RAILROAD" | "UTILITY" | "SPECIAL";
  price: number;
  houseCost: number;
  rent: number[]; // [base, 1h, 2h, 3h, 4h, hotel]
}

export const MONOPOLY_TILES: MonopolyPropertyMeta[] = [
  { id: 0, name: "GO", group: "SPECIAL", price: 0, houseCost: 0, rent: [200] },
  { id: 1, name: "Mediterranean Ave", group: "BROWN", price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
  { id: 2, name: "Community Chest", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 3, name: "Baltic Ave", group: "BROWN", price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { id: 4, name: "Income Tax", group: "SPECIAL", price: 0, houseCost: 0, rent: [200] },
  { id: 5, name: "Reading Railroad", group: "RAILROAD", price: 200, houseCost: 0, rent: [25, 50, 100, 200] },
  { id: 6, name: "Oriental Ave", group: "LIGHT_BLUE", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { id: 7, name: "Chance", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 8, name: "Vermont Ave", group: "LIGHT_BLUE", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { id: 9, name: "Connecticut Ave", group: "LIGHT_BLUE", price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { id: 10, name: "Jail / Visiting", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 11, name: "St. Charles Place", group: "PINK", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { id: 12, name: "Electric Company", group: "UTILITY", price: 150, houseCost: 0, rent: [4, 10] },
  { id: 13, name: "States Ave", group: "PINK", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { id: 14, name: "Virginia Ave", group: "PINK", price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { id: 15, name: "Pennsylvania RR", group: "RAILROAD", price: 200, houseCost: 0, rent: [25, 50, 100, 200] },
  { id: 16, name: "St. James Place", group: "ORANGE", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { id: 17, name: "Community Chest", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 18, name: "Tennessee Ave", group: "ORANGE", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { id: 19, name: "New York Ave", group: "ORANGE", price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { id: 20, name: "Free Parking", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 21, name: "Kentucky Ave", group: "RED", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { id: 22, name: "Chance", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 23, name: "Indiana Ave", group: "RED", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { id: 24, name: "Illinois Ave", group: "RED", price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { id: 25, name: "B&O Railroad", group: "RAILROAD", price: 200, houseCost: 0, rent: [25, 50, 100, 200] },
  { id: 26, name: "Atlantic Ave", group: "YELLOW", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { id: 27, name: "Ventnor Ave", group: "YELLOW", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { id: 28, name: "Water Works", group: "UTILITY", price: 150, houseCost: 0, rent: [4, 10] },
  { id: 29, name: "Marvin Gardens", group: "YELLOW", price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { id: 30, name: "Go To Jail", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 31, name: "Pacific Ave", group: "GREEN", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { id: 32, name: "North Carolina Ave", group: "GREEN", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { id: 33, name: "Community Chest", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 34, name: "Pennsylvania Ave", group: "GREEN", price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { id: 35, name: "Short Line RR", group: "RAILROAD", price: 200, houseCost: 0, rent: [25, 50, 100, 200] },
  { id: 36, name: "Chance", group: "SPECIAL", price: 0, houseCost: 0, rent: [0] },
  { id: 37, name: "Park Place", group: "DARK_BLUE", price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { id: 38, name: "Luxury Tax", group: "SPECIAL", price: 0, houseCost: 0, rent: [100] },
  { id: 39, name: "Boardwalk", group: "DARK_BLUE", price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

export interface MonopolyPropertyState {
  ownerUid: string | null;
  houses: number; // 0-4 houses, 5 = hotel
  isMortgaged: boolean;
}

export interface MonopolyState {
  currentTurnUid: string;
  positionsStr: string; // Record<string, number> (0-39)
  cashStr: string; // Record<string, number> (default $1500)
  propertiesStr: string; // Record<number, MonopolyPropertyState>
  inJailTurnsStr: string; // Record<string, number>
  lastDiceRoll: [number, number]; // [d1, d2]
  consecutiveDoubles: number;
  hasRolledThisTurn: boolean;
  isBankruptStr: string; // Record<string, boolean>
  lastActionLog?: string;
  pendingTileAction?: {
    tileIndex: number;
    type: "UNOWNED_PROPERTY" | "RENT_PAID" | "TAX" | "WARP" | "JAIL" | "GO";
    amount?: number;
    propId?: number;
  } | null;
}

export interface RummyState {
  currentTurnUid: string;
  wildJoker: string; // e.g. "8♠"
  discardTop: string; // e.g. "4♥"
  drawDeckCount: number;
  handsStr: string; // Record<string, string[]> (13 cards per player)
  hasDrawn: boolean;
  meldsStr: string; // Record<string, string[][]> (groups of cards)
  scores: Record<string, number>;
  lastActionLog?: string;
}

export interface CallBreakState {
  currentTurnUid: string;
  round: number; // 1 to 5
  phase: "BIDDING" | "PLAYING" | "ROUND_END";
  bids: Record<string, number>; // e.g. { uid: 3 }
  tricksWon: Record<string, number>; // e.g. { uid: 4 }
  currentTrick: { playerUid: string; card: string }[];
  ledSuit: string | null;
  handsStr: string; // Record<string, string[]>
  totalScores: Record<string, number>;
  lastActionLog?: string;
}

export interface TeenPattiState {
  currentTurnUid: string;
  bootAmount: number;
  currentStake: number;
  pot: number;
  handsStr: string; // Record<string, string[]> (3 cards per player)
  seenPlayers: Record<string, boolean>; // uid -> boolean
  foldedPlayers: Record<string, boolean>; // uid -> boolean
  playerBets: Record<string, number>;
  round: number;
  lastActionLog?: string;
}

export interface SattePeSattaState {
  currentTurnUid: string;
  tableSuitsStr: string; // Record<string, { min: number; max: number; hasSeven: boolean }>
  handsStr: string; // Record<string, string[]>
  passedPlayers: string[];
  lastActionLog?: string;
}

export interface BhabhiThullaState {
  currentTurnUid: string;
  currentTrick: { playerUid: string; card: string }[];
  ledSuit: string | null;
  handsStr: string; // Record<string, string[]>
  escapedPlayers: string[];
  bhabhiUid: string | null;
  lastActionLog?: string;
}

export interface MendicotState {
  currentTurnUid: string;
  trumpSuit: string | null;
  team1TensCount: number; // Team 1 (Host + P3)
  team2TensCount: number; // Team 2 (P2 + P4)
  currentTrick: { playerUid: string; card: string }[];
  ledSuit: string | null;
  handsStr: string; // Record<string, string[]>
  lastActionLog?: string;
}

export interface CheatBluffState {
  currentTurnUid: string;
  currentRank: string; // "A", "2", "3", ... "K"
  lastDiscardCount: number;
  lastDiscardCards: string[]; // actual secret cards
  lastDiscarderUid: string | null;
  pileCount: number;
  handsStr: string; // Record<string, string[]>
  lastActionLog?: string;
}

export interface SolitaireState {
  tableauStr: string; // string[][] (7 columns of cards)
  tableauFlippedStr: string; // boolean[][]
  foundationsStr: string; // Record<string, string[]> (4 suits)
  stockpileStr: string; // string[]
  wasteStr: string; // string[]
  moves: number;
  score: number;
  lastActionLog?: string;
}

export interface HeartsState {
  currentTurnUid: string;
  currentTrick: { playerUid: string; card: string }[];
  ledSuit: string | null;
  heartsBroken: boolean;
  handsStr: string; // Record<string, string[]>
  penaltyScores: Record<string, number>;
  lastActionLog?: string;
}

export interface SpeedState {
  p1Hand: string[];
  p2Hand: string[];
  centerPiles: [string, string]; // [leftCard, rightCard]
  p1ReserveCount: number;
  p2ReserveCount: number;
  lastActionLog?: string;
}


export interface AntakshariHistoryItem {
  letter: string;
  song: string;
  singerHandle: string;
  timestamp: number;
}

export interface AntakshariState {
  currentLetter: string;
  currentTurnUid: string;
  round: number;
  songHistory: AntakshariHistoryItem[];
  scores: Record<string, number>;
  timeRemainingSec: number;
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
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  winnerUid?: string;
  spectatorWagers?: Record<string, { playerUid: string; amount: number; }>;
  winnerHandle?: string;
  lastSpectatorEvent?: { type: string; handle: string; ts: number };
  rummyState?: RummyState;
  callBreakState?: CallBreakState;
  teenPattiState?: TeenPattiState;
  sattePeSattaState?: SattePeSattaState;
  bhabhiThullaState?: BhabhiThullaState;
  mendicotState?: MendicotState;
  cheatBluffState?: CheatBluffState;
  solitaireState?: SolitaireState;
  heartsState?: HeartsState;
  speedState?: SpeedState;
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
  pokerState?: PokerState;
  blackjackState?: BlackjackState;
  unoState?: UnoState;
  liarsDiceState?: LiarsDiceState;
  codenamesState?: CodenamesState;
  spyfallState?: SpyfallState;
  skribblState?: SkribblState;
  triviaState?: TriviaState;
  quoridorState?: QuoridorState;
  goState?: GoState;
  yahtzeeState?: YahtzeeState;
  tabooState?: TabooState;
  melodyBuzzerState?: MelodyBuzzerState;
  antakshariState?: AntakshariState;
  pitchArenaState?: PitchArenaState;
  twentyQuestionsState?: TwentyQuestionsState;
  rajaMantriState?: RajaMantriState;
  handCricketState?: HandCricketState;
  bookCricketState?: BookCricketState;
  bingoState?: BingoState;
  npatState?: NPATState;
  baghChalState?: BaghChalState;
  nineMensMorrisState?: NineMensMorrisState;
  chainReactionState?: ChainReactionState;
  penFightState?: PenFightState;
  neonPongState?: NeonPongState;
  twoTruthsState?: TwoTruthsState;
  hotPotatoState?: HotPotatoState;
  dilemmaDebateState?: DilemmaDebateState;
  hangmanState?: HangmanState;
  mathBlitzState?: MathBlitzState;
  monopolyState?: MonopolyState;
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
  id?: string;
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
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}): Promise<string> {
  const db = getFirebaseDb();
  const matchRef = params.id ? doc(db, ARCADE_COLLECTION, params.id) : doc(collection(db, ARCADE_COLLECTION));
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

  // If VS Computer, instantiate AI Bots for all game modes
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
    } else if (params.gameType === "raja_mantri") {
      const botNames = ["@CHIT_AI_01", "@CHIT_AI_02", "@CHIT_AI_03"];
      for (let i = 0; i < 3; i++) {
        const botUid = `bot_${matchId}_chit_${i + 1}`;
        players[botUid] = {
          uid: botUid,
          handle: botNames[i],
          score: 0,
          mistakes: 0,
          ready: true,
          isBot: true,
          joinedAt: Date.now(),
        };
      }
    } else {
      const botUid = `bot_${matchId}_ai`;
      const botName = `@CYBER_AI_${params.gameType.toUpperCase().slice(0, 4)}`;
      players[botUid] = {
        uid: botUid,
        handle: botName,
        score: 0,
        mistakes: 0,
        team: params.gameType === "chess" ? "BLACK" : undefined,
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
    difficulty: params.difficulty || "MEDIUM",
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
    const apexX = 190, apexY = 140, r = 10, spacingY = 17, spacingX = 20;
    const poolBalls: PoolBall[] = [
      { id: "cue", x: 190, y: 360, vx: 0, vy: 0, radius: r, color: "#ffffff", type: "cue", isPocketed: false },
      { id: "b1", x: apexX, y: apexY, vx: 0, vy: 0, radius: r, color: "#eab308", number: 1, type: "solid", isPocketed: false },
      { id: "b2", x: apexX - spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: "#2563eb", number: 2, type: "solid", isPocketed: false },
      { id: "b9", x: apexX + spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: "#eab308", number: 9, type: "stripe", isPocketed: false },
      { id: "b3", x: apexX - spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: "#dc2626", number: 3, type: "solid", isPocketed: false },
      { id: "b8", x: apexX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: "#09090b", number: 8, type: "8ball", isPocketed: false },
      { id: "b10", x: apexX + spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: "#2563eb", number: 10, type: "stripe", isPocketed: false },
      { id: "b4", x: apexX - 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: "#7c3aed", number: 4, type: "solid", isPocketed: false },
      { id: "b11", x: apexX - 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: "#dc2626", number: 11, type: "stripe", isPocketed: false },
      { id: "b5", x: apexX + 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: "#ea580c", number: 5, type: "solid", isPocketed: false },
      { id: "b12", x: apexX + 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: "#7c3aed", number: 12, type: "stripe", isPocketed: false },
      { id: "b6", x: apexX - 2 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: "#16a34a", number: 6, type: "solid", isPocketed: false },
      { id: "b13", x: apexX - 1 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: "#ea580c", number: 13, type: "stripe", isPocketed: false },
      { id: "b7", x: apexX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: "#7f1d1d", number: 7, type: "solid", isPocketed: false },
      { id: "b14", x: apexX + 1 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: "#16a34a", number: 14, type: "stripe", isPocketed: false },
      { id: "b15", x: apexX + 2 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: "#7f1d1d", number: 15, type: "stripe", isPocketed: false },
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
        // Official 19-Piece Tournament Carrom Rack
    const cx = 200, cy = 200, r = 11.5;
    const carromPieces: CarromPiece[] = [
      { id: "queen", x: cx, y: cy, vx: 0, vy: 0, radius: r, color: "#dc2626", type: "queen", isPocketed: false }
    ];

    // Inner Ring: 6 pieces (3 White, 3 Black alternating) at distance 2r = 23
    const r1 = 23;
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180);
      const isWhite = i % 2 === 0;
      carromPieces.push({
        id: isWhite ? `w${Math.floor(i / 2) + 1}` : `b${Math.floor(i / 2) + 1}`,
        x: Math.round((cx + r1 * Math.cos(angle)) * 10) / 10,
        y: Math.round((cy + r1 * Math.sin(angle)) * 10) / 10,
        vx: 0, vy: 0, radius: r,
        color: isWhite ? "#ffffff" : "#1f2937",
        type: isWhite ? "white" : "black",
        isPocketed: false
      });
    }

    // Outer Ring: 12 pieces (6 White, 6 Black alternating)
    const r2A = 46;      // Vertex distance
    const r2B = 39.84;   // Edge distance
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const dist = i % 2 === 0 ? r2A : r2B;
      const isWhite = i % 2 === 1; // Alternating
      const countIndex = Math.floor(i / 2) + 4;
      carromPieces.push({
        id: isWhite ? `w${countIndex}` : `b${countIndex}`,
        x: Math.round((cx + dist * Math.cos(angle)) * 10) / 10,
        y: Math.round((cy + dist * Math.sin(angle)) * 10) / 10,
        vx: 0, vy: 0, radius: r,
        color: isWhite ? "#ffffff" : "#1f2937",
        type: isWhite ? "white" : "black",
        isPocketed: false
      });
    }

    // Deluxe Heavyweight Ivory Striker on player baseline
    carromPieces.push({
      id: "striker",
      x: 200,
      y: 335,
      vx: 0,
      vy: 0,
      radius: 17,
      color: "#10b981",
      type: "striker",
      isPocketed: false
    });

    matchData.carromState = {
      piecesStr: JSON.stringify(carromPieces),
      currentTurnUid: params.hostUid,
      p1Score: 0,
      p2Score: 0,
      hasQueen: null,
      queenPendingUid: null,
      playerColors: {
        [params.hostUid]: "WHITE",
      },
      foulCount: {},
      lastActionLog: "Tournament Carrom Board ready! White breaks first.",
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
  } else if (params.gameType === "poker") {
    const deck = ["A♠", "K♠", "Q♠", "J♠", "10♠", "A♥", "K♥", "Q♥", "J♥", "10♥", "A♦", "K♦", "Q♦", "J♦", "10♦", "A♣", "K♣", "Q♣", "J♣", "10♣"];
    const p1Hand = [deck[0], deck[1]];
    const p2Hand = [deck[2], deck[3]];
    const community = [deck[4], deck[5], deck[6]];
    const botUid = `bot_${matchId}_ai`;
    const playerHands: Record<string, string[]> = { [params.hostUid]: p1Hand };
    if (mode === "VS_COMPUTER") {
      playerHands[botUid] = p2Hand;
    }

    matchData.pokerState = {
      communityCards: community,
      pot: (params.stakes || 50) * 2,
      currentBet: 20,
      round: "FLOP",
      currentTurnUid: params.hostUid,
      playerBets: { [params.hostUid]: 20 },
      playerHands,
      foldedUids: [],
      lastActionLog: "Texas Hold'em table active. Flop revealed: " + community.join(" "),
    };
  } else if (params.gameType === "blackjack") {
    matchData.blackjackState = {
      playerHands: { [params.hostUid]: ["10♠", "8♦"] },
      dealerHand: ["A♥", "🂠"],
      playerBets: { [params.hostUid]: params.stakes || 50 },
      playerStatuses: { [params.hostUid]: "PLAYING" },
      dealerRevealed: false,
      currentTurnUid: params.hostUid,
      lastActionLog: "Blackjack 21 dealer active. Hit, Stand, or Double!",
    };
  } else if (params.gameType === "rummy") {
    const botUid = `bot_${matchId}_ai`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ];
    const shuffled = [...fullDeck].sort(() => Math.random() - 0.5);
    const p1Hand = shuffled.slice(0, 13);
    const p2Hand = shuffled.slice(13, 26);
    const discardTop = shuffled[26];
    const wildJoker = shuffled[27];

    const initialHands: Record<string, string[]> = {
      [params.hostUid]: p1Hand,
    };
    if (mode === "VS_COMPUTER") {
      initialHands[botUid] = p2Hand;
    }

    matchData.rummyState = {
      currentTurnUid: params.hostUid,
      wildJoker,
      discardTop,
      drawDeckCount: 52 - 28,
      handsStr: JSON.stringify(initialHands),
      hasDrawn: false,
      meldsStr: JSON.stringify({}),
      scores: { [params.hostUid]: 0 },
      lastActionLog: `Indian 13-Card Rummy dealt! Wild Joker is [${wildJoker}]. Draw a card to begin.`,
    };
  } else if (params.gameType === "call_break") {
    const bot1 = `bot_${matchId}_1`;
    const bot2 = `bot_${matchId}_2`;
    const bot3 = `bot_${matchId}_3`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 13),
      [bot1]: fullDeck.slice(13, 26),
      [bot2]: fullDeck.slice(26, 39),
      [bot3]: fullDeck.slice(39, 52),
    };

    matchData.callBreakState = {
      currentTurnUid: params.hostUid,
      round: 1,
      phase: "BIDDING",
      bids: { [bot1]: 3, [bot2]: 2, [bot3]: 3 },
      tricksWon: { [params.hostUid]: 0, [bot1]: 0, [bot2]: 0, [bot3]: 0 },
      currentTrick: [],
      ledSuit: null,
      handsStr: JSON.stringify(hands),
      totalScores: { [params.hostUid]: 0, [bot1]: 0, [bot2]: 0, [bot3]: 0 },
      lastActionLog: "Call Break round 1. Announce your bid (1-13)!",
    };
  } else if (params.gameType === "teen_patti") {
    const botUid = `bot_${matchId}_ai`;
    const fullDeck = [
      "A♠", "K♠", "Q♠", "J♠", "10♠", "9♠", "8♠", "7♠", "6♠", "5♠", "4♠", "3♠", "2♠",
      "A♥", "K♥", "Q♥", "J♥", "10♥", "9♥", "8♥", "7♥", "6♥", "5♥", "4♥", "3♥", "2♥",
      "A♦", "K♦", "Q♦", "J♦", "10♦", "9♦", "8♦", "7♦", "6♦", "5♦", "4♦", "3♦", "2♦",
      "A♣", "K♣", "Q♣", "J♣", "10♣", "9♣", "8♣", "7♣", "6♣", "5♣", "4♣", "3♣", "2♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 3),
    };
    if (mode === "VS_COMPUTER") {
      hands[botUid] = fullDeck.slice(3, 6);
    }

    matchData.teenPattiState = {
      currentTurnUid: params.hostUid,
      bootAmount: 10,
      currentStake: 10,
      pot: 20,
      handsStr: JSON.stringify(hands),
      seenPlayers: { [params.hostUid]: false, [botUid]: false },
      foldedPlayers: {},
      playerBets: { [params.hostUid]: 10, [botUid]: 10 },
      round: 1,
      lastActionLog: "Teen Patti table active. Play Blind or See Cards!",
    };
  } else if (params.gameType === "satte_pe_satta") {
    const botUid = `bot_${matchId}_ai`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 26),
    };
    if (mode === "VS_COMPUTER") {
      hands[botUid] = fullDeck.slice(26, 52);
    }

    // Determine who has 7 of Hearts
    const hostHas7H = hands[params.hostUid].includes("7♥");
    const startingUid = hostHas7H ? params.hostUid : botUid;

    matchData.sattePeSattaState = {
      currentTurnUid: startingUid,
      tableSuitsStr: JSON.stringify({
        "♠": { min: 7, max: 7, hasSeven: false },
        "♥": { min: 7, max: 7, hasSeven: false },
        "♦": { min: 7, max: 7, hasSeven: false },
        "♣": { min: 7, max: 7, hasSeven: false },
      }),
      handsStr: JSON.stringify(hands),
      passedPlayers: [],
      lastActionLog: `Satte Pe Satta started. Holder of [7♥] must open table!`,
    };
  } else if (params.gameType === "bhabhi_thulla") {
    const bot1 = `bot_${matchId}_1`;
    const bot2 = `bot_${matchId}_2`;
    const bot3 = `bot_${matchId}_3`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 13),
      [bot1]: fullDeck.slice(13, 26),
      [bot2]: fullDeck.slice(26, 39),
      [bot3]: fullDeck.slice(39, 52),
    };

    // Find Ace of Spades
    let starter = params.hostUid;
    for (const [u, h] of Object.entries(hands)) {
      if (h.includes("A♠")) {
        starter = u;
        break;
      }
    }

    matchData.bhabhiThullaState = {
      currentTurnUid: starter,
      currentTrick: [],
      ledSuit: null,
      handsStr: JSON.stringify(hands),
      escapedPlayers: [],
      bhabhiUid: null,
      lastActionLog: `Bhabhi Thulla active. Ace of Spades [A♠] holder leads first trick!`,
    };
  } else if (params.gameType === "mendicot") {
    const bot1 = `bot_${matchId}_1`;
    const bot2 = `bot_${matchId}_2`;
    const bot3 = `bot_${matchId}_3`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 13),
      [bot1]: fullDeck.slice(13, 26),
      [bot2]: fullDeck.slice(26, 39),
      [bot3]: fullDeck.slice(39, 52),
    };

    matchData.mendicotState = {
      currentTurnUid: params.hostUid,
      trumpSuit: null,
      team1TensCount: 0,
      team2TensCount: 0,
      currentTrick: [],
      ledSuit: null,
      handsStr: JSON.stringify(hands),
      lastActionLog: "Mendicot / Dehla Pakad active. Capture the four 10s to win!",
    };
  } else if (params.gameType === "cheat_bluff") {
    const botUid = `bot_${matchId}_ai`;
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const hands: Record<string, string[]> = {
      [params.hostUid]: fullDeck.slice(0, 26),
    };
    if (mode === "VS_COMPUTER") {
      hands[botUid] = fullDeck.slice(26, 52);
    }

    matchData.cheatBluffState = {
      currentTurnUid: params.hostUid,
      currentRank: "A",
      lastDiscardCount: 0,
      lastDiscardCards: [],
      lastDiscarderUid: null,
      pileCount: 0,
      handsStr: JSON.stringify(hands),
      lastActionLog: "Cheat / Bluff active. Discard face-down cards declaring 'Aces'!",
    };
  } else if (params.gameType === "solitaire") {
    const fullDeck = [
      "A♠", "2♠", "3♠", "4♠", "5♠", "6♠", "7♠", "8♠", "9♠", "10♠", "J♠", "Q♠", "K♠",
      "A♥", "2♥", "3♥", "4♥", "5♥", "6♥", "7♥", "8♥", "9♥", "10♥", "J♥", "Q♥", "K♥",
      "A♦", "2♦", "3♦", "4♦", "5♦", "6♦", "7♦", "8♦", "9♦", "10♦", "J♦", "Q♦", "K♦",
      "A♣", "2♣", "3♣", "4♣", "5♣", "6♣", "7♣", "8♣", "9♣", "10♣", "J♣", "Q♣", "K♣",
    ].sort(() => Math.random() - 0.5);

    const tableau: string[][] = [[], [], [], [], [], [], []];
    const tableauFlipped: boolean[][] = [[], [], [], [], [], [], []];
    let cardIdx = 0;

    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        tableau[col].push(fullDeck[cardIdx++]);
        tableauFlipped[col].push(row === col); // only top card is face-up
      }
    }

    const stockpile = fullDeck.slice(cardIdx);

    matchData.solitaireState = {
      tableauStr: JSON.stringify(tableau),
      tableauFlippedStr: JSON.stringify(tableauFlipped),
      foundationsStr: JSON.stringify({ "♠": [], "♥": [], "♦": [], "♣": [] }),
      stockpileStr: JSON.stringify(stockpile),
      wasteStr: JSON.stringify([]),
      moves: 0,
      score: 0,
      lastActionLog: "Klondike Solitaire ready. Build Ace to King on foundation piles!",
    };
  } else if (params.gameType === "uno") {
    const deck = createUnoDeck();
    const botUid = `bot_${matchId}_ai`;
    const initialHands: Record<string, UnoCard[]> = {
      [params.hostUid]: deck.splice(0, 7),
    };
    if (mode === "VS_COMPUTER") {
      initialHands[botUid] = deck.splice(0, 7);
    }

    // Starting discard card (ensure non-wild for starter)
    let startingDiscard = deck.pop() || { color: "RED", value: "7" };
    if (startingDiscard.color === "WILD") {
      startingDiscard = { color: "BLUE", value: "5" };
    }

    matchData.unoState = {
      discardTop: startingDiscard,
      handsStr: JSON.stringify(initialHands),
      drawDeckStr: JSON.stringify(deck),
      currentTurnUid: params.hostUid,
      direction: 1,
      drawCountPenalty: 0,
      hasCalledUno: {},
      lastActionLog: `Uno Arena online! Starter card is [${startingDiscard.color} ${startingDiscard.value}].`,
    };
  } else if (params.gameType === "liars_dice") {
    const botUid = `bot_${matchId}_ai`;
    const initialRolls: Record<string, number[]> = {
      [params.hostUid]: [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ],
    };
    if (mode === "VS_COMPUTER") {
      initialRolls[botUid] = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
    }
    matchData.liarsDiceState = {
      diceRollsStr: JSON.stringify(initialRolls),
      currentBid: null,
      currentTurnUid: params.hostUid,
      bluffCalled: false,
      lastActionLog: "Dice trays locked under cups. Place the first bid!",
    };
  } else if (params.gameType === "codenames") {
    const wordList = [
      "CIPHER", "RADAR", "SERVER", "NEURAL", "ECHO", "SIGNAL", "LASER", "MATRIX", "STREAM", "VOLT",
      "QUANTUM", "ORBIT", "KERNEL", "BINARY", "ROUTER", "PHANTOM", "PROTOCOL", "CHANNEL", "WAVE", "CIRCUIT",
      "CHIP", "NODE", "BEACON", "PULSE", "GATEWAY"
    ];
    const types = [
      "RED", "RED", "RED", "RED", "RED", "RED", "RED", "RED", "RED",
      "BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE", "BLUE",
      "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL",
      "ASSASSIN"
    ].sort(() => Math.random() - 0.5);

    matchData.codenamesState = {
      words: wordList,
      cardTypes: types,
      revealed: Array(25).fill(false),
      currentTeamTurn: "RED",
      spymasterUids: [params.hostUid],
      lastActionLog: "5x5 Decryption Grid ready. Spymaster: give word clue & count.",
    };
  } else if (params.gameType === "spyfall") {
    const locations = ["CYBER SPACE STATION", "UNDERGROUND DATA VAULT", "NEON METROPOLIS", "QUANTUM CORE LAB", "FREQUENCY NIGHTCLUB"];
    const chosenLoc = locations[Math.floor(Math.random() * locations.length)];
    matchData.spyfallState = {
      secretLocation: chosenLoc,
      impostorUid: params.hostUid, // Will be reassigned when players join
      roles: { [params.hostUid]: "System Architect" },
      votes: {},
      isRevealed: false,
      lastActionLog: "Cipher Impostor round active. Ask questions over mic & find the spy!",
    };
  } else if (params.gameType === "skribbl") {
    const words = ["MICROPHONE", "SATELLITE", "GUITAR", "PYRAMID", "CYBER TRUCK", "HEADPHONES", "ROCKET", "LIGHTNING"];
    const secretWord = words[Math.floor(Math.random() * words.length)];
    matchData.skribblState = {
      currentDrawerUid: params.hostUid,
      secretWord,
      wordHint: secretWord.replace(/[A-Z]/g, "_ "),
      pathsStr: JSON.stringify([]),
      correctGuessers: [],
      lastActionLog: "Vector Canvas ready! Active drawer is sketching...",
    };
  } else if (params.gameType === "trivia") {
    const quiz = [
      {
        id: "q1",
        question: "Which audio frequency range is generally audible to human ears?",
        options: ["20 Hz – 20,000 Hz", "1 Hz – 100 Hz", "50 kHz – 100 kHz", "500 Hz – 2,000 Hz"],
        answerIndex: 0,
      },
      {
        id: "q2",
        question: "What protocol powers low-latency real-time voice streaming in modern browsers?",
        options: ["WebRTC", "FTP", "Telnet", "SMTP"],
        answerIndex: 0,
      },
      {
        id: "q3",
        question: "In Texas Hold'em, what is the best possible 5-card poker hand?",
        options: ["Royal Flush", "Four of a Kind", "Full House", "Straight Flush"],
        answerIndex: 0,
      },
      {
        id: "q4",
        question: "Which data structure operates on a First-In-First-Out (FIFO) principle?",
        options: ["Queue", "Stack", "Binary Tree", "Hash Map"],
        answerIndex: 0,
      },
    ];
    matchData.triviaState = {
      questionIndex: 0,
      totalQuestions: quiz.length,
      currentQuestion: quiz[0],
      scores: { [params.hostUid]: 0 },
      answersSubmitted: {},
      lastActionLog: "Signal Race Trivia online! Select the correct option.",
    };
  } else if (params.gameType === "quoridor") {
    matchData.quoridorState = {
      p1Pos: [8, 4],
      p2Pos: [0, 4],
      wallsStr: JSON.stringify([]),
      p1WallsLeft: 10,
      p2WallsLeft: 10,
      currentTurnUid: params.hostUid,
      lastActionLog: "Quoridor Firewall Runner active. Advance pawn or drop blocking wall!",
    };
  } else if (params.gameType === "go") {
    const board = Array.from({ length: 19 }, () => Array(19).fill(null));
    matchData.goState = {
      boardStr: JSON.stringify(board),
      currentTurn: "BLACK",
      capturedBlack: 0,
      capturedWhite: 0,
      lastActionLog: "19x19 Go Territory Grid online. BLACK places first stone.",
    };
  } else if (params.gameType === "yahtzee") {
    matchData.yahtzeeState = {
      dice: [1, 2, 3, 4, 5],
      rollsRemaining: 3,
      lockedDice: [false, false, false, false, false],
      scorecardsStr: JSON.stringify({ [params.hostUid]: {} }),
      currentTurnUid: params.hostUid,
      lastActionLog: "Dice Protocol active. Roll dice & choose your score category!",
    };
  } else if (params.gameType === "taboo") {
    const tabooCards = [
      { word: "PODCAST", forbidden: ["AUDIO", "EPISODE", "HOST", "MIC", "RECORD"] },
      { word: "ALGORITHM", forbidden: ["CODE", "COMPUTER", "MATH", "STEPS", "PROGRAM"] },
      { word: "FIREWALL", forbidden: ["SECURITY", "BLOCK", "HACK", "NETWORK", "PROTECT"] },
    ];
    const card = tabooCards[Math.floor(Math.random() * tabooCards.length)];
    matchData.tabooState = {
      activeSpeakerUid: params.hostUid,
      targetWord: card.word,
      forbiddenWords: card.forbidden,
      scores: { [params.hostUid]: 0 },
      lastActionLog: "Forbidden Lexicon active! Describe keyword without using forbidden words.",
    };
  } else if (params.gameType === "antakshari") {
    const letters = ["म", "न", "र", "स", "क", "ल", "ह", "द", "प", "य", "त", "ब", "ज", "ग"];
    const startingLetter = letters[Math.floor(Math.random() * letters.length)];
    matchData.antakshariState = {
      currentLetter: startingLetter,
      currentTurnUid: params.hostUid,
      round: 1,
      songHistory: [],
      scores: { [params.hostUid]: 0 },
      timeRemainingSec: 30,
      lastActionLog: `Antakshari begins on letter [${startingLetter}]! Sing your song into the mic.`,
    };
  } else if (params.gameType === "melody_buzzer") {
    const tracks = ["Shape of You", "Bad Guy", "Despacito", "Believer", "Blinding Lights", "Bohemian Rhapsody"];
    matchData.melodyBuzzerState = {
      currentTrackTitle: tracks[Math.floor(Math.random() * tracks.length)],
      hummerUid: params.hostUid,
      buzzedPlayerUid: null,
      roundState: "HUMMING",
      scores: { [params.hostUid]: 0 },
      lastActionLog: "Hum or whistle the tune into your mic! Listeners hit buzzer to guess.",
    };
  } else if (params.gameType === "pitch_arena") {
    const prompts = [
      "An umbrella specifically designed for pet goldfish.",
      "An alarm clock that donates your money to enemies if you snooze.",
      "A social network exclusively for houseplants.",
      "Shoes that generate Wi-Fi only while actively running.",
    ];
    matchData.pitchArenaState = {
      currentPitcherUid: params.hostUid,
      absurdPrompt: prompts[Math.floor(Math.random() * prompts.length)],
      voltTips: { [params.hostUid]: 0 },
      lastActionLog: "Defend the Absurd! Pitch your startup idea on mic for 45s.",
    };
  } else if (params.gameType === "twenty_questions") {
    matchData.twentyQuestionsState = {
      targetSubject: "NEURAL NETWORK PROCESSOR",
      questionsRemaining: 20,
      questionLogStr: JSON.stringify([]),
      lastActionLog: "20 Questions Decryption engaged. Ask Yes/No questions on mic!",
    };
  } else if (params.gameType === "raja_mantri") {
    const roles: ("RAJA" | "MANTRI" | "CHOR" | "SIPAHI")[] = (["RAJA", "MANTRI", "CHOR", "SIPAHI"] as const).slice().sort(() => Math.random() - 0.5);
    const chitsMap: Record<string, string> = { [params.hostUid]: roles[0] };
    let rajaUid = params.hostUid;
    let mantriUid = params.hostUid;
    if (roles[0] === "RAJA") rajaUid = params.hostUid;
    if (roles[0] === "MANTRI") mantriUid = params.hostUid;

    if (mode === "VS_COMPUTER") {
      for (let i = 0; i < 3; i++) {
        const bUid = `bot_${matchId}_chit_${i + 1}`;
        chitsMap[bUid] = roles[i + 1];
        if (roles[i + 1] === "RAJA") rajaUid = bUid;
        if (roles[i + 1] === "MANTRI") mantriUid = bUid;
      }
    }

    matchData.rajaMantriState = {
      chitsStr: JSON.stringify(chitsMap),
      rajaUid,
      mantriUid,
      guessedChorUid: null,
      scores: { [params.hostUid]: 0 },
      phase: "REVEAL",
      lastActionLog: "Paper Chits shuffled! Raja will reveal and command the Mantri.",
    };
  } else if (params.gameType === "hand_cricket") {
    const bowlerUid = mode === "VS_COMPUTER" ? `bot_${matchId}_ai` : "";
    matchData.handCricketState = {
      batsmanUid: params.hostUid,
      bowlerUid,
      currentInnings: 1,
      innings1Score: 0,
      innings2Score: 0,
      currentBatsmanChoice: null,
      currentBowlerChoice: null,
      lastActionLog: "Odd-Even Hand Cricket match underway! Choose your number (1-6).",
    };
  } else if (params.gameType === "book_cricket") {
    matchData.bookCricketState = {
      currentBatsmanUid: params.hostUid,
      runs: 0,
      wickets: 0,
      balls: 0,
      lastFlippedPage: null,
      target: null,
      lastActionLog: "Textbook ready on desk. Tap to flip page!",
    };
  } else if (params.gameType === "bingo") {
    // Generate 5x5 grid with 1-25 shuffled
    const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    const grid5x5 = Array.from({ length: 5 }, (_, r) => nums.slice(r * 5, r * 5 + 5));
    const gridsMap: Record<string, number[][]> = { [params.hostUid]: grid5x5 };
    if (mode === "VS_COMPUTER") {
      const botUid = `bot_${matchId}_ai`;
      const botNums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      gridsMap[botUid] = Array.from({ length: 5 }, (_, r) => botNums.slice(r * 5, r * 5 + 5));
    }

    matchData.bingoState = {
      gridsStr: JSON.stringify(gridsMap),
      crossedNumbers: [],
      completedLines: { [params.hostUid]: 0 },
      currentTurnUid: params.hostUid,
      lastActionLog: "25-Cross Bingo grid filled. Call numbers on voice!",
    };
  } else if (params.gameType === "npat") {
    const alphabet = "ABCDEFGHIJKLMNOPRSTW";
    const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
    matchData.npatState = {
      currentLetter: letter,
      submissionsStr: JSON.stringify({}),
      roundScores: { [params.hostUid]: 0 },
      lastActionLog: `Letter announced: [ ${letter} ]! Fill Name, Place, Animal, Thing.`,
    };
  } else if (params.gameType === "bagh_chal") {
    matchData.baghChalState = {
      tigersStr: JSON.stringify([[0, 0], [0, 4], [4, 0], [4, 4]]),
      goatsStr: JSON.stringify([]),
      goatsPlaced: 0,
      goatsCaptured: 0,
      currentTurn: "GOAT",
      lastActionLog: "Bagh-Chal board active. Goats place first node.",
    };
  } else if (params.gameType === "nine_mens_morris") {
    matchData.nineMensMorrisState = {
      boardNodesStr: JSON.stringify({}),
      phase: "PLACEMENT",
      p1PiecesPlaced: 0,
      p2PiecesPlaced: 0,
      currentTurn: "P1",
      lastActionLog: "Nine Stones matrix ready. Place your tokens on junctions.",
    };
  } else if (params.gameType === "chain_reaction") {
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 9 }, () => ({ count: 0, color: null })));
    matchData.chainReactionState = {
      gridStr: JSON.stringify(grid),
      currentTurn: "RED",
      lastActionLog: "Orbital Fusion Grid online. Place radioactive orbs!",
    };
  } else if (params.gameType === "pen_fight") {
    const pens = [
      { id: params.hostUid, x: 100, y: 300, vx: 0, vy: 0, isOffDesk: false },
      { id: "opp", x: 280, y: 100, vx: 0, vy: 0, isOffDesk: false },
    ];
    matchData.penFightState = {
      pensStr: JSON.stringify(pens),
      currentTurnUid: params.hostUid,
      lastActionLog: "Desk arena set. Drag back to flick your pen striker!",
    };
  } else if (params.gameType === "neon_pong") {
    matchData.neonPongState = {
      p1Score: 0,
      p2Score: 0,
      ballStr: JSON.stringify({ x: 180, y: 180, vx: 3, vy: 3 }),
      p1PaddleY: 150,
      p2PaddleY: 150,
      lastActionLog: "Neon Pong paddle arena online. Slide to deflect!",
    };
  } else if (params.gameType === "two_truths") {
    matchData.twoTruthsState = {
      speakerUid: params.hostUid,
      statements: [
        "I once met a famous astronaut in an elevator.",
        "I have never broken a single bone in my body.",
        "I can speak four languages fluently.",
      ],
      lieIndex: 0,
      votes: {},
      isRevealed: false,
      lastActionLog: "Two Truths and a Lie active. Debate on mic and vote for the lie!",
    };
  } else if (params.gameType === "hot_potato") {
    matchData.hotPotatoState = {
      currentHolderUid: params.hostUid,
      question: "Name 3 programming languages in 5 seconds!",
      lastActionLog: "Terminal Fuse ignited! Speak fast on mic & pass the fuse!",
    };
  } else if (params.gameType === "dilemma_debate") {
    matchData.dilemmaDebateState = {
      dilemmaOptionA: "Infinite computing speed with zero internet",
      dilemmaOptionB: "1Gbps fiber internet with a 2002 vintage PC",
      votesA: [],
      votesB: [],
      lastActionLog: "Dilemma generated! 30-second mic debates begin.",
    };
  } else if (params.gameType === "hangman") {
    const words = ["JAVASCRIPT", "FIREBASE", "TERMINAL", "SATELLITE", "CYBERSPACE", "FREQUENCY"];
    const secret = words[Math.floor(Math.random() * words.length)];
    matchData.hangmanState = {
      secretWord: secret,
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrong: 6,
      isWon: false,
      isGameOver: false,
      lastActionLog: "Hangman Word Scaffold active. Guess letters without hanging!",
    };
  } else if (params.gameType === "math_blitz") {
    const num1 = Math.floor(Math.random() * 20) + 5;
    const num2 = Math.floor(Math.random() * 15) + 3;
    matchData.mathBlitzState = {
      p1Score: 0,
      p2Score: 0,
      currentProblem: { num1, op: "+", num2, answer: num1 + num2 },
      lastActionLog: "Matrix Math Duel active! Solve the arithmetic problem fast.",
    };
  } else if (params.gameType === "monopoly") {
    const botUid = `bot_${matchId}_ai`;
    const initialPositions: Record<string, number> = { [params.hostUid]: 0 };
    const initialCash: Record<string, number> = { [params.hostUid]: 1500 };
    if (mode === "VS_COMPUTER") {
      initialPositions[botUid] = 0;
      initialCash[botUid] = 1500;
    }
    matchData.monopolyState = {
      currentTurnUid: params.hostUid,
      positionsStr: JSON.stringify(initialPositions),
      cashStr: JSON.stringify(initialCash),
      propertiesStr: JSON.stringify({}),
      inJailTurnsStr: JSON.stringify({}),
      lastDiceRoll: [1, 2],
      consecutiveDoubles: 0,
      hasRolledThisTurn: false,
      isBankruptStr: JSON.stringify({}),
      lastActionLog: "Tournament Monopoly Arena initialized! $1,500 bankroll allotted. Roll dice to start!",
      pendingTileAction: null,
    };
  }

  await setDoc(matchRef, cleanData(matchData));
  return matchId;
}

// ── Rematch / Replay Arcade Match ──────────────────────────────────────────
export async function rematchArcadeMatch(
  match: ArcadeMatch,
  requestingUser: { uid: string; handle: string; avatar?: string }
): Promise<string> {
  const newMatchId = await createArcadeMatch({
    gameType: match.gameType,
    title: match.title.includes("[REMATCH]") ? match.title : `${match.title} [REMATCH]`,
    hostUid: requestingUser.uid,
    hostHandle: requestingUser.handle || "@PLAYER",
    hostAvatar: requestingUser.avatar || "",
    roomId: match.roomId,
    mode: match.mode,
    maxPlayers: match.maxPlayers,
    enableVoice: match.enableVoice,
    stakes: match.stakes,
    difficulty: match.difficulty,
  });

  // If multiplayer, re-add other human players from the previous match
  if (match.mode === "MULTIPLAYER" && match.players) {
    for (const [pUid, p] of Object.entries(match.players)) {
      if (pUid !== requestingUser.uid && !p.isBot) {
        try {
          await joinArcadeMatch(newMatchId, {
            uid: p.uid,
            handle: p.handle || "@ANON",
            avatar: p.avatar,
          });
        } catch (e) {
          console.warn("[Arcade] Auto-join rematch player:", e);
        }
      }
    }
  }

  return newMatchId;
}

// ── Delete / Terminate Arcade Match ──────────────────────────────────────────
export async function deleteArcadeMatch(matchId: string, hostUid?: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const matchRef = doc(db, ARCADE_COLLECTION, matchId);
    if (hostUid) {
      const snap = await getDoc(matchRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.hostUid === hostUid) {
        await deleteDoc(matchRef);
      }
    } else {
      await deleteDoc(matchRef);
    }
  } catch (e) {
    console.warn("[Arcade] Failed to delete match document:", e);
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

  const existingPlayers = { ...(match.players || {}) };
  
  // If match already contains this user, no-op
  if (existingPlayers[user.uid]) {
    return;
  }

  // If match is full, check if any bots are present to evict for the human friend
  const botPlayerKey = Object.keys(existingPlayers).find(
    (k) => existingPlayers[k].isBot || k.startsWith("bot_") || k.startsWith("ghost_")
  );

  if (botPlayerKey && Object.keys(existingPlayers).length >= match.maxPlayers) {
    delete existingPlayers[botPlayerKey];
  } else if (Object.keys(existingPlayers).length >= match.maxPlayers) {
    throw new Error("Match lobby is full");
  }

  let team: any;
  if (match.gameType === "ludo") {
    const taken = Object.values(existingPlayers).map((p) => p.team);
    const available = ["RED", "GREEN", "BLUE", "YELLOW"] as const;
    team = available.find((t) => !taken.includes(t)) || "GREEN";
  } else if (match.gameType === "chess") {
    team = "BLACK";
  }

  const updatedPlayers = {
    ...existingPlayers,
    [user.uid]: cleanData({
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
  };

  const currentCount = Object.keys(updatedPlayers).length;

  const updates: any = {
    players: updatedPlayers,
    status: currentCount >= 2 ? "PLAYING" : match.status,
    mode: match.mode === "VS_COMPUTER" ? "MULTIPLAYER" : match.mode,
    enableVoice: true,
    updatedAt: serverTimestamp(),
  };

  if (match.gameType === "battleship" && !match.battleshipState?.p2Uid) {
    updates["battleshipState.p2Uid"] = user.uid;
  }

  if (match.gameType === "uno" && match.unoState) {
    const hands: Record<string, UnoCard[]> = JSON.parse(match.unoState.handsStr || "{}");
    let drawDeck: UnoCard[] = JSON.parse(match.unoState.drawDeckStr || "[]");
    if (!hands[user.uid] || hands[user.uid].length === 0) {
      if (drawDeck.length < 7) {
        drawDeck = [...drawDeck, ...createUnoDeck()];
      }
      hands[user.uid] = drawDeck.splice(0, 7);
      updates["unoState.handsStr"] = JSON.stringify(hands);
      updates["unoState.drawDeckStr"] = JSON.stringify(drawDeck);
    }
  }

  await updateDoc(matchRef, updates);
}

// ── Ghost Participant Fallback (Aha Activation Engine) ───────────────────────
export async function addGhostParticipantToMatch(
  matchId: string,
  customGhostName?: string
): Promise<string> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;

  const currentPlayers = Object.values(match.players || {});
  if (currentPlayers.length >= match.maxPlayers) return "";

  const ghostIndex = currentPlayers.filter((p) => p.isBot).length + 1;
  const ghostUid = `ghost_ai_${matchId}_${Date.now()}_${ghostIndex}`;
  const ghostHandles = [
    "@CyberGhost_AI",
    "@Satoshi_Bot",
    "@AuraMaster_AI",
    "@NeonPulse_Ghost",
    "@EchoValkyrie_AI",
  ];
  const ghostHandle = customGhostName || ghostHandles[Math.floor(Math.random() * ghostHandles.length)];

  let team: any;
  if (match.gameType === "ludo") {
    const taken = currentPlayers.map((p) => p.team);
    const available = ["GREEN", "YELLOW", "BLUE", "RED"] as const;
    team = available.find((t) => !taken.includes(t)) || "GREEN";
  } else if (match.gameType === "chess") {
    team = "BLACK";
  }

  const updates: any = {
    [`players.${ghostUid}`]: cleanData({
      uid: ghostUid,
      handle: ghostHandle,
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=" + ghostUid,
      score: 0,
      mistakes: 0,
      team,
      ready: true,
      isBot: true,
      joinedAt: Date.now(),
    }),
    status: currentPlayers.length + 1 >= 2 ? "PLAYING" : match.status,
    updatedAt: serverTimestamp(),
  };

  if (match.gameType === "battleship" && !match.battleshipState?.p2Uid) {
    updates["battleshipState.p2Uid"] = ghostUid;
  }

  await updateDoc(matchRef, updates);
  return ghostUid;
}

export async function leaveArcadeMatch(
  matchId: string,
  playerUid: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const matchRef = doc(db, ARCADE_COLLECTION, matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;
    const match = snap.data() as ArcadeMatch;

    // Auto-delete if host leaves, or if it's a Solo/VS_COMPUTER practice match
    if (
      match.hostUid === playerUid ||
      match.mode === "VS_COMPUTER" ||
      (match.title && match.title.includes("SOLO"))
    ) {
      await deleteDoc(matchRef);
      return;
    }

    if (!match.players || !match.players[playerUid]) return;

    const players = { ...match.players };
    delete players[playerUid];

    // Auto-delete if no human players remain
    const remainingHumans = Object.values(players).filter((p) => !p.isBot);
    if (remainingHumans.length === 0) {
      await deleteDoc(matchRef);
      return;
    }

    await updateDoc(matchRef, {
      players,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[Arcade] Error in leaveArcadeMatch:", err);
  }
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
        return;
      }
      callback({ id: snap.id, ...snap.data() } as ArcadeMatch);
    },
    (err) => {
      console.error("[Arcade] subscribe error:", err);
    }
  );
}

export function subscribeLobbyArcadeMatches(
  callback: (matches: ArcadeMatch[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, ARCADE_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ArcadeMatch[] = [];
      snap.forEach((d) => {
        const data = d.data();
        // Only show live Multiplayer PvP rooms for other humans in the public lobby
        if (
          (data.isArcade || data.gameType) &&
          data.gameType &&
          data.mode === "MULTIPLAYER" &&
          data.status !== "FINISHED" &&
          !data.title?.includes("SOLO")
        ) {
          list.push({ id: d.id, ...data } as ArcadeMatch);
        }
      });
      callback(list);
    },
    (err) => {
      console.warn("[Arcade] lobby listener fallback:", err.message);
      const fallbackQ = query(collection(db, ARCADE_COLLECTION), limit(30));
      return onSnapshot(fallbackQ, (s) => {
        const list: ArcadeMatch[] = [];
        s.forEach((d) => {
          const data = d.data();
          if (
            (data.isArcade || data.gameType) &&
            data.gameType &&
            data.mode === "MULTIPLAYER" &&
            data.status !== "FINISHED" &&
            !data.title?.includes("SOLO")
          ) {
            list.push({ id: d.id, ...data } as ArcadeMatch);
          }
        });
        callback(list);
      });
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

// ── 8-Ball / 5-Discipline Pool Actions ────────────────────────────────────────
export async function firePoolShot(
  matchId: string,
  playerUid: string,
  impulseX: number,
  impulseY: number,
  updatedBalls: PoolBall[],
  options?: {
    nextTurnUid?: string;
    p1Type?: "SOLIDS" | "STRIPES" | null;
    p2Type?: "SOLIDS" | "STRIPES" | null;
    p1Score?: number;
    p2Score?: number;
    actionLog?: string;
    isGameOver?: boolean;
    winnerUid?: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.poolState) return;

  const playerUids = Object.keys(match.players || {});
  const calculatedNext = playerUids.find((id) => id !== playerUid) || playerUid;
  const nextTurnUid = options?.nextTurnUid ?? calculatedNext;

  const updates: any = {
    "poolState.ballsStr": JSON.stringify(updatedBalls),
    "poolState.lastShotStr": JSON.stringify({ impulseX, impulseY, timestamp: Date.now() }),
    "poolState.currentTurnUid": nextTurnUid,
    "poolState.lastActionLog": options?.actionLog || `${match.players[playerUid]?.handle || "Player"} struck the cue ball!`,
    updatedAt: serverTimestamp(),
  };

  if (options?.p1Type !== undefined) updates["poolState.p1Type"] = options.p1Type;
  if (options?.p2Type !== undefined) updates["poolState.p2Type"] = options.p2Type;
  if (options?.p1Score !== undefined) updates["poolState.p1Score"] = options.p1Score;
  if (options?.p2Score !== undefined) updates["poolState.p2Score"] = options.p2Score;

  if (options?.isGameOver) {
    const winnerUid = options?.winnerUid || playerUid;
    updates.status = "FINISHED";
    updates.winnerUid = winnerUid;
    updates.winnerHandle = match.players[winnerUid]?.handle || "@ANON";
    await awardAura(winnerUid, match.stakes * 2 || 100);
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
  updatedPieces: CarromPiece[],
  options?: {
    nextTurnUid?: string;
    p1Score?: number;
    p2Score?: number;
    p1Due?: number;
    p2Due?: number;
    dueCount?: number;
    hasQueen?: string | null;
    queenCovered?: boolean;
    queenCoverAttempt?: boolean;
    queenPendingUid?: string | null;
    actionLog?: string;
    isGameOver?: boolean;
    winnerUid?: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.carromState) return;

  const playerUids = Object.keys(match.players || {});
  const calculatedNextTurn = playerUids.find((id) => id !== playerUid) || playerUid;
  const nextTurnUid = options?.nextTurnUid ?? calculatedNextTurn;
  const remainingTargets = updatedPieces.filter((p) => p.type !== "striker" && !p.isPocketed);

  const updates: any = {
    "carromState.piecesStr": JSON.stringify(updatedPieces),
    "carromState.lastShotStr": JSON.stringify({ impulseX, impulseY, strikerX, strikerY, timestamp: Date.now() }),
    "carromState.currentTurnUid": nextTurnUid,
    "carromState.lastActionLog": options?.actionLog || `${match.players[playerUid]?.handle || "Player"} struck the carrom piece!`,
    updatedAt: serverTimestamp(),
  };

  if (options?.p1Score !== undefined) updates["carromState.p1Score"] = options.p1Score;
  if (options?.p2Score !== undefined) updates["carromState.p2Score"] = options.p2Score;
  if (options?.p1Due !== undefined) updates["carromState.p1Due"] = options.p1Due;
  if (options?.p2Due !== undefined) updates["carromState.p2Due"] = options.p2Due;
  if (options?.dueCount !== undefined) updates["carromState.dueCount"] = options.dueCount;
  if (options?.hasQueen !== undefined) updates["carromState.hasQueen"] = options.hasQueen;
  if (options?.queenCovered !== undefined) updates["carromState.queenCovered"] = options.queenCovered;
  if (options?.queenCoverAttempt !== undefined) updates["carromState.queenCoverAttempt"] = options.queenCoverAttempt;
  if (options?.queenPendingUid !== undefined) updates["carromState.queenPendingUid"] = options.queenPendingUid;

  if (options?.isGameOver || remainingTargets.length === 0) {
    const winnerUid = options?.winnerUid || playerUid;
    updates.status = "FINISHED";
    updates.winnerUid = winnerUid;
    updates.winnerHandle = match.players[winnerUid]?.handle || "@ANON";
    await awardAura(winnerUid, match.stakes * 2 || 100);
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

// ── Poker Actions ─────────────────────────────────────────────────────────────
export async function betPoker(
  matchId: string,
  playerUid: string,
  action: "CHECK" | "CALL" | "RAISE" | "FOLD",
  raiseAmount: number = 20
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.pokerState) return;

  const ps = match.pokerState;
  const players = Object.keys(match.players || {});
  const nextTurnUid = players.find((u) => u !== playerUid) || playerUid;
  let pot = ps.pot;
  let currentBet = ps.currentBet;
  let folded = [...ps.foldedUids];

  if (action === "FOLD") {
    folded.push(playerUid);
  } else if (action === "CALL") {
    pot += currentBet;
  } else if (action === "RAISE") {
    currentBet += raiseAmount;
    pot += currentBet;
  }

  const updates: any = {
    "pokerState.pot": pot,
    "pokerState.currentBet": currentBet,
    "pokerState.currentTurnUid": nextTurnUid,
    "pokerState.foldedUids": folded,
    "pokerState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} chose to ${action}! Pot is now $${pot}.`,
    updatedAt: serverTimestamp(),
  };

  if (folded.length > 0) {
    updates.status = "FINISHED";
    updates.winnerUid = nextTurnUid;
    updates.winnerHandle = match.players[nextTurnUid]?.handle || "@ANON";
    await awardAura(nextTurnUid, pot);
  }

  await updateDoc(matchRef, updates);
}

// ── Blackjack Actions ─────────────────────────────────────────────────────────
export async function playBlackjackAction(
  matchId: string,
  playerUid: string,
  action: "HIT" | "STAND" | "DOUBLE"
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.blackjackState) return;

  const bs = match.blackjackState;
  const playerHand = bs.playerHands[playerUid] || ["10♠", "8♦"];
  const deck = ["A♣", "2♦", "5♥", "7♠", "9♦", "K♣", "Q♥", "J♠"];
  const drawn = deck[Math.floor(Math.random() * deck.length)];

  if (action === "HIT" || action === "DOUBLE") {
    playerHand.push(drawn);
  }

  const updates: any = {
    [`blackjackState.playerHands.${playerUid}`]: playerHand,
    "blackjackState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} chose to ${action}!`,
    updatedAt: serverTimestamp(),
  };

  if (action === "STAND" || action === "DOUBLE") {
    updates["blackjackState.dealerRevealed"] = true;
    updates["blackjackState.dealerHand"] = ["A♥", "9♣"];
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, (bs.playerBets[playerUid] || 50) * 2);
  }

  await updateDoc(matchRef, updates);
}

// ── Uno Actions ───────────────────────────────────────────────────────────────
// ── Uno Actions ───────────────────────────────────────────────────────────────
// ── Uno Actions ───────────────────────────────────────────────────────────────
export async function playUnoCard(
  matchId: string,
  playerUid: string,
  card: UnoCard,
  chosenWildColor?: "RED" | "BLUE" | "GREEN" | "YELLOW",
  calledUno?: boolean
): Promise<{ won: boolean; requiresHandSwap?: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) throw new Error("Not an uno match");

  const us = match.unoState;
  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  let drawDeck: UnoCard[] = JSON.parse(us.drawDeckStr || "[]");
  const playerHand = hands[playerUid] || [];
  const cardIdx = playerHand.findIndex((c) => c.color === card.color && c.value === card.value);

  if (cardIdx >= 0) {
    playerHand.splice(cardIdx, 1);
  }
  hands[playerUid] = playerHand;

  const won = playerHand.length === 0;
  const playerUids = Object.keys(match.players || {});
  const numPlayers = playerUids.length;
  const currentIdx = playerUids.indexOf(playerUid);

  let direction: 1 | -1 = us.direction || 1;
  let skipNext = false;
  let pendingStack = us.pendingDrawStack || 0;
  let pendingType = us.pendingDrawType || null;

  // Stacking logic
  if (card.value === "+2") {
    pendingStack += 2;
    pendingType = "+2";
    skipNext = false; // Next player has a chance to stack or take penalty
  } else if (card.value === "+4") {
    pendingStack += 4;
    pendingType = "+4";
    skipNext = false;
  } else {
    // Regular non-penalty card resets stack
    pendingStack = 0;
    pendingType = null;
  }

  if (card.value === "REVERSE") {
    if (numPlayers === 2) {
      skipNext = true;
    } else {
      direction = (direction === 1 ? -1 : 1);
    }
  } else if (card.value === "SKIP") {
    skipNext = true;
  }

  // 7-0 Hand Rotation rule detection
  const isSeven = card.value === "7" && numPlayers > 1 && !won;
  const isZero = card.value === "0" && numPlayers > 1 && !won;

  if (isZero) {
    // Rotate everyone's hand in active direction
    const rotatedHands: Record<string, UnoCard[]> = {};
    for (let i = 0; i < numPlayers; i++) {
      const fromUid = playerUids[i];
      let toIdx = (i + direction) % numPlayers;
      if (toIdx < 0) toIdx += numPlayers;
      const toUid = playerUids[toIdx];
      rotatedHands[toUid] = hands[fromUid];
    }
    Object.assign(hands, rotatedHands);
  }

  // Next player calculation
  let step = direction * (skipNext ? 2 : 1);
  let nextIdx = (currentIdx + step) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  const nextPlayerUid = playerUids[nextIdx] || playerUid;

  // Final discard top card
  const discardCard: UnoCard = {
    color: card.color === "WILD" && chosenWildColor ? chosenWildColor : card.color,
    value: card.value,
  };

  const hasCalled = { ...(us.hasCalledUno || {}) };
  if (playerHand.length === 1 && calledUno) {
    hasCalled[playerUid] = true;
  } else if (playerHand.length > 1) {
    delete hasCalled[playerUid];
  }

  let actionLog = `${match.players[playerUid]?.handle || "Player"} played [${card.color} ${card.value}]!`;
  if (card.value === "REVERSE") actionLog += " (REVERSED DIRECTION 🔄)";
  else if (card.value === "SKIP") actionLog += " (SKIPPED NEXT PLAYER 🚫)";
  else if (card.value === "+2") actionLog += ` (STACKED +2 ⚡ TOTAL: ${pendingStack} CARDS!)`;
  else if (card.value === "+4") actionLog += ` (STACKED +4 WILD ⚡ TOTAL: ${pendingStack} CARDS! COLOR: ${chosenWildColor || "WILD"})`;
  else if (isZero) actionLog += " (0 PLAYED: ALL HANDS ROTATED AROUND THE TABLE 🌀)";
  else if (isSeven) actionLog += " (7 PLAYED: CHOOSE A PLAYER TO SWAP HANDS 🤝)";

  const updates: any = {
    "unoState.discardTop": discardCard,
    "unoState.handsStr": JSON.stringify(hands),
    "unoState.drawDeckStr": JSON.stringify(drawDeck),
    "unoState.currentTurnUid": isSeven ? playerUid : nextPlayerUid, // If 7, let player pick swap target
    "unoState.direction": direction,
    "unoState.pendingDrawStack": pendingStack,
    "unoState.pendingDrawType": pendingType,
    "unoState.pendingSwapUid": isSeven ? playerUid : null,
    "unoState.hasCalledUno": hasCalled,
    "unoState.lastActionLog": actionLog,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 100);
  }

  await updateDoc(matchRef, updates);
  return { won, requiresHandSwap: isSeven };
}

export async function jumpInUnoCard(
  matchId: string,
  playerUid: string,
  card: UnoCard
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState || match.status !== "PLAYING") throw new Error("Match inactive");

  const us = match.unoState;
  const top = us.discardTop;

  // Jump in requires exact match (same color and same value)
  if (card.color !== top.color || card.value !== top.value) {
    throw new Error("Cannot jump in without an exact matching card!");
  }

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const playerHand = hands[playerUid] || [];
  const cardIdx = playerHand.findIndex((c) => c.color === card.color && c.value === card.value);

  if (cardIdx >= 0) {
    playerHand.splice(cardIdx, 1);
  }
  hands[playerUid] = playerHand;

  const won = playerHand.length === 0;
  const playerUids = Object.keys(match.players || {});
  const numPlayers = playerUids.length;
  const currentIdx = playerUids.indexOf(playerUid);
  const direction: 1 | -1 = us.direction || 1;

  let nextIdx = (currentIdx + direction) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  const nextPlayerUid = playerUids[nextIdx] || playerUid;

  const updates: any = {
    "unoState.discardTop": card,
    "unoState.handsStr": JSON.stringify(hands),
    "unoState.currentTurnUid": nextPlayerUid,
    "unoState.lastActionLog": `⚡ JUMP-IN! ${match.players[playerUid]?.handle || "Player"} jumped in with exact [${card.color} ${card.value}]!`,
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

export async function swapUnoHands(
  matchId: string,
  playerUid: string,
  targetUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) return;

  const us = match.unoState;
  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const myHand = hands[playerUid] || [];
  const targetHand = hands[targetUid] || [];

  hands[playerUid] = targetHand;
  hands[targetUid] = myHand;

  const playerUids = Object.keys(match.players || {});
  const numPlayers = playerUids.length;
  const currentIdx = playerUids.indexOf(playerUid);
  const direction: 1 | -1 = us.direction || 1;

  let nextIdx = (currentIdx + direction) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  const nextPlayerUid = playerUids[nextIdx] || playerUid;

  await updateDoc(matchRef, {
    "unoState.handsStr": JSON.stringify(hands),
    "unoState.pendingSwapUid": null,
    "unoState.currentTurnUid": nextPlayerUid,
    "unoState.lastActionLog": `🤝 7 RULE! ${match.players[playerUid]?.handle || "Player"} swapped hands with ${match.players[targetUid]?.handle || "Opponent"}!`,
    updatedAt: serverTimestamp(),
  });
}

export async function syncGlowHockeyState(matchId: string, updates: Partial<GlowHockeyState>) {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const firestoreUpdates: any = {};
  for (const [key, val] of Object.entries(updates)) {
    firestoreUpdates[`glowHockeyState.${key}`] = val;
  }
  await updateDoc(matchRef, firestoreUpdates);
}

export async function acceptUnoDrawPenalty(
  matchId: string,
  playerUid: string
): Promise<{ drawnCount: number }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) throw new Error("Not an uno match");

  const us = match.unoState;
  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  let drawDeck: UnoCard[] = JSON.parse(us.drawDeckStr || "[]");
  const playerHand = hands[playerUid] || [];
  const countToDraw = us.pendingDrawStack || 2;
  if (drawDeck.length < countToDraw) {
    drawDeck = [...drawDeck, ...createUnoDeck()];
  }

  for (let i = 0; i < countToDraw; i++) {
    const drawn = drawDeck.pop() || { color: "RED", value: "5" };
    playerHand.push(drawn);
  }
  hands[playerUid] = playerHand;

  const playerUids = Object.keys(match.players || {});
  const numPlayers = playerUids.length;
  const currentIdx = playerUids.indexOf(playerUid);
  const direction: 1 | -1 = us.direction || 1;

  let nextIdx = (currentIdx + direction) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  const nextPlayerUid = playerUids[nextIdx] || playerUid;

  await updateDoc(matchRef, {
    "unoState.handsStr": JSON.stringify(hands),
    "unoState.drawDeckStr": JSON.stringify(drawDeck),
    "unoState.pendingDrawStack": 0,
    "unoState.pendingDrawType": null,
    "unoState.currentTurnUid": nextPlayerUid,
    "unoState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} drew ${countToDraw} stacked penalty cards & forfeited turn!`,
    updatedAt: serverTimestamp(),
  });

  return { drawnCount: countToDraw };
}

export async function drawUnoCard(
  matchId: string,
  playerUid: string
): Promise<{ drawnCard: UnoCard }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) throw new Error("Not an uno match");

  const us = match.unoState;

  // If there is an active stacked penalty, handle via acceptUnoDrawPenalty
  if (us.pendingDrawStack && us.pendingDrawStack > 0) {
    const res = await acceptUnoDrawPenalty(matchId, playerUid);
    return { drawnCard: { color: "RED", value: `+${res.drawnCount}` } };
  }

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  let drawDeck: UnoCard[] = JSON.parse(us.drawDeckStr || "[]");
  const playerHand = hands[playerUid] || [];

  if (drawDeck.length < 5) {
    drawDeck = [...drawDeck, ...createUnoDeck()];
  }

  const drawn: UnoCard = drawDeck.pop() || { color: "RED", value: "7" };
  playerHand.push(drawn);
  hands[playerUid] = playerHand;

  const playerUids = Object.keys(match.players || {});
  const numPlayers = playerUids.length;
  const currentIdx = playerUids.indexOf(playerUid);
  const direction: 1 | -1 = us.direction || 1;

  let nextIdx = (currentIdx + direction) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  const nextPlayerUid = playerUids[nextIdx] || playerUid;

  await updateDoc(matchRef, {
    "unoState.handsStr": JSON.stringify(hands),
    "unoState.drawDeckStr": JSON.stringify(drawDeck),
    "unoState.currentTurnUid": nextPlayerUid,
    "unoState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} drew a card from the deck!`,
    updatedAt: serverTimestamp(),
  });

  return { drawnCard: drawn };
}

export async function shoutUno(
  matchId: string,
  playerUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) return;

  await updateDoc(matchRef, {
    [`unoState.hasCalledUno.${playerUid}`]: true,
    "unoState.lastActionLog": `🚨 UNO! ${match.players[playerUid]?.handle || "Player"} SHOUTED UNO (1 CARD REMAINING)!`,
    updatedAt: serverTimestamp(),
  });
}

export async function catchUnoPenalty(
  matchId: string,
  challengerUid: string,
  targetUid: string
): Promise<{ caught: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return { caught: false };
  const match = snap.data() as ArcadeMatch;
  if (!match.unoState) return { caught: false };

  const us = match.unoState;
  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const targetHand = hands[targetUid] || [];
  const hasCalled = us.hasCalledUno?.[targetUid] || false;

  if (targetHand.length === 1 && !hasCalled) {
    const colors: ("RED" | "BLUE" | "GREEN" | "YELLOW")[] = ["RED", "BLUE", "GREEN", "YELLOW"];
    const values = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    targetHand.push(
      { color: colors[Math.floor(Math.random() * colors.length)], value: values[Math.floor(Math.random() * values.length)] },
      { color: colors[Math.floor(Math.random() * colors.length)], value: values[Math.floor(Math.random() * values.length)] }
    );
    hands[targetUid] = targetHand;

    await updateDoc(matchRef, {
      "unoState.handsStr": JSON.stringify(hands),
      "unoState.lastActionLog": `🎯 CAUGHT! ${match.players[challengerUid]?.handle || "Challenger"} caught ${match.players[targetUid]?.handle || "Player"} without shouting UNO (+2 CARDS PENALTY)!`,
      updatedAt: serverTimestamp(),
    });
    return { caught: true };
  }

  return { caught: false };
}


// ── Liar's Dice Actions ───────────────────────────────────────────────────────
export async function makeLiarsDiceBid(
  matchId: string,
  playerUid: string,
  count: number,
  face: number
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;

  const players = Object.keys(match.players || {});
  const nextTurnUid = players.find((u) => u !== playerUid) || playerUid;

  await updateDoc(matchRef, {
    "liarsDiceState.currentBid": { count, face, bidderUid: playerUid },
    "liarsDiceState.currentTurnUid": nextTurnUid,
    "liarsDiceState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} bid ${count}x [${face}]s!`,
    updatedAt: serverTimestamp(),
  });
}

export async function callLiarsDiceBluff(matchId: string, callerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;

  await updateDoc(matchRef, {
    "liarsDiceState.bluffCalled": true,
    "liarsDiceState.lastActionLog": `${match.players[callerUid]?.handle || "Player"} CALLED BLUFF! Revealing dice trays...`,
    status: "FINISHED",
    winnerUid: callerUid,
    winnerHandle: match.players[callerUid]?.handle || "@ANON",
    updatedAt: serverTimestamp(),
  });
  await awardAura(callerUid, match.stakes * 2 || 100);
}

// ── Codenames Actions ────────────────────────────────────────────────────────
export async function selectCodenamesCard(matchId: string, playerUid: string, cardIndex: number): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.codenamesState) return;

  const cs = match.codenamesState;
  const revealed = [...cs.revealed];
  revealed[cardIndex] = true;
  const cardType = cs.cardTypes[cardIndex];

  const updates: any = {
    "codenamesState.revealed": revealed,
    "codenamesState.lastActionLog": `${match.players[playerUid]?.handle || "Operative"} tapped [${cs.words[cardIndex]}] ➔ Revealed ${cardType}!`,
    updatedAt: serverTimestamp(),
  };

  if (cardType === "ASSASSIN") {
    updates.status = "FINISHED";
    const winningTeam = cs.currentTeamTurn === "RED" ? "BLUE" : "RED";
    updates.lastActionLog = `ASSASSIN CONTACTED! ${winningTeam} TEAM WINS!`;
  }

  await updateDoc(matchRef, updates);
}

// ── Skribbl Actions ──────────────────────────────────────────────────────────
export async function submitSkribblStroke(matchId: string, pathSegment: any): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.skribblState) return;

  const paths = JSON.parse(match.skribblState.pathsStr || "[]");
  paths.push(pathSegment);

  await updateDoc(matchRef, {
    "skribblState.pathsStr": JSON.stringify(paths),
    updatedAt: serverTimestamp(),
  });
}

export async function submitSkribblGuess(
  matchId: string,
  guesserUid: string,
  guess: string
): Promise<{ correct: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.skribblState) throw new Error("Not a skribbl match");

  const correct = guess.trim().toUpperCase() === match.skribblState.secretWord.toUpperCase();
  if (correct) {
    const correctGuessers = [...(match.skribblState.correctGuessers || []), guesserUid];
    await updateDoc(matchRef, {
      "skribblState.correctGuessers": correctGuessers,
      "skribblState.lastActionLog": `🎯 ${match.players[guesserUid]?.handle || "Player"} GUESSED THE WORD! (+100 PTS)`,
      updatedAt: serverTimestamp(),
    });
    await awardAura(guesserUid, 100);
  }
  return { correct };
}

// ── Trivia Actions ───────────────────────────────────────────────────────────
export async function submitTriviaAnswer(
  matchId: string,
  playerUid: string,
  optionIndex: number
): Promise<{ correct: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.triviaState) throw new Error("Not a trivia match");

  const ts = match.triviaState;
  const correct = optionIndex === ts.currentQuestion.answerIndex;

  const updates: any = {
    [`triviaState.answersSubmitted.${playerUid}`]: optionIndex,
    updatedAt: serverTimestamp(),
  };

  if (correct) {
    updates[`triviaState.scores.${playerUid}`] = increment(100);
    updates["triviaState.lastActionLog"] = `⚡ ${match.players[playerUid]?.handle || "Player"} answered correctly (+100 PTS)!`;
    await awardAura(playerUid, 100);
  } else {
    updates["triviaState.lastActionLog"] = `❌ Incorrect answer by ${match.players[playerUid]?.handle || "Player"}.`;
  }

  await updateDoc(matchRef, updates);
  return { correct };
}

// ── Quoridor Actions ──────────────────────────────────────────────────────────
export async function moveQuoridorPawn(
  matchId: string,
  playerUid: string,
  newR: number,
  newC: number
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.quoridorState) throw new Error("Not a quoridor match");

  const isP1 = playerUid === match.hostUid;
  const won = isP1 ? newR === 0 : newR === 8;
  const players = Object.keys(match.players || {});
  const nextTurnUid = players.find((u) => u !== playerUid) || playerUid;

  const updates: any = {
    [`quoridorState.${isP1 ? "p1Pos" : "p2Pos"}`]: [newR, newC],
    "quoridorState.currentTurnUid": nextTurnUid,
    "quoridorState.lastActionLog": `${match.players[playerUid]?.handle || "Pawn"} moved to [${newR + 1}, ${newC + 1}].`,
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

// ── Yahtzee Actions ───────────────────────────────────────────────────────────
export async function rollYahtzeeDice(
  matchId: string,
  playerUid: string,
  locked: boolean[]
): Promise<number[]> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.yahtzeeState) throw new Error("Not a yahtzee match");

  const currentDice = match.yahtzeeState.dice || [1, 2, 3, 4, 5];
  const newDice = currentDice.map((d, i) => (locked[i] ? d : Math.floor(Math.random() * 6) + 1));
  const rollsLeft = Math.max(0, match.yahtzeeState.rollsRemaining - 1);

  await updateDoc(matchRef, {
    "yahtzeeState.dice": newDice,
    "yahtzeeState.rollsRemaining": rollsLeft,
    "yahtzeeState.lockedDice": locked,
    "yahtzeeState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} rolled: [${newDice.join(", ")}] (${rollsLeft} rolls left).`,
    updatedAt: serverTimestamp(),
  });

  return newDice;
}

// ── Taboo Actions ─────────────────────────────────────────────────────────────
export async function submitTabooGuess(
  matchId: string,
  guesserUid: string,
  isCorrect: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.tabooState) return;

  const updates: any = {
    updatedAt: serverTimestamp(),
  };

  if (isCorrect) {
    updates[`tabooState.scores.${guesserUid}`] = increment(100);
    updates["tabooState.lastActionLog"] = `🎯 CORRECT! +100 Points awarded to ${match.players[guesserUid]?.handle || "Team"}!`;
    await awardAura(guesserUid, 100);
  } else {
    updates["tabooState.lastActionLog"] = `🚫 FORBIDDEN WORD UTTERED! Round penalized.`;
  }

  await updateDoc(matchRef, updates);
}

// ── Melody Buzzer & Speed Buzzer ──────────────────────────────────────────────
export async function buzzMelodyTrack(matchId: string, playerUid: string): Promise<boolean> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return false;
  const match = snap.data() as ArcadeMatch;
  if (!match.melodyBuzzerState) return false;

  if (match.melodyBuzzerState.buzzedPlayerUid) return false; // Already buzzed

  await updateDoc(matchRef, {
    "melodyBuzzerState.buzzedPlayerUid": playerUid,
    "melodyBuzzerState.roundState": "BUZZED",
    "melodyBuzzerState.lastActionLog": `🚨 BUZZ IN! ${match.players[playerUid]?.handle || "Player"} has the mic to guess!`,
    updatedAt: serverTimestamp(),
  });

  return true;
}

// ── Pitch Arena & Defend the Absurd ──────────────────────────────────────────
export async function tipPitcherVolts(matchId: string, tipperUid: string, volts: number): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.pitchArenaState) return;

  const pitcherUid = match.pitchArenaState.currentPitcherUid;

  await updateDoc(matchRef, {
    [`pitchArenaState.voltTips.${pitcherUid}`]: increment(volts),
    "pitchArenaState.lastActionLog": `⚡ ${match.players[tipperUid]?.handle || "Audience"} tipped +${volts} Volts for the pitch!`,
    updatedAt: serverTimestamp(),
  });
  await awardAura(pitcherUid, volts);
}

// ── 20 Questions Decryption ──────────────────────────────────────────────────
export async function askTwentyQuestion(matchId: string, askerHandle: string, question: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.twentyQuestionsState) return;

  const log = JSON.parse(match.twentyQuestionsState.questionLogStr || "[]");
  log.push({ askerHandle, question, answer: "PENDING" });

  await updateDoc(matchRef, {
    "twentyQuestionsState.questionLogStr": JSON.stringify(log),
    "twentyQuestionsState.questionsRemaining": increment(-1),
    "twentyQuestionsState.lastActionLog": `❓ ${askerHandle} asked: "${question}"`,
    updatedAt: serverTimestamp(),
  });
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

// ── Raja Mantri Chor Sipahi Actions ──────────────────────────────────────────
export async function guessRajaMantriChor(
  matchId: string,
  mantriUid: string,
  suspectUid: string
): Promise<{ correct: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.rajaMantriState) throw new Error("Not a raja mantri match");

  const chits: Record<string, string> = JSON.parse(match.rajaMantriState.chitsStr || "{}");
  const isChor = chits[suspectUid] === "CHOR";

  const updates: any = {
    "rajaMantriState.guessedChorUid": suspectUid,
    "rajaMantriState.phase": "RESOLVED",
    "rajaMantriState.lastActionLog": isChor
      ? `👑 MANTRI CAUGHT THE CHOR (${match.players[suspectUid]?.handle || "Chor"})! Mantri gets 800 pts!`
      : `❌ WRONG ACCUSATION! Chor escapes with 800 pts!`,
    status: "FINISHED",
    winnerUid: isChor ? mantriUid : suspectUid,
    winnerHandle: match.players[isChor ? mantriUid : suspectUid]?.handle || "@ANON",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(matchRef, updates);
  await awardAura(isChor ? mantriUid : suspectUid, 200);
  return { correct: isChor };
}

// ── Hand Cricket / Odd-Even Actions ───────────────────────────────────────────
export async function throwHandCricketNumber(
  matchId: string,
  playerUid: string,
  choice: number
): Promise<{ isOut: boolean; runsScored: number }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.handCricketState) throw new Error("Not a hand cricket match");

  const hcs = match.handCricketState;
  const isBatsman = playerUid === hcs.batsmanUid;

  // Bot response if vs bot
  const botChoice = Math.floor(Math.random() * 6) + 1;
  const batNum = isBatsman ? choice : botChoice;
  const bowlNum = isBatsman ? botChoice : choice;

  const isOut = batNum === bowlNum;
  const runs = isOut ? 0 : batNum;

  const updates: any = {
    "handCricketState.currentBatsmanChoice": batNum,
    "handCricketState.currentBowlerChoice": bowlNum,
    updatedAt: serverTimestamp(),
  };

  if (isOut) {
    updates["handCricketState.lastActionLog"] = `🚨 WICKET! Both threw [${batNum}]! Batsman is OUT!`;
    updates.status = "FINISHED";
    updates.winnerUid = hcs.bowlerUid || playerUid;
    updates.winnerHandle = match.players[updates.winnerUid]?.handle || "@ANON";
    await awardAura(updates.winnerUid, 150);
  } else {
    updates["handCricketState.innings1Score"] = increment(runs);
    updates["handCricketState.lastActionLog"] = `🏏 ${runs} RUNS! Bat: [${batNum}] vs Bowl: [${bowlNum}].`;
  }

  await updateDoc(matchRef, updates);
  return { isOut, runsScored: runs };
}

// ── Book Cricket Actions ──────────────────────────────────────────────────────
export async function flipBookCricketPage(
  matchId: string,
  playerUid: string
): Promise<{ pageNum: number; runs: number; isOut: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.bookCricketState) throw new Error("Not a book cricket match");

  const pageNum = Math.floor(Math.random() * 300) + 1;
  const lastDigit = pageNum % 10;
  let runs = 0;
  let isOut = false;

  if (lastDigit === 0 || lastDigit === 8) {
    isOut = true;
  } else if ([2, 4, 6].includes(lastDigit)) {
    runs = lastDigit;
  } else {
    runs = 1;
  }

  const updates: any = {
    "bookCricketState.lastFlippedPage": pageNum,
    "bookCricketState.balls": increment(1),
    updatedAt: serverTimestamp(),
  };

  if (isOut) {
    updates["bookCricketState.wickets"] = increment(1);
    updates["bookCricketState.lastActionLog"] = `🚨 OUT on Page ${pageNum}! (Digit ${lastDigit})`;
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, 100);
  } else {
    updates["bookCricketState.runs"] = increment(runs);
    updates["bookCricketState.lastActionLog"] = `📖 Page ${pageNum} ➔ +${runs} RUNS!`;
  }

  await updateDoc(matchRef, updates);
  return { pageNum, runs, isOut };
}

// ── Bingo 25-Cross Actions ────────────────────────────────────────────────────
export async function crossBingoNumber(
  matchId: string,
  playerUid: string,
  num: number
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.bingoState) throw new Error("Not a bingo match");

  const bs = match.bingoState;
  const crossed = [...(bs.crossedNumbers || []), num];
  const players = Object.keys(match.players || {});
  const nextTurnUid = players.find((u) => u !== playerUid) || playerUid;

  const updates: any = {
    "bingoState.crossedNumbers": crossed,
    "bingoState.currentTurnUid": nextTurnUid,
    "bingoState.lastActionLog": `🔢 ${match.players[playerUid]?.handle || "Player"} called [ ${num} ]!`,
    updatedAt: serverTimestamp(),
  };

  if (crossed.length >= 15) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, 150);
  }

  await updateDoc(matchRef, updates);
  return { won: crossed.length >= 15 };
}

// ── Name, Place, Animal, Thing Actions ────────────────────────────────────────
export async function submitNPATEntry(
  matchId: string,
  playerUid: string,
  name: string,
  place: string,
  animal: string,
  thing: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.npatState) return;

  const subs = JSON.parse(match.npatState.submissionsStr || "{}");
  subs[playerUid] = { name, place, animal, thing };

  await updateDoc(matchRef, {
    "npatState.submissionsStr": JSON.stringify(subs),
    "npatState.lastActionLog": `📝 ${match.players[playerUid]?.handle || "Player"} submitted NPAT card! (+40 PTS)`,
    [`npatState.roundScores.${playerUid}`]: increment(40),
    updatedAt: serverTimestamp(),
  });
  await awardAura(playerUid, 40);
}

// ── Two Truths and a Lie Actions ──────────────────────────────────────────────
export async function voteTwoTruthsLie(
  matchId: string,
  playerUid: string,
  chosenIndex: number
): Promise<{ correct: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.twoTruthsState) throw new Error("Not a two truths match");

  const isLie = chosenIndex === match.twoTruthsState.lieIndex;

  await updateDoc(matchRef, {
    [`twoTruthsState.votes.${playerUid}`]: chosenIndex,
    "twoTruthsState.isRevealed": true,
    "twoTruthsState.lastActionLog": isLie
      ? `🎯 ${match.players[playerUid]?.handle || "Audience"} SPOTTED THE LIE!`
      : `❌ Fooled by the speaker! That was the truth.`,
    updatedAt: serverTimestamp(),
  });

  if (isLie) await awardAura(playerUid, 50);
  return { correct: isLie };
}

// ── Hangman Actions ───────────────────────────────────────────────────────────
export async function guessHangmanLetter(
  matchId: string,
  playerUid: string,
  letter: string
): Promise<{ correct: boolean; won: boolean; gameOver: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.hangmanState) throw new Error("Not a hangman match");

  const hs = match.hangmanState;
  const uppercaseLetter = letter.toUpperCase();
  if (hs.guessedLetters.includes(uppercaseLetter)) {
    return { correct: false, won: hs.isWon, gameOver: hs.isGameOver };
  }

  const guessed = [...hs.guessedLetters, uppercaseLetter];
  const secret = hs.secretWord.toUpperCase();
  const isMatch = secret.includes(uppercaseLetter);
  const wrongCount = hs.wrongGuesses + (isMatch ? 0 : 1);

  // Check if all letters guessed
  let won = true;
  for (const char of secret) {
    if (!guessed.includes(char)) {
      won = false;
      break;
    }
  }

  const gameOver = won || wrongCount >= hs.maxWrong;

  const updates: any = {
    "hangmanState.guessedLetters": guessed,
    "hangmanState.wrongGuesses": wrongCount,
    "hangmanState.isWon": won,
    "hangmanState.isGameOver": gameOver,
    "hangmanState.lastActionLog": isMatch
      ? `✓ Letter [${uppercaseLetter}] found in cipher!`
      : `✗ Letter [${uppercaseLetter}] not in cipher (${wrongCount}/${hs.maxWrong} strikes).`,
    updatedAt: serverTimestamp(),
  };

  if (gameOver) {
    updates.status = "FINISHED";
    if (won) {
      updates.winnerUid = playerUid;
      updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
      await awardAura(playerUid, 150);
    }
  }

  await updateDoc(matchRef, updates);
  return { correct: isMatch, won, gameOver };
}

// ── Matrix Math Blitz Actions ─────────────────────────────────────────────────
export async function submitMathBlitzAnswer(
  matchId: string,
  playerUid: string,
  answer: number
): Promise<{ correct: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.mathBlitzState) throw new Error("Not a math blitz match");

  const mbs = match.mathBlitzState;
  const correct = answer === mbs.currentProblem.answer;

  const nextNum1 = Math.floor(Math.random() * 25) + 5;
  const nextNum2 = Math.floor(Math.random() * 15) + 3;

  const updates: any = {
    "mathBlitzState.currentProblem": {
      num1: nextNum1,
      op: "+",
      num2: nextNum2,
      answer: nextNum1 + nextNum2,
    },
    updatedAt: serverTimestamp(),
  };

  if (correct) {
    updates[`mathBlitzState.p1Score`] = increment(20);
    updates["mathBlitzState.lastActionLog"] = `⚡ ${match.players[playerUid]?.handle || "Player"} solved correctly (+20 PTS)!`;
    await awardAura(playerUid, 20);
  } else {
    updates["mathBlitzState.lastActionLog"] = `❌ Incorrect math answer!`;
  }

  await updateDoc(matchRef, updates);
  return { correct };
}

// ── Indian 13-Card Rummy Actions ──────────────────────────────────────────────
export async function drawRummyCard(
  matchId: string,
  playerUid: string,
  fromDiscard: boolean
): Promise<{ cardDrawn: string }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.rummyState) throw new Error("Not a rummy match");

  const rs = match.rummyState;
  const hands: Record<string, string[]> = JSON.parse(rs.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  let drawnCard: string;
  let newDiscardTop = rs.discardTop;
  let newDeckCount = rs.drawDeckCount;

  if (fromDiscard) {
    drawnCard = rs.discardTop;
    newDiscardTop = "🂠";
  } else {
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const suits = ["♠", "♥", "♦", "♣"];
    drawnCard = `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;
    newDeckCount = Math.max(0, newDeckCount - 1);
  }

  myHand.push(drawnCard);
  hands[playerUid] = myHand;

  await updateDoc(matchRef, {
    "rummyState.handsStr": JSON.stringify(hands),
    "rummyState.hasDrawn": true,
    "rummyState.discardTop": newDiscardTop,
    "rummyState.drawDeckCount": newDeckCount,
    "rummyState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} drew a card from ${fromDiscard ? "discard pile" : "closed deck"}.`,
    updatedAt: serverTimestamp(),
  });

  return { cardDrawn: drawnCard };
}

export async function discardRummyCard(
  matchId: string,
  playerUid: string,
  cardToDiscard: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.rummyState) throw new Error("Not a rummy match");

  const rs = match.rummyState;
  const hands: Record<string, string[]> = JSON.parse(rs.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  const cardIdx = myHand.indexOf(cardToDiscard);
  if (cardIdx !== -1) {
    myHand.splice(cardIdx, 1);
  }
  hands[playerUid] = myHand;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids.find((u) => u !== playerUid) || playerUid;

  await updateDoc(matchRef, {
    "rummyState.handsStr": JSON.stringify(hands),
    "rummyState.discardTop": cardToDiscard,
    "rummyState.hasDrawn": false,
    "rummyState.currentTurnUid": nextTurnUid,
    "rummyState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} discarded [${cardToDiscard}].`,
    updatedAt: serverTimestamp(),
  });
}

export async function declareRummyHand(
  matchId: string,
  playerUid: string,
  finishCard: string
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.rummyState) throw new Error("Not a rummy match");

  const updates: any = {
    status: "FINISHED",
    winnerUid: playerUid,
    winnerHandle: match.players[playerUid]?.handle || "@ANON",
    "rummyState.lastActionLog": `🏆 SHOW DECLARED! ${match.players[playerUid]?.handle || "Player"} submitted 13 cards with 0 deadwood points!`,
    updatedAt: serverTimestamp(),
  };

  await awardAura(playerUid, match.stakes * 2 || 200);
  await updateDoc(matchRef, updates);
  return { won: true };
}

// ── Call Break (Lakdi) Actions ────────────────────────────────────────────────
export async function bidCallBreak(
  matchId: string,
  playerUid: string,
  bid: number
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.callBreakState) throw new Error("Not a call break match");

  const cbs = match.callBreakState;
  const bids = { ...cbs.bids, [playerUid]: bid };
  const allPlayers = Object.keys(match.players || {});
  const allBid = allPlayers.every((u) => bids[u] !== undefined);

  const updates: any = {
    "callBreakState.bids": bids,
    "callBreakState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} bid ${bid} tricks.`,
    updatedAt: serverTimestamp(),
  };

  if (allBid) {
    updates["callBreakState.phase"] = "PLAYING";
  }

  await updateDoc(matchRef, updates);
}

export async function playCallBreakCard(
  matchId: string,
  playerUid: string,
  card: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.callBreakState) throw new Error("Not a call break match");

  const cbs = match.callBreakState;
  const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  const cardIdx = myHand.indexOf(card);
  if (cardIdx !== -1) myHand.splice(cardIdx, 1);
  hands[playerUid] = myHand;

  const currentTrick = [...cbs.currentTrick, { playerUid, card }];
  const suit = card.slice(-1);
  const ledSuit = cbs.ledSuit || suit;

  const playerUids = Object.keys(match.players || {});
  let nextTurnUid = playerUids[(playerUids.indexOf(playerUid) + 1) % playerUids.length];
  let tricksWon = { ...cbs.tricksWon };
  let log = `${match.players[playerUid]?.handle || "Player"} played [${card}].`;

  // Check if trick completed (4 cards)
  if (currentTrick.length >= 4) {
    // Determine winner of trick (Spades trump, then highest of led suit)
    let winningPlay = currentTrick[0];
    for (let i = 1; i < currentTrick.length; i++) {
      const play = currentTrick[i];
      const winCard = winningPlay.card;
      const curCard = play.card;
      const isCurSpade = curCard.includes("♠");
      const isWinSpade = winCard.includes("♠");

      if (isCurSpade && !isWinSpade) {
        winningPlay = play;
      } else if (isCurSpade && isWinSpade) {
        // Higher rank
        winningPlay = play;
      } else if (!isWinSpade && curCard.slice(-1) === ledSuit) {
        winningPlay = play;
      }
    }

    const trickWinner = winningPlay.playerUid;
    tricksWon[trickWinner] = (tricksWon[trickWinner] || 0) + 1;
    log = `⭐ ${match.players[trickWinner]?.handle || "Player"} won the trick with [${winningPlay.card}]!`;
    nextTurnUid = trickWinner;
  }

  const updates: any = {
    "callBreakState.handsStr": JSON.stringify(hands),
    "callBreakState.currentTrick": currentTrick.length >= 4 ? [] : currentTrick,
    "callBreakState.ledSuit": currentTrick.length >= 4 ? null : ledSuit,
    "callBreakState.currentTurnUid": nextTurnUid,
    "callBreakState.tricksWon": tricksWon,
    "callBreakState.lastActionLog": log,
    updatedAt: serverTimestamp(),
  };

  // Check game completion (13 tricks)
  const totalTricks = Object.values(tricksWon).reduce((a, b) => a + b, 0);
  if (totalTricks >= 13) {
    updates.status = "FINISHED";
    const winnerUid = Object.entries(tricksWon).sort((a, b) => b[1] - a[1])[0][0];
    updates.winnerUid = winnerUid;
    updates.winnerHandle = match.players[winnerUid]?.handle || "@ANON";
    await awardAura(winnerUid, match.stakes * 2 || 200);
  }

  await updateDoc(matchRef, updates);
}

// ── Teen Patti Actions ────────────────────────────────────────────────────────
export async function seeTeenPattiCards(
  matchId: string,
  playerUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.teenPattiState) return;

  await updateDoc(matchRef, {
    [`teenPattiState.seenPlayers.${playerUid}`]: true,
    "teenPattiState.lastActionLog": `👀 ${match.players[playerUid]?.handle || "Player"} saw their cards (Playing SEEN).`,
    updatedAt: serverTimestamp(),
  });
}

export async function betTeenPatti(
  matchId: string,
  playerUid: string,
  action: "CHAAL" | "PACK" | "SHOW"
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.teenPattiState) throw new Error("Not a teen patti match");

  const tps = match.teenPattiState;
  const isSeen = tps.seenPlayers[playerUid] || false;
  const betAmount = isSeen ? tps.currentStake * 2 : tps.currentStake;

  const playerUids = Object.keys(match.players || {});
  const activeUids = playerUids.filter((u) => !tps.foldedPlayers[u]);
  const nextTurnUid = activeUids[(activeUids.indexOf(playerUid) + 1) % activeUids.length] || playerUid;

  const updates: any = {
    updatedAt: serverTimestamp(),
  };

  if (action === "PACK") {
    updates[`teenPattiState.foldedPlayers.${playerUid}`] = true;
    updates["teenPattiState.lastActionLog"] = `🏳️ ${match.players[playerUid]?.handle || "Player"} packed / folded.`;
    updates["teenPattiState.currentTurnUid"] = nextTurnUid;

    const remaining = activeUids.filter((u) => u !== playerUid);
    if (remaining.length === 1) {
      updates.status = "FINISHED";
      updates.winnerUid = remaining[0];
      updates.winnerHandle = match.players[remaining[0]]?.handle || "@ANON";
      await awardAura(remaining[0], tps.pot);
    }
  } else if (action === "CHAAL") {
    updates["teenPattiState.pot"] = increment(betAmount);
    updates[`teenPattiState.playerBets.${playerUid}`] = increment(betAmount);
    updates["teenPattiState.currentTurnUid"] = nextTurnUid;
    updates["teenPattiState.lastActionLog"] = `🪙 ${match.players[playerUid]?.handle || "Player"} placed Chaal of ${betAmount} coins.`;
  } else if (action === "SHOW") {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    updates["teenPattiState.lastActionLog"] = `🏆 SHOWDOWN! ${match.players[playerUid]?.handle || "Player"} won the pot with highest 3-card combination!`;
    await awardAura(playerUid, tps.pot + betAmount);
  }

  await updateDoc(matchRef, updates);
}

// ── Satte Pe Satta (7 of Hearts) Actions ───────────────────────────────────────
export async function playSattePeSattaCard(
  matchId: string,
  playerUid: string,
  card: string
): Promise<{ won: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.sattePeSattaState) throw new Error("Not a satte pe satta match");

  const sps = match.sattePeSattaState;
  const hands: Record<string, string[]> = JSON.parse(sps.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  const cardIdx = myHand.indexOf(card);
  if (cardIdx !== -1) myHand.splice(cardIdx, 1);
  hands[playerUid] = myHand;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids[(playerUids.indexOf(playerUid) + 1) % playerUids.length];
  const won = myHand.length === 0;

  const updates: any = {
    "sattePeSattaState.handsStr": JSON.stringify(hands),
    "sattePeSattaState.currentTurnUid": nextTurnUid,
    "sattePeSattaState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} played [${card}].`,
    updatedAt: serverTimestamp(),
  };

  if (won) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 150);
  }

  await updateDoc(matchRef, updates);
  return { won };
}

// ── Bhabhi / Thulla Actions ───────────────────────────────────────────────────
export async function playBhabhiCard(
  matchId: string,
  playerUid: string,
  card: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.bhabhiThullaState) throw new Error("Not a bhabhi match");

  const bts = match.bhabhiThullaState;
  const hands: Record<string, string[]> = JSON.parse(bts.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  const cardIdx = myHand.indexOf(card);
  if (cardIdx !== -1) myHand.splice(cardIdx, 1);
  hands[playerUid] = myHand;

  const escaped = [...bts.escapedPlayers];
  if (myHand.length === 0 && !escaped.includes(playerUid)) {
    escaped.push(playerUid);
  }

  const playerUids = Object.keys(match.players || {});
  const remaining = playerUids.filter((u) => !escaped.includes(u));
  const nextTurnUid = remaining[(remaining.indexOf(playerUid) + 1) % remaining.length] || playerUid;

  const updates: any = {
    "bhabhiThullaState.handsStr": JSON.stringify(hands),
    "bhabhiThullaState.escapedPlayers": escaped,
    "bhabhiThullaState.currentTurnUid": nextTurnUid,
    "bhabhiThullaState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} threw [${card}]${myHand.length === 0 ? " and ESCAPED!" : "."}`,
    updatedAt: serverTimestamp(),
  };

  if (remaining.length <= 1) {
    updates.status = "FINISHED";
    const bhabhi = remaining[0] || playerUid;
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    updates["bhabhiThullaState.bhabhiUid"] = bhabhi;
    updates["bhabhiThullaState.lastActionLog"] = `🚨 GAME OVER! ${match.players[bhabhi]?.handle || "Player"} is declared the BHABHI!`;
  }

  await updateDoc(matchRef, updates);
}

// ── Mendicot Actions ──────────────────────────────────────────────────────────
export async function playMendicotCard(
  matchId: string,
  playerUid: string,
  card: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.mendicotState) throw new Error("Not a mendicot match");

  const ms = match.mendicotState;
  const hands: Record<string, string[]> = JSON.parse(ms.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  const cardIdx = myHand.indexOf(card);
  if (cardIdx !== -1) myHand.splice(cardIdx, 1);
  hands[playerUid] = myHand;

  const isTen = card.startsWith("10");
  const isTeam1 = playerUid === match.hostUid;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids[(playerUids.indexOf(playerUid) + 1) % playerUids.length];

  const updates: any = {
    "mendicotState.handsStr": JSON.stringify(hands),
    "mendicotState.currentTurnUid": nextTurnUid,
    "mendicotState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} played [${card}]${isTen ? " (TEN CAPTURE OPPORTUNITY!)" : "."}`,
    updatedAt: serverTimestamp(),
  };

  if (isTen) {
    if (isTeam1) updates["mendicotState.team1TensCount"] = increment(1);
    else updates["mendicotState.team2TensCount"] = increment(1);
  }

  await updateDoc(matchRef, updates);
}

// ── Cheat / Bluff Actions ─────────────────────────────────────────────────────
export async function discardCheatBluff(
  matchId: string,
  playerUid: string,
  declaredRank: string,
  actualCards: string[]
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.cheatBluffState) throw new Error("Not a cheat bluff match");

  const cbs = match.cheatBluffState;
  const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
  const myHand = hands[playerUid] || [];

  actualCards.forEach((c) => {
    const idx = myHand.indexOf(c);
    if (idx !== -1) myHand.splice(idx, 1);
  });
  hands[playerUid] = myHand;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids[(playerUids.indexOf(playerUid) + 1) % playerUids.length];

  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const nextRank = ranks[(ranks.indexOf(declaredRank) + 1) % ranks.length];

  const updates: any = {
    "cheatBluffState.handsStr": JSON.stringify(hands),
    "cheatBluffState.currentRank": nextRank,
    "cheatBluffState.lastDiscardCount": actualCards.length,
    "cheatBluffState.lastDiscardCards": actualCards,
    "cheatBluffState.lastDiscarderUid": playerUid,
    "cheatBluffState.pileCount": increment(actualCards.length),
    "cheatBluffState.currentTurnUid": nextTurnUid,
    "cheatBluffState.lastActionLog": `${match.players[playerUid]?.handle || "Player"} placed ${actualCards.length} card(s) claiming "${declaredRank}s".`,
    updatedAt: serverTimestamp(),
  };

  if (myHand.length === 0) {
    updates.status = "FINISHED";
    updates.winnerUid = playerUid;
    updates.winnerHandle = match.players[playerUid]?.handle || "@ANON";
    await awardAura(playerUid, match.stakes * 2 || 150);
  }

  await updateDoc(matchRef, updates);
}

export async function challengeCheatBluff(
  matchId: string,
  challengerUid: string
): Promise<{ wasLying: boolean }> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as ArcadeMatch;
  if (!match.cheatBluffState) throw new Error("Not a cheat bluff match");

  const cbs = match.cheatBluffState;
  const lastCards = cbs.lastDiscardCards || [];
  const expectedRank = cbs.currentRank;
  const wasLying = lastCards.some((c) => !c.startsWith(expectedRank));

  const victimUid = wasLying ? cbs.lastDiscarderUid : challengerUid;
  const log = wasLying
    ? `🚨 CAUGHT BLUFFING! ${match.players[cbs.lastDiscarderUid || ""]?.handle || "Player"} lied with [${lastCards.join(", ")}] and picks up the pile!`
    : `🛡️ HONEST DISCARD! ${match.players[challengerUid]?.handle || "Challenger"} falsely accused and picks up the pile!`;

  await updateDoc(matchRef, {
    "cheatBluffState.pileCount": 0,
    "cheatBluffState.lastActionLog": log,
    updatedAt: serverTimestamp(),
  });

  return { wasLying };
}

// ── Klondike Solitaire Actions ────────────────────────────────────────────────
export async function drawSolitaireCard(
  matchId: string,
  playerUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.solitaireState) return;

  const ss = match.solitaireState;
  let stock: string[] = JSON.parse(ss.stockpileStr || "[]");
  let waste: string[] = JSON.parse(ss.wasteStr || "[]");

  if (stock.length === 0) {
    stock = waste.reverse();
    waste = [];
  } else {
    const drawn = stock.pop();
    if (drawn) waste.push(drawn);
  }

  await updateDoc(matchRef, {
    "solitaireState.stockpileStr": JSON.stringify(stock),
    "solitaireState.wasteStr": JSON.stringify(waste),
    "solitaireState.moves": increment(1),
    "solitaireState.lastActionLog": `Drew card from stockpile (${stock.length} remaining).`,
    updatedAt: serverTimestamp(),
  });
}

export async function sendSpectatorEvent(matchId: string, handle: string, type: string) {
  try {
    const db = getFirebaseDb();
    const matchRef = doc(db, ARCADE_COLLECTION, matchId);
    await updateDoc(matchRef, {
      lastSpectatorEvent: { type, handle, ts: Date.now() },
    });
  } catch (e) {
    console.error("Failed to send spectator event", e);
  }
}


// ── Spectator Wagering ──────────────────────────────────────────────────────────
export async function placeSpectatorWager(
  matchId: string,
  spectatorUid: string,
  targetPlayerUid: string,
  amount: number
): Promise<boolean> {
  const db = getFirebaseDb();
  
  try {
    const success = await runTransaction(db, async (tx) => {
      // Check user balance
      const userRef = doc(db, "users", spectatorUid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) return false;
      const aura = userSnap.data()?.auraScore || 0;
      if (aura < amount) return false;

      // Check match status
      const matchRef = doc(db, ARCADE_COLLECTION, matchId);
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists()) return false;
      const matchData = matchSnap.data() as ArcadeMatch;
      
      // Can't bet if game is finished
      if (matchData.status === "FINISHED") return false;
      
      // Can't bet if you are playing
      if (matchData.players[spectatorUid]) return false;

      // Deduct aura from user
      tx.update(userRef, { auraScore: increment(-amount) });

      // Add wager to match
      tx.update(matchRef, {
        [`spectatorWagers.${spectatorUid}`]: { playerUid: targetPlayerUid, amount }
      });

      return true;
    });
    return success;
  } catch (err) {
    console.error("Wager failed:", err);
    return false;
  }
}


export async function processWagerPayouts(matchId: string, winnerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  
  if (!match.spectatorWagers) return;
  if (match.status !== "FINISHED") return;
  
  // To prevent double payouts, we can clear the wagers map after processing,
  // or just trust that this only runs once per match via the client ref.
  // We'll clear it for extra safety.
  
  const payoutUpdates: Record<string, any> = {};
  
  for (const [spectatorUid, w] of Object.entries(match.spectatorWagers)) { const wager = w as { playerUid: string; amount: number; };
    if (wager.playerUid === winnerUid) {
      // Spectator won! Give them 2x
      try {
        const specRef = doc(db, "users", spectatorUid);
        await updateDoc(specRef, {
          auraScore: increment(wager.amount * 2)
        });
      } catch (e) {
        console.error("Payout failed for", spectatorUid, e);
      }
    }
  }
  
  // Clear wagers so they aren't processed again
  await updateDoc(matchRef, {
    spectatorWagers: {}
  });
}


// ── Bollywood Antakshari Actions ──────────────────────────────────────────────
export async function submitAntakshariSong(
  matchId: string,
  playerUid: string,
  songTitle: string,
  endingLetter: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.antakshariState) return;

  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids.find((id) => id !== playerUid) || playerUid;
  const currentScores = match.antakshariState.scores || {};
  const newScore = (currentScores[playerUid] || 0) + 10;

  const newHistory: AntakshariHistoryItem = {
    letter: match.antakshariState.currentLetter,
    song: songTitle,
    singerHandle: match.players[playerUid]?.handle || "Singer",
    timestamp: Date.now(),
  };

  const updates: any = {
    "antakshariState.currentLetter": endingLetter,
    "antakshariState.currentTurnUid": nextTurnUid,
    "antakshariState.round": (match.antakshariState.round || 1) + 1,
    "antakshariState.songHistory": [...(match.antakshariState.songHistory || []), newHistory],
    [`antakshariState.scores.${playerUid}`]: newScore,
    "antakshariState.lastActionLog": `${match.players[playerUid]?.handle || "Singer"} sang "${songTitle}"! Next letter: [${endingLetter}]`,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(matchRef, updates);
}

export async function passAntakshariTurn(
  matchId: string,
  playerUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  if (!match.antakshariState) return;

  const letters = ["म", "न", "र", "स", "क", "ल", "ह", "द", "प", "य", "त", "ब", "ज", "ग"];
  const nextLetter = letters[Math.floor(Math.random() * letters.length)];
  const playerUids = Object.keys(match.players || {});
  const nextTurnUid = playerUids.find((id) => id !== playerUid) || playerUid;

  const updates: any = {
    "antakshariState.currentLetter": nextLetter,
    "antakshariState.currentTurnUid": nextTurnUid,
    "antakshariState.lastActionLog": `Turn passed! Next letter is [${nextLetter}].`,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(matchRef, updates);
}

// ── MONOPOLY GAME ACTIONS ──────────────────────────────────────────────────
export async function rollMonopolyDice(matchId: string, playerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms || ms.currentTurnUid !== playerUid || ms.hasRolledThisTurn) return;

  const positions: Record<string, number> = JSON.parse(ms.positionsStr || "{}");
  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");
  const inJailTurns: Record<string, number> = JSON.parse(ms.inJailTurnsStr || "{}");
  const bankrupt: Record<string, boolean> = JSON.parse(ms.isBankruptStr || "{}");

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const isDouble = d1 === d2;
  const rollSum = d1 + d2;
  const newDoubles = isDouble ? (ms.consecutiveDoubles || 0) + 1 : 0;

  let currentPos = positions[playerUid] || 0;
  let inJail = (inJailTurns[playerUid] || 0) > 0;
  let log = "";
  let pendingAction: any = null;

  // Handle Jail Escape
  if (inJail) {
    if (isDouble) {
      inJail = false;
      inJailTurns[playerUid] = 0;
      currentPos = 10;
      log = `${match.players[playerUid]?.handle || "Player"} rolled doubles (${d1}-${d2}) and escaped Jail!`;
    } else {
      inJailTurns[playerUid] = (inJailTurns[playerUid] || 0) + 1;
      if (inJailTurns[playerUid] >= 3) {
        cash[playerUid] = Math.max(0, (cash[playerUid] || 1500) - 50);
        inJail = false;
        inJailTurns[playerUid] = 0;
        log = `${match.players[playerUid]?.handle || "Player"} served 3 turns in Jail, paid $50 fine, and is released.`;
      } else {
        log = `${match.players[playerUid]?.handle || "Player"} rolled ${d1}-${d2} (no doubles) and remains in Jail (Turn ${inJailTurns[playerUid]}/3).`;
        const updates: any = {
          "monopolyState.lastDiceRoll": [d1, d2],
          "monopolyState.consecutiveDoubles": 0,
          "monopolyState.hasRolledThisTurn": true,
          "monopolyState.inJailTurnsStr": JSON.stringify(inJailTurns),
          "monopolyState.cashStr": JSON.stringify(cash),
          "monopolyState.lastActionLog": log,
          "monopolyState.pendingTileAction": null,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(matchRef, updates);
        return;
      }
    }
  }

  // 3 Consecutive Doubles Penalty -> Go to Jail
  if (newDoubles >= 3) {
    positions[playerUid] = 10;
    inJailTurns[playerUid] = 1;
    log = `🚨 Speeding! ${match.players[playerUid]?.handle || "Player"} rolled 3 consecutive doubles and was sent directly to JAIL!`;
    const updates: any = {
      "monopolyState.positionsStr": JSON.stringify(positions),
      "monopolyState.lastDiceRoll": [d1, d2],
      "monopolyState.consecutiveDoubles": 0,
      "monopolyState.hasRolledThisTurn": true,
      "monopolyState.inJailTurnsStr": JSON.stringify(inJailTurns),
      "monopolyState.lastActionLog": log,
      "monopolyState.pendingTileAction": { tileIndex: 10, type: "JAIL" },
      updatedAt: serverTimestamp(),
    };
    await updateDoc(matchRef, updates);
    return;
  }

  // Normal Board Movement
  const oldPos = currentPos;
  const nextPos = (currentPos + rollSum) % 40;
  // Pass GO Bonus (Collect $200)
  if (nextPos < oldPos && oldPos !== 0) {
    cash[playerUid] = (cash[playerUid] || 1500) + 200;
  }
  positions[playerUid] = nextPos;
  const tile = MONOPOLY_TILES[nextPos];

  // Tile Action Resolution
  if (tile.id === 30) {
    positions[playerUid] = 10;
    inJailTurns[playerUid] = 1;
    log = `${match.players[playerUid]?.handle || "Player"} rolled ${rollSum} (${d1}+${d2}) ➔ Landed on 'GO TO JAIL'!`;
    pendingAction = { tileIndex: 10, type: "JAIL" };
  } else if (tile.group === "SPECIAL") {
    if (tile.name === "GO") {
      log = `${match.players[playerUid]?.handle || "Player"} rolled ${rollSum} (${d1}+${d2}) and landed on GO (+ $200)!`;
      pendingAction = { tileIndex: 0, type: "GO", amount: 200 };
    } else if (tile.name === "Income Tax") {
      cash[playerUid] = Math.max(0, (cash[playerUid] || 1500) - 200);
      log = `${match.players[playerUid]?.handle || "Player"} landed on Income Tax and paid $200.`;
      pendingAction = { tileIndex: 4, type: "TAX", amount: 200 };
    } else if (tile.name === "Luxury Tax") {
      cash[playerUid] = Math.max(0, (cash[playerUid] || 1500) - 100);
      log = `${match.players[playerUid]?.handle || "Player"} landed on Luxury Tax and paid $100.`;
      pendingAction = { tileIndex: 38, type: "TAX", amount: 100 };
    } else if (tile.name === "Chance" || tile.name === "Community Chest") {
      const rewards = [50, 100, 150, -50, 200];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      cash[playerUid] = Math.max(0, (cash[playerUid] || 1500) + reward);
      log = `${match.players[playerUid]?.handle || "Player"} opened a ${tile.name} card: ${reward >= 0 ? `Collected +$${reward}` : `Paid -$${Math.abs(reward)}`}!`;
      pendingAction = { tileIndex: nextPos, type: "WARP", amount: reward };
    } else {
      log = `${match.players[playerUid]?.handle || "Player"} rolled ${rollSum} (${d1}+${d2}) and visited ${tile.name}.`;
    }
  } else {
    // Property Tile
    const propState = properties[nextPos];
    if (!propState || !propState.ownerUid) {
      log = `${match.players[playerUid]?.handle || "Player"} landed on unowned ${tile.name} ($${tile.price}).`;
      pendingAction = { tileIndex: nextPos, type: "UNOWNED_PROPERTY", propId: nextPos, amount: tile.price };
    } else if (propState.ownerUid === playerUid) {
      log = `${match.players[playerUid]?.handle || "Player"} landed on their own property (${tile.name}).`;
    } else if (!propState.isMortgaged) {
      // Calculate Rent
      let rentOwed = 0;
      if (tile.group === "RAILROAD") {
        const ownedRRs = Object.entries(properties).filter(
          ([id, p]) => p.ownerUid === propState.ownerUid && MONOPOLY_TILES[Number(id)]?.group === "RAILROAD"
        ).length;
        rentOwed = 25 * Math.pow(2, Math.max(0, ownedRRs - 1));
      } else if (tile.group === "UTILITY") {
        const ownedUtils = Object.entries(properties).filter(
          ([id, p]) => p.ownerUid === propState.ownerUid && MONOPOLY_TILES[Number(id)]?.group === "UTILITY"
        ).length;
        rentOwed = ownedUtils === 2 ? rollSum * 10 : rollSum * 4;
      } else {
        const h = propState.houses || 0;
        if (h > 0) {
          rentOwed = tile.rent[h] || tile.rent[0];
        } else {
          const groupProps = MONOPOLY_TILES.filter((t) => t.group === tile.group);
          const hasMonopoly = groupProps.every((gp) => properties[gp.id]?.ownerUid === propState.ownerUid);
          rentOwed = hasMonopoly ? tile.rent[0] * 2 : tile.rent[0];
        }
      }

      const actualPaid = Math.min(cash[playerUid] || 0, rentOwed);
      cash[playerUid] = (cash[playerUid] || 0) - actualPaid;
      cash[propState.ownerUid] = (cash[propState.ownerUid] || 0) + actualPaid;

      if ((cash[playerUid] || 0) <= 0) {
        bankrupt[playerUid] = true;
        log = `💥 BANKRUPTCY! ${match.players[playerUid]?.handle || "Player"} owed $${rentOwed} rent on ${tile.name} to ${match.players[propState.ownerUid]?.handle || "Owner"} and went bankrupt!`;
      } else {
        log = `${match.players[playerUid]?.handle || "Player"} landed on ${tile.name} and paid $${actualPaid} rent to ${match.players[propState.ownerUid]?.handle || "Owner"}.`;
      }
      pendingAction = { tileIndex: nextPos, type: "RENT_PAID", propId: nextPos, amount: rentOwed };
    }
  }

  let winnerUid = match.winnerUid;
  let winnerHandle = match.winnerHandle;
  let status = match.status;
  const activePlayers = Object.keys(match.players || {}).filter((uid) => !bankrupt[uid]);
  if (activePlayers.length === 1 && Object.keys(match.players || {}).length > 1) {
    winnerUid = activePlayers[0];
    winnerHandle = match.players[winnerUid]?.handle || "Champion";
    status = "FINISHED";
  }

  const updates: any = {
    "monopolyState.positionsStr": JSON.stringify(positions),
    "monopolyState.cashStr": JSON.stringify(cash),
    "monopolyState.propertiesStr": JSON.stringify(properties),
    "monopolyState.inJailTurnsStr": JSON.stringify(inJailTurns),
    "monopolyState.lastDiceRoll": [d1, d2],
    "monopolyState.consecutiveDoubles": newDoubles,
    "monopolyState.hasRolledThisTurn": true,
    "monopolyState.isBankruptStr": JSON.stringify(bankrupt),
    "monopolyState.lastActionLog": log,
    "monopolyState.pendingTileAction": pendingAction,
    updatedAt: serverTimestamp(),
  };

  if (winnerUid) {
    updates.winnerUid = winnerUid;
    updates.winnerHandle = winnerHandle;
    updates.status = status;
  }

  await updateDoc(matchRef, updates);
}

export async function buyMonopolyProperty(matchId: string, playerUid: string, propId: number): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms || ms.currentTurnUid !== playerUid) return;

  const tile = MONOPOLY_TILES[propId];
  if (!tile || tile.price <= 0) return;

  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");

  if (properties[propId]?.ownerUid || (cash[playerUid] || 0) < tile.price) return;

  cash[playerUid] = (cash[playerUid] || 1500) - tile.price;
  properties[propId] = {
    ownerUid: playerUid,
    houses: 0,
    isMortgaged: false,
  };

  const log = `🎩 ${match.players[playerUid]?.handle || "Player"} purchased ${tile.name} for $${tile.price}!`;

  await updateDoc(matchRef, {
    "monopolyState.cashStr": JSON.stringify(cash),
    "monopolyState.propertiesStr": JSON.stringify(properties),
    "monopolyState.lastActionLog": log,
    "monopolyState.pendingTileAction": null,
    updatedAt: serverTimestamp(),
  });
}

export async function buildMonopolyHouse(matchId: string, playerUid: string, propId: number): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms) return;

  const tile = MONOPOLY_TILES[propId];
  if (!tile || tile.houseCost <= 0) return;

  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");
  const prop = properties[propId];
  if (!prop || prop.ownerUid !== playerUid || prop.houses >= 5 || (cash[playerUid] || 0) < tile.houseCost) return;

  const groupProps = MONOPOLY_TILES.filter((t) => t.group === tile.group);
  const hasMonopoly = groupProps.every((gp) => properties[gp.id]?.ownerUid === playerUid);
  if (!hasMonopoly) return;

  const minHouses = Math.min(...groupProps.map((gp) => properties[gp.id]?.houses || 0));
  if (prop.houses > minHouses) return;

  cash[playerUid] = (cash[playerUid] || 1500) - tile.houseCost;
  prop.houses += 1;
  properties[propId] = prop;

  const tierLabel = prop.houses === 5 ? "Hotel 🏨" : `${prop.houses} Houses 🏠`;
  const log = `🏗️ ${match.players[playerUid]?.handle || "Player"} built on ${tile.name} (Now: ${tierLabel}) for $${tile.houseCost}!`;

  await updateDoc(matchRef, {
    "monopolyState.cashStr": JSON.stringify(cash),
    "monopolyState.propertiesStr": JSON.stringify(properties),
    "monopolyState.lastActionLog": log,
    updatedAt: serverTimestamp(),
  });
}

export async function mortgageMonopolyProperty(matchId: string, playerUid: string, propId: number): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms) return;

  const tile = MONOPOLY_TILES[propId];
  if (!tile || tile.price <= 0) return;

  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");
  const prop = properties[propId];
  if (!prop || prop.ownerUid !== playerUid || prop.houses > 0) return;

  const mortgageVal = Math.round(tile.price / 2);

  if (!prop.isMortgaged) {
    prop.isMortgaged = true;
    cash[playerUid] = (cash[playerUid] || 0) + mortgageVal;
    properties[propId] = prop;
    const log = `💳 ${match.players[playerUid]?.handle || "Player"} mortgaged ${tile.name} and received +$${mortgageVal}.`;
    await updateDoc(matchRef, {
      "monopolyState.cashStr": JSON.stringify(cash),
      "monopolyState.propertiesStr": JSON.stringify(properties),
      "monopolyState.lastActionLog": log,
      updatedAt: serverTimestamp(),
    });
  } else {
    const costToUnmortgage = Math.round(mortgageVal * 1.10);
    if ((cash[playerUid] || 0) < costToUnmortgage) return;
    prop.isMortgaged = false;
    cash[playerUid] = (cash[playerUid] || 0) - costToUnmortgage;
    properties[propId] = prop;
    const log = `💎 ${match.players[playerUid]?.handle || "Player"} unmortgaged ${tile.name} for $${costToUnmortgage}.`;
    await updateDoc(matchRef, {
      "monopolyState.cashStr": JSON.stringify(cash),
      "monopolyState.propertiesStr": JSON.stringify(properties),
      "monopolyState.lastActionLog": log,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function payJailFine(matchId: string, playerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms || ms.currentTurnUid !== playerUid || ms.hasRolledThisTurn) return;

  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const inJailTurns: Record<string, number> = JSON.parse(ms.inJailTurnsStr || "{}");

  if ((inJailTurns[playerUid] || 0) <= 0 || (cash[playerUid] || 0) < 50) return;

  cash[playerUid] = (cash[playerUid] || 1500) - 50;
  inJailTurns[playerUid] = 0;

  const log = `🔓 ${match.players[playerUid]?.handle || "Player"} paid $50 Jail Bail fine and is free to roll!`;

  await updateDoc(matchRef, {
    "monopolyState.cashStr": JSON.stringify(cash),
    "monopolyState.inJailTurnsStr": JSON.stringify(inJailTurns),
    "monopolyState.lastActionLog": log,
    updatedAt: serverTimestamp(),
  });
}

export async function endMonopolyTurn(matchId: string, playerUid: string): Promise<void> {
  const db = getFirebaseDb();
  const matchRef = doc(db, ARCADE_COLLECTION, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const match = snap.data() as ArcadeMatch;
  const ms = match.monopolyState;
  if (!ms || ms.currentTurnUid !== playerUid) return;

  const playerUids = Object.keys(match.players || {});
  const bankrupt: Record<string, boolean> = JSON.parse(ms.isBankruptStr || "{}");
  const activeUids = playerUids.filter((id) => !bankrupt[id]);
  const currentIdx = activeUids.indexOf(playerUid);
  const nextTurnUid = activeUids[(currentIdx + 1) % activeUids.length] || playerUid;

  const inJailTurns: Record<string, number> = JSON.parse(ms.inJailTurnsStr || "{}");
  const inJail = (inJailTurns[playerUid] || 0) > 0;
  const isDouble = ms.lastDiceRoll && ms.lastDiceRoll[0] === ms.lastDiceRoll[1];
  const canRollAgain = isDouble && !inJail && (ms.consecutiveDoubles || 0) < 3;

  const updates: any = {
    "monopolyState.currentTurnUid": canRollAgain ? playerUid : nextTurnUid,
    "monopolyState.hasRolledThisTurn": false,
    "monopolyState.pendingTileAction": null,
    "monopolyState.lastActionLog": canRollAgain
      ? `🎲 Rolled doubles! ${match.players[playerUid]?.handle || "Player"} rolls again.`
      : `Turn passed to ${match.players[nextTurnUid]?.handle || "Next Player"}.`,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(matchRef, updates);
}
