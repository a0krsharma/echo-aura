"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitMastermindGuess, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, KeyRound, Delete, Send } from "lucide-react";

interface MastermindGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function MastermindGame({ match, currentUid }: MastermindGameProps) {
  const [currentGuess, setCurrentGuess] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const ms = match.mastermindState;
  if (!ms) return <div className="text-white font-mono p-4">Loading Mastermind Cipher...</div>;

  const guesses: { guess: number[]; strikes: number; balls: number }[] = JSON.parse(ms.guessesStr || "[]");

  const handleDigitClick = (digit: number) => {
    if (currentGuess.length < 4 && !ms.isGameOver) {
      soundSynth.playSubtlePop();
      setCurrentGuess([...currentGuess, digit]);
    }
  };

  const handleBackspace = () => {
    soundSynth.playSubtlePop();
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  const handleSubmitGuess = async () => {
    if (currentGuess.length !== 4 || submitting || ms.isGameOver) return;
    setSubmitting(true);
    soundSynth.playSnare();

    try {
      const result = await submitMastermindGuess(match.id, currentUid, currentGuess);
      setCurrentGuess([]);
      if (result.won) soundSynth.playFanfare();
      else if (result.isGameOver) soundSynth.playBuzzer();
    } catch (e) {
      soundSynth.playBuzzer();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          // MASTERMIND [ CIPHER DECRYPTION ]
        </span>
        <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
          {guesses.length}/10 ATTEMPTS
        </span>
      </div>

      {/* Guesses Log Matrix */}
      <div className="space-y-1.5 max-w-[320px] mx-auto py-1 max-h-56 overflow-y-auto pr-1">
        {guesses.map((g, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-neutral-950 p-2 border border-neutral-800 text-xs"
          >
            <span className="text-[10px] text-neutral-500 font-bold">#{idx + 1}</span>
            <div className="flex items-center gap-1.5">
              {g.guess.map((num, i) => (
                <div
                  key={i}
                  className="w-6 h-6 border border-white bg-black flex items-center justify-center font-bold text-xs"
                >
                  {num}
                </div>
              ))}
            </div>
            <div className="text-[10px] space-x-2 font-bold">
              <span className="text-emerald-400">{g.strikes} ● EXACT</span>
              <span className="text-neutral-400">{g.balls} ○ BALL</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Guess Input Slot */}
      {!ms.isGameOver && (
        <div className="space-y-2 bg-neutral-950 p-3 border border-neutral-800">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 border-2 border-white bg-black flex items-center justify-center font-extrabold text-base"
              >
                {currentGuess[i] !== undefined ? currentGuess[i] : ""}
              </div>
            ))}
          </div>

          {/* Number Keypad 1-6 */}
          <div className="grid grid-cols-6 gap-1 pt-1">
            {[1, 2, 3, 4, 5, 6].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                className="py-2 border border-neutral-700 bg-black hover:border-white hover:bg-neutral-800 text-white font-extrabold text-xs transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleBackspace}
              disabled={currentGuess.length === 0}
              className="py-2 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-300 font-bold text-xs uppercase flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
            >
              <Delete className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
            <button
              type="button"
              disabled={currentGuess.length !== 4 || submitting}
              onClick={handleSubmitGuess}
              className="py-2 border-2 border-white bg-white text-black font-extrabold text-xs uppercase flex items-center justify-center gap-1 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SUBMIT CIPHER</span>
            </button>
          </div>
        </div>
      )}

      {/* Victory / Game Over */}
      {ms.isWon && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 MASTERMIND CIPHER CRACKED!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      {ms.isGameOver && !ms.isWon && (
        <div className="border-2 border-white bg-neutral-950 p-3 text-center space-y-1">
          <p className="text-neutral-400 text-xs uppercase">
            CIPHER LOCKED // CODE WAS: <span className="text-white font-extrabold">{ms.secretCode.join("-")}</span>
          </p>
        </div>
      )}

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
