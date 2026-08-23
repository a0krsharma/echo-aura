"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { playUnoCard, drawUnoCard, type ArcadeMatch, type UnoCard } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Layers, HelpCircle, Download, AlertTriangle } from "lucide-react";

interface UnoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const COLOR_STYLES: Record<string, string> = {
  RED: "bg-red-600 text-white border-red-400 ring-1 ring-red-500",
  BLUE: "bg-blue-600 text-white border-blue-400 ring-1 ring-blue-500",
  GREEN: "bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-500",
  YELLOW: "bg-amber-400 text-black border-amber-300 ring-1 ring-amber-400",
  WILD: "bg-gradient-to-br from-red-600 via-emerald-600 to-blue-600 text-white border-purple-400 ring-2 ring-purple-400",
};

export default function UnoGame({ match, currentUid }: UnoGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wildCardToPlay, setWildCardToPlay] = useState<UnoCard | null>(null);
  const [hasCalledUno, setHasCalledUno] = useState(false);

  const us = match.unoState;
  if (!us) return <div className="text-white font-mono p-4">Loading Uno Matrix...</div>;

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = us.currentTurnUid === currentUid && match.status === "PLAYING";

  const handleCardClick = async (card: UnoCard) => {
    if (!isMyTurn || match.status === "FINISHED") return;

    // If Wild, open color selector
    if (card.color === "WILD") {
      setWildCardToPlay(card);
      soundSynth.playSubtlePop();
      return;
    }

    // Check legal play (matching color or value)
    const top = us.discardTop;
    const isLegal = card.color === top.color || card.value === top.value;
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

  const handleSelectWildColor = async (chosenColor: "RED" | "BLUE" | "GREEN" | "YELLOW") => {
    if (!wildCardToPlay) return;
    const card = wildCardToPlay;
    setWildCardToPlay(null);
    soundSynth.playSnare();

    try {
      const result = await playUnoCard(match.id, currentUid, card, chosenColor);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleDrawCard = async () => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSubtlePop();

    try {
      await drawUnoCard(match.id, currentUid);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleShoutUno = () => {
    setHasCalledUno(true);
    soundSynth.playAirhorn();
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-white" />
          // FLOW OVERRIDE [ UNO MATRIX ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2 py-0.5 border border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
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
          <span className={`px-2 py-0.5 border font-extrabold text-[10px] uppercase ${
            isMyTurn ? "border-emerald-400 bg-emerald-500 text-black animate-pulse" : "border-neutral-700 bg-black text-neutral-400"
          }`}>
            {isMyTurn ? "● YOUR TURN" : "WAITING FOR OPPONENT"}
          </span>
        </div>
      </div>

      {/* Opponent Hand Trackers */}
      <div className="flex items-center justify-center gap-4 text-xs font-bold bg-neutral-950 p-2.5 border border-neutral-800 rounded-xl flex-wrap">
        {Object.entries(match.players).map(([uid, p]) => {
          if (uid === currentUid) return null;
          const oppCount = (hands[uid] || []).length;
          return (
            <div key={uid} className="flex items-center gap-1.5 text-neutral-300">
              <span className="text-neutral-500">{p.handle}:</span>
              <span className="px-2 py-0.5 border border-neutral-700 bg-black text-white font-mono rounded">
                🎴 {oppCount} CARDS
              </span>
            </div>
          );
        })}
      </div>

      {/* Discard & Draw Deck Center Arena */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 flex items-center justify-center gap-8 rounded-2xl shadow-2xl">
        {/* Draw Deck */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] text-neutral-400 font-bold uppercase">DRAW PILE</span>
          <button
            type="button"
            disabled={!isMyTurn || match.status === "FINISHED"}
            onClick={handleDrawCard}
            className="w-20 h-28 border-2 border-white bg-neutral-900 hover:bg-neutral-800 text-white flex flex-col items-center justify-center rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-6 h-6 text-white mb-1" />
            <span className="text-[10px] font-black uppercase">DRAW</span>
          </button>
        </div>

        {/* Active Discard Top */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] text-neutral-400 font-bold uppercase">ACTIVE DISCARD TOP</span>
          <div
            className={`w-22 h-30 border-4 flex flex-col items-center justify-between p-2 rounded-xl shadow-2xl animate-pulse ${
              COLOR_STYLES[us.discardTop.color] || "bg-black text-white"
            }`}
          >
            <span className="font-black text-xs self-start">{us.discardTop.value}</span>
            <span className="font-black text-2xl">{us.discardTop.value}</span>
            <span className="font-black text-xs self-end">{us.discardTop.value}</span>
          </div>
        </div>
      </div>

      {/* Wild Color Picker Modal */}
      {wildCardToPlay && (
        <div className="bg-neutral-900 border-2 border-white p-4 rounded-xl space-y-3 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>SELECT ACTIVE COLOR FOR THE TABLE:</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["RED", "BLUE", "GREEN", "YELLOW"] as const).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => handleSelectWildColor(col)}
                className={`py-3 font-black text-xs uppercase rounded-lg border-2 shadow-lg transition-transform hover:scale-105 cursor-pointer ${
                  COLOR_STYLES[col]
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player Hand Zone */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white uppercase font-black">YOUR HAND ({myHand.length} CARDS):</span>
          {myHand.length <= 2 && !hasCalledUno && (
            <button
              type="button"
              onClick={handleShoutUno}
              className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase border border-red-400 rounded-full animate-bounce shadow-lg cursor-pointer"
            >
              [ 🚨 SHOUT UNO! ]
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center bg-neutral-950 p-4 border border-neutral-800 rounded-xl min-h-[120px]">
          {myHand.map((card, i) => {
            const top = us.discardTop;
            const isPlayable = isMyTurn && (card.color === "WILD" || card.color === top.color || card.value === top.value);

            return (
              <button
                key={i}
                type="button"
                disabled={!isMyTurn || match.status === "FINISHED"}
                onClick={() => handleCardClick(card)}
                className={`w-14 h-22 border-2 flex flex-col items-center justify-between p-1 rounded-lg transition-all cursor-pointer shadow-md ${
                  COLOR_STYLES[card.color] || "bg-black text-white border-white"
                } ${
                  isPlayable
                    ? "hover:-translate-y-2 hover:scale-105 ring-2 ring-white"
                    : "opacity-60 grayscale hover:grayscale-0"
                }`}
              >
                <span className="font-bold text-[9px] self-start">{card.value}</span>
                <span className="font-black text-sm">{card.value}</span>
                <span className="font-bold text-[9px] self-end">{card.value}</span>
              </button>
            );
          })}
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
            AWARDED +{match.stakes * 2 || 100} AURA POINTS
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
          <span>[ ❓ UNO RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="uno"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
