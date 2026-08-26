"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  drawRummyCard,
  discardRummyCard,
  declareRummyHand,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeRummyBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Layers, HelpCircle, Shield, CheckCircle2, RefreshCw } from "lucide-react";

interface RummyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function RummyGame({ match, currentUid }: RummyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const rs = match.rummyState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!rs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === rs.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeRummyBotTurn(match);
    }
  }, [match, rs?.currentTurnUid, rs?.hasDrawn]);

  if (!rs) return <div className="text-white font-mono p-4">Loading Indian Rummy Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(rs.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = rs.currentTurnUid === currentUid && match.status === "PLAYING";
  const hasDrawn = rs.hasDrawn;

  const handleDraw = async (fromDiscard: boolean) => {
    if (!isMyTurn || hasDrawn || match.status === "FINISHED") return;
    soundSynth.playSubtlePop();
    try {
      await drawRummyCard(match.id, currentUid, fromDiscard);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleDiscard = async () => {
    if (!isMyTurn || !hasDrawn || !selectedCard || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      await discardRummyCard(match.id, currentUid, selectedCard);
      setSelectedCard(null);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleDeclare = async () => {
    if (!isMyTurn || !hasDrawn || !selectedCard || match.status === "FINISHED") return;
    soundSynth.playFanfare();
    try {
      await declareRummyHand(match.id, currentUid, selectedCard);
      setSelectedCard(null);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // INDIAN 13-CARD RUMMY [ PURE SEQUENCE PRO ]
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
            {isMyTurn ? (hasDrawn ? "● DISCARD OR DECLARE" : "● DRAW A CARD") : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* Wild Joker & Table Center */}
      <div className="grid grid-cols-3 gap-3 bg-neutral-950 p-3 border border-neutral-800 rounded text-center">
        {/* Closed Draw Deck */}
        <div
          onClick={() => handleDraw(false)}
          className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${
            isMyTurn && !hasDrawn
              ? "border-white bg-white/10 hover:bg-white/20 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse"
              : "border-neutral-800 bg-black opacity-60 cursor-not-allowed"
          }`}
        >
          <span className="text-2xl font-black mb-1">🂠</span>
          <span className="text-[10px] font-black uppercase text-white">CLOSED PILE</span>
          <span className="text-[9px] text-neutral-400">({rs.drawDeckCount} LEFT)</span>
        </div>

        {/* Wild Joker */}
        <div className="border-2 border-white bg-black p-3 flex flex-col items-center justify-center shadow-lg">
          <span className={`text-xl font-black mb-1 ${rs.wildJoker.includes("♥") || rs.wildJoker.includes("♦") ? "text-red-500" : "text-white"}`}>
            {rs.wildJoker}
          </span>
          <span className="text-[10px] font-black uppercase text-white">WILD JOKER</span>
          <span className="text-[9px] text-neutral-400">ALL {rs.wildJoker.slice(0, -1)}s ARE JOKERS</span>
        </div>

        {/* Open Discard Pile */}
        <div
          onClick={() => handleDraw(true)}
          className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${
            isMyTurn && !hasDrawn
              ? "border-white bg-white/10 hover:bg-white/20 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse"
              : "border-neutral-800 bg-black opacity-60 cursor-not-allowed"
          }`}
        >
          <span className={`text-xl font-black mb-1 ${rs.discardTop.includes("♥") || rs.discardTop.includes("♦") ? "text-red-500" : "text-white"}`}>
            {rs.discardTop}
          </span>
          <span className="text-[10px] font-black uppercase text-white">DISCARD PILE</span>
          <span className="text-[9px] text-neutral-400">DRAW OPEN</span>
        </div>
      </div>

      {/* 13-Card Hand Tray */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase font-bold text-white">YOUR 13 CARDS ({myHand.length} CARDS):</span>
          <span className="text-[10px]">TAP CARD TO SELECT ➔ DISCARD / DECLARE</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center bg-neutral-950 p-3 border-2 border-white rounded min-h-[110px] items-center">
          {myHand.map((card, idx) => {
            const isSelected = selectedCard === card;
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => setSelectedCard(isSelected ? null : card)}
                className={`w-10 h-16 sm:w-11 sm:h-18 rounded border-2 flex flex-col items-center justify-between p-1 font-black transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-black -translate-y-3 ring-4 ring-white shadow-2xl scale-105"
                    : isRed
                    ? "bg-black text-red-500 border-neutral-700 hover:border-white"
                    : "bg-black text-white border-neutral-700 hover:border-white"
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!isMyTurn || !hasDrawn || !selectedCard || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isMyTurn && hasDrawn && selectedCard
              ? "border-white bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <span>[ 🎴 DISCARD {selectedCard || "CARD"} ]</span>
        </button>

        <button
          type="button"
          onClick={handleDeclare}
          disabled={!isMyTurn || !hasDrawn || !selectedCard || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isMyTurn && hasDrawn && selectedCard
              ? "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>[ 🏆 DECLARE SHOW ]</span>
        </button>
      </div>

      {/* Action Telemetry */}
      {rs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{rs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} DECLARED A VALID SHOW & WON!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 200} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
