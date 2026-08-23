"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  seeTeenPattiCards,
  betTeenPatti,
  type ArcadeMatch,
} from "@/lib/arcade";
import { executeTeenPattiBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, HelpCircle, Eye, EyeOff, Coins, Flame } from "lucide-react";

interface TeenPattiGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TeenPattiGame({ match, currentUid }: TeenPattiGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const tps = match.teenPattiState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!tps || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === tps.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeTeenPattiBotTurn(match);
    }
  }, [match, tps?.currentTurnUid, tps?.pot]);

  if (!tps) return <div className="text-white font-mono p-4">Loading Teen Patti Table...</div>;

  const hands: Record<string, string[]> = JSON.parse(tps.handsStr || "{}");
  const myCards = hands[currentUid] || ["A♠", "K♠", "Q♠"];
  const isSeen = tps.seenPlayers[currentUid] || false;
  const isFolded = tps.foldedPlayers[currentUid] || false;
  const isMyTurn = tps.currentTurnUid === currentUid && !isFolded && match.status === "PLAYING";

  const handleSee = async () => {
    soundSynth.playSubtlePop();
    try {
      await seeTeenPattiCards(match.id, currentUid);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleAction = async (action: "CHAAL" | "PACK" | "SHOW") => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();
    try {
      await betTeenPatti(match.id, currentUid, action);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const currentChaalAmount = isSeen ? tps.currentStake * 2 : tps.currentStake;

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // TEEN PATTI [ 3-CARD FLUSH LOUNGE ]
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

      {/* Pot HUD */}
      <div className="flex items-center justify-between bg-neutral-950 p-3 border-2 border-white rounded">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-white animate-spin" />
          <div>
            <span className="text-[10px] text-neutral-400 font-bold block uppercase">TOTAL POT</span>
            <span className="text-lg font-black text-white font-mono">{tps.pot} COINS</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">CURRENT STAKE</span>
          <span className="text-sm font-black text-white font-mono">{tps.currentStake} (SEEN: {tps.currentStake * 2})</span>
        </div>
      </div>

      {/* Player Hand Tray */}
      <div className="border-2 border-white bg-neutral-950 p-4 rounded text-center space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-white">
            YOUR 3 CARDS ({isSeen ? "PLAYING SEEN" : "PLAYING BLIND"})
          </span>
          {!isSeen && (
            <button
              type="button"
              onClick={handleSee}
              className="px-3 py-1 bg-white text-black font-black text-[10px] uppercase transition-all rounded hover:bg-neutral-200 cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>[ SEE CARDS ]</span>
            </button>
          )}
        </div>

        <div className="flex gap-3 justify-center items-center py-2">
          {myCards.map((card, i) => {
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <div
                key={i}
                className={`w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 flex flex-col items-center justify-between p-2 font-black shadow-2xl transition-all ${
                  isSeen
                    ? isRed
                      ? "bg-white text-red-600 border-red-400"
                      : "bg-white text-black border-black"
                    : "bg-black border-white text-white"
                }`}
              >
                {isSeen ? (
                  <>
                    <span className="text-xs self-start leading-none">{card.slice(0, -1)}</span>
                    <span className="text-2xl sm:text-3xl leading-none">{card.slice(-1)}</span>
                    <span className="text-xs self-end leading-none">{card.slice(0, -1)}</span>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                    <span className="text-2xl">🂠</span>
                    <span className="text-[9px] font-mono mt-1 font-bold">BLIND</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleAction("PACK")}
          disabled={!isMyTurn || isFolded || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            isMyTurn
              ? "border-neutral-700 bg-black text-neutral-300 hover:border-white hover:text-white"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          [ 🏳️ PACK / FOLD ]
        </button>

        <button
          type="button"
          onClick={() => handleAction("CHAAL")}
          disabled={!isMyTurn || isFolded || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            isMyTurn
              ? "border-white bg-white text-black hover:bg-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          [ 🪙 CHAAL ({currentChaalAmount}) ]
        </button>

        <button
          type="button"
          onClick={() => handleAction("SHOW")}
          disabled={!isMyTurn || isFolded || match.status === "FINISHED"}
          className={`py-3 border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            isMyTurn
              ? "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          [ 🏆 SHOWDOWN ]
        </button>
      </div>

      {/* Action Telemetry */}
      {tps.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{tps.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} WON THE TEEN PATTI POT!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{tps.pot || 100} COINS
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
          <span>[ ❓ TEEN PATTI RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="teen_patti"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
