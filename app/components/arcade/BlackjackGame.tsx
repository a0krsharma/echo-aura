"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { playBlackjackAction, type ArcadeMatch } from "@/lib/arcade";
import { executeBlackjackBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, ShieldAlert, HelpCircle } from "lucide-react";

interface BlackjackGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function BlackjackGame({ match, currentUid }: BlackjackGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const bs = match.blackjackState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!bs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
    if (botPlayer) {
      executeBlackjackBotTurn(match);
    }
  }, [match, bs?.playerHands]);

  if (!bs) return <div className="text-white font-mono p-4">Loading Blackjack Table...</div>;

  const playerHand = bs.playerHands[currentUid] || ["10♠", "8♦"];
  const isPlaying = match.status === "PLAYING";

  const handleAction = async (action: "HIT" | "STAND" | "DOUBLE") => {
    if (!isPlaying || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await playBlackjackAction(match.id, currentUid, action);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          // BLACKJACK 21 [ DATA DEALER ]
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
            BET: ${bs.playerBets[currentUid] || 50}
          </span>
        </div>
      </div>

      {/* Table Area */}
      <div className="border-4 border-emerald-950 bg-emerald-950/20 p-5 text-center space-y-5 rounded-2xl">
        {/* Dealer Hand */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            AI DATA DEALER
          </span>
          <div className="flex justify-center gap-2">
            {bs.dealerHand.map((card, i) => (
              <div
                key={i}
                className="w-12 h-16 border-2 border-white bg-white text-black font-extrabold text-sm flex items-center justify-center rounded shadow-lg"
              >
                {card}
              </div>
            ))}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-2 pt-3 border-t border-emerald-900/40">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            YOUR HAND
          </span>
          <div className="flex justify-center gap-2">
            {playerHand.map((card, i) => (
              <div
                key={i}
                className="w-12 h-16 border-2 border-emerald-400 bg-black text-emerald-300 font-extrabold text-sm flex items-center justify-center rounded shadow-md"
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("HIT")}
          className="py-2.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer shadow-md"
        >
          [ HIT ]
        </button>
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("STAND")}
          className="py-2.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          [ STAND ]
        </button>
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("DOUBLE")}
          className="py-2.5 border border-emerald-500 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500 hover:text-black font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer"
        >
          [ DOUBLE ]
        </button>
      </div>

      {/* Action Log */}
      {bs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{bs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} BEAT THE DEALER!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{(bs.playerBets[currentUid] || 50) * 2} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ BLACKJACK RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="blackjack"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
