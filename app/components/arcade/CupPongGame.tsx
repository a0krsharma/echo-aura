"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

interface CupPongProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Cup {
  id: number;
  x: number;
  y: number;
  cleared: boolean;
  isRocking: boolean;
}

interface FlyingBall {
  x: number;
  y: number;
  z: number; // height for 3D parabolic arc
  vx: number;
  vy: number;
  vz: number;
  shadowX: number;
  shadowY: number;
}

export default function CupPongGame({
  match,
  currentUid,
  onBack,
}: CupPongProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Cup pyramids: 6 cups (3 rows: 3, 2, 1)
  const [cups, setCups] = useState<Cup[]>([]);
  const [ballsLeft, setBallsLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState("FLICK BALL UPWARD TOWARD CUPS");
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flyingBallRef = useRef<FlyingBall | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Initialize 6-cup pyramid
  const createCups = useCallback((): Cup[] => {
    const list: Cup[] = [];
    let id = 1;
    // Row 1 (Back 3 cups)
    list.push({ id: id++, x: 130, y: 70, cleared: false, isRocking: false });
    list.push({ id: id++, x: 180, y: 70, cleared: false, isRocking: false });
    list.push({ id: id++, x: 230, y: 70, cleared: false, isRocking: false });
    // Row 2 (Middle 2 cups)
    list.push({ id: id++, x: 155, y: 110, cleared: false, isRocking: false });
    list.push({ id: id++, x: 205, y: 110, cleared: false, isRocking: false });
    // Row 3 (Front 1 cup)
    list.push({ id: id++, x: 180, y: 150, cleared: false, isRocking: false });
    return list;
  }, []);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_cup_pong_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Start game
  const startGame = useCallback(
    (mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
      setPlayMode(mode);
      setBotDiff(diff);
      setCups(createCups());
      setBallsLeft(10);
      setScore(0);
      setGameOver(false);
      setVictory(false);
      flyingBallRef.current = null;
      setStatusMessage("FLICK BALL TOWARD RED CUPS!");
      setInMenu(false);
    },
    [createCups]
  );

  // Toss a ball
  const tossBall = useCallback(
    (vx: number, vy: number, vz: number) => {
      if (inMenu || gameOver || victory || flyingBallRef.current !== null || ballsLeft <= 0) return;

      arcadeSfx.playWhoosh();
      setBallsLeft((b) => b - 1);
      flyingBallRef.current = {
        x: 180,
        y: 350,
        z: 0,
        vx,
        vy,
        vz,
        shadowX: 180,
        shadowY: 350,
      };
    },
    [inMenu, gameOver, victory, ballsLeft]
  );

  // Main Canvas & 3D Trajectory Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const ball = flyingBallRef.current;

      if (ball) {
        // 3D gravity & trajectory
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;
        ball.vz -= 0.65; // gravity pull

        ball.shadowX = ball.x;
        ball.shadowY = ball.y + 15;

        // Ball lands on table (z <= 0)
        if (ball.z <= 0 && ball.y < 330) {
          ball.z = 0;

          // Check cup collisions
          let sunkCupId: number | null = null;
          for (const cup of cups) {
            if (!cup.cleared) {
              const dist = Math.hypot(ball.x - cup.x, ball.y - cup.y);
              if (dist < 20) {
                sunkCupId = cup.id;
                break;
              }
            }
          }

          if (sunkCupId !== null) {
            // SUNK! Liquid splash!
            arcadeSfx.playCupSink();
            setStatusMessage("SPLASH! CUP SUNK! 🎯");

            setCups((prev) =>
              prev.map((c) => (c.id === sunkCupId ? { ...c, cleared: true, isRocking: true } : c))
            );

            setScore((s) => {
              const ns = s + 100;
              if (ns > hiScore) {
                setHiScore(ns);
                try {
                  localStorage.setItem("echo_cup_pong_hi", String(ns));
                } catch {}
              }
              return ns;
            });

            flyingBallRef.current = null;

            // Check if all cups cleared
            const remaining = cups.filter((c) => !c.cleared && c.id !== sunkCupId).length;
            if (remaining === 0) {
              setVictory(true);
              arcadeSfx.playVictory();
              if (currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "cup_pong" as any, 300, true);
              }
            }
          } else {
            // Rim bounce or table miss
            arcadeSfx.playPingPongBounce(false);
            setStatusMessage("MISSED! TRY AGAIN!");
            flyingBallRef.current = null;

            if (ballsLeft <= 0) {
              setGameOver(true);
              arcadeSfx.playPenaltyBuzz();
            }
          }
        } else if (ball.y < -30 || ball.y > 450) {
          flyingBallRef.current = null;
          if (ballsLeft <= 0) {
            setGameOver(true);
            arcadeSfx.playPenaltyBuzz();
          }
        }
      }

      // ── RENDER 2.5D BEER PONG TABLE ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wooden Table Background
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.moveTo(50, 40);
      ctx.lineTo(310, 40);
      ctx.lineTo(345, 380);
      ctx.lineTo(15, 380);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Wood Grain Slats
      ctx.strokeStyle = "rgba(120, 53, 15, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, 40);
      ctx.lineTo(180, 380);
      ctx.stroke();

      // Draw Cups
      cups.forEach((cup) => {
        if (!cup.cleared) {
          // Cup shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y + 12, 16, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Red Party Cup Body
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.moveTo(cup.x - 14, cup.y);
          ctx.lineTo(cup.x + 14, cup.y);
          ctx.lineTo(cup.x + 10, cup.y + 24);
          ctx.lineTo(cup.x - 10, cup.y + 24);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#991b1b";
          ctx.lineWidth = 2;
          ctx.stroke();

          // White Inner Rim
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Beer / Liquid Interior
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y + 1, 11, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Flying Ball & Shadow
      if (ball) {
        // Drop Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(ball.shadowX, ball.shadowY, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Parabolic Ball
        const ballScreenY = ball.y - ball.z;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ball.x, ballScreenY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (ballsLeft > 0 && !gameOver && !victory) {
        // Ready ball at bottom
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(180, 345, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, cups, ballsLeft, hiScore, gameOver, victory, currentUid, match]);

  // Pointer swipe handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameOver || victory || flyingBallRef.current !== null || (playMode === "bot" && ballsLeft % 2 === 0)) return;
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeStartRef.current || flyingBallRef.current !== null) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    const dt = Math.max(1, Date.now() - swipeStartRef.current.time);
    swipeStartRef.current = null;

    if (dy < -30) {
      const speed = Math.min(Math.abs(dy) / dt, 3.2);
      const vx = dx * 0.04;
      const vy = -3.5 - speed * 1.5;
      const vz = 9 + speed * 2;
      tossBall(vx, vy, vz);
    }
  };

  // Bot AI toss loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || victory || flyingBallRef.current !== null) return;

    if (ballsLeft % 2 === 0) {
      // Bot turn
      const timer = setTimeout(() => {
        const accuracy = botDiff === "hard" ? 0.8 : botDiff === "medium" ? 0.55 : 0.35;
        const willHit = Math.random() < accuracy;

        const vx = willHit ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 3;
        const vy = willHit ? -6.8 : -5.5 - Math.random() * 3;
        const vz = willHit ? 13.5 : 11 + Math.random() * 5;

        tossBall(vx, vy, vz);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inMenu, playMode, ballsLeft, gameOver, victory, botDiff, tossBall]);

  // Hero Graphic
  const cupPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Table */}
          <polygon points="20,50 140,50 155,140 5,140" fill="#451a03" stroke="#78350f" strokeWidth="3" />

          {/* Red Cups */}
          <g transform="translate(60, 65)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>
          <g transform="translate(80, 65)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>
          <g transform="translate(100, 65)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>
          <g transform="translate(70, 85)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>
          <g transform="translate(90, 85)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>
          <g transform="translate(80, 105)">
            <polygon points="-8,0 8,0 6,15 -6,15" fill="#dc2626" />
            <ellipse cx="0" cy="0" rx="8" ry="3" fill="#f8fafc" />
          </g>

          {/* Flying Ping Pong Ball with Arc */}
          <path d="M80,145 Q80,75 80,105" stroke="#f8fafc" strokeWidth="2" strokeDasharray="3 3" fill="none" />
          <circle cx="80" cy="85" r="5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Swipe Up to Toss Ball",
      desc: "Flick the ball upward from the bottom of the table toward the red cups.",
      icon: "🥤",
    },
    {
      title: "Sink Cups to Clear",
      desc: "Landed balls sink into the cup with liquid splashes. Clear all 6 cups to win!",
      icon: "🎯",
    },
    {
      title: "Watch Velocity & Depth",
      desc: "Swipe speed dictates depth and trajectory arc. Don't overshoot the table!",
      icon: "⚡",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-blue-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="CUP PONG"
          subtitle="Arcade Table Toss"
          categoryTag="DEXTERITY & AIM"
          accentColor="#0288D1"
          objective="Swipe upward to flick balls into the red cup pyramid! Clear all 6 cups to win!"
          heroGraphic={cupPongHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
          hiScore={hiScore}
        />
      </div>
    );
  }

  const remainingCups = cups.filter((c) => !c.cleared).length;

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

        {/* Cups Remaining */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black text-red-500 drop-shadow-md">
            {remainingCups} / 6
          </div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">CUPS REMAINING</span>
        </div>

        {/* Balls Left */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <span>⚪ {ballsLeft} BALLS</span>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full max-w-sm text-center my-1">
        <span className="text-xs font-black tracking-wider uppercase text-neutral-300">
          {statusMessage}
        </span>
      </div>

      {/* 2.5D Beer Pong Table Canvas */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Victory Modal */}
        {victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">
              ALL CUPS CLEARED!
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Flawless Cup Pong victory!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameOver && !victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">OUT OF BALLS!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Cups remaining: {remainingCups}
            </p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Swipe prompt */}
      <div className="w-full max-w-sm flex flex-col items-center py-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-bounce">
          ▲
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400 mt-1">
          SWIPE UPWARD TO TOSS BALL
        </span>
      </div>
    </div>
  );
}
