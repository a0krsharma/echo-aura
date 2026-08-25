"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { betPoker, type ArcadeMatch } from "@/lib/arcade";
import { executePokerBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  Sparkles,
  CircleDollarSign,
  HelpCircle,
  Users,
  Coins,
  Shield,
  Crown,
} from "lucide-react";

interface PokerGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function PokerGame({ match, currentUid }: PokerGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const ps = match.pokerState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!ps || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === ps.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executePokerBotTurn(match);
    }
  }, [match, ps?.currentTurnUid]);

  if (!ps) return <div className="text-white font-mono p-4">Loading Texas Hold'em Arena...</div>;

  const isMyTurn = ps.currentTurnUid === currentUid && match.status === "PLAYING";
  const myCards = ps.playerHands[currentUid] || ["A♠", "K♥"];

  const handleAction = async (action: "CHECK" | "CALL" | "RAISE" | "FOLD") => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await betPoker(match.id, currentUid, action, 20);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 4;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(16,185,129,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            ♠️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                TEXAS HOLD'EM POKER
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded">
                CASINO 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[ps.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR MOVE" : "WAITING..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="poker" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY & TALK ON LIVE MIC
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!currentUid) return;
              try {
                const { joinArcadeMatch } = await import("@/lib/arcade");
                await joinArcadeMatch(match.id, {
                  uid: currentUid,
                  handle: `@PLAYER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Poker:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── 3D Deluxe Poker Felt Table ── */}
      <div className="relative border-4 border-[#381a08] bg-gradient-to-br from-emerald-800 via-emerald-900 to-neutral-950 p-6 text-center space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_15px_rgba(0,0,0,0.8)] rounded-3xl">
        {/* Pot Display */}
        <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="text-xs text-amber-300 font-bold uppercase">CASINO POT:</span>
            <span className="text-lg font-black text-white font-mono">${ps.pot}</span>
          </div>
          <div className="text-xs text-neutral-300 font-mono">
            CURRENT CALL: <span className="text-emerald-400 font-black">${ps.currentBet}</span>
          </div>
        </div>

        {/* Community Cards (Flop, Turn, River) */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-300 font-black uppercase tracking-widest block">
            COMMUNITY BOARD (FLOP / TURN / RIVER)
          </span>
          <div className="flex justify-center gap-2 sm:gap-3">
            {ps.communityCards.map((card, i) => {
              const isRed = card.includes("♥") || card.includes("♦");
              return (
                <div
                  key={i}
                  className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-between p-2 font-black shadow-2xl transition-transform hover:scale-105 select-none ${
                    isRed
                      ? "bg-gradient-to-b from-white to-neutral-100 text-red-600 border-red-400 ring-1 ring-red-500/30"
                      : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900 border-neutral-700 ring-1 ring-neutral-500/30"
                  }`}
                >
                  <span className="text-xs self-start font-mono leading-none">{card}</span>
                  <span className="text-2xl leading-none">{card.slice(-1)}</span>
                  <span className="text-xs self-end font-mono leading-none">{card}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Hole Cards */}
        <div className="space-y-2 pt-3 border-t border-emerald-700/40">
          <span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest block">
            YOUR HOLE CARDS (PRIVATE HAND)
          </span>
          <div className="flex justify-center gap-3">
            {myCards.map((card, i) => {
              const isRed = card.includes("♥") || card.includes("♦");
              return (
                <div
                  key={i}
                  className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-2.5 font-black shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-transform hover:-translate-y-2 select-none ${
                    isRed
                      ? "bg-gradient-to-b from-white to-neutral-100 text-red-600 border-red-400 ring-2 ring-red-500/30"
                      : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900 border-neutral-700 ring-2 ring-neutral-500/30"
                  }`}
                >
                  <span className="text-xs sm:text-sm self-start font-mono leading-none">{card}</span>
                  <span className="text-2xl sm:text-3xl leading-none">{card.slice(-1)}</span>
                  <span className="text-xs sm:text-sm self-end font-mono leading-none">{card}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Betting Action Controls ── */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("CHECK")}
          className="py-3 border-2 border-neutral-700 bg-neutral-900 hover:border-white text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ CHECK ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("CALL")}
          className="py-3 border-2 border-neutral-700 bg-neutral-900 hover:border-white text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ CALL ${ps.currentBet} ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("RAISE")}
          className="py-3 border-2 border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase rounded-xl transition-all hover:brightness-110 disabled:opacity-30 cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          [ RAISE +$20 ]
        </button>
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("FOLD")}
          className="py-3 border-2 border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-600 hover:text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ FOLD ]
        </button>
      </div>

      {/* Action Telemetry Log */}
      {ps.lastActionLog && (
        <div className="border border-emerald-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{ps.lastActionLog}</span>
        </div>
      )}

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#10b981]" />
          <h2 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
            🏆 TEXAS HOLD'EM POT CLEARED!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You claimed the pot and scored +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
