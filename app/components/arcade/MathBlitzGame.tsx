"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitMathBlitzAnswer, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Calculator, Delete } from "lucide-react";

interface MathBlitzGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function MathBlitzGame({ match, currentUid }: MathBlitzGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const mbs = match.mathBlitzState;
  if (!mbs) return <div className="text-white font-mono p-4">Loading Math Blitz...</div>;

  const prob = mbs.currentProblem;

  const handleDigit = (digit: string) => {
    if (inputVal.length < 5) {
      setInputVal(inputVal + digit);
      soundSynth.playSubtlePop();
    }
  };

  const handleClear = () => {
    setInputVal("");
    soundSynth.playSnare();
  };

  const handleSubmit = async () => {
    if (!inputVal || match.status === "FINISHED") return;
    const ans = parseInt(inputVal, 10);
    setInputVal("");

    try {
      const result = await submitMathBlitzAnswer(match.id, currentUid, ans);
      if (result.correct) soundSynth.playFanfare();
      else soundSynth.playBuzzer();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-emerald-400" />
          // MATRIX MATH BLITZ [ SPEED DUEL ]
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
            SCORE: {mbs.p1Score} PTS
          </span>
        </div>
      </div>

      {/* Problem Display */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-3 rounded-2xl shadow-2xl">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
          CALCULATE & ENTER ANSWER FAST
        </span>
        <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider">
          {prob.num1} {prob.op} {prob.num2} = ?
        </div>
        <div className="h-10 border-2 border-neutral-700 bg-black flex items-center justify-center font-black text-xl text-emerald-400 rounded">
          {inputVal || "—"}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 border border-neutral-800 rounded-xl">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="py-3 border-2 border-neutral-700 bg-black hover:border-white text-white font-black text-lg transition-all active:scale-95 cursor-pointer rounded-lg shadow-md"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="py-3 border-2 border-red-900 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white font-black text-sm uppercase transition-all cursor-pointer rounded-lg"
        >
          CLEAR
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="py-3 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase transition-all cursor-pointer rounded-lg shadow-lg"
        >
          ENTER
        </button>
      </div>

      {/* Action Telemetry */}
      {mbs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{mbs.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
