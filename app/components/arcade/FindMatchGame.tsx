"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, CheckCircle, AlertTriangle } from "lucide-react";

interface FindMatchProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

// 31 Vibrant Distinct Symbols
const ALL_SYMBOLS = [
  "⚡", "🔥", "🍉", "🍕", "💎", "⭐", "🚀", "👑", "🍒", "🍄",
  "🎯", "🎲", "🦄", "🌈", "🍦", "🥑", "🎸", "🥊", "🏎️", "🛸",
  "🎃", "🍔", "🔔", "⚓", "🌵", "🍩", "🔑", "🎈", "🔮", "🪐", "🏆"
];

interface CardSymbol {
  icon: string;
  rotation: number;
  scale: number;
  x: number;
  y: number;
}

export default function FindMatchGame({
  match,
  currentUid,
  onBack,
}: FindMatchProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Scores: First to 10
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // Cards
  const [cardA, setCardA] = useState<CardSymbol[]>([]);
  const [cardB, setCardB] = useState<CardSymbol[]>([]);
  const [matchedIcon, setMatchedIcon] = useState<string>("");

  // Lockout penalty
  const [isLockedOut, setIsLockedOut] = useState(false);
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Layout 7 items on a circle
  const generateCardLayout = (symbols: string[]): CardSymbol[] => {
    return symbols.map((icon, idx) => {
      // 1 in center, 6 around circle
      let x = 0;
      let y = 0;
      if (idx > 0) {
        const angle = ((idx - 1) * (Math.PI * 2)) / (symbols.length - 1);
        const radius = 45; // % distance
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      }
      return {
        icon,
        rotation: Math.floor(Math.random() * 360),
        scale: 0.75 + Math.random() * 0.5, // 0.75x to 1.25x
        x,
        y,
      };
    });
  };

  // Generate pair of cards sharing exactly 1 matching icon
  const generateCardPair = useCallback(() => {
    // 1. Pick 1 matching icon
    const shuffled = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5);
    const common = shuffled[0];

    // 2. Pick 6 unique icons for Card A and 6 unique icons for Card B
    const cardASymbols = [common, ...shuffled.slice(1, 7)];
    const cardBSymbols = [common, ...shuffled.slice(7, 13)];

    // Shuffle each card
    const finalA = [...cardASymbols].sort(() => Math.random() - 0.5);
    const finalB = [...cardBSymbols].sort(() => Math.random() - 0.5);

    setMatchedIcon(common);
    setCardA(generateCardLayout(finalA));
    setCardB(generateCardLayout(finalB));
    setRoundWinner(null);
  }, []);

  // Start new match
  const startGame = useCallback(
    (mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
      setPlayMode(mode);
      setBotDiff(diff);
      setP1Score(0);
      setP2Score(0);
      setGameOver(false);
      setIsLockedOut(false);
      setInMenu(false);
      generateCardPair();
    },
    [generateCardPair]
  );

  // Player taps a symbol
  const handleSymbolTap = (icon: string) => {
    if (gameOver || isLockedOut || roundWinner !== null) return;

    if (icon === matchedIcon) {
      // Correct match!
      arcadeSfx.playMatchSuccess();
      setRoundWinner("p1");
      const nextScore = p1Score + 1;
      setP1Score(nextScore);

      if (nextScore >= 10) {
        setGameOver(true);
        arcadeSfx.playVictory();
        if (currentUid && match?.id) {
          updateArcadeGameScore(match.id, currentUid, "find_match" as any, 100, true);
        }
      } else {
        setTimeout(() => generateCardPair(), 900);
      }
    } else {
      // Penalty Lockout!
      arcadeSfx.playPenaltyBuzz();
      setIsLockedOut(true);
      setTimeout(() => setIsLockedOut(false), 1200);
    }
  };

  // Bot AI scan delay
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || roundWinner !== null) return;

    const delay = botDiff === "hard" ? 550 : botDiff === "medium" ? 950 : 1500;
    botTimeoutRef.current = setTimeout(() => {
      if (roundWinner !== null) return;

      // Bot finds the match!
      arcadeSfx.playMatchSuccess();
      setRoundWinner("p2");
      const nextScore = p2Score + 1;
      setP2Score(nextScore);

      if (nextScore >= 10) {
        setGameOver(true);
        arcadeSfx.playVictory();
      } else {
        setTimeout(() => generateCardPair(), 900);
      }
    }, delay);

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [inMenu, playMode, gameOver, roundWinner, botDiff, matchedIcon, p2Score, generateCardPair]);

  // Hero Graphic
  const findMatchHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-violet-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Left Card */}
          <circle cx="55" cy="80" r="38" fill="#ffffff" stroke="#8b5cf6" strokeWidth="4" />
          <text x="55" y="70" textAnchor="middle" fontSize="18">⚡</text>
          <text x="40" y="95" textAnchor="middle" fontSize="14">🍕</text>
          <text x="70" y="95" textAnchor="middle" fontSize="14">💎</text>

          {/* Right Card */}
          <circle cx="105" cy="80" r="38" fill="#ffffff" stroke="#ec4899" strokeWidth="4" />
          <text x="105" y="75" textAnchor="middle" fontSize="22">⚡</text>
          <text x="92" y="100" textAnchor="middle" fontSize="14">🍉</text>
          <text x="120" y="95" textAnchor="middle" fontSize="14">🚀</text>

          {/* Match Link */}
          <path d="M55,55 Q80,35 105,55" stroke="#f59e0b" strokeWidth="3" fill="none" strokeDasharray="4 3" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Spot the Single Match",
      desc: "Between both circular cards, there is mathematically ALWAYS exactly ONE matching symbol.",
      icon: "🔍",
    },
    {
      title: "Tap First to Score",
      desc: "Tap the identical symbol on either card before your opponent does. First to 10 points wins!",
      icon: "⚡",
    },
    {
      title: "Avoid False Taps",
      desc: "Tapping an incorrect symbol triggers a 1.2-second penalty lockout!",
      icon: "🚨",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-purple-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="FIND MATCH"
          subtitle="Visual Perception Duel"
          categoryTag="VISUAL SPEED"
          accentColor="#8B5CF6"
          objective="Spot the single identical symbol between both cards! Tap fast to score. First to 10 wins!"
          heroGraphic={findMatchHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-purple-400">YOU</span>
            <span className="text-2xl font-black text-purple-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-pink-400">
              {playMode === "bot" ? "BOT" : "P2"}
            </span>
            <span className="text-2xl font-black text-pink-500">{p2Score}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 10</span>
        </div>
      </div>

      {/* Penalty Warning / Status */}
      <div className="w-full max-w-sm text-center my-1">
        {isLockedOut ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full bg-red-600 text-white animate-bounce shadow-lg">
            🚨 PENALTY LOCKOUT (1.2s) 🚨
          </span>
        ) : roundWinner ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500 text-white shadow-lg">
            {roundWinner === "p1" ? "🎉 YOU FOUND IT!" : "🤖 OPPONENT FOUND IT!"}
          </span>
        ) : (
          <span className="text-xs font-black tracking-wider uppercase text-neutral-400">
            TAP THE SINGLE MATCHING ICON
          </span>
        )}
      </div>

      {/* The Two Spot It Cards */}
      <div className="w-full max-w-sm flex flex-col gap-4 items-center my-2">
        {/* Card A */}
        <div className="relative w-44 h-44 rounded-full bg-white shadow-2xl border-4 border-purple-500 flex items-center justify-center overflow-hidden">
          {cardA.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onPointerDown={() => handleSymbolTap(sym.icon)}
              className="absolute cursor-pointer transition-transform active:scale-125"
              style={{
                transform: `translate(${sym.x}px, ${sym.y}px) rotate(${sym.rotation}deg) scale(${sym.scale})`,
              }}
            >
              <span className="text-2xl">{sym.icon}</span>
            </button>
          ))}
        </div>

        {/* Card B */}
        <div className="relative w-44 h-44 rounded-full bg-white shadow-2xl border-4 border-pink-500 flex items-center justify-center overflow-hidden">
          {cardB.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onPointerDown={() => handleSymbolTap(sym.icon)}
              className="absolute cursor-pointer transition-transform active:scale-125"
              style={{
                transform: `translate(${sym.x}px, ${sym.y}px) rotate(${sym.rotation}deg) scale(${sym.scale})`,
              }}
            >
              <span className="text-2xl">{sym.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-50 animate-fadeIn text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
            🏆
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            {p1Score >= 10 ? "VICTORY!" : "DEFEATED!"}
          </h2>
          <p className="text-sm font-bold text-neutral-400 mt-1">
            Final Score: {p1Score} - {p2Score}
          </p>

          <button
            type="button"
            onPointerDown={() => startGame(playMode, botDiff)}
            className="w-full max-w-[220px] mt-6 py-3.5 bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {/* Objective footer */}
      <div className="w-full max-w-sm text-center py-2">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
          PROVE YOUR VISUAL ACUITY
        </span>
      </div>
    </div>
  );
}
