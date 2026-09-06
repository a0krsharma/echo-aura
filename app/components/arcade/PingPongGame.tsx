"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Zap } from "lucide-react";

interface PingPongProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spin: number; // curve spin
  isSmash: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
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
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Paddles & Ball
  const p1PaddleRef = useRef({ x: 180, y: 350, vx: 0, width: 70, height: 12 });
  const p2PaddleRef = useRef({ x: 180, y: 50, vx: 0, width: 70, height: 12 });
  const ballRef = useRef<Ball>({
    x: 180,
    y: 200,
    vx: (Math.random() - 0.5) * 4,
    vy: 4,
    radius: 7,
    spin: 0,
    isSmash: false,
  });

  const trailRef = useRef<TrailPoint[]>([]);
  const lastTouchX = useRef(180);

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setMatchWinner(null);
    resetBall(1);
    setInMenu(false);
  }, []);

  const resetBall = (direction: 1 | -1) => {
    ballRef.current = {
      x: 180,
      y: 200,
      vx: (Math.random() - 0.5) * 3,
      vy: direction * (4 + Math.random()),
      radius: 7,
      spin: 0,
      isSmash: false,
    };
    trailRef.current = [];
  };

  // Touch / Pointer controls
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 360;
    const paddle = p1PaddleRef.current;
    const dx = x - lastTouchX.current;
    paddle.vx = dx;
    paddle.x = Math.max(paddle.width / 2, Math.min(360 - paddle.width / 2, x));
    lastTouchX.current = x;
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

      // 1. Ball Curve & Physics
      ball.vx += ball.spin * 0.08;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Trail for smash
      if (ball.isSmash) {
        trailRef.current.push({ x: ball.x, y: ball.y, alpha: 1 });
      }
      trailRef.current.forEach((t) => (t.alpha -= 0.08));
      trailRef.current = trailRef.current.filter((t) => t.alpha > 0);

      // Wall Bounces
      if (ball.x <= ball.radius || ball.x >= 360 - ball.radius) {
        ball.vx = -ball.vx * 0.95;
        ball.x = Math.max(ball.radius, Math.min(360 - ball.radius, ball.x));
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
        // Impact offset
        const offset = (ball.x - p1.x) / (p1.width / 2);
        const swipeSpeed = Math.abs(p1.vx);
        const isSmash = swipeSpeed > 6;

        ball.isSmash = isSmash;
        ball.vy = isSmash ? -8.5 : -5.5;
        ball.vx = offset * 5 + p1.vx * 0.3;
        ball.spin = (p1.vx * 0.05);

        arcadeSfx.playPingPongBounce(isSmash);
      }

      // 3. Paddle 2 (Bot) Trajectory extrapolation & movement
      const botSpeed = botDiff === "hard" ? 5.2 : botDiff === "medium" ? 3.8 : 2.5;
      const targetX = ball.vy < 0 ? ball.x : 180; // track ball if heading toward bot
      const botDiffX = targetX - p2.x;
      p2.x += Math.sign(botDiffX) * Math.min(Math.abs(botDiffX), botSpeed);
      p2.x = Math.max(p2.width / 2, Math.min(360 - p2.width / 2, p2.x));

      // Paddle 2 Collision
      if (
        ball.y - ball.radius <= p2.y + p2.height / 2 &&
        ball.y + ball.radius >= p2.y - p2.height / 2 &&
        ball.x >= p2.x - p2.width / 2 &&
        ball.x <= p2.x + p2.width / 2 &&
        ball.vy < 0
      ) {
        const offset = (ball.x - p2.x) / (p2.width / 2);
        ball.isSmash = false;
        ball.vy = 5.5;
        ball.vx = offset * 5;
        ball.spin = -offset * 0.1;

        arcadeSfx.playPingPongBounce(false);
      }

      // 4. Scoring (Ball out of bounds)
      if (ball.y < 0) {
        // Player 1 Scores!
        arcadeSfx.playMatchSuccess();
        setP1Score((s) => {
          const next = s + 1;
          if (next >= 7) {
            setMatchWinner("p1");
            arcadeSfx.playVictory();
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "ping_pong" as any, 50, true);
            }
          } else {
            resetBall(-1);
          }
          return next;
        });
      } else if (ball.y > 400) {
        // Opponent Scores
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

      // ── RENDER TABLE TENNIS COURT ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Green Ping Pong Table Surface
      ctx.fillStyle = "#15803d";
      ctx.fillRect(15, 20, 330, 360);

      // White Border Lines
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 20, 330, 360);

      // Center Line
      ctx.beginPath();
      ctx.moveTo(180, 20);
      ctx.lineTo(180, 380);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Net in Middle
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(10, 200);
      ctx.lineTo(350, 200);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Smash Trail
      trailRef.current.forEach((t) => {
        ctx.fillStyle = `rgba(251, 191, 36, ${t.alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Ball
      ctx.fillStyle = ball.isSmash ? "#f59e0b" : "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Paddle 2 (Bot/Top - Red)
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(p2.x - p2.width / 2, p2.y - p2.height / 2, p2.width, p2.height, 6);
      ctx.fill();
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Paddle 1 (Player/Bottom - Blue)
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(p1.x - p1.width / 2, p1.y - p1.height / 2, p1.width, p1.height, 6);
      ctx.fill();
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2;
      ctx.stroke();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, botDiff, currentUid, match]);

  // Hero Graphic
  const pingPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Table */}
          <rect x="25" y="40" width="110" height="80" rx="4" fill="#15803d" stroke="#166534" strokeWidth="3" />
          <line x1="80" y1="40" x2="80" y2="120" stroke="#f8fafc" strokeWidth="2" />
          <line x1="20" y1="80" x2="140" y2="80" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="3 3" />

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

          {/* Ball */}
          <circle cx="75" cy="85" r="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Swipe Paddle to Return",
      desc: "Drag your finger across the lower half to slide the paddle and return the ball.",
      icon: "🏓",
    },
    {
      title: "Spin & Power Smashes",
      desc: "Fast horizontal swipes apply curve spin. Hit the ball hard for blazing power smashes!",
      icon: "⚡",
    },
    {
      title: "First to 7 Points",
      desc: "Outmaneuver your opponent and drive the ball past their baseline. First to 7 wins!",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="PING PONG"
          subtitle="Swipe Table Tennis"
          categoryTag="TACTICAL SPORTS"
          accentColor="#10B981"
          objective="Drag paddle to volley the ball! Apply spin on sharp swipes & smash at apex. First to 7 wins!"
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

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 7</span>
        </div>
      </div>

      {/* Canvas Court */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
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
              Final Score: {p1Score} - {p2Score}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
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
          DRAG FINGER HORIZONTALLY TO SLIDE PADDLE
        </span>
      </div>
    </div>
  );
}
