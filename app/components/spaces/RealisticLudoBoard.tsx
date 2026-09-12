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
  // 3x3 Grid pattern for authentic dice dots
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
    red: "border-rose-500 shadow-rose-500/40",
    green: "border-emerald-500 shadow-emerald-500/40",
    yellow: "border-amber-400 shadow-amber-400/40",
    blue: "border-sky-500 shadow-sky-500/40",
  }[playerColor];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canRoll || isRolling}
      className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-white via-neutral-100 to-neutral-200 border-2 ${colorRing} shadow-xl flex items-center justify-center p-2.5 transition-all select-none cursor-pointer ${
        canRoll && !isRolling
          ? "hover:scale-110 active:scale-95 animate-bounce shadow-2xl"
          : "opacity-90"
      } ${isRolling ? "animate-spin scale-110" : ""}`}
      style={{
        boxShadow: canRoll
          ? "0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255,255,255,0.8)"
          : "0 6px 12px -2px rgba(0,0,0,0.4)",
      }}
      title={canRoll ? "Click to Roll Dice!" : `Rolled ${value}`}
    >
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center">
        {currentPips.map((hasPip, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform ${
              hasPip
                ? value === 1
                  ? "bg-rose-600 shadow-sm scale-110"
                  : "bg-neutral-900 shadow-xs"
                : "opacity-0"
            }`}
          />
        ))}
      </div>
      {canRoll && !isRolling && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-amber-300 font-mono tracking-wider whitespace-nowrap bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/30">
          ROLL!
        </span>
      )}
    </button>
  );
}

export function RealisticLudoBoard({
  localUserName,
  localUserAvatar = "👑",
  onlineParticipants = [],
  onBroadcastSpeech,
  spaceTitle = "Echo Table Lounge",
}: RealisticLudoBoardProps) {
  // ── 4 Seated Players State ──
  const [seatedPlayers, setSeatedPlayers] = useState<LudoSeatedPlayer[]>([
    {
      id: "local",
      name: localUserName,
      avatar: localUserAvatar,
      isBot: false,
      color: "red",
      position: "bottom",
    },
    {
      id: "bot_green",
      name: "Aarav (Green)",
      avatar: "😎",
      isBot: true,
      color: "green",
      position: "left",
    },
    {
      id: "bot_yellow",
      name: "Simran (Yellow)",
      avatar: "🌸",
      isBot: true,
      color: "yellow",
      position: "across",
    },
    {
      id: "bot_blue",
      name: "Kabir (Blue)",
      avatar: "⚡",
      isBot: true,
      color: "blue",
      position: "right",
    },
  ]);

  // Sync real participants into seats if available
  useEffect(() => {
    const others = onlineParticipants.filter((p) => p.displayName !== localUserName);
    setSeatedPlayers((prev) => [
      { ...prev[0], name: localUserName, avatar: localUserAvatar },
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
  }, [localUserName, localUserAvatar, onlineParticipants]);

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

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const colorsOrder: LudoColor[] = ["red", "green", "yellow", "blue"];
  const botTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Bot Automatic Play Engine ──
  useEffect(() => {
    const curPlayer = seatedPlayers[currentTurn];
    if (curPlayer && curPlayer.isBot && !winnerCelebration) {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);

      botTurnTimeoutRef.current = setTimeout(() => {
        if (!hasRolled) {
          executeBotRoll();
        }
      }, 900);
    }
    return () => {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
    };
  }, [currentTurn, hasRolled, winnerCelebration, seatedPlayers]);

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
        setLogMessage(`🤖 @${seatedPlayers[currentTurn].name} rolled a ${roll}. No moves! Next turn.`);
        setTimeout(() => {
          advanceTurn(false);
        }, 1100);
      } else {
        // Smart bot decision:
        // 1. Check if any move can capture an opponent token!
        let chosenIdx = validIndices[0];
        let foundCapture = false;

        for (const idx of validIndices) {
          const nextStep = botTokens[idx] === 0 ? 1 : botTokens[idx] + roll;
          if (nextStep <= 51) {
            const nextTrack = (COLOR_START_OFFSET[colorsOrder[currentTurn]] + nextStep - 1) % 52;
            if (!SAFE_TRACK_INDICES.includes(nextTrack)) {
              // Look for opponents on this track
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

        // 2. If no capture and rolled a 6, prefer moving a piece out of yard
        if (!foundCapture && roll === 6) {
          const yardPiece = validIndices.find((idx) => botTokens[idx] === 0);
          if (yardPiece !== undefined) chosenIdx = yardPiece;
        }

        setTimeout(() => {
          moveToken(currentTurn, chosenIdx, roll);
        }, 800);
      }
    }, 700);
  };

  // ── Player Dice Roll ──
  const handlePlayerRollDice = () => {
    if (isRolling || hasRolled || seatedPlayers[currentTurn].isBot) return;

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
    }, 700);
  };

  // ── Move Token Logic (Standard Classic Ludo Rules) ──
  const moveToken = (playerIdx: number, tokenIdx: number, roll: number) => {
    const curTokens = [...tokens[playerIdx]];
    const curStep = curTokens[tokenIdx];
    const playerColor = colorsOrder[playerIdx];
    let newStep = curStep;
    let didCapture = false;
    let reachedHome = false;

    if (curStep === 0) {
      if (roll === 6) {
        newStep = 1;
        spacesSfx.playSitPop();
        setLogMessage(`🚀 @${seatedPlayers[playerIdx].name} deployed a token onto the track!`);
      } else {
        return;
      }
    } else {
      newStep = curStep + roll;
      if (newStep > 57) return;

      spacesSfx.playKeyNote(newStep % 7);

      if (newStep === 57) {
        reachedHome = true;
        spacesSfx.playPartyFanfare();
        setLogMessage(`🏆 @${seatedPlayers[playerIdx].name}'s token REACHED HOME!`);
      } else if (newStep <= 51) {
        // Track position on 52 circuit
        const trackPos = (COLOR_START_OFFSET[playerColor] + newStep - 1) % 52;

        // Check if landing on an opponent token on non-safe square
        if (!SAFE_TRACK_INDICES.includes(trackPos)) {
          const nextAllTokens = tokens.map((arr, oIdx) => {
            if (oIdx === playerIdx) return arr;
            return arr.map((oppStep) => {
              if (oppStep >= 1 && oppStep <= 51) {
                const oppTrack = (COLOR_START_OFFSET[colorsOrder[oIdx]] + oppStep - 1) % 52;
                if (oppTrack === trackPos) {
                  didCapture = true;
                  spacesSfx.playGavelStrike();
                  const capturedMsg = `💥 BOOM! @${seatedPlayers[playerIdx].name} captured @${seatedPlayers[oIdx].name}'s token! Sent back to yard!`;
                  setCaptureToast(capturedMsg);
                  setTimeout(() => setCaptureToast(null), 3500);
                  return 0; // Send back to yard!
                }
              }
              return oppStep;
            });
          });

          // Apply captured tokens
          tokens.forEach((_, idx) => {
            if (idx !== playerIdx) tokens[idx] = nextAllTokens[idx];
          });
        }
      }
    }

    curTokens[tokenIdx] = newStep;
    const updatedAllTokens = [...tokens];
    updatedAllTokens[playerIdx] = curTokens;
    setTokens(updatedAllTokens);

    // Check Victory (All 4 tokens reached home, or first to get 2 home in rapid party mode)
    const homeCount = curTokens.filter((s) => s === 57).length;
    if (homeCount >= 2) {
      playGameVictory();
      const winText = `🎉👑 MATCH WINNER: @${seatedPlayers[playerIdx].name} (${playerColor.toUpperCase()}) WON THE LUDO MATCH!`;
      setWinnerCelebration(winText);
      onBroadcastSpeech?.(winText);
      if (playerIdx === 0) {
        addCash(50, "Ludo Table Victory");
      }
      return;
    }

    // Extra roll on: 6, Capture, or reaching Home!
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

  // ── Invite Friend Handlers ──
  const handleSeatFriend = (seatIndex: number, participant: { uid: string; displayName: string; photoURL?: string }) => {
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
    const msg = `🪑 Seated @${participant.displayName} at the ${colorsOrder[seatIndex].toUpperCase()} Ludo table chair!`;
    setLogMessage(msg);
    onBroadcastSpeech?.(msg);
  };

  const handleSeatBot = (seatIndex: number) => {
    const defaultBots = ["Aarav (Green)", "Simran (Yellow)", "Kabir (Blue)"];
    const botAvatars = ["😎", "🌸", "⚡"];
    setSeatedPlayers((prev) => {
      const copy = [...prev];
      copy[seatIndex] = {
        ...copy[seatIndex],
        id: `bot_${colorsOrder[seatIndex]}`,
        name: defaultBots[seatIndex - 1] || "AI Bot",
        avatar: botAvatars[seatIndex - 1] || "🤖",
        isBot: true,
      };
      return copy;
    });
    setInviteModalOpen(false);
  };

  const handleCopyTableLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}${window.location.pathname}?tab=ludo`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleBroadcastTableInvite = () => {
    const text = `🎲 @${localUserName} is at the Ludo Table in ${spaceTitle}! Take a seat and play together! 🚀`;
    onBroadcastSpeech?.(text);
    spacesSfx.playFocusBell();
    setInviteModalOpen(false);
  };

  // Helper to check what tokens are on a grid cell [row, col]
  const getTokensAtCell = (r: number, c: number) => {
    const occupants: { playerIdx: number; tokenIdx: number; color: LudoColor }[] = [];

    tokens.forEach((playerTokens, pIdx) => {
      const color = colorsOrder[pIdx];
      playerTokens.forEach((step, tIdx) => {
        if (step === 0) {
          // Check yard nests
          const nest = LUDO_YARD_NESTS[color][tIdx];
          if (nest && nest[0] === r && nest[1] === c) {
            occupants.push({ playerIdx: pIdx, tokenIdx: tIdx, color });
          }
        } else if (step >= 1 && step <= 51) {
          // Check circuit track
          const trackIdx = (COLOR_START_OFFSET[color] + step - 1) % 52;
          const pos = LUDO_TRACK_COORDS[trackIdx];
          if (pos && pos[0] === r && pos[1] === c) {
            occupants.push({ playerIdx: pIdx, tokenIdx: tIdx, color });
          }
        } else if (step >= 52 && step <= 56) {
          // Check home column
          const hIdx = step - 52;
          const pos = LUDO_HOME_COLUMNS[color][hIdx];
          if (pos && pos[0] === r && pos[1] === c) {
            occupants.push({ playerIdx: pIdx, tokenIdx: tIdx, color });
          }
        }
      });
    });

    return occupants;
  };

  const activePlayer = seatedPlayers[currentTurn];
  const canRollDice = !hasRolled && !isRolling && !activePlayer.isBot;

  return (
    <div className="space-y-3 font-mono">
      {/* Top Protocol Status Bar */}
      <div className="flex items-center justify-between bg-neutral-900/90 p-3 rounded-2xl border border-neutral-800 shadow-md flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-black text-xl shadow-md">
            🎲
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">
                Turn: @{activePlayer.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  activePlayer.color === "red"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : activePlayer.color === "green"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : activePlayer.color === "yellow"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                }`}
              >
                {activePlayer.color}
              </span>
            </div>
            <div className="text-[11px] text-neutral-300 truncate max-w-md">{logMessage}</div>
          </div>
        </div>

        {/* Action Controls: Dice Roll & Invite */}
        <div className="flex items-center gap-2">
          {/* Invite Friend to Table */}
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Invite room friends to sit at this Ludo table"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Friend</span>
          </button>

          {/* Reset Match */}
          <button
            type="button"
            onClick={handleResetGame}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Restart Ludo Match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Capture Announcement Banner */}
      {captureToast && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-neutral-950 font-black text-xs text-center shadow-xl animate-bounce flex items-center justify-center gap-2">
          <Flame className="w-4 h-4" />
          <span>{captureToast}</span>
        </div>
      )}

      {/* Victory Modal */}
      {winnerCelebration && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 font-black text-xs text-center shadow-2xl animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span>{winnerCelebration}</span>
          </div>
          <button
            onClick={handleResetGame}
            className="px-3 py-1 bg-black text-white text-[10px] rounded-lg font-bold"
          >
            Play Again
          </button>
        </div>
      )}

      {/* ── SEATED PLAYERS & 15x15 LUDO BOARD ── */}
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center justify-between gap-3">
        {/* TOP SEAT (Yellow - Across) */}
        <div className="flex items-center justify-center gap-3 w-full">
          <div
            className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2 transition-all ${
              currentTurn === 2
                ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md scale-105 ring-2 ring-amber-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            <span className="text-base">{seatedPlayers[2].avatar}</span>
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
            className={`px-3 py-2 rounded-2xl border flex flex-col items-center gap-1 text-center transition-all shrink-0 ${
              currentTurn === 1
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md scale-105 ring-2 ring-emerald-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            <span className="text-lg">{seatedPlayers[1].avatar}</span>
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
            className="relative w-[310px] h-[310px] sm:w-[390px] sm:h-[390px] bg-neutral-900 border-4 border-neutral-700 rounded-3xl p-1 shadow-2xl overflow-hidden select-none"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
              gridTemplateRows: "repeat(15, minmax(0, 1fr))",
            }}
          >
            {/* 1. TOP-LEFT GREEN YARD (6x6 cells: rows 0..5, cols 0..5) */}
            <div
              className="relative bg-emerald-700 rounded-2xl border-2 border-emerald-400 p-2 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "1 / 7", gridRow: "1 / 7" }}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-bold text-white font-mono">
                <span>GREEN YARD</span>
                <span>🟢</span>
              </div>
              {/* Inner White Ring Nest */}
              <div className="w-full h-full bg-white/95 rounded-xl border-2 border-emerald-600 p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 items-center justify-items-center shadow-md">
                {LUDO_YARD_NESTS.green.map((_, idx) => {
                  const hasToken = tokens[1][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-200/80 border-2 border-emerald-500 flex items-center justify-center shadow-inner"
                    >
                      {hasToken && (
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-black"
                          title="Green Token in Yard (Needs 6 to roll out)"
                        >
                          ●
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. TOP-RIGHT YELLOW YARD (6x6 cells: rows 0..5, cols 10..15) */}
            <div
              className="relative bg-amber-500 rounded-2xl border-2 border-amber-300 p-2 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "10 / 16", gridRow: "1 / 7" }}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-bold text-neutral-950 font-mono">
                <span>YELLOW YARD</span>
                <span>🟡</span>
              </div>
              <div className="w-full h-full bg-white/95 rounded-xl border-2 border-amber-500 p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 items-center justify-items-center shadow-md">
                {LUDO_YARD_NESTS.yellow.map((_, idx) => {
                  const hasToken = tokens[2][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-inner"
                    >
                      {hasToken && (
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-neutral-900 shadow-md flex items-center justify-center text-[10px] text-neutral-950 font-black"
                          title="Yellow Token in Yard"
                        >
                          ●
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. BOTTOM-LEFT RED YARD (6x6 cells: rows 10..15, cols 1..6) */}
            <div
              className="relative bg-rose-600 rounded-2xl border-2 border-rose-400 p-2 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "1 / 7", gridRow: "10 / 16" }}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-bold text-white font-mono">
                <span>RED YARD (YOU)</span>
                <span>🔴</span>
              </div>
              <div className="w-full h-full bg-white/95 rounded-xl border-2 border-rose-500 p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 items-center justify-items-center shadow-md">
                {LUDO_YARD_NESTS.red.map((_, idx) => {
                  const hasToken = tokens[0][idx] === 0;
                  const canDeploy = hasToken && currentTurn === 0 && hasRolled && diceValue === 6;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!canDeploy}
                      onClick={() => moveToken(0, idx, diceValue)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center shadow-inner transition-transform ${
                        canDeploy ? "cursor-pointer scale-110 ring-2 ring-rose-500 animate-pulse" : ""
                      }`}
                    >
                      {hasToken && (
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-rose-500 to-red-700 border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-black ${
                            canDeploy ? "animate-bounce" : ""
                          }`}
                          title="Your Red Token (Click to deploy on a 6)"
                        >
                          ●
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. BOTTOM-RIGHT BLUE YARD (6x6 cells: rows 10..15, cols 10..15) */}
            <div
              className="relative bg-sky-600 rounded-2xl border-2 border-sky-400 p-2 flex flex-col items-center justify-between shadow-inner"
              style={{ gridColumn: "10 / 16", gridRow: "10 / 16" }}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-bold text-white font-mono">
                <span>BLUE YARD</span>
                <span>🔵</span>
              </div>
              <div className="w-full h-full bg-white/95 rounded-xl border-2 border-sky-500 p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 items-center justify-items-center shadow-md">
                {LUDO_YARD_NESTS.blue.map((_, idx) => {
                  const hasToken = tokens[3][idx] === 0;
                  return (
                    <div
                      key={idx}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-100 border-2 border-sky-400 flex items-center justify-center shadow-inner"
                    >
                      {hasToken && (
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-black"
                          title="Blue Token in Yard"
                        >
                          ●
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. CENTER HOME TRIANGLE (3x3 cells: rows 7..9, cols 7..9) */}
            <div
              className="relative bg-neutral-950 border-2 border-white/40 flex items-center justify-center shadow-2xl overflow-hidden"
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
              <div className="relative z-10 w-8 h-8 rounded-full bg-neutral-950/90 border border-amber-300 flex items-center justify-center shadow-lg">
                <Trophy className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* 6. INDIVIDUAL CIRCUIT & HOME CELLS */}
            {Array.from({ length: 15 }).map((_, r) =>
              Array.from({ length: 15 }).map((_, c) => {
                // Skip Yard quadrants & center Home (handled above)
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

                // Cell background styling
                let cellBg = "bg-neutral-100";
                if (isRedHomeCol || isRedStart) cellBg = "bg-rose-500 text-white";
                else if (isGreenHomeCol || isGreenStart) cellBg = "bg-emerald-500 text-white";
                else if (isYellowHomeCol || isYellowStart) cellBg = "bg-amber-400 text-neutral-900";
                else if (isBlueHomeCol || isBlueStart) cellBg = "bg-sky-500 text-white";

                // Check tokens stationed on this cell
                const occupants = getTokensAtCell(r, c);

                return (
                  <div
                    key={`${r}_${c}`}
                    className={`relative border border-neutral-400/60 flex items-center justify-center text-[8px] font-bold ${cellBg}`}
                    style={{
                      gridColumn: `${c + 1} / ${c + 2}`,
                      gridRow: `${r + 1} / ${r + 2}`,
                    }}
                  >
                    {/* Star Marker for Safe Squares */}
                    {isSafeStar && occupants.length === 0 && (
                      <span className="text-[10px] text-amber-500 font-black drop-shadow select-none">
                        ⭐
                      </span>
                    )}

                    {/* Render Pawn/Tokens on this square */}
                    {occupants.map((occ, idx) => {
                      const isLocalPlayerToken = occ.playerIdx === 0;
                      const canMoveThis =
                        isLocalPlayerToken &&
                        currentTurn === 0 &&
                        hasRolled &&
                        tokens[0][occ.tokenIdx] + diceValue <= 57;

                      const pawnColor = {
                        red: "from-rose-500 to-rose-700 border-white text-white",
                        green: "from-emerald-400 to-emerald-600 border-white text-white",
                        yellow: "from-amber-300 to-amber-500 border-neutral-900 text-neutral-900",
                        blue: "from-sky-400 to-blue-600 border-white text-white",
                      }[occ.color];

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!canMoveThis}
                          onClick={() => moveToken(occ.playerIdx, occ.tokenIdx, diceValue)}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-b ${pawnColor} border-2 shadow-md flex items-center justify-center font-black text-[9px] transition-transform ${
                            canMoveThis
                              ? "scale-125 ring-2 ring-white animate-bounce cursor-pointer z-20"
                              : "z-10"
                          }`}
                          title={`Token ${occ.tokenIdx + 1} (${occ.color.toUpperCase()})`}
                        >
                          ●
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT SEAT (Blue - Right) */}
          <div
            className={`px-3 py-2 rounded-2xl border flex flex-col items-center gap-1 text-center transition-all shrink-0 ${
              currentTurn === 3
                ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-md scale-105 ring-2 ring-sky-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            <span className="text-lg">{seatedPlayers[3].avatar}</span>
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
          {/* Your Player Badge */}
          <div
            className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
              currentTurn === 0
                ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg scale-105 ring-2 ring-rose-500/40"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
            }`}
          >
            <span className="text-xl">{seatedPlayers[0].avatar}</span>
            <div>
              <div className="text-xs font-bold text-white">{seatedPlayers[0].name} (You)</div>
              <div className="text-[10px] text-rose-300 font-mono">
                Red Team • {currentTurn === 0 ? "Your Turn!" : "Waiting"}
              </div>
            </div>
          </div>

          {/* 3D Realistic Interactive Dice */}
          <div className="flex items-center gap-2">
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
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions: Broadcast Shout & Copy Link */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyTableLink}
                className="p-2.5 rounded-xl border border-neutral-800 hover:border-emerald-500/50 bg-neutral-900 text-xs text-white font-mono flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Table Link"}</span>
              </button>

              <button
                type="button"
                onClick={handleBroadcastTableInvite}
                className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Call Whole Room</span>
              </button>
            </div>

            {/* Active People in Space */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                Online Friends in Space ({onlineParticipants.length}):
              </div>

              {onlineParticipants.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400">
                  No other users currently in this room. Copy link above to invite friends from WhatsApp or Discord!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {onlineParticipants
                    .filter((p) => p.displayName !== localUserName)
                    .map((person) => (
                      <div
                        key={person.uid}
                        className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{person.photoURL || "👑"}</span>
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
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono"
                              title="Seat Green"
                            >
                              Green
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSeatFriend(2, person)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono"
                              title="Seat Yellow"
                            >
                              Yellow
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSeatFriend(3, person)}
                              className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-mono"
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

            {/* Seat Bot Option */}
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
