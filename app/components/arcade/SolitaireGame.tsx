"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  drawSolitaireCard,
  type ArcadeMatch,
} from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle, Layers, RefreshCw } from "lucide-react";

interface SolitaireGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function SolitaireGame({ match, currentUid }: SolitaireGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const ss = match.solitaireState;

  if (!ss) return <div className="text-white font-mono p-4">Loading Solitaire Arena...</div>;

  const tableau: string[][] = JSON.parse(ss.tableauStr || "[[],[],[],[],[],[],[]]");
  const tableauFlipped: boolean[][] = JSON.parse(ss.tableauFlippedStr || "[[],[],[],[],[],[],[]]");
  const foundations: Record<string, string[]> = JSON.parse(ss.foundationsStr || "{}");
  const stockpile: string[] = JSON.parse(ss.stockpileStr || "[]");
  const waste: string[] = JSON.parse(ss.wasteStr || "[]");

  const topWaste = waste.length > 0 ? waste[waste.length - 1] : null;

  const handleDraw = async () => {
    soundSynth.playSubtlePop();
    try {
      await drawSolitaireCard(match.id, currentUid);
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
            // KLONDIKE SOLITAIRE [ 7-COLUMN MATRIX ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 border border-neutral-700 bg-black font-bold uppercase text-[10px] text-neutral-300">
            MOVES: {ss.moves}
          </span>
        </div>
      </div>

      {/* Top Row: Stockpile, Waste & 4 Foundations */}
      <div className="grid grid-cols-6 gap-2 bg-neutral-950 p-3 border-2 border-white rounded items-center text-center">
        {/* Stockpile */}
        <div
          onClick={handleDraw}
          className="border-2 border-white bg-black hover:bg-white/20 p-2 rounded flex flex-col items-center justify-center cursor-pointer transition-all h-20 active:scale-95"
        >
          <span className="text-xl">🂠</span>
          <span className="text-[9px] font-black uppercase mt-1">STOCK ({stockpile.length})</span>
        </div>

        {/* Waste */}
        <div className="border border-neutral-800 bg-black p-2 rounded flex flex-col items-center justify-center h-20">
          {topWaste ? (
            <span className={`text-base font-black ${topWaste.includes("♥") || topWaste.includes("♦") ? "text-red-500" : "text-white"}`}>
              {topWaste}
            </span>
          ) : (
            <span className="text-[9px] text-neutral-600">EMPTY</span>
          )}
          <span className="text-[9px] font-mono text-neutral-400 mt-1">WASTE</span>
        </div>

        {/* 4 Foundations */}
        {["♠", "♥", "♦", "♣"].map((suit) => {
          const pile = foundations[suit] || [];
          const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
          const isRed = suit === "♥" || suit === "♦";
          return (
            <div key={suit} className="border border-neutral-800 bg-black p-1.5 rounded flex flex-col items-center justify-center h-20">
              <span className={`text-sm font-black ${isRed ? "text-red-500" : "text-white"}`}>
                {topCard || suit}
              </span>
              <span className="text-[8px] text-neutral-500 font-mono mt-1">{pile.length}/13</span>
            </div>
          );
        })}
      </div>

      {/* 7 Tableau Columns */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center">
          TABLEAU (ALTERNATING RED/BLACK DESCENDING)
        </div>
        <div className="grid grid-cols-7 gap-1 bg-neutral-950 p-2 border border-neutral-800 rounded min-h-[180px]">
          {tableau.map((col, cIdx) => (
            <div key={cIdx} className="flex flex-col gap-1 items-center">
              <span className="text-[9px] font-mono text-neutral-600">COL {cIdx + 1}</span>
              {col.length === 0 ? (
                <div className="w-full h-12 border border-dashed border-neutral-800 rounded flex items-center justify-center text-[8px] text-neutral-600">
                  K
                </div>
              ) : (
                col.map((card, rIdx) => {
                  const isFlipped = tableauFlipped[cIdx]?.[rIdx];
                  const isRed = card.includes("♥") || card.includes("♦");
                  return (
                    <div
                      key={rIdx}
                      className={`w-full py-1.5 px-0.5 rounded border text-center font-black text-[10px] ${
                        isFlipped
                          ? isRed
                            ? "bg-white text-red-600 border-red-400 shadow"
                            : "bg-white text-black border-black shadow"
                          : "bg-black text-neutral-600 border-neutral-800"
                      }`}
                    >
                      {isFlipped ? card : "🂠"}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Telemetry */}
      {ss.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{ss.lastActionLog}</span>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
