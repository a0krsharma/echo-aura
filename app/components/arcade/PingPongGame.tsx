"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Zap, Flame } from "lucide-react";

interface PingPongProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Ball {
  x: number;
  y: number;
  z: number; // 3D height altitude above table
  vx: number;
  vy: number;
  vz: number; // vertical bounce velocity
  radius: number;
  spin: number; // curve side-spin (-1 to 1)
  topSpin: number; // forward/backward spin
  isSmash: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function PingPongGame({
  match,
  currentUid,
  onBack,
}: PingPongProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Scores: First to 7
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [rallyCount, setRallyCount] = useState(0);
  const [maxRally, setMaxRally] = useState(0);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);
  const [smashPrompt, setSmashPrompt] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Paddles & Ball
  const p1PaddleRef = useRef({ x: 180, y: 355, vx: 0, width: 75, height: 14 });
  const p2PaddleRef = useRef({ x: 180, y: 45, vx: 0, width: 75, height: 14 });
  const ballRef = useRef<Ball>({
    x: 180,
    y: 200,
    z: 15,
    vx: (Math.random() - 0.5) * 3,
    vy: 4.5,
    vz: 0,
    radius: 7,
    spin: 0,
    topSpin: 0,
    isSmash: false,
  });

  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTouchX = useRef(180);
  const lastTouchY = useRef(355);

  // Shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 40);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Reset ball after point
  const resetBall = useCallback((direction: 1 | -1) => {
    ballRef.current = {
      x: 180,
      y: 200,
      z: 20,
      vx: (Math.random() - 0.5) * 3.5,
      vy: direction * (4.2 + Math.random()),
      vz: 0,
      radius: 7,
      spin: 0,
      topSpin: 0,
      isSmash: false,
    };
    trailRef.current = [];
    setRallyCount(0);
    setSmashPrompt(false);
  }, []);

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setRallyCount(0);
    setMaxRally(0);
    setMatchWinner(null);
    setAnnouncement(null);
    resetBall(1);
    setInMenu(false);
  }, [resetBall]);

  // Touch / Pointer controls
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 360;
    const y = ((e.clientY - rect.top) / rect.height) * 400;

    const paddle = p1PaddleRef.current;
    const dx = x - lastTouchX.current;
    const dy = y - lastTouchY.current;

    paddle.vx = dx;
    paddle.x = Math.max(paddle.width / 2 + 10, Math.min(350 - paddle.width / 2, x));
    // Subtle vertical movement within player zone
    paddle.y = Math.max(330, Math.min(375, y));

    lastTouchX.current = x;
    lastTouchY.current = y;
  };

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const ball = ballRef.current;
      const p1 = p1PaddleRef.current;
      const p2 = p2PaddleRef.current;

      // 1. Aerodynamics & 3D Ball Physics
      ball.vx += ball.spin * 0.12; // curve side-spin
      ball.x += ball.vx;
      ball.y += ball.vy;

      // 3D vertical bounce simulation
      ball.z += ball.vz;
      ball.vz -= 0.35; // gravity pull
      if (ball.z <= 0) {
        ball.z = 0;
        // Bounce on table surface
        if (ball.y > 35 && ball.y < 365) {
          ball.vz = Math.abs(ball.vy) * 0.55 + 2;
          arcadeSfx.playPingPongBounce(false);
        }
      }

      // Check Smash Window Prompt (ball near player apex)
      if (ball.vy > 0 && ball.y > 270 && ball.y < 330 && ball.z > 6) {
        setSmashPrompt(true);
      } else {
        setSmashPrompt(false);
      }

      // Trail & particles for supersonic smash
      if (ball.isSmash) {
        trailRef.current.push({ x: ball.x, y: ball.y, z: ball.z, alpha: 1 });
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: ball.x + (Math.random() - 0.5) * 8,
            y: ball.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1,
            color: Math.random() > 0.5 ? "#f59e0b" : "#ef4444",
          });
        }
      }
      trailRef.current.forEach((t) => (t.alpha -= 0.09));
      trailRef.current = trailRef.current.filter((t) => t.alpha > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Side Wall Bounces
      if (ball.x <= ball.radius + 15 || ball.x >= 345 - ball.radius) {
        ball.vx = -ball.vx * 0.92;
        ball.x = Math.max(ball.radius + 15, Math.min(345 - ball.radius, ball.x));
        arcadeSfx.playPingPongBounce(false);
      }

      // 2. Paddle 1 (Player) Collision
      if (
        ball.y + ball.radius >= p1.y - p1.height / 2 &&
        ball.y - ball.radius <= p1.y + p1.height / 2 &&
        ball.x >= p1.x - p1.width / 2 &&
        ball.x <= p1.x + p1.width / 2 &&
        ball.vy > 0
      ) {
        const offset = (ball.x - p1.x) / (p1.width / 2);
        const swipeSpeed = Math.hypot(p1.vx, (lastTouchY.current - p1.y));
        const canSmash = (swipeSpeed > 5 || p1.y < 340) && ball.z > 5;

        ball.isSmash = canSmash;
        ball.vy = canSmash ? -9.5 : -5.8;
        ball.vz = canSmash ? 5 : 3.5;
        ball.vx = offset * 5.2 + p1.vx * 0.28;
        ball.spin = p1.vx * 0.06;

        if (canSmash) {
          setScreenShake(8);
          setAnnouncement("🔥 APEX SMASH!");
          setTimeout(() => setAnnouncement(null), 1000);
        }

        arcadeSfx.playPingPongBounce(canSmash);
        setRallyCount((r) => {
          const next = r + 1;
          setMaxRally((m) => Math.max(m, next));
          return next;
        });
      }

      // 3. Paddle 2 (Bot / Opponent) AI
      const botSpeed = botDiff === "hard" ? 5.8 : botDiff === "medium" ? 4.2 : 2.8;
      // Trajectory extrapolation
      const targetX = ball.vy < 0 ? ball.x + ball.vx * 3 : 180;
      const botDiffX = targetX - p2.x;
      p2.x += Math.sign(botDiffX) * Math.min(Math.abs(botDiffX), botSpeed);
      p2.x = Math.max(p2.width / 2 + 15, Math.min(345 - p2.width / 2, p2.x));

      // Paddle 2 Collision
      if (
        ball.y - ball.radius <= p2.y + p2.height / 2 &&
        ball.y + ball.radius >= p2.y - p2.height / 2 &&
        ball.x >= p2.x - p2.width / 2 &&
        ball.x <= p2.x + p2.width / 2 &&
        ball.vy < 0
      ) {
        const offset = (ball.x - p2.x) / (p2.width / 2);
        // If it was a hard smash, bot on easy/medium might miss
        if (ball.isSmash && botDiff !== "hard" && Math.random() < 0.45) {
          // Bot misses smash!
        } else {
          ball.isSmash = false;
          ball.vy = 5.8;
          ball.vz = 3.5;
          ball.vx = offset * 5.2;
          ball.spin = -offset * 0.08;

          arcadeSfx.playPingPongBounce(false);
          setRallyCount((r) => {
            const next = r + 1;
            setMaxRally((m) => Math.max(m, next));
            return next;
          });
        }
      }

      // 4. Scoring (Ball out of bounds)
      if (ball.y < -15) {
        // Player 1 Scores!
        arcadeSfx.playMatchSuccess();
        setP1Score((s) => {
          const next = s + 1;
          if (next >= 7) {
            setMatchWinner("p1");
            arcadeSfx.playVictory();
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "ping_pong" as any, 100, true);
            }
          } else {
            resetBall(-1);
          }
          return next;
        });
      } else if (ball.y > 415) {
        // Opponent Scores!
        arcadeSfx.playPenaltyBuzz();
        setP2Score((s) => {
          const next = s + 1;
          if (next >= 7) {
            setMatchWinner("p2");
            arcadeSfx.playVictory();
          } else {
            resetBall(1);
          }
          return next;
        });
      }

      // ── RENDER TOURNAMENT TABLE TENNIS COURT ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Stadium Arena Floor
      const floorGrad = ctx.createLinearGradient(0, 0, 0, 400);
      floorGrad.addColorStop(0, "#0f172a");
      floorGrad.addColorStop(1, "#020617");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Table Outer Wood Apron
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(10, 15, 340, 370, 8);
      ctx.fill();

      // Deep Tournament Blue Table Surface
      const tableGrad = ctx.createLinearGradient(0, 20, 0, 380);
      tableGrad.addColorStop(0, "#1d4ed8");
      tableGrad.addColorStop(1, "#1e40af");
      ctx.fillStyle = tableGrad;
      ctx.beginPath();
      ctx.roundRect(15, 20, 330, 360, 6);
      ctx.fill();

      // Crisp White Border Lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 23, 324, 354);

      // Center Divider Line
      ctx.beginPath();
      ctx.moveTo(180, 23);
      ctx.lineTo(180, 377);
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3D Mesh Net in Middle
      // Net Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(10, 201, 340, 6);

      // Net Mesh Line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(10, 200);
      ctx.lineTo(350, 200);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top White Tape of Net
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 198);
      ctx.lineTo(350, 198);
      ctx.stroke();

      // Net Post Brackets on Sides
      ctx.fillStyle = "#334155";
      ctx.fillRect(6, 194, 8, 12);
      ctx.fillRect(346, 194, 8, 12);

      // Draw Smash Fire Trail
      trailRef.current.forEach((t) => {
        ctx.fillStyle = `rgba(245, 158, 11, ${t.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, (ball.radius + t.z * 0.15) * 1.3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Smash Fire Particles
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Ball 3D Drop Shadow (scales with altitude z)
      const shadowRadius = ball.radius * (1 + ball.z * 0.04);
      const shadowAlpha = Math.max(0.1, 0.45 - ball.z * 0.015);
      const shadowYOffset = ball.z * 0.8;
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y + shadowYOffset, shadowRadius, shadowRadius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ball (scales with altitude z for 3D perception)
      const renderedRadius = ball.radius * (1 + ball.z * 0.035);
      const ballGrad = ctx.createRadialGradient(
        ball.x - renderedRadius * 0.3,
        ball.y - renderedRadius * 0.3,
        1,
        ball.x,
        ball.y,
        renderedRadius
      );
      if (ball.isSmash) {
        ballGrad.addColorStop(0, "#fef08a");
        ballGrad.addColorStop(0.6, "#f59e0b");
        ballGrad.addColorStop(1, "#ea580c");
      } else {
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(0.7, "#f8fafc");
        ballGrad.addColorStop(1, "#cbd5e1");
      }
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, renderedRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ball.isSmash ? "#f97316" : "#94a3b8";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Paddle 2 (Bot - Red Rubber Blade + Wooden Handle)
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.roundRect(p2.x - p2.width / 2 + 2, p2.y - p2.height / 2 + 3, p2.width, p2.height, 6);
      ctx.fill();

      // Rubber Face
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(p2.x - p2.width / 2, p2.y - p2.height / 2, p2.width, p2.height, 6);
      ctx.fill();
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Handle
      ctx.fillStyle = "#d97706";
      ctx.fillRect(p2.x - 6, p2.y - p2.height / 2 - 10, 12, 10);

      // Draw Paddle 1 (Player - Blue Rubber Blade + Wooden Handle)
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.roundRect(p1.x - p1.width / 2 + 2, p1.y - p1.height / 2 + 3, p1.width, p1.height, 6);
      ctx.fill();

      // Rubber Face
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(p1.x - p1.width / 2, p1.y - p1.height / 2, p1.width, p1.height, 6);
      ctx.fill();
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Handle
      ctx.fillStyle = "#d97706";
      ctx.fillRect(p1.x - 6, p1.y + p1.height / 2, 12, 10);

      ctx.restore(); // end shake transform

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, botDiff, currentUid, match, screenShake, resetBall]);

  // Hero Graphic
  const pingPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-950/40 rounded-2xl flex items-center justify-center border border-blue-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <rect x="25" y="35" width="110" height="90" rx="6" fill="#1d4ed8" stroke="#1e40af" strokeWidth="3" />
          <rect x="28" y="38" width="104" height="84" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="80" y1="38" x2="80" y2="122" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="20" y1="80" x2="140" y2="80" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="4 3" />

          {/* Paddle Red */}
          <g transform="translate(55, 60) rotate(30)">
            <circle cx="0" cy="0" r="14" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <rect x="-3" y="12" width="6" height="10" fill="#d97706" rx="2" />
          </g>

          {/* Paddle Blue */}
          <g transform="translate(105, 100) rotate(-30)">
            <circle cx="0" cy="0" r="14" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            <rect x="-3" y="12" width="6" height="10" fill="#d97706" rx="2" />
          </g>

          {/* Ball with Fire Trail */}
          <circle cx="75" cy="85" r="7" fill="#f59e0b" stroke="#ea580c" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Slide Paddle to Return",
      desc: "Drag your finger across the bottom zone to slide your paddle into the ball's trajectory.",
      icon: "🏓",
    },
    {
      title: "Apex Power Smash",
      desc: "When the ball floats up to its peak height, swipe hard to unleash a blazing supersonic smash!",
      icon: "⚡",
    },
    {
      title: "First to 7 Points",
      desc: "Drive the ball past the opponent's baseline. Long rallies build massive arcade bonus points!",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-blue-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="PING PONG"
          subtitle="Tournament Table Tennis"
          categoryTag="TACTICAL SPORTS"
          accentColor="#3B82F6"
          objective="Slide paddle to volley! Hit at apex to unleash blazing Power Smashes. First to 7 wins!"
          heroGraphic={pingPongHero}
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

        {/* Scoreboard */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">YOU</span>
            <span className="text-2xl font-black text-blue-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              {playMode === "bot" ? "BOT" : "P2"}
            </span>
            <span className="text-2xl font-black text-red-500">{p2Score}</span>
          </div>
        </div>

        {/* Rally Tracker */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Zap className="w-3.5 h-3.5" />
          <span>RALLY: {rallyCount}</span>
        </div>
      </div>

      {/* Smash Prompt / Announcement Header */}
      <div className="w-full max-w-sm h-6 flex items-center justify-center my-1">
        {announcement ? (
          <span className="text-xs font-black tracking-wider uppercase text-amber-400 animate-bounce">
            {announcement}
          </span>
        ) : smashPrompt ? (
          <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ APEX SMASH READY!</span>
          </span>
        ) : (
          <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
            FIRST TO 7 • MAX RALLY: {maxRally}
          </span>
        )}
      </div>

      {/* Canvas Court */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={400}
          onPointerMove={handlePointerMove}
          className="w-full h-full cursor-pointer"
        />

        {/* Match Finished Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Final Score: {p1Score} - {p2Score} (Max Rally: {maxRally})
            </p>

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

      {/* Control Prompt */}
      <div className="w-full max-w-sm text-center py-2">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          DRAG TO SLIDE PADDLE • SWIPE UP AT APEX TO SMASH
        </span>
      </div>
    </div>
  );
}

