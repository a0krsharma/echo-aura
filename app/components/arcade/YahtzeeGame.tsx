"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { rollYahtzeeDice, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Dices, Lock, HelpCircle } from "lucide-react";

interface YahtzeeGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function YahtzeeGame({ match, currentUid }: YahtzeeGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);

  const ys = match.yahtzeeState;
  if (!ys) return <div className="text-white font-mono p-4">Loading Dice Protocol...</div>;

  const isMyTurn = ys.currentTurnUid === currentUid && match.status === "PLAYING";

  const toggleLock = (index: number) => {
    const next = [...locked];
    next[index] = !next[index];
    setLocked(next);
    soundSynth.playSubtlePop();
  };

  const handleRoll = async () => {
    if (!isMyTurn || ys.rollsRemaining <= 0 || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await rollYahtzeeDice(match.id, currentUid, locked);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-emerald-400" />
          // YAHTZEE [ DICE PROTOCOL ]
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
            {ys.rollsRemaining} ROLLS LEFT
          </span>
        </div>
      </div>

      {/* 5 Dice Tray */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-4 rounded-xl shadow-2xl">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
          TAP DICE TO LOCK / UNLOCK BEFORE REROLL
        </span>

        <div className="flex justify-center gap-2 sm:gap-3">
          {ys.dice.map((val, i) => {
            const isLocked = locked[i];

            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleLock(i)}
                className={`w-12 h-14 sm:w-16 sm:h-18 border-2 flex flex-col items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer shadow-lg ${
                  isLocked
                    ? "bg-emerald-500 text-black border-emerald-300 ring-2 ring-emerald-300 scale-105"
                    : "bg-black text-white border-white hover:border-emerald-400"
                }`}
              >
                <div className="text-[9px] font-bold self-start">
                  {isLocked ? <Lock className="w-2.5 h-2.5" /> : `D${i + 1}`}
                </div>
                <span className="text-xl sm:text-2xl font-black">{val}</span>
                <span className="text-[8px] uppercase font-bold">{isLocked ? "LOCKED" : "ROLL"}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!isMyTurn || ys.rollsRemaining <= 0 || match.status === "FINISHED"}
          onClick={handleRoll}
          className="w-full max-w-xs py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer shadow-xl active:scale-95"
        >
          [ 🎲 REROLL UNLOCKED DICE ({ys.rollsRemaining} LEFT) ]
        </button>
      </div>

      {/* Action Telemetry */}
      {ys.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ys.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
