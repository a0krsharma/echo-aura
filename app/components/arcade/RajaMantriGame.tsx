"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { guessRajaMantriChor, type ArcadeMatch } from "@/lib/arcade";
import { executeRajaMantriBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Crown, Scroll, HelpCircle } from "lucide-react";

interface RajaMantriGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function RajaMantriGame({ match, currentUid, isHost }: RajaMantriGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rms = match.rajaMantriState;

  // Trigger AI Mantri Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!rms || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    executeRajaMantriBotTurn(match);
  }, [match, rms?.phase]);

  if (!rms) return <div className="text-white font-mono p-4">Loading Paper Chits...</div>;

  const chits: Record<string, string> = JSON.parse(rms.chitsStr || "{}");
  const myRole = chits[currentUid] || "MANTRI";
  const isMantri = myRole === "MANTRI";
  const isResolved = rms.phase === "RESOLVED";

  const handleSuspectClick = async (suspectUid: string) => {
    if (!isMantri || isResolved || suspectUid === currentUid || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await guessRajaMantriChor(match.id, currentUid, suspectUid);
      if (result.correct) soundSynth.playFanfare();
      else soundSynth.playBuzzer();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-400" />
          // RAJA MANTRI CHOR SIPAHI [ PAPER CHITS ]
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
            YOUR CHIT: {myRole}
          </span>
        </div>
      </div>

      {/* Folded Paper Chit Display */}
      <div className="border-4 border-amber-950 bg-neutral-950 p-6 text-center space-y-4 rounded-2xl shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Scroll className="w-3.5 h-3.5" />
            <span>YOUR SECRET FOLDED PAPER CHIT</span>
          </span>
          <div className="inline-block p-4 border-2 border-amber-400 bg-black text-amber-300 font-black text-2xl uppercase tracking-widest rounded-xl shadow-lg animate-pulse">
            📜 {myRole}
          </div>
        </div>

        <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
          {myRole === "RAJA" && "👑 You are Raja (1000 pts)! Speak on mic: 'MERA MANTRI KAUN? CHOR KA PATA LAGAO!'"}
          {myRole === "MANTRI" && "🕵️ You are Mantri (800 pts)! Interrogate other nodes on voice & tap the suspect Chor below!"}
          {myRole === "SIPAHI" && "🛡️ You are Sipahi (500 pts)! Bluff smoothly so the Mantri doesn't confuse you with the Chor."}
          {myRole === "CHOR" && "🎭 You are Chor (0 pts / 800 if you escape)! Act innocent on mic and deceive the Mantri!"}
        </p>
      </div>

      {/* Node Suspect Selection for Mantri */}
      {isMantri && !isResolved && (
        <div className="space-y-2 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">
            MANTRI ACTION: TAP THE NODE YOU SUSPECT IS THE CHOR:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(match.players || {}).map(([uid, p]) => {
              if (uid === currentUid) return null;
              return (
                <button
                  key={uid}
                  type="button"
                  onClick={() => handleSuspectClick(uid)}
                  className="p-3 border-2 border-neutral-700 bg-black hover:border-amber-400 text-white font-extrabold text-xs uppercase transition-all cursor-pointer rounded-lg text-left"
                >
                  <div className="text-white font-bold">{p.handle}</div>
                  <div className="text-[9px] text-amber-400">[ ACCUSE CHOR ➔ ]</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Telemetry */}
      {rms.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{rms.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {rms.lastActionLog || "CHIT ROUND RESOLVED!"}
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +200 AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ RAJA MANTRI RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="raja_mantri"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
