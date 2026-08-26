"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateGlowHockeyScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
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
  Volume2,
  CircleDot,
} from "lucide-react";

interface GlowHockeyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
  onRematch?: () => void;
}

const WIDTH = 340;
const HEIGHT = 480;
const BASE_PADDLE_RADIUS = 24;
const PUCK_RADIUS = 14;
const GOAL_WIDTH = 136;
const WALL_THICKNESS = 18;
const PLAYABLE_MIN_X = WALL_THICKNESS + PUCK_RADIUS;
const PLAYABLE_MAX_X = WIDTH - WALL_THICKNESS - PUCK_RADIUS;

// USAA & World-Class Physics Constants
const RESTITUTION_RAIL = 0.92;
const RESTITUTION_MALLET = 0.96;
const DRAG_FACTOR = 0.995; // Aerostatic suspension drag (smooth low friction glide)
const MAX_PUCK_SPEED = 28;
const POSSESSION_LIMIT_SEC = 7;

export type AIDifficulty = "AMATEUR" | "SEMI_PRO" | "USAA_PRO" | "IMPOSSIBLE_TAS";
export type PowerUpType = "NONE" | "MULTI_PUCK" | "TITAN_SHIELD" | "HYPER_BOOST";

interface PuckEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isAuxiliary?: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

// Procedural Web Audio FM Impact Synthesizer
function playProceduralHit(audioCtx: AudioContext | null, impactSpeed: number) {
  if (!audioCtx) return;
  try {
    const normVel = Math.min(impactSpeed / 22, 1.0);
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const baseFreq = 200 + normVel * 750;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gain.gain.setValueAtTime(normVel * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(Math.round(10 + normVel * 25));
    }
  } catch (_) {}
}

export default function GlowHockeyGame({ match, currentUid, isHost, onRematch }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("SEMI_PRO");
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType>("NONE");
  const [powerUpTimer, setPowerUpTimer] = useState<number>(0);
  const [targetScore, setTargetScore] = useState<number>(7);
  const [possessionTimer, setPossessionTimer] = useState<number>(POSSESSION_LIMIT_SEC);
  const [possessionSide, setPossessionSide] = useState<"P1" | "P2" | "NEUTRAL">("NEUTRAL");
  const [foulAlert, setFoulAlert] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState(gh?.p2Score || 0);
  const isVsBot = match.mode === "VS_COMPUTER";

  // Physics Entities Refs
  const pucksRef = useRef<PuckEntity[]>([
    {
      id: "main_puck",
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: 6,
      radius: PUCK_RADIUS,
      trail: [],
    },
  ]);

  const p1PaddleRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT - 75,
    prevX: WIDTH / 2,
    prevY: HEIGHT - 75,
    vx: 0,
    vy: 0,
    radius: BASE_PADDLE_RADIUS,
  });

  const p2PaddleRef = useRef({
    x: WIDTH / 2,
    y: 75,
    prevX: WIDTH / 2,
    prevY: 75,
    vx: 0,
    vy: 0,
    radius: BASE_PADDLE_RADIUS,
  });

  const p1TargetRef = useRef({ x: WIDTH / 2, y: HEIGHT - 75 });
  const p2TargetRef = useRef({ x: WIDTH / 2, y: 75 });
  const sparksRef = useRef<Spark[]>([]);
  const lastPossessionCheckRef = useRef<number>(Date.now());
  const matchRef = useRef(match);
  matchRef.current = match;

  // Initialize Web Audio Context
  useEffect(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    } catch (_) {}
  }, []);

  const emitSparks = useCallback((x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
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

  // Trigger Power-Up Event
  const activatePowerUp = useCallback((type: PowerUpType) => {
    setActivePowerUp(type);
    setPowerUpTimer(6);
    soundSynth.playFanfare();

    if (type === "MULTI_PUCK") {
      const main = pucksRef.current[0];
      if (main) {
        const speed = Math.hypot(main.vx, main.vy) || 8;
        const angle1 = Math.PI / 6; // +30 deg
        const angle2 = -Math.PI / 6; // -30 deg

        const daughter1: PuckEntity = {
          id: `puck_d1_${Date.now()}`,
          x: main.x,
          y: main.y,
          vx: main.vx * Math.cos(angle1) - main.vy * Math.sin(angle1),
          vy: main.vx * Math.sin(angle1) + main.vy * Math.cos(angle1),
          radius: PUCK_RADIUS,
          isAuxiliary: true,
          trail: [],
        };
        const daughter2: PuckEntity = {
          id: `puck_d2_${Date.now()}`,
          x: main.x,
          y: main.y,
          vx: main.vx * Math.cos(angle2) - main.vy * Math.sin(angle2),
          vy: main.vx * Math.sin(angle2) + main.vy * Math.cos(angle2),
          radius: PUCK_RADIUS,
          isAuxiliary: true,
          trail: [],
        };
        pucksRef.current = [main, daughter1, daughter2];
      }
    } else if (type === "TITAN_SHIELD") {
      p1PaddleRef.current.radius = BASE_PADDLE_RADIUS * 1.6;
    } else if (type === "HYPER_BOOST") {
      const main = pucksRef.current[0];
      if (main) {
        main.vx *= 1.8;
        main.vy *= 1.8;
      }
    }
  }, []);

  // Reset Puck & Despawn Auxiliaries
  const resetPucks = useCallback((scoredOnP1: boolean) => {
    pucksRef.current = [
      {
        id: "main_puck",
        x: WIDTH / 2,
        y: scoredOnP1 ? HEIGHT / 2 + 60 : HEIGHT / 2 - 60,
        vx: (Math.random() - 0.5) * 6,
        vy: scoredOnP1 ? 7 : -7,
        radius: PUCK_RADIUS,
        trail: [],
      },
    ];

    p1PaddleRef.current.x = WIDTH / 2;
    p1PaddleRef.current.y = HEIGHT - 75;
    p1PaddleRef.current.radius = BASE_PADDLE_RADIUS;
    p1TargetRef.current = { x: WIDTH / 2, y: HEIGHT - 75 };

    p2PaddleRef.current.x = WIDTH / 2;
    p2PaddleRef.current.y = 75;
    p2PaddleRef.current.radius = BASE_PADDLE_RADIUS;
    p2TargetRef.current = { x: WIDTH / 2, y: 75 };

    setActivePowerUp("NONE");
    setPowerUpTimer(0);
    setPossessionTimer(POSSESSION_LIMIT_SEC);
    setPossessionSide(scoredOnP1 ? "P1" : "P2");
  }, []);

  // Power-Up Countdown Timer
  useEffect(() => {
    if (powerUpTimer <= 0) {
      if (activePowerUp === "TITAN_SHIELD") p1PaddleRef.current.radius = BASE_PADDLE_RADIUS;
      setActivePowerUp("NONE");
      return;
    }
    const timer = setInterval(() => {
      setPowerUpTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [powerUpTimer, activePowerUp]);

  // Main 60FPS CCD Physics & Monochrome Render Loop
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

      const p1 = p1PaddleRef.current;
      const p2 = p2PaddleRef.current;

      // ── 1. Update Player 1 Paddle (White Striker) with 1:1 Zero-Lag Tracking ──
      p1.prevX = p1.x;
      p1.prevY = p1.y;
      const targetP1 = p1TargetRef.current;

      const clampedP1X = Math.max(WALL_THICKNESS + p1.radius, Math.min(WIDTH - WALL_THICKNESS - p1.radius, targetP1.x));
      const clampedP1Y = Math.max(HEIGHT / 2 + p1.radius + 4, Math.min(HEIGHT - WALL_THICKNESS - p1.radius, targetP1.y));

      p1.x = clampedP1X;
      p1.y = clampedP1Y;
      p1.vx = (p1.x - p1.prevX);
      p1.vy = (p1.y - p1.prevY);

      // ── 2. Predictive AI Bot Trajectory Raycasting & Parabolic Crease Arc ──
      p2.prevX = p2.x;
      p2.prevY = p2.y;

      if (isVsBot) {
        const primaryPuck = pucksRef.current[0];
        let aiFollowSpeed = 0.35;
        let predictionDepth = 1;

        if (aiDifficulty === "AMATEUR") {
          aiFollowSpeed = 0.18;
          predictionDepth = 0;
        } else if (aiDifficulty === "USAA_PRO") {
          aiFollowSpeed = 0.65;
          predictionDepth = 2;
        } else if (aiDifficulty === "IMPOSSIBLE_TAS") {
          aiFollowSpeed = 0.95;
          predictionDepth = 4;
        }

        let aiTargetX = WIDTH / 2;
        let aiTargetY = 75;

        if (primaryPuck) {
          // A. Predictive Modular Table Folding Raycasting
          if (primaryPuck.vy < 0 && predictionDepth > 0) {
            const defY = 75;
            const tPlane = Math.max(0.01, (defY - primaryPuck.y) / primaryPuck.vy);
            const xVirtual = primaryPuck.x + primaryPuck.vx * tPlane;
            const wEffective = WIDTH - 2 * PUCK_RADIUS - 2 * WALL_THICKNESS;
            const m = (xVirtual - (WALL_THICKNESS + PUCK_RADIUS)) / wEffective;
            const n = Math.floor(m);
            const frac = m - n;

            let predictedX = n % 2 === 0
              ? WALL_THICKNESS + PUCK_RADIUS + frac * wEffective
              : WIDTH - WALL_THICKNESS - PUCK_RADIUS - frac * wEffective;

            aiTargetX = Math.max(WALL_THICKNESS + p2.radius, Math.min(WIDTH - WALL_THICKNESS - p2.radius, predictedX));
          } else {
            aiTargetX = primaryPuck.x;
          }

          // B. Parabolic Defensive Crease Arc Equation
          const hCrease = 28;
          const xOffset = (aiTargetX - WIDTH / 2) / (GOAL_WIDTH / 2 + 10);
          const arcOffset = hCrease * (1 - Math.min(1, xOffset * xOffset));

          if (primaryPuck.y < HEIGHT / 2 - 20 && primaryPuck.vy >= 0) {
            aiTargetY = Math.min(HEIGHT / 2 - p2.radius - 6, Math.max(WALL_THICKNESS + p2.radius + 10, primaryPuck.y - 12));
          } else {
            aiTargetY = 55 + arcOffset;
          }
        }

        const clampedP2X = Math.max(WALL_THICKNESS + p2.radius, Math.min(WIDTH - WALL_THICKNESS - p2.radius, aiTargetX));
        const clampedP2Y = Math.max(WALL_THICKNESS + p2.radius, Math.min(HEIGHT / 2 - p2.radius - 4, aiTargetY));

        p2.x += (clampedP2X - p2.x) * aiFollowSpeed;
        p2.y += (clampedP2Y - p2.y) * aiFollowSpeed;
        p2.vx = (p2.x - p2.prevX);
        p2.vy = (p2.y - p2.prevY);
      } else {
        const targetP2 = p2TargetRef.current;
        const clampedP2X = Math.max(WALL_THICKNESS + p2.radius, Math.min(WIDTH - WALL_THICKNESS - p2.radius, targetP2.x));
        const clampedP2Y = Math.max(WALL_THICKNESS + p2.radius, Math.min(HEIGHT / 2 - p2.radius - 4, targetP2.y));

        p2.x = clampedP2X;
        p2.y = clampedP2Y;
        p2.vx = (p2.x - p2.prevX);
        p2.vy = (p2.y - p2.prevY);
      }

      // ── 3. High-Accuracy Continuous Collision Detection (CCD) Sub-Stepping ──
      const subSteps = 6;
      const speedScale = dt * 60;

      for (let s = 0; s < subSteps; s++) {
        pucksRef.current.forEach((puck) => {
          puck.x += (puck.vx * speedScale) / subSteps;
          puck.y += (puck.vy * speedScale) / subSteps;

          puck.vx *= Math.pow(DRAG_FACTOR, 1 / subSteps);
          puck.vy *= Math.pow(DRAG_FACTOR, 1 / subSteps);

          // A. Circle-to-Circle Elastic Collision with P1 Mallet (White Striker)
          const dx1 = puck.x - p1.x;
          const dy1 = puck.y - p1.y;
          const dist1 = Math.hypot(dx1, dy1);
          const minDist1 = p1.radius + puck.radius;

          if (dist1 < minDist1 && dist1 > 0.001) {
            const nx = dx1 / dist1;
            const ny = dy1 / dist1;

            puck.x = p1.x + nx * minDist1;
            puck.y = p1.y + ny * minDist1;

            const relVx = puck.vx - p1.vx;
            const relVy = puck.vy - p1.vy;
            const normalVel = relVx * nx + relVy * ny;

            if (normalVel < 0) {
              const impulse = -(1 + RESTITUTION_MALLET) * normalVel;
              puck.vx += impulse * nx + p1.vx * 0.8;
              puck.vy += impulse * ny + p1.vy * 0.8;

              const hitSpeed = Math.hypot(puck.vx, puck.vy);
              playProceduralHit(audioCtxRef.current, hitSpeed);
              emitSparks(puck.x, puck.y, "#ffffff", 20);

              if (hitSpeed > 16) {
                setScreenShake(6);
                setTimeout(() => setScreenShake(0), 120);
              }
            }
          }

          // B. Circle-to-Circle Elastic Collision with P2 Mallet (Black Striker)
          const dx2 = puck.x - p2.x;
          const dy2 = puck.y - p2.y;
          const dist2 = Math.hypot(dx2, dy2);
          const minDist2 = p2.radius + puck.radius;

          if (dist2 < minDist2 && dist2 > 0.001) {
            const nx = dx2 / dist2;
            const ny = dy2 / dist2;

            puck.x = p2.x + nx * minDist2;
            puck.y = p2.y + ny * minDist2;

            const relVx = puck.vx - p2.vx;
            const relVy = puck.vy - p2.vy;
            const normalVel = relVx * nx + relVy * ny;

            if (normalVel < 0) {
              const impulse = -(1 + RESTITUTION_MALLET) * normalVel;
              puck.vx += impulse * nx + p2.vx * 0.8;
              puck.vy += impulse * ny + p2.vy * 0.8;

              const hitSpeed = Math.hypot(puck.vx, puck.vy);
              playProceduralHit(audioCtxRef.current, hitSpeed);
              emitSparks(puck.x, puck.y, "#a1a1aa", 20);

              if (hitSpeed > 16) {
                setScreenShake(6);
                setTimeout(() => setScreenShake(0), 120);
              }
            }
          }

          // C. Left and Right Rail Specular Reflections (Pure White Impact)
          if (puck.x < PLAYABLE_MIN_X) {
            puck.x = PLAYABLE_MIN_X;
            puck.vx = -puck.vx * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, "#ffffff", 8);
            soundSynth.playSubtlePop();
          } else if (puck.x > PLAYABLE_MAX_X) {
            puck.x = PLAYABLE_MAX_X;
            puck.vx = -puck.vx * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, "#ffffff", 8);
            soundSynth.playSubtlePop();
          }

          // D. Top & Bottom Goal Post Reflections
          const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
          const goalRight = goalLeft + GOAL_WIDTH;
          const isWithinGoalX = puck.x >= goalLeft && puck.x <= goalRight;

          if (puck.y < WALL_THICKNESS + puck.radius && !isWithinGoalX) {
            puck.y = WALL_THICKNESS + puck.radius;
            puck.vy = -puck.vy * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, "#e4e4e7", 8);
            soundSynth.playSubtlePop();
          } else if (puck.y > HEIGHT - WALL_THICKNESS - puck.radius && !isWithinGoalX) {
            puck.y = HEIGHT - WALL_THICKNESS - puck.radius;
            puck.vy = -puck.vy * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, "#ffffff", 8);
            soundSynth.playSubtlePop();
          }

          // Clamp Max Speed
          const curSpeed = Math.hypot(puck.vx, puck.vy);
          if (curSpeed > MAX_PUCK_SPEED) {
            puck.vx = (puck.vx / curSpeed) * MAX_PUCK_SPEED;
            puck.vy = (puck.vy / curSpeed) * MAX_PUCK_SPEED;
          }
        });
      }

      // ── 4. Goal Detection Across All Pucks ──
      const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
      const goalRight = goalLeft + GOAL_WIDTH;
      let goalScored = false;

      pucksRef.current.forEach((puck) => {
        if (goalScored) return;

        if (puck.y < 4 && puck.x >= goalLeft && puck.x <= goalRight) {
          goalScored = true;
          soundSynth.playFanfare();
          emitSparks(WIDTH / 2, 20, "#ffffff", 40);
          setP1Score((s) => {
            const next = s + 1;
            if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, next, p2Score);
            return next;
          });
          resetPucks(false);
        } else if (puck.y > HEIGHT - 4 && puck.x >= goalLeft && puck.x <= goalRight) {
          goalScored = true;
          soundSynth.playAirhorn();
          emitSparks(WIDTH / 2, HEIGHT - 20, "#a1a1aa", 40);
          setP2Score((s) => {
            const next = s + 1;
            if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, p1Score, next);
            return next;
          });
          resetPucks(true);
        }
      });

      // ── 5. USAA 7-Second Possession Clock Tracker ──
      const now = Date.now();
      if (now - lastPossessionCheckRef.current > 1000) {
        lastPossessionCheckRef.current = now;
        const main = pucksRef.current[0];
        const currentSide = main && main.y > HEIGHT / 2 ? "P1" : "P2";

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

      // Update puck trails
      pucksRef.current.forEach((puck) => {
        puck.trail.unshift({ x: puck.x, y: puck.y, alpha: 0.75 });
        if (puck.trail.length > 10) puck.trail.pop();
        puck.trail.forEach((pt) => (pt.alpha *= 0.82));
      });

      // ── 6. Render High-Contrast White & Black (Monochrome Noir) Rink ──
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // A. Deep Obsidian / Noir Table Surface
      const rinkGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      rinkGrad.addColorStop(0, "#050505");
      rinkGrad.addColorStop(0.5, "#0d0d0d");
      rinkGrad.addColorStop(1, "#050505");
      ctx.fillStyle = rinkGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // B. Crisp White Boundary Rails with Chrome Accent
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = WALL_THICKNESS;
      ctx.strokeRect(WALL_THICKNESS / 2, WALL_THICKNESS / 2, WIDTH - WALL_THICKNESS, HEIGHT - WALL_THICKNESS);

      // Inner Platinum Bevel Inset Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, WIDTH - WALL_THICKNESS * 2, HEIGHT - WALL_THICKNESS * 2);

      // C. Strict Centerline Divider & Center Circle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(WALL_THICKNESS, HEIGHT / 2);
      ctx.lineTo(WIDTH - WALL_THICKNESS, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Circle with Inner Dot
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 48, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // D. Goal Creases (Top & Bottom High-Contrast Slots)
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(goalLeft, 0, GOAL_WIDTH, WALL_THICKNESS + 4);
      ctx.fillRect(goalLeft, HEIGHT - WALL_THICKNESS - 4, GOAL_WIDTH, WALL_THICKNESS + 4);

      // Goal Nets Chrome Lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 0, GOAL_WIDTH / 2, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT, GOAL_WIDTH / 2, Math.PI, Math.PI * 2);
      ctx.stroke();

      // E. Multi-Pass Additive Bloom Helper
      const drawBloomCircle = (x: number, y: number, radius: number, coreColor: string, glowColor: string) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Pass 1: Outer Atmosphere
        ctx.beginPath();
        ctx.arc(x, y, radius + 14, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.18;
        ctx.fill();

        // Pass 2: Mid Bloom
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.5;
        ctx.fill();

        // Pass 3: White-Hot Core
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 1.0;
        ctx.fill();

        ctx.restore();
      };

      // F. Render Puck Trails & Pucks (Brilliant White Glow)
      pucksRef.current.forEach((puck) => {
        puck.trail.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, puck.radius * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.6})`;
          ctx.fill();
        });

        // 3D Metallic Puck with Engraved Concentric Rings
        ctx.save();
        drawBloomCircle(puck.x, puck.y, puck.radius, "#ffffff", "rgba(255, 255, 255, 0.4)");
        
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // G. Render Sparks Particles (White & Platinum)
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
        ctx.fill();
      }

      // H. Render P1 Mallet (Bottom: Pure Ivory White & Chrome Striker)
      ctx.save();
      drawBloomCircle(p1.x, p1.y, p1.radius, "#ffffff", "rgba(255, 255, 255, 0.45)");

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "#e4e4e7";
      ctx.fill();
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#09090b";
      ctx.fill();
      ctx.restore();

      // I. Render P2 Mallet (Top: Polished Onyx Black & Platinum Rim)
      ctx.save();
      // Outer Platinum Rim
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#18181b";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner Shadow & Core
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "#09090b";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aiDifficulty, currentUid, emitSparks, isHost, isVsBot, p2Score, p1Score, resetPucks, triggerFoul]);

  // Pointer Movement Handlers with Pointer Capture
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
    updatePointerPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerPosition(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const updatePointerPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      p2TargetRef.current.x = Math.max(WALL_THICKNESS + p2PaddleRef.current.radius, Math.min(WIDTH - WALL_THICKNESS - p2PaddleRef.current.radius, mappedX));
      p2TargetRef.current.y = Math.max(WALL_THICKNESS + p2PaddleRef.current.radius, Math.min(HEIGHT / 2 - p2PaddleRef.current.radius - 4, mappedY));
    } else {
      p1TargetRef.current.x = Math.max(WALL_THICKNESS + p1PaddleRef.current.radius, Math.min(WIDTH - WALL_THICKNESS - p1PaddleRef.current.radius, mappedX));
      p1TargetRef.current.y = Math.max(HEIGHT / 2 + p1PaddleRef.current.radius + 4, Math.min(HEIGHT - WALL_THICKNESS - p1PaddleRef.current.radius, mappedY));
    }
  };

  const isMatchOver = p1Score >= targetScore || p2Score >= targetScore || match.status === "FINISHED";
  const winnerUid = p1Score >= targetScore ? Object.keys(match.players || {})[0] : Object.keys(match.players || {})[1];

  return (
    <div
      style={{
        transform: screenShake > 0 ? `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)` : "none",
        transition: "transform 0.05s ease-out",
      }}
      className="w-full max-w-xl mx-auto bg-black border-2 border-white/80 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(255,255,255,0.12)] rounded-2xl"
    >
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-white/20 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(255,255,255,0.5)] text-lg">
            ⚪
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-white tracking-wider">
                GLOW HOCKEY NOIR
              </span>
              <span className="px-1.5 py-0.2 bg-white text-black text-[9px] font-bold rounded">
                BLACK &amp; WHITE
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

      {/* ── Foul Alert Banner ── */}
      {foulAlert && (
        <div className="border-2 border-white bg-neutral-900 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_30px_rgba(255,255,255,0.4)] animate-bounce text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-white animate-pulse" />
            <span>{foulAlert}</span>
          </div>
        </div>
      )}

      {/* ── USAA 7-Sec Shot Clock & AI Difficulty Bar ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* 7-Second Possession Clock */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-2">
            <Timer className={`w-4 h-4 ${possessionTimer <= 2 ? "text-white animate-spin" : "text-neutral-400"}`} />
            <span className="text-[10px] text-neutral-400 font-bold uppercase">7-SEC CLOCK:</span>
          </div>
          <span className={`text-sm font-black font-mono ${possessionTimer <= 2 ? "text-white animate-pulse underline" : "text-white"}`}>
            {possessionTimer}S ({possessionSide})
          </span>
        </div>

        {/* AI Difficulty Selector */}
        {isVsBot ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">AI BOT:</span>
            <div className="flex items-center gap-1">
              {(["AMATEUR", "SEMI_PRO", "USAA_PRO", "IMPOSSIBLE_TAS"] as AIDifficulty[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAiDifficulty(mode);
                    soundSynth.playSubtlePop();
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer border ${
                    aiDifficulty === mode
                      ? "bg-white text-black border-white font-black"
                      : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                  }`}
                  title={mode === "IMPOSSIBLE_TAS" ? "0ms Instant Raycast Interception" : undefined}
                >
                  {mode === "AMATEUR" ? "EASY" : mode === "SEMI_PRO" ? "MID" : mode === "USAA_PRO" ? "PRO" : "TAS"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">MODE:</span>
            <span className="text-xs font-black text-white">PVP LIVE DUEL</span>
          </div>
        )}
      </div>

      {/* ── Dynamic Tactical Power-Ups Bar ── */}
      <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-neutral-400 font-bold uppercase text-[10px]">POWER-UP:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => activatePowerUp("MULTI_PUCK")}
            className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
              activePowerUp === "MULTI_PUCK"
                ? "bg-white text-black border-white shadow-md font-black"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            ⚪ MULTI-PUCK
          </button>
          <button
            type="button"
            onClick={() => activatePowerUp("TITAN_SHIELD")}
            className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
              activePowerUp === "TITAN_SHIELD"
                ? "bg-white text-black border-white shadow-md font-black"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            🛡️ TITAN
          </button>
          <button
            type="button"
            onClick={() => activatePowerUp("HYPER_BOOST")}
            className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
              activePowerUp === "HYPER_BOOST"
                ? "bg-white text-black border-white shadow-md font-black"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            ⚡ HYPER
          </button>
        </div>
      </div>

      {/* ── Monochrome Scoreboard HUD (Black vs White) ── */}
      <div className="grid grid-cols-2 gap-3 text-center">
        {/* P2 (Top - Onyx Black) */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-700 shadow-md flex items-center justify-between px-4">
          <div className="text-left">
            <span className="text-[10px] text-neutral-300 font-bold uppercase block">
              ⚫ {match.players[Object.keys(match.players || {})[1]]?.handle || (isVsBot ? "AI BOT" : "PLAYER 2")}
            </span>
            <span className="text-[9px] text-neutral-500">TOP DEFENSE (BLACK)</span>
          </div>
          <span className="text-2xl font-black text-neutral-200 font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{p2Score}</span>
        </div>

        {/* P1 (Bottom - Pure White) */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-white/60 shadow-md flex items-center justify-between px-4">
          <div className="text-left">
            <span className="text-[10px] text-white font-bold uppercase block">
              ⚪ {match.players[Object.keys(match.players || {})[0]]?.handle || "YOU (P1)"}
            </span>
            <span className="text-[9px] text-neutral-500">BOTTOM DEFENSE (WHITE)</span>
          </div>
          <span className="text-2xl font-black text-white font-mono drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]">{p1Score}</span>
        </div>
      </div>

      {/* ── 3D Monochrome Air Hockey Table Canvas ── */}
      <div className="relative aspect-[340/480] max-w-[340px] mx-auto p-1.5 rounded-2xl bg-black border-4 border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_15px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── USAA Tactical Masteries Guide ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProTips(!showProTips)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-white" />
            🏆 USAA PRO MASTERIES (NOIR EDITION • SHOTS &amp; RAYCASTING)
          </span>
          {showProTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProTips && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">1. 🤖 PREDICTIVE RAYCASTING &amp; PARABOLIC CREASE:</span>
              AI computes modular table-folding reflections and steps along a parabolic crease arc to cut down high-velocity shooting angles.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">2. 🚀 THE OVER-UNDER &amp; CUT SHOTS:</span>
              Over-Under: Feint right, strike far left bank. Cut Shot: 45°–60° acute side-rail slice past centerline.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">3. 🔊 PROCEDURAL FM AUDIO &amp; HAPTICS:</span>
              Kinetic tone oscillators scale frequency dynamically and trigger hardware vibration pulses with impact speed.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">4. ⚡ DYNAMIC POWER-UPS &amp; MITOSIS:</span>
              Multi-Puck (±30° Mitosis tri-puck replication), Titan Shield (+60% mallet defense radius), and Hyper-Boost overdrive.
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {isMatchOver && (
        <div className="border-2 border-white bg-gradient-to-b from-neutral-900 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(255,255,255,0.4)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-white mx-auto animate-bounce drop-shadow-[0_0_20px_#ffffff]" />
          <h2 className="text-xl font-black text-white uppercase tracking-widest">
            🏆 GLOW HOCKEY NOIR CHAMPION!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {winnerUid === currentUid
              ? `VICTORY! You dominated the table with ${targetScore} points and earned +${match.stakes * 2} Aura!`
              : `Match concluded! Final Score: ${p1Score} - ${p2Score}`}
          </p>
          {onRematch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRematch}
                className="px-6 py-2.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto rounded-xl shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>[ 🔄 PLAY REMATCH ]</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
