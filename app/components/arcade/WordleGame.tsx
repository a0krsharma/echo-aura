"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitWordleGuess, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Key, Delete, Send, Sparkles } from "lucide-react";

interface WordleGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

export default function WordleGame({ match, currentUid }: WordleGameProps) {
  const [currentGuess, setCurrentGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ws = match.wordleState;
  if (!ws) return <div className="text-white font-mono p-4">Loading Cipher Protocol...</div>;

  const targetWord = ws.secretWord.toUpperCase();
  const guesses = ws.guesses.map((g) => g.toUpperCase());

  const getLetterStatus = (letter: string, index: number, word: string) => {
    if (targetWord[index] === letter) return "CORRECT";
    if (targetWord.includes(letter)) return "PRESENT";
    return "ABSENT";
  };

  const handleKeyPress = (key: string) => {
    if (ws.isGameOver || submitting || match.status === "FINISHED") return;

    if (key === "ENTER") {
      handleGuessSubmit();
    } else if (key === "⌫" || key === "BACKSPACE") {
      soundSynth.playSubtlePop();
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      soundSynth.playSubtlePop();
      setCurrentGuess((prev) => prev + key);
    }
  };

  const handleGuessSubmit = async () => {
    if (currentGuess.length !== 5 || submitting) return;
    setSubmitting(true);
    soundSynth.playSnare();

    try {
      const result = await submitWordleGuess(match.id, currentUid, currentGuess);
      setCurrentGuess("");
      if (result.isWon) {
        soundSynth.playFanfare();
      } else if (result.isGameOver) {
        soundSynth.playBuzzer();
      }
    } catch (e) {
      soundSynth.playBuzzer();
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleKeyPress("ENTER");
      else if (e.key === "Backspace") handleKeyPress("⌫");
      else if (/^[a-zA-Z]$/.test(e.key)) handleKeyPress(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, ws.isGameOver, submitting]);

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white">
          // CIPHER PROTOCOL [ 5-LETTER WORDLE ]
        </span>
        <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold">
          {guesses.length}/6 TRIES
        </span>
      </div>

      {/* 6x5 Wordle Matrix */}
      <div className="space-y-1.5 max-w-[280px] mx-auto py-2">
        {Array.from({ length: 6 }).map((_, r) => {
          const guess = guesses[r];
          const isCurrentRow = r === guesses.length;

          return (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, c) => {
                let letter = "";
                let status = "EMPTY";

                if (guess) {
                  letter = guess[c] || "";
                  status = getLetterStatus(letter, c, guess);
                } else if (isCurrentRow) {
                  letter = currentGuess[c] || "";
                }

                let bgClass = "bg-neutral-950 border-neutral-800 text-white";
                if (status === "CORRECT") {
                  bgClass = "bg-white text-black font-black border-white shadow-[0_0_10px_#fff]";
                } else if (status === "PRESENT") {
                  bgClass = "bg-neutral-800 text-white border-white";
                } else if (status === "ABSENT") {
                  bgClass = "bg-neutral-900 text-neutral-600 border-neutral-900";
                } else if (letter) {
                  bgClass = "border-white bg-black text-white";
                }

                return (
                  <div
                    key={c}
                    className={`aspect-square border-2 flex items-center justify-center font-extrabold text-base uppercase transition-all ${bgClass}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-Screen Keyboard */}
      <div className="space-y-1 pt-2">
        {KEYBOARD_ROWS.map((row, idx) => (
          <div key={idx} className="flex justify-center gap-1">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className={`py-2 px-2 sm:px-3 text-xs font-bold border border-neutral-800 bg-neutral-950 hover:border-white hover:bg-neutral-900 active:scale-90 transition-all uppercase cursor-pointer ${
                  key === "ENTER" || key === "⌫" ? "text-[10px] px-3 font-extrabold" : ""
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Victory / Game Over */}
      {ws.isWon && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 CIPHER DECRYPTED: {targetWord}!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +100 AURA POINTS
          </p>
        </div>
      )}

      {ws.isGameOver && !ws.isWon && (
        <div className="border-2 border-white bg-neutral-950 p-3 text-center space-y-1">
          <p className="text-neutral-400 text-xs uppercase">
            CIPHER LOCKED // CORRECT WORD WAS: <span className="text-white font-extrabold">{targetWord}</span>
          </p>
        </div>
      )}

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
