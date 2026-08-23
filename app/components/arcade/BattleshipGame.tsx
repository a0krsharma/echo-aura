"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fireBattleshipShot, type ArcadeMatch } from "@/lib/arcade";
import { executeBattleshipBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Crosshair, Share2, Sparkles, Shield } from "lucide-react";

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

  return (
    <div className="w-full max-w-2xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // BATTLESHIP [ RADAR COMMAND CENTER ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border-2 border-white bg-white text-black font-extrabold uppercase text-[10px]">
            {isMyTurn ? "● YOUR TURN TO FIRE" : "WAITING FOR ENEMY RADAR"}
          </span>
        </div>
      </div>

      {/* Fleet Damage Status */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-2 border border-neutral-800">
        <div className="flex justify-between items-center">
          <span className="text-neutral-400">ENEMY SHIPS HIT:</span>
          <span className="text-white font-extrabold">{myHits}/{bs.totalShipCells}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-400">YOUR FLEET DAMAGE:</span>
          <span className="text-neutral-300 font-extrabold">{enemyHits}/{bs.totalShipCells}</span>
        </div>
      </div>

      {/* 2 Radar Grids Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Enemy Radar Grid */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>[ TARGET ENEMY RADAR ]</span>
            <span className="text-white">TAP TO FIRE 🎯</span>
          </div>
          <div className="grid grid-cols-10 grid-rows-10 gap-1 border-2 border-white p-1.5 bg-neutral-950 aspect-square">
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
                    className={`w-full h-full border border-neutral-800 flex items-center justify-center text-[10px] font-bold transition-all ${
                      isHit
                        ? "bg-white text-black font-black animate-ping"
                        : isMiss
                        ? "bg-neutral-900 text-neutral-500"
                        : "bg-black hover:border-white hover:bg-neutral-900 cursor-pointer"
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
        <div className="space-y-1.5">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>[ YOUR FLEET DEFENSE ]</span>
            <span className="text-neutral-500">RADAR ACTIVE</span>
          </div>
          <div className="grid grid-cols-10 grid-rows-10 gap-1 border-2 border-neutral-700 p-1.5 bg-neutral-950 aspect-square">
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((_, c) => {
                const isShip = myShips.some(([sr, sc]) => sr === r && sc === c);
                const enemyShot = enemyShots.find(([sr, sc]) => sr === r && sc === c);
                const isDamaged = isShip && enemyShot;
                const isMissed = !isShip && enemyShot;

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-full h-full border border-neutral-800 flex items-center justify-center text-[10px] font-bold ${
                      isDamaged
                        ? "bg-white text-black font-black"
                        : isShip
                        ? "bg-neutral-700 border-white text-white"
                        : isMissed
                        ? "bg-neutral-900 text-neutral-600"
                        : "bg-black"
                    }`}
                  >
                    {isDamaged ? "💥" : isShip ? "🚢" : isMissed ? "•" : ""}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Log */}
      {bs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{bs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} SANK THE ENEMY FLEET!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
