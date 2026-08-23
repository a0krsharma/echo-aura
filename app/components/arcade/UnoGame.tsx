"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { playUnoCard, type ArcadeMatch, type UnoCard } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Layers } from "lucide-react";

interface UnoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const COLOR_STYLES: Record<string, string> = {
  RED: "bg-red-600 text-white border-red-400",
  BLUE: "bg-blue-600 text-white border-blue-400",
  GREEN: "bg-emerald-600 text-white border-emerald-400",
  YELLOW: "bg-amber-500 text-black border-amber-300",
  WILD: "bg-purple-700 text-white border-purple-400",
};

export default function UnoGame({ match, currentUid }: UnoGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const us = match.unoState;
  if (!us) return <div className="text-white font-mono p-4">Loading Uno Matrix...</div>;

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = us.currentTurnUid === currentUid && match.status === "PLAYING";

  const handlePlayCard = async (card: UnoCard) => {
    if (!isMyTurn || match.status === "FINISHED") return;

    // Check legal play (matching color or value or wild)
    const top = us.discardTop;
    const isLegal = card.color === "WILD" || card.color === top.color || card.value === top.value;
    if (!isLegal) {
      soundSynth.playBuzzer();
      return;
    }

    soundSynth.playSnare();
    try {
      const result = await playUnoCard(match.id, currentUid, card);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-white" />
          // FLOW OVERRIDE [ UNO MATRIX ]
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
            {isMyTurn ? "● YOUR PLAY" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* Discard Pile Zone */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 flex flex-col items-center justify-center space-y-3 rounded-2xl shadow-2xl">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
          ACTIVE DISCARD TOP
        </span>
        <div
          className={`w-20 h-28 border-4 flex flex-col items-center justify-between p-2 rounded-xl shadow-2xl ${
            COLOR_STYLES[us.discardTop.color] || "bg-black text-white"
          }`}
        >
          <span className="font-extrabold text-xs self-start">{us.discardTop.value}</span>
          <span className="font-black text-xl">{us.discardTop.value}</span>
          <span className="font-extrabold text-xs self-end">{us.discardTop.value}</span>
        </div>
      </div>

      {/* Player Hand Zone */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-400 uppercase font-bold">YOUR HAND ({myHand.length} CARDS):</span>
          <span className="text-[10px] text-neutral-500">TAP A MATCHING CARD TO PLAY</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
          {myHand.map((card, i) => (
            <button
              key={i}
              type="button"
              disabled={!isMyTurn || match.status === "FINISHED"}
              onClick={() => handlePlayCard(card)}
              className={`w-14 h-20 border-2 flex flex-col items-center justify-between p-1 rounded-lg transition-transform hover:-translate-y-2 cursor-pointer shadow-md disabled:opacity-40 ${
                COLOR_STYLES[card.color] || "bg-black text-white border-white"
              }`}
            >
              <span className="font-bold text-[10px] self-start">{card.value}</span>
              <span className="font-extrabold text-sm">{card.value}</span>
              <span className="font-bold text-[10px] self-end">{card.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Telemetry */}
      {us.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{us.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} EMPTIED THEIR HAND & WON!
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
