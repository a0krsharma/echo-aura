"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Flame, Sparkles } from "lucide-react";

interface CupPongProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Cup {
  id: number;
  owner: "p1" | "p2"; // p1 cups are at near end (bottom), p2 cups are at far end (top)
  x: number;
  y: number;
  cleared: boolean;
  isRocking: boolean;
}

interface FlyingBall {
  tossedBy: "p1" | "p2";
  x: number;
  y: number;
  z: number; // 3D height above table
  vx: number;
  vy: number;
  vz: number;
  isFire: boolean;
}

interface FoamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export default function CupPongGame({
  match,
  currentUid,
  onBack,
}: CupPongProps) {
  const initialMode: "bot" | "friend" = match?.mode === "MULTIPLAYER" ? "friend" : "bot";
  const rawDiff = (match?.difficulty || "").toLowerCase();
  const initialDiff: BotDifficulty = rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
  const hasPreselectedMode = Boolean(match?.mode);

  const [inMenu, setInMenu] = useState(!hasPreselectedMode);
  const [playMode, setPlayMode] = useState<"bot" | "friend">(initialMode);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

  // Head-to-head game state
  const [cups, setCups] = useState<Cup[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"p1" | "p2">("p1");
  const [p1Consecutive, setP1Consecutive] = useState(0);
  const [p2Consecutive, setP2Consecutive] = useState(0);
  const [statusMessage, setStatusMessage] = useState("DRAG TO PREVIEW AIM • RELEASE TO TOSS");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Aiming preview
  const [aimPreview, setAimPreview] = useState<{ x: number; y: number } | null>(null);
  const isAiming = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flyingBallRef = useRef<FlyingBall | null>(null);
  const foamParticlesRef = useRef<FoamParticle[]>([]);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize both teams' 6-cup pyramids (P2 cups at top y=65-125, P1 cups at bottom y=275-335)
  const createInitialCups = useCallback((): Cup[] => {
    return [
      // P2 Cups (Far Top End - Red Cups for P1 to sink)
      { id: 1, owner: "p2", x: 140, y: 65, cleared: false, isRocking: false },
      { id: 2, owner: "p2", x: 180, y: 65, cleared: false, isRocking: false },
      { id: 3, owner: "p2", x: 220, y: 65, cleared: false, isRocking: false },
      { id: 4, owner: "p2", x: 160, y: 95, cleared: false, isRocking: false },
      { id: 5, owner: "p2", x: 200, y: 95, cleared: false, isRocking: false },
      { id: 6, owner: "p2", x: 180, y: 125, cleared: false, isRocking: false },

      // P1 Cups (Near Bottom End - Blue Cups for P2 to sink)
      { id: 7, owner: "p1", x: 180, y: 275, cleared: false, isRocking: false },
      { id: 8, owner: "p1", x: 160, y: 305, cleared: false, isRocking: false },
      { id: 9, owner: "p1", x: 200, y: 305, cleared: false, isRocking: false },
      { id: 10, owner: "p1", x: 140, y: 335, cleared: false, isRocking: false },
      { id: 11, owner: "p1", x: 180, y: 335, cleared: false, isRocking: false },
      { id: 12, owner: "p1", x: 220, y: 335, cleared: false, isRocking: false },
    ];
  }, []);

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setCups(createInitialCups());
    setCurrentTurn("p1");
    setP1Consecutive(0);
    setP2Consecutive(0);
    setStatusMessage("YOUR TURN! AIM AT OPPONENT'S CUPS");
    setGameOver(false);
    setWinner(null);
    setAimPreview(null);
    flyingBallRef.current = null;
    foamParticlesRef.current = [];
    setInMenu(false);
  }, [createInitialCups]);

  // Auto-start immediately if mode & difficulty were chosen in lobby (never ask twice)
  useEffect(() => {
    if (hasPreselectedMode) {
      startGame(initialMode, initialDiff);
    }
  }, [hasPreselectedMode, initialMode, initialDiff, startGame]);

  // Launch a toss
  const launchBall = (tossedBy: "p1" | "p2", targetX: number, targetY: number) => {
    if (flyingBallRef.current || gameOver) return;

    arcadeSfx.playWhoosh();
    setAimPreview(null);

    const isP1 = tossedBy === "p1";
    const startX = 180;
    const startY = isP1 ? 385 : 15;
    const isFire = isP1 ? p1Consecutive >= 2 : p2Consecutive >= 2;

    const totalFrames = 32;
    const vx = (targetX - startX) / totalFrames;
    const vy = (targetY - startY) / totalFrames;
    const vz = 7.5; // High parabolic arc

    flyingBallRef.current = {
      tossedBy,
      x: startX,
      y: startY,
      z: 0,
      vx,
      vy,
      vz,
      isFire,
    };
  };

  // Switch turn
  const switchTurn = useCallback(() => {
    const nextTurn = currentTurn === "p1" ? "p2" : "p1";
    setCurrentTurn(nextTurn);
    setStatusMessage(
      nextTurn === "p1"
        ? "YOUR TURN! DRAG TO AIM & TOSS"
        : playMode === "bot"
        ? "BOT IS AIMING..."
        : "PLAYER 2'S TURN! DRAG TO AIM"
    );
  }, [currentTurn, playMode]);

  // Pointer drag aiming
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameOver || flyingBallRef.current || (currentTurn === "p2" && playMode === "bot")) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    isAiming.current = true;
    setAimPreview({ x: canvasX, y: canvasY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isAiming.current || gameOver || flyingBallRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setAimPreview({ x: canvasX, y: canvasY });
  };

  const handlePointerUp = () => {
    if (!isAiming.current || gameOver || flyingBallRef.current) return;
    isAiming.current = false;
    if (aimPreview) {
      launchBall(currentTurn, aimPreview.x, aimPreview.y);
    }
  };

  // Bot AI toss loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || currentTurn !== "p2" || gameOver || flyingBallRef.current) return;

    const timer = setTimeout(() => {
      if (flyingBallRef.current || gameOver) return;

      // Bot targets remaining P1 cups (at bottom)
      const targetCups = cups.filter((c) => c.owner === "p1" && !c.cleared);
      if (targetCups.length === 0) return;

      const randomCup = targetCups[Math.floor(Math.random() * targetCups.length)];
      const spread = botDiff === "hard" ? 6 : botDiff === "medium" ? 14 : 26;

      const targetX = randomCup.x + (Math.random() - 0.5) * spread;
      const targetY = randomCup.y + (Math.random() - 0.5) * spread;

      launchBall("p2", targetX, targetY);
    }, 1200);

    return () => clearTimeout(timer);
  }, [inMenu, playMode, currentTurn, gameOver, cups, botDiff]);

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Beer Pong Table Surface (Wood Plank with red party cup vibes)
      const tableGrad = ctx.createLinearGradient(0, 0, 0, 400);
      tableGrad.addColorStop(0, "#381e0e");
      tableGrad.addColorStop(0.5, "#542a15");
      tableGrad.addColorStop(1, "#271207");
      ctx.fillStyle = tableGrad;
      ctx.fillRect(20, 10, 320, 380);

      // Table Red Border Tape
      ctx.strokeStyle = "#b91c1c";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 10, 320, 380);

      // Table Center Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 200);
      ctx.lineTo(340, 200);
      ctx.stroke();

      // 2. Render Cups
      cups.forEach((c) => {
        if (c.cleared) return;

        const isP2Cup = c.owner === "p2";
        const cupColor = isP2Cup ? "#ef4444" : "#3b82f6";
        const rimColor = isP2Cup ? "#b91c1c" : "#1d4ed8";

        // Cup Drop Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 12, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cup Body
        ctx.fillStyle = cupColor;
        ctx.beginPath();
        ctx.moveTo(c.x - 14, c.y);
        ctx.lineTo(c.x - 10, c.y + 20);
        ctx.lineTo(c.x + 10, c.y + 20);
        ctx.lineTo(c.x + 14, c.y);
        ctx.closePath();
        ctx.fill();

        // Inner Beer Liquid (Golden Amber)
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + 2, 12, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // White Cup Rim
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 14, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 3. Aiming Trajectory Preview Arc (dotted line)
      if (aimPreview && !flyingBallRef.current) {
        ctx.save();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const startY = currentTurn === "p1" ? 380 : 20;
        ctx.moveTo(180, startY);
        ctx.quadraticCurveTo((180 + aimPreview.x) * 0.5, (startY + aimPreview.y) * 0.5 - 45, aimPreview.x, aimPreview.y);
        ctx.stroke();

        // Target Crosshair
        ctx.beginPath();
        ctx.arc(aimPreview.x, aimPreview.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Flying Ball Physics & 3D Parabola
      if (flyingBallRef.current) {
        const fb = flyingBallRef.current;
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vz -= 0.45; // Gravity
        fb.z += fb.vz;

        // Ball Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.ellipse(fb.x, fb.y + 2, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball Sphere (Scales with 3D height)
        const radius = 6 * (1 + Math.max(0, fb.z * 0.04));
        ctx.fillStyle = fb.isFire ? "#f97316" : "#ffffff";
        ctx.beginPath();
        ctx.arc(fb.x, fb.y - Math.max(0, fb.z), radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = fb.isFire ? "#ef4444" : "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Check landing impact when altitude reaches 0
        if (fb.z <= 0) {
          const landedX = fb.x;
          const landedY = fb.y;
          const targetOwner = fb.tossedBy === "p1" ? "p2" : "p1";
          flyingBallRef.current = null;

          // Check if landed in an opponent cup
          let sunkCup: Cup | null = null;
          cups.forEach((c) => {
            if (c.owner === targetOwner && !c.cleared) {
              const dist = Math.hypot(landedX - c.x, landedY - c.y);
              if (dist <= 14) sunkCup = c;
            }
          });

          if (sunkCup) {
            // SINK!
            const hitCup = sunkCup as Cup;
            arcadeSfx.playMatchSuccess();
            hitCup.cleared = true;

            // Splash Foam Particles
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 4;
              foamParticlesRef.current.push({
                x: hitCup.x,
                y: hitCup.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1,
                color: "#fef08a",
                size: 2.5 + Math.random() * 3,
              });
            }

            if (fb.tossedBy === "p1") {
              setP1Consecutive((c) => c + 1);
              setStatusMessage("SPLASH! CUP SUNK! +1 POINT");
            } else {
              setP2Consecutive((c) => c + 1);
              setStatusMessage("OPPONENT SUNK YOUR CUP!");
            }

            // Check if all opponent cups cleared -> WIN!
            const remainingOpponentCups = cups.filter((c) => c.owner === targetOwner && !c.cleared).length;
            if (remainingOpponentCups === 0) {
              setGameOver(true);
              setWinner(fb.tossedBy);
              arcadeSfx.playVictory();
              if (fb.tossedBy === "p1" && currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "cup_pong" as any, 100, true);
              }
              return;
            }

            // Next turn after brief pause
            setTimeout(() => switchTurn(), 900);
          } else {
            // MISS / RIM BOUNCE
            arcadeSfx.playPingPongBounce(false);
            if (fb.tossedBy === "p1") {
              setP1Consecutive(0);
              setStatusMessage("MISSED! ROLES SWAP");
            } else {
              setP2Consecutive(0);
              setStatusMessage("BOT MISSED! YOUR TURN");
            }
            setTimeout(() => switchTurn(), 900);
          }
        }
      }

      // 5. Render Foam Splash Particles
      foamParticlesRef.current = foamParticlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          life: p.life - 0.04,
        }))
        .filter((p) => p.life > 0);

      foamParticlesRef.current.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, cups, currentTurn, aimPreview, switchTurn, currentUid, match]);

  const p2Remaining = cups.filter((c) => c.owner === "p2" && !c.cleared).length;
  const p1Remaining = cups.filter((c) => c.owner === "p1" && !c.cleared).length;

  const pongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center border border-red-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <rect x="25" y="20" width="110" height="120" rx="6" fill="#381e0e" stroke="#b91c1c" strokeWidth="2.5" />
          <circle cx="80" cy="45" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="65" cy="35" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="95" cy="35" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="80" cy="115" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="65" cy="125" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="95" cy="125" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="80" cy="75" r="6" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Sink Opponent Cups",
      desc: "Drag to preview parabolic arc, release to toss. Clear all 6 enemy cups to win!",
      icon: "🥤",
    },
    {
      title: "On Fire Streak",
      desc: "Sink 2 consecutive cups to ignite ON FIRE mode with blazing fireball accuracy!",
      icon: "🔥",
    },
    {
      title: "Turn-Based Showdown",
      desc: "Take turns with your opponent or solo bot. Sunk cups stay cleared!",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="CUP PONG"
          subtitle="Head-to-Head Pyramid Battle"
          categoryTag="PHYSICS ARCADE"
          accentColor="#E11D48"
          objective="Sink all 6 opponent party cups with 3D parabolic flick tosses! Clear opponent cups first to win."
          heroGraphic={pongHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

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

        {/* Cup Count Summary */}
        <div className="flex items-center gap-4 bg-neutral-900/90 px-4 py-1.5 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase font-bold ${currentTurn === "p1" ? "text-blue-400 animate-pulse" : "text-neutral-400"}`}>
              YOU (P1)
            </span>
            <span className="text-xl font-black text-blue-500">{p1Remaining} CUPS</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className={`text-[10px] uppercase font-bold ${currentTurn === "p2" ? "text-red-400 animate-pulse" : "text-neutral-400"}`}>
              {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2"}
            </span>
            <span className="text-xl font-black text-red-500">{p2Remaining} CUPS</span>
          </div>
        </div>

        {/* On Fire Badge */}
        {(p1Consecutive >= 2 || p2Consecutive >= 2) && (
          <div className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/50 animate-bounce">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>ON FIRE!</span>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className="w-full max-w-sm text-center my-0.5 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {statusMessage}
        </span>
      </div>

      {/* Canvas Beer Pong Table */}
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
              {winner === "p1" ? "PLAYER 1 VICTORY!" : "PLAYER 2 VICTORY!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">All opponent cups cleared!</p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-rose-600 hover:bg-rose-700 border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="w-full max-w-sm text-center py-1 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          DRAG TO PREVIEW 3D PARABOLA • RELEASE TO TOSS
        </span>
      </div>
    </div>
  );
}
