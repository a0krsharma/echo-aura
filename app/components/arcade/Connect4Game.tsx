"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { dropConnect4Token, type ArcadeMatch } from "@/lib/arcade";
import { executeConnect4BotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Zap,
  Share2,
  Sparkles,
  HelpCircle,
  Users,
  Crown,
  CircleDot,
  Flame,
} from "lucide-react";

interface Connect4GameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function Connect4Game({ match, currentUid }: Connect4GameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [droppingCol, setDroppingCol] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const c4 = match.connect4State;
  if (!c4) return <div className="text-white font-mono p-4">Loading Connect 4 Grid...</div>;

  const grid: (string | null)[][] = JSON.parse(c4.gridStr || "[]");
  const isHostPlayer = match.hostUid === currentUid;
  const myColor = isHostPlayer ? "RED" : "YELLOW";
  const isMyTurn = c4.currentTurn === myColor && match.status === "PLAYING";

  // Trigger Bot Turn
  useEffect(() => {
    if (match.status !== "PLAYING" || !c4) return;
    if (c4.currentTurn === "YELLOW") {
      const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
      if (botPlayer) {
        executeConnect4BotTurn(match);
      }
    }
  }, [c4?.currentTurn, match.status]);

  const handleDrop = async (col: number) => {
    if (!isMyTurn || droppingCol !== null || match.status === "FINISHED") return;
    if (grid[0][col] !== null) {
      soundSynth.playBuzzer();
      return;
    }

    setDroppingCol(col);
    soundSynth.playSubtlePop();
    try {
      const result = await dropConnect4Token(match.id, currentUid, col);
      if (result.won) {
        soundSynth.playFanfare();
      } else {
        soundSynth.playSnare();
      }
    } catch (e) {
      soundSynth.playBuzzer();
    } finally {
      setDroppingCol(null);
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-blue-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(59,130,246,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-blue-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            🔴
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-blue-400 tracking-wider">
                CONNECT 4 ARENA
              </span>
              <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-bold rounded">
                DELUXE 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{c4.currentTurn}</span> ({c4.currentTurn === "RED" ? "🔴 Red" : "🟡 Yellow"}) • {isMyTurn ? "YOUR MOVE" : "OPPONENT'S MOVE"}
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
            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="connect4" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
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
                console.error("Failed to take seat in Connect4:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Action Telemetry Log ── */}
      {c4.lastActionLog && (
        <div className="border border-blue-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-blue-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{c4.lastActionLog}</span>
        </div>
      )}

      {/* ── Column Drop Selectors ── */}
      <div className="grid grid-cols-7 gap-2 max-w-[380px] sm:max-w-[430px] mx-auto px-2">
        {Array.from({ length: 7 }).map((_, col) => {
          const isFull = grid[0][col] !== null;
          const isHovered = hoveredCol === col;
          return (
            <button
              key={col}
              type="button"
              disabled={!isMyTurn || isFull || match.status === "FINISHED"}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
              onClick={() => handleDrop(col)}
              className={`py-2 rounded-xl border-2 font-black text-sm transition-all flex flex-col items-center justify-center cursor-pointer shadow-md ${
                !isMyTurn || isFull
                  ? "border-neutral-800 bg-neutral-950 text-neutral-600 opacity-40 cursor-not-allowed"
                  : isHovered
                  ? "border-amber-400 bg-amber-500 text-black scale-105 shadow-[0_0_15px_#f59e0b]"
                  : "border-blue-500/60 bg-blue-950/40 text-blue-300 hover:border-white hover:bg-blue-600 hover:text-white"
              }`}
            >
              <span>▼</span>
            </button>
          );
        })}
      </div>

      {/* ── 3D Deluxe Upright Arcade Connect 4 Board ── */}
      <div className="relative aspect-[7/6] max-w-[380px] sm:max-w-[430px] mx-auto p-3 rounded-2xl bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-900 border-4 border-blue-400 shadow-[0_20px_50px_rgba(0,0,0,0.8),_inset_0_2px_8px_rgba(255,255,255,0.4)]">
        {/* Molded Grid Body */}
        <div className="w-full h-full grid grid-cols-7 grid-rows-6 gap-2 sm:gap-2.5 p-2 bg-gradient-to-b from-blue-800 to-blue-950 rounded-xl shadow-inner border border-blue-500/40">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isRed = cell === "RED";
              const isYellow = cell === "YELLOW";

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleDrop(c)}
                  className="w-full h-full rounded-full bg-neutral-950 border-2 border-blue-900/80 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden cursor-pointer"
                >
                  {isRed && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 via-red-600 to-rose-950 border-2 border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.7),_inset_0_2px_4px_rgba(255,255,255,0.6)] animate-in zoom-in-50" />
                  )}
                  {isYellow && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-700 border-2 border-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.7),_inset_0_2px_4px_rgba(255,255,255,0.8)] animate-in zoom-in-50" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 4-IN-A-ROW VICTORY SECURED!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You connected 4 in a row and won +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
