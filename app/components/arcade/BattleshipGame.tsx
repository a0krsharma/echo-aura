"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fireBattleshipShot, type ArcadeMatch } from "@/lib/arcade";
import { executeBattleshipBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Trophy,
  Crosshair,
  Share2,
  Sparkles,
  Shield,
  HelpCircle,
  Users,
  Flame,
  Zap,
} from "lucide-react";

interface BattleshipGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function BattleshipGame({ match, currentUid }: BattleshipGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const bs = match.battleshipState;
  if (!bs) return <div className="text-white font-mono p-4">Loading Radar Command...</div>;

  const isP1 = currentUid === bs.p1Uid;
  const myShips: [number, number][] = JSON.parse(isP1 ? bs.p1ShipsStr : bs.p2ShipsStr || "[]");
  const myShots: [number, number, boolean][] = JSON.parse(isP1 ? bs.p1ShotsStr : bs.p2ShotsStr || "[]");
  const enemyShots: [number, number, boolean][] = JSON.parse(isP1 ? bs.p2ShotsStr : bs.p1ShotsStr || "[]");

  const isMyTurn = bs.currentTurnUid === currentUid && match.status === "PLAYING";
  const myHits = isP1 ? bs.p1Hits : bs.p2Hits;
  const enemyHits = isP1 ? bs.p2Hits : bs.p1Hits;

  // Trigger Bot turns
  useEffect(() => {
    if (match.status !== "PLAYING" || !bs) return;
    if (bs.currentTurnUid !== currentUid) {
      const botPlayer = Object.values(match.players || {}).find(
        (p) => p.uid === bs.currentTurnUid && p.isBot
      );
      if (botPlayer) {
        executeBattleshipBotTurn(match);
      }
    }
  }, [bs?.currentTurnUid, match.status]);

  const handleFire = async (r: number, c: number) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    const alreadyShot = myShots.some(([sr, sc]) => sr === r && sc === c);
    if (alreadyShot) return;

    soundSynth.playSnare();
    try {
      const result = await fireBattleshipShot(match.id, currentUid, r, c);
      if (result.hit) {
        soundSynth.playAirhorn();
      } else {
        soundSynth.playSubtlePop();
      }
      if (result.won) {
        soundSynth.playFanfare();
      }
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-2xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-cyan-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(6,182,212,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-cyan-400 tracking-wider">
                NAVAL BATTLESHIP
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold rounded">
                RADAR 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Status: <span className="text-white font-bold">{isMyTurn ? "YOUR TURN TO FIRE MISSILE" : "WAITING FOR ENEMY RADAR"}</span>
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
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
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
                console.error("Failed to take seat in Battleship:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Fleet Damage Status HUD ── */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-950 p-3 rounded-xl border border-cyan-500/30">
        <div className="flex justify-between items-center bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-500/40">
          <span className="text-cyan-300 font-bold uppercase">ENEMY SHIPS HIT:</span>
          <span className="text-white font-black text-sm font-mono">{myHits} / {bs.totalShipCells}</span>
        </div>
        <div className="flex justify-between items-center bg-red-950/30 p-2.5 rounded-lg border border-red-500/40">
          <span className="text-red-300 font-bold uppercase">YOUR FLEET DAMAGE:</span>
          <span className="text-red-400 font-black text-sm font-mono">{enemyHits} / {bs.totalShipCells}</span>
        </div>
      </div>

      {/* ── 2 3D Holographic Radar Grids Side by Side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Enemy Radar Grid */}
        <div className="space-y-2">
          <div className="text-xs text-cyan-300 font-black uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-red-400 animate-spin" />
              [ TARGET ENEMY GRID ]
            </span>
            <span className="text-[10px] text-amber-300 font-bold">TAP CELL TO LAUNCH 🚀</span>
          </div>
          <div className="grid grid-cols-10 grid-rows-10 gap-1 border-2 border-cyan-500/60 p-2 bg-gradient-to-br from-[#031525] to-black rounded-xl aspect-square shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]">
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((_, c) => {
                const shot = myShots.find(([sr, sc]) => sr === r && sc === c);
                const isHit = shot && shot[2];
                const isMiss = shot && !shot[2];

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={!isMyTurn || !!shot || match.status === "FINISHED"}
                    onClick={() => handleFire(r, c)}
                    className={`w-full h-full rounded border flex items-center justify-center text-[10px] font-black transition-all ${
                      isHit
                        ? "bg-red-600 border-red-400 text-white shadow-[0_0_10px_#ef4444]"
                        : isMiss
                        ? "bg-cyan-950/60 border-cyan-800 text-cyan-400"
                        : "bg-blue-950/30 border-cyan-900/40 hover:border-cyan-400 hover:bg-cyan-900/50 cursor-pointer"
                    }`}
                  >
                    {isHit ? "💥" : isMiss ? "•" : ""}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Your Defense Grid */}
        <div className="space-y-2">
          <div className="text-xs text-neutral-300 font-black uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              [ YOUR FLEET DEFENSE ]
            </span>
            <span className="text-[10px] text-neutral-400 font-bold">5 WARSHIPS DEPLOYED</span>
          </div>
          <div className="grid grid-cols-10 grid-rows-10 gap-1 border-2 border-neutral-700 p-2 bg-gradient-to-br from-[#0b1710] to-black rounded-xl aspect-square shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]">
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((_, c) => {
                const hasShip = myShips.some(([sr, sc]) => sr === r && sc === c);
                const enemyShot = enemyShots.find(([sr, sc]) => sr === r && sc === c);
                const isDamaged = hasShip && enemyShot;
                const isEnemyMiss = !hasShip && enemyShot;

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-full h-full rounded border flex items-center justify-center text-[10px] font-black ${
                      isDamaged
                        ? "bg-red-600 border-red-400 text-white shadow-[0_0_10px_#ef4444] animate-pulse"
                        : hasShip
                        ? "bg-emerald-600 border-emerald-400 text-black font-mono shadow-[0_0_6px_#10b981]"
                        : isEnemyMiss
                        ? "bg-neutral-900 border-neutral-800 text-neutral-500"
                        : "bg-neutral-950/60 border-neutral-900"
                    }`}
                  >
                    {isDamaged ? "🔥" : hasShip ? "🚢" : isEnemyMiss ? "•" : ""}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Action Telemetry Log */}
      {bs.lastActionLog && (
        <div className="border border-cyan-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-cyan-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{bs.lastActionLog}</span>
        </div>
      )}

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-cyan-400 bg-gradient-to-b from-cyan-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-cyan-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#06b6d4]" />
          <h2 className="text-xl font-black text-cyan-300 uppercase tracking-widest">
            🏆 ENEMY FLEET SUNK! NAVAL VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You sank the entire enemy armada and scored +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
