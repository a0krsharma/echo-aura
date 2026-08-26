"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { slide15PuzzleTile, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, LayoutGrid, RefreshCw, HelpCircle } from "lucide-react";

interface Puzzle15GameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function Puzzle15Game({ match, currentUid }: Puzzle15GameProps) {
  const ps = match.puzzle15State;
  if (!ps) return <div className="text-white font-mono p-4">Loading 15-Puzzle...</div>;

  const tiles: number[] = JSON.parse(ps.tilesStr || "[]");

  const handleTileClick = async (index: number) => {
    if (ps.isWon || match.status === "FINISHED") return;
    soundSynth.playSubtlePop();

    try {
      const result = await slide15PuzzleTile(match.id, currentUid, index);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <LayoutGrid className="w-4 h-4 text-white" />
          // 15-PUZZLE [ SLIDING TILES ]
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            MOVES: {ps.moves}
          </span>
        </div>
      </div>

      {/* 4x4 Grid */}
      <div className="relative aspect-square max-w-[340px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-1.5 bg-black p-1.5">
          {tiles.map((num, idx) => {
            const isEmpty = num === 0;
            return (
              <button
                key={idx}
                type="button"
                disabled={isEmpty || ps.isWon || match.status === "FINISHED"}
                onClick={() => handleTileClick(idx)}
                className={`w-full h-full border-2 font-extrabold text-base sm:text-lg flex items-center justify-center transition-all ${
                  isEmpty
                    ? "border-transparent bg-transparent cursor-default"
                    : "border-white bg-neutral-900 hover:bg-white hover:text-black text-white cursor-pointer active:scale-95 shadow-md"
                }`}
              >
                {!isEmpty ? num : ""}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-neutral-400 text-center uppercase tracking-wider">
        TAP TILES ADJACENT TO THE EMPTY SLOT TO SLIDE THEM INTO 1-15 ORDER!
      </p>

      {/* Victory Declaration */}
      {ps.isWon && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 15-PUZZLE SOLVED IN {ps.moves} MOVES!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
