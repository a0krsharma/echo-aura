"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { makeReversiMove, type ArcadeMatch } from "@/lib/arcade";
import { executeReversiBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Circle, HelpCircle } from "lucide-react";

interface ReversiGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function ReversiGame({ match, currentUid, isHost }: ReversiGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rs = match.reversiState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!rs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    if (rs.currentTurn === "LIGHT") {
      executeReversiBotTurn(match);
    }
  }, [match, rs?.currentTurn]);
  if (!rs) return <div className="text-white font-mono p-4">Loading Reversi arena...</div>;

  const board: (string | null)[][] = JSON.parse(rs.boardStr || "[]");
  const myColor = isHost ? "DARK" : "LIGHT";
  const isMyTurn = rs.currentTurn === myColor && match.status === "PLAYING";

  const handleCellClick = async (r: number, c: number) => {
    if (!isMyTurn || board[r][c] !== null || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await makeReversiMove(match.id, currentUid, r, c);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Circle className="w-4 h-4 text-white" />
          // REVERSI / OTHELLO [ 8X8 GRID ]
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
            TURN: {rs.currentTurn} {isMyTurn ? "● (YOU)" : ""}
          </span>
        </div>
      </div>

      {/* Disk Count Ticker */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-2 border border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">DARK DISKS (●):</span>
          <span className="text-white font-extrabold">{rs.darkCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">LIGHT DISKS (○):</span>
          <span className="text-white font-extrabold">{rs.lightCount}</span>
        </div>
      </div>

      {/* 8x8 Board Grid */}
      <div className="relative aspect-square max-w-[380px] sm:max-w-[420px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-1 bg-neutral-900 p-1">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!isMyTurn || cell !== null || match.status === "FINISHED"}
                onClick={() => handleCellClick(r, c)}
                className={`w-full h-full rounded-full border border-neutral-800 flex items-center justify-center text-lg font-black transition-all ${
                  cell === "DARK"
                    ? "bg-black text-white border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    : cell === "LIGHT"
                    ? "bg-white text-black border-black shadow-[0_0_8px_#fff]"
                    : "hover:bg-neutral-800 cursor-pointer"
                }`}
              >
                {cell === "DARK" ? "●" : cell === "LIGHT" ? "○" : ""}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Action Log */}
      {rs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{rs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} WON REVERSI WITH {Math.max(rs.darkCount, rs.lightCount)} DISKS!
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
          <span>[ ❓ REVERSI RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="reversi"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
