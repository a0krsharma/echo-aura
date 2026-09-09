"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Target, Sparkles, AlertTriangle } from "lucide-react";

interface DartsGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
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
  onInviteFriend,
  onRandomMatch,
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
  const [statusMessage, setStatusMessage] = useState("DRAG ON BOARD TO AIM • RELEASE TO THROW");
  const [announcerBanner, setAnnouncerBanner] = useState<string | null>(null);
  const [isBust, setIsBust] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Aiming reticle
  const [aimTarget, setAimTarget] = useState<{ x: number; y: number } | null>(null);
  const isDraggingAim = useRef(false);

  // Dynamic Camera Zoom
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flyingDartRef = useRef<FlyingDart | null>(null);
  const isThrowing = useRef(false);

  // Comprehensive Checkout Calculator (Official double-out combos when score <= 170)
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
    return `FINISH ON DOUBLE`;
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
    setStatusMessage("YOUR TURN! DRAG TO AIM & RELEASE");
    setAnnouncerBanner(null);
    setIsBust(false);
    setGameOver(false);
    setWinner(null);
    setAimTarget(null);
    flyingDartRef.current = null;
    isThrowing.current = false;
    setInMenu(false);
  }, []);

  // Evaluate hit from board coordinates (Board center: 180, 190)
  const evaluateHit = (x: number, y: number): DartThrow => {
    const cx = 180;
    const cy = 190;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    // Radii in canvas units
    const R_INNER_BULL = 8;
    const R_OUTER_BULL = 18;
    const R_TRIPLE_IN = 72;
    const R_TRIPLE_OUT = 84;
    const R_DOUBLE_IN = 120;
    const R_DOUBLE_OUT = 132;

    if (dist <= R_INNER_BULL) {
      return { x, y, score: 50, label: "DOUBLE BULL (50)", isBull: true, isDouble: true };
    }
    if (dist <= R_OUTER_BULL) {
      return { x, y, score: 25, label: "BULLSEYE (25)", isBull: true };
    }
    if (dist > R_DOUBLE_OUT) {
      return { x, y, score: 0, label: "MISS (0)" };
    }

    // Angle calculation: Angle 0 is at top (12 o'clock, sector 20)
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const sectorAngle = (Math.PI * 2) / 20;
    const sectorIndex = Math.floor((angle + sectorAngle / 2) / sectorAngle) % 20;
    const baseNumber = BOARD_SECTORS[sectorIndex];

    if (dist >= R_TRIPLE_IN && dist <= R_TRIPLE_OUT) {
      return {
        x,
        y,
        score: baseNumber * 3,
        label: `TREBLE ${baseNumber} (${baseNumber * 3})`,
        isTriple: true,
      };
    }

    if (dist >= R_DOUBLE_IN && dist <= R_DOUBLE_OUT) {
      return {
        x,
        y,
        score: baseNumber * 2,
        label: `DOUBLE ${baseNumber} (${baseNumber * 2})`,
        isDouble: true,
      };
    }

    return {
      x,
      y,
      score: baseNumber,
      label: `SINGLE ${baseNumber} (${baseNumber})`,
    };
  };

  // Process completed throw
  const processHit = useCallback(
    (hit: DartThrow) => {
      arcadeSfx.playCarBump();
      setCurrentTurnThrows((prev) => [...prev, hit]);

      const currentScore = currentTurn === "p1" ? p1Score : p2Score;
      const remainingScore = currentScore - hit.score;
      const nextTurnTotal = turnTotalScore + hit.score;
      setTurnTotalScore(nextTurnTotal);

      // Camera punch zoom into struck sector
      setZoomTarget({ x: hit.x, y: hit.y, zoom: 1.35 });
      setTimeout(() => setZoomTarget(null), 550);

      // Check WIN / BUST / NORMAL
      // Official Darts Rule: Must reach EXACTLY 0 with a DOUBLE (or Double Bull)
      if (remainingScore === 0) {
        if (hit.isDouble || hit.isBull) {
          // LEGIT CHECKOUT VICTORY!
          if (currentTurn === "p1") setP1Score(0);
          else setP2Score(0);

          setGameOver(true);
          setWinner(currentTurn);
          arcadeSfx.playVictory();
          setAnnouncerBanner("🎯 GAME SHOT AND THE MATCH!!");
          setStatusMessage(`${currentTurn === "p1" ? "PLAYER 1" : "PLAYER 2"} WINS THE LEG!`);

          if (currentTurn === "p1" && currentUid && match?.id) {
            updateArcadeGameScore(match.id, currentUid, "darts_301" as any, 100, true);
          }
          return;
        } else {
          // Reached 0 without a double = BUST!
          triggerBust();
          return;
        }
      } else if (remainingScore < 0 || remainingScore === 1) {
        // Score < 0 or score === 1 (cannot finish on a double from 1) = BUST!
        triggerBust();
        return;
      } else {
        // Normal valid hit
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
        } else {
          isThrowing.current = false;
        }
      }
    },
    [currentTurn, p1Score, p2Score, dartsLeftInTurn, turnStartScore, turnTotalScore, currentUid, match]
  );

  const triggerBust = () => {
    arcadeSfx.playPenaltyBuzz();
    setIsBust(true);
    setAnnouncerBanner("🚨 BUST!");
    setStatusMessage("BUST! SCORE REVERTS TO TURN START!");

    setTimeout(() => {
      if (currentTurn === "p1") setP1Score(turnStartScore);
      else setP2Score(turnStartScore);
      switchTurn();
    }, 1300);
  };

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
    setStatusMessage(
      nextTurn === "p1"
        ? "YOUR TURN! DRAG TO AIM & RELEASE"
        : playMode === "bot"
        ? "BOT'S TURN TO THROW..."
        : "PLAYER 2'S TURN! DRAG TO AIM"
    );
    isThrowing.current = false;
  };

  // Launch dart with 3D flight trajectory
  const launchDart = (targetX: number, targetY: number) => {
    isThrowing.current = true;
    setAimTarget(null);
    arcadeSfx.playWhoosh();

    const hit = evaluateHit(targetX, targetY);
    flyingDartRef.current = {
      startX: 180,
      startY: 370,
      targetX,
      targetY,
      progress: 0,
      hit,
    };
  };

  // Pointer drag aiming handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameOver || isThrowing.current || (currentTurn === "p2" && playMode === "bot")) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    isDraggingAim.current = true;
    setAimTarget({ x: canvasX, y: canvasY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingAim.current || gameOver || isThrowing.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setAimTarget({ x: canvasX, y: canvasY });
  };

  const handlePointerUp = () => {
    if (!isDraggingAim.current || gameOver || isThrowing.current) return;
    isDraggingAim.current = false;
    if (aimTarget) {
      // Add slight human jitter (±3px)
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterY = (Math.random() - 0.5) * 6;
      launchDart(aimTarget.x + jitterX, aimTarget.y + jitterY);
    }
  };

  // Bot AI throw loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || currentTurn !== "p2" || gameOver || isBust || isThrowing.current) return;

    const timer = setTimeout(() => {
      if (isThrowing.current) return;

      const score = p2Score;
      let targetX = 180;
      let targetY = 112; // Default Treble 20 area

      if (score <= 40 && score % 2 === 0) {
        // Target specific double
        const dNum = score / 2;
        const sIdx = BOARD_SECTORS.indexOf(dNum);
        if (sIdx !== -1) {
          const angle = (sIdx * Math.PI * 2) / 20 - Math.PI / 2;
          targetX = 180 + Math.cos(angle) * 126;
          targetY = 190 + Math.sin(angle) * 126;
        }
      } else if (score === 50) {
        // Bullseye
        targetX = 180;
        targetY = 190;
      }

      // Accuracy variance by difficulty
      const spread = botDiff === "hard" ? 10 : botDiff === "medium" ? 22 : 38;
      targetX += (Math.random() - 0.5) * spread;
      targetY += (Math.random() - 0.5) * spread;

      launchDart(targetX, targetY);
    }, 1100);

    return () => clearTimeout(timer);
  }, [inMenu, playMode, currentTurn, gameOver, isBust, botDiff, p2Score]);

  // Main Canvas Render Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Zoom transform
      if (zoomTarget) {
        ctx.translate(zoomTarget.x * (1 - zoomTarget.zoom), zoomTarget.y * (1 - zoomTarget.zoom));
        ctx.scale(zoomTarget.zoom, zoomTarget.zoom);
      }

      // Dark Sisal Board Background
      const bgGrad = ctx.createRadialGradient(180, 190, 40, 180, 190, 220);
      bgGrad.addColorStop(0, "#1c1917");
      bgGrad.addColorStop(0.7, "#0c0a09");
      bgGrad.addColorStop(1, "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dartboard Outer Wood Cabinet Ring
      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.arc(180, 190, 152, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#44403c";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Number Ring (Black Rim)
      ctx.fillStyle = "#0c0a09";
      ctx.beginPath();
      ctx.arc(180, 190, 146, 0, Math.PI * 2);
      ctx.fill();

      // Sisal Board Bed (Sectors)
      const cx = 180;
      const cy = 190;
      const sectorAngle = (Math.PI * 2) / 20;

      BOARD_SECTORS.forEach((num, idx) => {
        const startA = idx * sectorAngle - Math.PI / 2 - sectorAngle / 2;
        const endA = startA + sectorAngle;
        const isBlack = idx % 2 === 0;

        // Double Ring (Outer: 132, Inner: 120)
        ctx.fillStyle = isBlack ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(cx, cy, 132, startA, endA);
        ctx.arc(cx, cy, 120, endA, startA, true);
        ctx.fill();

        // Outer Single Bed (120 to 84)
        ctx.fillStyle = isBlack ? "#09090b" : "#fef08a";
        ctx.beginPath();
        ctx.arc(cx, cy, 120, startA, endA);
        ctx.arc(cx, cy, 84, endA, startA, true);
        ctx.fill();

        // Treble Ring (84 to 72)
        ctx.fillStyle = isBlack ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(cx, cy, 84, startA, endA);
        ctx.arc(cx, cy, 72, endA, startA, true);
        ctx.fill();

        // Inner Single Bed (72 to 18)
        ctx.fillStyle = isBlack ? "#09090b" : "#fef08a";
        ctx.beginPath();
        ctx.arc(cx, cy, 72, startA, endA);
        ctx.arc(cx, cy, 18, endA, startA, true);
        ctx.fill();

        // Sector Number Label on Rim
        ctx.save();
        const midA = startA + sectorAngle / 2;
        const numX = cx + Math.cos(midA) * 140;
        const numY = cy + Math.sin(midA) * 140;
        ctx.translate(numX, numY);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(num.toString(), 0, 0);
        ctx.restore();
      });

      // Outer Bull (25 - Green)
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Inner Bullseye (50 - Red)
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      // Wire Spider / Radial Wires
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      BOARD_SECTORS.forEach((_, idx) => {
        const a = idx * sectorAngle - Math.PI / 2 - sectorAngle / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
        ctx.lineTo(cx + Math.cos(a) * 132, cy + Math.sin(a) * 132);
        ctx.stroke();
      });
      [18, 72, 84, 120, 132].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Render Embedded Darts from current turn
      currentTurnThrows.forEach((dt) => {
        ctx.save();
        ctx.translate(dt.x, dt.y);

        // Dart point shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(3, 4, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sticking needle
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-1, -4, 2, 8);

        // Barrel & Flight
        ctx.fillStyle = currentTurn === "p1" ? "#3b82f6" : "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-4, -14);
        ctx.lineTo(0, -4);
        ctx.lineTo(4, -14);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // Render Aiming Reticle (when dragging)
      if (aimTarget) {
        ctx.save();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        // Crosshair circle
        ctx.beginPath();
        ctx.arc(aimTarget.x, aimTarget.y, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair lines
        ctx.beginPath();
        ctx.moveTo(aimTarget.x - 20, aimTarget.y);
        ctx.lineTo(aimTarget.x + 20, aimTarget.y);
        ctx.moveTo(aimTarget.x, aimTarget.y - 20);
        ctx.lineTo(aimTarget.x, aimTarget.y + 20);
        ctx.stroke();

        ctx.restore();
      }

      // Render Flying Dart
      if (flyingDartRef.current) {
        const fd = flyingDartRef.current;
        fd.progress += 0.08;

        const currentX = fd.startX + (fd.targetX - fd.startX) * fd.progress;
        const currentY = fd.startY + (fd.targetY - fd.startY) * fd.progress;
        const scale = 1.6 - fd.progress * 0.6; // 3D flight perspective

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.scale(scale, scale);

        // Flight body
        ctx.fillStyle = currentTurn === "p1" ? "#3b82f6" : "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(0, -18);
        ctx.lineTo(5, 12);
        ctx.closePath();
        ctx.fill();

        // Flight wings
        ctx.fillStyle = "#facc15";
        ctx.fillRect(-6, 8, 12, 5);

        ctx.restore();

        if (fd.progress >= 1) {
          const hit = fd.hit;
          flyingDartRef.current = null;
          processHit(hit);
        }
      }

      ctx.restore(); // end zoom

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, currentTurnThrows, currentTurn, aimTarget, zoomTarget, processHit]);

  const dartsHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center border border-red-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="80" cy="80" r="70" fill="#1c1917" stroke="#44403c" strokeWidth="4" />
          <circle cx="80" cy="80" r="54" fill="#09090b" stroke="#22c55e" strokeWidth="4" />
          <circle cx="80" cy="80" r="36" fill="none" stroke="#ef4444" strokeWidth="4" />
          <circle cx="80" cy="80" r="10" fill="#22c55e" />
          <circle cx="80" cy="80" r="4" fill="#ef4444" />
          {/* Flying Dart */}
          <g transform="translate(100, 60) rotate(-35)">
            <polygon points="0,-16 -3,6 3,6" fill="#3b82f6" />
            <rect x="-4" y="4" width="8" height="4" fill="#facc15" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Official 301 Countdown",
      desc: "Race from 301 down to EXACTLY 0. Each player throws 3 darts per turn.",
      icon: "🎯",
    },
    {
      title: "Double-Out Finish Rule",
      desc: "You must finish on a DOUBLE or BULLSEYE to win! Reaching 1 or < 0 is a BUST.",
      icon: "⚡",
    },
    {
      title: "Checkout Calculator",
      desc: "Follow recommended checkout paths (e.g. T20 → D20) once your score drops under 170!",
      icon: "💡",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="DARTS 301"
          subtitle="Official Double-Out Tournament"
          categoryTag="PRECISION ACCURACY"
          accentColor="#DC2626"
          objective="Countdown from 301 to 0! Must finish on a Double or Bullseye. 3 darts per turn."
          heroGraphic={dartsHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={onInviteFriend || (() => startGame("friend"))}
          onPlayBot={(diff) => startGame("bot", diff)}
          onRandomMatch={onRandomMatch}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  const currentScore = currentTurn === "p1" ? p1Score : p2Score;
  const checkoutHint = getCheckoutHint(currentScore);

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

        {/* 301 Scores */}
        <div className="flex items-center gap-4 bg-neutral-900/90 px-4 py-1.5 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase font-bold ${currentTurn === "p1" ? "text-blue-400 animate-pulse" : "text-neutral-400"}`}>
              YOU (P1)
            </span>
            <span className="text-2xl font-black text-blue-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase font-bold ${currentTurn === "p2" ? "text-red-400 animate-pulse" : "text-neutral-400"}`}>
              {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2"}
            </span>
            <span className="text-2xl font-black text-red-500">{p2Score}</span>
          </div>
        </div>

        {/* Darts left in turn */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <span>🎯 {dartsLeftInTurn}/3</span>
        </div>
      </div>

      {/* Checkout Guide / Announcer Banner */}
      <div className="w-full max-w-sm flex flex-col items-center gap-0.5 my-0.5 z-20">
        {announcerBanner ? (
          <span className="text-sm font-black uppercase text-amber-400 animate-bounce tracking-wide">
            {announcerBanner}
          </span>
        ) : checkoutHint ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>CHECKOUT: {checkoutHint}</span>
          </span>
        ) : (
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
            {statusMessage}
          </span>
        )}
      </div>

      {/* Canvas Dartboard Arena */}
      <div className="relative w-full max-w-sm h-[390px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-crosshair"
        />

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {winner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Final Score: {p1Score} - {p2Score}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Current Turn Throws Recap */}
      <div className="w-full max-w-sm flex items-center justify-center gap-3 py-1 z-20">
        {currentTurnThrows.map((t, idx) => (
          <span key={idx} className="text-xs font-black px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300">
            D{idx + 1}: {t.score} ({t.label})
          </span>
        ))}
        {currentTurnThrows.length === 0 && (
          <span className="text-[11px] font-bold text-neutral-500 uppercase">
            DRAG ON DARTBOARD TO AIM • RELEASE TO THROW
          </span>
        )}
      </div>
    </div>
  );
}
