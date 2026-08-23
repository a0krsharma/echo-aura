"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { dropConnect4Token, type ArcadeMatch } from "@/lib/arcade";
import { executeConnect4BotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Zap, Share2, Sparkles, CircleDot } from "lucide-react";

interface Connect4GameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function Connect4Game({ match, currentUid }: Connect4GameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [droppingCol, setDroppingCol] = useState<number | null>(null);

  const c4 = match.connect4State;
  if (!c4) return <div className="text-white font-mono p-4">Loading Connect 4 grid...</div>;

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

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // CONNECT FOUR [ DATA-STREAM MATRIX ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border-2 border-white bg-white text-black font-extrabold uppercase text-[10px]">
            TURN: {c4.currentTurn} {isMyTurn ? "● (YOU)" : ""}
          </span>
        </div>
      </div>

      {/* Column Drop Buttons */}
      <div className="grid grid-cols-7 gap-1.5 max-w-[380px] sm:max-w-[420px] mx-auto">
        {Array.from({ length: 7 }).map((_, col) => {
          const isFull = grid[0][col] !== null;
          return (
            <button
              key={col}
              type="button"
              disabled={!isMyTurn || isFull || match.status === "FINISHED"}
              onClick={() => handleDrop(col)}
              className="py-1.5 border border-white/60 hover:border-white bg-neutral-950 hover:bg-white hover:text-black font-bold text-xs uppercase transition-all disabled:opacity-20 cursor-pointer text-center"
            >
              ▼
            </button>
          );
        })}
      </div>

      {/* 7x6 Matrix Grid */}
      <div className="relative aspect-[7/6] max-w-[380px] sm:max-w-[420px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-7 grid-rows-6 gap-2 bg-black p-2 border border-neutral-800">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isRed = cell === "RED";
              const isYellow = cell === "YELLOW";

              return (
                <div
                  key={`${r}-${c}`}
                  className="w-full h-full rounded-full border-2 border-neutral-800 bg-neutral-950 flex items-center justify-center relative overflow-hidden"
                >
                  {isRed && (
                    <div className="w-full h-full rounded-full bg-white text-black font-black flex items-center justify-center text-xs shadow-[0_0_10px_#fff]">
                      ●
                    </div>
                  )}
                  {isYellow && (
                    <div className="w-full h-full rounded-full bg-neutral-900 border-2 border-white text-white font-black flex items-center justify-center text-xs ring-1 ring-white">
                      ○
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Telemetry Log */}
      {c4.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{c4.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CONNECTED FOUR IN A ROW!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
