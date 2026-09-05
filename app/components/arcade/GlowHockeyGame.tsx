"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
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
  VolumeX,
  Play,
  Pause,
  Smartphone,
  Bot,
  Globe,
  Sliders,
  Award,
} from "lucide-react";

interface GlowHockeyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
  onRematch?: () => void;
}

// ── Rink & Entity Dimensions (Authentic 9:14.5 Air Hockey Canvas) ──
const WIDTH = 360;
const HEIGHT = 580;
const PADDLE_RADIUS = 26;
const PUCK_RADIUS = 15;
const GOAL_WIDTH = 138;
const WALL_THICKNESS = 16;
const CORNER_RADIUS = 30;

// High-Precision Physics Constants
const RESTITUTION_RAIL = 0.94;
const RESTITUTION_MALLET = 0.98;
const DRAG_FACTOR = 0.9982; // Aerostatic smooth low-friction air table glide
const MAX_PUCK_SPEED = 32;
const MIN_PUCK_SPEED = 0.3;
const SUB_STEPS = 8; // CCD sub-stepping to prevent any tunneling at 32px/frame

export type PlayMode = "SOLO_AI" | "LOCAL_2P" | "ONLINE_DUEL";
export type AIDifficulty = "AMATEUR" | "SEMI_PRO" | "USAA_PRO" | "CHAMPION_TAS";

// ── 4 Authentic Vibrant Neon Glow Themes ──
export interface GlowTheme {
  id: string;
  name: string;
  icon: string;
  p1Color: string;
  p1Glow: string;
  p1Core: string;
  p2Color: string;
  p2Glow: string;
  p2Core: string;
  puckColor: string;
  puckGlow: string;
  puckCore: string;
  railColor: string;
  railGlow: string;
  centerColor: string;
  tableBg: string;
  gridColor: string;
}

export const GLOW_THEMES: Record<string, GlowTheme> = {
  classic: {
    id: "classic",
    name: "NEON CLASSIC",
    icon: "🟢",
    p1Color: "#00ff66",
    p1Glow: "rgba(0, 255, 102, 0.9)",
    p1Core: "#e6fff2",
    p2Color: "#ff0055",
    p2Glow: "rgba(255, 0, 85, 0.9)",
    p2Core: "#ffe6ee",
    puckColor: "#ffe600",
    puckGlow: "rgba(255, 230, 0, 0.95)",
    puckCore: "#fffff0",
    railColor: "#00e5ff",
    railGlow: "rgba(0, 229, 255, 0.7)",
    centerColor: "rgba(0, 229, 255, 0.75)",
    tableBg: "#050a12",
    gridColor: "rgba(0, 229, 255, 0.08)",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "CYBER LASER",
    icon: "⚡",
    p1Color: "#00f2fe",
    p1Glow: "rgba(0, 242, 254, 0.95)",
    p1Core: "#e0faff",
    p2Color: "#ff007f",
    p2Glow: "rgba(255, 0, 127, 0.95)",
    p2Core: "#ffe0f0",
    puckColor: "#fffc00",
    puckGlow: "rgba(255, 252, 0, 0.95)",
    puckCore: "#ffffff",
    railColor: "#9d4edd",
    railGlow: "rgba(157, 78, 221, 0.7)",
    centerColor: "rgba(157, 78, 221, 0.8)",
    tableBg: "#080414",
    gridColor: "rgba(157, 78, 221, 0.09)",
  },
  ice_fire: {
    id: "ice_fire",
    name: "ICE & MAGMA",
    icon: "🔥",
    p1Color: "#00d4ff",
    p1Glow: "rgba(0, 212, 255, 0.95)",
    p1Core: "#e5f9ff",
    p2Color: "#ff4400",
    p2Glow: "rgba(255, 68, 0, 0.95)",
    p2Core: "#ffece5",
    puckColor: "#ffffff",
    puckGlow: "rgba(0, 212, 255, 0.9)",
    puckCore: "#ffffff",
    railColor: "#00d4ff",
    railGlow: "rgba(0, 212, 255, 0.65)",
    centerColor: "rgba(255, 100, 0, 0.75)",
    tableBg: "#04060d",
    gridColor: "rgba(0, 212, 255, 0.07)",
  },
  matrix: {
    id: "matrix",
    name: "MATRIX TOXIC",
    icon: "☣️",
    p1Color: "#39ff14",
    p1Glow: "rgba(57, 255, 20, 0.95)",
    p1Core: "#edffeb",
    p2Color: "#b026ff",
    p2Glow: "rgba(176, 38, 255, 0.95)",
    p2Core: "#f8ebff",
    puckColor: "#ccff00",
    puckGlow: "rgba(204, 255, 0, 0.95)",
    puckCore: "#ffffff",
    railColor: "#00e676",
    railGlow: "rgba(0, 230, 118, 0.65)",
    centerColor: "rgba(0, 230, 118, 0.75)",
    tableBg: "#020904",
    gridColor: "rgba(57, 255, 20, 0.08)",
  },
};

interface PuckEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number; color?: string }[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GoalWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

// ── Zero-Latency Web Audio Synthesizer ─────────────────────────────────────────
class AirHockeyAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) this.ctx = new AudioContextClass();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Crisp plastic strike impulse
  playPaddleClack(impactSpeed: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const norm = Math.min(impactSpeed / 24, 1.0);
      const now = ctx.currentTime;

      // 1. High transient plastic pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startFreq = 350 + norm * 850;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

      gain.gain.setValueAtTime(0.2 + norm * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);

      // 2. Hollow strike thump
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(160, now);
      osc2.frequency.exponentialRampToValueAtTime(45, now + 0.09);

      gain2.gain.setValueAtTime(0.3 + norm * 0.4, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.09);

      // Mobile haptics
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(Math.round(8 + norm * 20));
      }
    } catch (_) {}
  }

  // Rail rubber bounce
  playRailBounce(speed: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const norm = Math.min(speed / 20, 1.0);
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220 + norm * 260, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);

      gain.gain.setValueAtTime(0.15 + norm * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (_) {}
  }

  // Metallic goal post chime
  playPostClang() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([20, 40, 30]);
      }
    } catch (_) {}
  }

  // Euphoric goal celebration siren + sub boom
  playGoalSound() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. Sub boom
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
      subGain.gain.setValueAtTime(0.8, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.9);

      // 2. Rising fanfare triad
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.4, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 50, 60, 50, 100]);
      }
    } catch (_) {}
  }

  // Match victory fanfare
  playVictory() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    } catch (_) {}
  }
}

const audioEngine = new AirHockeyAudioEngine();

export default function GlowHockeyGame({ match, currentUid, isHost, onRematch }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const [themeKey, setThemeKey] = useState<string>("classic");
  const [playMode, setPlayMode] = useState<PlayMode>(match.mode === "VS_COMPUTER" ? "SOLO_AI" : "LOCAL_2P");
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("SEMI_PRO");
  const [targetScore, setTargetScore] = useState<number>(7);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Match Scores
  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState<number>(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState<number>(gh?.p2Score || 0);
  const [recentScorer, setRecentScorer] = useState<"P1" | "P2" | null>(null);
  const [screenShake, setScreenShake] = useState<number>(0);
  const [goalAnnouncement, setGoalAnnouncement] = useState<string | null>(null);
  const [serveCountdown, setServeCountdown] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTheme = GLOW_THEMES[themeKey] || GLOW_THEMES.classic;

  // ── Physics State References ──
  const puckRef = useRef<PuckEntity>({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 6.5,
    radius: PUCK_RADIUS,
    trail: [],
  });

  const p1PaddleRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT - 85,
    prevX: WIDTH / 2,
    prevY: HEIGHT - 85,
    vx: 0,
    vy: 0,
    radius: PADDLE_RADIUS,
  });

  const p2PaddleRef = useRef({
    x: WIDTH / 2,
    y: 85,
    prevX: WIDTH / 2,
    prevY: 85,
    vx: 0,
    vy: 0,
    radius: PADDLE_RADIUS,
  });

  const p1TargetRef = useRef({ x: WIDTH / 2, y: HEIGHT - 85 });
  const p2TargetRef = useRef({ x: WIDTH / 2, y: 85 });
  const sparksRef = useRef<Spark[]>([]);
  const wavesRef = useRef<GoalWave[]>([]);
  const activePointersRef = useRef<Map<number, "P1" | "P2">>(new Map());
  const lastIdleTimeRef = useRef<number>(Date.now());
  const matchRef = useRef(match);
  matchRef.current = match;

  // Sync Audio Setting
  useEffect(() => {
    audioEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  // Particle Sparks Generator
  const emitSparks = useCallback((x: number, y: number, color: string, count = 18, baseSpeed = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * baseSpeed + 2;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 0.4 + 0.15,
        color,
        size: Math.random() * 2.5 + 1.5,
      });
    }
  }, []);

  // Goal Wave Expansion
  const emitGoalWave = useCallback((x: number, y: number, color: string) => {
    wavesRef.current.push({
      x,
      y,
      radius: 10,
      maxRadius: 180,
      color,
      alpha: 0.9,
    });
  }, []);

  // Reset Puck for Serve
  const resetPuck = useCallback((scoredOnP1: boolean) => {
    setServeCountdown(1.2);
    puckRef.current.x = WIDTH / 2;
    puckRef.current.y = scoredOnP1 ? HEIGHT / 2 + 70 : HEIGHT / 2 - 70;
    puckRef.current.vx = (Math.random() - 0.5) * 4;
    puckRef.current.vy = scoredOnP1 ? 6.5 : -6.5;
    puckRef.current.trail = [];

    p1PaddleRef.current.x = WIDTH / 2;
    p1PaddleRef.current.y = HEIGHT - 85;
    p1TargetRef.current = { x: WIDTH / 2, y: HEIGHT - 85 };

    p2PaddleRef.current.x = WIDTH / 2;
    p2PaddleRef.current.y = 85;
    p2TargetRef.current = { x: WIDTH / 2, y: 85 };

    lastIdleTimeRef.current = Date.now();
  }, []);

  // ── 60FPS High-Precision Physics & Neon Render Loop ──
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
      const puck = puckRef.current;
      const theme = currentTheme;

      // Decrement serve countdown
      setServeCountdown((prev) => (prev > 0 ? Math.max(0, prev - dt) : 0));

      if (!isPaused) {
        // ── 1. Update Player 1 Paddle (Smooth Sub-Pixel Interpolation) ──
        p1.prevX = p1.x;
        p1.prevY = p1.y;

        const targetP1 = p1TargetRef.current;
        const clampedP1X = Math.max(
          WALL_THICKNESS + p1.radius,
          Math.min(WIDTH - WALL_THICKNESS - p1.radius, targetP1.x)
        );
        // P1 restricted to bottom half with cushion
        const clampedP1Y = Math.max(
          HEIGHT / 2 + p1.radius + 3,
          Math.min(HEIGHT - WALL_THICKNESS - p1.radius, targetP1.y)
        );

        p1.x = clampedP1X;
        p1.y = clampedP1Y;
        p1.vx = p1.x - p1.prevX;
        p1.vy = p1.y - p1.prevY;

        // ── 2. Update Player 2 Paddle (AI Bot OR 2-Player Local Multi-Touch) ──
        p2.prevX = p2.x;
        p2.prevY = p2.y;

        if (playMode === "SOLO_AI") {
          let aiSpeed = 0.38;
          let aiPredict = 1;
          let aiAggressionY = 0.5;

          if (aiDifficulty === "AMATEUR") {
            aiSpeed = 0.22;
            aiPredict = 0;
            aiAggressionY = 0.2;
          } else if (aiDifficulty === "SEMI_PRO") {
            aiSpeed = 0.42;
            aiPredict = 1;
            aiAggressionY = 0.6;
          } else if (aiDifficulty === "USAA_PRO") {
            aiSpeed = 0.68;
            aiPredict = 2;
            aiAggressionY = 0.85;
          } else if (aiDifficulty === "CHAMPION_TAS") {
            aiSpeed = 0.92;
            aiPredict = 3;
            aiAggressionY = 1.0;
          }

          let aiTargetX = WIDTH / 2;
          let aiTargetY = 80;

          // A. Predictive Wall-Folding Raycasting
          if (puck.vy < 0 && aiPredict > 0) {
            const defPlaneY = 85;
            const tPlane = Math.max(0.01, (defPlaneY - puck.y) / puck.vy);
            const xVirtual = puck.x + puck.vx * tPlane;
            const wEffective = WIDTH - 2 * PUCK_RADIUS - 2 * WALL_THICKNESS;
            const m = (xVirtual - (WALL_THICKNESS + PUCK_RADIUS)) / wEffective;
            const n = Math.floor(m);
            const frac = m - n;

            const predictedX =
              n % 2 === 0
                ? WALL_THICKNESS + PUCK_RADIUS + frac * wEffective
                : WIDTH - WALL_THICKNESS - PUCK_RADIUS - frac * wEffective;

            aiTargetX = Math.max(
              WALL_THICKNESS + p2.radius,
              Math.min(WIDTH - WALL_THICKNESS - p2.radius, predictedX)
            );
          } else {
            // Track puck X with defensive center gravitation
            aiTargetX = puck.x * 0.75 + (WIDTH / 2) * 0.25;
          }

          // B. Crease Arc Defense Equation
          const hCrease = 32;
          const xOffset = (aiTargetX - WIDTH / 2) / (GOAL_WIDTH / 2 + 8);
          const arcOffset = hCrease * (1 - Math.min(1, xOffset * xOffset));

          // Offensive strike when puck is loose in bot's half
          if (puck.y < HEIGHT / 2 - 15 && puck.vy >= -1) {
            const attackReach = WALL_THICKNESS + p2.radius + 15;
            aiTargetY = Math.min(
              HEIGHT / 2 - p2.radius - 5,
              Math.max(attackReach, puck.y - 10)
            );
            // Slice across puck to angle shots into player corners
            aiTargetX = puck.x + (puck.x > WIDTH / 2 ? -12 : 12);
          } else {
            aiTargetY = 60 + arcOffset * aiAggressionY;
          }

          const clampedP2X = Math.max(
            WALL_THICKNESS + p2.radius,
            Math.min(WIDTH - WALL_THICKNESS - p2.radius, aiTargetX)
          );
          const clampedP2Y = Math.max(
            WALL_THICKNESS + p2.radius,
            Math.min(HEIGHT / 2 - p2.radius - 4, aiTargetY)
          );

          p2.x += (clampedP2X - p2.x) * aiSpeed;
          p2.y += (clampedP2Y - p2.y) * aiSpeed;
          p2.vx = p2.x - p2.prevX;
          p2.vy = p2.y - p2.prevY;
        } else {
          // 2-Player Local Multi-Touch or Online Duel
          const targetP2 = p2TargetRef.current;
          const clampedP2X = Math.max(
            WALL_THICKNESS + p2.radius,
            Math.min(WIDTH - WALL_THICKNESS - p2.radius, targetP2.x)
          );
          const clampedP2Y = Math.max(
            WALL_THICKNESS + p2.radius,
            Math.min(HEIGHT / 2 - p2.radius - 4, targetP2.y)
          );

          p2.x = clampedP2X;
          p2.y = clampedP2Y;
          p2.vx = p2.x - p2.prevX;
          p2.vy = p2.y - p2.prevY;
        }

        // ── 3. Sub-Stepped Continuous Collision Detection (CCD) ──
        const speedScale = dt * 60;
        const subDt = speedScale / SUB_STEPS;

        for (let s = 0; s < SUB_STEPS; s++) {
          puck.x += (puck.vx * subDt);
          puck.y += (puck.vy * subDt);

          puck.vx *= Math.pow(DRAG_FACTOR, 1 / SUB_STEPS);
          puck.vy *= Math.pow(DRAG_FACTOR, 1 / SUB_STEPS);

          // ── A. Circle-to-Circle Elastic Collision: P1 Mallet (Bottom) ──
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
              // Mass ratio physics (Mallet mass = 3, Puck mass = 1)
              const impulse = -(1 + RESTITUTION_MALLET) * normalVel;
              puck.vx += impulse * nx + p1.vx * 0.85;
              puck.vy += impulse * ny + p1.vy * 0.85;

              const hitSpeed = Math.hypot(puck.vx, puck.vy);
              audioEngine.playPaddleClack(hitSpeed);
              emitSparks(puck.x, puck.y, theme.p1Color, Math.min(24, Math.round(hitSpeed * 1.2)), hitSpeed * 0.6);

              if (hitSpeed > 18) {
                setScreenShake(6);
                setTimeout(() => setScreenShake(0), 120);
              }
              lastIdleTimeRef.current = Date.now();
            }
          }

          // ── B. Circle-to-Circle Elastic Collision: P2 Mallet (Top) ──
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
              puck.vx += impulse * nx + p2.vx * 0.85;
              puck.vy += impulse * ny + p2.vy * 0.85;

              const hitSpeed = Math.hypot(puck.vx, puck.vy);
              audioEngine.playPaddleClack(hitSpeed);
              emitSparks(puck.x, puck.y, theme.p2Color, Math.min(24, Math.round(hitSpeed * 1.2)), hitSpeed * 0.6);

              if (hitSpeed > 18) {
                setScreenShake(6);
                setTimeout(() => setScreenShake(0), 120);
              }
              lastIdleTimeRef.current = Date.now();
            }
          }

          // ── C. Left and Right Table Side Rails ──
          const minPlayX = WALL_THICKNESS + puck.radius;
          const maxPlayX = WIDTH - WALL_THICKNESS - puck.radius;

          if (puck.x < minPlayX) {
            puck.x = minPlayX;
            puck.vx = -puck.vx * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, theme.railColor, 8);
            audioEngine.playRailBounce(Math.abs(puck.vx));
          } else if (puck.x > maxPlayX) {
            puck.x = maxPlayX;
            puck.vx = -puck.vx * RESTITUTION_RAIL;
            emitSparks(puck.x, puck.y, theme.railColor, 8);
            audioEngine.playRailBounce(Math.abs(puck.vx));
          }

          // ── D. Top & Bottom Rails with Realistic Goal Posts ──
          const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
          const goalRight = goalLeft + GOAL_WIDTH;
          const postRadius = 8;
          const isInGoalMouth = puck.x >= goalLeft + postRadius && puck.x <= goalRight - postRadius;

          // Top Rail & Goal Posts (P2 Side)
          if (puck.y < WALL_THICKNESS + puck.radius) {
            if (!isInGoalMouth) {
              puck.y = WALL_THICKNESS + puck.radius;
              puck.vy = -puck.vy * RESTITUTION_RAIL;
              emitSparks(puck.x, puck.y, theme.railColor, 8);
              audioEngine.playRailBounce(Math.abs(puck.vy));
            } else {
              // Check deflection against left goal post
              const dPostL = Math.hypot(puck.x - goalLeft, puck.y - WALL_THICKNESS);
              if (dPostL < puck.radius + postRadius) {
                const nx = (puck.x - goalLeft) / dPostL;
                const ny = (puck.y - WALL_THICKNESS) / dPostL;
                puck.vx = Math.abs(puck.vx) * 0.9 + nx * 4;
                puck.vy = Math.abs(puck.vy) * 0.95 + 4;
                audioEngine.playPostClang();
                emitSparks(goalLeft, WALL_THICKNESS, "#ffffff", 14);
              }
              // Check deflection against right goal post
              const dPostR = Math.hypot(puck.x - goalRight, puck.y - WALL_THICKNESS);
              if (dPostR < puck.radius + postRadius) {
                const nx = (puck.x - goalRight) / dPostR;
                const ny = (puck.y - WALL_THICKNESS) / dPostR;
                puck.vx = -Math.abs(puck.vx) * 0.9 + nx * 4;
                puck.vy = Math.abs(puck.vy) * 0.95 + 4;
                audioEngine.playPostClang();
                emitSparks(goalRight, WALL_THICKNESS, "#ffffff", 14);
              }
            }
          }

          // Bottom Rail & Goal Posts (P1 Side)
          if (puck.y > HEIGHT - WALL_THICKNESS - puck.radius) {
            if (!isInGoalMouth) {
              puck.y = HEIGHT - WALL_THICKNESS - puck.radius;
              puck.vy = -puck.vy * RESTITUTION_RAIL;
              emitSparks(puck.x, puck.y, theme.railColor, 8);
              audioEngine.playRailBounce(Math.abs(puck.vy));
            } else {
              const dPostL = Math.hypot(puck.x - goalLeft, puck.y - (HEIGHT - WALL_THICKNESS));
              if (dPostL < puck.radius + postRadius) {
                const nx = (puck.x - goalLeft) / dPostL;
                puck.vx = Math.abs(puck.vx) * 0.9 + nx * 4;
                puck.vy = -Math.abs(puck.vy) * 0.95 - 4;
                audioEngine.playPostClang();
                emitSparks(goalLeft, HEIGHT - WALL_THICKNESS, "#ffffff", 14);
              }
              const dPostR = Math.hypot(puck.x - goalRight, puck.y - (HEIGHT - WALL_THICKNESS));
              if (dPostR < puck.radius + postRadius) {
                const nx = (puck.x - goalRight) / dPostR;
                puck.vx = -Math.abs(puck.vx) * 0.9 + nx * 4;
                puck.vy = -Math.abs(puck.vy) * 0.95 - 4;
                audioEngine.playPostClang();
                emitSparks(goalRight, HEIGHT - WALL_THICKNESS, "#ffffff", 14);
              }
            }
          }

          // Speed Clamping
          const curSpeed = Math.hypot(puck.vx, puck.vy);
          if (curSpeed > MAX_PUCK_SPEED) {
            puck.vx = (puck.vx / curSpeed) * MAX_PUCK_SPEED;
            puck.vy = (puck.vy / curSpeed) * MAX_PUCK_SPEED;
          }
        }

        // ── 4. Goal Line Detection & Spectacle ──
        const goalLeftBound = (WIDTH - GOAL_WIDTH) / 2 + 4;
        const goalRightBound = goalLeftBound + GOAL_WIDTH - 8;

        // P1 Scores in Top Goal!
        if (puck.y <= 2 && puck.x >= goalLeftBound && puck.x <= goalRightBound) {
          audioEngine.playGoalSound();
          emitSparks(WIDTH / 2, 20, theme.p1Color, 48, 14);
          emitGoalWave(WIDTH / 2, 20, theme.p1Color);
          setScreenShake(12);
          setTimeout(() => setScreenShake(0), 280);
          setRecentScorer("P1");
          setGoalAnnouncement("⚡ GOAL! PLAYER 1 SCORES! ⚡");
          setTimeout(() => setGoalAnnouncement(null), 2000);

          setP1Score((s) => {
            const next = s + 1;
            if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, next, p2Score, targetScore);
            return next;
          });
          resetPuck(false);
        }
        // P2 Scores in Bottom Goal!
        else if (puck.y >= HEIGHT - 2 && puck.x >= goalLeftBound && puck.x <= goalRightBound) {
          audioEngine.playGoalSound();
          emitSparks(WIDTH / 2, HEIGHT - 20, theme.p2Color, 48, 14);
          emitGoalWave(WIDTH / 2, HEIGHT - 20, theme.p2Color);
          setScreenShake(12);
          setTimeout(() => setScreenShake(0), 280);
          setRecentScorer("P2");
          setGoalAnnouncement(playMode === "SOLO_AI" ? "💥 GOAL! AI BOT SCORES! 💥" : "💥 GOAL! PLAYER 2 SCORES! 💥");
          setTimeout(() => setGoalAnnouncement(null), 2000);

          setP2Score((s) => {
            const next = s + 1;
            if (isHost) updateGlowHockeyScore(matchRef.current.id, currentUid, p1Score, next, targetScore);
            return next;
          });
          resetPuck(true);
        }

        // ── 5. Dead Puck Auto-Faceoff Reset (Anti-Stall System) ──
        const currentSpeed = Math.hypot(puck.vx, puck.vy);
        if (currentSpeed > MIN_PUCK_SPEED) {
          lastIdleTimeRef.current = Date.now();
        } else if (Date.now() - lastIdleTimeRef.current > 3800) {
          // Dead puck stuck for 3.8 seconds
          audioEngine.playPostClang();
          resetPuck(puck.y > HEIGHT / 2);
          setGoalAnnouncement("⚠️ DEAD PUCK • RE-FACEOFF ⚠️");
          setTimeout(() => setGoalAnnouncement(null), 1500);
        }

        // Trail Update
        puck.trail.unshift({ x: puck.x, y: puck.y, alpha: 0.85, color: theme.puckGlow });
        if (puck.trail.length > 12) puck.trail.pop();
        puck.trail.forEach((pt) => (pt.alpha *= 0.84));
      }

      // ── 6. Authentic Canvas Glow Rendering ──
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // A. Deep Ambient Atmosphere Table
      ctx.fillStyle = theme.tableBg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // B. Micro Air-Hole Perforated Grid
      const holeSpacing = 20;
      ctx.fillStyle = theme.gridColor;
      for (let x = WALL_THICKNESS + 8; x < WIDTH - WALL_THICKNESS; x += holeSpacing) {
        for (let y = WALL_THICKNESS + 8; y < HEIGHT - WALL_THICKNESS; y += holeSpacing) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // C. Multi-Pass Glowing Border Rails & Corner Arcs
      ctx.save();
      ctx.strokeStyle = theme.railColor;
      ctx.shadowColor = theme.railGlow;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;

      // Outer Beveled Table Border
      ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, WIDTH - WALL_THICKNESS * 2, HEIGHT - WALL_THICKNESS * 2);
      ctx.restore();

      // D. Centerline Divider & Glowing Center Circle
      ctx.save();
      ctx.strokeStyle = theme.centerColor;
      ctx.shadowColor = theme.centerColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(WALL_THICKNESS, HEIGHT / 2);
      ctx.lineTo(WIDTH - WALL_THICKNESS, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Circle with Pulsing Core
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 48, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = theme.centerColor;
      ctx.fill();
      ctx.restore();

      // E. Glowing Goal Pockets & Metallic Posts
      const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
      const goalRight = goalLeft + GOAL_WIDTH;

      // Top Goal Opening (P2 Defense)
      ctx.save();
      ctx.fillStyle = "rgba(255, 0, 85, 0.12)";
      ctx.fillRect(goalLeft, 0, GOAL_WIDTH, WALL_THICKNESS);
      ctx.strokeStyle = theme.p2Color;
      ctx.shadowColor = theme.p2Glow;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WIDTH / 2, WALL_THICKNESS, GOAL_WIDTH / 2, 0, Math.PI);
      ctx.stroke();

      // Top Goal Post Pegs
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(goalLeft, WALL_THICKNESS, 5, 0, Math.PI * 2);
      ctx.arc(goalRight, WALL_THICKNESS, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bottom Goal Opening (P1 Defense)
      ctx.save();
      ctx.fillStyle = "rgba(0, 255, 102, 0.12)";
      ctx.fillRect(goalLeft, HEIGHT - WALL_THICKNESS, GOAL_WIDTH, WALL_THICKNESS);
      ctx.strokeStyle = theme.p1Color;
      ctx.shadowColor = theme.p1Glow;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT - WALL_THICKNESS, GOAL_WIDTH / 2, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Bottom Goal Post Pegs
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(goalLeft, HEIGHT - WALL_THICKNESS, 5, 0, Math.PI * 2);
      ctx.arc(goalRight, HEIGHT - WALL_THICKNESS, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // F. Expanding Goal Shockwaves
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const w = wavesRef.current[i];
        w.radius += dt * 320;
        w.alpha -= dt * 1.5;
        if (w.alpha <= 0 || w.radius >= w.maxRadius) {
          wavesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.strokeStyle = w.color;
        ctx.globalAlpha = Math.max(0, w.alpha);
        ctx.lineWidth = 4;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // G. Render Puck Comet Tail & Radiant Puck
      puck.trail.forEach((pt) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, puck.radius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = theme.puckGlow;
        ctx.globalAlpha = pt.alpha * 0.6;
        ctx.shadowColor = theme.puckGlow;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      // 3D Metallic Glowing Puck
      ctx.save();
      ctx.shadowColor = theme.puckGlow;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.puckColor;
      ctx.fill();

      // Puck Core Highlight
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = theme.puckCore;
      ctx.fill();

      // Inner Groove Ring
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.radius * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // H. Render Sparks Particles
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        const alpha = 1 - sp.life / sp.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = sp.color;
        ctx.fill();
        ctx.restore();
      }

      // I. Render P1 Striker Mallet (Bottom Neon Ring)
      ctx.save();
      ctx.shadowColor = theme.p1Glow;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.p1Color;
      ctx.fill();

      // 3D Inner Bevel
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = theme.p1Core;
      ctx.fill();

      // Ergonomic Handle Knob
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = theme.p1Color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // J. Render P2 Striker Mallet (Top Neon Ring)
      ctx.save();
      ctx.shadowColor = theme.p2Glow;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.p2Color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.radius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = theme.p2Core;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p2.x, p2.y, p2.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = theme.p2Color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // K. Serve / Countdown Overlay Banner
      if (serveCountdown > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, HEIGHT / 2 - 35, WIDTH, 70);
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = theme.puckGlow;
        ctx.shadowBlur = 15;
        ctx.fillText("⚡ READY • SERVE! ⚡", WIDTH / 2, HEIGHT / 2);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentTheme, isPaused, playMode, aiDifficulty, targetScore, isHost, currentUid, p2Score, p1Score, emitSparks, emitGoalWave, resetPuck, serveCountdown]);

  // ── Multi-Touch Pointer Tracking Handlers ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (playMode === "LOCAL_2P") {
      // Top half controls P2, bottom half controls P1
      if (y >= HEIGHT / 2) {
        activePointersRef.current.set(e.pointerId, "P1");
        p1TargetRef.current = { x, y };
      } else {
        activePointersRef.current.set(e.pointerId, "P2");
        p2TargetRef.current = { x, y };
      }
    } else {
      activePointersRef.current.set(e.pointerId, isHost ? "P1" : "P2");
      if (isHost || playMode === "SOLO_AI") {
        p1TargetRef.current = { x, y };
      } else {
        p2TargetRef.current = { x, y };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const role = activePointersRef.current.get(e.pointerId);
    if (!role) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (role === "P1") {
      p1TargetRef.current = { x, y };
    } else if (role === "P2") {
      p2TargetRef.current = { x, y };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
  };

  const isMatchOver = p1Score >= targetScore || p2Score >= targetScore || match.status === "FINISHED";
  const winnerUid = p1Score >= targetScore ? Object.keys(match.players || {})[0] : Object.keys(match.players || {})[1];

  const handleRestart = () => {
    setP1Score(0);
    setP2Score(0);
    resetPuck(false);
  };

  return (
    <div
      style={{
        transform:
          screenShake > 0
            ? `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)`
            : "none",
        transition: "transform 0.04s ease-out",
      }}
      className="w-full max-w-lg mx-auto bg-neutral-950 border border-neutral-800 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_60px_rgba(0,255,102,0.15)] rounded-2xl"
    >
      {/* ── Top Header & Match Mode Bar ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black shadow-lg"
            style={{
              backgroundColor: currentTheme.p1Color,
              color: "#000",
              boxShadow: `0 0 16px ${currentTheme.p1Glow}`,
            }}
          >
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wide text-white uppercase">
                GLOW HOCKEY PRO
              </span>
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase"
                style={{ backgroundColor: currentTheme.railColor, color: "#000" }}
              >
                {currentTheme.name}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              FIRST TO <strong className="text-white">{targetScore} PTS</strong> WINS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-500" />}
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isPaused ? "Resume Match" : "Pause Match"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-yellow-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Restart */}
          <button
            type="button"
            onClick={handleRestart}
            className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Restart Match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Invite Button */}
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-3 py-1.5 bg-white text-black font-black text-[10px] uppercase rounded-lg hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />

      {/* ── Mode & Difficulty Selector Row ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Play Mode Selector */}
        <div className="p-2 rounded-xl bg-black border border-neutral-800 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            <Users className="w-3 h-3 text-neutral-400" /> MODE:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPlayMode("SOLO_AI");
                handleRestart();
              }}
              className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                playMode === "SOLO_AI"
                  ? "bg-white text-black font-black shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              🤖 VS BOT
            </button>
            <button
              type="button"
              onClick={() => {
                setPlayMode("LOCAL_2P");
                handleRestart();
              }}
              className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                playMode === "LOCAL_2P"
                  ? "bg-emerald-400 text-black font-black shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              title="2 Players on same screen with multi-touch"
            >
              👥 2P LOCAL
            </button>
          </div>
        </div>

        {/* AI Difficulty or 2P Hint */}
        {playMode === "SOLO_AI" ? (
          <div className="p-2 rounded-xl bg-black border border-neutral-800 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
              <Bot className="w-3 h-3 text-neutral-400" /> AI BOT:
            </span>
            <div className="flex items-center gap-1">
              {(["AMATEUR", "SEMI_PRO", "USAA_PRO", "CHAMPION_TAS"] as AIDifficulty[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setAiDifficulty(lvl)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer ${
                    aiDifficulty === lvl
                      ? "bg-white text-black font-black"
                      : "bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  {lvl === "AMATEUR" ? "EASY" : lvl === "SEMI_PRO" ? "MED" : lvl === "USAA_PRO" ? "PRO" : "GOD"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-black border border-neutral-800 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" /> MULTI-TOUCH:
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase">
              TOP (P2) vs BOT (P1)
            </span>
          </div>
        )}
      </div>

      {/* ── Theme & Target Score Bar ── */}
      <div className="flex items-center justify-between bg-black p-2 rounded-xl border border-neutral-800 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">THEME:</span>
          {Object.values(GLOW_THEMES).map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => setThemeKey(th.id)}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                themeKey === th.id
                  ? "bg-neutral-900 border-white text-white font-black shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span>{th.icon}</span>
              <span>{th.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">TARGET:</span>
          {[3, 5, 7, 10].map((pts) => (
            <button
              key={pts}
              type="button"
              onClick={() => setTargetScore(pts)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                targetScore === pts
                  ? "bg-white text-black font-black"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              {pts}
            </button>
          ))}
        </div>
      </div>

      {/* ── Goal Announcement Flash Banner ── */}
      {goalAnnouncement && (
        <div
          className="p-2.5 rounded-xl text-center font-black text-xs uppercase tracking-wider animate-bounce shadow-lg"
          style={{
            backgroundColor: recentScorer === "P1" ? currentTheme.p1Color : currentTheme.p2Color,
            color: "#000",
            boxShadow: `0 0 30px ${recentScorer === "P1" ? currentTheme.p1Glow : currentTheme.p2Glow}`,
          }}
        >
          {goalAnnouncement}
        </div>
      )}

      {/* ── Radiant Scoreboard Display ── */}
      <div className="grid grid-cols-2 gap-3 text-center">
        {/* P2 Top Score */}
        <div
          className="p-3 rounded-xl border bg-black flex items-center justify-between px-4 transition-all"
          style={{
            borderColor: recentScorer === "P2" ? currentTheme.p2Color : "rgba(255,255,255,0.15)",
            boxShadow: recentScorer === "P2" ? `0 0 20px ${currentTheme.p2Glow}` : "none",
          }}
        >
          <div className="text-left">
            <span
              className="text-[11px] font-black uppercase block tracking-wider"
              style={{ color: currentTheme.p2Color }}
            >
              🔴 {playMode === "SOLO_AI" ? `AI BOT (${aiDifficulty})` : "PLAYER 2 (TOP)"}
            </span>
            <span className="text-[9px] text-neutral-500">NORTH GOAL</span>
          </div>
          <span
            className="text-3xl font-black font-mono"
            style={{
              color: currentTheme.p2Color,
              textShadow: `0 0 15px ${currentTheme.p2Glow}`,
            }}
          >
            {p2Score}
          </span>
        </div>

        {/* P1 Bottom Score */}
        <div
          className="p-3 rounded-xl border bg-black flex items-center justify-between px-4 transition-all"
          style={{
            borderColor: recentScorer === "P1" ? currentTheme.p1Color : "rgba(255,255,255,0.15)",
            boxShadow: recentScorer === "P1" ? `0 0 20px ${currentTheme.p1Glow}` : "none",
          }}
        >
          <div className="text-left">
            <span
              className="text-[11px] font-black uppercase block tracking-wider"
              style={{ color: currentTheme.p1Color }}
            >
              🟢 {playMode === "LOCAL_2P" ? "PLAYER 1 (BOT)" : "YOU (PLAYER 1)"}
            </span>
            <span className="text-[9px] text-neutral-500">SOUTH GOAL</span>
          </div>
          <span
            className="text-3xl font-black font-mono"
            style={{
              color: currentTheme.p1Color,
              textShadow: `0 0 15px ${currentTheme.p1Glow}`,
            }}
          >
            {p1Score}
          </span>
        </div>
      </div>

      {/* ── Air Hockey Canvas Arena ── */}
      <div
        className="relative aspect-[360/580] max-w-[360px] mx-auto p-1.5 rounded-2xl border-4 transition-all shadow-2xl"
        style={{
          backgroundColor: currentTheme.tableBg,
          borderColor: currentTheme.railColor,
          boxShadow: `0 0 40px ${currentTheme.railGlow}, inset 0 0 30px rgba(0,0,0,0.8)`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── Official USAA Air Hockey Rules & Pro Tips Accordion ── */}
      <div className="border border-neutral-800 bg-black rounded-xl overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowProTips(!showProTips)}
          className="w-full p-3 flex items-center justify-between font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-emerald-400" />
            🏆 USAA PRO MASTERIES &amp; OFFICIAL RULES
          </span>
          {showProTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProTips && (
          <div className="p-3.5 border-t border-neutral-800 space-y-2.5 text-[11px] text-neutral-400 font-mono bg-neutral-950">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">1. 🚀 BANK SHOTS &amp; RAYCAST REBOUNDS:</span>
              Strike the puck against the side rails at a 45° angle. The continuous collision engine computes pure specular reflections past the opponent's crease!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">2. ⚡ CUT SHOTS &amp; SPEED FLICKS:</span>
              Flick the paddle sharply as you hit the puck to transfer angular momentum and create curved cut shots that slip past goal posts.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">3. 🛡️ CENTERLINE RULE &amp; NO TOPPING:</span>
              Paddles cannot cross the center divider. If the puck sits idle on the centerline for &gt; 3.5 seconds, the auto-faceoff engine re-serves the puck!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-white font-bold block mb-0.5">4. 👥 MULTI-TOUCH 2-PLAYER LOCAL:</span>
              Switch to 2P LOCAL mode on any smartphone, iPad, or tablet! Player 1 touches the bottom half, Player 2 touches the top half simultaneously!
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {isMatchOver && (
        <div className="border-2 border-white bg-gradient-to-b from-neutral-900 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(255,255,255,0.35)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-yellow-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#ffe600]" />
          <h2 className="text-xl font-black text-white uppercase tracking-widest">
            🏆 GLOW HOCKEY CHAMPION!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {p1Score >= targetScore
              ? `VICTORY! Player 1 conquered the arena with ${targetScore} points!`
              : `VICTORY! ${playMode === "SOLO_AI" ? "AI Bot" : "Player 2"} claimed the crown with ${targetScore} points!`}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 rounded-xl shadow-lg active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>[ 🔄 PLAY REMATCH ]</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Social Deck ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
