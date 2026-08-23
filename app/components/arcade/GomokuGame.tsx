"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { makeGomokuMove, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Grid } from "lucide-react";

interface GomokuGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function GomokuGame({ match, currentUid, isHost }: GomokuGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const gs = match.gomokuState;
  if (!gs) return <div className="text-white font-mono p-4">Loading Gomoku grid...</div>;

  const grid: (string | null)[][] = JSON.parse(gs.gridStr || "[]");
  const myColor = isHost ? "BLACK" : "WHITE";
  const isMyTurn = gs.currentTurn === myColor && match.status === "PLAYING";

  const handleCellClick = async (r: number, c: number) => {
    if (!isMyTurn || grid[r][c] !== null || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await makeGomokuMove(match.id, currentUid, r, c);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Grid className="w-4 h-4 text-white" />
          // GOMOKU [ FIVE IN A ROW ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            TURN: {gs.currentTurn} {isMyTurn ? "● (YOU)" : ""}
          </span>
        </div>
      </div>

      {/* 15x15 Matrix Grid */}
      <div className="relative aspect-square max-w-[420px] mx-auto border-4 border-white bg-neutral-950 p-1.5 shadow-2xl">
        <div className="w-full h-full grid grid-cols-15 grid-rows-15 gap-0.5 bg-neutral-900 p-1">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isLast = gs.lastMove && gs.lastMove[0] === r && gs.lastMove[1] === c;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={!isMyTurn || cell !== null || match.status === "FINISHED"}
                  onClick={() => handleCellClick(r, c)}
                  className={`w-full h-full border border-neutral-800 flex items-center justify-center transition-all ${
                    cell === "BLACK"
                      ? "bg-black text-white font-black"
                      : cell === "WHITE"
                      ? "bg-white text-black font-black"
                      : "hover:bg-neutral-800 cursor-pointer"
                  } ${isLast ? "ring-2 ring-emerald-400" : ""}`}
                >
                  {cell === "BLACK" ? "●" : cell === "WHITE" ? "○" : ""}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Telemetry */}
      {gs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{gs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CONNECTED 5 IN A ROW!
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
