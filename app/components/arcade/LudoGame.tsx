"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  rollLudoDice,
  moveLudoToken,
  passLudoTurn,
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
} from "@/lib/arcade";
import { Dices, Trophy, Star, Shield, Zap, Sparkles, Volume2 } from "lucide-react";

interface LudoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

// 52-step track coordinates on a 15x15 board (0-indexed [row, col])
const TRACK_COORDS: [number, number][] = [
  [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],  [5, 6],  [4, 6],  [3, 6],  [2, 6],  [1, 6],  [0, 6],
  [0, 7],
  [0, 8],  [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8],  [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],  [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],  [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],  [8, 0],
  [7, 0],
  [6, 0],
];

// 5-step colored home corridors
const HOME_PATHS: Record<"RED" | "GREEN" | "YELLOW" | "BLUE", [number, number][]> = {
  RED:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  GREEN:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  YELLOW: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  BLUE:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

export default function LudoGame({ match, currentUid }: LudoGameProps) {
  const [rolling, setRolling] = useState(false);
  const [movingTokenId, setMovingTokenId] = useState<number | null>(null);

  const ludoState = match.ludoState;
  if (!ludoState) {
    return <div className="text-white font-mono p-4">Loading Cyber Ludo arena...</div>;
  }

  const currentPlayer = match.players[currentUid];
  const myTeam = currentPlayer?.team;
  const isMyTurn = ludoState.currentTurn === myTeam && match.status !== "FINISHED";

  // Movable tokens calculation
  const myTokens: LudoToken[] = myTeam && ludoState.tokens[myTeam] ? ludoState.tokens[myTeam] : [];
  const roll = ludoState.lastDiceRoll;

  const validTokenIdsToMove: number[] = [];
  if (isMyTurn && ludoState.hasRolled && roll) {
    myTokens.forEach((token) => {
      if (token.isHome) return;
      if (token.stepCount === 0) {
        if (roll === 6) validTokenIdsToMove.push(token.id);
      } else {
        if (token.stepCount + roll <= LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
          validTokenIdsToMove.push(token.id);
        }
      }
    });
  }

  const hasValidMoves = validTokenIdsToMove.length > 0;

  // Roll dice handler
  const handleRoll = async () => {
    if (!isMyTurn || ludoState.hasRolled || rolling) return;
    setRolling(true);
    soundSynth.playSnare();
    try {
      const rolledValue = await rollLudoDice(match.id, currentUid);
      if (rolledValue === 6) {
        soundSynth.playAirhorn();
      } else {
        soundSynth.playGong();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setRolling(false);
    }
  };

  // Move token handler
  const handleMove = async (tokenId: number) => {
    if (!isMyTurn || !ludoState.hasRolled || movingTokenId !== null) return;
    if (!validTokenIdsToMove.includes(tokenId)) {
      soundSynth.playBuzzer();
      return;
    }

    setMovingTokenId(tokenId);
    soundSynth.playSubtlePop();
    try {
      const result = await moveLudoToken(match.id, currentUid, tokenId);
      if (result.captured) {
        soundSynth.playAirhorn();
      } else if (result.won) {
        soundSynth.playFanfare();
      }
    } catch (e: any) {
      soundSynth.playBuzzer();
    } finally {
      setMovingTokenId(null);
    }
  };

  // Pass turn handler
  const handlePassTurn = async () => {
    if (!isMyTurn || !ludoState.hasRolled || hasValidMoves) return;
    soundSynth.playSubtlePop();
    await passLudoTurn(match.id, currentUid);
  };

  // Style mappings
  const colorMeta = {
    RED: {
      bg: "bg-red-950/60",
      border: "border-red-600",
      badgeBg: "bg-red-600",
      text: "text-red-400",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]",
    },
    GREEN: {
      bg: "bg-emerald-950/60",
      border: "border-emerald-600",
      badgeBg: "bg-emerald-600",
      text: "text-emerald-400",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    },
    YELLOW: {
      bg: "bg-yellow-950/60",
      border: "border-yellow-600",
      badgeBg: "bg-yellow-500",
      text: "text-yellow-400",
      glow: "shadow-[0_0_12px_rgba(234,179,8,0.5)]",
    },
    BLUE: {
      bg: "bg-blue-950/60",
      border: "border-blue-600",
      badgeBg: "bg-blue-600",
      text: "text-blue-400",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.5)]",
    },
  };

  // Find tokens on a given (r, c)
  const getTokensAtCell = (r: number, c: number): LudoToken[] => {
    const list: LudoToken[] = [];
    (["RED", "GREEN", "BLUE", "YELLOW"] as const).forEach((color) => {
      const tokens = ludoState.tokens[color] || [];
      tokens.forEach((t) => {
        if (t.isHome) return;
        if (t.stepCount > 0 && t.stepCount <= 51) {
          const coord = TRACK_COORDS[t.boardPosition];
          if (coord && coord[0] === r && coord[1] === c) list.push(t);
        } else if (t.stepCount >= 52 && t.stepCount <= 56) {
          const homeIndex = t.stepCount - 52;
          const coord = HOME_PATHS[color][homeIndex];
          if (coord && coord[0] === r && coord[1] === c) list.push(t);
        }
      });
    });
    return list;
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black border-2 border-neutral-800 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-2xl rounded-sm">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[10px] sm:text-xs">
        <span className="text-white font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-emerald-400 animate-pulse" />
          // CYBER LUDO ARENA
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 border font-bold uppercase text-[10px] ${
              colorMeta[ludoState.currentTurn].border
            } ${colorMeta[ludoState.currentTurn].text} bg-neutral-950`}
          >
            TURN: {ludoState.currentTurn} {isMyTurn ? "● (YOUR MOVE)" : ""}
          </span>
        </div>
      </div>

      {/* ── 4 Player HUD Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["RED", "GREEN", "YELLOW", "BLUE"] as const).map((team) => {
          const p = Object.values(match.players || {}).find((pl) => pl.team === team);
          const isTurn = ludoState.currentTurn === team;
          const tokens = ludoState.tokens[team] || [];
          const homeCount = tokens.filter((t) => t.isHome).length;
          const meta = colorMeta[team];

          return (
            <div
              key={team}
              className={`p-2 border transition-all ${
                isTurn
                  ? `${meta.border} ${meta.bg} ${meta.glow} ring-1 ring-white scale-[1.02]`
                  : "border-neutral-800 bg-neutral-950"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={meta.text}>
                  {team} {myTeam === team ? "(YOU)" : ""}
                </span>
                <span className="text-neutral-400">{homeCount}/4 🏆</span>
              </div>
              <p className="text-white font-bold truncate text-[11px] mt-0.5">
                {p ? p.handle : "[ OPEN SEAT ]"}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Real-Time Action Log Ticker ── */}
      {ludoState.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950/80 px-3 py-1.5 text-[11px] text-neutral-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{ludoState.lastActionLog}</span>
        </div>
      )}

      {/* ── 15x15 Cyber Ludo Board Grid ── */}
      <div className="relative aspect-square max-w-[420px] sm:max-w-[460px] mx-auto border-2 border-neutral-700 bg-black p-1 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        <div
          className="w-full h-full grid gap-[1px] bg-neutral-900"
          style={{
            gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
            gridTemplateRows: "repeat(15, minmax(0, 1fr))",
          }}
        >
          {/* Render All 225 Cells (15x15) */}
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              // 1. RED BASE (Top-Left 6x6)
              if (r < 6 && c < 6) {
                if (r === 0 && c === 0) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{ gridColumn: "span 6", gridRow: "span 6" }}
                      className="border-2 border-red-600 bg-red-950/40 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-red-400 font-bold">
                        <span>RED BASE</span>
                        <span>{ludoState.tokens.RED?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center">
                        {(ludoState.tokens.RED || []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!validTokenIdsToMove.includes(t.id) || myTeam !== "RED"}
                            onClick={() => handleMove(t.id)}
                            className={`w-7 h-7 rounded-full border-2 border-red-500 font-bold text-[10px] flex items-center justify-center transition-all ${
                              t.isHome
                                ? "bg-white text-black border-white"
                                : t.stepCount > 0
                                ? "bg-red-600 text-white shadow-lg"
                                : "bg-neutral-900 text-red-400"
                            } ${
                              validTokenIdsToMove.includes(t.id) && myTeam === "RED"
                                ? "ring-2 ring-white animate-bounce cursor-pointer scale-110"
                                : ""
                            }`}
                          >
                            {t.isHome ? "✓" : t.stepCount > 0 ? `T${t.id + 1}` : "●"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }

              // 2. GREEN BASE (Top-Right 6x6)
              if (r < 6 && c >= 9) {
                if (r === 0 && c === 9) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{ gridColumn: "span 6", gridRow: "span 6" }}
                      className="border-2 border-emerald-600 bg-emerald-950/40 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                        <span>GREEN BASE</span>
                        <span>{ludoState.tokens.GREEN?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center">
                        {(ludoState.tokens.GREEN || []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!validTokenIdsToMove.includes(t.id) || myTeam !== "GREEN"}
                            onClick={() => handleMove(t.id)}
                            className={`w-7 h-7 rounded-full border-2 border-emerald-500 font-bold text-[10px] flex items-center justify-center transition-all ${
                              t.isHome
                                ? "bg-white text-black border-white"
                                : t.stepCount > 0
                                ? "bg-emerald-600 text-white shadow-lg"
                                : "bg-neutral-900 text-emerald-400"
                            } ${
                              validTokenIdsToMove.includes(t.id) && myTeam === "GREEN"
                                ? "ring-2 ring-white animate-bounce cursor-pointer scale-110"
                                : ""
                            }`}
                          >
                            {t.isHome ? "✓" : t.stepCount > 0 ? `T${t.id + 1}` : "●"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }

              // 3. BLUE BASE (Bottom-Left 6x6)
              if (r >= 9 && c < 6) {
                if (r === 9 && c === 0) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{ gridColumn: "span 6", gridRow: "span 6" }}
                      className="border-2 border-blue-600 bg-blue-950/40 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-blue-400 font-bold">
                        <span>BLUE BASE</span>
                        <span>{ludoState.tokens.BLUE?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center">
                        {(ludoState.tokens.BLUE || []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!validTokenIdsToMove.includes(t.id) || myTeam !== "BLUE"}
                            onClick={() => handleMove(t.id)}
                            className={`w-7 h-7 rounded-full border-2 border-blue-500 font-bold text-[10px] flex items-center justify-center transition-all ${
                              t.isHome
                                ? "bg-white text-black border-white"
                                : t.stepCount > 0
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-neutral-900 text-blue-400"
                            } ${
                              validTokenIdsToMove.includes(t.id) && myTeam === "BLUE"
                                ? "ring-2 ring-white animate-bounce cursor-pointer scale-110"
                                : ""
                            }`}
                          >
                            {t.isHome ? "✓" : t.stepCount > 0 ? `T${t.id + 1}` : "●"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }

              // 4. YELLOW BASE (Bottom-Right 6x6)
              if (r >= 9 && c >= 9) {
                if (r === 9 && c === 9) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{ gridColumn: "span 6", gridRow: "span 6" }}
                      className="border-2 border-yellow-600 bg-yellow-950/40 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-yellow-400 font-bold">
                        <span>YELLOW BASE</span>
                        <span>{ludoState.tokens.YELLOW?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center">
                        {(ludoState.tokens.YELLOW || []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!validTokenIdsToMove.includes(t.id) || myTeam !== "YELLOW"}
                            onClick={() => handleMove(t.id)}
                            className={`w-7 h-7 rounded-full border-2 border-yellow-500 font-bold text-[10px] flex items-center justify-center transition-all ${
                              t.isHome
                                ? "bg-white text-black border-white"
                                : t.stepCount > 0
                                ? "bg-yellow-500 text-black shadow-lg"
                                : "bg-neutral-900 text-yellow-400"
                            } ${
                              validTokenIdsToMove.includes(t.id) && myTeam === "YELLOW"
                                ? "ring-2 ring-white animate-bounce cursor-pointer scale-110"
                                : ""
                            }`}
                          >
                            {t.isHome ? "✓" : t.stepCount > 0 ? `T${t.id + 1}` : "●"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }

              // 5. CENTER TRIUMPH MATRIX (Center 3x3)
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
                if (r === 6 && c === 6) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{ gridColumn: "span 3", gridRow: "span 3" }}
                      className="border-2 border-white bg-black flex flex-col items-center justify-center p-1 text-center shadow-inner relative overflow-hidden"
                    >
                      <Trophy className="w-5 h-5 text-yellow-400 animate-bounce mb-1" />
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-white leading-tight">
                        CYBER
                        <br />
                        VORTEX
                      </span>
                    </div>
                  );
                }
                return null;
              }

              // 6. TRACK & HOME PATH CELLS
              const tokensOnCell = getTokensAtCell(r, c);

              // Check if safe star square
              const isStarCell =
                (r === 6 && c === 1) ||
                (r === 2 && c === 6) ||
                (r === 1 && c === 8) ||
                (r === 6 && c === 12) ||
                (r === 8 && c === 13) ||
                (r === 12 && c === 8) ||
                (r === 13 && c === 6) ||
                (r === 8 && c === 2);

              // Check colored home corridor cells
              const isRedPath = r === 7 && c >= 1 && c <= 5;
              const isGreenPath = c === 7 && r >= 1 && r <= 5;
              const isYellowPath = r === 7 && c >= 9 && c <= 13;
              const isBluePath = c === 7 && r >= 9 && r <= 13;

              let cellBg = "bg-neutral-950";
              if (isRedPath) cellBg = "bg-red-900/60";
              if (isGreenPath) cellBg = "bg-emerald-900/60";
              if (isYellowPath) cellBg = "bg-yellow-900/60";
              if (isBluePath) cellBg = "bg-blue-900/60";

              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative flex items-center justify-center ${cellBg} border border-neutral-800/80 transition-colors`}
                >
                  {isStarCell && (
                    <Star className="w-2.5 h-2.5 text-neutral-600 fill-neutral-600/30" />
                  )}

                  {/* Render Occupying Tokens on this cell */}
                  {tokensOnCell.map((tok) => {
                    const isMovable = validTokenIdsToMove.includes(tok.id) && myTeam === tok.color;
                    const meta = colorMeta[tok.color];
                    return (
                      <button
                        key={`${tok.color}-${tok.id}`}
                        type="button"
                        disabled={!isMovable}
                        onClick={() => handleMove(tok.id)}
                        className={`absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white font-bold text-[9px] flex items-center justify-center text-white shadow-md z-10 transition-all ${
                          meta.badgeBg
                        } ${
                          isMovable
                            ? "ring-2 ring-emerald-300 animate-bounce scale-110 cursor-pointer"
                            : ""
                        }`}
                      >
                        {tok.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Interactive 3D Dice Roller & Turn Hub ── */}
      <div className="border-2 border-neutral-800 bg-neutral-950 p-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-4">
          {/* Animated 3D Die Face */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 border-2 ${
              colorMeta[ludoState.currentTurn].border
            } bg-black flex items-center justify-center font-mono text-3xl font-extrabold shadow-2xl transition-all ${
              rolling ? "animate-spin" : ""
            }`}
          >
            {roll ? `⚄ ${roll}` : "🎲"}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            {isMyTurn ? (
              !ludoState.hasRolled ? (
                <button
                  type="button"
                  disabled={rolling}
                  onClick={handleRoll}
                  className="px-6 py-2.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-bold font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-lg"
                >
                  {rolling ? "ROLLING..." : "[ ROLL 3D DICE 🎲 ]"}
                </button>
              ) : hasValidMoves ? (
                <span className="text-emerald-400 font-bold text-xs animate-pulse">
                  ⚡ SELECT A GLOWING TOKEN ON BOARD TO MOVE!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePassTurn}
                  className="px-5 py-2 border border-neutral-600 bg-neutral-900 text-neutral-300 hover:text-white hover:border-white font-bold font-mono text-xs uppercase cursor-pointer"
                >
                  [ NO VALID MOVES // PASS TURN ]
                </button>
              )
            ) : (
              <span className="text-neutral-500 font-bold text-xs uppercase tracking-wider">
                WAITING FOR {ludoState.currentTurn} TO ROLL...
              </span>
            )}
            <span className="text-[10px] text-neutral-500">
              {roll === 6
                ? "✨ ROLLED A 6: Deploy token or move + BONUS TURN!"
                : isMyTurn && ludoState.hasRolled
                ? `Rolled a ${roll}. Tap any movable token.`
                : "Safe squares (★) prevent token captures."}
            </span>
          </div>
        </div>
      </div>

      {/* ── Victory Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-emerald-950/40 p-4 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto animate-pulse" />
          <h2 className="font-bold text-sm sm:text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CONQUERED THE CYBER LUDO ARENA!
          </h2>
          <p className="text-[10px] text-emerald-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}
    </div>
  );
}
