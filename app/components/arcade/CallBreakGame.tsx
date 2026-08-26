"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  bidCallBreak,
  playCallBreakCard,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeCallBreakBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle, Shield, Award } from "lucide-react";

interface CallBreakGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function CallBreakGame({ match, currentUid }: CallBreakGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState(3);

  const cbs = match.callBreakState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!cbs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === cbs.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeCallBreakBotTurn(match);
    }
  }, [match, cbs?.currentTurnUid, cbs?.phase, cbs?.currentTrick?.length]);

  if (!cbs) return <div className="text-white font-mono p-4">Loading Call Break Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
  const myHand = hands[currentUid] || [];
  const isMyTurn = cbs.currentTurnUid === currentUid && match.status === "PLAYING";
  const myBid = cbs.bids[currentUid];
  const isBiddingPhase = cbs.phase === "BIDDING" && myBid === undefined;

  const handlePlaceBid = async (b: number) => {
    soundSynth.playSnare();
    try {
      await bidCallBreak(match.id, currentUid, b);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handlePlayCard = async (card: string) => {
    if (!isMyTurn || cbs.phase !== "PLAYING" || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      await playCallBreakCard(match.id, currentUid, card);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // CALL BREAK (LAKDI) [ SPADES TRUMP ]
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

      {/* Players Bids & Tricks HUD */}
      <div className="grid grid-cols-4 gap-2 bg-neutral-950 p-2.5 border border-neutral-800 rounded text-center">
        {Object.entries(match.players || {}).slice(0, 4).map(([uid, p]) => {
          const bid = cbs.bids?.[uid];
          const won = cbs.tricksWon?.[uid] || 0;
          const isPlayerTurn = cbs.currentTurnUid === uid;
          return (
            <div
              key={uid}
              className={`p-2 border rounded transition-all ${
                isPlayerTurn
                  ? "border-white bg-white text-black font-black"
                  : "border-neutral-800 bg-black text-neutral-300 font-bold"
              }`}
            >
              <div className="text-[10px] truncate">{p.handle}</div>
              <div className="text-xs font-mono font-black mt-0.5">
                BID: {bid !== undefined ? bid : "?"} | WON: {won}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center Trick Table */}
      <div className="border-2 border-white bg-neutral-950 p-4 rounded text-center space-y-3 min-h-[140px] flex flex-col justify-center items-center">
        <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
          ACTIVE TRICK (SPADES ♠ ARE PERMANENT TRUMPS)
        </span>
        <div className="flex gap-3 justify-center items-center">
          {cbs.currentTrick.length === 0 ? (
            <span className="text-xs text-neutral-500 italic">WAITING FOR LEADER TO PLAY CARD...</span>
          ) : (
            cbs.currentTrick.map((play, i) => {
              const isRed = play.card.includes("♥") || play.card.includes("♦");
              return (
                <div
                  key={i}
                  className={`w-12 h-16 rounded border-2 flex flex-col items-center justify-between p-1 font-black shadow-lg ${
                    isRed ? "bg-white text-red-600 border-red-400" : "bg-white text-black border-black"
                  }`}
                >
                  <span className="text-[10px] self-start leading-none">{play.card.slice(0, -1)}</span>
                  <span className="text-xl leading-none">{play.card.slice(-1)}</span>
                  <span className="text-[8px] truncate max-w-[40px]">{match.players?.[play.playerUid]?.handle || "@PLAYER"}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bidding Phase Selector */}
      {isBiddingPhase && (
        <div className="border-2 border-emerald-400 bg-emerald-950/40 p-4 rounded space-y-2 text-center">
          <span className="text-xs font-black uppercase text-emerald-300 block">
            SELECT YOUR BID (ESTIMATED TRICKS TO WIN: 1 TO 13):
          </span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePlaceBid(num)}
                className="w-9 h-9 border-2 border-white bg-black hover:bg-white hover:text-black font-black text-xs transition-all cursor-pointer rounded"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 13-Card Hand Tray */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase font-bold text-white">YOUR HAND ({myHand.length} CARDS):</span>
          <span className="text-[10px]">FOLLOW LED SUIT OR THROW SPADE TRUMP</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center bg-neutral-950 p-3 border-2 border-white rounded min-h-[110px] items-center">
          {myHand.map((card, idx) => {
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => handlePlayCard(card)}
                disabled={!isMyTurn || cbs.phase !== "PLAYING" || match.status === "FINISHED"}
                className={`w-10 h-16 sm:w-11 sm:h-18 rounded border-2 flex flex-col items-center justify-between p-1 font-black transition-all cursor-pointer ${
                  isMyTurn && cbs.phase === "PLAYING"
                    ? "hover:-translate-y-2 hover:border-white hover:ring-2 hover:ring-white"
                    : "opacity-80"
                } ${
                  isRed
                    ? "bg-black text-red-500 border-neutral-700"
                    : "bg-black text-white border-neutral-700"
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
            🏆 {match.winnerHandle} REACHED BID TARGET & WON!
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
