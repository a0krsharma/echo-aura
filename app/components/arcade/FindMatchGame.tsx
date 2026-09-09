"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Flame, Zap, Shield } from "lucide-react";

interface FindMatchProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
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
  onInviteFriend,
  onRandomMatch,
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

  // Match laser beam positions
  const [matchBeam, setMatchBeam] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  // Reaction timer & lockouts
  const roundStartTimeRef = useRef(Date.now());
  const [p1LockedOut, setP1LockedOut] = useState(false);
  const [p2LockedOut, setP2LockedOut] = useState(false);
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
        scale: 0.85 + Math.random() * 0.4,
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
    setP1LockedOut(false);
    setP2LockedOut(false);

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

    setTimeout(() => {
      setIsDealing(false);
    }, 280);
  }, []);

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setStreak(0);
    setGameOver(false);
    setInMenu(false);
    generateCardPair();
  }, [generateCardPair]);

  // Handle symbol tap from a player
  const handleSymbolTap = (icon: string, player: "p1" | "p2") => {
    if (gameOver || isDealing || roundWinner) return;

    if (player === "p1" && p1LockedOut) return;
    if (player === "p2" && p2LockedOut) return;

    if (icon === matchedIcon) {
      // CORRECT MATCH FOUND!
      const reactionTime = Date.now() - roundStartTimeRef.current;
      arcadeSfx.playMatchSuccess();
      setRoundWinner(player);

      // Spawn celebratory confetti
      const newConfetti: Confetti[] = [];
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 6;
        newConfetti.push({
          x: 180,
          y: 200,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          color: ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6"][i % 5],
          life: 1,
          size: 4 + Math.random() * 4,
        });
      }
      setConfetti(newConfetti);

      if (player === "p1") {
        setStreak((s) => s + 1);
        if (reactionTime < 1300) {
          setSpeedBonusText("⚡ LIGHTNING FAST! (<1.3s)");
        } else {
          setSpeedBonusText("🎉 MATCH FOUND!");
        }

        setP1Score((s) => {
          const next = s + 1;
          if (next >= 10) {
            setGameOver(true);
            arcadeSfx.playVictory();
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "find_match" as any, 100, true);
            }
          }
          return next;
        });
      } else {
        setStreak(0);
        setSpeedBonusText(playMode === "bot" ? "🤖 BOT FOUND MATCH!" : "💥 PLAYER 2 SCORED!");

        setP2Score((s) => {
          const next = s + 1;
          if (next >= 10) {
            setGameOver(true);
            arcadeSfx.playVictory();
          }
          return next;
        });
      }

      // Deal next card after brief delay
      setTimeout(() => {
        if (!gameOver) generateCardPair();
      }, 1000);
    } else {
      // WRONG GUESS -> 1.2s Penalty Lockout for this player!
      arcadeSfx.playPenaltyBuzz();
      if (player === "p1") {
        setP1LockedOut(true);
        setTimeout(() => setP1LockedOut(false), 1200);
      } else {
        setP2LockedOut(true);
        setTimeout(() => setP2LockedOut(false), 1200);
      }
    }
  };

  // Bot AI search loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || isDealing || roundWinner || p2LockedOut) {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      return;
    }

    const botDelay =
      botDiff === "hard"
        ? 950 + Math.random() * 550 // ~1.2s (Hard)
        : botDiff === "medium"
        ? 1600 + Math.random() * 900 // ~2.0s (Medium)
        : 2600 + Math.random() * 1200; // ~3.2s (Easy)

    botTimeoutRef.current = setTimeout(() => {
      if (!isDealing && !roundWinner && !p2LockedOut) {
        handleSymbolTap(matchedIcon, "p2");
      }
    }, botDelay);

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [inMenu, playMode, gameOver, isDealing, roundWinner, p2LockedOut, matchedIcon, botDiff]);

  // Confetti physics decay loop
  useEffect(() => {
    if (confetti.length === 0) return;
    const interval = setInterval(() => {
      setConfetti((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 0.3,
            life: c.life - 0.05,
          }))
          .filter((c) => c.life > 0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [confetti]);

  const matchHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-purple-950/40 rounded-2xl flex items-center justify-center border border-purple-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="60" cy="80" r="32" fill="#ffffff" stroke="#8b5cf6" strokeWidth="3" />
          <circle cx="100" cy="80" r="32" fill="#ffffff" stroke="#ec4899" strokeWidth="3" />
          <text x="60" y="86" fontSize="22" textAnchor="middle">⚡</text>
          <text x="100" y="86" fontSize="22" textAnchor="middle">⚡</text>
          <line x1="60" y1="80" x2="100" y2="80" stroke="#facc15" strokeWidth="3" strokeDasharray="4 2" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "1 Exact Matching Symbol",
      desc: "Between any two cards, there is ALWAYS exactly ONE shared icon!",
      icon: "🔍",
    },
    {
      title: "Race to Spot It First",
      desc: "Tap the match before your opponent! In 2-Player, both race simultaneously.",
      icon: "⚡",
    },
    {
      title: "Penalty for Misses",
      desc: "Tapping a wrong icon locks you out for 1.2s while your rival searches freely! First to 10 wins.",
      icon: "🚨",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-purple-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="FIND MATCH"
          subtitle="Projective Geometry Duel"
          categoryTag="SPEED RECOGNITION"
          accentColor="#8B5CF6"
          objective="Spot the single matching icon between the two cards! First to 10 points wins."
          heroGraphic={matchHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={onInviteFriend || (() => startGame("friend"))}
          onPlayBot={(diff) => startGame("bot", diff)}
          onRandomMatch={onRandomMatch}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  // Render a circular Dobble card
  const renderCard = (card: CardSymbol[], borderColor: string, label: string) => (
    <div
      className={`relative w-40 h-40 rounded-full bg-gradient-to-br from-white via-neutral-50 to-neutral-200 shadow-xl border-4 ${borderColor} flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isDealing ? "scale-90 opacity-40" : "scale-100 opacity-100"
      }`}
    >
      <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/50 pointer-events-none" />

      {card.map((sym, idx) => (
        <button
          key={idx}
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            // In 2-Player Friend mode: check if touch is in top half (P2) or bottom half (P1)
            const clientY = e.clientY;
            const screenHeight = window.innerHeight;
            const isP2Touch = playMode === "friend" && clientY < screenHeight / 2;
            handleSymbolTap(sym.icon, isP2Touch ? "p2" : "p1");
          }}
          className="absolute cursor-pointer transition-transform active:scale-130 select-none touch-none p-1"
          style={{
            transform: `translate(${sym.x}px, ${sym.y}px) rotate(${sym.rotation}deg) scale(${sym.scale})`,
          }}
        >
          <span className="text-2xl drop-shadow-xs">{sym.icon}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-1 z-20">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Duel Score */}
        <div className="flex items-center gap-4 bg-neutral-900/90 px-4 py-1.5 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">YOU (P1)</span>
            <span className="text-2xl font-black text-blue-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2"}
            </span>
            <span className="text-2xl font-black text-red-500">{p2Score}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 10</span>
        </div>
      </div>

      {/* Lockout / Status Banners */}
      <div className="w-full max-w-sm h-7 flex items-center justify-center my-0.5 z-20">
        {p1LockedOut ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-red-600 text-white animate-bounce shadow-lg">
            🚨 P1 LOCKED OUT (1.2s)
          </span>
        ) : p2LockedOut ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-red-600 text-white animate-bounce shadow-lg">
            🚨 P2 LOCKED OUT (1.2s)
          </span>
        ) : speedBonusText ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-amber-500 text-neutral-950 animate-bounce shadow-lg">
            {speedBonusText}
          </span>
        ) : (
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
            TAP THE 1 EXACT MATCHING ICON
          </span>
        )}
      </div>

      {/* Cards Area (Tabletop friendly with Card A & Card B) */}
      <div className="w-full max-w-sm flex flex-col gap-3 items-center my-1 relative z-10">
        {/* Card A (Purple Border) */}
        {renderCard(cardA, "border-purple-500", "CARD A")}

        {/* Center Match Symbol Hint on reveal */}
        <div className="h-6 flex items-center justify-center">
          {roundWinner && (
            <span className="text-lg font-black text-amber-400 bg-neutral-900/90 px-3 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
              MATCH: {matchedIcon}
            </span>
          )}
        </div>

        {/* Card B (Pink Border) */}
        {renderCard(cardB, "border-pink-500", "CARD B")}
      </div>

      {/* Confetti */}
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
            {p1Score >= 10 ? "PLAYER 1 VICTORY!" : "PLAYER 2 VICTORY!"}
          </h2>
          <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Score} - {p2Score}</p>

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

      {/* Footer prompt */}
      <div className="w-full max-w-sm text-center py-1 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {playMode === "friend" ? "2-PLAYER TABLETOP: FIRST TO TAP WINS POINT" : "FIND THE ICON BEFORE THE BOT!"}
        </span>
      </div>
    </div>
  );
}
