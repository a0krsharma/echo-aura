"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Flame, Zap } from "lucide-react";

interface FindMatchProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

// 36 Vibrant Distinct Symbols
const ALL_SYMBOLS = [
  "⚡", "🔥", "🍉", "🍕", "💎", "⭐", "🚀", "👑", "🍒", "🍄",
  "🎯", "🎲", "🦄", "🌈", "🍦", "🥑", "🎸", "🥊", "🏎️", "🛸",
  "🎃", "🍔", "🔔", "⚓", "🌵", "🍩", "🔑", "🎈", "🔮", "🪐",
  "🏆", "💣", "🍀", "🍓", "🧁", "⚓"
];

interface CardSymbol {
  icon: string;
  rotation: number;
  scale: number;
  x: number;
  y: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
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
  const [streak, setStreak] = useState(0);
  const [speedBonusText, setSpeedBonusText] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // Cards
  const [cardA, setCardA] = useState<CardSymbol[]>([]);
  const [cardB, setCardB] = useState<CardSymbol[]>([]);
  const [matchedIcon, setMatchedIcon] = useState<string>("");
  const [isDealing, setIsDealing] = useState(false);

  // Match laser beam positions (relative to screen / container)
  const [matchBeam, setMatchBeam] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  // Reaction timer
  const roundStartTimeRef = useRef(Date.now());
  const cardARef = useRef<HTMLDivElement | null>(null);
  const cardBRef = useRef<HTMLDivElement | null>(null);

  // Lockout penalty
  const [isLockedOut, setIsLockedOut] = useState(false);
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Layout 8 items symmetrically on a circle (1 in center, 7 outer)
  const generateCardLayout = (symbols: string[]): CardSymbol[] => {
    return symbols.map((icon, idx) => {
      let x = 0;
      let y = 0;
      if (idx > 0) {
        const angle = ((idx - 1) * (Math.PI * 2)) / (symbols.length - 1);
        const radius = 48; // % distance from center
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      }
      return {
        icon,
        rotation: Math.floor(Math.random() * 360),
        scale: 0.85 + Math.random() * 0.4, // 0.85x to 1.25x
        x,
        y,
      };
    });
  };

  // Generate pair of cards sharing exactly 1 matching icon
  const generateCardPair = useCallback(() => {
    setIsDealing(true);
    setMatchBeam(null);
    setSpeedBonusText(null);

    // 1. Pick 1 matching icon
    const shuffled = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5);
    const common = shuffled[0];

    // 2. Pick 7 unique icons for Card A and 7 unique icons for Card B
    const cardASymbols = [common, ...shuffled.slice(1, 8)];
    const cardBSymbols = [common, ...shuffled.slice(8, 15)];

    const finalA = [...cardASymbols].sort(() => Math.random() - 0.5);
    const finalB = [...cardBSymbols].sort(() => Math.random() - 0.5);

    setMatchedIcon(common);
    setCardA(generateCardLayout(finalA));
    setCardB(generateCardLayout(finalB));
    setRoundWinner(null);
    roundStartTimeRef.current = Date.now();

    setTimeout(() => setIsDealing(false), 250);
  }, []);

  // Start new match
  const startGame = useCallback(
    (mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
      setPlayMode(mode);
      setBotDiff(diff);
      setP1Score(0);
      setP2Score(0);
      setStreak(0);
      setSpeedBonusText(null);
      setGameOver(false);
      setIsLockedOut(false);
      setMatchBeam(null);
      setConfetti([]);
      setInMenu(false);
      generateCardPair();
    },
    [generateCardPair]
  );

  // Confetti particles loop
  useEffect(() => {
    if (confetti.length === 0) return;
    const timer = setInterval(() => {
      setConfetti((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 0.35,
            life: c.life - 0.05,
          }))
          .filter((c) => c.life > 0)
      );
    }, 30);
    return () => clearInterval(timer);
  }, [confetti.length]);

  // Spawn starburst particles
  const spawnFireworks = (x: number, y: number) => {
    const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444"];
    const burst: Confetti[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const speed = 3 + Math.random() * 5;
      burst.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        size: 3 + Math.random() * 3,
      });
    }
    setConfetti((prev) => [...prev, ...burst]);
  };

  // Player taps a symbol
  const handleSymbolTap = (icon: string, e: React.PointerEvent) => {
    if (gameOver || isLockedOut || roundWinner !== null || isDealing) return;

    if (icon === matchedIcon) {
      // Correct match!
      arcadeSfx.playMatchSuccess();
      setRoundWinner("p1");

      // Calculate reaction speed bonus
      const reactionSec = (Date.now() - roundStartTimeRef.current) / 1000;
      let bonusText = "";
      if (reactionSec < 1.2) {
        bonusText = "⚡ SPEED DEMON! (0." + Math.floor(reactionSec * 10) + "s)";
      } else if (reactionSec < 2.0) {
        bonusText = "🔥 LIGHTNING FAST!";
      }
      setSpeedBonusText(bonusText);

      // Trigger Golden Beam between cards
      setMatchBeam({ x1: 180, y1: 120, x2: 180, y2: 280 });

      // Spawn fireworks at touch point
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      spawnFireworks(rect.left + rect.width / 2, rect.top + rect.height / 2);

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const nextScore = p1Score + 1;
      setP1Score(nextScore);

      if (nextScore >= 10) {
        setGameOver(true);
        arcadeSfx.playVictory();
        if (currentUid && match?.id) {
          updateArcadeGameScore(match.id, currentUid, "find_match" as any, 150, true);
        }
      } else {
        setTimeout(() => generateCardPair(), 950);
      }
    } else {
      // Penalty Lockout!
      arcadeSfx.playPenaltyBuzz();
      setIsLockedOut(true);
      setStreak(0);
      setTimeout(() => setIsLockedOut(false), 1200);
    }
  };

  // Bot AI scan delay
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || roundWinner !== null || isDealing) return;

    const delay = botDiff === "hard" ? 600 : botDiff === "medium" ? 1100 : 1600;
    botTimeoutRef.current = setTimeout(() => {
      if (roundWinner !== null) return;

      // Bot finds the match!
      arcadeSfx.playMatchSuccess();
      setRoundWinner("p2");
      setStreak(0);
      setMatchBeam({ x1: 180, y1: 120, x2: 180, y2: 280 });

      const nextScore = p2Score + 1;
      setP2Score(nextScore);

      if (nextScore >= 10) {
        setGameOver(true);
        arcadeSfx.playVictory();
      } else {
        setTimeout(() => generateCardPair(), 950);
      }
    }, delay);

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [inMenu, playMode, gameOver, roundWinner, isDealing, botDiff, matchedIcon, p2Score, generateCardPair]);

  // Hero Graphic
  const findMatchHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-purple-950/40 rounded-2xl flex items-center justify-center border border-purple-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Left Casino Card */}
          <circle cx="55" cy="80" r="38" fill="#ffffff" stroke="#8b5cf6" strokeWidth="4" />
          <circle cx="55" cy="80" r="34" fill="none" stroke="#ca8a04" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x="55" y="70" textAnchor="middle" fontSize="18">⚡</text>
          <text x="40" y="95" textAnchor="middle" fontSize="14">🍕</text>
          <text x="70" y="95" textAnchor="middle" fontSize="14">💎</text>

          {/* Right Casino Card */}
          <circle cx="105" cy="80" r="38" fill="#ffffff" stroke="#ec4899" strokeWidth="4" />
          <circle cx="105" cy="80" r="34" fill="none" stroke="#ca8a04" strokeWidth="1.5" strokeDasharray="3 2" />
          <text x="105" y="75" textAnchor="middle" fontSize="22">⚡</text>
          <text x="92" y="100" textAnchor="middle" fontSize="14">🍉</text>
          <text x="120" y="95" textAnchor="middle" fontSize="14">🚀</text>

          {/* Golden Beam */}
          <path d="M55,55 Q80,35 105,55" stroke="#f59e0b" strokeWidth="3.5" fill="none" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Spot the Single Match",
      desc: "Between both circular casino cards, there is mathematically ALWAYS exactly ONE matching symbol.",
      icon: "🔍",
    },
    {
      title: "Speed Demon Multipliers",
      desc: "Tap the match within 1.5s to trigger Speed Demon combo multipliers! Build up your win streak!",
      icon: "⚡",
    },
    {
      title: "Avoid False Taps",
      desc: "Tapping an incorrect symbol triggers a 1.2-second penalty lockout! First to 10 points wins!",
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
          objective="Spot the single identical symbol between both cards! Tap fast for Speed Demon combos. First to 10 wins!"
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
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2 z-20">
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

        {/* Streak Flame Badge */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>{streak > 1 ? `STREAK x${streak}` : "TO 10"}</span>
        </div>
      </div>

      {/* Speed Bonus / Penalty Warning / Status */}
      <div className="w-full max-w-sm h-7 flex items-center justify-center my-1 z-20">
        {isLockedOut ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full bg-red-600 text-white animate-bounce shadow-lg">
            🚨 PENALTY LOCKOUT (1.2s) 🚨
          </span>
        ) : speedBonusText ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-amber-500 text-neutral-950 animate-bounce shadow-lg">
            {speedBonusText}
          </span>
        ) : roundWinner ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-emerald-500 text-white shadow-lg">
            {roundWinner === "p1" ? "🎉 YOU FOUND IT!" : "🤖 OPPONENT FOUND IT!"}
          </span>
        ) : (
          <span className="text-xs font-black tracking-wider uppercase text-neutral-400">
            TAP THE SINGLE MATCHING ICON
          </span>
        )}
      </div>

      {/* The Two Spot It Embossed Casino Cards */}
      <div className="w-full max-w-sm flex flex-col gap-4 items-center my-1 relative z-10">
        {/* Golden Match Link Laser Beam */}
        {matchBeam && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            <div className="w-1.5 h-44 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.9)] animate-pulse rounded-full" />
          </div>
        )}

        {/* Card A (Purple Foil Trim + Gold Stitch) */}
        <div
          ref={cardARef}
          className={`relative w-44 h-44 rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-200 shadow-[0_12px_32px_rgba(139,92,246,0.35)] border-4 border-purple-500 flex items-center justify-center overflow-hidden transition-all duration-300 ${
            isDealing ? "scale-90 opacity-40" : "scale-100 opacity-100"
          } ${isLockedOut ? "animate-shake" : ""}`}
        >
          {/* Inner gold foil dashed ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/60 pointer-events-none" />

          {cardA.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onPointerDown={(e) => handleSymbolTap(sym.icon, e)}
              className="absolute cursor-pointer transition-transform active:scale-130 select-none touch-none p-1"
              style={{
                transform: `translate(${sym.x}px, ${sym.y}px) rotate(${sym.rotation}deg) scale(${sym.scale})`,
              }}
            >
              <span className="text-2xl drop-shadow-xs">{sym.icon}</span>
            </button>
          ))}
        </div>

        {/* Card B (Pink Foil Trim + Gold Stitch) */}
        <div
          ref={cardBRef}
          className={`relative w-44 h-44 rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-200 shadow-[0_12px_32px_rgba(236,72,153,0.35)] border-4 border-pink-500 flex items-center justify-center overflow-hidden transition-all duration-300 ${
            isDealing ? "scale-90 opacity-40" : "scale-100 opacity-100"
          } ${isLockedOut ? "animate-shake" : ""}`}
        >
          {/* Inner gold foil dashed ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/60 pointer-events-none" />

          {cardB.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onPointerDown={(e) => handleSymbolTap(sym.icon, e)}
              className="absolute cursor-pointer transition-transform active:scale-130 select-none touch-none p-1"
              style={{
                transform: `translate(${sym.x}px, ${sym.y}px) rotate(${sym.rotation}deg) scale(${sym.scale})`,
              }}
            >
              <span className="text-2xl drop-shadow-xs">{sym.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Confetti / Fireworks Layer */}
      {confetti.map((c, i) => (
        <div
          key={i}
          className="fixed rounded-full pointer-events-none z-50"
          style={{
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            opacity: c.life,
          }}
        />
      ))}

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
            Final Score: {p1Score} - {p2Score} (Max Streak: x{streak})
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
      <div className="w-full max-w-sm text-center py-2 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
          PROVE YOUR VISUAL ACUITY • ONE EXACT MATCH ALWAYS EXISTS
        </span>
      </div>
    </div>
  );
}

