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
import {
  Dices,
  Trophy,
  Sparkles,
  Share2,
  Users,
  HelpCircle,
  Crown,
  RotateCcw,
} from "lucide-react";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { executeLudoBotTurn } from "@/lib/arcadeBots";

interface LudoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
  onRematch?: () => void;
}

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

const THEME_CONFIG = {
  RED: {
    name: "RED EMPIRE",
    code: "RED" as const,
    label: "RED",
    accent: "#dc2626",
    gradient: "from-red-600 via-red-500 to-rose-700",
    baseBg: "bg-gradient-to-br from-red-600 via-rose-700 to-red-900",
    baseBorder: "border-red-500",
    corridorBg: "bg-gradient-to-r from-red-500/30 to-red-600/40 border-red-500/60",
    arrowColor: "text-red-500",
    tokenGradient: "from-red-400 via-red-600 to-red-950",
    tokenGlow: "shadow-[0_4px_12px_rgba(239,68,68,0.7),_inset_0_2px_4px_rgba(255,255,255,0.6)]",
    ringColor: "ring-red-400",
    badgeBg: "bg-red-600",
  },
  GREEN: {
    name: "GREEN REALM",
    code: "GREEN" as const,
    label: "GRN",
    accent: "#16a34a",
    gradient: "from-emerald-600 via-green-500 to-emerald-700",
    baseBg: "bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-900",
    baseBorder: "border-emerald-500",
    corridorBg: "bg-gradient-to-b from-emerald-500/30 to-emerald-600/40 border-emerald-500/60",
    arrowColor: "text-emerald-500",
    tokenGradient: "from-emerald-300 via-emerald-600 to-emerald-950",
    tokenGlow: "shadow-[0_4px_12px_rgba(16,185,129,0.7),_inset_0_2px_4px_rgba(255,255,255,0.6)]",
    ringColor: "ring-emerald-400",
    badgeBg: "bg-emerald-600",
  },
  YELLOW: {
    name: "YELLOW DYNASTY",
    code: "YELLOW" as const,
    label: "YLW",
    accent: "#ca8a04",
    gradient: "from-amber-500 via-yellow-400 to-amber-600",
    baseBg: "bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-900",
    baseBorder: "border-amber-400",
    corridorBg: "bg-gradient-to-l from-amber-500/30 to-amber-600/40 border-amber-500/60",
    arrowColor: "text-amber-400",
    tokenGradient: "from-amber-200 via-amber-400 to-yellow-800",
    tokenGlow: "shadow-[0_4px_12px_rgba(245,158,11,0.7),_inset_0_2px_4px_rgba(255,255,255,0.8)]",
    ringColor: "ring-amber-300",
    badgeBg: "bg-amber-500",
  },
  BLUE: {
    name: "BLUE KINGDOM",
    code: "BLUE" as const,
    label: "BLU",
    accent: "#2563eb",
    gradient: "from-blue-600 via-blue-500 to-cyan-700",
    baseBg: "bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-950",
    baseBorder: "border-blue-500",
    corridorBg: "bg-gradient-to-t from-blue-500/30 to-blue-600/40 border-blue-500/60",
    arrowColor: "text-blue-500",
    tokenGradient: "from-cyan-300 via-blue-600 to-blue-950",
    tokenGlow: "shadow-[0_4px_12px_rgba(59,130,246,0.7),_inset_0_2px_4px_rgba(255,255,255,0.6)]",
    ringColor: "ring-cyan-400",
    badgeBg: "bg-blue-600",
  },
};

export default function LudoGame({ match, currentUid, onRematch }: LudoGameProps) {
  const [rolling, setRolling] = useState(false);
  const [movingTokenId, setMovingTokenId] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const ludoState = match.ludoState;
  if (!ludoState) {
    return <div className="text-white font-mono p-4">Loading Deluxe 3D Ludo Arena...</div>;
  }

  const currentPlayer = match.players[currentUid];
  const myTeam = currentPlayer?.team as ("RED" | "GREEN" | "BLUE" | "YELLOW") | undefined;
  const isMyTurn = ludoState.currentTurn === myTeam && match.status !== "FINISHED";

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

  useEffect(() => {
    if (match.status !== "PLAYING" || !ludoState) return;
    const currentTurn = ludoState.currentTurn;
    const activePlayer = Object.values(match.players || {}).find(
      (p) => p.team === currentTurn && p.isBot
    );
    if (activePlayer) {
      executeLudoBotTurn(match);
    }
  }, [
    ludoState?.currentTurn,
    ludoState?.hasRolled,
    ludoState?.lastDiceRoll,
    ludoState?.lastActionLog,
    match.status,
  ]);

  const handleRoll = async () => {
    if (!isMyTurn || ludoState.hasRolled || rolling) return;
    setRolling(true);
    soundSynth.playSnare();
    try {
      const rolledValue = await rollLudoDice(match.id, currentUid);
      if (rolledValue === 6) {
        soundSynth.playAirhorn();
      } else {
        soundSynth.playSubBoom(0.3);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setRolling(false);
    }
  };

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

  const handlePassTurn = async () => {
    if (!isMyTurn || !ludoState.hasRolled || hasValidMoves) return;
    soundSynth.playSubtlePop();
    await passLudoTurn(match.id, currentUid);
  };

  useEffect(() => {
    if (isMyTurn && ludoState.hasRolled && roll) {
      if (!hasValidMoves) {
        const timer = setTimeout(() => {
          handlePassTurn();
        }, 1300);
        return () => clearTimeout(timer);
      }
    }
  }, [isMyTurn, ludoState.hasRolled, roll, hasValidMoves]);

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
          const corridors: Record<string, [number, number][]> = {
            RED: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
            GREEN: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
            YELLOW: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
            BLUE: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
          };
          const coord = corridors[color][homeIndex];
          if (coord && coord[0] === r && coord[1] === c) list.push(t);
        }
      });
    });
    return list;
  };

  const renderDiceFace = (val: number | null) => {
    if (!val) {
      return (
        <div className="flex flex-col items-center justify-center animate-pulse text-amber-300">
          <Dices className="w-8 h-8" />
          <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">ROLL</span>
        </div>
      );
    }
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
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 p-1.5 gap-1 place-items-center">
        {Array.from({ length: 3 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => {
            const hasDot = activePips.some(([pr, pc]) => pr === r && pc === c);
            return (
              <div key={`${r}-${c}`} className="flex items-center justify-center w-full h-full">
                {hasDot && (
                  <div
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                      val === 6 ? "bg-red-600 shadow-[0_0_8px_#ef4444]" : "bg-neutral-900 shadow-inner"
                    } border border-neutral-950/40`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 4;

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-amber-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(245,158,11,0.15)] rounded-2xl">
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                GRANDMASTER LUDO
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                DELUXE 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{ludoState.currentTurn}</span> • {isMyTurn ? "YOUR TURN" : "WAITING FOR MOVE"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="ludo" />

      {!currentPlayer && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY & TALK ON LIVE MIC
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!currentUid) return;
              try {
                const { joinArcadeMatch } = await import("@/lib/arcade");
                await joinArcadeMatch(match.id, {
                  uid: currentUid,
                  handle: `@PLAYER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(["RED", "GREEN", "YELLOW", "BLUE"] as const).map((team) => {
          const p = Object.values(match.players || {}).find((pl) => pl.team === team);
          const isTurn = ludoState.currentTurn === team;
          const tokens = ludoState.tokens[team] || [];
          const homeCount = tokens.filter((t) => t.isHome).length;
          const meta = THEME_CONFIG[team];
          const isMe = myTeam === team;

          return (
            <div
              key={team}
              className={`p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                isTurn
                  ? `border-amber-400 bg-neutral-900/90 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ${meta.ringColor} scale-[1.02]`
                  : "border-neutral-800 bg-black/60"
              }`}
            >
              {isTurn && (
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.gradient}`} />
              )}
              <div className="flex items-center justify-between text-[11px] font-black pb-1">
                <span className="flex items-center gap-1.5 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${meta.gradient} shadow-sm shrink-0`} />
                  <span className="text-white truncate">{meta.label}</span>
                  {isMe && <span className="text-amber-400 text-[9px] font-bold">(YOU)</span>}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${meta.badgeBg} text-white shadow-sm`}>
                  {homeCount}/4 🏆
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-300 font-mono">
                <span className="truncate max-w-[85px] font-bold text-white">
                  {p ? p.handle : "[ EMPTY SEAT ]"}
                </span>
                {!p && !currentPlayer && match.status !== "FINISHED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUid) return;
                      try {
                        const { joinArcadeMatch } = await import("@/lib/arcade");
                        await joinArcadeMatch(match.id, {
                          uid: currentUid,
                          handle: `@PLAYER_${currentUid.slice(0, 4)}`,
                        });
                        if (match.roomId) {
                          const { promoteToSpeaker } = await import("@/lib/rooms");
                          await promoteToSpeaker(match.roomId, currentUid);
                        }
                      } catch (e) {}
                    }}
                    className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase rounded cursor-pointer shadow active:scale-95"
                  >
                    SIT
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ludoState.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{ludoState.lastActionLog}</span>
        </div>
      )}

      <div className="relative aspect-square max-w-[460px] sm:max-w-[500px] mx-auto p-3 rounded-2xl bg-gradient-to-br from-[#3b2010] via-[#5c3317] to-[#28150a] border-4 border-[#8c5225] shadow-[0_20px_50px_rgba(0,0,0,0.8),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-700 shadow-md" />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-700 shadow-md" />
        <span className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-700 shadow-md" />
        <span className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-700 shadow-md" />
        <div
          className="w-full h-full grid gap-[1.5px] bg-[#1a0f07] border-2 border-[#3d200e] p-[2px] rounded-xl shadow-inner overflow-hidden"
          style={{
            gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
            gridTemplateRows: "repeat(15, minmax(0, 1fr))",
          }}
        >
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              if (r < 6 && c < 6 && r === 0 && c === 0) {
                return (
                  <div key={`${r}-${c}`} style={{ gridColumn: "span 6", gridRow: "span 6" }} className="p-3 bg-gradient-to-br from-red-600 via-rose-700 to-red-950 border-2 border-red-500 rounded-tl-xl flex flex-col justify-between shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
                    <div className="flex justify-between items-center text-[10px] text-white font-black border-b border-red-400/40 pb-1"><span className="flex items-center gap-1">👑 RED BASE</span><span className="px-1.5 py-0.5 bg-black/40 rounded text-[9px]">{ludoState.tokens.RED?.filter((t) => t.isHome).length}/4 HOME</span></div>
                    <div className="grid grid-cols-2 gap-3 place-items-center p-2 bg-black/30 rounded-xl border border-red-500/30">
                      {(ludoState.tokens.RED || []).map((t) => {
                        const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "RED";
                        return <button key={t.id} type="button" disabled={!isMovable} onClick={() => handleMove(t.id)} className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all relative ${t.isHome ? "bg-amber-400 text-black border-2 border-white shadow-[0_0_15px_#fbbf24]" : t.stepCount > 0 ? "bg-gradient-to-br from-red-400 to-red-800 text-white border-2 border-white shadow-lg" : "bg-gradient-to-br from-red-500 to-red-900 text-white border-2 border-red-300 shadow-md"} ${isMovable ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_20px_#ffffff] z-30 cursor-pointer" : ""}`}>{t.isHome ? "🏆" : t.stepCount > 0 ? t.id + 1 : `●`}</button>;
                      })}
                    </div>
                  </div>
                );
              }
              if (r < 6 && c >= 9 && r === 0 && c === 9) {
                return (
                  <div key={`${r}-${c}`} style={{ gridColumn: "span 6", gridRow: "span 6" }} className="p-3 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-950 border-2 border-emerald-500 rounded-tr-xl flex flex-col justify-between shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
                    <div className="flex justify-between items-center text-[10px] text-white font-black border-b border-emerald-400/40 pb-1"><span className="flex items-center gap-1">👑 GREEN BASE</span><span className="px-1.5 py-0.5 bg-black/40 rounded text-[9px]">{ludoState.tokens.GREEN?.filter((t) => t.isHome).length}/4 HOME</span></div>
                    <div className="grid grid-cols-2 gap-3 place-items-center p-2 bg-black/30 rounded-xl border border-emerald-500/30">
                      {(ludoState.tokens.GREEN || []).map((t) => {
                        const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "GREEN";
                        return <button key={t.id} type="button" disabled={!isMovable} onClick={() => handleMove(t.id)} className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all relative ${t.isHome ? "bg-amber-400 text-black border-2 border-white shadow-[0_0_15px_#fbbf24]" : t.stepCount > 0 ? "bg-gradient-to-br from-emerald-400 to-emerald-800 text-white border-2 border-white shadow-lg" : "bg-gradient-to-br from-emerald-500 to-emerald-900 text-white border-2 border-emerald-300 shadow-md"} ${isMovable ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_20px_#ffffff] z-30 cursor-pointer" : ""}`}>{t.isHome ? "🏆" : t.stepCount > 0 ? t.id + 1 : `●`}</button>;
                      })}
                    </div>
                  </div>
                );
              }
              if (r >= 9 && c < 6 && r === 9 && c === 0) {
                return (
                  <div key={`${r}-${c}`} style={{ gridColumn: "span 6", gridRow: "span 6" }} className="p-3 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-950 border-2 border-blue-500 rounded-bl-xl flex flex-col justify-between shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
                    <div className="flex justify-between items-center text-[10px] text-white font-black border-b border-blue-400/40 pb-1"><span className="flex items-center gap-1">👑 BLUE BASE</span><span className="px-1.5 py-0.5 bg-black/40 rounded text-[9px]">{ludoState.tokens.BLUE?.filter((t) => t.isHome).length}/4 HOME</span></div>
                    <div className="grid grid-cols-2 gap-3 place-items-center p-2 bg-black/30 rounded-xl border border-blue-500/30">
                      {(ludoState.tokens.BLUE || []).map((t) => {
                        const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "BLUE";
                        return <button key={t.id} type="button" disabled={!isMovable} onClick={() => handleMove(t.id)} className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all relative ${t.isHome ? "bg-amber-400 text-black border-2 border-white shadow-[0_0_15px_#fbbf24]" : t.stepCount > 0 ? "bg-gradient-to-br from-cyan-400 to-blue-800 text-white border-2 border-white shadow-lg" : "bg-gradient-to-br from-blue-500 to-blue-900 text-white border-2 border-blue-300 shadow-md"} ${isMovable ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_20px_#ffffff] z-30 cursor-pointer" : ""}`}>{t.isHome ? "🏆" : t.stepCount > 0 ? t.id + 1 : `●`}</button>;
                      })}
                    </div>
                  </div>
                );
              }
              if (r >= 9 && c >= 9 && r === 9 && c === 9) {
                return (
                  <div key={`${r}-${c}`} style={{ gridColumn: "span 6", gridRow: "span 6" }} className="p-3 bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-950 border-2 border-amber-400 rounded-br-xl flex flex-col justify-between shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
                    <div className="flex justify-between items-center text-[10px] text-white font-black border-b border-amber-400/40 pb-1"><span className="flex items-center gap-1">👑 YELLOW BASE</span><span className="px-1.5 py-0.5 bg-black/40 rounded text-[9px]">{ludoState.tokens.YELLOW?.filter((t) => t.isHome).length}/4 HOME</span></div>
                    <div className="grid grid-cols-2 gap-3 place-items-center p-2 bg-black/30 rounded-xl border border-amber-500/30">
                      {(ludoState.tokens.YELLOW || []).map((t) => {
                        const isMovable = validTokenIdsToMove.includes(t.id) && myTeam === "YELLOW";
                        return <button key={t.id} type="button" disabled={!isMovable} onClick={() => handleMove(t.id)} className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all relative ${t.isHome ? "bg-amber-400 text-black border-2 border-white shadow-[0_0_15px_#fbbf24]" : t.stepCount > 0 ? "bg-gradient-to-br from-amber-200 to-yellow-700 text-black border-2 border-white shadow-lg" : "bg-gradient-to-br from-yellow-400 to-amber-700 text-black border-2 border-amber-200 shadow-md"} ${isMovable ? "ring-4 ring-white animate-bounce scale-110 shadow-[0_0_20px_#ffffff] z-30 cursor-pointer" : ""}`}>{t.isHome ? "🏆" : t.stepCount > 0 ? t.id + 1 : `●`}</button>;
                      })}
                    </div>
                  </div>
                );
              }
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8 && r === 6 && c === 6) {
                return (
                  <div key={`${r}-${c}`} style={{ gridColumn: "span 3", gridRow: "span 3" }} className="relative bg-black flex items-center justify-center border-2 border-amber-400/80 shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-emerald-600/60 to-transparent [clip-path:polygon(0_0,100%_0,50%_100%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-600/60 to-transparent [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-red-600/60 to-transparent [clip-path:polygon(0_0,100%_50%,0_100%)]" />
                    <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-amber-500/60 to-transparent [clip-path:polygon(100%_0,0_50%,100%_100%)]" />
                    <div className="relative z-10 flex flex-col items-center justify-center p-1 text-center animate-pulse"><Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" /><span className="text-[8px] font-black uppercase tracking-widest text-amber-300">VICTORY</span></div>
                  </div>
                );
              }
              if (r < 6 && c < 6 || r < 6 && c >= 9 || r >= 9 && c < 6 || r >= 9 && c >= 9 || (r >= 6 && r <= 8 && c >= 6 && c <= 8)) return null;
              
              const tokensOnCell = getTokensAtCell(r, c);
              const isStarCell = (r === 6 && c === 1) || (r === 2 && c === 6) || (r === 1 && c === 8) || (r === 6 && c === 12) || (r === 8 && c === 13) || (r === 12 && c === 8) || (r === 13 && c === 6) || (r === 8 && c === 2);
              const isRedPath = r === 7 && c >= 1 && c <= 5;
              const isGreenPath = c === 7 && r >= 1 && r <= 5;
              const isYellowPath = r === 7 && c >= 9 && c <= 13;
              const isBluePath = c === 7 && r >= 9 && r <= 13;
              let cellStyle = "bg-[#fffdf7] border-[#d8c3a5]";
              if (isRedPath) cellStyle = "bg-gradient-to-r from-red-500 to-rose-700 border-red-400 text-white font-black";
              else if (isGreenPath) cellStyle = "bg-gradient-to-b from-emerald-500 to-green-700 border-emerald-400 text-white font-black";
              else if (isYellowPath) cellStyle = "bg-gradient-to-l from-amber-400 to-yellow-600 border-amber-300 text-black font-black";
              else if (isBluePath) cellStyle = "bg-gradient-to-t from-blue-500 to-indigo-700 border-blue-400 text-white font-black";
              else if (isStarCell) cellStyle = "bg-amber-50 border-amber-300 shadow-inner";
              return (
                <div key={`${r}-${c}`} className={`relative flex items-center justify-center ${cellStyle} border transition-colors select-none`}>
                  {isStarCell && <span className="text-amber-500 text-[11px] font-black drop-shadow-sm select-none">★</span>}
                  {tokensOnCell.map((tok, idx) => {
                    const isMovable = validTokenIdsToMove.includes(tok.id) && myTeam === tok.color;
                    const meta = THEME_CONFIG[tok.color];
                    const count = tokensOnCell.length;
                    const stackOffset = count > 1 ? (idx - (count - 1) / 2) * 4 : 0;
                    return (
                      <button key={`${tok.color}-${tok.id}`} type="button" disabled={!isMovable} onClick={() => handleMove(tok.id)} style={{ transform: `translate(${stackOffset}px, ${stackOffset}px)`, zIndex: 10 + idx }} className={`absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full font-black text-[10px] flex items-center justify-center transition-all bg-gradient-to-br ${meta.tokenGradient} text-white border-2 border-white shadow-lg ${isMovable ? "ring-4 ring-white animate-bounce scale-125 shadow-[0_0_20px_#ffffff] z-30 cursor-pointer" : ""}`}>{tok.id + 1}</button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-2 border-amber-500/40 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 border-2 border-neutral-800 rounded-2xl bg-gradient-to-b from-white via-amber-50 to-neutral-200 flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.8),_inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all ${rolling ? "animate-spin scale-110" : ""}`}>{renderDiceFace(roll)}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase text-white">{isMyTurn ? !ludoState.hasRolled ? "YOUR TURN: ROLL THE DIE" : hasValidMoves ? "TAP YOUR GLOWING GOTI TO MOVE" : "NO VALID MOVES FOR THIS ROLL" : `WAITING FOR ${ludoState.currentTurn} TO ROLL`}</span>
            </div>
            <p className="text-[11px] text-neutral-400">{roll === 6 ? "🎉 ROLLED A 6: Deploy goti onto track + BONUS TURN!" : isMyTurn && ludoState.hasRolled ? `Rolled a ${roll}. Choose which goti to advance.` : "Land on opponent gotis to send them home! Safe stars (★) protect you."}</p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          {isMyTurn ? !ludoState.hasRolled ? <button type="button" disabled={rolling} onClick={handleRoll} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase rounded-xl transition-all active:scale-95 cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2"><Dices className="w-4 h-4 text-black" /><span>{rolling ? "ROLLING DIE..." : "[ ROLL 3D DIE 🎲 ]"}</span></button> : hasValidMoves ? <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-xs uppercase rounded-xl animate-pulse flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /><span>TAP GLOWING GOTI ON BOARD</span></div> : <button type="button" onClick={handlePassTurn} className="w-full sm:w-auto px-6 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-neutral-300 font-bold text-xs uppercase rounded-xl cursor-pointer">[ PASS TURN ]</button> : <div className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-500 font-bold text-xs uppercase rounded-xl">OPPONENT TURN...</div>}
        </div>
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 LUDO GRANDMASTER VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? "YOU DOMINATED THE BOARD AND REACHED HOME FIRST!"
              : `Match concluded! All 4 gotis reached home.`}
          </p>
          {onRematch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRematch}
                className="px-6 py-2.5 border-2 border-amber-400 bg-amber-400 text-black hover:bg-amber-300 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto rounded-xl shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>[ 🔄 PLAY REMATCH ]</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
