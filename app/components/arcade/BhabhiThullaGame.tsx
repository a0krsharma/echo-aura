"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  playBhabhiCard,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeBhabhiBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, HelpCircle, ShieldAlert, DoorOpen } from "lucide-react";

interface BhabhiThullaGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function BhabhiThullaGame({ match, currentUid }: BhabhiThullaGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const bts = match.bhabhiThullaState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!bts || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === bts.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeBhabhiBotTurn(match);
    }
  }, [match, bts?.currentTurnUid]);

  if (!bts) return <div className="text-white font-mono p-4">Loading Bhabhi / Thulla Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(bts.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = bts.currentTurnUid === currentUid && match.status === "PLAYING";
  const hasEscaped = bts.escapedPlayers.includes(currentUid);

  const handlePlayCard = async (card: string) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      await playBhabhiCard(match.id, currentUid, card);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // BHABHI / THULLA [ GET AWAY PROTOCOL ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>
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

      {/* Escaped Players Status Bar */}
      <div className="flex items-center justify-between bg-neutral-950 p-3 border border-neutral-800 rounded">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] text-neutral-400 font-bold uppercase">
            ESCAPED (GOT AWAY): {bts.escapedPlayers.length > 0 ? bts.escapedPlayers.map(u => match.players[u]?.handle).join(", ") : "NONE YET"}
          </span>
        </div>
        {hasEscaped && (
          <span className="px-2 py-0.5 bg-emerald-400 text-black font-black text-[9px] uppercase rounded">
            YOU ESCAPED!
          </span>
        )}
      </div>

      {/* Hand Tray */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase font-bold text-white">YOUR HAND ({myHand.length} CARDS):</span>
          <span className="text-[10px]">THROW THULLA PENALTY IF VOID IN SUIT</span>
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
      {bts.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{bts.lastActionLog}</span>
        </div>
      )}

      {/* Victory / Defeat Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            {bts.bhabhiUid === currentUid ? "🚨 YOU ARE THE BHABHI!" : `🏆 ${match.winnerHandle} GOT AWAY & WON!`}
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            {bts.bhabhiUid ? `BHABHI: ${match.players[bts.bhabhiUid]?.handle}` : "ROUND COMPLETE"}
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-white text-white hover:bg-white hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ BHABHI RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="bhabhi_thulla"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
