"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Zap, Flame, Sparkles, Volume2, VolumeX, Shield } from "lucide-react";

export interface FruitNinjaProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Visual Palette & Fruit Types ──
export type FruitKind =
  | "watermelon"
  | "orange"
  | "strawberry"
  | "pineapple"
  | "banana"
  | "coconut"
  | "kiwi"
  | "dragonfruit"
  | "golden_star"
  | "bomb";

interface FruitDef {
  kind: FruitKind;
  name: string;
  radius: number;
  points: number;
  outerColor: string;
  innerColor: string;
  rindColor: string;
  seedColor?: string;
  juiceColor: string;
  splashColor: string;
}

const FRUIT_DEFS: Record<FruitKind, FruitDef> = {
  watermelon: {
    kind: "watermelon",
    name: "Watermelon",
    radius: 34,
    points: 1,
    outerColor: "#15803d",
    innerColor: "#ef4444",
    rindColor: "#bbf7d0",
    seedColor: "#18181b",
    juiceColor: "rgba(239, 68, 68, 0.85)",
    splashColor: "rgba(220, 38, 38, 0.4)",
  },
  orange: {
    kind: "orange",
    name: "Orange",
    radius: 28,
    points: 1,
    outerColor: "#ea580c",
    innerColor: "#fb923c",
    rindColor: "#ffedd5",
    seedColor: "#fef08a",
    juiceColor: "rgba(249, 115, 22, 0.85)",
    splashColor: "rgba(234, 88, 12, 0.4)",
  },
  strawberry: {
    kind: "strawberry",
    name: "Strawberry",
    radius: 24,
    points: 2,
    outerColor: "#dc2626",
    innerColor: "#f87171",
    rindColor: "#22c55e",
    seedColor: "#fef08a",
    juiceColor: "rgba(220, 38, 38, 0.85)",
    splashColor: "rgba(185, 28, 28, 0.4)",
  },
  pineapple: {
    kind: "pineapple",
    name: "Pineapple",
    radius: 32,
    points: 2,
    outerColor: "#ca8a04",
    innerColor: "#facc15",
    rindColor: "#a16207",
    seedColor: "#854d0e",
    juiceColor: "rgba(234, 179, 8, 0.85)",
    splashColor: "rgba(202, 138, 4, 0.4)",
  },
  banana: {
    kind: "banana",
    name: "Banana",
    radius: 26,
    points: 1,
    outerColor: "#eab308",
    innerColor: "#fef08a",
    rindColor: "#ca8a04",
    juiceColor: "rgba(234, 179, 8, 0.8)",
    splashColor: "rgba(202, 138, 4, 0.35)",
  },
  coconut: {
    kind: "coconut",
    name: "Coconut",
    radius: 30,
    points: 3,
    outerColor: "#78350f",
    innerColor: "#fafaf9",
    rindColor: "#451a03",
    juiceColor: "rgba(255, 255, 255, 0.9)",
    splashColor: "rgba(245, 245, 244, 0.4)",
  },
  kiwi: {
    kind: "kiwi",
    name: "Kiwi",
    radius: 25,
    points: 2,
    outerColor: "#854d0e",
    innerColor: "#84cc16",
    rindColor: "#65a30d",
    seedColor: "#1c1917",
    juiceColor: "rgba(132, 204, 22, 0.85)",
    splashColor: "rgba(101, 163, 13, 0.4)",
  },
  dragonfruit: {
    kind: "dragonfruit",
    name: "Dragonfruit",
    radius: 32,
    points: 3,
    outerColor: "#e11d48",
    innerColor: "#f43f5e",
    rindColor: "#4ade80",
    seedColor: "#09090b",
    juiceColor: "rgba(225, 29, 72, 0.85)",
    splashColor: "rgba(190, 18, 60, 0.45)",
  },
  golden_star: {
    kind: "golden_star",
    name: "Golden Starfruit",
    radius: 30,
    points: 5,
    outerColor: "#f59e0b",
    innerColor: "#fbbf24",
    rindColor: "#fef08a",
    seedColor: "#ffffff",
    juiceColor: "rgba(251, 191, 36, 0.95)",
    splashColor: "rgba(245, 158, 11, 0.55)",
  },
  bomb: {
    kind: "bomb",
    name: "Bomb",
    radius: 28,
    points: 0,
    outerColor: "#18181b",
    innerColor: "#ef4444",
    rindColor: "#71717a",
    juiceColor: "rgba(239, 68, 68, 1)",
    splashColor: "rgba(220, 38, 38, 0.7)",
  },
};

// ── Physical Game Entities ──
interface FruitEntity {
  id: number;
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  radius: number;
  isSliced: boolean;
  sliceAngle: number;
  fuseTimer: number; // for bombs
}

interface SlicedHalf {
  id: number;
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  sliceAngle: number;
  side: 1 | -1; // 1 = left half, -1 = right half
  alpha: number;
}

interface JuiceSplatter {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  drips: { x: number; y: number; len: number }[];
}

interface BladePoint {
  x: number;
  y: number;
  time: number;
}

interface JuiceDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  vy: number;
}

// ── Blade Styles ──
const BLADE_STYLES = [
  { id: "katana", name: "KATANA STEEL", color: "#38bdf8", glow: "#0284c7" },
  { id: "laser", name: "CYBER NEON", color: "#a855f7", glow: "#7e22ce" },
  { id: "solar", name: "SOLAR FLAME", color: "#f59e0b", glow: "#d97706" },
  { id: "emerald", name: "JADE SENSEI", color: "#10b981", glow: "#059669" },
];

export default function FruitNinjaGame({
  match,
  currentUid,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: FruitNinjaProps) {
  const initialDiff = ((match?.difficulty?.toLowerCase() as BotDifficulty) || "medium");
  const [inMenu, setInMenu] = useState(false);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);
  const [selectedBlade, setSelectedBlade] = useState(0);

  // Score & Strikes
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [comboCount, setComboCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active game loop state
  const fruitsRef = useRef<FruitEntity[]>([]);
  const slicedHalvesRef = useRef<SlicedHalf[]>([]);
  const juiceSplattersRef = useRef<JuiceSplatter[]>([]);
  const dropletsRef = useRef<JuiceDroplet[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const bladePointsRef = useRef<BladePoint[]>([]);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);
  const isPointerDownRef = useRef(false);

  // Combo streak detection
  const recentSliceTimes = useRef<number[]>([]);

  // Sound Mute
  const [isMuted, setIsMuted] = useState(false);

  // Start game session
  const startGame = useCallback((diff: BotDifficulty = "medium") => {
    setBotDiff(diff);
    setScore(0);
    setStrikes(0);
    setGameOver(false);
    setComboCount(0);
    fruitsRef.current = [];
    slicedHalvesRef.current = [];
    juiceSplattersRef.current = [];
    dropletsRef.current = [];
    floatingTextsRef.current = [];
    bladePointsRef.current = [];
    recentSliceTimes.current = [];
    setInMenu(false);
  }, []);

  // Spawn fresh wave of fruits
  const spawnFruitWave = useCallback(() => {
    if (gameOver || inMenu) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const count = 1 + Math.floor(Math.random() * 3); // 1-3 fruits per wave
    const kinds: FruitKind[] = [
      "watermelon",
      "orange",
      "strawberry",
      "pineapple",
      "banana",
      "coconut",
      "kiwi",
      "dragonfruit",
    ];

    for (let i = 0; i < count; i++) {
      // 18% chance of Bomb spawn
      const isBomb = Math.random() < 0.18;
      // 7% chance of Golden Starfruit
      const isGolden = !isBomb && Math.random() < 0.07;
      const kind: FruitKind = isBomb
        ? "bomb"
        : isGolden
        ? "golden_star"
        : kinds[Math.floor(Math.random() * kinds.length)];
      const def = FRUIT_DEFS[kind];

      const startX = 60 + Math.random() * (canvas.width - 120);
      const startY = canvas.height + 30;

      // Parabolic throw targeting upper center of screen
      const targetX = canvas.width * 0.25 + Math.random() * canvas.width * 0.5;
      const arcHeight = canvas.height * 0.55 + Math.random() * (canvas.height * 0.25);
      const gravity = 0.38;

      // Calculate initial velocity to reach arc height
      const timeToPeak = Math.sqrt((2 * arcHeight) / gravity);
      const vy = -gravity * timeToPeak;
      const vx = (targetX - startX) / (timeToPeak * 1.5);

      fruitsRef.current.push({
        id: Date.now() + Math.random(),
        kind,
        x: startX,
        y: startY,
        vx,
        vy,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.1,
        radius: def.radius,
        isSliced: false,
        sliceAngle: 0,
        fuseTimer: 0,
      });

      if (isBomb && !isMuted) {
        arcadeSfx.playBombFuse();
      }
    }
  }, [gameOver, inMenu, isMuted]);

  // Handle fruit slicing
  const sliceFruit = useCallback(
    (fruit: FruitEntity, cutAngle: number) => {
      if (fruit.isSliced) return;
      fruit.isSliced = true;
      const def = FRUIT_DEFS[fruit.kind];

      if (fruit.kind === "bomb") {
        // Bomb detonated!
        if (!isMuted) arcadeSfx.playBombExplosion();
        setGameOver(true);
        setStrikes(3);
        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 20,
          text: "💥 BOMB DETONATED!",
          color: "#ef4444",
          size: 20,
          alpha: 1,
          vy: -1.5,
        });
        return;
      }

      // Valid Fruit Sliced!
      if (!isMuted) arcadeSfx.playFruitSquish();

      // Track combo window (350ms)
      const now = performance.now();
      recentSliceTimes.current.push(now);
      recentSliceTimes.current = recentSliceTimes.current.filter((t) => now - t < 350);
      const currentCombo = recentSliceTimes.current.length;

      let gainedPoints = def.points;
      if (currentCombo >= 3) {
        const bonus = currentCombo * 2;
        gainedPoints += bonus;
        if (!isMuted) arcadeSfx.playComboFanfare(currentCombo);
        setComboCount(currentCombo);

        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 30,
          text: `⚡ COMBO x${currentCombo}! +${bonus}`,
          color: "#f59e0b",
          size: 18,
          alpha: 1,
          vy: -2,
        });
      }

      setScore((prev) => {
        const next = prev + gainedPoints;
        setHighScore((h) => Math.max(h, next));
        return next;
      });

      floatingTextsRef.current.push({
        id: Math.random(),
        x: fruit.x,
        y: fruit.y,
        text: `+${def.points}`,
        color: def.outerColor,
        size: 15,
        alpha: 1,
        vy: -1.2,
      });

      // Wall Splatter
      const numDrips = 2 + Math.floor(Math.random() * 4);
      const drips = [];
      for (let d = 0; d < numDrips; d++) {
        drips.push({
          x: (Math.random() - 0.5) * def.radius * 1.5,
          y: (Math.random() - 0.5) * def.radius,
          len: 10 + Math.random() * 25,
        });
      }
      juiceSplattersRef.current.push({
        x: fruit.x,
        y: fruit.y,
        radius: def.radius * (0.8 + Math.random() * 0.4),
        color: def.splashColor,
        alpha: 0.9,
        drips,
      });
      if (juiceSplattersRef.current.length > 25) {
        juiceSplattersRef.current.shift();
      }

      // Fly-apart juice droplets
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 7;
        dropletsRef.current.push({
          x: fruit.x,
          y: fruit.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          color: def.juiceColor,
          alpha: 1,
          size: 3 + Math.random() * 4,
        });
      }

      // Split into two halves flying perpendicular to the blade cut
      const perpAngle = cutAngle + Math.PI / 2;
      const splitSpeed = 3.5;

      slicedHalvesRef.current.push({
        id: Math.random(),
        kind: fruit.kind,
        x: fruit.x - Math.cos(perpAngle) * 8,
        y: fruit.y - Math.sin(perpAngle) * 8,
        vx: fruit.vx - Math.cos(perpAngle) * splitSpeed,
        vy: fruit.vy - Math.sin(perpAngle) * splitSpeed - 1,
        rotation: fruit.rotation,
        vRot: fruit.vRot - 0.1,
        sliceAngle: cutAngle,
        side: 1,
        alpha: 1,
      });

      slicedHalvesRef.current.push({
        id: Math.random(),
        kind: fruit.kind,
        x: fruit.x + Math.cos(perpAngle) * 8,
        y: fruit.y + Math.sin(perpAngle) * 8,
        vx: fruit.vx + Math.cos(perpAngle) * splitSpeed,
        vy: fruit.vy + Math.sin(perpAngle) * splitSpeed - 1,
        rotation: fruit.rotation,
        vRot: fruit.vRot + 0.1,
        sliceAngle: cutAngle,
        side: -1,
        alpha: 1,
      });
    },
    [isMuted]
  );

  // Line segment to Circle distance intersection test
  const checkBladeIntersection = useCallback(
    (p1: BladePoint, p2: BladePoint) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 16) return; // ignore tiny tremors
      const cutAngle = Math.atan2(dy, dx);

      fruitsRef.current.forEach((fruit) => {
        if (fruit.isSliced) return;

        // Projection of fruit center onto line segment
        const u = Math.max(
          0,
          Math.min(1, ((fruit.x - p1.x) * dx + (fruit.y - p1.y) * dy) / lenSq)
        );
        const closestX = p1.x + u * dx;
        const closestY = p1.y + u * dy;
        const distSq =
          (fruit.x - closestX) * (fruit.x - closestX) +
          (fruit.y - closestY) * (fruit.y - closestY);

        if (distSq <= fruit.radius * fruit.radius) {
          sliceFruit(fruit, cutAngle);
        }
      });
    },
    [sliceFruit]
  );

  // AI Sensei Bot Simulation (plays alongside player in Solo Bot mode)
  useEffect(() => {
    if (inMenu || gameOver) return;

    // Bot scan interval based on difficulty
    const intervalMs = botDiff === "easy" ? 450 : botDiff === "medium" ? 220 : 90;
    const interval = setInterval(() => {
      // Find candidate fruit
      const unsliced = fruitsRef.current.filter((f) => !f.isSliced);
      if (unsliced.length === 0) return;

      // Bot filters out bombs unless easy bot makes a rare mistake (5%)
      const targetFruits = unsliced.filter(
        (f) => f.kind !== "bomb" || (botDiff === "easy" && Math.random() < 0.05)
      );
      if (targetFruits.length === 0) return;

      // Pick fruit that is near peak height (vy between -2 and 4)
      const idealTarget = targetFruits.find((f) => f.vy > -2 && f.y < 450) || targetFruits[0];
      if (!idealTarget) return;

      // Accuracy check
      const accuracy = botDiff === "easy" ? 0.55 : botDiff === "medium" ? 0.82 : 0.96;
      if (Math.random() > accuracy) return;

      // Execute simulated swipe across idealTarget
      const angle = (Math.random() - 0.5) * Math.PI;
      const swipeDist = idealTarget.radius * 2.5;
      const p1 = {
        x: idealTarget.x - Math.cos(angle) * swipeDist,
        y: idealTarget.y - Math.sin(angle) * swipeDist,
        time: performance.now(),
      };
      const p2 = {
        x: idealTarget.x + Math.cos(angle) * swipeDist,
        y: idealTarget.y + Math.sin(angle) * swipeDist,
        time: performance.now(),
      };

      // Add visual blade points
      bladePointsRef.current.push(p1);
      bladePointsRef.current.push(p2);

      if (!isMuted) arcadeSfx.playBladeSwipe();
      sliceFruit(idealTarget, angle);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [inMenu, gameOver, botDiff, isMuted, sliceFruit]);

  // Periodic fruit wave spawner
  useEffect(() => {
    if (inMenu || gameOver) return;
    spawnFruitWave();
    const t = setInterval(() => {
      spawnFruitWave();
    }, 2200);
    return () => clearInterval(t);
  }, [inMenu, gameOver, spawnFruitWave]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.38;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── 1. Japanese Dojo Wooden Parquet Background ──
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#1c140d");
      grad.addColorStop(0.5, "#2a1d13");
      grad.addColorStop(1, "#150d07");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood plank seams
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      for (let y = 60; y < canvas.height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Subtle center dojo crest
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── 2. Wall Juice Splatters (Viscous liquid with drips) ──
      juiceSplattersRef.current.forEach((sp) => {
        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();

        // Dripping trails
        sp.drips.forEach((dp) => {
          ctx.beginPath();
          ctx.moveTo(sp.x + dp.x, sp.y + dp.y);
          ctx.lineTo(sp.x + dp.x, sp.y + dp.y + dp.len);
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.restore();

        // Slow fade
        sp.alpha -= 0.0008;
      });
      juiceSplattersRef.current = juiceSplattersRef.current.filter((sp) => sp.alpha > 0);

      // ── 3. Active Airborne Fruits ──
      fruitsRef.current.forEach((fruit) => {
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;
        fruit.vy += gravity;
        fruit.rotation += fruit.vRot;

        if (fruit.isSliced) return;

        const def = FRUIT_DEFS[fruit.kind];

        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);

        if (fruit.kind === "bomb") {
          // Render Bomb with metallic shine & animated fuse spark
          ctx.fillStyle = "#18181b";
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Skull icon or danger indicator
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💣", 0, 0);

          // Fuse neck & spark
          fruit.fuseTimer += 0.2;
          const fuseX = fruit.radius * 0.7;
          const fuseY = -fruit.radius * 0.7;
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -fruit.radius);
          ctx.quadraticCurveTo(fuseX * 0.5, fuseY * 0.5, fuseX, fuseY);
          ctx.stroke();

          // Spark particle
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(
            fuseX + (Math.random() - 0.5) * 4,
            fuseY + (Math.random() - 0.5) * 4,
            3 + Math.sin(fruit.fuseTimer) * 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (fruit.kind === "golden_star") {
          // Glowing 5-pointed star
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const rot = (Math.PI / 5) * 2 * s - Math.PI / 2;
            const innerRot = rot + Math.PI / 5;
            const rOuter = fruit.radius;
            const rInner = fruit.radius * 0.45;
            if (s === 0) ctx.moveTo(Math.cos(rot) * rOuter, Math.sin(rot) * rOuter);
            else ctx.lineTo(Math.cos(rot) * rOuter, Math.sin(rot) * rOuter);
            ctx.lineTo(Math.cos(innerRot) * rInner, Math.sin(innerRot) * rInner);
          }
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Whole Fruit: Outer Skin / Rind with Specular Highlight
          ctx.fillStyle = def.outerColor;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          // Inner shading
          ctx.fillStyle = def.rindColor;
          ctx.beginPath();
          ctx.arc(-fruit.radius * 0.15, -fruit.radius * 0.15, fruit.radius * 0.75, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = def.innerColor;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius * 0.65, 0, Math.PI * 2);
          ctx.fill();

          // Seeds / Pores
          if (def.seedColor) {
            ctx.fillStyle = def.seedColor;
            for (let s = 0; s < 6; s++) {
              const sAngle = (Math.PI / 3) * s;
              const sDist = fruit.radius * 0.35;
              ctx.beginPath();
              ctx.arc(
                Math.cos(sAngle) * sDist,
                Math.sin(sAngle) * sDist,
                1.5,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        }
        ctx.restore();
      });

      // Strike Check: Fruits falling below screen unsliced
      fruitsRef.current.forEach((fruit) => {
        if (!fruit.isSliced && fruit.y > canvas.height + 50 && fruit.vy > 0) {
          if (fruit.kind !== "bomb") {
            // Count a strike!
            setStrikes((prev) => {
              const next = prev + 1;
              if (next >= 3) {
                setGameOver(true);
                if (!isMuted) arcadeSfx.playPenaltyBuzz();
              }
              return next;
            });
            if (!isMuted) arcadeSfx.playPenaltyBuzz();
          }
        }
      });
      // Filter out offscreen fruits
      fruitsRef.current = fruitsRef.current.filter((f) => f.y <= canvas.height + 60);

      // ── 4. Sliced Fruit Halves (Centrifugal separation with pulp face) ──
      slicedHalvesRef.current.forEach((half) => {
        half.x += half.vx;
        half.y += half.vy;
        half.vy += gravity * 1.1;
        half.rotation += half.vRot;
        half.alpha = Math.max(0, half.alpha - 0.012);

        const def = FRUIT_DEFS[half.kind];
        ctx.save();
        ctx.globalAlpha = half.alpha;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);

        // Clip to semicircular half
        ctx.beginPath();
        ctx.arc(0, 0, def.radius, 0, Math.PI, half.side === 1);
        ctx.closePath();
        ctx.clip();

        // Render layers
        ctx.fillStyle = def.outerColor;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = def.innerColor;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Exposed juicy pulp line
        ctx.strokeStyle = def.rindColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-def.radius, 0);
        ctx.lineTo(def.radius, 0);
        ctx.stroke();

        ctx.restore();
      });
      slicedHalvesRef.current = slicedHalvesRef.current.filter((h) => h.alpha > 0);

      // ── 5. Airborne Liquid Droplets ──
      dropletsRef.current.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += gravity * 0.8;
        d.alpha -= 0.02;

        ctx.save();
        ctx.fillStyle = d.color;
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      dropletsRef.current = dropletsRef.current.filter((d) => d.alpha > 0);

      // ── 6. Floating Combo & Score Badges ──
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = `black ${ft.size}px monospace`;
        ctx.textAlign = "center";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

      // ── 7. Glowing Razor Blade Swipe Trail ──
      const now = performance.now();
      bladePointsRef.current = bladePointsRef.current.filter((pt) => now - pt.time < 120);

      if (bladePointsRef.current.length > 1) {
        const blade = BLADE_STYLES[selectedBlade];
        ctx.save();
        ctx.shadowColor = blade.glow;
        ctx.shadowBlur = 14;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < bladePointsRef.current.length; i++) {
          const p1 = bladePointsRef.current[i - 1];
          const p2 = bladePointsRef.current[i];
          const age = (now - p2.time) / 120;
          const width = (1 - age) * 8;

          ctx.strokeStyle = blade.color;
          ctx.lineWidth = Math.max(1, width);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // White incandescent core
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1, width * 0.4);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, selectedBlade, isMuted]);

  // Pointer Movement (Touch & Mouse Blade Tracking)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameOver || inMenu) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}

    isPointerDownRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    lastTouchPos.current = { x, y };
    bladePointsRef.current.push({ x, y, time: performance.now() });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || gameOver || inMenu) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const now = performance.now();
    const newPt: BladePoint = { x, y, time: now };

    if (lastTouchPos.current) {
      const prevPt: BladePoint = {
        x: lastTouchPos.current.x,
        y: lastTouchPos.current.y,
        time: now,
      };
      checkBladeIntersection(prevPt, newPt);
    }

    lastTouchPos.current = { x, y };
    bladePointsRef.current.push(newPt);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isPointerDownRef.current = false;
    lastTouchPos.current = null;
  };

  // Pre-Game Modal
  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="FRUIT NINJA"
          subtitle="Dojo Blade Slicing"
          categoryTag="SPORTS & PHYSICS"
          accentColor="#ef4444"
          objective="Slice flying fruits with swipe blade! Dodge explosive bombs and trigger multi-fruit combos. 3 strikes and you're out!"
          heroGraphic={
            <div className="relative w-36 h-36 flex items-center justify-center">
              <span className="text-6xl animate-bounce">🍉</span>
              <span className="absolute text-5xl translate-x-7 -translate-y-4 animate-pulse">
                🗡️
              </span>
            </div>
          }
          howToPlaySteps={[
            {
              title: "Swipe to Slice",
              desc: "Drag or swipe across the canvas to carve through fruits with precision razor cuts.",
              icon: "🗡️",
            },
            {
              title: "Avoid the Bombs",
              desc: "Slicing a sizzling fuse bomb triggers an instant devastating detonation!",
              icon: "💣",
            },
            {
              title: "Multi-Fruit Combos",
              desc: "Cut 3 or more fruits in a single fluid stroke for massive combo multipliers.",
              icon: "⚡",
            },
            {
              title: "3 Strikes Rule",
              desc: "Letting 3 whole fruits fall unsliced ends your dojo trial.",
              icon: "❌",
            },
          ]}
          onPlayFriend={onInviteFriend || (() => startGame("medium"))}
          onPlayBot={(diff) => startGame(diff)}
          onRandomMatch={onRandomMatch}
          onBack={onBack || (() => window.history.back())}
          hiScore={highScore}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl">
      {/* ── Top HUD Bar ── */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 z-30">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : setInMenu(true))}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-300 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score Readout */}
        <div className="flex items-center gap-3 bg-neutral-900/90 px-3.5 py-1 rounded-xl border border-white/10 shadow-md">
          <span className="text-xs font-bold text-amber-400">SCORE</span>
          <span className="text-2xl font-black text-white">{score}</span>
        </div>

        {/* Strikes (❌ ❌ ❌) */}
        <div className="flex items-center gap-1 bg-neutral-900/90 px-2.5 py-1 rounded-xl border border-white/10 shadow-md text-sm font-black">
          <span className={strikes >= 1 ? "text-red-500 scale-110" : "text-neutral-700"}>❌</span>
          <span className={strikes >= 2 ? "text-red-500 scale-110" : "text-neutral-700"}>❌</span>
          <span className={strikes >= 3 ? "text-red-500 scale-110" : "text-neutral-700"}>❌</span>
        </div>

        {/* Sound Mute Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* ── Blade Selector Pills ── */}
      <div className="w-full flex items-center justify-center gap-1.5 my-1 z-30">
        {BLADE_STYLES.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedBlade(idx)}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
              selectedBlade === idx
                ? "bg-white text-black border-white shadow-xs font-black"
                : "bg-neutral-900/80 text-neutral-400 border-neutral-800"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* ── Main Canvas Arena ── */}
      <div className="relative w-full aspect-[9/15] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800">
        <canvas
          ref={canvasRef}
          width={360}
          height={600}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Game Over Banner Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 z-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mb-3 shadow-lg">
              🍉
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-wider mb-1">
              DOJO TRIAL ENDED
            </h2>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              Final Score: <strong className="text-amber-400 text-base">{score}</strong> • Best: {highScore}
            </p>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => startGame(botDiff)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-sm uppercase rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>SLICE AGAIN</span>
              </button>

              <button
                type="button"
                onClick={() => setInMenu(true)}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs uppercase rounded-xl border border-neutral-800 transition-all cursor-pointer"
              >
                DOJO MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Game Footer Status ── */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono px-2 py-1">
        <span>SENSEI AI: {botDiff.toUpperCase()}</span>
        <span>SWIPE TO SLICE • 60 FPS</span>
      </div>
    </div>
  );
}
