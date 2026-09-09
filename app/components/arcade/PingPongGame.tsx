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
  const p1PaddleRef = useRef({ x: 180, y: 355, vx: 0, width: 78, height: 15 });
  const p2PaddleRef = useRef({ x: 180, y: 45, vx: 0, width: 78, height: 15 });
  const ballRef = useRef<Ball>({
    x: 180,
    y: 200,
    z: 15,
    vx: (Math.random() - 0.5) * 3,
    vy: 4.5,
    vz: 0,
    radius: 7,
    spin: 0,
    isSmash: false,
  });

  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Active touch tracking for multi-touch (P1 on bottom, P2 on top)
  const p1TouchId = useRef<number | null>(null);
  const p2TouchId = useRef<number | null>(null);

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
      z: 22,
      vx: (Math.random() - 0.5) * 3.5,
      vy: direction * (4.2 + Math.random()),
      vz: 0,
      radius: 7,
      spin: 0,
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
    setInMenu(false);
    resetBall(1);
  }, [resetBall]);

  // Score point handler
  const scorePoint = useCallback(
    (scoredBy: "p1" | "p2") => {
      arcadeSfx.playVictory();
      setScreenShake(6);

      if (scoredBy === "p1") {
        setP1Score((s) => {
          const next = s + 1;
          if (next >= 7) {
            setMatchWinner("p1");
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "ping_pong" as any, 100, true);
            }
          }
          return next;
        });
        resetBall(-1); // Serve toward P2
      } else {
        setP2Score((s) => {
          const next = s + 1;
          if (next >= 7) setMatchWinner("p2");
          return next;
        });
        resetBall(1); // Serve toward P1
      }
    },
    [currentUid, match, resetBall]
  );

  // Multi-touch handling on canvas for simultaneous 2-Player tabletop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const canvasY = (touch.clientY - rect.top) * scaleY;
        const canvasX = (touch.clientX - rect.left) * scaleX;

        if (canvasY > 200 && p1TouchId.current === null) {
          p1TouchId.current = touch.identifier;
          p1PaddleRef.current.x = Math.max(45, Math.min(315, canvasX));
        } else if (canvasY <= 200 && playMode === "friend" && p2TouchId.current === null) {
          p2TouchId.current = touch.identifier;
          p2PaddleRef.current.x = Math.max(45, Math.min(315, canvasX));
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const canvasX = (touch.clientX - rect.left) * scaleX;

        if (touch.identifier === p1TouchId.current) {
          const prev = p1PaddleRef.current.x;
          const next = Math.max(45, Math.min(315, canvasX));
          p1PaddleRef.current.vx = next - prev;
          p1PaddleRef.current.x = next;
        } else if (touch.identifier === p2TouchId.current && playMode === "friend") {
          const prev = p2PaddleRef.current.x;
          const next = Math.max(45, Math.min(315, canvasX));
          p2PaddleRef.current.vx = next - prev;
          p2PaddleRef.current.x = next;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === p1TouchId.current) {
          p1TouchId.current = null;
          p1PaddleRef.current.vx = 0;
        }
        if (touch.identifier === p2TouchId.current) {
          p2TouchId.current = null;
          p2PaddleRef.current.vx = 0;
        }
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [playMode]);

  // Pointer move fallback for mouse on desktop
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return; // Handled by touch events above
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (canvasY > 200 || playMode === "bot") {
      const prev = p1PaddleRef.current.x;
      const next = Math.max(45, Math.min(315, canvasX));
      p1PaddleRef.current.vx = next - prev;
      p1PaddleRef.current.x = next;
    } else if (playMode === "friend") {
      const prev = p2PaddleRef.current.x;
      const next = Math.max(45, Math.min(315, canvasX));
      p2PaddleRef.current.vx = next - prev;
      p2PaddleRef.current.x = next;
    }
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

      // 1. Ball Physics & 3D Altitude Parabola
      ball.x += ball.vx + ball.spin * 1.6;
      ball.y += ball.vy;

      // Vertical bounce altitude
      ball.vz -= 0.22; // Gravity
      ball.z += ball.vz;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = Math.abs(ball.vz) * 0.75; // Table bounce
        if (ball.vz < 1.2) ball.vz = 3.2; // Keep lively bounce
      }

      // Detect Apex height for Power Smash prompt
      if (ball.z > 14 && ball.vy > 0 && ball.y > 230 && ball.y < 320) {
        setSmashPrompt(true);
      } else {
        setSmashPrompt(false);
      }

      // Ball side wall bounce
      if (ball.x - ball.radius <= 20) {
        ball.x = 20 + ball.radius;
        ball.vx = Math.abs(ball.vx);
        ball.spin *= -0.5;
        arcadeSfx.playPingPongBounce(false);
      } else if (ball.x + ball.radius >= 340) {
        ball.x = 340 - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        ball.spin *= -0.5;
        arcadeSfx.playPingPongBounce(false);
      }

      // 2. Paddle 1 (Bottom / Player 1) Collision
      if (
        ball.y + ball.radius >= p1.y - p1.height / 2 &&
        ball.y - ball.radius <= p1.y + p1.height / 2 &&
        ball.x >= p1.x - p1.width / 2 &&
        ball.x <= p1.x + p1.width / 2 &&
        ball.vy > 0
      ) {
        const offset = (ball.x - p1.x) / (p1.width / 2);
        const swipeSpeed = Math.abs(p1.vx);
        const isSmashHit = (swipeSpeed > 5 || ball.z > 12);

        ball.isSmash = isSmashHit;
        ball.vy = isSmashHit ? -9.6 : -6.0;
        ball.vz = isSmashHit ? 5.2 : 3.6;
        ball.vx = offset * 5.4 + p1.vx * 0.25;
        ball.spin = p1.vx * 0.05;

        if (isSmashHit) {
          setScreenShake(8);
          setAnnouncement("🔥 APEX POWER SMASH!");
          setTimeout(() => setAnnouncement(null), 1000);
        }

        arcadeSfx.playPingPongBounce(isSmashHit);
        setRallyCount((r) => {
          const next = r + 1;
          setMaxRally((m) => Math.max(m, next));
          return next;
        });
      }

      // 3. Paddle 2 (Top / Player 2 or Bot)
      if (playMode === "bot") {
        const botSpeed = botDiff === "hard" ? 6.2 : botDiff === "medium" ? 4.4 : 2.8;
        // Extrapolate target X
        const targetX = ball.vy < 0 ? ball.x + ball.vx * (botDiff === "hard" ? 3.5 : 2.0) : 180;
        const botDiffX = targetX - p2.x;
        p2.x += Math.sign(botDiffX) * Math.min(Math.abs(botDiffX), botSpeed);
        p2.x = Math.max(p2.width / 2 + 15, Math.min(345 - p2.width / 2, p2.x));
      }

      // Paddle 2 Collision
      if (
        ball.y - ball.radius <= p2.y + p2.height / 2 &&
        ball.y + ball.radius >= p2.y - p2.height / 2 &&
        ball.x >= p2.x - p2.width / 2 &&
        ball.x <= p2.x + p2.width / 2 &&
        ball.vy < 0
      ) {
        const offset = (ball.x - p2.x) / (p2.width / 2);
        const isSmashHit = (playMode === "bot" && botDiff === "hard" && Math.random() < 0.35) || (Math.abs(p2.vx) > 5);

        ball.isSmash = isSmashHit;
        ball.vy = isSmashHit ? 9.6 : 6.0;
        ball.vz = isSmashHit ? 5.2 : 3.6;
        ball.vx = offset * 5.4 + p2.vx * 0.25;
        ball.spin = p2.vx * 0.05;

        if (isSmashHit) {
          setScreenShake(8);
          setAnnouncement("💥 ENEMY POWER SMASH!");
          setTimeout(() => setAnnouncement(null), 1000);
        }

        arcadeSfx.playPingPongBounce(isSmashHit);
        setRallyCount((r) => {
          const next = r + 1;
          setMaxRally((m) => Math.max(m, next));
          return next;
        });
      }

      // 4. Baseline Out of Bounds
      if (ball.y < 10) {
        scorePoint("p1");
      } else if (ball.y > 390) {
        scorePoint("p2");
      }

      // 5. Trail history
      trailRef.current.push({
        x: ball.x,
        y: ball.y,
        z: ball.z,
        alpha: ball.isSmash ? 0.9 : 0.45,
      });
      if (trailRef.current.length > (ball.isSmash ? 16 : 8)) {
        trailRef.current.shift();
      }

      // 6. RENDER COURT TO CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Tournament Table Surface (Deep Pro Blue)
      const tableGrad = ctx.createLinearGradient(0, 0, 0, 400);
      tableGrad.addColorStop(0, "#0c4a6e");
      tableGrad.addColorStop(0.5, "#0284c7");
      tableGrad.addColorStop(1, "#075985");
      ctx.fillStyle = tableGrad;
      ctx.fillRect(15, 10, 330, 380);

      // White Perimeter Court Lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 10, 330, 380);

      // Center Vertical Line
      ctx.beginPath();
      ctx.moveTo(180, 10);
      ctx.lineTo(180, 390);
      ctx.stroke();

      // Center Tournament Net (White Top Tape + Mesh Texture)
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(10, 198, 340, 6); // Net Shadow
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 197, 340, 6); // White Top Tape

      // Net Mesh Lines
      ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
      ctx.lineWidth = 1;
      for (let nx = 12; nx < 350; nx += 8) {
        ctx.beginPath();
        ctx.moveTo(nx, 197);
        ctx.lineTo(nx, 203);
        ctx.stroke();
      }

      // 7. Render Ball Trail
      trailRef.current.forEach((tp, idx) => {
        ctx.fillStyle = ball.isSmash ? `rgba(249, 115, 22, ${tp.alpha * (idx / trailRef.current.length)})` : `rgba(254, 240, 138, ${tp.alpha * (idx / trailRef.current.length)})`;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, ball.radius * (0.5 + (idx / trailRef.current.length) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      // 8. Ball Drop Shadow (Scales with 3D Altitude z)
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      const shadowScale = Math.max(0.4, 1 - ball.z * 0.03);
      ctx.ellipse(ball.x, ball.y + 3 + ball.z * 0.4, ball.radius * shadowScale, ball.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 9. Ball 3D Sphere (Scales with altitude z)
      const renderRadius = ball.radius * (1 + ball.z * 0.025);
      const ballGrad = ctx.createRadialGradient(
        ball.x - renderRadius * 0.3,
        ball.y - ball.z - renderRadius * 0.3,
        renderRadius * 0.1,
        ball.x,
        ball.y - ball.z,
        renderRadius
      );

      if (ball.isSmash) {
        ballGrad.addColorStop(0, "#fef08a");
        ballGrad.addColorStop(0.4, "#f97316");
        ballGrad.addColorStop(1, "#dc2626");
      } else {
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(0.7, "#fef08a");
        ballGrad.addColorStop(1, "#ca8a04");
      }

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y - ball.z, renderRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ball.isSmash ? "#ef4444" : "#eab308";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 10. Render Paddles
      // Player 1 (Bottom Paddle: Blue Rubber with Wood Handle)
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.roundRect(p1.x - p1.width / 2, p1.y - p1.height / 2, p1.width, p1.height, 8);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Player 2 (Top Paddle: Red Rubber with Wood Handle)
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.roundRect(p2.x - p2.width / 2, p2.y - p2.height / 2, p2.width, p2.height, 8);
      ctx.fill();
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore(); // end shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, playMode, botDiff, scorePoint, screenShake]);

  const pingPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-950/40 rounded-2xl flex items-center justify-center border border-blue-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <rect x="25" y="20" width="110" height="120" rx="10" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="80" y1="20" x2="80" y2="140" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="20" y="78" width="120" height="4" fill="#ffffff" />
          {/* Paddle Red */}
          <g transform="translate(55, 45) rotate(25)">
            <circle cx="0" cy="0" r="14" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
          </g>
          {/* Paddle Blue */}
          <g transform="translate(105, 115) rotate(-25)">
            <circle cx="0" cy="0" r="14" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          </g>
          {/* Ball */}
          <circle cx="80" cy="80" r="7" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Slide Paddle to Return",
      desc: "Drag across your court zone to intercept the ball. In 2-Player, both slide simultaneously!",
      icon: "🏓",
    },
    {
      title: "Apex Power Smash",
      desc: "Hit the ball at its floating peak height to unleash a supersonic flaming kill-shot!",
      icon: "⚡",
    },
    {
      title: "First to 7 Points",
      desc: "Drive the ball past your opponent's baseline. Long rallies build massive bonus multipliers!",
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

        {/* Scoreboard */}
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

        {/* Rally Tracker */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <Zap className="w-3.5 h-3.5" />
          <span>RALLY: {rallyCount}</span>
        </div>
      </div>

      {/* Smash Prompt / Announcement Header */}
      <div className="w-full max-w-sm h-6 flex items-center justify-center my-0.5 z-20">
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
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
            FIRST TO 7 • MAX RALLY: {maxRally}
          </span>
        )}
      </div>

      {/* Canvas Tabletop Court */}
      <div className="relative w-full max-w-sm h-[390px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
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
              {matchWinner === "p1" ? "BLUE VICTORY!" : "RED VICTORY!"}
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
      <div className="w-full max-w-sm text-center py-1 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {playMode === "friend" ? "MULTI-TOUCH: SLIDE BOTH PADDLES TO VOLLEY" : "SLIDE BOTTOM PADDLE TO RETURN"}
        </span>
      </div>
    </div>
  );
}
