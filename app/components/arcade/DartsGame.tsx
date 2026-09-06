"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Target } from "lucide-react";

interface DartsGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface DartThrow {
  x: number;
  y: number;
  score: number;
  label: string;
}

// 20 sectors around dartboard in official standard clockwise order starting from top
const BOARD_SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export default function DartsGame({
  match,
  currentUid,
  onBack,
}: DartsGameProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // 301 Countdown
  const [p1Score, setP1Score] = useState(301);
  const [p2Score, setP2Score] = useState(301);
  const [currentTurn, setCurrentTurn] = useState<"p1" | "p2">("p1");
  const [dartsLeftInTurn, setDartsLeftInTurn] = useState(3);
  const [turnStartScore, setTurnStartScore] = useState(301);

  // Throws in current turn
  const [currentTurnThrows, setCurrentTurnThrows] = useState<DartThrow[]>([]);
  const [statusMessage, setStatusMessage] = useState("SWIPE UPWARD TO THROW DART");
  const [isBust, setIsBust] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Swipe gesture tracking
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isThrowing = useRef(false);

  // Checkout Helper Calculator (when score < 170)
  const getCheckoutHint = (score: number): string | null => {
    if (score > 170 || score <= 1) return null;
    if (score === 50) return "BULL (50)";
    if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
    if (score === 170) return "T20 -> T20 -> BULL";
    if (score === 167) return "T20 -> T19 -> BULL";
    if (score === 100) return "T20 -> D20";
    if (score === 60) return "S20 -> D20";
    return `NEED ${score}`;
  };

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(301);
    setP2Score(301);
    setTurnStartScore(301);
    setCurrentTurn("p1");
    setDartsLeftInTurn(3);
    setCurrentTurnThrows([]);
    setIsBust(false);
    setGameOver(false);
    setWinner(null);
    setStatusMessage("SWIPE UP TOWARD DARTBOARD!");
    isThrowing.current = false;
    setInMenu(false);
  }, []);

  // Board coordinate hit evaluation
  // Center is (180, 160) on 360x400 canvas
  const evaluateHit = useCallback(
    (x: number, y: number): DartThrow => {
      const cx = 180;
      const cy = 160;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Inner Bullseye (radius <= 8)
      if (dist <= 8) {
        return { x, y, score: 50, label: "DOUBLE BULL (50)" };
      }
      // Outer Bullseye (radius <= 18)
      if (dist <= 18) {
        return { x, y, score: 25, label: "BULLSEYE (25)" };
      }
      // Off board (radius > 115)
      if (dist > 115) {
        return { x, y, score: 0, label: "MISS (0)" };
      }

      // Calculate sector angle
      // 0 rad is (1, 0) (East = sector 6). North is -PI/2 (sector 20).
      let angle = Math.atan2(dy, dx); // -PI to PI
      let deg = (angle * 180) / Math.PI + 90; // 0 deg is North
      if (deg < 0) deg += 360;

      const sectorIndex = Math.floor(((deg + 9) % 360) / 18);
      const sectorNumber = BOARD_SECTORS[sectorIndex] || 20;

      // Triple ring (radius between 60 and 72)
      if (dist >= 60 && dist <= 72) {
        return { x, y, score: sectorNumber * 3, label: `TRIPLE ${sectorNumber} (${sectorNumber * 3})` };
      }
      // Double ring (radius between 102 and 114)
      if (dist >= 102 && dist <= 114) {
        return { x, y, score: sectorNumber * 2, label: `DOUBLE ${sectorNumber} (${sectorNumber * 2})` };
      }

      // Single sector
      return { x, y, score: sectorNumber, label: `SINGLE ${sectorNumber}` };
    },
    []
  );

  // Process a throw
  const processThrow = useCallback(
    (hit: DartThrow) => {
      arcadeSfx.playDartHit();
      setCurrentTurnThrows((prev) => [...prev, hit]);

      const activeScore = currentTurn === "p1" ? p1Score : p2Score;
      const remainingScore = activeScore - hit.score;

      if (remainingScore === 0) {
        // EXACT WIN!
        if (currentTurn === "p1") {
          setP1Score(0);
          setGameOver(true);
          setWinner("p1");
          arcadeSfx.playVictory();
          if (currentUid && match?.id) {
            updateArcadeGameScore(match.id, currentUid, "darts" as any, 301, true);
          }
        } else {
          setP2Score(0);
          setGameOver(true);
          setWinner("p2");
          arcadeSfx.playVictory();
        }
        return;
      } else if (remainingScore < 0 || remainingScore === 1) {
        // BUST!
        arcadeSfx.playPenaltyBuzz();
        setIsBust(true);
        setStatusMessage(`🚨 BUST! SCORE CANNOT DROP BELOW ZERO!`);

        setTimeout(() => {
          // Reset score to turn start
          if (currentTurn === "p1") setP1Score(turnStartScore);
          else setP2Score(turnStartScore);

          // Switch turns
          switchTurn();
        }, 1400);
        return;
      } else {
        // Normal hit
        if (currentTurn === "p1") setP1Score(remainingScore);
        else setP2Score(remainingScore);
        setStatusMessage(`HIT: ${hit.label}! REMAINING: ${remainingScore}`);

        const nextDarts = dartsLeftInTurn - 1;
        setDartsLeftInTurn(nextDarts);

        if (nextDarts <= 0) {
          setTimeout(() => switchTurn(), 1000);
        }
      }
    },
    [currentTurn, p1Score, p2Score, dartsLeftInTurn, turnStartScore, currentUid, match]
  );

  // Switch turn
  const switchTurn = () => {
    setIsBust(false);
    setCurrentTurnThrows([]);
    setDartsLeftInTurn(3);
    const nextTurn = currentTurn === "p1" ? "p2" : "p1";
    setCurrentTurn(nextTurn);
    setTurnStartScore(nextTurn === "p1" ? p1Score : p2Score);
    setStatusMessage(nextTurn === "p1" ? "YOUR TURN! SWIPE UP TO THROW!" : "OPPONENT'S TURN!");
    isThrowing.current = false;
  };

  // Pointer swipe handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameOver || isThrowing.current || (currentTurn === "p2" && playMode === "bot")) return;
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeStartRef.current || gameOver || isThrowing.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    const dt = Math.max(1, Date.now() - swipeStartRef.current.time);
    swipeStartRef.current = null;

    // Upward swipe check
    if (dy < -30) {
      isThrowing.current = true;
      arcadeSfx.playWhoosh();

      // Calculate board landing coords
      const power = Math.min(Math.abs(dy) / dt, 3.5);
      const angleOffset = dx * 0.4;
      const targetY = 160 + (2.5 - power) * 35 + (Math.random() - 0.5) * 15;
      const targetX = 180 + angleOffset + (Math.random() - 0.5) * 15;

      setTimeout(() => {
        const hit = evaluateHit(targetX, targetY);
        processThrow(hit);
        isThrowing.current = false;
      }, 250);
    }
  };

  // Bot AI throw loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || currentTurn !== "p2" || gameOver || isBust) return;

    const timer = setTimeout(() => {
      // Bot aims for T20 or Bull depending on score
      const spread = botDiff === "hard" ? 18 : botDiff === "medium" ? 35 : 55;
      const targetX = 180 + (Math.random() - 0.5) * spread;
      const targetY = 95 + (Math.random() - 0.5) * spread; // T20 sector y is ~95

      arcadeSfx.playWhoosh();
      setTimeout(() => {
        const hit = evaluateHit(targetX, targetY);
        processThrow(hit);
      }, 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, [inMenu, playMode, currentTurn, gameOver, isBust, botDiff, evaluateHit, processThrow]);

  // Hero Graphic
  const dartsHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Dartboard */}
          <circle cx="80" cy="80" r="65" fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
          <circle cx="80" cy="80" r="55" fill="#f8fafc" />
          {/* Double ring */}
          <circle cx="80" cy="80" r="55" stroke="#ef4444" strokeWidth="6" fill="none" />
          {/* Triple ring */}
          <circle cx="80" cy="80" r="35" stroke="#22c55e" strokeWidth="6" fill="none" />
          {/* Bullseye */}
          <circle cx="80" cy="80" r="14" fill="#22c55e" />
          <circle cx="80" cy="80" r="6" fill="#ef4444" />

          {/* Dart embedded */}
          <g transform="translate(80, 80) rotate(-45)">
            <line x1="0" y1="0" x2="35" y2="35" stroke="#94a3b8" strokeWidth="3" />
            <polygon points="35,35 48,32 45,45" fill="#ef4444" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "301 Countdown Duel",
      desc: "Start with 301 points. Each dart hit subtracts points from your total.",
      icon: "🎯",
    },
    {
      title: "Swipe Upward to Throw",
      desc: "Swipe up toward the board. Faster swipe = more power, angle = direction!",
      icon: "🚀",
    },
    {
      title: "Bust Rule & Exact Zero",
      desc: "You must reach exactly zero. Going below zero causes a BUST and resets the turn!",
      icon: "⚠️",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="DARTS 301"
          subtitle="Precision Aim Duel"
          categoryTag="DEXTERITY & AIM"
          accentColor="#E53935"
          objective="Swipe upward to throw darts! Reduce score from 301 to exactly zero. Avoid busting!"
          heroGraphic={dartsHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  const p1Checkout = getCheckoutHint(p1Score);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans cursor-pointer"
    >
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setInMenu(true);
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* 301 Scores */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">YOU</span>
            <span className="text-3xl font-black text-blue-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              {playMode === "bot" ? "BOT" : "P2"}
            </span>
            <span className="text-3xl font-black text-red-500">{p2Score}</span>
          </div>
        </div>

        {/* Darts in Round */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <span>🎯 {dartsLeftInTurn} LEFT</span>
        </div>
      </div>

      {/* Checkout Helper & Status */}
      <div className="w-full max-w-sm flex flex-col items-center gap-1 my-1">
        {p1Checkout && (
          <div className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
            CHECKOUT: {p1Checkout}
          </div>
        )}
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          {statusMessage}
        </div>
      </div>

      {/* 2.5D Dartboard Arena */}
      <div className="relative w-full max-w-sm h-[380px] bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 rounded-3xl border border-white/15 overflow-hidden shadow-2xl flex items-center justify-center">
        <svg viewBox="0 0 360 320" className="w-full h-full">
          {/* Outer Ring Wire */}
          <circle cx="180" cy="160" r="125" fill="#0f172a" stroke="#334155" strokeWidth="4" />
          <circle cx="180" cy="160" r="114" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />

          {/* Double Ring (Radius 102 - 114) */}
          <circle cx="180" cy="160" r="108" fill="none" stroke="#ef4444" strokeWidth="12" />

          {/* Triple Ring (Radius 60 - 72) */}
          <circle cx="180" cy="160" r="66" fill="none" stroke="#22c55e" strokeWidth="12" />

          {/* Outer Bull (Radius 18) */}
          <circle cx="180" cy="160" r="18" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
          {/* Inner Double Bull (Radius 8) */}
          <circle cx="180" cy="160" r="8" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />

          {/* Numbers around board */}
          {BOARD_SECTORS.map((num, i) => {
            const angle = ((i * 18 - 90) * Math.PI) / 180;
            const nx = 180 + Math.cos(angle) * 135;
            const ny = 160 + Math.sin(angle) * 135 + 4;
            return (
              <text
                key={num}
                x={nx}
                y={ny}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="12"
                fontWeight="900"
              >
                {num}
              </text>
            );
          })}

          {/* Darts Thrown */}
          {currentTurnThrows.map((dart, idx) => (
            <g key={idx} transform={`translate(${dart.x}, ${dart.y}) rotate(45)`}>
              <circle cx="0" cy="0" r="3" fill="#fbbf24" />
              <line x1="0" y1="0" x2="16" y2="16" stroke="#94a3b8" strokeWidth="2.5" />
              <polygon points="16,16 24,14 22,22" fill={currentTurn === "p1" ? "#3b82f6" : "#ef4444"} />
            </g>
          ))}
        </svg>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {winner === "p1" ? "301 CHECKOUT WIN!" : "DEFEAT!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              {winner === "p1" ? "You hit exact 0!" : "Opponent reached 0 first!"}
            </p>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Swipe Throw Guide */}
      <div className="w-full max-w-sm flex flex-col items-center py-2">
        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center animate-bounce">
          ▲
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400 mt-1">
          SWIPE UPWARD TO FLICK DART
        </span>
      </div>
    </div>
  );
}
