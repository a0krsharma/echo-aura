"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { betPoker, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, CircleDollarSign } from "lucide-react";

interface PokerGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function PokerGame({ match, currentUid }: PokerGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const ps = match.pokerState;
  if (!ps) return <div className="text-white font-mono p-4">Loading Poker Table...</div>;

  const isMyTurn = ps.currentTurnUid === currentUid && match.status === "PLAYING";
  const myCards = ps.playerHands[currentUid] || ["A♠", "K♥"];

  const handleAction = async (action: "CHECK" | "CALL" | "RAISE" | "FOLD") => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await betPoker(match.id, currentUid, action, 20);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <CircleDollarSign className="w-4 h-4 text-emerald-400" />
          // TEXAS HOLD'EM [ CYPHER POKER ]
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
            POT: ${ps.pot} | {isMyTurn ? "● YOUR BET" : "WAITING"}
          </span>
        </div>
      </div>

      {/* Poker Felt Layout */}
      <div className="relative border-4 border-emerald-950 bg-emerald-950/20 p-6 text-center space-y-6 shadow-2xl rounded-3xl">
        {/* Community Cards */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            COMMUNITY FLOP / TURN / RIVER
          </span>
          <div className="flex justify-center gap-2">
            {ps.communityCards.map((card, i) => (
              <div
                key={i}
                className="w-12 h-18 sm:w-14 sm:h-20 border-2 border-white bg-white text-black font-extrabold text-sm sm:text-base flex items-center justify-center rounded-lg shadow-lg shadow-white/10"
              >
                {card}
              </div>
            ))}
          </div>
        </div>

        {/* Player Hole Cards */}
        <div className="space-y-2 pt-2 border-t border-emerald-900/40">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            YOUR HOLE CARDS (PRIVATE)
          </span>
          <div className="flex justify-center gap-2">
            {myCards.map((card, i) => (
              <div
                key={i}
                className="w-12 h-18 sm:w-14 sm:h-20 border-2 border-emerald-400 bg-black text-emerald-300 font-extrabold text-sm sm:text-base flex items-center justify-center rounded-lg shadow-md"
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Betting Action Controls */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("CHECK")}
          className="py-2.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          [ CHECK ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("CALL")}
          className="py-2.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          [ CALL ${ps.currentBet} ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("RAISE")}
          className="py-2.5 border-2 border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer shadow-lg"
        >
          [ RAISE +$20 ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("FOLD")}
          className="py-2.5 border border-red-800 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          [ FOLD ]
        </button>
      </div>

      {/* Action Telemetry */}
      {ps.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ps.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} WON THE POKER POT (${ps.pot})!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{ps.pot} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
