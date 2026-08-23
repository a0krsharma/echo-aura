"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { makeLiarsDiceBid, callLiarsDiceBluff, type ArcadeMatch } from "@/lib/arcade";
import { executeLiarsDiceBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Dices, EyeOff, AlertTriangle, HelpCircle } from "lucide-react";

interface LiarsDiceGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function LiarsDiceGame({ match, currentUid }: LiarsDiceGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bidCount, setBidCount] = useState(2);
  const [bidFace, setBidFace] = useState(3);

  const lds = match.liarsDiceState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!lds || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === lds.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeLiarsDiceBotTurn(match);
    }
  }, [match, lds?.currentTurnUid]);

  if (!lds) return <div className="text-white font-mono p-4">Loading Liar's Dice Arena...</div>;

  const diceRolls: Record<string, number[]> = JSON.parse(lds.diceRollsStr || "{}");
  const myDice = diceRolls[currentUid] || [2, 4, 4, 5, 6];
  const isMyTurn = lds.currentTurnUid === currentUid && match.status === "PLAYING";

  const handlePlaceBid = async () => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await makeLiarsDiceBid(match.id, currentUid, bidCount, bidFace);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleCallBluff = async () => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playAirhorn();

    try {
      await callLiarsDiceBluff(match.id, currentUid);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-emerald-400" />
          // LIAR'S DICE [ PERUDO PROTOCOL ]
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
            {isMyTurn ? "● YOUR BID / CHALLENGE" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* Current Bid Display */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-4 text-center space-y-1 rounded-xl">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
          CURRENT TABLE BID ON THE LINE
        </span>
        <div className="text-xl sm:text-2xl font-black text-white">
          {lds.currentBid ? (
            <span className="text-emerald-400">
              {lds.currentBid.count}x OF FACE [ 🎲 {lds.currentBid.face} ]
            </span>
          ) : (
            <span className="text-neutral-500 text-base">NO BIDS PLACED YET // OPENING TURN</span>
          )}
        </div>
      </div>

      {/* Private Dice Tray */}
      <div className="space-y-2 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400 font-bold uppercase flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
            <span>YOUR SECRET DICE TRAY (HIDDEN UNDER CUP):</span>
          </span>
        </div>

        <div className="flex justify-center gap-2 pt-1">
          {myDice.map((val, i) => (
            <div
              key={i}
              className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-emerald-400 bg-black text-emerald-300 font-black text-lg sm:text-xl flex items-center justify-center rounded-lg shadow-lg"
            >
              🎲 {val}
            </div>
          ))}
        </div>
      </div>

      {/* Bidding & Bluff Controls */}
      <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-neutral-400 font-bold">TOTAL DICE COUNT:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={bidCount}
              onChange={(e) => setBidCount(Number(e.target.value))}
              className="w-full bg-black border border-neutral-700 p-2 text-white font-mono font-bold"
            />
          </div>
          <div className="space-y-1">
            <span className="text-neutral-400 font-bold">DICE FACE VALUE (1-6):</span>
            <select
              value={bidFace}
              onChange={(e) => setBidFace(Number(e.target.value))}
              className="w-full bg-black border border-neutral-700 p-2 text-white font-mono font-bold"
            >
              {[1, 2, 3, 4, 5, 6].map((f) => (
                <option key={f} value={f}>
                  FACE [{f}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={!isMyTurn || match.status === "FINISHED"}
            onClick={handlePlaceBid}
            className="py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer shadow-md"
          >
            [ 🎲 PLACE BID ]
          </button>
          <button
            type="button"
            disabled={!isMyTurn || !lds.currentBid || match.status === "FINISHED"}
            onClick={handleCallBluff}
            className="py-3 border-2 border-red-600 bg-red-950/40 text-red-300 hover:bg-red-600 hover:text-white font-extrabold text-xs uppercase transition-all disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>[ 🚨 CALL BLUFF! ]</span>
          </button>
        </div>
      </div>

      {/* Action Telemetry */}
      {lds.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{lds.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CALLED THE BLUFF & WON!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
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
          <span>[ ❓ LIAR'S DICE RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="liars_dice"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
