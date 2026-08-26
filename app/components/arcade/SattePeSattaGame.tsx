"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  playSattePeSattaCard,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeSattePeSattaBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle, Heart, Flame } from "lucide-react";

interface SattePeSattaGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function SattePeSattaGame({ match, currentUid }: SattePeSattaGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const sps = match.sattePeSattaState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!sps || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === sps.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeSattePeSattaBotTurn(match);
    }
  }, [match, sps?.currentTurnUid]);

  if (!sps) return <div className="text-white font-mono p-4">Loading Satte Pe Satta Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(sps.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = sps.currentTurnUid === currentUid && match.status === "PLAYING";

  const handlePlayCard = async (card: string) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      const result = await playSattePeSattaCard(match.id, currentUid, card);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // SATTE PE SATTA [ 7 OF HEARTS ARENA ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE 🎙️ ]</span>
          </button>
          <span className={`px-2.5 py-1 border-2 font-black uppercase text-[10px] ${
            isMyTurn ? "border-white bg-white text-black animate-pulse" : "border-neutral-700 bg-black text-neutral-400"
          }`}>
            {isMyTurn ? "● YOUR TURN" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* 4 Suit Layout Grid (♠, ♥, ♦, ♣) */}
      <div className="border-2 border-white bg-neutral-950 p-3 rounded space-y-2">
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center">
          TABLE LAYOUT (EXPAND FROM 7 UPWARD ➔ K & DOWNWARD ➔ A)
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["♠", "♥", "♦", "♣"].map((suit) => {
            const isRed = suit === "♥" || suit === "♦";
            return (
              <div key={suit} className="border border-neutral-800 bg-black p-2.5 rounded text-center space-y-1">
                <span className={`text-2xl font-black block ${isRed ? "text-red-500" : "text-white"}`}>
                  {suit}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono block">SUIT {suit}</span>
                <div className="text-[9px] text-neutral-500 font-bold border border-neutral-800 px-1 py-0.5 rounded">
                  7 OPEN
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Hand Tray */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase font-bold text-white">YOUR HAND ({myHand.length} CARDS REMAINING):</span>
          <span className="text-[10px]">TAP A VALID CONNECTING CARD</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center bg-neutral-950 p-3 border-2 border-white rounded min-h-[110px] items-center">
          {myHand.map((card, idx) => {
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => handlePlayCard(card)}
                disabled={!isMyTurn || match.status === "FINISHED"}
                className={`w-10 h-16 sm:w-11 sm:h-18 rounded border-2 flex flex-col items-center justify-between p-1 font-black transition-all cursor-pointer ${
                  isMyTurn ? "hover:-translate-y-2 hover:border-white hover:ring-2 hover:ring-white" : "opacity-80"
                } ${
                  isRed ? "bg-black text-red-500 border-neutral-700" : "bg-black text-white border-neutral-700"
                }`}
              >
                <span className="text-[10px] self-start leading-none">{card.slice(0, -1)}</span>
                <span className="text-base sm:text-lg leading-none">{card.slice(-1)}</span>
                <span className="text-[10px] self-end leading-none">{card.slice(0, -1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Telemetry */}
      {sps.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{sps.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} SHED ALL CARDS & WON!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 150} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
