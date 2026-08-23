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
import { Dices, Trophy, Star, Shield, Sparkles, CircleDot, Share2, Users, Bot } from "lucide-react";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { executeLudoBotTurn } from "@/lib/arcadeBots";

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

// Directional arrows on home paths
const HOME_ARROWS: Record<"RED" | "GREEN" | "YELLOW" | "BLUE", string> = {
  RED: "▶",
  GREEN: "▼",
  YELLOW: "◀",
  BLUE: "▲",
};

export default function LudoGame({ match, currentUid }: LudoGameProps) {
  const [rolling, setRolling] = useState(false);
  const [movingTokenId, setMovingTokenId] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const ludoState = match.ludoState;
  if (!ludoState) {
    return <div className="text-white font-mono p-4">Loading Black & White Ludo arena...</div>;
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

  // Auto-trigger bot turns if active player is a bot
  useEffect(() => {
    if (match.status !== "PLAYING" || !ludoState) return;
    const currentTurn = ludoState.currentTurn;
    const activePlayer = Object.values(match.players || {}).find(
      (p) => p.team === currentTurn && p.isBot
    );
    if (activePlayer) {
      executeLudoBotTurn(match);
    }
  }, [ludoState?.currentTurn, ludoState?.hasRolled, match.status]);

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

  // Pure Monochrome High-Contrast Faction Meta
  const monochromeMeta = {
    RED: {
      name: "FACTION I (SOLID WHITE)",
      symbol: "◆",
      tokenBg: "bg-white text-black font-black shadow-[0_4px_10px_rgba(255,255,255,0.4)] border-2 border-black",
      baseBorder: "border-2 border-white",
      baseBg: "bg-black",
      label: "RED",
    },
    GREEN: {
      name: "FACTION II (INVERTED RING)",
      symbol: "▲",
      tokenBg: "bg-black text-white font-black shadow-[0_4px_10px_rgba(255,255,255,0.3)] border-2 border-white ring-1 ring-white",
      baseBorder: "border-2 border-neutral-400",
      baseBg: "bg-neutral-950",
      label: "GRN",
    },
    YELLOW: {
      name: "FACTION III (DOTTED CORE)",
      symbol: "●",
      tokenBg: "bg-zinc-200 text-black font-black shadow-[0_4px_10px_rgba(255,255,255,0.3)] border-2 border-neutral-900",
      baseBorder: "border-2 border-dashed border-white",
      baseBg: "bg-black",
      label: "YEL",
    },
    BLUE: {
      name: "FACTION IV (CROSSHAIR)",
      symbol: "✚",
      tokenBg: "bg-neutral-900 text-white font-black shadow-[0_4px_10px_rgba(255,255,255,0.3)] border-2 border-dashed border-white",
      baseBorder: "border-2 border-dotted border-white",
      baseBg: "bg-neutral-950",
      label: "BLU",
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

  // Realistic Physical Dice Pips Render
  const renderDiceFace = (val: number | null) => {
    if (!val) return <Dices className="w-8 h-8 text-neutral-500 animate-pulse" />;
    const pips: Record<number, number[][]> = {
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
    };
    const activePips = pips[val] || [];
    return (
      <div className="w-10 h-10 grid grid-cols-3 grid-rows-3 p-1 gap-1">
        {Array.from({ length: 3 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => {
            const hasDot = activePips.some(([pr, pc]) => pr === r && pc === c);
            return (
              <div key={`${r}-${c}`} className="flex items-center justify-center">
                {hasDot && (
                  <div className="w-2.5 h-2.5 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-none">
      {/* ── Realistic Retro Header ── */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
          <span className="text-white font-bold uppercase tracking-widest">
            // PHYSICAL LUDO ARENA [ MONOCHROME ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Invite friends to join and talk on voice"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border-2 border-white bg-white text-black font-extrabold uppercase text-[10px]">
            TURN: {ludoState.currentTurn} {isMyTurn ? "● (YOU)" : ""}
          </span>
        </div>
      </div>

      {/* Invite Modal */}
      <ArcadeInviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        match={match}
      />

      {/* ── 4 Monochrome Player HUD Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["RED", "GREEN", "YELLOW", "BLUE"] as const).map((team) => {
          const p = Object.values(match.players || {}).find((pl) => pl.team === team);
          const isTurn = ludoState.currentTurn === team;
          const tokens = ludoState.tokens[team] || [];
          const homeCount = tokens.filter((t) => t.isHome).length;
          const meta = monochromeMeta[team];

          return (
            <div
              key={team}
              className={`p-2.5 border-2 transition-all ${
                isTurn
                  ? "border-white bg-neutral-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white scale-[1.02]"
                  : "border-neutral-800 bg-black"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-white flex items-center gap-1">
                  <span>{meta.symbol}</span>
                  <span>{meta.label}</span>
                  {myTeam === team && <span className="text-neutral-400 font-normal">(YOU)</span>}
                </span>
                <span className="text-white font-extrabold bg-neutral-800 px-1 rounded">
                  {homeCount}/4
                </span>
              </div>
              <p className="text-white font-bold truncate text-[11px] mt-1">
                {p ? p.handle : "[ EMPTY ]"}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Combat Telemetry Log Ticker ── */}
      {ludoState.lastActionLog && (
        <div className="border border-white/40 bg-neutral-950 px-3 py-1.5 text-[11px] text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="truncate uppercase font-bold tracking-wide">{ludoState.lastActionLog}</span>
        </div>
      )}

      {/* ── 15x15 Realistic Physical Ludo Board (Pure Black & White) ── */}
      <div className="relative aspect-square max-w-[420px] sm:max-w-[460px] mx-auto border-4 border-white bg-black p-1.5 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
        {/* Corner Bolts */}
        <span className="absolute top-1 left-1 text-[8px] text-white select-none">✚</span>
        <span className="absolute top-1 right-1 text-[8px] text-white select-none">✚</span>
        <span className="absolute bottom-1 left-1 text-[8px] text-white select-none">✚</span>
        <span className="absolute bottom-1 right-1 text-[8px] text-white select-none">✚</span>

        <div
          className="w-full h-full grid gap-[1px] bg-neutral-800 border border-neutral-700"
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
                      className="border-2 border-white bg-black p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-white font-extrabold border-b border-neutral-800 pb-1">
                        <span>◆ RED BASE</span>
                        <span>{ludoState.tokens.RED?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center p-1">
                        {(ludoState.tokens.RED || []).map((t) => {
                          const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "RED";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!isMovable}
                              onClick={() => handleMove(t.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all border-2 ${
                                t.isHome
                                  ? "bg-white text-black border-white"
                                  : t.stepCount > 0
                                  ? monochromeMeta.RED.tokenBg
                                  : "bg-neutral-950 text-neutral-500 border-neutral-700"
                              } ${
                                isMovable
                                  ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_15px_#fff] cursor-pointer"
                                  : ""
                              }`}
                            >
                              {t.isHome ? "✓" : t.stepCount > 0 ? `P${t.id + 1}` : "●"}
                            </button>
                          );
                        })}
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
                      className="border-2 border-neutral-400 bg-neutral-950 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-white font-extrabold border-b border-neutral-800 pb-1">
                        <span>▲ GRN BASE</span>
                        <span>{ludoState.tokens.GREEN?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center p-1">
                        {(ludoState.tokens.GREEN || []).map((t) => {
                          const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "GREEN";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!isMovable}
                              onClick={() => handleMove(t.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all border-2 ${
                                t.isHome
                                  ? "bg-white text-black border-white"
                                  : t.stepCount > 0
                                  ? monochromeMeta.GREEN.tokenBg
                                  : "bg-neutral-950 text-neutral-500 border-neutral-700"
                              } ${
                                isMovable
                                  ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_15px_#fff] cursor-pointer"
                                  : ""
                              }`}
                            >
                              {t.isHome ? "✓" : t.stepCount > 0 ? `P${t.id + 1}` : "●"}
                            </button>
                          );
                        })}
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
                      className="border-2 border-dotted border-white bg-neutral-950 p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-white font-extrabold border-b border-neutral-800 pb-1">
                        <span>✚ BLU BASE</span>
                        <span>{ludoState.tokens.BLUE?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center p-1">
                        {(ludoState.tokens.BLUE || []).map((t) => {
                          const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "BLUE";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!isMovable}
                              onClick={() => handleMove(t.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all border-2 ${
                                t.isHome
                                  ? "bg-white text-black border-white"
                                  : t.stepCount > 0
                                  ? monochromeMeta.BLUE.tokenBg
                                  : "bg-neutral-950 text-neutral-500 border-neutral-700"
                              } ${
                                isMovable
                                  ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_15px_#fff] cursor-pointer"
                                  : ""
                              }`}
                            >
                              {t.isHome ? "✓" : t.stepCount > 0 ? `P${t.id + 1}` : "●"}
                            </button>
                          );
                        })}
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
                      className="border-2 border-dashed border-white bg-black p-2 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center text-[10px] text-white font-extrabold border-b border-neutral-800 pb-1">
                        <span>● YEL BASE</span>
                        <span>{ludoState.tokens.YELLOW?.filter((t) => t.isHome).length}/4 HOME</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 place-items-center p-1">
                        {(ludoState.tokens.YELLOW || []).map((t) => {
                          const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "YELLOW";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!isMovable}
                              onClick={() => handleMove(t.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all border-2 ${
                                t.isHome
                                  ? "bg-white text-black border-white"
                                  : t.stepCount > 0
                                  ? monochromeMeta.YELLOW.tokenBg
                                  : "bg-neutral-950 text-neutral-500 border-neutral-700"
                              } ${
                                isMovable
                                  ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_15px_#fff] cursor-pointer"
                                  : ""
                              }`}
                            >
                              {t.isHome ? "✓" : t.stepCount > 0 ? `P${t.id + 1}` : "●"}
                            </button>
                          );
                        })}
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
                      <Trophy className="w-5 h-5 text-white animate-bounce mb-1" />
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-white leading-tight">
                        HOME
                        <br />
                        TRIUMPH
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

              let cellBg = "bg-black";
              let arrowIcon = "";
              if (isRedPath) {
                cellBg = "bg-neutral-900";
                arrowIcon = HOME_ARROWS.RED;
              } else if (isGreenPath) {
                cellBg = "bg-neutral-900";
                arrowIcon = HOME_ARROWS.GREEN;
              } else if (isYellowPath) {
                cellBg = "bg-neutral-900";
                arrowIcon = HOME_ARROWS.YELLOW;
              } else if (isBluePath) {
                cellBg = "bg-neutral-900";
                arrowIcon = HOME_ARROWS.BLUE;
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative flex items-center justify-center ${cellBg} border border-neutral-800 transition-colors`}
                >
                  {isStarCell && (
                    <span className="text-[10px] text-white font-extrabold select-none">★</span>
                  )}
                  {arrowIcon && tokensOnCell.length === 0 && (
                    <span className="text-[8px] text-neutral-600 font-bold select-none">
                      {arrowIcon}
                    </span>
                  )}

                  {/* Render Occupying Pawns on this cell */}
                  {tokensOnCell.map((tok) => {
                    const isMovable = validTokenIdsToMove.includes(tok.id) && myTeam === tok.color;
                    const meta = monochromeMeta[tok.color];
                    return (
                      <button
                        key={`${tok.color}-${tok.id}`}
                        type="button"
                        disabled={!isMovable}
                        onClick={() => handleMove(tok.id)}
                        className={`absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full font-black text-[9px] flex items-center justify-center z-10 transition-all ${
                          meta.tokenBg
                        } ${
                          isMovable
                            ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_15px_#fff] cursor-pointer"
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

      {/* ── Realistic 3D Physical Die & Roll Controls ── */}
      <div className="border-2 border-white bg-neutral-950 p-4 text-center space-y-3 shadow-2xl">
        <div className="flex items-center justify-center gap-5">
          {/* Realistic Physical White Cube Die with Recessed Black Pips */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 border-2 border-black rounded-md bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,255,255,0.25)] transition-all ${
              rolling ? "animate-spin" : ""
            }`}
          >
            {renderDiceFace(roll)}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            {isMyTurn ? (
              !ludoState.hasRolled ? (
                <button
                  type="button"
                  disabled={rolling}
                  onClick={handleRoll}
                  className="px-6 py-2.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-xl"
                >
                  {rolling ? "ROLLING..." : "[ ROLL 3D DIE 🎲 ]"}
                </button>
              ) : hasValidMoves ? (
                <span className="text-white font-extrabold text-xs animate-pulse flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>TAP A GLOWING PAWN TO MOVE!</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePassTurn}
                  className="px-5 py-2 border-2 border-neutral-600 bg-neutral-900 text-white hover:border-white font-bold font-mono text-xs uppercase cursor-pointer"
                >
                  [ NO VALID MOVES // PASS TURN ]
                </button>
              )
            ) : (
              <span className="text-neutral-400 font-bold text-xs uppercase tracking-wider">
                WAITING FOR {ludoState.currentTurn} TO ROLL...
              </span>
            )}
            <span className="text-[10px] text-neutral-400">
              {roll === 6
                ? "✨ ROLLED A 6: Deploy pawn onto track + BONUS TURN!"
                : isMyTurn && ludoState.hasRolled
                ? `Rolled a ${roll}. Select piece.`
                : "Safe star squares (★) protect pawns from capture."}
            </span>
          </div>
        </div>
      </div>

      {/* ── Victory Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce shadow-[0_0_30px_rgba(255,255,255,0.4)]">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CONQUERED THE PHYSICAL LUDO ARENA!
          </h2>
          <p className="text-[11px] text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
