"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { playBlackjackAction, type ArcadeMatch } from "@/lib/arcade";
import { executeBlackjackBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Trophy,
  Share2,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Users,
  Coins,
  Shield,
  Crown,
} from "lucide-react";

interface BlackjackGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

function calculateHandScore(hand: string[]): number {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    if (card === "🂠") continue;
    const rank = card.replace(/[♠♥♦♣]/g, "").trim();
    if (rank === "A") {
      aces++;
      value += 11;
    } else if (["K", "Q", "J", "10"].includes(rank)) {
      value += 10;
    } else {
      value += parseInt(rank, 10) || 10;
    }
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

export default function BlackjackGame({ match, currentUid }: BlackjackGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const bs = match.blackjackState;

  if (!bs) return <div className="text-white font-mono p-4">Loading Blackjack 21 Table...</div>;

  const playerHand = bs.playerHands[currentUid] || ["10♠", "8♦"];
  const isPlaying = match.status === "PLAYING";
  const playerScore = calculateHandScore(playerHand);
  const dealerScore = calculateHandScore(bs.dealerHand);

  const handleAction = async (action: "HIT" | "STAND" | "DOUBLE") => {
    if (!isPlaying || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      await playBlackjackAction(match.id, currentUid, action);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(16,185,129,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            🃏
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                BLACKJACK 21 ROYALE
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded">
                CASINO 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Active Bet: <span className="text-amber-400 font-bold">${bs.playerBets[currentUid] || 50}</span> • PAYS 3 TO 2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                console.error("Failed to take seat in Blackjack:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── 3D Deluxe Casino Blackjack Felt Table ── */}
      <div className="border-4 border-[#381a08] bg-gradient-to-br from-emerald-800 via-emerald-900 to-neutral-950 p-5 text-center space-y-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_15px_rgba(0,0,0,0.8)]">
        {/* Dealer Hand */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">
              CASINO DEALER
            </span>
            <span className="px-2 py-0.5 bg-black/60 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-black rounded-full">
              {bs.dealerRevealed ? `${dealerScore} PTS` : `${dealerScore} + ?`}
            </span>
          </div>
          <div className="flex justify-center gap-2.5">
            {bs.dealerHand.map((card, i) => {
              const isRed = card.includes("♥") || card.includes("♦");
              const isHidden = card === "🂠";
              return (
                <div
                  key={i}
                  className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-between p-2 font-black shadow-2xl transition-transform select-none ${
                    isHidden
                      ? "bg-gradient-to-br from-blue-900 via-indigo-950 to-black text-blue-300 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : isRed
                      ? "bg-gradient-to-b from-white to-neutral-100 text-red-600 border-red-400"
                      : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900 border-neutral-700"
                  }`}
                >
                  <span className="text-xs self-start font-mono leading-none">{card}</span>
                  <span className="text-2xl leading-none">{isHidden ? "🂠" : card.slice(-1)}</span>
                  <span className="text-xs self-end font-mono leading-none">{card}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-2 pt-3 border-t border-emerald-700/40">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest">
              YOUR HAND
            </span>
            <span className={`px-2.5 py-0.5 border text-xs font-mono font-black rounded-full shadow ${
              playerScore === 21
                ? "bg-amber-400 text-black border-amber-300 animate-pulse font-extrabold"
                : playerScore > 21
                ? "bg-red-600 text-white border-red-400 animate-bounce"
                : "bg-black/60 border-white/40 text-white"
            }`}>
              {playerScore > 21 ? `BUST (${playerScore})` : `${playerScore} PTS`}
            </span>
          </div>
          <div className="flex justify-center gap-2.5">
            {playerHand.map((card, i) => {
              const isRed = card.includes("♥") || card.includes("♦");
              return (
                <div
                  key={i}
                  className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-between p-2 font-black shadow-2xl transition-transform select-none ${
                    isRed
                      ? "bg-gradient-to-b from-white to-neutral-100 text-red-600 border-red-400 ring-2 ring-red-500/30"
                      : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900 border-neutral-700 ring-2 ring-neutral-500/30"
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
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("HIT")}
          className="py-3 border-2 border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase rounded-xl transition-all hover:brightness-110 disabled:opacity-30 cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          [ 🃏 HIT ]
        </button>
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("STAND")}
          className="py-3 border-2 border-neutral-700 bg-neutral-900 hover:border-white text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ 🛑 STAND ]
        </button>
        <button
          type="button"
          disabled={!isPlaying || match.status === "FINISHED"}
          onClick={() => handleAction("DOUBLE")}
          className="py-3 border-2 border-amber-500/50 bg-amber-950/40 text-amber-300 hover:bg-amber-500 hover:text-black font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ 🪙 DOUBLE ]
        </button>
      </div>

      {/* Action Telemetry Log */}
      {bs.lastActionLog && (
        <div className="border border-emerald-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{bs.lastActionLog}</span>
        </div>
      )}

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#10b981]" />
          <h2 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
            🏆 BLACKJACK TABLE CONCLUDED!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You beat the dealer and won +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
