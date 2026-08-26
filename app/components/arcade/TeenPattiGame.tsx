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
import {
  Trophy,
  Share2,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  Coins,
  Flame,
  Users,
  Crown,
  Shield,
} from "lucide-react";

interface TeenPattiGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TeenPattiGame({ match, currentUid }: TeenPattiGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

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

  if (!tps) return <div className="text-white font-mono p-4">Loading Teen Patti Royal Table...</div>;

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
  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 4;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-amber-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(245,158,11,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            👑
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                ROYAL TEEN PATTI
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                CASINO 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[tps.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR MOVE" : "WAITING..."}
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
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95"
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
                console.error("Failed to take seat in Teen Patti:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── 3D Green Velvet Casino Table Pot HUD ── */}
      <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-neutral-950 border-2 border-amber-500/50 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8),_0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_#f59e0b] border-2 border-amber-200">
              🪙
            </div>
            <div>
              <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">
                TABLE CASINO POT
              </span>
              <span className="text-2xl font-black text-white font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {tps.pot} COINS
              </span>
            </div>
          </div>
          <div className="text-right bg-black/50 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase">CURRENT STAKE</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {tps.currentStake} COINS <span className="text-[10px] text-neutral-400">(SEEN: {tps.currentStake * 2})</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 3D Realistic Card Tray ── */}
      <div className="border-2 border-amber-500/40 bg-neutral-950/80 p-5 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-neutral-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            YOUR 3 CARDS ({isSeen ? "PLAYING SEEN" : "PLAYING BLIND"})
          </span>
          {!isSeen && (
            <button
              type="button"
              onClick={handleSee}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs uppercase transition-all rounded-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>[ 👁️ SEE CARDS ]</span>
            </button>
          )}
        </div>

        {/* 3D Rendered Cards */}
        <div className="flex gap-4 justify-center items-center py-2">
          {myCards.map((card, i) => {
            const isRed = card.includes("♥") || card.includes("♦");
            return (
              <div
                key={i}
                className={`w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 flex flex-col items-center justify-between p-2.5 font-black shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-transform hover:-translate-y-2 select-none ${
                  isSeen
                    ? isRed
                      ? "bg-gradient-to-b from-white to-neutral-100 text-red-600 border-red-400 ring-2 ring-red-500/30"
                      : "bg-gradient-to-b from-white to-neutral-100 text-neutral-900 border-neutral-700 ring-2 ring-neutral-500/30"
                    : "bg-gradient-to-br from-red-900 via-rose-950 to-neutral-950 border-amber-500/60 text-amber-400"
                }`}
              >
                {isSeen ? (
                  <>
                    <span className="text-xs sm:text-sm self-start font-mono leading-none">{card}</span>
                    <span className="text-2xl sm:text-3xl leading-none">{card.slice(-1)}</span>
                    <span className="text-xs sm:text-sm self-end font-mono leading-none">{card}</span>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-amber-500/40 rounded-lg p-1">
                    <span className="text-lg">👑</span>
                    <span className="text-[8px] font-mono tracking-widest text-amber-300 font-bold uppercase">ROYAL</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Betting Action Controls ── */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("PACK")}
          className="py-3 border-2 border-red-500/50 bg-red-950/40 hover:bg-red-600 text-red-200 hover:text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ ❌ PACK / FOLD ]
        </button>

        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("CHAAL")}
          className="py-3 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs uppercase rounded-xl transition-all hover:brightness-110 disabled:opacity-30 cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          [ 🪙 CHAAL ({currentChaalAmount}) ]
        </button>

        <button
          type="button"
          disabled={!isMyTurn || match.status === "FINISHED"}
          onClick={() => handleAction("SHOW")}
          className="py-3 border-2 border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-600 text-emerald-200 hover:text-white font-black text-xs uppercase rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95 shadow-md"
        >
          [ 🏆 SHOW CARDS ]
        </button>
      </div>

      {/* Action Telemetry Log */}
      {tps.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{tps.lastActionLog}</span>
        </div>
      )}

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 TEEN PATTI SHOWDOWN CLEARED!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You won the entire pot of ${tps.pot} COINS!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
