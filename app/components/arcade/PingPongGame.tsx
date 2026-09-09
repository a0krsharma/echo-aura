"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Zap, Flame, Sparkles } from "lucide-react";

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
  spinRotation: number;
}

interface TrailPoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
  isSmash: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export default function PingPongGame({
  match,
  currentUid,
  onBack,
}: PingPongProps) {
  const initialMode: "bot" | "friend" = match?.mode === "MULTIPLAYER" ? "friend" : "bot";
  const rawDiff = (match?.difficulty || "").toLowerCase();
  const initialDiff: BotDifficulty = rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
  const hasPreselectedMode = Boolean(match?.mode);

  const [inMenu, setInMenu] = useState(!hasPreselectedMode);
  const [playMode, setPlayMode] = useState<"bot" | "friend">(initialMode);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

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

  // Paddles & Ball (enlarged width for better game feel: 88px)
  const p1PaddleRef = useRef({ x: 180, y: 350, vx: 0, targetX: 180, width: 88, height: 18 });
  const p2PaddleRef = useRef({ x: 180, y: 50, vx: 0, targetX: 180, width: 88, height: 18 });
  const ballRef = useRef<Ball>({
    x: 180,
    y: 200,
    z: 16,
    vx: (Math.random() - 0.5) * 2.0,
    vy: 3.2,
    vz: 0,
    radius: 7,
    spin: 0,
    isSmash: false,
    spinRotation: 0,
  });

  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);

  // Key states for smooth keyboard movement
  const keyState = useRef({
    p1Left: false,
    p1Right: false,
    p2Left: false,
    p2Right: false,
  });

  // Active touch tracking for multi-touch (P1 on bottom, P2 on top)
  const p1TouchId = useRef<number | null>(null);
  const p2TouchId = useRef<number | null>(null);

  // Shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 35);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Reset ball after point: serve starts from the serving player's half
  const resetBall = useCallback((direction: 1 | -1) => {
    ballRef.current = {
      x: 180 + (Math.random() - 0.5) * 36,
      y: direction === 1 ? 140 : 260,
      z: 22,
      vx: (Math.random() - 0.5) * 2.0,
      vy: direction * (3.0 + Math.random() * 0.4),
      vz: 0,
      radius: 7,
      spin: 0,
      isSmash: false,
      spinRotation: 0,
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

  // Auto-start immediately if mode & difficulty were chosen in lobby (never ask twice)
  useEffect(() => {
    if (hasPreselectedMode) {
      startGame(initialMode, initialDiff);
    }
  }, [hasPreselectedMode, initialMode, initialDiff, startGame]);

  // Score point handler
  const scorePoint = useCallback(
    (scoredBy: "p1" | "p2", reason = "") => {
      arcadeSfx.playVictory();
      setScreenShake(8);

      if (reason) {
        setAnnouncement(reason);
        setTimeout(() => setAnnouncement(null), 1200);
      }

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

  // Keyboard controls for P1 (A/D or Left/Right) and P2 (J/L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keyState.current.p1Left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keyState.current.p1Right = true;

      if (playMode === "friend") {
        if (e.key === "j" || e.key === "J") keyState.current.p2Left = true;
        if (e.key === "l" || e.key === "L") keyState.current.p2Right = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keyState.current.p1Left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keyState.current.p1Right = false;

      if (e.key === "j" || e.key === "J") keyState.current.p2Left = false;
      if (e.key === "l" || e.key === "L") keyState.current.p2Right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playMode]);

  // Multi-touch handling on canvas for simultaneous 2-Player tabletop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const canvasY = (touch.clientY - rect.top) * scaleY;
        const canvasX = (touch.clientX - rect.left) * scaleX;

        if (canvasY > 190 && p1TouchId.current === null) {
          p1TouchId.current = touch.identifier;
          const target = Math.max(52, Math.min(308, canvasX));
          p1PaddleRef.current.targetX = target;
          p1PaddleRef.current.x = target;
        } else if (canvasY <= 190 && playMode === "friend" && p2TouchId.current === null) {
          p2TouchId.current = touch.identifier;
          const target = Math.max(52, Math.min(308, canvasX));
          p2PaddleRef.current.targetX = target;
          p2PaddleRef.current.x = target;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const canvasX = (touch.clientX - rect.left) * scaleX;

        if (touch.identifier === p1TouchId.current) {
          const target = Math.max(52, Math.min(308, canvasX));
          p1PaddleRef.current.vx = target - p1PaddleRef.current.x;
          p1PaddleRef.current.targetX = target;
          p1PaddleRef.current.x = target;
        } else if (touch.identifier === p2TouchId.current && playMode === "friend") {
          const target = Math.max(52, Math.min(308, canvasX));
          p2PaddleRef.current.vx = target - p2PaddleRef.current.x;
          p2PaddleRef.current.targetX = target;
          p2PaddleRef.current.x = target;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === p1TouchId.current) {
          p1TouchId.current = null;
        }
        if (touch.identifier === p2TouchId.current) {
          p2TouchId.current = null;
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

  // Pointer move fallback for mouse/desktop
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return; // Handled by touch events
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const scaleY = 400 / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (canvasY > 200 || playMode === "bot") {
      p1PaddleRef.current.targetX = Math.max(48, Math.min(312, canvasX));
    } else if (playMode === "friend") {
      p2PaddleRef.current.targetX = Math.max(48, Math.min(312, canvasX));
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

      // 1. Process Keyboard Movement
      const keySpeed = 8.5;
      if (keyState.current.p1Left) p1.targetX = Math.max(52, p1.targetX - keySpeed);
      if (keyState.current.p1Right) p1.targetX = Math.min(308, p1.targetX + keySpeed);
      if (playMode === "friend") {
        if (keyState.current.p2Left) p2.targetX = Math.max(52, p2.targetX - keySpeed);
        if (keyState.current.p2Right) p2.targetX = Math.min(308, p2.targetX + keySpeed);
      }

      // Smooth Lerp Paddle to Target with Velocity Tracking (if not directly touching)
      if (p1TouchId.current === null) {
        const p1Prev = p1.x;
        p1.x += (p1.targetX - p1.x) * 0.65;
        p1.vx = p1.x - p1Prev;
      }
      p1.x = Math.max(52, Math.min(308, p1.x));

      if (playMode === "bot") {
        const botMaxSpeed = botDiff === "hard" ? 4.8 : botDiff === "medium" ? 3.6 : 2.6;
        let targetX = 180;
        if (ball.vy < 0) {
          // Intercept incoming ball with prediction
          const timeToIntercept = Math.max(1, (p2.y - ball.y) / ball.vy);
          const predictedX = ball.x + (ball.vx + ball.spin * 1.2) * timeToIntercept;
          const variance = botDiff === "hard" ? 6 : botDiff === "medium" ? 18 : 34;
          targetX = predictedX + Math.sin(Date.now() * 0.002) * variance;
        } else {
          // Ease back toward center table during player's turn
          targetX = 180 + Math.sin(Date.now() * 0.001) * 20;
        }
        targetX = Math.max(52, Math.min(308, targetX));
        const diffX = targetX - p2.x;
        const p2Prev = p2.x;
        p2.x += Math.sign(diffX) * Math.min(Math.abs(diffX), botMaxSpeed);
        p2.vx = p2.x - p2Prev;
      } else {
        if (p2TouchId.current === null) {
          const p2Prev = p2.x;
          p2.x += (p2.targetX - p2.x) * 0.65;
          p2.vx = p2.x - p2Prev;
        }
      }
      p2.x = Math.max(52, Math.min(308, p2.x));

      // 2. Ball Physics & 3D Altitude Parabola
      const prevY = ball.y;
      ball.x += ball.vx + ball.spin * 1.2;
      ball.y += ball.vy;
      ball.spinRotation += ball.vx * 0.04 + ball.spin * 0.08;

      // Vertical bounce altitude
      ball.vz -= 0.18; // Balanced gravity
      ball.z += ball.vz;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = Math.abs(ball.vz) * 0.74;
        if (ball.vz < 1.0) ball.vz = 2.6; // Maintain lively bounce

        // Table contact dust particles
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 1.8,
            vy: (Math.random() - 0.5) * 1.8,
            life: 1,
            color: "#e0f2fe",
            size: 2,
          });
        }
      }

      // Detect Apex height for Power Smash prompt
      const isApexReady = ball.z > 10 && Math.abs(ball.vz) < 1.4 && ball.vy > 0 && ball.y > 220 && ball.y < 320;
      setSmashPrompt(isApexReady);

      // Ball side boundary wall bounce
      if (ball.x - ball.radius <= 18) {
        ball.x = 18 + ball.radius;
        ball.vx = Math.abs(ball.vx);
        ball.spin *= -0.5;
        arcadeSfx.playPingPongBounce(false);
      } else if (ball.x + ball.radius >= 342) {
        ball.x = 342 - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        ball.spin *= -0.5;
        arcadeSfx.playPingPongBounce(false);
      }

      // 3. Paddle 1 (Bottom / Player 1) - Continuous Swept Collision Detection (Zero Tunneling)
      const p1Top = p1.y - p1.height / 2;
      const p1Bottom = p1.y + p1.height / 2;
      const p1Left = p1.x - p1.width / 2 - 4;
      const p1Right = p1.x + p1.width / 2 + 4;

      if (ball.vy > 0 && ball.y + ball.radius >= p1Top && prevY - ball.radius <= p1Bottom + 4) {
        if (ball.x >= p1Left && ball.x <= p1Right) {
          const offset = (ball.x - p1.x) / (p1.width / 2);
          const swipeSpeed = Math.abs(p1.vx);
          const isApexHit = ball.z > 10 && Math.abs(ball.vz) < 1.4;
          const isSmashHit = isApexHit || swipeSpeed > 5.5;

          const baseSpeed = 3.2 + Math.min(rallyCount * 0.08, 1.4);
          ball.isSmash = isSmashHit;
          ball.vy = isSmashHit ? -5.4 : -baseSpeed;
          ball.vz = isSmashHit ? 4.2 : 2.8;
          ball.vx = Math.max(-4.5, Math.min(4.5, offset * 3.4 + p1.vx * 0.22));
          ball.spin = Math.max(-0.8, Math.min(0.8, p1.vx * 0.04));

          // Immediate position snap to paddle face prevents any tunneling
          ball.y = p1Top - ball.radius - 1;

          // Visual shockwave on smash
          if (isSmashHit) {
            setScreenShake(10);
            setAnnouncement("🔥 APEX POWER SMASH!");
            setTimeout(() => setAnnouncement(null), 1000);
            shockwavesRef.current.push({
              x: ball.x,
              y: p1.y,
              radius: 8,
              maxRadius: 46,
              alpha: 1,
              color: "#f97316",
            });
          }

          arcadeSfx.playPingPongBounce(isSmashHit);
          setRallyCount((r) => {
            const next = r + 1;
            setMaxRally((m) => Math.max(m, next));
            return next;
          });
        }
      }

      // 4. Paddle 2 (Top / Player 2 or Bot) - Continuous Swept Collision Detection (Zero Tunneling)
      const p2Top = p2.y - p2.height / 2;
      const p2Bottom = p2.y + p2.height / 2;
      const p2Left = p2.x - p2.width / 2 - 4;
      const p2Right = p2.x + p2.width / 2 + 4;

      if (ball.vy < 0 && ball.y - ball.radius <= p2Bottom && prevY + ball.radius >= p2Top - 4) {
        if (ball.x >= p2Left && ball.x <= p2Right) {
          const offset = (ball.x - p2.x) / (p2.width / 2);
          const isSmashHit =
            (playMode === "bot" && botDiff === "hard" && Math.random() < 0.25) || Math.abs(p2.vx) > 5.0;

          const baseSpeed = 3.2 + Math.min(rallyCount * 0.08, 1.4);
          ball.isSmash = isSmashHit;
          ball.vy = isSmashHit ? 5.4 : baseSpeed;
          ball.vz = isSmashHit ? 4.2 : 2.8;
          ball.vx = Math.max(-4.5, Math.min(4.5, offset * 3.4 + p2.vx * 0.22));
          ball.spin = Math.max(-0.8, Math.min(0.8, p2.vx * 0.04));

          // Immediate position snap to paddle face prevents any tunneling
          ball.y = p2Bottom + ball.radius + 1;

          if (isSmashHit) {
            setScreenShake(10);
            setAnnouncement("💥 ENEMY POWER SMASH!");
            setTimeout(() => setAnnouncement(null), 1000);
            shockwavesRef.current.push({
              x: ball.x,
              y: p2.y,
              radius: 8,
              maxRadius: 46,
              alpha: 1,
              color: "#ef4444",
            });
          }

          arcadeSfx.playPingPongBounce(isSmashHit);
          setRallyCount((r) => {
            const next = r + 1;
            setMaxRally((m) => Math.max(m, next));
            return next;
          });
        }
      }

      // 5. Baseline Out of Bounds Scoring
      if (ball.y < 0) {
        scorePoint("p1", "🎉 POINT BLUE!");
      } else if (ball.y > 400) {
        scorePoint("p2", "💥 POINT RED!");
      }

      // 6. Trail history
      trailRef.current.push({
        x: ball.x,
        y: ball.y,
        z: ball.z,
        alpha: ball.isSmash ? 0.95 : 0.45,
        isSmash: ball.isSmash,
      });
      if (trailRef.current.length > (ball.isSmash ? 18 : 8)) {
        trailRef.current.shift();
      }

      // =====================================================================
      // 7. CANVAS RENDERING ENGINE
      // =====================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Arena Floor Backdrop (Deep Stadium Hall)
      const floorGrad = ctx.createLinearGradient(0, 0, 0, 400);
      floorGrad.addColorStop(0, "#090d16");
      floorGrad.addColorStop(0.5, "#0f172a");
      floorGrad.addColorStop(1, "#020617");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tournament Table Drop Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.roundRect(14, 14, 332, 376, 12);
      ctx.fill();

      // Tournament Table Surface (Olympic Matte Blue with anti-glare)
      const tableGrad = ctx.createLinearGradient(0, 10, 0, 390);
      tableGrad.addColorStop(0, "#0369a1");
      tableGrad.addColorStop(0.5, "#0284c7");
      tableGrad.addColorStop(1, "#075985");
      ctx.fillStyle = tableGrad;
      ctx.beginPath();
      ctx.roundRect(16, 10, 328, 380, 10);
      ctx.fill();

      // White Perimeter Baseline & Sideline Borders
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(16, 10, 328, 380);

      // Center Service Line (White Vertical Stripe)
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(180, 10);
      ctx.lineTo(180, 390);
      ctx.stroke();

      // TOURNAMENT NET & POST CLAMPS (y = 200)
      // Net Shadow on Table
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(10, 199, 340, 6);

      // Net Mesh Grid (Translucent Diamond Grid)
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(12, 194, 336, 12);

      // White Top Tape
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 193, 340, 3.5);

      // Metal Net Post Clamps protruding on left and right
      ctx.fillStyle = "#334155";
      ctx.fillRect(8, 191, 7, 18);
      ctx.fillRect(345, 191, 7, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(9, 193, 2, 14);
      ctx.fillRect(349, 193, 2, 14);

      // 8. Render Shockwaves
      shockwavesRef.current = shockwavesRef.current
        .map((sw) => ({
          ...sw,
          radius: sw.radius + 3.2,
          alpha: sw.alpha - 0.065,
        }))
        .filter((sw) => sw.alpha > 0);

      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 9. Render Ball Motion & Flame Trails
      trailRef.current.forEach((tp, idx) => {
        const ratio = idx / trailRef.current.length;
        if (tp.isSmash) {
          // Flaming Afterburner Trail
          const flameGrad = ctx.createRadialGradient(tp.x, tp.y, 1, tp.x, tp.y, ball.radius * (0.8 + ratio * 0.8));
          flameGrad.addColorStop(0, "#fef08a");
          flameGrad.addColorStop(0.5, "#f97316");
          flameGrad.addColorStop(1, "transparent");
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, ball.radius * (1 + ratio * 0.8), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Translucent Motion Streak
          ctx.fillStyle = `rgba(254, 240, 138, ${tp.alpha * ratio * 0.6})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, ball.radius * (0.4 + ratio * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 10. Ball Drop Shadow on Table (Scales with 3D Altitude z)
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      const shadowScale = Math.max(0.45, 1 - ball.z * 0.035);
      ctx.ellipse(ball.x, ball.y + ball.z * 0.35, ball.radius * shadowScale, ball.radius * 0.5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 11. 3D Celluloid Ball (Scales with altitude z)
      const renderRadius = ball.radius * (1 + ball.z * 0.028);
      const ballGrad = ctx.createRadialGradient(
        ball.x - renderRadius * 0.35,
        ball.y - ball.z - renderRadius * 0.35,
        renderRadius * 0.1,
        ball.x,
        ball.y - ball.z,
        renderRadius
      );

      if (ball.isSmash) {
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(0.3, "#fef08a");
        ballGrad.addColorStop(0.7, "#f97316");
        ballGrad.addColorStop(1, "#dc2626");
      } else {
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(0.75, "#fef08a");
        ballGrad.addColorStop(1, "#ca8a04");
      }

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y - ball.z, renderRadius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle seam line rotating with ball spin
      ctx.save();
      ctx.translate(ball.x, ball.y - ball.z);
      ctx.rotate(ball.spinRotation);
      ctx.strokeStyle = ball.isSmash ? "rgba(220, 38, 38, 0.6)" : "rgba(202, 138, 4, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, renderRadius - 1, -0.4, 0.4);
      ctx.stroke();
      ctx.restore();

      // 12. Helper to Render Authentic Oval Table Tennis Paddle
      const drawPaddle = (p: typeof p1, isP1: boolean) => {
        ctx.save();
        ctx.translate(p.x, p.y);

        // Flared Wood Handle
        const handleLength = 24;
        const handleY = isP1 ? p.height / 2 : -p.height / 2 - handleLength;
        const woodGrad = ctx.createLinearGradient(-7, 0, 7, 0);
        woodGrad.addColorStop(0, "#542a12");
        woodGrad.addColorStop(0.5, "#92400e");
        woodGrad.addColorStop(1, "#361808");
        ctx.fillStyle = woodGrad;
        ctx.beginPath();
        ctx.roundRect(-7, handleY, 14, handleLength, 3);
        ctx.fill();

        // Handle Grip Lens
        ctx.fillStyle = isP1 ? "#38bdf8" : "#f87171";
        ctx.fillRect(-3, handleY + 6, 6, 12);

        // Oval Rubber Blade Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(0, isP1 ? 3 : -3, p.width / 2 + 2, p.height / 2 + 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // White Sponge Edge Tape
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width / 2 + 1.5, p.height / 2 + 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // High-Tack Rubber Sheet (Blue for P1, Red for P2)
        const rubberGrad = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
        if (isP1) {
          rubberGrad.addColorStop(0, "#38bdf8");
          rubberGrad.addColorStop(0.5, "#0284c7");
          rubberGrad.addColorStop(1, "#0369a1");
        } else {
          rubberGrad.addColorStop(0, "#f87171");
          rubberGrad.addColorStop(0.5, "#dc2626");
          rubberGrad.addColorStop(1, "#991b1b");
        }
        ctx.fillStyle = rubberGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rubber Specular Sheen Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.beginPath();
        ctx.ellipse(-p.width * 0.2, 0, p.width * 0.18, p.height * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Draw Paddles
      drawPaddle(p1, true);
      drawPaddle(p2, false);

      // Render Particles
      particlesRef.current = particlesRef.current
        .map((pt) => ({
          ...pt,
          x: pt.x + pt.vx,
          y: pt.y + pt.vy,
          life: pt.life - 0.05,
        }))
        .filter((pt) => pt.life > 0);

      particlesRef.current.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // end shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, playMode, botDiff, scorePoint, screenShake]);

  const pingPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-950/40 rounded-2xl flex items-center justify-center border border-blue-500/20 overflow-hidden">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          <rect x="25" y="16" width="110" height="128" rx="8" fill="#0284c7" stroke="#ffffff" strokeWidth="3" />
          <line x1="80" y1="16" x2="80" y2="144" stroke="#ffffff" strokeWidth="2" />
          <rect x="20" y="78" width="120" height="4" fill="#ffffff" />

          {/* Paddle Red */}
          <g transform="translate(55, 45) rotate(25)">
            <rect x="-4" y="-18" width="8" height="14" fill="#78350f" rx="2" />
            <ellipse cx="0" cy="0" rx="16" ry="11" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          </g>

          {/* Paddle Blue */}
          <g transform="translate(105, 115) rotate(-25)">
            <rect x="-4" y="6" width="8" height="14" fill="#78350f" rx="2" />
            <ellipse cx="0" cy="0" rx="16" ry="11" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          </g>

          {/* Glowing Ball with flame */}
          <circle cx="80" cy="80" r="7.5" fill="#fef08a" stroke="#f97316" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Slide or Use Keyboard to Volley",
      desc: "Drag paddle or use A/D & Left/Right keys to return the ball. In 2-Player, both slide simultaneously!",
      icon: "🏓",
    },
    {
      title: "Apex Power Smash",
      desc: "Hit the ball at its floating peak height or swipe fast to unleash a blazing supersonic kill-shot!",
      icon: "⚡",
    },
    {
      title: "First to 7 Points Wins",
      desc: "Outplay your opponent with fast rallies and execute power smashes. First to 7 points takes the cup!",
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
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-1 z-30">
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
      <div className="w-full max-w-sm h-7 flex items-center justify-center my-0.5 z-30">
        {announcement ? (
          <span className="text-xs font-black tracking-wider uppercase text-amber-400 animate-bounce">
            {announcement}
          </span>
        ) : smashPrompt ? (
          <span className="text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1.5 shadow-md">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>⚡ APEX SMASH READY!</span>
          </span>
        ) : (
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
            FIRST TO 7 • MAX RALLY: {maxRally}
          </span>
        )}
      </div>

      {/* Canvas Tabletop Court with Touch & Drag */}
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

      {/* On-screen Directional Touch Slider Controls */}
      <div className="w-full max-w-sm flex items-center justify-between gap-3 px-3 py-1.5 z-30">
        <button
          type="button"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={() => { keyState.current.p1Left = true; }}
          onPointerUp={() => { keyState.current.p1Left = false; }}
          onPointerLeave={() => { keyState.current.p1Left = false; }}
          onPointerCancel={() => { keyState.current.p1Left = false; }}
          className="flex-1 h-12 bg-blue-900/60 hover:bg-blue-800/80 active:bg-blue-700 border-2 border-blue-500/40 rounded-xl font-black text-lg flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md active:scale-95 transition-transform"
        >
          ◄ SLIDE LEFT
        </button>

        <button
          type="button"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={() => { keyState.current.p1Right = true; }}
          onPointerUp={() => { keyState.current.p1Right = false; }}
          onPointerLeave={() => { keyState.current.p1Right = false; }}
          onPointerCancel={() => { keyState.current.p1Right = false; }}
          className="flex-1 h-12 bg-blue-900/60 hover:bg-blue-800/80 active:bg-blue-700 border-2 border-blue-500/40 rounded-xl font-black text-lg flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md active:scale-95 transition-transform"
        >
          SLIDE RIGHT ►
        </button>
      </div>

      {/* Footer touch guide */}
      <div className="w-full max-w-sm text-center pb-1 z-30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          DRAG PADDLE, TAP BUTTONS, OR USE A/D & ARROW KEYS
        </span>
      </div>
    </div>
  );
}
