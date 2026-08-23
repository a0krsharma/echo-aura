"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { throwHandCricketNumber, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Swords } from "lucide-react";

interface HandCricketGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function HandCricketGame({ match, currentUid }: HandCricketGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedNum, setSelectedNum] = useState<number | null>(null);

  const hcs = match.handCricketState;
  if (!hcs) return <div className="text-white font-mono p-4">Loading Hand Cricket...</div>;

  const isBatsman = currentUid === hcs.batsmanUid;

  const handleThrow = async (num: number) => {
    if (match.status === "FINISHED") return;
    setSelectedNum(num);
    soundSynth.playSnare();

    try {
      const result = await throwHandCricketNumber(match.id, currentUid, num);
      if (result.isOut) soundSynth.playBuzzer();
      else soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Swords className="w-4 h-4 text-emerald-400" />
          // HAND CRICKET [ ODD-EVEN 1-6 ]
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
            SCORE: {hcs.innings1Score} RUNS
          </span>
        </div>
      </div>

      {/* Scoreboard Matrix */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-4 rounded-xl shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            {isBatsman ? "YOU ARE BATTING 🏏" : "YOU ARE BOWLING 🎯"}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono">
            {hcs.innings1Score} <span className="text-sm text-neutral-400 font-normal">RUNS</span>
          </div>
        </div>

        {hcs.currentBatsmanChoice !== null && hcs.currentBowlerChoice !== null && (
          <div className="flex justify-center items-center gap-4 text-xs font-bold pt-2 border-t border-neutral-800">
            <div className="text-center">
              <span className="text-[9px] text-neutral-500 block">BAT THROW</span>
              <span className="text-lg text-emerald-400 font-mono font-black">[{hcs.currentBatsmanChoice}]</span>
            </div>
            <span className="text-neutral-600">VS</span>
            <div className="text-center">
              <span className="text-[9px] text-neutral-500 block">BOWL THROW</span>
              <span className="text-lg text-amber-400 font-mono font-black">[{hcs.currentBowlerChoice}]</span>
            </div>
          </div>
        )}
      </div>

      {/* 1-6 Finger Keypad */}
      <div className="space-y-2 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
        <span className="text-[10px] text-neutral-400 font-bold uppercase">
          CHOOSE FINGER NUMBER TO THROW (1-6):
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              disabled={match.status === "FINISHED"}
              onClick={() => handleThrow(num)}
              className="py-3 border-2 border-neutral-700 bg-black hover:border-white text-white font-black text-lg transition-all active:scale-95 cursor-pointer rounded-lg shadow-md"
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Action Telemetry */}
      {hcs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{hcs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {hcs.lastActionLog || "INNINGS COMPLETED!"}
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
