"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dices,
  Trophy,
  Users,
  UserPlus,
  Sparkles,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Bot,
  Crown,
  Flame,
  Swords,
  X,
  Megaphone,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  Timer,
} from "lucide-react";
import { spacesSfx, playGameVictory } from "@/lib/spacesSfx";
import { addCash } from "@/lib/spacesEconomy";

export type LudoColor = "red" | "green" | "yellow" | "blue";

export interface LudoSeatedPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  color: LudoColor;
  position: "bottom" | "left" | "across" | "right";
}

interface RealisticLudoBoardProps {
  localUserName: string;
  localUserAvatar?: string;
  onlineParticipants: Array<{ uid: string; displayName: string; photoURL?: string }>;
  onBroadcastSpeech?: (text: string) => void;
  spaceTitle?: string;
}

// ── Default Google Profile Photo fallback ──
const DEFAULT_USER_AVATAR =
  "https://lh3.googleusercontent.com/a/ACg8ocI9CuM-gte5RecV6-v4RweauDQ7GKs9ZvyqxBP0eAtPA7jKZbMjtw=s96-c";

// ── Render Player Avatar (Handles Google Photos, URLs, and Emojis) ──
export function renderLudoAvatar(
  avatar?: string,
  fallback: string = "👑",
  sizeClass: string = "w-8 h-8",
  borderClass: string = "border-white/40"
) {
  const src = avatar || fallback;
  if (
    src &&
    (src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/") ||
      src.startsWith("data:"))
  ) {
    return (
      <img
        src={src}
        alt="Player Avatar"
        className={`${sizeClass} rounded-full object-cover border-2 ${borderClass} shadow-md shrink-0`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-neutral-800 border-2 ${borderClass} flex items-center justify-center shadow-md shrink-0 text-sm select-none font-bold`}
    >
      <span>{src || fallback}</span>
    </div>
  );
}

// ── 52 Canonical Perimeter Track Coordinates [row, col] on 15x15 Grid ──
export const LUDO_TRACK_COORDS: [number, number][] = [
  [13, 6], // 0: Red Start (⭐)
  [12, 6], // 1
  [11, 6], // 2
  [10, 6], // 3
  [9, 6],  // 4
  [8, 5],  // 5
  [8, 4],  // 6
  [8, 3],  // 7
  [8, 2],  // 8: Safe Star (⭐)
  [8, 1],  // 9
  [8, 0],  // 10
  [7, 0],  // 11
  [6, 0],  // 12
  [6, 1],  // 13: Green Start (⭐)
  [6, 2],  // 14
  [6, 3],  // 15
  [6, 4],  // 16
  [6, 5],  // 17
  [5, 6],  // 18
  [4, 6],  // 19
  [3, 6],  // 20
  [2, 6],  // 21: Safe Star (⭐)
  [1, 6],  // 22
  [0, 6],  // 23
  [0, 7],  // 24
  [0, 8],  // 25
  [1, 8],  // 26: Yellow Start (⭐)
  [2, 8],  // 27
  [3, 8],  // 28
  [4, 8],  // 29
  [5, 8],  // 30
  [6, 9],  // 31
  [6, 10], // 32
  [6, 11], // 33
  [6, 12], // 34: Safe Star (⭐)
  [6, 13], // 35
  [6, 14], // 36
  [7, 14], // 37
  [8, 14], // 38
  [8, 13], // 39: Blue Start (⭐)
  [8, 12], // 40
  [8, 11], // 41
  [8, 10], // 42
  [8, 9],  // 43
  [9, 8],  // 44
  [10, 8], // 45
  [11, 8], // 46
  [12, 8], // 47: Safe Star (⭐)
  [13, 8], // 48
  [14, 8], // 49
  [14, 7], // 50
  [14, 6], // 51
];

// ── 8 Safe Star Track Indices ──
export const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// ── 5 Colored Home Column Steps for each player [row, col] ──
export const LUDO_HOME_COLUMNS: Record<LudoColor, [number, number][]> = {
  red: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
  green: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  yellow: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  blue: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
};

// ── 4 Yard Token Nests for each color ──
export const LUDO_YARD_NESTS: Record<LudoColor, [number, number][]> = {
  red: [
    [10, 2],
    [10, 3],
    [12, 2],
    [12, 3],
  ],
  green: [
    [2, 2],
    [2, 3],
    [4, 2],
    [4, 3],
  ],
  yellow: [
    [2, 11],
    [2, 12],
    [4, 11],
    [4, 12],
  ],
  blue: [
    [10, 11],
    [10, 12],
    [12, 11],
    [12, 12],
  ],
};

export const COLOR_START_OFFSET: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// ── Realistic 3D Pawn Component (Classic Head, Body & Ring) ──
export function RealisticPawn({
  color,
  canMove,
  isMoving,
  onClick,
  tokenNum,
  stackCount = 1,
  size = "normal",
}: {
  color: LudoColor;
  canMove: boolean;
  isMoving?: boolean;
  onClick?: () => void;
  tokenNum?: number;
  stackCount?: number;
  size?: "small" | "normal" | "large";
}) {
  const colorStyles = {
    red: {
      head: "bg-gradient-to-tr from-rose-700 via-rose-500 to-rose-300 border-rose-200",
      body: "bg-gradient-to-b from-rose-600 to-red-950 border-rose-400",
      glow: "shadow-[0_0_14px_rgba(244,63,94,0.9)] ring-2 ring-white ring-offset-1 ring-offset-rose-600",
    },
    green: {
      head: "bg-gradient-to-tr from-emerald-700 via-emerald-500 to-emerald-300 border-emerald-200",
      body: "bg-gradient-to-b from-emerald-600 to-emerald-950 border-emerald-400",
      glow: "shadow-[0_0_14px_rgba(16,185,129,0.9)] ring-2 ring-white ring-offset-1 ring-offset-emerald-600",
    },
    yellow: {
      head: "bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border-yellow-100",
      body: "bg-gradient-to-b from-amber-500 to-yellow-900 border-amber-300",
      glow: "shadow-[0_0_14px_rgba(245,158,11,0.9)] ring-2 ring-white ring-offset-1 ring-offset-amber-500",
    },
    blue: {
      head: "bg-gradient-to-tr from-sky-700 via-sky-500 to-sky-300 border-sky-200",
      body: "bg-gradient-to-b from-sky-600 to-blue-950 border-sky-400",
      glow: "shadow-[0_0_14px_rgba(14,165,233,0.9)] ring-2 ring-white ring-offset-1 ring-offset-sky-600",
    },
  }[color];

  const headSize = size === "large" ? "w-5 h-5" : size === "small" ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4";
  const bodySize = size === "large" ? "w-6 h-3" : size === "small" ? "w-3.5 h-2" : "w-4 h-2 sm:w-5 sm:h-2.5";

  return (
    <button
      type="button"
      disabled={!canMove}
      onClick={onClick}
      className={`relative group flex flex-col items-center justify-center transition-transform select-none cursor-pointer ${
        canMove ? "animate-bounce z-30 scale-110" : "z-10"
      } ${isMoving ? "scale-130 -translate-y-3 shadow-2xl transition-all duration-100" : ""}`}
    >
      {/* Spherical Pawn Head with Radial Specular Highlight */}
      <div
        className={`${headSize} rounded-full border shadow-md relative z-10 flex items-center justify-center ${colorStyles.head} ${
          canMove ? colorStyles.glow : ""
        }`}
      >
        <div className="w-1 h-1 rounded-full bg-white/90 absolute top-0.5 left-0.5" />
      </div>

      {/* Flared Pawn Body with Waist Collar */}
      <div
        className={`${bodySize} -mt-1 rounded-b-full border-b border-x shadow-md flex items-center justify-center ${colorStyles.body}`}
      >
        {tokenNum !== undefined && (
          <span className="text-[7px] font-black text-white/90 drop-shadow-xs font-mono">
            {tokenNum}
          </span>
        )}
      </div>

      {/* Ground Contact Shadow */}
      <div className="w-3.5 h-1 sm:w-4.5 sm:h-1 bg-black/60 rounded-full blur-[1px] -mt-0.5" />

      {/* Multiple Stack Counter Badge */}
      {stackCount > 1 && (
        <span className="absolute -top-1.5 -right-1.5 bg-neutral-900 border border-white text-white text-[8px] font-black font-mono px-1 rounded-full shadow-lg z-40">
          ×{stackCount}
        </span>
      )}
    </button>
  );
}

// ── Realistic 3D Dice Component with Pips ──
export function Realistic3DDice({
  value,
  isRolling,
  onClick,
  canRoll,
  playerColor,
}: {
  value: number;
  isRolling: boolean;
  onClick: () => void;
  canRoll: boolean;
  playerColor: LudoColor;
}) {
  const pipPatterns: Record<number, boolean[]> = {
    1: [false, false, false, false, true, false, false, false, false],
    2: [true, false, false, false, false, false, false, false, true],
    3: [true, false, false, false, true, false, false, false, true],
    4: [true, false, true, false, false, false, true, false, true],
    5: [true, false, true, false, true, false, true, false, true],
    6: [true, false, true, true, false, true, true, false, true],
  };

  const currentPips = pipPatterns[value] || pipPatterns[6];

  const colorRing = {
    red: "border-rose-500 shadow-rose-500/50 ring-rose-500",
    green: "border-emerald-500 shadow-emerald-500/50 ring-emerald-500",
    yellow: "border-amber-400 shadow-amber-400/50 ring-amber-400",
    blue: "border-sky-500 shadow-sky-500/50 ring-sky-500",
  }[playerColor];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canRoll || isRolling}
      className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-white via-neutral-100 to-neutral-200 border-2 ${colorRing} shadow-xl flex items-center justify-center p-2.5 transition-all select-none cursor-pointer ${
        canRoll && !isRolling
          ? "hover:scale-110 active:scale-95 animate-bounce shadow-2xl ring-4 ring-offset-2 ring-offset-black"
          : "opacity-90"
      } ${isRolling ? "animate-spin scale-110" : ""}`}
      style={{
        boxShadow: canRoll
          ? "0 12px 28px -4px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255,255,255,0.9)"
          : "0 6px 12px -2px rgba(0,0,0,0.4)",
      }}
      title={canRoll ? "Click to Roll Dice!" : `Rolled ${value}`}
    >
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center pointer-events-none">
        {currentPips.map((hasPip, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform ${
              hasPip
                ? value === 1
                  ? "bg-rose-600 shadow-sm scale-115"
                  : "bg-neutral-900 shadow-xs"
                : "opacity-0"
            }`}
          />
        ))}
      </div>
      {canRoll && !isRolling && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-amber-300 font-mono tracking-wider whitespace-nowrap bg-black/90 px-2 py-0.5 rounded-full border border-amber-500/40">
          ROLL!
        </span>
      )}
    </button>
  );
}

export function RealisticLudoBoard({
  localUserName,
  localUserAvatar,
  onlineParticipants = [],
  onBroadcastSpeech,
  spaceTitle = "Echo Table Lounge",
}: RealisticLudoBoardProps) {
  // Use supplied user avatar URL or fallback to user's Google photo
  const effectiveLocalAvatar =
    localUserAvatar && localUserAvatar !== "👑" ? localUserAvatar : DEFAULT_USER_AVATAR;

  // ── 4 Seated Players State ──
  const [seatedPlayers, setSeatedPlayers] = useState<LudoSeatedPlayer[]>([
    {
      id: "local",
      name: localUserName,
      avatar: effectiveLocalAvatar,
      isBot: false,
      color: "red",
      position: "bottom",
    },
    {
      id: "bot_green",
      name: "Aarav Bot",
      avatar: "😎",
      isBot: true,
      color: "green",
      position: "left",
    },
    {
      id: "bot_yellow",
      name: "Simran Bot",
      avatar: "🌸",
      isBot: true,
      color: "yellow",
      position: "across",
    },
    {
      id: "bot_blue",
      name: "Kabir Bot",
      avatar: "⚡",
      isBot: true,
      color: "blue",
      position: "right",
    },
  ]);

  // Sync real participants if they join the space
  useEffect(() => {
    const others = onlineParticipants.filter((p) => p.displayName !== localUserName);
    setSeatedPlayers((prev) => [
      { ...prev[0], name: localUserName, avatar: effectiveLocalAvatar },
      {
        id: others[0]?.uid || prev[1].id,
        name: others[0]?.displayName || prev[1].name,
        avatar: others[0]?.photoURL || prev[1].avatar,
        isBot: !others[0],
        color: "green",
        position: "left",
      },
      {
        id: others[1]?.uid || prev[2].id,
        name: others[1]?.displayName || prev[2].name,
        avatar: others[1]?.photoURL || prev[2].avatar,
        isBot: !others[1],
        color: "yellow",
        position: "across",
      },
      {
        id: others[2]?.uid || prev[3].id,
        name: others[2]?.displayName || prev[3].name,
        avatar: others[2]?.photoURL || prev[3].avatar,
        isBot: !others[2],
        color: "blue",
        position: "right",
      },
    ]);
  }, [localUserName, effectiveLocalAvatar, onlineParticipants]);

  // ── Ludo Game State ──
  // 4 tokens per player. 0 = Yard, 1..51 = Perimeter, 52..56 = Home column, 57 = HOME!
  const [tokens, setTokens] = useState<number[][]>([
    [0, 0, 0, 0], // Player 0 (Red - You)
    [0, 0, 0, 0], // Player 1 (Green)
    [0, 0, 0, 0], // Player 2 (Yellow)
    [0, 0, 0, 0], // Player 3 (Blue)
  ]);

  const [currentTurn, setCurrentTurn] = useState<number>(0); // 0: Red, 1: Green, 2: Yellow, 3: Blue
  const [diceValue, setDiceValue] = useState<number>(6);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [logMessage, setLogMessage] = useState<string>(
    "🎲 Welcome to Classic 3D Ludo! Roll a 6 to bring your red token out of the yard."
  );
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [winnerCelebration, setWinnerCelebration] = useState<string | null>(null);
  const [extraTurnPending, setExtraTurnPending] = useState<boolean>(false);

  // ── Turn Timer & Move Animation States ──
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(15);
  const [isMovingPawn, setIsMovingPawn] = useState<{
    playerIdx: number;
    tokenIdx: number;
  } | null>(null);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const colorsOrder: LudoColor[] = ["red", "green", "yellow", "blue"];
  const botTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── 15s Turn Timer Countdown ──
  useEffect(() => {
    if (winnerCelebration) return;
    setTurnSecondsLeft(15);

    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    turnTimerRef.current = setInterval(() => {
      setTurnSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time expired! Auto-play or pass
          handleTurnTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [currentTurn, winnerCelebration]);

  const handleTurnTimeout = () => {
    if (isMovingPawn) return;
    const curPlayer = seatedPlayers[currentTurn];
    if (!hasRolled) {
      if (curPlayer.isBot) {
        executeBotRoll();
      } else {
        handlePlayerRollDice();
      }
    } else {
      // Auto move first valid token if player took too long
      const curTokens = tokens[currentTurn];
      const valid = curTokens.findIndex(
        (s) => (s === 0 && diceValue === 6) || (s > 0 && s + diceValue <= 57)
      );
      if (valid !== -1) {
        moveToken(currentTurn, valid, diceValue);
      } else {
        advanceTurn(false);
      }
    }
  };

  // ── Bot Automatic Play Engine ──
  useEffect(() => {
    const curPlayer = seatedPlayers[currentTurn];
    if (curPlayer && curPlayer.isBot && !winnerCelebration && !isMovingPawn) {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);

      botTurnTimeoutRef.current = setTimeout(() => {
        if (!hasRolled) {
          executeBotRoll();
        }
      }, 800);
    }
    return () => {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
    };
  }, [currentTurn, hasRolled, winnerCelebration, seatedPlayers, isMovingPawn]);

  const executeBotRoll = () => {
    setIsRolling(true);
    spacesSfx.playDiceRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      setHasRolled(true);

      const botTokens = tokens[currentTurn];
      const validIndices: number[] = [];

      botTokens.forEach((step, idx) => {
        if (step === 0 && roll === 6) {
          validIndices.push(idx);
        } else if (step > 0 && step + roll <= 57) {
          validIndices.push(idx);
        }
      });

      if (validIndices.length === 0) {
        setLogMessage(`🤖 @${seatedPlayers[currentTurn].name} rolled a ${roll}. No moves! Passing turn.`);
        setTimeout(() => {
          advanceTurn(false);
        }, 1100);
      } else {
        // Smart Bot Logic:
        // 1. Prefer token that captures an opponent
        let chosenIdx = validIndices[0];
        let foundCapture = false;

        for (const idx of validIndices) {
          const nextStep = botTokens[idx] === 0 ? 1 : botTokens[idx] + roll;
          if (nextStep <= 51) {
            const nextTrack = (COLOR_START_OFFSET[colorsOrder[currentTurn]] + nextStep - 1) % 52;
            if (!SAFE_TRACK_INDICES.includes(nextTrack)) {
              colorsOrder.forEach((oColor, oIdx) => {
                if (oIdx !== currentTurn) {
                  tokens[oIdx].forEach((oStep) => {
                    if (oStep >= 1 && oStep <= 51) {
                      const oTrack = (COLOR_START_OFFSET[oColor] + oStep - 1) % 52;
                      if (oTrack === nextTrack) {
                        chosenIdx = idx;
                        foundCapture = true;
                      }
                    }
                  });
                }
              });
            }
          }
        }

        // 2. If no capture and rolled 6, deploy from yard
        if (!foundCapture && roll === 6) {
          const yardPiece = validIndices.find((idx) => botTokens[idx] === 0);
          if (yardPiece !== undefined) chosenIdx = yardPiece;
        }

        setTimeout(() => {
          moveToken(currentTurn, chosenIdx, roll);
        }, 700);
      }
    }, 700);
  };

  // ── Player Dice Roll ──
  const handlePlayerRollDice = () => {
    if (isRolling || hasRolled || seatedPlayers[currentTurn].isBot || isMovingPawn) return;

    setIsRolling(true);
    spacesSfx.playDiceRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      setHasRolled(true);

      const curTokens = tokens[currentTurn];
      const canAnyMove = curTokens.some((step) => {
        if (step === 0) return roll === 6;
        return step + roll <= 57;
      });

      if (!canAnyMove) {
        setLogMessage(`🎲 You rolled a ${roll}. No valid moves available! Passing turn.`);
        setTimeout(() => {
          advanceTurn(false);
        }, 1200);
      } else {
        setLogMessage(
          `🎲 Rolled a ${roll}! ${
            roll === 6 ? "Choose a token to deploy or advance!" : "Select a token on the board to move."
          }`
        );
      }
    }, 600);
  };

  // ── Move Token with Step-by-Step Hopping Animation ──
  const moveToken = (playerIdx: number, tokenIdx: number, roll: number) => {
    if (isMovingPawn) return;
    const curTokens = [...tokens[playerIdx]];
    const curStep = curTokens[tokenIdx];
    const playerColor = colorsOrder[playerIdx];

    // Case 1: Deploy from yard on roll 6
    if (curStep === 0) {
      if (roll === 6) {
        curTokens[tokenIdx] = 1;
        const nextAll = [...tokens];
        nextAll[playerIdx] = curTokens;
        setTokens(nextAll);
        spacesSfx.playSitPop();
        setLogMessage(`🚀 @${seatedPlayers[playerIdx].name} deployed a token onto the track!`);
        finalizeMove(playerIdx, tokenIdx, 1, roll);
      }
      return;
    }

    // Case 2: Step-by-step track hopping
    const targetStep = curStep + roll;
    if (targetStep > 57) return;

    setIsMovingPawn({ playerIdx, tokenIdx });
    let stepCounter = curStep;

    const hopInterval = setInterval(() => {
      stepCounter++;
      setTokens((prev) => {
        const nextState = prev.map((arr) => [...arr]);
        nextState[playerIdx][tokenIdx] = stepCounter;
        return nextState;
      });

      // Sound on each hop
      spacesSfx.playKeyNote(stepCounter % 7);

      if (stepCounter >= targetStep) {
        clearInterval(hopInterval);
        setIsMovingPawn(null);
        finalizeMove(playerIdx, tokenIdx, targetStep, roll);
      }
    }, 120);
  };

  // ── Finalize Move (Capture, Home Check & Extra Roll) ──
  const finalizeMove = (
    playerIdx: number,
    tokenIdx: number,
    finalStep: number,
    roll: number
  ) => {
    const playerColor = colorsOrder[playerIdx];
    let didCapture = false;
    let reachedHome = finalStep === 57;

    if (reachedHome) {
      spacesSfx.playPartyFanfare();
      setLogMessage(`🏆 @${seatedPlayers[playerIdx].name}'s token REACHED HOME!`);
    } else if (finalStep <= 51) {
      // Check capture on non-safe track cell
      const trackPos = (COLOR_START_OFFSET[playerColor] + finalStep - 1) % 52;
      if (!SAFE_TRACK_INDICES.includes(trackPos)) {
        setTokens((prev) => {
          return prev.map((arr, oIdx) => {
            if (oIdx === playerIdx) return arr;
            return arr.map((oppStep) => {
              if (oppStep >= 1 && oppStep <= 51) {
                const oppTrack = (COLOR_START_OFFSET[colorsOrder[oIdx]] + oppStep - 1) % 52;
                if (oppTrack === trackPos) {
                  didCapture = true;
                  spacesSfx.playGavelStrike();
                  const capturedMsg = `💥 BOOM! @${seatedPlayers[playerIdx].name} captured @${seatedPlayers[oIdx].name}'s token! Returned to yard!`;
                  setCaptureToast(capturedMsg);
                  setTimeout(() => setCaptureToast(null), 3500);
                  return 0; // Return to yard!
                }
              }
              return oppStep;
            });
          });
        });
      }
    }

    // Check Victory (First player to get 2 tokens home wins rapid match)
    setTimeout(() => {
      setTokens((curTokensState) => {
        const homeCount = curTokensState[playerIdx].filter((s) => s === 57).length;
        if (homeCount >= 2) {
          playGameVictory();
          const winText = `🎉👑 MATCH WINNER: @${seatedPlayers[playerIdx].name} (${playerColor.toUpperCase()}) WON THE LUDO MATCH!`;
          setWinnerCelebration(winText);
          onBroadcastSpeech?.(winText);
          if (playerIdx === 0) {
            addCash(50, "Ludo Table Victory");
          }
          return curTokensState;
        }

        // Extra roll condition: Rolling 6, capturing an opponent, or reaching Home!
        const getsExtraRoll = roll === 6 || didCapture || reachedHome;
        if (getsExtraRoll) {
          setExtraTurnPending(true);
          setHasRolled(false);
          setLogMessage(
            `✨ BONUS ROLL for @${seatedPlayers[playerIdx].name}! (${
              roll === 6 ? "Rolled a 6" : didCapture ? "Captured Token" : "Reached Home"
            })`
          );
        } else {
          advanceTurn(false);
        }

        return curTokensState;
      });
    }, 150);
  };

  const advanceTurn = (extra: boolean) => {
    setHasRolled(false);
    setExtraTurnPending(false);
    if (!extra) {
      setCurrentTurn((prev) => (prev + 1) % 4);
    }
  };

  const handleResetGame = () => {
    setTokens([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    setCurrentTurn(0);
    setHasRolled(false);
    setWinnerCelebration(null);
    setLogMessage("🎲 Fresh Ludo match started! Red team rolls first.");
  };

  // ── Seat Real Friend Handlers ──
  const handleSeatFriend = (
    seatIndex: number,
    participant: { uid: string; displayName: string; photoURL?: string }
  ) => {
    setSeatedPlayers((prev) => {
      const copy = [...prev];
      copy[seatIndex] = {
        ...copy[seatIndex],
        id: participant.uid,
        name: participant.displayName,
        avatar: participant.photoURL || "👑",
        isBot: false,
      };
      return copy;
    });
    setInviteModalOpen(false);
    setSelectedSeatIndex(null);
    spacesSfx.playSitPop();
    setLogMessage(`🪑 Seated @${participant.displayName} at ${colorsOrder[seatIndex].toUpperCase()} chair!`);
  };

  const handleSeatBot = (seatIndex: number) => {
    const botNames = ["Aarav Bot", "Simran Bot", "Kabir Bot"];
    const botAvatars = ["😎", "🌸", "⚡"];
    setSeatedPlayers((prev) => {
      const copy = [...prev];
      copy[seatIndex] = {
        ...copy[seatIndex],
        id: `bot_${colorsOrder[seatIndex]}`,
        name: botNames[seatIndex - 1] || "AI Player",
        avatar: botAvatars[seatIndex - 1] || "🤖",
        isBot: true,
      };
      return copy;
    });
    setInviteModalOpen(false);
    setSelectedSeatIndex(null);
  };

  const handleCopyTableLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}?tab=ludo`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const handleCallRoomToTable = () => {
    const announce = `🎲 @${localUserName} is inviting everyone to join the Ludo Table in ${spaceTitle}! Click Table Games to seat.`;
    onBroadcastSpeech?.(announce);
    spacesSfx.playPartyFanfare();
    setLogMessage("📣 Megaphone invitation broadcasted across the space!");
  };

  // ── Helper to retrieve tokens occupying a given cell [r, c] ──
  const getTokensAtCell = (row: number, col: number) => {
    const occupants: Array<{ playerIdx: number; tokenIdx: number; color: LudoColor }> = [];

    tokens.forEach((pTokens, pIdx) => {
      const pColor = colorsOrder[pIdx];
      pTokens.forEach((step, tIdx) => {
        if (step >= 1 && step <= 51) {
          const trackIdx = (COLOR_START_OFFSET[pColor] + step - 1) % 52;
          const [tRow, tCol] = LUDO_TRACK_COORDS[trackIdx];
          if (tRow === row && tCol === col) {
            occupants.push({ playerIdx: pIdx, tokenIdx: tIdx, color: pColor });
          }
        } else if (step >= 52 && step <= 56) {
          const homeStep = step - 52;
          const [hRow, hCol] = LUDO_HOME_COLUMNS[pColor][homeStep];
          if (hRow === row && hCol === col) {
            occupants.push({ playerIdx: pIdx, tokenIdx: tIdx, color: pColor });
          }
        }
      });
    });

    return occupants;
  };

  const activePlayer = seatedPlayers[currentTurn];
  const isMyTurn = currentTurn === 0;
  const canRollDice = isMyTurn && !hasRolled && !isRolling && !isMovingPawn;

  return (
    <div className="space-y-4 select-none">
      {/* ── TOP HEADER / GAME STATUS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-900/90 p-3 rounded-2xl border border-neutral-800 gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            {renderLudoAvatar(
              activePlayer.avatar,
              "👑",
              "w-10 h-10 text-lg",
              `border-${activePlayer.color === "red" ? "rose" : activePlayer.color === "green" ? "emerald" : activePlayer.color === "yellow" ? "amber" : "sky"}-400`
            )}
            <span className="absolute -bottom-1 -right-1 text-xs">
              {activePlayer.color === "red" ? "🔴" : activePlayer.color === "green" ? "🟢" : activePlayer.color === "yellow" ? "🟡" : "🔵"}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-white">
                Turn: @{activePlayer.name}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                  activePlayer.color === "red"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : activePlayer.color === "green"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : activePlayer.color === "yellow"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                {activePlayer.color}
              </span>
              {extraTurnPending && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                  Bonus Roll!
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-300 mt-0.5 max-w-sm truncate">
              {logMessage}
            </div>
          </div>
        </div>

        {/* Action Controls & Turn Timer */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Turn Countdown Progress Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold transition-all ${
              turnSecondsLeft <= 4
                ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                : turnSecondsLeft <= 8
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "bg-neutral-800 border-neutral-700 text-emerald-400"
            }`}
            title="Turn time remaining"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{turnSecondsLeft}s</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedSeatIndex(null);
              setInviteModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer"
            title="Invite or seat friends at this table"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Invite Friends</span>
          </button>

          <button
            type="button"
            onClick={handleCallRoomToTable}
            className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-mono transition cursor-pointer flex items-center gap-1"
            title="Broadcast announcement to the whole Echo Space"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Call Room</span>
          </button>

          <button
            type="button"
            onClick={handleResetGame}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition cursor-pointer"
            title="Reset board match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CAPTURE NOTIFICATION BANNER ── */}
      {captureToast && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-rose-500 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-bold animate-bounce font-mono">
          <span>{captureToast}</span>
          <span className="text-base">💥</span>
        </div>
      )}

      {/* ── WINNER CELEBRATION MODAL ── */}
      {winnerCelebration && (
        <div className="bg-gradient-to-br from-amber-900/90 via-black to-neutral-950 border-2 border-amber-400 p-4 rounded-3xl shadow-2xl text-center space-y-3 animate-in zoom-in-95">
          <Crown className="w-12 h-12 text-amber-300 mx-auto animate-bounce drop-shadow" />
          <h3 className="text-sm sm:text-base font-black text-amber-200 uppercase font-mono tracking-wider">
            {winnerCelebration}
          </h3>
          <p className="text-xs text-neutral-300">
            Winner awarded 50 Aura Cash! 🏆 Great match!
          </p>
          <button
            type="button"
            onClick={handleResetGame}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition cursor-pointer"
          >
            Play Rematch
          </button>
        </div>
      )}

      {/* ── SEATED TABLE VIEW WITH 15x15 LUDO BOARD ── */}
      <div className="relative max-w-xl mx-auto bg-gradient-to-b from-amber-950/20 via-neutral-950 to-neutral-950 border-[5px] border-amber-950/70 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col items-center justify-between gap-3">
        {/* TOP SEAT (Yellow - Across) */}
        <div className="flex items-center justify-center gap-3 w-full">
          <div
            className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
              currentTurn === 2
                ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md scale-105 ring-2 ring-amber-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            {renderLudoAvatar(seatedPlayers[2].avatar, "🌸", "w-7 h-7", "border-amber-400")}
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>{seatedPlayers[2].name}</span>
                {seatedPlayers[2].isBot && <Bot className="w-3 h-3 text-neutral-500" />}
              </div>
              <div className="text-[9px] font-mono text-amber-400">
                Yellow Team • {currentTurn === 2 ? "Thinking..." : "Waiting"}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedSeatIndex(2);
                setInviteModalOpen(true);
              }}
              className="text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700 cursor-pointer ml-1"
              title="Seat a real friend here"
            >
              Seat Friend
            </button>
          </div>
        </div>

        {/* MIDDLE ROW: Left Seat, Central 15x15 Canvas, Right Seat */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* LEFT SEAT (Green - Left) */}
          <div
            className={`px-2.5 py-2 rounded-2xl border flex flex-col items-center gap-1 text-center transition-all shrink-0 ${
              currentTurn === 1
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md scale-105 ring-2 ring-emerald-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            {renderLudoAvatar(seatedPlayers[1].avatar, "😎", "w-8 h-8", "border-emerald-400")}
            <div className="text-xs font-bold text-white max-w-[80px] truncate">
              {seatedPlayers[1].name}
            </div>
            <span className="text-[9px] font-mono text-emerald-400">Green</span>
            <button
              onClick={() => {
                setSelectedSeatIndex(1);
                setInviteModalOpen(true);
              }}
              className="text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700 cursor-pointer"
            >
              Seat
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* 15x15 AUTHENTIC LUDO BOARD GRID */}
          {/* ═══════════════════════════════════════════════════ */}
          <div
            className="relative w-[305px] h-[305px] sm:w-[385px] sm:h-[385px] bg-neutral-950 border-4 border-amber-950 rounded-2xl p-1 shadow-2xl overflow-hidden select-none"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
              gridTemplateRows: "repeat(15, minmax(0, 1fr))",
            }}
          >
            {/* 1. TOP-LEFT GREEN YARD (6x6 cells: rows 0..5, cols 0..5) */}
            <div
              className="relative bg-emerald-700 rounded-xl border-2 border-emerald-400 p-1.5 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "1 / 7", gridRow: "1 / 7" }}
            >
              <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-white font-mono">
                <span>GREEN YARD</span>
                <span className="text-xs">🟢</span>
              </div>
              {/* Inner White Nest with Player Avatar Crest */}
              <div className="relative w-full h-full bg-white rounded-lg border-2 border-emerald-600 p-1 grid grid-cols-2 grid-rows-2 gap-1 items-center justify-items-center shadow-md">
                {/* Yard Owner Emblem */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  {renderLudoAvatar(seatedPlayers[1].avatar, "🟢", "w-10 h-10")}
                </div>

                {LUDO_YARD_NESTS.green.map((_, idx) => {
                  const hasToken = tokens[1][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center shadow-inner relative z-10"
                    >
                      {hasToken && (
                        <RealisticPawn
                          color="green"
                          canMove={false}
                          tokenNum={idx + 1}
                          size="small"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. TOP-RIGHT YELLOW YARD (6x6 cells: rows 0..5, cols 10..15) */}
            <div
              className="relative bg-amber-500 rounded-xl border-2 border-amber-300 p-1.5 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "10 / 16", gridRow: "1 / 7" }}
            >
              <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-neutral-950 font-mono">
                <span>YELLOW YARD</span>
                <span className="text-xs">🟡</span>
              </div>
              <div className="relative w-full h-full bg-white rounded-lg border-2 border-amber-500 p-1 grid grid-cols-2 grid-rows-2 gap-1 items-center justify-items-center shadow-md">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  {renderLudoAvatar(seatedPlayers[2].avatar, "🟡", "w-10 h-10")}
                </div>

                {LUDO_YARD_NESTS.yellow.map((_, idx) => {
                  const hasToken = tokens[2][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-inner relative z-10"
                    >
                      {hasToken && (
                        <RealisticPawn
                          color="yellow"
                          canMove={false}
                          tokenNum={idx + 1}
                          size="small"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. BOTTOM-LEFT RED YARD (6x6 cells: rows 10..15, cols 1..6) */}
            <div
              className="relative bg-rose-600 rounded-xl border-2 border-rose-400 p-1.5 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "1 / 7", gridRow: "10 / 16" }}
            >
              <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-white font-mono">
                <span>RED YARD (YOU)</span>
                <span className="text-xs">🔴</span>
              </div>
              <div className="relative w-full h-full bg-white rounded-lg border-2 border-rose-500 p-1 grid grid-cols-2 grid-rows-2 gap-1 items-center justify-items-center shadow-md">
                {/* Owner Photo in Center Nest */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                  {renderLudoAvatar(seatedPlayers[0].avatar, "🔴", "w-10 h-10")}
                </div>

                {LUDO_YARD_NESTS.red.map((_, idx) => {
                  const hasToken = tokens[0][idx] === 0;
                  const canDeploy =
                    hasToken && isMyTurn && hasRolled && diceValue === 6 && !isMovingPawn;
                  return (
                    <div
                      key={idx}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center shadow-inner relative z-10"
                    >
                      {hasToken && (
                        <RealisticPawn
                          color="red"
                          canMove={canDeploy}
                          tokenNum={idx + 1}
                          size="small"
                          onClick={() => moveToken(0, idx, diceValue)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. BOTTOM-RIGHT BLUE YARD (6x6 cells: rows 10..15, cols 10..15) */}
            <div
              className="relative bg-sky-600 rounded-xl border-2 border-sky-400 p-1.5 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "10 / 16", gridRow: "10 / 16" }}
            >
              <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-white font-mono">
                <span>BLUE YARD</span>
                <span className="text-xs">🔵</span>
              </div>
              <div className="relative w-full h-full bg-white rounded-lg border-2 border-sky-500 p-1 grid grid-cols-2 grid-rows-2 gap-1 items-center justify-items-center shadow-md">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  {renderLudoAvatar(seatedPlayers[3].avatar, "🔵", "w-10 h-10")}
                </div>

                {LUDO_YARD_NESTS.blue.map((_, idx) => {
                  const hasToken = tokens[3][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-sky-100 border-2 border-sky-400 flex items-center justify-center shadow-inner relative z-10"
                    >
                      {hasToken && (
                        <RealisticPawn
                          color="blue"
                          canMove={false}
                          tokenNum={idx + 1}
                          size="small"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. CENTER HOME TRIANGLE (3x3 cells: rows 7..9, cols 7..9) */}
            <div
              className="relative bg-neutral-950 border-2 border-white/50 flex items-center justify-center shadow-2xl overflow-hidden"
              style={{ gridColumn: "7 / 10", gridRow: "7 / 10" }}
            >
              {/* 4 Converging Triangles */}
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 50% 50%)",
                  backgroundColor: "#f59e0b", // Yellow Top
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(0% 0%, 0% 100%, 50% 50%)",
                  backgroundColor: "#059669", // Green Left
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(100% 0%, 100% 100%, 50% 50%)",
                  backgroundColor: "#0284c7", // Blue Right
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(0% 100%, 100% 100%, 50% 50%)",
                  backgroundColor: "#e11d48", // Red Bottom
                }}
              />

              {/* Central Trophy Crest */}
              <div className="relative z-10 w-7 h-7 rounded-full bg-neutral-950/90 border border-amber-300 flex items-center justify-center shadow-lg">
                <Trophy className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* 6. INDIVIDUAL CIRCUIT & HOME CELLS (15x15 Grid) */}
            {Array.from({ length: 15 }).map((_, r) =>
              Array.from({ length: 15 }).map((_, c) => {
                const isGreenYard = r < 6 && c < 6;
                const isYellowYard = r < 6 && c > 8;
                const isRedYard = r > 8 && c < 6;
                const isBlueYard = r > 8 && c > 8;
                const isCenterHome = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                if (isGreenYard || isYellowYard || isRedYard || isBlueYard || isCenterHome) {
                  return null;
                }

                // Identify cell characteristics
                const isRedHomeCol = c === 7 && r >= 9 && r <= 13;
                const isGreenHomeCol = r === 7 && c >= 1 && c <= 5;
                const isYellowHomeCol = c === 7 && r >= 1 && r <= 5;
                const isBlueHomeCol = r === 7 && c >= 9 && c <= 13;

                const isRedStart = r === 13 && c === 6;
                const isGreenStart = r === 6 && c === 1;
                const isYellowStart = r === 1 && c === 8;
                const isBlueStart = r === 8 && c === 13;

                const isSafeStar =
                  isRedStart ||
                  isGreenStart ||
                  isYellowStart ||
                  isBlueStart ||
                  (r === 8 && c === 2) ||
                  (r === 2 && c === 6) ||
                  (r === 6 && c === 12) ||
                  (r === 12 && c === 8);

                // Directional entrance arrows into home
                const isRedHomeArrow = r === 14 && c === 7;
                const isGreenHomeArrow = r === 7 && c === 0;
                const isYellowHomeArrow = r === 0 && c === 7;
                const isBlueHomeArrow = r === 7 && c === 14;

                let cellBg = "bg-neutral-100";
                if (isRedHomeCol || isRedStart) cellBg = "bg-rose-500 text-white";
                else if (isGreenHomeCol || isGreenStart) cellBg = "bg-emerald-500 text-white";
                else if (isYellowHomeCol || isYellowStart) cellBg = "bg-amber-400 text-neutral-900";
                else if (isBlueHomeCol || isBlueStart) cellBg = "bg-sky-500 text-white";

                const occupants = getTokensAtCell(r, c);

                return (
                  <div
                    key={`${r}_${c}`}
                    className={`relative border border-neutral-400/70 flex items-center justify-center text-[8px] font-bold ${cellBg} shadow-xs`}
                    style={{
                      gridColumn: `${c + 1} / ${c + 2}`,
                      gridRow: `${r + 1} / ${r + 2}`,
                    }}
                  >
                    {/* Safe Stars */}
                    {isSafeStar && occupants.length === 0 && (
                      <span className="text-[10px] text-amber-500 font-black drop-shadow select-none">
                        ⭐
                      </span>
                    )}

                    {/* Entrance Arrows pointing to Home */}
                    {isRedHomeArrow && occupants.length === 0 && (
                      <ArrowUp className="w-2.5 h-2.5 text-rose-600 font-bold" />
                    )}
                    {isGreenHomeArrow && occupants.length === 0 && (
                      <ArrowRight className="w-2.5 h-2.5 text-emerald-600 font-bold" />
                    )}
                    {isYellowHomeArrow && occupants.length === 0 && (
                      <ArrowDown className="w-2.5 h-2.5 text-amber-600 font-bold" />
                    )}
                    {isBlueHomeArrow && occupants.length === 0 && (
                      <ArrowLeft className="w-2.5 h-2.5 text-sky-600 font-bold" />
                    )}

                    {/* Render Pawns with Real Physics & Stacking */}
                    {occupants.map((occ, idx) => {
                      const isLocalPlayerToken = occ.playerIdx === 0;
                      const canMoveThis =
                        isLocalPlayerToken &&
                        isMyTurn &&
                        hasRolled &&
                        !isMovingPawn &&
                        tokens[0][occ.tokenIdx] + diceValue <= 57;

                      const isThisMoving =
                        isMovingPawn?.playerIdx === occ.playerIdx &&
                        isMovingPawn?.tokenIdx === occ.tokenIdx;

                      return (
                        <div key={idx} className="relative">
                          <RealisticPawn
                            color={occ.color}
                            canMove={canMoveThis}
                            isMoving={isThisMoving}
                            tokenNum={occ.tokenIdx + 1}
                            stackCount={occupants.length}
                            size={occupants.length > 1 ? "small" : "normal"}
                            onClick={() => moveToken(occ.playerIdx, occ.tokenIdx, diceValue)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT SEAT (Blue - Right) */}
          <div
            className={`px-2.5 py-2 rounded-2xl border flex flex-col items-center gap-1 text-center transition-all shrink-0 ${
              currentTurn === 3
                ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-md scale-105 ring-2 ring-sky-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            {renderLudoAvatar(seatedPlayers[3].avatar, "⚡", "w-8 h-8", "border-sky-400")}
            <div className="text-xs font-bold text-white max-w-[80px] truncate">
              {seatedPlayers[3].name}
            </div>
            <span className="text-[9px] font-mono text-sky-400">Blue</span>
            <button
              onClick={() => {
                setSelectedSeatIndex(3);
                setInviteModalOpen(true);
              }}
              className="text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700 cursor-pointer"
            >
              Seat
            </button>
          </div>
        </div>

        {/* BOTTOM SEAT & 3D DICE ACTION (You / Red) */}
        <div className="flex items-center justify-between w-full max-w-md px-2 pt-1 border-t border-neutral-800 gap-3">
          {/* Your Profile Card with Verified Avatar */}
          <div
            className={`px-3 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
              isMyTurn
                ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg scale-105 ring-2 ring-rose-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            {renderLudoAvatar(seatedPlayers[0].avatar, "🔴", "w-9 h-9", "border-rose-400")}
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>{seatedPlayers[0].name} (You)</span>
                <span className="text-[10px]">👑</span>
              </div>
              <div className="text-[10px] text-rose-300 font-mono">
                Red Team • {isMyTurn ? (hasRolled ? "Select a token!" : "Your Turn!") : "Waiting"}
              </div>
            </div>
          </div>

          {/* 3D Realistic Interactive Dice & Roll Button */}
          <div className="flex items-center gap-2">
            {canRollDice && (
              <button
                type="button"
                onClick={handlePlayerRollDice}
                disabled={isRolling}
                className="hidden sm:flex px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition cursor-pointer items-center gap-1.5"
              >
                <Dices className={`w-4 h-4 ${isRolling ? "animate-spin" : ""}`} />
                <span>Roll</span>
              </button>
            )}

            <Realistic3DDice
              value={diceValue}
              isRolling={isRolling}
              onClick={handlePlayerRollDice}
              canRoll={canRollDice}
              playerColor={activePlayer.color}
            />
          </div>
        </div>
      </div>

      {/* ── INVITE FRIENDS TO TABLE MODAL ── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-950 border border-emerald-500/40 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono">
                    Invite Friends to Ludo Table
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    {selectedSeatIndex !== null
                      ? `Assign player to ${colorsOrder[selectedSeatIndex].toUpperCase()} seat`
                      : "Seat participants from the space or invite friends"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setSelectedSeatIndex(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Share Link */}
            <div className="bg-neutral-900/80 rounded-2xl p-3 border border-neutral-800 space-y-2">
              <div className="text-[11px] font-bold text-neutral-300 font-mono flex items-center justify-between">
                <span>Direct Table Link</span>
                <span className="text-emerald-400 text-[10px]">Instant Seat</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}${window.location.pathname}?tab=ludo`
                      : ""
                  }
                  className="flex-1 bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-300 font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyTableLink}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Online Space Participants Directory */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] font-bold text-neutral-400 font-mono uppercase tracking-wider">
                Online Space Members ({onlineParticipants.length})
              </div>

              {onlineParticipants.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-center text-xs text-neutral-400 font-mono">
                  No other users online in this space right now. Copy the invite link or call the room!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {onlineParticipants
                    .filter((p) => p.displayName !== localUserName)
                    .map((person) => (
                      <div
                        key={person.uid}
                        className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {renderLudoAvatar(person.photoURL, "👑", "w-7 h-7")}
                          <span className="text-xs font-bold text-white truncate">
                            {person.displayName}
                          </span>
                        </div>

                        {selectedSeatIndex !== null ? (
                          <button
                            type="button"
                            onClick={() => handleSeatFriend(selectedSeatIndex, person)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[10px] uppercase font-mono transition cursor-pointer"
                          >
                            Seat Here
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSeatFriend(1, person)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono hover:bg-emerald-500/40 cursor-pointer"
                              title="Seat Green"
                            >
                              Green
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSeatFriend(2, person)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono hover:bg-amber-500/40 cursor-pointer"
                              title="Seat Yellow"
                            >
                              Yellow
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSeatFriend(3, person)}
                              className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-mono hover:bg-sky-500/40 cursor-pointer"
                              title="Seat Blue"
                            >
                              Blue
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* AI Bot Chair Option */}
            {selectedSeatIndex !== null && (
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 font-mono">
                  Or use AI Bot for this chair:
                </span>
                <button
                  type="button"
                  onClick={() => handleSeatBot(selectedSeatIndex)}
                  className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition cursor-pointer"
                >
                  Set as AI Bot
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
