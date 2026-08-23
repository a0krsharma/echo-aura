"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { crossBingoNumber, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Hash, HelpCircle } from "lucide-react";

interface BingoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function BingoGame({ match, currentUid }: BingoGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const bs = match.bingoState;
  if (!bs) return <div className="text-white font-mono p-4">Loading 25-Cross Bingo...</div>;

  const grids: Record<string, number[][]> = JSON.parse(bs.gridsStr || "{}");
  const myGrid: number[][] = grids[currentUid] || Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => r * 5 + c + 1)
  );

  const crossed = bs.crossedNumbers || [];
  const linesCount = Math.min(5, Math.floor(crossed.length / 3)); // Calculated lines
  const bingoLetters = ["B", "I", "N", "G", "O"];

  const handleCellClick = async (num: number) => {
    if (crossed.includes(num) || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await crossBingoNumber(match.id, currentUid, num);
      if (result.won) soundSynth.playFanfare();
      else soundSynth.playSubtlePop();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-emerald-400" />
          // BINGO [ 25-CROSS GRID ]
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
        </div>
      </div>

      {/* B-I-N-G-O Progress Meter */}
      <div className="flex justify-center gap-2">
        {bingoLetters.map((l, i) => {
          const isComplete = i < linesCount;
          return (
            <div
              key={l}
              className={`w-10 h-10 border-2 font-black text-base flex items-center justify-center rounded-lg transition-all ${
                isComplete
                  ? "bg-emerald-500 text-black border-emerald-300 ring-2 ring-emerald-300 scale-105"
                  : "bg-black text-neutral-600 border-neutral-800"
              }`}
            >
              {l}
            </div>
          );
        })}
      </div>

      {/* 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1.5 bg-neutral-950 p-3 border-2 border-neutral-800 rounded-xl shadow-2xl">
        {myGrid.flat().map((num, i) => {
          const isCrossed = crossed.includes(num);

          return (
            <button
              key={i}
              type="button"
              disabled={isCrossed || match.status === "FINISHED"}
              onClick={() => handleCellClick(num)}
              className={`h-12 border-2 text-xs font-black transition-all cursor-pointer rounded ${
                isCrossed
                  ? "bg-neutral-800 text-neutral-600 border-neutral-700 line-through opacity-50"
                  : "bg-black text-white border-neutral-700 hover:border-emerald-400 hover:scale-105"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Action Telemetry */}
      {bs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{bs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 B-I-N-G-O COMPLETED!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ BINGO RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="bingo"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
