"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { selectCodenamesCard, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Shield, Eye, HelpCircle } from "lucide-react";

interface CodenamesGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  RED: "bg-red-900 border-red-500 text-white font-extrabold",
  BLUE: "bg-blue-900 border-blue-500 text-white font-extrabold",
  NEUTRAL: "bg-neutral-800 border-neutral-600 text-neutral-400 font-bold",
  ASSASSIN: "bg-black border-red-600 text-red-500 font-black ring-2 ring-red-600 animate-pulse",
};

export default function CodenamesGame({ match, currentUid, isHost }: CodenamesGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [isSpymasterView, setIsSpymasterView] = useState(false);

  const cs = match.codenamesState;
  if (!cs) return <div className="text-white font-mono p-4">Loading Codenames Grid...</div>;

  const handleCardClick = async (index: number) => {
    if (cs.revealed[index] || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await selectCodenamesCard(match.id, currentUid, index);
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
          // CODENAMES [ DECRYPTION GRID ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2 py-0.5 border border-white bg-black hover:bg-white hover:text-black font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSpymasterView(!isSpymasterView)}
            className={`px-2 py-0.5 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              isSpymasterView ? "bg-white text-black border-white" : "border-neutral-700 text-neutral-400"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>[ {isSpymasterView ? "HIDE KEY" : "SPYMASTER KEY"} ]</span>
          </button>
        </div>
      </div>

      {/* 5x5 Matrix */}
      <div className="grid grid-cols-5 gap-1.5 bg-neutral-950 p-3 border-2 border-neutral-800 rounded-xl shadow-2xl">
        {cs.words.map((word, i) => {
          const isRevealed = cs.revealed[i];
          const type = cs.cardTypes[i];
          const showColor = isRevealed || isSpymasterView;

          return (
            <button
              key={i}
              type="button"
              disabled={isRevealed || match.status === "FINISHED"}
              onClick={() => handleCardClick(i)}
              className={`h-14 sm:h-16 border p-1 flex flex-col items-center justify-center text-center text-[9px] sm:text-xs uppercase transition-all cursor-pointer rounded ${
                showColor
                  ? TYPE_STYLES[type] || "bg-neutral-800 text-white"
                  : "bg-neutral-900 border-neutral-700 text-white hover:border-white"
              }`}
            >
              <span className="font-extrabold">{word}</span>
              {isSpymasterView && !isRevealed && (
                <span className="text-[7px] text-neutral-400 font-mono">[{type}]</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Telemetry */}
      {cs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{cs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {cs.lastActionLog || "ROUND COMPLETED!"}
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="codenames"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
