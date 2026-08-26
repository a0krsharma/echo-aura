"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { tipPitcherVolts, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Mic, Zap, HelpCircle } from "lucide-react";

interface PitchArenaGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function PitchArenaGame({ match, currentUid }: PitchArenaGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const ps = match.pitchArenaState;
  if (!ps) return <div className="text-white font-mono p-4">Loading Pitch Arena...</div>;

  const isPitcher = ps.currentPitcherUid === currentUid;
  const myTippedVolts = ps.voltTips[ps.currentPitcherUid] || 0;

  const handleTip = async (volts: number) => {
    if (isPitcher || match.status === "FINISHED") return;
    soundSynth.playFanfare();

    try {
      await tipPitcherVolts(match.id, currentUid, volts);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          // PITCH ARENA [ DEFEND THE ABSURD ]
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
          <span className="px-2 py-0.5 border border-amber-400 bg-amber-950/40 text-amber-300 font-extrabold text-[10px]">
            ⚡ {myTippedVolts} VOLTS RAISED
          </span>
        </div>
      </div>

      {/* Absurd Prompt Arena Card */}
      <div className="border-4 border-amber-950 bg-neutral-950 p-6 text-center space-y-4 rounded-2xl shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Mic className="w-3.5 h-3.5" />
            <span>ABSURD STARTUP PROMPT TO DEFEND ON MIC</span>
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
            "{ps.absurdPrompt}"
          </h2>
        </div>

        <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
          {isPitcher
            ? "You have the live microphone! Give your serious investor sales pitch now."
            : "Listen to the live voice pitch. If they convince you, tip them Volts below!"}
        </p>
      </div>

      {/* Audience Volt Tipping */}
      {!isPitcher && (
        <div className="space-y-2 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">
            TIP AUDIENCE VOLTS FOR PERSUASIVE PITCHING:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTip(10)}
              className="py-2.5 border border-amber-500 bg-amber-950/40 text-amber-300 hover:bg-amber-500 hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer rounded"
            >
              +10 ⚡ VOLTS
            </button>
            <button
              type="button"
              onClick={() => handleTip(50)}
              className="py-2.5 border-2 border-amber-400 bg-amber-400 text-black hover:bg-amber-300 font-extrabold text-xs uppercase transition-all cursor-pointer rounded shadow-lg"
            >
              +50 ⚡ VOLTS
            </button>
            <button
              type="button"
              onClick={() => handleTip(100)}
              className="py-2.5 border border-amber-500 bg-amber-950/40 text-amber-300 hover:bg-amber-500 hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer rounded"
            >
              +100 ⚡ VOLTS
            </button>
          </div>
        </div>
      )}

      {/* Action Telemetry */}
      {ps.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ps.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
