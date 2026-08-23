"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitSudokuCell, type ArcadeMatch } from "@/lib/arcade";
import { Trophy, Zap, AlertTriangle, CheckCircle2, User, Share2 } from "lucide-react";
import ArcadeInviteModal from "./ArcadeInviteModal";

interface SudokuGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function SudokuGame({ match, currentUid }: SudokuGameProps) {
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ r: number; c: number; correct: boolean } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const sudokuState = match.sudokuState;
  if (!sudokuState) {
    return <div className="text-white font-mono p-4">Loading Sudoku grid...</div>;
  }

  const grid: number[][] = JSON.parse(sudokuState.currentGridStr || "[]");
  const initialGrid: number[][] = JSON.parse(sudokuState.initialGridStr || "[]");
  const players = Object.values(match.players || {});
  const currentPlayer = match.players[currentUid];

  const handleCellClick = (r: number, c: number) => {
    // If it was part of initial puzzle or already filled, allow selecting for reference
    setSelectedCell({ r, c });
    soundSynth.playSubtlePop();
  };

  const handleNumberInput = async (num: number) => {
    if (!selectedCell || submitting || match.status === "FINISHED") return;
    const { r, c } = selectedCell;

    // Can only edit non-initial cells
    if (initialGrid[r][c] !== 0) return;

    setSubmitting(true);
    try {
      const res = await submitSudokuCell(match.id, currentUid, r, c, num);
      setLastFeedback({ r, c, correct: res.correct });

      if (res.correct) {
        soundSynth.playAirhorn(); // Victory chord
      } else {
        soundSynth.playBuzzer();
      }

      if (res.isComplete) {
        soundSynth.playFanfare();
      }

      setTimeout(() => setLastFeedback(null), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border border-neutral-800 p-4 font-mono text-white space-y-4 select-none shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[10px] sm:text-xs">
        <span className="text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
          // ARCADE: 1V1 SUDOKU DATA-GRID
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
            title="Invite friends to play and talk on voice"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
          <span className="text-white border border-neutral-700 px-2 py-0.5 font-bold uppercase">
            STAKES: +{match.stakes * 2} AURA
          </span>
        </div>
      </div>

      {/* Invite Modal */}
      <ArcadeInviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        match={match}
      />

      {/* ── Player Battle Bar ── */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-2.5 border border-neutral-900 text-xs">
        {players.map((p) => {
          const isYou = p.uid === currentUid;
          return (
            <div
              key={p.uid}
              className={`p-2 border ${
                isYou ? "border-white bg-neutral-900" : "border-neutral-800 bg-black"
              } space-y-1`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1">
                  <User className="w-3 h-3 text-neutral-400" />
                  {p.handle} {isYou && "(YOU)"}
                </span>
                <span className="text-[10px] text-white font-bold">{p.score} PTS</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>MISTAKES: {p.mistakes || 0}/3</span>
                <span>{p.mistakes && p.mistakes >= 3 ? "STRIKE OUT" : "ALIVE"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sudoku 9x9 Matrix Grid ── */}
      <div className="grid grid-cols-9 gap-[1px] bg-neutral-700 border-2 border-white p-[1px] max-w-[340px] sm:max-w-[400px] mx-auto">
        {grid.map((row, rIndex) =>
          row.map((cell, cIndex) => {
            const isInitial = initialGrid[rIndex][cIndex] !== 0;
            const isSelected = selectedCell?.r === rIndex && selectedCell?.c === cIndex;
            const isSameNumber =
              selectedCell &&
              grid[selectedCell.r][selectedCell.c] !== 0 &&
              cell === grid[selectedCell.r][selectedCell.c];
            const isFeedback = lastFeedback?.r === rIndex && lastFeedback?.c === cIndex;

            // Border styling for 3x3 blocks
            const borderR = (cIndex + 1) % 3 === 0 && cIndex !== 8 ? "border-r-2 border-r-neutral-400" : "";
            const borderB = (rIndex + 1) % 3 === 0 && rIndex !== 8 ? "border-b-2 border-b-neutral-400" : "";

            let bgClass = "bg-black text-white hover:bg-neutral-900";
            if (isSelected) {
              bgClass = "bg-white text-black font-extrabold scale-95 transition-transform";
            } else if (isFeedback) {
              bgClass = lastFeedback?.correct ? "bg-emerald-600 text-white" : "bg-red-600 text-white";
            } else if (isSameNumber) {
              bgClass = "bg-neutral-800 text-white";
            } else if (isInitial) {
              bgClass = "bg-neutral-950 text-neutral-300";
            }

            return (
              <button
                key={`${rIndex}-${cIndex}`}
                type="button"
                onClick={() => handleCellClick(rIndex, cIndex)}
                className={`w-full aspect-square flex items-center justify-center text-xs sm:text-sm font-mono font-bold cursor-pointer transition-all ${bgClass} ${borderR} ${borderB}`}
              >
                {cell !== 0 ? cell : ""}
              </button>
            );
          })
        )}
      </div>

      {/* ── Keypad Input Controls ── */}
      <div className="space-y-1.5 pt-2">
        <div className="text-[10px] text-neutral-500 text-center uppercase tracking-widest">
          TAP CELL ABOVE ➔ SELECT NUMBER (1-9)
        </div>
        <div className="grid grid-cols-9 gap-1 max-w-[340px] sm:max-w-[400px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={!selectedCell || submitting || match.status === "FINISHED"}
              onClick={() => handleNumberInput(num)}
              className="py-2.5 bg-neutral-950 border border-neutral-800 hover:border-white hover:bg-white hover:text-black font-mono text-xs sm:text-sm font-bold transition-all active:scale-90 disabled:opacity-30 cursor-pointer text-center"
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* ── Victory Banner ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-white bg-neutral-950 p-4 text-center space-y-2 animate-bounce">
          <Trophy className="w-6 h-6 text-white mx-auto animate-pulse" />
          <h2 className="font-bold text-sm uppercase tracking-widest">
            🏆 {match.winnerHandle} HACKED THE GRID!
          </h2>
          <p className="text-[10px] text-neutral-400 uppercase">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}
    </div>
  );
}
