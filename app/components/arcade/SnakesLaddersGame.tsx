"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { rollSnakesLaddersDice, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Dices } from "lucide-react";

interface SnakesLaddersGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const SHORTCUTS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91, // Ladders
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78, // Snakes
};

export default function SnakesLaddersGame({ match, currentUid }: SnakesLaddersGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolling, setRolling] = useState(false);

  const sl = match.snakesLaddersState;
  if (!sl) return <div className="text-white font-mono p-4">Loading Circuit Jumpers...</div>;

  const positions: Record<string, number> = JSON.parse(sl.positionsStr || "{}");
  const isMyTurn = sl.currentTurnUid === currentUid && match.status === "PLAYING";

  const handleRoll = async () => {
    if (!isMyTurn || rolling || match.status === "FINISHED") return;
    setRolling(true);
    soundSynth.playSnare();

    try {
      const result = await rollSnakesLaddersDice(match.id, currentUid);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-emerald-400" />
          // SNAKES & LADDERS [ CIRCUIT JUMPERS ]
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
            {isMyTurn ? "● YOUR ROLL" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* 10x10 Circuit Grid */}
      <div className="relative aspect-square max-w-[380px] sm:max-w-[420px] mx-auto border-4 border-white bg-neutral-950 p-1.5 shadow-2xl">
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5 bg-neutral-900 p-0.5">
          {Array.from({ length: 10 }).map((_, rIdx) => {
            const r = 9 - rIdx;
            return Array.from({ length: 10 }).map((_, cIdx) => {
              const c = r % 2 === 1 ? 9 - cIdx : cIdx;
              const cellNum = r * 10 + c + 1;
              const hasLadder = SHORTCUTS[cellNum] && SHORTCUTS[cellNum] > cellNum;
              const hasSnake = SHORTCUTS[cellNum] && SHORTCUTS[cellNum] < cellNum;

              // Check if any player is on this cell
              const playersOnCell = Object.entries(positions).filter(([_, pos]) => pos === cellNum);

              return (
                <div
                  key={cellNum}
                  className={`w-full h-full border border-neutral-800 flex flex-col items-center justify-between p-0.5 text-[8px] sm:text-[9px] relative ${
                    cellNum === 100
                      ? "bg-emerald-950 text-emerald-300 font-extrabold"
                      : (r + c) % 2 === 1
                      ? "bg-neutral-950"
                      : "bg-black"
                  }`}
                >
                  <span className="text-neutral-500 font-mono self-start">{cellNum}</span>

                  {hasLadder && (
                    <span className="text-[7px] text-emerald-400 font-bold leading-none">
                      ▲ {SHORTCUTS[cellNum]}
                    </span>
                  )}
                  {hasSnake && (
                    <span className="text-[7px] text-red-400 font-bold leading-none">
                      ▼ {SHORTCUTS[cellNum]}
                    </span>
                  )}

                  {playersOnCell.length > 0 && (
                    <div className="flex items-center gap-0.5 scale-90">
                      {playersOnCell.map(([uid]) => (
                        <div
                          key={uid}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold ${
                            uid === match.hostUid
                              ? "bg-white text-black ring-1 ring-white"
                              : "bg-emerald-400 text-black ring-1 ring-emerald-400"
                          }`}
                        >
                          {uid === match.hostUid ? "P1" : "P2"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Dice Action Bar */}
      <div className="flex items-center justify-between bg-neutral-950 p-3 border border-neutral-800">
        <div className="text-xs">
          <span className="text-neutral-400">LAST ROLL: </span>
          <span className="text-white font-extrabold text-base font-mono">
            {sl.lastDiceRoll ? `🎲 [ ${sl.lastDiceRoll} ]` : "NONE"}
          </span>
        </div>

        <button
          type="button"
          disabled={!isMyTurn || rolling || match.status === "FINISHED"}
          onClick={handleRoll}
          className="px-6 py-2.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer shadow-lg active:scale-95"
        >
          {rolling ? "ROLLING..." : "[ 🎲 ROLL DICE ]"}
        </button>
      </div>

      {/* Action Log */}
      {sl.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{sl.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} REACHED CELL 100 & WON!
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
