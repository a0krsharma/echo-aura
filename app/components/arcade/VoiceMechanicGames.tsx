"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  Flame,
  Swords,
  Clock,
  Check,
  X,
  Share2,
  Trophy,
  Users,
  Sparkles,
  Zap,
  Volume2,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { TONGUE_TWISTERS, type TongueTwisterItem } from "@/lib/voiceGamesDSP";

interface TongueTwisterDuelProps {
  userHandle?: string;
  friendHandle?: string;
}

export default function VoiceMechanicGames({
  userHandle = "@YOU",
  friendHandle = "@FRIEND",
}: TongueTwisterDuelProps) {
  // 1v1 Friend Duel State
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [twisterIdx, setTwisterIdx] = useState<number>(0);
  const [twisterTimer, setTwisterTimer] = useState<number>(5);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [scoreP1, setScoreP1] = useState<number>(0);
  const [scoreP2, setScoreP2] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const currentTwister: TongueTwisterItem =
    TONGUE_TWISTERS[twisterIdx % TONGUE_TWISTERS.length] || TONGUE_TWISTERS[0];

  // 5-second sprint countdown timer
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && twisterTimer > 0) {
      interval = setInterval(() => {
        setTwisterTimer((t) => t - 1);
      }, 1000);
    } else if (twisterTimer === 0 && isTimerRunning) {
      soundSynth.playBuzzer();
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, twisterTimer]);

  const handleStartSprint = () => {
    soundSynth.playFanfare();
    setTwisterTimer(5);
    setIsTimerRunning(true);
  };

  const handleScoreTurn = (passed: boolean) => {
    if (passed) {
      soundSynth.playApplause();
      if (activePlayer === 1) setScoreP1((s) => s + 10);
      else setScoreP2((s) => s + 10);
    } else {
      soundSynth.playBuzzer();
    }

    setIsTimerRunning(false);

    // Switch turn or advance round
    if (activePlayer === 1) {
      setActivePlayer(2);
      setTwisterTimer(5);
      setTwisterIdx((i) => (i + 1) % TONGUE_TWISTERS.length);
    } else {
      if (currentRound < 3) {
        setCurrentRound((r) => r + 1);
        setActivePlayer(1);
        setTwisterTimer(5);
        setTwisterIdx((i) => (i + 1) % TONGUE_TWISTERS.length);
      } else {
        // Game Over!
        setIsGameOver(true);
        soundSynth.playFanfare();
      }
    }
  };

  const handleResetGame = () => {
    soundSynth.playSubtlePop();
    setCurrentRound(1);
    setActivePlayer(1);
    setScoreP1(0);
    setScoreP2(0);
    setIsGameOver(false);
    setTwisterTimer(5);
    setIsTimerRunning(false);
    setTwisterIdx(0);
  };

  const handleShareWhatsApp = () => {
    soundSynth.playSnare();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
    const message = `👅 *TONGUE TWISTER 1v1 SPEED DUEL!*

I challenge you to a 3-round rapid voice tongue twister faceoff on Echo!
Can you recite: "${currentTwister.text}" 3x in 5 seconds without tripping?

🎙️ *Accept Voice Duel Live:* ${origin}/arcade`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="bg-black border-2 border-amber-400 p-4 sm:p-6 rounded-xl font-mono text-white space-y-6 shadow-[0_0_50px_rgba(251,191,36,0.15)] select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
            <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>// 1v1 TONGUE TWISTER VOICE FACEOFF WITH FRIEND</span>
          </div>
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <span>⚡ Rapid-Fire Tongue Twister Duel (3 Rounds)</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Recite the tongue twister 3 times at full speed within 5 seconds on open mic without tripping!
          </p>
        </div>

        {/* 1-Tap WhatsApp Duel Challenge */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span>CHALLENGE FRIEND ON WHATSAPP 📲</span>
        </button>
      </div>

      {/* Scoreboard & Turn Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        {/* Player 1 Card */}
        <div
          className={`p-3.5 border-2 rounded-xl transition-all ${
            activePlayer === 1 && !isGameOver
              ? "border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400"
              : "border-neutral-800 bg-neutral-950 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>🔴 PLAYER 1 (HOST)</span>
            <span className="text-white font-black text-sm">{scoreP1} PTS</span>
          </div>
          <div className="text-sm font-black text-white truncate mt-1">{userHandle}</div>
          {activePlayer === 1 && !isGameOver && (
            <div className="text-[10px] text-emerald-300 font-bold uppercase mt-1 animate-pulse">
              ● ACTIVE TURN (RECITE ON MIC)
            </div>
          )}
        </div>

        {/* Center Round & Timer Indicator */}
        <div className="text-center bg-black border border-neutral-800 p-3 rounded-xl space-y-1">
          <div className="text-[10px] text-neutral-400 font-bold uppercase">
            {isGameOver ? "MATCH FINISHED" : `ROUND ${currentRound} OF 3`}
          </div>
          <div className="text-3xl font-black font-mono text-amber-400">
            {twisterTimer}S
          </div>
          <div className="text-[9px] text-neutral-500 font-bold uppercase">
            {isTimerRunning ? "🎙️ SPRINT IN PROGRESS" : "STANDBY"}
          </div>
        </div>

        {/* Player 2 Card (Friend) */}
        <div
          className={`p-3.5 border-2 rounded-xl transition-all ${
            activePlayer === 2 && !isGameOver
              ? "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400"
              : "border-neutral-800 bg-neutral-950 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
            <span>🔵 PLAYER 2 (FRIEND)</span>
            <span className="text-white font-black text-sm">{scoreP2} PTS</span>
          </div>
          <div className="text-sm font-black text-white truncate mt-1">{friendHandle}</div>
          {activePlayer === 2 && !isGameOver && (
            <div className="text-[10px] text-cyan-300 font-bold uppercase mt-1 animate-pulse">
              ● ACTIVE TURN (RECITE ON MIC)
            </div>
          )}
        </div>
      </div>

      {/* Main Twister Card */}
      {!isGameOver ? (
        <div className="bg-neutral-950 border-2 border-amber-400 p-5 rounded-xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span>LANGUAGE: {currentTwister.language}</span>
              <span>•</span>
              <span>DIFFICULTY: {currentTwister.difficulty}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                soundSynth.playSubtlePop();
                setTwisterIdx((i) => (i + 1) % TONGUE_TWISTERS.length);
              }}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-white rounded text-[10px] cursor-pointer"
            >
              CHANGE TWISTER ⏭️
            </button>
          </div>

          <div className="text-base sm:text-xl font-black text-white leading-relaxed tracking-wide">
            "{currentTwister.text}"
          </div>

          {currentTwister.transliteration && (
            <div className="text-xs text-neutral-400 italic">
              {currentTwister.transliteration}
            </div>
          )}

          {/* Turn Actions */}
          <div className="pt-3 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleStartSprint}
              disabled={isTimerRunning}
              className="w-full sm:w-auto py-3 px-8 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>{isTimerRunning ? "5S CLOCK RUNNING..." : `START ${activePlayer === 1 ? userHandle : friendHandle}'S 5S SPRINT 🎙️`}</span>
            </button>

            {/* Judging Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleScoreTurn(true)}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>FLAWLESS (+10 PTS)</span>
              </button>

              <button
                type="button"
                onClick={() => handleScoreTurn(false)}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>STUMBLED (0 PTS)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Game Over Trophy Celebration */
        <div className="bg-neutral-950 border-2 border-yellow-400 p-6 rounded-xl text-center space-y-4 shadow-2xl">
          <div className="text-4xl animate-bounce">👑</div>
          <h3 className="text-xl font-black text-yellow-400 uppercase tracking-wider">
            {scoreP1 > scoreP2
              ? `${userHandle} WINS THE TONGUE TWISTER DUEL!`
              : scoreP2 > scoreP1
              ? `${friendHandle} WINS THE TONGUE TWISTER DUEL!`
              : "EPIC TIE DUEL! BOTH PLAYERS ARE MASTERS!"}
          </h3>
          <div className="text-sm font-bold text-white">
            FINAL SCORE: {userHandle} ({scoreP1} PTS) — {friendHandle} ({scoreP2} PTS)
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetGame}
              className="py-3 px-8 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
            >
              [ 🔄 PLAY REMATCH ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
