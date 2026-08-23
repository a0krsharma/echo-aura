"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { moveQuoridorPawn, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Shield } from "lucide-react";

interface QuoridorGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function QuoridorGame({ match, currentUid, isHost }: QuoridorGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const qs = match.quoridorState;
  if (!qs) return <div className="text-white font-mono p-4">Loading Firewall Runner...</div>;

  const isP1 = currentUid === match.hostUid;
  const isMyTurn = qs.currentTurnUid === currentUid && match.status === "PLAYING";

  const handleCellClick = async (r: number, c: number) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    const currentPos = isP1 ? qs.p1Pos : qs.p2Pos;

    // Check adjacent move
    const dist = Math.abs(currentPos[0] - r) + Math.abs(currentPos[1] - c);
    if (dist !== 1) {
      soundSynth.playBuzzer();
      return;
    }

    soundSynth.playSnare();
    try {
      const result = await moveQuoridorPawn(match.id, currentUid, r, c);
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
          <Shield className="w-4 h-4 text-emerald-400" />
          // QUORIDOR [ FIREWALL RUNNER ]
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
            {isMyTurn ? "● YOUR TURN" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* 9x9 Board */}
      <div className="relative aspect-square max-w-[380px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-1 bg-neutral-900 p-1">
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => {
              const isP1Here = qs.p1Pos[0] === r && qs.p1Pos[1] === c;
              const isP2Here = qs.p2Pos[0] === r && qs.p2Pos[1] === c;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={!isMyTurn || match.status === "FINISHED"}
                  onClick={() => handleCellClick(r, c)}
                  className={`w-full h-full border flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                    isP1Here
                      ? "bg-white text-black border-white ring-2 ring-white"
                      : isP2Here
                      ? "bg-emerald-500 text-black border-emerald-400 ring-2 ring-emerald-400"
                      : "bg-neutral-950 border-neutral-800 text-transparent hover:bg-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  {isP1Here ? "P1" : isP2Here ? "P2" : "·"}
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[10px] text-neutral-400 text-center uppercase tracking-wider">
        TAP AN ADJACENT CELL TO MOVE YOUR NODE TO THE OPPOSITE BASELINE!
      </p>

      {/* Action Telemetry */}
      {qs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{qs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} REACHED THE OPPOSITE FIREWALL & WON!
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
