"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { rollLudoDice, moveLudoToken, type ArcadeMatch, type LudoToken } from "@/lib/arcade";
import { Dices, Trophy, User, ShieldAlert } from "lucide-react";

interface LudoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function LudoGame({ match, currentUid }: LudoGameProps) {
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);

  const ludoState = match.ludoState;
  if (!ludoState) {
    return <div className="text-white font-mono p-4">Loading Ludo arena...</div>;
  }

  const currentPlayer = match.players[currentUid];
  const myTeam = currentPlayer?.team;
  const isMyTurn = ludoState.currentTurn === myTeam && match.status !== "FINISHED";

  const handleRoll = async () => {
    if (!isMyTurn || ludoState.hasRolled || rolling) return;
    setRolling(true);
    soundSynth.playSnare();
    try {
      const roll = await rollLudoDice(match.id, currentUid);
      if (roll === 6) {
        soundSynth.playAirhorn();
      } else {
        soundSynth.playGong();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setRolling(false);
    }
  };

  const handleSelectToken = async (tokenId: number) => {
    if (!isMyTurn || !ludoState.hasRolled || moving) return;
    setMoving(true);
    soundSynth.playSubtlePop();
    try {
      await moveLudoToken(match.id, currentUid, tokenId);
    } catch (e: any) {
      soundSynth.playBuzzer();
    } finally {
      setMoving(false);
    }
  };

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    RED: { bg: "bg-red-950", text: "text-red-400", border: "border-red-600" },
    GREEN: { bg: "bg-emerald-950", text: "text-emerald-400", border: "border-emerald-600" },
    BLUE: { bg: "bg-blue-950", text: "text-blue-400", border: "border-blue-600" },
    YELLOW: { bg: "bg-yellow-950", text: "text-yellow-400", border: "border-yellow-600" },
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border border-neutral-800 p-4 font-mono text-white space-y-4 select-none shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[10px] sm:text-xs">
        <span className="text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Dices className="w-3.5 h-3.5 text-white animate-pulse" />
          // ARCADE: CYBER LUDO DICE CLASH
        </span>
        <span className="text-white border border-neutral-700 px-2 py-0.5 font-bold uppercase">
          TURN: {ludoState.currentTurn} {isMyTurn && "(YOUR MOVE)"}
        </span>
      </div>

      {/* ── 4-Player Teams Status Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
        {(["RED", "GREEN", "BLUE", "YELLOW"] as const).map((team) => {
          const p = Object.values(match.players || {}).find((pl) => pl.team === team);
          const isTurn = ludoState.currentTurn === team;
          const style = colorStyles[team];
          return (
            <div
              key={team}
              className={`p-2 border ${
                isTurn ? "border-white bg-neutral-900 ring-1 ring-white" : "border-neutral-800 bg-neutral-950"
              } space-y-0.5`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className={style.text}>{team}</span>
                {isTurn && <span className="animate-pulse">●</span>}
              </div>
              <p className="text-neutral-400 truncate text-[9px]">{p ? p.handle : "[ EMPTY ]"}</p>
            </div>
          );
        })}
      </div>

      {/* ── Minimalist Retro Ludo Board ── */}
      <div className="border-2 border-neutral-700 bg-neutral-950 p-3 max-w-[340px] sm:max-w-[380px] mx-auto space-y-3">
        {/* Token status grids */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(["RED", "GREEN", "YELLOW", "BLUE"] as const).map((team) => {
            const tokens = ludoState.tokens[team] || [];
            const style = colorStyles[team];
            const isPlayerTeam = myTeam === team;
            return (
              <div key={team} className={`p-2.5 border ${style.border} ${style.bg} space-y-1.5`}>
                <div className="text-[10px] font-bold uppercase flex justify-between">
                  <span className={style.text}>{team} BASE</span>
                  {isPlayerTeam && <span className="text-white font-mono">(YOU)</span>}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {tokens.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!isMyTurn || !ludoState.hasRolled || !isPlayerTeam}
                      onClick={() => handleSelectToken(t.id)}
                      className={`p-1.5 text-[10px] font-bold border border-neutral-700 rounded transition-all ${
                        t.isHome
                          ? "bg-white text-black"
                          : t.position >= 0
                          ? "bg-black text-white hover:border-white animate-pulse"
                          : "bg-neutral-900 text-neutral-500 hover:border-neutral-500"
                      } cursor-pointer`}
                    >
                      T{t.id + 1}: {t.isHome ? "HOME" : t.position >= 0 ? `POS ${t.position}` : "BASE"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dice Roller Control Hub ── */}
      <div className="border border-neutral-800 bg-neutral-950 p-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 border-2 border-white bg-black flex items-center justify-center font-mono text-2xl font-extrabold shadow-lg">
            {ludoState.lastDiceRoll ? `⚄ ${ludoState.lastDiceRoll}` : "—"}
          </div>
          <button
            type="button"
            disabled={!isMyTurn || ludoState.hasRolled || rolling}
            onClick={handleRoll}
            className="px-6 py-3 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-bold font-mono text-xs uppercase transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
          >
            {rolling ? "ROLLING..." : isMyTurn ? "[ ROLL 3D DICE 🎲 ]" : "WAITING TURN"}
          </button>
        </div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
          {ludoState.hasRolled
            ? "⚡ TAP ONE OF YOUR TOKENS ABOVE TO MOVE!"
            : isMyTurn
            ? "YOUR TURN: TAP ROLL DICE TO MOVE"
            : `WAITING FOR ${ludoState.currentTurn} TO ROLL...`}
        </p>
      </div>

      {/* ── Victory Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-white bg-neutral-950 p-4 text-center space-y-2 animate-bounce">
          <Trophy className="w-6 h-6 text-white mx-auto animate-pulse" />
          <h2 className="font-bold text-sm uppercase tracking-widest">
            🏆 {match.winnerHandle} CONQUERED THE CYBER LUDO ARENA!
          </h2>
          <p className="text-[10px] text-neutral-400 uppercase">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}
    </div>
  );
}
