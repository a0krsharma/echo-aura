"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Flame, Trophy, Zap, Sparkles } from "lucide-react";

interface RPSGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

type Choice = "rock" | "paper" | "scissors";

const CHOICES: { id: Choice; name: string; emoji: string; color: string; beats: Choice; effect: string }[] = [
  { id: "rock", name: "ROCK", emoji: "🪨", color: "#64748b", beats: "scissors", effect: "SHATTERS" },
  { id: "paper", name: "PAPER", emoji: "📄", color: "#38bdf8", beats: "rock", effect: "ENVELOPS" },
  { id: "scissors", name: "SCISSORS", emoji: "✂️", color: "#f43f5e", beats: "paper", effect: "SLICES" },
];

export default function RockPaperScissorsGame({
  match,
  currentUid,
  onBack,
}: RPSGameProps) {
  const initialMode: "bot" | "friend" = match?.mode === "MULTIPLAYER" ? "friend" : "bot";
  const rawDiff = (match?.difficulty || "").toLowerCase();
  const initialDiff: BotDifficulty = rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
  const hasPreselectedMode = Boolean(match?.mode);

  const [inMenu, setInMenu] = useState(!hasPreselectedMode);
  const [playMode, setPlayMode] = useState<"bot" | "friend">(initialMode);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

  // Scores
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);

  // Round phase
  const [countdown, setCountdown] = useState<number | null>(null);
  const [p1Choice, setP1Choice] = useState<Choice | null>(null);
  const [p2Choice, setP2Choice] = useState<Choice | null>(null);
  const [roundResult, setRoundResult] = useState<"p1" | "p2" | "tie" | null>(null);
  const [clashAnimation, setClashAnimation] = useState(false);
  const [bouncingHand, setBouncingHand] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  const historyRef = useRef<Choice[]>([]);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  // Start a round
  const startRound = useCallback((overtime: boolean) => {
    setP1Choice(null);
    setP2Choice(null);
    setRoundResult(null);
    setClashAnimation(false);
    setIsOvertime(overtime);

    let step = 3;
    setCountdown(step);
    arcadeSfx.playButtonTap();

    countdownTimer.current = setInterval(() => {
      step -= 1;
      setBouncingHand((b) => (b + 1) % 2);

      if (step > 0) {
        setCountdown(step);
        arcadeSfx.playButtonTap();
      } else {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        setCountdown(0);
      }
    }, 650);
  }, []);

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setP1Streak(0);
    setIsOvertime(false);
    setGameOver(false);
    setWinner(null);
    historyRef.current = [];
    setInMenu(false);
    startRound(false);
  }, [startRound]);

  // Auto-start immediately if mode & difficulty were chosen in lobby (never ask twice)
  useEffect(() => {
    if (hasPreselectedMode) {
      startGame(initialMode, initialDiff);
    }
  }, [hasPreselectedMode, initialMode, initialDiff, startGame]);

  // Bot AI
  const predictPlayerMove = useCallback((): Choice => {
    const history = historyRef.current;
    if (history.length < 2 || botDiff === "easy") {
      return CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
    }

    const lastMove = history[history.length - 1];
    if (botDiff === "hard") {
      const counterToLast = CHOICES.find((c) => c.beats === lastMove)?.id || "rock";
      return CHOICES.find((c) => c.beats === counterToLast)?.id || "paper";
    }

    if (Math.random() < 0.6) {
      return CHOICES.find((c) => c.beats === lastMove)?.id || "scissors";
    }
    return CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
  }, [botDiff]);

  // Evaluate round
  const evaluateRound = useCallback(
    (p1: Choice, p2: Choice) => {
      historyRef.current.push(p1);

      // Trigger center clash impact
      setClashAnimation(true);

      setTimeout(() => {
        if (p1 === p2) {
          setRoundResult("tie");
          arcadeSfx.playWhoosh();
          setTimeout(() => startRound(true), 1200);
          return;
        }

        const p1Rule = CHOICES.find((c) => c.id === p1);
        if (p1Rule && p1Rule.beats === p2) {
          // P1 Wins
          setRoundResult("p1");
          arcadeSfx.playMatchSuccess();
          const nextScore = p1Score + 1;
          const nextStreak = p1Streak + 1;
          setP1Score(nextScore);
          setP1Streak(nextStreak);

          if (nextScore >= 3) {
            setGameOver(true);
            setWinner("p1");
            arcadeSfx.playVictory();
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "rock_paper_scissors" as any, 30, true);
            }
          } else {
            setTimeout(() => startRound(false), 1500);
          }
        } else {
          // P2 Wins
          setRoundResult("p2");
          arcadeSfx.playPenaltyBuzz();
          const nextScore = p2Score + 1;
          setP2Score(nextScore);
          setP1Streak(0);

          if (nextScore >= 3) {
            setGameOver(true);
            setWinner("p2");
            arcadeSfx.playVictory();
          } else {
            setTimeout(() => startRound(false), 1500);
          }
        }
      }, 350);
    },
    [p1Score, p2Score, p1Streak, currentUid, match, startRound]
  );

  const handleSelectChoice = (choice: Choice) => {
    if (p1Choice !== null || gameOver) return;

    arcadeSfx.playButtonTap();
    setP1Choice(choice);

    const botChoice = predictPlayerMove();
    setP2Choice(botChoice);

    evaluateRound(choice, botChoice);
  };

  // Hero Graphic
  const rpsHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="50" cy="55" r="26" fill="#64748b" />
          <path d="M35 50 Q50 30 65 50 Q70 70 50 75 Q30 70 35 50 Z" fill="#94a3b8" />
          <text x="50" y="62" textAnchor="middle" fontSize="22">🪨</text>
          <rect x="85" y="30" width="44" height="52" rx="6" fill="#38bdf8" />
          <text x="107" y="70" textAnchor="middle" fontSize="22">📄</text>
          <circle cx="80" cy="115" r="26" fill="#f43f5e" />
          <text x="80" y="122" textAnchor="middle" fontSize="22">✂️</text>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tactile 1-2-3 Countdown",
      desc: "Lock in Rock, Paper, or Scissors before countdown ends: Rock crushes Scissors, Scissors cut Paper, Paper wraps Rock.",
      icon: "🪨",
    },
    {
      title: "Center Clash Particles",
      desc: "Hands rush to clash in the center with custom elemental destruction animations!",
      icon: "💥",
    },
    {
      title: "Sudden Death Overtime",
      desc: "Ties trigger instant overtime with a 1.5s rapid-fire limit. First to 3 wins takes the match!",
      icon: "⚡",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-blue-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="ROCK PAPER SCISSORS"
          subtitle="Timing & Strategy Duel"
          categoryTag="STRATEGY REFLEX"
          accentColor="#1E88E5"
          objective="Select Rock, Paper, or Scissors before countdown ends! Ties trigger rapid overtime. First to 3 wins!"
          heroGraphic={rpsHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans ${
        p1Streak >= 2 ? "ring-4 ring-amber-500 shadow-amber-500/50 shadow-2xl" : ""
      }`}
    >
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score Board */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-300">YOU</span>
            <span className="text-2xl font-black text-blue-400">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-cyan-300">
              {playMode === "bot" ? "BOT" : "P2"}
            </span>
            <span className="text-2xl font-black text-cyan-400">{p2Score}</span>
          </div>
        </div>

        {/* Momentum Streak */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          {p1Streak > 0 ? (
            <>
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{p1Streak}x STREAK</span>
            </>
          ) : (
            <>
              <Trophy className="w-3.5 h-3.5" />
              <span>TO 3</span>
            </>
          )}
        </div>
      </div>

      {/* Overtime Banner */}
      {isOvertime && (
        <div className="w-full max-w-sm text-center my-1 animate-pulse">
          <span className="text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>SUDDEN DEATH OVERTIME (1.5s)</span>
          </span>
        </div>
      )}

      {/* Duel Arena */}
      <div className="relative w-full max-w-sm h-[380px] bg-gradient-to-b from-blue-950/40 via-neutral-900 to-cyan-950/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between items-center p-6">
        {/* Opponent Hand (Top) */}
        <div className="w-full flex flex-col items-center">
          <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-2">
            {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "PLAYER 2"}
          </div>

          <div
            className={`w-28 h-28 rounded-3xl border-4 flex items-center justify-center text-5xl transition-all duration-200 shadow-2xl ${
              p2Choice
                ? "bg-cyan-600/30 border-cyan-400 scale-105"
                : "bg-neutral-800/60 border-neutral-700"
            } ${clashAnimation ? "translate-y-12 scale-110" : ""}`}
          >
            {p2Choice ? (
              <span>{CHOICES.find((c) => c.id === p2Choice)?.emoji}</span>
            ) : countdown !== null && countdown > 0 ? (
              <span className={`transition-transform duration-150 ${bouncingHand ? "-translate-y-2" : "translate-y-2"}`}>
                ✊
              </span>
            ) : (
              <span className="text-neutral-500">❓</span>
            )}
          </div>
        </div>

        {/* Center Countdown / Clash Particles */}
        <div className="flex flex-col items-center my-2 relative">
          {clashAnimation && (
            <div className="absolute -top-4 text-4xl animate-ping pointer-events-none">
              💥
            </div>
          )}

          {countdown !== null && countdown > 0 ? (
            <div className="text-4xl font-black text-amber-400 animate-bounce">
              {countdown}
            </div>
          ) : roundResult ? (
            <div
              className={`text-xl font-black uppercase tracking-wider px-4 py-1.5 rounded-xl shadow-lg animate-fadeIn ${
                roundResult === "p1"
                  ? "bg-emerald-500 text-white"
                  : roundResult === "p2"
                  ? "bg-red-500 text-white"
                  : "bg-amber-500 text-neutral-950"
              }`}
            >
              {roundResult === "p1"
                ? "YOU WIN ROUND!"
                : roundResult === "p2"
                ? "OPPONENT WINS!"
                : "DRAW / TIE!"}
            </div>
          ) : (
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              SELECT YOUR MOVE
            </div>
          )}
        </div>

        {/* Player Hand (Bottom) */}
        <div className="w-full flex flex-col items-center">
          <div
            className={`w-28 h-28 rounded-3xl border-4 flex items-center justify-center text-5xl transition-all duration-200 shadow-2xl ${
              p1Choice
                ? "bg-blue-600/30 border-blue-400 scale-105"
                : "bg-neutral-800/60 border-neutral-700"
            } ${clashAnimation ? "-translate-y-12 scale-110" : ""}`}
          >
            {p1Choice ? (
              <span>{CHOICES.find((c) => c.id === p1Choice)?.emoji}</span>
            ) : countdown !== null && countdown > 0 ? (
              <span className={`transition-transform duration-150 ${bouncingHand ? "translate-y-2" : "-translate-y-2"}`}>
                ✊
              </span>
            ) : (
              <span className="text-neutral-500">❓</span>
            )}
          </div>

          <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mt-2">
            YOUR MOVE
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {winner === "p1" ? "MATCH WON!" : "DEFEAT!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Score} - {p2Score}</p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-blue-500 hover:bg-blue-600 border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* 3D Icon Selection Buttons */}
      <div className="w-full max-w-sm grid grid-cols-3 gap-3 mt-4">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={p1Choice !== null || gameOver}
            onPointerDown={() => handleSelectChoice(choice.id)}
            className={`h-24 rounded-2xl border-b-4 flex flex-col items-center justify-center shadow-lg transition-all cursor-pointer ${
              p1Choice === choice.id
                ? "bg-white text-neutral-950 border-neutral-300 scale-105"
                : "bg-neutral-800 hover:bg-neutral-700 border-neutral-900 active:border-b-0 active:translate-y-1 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-3xl">{choice.emoji}</span>
            <span className="text-[11px] font-black uppercase tracking-wider mt-1">
              {choice.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
