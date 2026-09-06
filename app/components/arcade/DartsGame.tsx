"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Target, Sparkles, Volume2 } from "lucide-react";

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
  isTriple?: boolean;
  isDouble?: boolean;
  isBull?: boolean;
}

interface FlyingDart {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  hit: DartThrow;
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
  const [turnTotalScore, setTurnTotalScore] = useState(0);

  // Throws in current turn
  const [currentTurnThrows, setCurrentTurnThrows] = useState<DartThrow[]>([]);
  const [statusMessage, setStatusMessage] = useState("SWIPE UPWARD TO THROW DART");
  const [announcerBanner, setAnnouncerBanner] = useState<string | null>(null);
  const [isBust, setIsBust] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Dynamic Camera Zoom
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flyingDartRef = useRef<FlyingDart | null>(null);

  // Swipe gesture tracking
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isThrowing = useRef(false);

  // Comprehensive Checkout Calculator (when score <= 170)
  const getCheckoutHint = (score: number): string | null => {
    if (score > 170 || score <= 1) return null;
    const checkouts: Record<number, string> = {
      170: "T20 → T20 → BULL",
      167: "T20 → T19 → BULL",
      164: "T20 → T18 → BULL",
      161: "T20 → T17 → BULL",
      160: "T20 → T20 → D20",
      158: "T20 → T20 → D19",
      156: "T20 → T20 → D18",
      154: "T20 → T18 → D20",
      150: "T20 → T18 → D18",
      140: "T20 → T20 → D10",
      130: "T20 → T18 → D8",
      120: "T20 → 20 → D20",
      110: "T20 → 18 → D16",
      100: "T20 → D20",
      90: "T18 → D18",
      80: "T20 → D10",
      70: "T18 → D8",
      60: "20 → D20",
      50: "BULL (50)",
      40: "D20",
      36: "D18",
      32: "D16",
      24: "D12",
      20: "D10",
      16: "D8",
      10: "D5",
      8: "D4",
      4: "D2",
      2: "D1",
    };

    if (checkouts[score]) return checkouts[score];
    if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
    if (score <= 50) return `S${score - 32} → D16`;
    return `NEED ${score}`;
  };

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(301);
    setP2Score(301);
    setTurnStartScore(301);
    setTurnTotalScore(0);
    setCurrentTurn("p1");
    setDartsLeftInTurn(3);
    setCurrentTurnThrows([]);
    setIsBust(false);
    setGameOver(false);
    setWinner(null);
    setAnnouncerBanner(null);
    setZoomTarget(null);
    setStatusMessage("SWIPE UP TOWARD DARTBOARD!");
    isThrowing.current = false;
    flyingDartRef.current = null;
    setInMenu(false);
  }, []);

  // Board coordinate hit evaluation
  // Center is (180, 160) on 360x340 area
  const evaluateHit = useCallback(
    (x: number, y: number): DartThrow => {
      const cx = 180;
      const cy = 160;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Inner Double Bull (radius <= 8)
      if (dist <= 8) {
        return { x, y, score: 50, label: "DOUBLE BULL (50)", isBull: true };
      }
      // Outer Bullseye (radius <= 17)
      if (dist <= 17) {
        return { x, y, score: 25, label: "BULLSEYE (25)", isBull: true };
      }
      // Off board (radius > 120)
      if (dist > 120) {
        return { x, y, score: 0, label: "MISS (0)" };
      }

      // Calculate sector angle
      let angle = Math.atan2(dy, dx);
      let deg = (angle * 180) / Math.PI + 90; // 0 deg is North
      if (deg < 0) deg += 360;

      const sectorIndex = Math.floor(((deg + 9) % 360) / 18);
      const sectorNumber = BOARD_SECTORS[sectorIndex] || 20;

      // Triple ring (radius between 62 and 74)
      if (dist >= 62 && dist <= 74) {
        return {
          x,
          y,
          score: sectorNumber * 3,
          label: `TRIPLE ${sectorNumber} (${sectorNumber * 3})`,
          isTriple: true,
        };
      }
      // Double ring (radius between 106 and 118)
      if (dist >= 106 && dist <= 118) {
        return {
          x,
          y,
          score: sectorNumber * 2,
          label: `DOUBLE ${sectorNumber} (${sectorNumber * 2})`,
          isDouble: true,
        };
      }

      // Single sector
      return { x, y, score: sectorNumber, label: `SINGLE ${sectorNumber}` };
    },
    []
  );

  // Process completed throw
  const processThrow = useCallback(
    (hit: DartThrow) => {
      arcadeSfx.playDartHit();
      setCurrentTurnThrows((prev) => [...prev, hit]);

      // Announcer banners
      if (hit.score === 60) {
        setAnnouncerBanner("🔥 TRIPLE TWENTY! (60)");
        arcadeSfx.playMatchSuccess();
      } else if (hit.score === 50) {
        setAnnouncerBanner("🎯 DOUBLE BULLSEYE! (50)");
        arcadeSfx.playMatchSuccess();
      } else if (hit.isTriple) {
        setAnnouncerBanner(`✨ ${hit.label}!`);
      }

      // Trigger dynamic camera zoom on impact sector
      setZoomTarget({ x: hit.x, y: hit.y, zoom: 1.35 });
      setTimeout(() => setZoomTarget(null), 650);

      const activeScore = currentTurn === "p1" ? p1Score : p2Score;
      const remainingScore = activeScore - hit.score;
      const nextTurnTotal = turnTotalScore + hit.score;
      setTurnTotalScore(nextTurnTotal);

      if (remainingScore === 0) {
        // EXACT WIN!
        setAnnouncerBanner("🏆 GAME SHOT AND THE MATCH!");
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
        setAnnouncerBanner("🚨 BUST!");
        setStatusMessage(`BUST! SCORE CANNOT DROP BELOW ZERO!`);

        setTimeout(() => {
          if (currentTurn === "p1") setP1Score(turnStartScore);
          else setP2Score(turnStartScore);
          switchTurn();
        }, 1300);
        return;
      } else {
        // Normal hit
        if (currentTurn === "p1") setP1Score(remainingScore);
        else setP2Score(remainingScore);
        setStatusMessage(`HIT: ${hit.label}! REMAINING: ${remainingScore}`);

        const nextDarts = dartsLeftInTurn - 1;
        setDartsLeftInTurn(nextDarts);

        if (nextDarts <= 0) {
          if (nextTurnTotal === 180) {
            setAnnouncerBanner("🎙️ ONE HUNDRED AND EIGHTY!!");
            arcadeSfx.playVictory();
          } else if (nextTurnTotal >= 100) {
            setAnnouncerBanner(`🎙️ TON ${nextTurnTotal - 100}!`);
          }
          setTimeout(() => switchTurn(), 1100);
        }
      }
    },
    [currentTurn, p1Score, p2Score, dartsLeftInTurn, turnStartScore, turnTotalScore, currentUid, match]
  );

  // Switch turn
  const switchTurn = () => {
    setIsBust(false);
    setCurrentTurnThrows([]);
    setDartsLeftInTurn(3);
    setTurnTotalScore(0);
    setAnnouncerBanner(null);
    const nextTurn = currentTurn === "p1" ? "p2" : "p1";
    setCurrentTurn(nextTurn);
    setTurnStartScore(nextTurn === "p1" ? p1Score : p2Score);
    setStatusMessage(nextTurn === "p1" ? "YOUR TURN! SWIPE UP TO THROW!" : "OPPONENT'S TURN!");
    isThrowing.current = false;
  };

  // Launch dart with 3D flight trajectory
  const launchDart = (targetX: number, targetY: number) => {
    isThrowing.current = true;
    arcadeSfx.playWhoosh();

    const hit = evaluateHit(targetX, targetY);
    flyingDartRef.current = {
      startX: 180,
      startY: 340,
      targetX,
      targetY,
      progress: 0,
      hit,
    };
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

    if (dy < -30) {
      const power = Math.min(Math.abs(dy) / dt, 3.6);
      const angleOffset = dx * 0.4;
      const targetY = 160 + (2.6 - power) * 38 + (Math.random() - 0.5) * 12;
      const targetX = 180 + angleOffset + (Math.random() - 0.5) * 12;

      launchDart(targetX, targetY);
    }
  };

  // Bot AI throw loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || currentTurn !== "p2" || gameOver || isBust) return;

    const timer = setTimeout(() => {
      // Bot aims for T20 or Bull depending on score
      const spread = botDiff === "hard" ? 14 : botDiff === "medium" ? 28 : 45;
      const targetX = 180 + (Math.random() - 0.5) * spread;
      const targetY = 96 + (Math.random() - 0.5) * spread; // T20 area

      launchDart(targetX, targetY);
    }, 1200);

    return () => clearTimeout(timer);
  }, [inMenu, playMode, currentTurn, gameOver, isBust, botDiff]);

  // Main Canvas Render Loop (Sisal Board + 3D Dart Flight)
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const cx = 180;
    const cy = 160;

    const loop = () => {
      // Update flying dart
      if (flyingDartRef.current) {
        flyingDartRef.current.progress += 0.12;
        if (flyingDartRef.current.progress >= 1) {
          const hit = flyingDartRef.current.hit;
          flyingDartRef.current = null;
          processThrow(hit);
          isThrowing.current = false;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply Dynamic Camera Zoom on impact
      if (zoomTarget) {
        ctx.translate(cx, cy);
        ctx.scale(zoomTarget.zoom, zoomTarget.zoom);
        ctx.translate(-zoomTarget.x, -zoomTarget.y);
      }

      // ── SISAL DARTBOARD RENDER ──
      // Outer Wood Cabinet Ring
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.arc(cx, cy, 142, 0, Math.PI * 2);
      ctx.fill();

      // Outer Number Wire Rim
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(cx, cy, 132, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw 20 Alternating Sisal Wedges
      BOARD_SECTORS.forEach((num, i) => {
        const startAngle = ((i * 18 - 90 - 9) * Math.PI) / 180;
        const endAngle = ((i * 18 - 90 + 9) * Math.PI) / 180;
        const isBlack = i % 2 === 0;

        // Base Wedge (Cream vs Black)
        ctx.fillStyle = isBlack ? "#111827" : "#fef3c7";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 118, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Double Ring Segment (Red vs Green)
        ctx.fillStyle = isBlack ? "#dc2626" : "#16a34a";
        ctx.beginPath();
        ctx.arc(cx, cy, 118, startAngle, endAngle);
        ctx.arc(cx, cy, 106, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();

        // Triple Ring Segment (Red vs Green)
        ctx.fillStyle = isBlack ? "#dc2626" : "#16a34a";
        ctx.beginPath();
        ctx.arc(cx, cy, 74, startAngle, endAngle);
        ctx.arc(cx, cy, 62, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();

        // Thin Wire Spider Radial Lines
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(endAngle) * 118, cy + Math.sin(endAngle) * 118);
        ctx.stroke();

        // Wire Ring Concentric Circles
        [118, 106, 74, 62, 17, 8].forEach((r) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Sector Numbers on Wire Rim
        const numAngle = ((i * 18 - 90) * Math.PI) / 180;
        const nx = cx + Math.cos(numAngle) * 125;
        const ny = cy + Math.sin(numAngle) * 125 + 4;
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(num), nx, ny);
      });

      // Outer Bullseye (Radius 17 - Green)
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner Double Bull (Radius 8 - Red)
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Embedded Darts from Current Turn
      currentTurnThrows.forEach((dart, idx) => {
        ctx.save();
        ctx.translate(dart.x, dart.y);
        ctx.rotate(-0.4);

        // Dart tip shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.arc(2, 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Steel Tip
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 12);
        ctx.stroke();

        // Brass Barrel
        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(10, 10, 10, 3);

        // Shaft & Flights
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 20);
        ctx.lineTo(28, 28);
        ctx.stroke();

        // Plastic Flight Wings
        ctx.fillStyle = currentTurn === "p1" ? "#3b82f6" : "#ef4444";
        ctx.beginPath();
        ctx.moveTo(28, 28);
        ctx.lineTo(38, 24);
        ctx.lineTo(34, 38);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // Draw 3D Flying Dart
      if (flyingDartRef.current) {
        const fd = flyingDartRef.current;
        const curX = fd.startX + (fd.targetX - fd.startX) * fd.progress;
        const curY = fd.startY + (fd.targetY - fd.startY) * fd.progress;
        const scale = 1.6 - fd.progress * 0.6; // shrinks as it travels away

        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(scale, scale);
        ctx.rotate(-0.5 + Math.sin(fd.progress * 15) * 0.1); // flight wobble

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(16, 16);
        ctx.stroke();

        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(14, 14, 12, 4);

        ctx.fillStyle = currentTurn === "p1" ? "#3b82f6" : "#ef4444";
        ctx.beginPath();
        ctx.moveTo(26, 26);
        ctx.lineTo(38, 22);
        ctx.lineTo(32, 38);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      ctx.restore(); // end camera zoom

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, currentTurnThrows, zoomTarget, currentTurn, processThrow]);

  // Hero Graphic
  const dartsHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center border border-red-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="80" cy="80" r="65" fill="#0f172a" stroke="#334155" strokeWidth="4" />
          <circle cx="80" cy="80" r="56" fill="#111827" />
          <circle cx="80" cy="80" r="56" stroke="#dc2626" strokeWidth="6" fill="none" />
          <circle cx="80" cy="80" r="36" stroke="#16a34a" strokeWidth="6" fill="none" />
          <circle cx="80" cy="80" r="14" fill="#16a34a" />
          <circle cx="80" cy="80" r="6" fill="#dc2626" />

          {/* Embedded 3D Dart */}
          <g transform="translate(80, 80) rotate(-45)">
            <line x1="0" y1="0" x2="35" y2="35" stroke="#e2e8f0" strokeWidth="3" />
            <rect x="20" y="18" width="12" height="4" fill="#ca8a04" transform="rotate(45 26 20)" />
            <polygon points="35,35 48,30 43,48" fill="#3b82f6" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "301 Countdown Duel",
      desc: "Start with 301 points. Every dart score subtracts directly from your total.",
      icon: "🎯",
    },
    {
      title: "Swipe Upward to Throw",
      desc: "Swipe up toward the board. Flick speed controls height, angle controls horizontal aim!",
      icon: "🚀",
    },
    {
      title: "Bust Rule & Exact Zero",
      desc: "You must reach exactly zero! Going below zero causes a BUST and resets your turn score.",
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

        {/* Darts in Round Icons */}
        <div className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-full border border-white/15">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-4 rounded-xs transition-all ${
                i < dartsLeftInTurn ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" : "bg-neutral-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Checkout Guide & Broadcast Announcer Banner */}
      <div className="w-full max-w-sm flex flex-col items-center gap-1 my-1">
        {announcerBanner ? (
          <div className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-4 py-1 rounded-full border border-amber-500/40 animate-bounce shadow-lg">
            {announcerBanner}
          </div>
        ) : p1Checkout ? (
          <div className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
            CHECKOUT: {p1Checkout}
          </div>
        ) : (
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Canvas Sisal Arena */}
      <div className="relative w-full max-w-sm h-[360px] bg-neutral-950 rounded-3xl border border-white/15 overflow-hidden shadow-2xl flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={340} className="w-full h-full" />

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
              {winner === "p1" ? "You hit exact zero for the win!" : "Opponent checked out first!"}
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

