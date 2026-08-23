"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  revealMinesweeperCell,
  toggleMinesweeperFlag,
  type ArcadeMatch,
} from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Bomb, Flag, RefreshCw, Sparkles, Shield } from "lucide-react";

interface MinesweeperGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function MinesweeperGame({ match, currentUid }: MinesweeperGameProps) {
  const [flagMode, setFlagMode] = useState(false);

  const ms = match.minesweeperState;
  if (!ms) return <div className="text-white font-mono p-4">Loading Logic Matrix...</div>;

  const grid = JSON.parse(ms.gridStr || "[]");

  const handleCellClick = async (r: number, c: number) => {
    if (ms.isLost || ms.isWon || match.status === "FINISHED") return;

    if (flagMode) {
      soundSynth.playSubtlePop();
      await toggleMinesweeperFlag(match.id, r, c);
    } else {
      if (grid[r][c].flagged) return;
      try {
        const result = await revealMinesweeperCell(match.id, currentUid, r, c);
        if (result.isLost) {
          soundSynth.playBuzzer();
        } else if (result.isWon) {
          soundSynth.playFanfare();
        } else {
          soundSynth.playSubtlePop();
        }
      } catch (e) {
        soundSynth.playBuzzer();
      }
    }
  };

  const handleContextMenu = async (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    soundSynth.playSubtlePop();
    await toggleMinesweeperFlag(match.id, r, c);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Bomb className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // MINESWEEPER [ LOGIC BOMB CLEARING ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFlagMode(!flagMode)}
            className={`px-3 py-1 border-2 text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 cursor-pointer ${
              flagMode
                ? "border-white bg-white text-black ring-2 ring-white"
                : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-white"
            }`}
          >
            <Flag className="w-3 h-3" />
            <span>[ FLAG MODE: {flagMode ? "ON 🚩" : "OFF"} ]</span>
          </button>
        </div>
      </div>

      {/* 9x9 Mine Grid */}
      <div className="relative aspect-square max-w-[380px] sm:max-w-[420px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-1 bg-black p-1">
          {grid.map((row: any[], r: number) =>
            row.map((cell: any, c: number) => {
              const isRevealed = cell.revealed;
              const isFlagged = cell.flagged;
              const isMine = cell.mine;
              const count = cell.count;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => handleContextMenu(e, r, c)}
                  className={`w-full h-full border font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
                    isRevealed
                      ? isMine
                        ? "bg-white text-black font-black"
                        : "bg-neutral-900 border-neutral-800 text-white font-mono"
                      : "bg-neutral-950 border-neutral-700 hover:border-white hover:bg-neutral-900 cursor-pointer"
                  }`}
                >
                  {isFlagged ? (
                    "🚩"
                  ) : isRevealed ? (
                    isMine ? (
                      "💣"
                    ) : count > 0 ? (
                      count
                    ) : (
                      ""
                    )
                  ) : (
                    ""
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Status Messages */}
      {ms.isLost && (
        <div className="border-2 border-white bg-neutral-950 p-3 text-center space-y-1">
          <p className="text-white font-extrabold text-sm uppercase">💥 LOGIC BOMB DETONATED! MISSION FAILED.</p>
        </div>
      )}

      {ms.isWon && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 GRID SAFELY DISARMED!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +100 AURA POINTS
          </p>
        </div>
      )}

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
