"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateGlowHockeyScore, syncGlowHockeyState, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  Zap,
  HelpCircle,
  Users,
  Sparkles,
  Flame,
  Crown,
  Timer,
  Shield,
  Activity,
  Compass,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface GlowHockeyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const WIDTH = 340;
const HEIGHT = 480;
const PADDLE_RADIUS = 24;
const PUCK_RADIUS = 14;
const GOAL_WIDTH = 136;
const WALL_THICKNESS = 18;
const PLAYABLE_MIN_X = WALL_THICKNESS + PUCK_RADIUS;
const PLAYABLE_MAX_X = WIDTH - WALL_THICKNESS - PUCK_RADIUS;

// USAA Standard Constants
const RESTITUTION_RAIL = 0.90;
const RESTITUTION_MALLET = 0.94;
const DRAG_FACTOR = 0.992; // Air suspension damping
const MAX_PUCK_SPEED = 22;
const MAX_MALLET_SPEED = 28;
const POSSESSION_LIMIT_SEC = 7;

export type AIDifficulty = "AMATEUR" | "SEMI_PRO" | "USAA_PRO";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function GlowHockeyGame({ match, currentUid, isHost }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("SEMI_PRO");
  const [targetScore, setTargetScore] = useState<number>(7); // USAA 7-pt standard
  const [possessionTimer, setPossessionTimer] = useState<number>(POSSESSION_LIMIT_SEC);
  const [possessionSide, setPossessionSide] = useState<"P1" | "P2" | "NEUTRAL">("NEUTRAL");
  const [foulAlert, setFoulAlert] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState(gh?.p2Score || 0);
  const isVsBot = match.mode === "VS_COMPUTER";

  // Physics Simulation Object Refs
  const puckRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    prevX: WIDTH / 2,
    prevY: HEIGHT / 2,
  });

  const p1PaddleRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT - 70,
    prevX: WIDTH / 2,
    prevY: HEIGHT - 70,
    vx: 0,
    vy: 0,
  });

  const p2PaddleRef = useRef({
    x: WIDTH / 2,
    y: 70,
    prevX: WIDTH / 2,
    prevY: 70,
    vx: 0,
    vy: 0,
  });

  const p1TargetRef = useRef({ x: WIDTH / 2, y: HEIGHT - 70 });
  const p2TargetRef = useRef({ x: WIDTH / 2, y: 70 });
  const sparksRef = useRef<Spark[]>([]);
  const puckTrailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const lastPossessionCheckRef = useRef<number>(Date.now());
  const matchRef = useRef(match);
  matchRef.current = match;

  const emitSparks = useCallback((x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 0.35 + 0.15,
        color,
      });
    }
  }, []);

  const triggerFoul = useCallback((message: string) => {
    setFoulAlert(message);
    soundSynth.playBuzzer();
    setTimeout(() => setFoulAlert(null), 2500);
  }, []);

  const resetPuck = useCallback((scoredOnP1: boolean) => {
    const p = puckRef.current;
    p.x = WIDTH / 2;
    p.y = scoredOnP1 ? HEIGHT / 2 + 60 : HEIGHT / 2 - 60;
    p.vx = (Math.random() - 0.5) * 4;
    p.vy = scoredOnP1 ? 4 : -4;
    p.prevX = p.x;
    p.prevY = p.y;

    p1PaddleRef.current.x = WIDTH / 2;
    p1PaddleRef.current.y = HEIGHT - 70;
    p1TargetRef.current = { x: WIDTH / 2, y: HEIGHT - 70 };

    p2PaddleRef.current.x = WIDTH / 2;
    p2PaddleRef.current.y = 70;
    p2TargetRef.current = { x: WIDTH / 2, y: 70 };

    puckTrailRef.current = [];
    setPossessionTimer(POSSESSION_LIMIT_SEC);
    setPossessionSide(scoredOnP1 ? "P1" : "P2");
  }, []);

  // Main Continuous 60FPS CCD Physics Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      const puck = puckRef.current;
      const p1 = p1PaddleRef.current;
      const p2 = p2PaddleRef.current;

      // ── 1. Update Player 1 Paddle with Strict Centerline Boundary ──
      p1.prevX = p1.x;
      p1.prevY = p1.y;
      const targetP1 = p1TargetRef.current;

      // Clamp P1 strictly inside defensive half (Centerline Rule)
      const clampedP1X = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(WIDTH - WALL_THICKNESS - PADDLE_RADIUS, targetP1.x));
      const clampedP1Y = Math.max(HEIGHT / 2 + PADDLE_RADIUS + 4, Math.min(HEIGHT - WALL_THICKNESS - PADDLE_RADIUS, targetP1.y));

      p1.x += (clampedP1X - p1.x) * 0.45;
      p1.y += (clampedP1Y - p1.y) * 0.45;
      p1.vx = (p1.x - p1.prevX) / (dt || 0.016);
      p1.vy = (p1.y - p1.prevY) / (dt || 0.016);

      // Clamp Mallet max velocity
      const p1Speed = Math.hypot(p1.vx, p1.vy);
      if (p1Speed > MAX_MALLET_SPEED) {
        p1.vx = (p1.vx / p1Speed) * MAX_MALLET_SPEED;
        p1.vy = (p1.vy / p1Speed) * MAX_MALLET_SPEED;
      }

      // ── 2. Multi-Mode AI State Machine for Player 2 / Bot ──
      p2.prevX = p2.x;
      p2.prevY = p2.y;

      if (isVsBot) {
        let aiReactionSpeed = 0.18;
        let predictionFactor = 0.5;

        if (aiDifficulty === "AMATEUR") {
          aiReactionSpeed = 0.12;
          predictionFactor = 0.2;
        } else if (aiDifficulty === "USAA_PRO") {
          aiReactionSpeed = 0.32;
          predictionFactor = 0.85;
        }

        // State Machine
        let aiTargetX = WIDTH / 2;
        let aiTargetY = 75;

        if (puck.y < HEIGHT / 2) {
          // STRIKING & CLEARING: Attack or intercept puck in defensive half
          const predictedPuckX = puck.x + puck.vx * predictionFactor;
          aiTargetX = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(WIDTH - WALL_THICKNESS - PADDLE_RADIUS, predictedPuckX));
          aiTargetY = Math.min(HEIGHT / 2 - PADDLE_RADIUS - 6, Math.max(WALL_THICKNESS + PADDLE_RADIUS + 10, puck.y - 12));
        } else {
          // RETREATING & TRACKING: Guard the goal in triangle crease
          aiTargetX = WIDTH / 2 + (puck.x - WIDTH / 2) * 0.5;
          aiTargetY = 65;
        }

        p2TargetRef.current = { x: aiTargetX, y: aiTargetY };
      }

      const targetP2 = p2TargetRef.current;
      const clampedP2X = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(WIDTH - WALL_THICKNESS - PADDLE_RADIUS, targetP2.x));
      const clampedP2Y = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(HEIGHT / 2 - PADDLE_RADIUS - 4, targetP2.y));

      p2.x += (clampedP2X - p2.x) * 0.35;
      p2.y += (clampedP2Y - p2.y) * 0.35;
      p2.vx = (p2.x - p2.prevX) / (dt || 0.016);
      p2.vy = (p2.y - p2.prevY) / (dt || 0.016);

      // ── 3. Continuous Collision Detection (CCD) Sub-Stepping ──
      const subSteps = 6;
      const stepDt = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        puck.prevX = puck.x;
        puck.prevY = puck.y;

        puck.x += (puck.vx * stepDt * 60) / subSteps;
        puck.y += (puck.vy * stepDt * 60) / subSteps;

        // Apply Aerostatic Air Cushion Viscous Drag
        puck.vx *= Math.pow(DRAG_FACTOR, 1 / subSteps);
        puck.vy *= Math.pow(DRAG_FACTOR, 1 / subSteps);

        // A. Circle-to-Circle Elastic Collision with P1 Mallet
        const dx1 = puck.x - p1.x;
        const dy1 = puck.y - p1.y;
        const dist1 = Math.hypot(dx1, dy1);
        const minDist1 = PADDLE_RADIUS + PUCK_RADIUS;

        if (dist1 < minDist1 && dist1 > 0.001) {
          const nx = dx1 / dist1;
          const ny = dy1 / dist1;

          // Penetration resolution
          puck.x = p1.x + nx * minDist1;
          puck.y = p1.y + ny * minDist1;

          // Kinematic Impulse Transfer
          const relVx = puck.vx - p1.vx * 0.05;
          const relVy = puck.vy - p1.vy * 0.05;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel < 0) {
            const impulse = -(1 + RESTITUTION_MALLET) * normalVel;
            puck.vx += impulse * nx + (p1.vx * 0.04);
            puck.vy += impulse * ny + (p1.vy * 0.04);

            emitSparks(puck.x, puck.y, "#00ffcc", 14);
            soundSynth.playSnare();
          }
        }

        // B. Circle-to-Circle Elastic Collision with P2 Mallet
        const dx2 = puck.x - p2.x;
        const dy2 = puck.y - p2.y;
        const dist2 = Math.hypot(dx2, dy2);
        const minDist2 = PADDLE_RADIUS + PUCK_RADIUS;

        if (dist2 < minDist2 && dist2 > 0.001) {
          const nx = dx2 / dist2;
          const ny = dy2 / dist2;

          puck.x = p2.x + nx * minDist2;
          puck.y = p2.y + ny * minDist2;

          const relVx = puck.vx - p2.vx * 0.05;
          const relVy = puck.vy - p2.vy * 0.05;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel < 0) {
            const impulse = -(1 + RESTITUTION_MALLET) * normalVel;
            puck.vx += impulse * nx + (p2.vx * 0.04);
            puck.vy += impulse * ny + (p2.vy * 0.04);

            emitSparks(puck.x, puck.y, "#ff0055", 14);
            soundSynth.playSnare();
          }
        }

        // C. Left and Right Rail Specular Reflections
        if (puck.x < PLAYABLE_MIN_X) {
          puck.x = PLAYABLE_MIN_X;
          puck.vx = -puck.vx * RESTITUTION_RAIL;
          emitSparks(puck.x, puck.y, "#38bdf8", 6);
          soundSynth.playSubtlePop();
        } else if (puck.x > PLAYABLE_MAX_X) {
          puck.x = PLAYABLE_MAX_X;
          puck.vx = -puck.vx * RESTITUTION_RAIL;
          emitSparks(puck.x, puck.y, "#38bdf8", 6);
          soundSynth.playSubtlePop();
        }

        // D. Top & Bottom Goal Post Reflections (Outside Goal Pocket)
        const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
        const goalRight = goalLeft + GOAL_WIDTH;
        const isWithinGoalX = puck.x >= goalLeft && puck.x <= goalRight;

        // Top Rails
        if (puck.y < WALL_THICKNESS + PUCK_RADIUS && !isWithinGoalX) {
          puck.y = WALL_THICKNESS + PUCK_RADIUS;
          puck.vy = -puck.vy * RESTITUTION_RAIL;
          emitSparks(puck.x, puck.y, "#ff0055", 6);
          soundSynth.playSubtlePop();
        }
        // Bottom Rails
        else if (puck.y > HEIGHT - WALL_THICKNESS - PUCK_RADIUS && !isWithinGoalX) {
          puck.y = HEIGHT - WALL_THICKNESS - PUCK_RADIUS;
          puck.vy = -puck.vy * RESTITUTION_RAIL;
          emitSparks(puck.x, puck.y, "#00ffcc", 6);
          soundSynth.playSubtlePop();
        }
      }

      // Clamp Puck Speed
      const puckSpeed = Math.hypot(puck.vx, puck.vy);
      if (puckSpeed > MAX_PUCK_SPEED) {
        puck.vx = (puck.vx / puckSpeed) * MAX_PUCK_SPEED;
        puck.vy = (puck.vy / puckSpeed) * MAX_PUCK_SPEED;
      }

      // ── 4. Goal Detection ──
      const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
      const goalRight = goalLeft + GOAL_WIDTH;

      if (puck.y < 4 && puck.x >= goalLeft && puck.x <= goalRight) {
        // P1 Scored (Bottom player scored in top goal)
        soundSynth.playFanfare();
        emitSparks(WIDTH / 2, 20, "#00ffcc", 30);
        setP1Score((s) => {
          const next = s + 1;
          if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, next, p2Score);
          return next;
        });
        resetPuck(false);
      } else if (puck.y > HEIGHT - 4 && puck.x >= goalLeft && puck.x <= goalRight) {
        // P2 Scored (Top player scored in bottom goal)
        soundSynth.playAirhorn();
        emitSparks(WIDTH / 2, HEIGHT - 20, "#ff0055", 30);
        setP2Score((s) => {
          const next = s + 1;
          if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, p1Score, next);
          return next;
        });
        resetPuck(true);
      }

      // Out of bounds failsafe
      if (puck.x < -20 || puck.x > WIDTH + 20 || puck.y < -40 || puck.y > HEIGHT + 40) {
        resetPuck(true);
      }

      // ── 5. USAA 7-Second Possession Clock Tracker ──
      const now = Date.now();
      if (now - lastPossessionCheckRef.current > 1000) {
        lastPossessionCheckRef.current = now;
        const currentSide = puck.y > HEIGHT / 2 ? "P1" : "P2";

        setPossessionSide((prev) => {
          if (prev === currentSide) {
            setPossessionTimer((t) => {
              if (t <= 1) {
                triggerFoul(`⚠️ USAA 7-SEC VIOLATION! ${currentSide} failed to advance puck!`);
                return POSSESSION_LIMIT_SEC;
              }
              return t - 1;
            });
          } else {
            setPossessionTimer(POSSESSION_LIMIT_SEC);
          }
          return currentSide;
        });
      }

      // ── 6. Update Particle Trail & Sparks ──
      puckTrailRef.current.unshift({ x: puck.x, y: puck.y, alpha: 0.6 });
      if (puckTrailRef.current.length > 10) puckTrailRef.current.pop();
      puckTrailRef.current.forEach((pt) => (pt.alpha *= 0.85));

      // ── 7. Render Photorealistic Neon Cyberpunk Rink ──
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // A. Rink Background Surface
      const rinkGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      rinkGrad.addColorStop(0, "#030712");
      rinkGrad.addColorStop(0.5, "#0b0f19");
      rinkGrad.addColorStop(1, "#030712");
      ctx.fillStyle = rinkGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // B. Neon Boundary Rails
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = WALL_THICKNESS;
      ctx.strokeRect(WALL_THICKNESS / 2, WALL_THICKNESS / 2, WIDTH - WALL_THICKNESS, HEIGHT - WALL_THICKNESS);

      // C. Strict Centerline Barrier & Center Circle
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(WALL_THICKNESS, HEIGHT / 2);
      ctx.lineTo(WIDTH - WALL_THICKNESS, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 48, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // D. Goal Creases (Top Magenta, Bottom Cyan)
      ctx.fillStyle = "rgba(255, 0, 85, 0.35)";
      ctx.fillRect(goalLeft, 0, GOAL_WIDTH, WALL_THICKNESS + 4);
      ctx.fillStyle = "rgba(0, 255, 204, 0.35)";
      ctx.fillRect(goalLeft, HEIGHT - WALL_THICKNESS - 4, GOAL_WIDTH, WALL_THICKNESS + 4);

      // Goal Nets Neon Lines
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 0, GOAL_WIDTH / 2, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = "#00ffcc";
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT, GOAL_WIDTH / 2, Math.PI, Math.PI * 2);
      ctx.stroke();

      // E. Puck Speed Trail Glow
      puckTrailRef.current.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PUCK_RADIUS * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${pt.alpha})`;
        ctx.fill();
      });

      // F. Sparks Particles
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // G. 3D Neon Floating Puck
      ctx.save();
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, PUCK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // H. P1 Mallet (Cyan Heavy Striker)
      ctx.save();
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, PADDLE_RADIUS, 0, Math.PI * 2);
      const p1Grad = ctx.createRadialGradient(p1.x - 4, p1.y - 4, 3, p1.x, p1.y, PADDLE_RADIUS);
      p1Grad.addColorStop(0, "#ffffff");
      p1Grad.addColorStop(0.3, "#00ffcc");
      p1Grad.addColorStop(1, "#047857");
      ctx.fillStyle = p1Grad;
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // I. P2 Mallet (Magenta Heavy Striker)
      ctx.save();
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, PADDLE_RADIUS, 0, Math.PI * 2);
      const p2Grad = ctx.createRadialGradient(p2.x - 4, p2.y - 4, 3, p2.x, p2.y, PADDLE_RADIUS);
      p2Grad.addColorStop(0, "#ffffff");
      p2Grad.addColorStop(0.3, "#ff0055");
      p2Grad.addColorStop(1, "#881337");
      ctx.fillStyle = p2Grad;
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aiDifficulty, currentUid, emitSparks, isHost, isVsBot, p2Score, p1Score, resetPuck, triggerFoul]);

  // Pointer Movement Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let mappedX = x;
    let mappedY = y;
    if (!isHost && !isVsBot) {
      mappedX = WIDTH - x;
      mappedY = HEIGHT - y;
      p2TargetRef.current.x = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(WIDTH - WALL_THICKNESS - PADDLE_RADIUS, mappedX));
      p2TargetRef.current.y = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(HEIGHT / 2 - PADDLE_RADIUS - 4, mappedY));
    } else {
      p1TargetRef.current.x = Math.max(WALL_THICKNESS + PADDLE_RADIUS, Math.min(WIDTH - WALL_THICKNESS - PADDLE_RADIUS, mappedX));
      p1TargetRef.current.y = Math.max(HEIGHT / 2 + PADDLE_RADIUS + 4, Math.min(HEIGHT - WALL_THICKNESS - PADDLE_RADIUS, mappedY));
    }
  };

  const playersList = Object.values(match.players || {});
  const isMatchOver = p1Score >= targetScore || p2Score >= targetScore || match.status === "FINISHED";
  const winnerUid = p1Score >= targetScore ? Object.keys(match.players || {})[0] : Object.keys(match.players || {})[1];

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-cyan-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(6,182,212,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.5)] text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                GLOW HOCKEY CLASH
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold rounded">
                USAA STANDARD
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Target: <span className="text-white font-bold">{targetScore} PTS</span> • First to reach {targetScore} wins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="glow_hockey" />

      {/* ── Foul Violation Alert Banner ── */}
      {foulAlert && (
        <div className="border-2 border-red-500 bg-red-950/90 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-bounce text-xs font-bold text-red-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-400 animate-pulse" />
            <span>{foulAlert}</span>
          </div>
        </div>
      )}

      {/* ── USAA 7-Sec Shot Clock & AI Difficulty Bar ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* 7-Second Possession Clock */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-2">
            <Timer className={`w-4 h-4 ${possessionTimer <= 2 ? "text-red-400 animate-spin" : "text-cyan-400"}`} />
            <span className="text-[10px] text-neutral-400 font-bold uppercase">7-SEC CLOCK:</span>
          </div>
          <span className={`text-sm font-black font-mono ${possessionTimer <= 2 ? "text-red-400 animate-pulse" : "text-white"}`}>
            {possessionTimer}S ({possessionSide})
          </span>
        </div>

        {/* AI Difficulty Selector */}
        {isVsBot ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">AI BOT:</span>
            <div className="flex items-center gap-1">
              {(["AMATEUR", "SEMI_PRO", "USAA_PRO"] as AIDifficulty[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAiDifficulty(mode);
                    soundSynth.playSubtlePop();
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer border ${
                    aiDifficulty === mode
                      ? "bg-cyan-400 text-black border-cyan-300"
                      : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                  }`}
                >
                  {mode === "AMATEUR" ? "EASY" : mode === "SEMI_PRO" ? "MID" : "PRO"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">MODE:</span>
            <span className="text-xs font-black text-cyan-300">PVP LIVE DUEL</span>
          </div>
        )}
      </div>

      {/* ── Scoreboard HUD ── */}
      <div className="grid grid-cols-2 gap-3 text-center">
        {/* P2 (Top - Magenta) */}
        <div className="bg-gradient-to-br from-pink-950/40 via-neutral-950 to-black p-3 rounded-xl border border-pink-500/40 shadow-md flex items-center justify-between px-4">
          <div className="text-left">
            <span className="text-[10px] text-pink-400 font-bold uppercase block">
              🔴 {match.players[Object.keys(match.players || {})[1]]?.handle || (isVsBot ? "AI BOT" : "PLAYER 2")}
            </span>
            <span className="text-[9px] text-neutral-500">TOP DEFENSE CREASE</span>
          </div>
          <span className="text-2xl font-black text-pink-400 font-mono drop-shadow-[0_0_10px_#ff0055]">{p2Score}</span>
        </div>

        {/* P1 (Bottom - Cyan) */}
        <div className="bg-gradient-to-br from-cyan-950/40 via-neutral-950 to-black p-3 rounded-xl border border-cyan-500/40 shadow-md flex items-center justify-between px-4">
          <div className="text-left">
            <span className="text-[10px] text-cyan-400 font-bold uppercase block">
              🔵 {match.players[Object.keys(match.players || {})[0]]?.handle || "YOU (P1)"}
            </span>
            <span className="text-[9px] text-neutral-500">BOTTOM DEFENSE CREASE</span>
          </div>
          <span className="text-2xl font-black text-cyan-400 font-mono drop-shadow-[0_0_10px_#00ffcc]">{p1Score}</span>
        </div>
      </div>

      {/* ── 3D Neon Air Hockey Table Canvas ── */}
      <div className="relative aspect-[340/480] max-w-[340px] mx-auto p-1.5 rounded-2xl bg-gradient-to-b from-[#020617] via-[#0b0f19] to-[#020617] border-4 border-cyan-900 shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_15px_rgba(6,182,212,0.3)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={handlePointerMove}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── Controls Helper HUD ── */}
      <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 font-mono space-y-1">
        <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-[11px] uppercase">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>SLIDE FINGER / MOUSE INSIDE YOUR HALF TO SMASH PUCK!</span>
        </div>
        <p className="text-[9px] text-neutral-500">
          Strict Centerline Rule: Mallet cannot cross red divider line. Shoot using Straight Bullets &amp; Bank Slices!
        </p>
      </div>

      {/* ── USAA Tactical Masteries Guide ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProTips(!showProTips)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-cyan-400" />
            🏆 USAA PRO MASTERIES (SHOTS, CCD PHYSICS &amp; DEFENSE)
          </span>
          {showProTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProTips && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-cyan-400 font-bold block mb-0.5">1. 🚀 STRAIGHT BULLET DRIVE (0°):</span>
              Direct linear snap through puck center. Delivers max velocity (&gt; 30 mph) to blast past resting goalies.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-cyan-400 font-bold block mb-0.5">2. 📐 ONE-RAIL BANK (30°–45° SLICE):</span>
              Slices puck into side rail to alter attack angle and exploit unguarded goal posts.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-cyan-400 font-bold block mb-0.5">3. 💎 DOUBLE-RAIL DIAMOND WRAP:</span>
              Drives puck into side rail ➔ opposite side rail ➔ goal pocket for multi-angle misdirection.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-cyan-400 font-bold block mb-0.5">4. 🛡️ TRIANGLE CREASE GUARD:</span>
              Anchor your mallet in a short arc 5–10 cm in front of your goal slot to cut down all shooting angles.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-cyan-400 font-bold block mb-0.5">5. ⏱️ 7-SECOND POSSESSION &amp; TOPPING FOUL:</span>
              Must advance puck over centerline within 7 seconds. Clamping puck from above is an illegal foul!
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {isMatchOver && (
        <div className="border-2 border-cyan-400 bg-gradient-to-b from-cyan-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-cyan-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#06b6d4]" />
          <h2 className="text-xl font-black text-cyan-300 uppercase tracking-widest">
            🏆 GLOW HOCKEY CHAMPION!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {winnerUid === currentUid
              ? `VICTORY! You dominated the neon rink with ${targetScore} points and earned +${match.stakes * 2} Aura!`
              : `Match concluded! Final Score: ${p1Score} - ${p2Score}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
