"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { guessHangmanLetter, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle } from "lucide-react";

interface HangmanGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const GALLOWS_STAGES = [
  `
  +---+
  |   |
      |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
];

export default function HangmanGame({ match, currentUid }: HangmanGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const hs = match.hangmanState;
  if (!hs) return <div className="text-white font-mono p-4">Loading Word Scaffold...</div>;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const gallowsAscii = GALLOWS_STAGES[Math.min(hs.wrongGuesses, GALLOWS_STAGES.length - 1)];

  const handleLetterClick = async (letter: string) => {
    if (hs.guessedLetters.includes(letter) || hs.isGameOver || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await guessHangmanLetter(match.id, currentUid, letter);
      if (result.won) soundSynth.playFanfare();
      else if (result.correct) soundSynth.playSubtlePop();
      else soundSynth.playBuzzer();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          // HANGMAN [ WORD SCAFFOLD ]
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
          <span className="px-2 py-0.5 border border-red-500 bg-red-950/40 text-red-300 font-extrabold text-[10px]">
            {hs.wrongGuesses} / {hs.maxWrong} STRIKES
          </span>
        </div>
      </div>

      {/* ASCII Gallows Display */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-4 text-center space-y-4 rounded-xl shadow-2xl">
        <pre className="font-mono text-xs sm:text-sm text-emerald-400 leading-tight inline-block text-left">
          {gallowsAscii}
        </pre>

        {/* Word Boxes */}
        <div className="flex justify-center gap-2 pt-2 border-t border-neutral-800">
          {hs.secretWord.split("").map((char, i) => {
            const isGuessed = hs.guessedLetters.includes(char.toUpperCase()) || hs.isGameOver;
            return (
              <div
                key={i}
                className="w-8 h-10 border-2 border-neutral-700 bg-black flex items-center justify-center font-black text-sm text-white rounded"
              >
                {isGuessed ? char : "_"}
              </div>
            );
          })}
        </div>
      </div>

      {/* A-Z Keyboard */}
      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1 bg-neutral-950 p-2.5 border border-neutral-800 rounded-xl">
        {alphabet.map((letter) => {
          const isUsed = hs.guessedLetters.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              disabled={isUsed || hs.isGameOver || match.status === "FINISHED"}
              onClick={() => handleLetterClick(letter)}
              className={`h-9 border text-xs font-black uppercase transition-all cursor-pointer rounded ${
                isUsed
                  ? "bg-neutral-900 border-neutral-800 text-neutral-600 opacity-40"
                  : "bg-black border-neutral-700 text-white hover:border-emerald-400 active:scale-95"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action Telemetry */}
      {hs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{hs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {hs.isWon ? "CIPHER DECRYPTED & WORD SAVED!" : `GAME OVER! WORD WAS [${hs.secretWord}]`}
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
