"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  discardCheatBluff,
  challengeCheatBluff,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeCheatBluffBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, HelpCircle, AlertOctagon, Layers } from "lucide-react";

interface CheatBluffGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function CheatBluffGame({ match, currentUid }: CheatBluffGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const cbs = match.cheatBluffState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!cbs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === cbs.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeCheatBluffBotTurn(match);
    }
  }, [match, cbs?.currentTurnUid, cbs?.currentRank]);

  if (!cbs) return <div className="text-white font-mono p-4">Loading Cheat / Bluff Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = cbs.currentTurnUid === currentUid && match.status === "PLAYING";
  const canChallenge = cbs.lastDiscardCount > 0 && cbs.lastDiscarderUid !== currentUid && match.status === "PLAYING";

  const toggleSelect = (card: string) => {
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter((c) => c !== card));
    } else {
      if (selectedCards.length < 4) {
        setSelectedCards([...selectedCards, card]);
      }
    }
  };

  const handleDiscard = async () => {
    if (!isMyTurn || selectedCards.length === 0 || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      await discardCheatBluff(match.id, currentUid, cbs.currentRank, selectedCards);
      setSelectedCards([]);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleChallenge = async () => {
    if (!canChallenge || match.status === "FINISHED") return;
    soundSynth.playBuzzer();
    try {
      const res = await challengeCheatBluff(match.id, currentUid);
      if (res.wasLying) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // CHEAT / BLUFF [ I DOUBT IT PROTOCOL ]
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

      {/* Discard Pile & Active Claimed Rank HUD */}
      <div className="grid grid-cols-2 gap-3 bg-neutral-950 p-4 border-2 border-white rounded text-center">
        <div className="border border-neutral-800 p-2 rounded">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">REQUIRED RANK DECLARATION</span>
          <span className="text-2xl font-black text-white font-mono">{cbs.currentRank}s</span>
          <span className="text-[9px] text-neutral-500 block">YOU MUST CLAIM THIS RANK</span>
        </div>
        <div className="border border-neutral-800 p-2 rounded">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">DISCARD PILE COUNT</span>
          <span className="text-2xl font-black text-white font-mono">{cbs.pileCount} CARDS</span>
          <span className="text-[9px] text-neutral-500 block">FACE-DOWN IN CENTER</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!isMyTurn || selectedCards.length === 0 || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isMyTurn && selectedCards.length > 0
              ? "border-white bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>[ 🎴 DISCARD {selectedCards.length || ""} AS "{cbs.currentRank}s" ]</span>
        </button>

        <button
          type="button"
          onClick={handleChallenge}
          disabled={!canChallenge || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            canChallenge
              ? "border-red-500 bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse hover:scale-105"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>[ 🚨 CALL "CHEAT!" ]</span>
        </button>
      </div>

      {/* Hand Tray */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase font-bold text-white">YOUR HAND ({myHand.length} CARDS):</span>
          <span className="text-[10px]">SELECT 1 TO 4 CARDS TO DISCARD (HONEST OR BLUFF!)</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center bg-neutral-950 p-3 border-2 border-white rounded min-h-[110px] items-center">
          {myHand.map((card, idx) => {
            const isSelected = selectedCards.includes(card);
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => toggleSelect(card)}
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

      {/* Action Telemetry */}
      {cbs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{cbs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} EMPTIED HAND & WON!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 150} AURA POINTS
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
          <span>[ ❓ CHEAT RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="cheat_bluff"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
