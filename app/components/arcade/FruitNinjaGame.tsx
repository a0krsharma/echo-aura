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

// ── Visual Palette & Fruit Varieties ──
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
  | "freeze_banana"
  | "frenzy_banana"
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
    radius: 36,
    points: 1,
    outerColor: "#15803d",
    innerColor: "#ef4444",
    rindColor: "#bbf7d0",
    seedColor: "#18181b",
    juiceColor: "rgba(239, 68, 68, 0.9)",
    splashColor: "rgba(220, 38, 38, 0.5)",
  },
  orange: {
    kind: "orange",
    name: "Orange",
    radius: 30,
    points: 1,
    outerColor: "#ea580c",
    innerColor: "#fb923c",
    rindColor: "#ffedd5",
    seedColor: "#fef08a",
    juiceColor: "rgba(249, 115, 22, 0.9)",
    splashColor: "rgba(234, 88, 12, 0.45)",
  },
  strawberry: {
    kind: "strawberry",
    name: "Strawberry",
    radius: 26,
    points: 2,
    outerColor: "#dc2626",
    innerColor: "#f87171",
    rindColor: "#22c55e",
    seedColor: "#fef08a",
    juiceColor: "rgba(220, 38, 38, 0.9)",
    splashColor: "rgba(185, 28, 28, 0.45)",
  },
  pineapple: {
    kind: "pineapple",
    name: "Pineapple",
    radius: 34,
    points: 2,
    outerColor: "#ca8a04",
    innerColor: "#facc15",
    rindColor: "#a16207",
    seedColor: "#854d0e",
    juiceColor: "rgba(234, 179, 8, 0.9)",
    splashColor: "rgba(202, 138, 4, 0.45)",
  },
  banana: {
    kind: "banana",
    name: "Banana",
    radius: 28,
    points: 1,
    outerColor: "#eab308",
    innerColor: "#fef08a",
    rindColor: "#ca8a04",
    juiceColor: "rgba(234, 179, 8, 0.85)",
    splashColor: "rgba(202, 138, 4, 0.4)",
  },
  coconut: {
    kind: "coconut",
    name: "Coconut",
    radius: 32,
    points: 3,
    outerColor: "#78350f",
    innerColor: "#fafaf9",
    rindColor: "#451a03",
    juiceColor: "rgba(255, 255, 255, 0.95)",
    splashColor: "rgba(245, 245, 244, 0.5)",
  },
  kiwi: {
    kind: "kiwi",
    name: "Kiwi",
    radius: 27,
    points: 2,
    outerColor: "#854d0e",
    innerColor: "#84cc16",
    rindColor: "#65a30d",
    seedColor: "#1c1917",
    juiceColor: "rgba(132, 204, 22, 0.9)",
    splashColor: "rgba(101, 163, 13, 0.45)",
  },
  dragonfruit: {
    kind: "dragonfruit",
    name: "Dragonfruit",
    radius: 34,
    points: 3,
    outerColor: "#e11d48",
    innerColor: "#fafafa",
    rindColor: "#4ade80",
    seedColor: "#09090b",
    juiceColor: "rgba(225, 29, 72, 0.9)",
    splashColor: "rgba(190, 18, 60, 0.5)",
  },
  golden_star: {
    kind: "golden_star",
    name: "Golden Starfruit",
    radius: 32,
    points: 8,
    outerColor: "#f59e0b",
    innerColor: "#fbbf24",
    rindColor: "#fef08a",
    seedColor: "#ffffff",
    juiceColor: "rgba(251, 191, 36, 0.95)",
    splashColor: "rgba(245, 158, 11, 0.6)",
  },
  freeze_banana: {
    kind: "freeze_banana",
    name: "Freeze Banana",
    radius: 29,
    points: 4,
    outerColor: "#38bdf8",
    innerColor: "#e0f2fe",
    rindColor: "#0284c7",
    seedColor: "#bae6fd",
    juiceColor: "rgba(56, 189, 248, 0.95)",
    splashColor: "rgba(2, 132, 199, 0.6)",
  },
  frenzy_banana: {
    kind: "frenzy_banana",
    name: "Frenzy Banana",
    radius: 29,
    points: 4,
    outerColor: "#f43f5e",
    innerColor: "#fef08a",
    rindColor: "#e11d48",
    seedColor: "#fbbf24",
    juiceColor: "rgba(244, 63, 94, 0.95)",
    splashColor: "rgba(225, 29, 72, 0.6)",
  },
  bomb: {
    kind: "bomb",
    name: "Fuse Bomb",
    radius: 28,
    points: 0,
    outerColor: "#18181b",
    innerColor: "#ef4444",
    rindColor: "#d97706",
    juiceColor: "rgba(239, 68, 68, 1)",
    splashColor: "rgba(239, 68, 68, 0.8)",
  },
};

// ── Physics Entities ──
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
  fuseTimer: number;
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
  side: 1 | -1;
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

interface JuiceDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface StarburstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
}

interface BladeSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface BladePoint {
  x: number;
  y: number;
  time: number;
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
  const initialDiff = (match?.difficulty?.toLowerCase() as BotDifficulty) || "medium";
  const [inMenu, setInMenu] = useState(false);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);
  const [selectedBlade, setSelectedBlade] = useState(0);

  // Score & Strikes
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [comboCount, setComboCount] = useState(0);

  // Special Banana Powerup Timers (in seconds)
  const [freezeTimer, setFreezeTimer] = useState(0);
  const [frenzyTimer, setFrenzyTimer] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active game loop state
  const fruitsRef = useRef<FruitEntity[]>([]);
  const slicedHalvesRef = useRef<SlicedHalf[]>([]);
  const juiceSplattersRef = useRef<JuiceSplatter[]>([]);
  const dropletsRef = useRef<JuiceDroplet[]>([]);
  const starburstsRef = useRef<StarburstParticle[]>([]);
  const bladeSparksRef = useRef<BladeSpark[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const bladePointsRef = useRef<BladePoint[]>([]);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);
  const isPointerDownRef = useRef(false);
  const screenFlashRef = useRef(0);

  // Combo streak detection
  const recentSliceTimes = useRef<number[]>([]);

  // Sound Mute
  const [isMuted, setIsMuted] = useState(false);

  // Spawn fresh wave of fruits (floaty, graceful parabolic arcs)
  const spawnFruitWave = useCallback(
    (isFrenzyWave = false) => {
      if (gameOver || inMenu) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const count = isFrenzyWave ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3);
      const regularKinds: FruitKind[] = [
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
        // Powerups & Bombs logic
        // In Easy mode or Frenzy mode, zero bombs!
        const allowBomb = !isFrenzyWave && botDiff !== "easy" && Math.random() < 0.12;
        const isFreeze = !allowBomb && Math.random() < 0.08;
        const isFrenzy = !allowBomb && !isFreeze && Math.random() < 0.06;
        const isGolden = !allowBomb && !isFreeze && !isFrenzy && Math.random() < 0.06;

        let kind: FruitKind;
        if (allowBomb) kind = "bomb";
        else if (isFreeze) kind = "freeze_banana";
        else if (isFrenzy) kind = "frenzy_banana";
        else if (isGolden) kind = "golden_star";
        else kind = regularKinds[Math.floor(Math.random() * regularKinds.length)];

        const def = FRUIT_DEFS[kind];

        // Launch from bottom
        let startX: number;
        let targetX: number;

        if (isFrenzyWave) {
          // Frenzy: launch from left or right margins across the screen
          const fromLeft = Math.random() < 0.5;
          startX = fromLeft ? -20 : canvas.width + 20;
          targetX = fromLeft ? canvas.width * 0.55 + Math.random() * 100 : canvas.width * 0.45 - Math.random() * 100;
        } else {
          startX = 50 + Math.random() * (canvas.width - 100);
          targetX = canvas.width * 0.3 + Math.random() * (canvas.width * 0.4);
        }

        const startY = canvas.height + 35;

        // Floaty, slow physics: Low gravity & generous hang time
        const gravity = 0.20;
        const arcHeight = canvas.height * 0.52 + Math.random() * (canvas.height * 0.22);
        const timeToPeak = Math.sqrt((2 * arcHeight) / gravity);
        const vy = -gravity * timeToPeak;
        const vx = (targetX - startX) / (timeToPeak * 1.35);

        fruitsRef.current.push({
          id: Date.now() + Math.random(),
          kind,
          x: startX,
          y: startY,
          vx,
          vy,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.05, // slow, graceful rotation
          radius: def.radius,
          isSliced: false,
          sliceAngle: 0,
          fuseTimer: 0,
        });

        if (kind === "bomb" && !isMuted) {
          arcadeSfx.playBombFuse();
        }
      }
    },
    [gameOver, inMenu, isMuted, botDiff]
  );

  // Start game session
  const startGame = useCallback(
    (diff?: BotDifficulty) => {
      if (diff) setBotDiff(diff);
      setScore(0);
      setStrikes(0);
      setGameOver(false);
      setComboCount(0);
      setFreezeTimer(0);
      setFrenzyTimer(0);
      fruitsRef.current = [];
      slicedHalvesRef.current = [];
      juiceSplattersRef.current = [];
      dropletsRef.current = [];
      starburstsRef.current = [];
      bladeSparksRef.current = [];
      floatingTextsRef.current = [];
      bladePointsRef.current = [];
      recentSliceTimes.current = [];
      setInMenu(false);
      spawnFruitWave();
    },
    [spawnFruitWave]
  );

  // Periodic fruit wave spawner
  useEffect(() => {
    if (inMenu || gameOver) return;
    spawnFruitWave();
    const intervalTime = frenzyTimer > 0 ? 900 : 2500; // slow relaxed wave frequency
    const t = setInterval(() => {
      spawnFruitWave(frenzyTimer > 0);
    }, intervalTime);
    return () => clearInterval(t);
  }, [inMenu, gameOver, spawnFruitWave, frenzyTimer]);

  // Freeze & Frenzy Countdown Timers
  useEffect(() => {
    if (inMenu || gameOver) return;
    const interval = setInterval(() => {
      setFreezeTimer((prev) => Math.max(0, prev - 1));
      setFrenzyTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [inMenu, gameOver]);

  // Handle fruit slicing
  const sliceFruit = useCallback(
    (fruit: FruitEntity, cutAngle: number) => {
      if (fruit.isSliced) return;
      fruit.isSliced = true;
      const def = FRUIT_DEFS[fruit.kind];

      if (fruit.kind === "bomb") {
        // Bomb detonated!
        if (!isMuted) arcadeSfx.playBombExplosion();
        screenFlashRef.current = 1.0;
        setGameOver(true);
        setStrikes(3);
        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 20,
          text: "💥 BOMB DETONATED!",
          color: "#ef4444",
          size: 22,
          alpha: 1,
          vy: -1.5,
        });
        return;
      }

      // Check for Special Bananas
      if (fruit.kind === "freeze_banana") {
        setFreezeTimer(5);
        if (!isMuted) arcadeSfx.playFreezeBanana();
        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 30,
          text: "❄️ FREEZE! SLOW-MO",
          color: "#38bdf8",
          size: 20,
          alpha: 1,
          vy: -1.8,
        });
      } else if (fruit.kind === "frenzy_banana") {
        setFrenzyTimer(5);
        if (!isMuted) arcadeSfx.playFrenzyBanana();
        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 30,
          text: "🍌 FRUIT FRENZY!",
          color: "#f43f5e",
          size: 20,
          alpha: 1,
          vy: -1.8,
        });
      }

      // Critical Slice check (6% chance on normal fruits)
      const isCritical = fruit.kind !== "freeze_banana" && fruit.kind !== "frenzy_banana" && Math.random() < 0.07;
      if (isCritical) {
        screenFlashRef.current = 0.6;
        if (!isMuted) arcadeSfx.playCriticalSlice();

        // Burst of starburst particles
        for (let s = 0; s < 18; s++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sSpd = 3 + Math.random() * 6;
          starburstsRef.current.push({
            x: fruit.x,
            y: fruit.y,
            vx: Math.cos(sAngle) * sSpd,
            vy: Math.sin(sAngle) * sSpd,
            color: "#facc15",
            size: 4 + Math.random() * 5,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.2,
          });
        }

        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 45,
          text: "🌟 CRITICAL! +10",
          color: "#facc15",
          size: 22,
          alpha: 1,
          vy: -2,
        });
      } else {
        if (!isMuted) arcadeSfx.playFruitSquish();
      }

      // Track combo window (400ms generous window)
      const now = performance.now();
      recentSliceTimes.current.push(now);
      recentSliceTimes.current = recentSliceTimes.current.filter((t) => now - t < 400);
      const currentCombo = recentSliceTimes.current.length;

      let gainedPoints = def.points + (isCritical ? 10 : 0);
      if (currentCombo >= 3) {
        const bonus = currentCombo * 2;
        gainedPoints += bonus;
        if (!isMuted) arcadeSfx.playComboFanfare(currentCombo);
        setComboCount(currentCombo);

        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y - 25,
          text: `⚡ ${currentCombo} HIT COMBO! +${bonus}`,
          color: "#f59e0b",
          size: 19,
          alpha: 1,
          vy: -1.8,
        });
      }

      setScore((prev) => {
        const next = prev + gainedPoints;
        setHighScore((h) => Math.max(h, next));
        return next;
      });

      if (!isCritical && currentCombo < 3) {
        floatingTextsRef.current.push({
          id: Math.random(),
          x: fruit.x,
          y: fruit.y,
          text: `+${def.points}`,
          color: def.outerColor,
          size: 16,
          alpha: 1,
          vy: -1.2,
        });
      }

      // Wall Splatter (viscous dripping stain that sticks to dojo wood)
      const numDrips = 2 + Math.floor(Math.random() * 3);
      const drips = [];
      for (let d = 0; d < numDrips; d++) {
        drips.push({
          x: (Math.random() - 0.5) * def.radius * 1.4,
          y: (Math.random() - 0.5) * def.radius,
          len: 12 + Math.random() * 30,
        });
      }
      juiceSplattersRef.current.push({
        x: fruit.x,
        y: fruit.y,
        radius: def.radius * (0.8 + Math.random() * 0.4),
        color: def.splashColor,
        alpha: 0.85,
        drips,
      });
      if (juiceSplattersRef.current.length > 25) {
        juiceSplattersRef.current.shift();
      }

      // Dynamic flying juice droplets
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6;
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
      const splitSpeed = 2.8;

      slicedHalvesRef.current.push({
        id: Math.random(),
        kind: fruit.kind,
        x: fruit.x - Math.cos(perpAngle) * 8,
        y: fruit.y - Math.sin(perpAngle) * 8,
        vx: fruit.vx - Math.cos(perpAngle) * splitSpeed,
        vy: fruit.vy - Math.sin(perpAngle) * splitSpeed - 1,
        rotation: fruit.rotation,
        vRot: fruit.vRot - 0.06,
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
        vRot: fruit.vRot + 0.06,
        sliceAngle: cutAngle,
        side: -1,
        alpha: 1,
      });
    },
    [isMuted]
  );

  // Line segment to Circle distance intersection test with generous slicing hitbox
  const checkBladeIntersection = useCallback(
    (p1: BladePoint, p2: BladePoint) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 16) return;
      const cutAngle = Math.atan2(dy, dx);

      fruitsRef.current.forEach((fruit) => {
        if (fruit.isSliced) return;

        // Generous hitbox for fruits (1.45x) and safe tighter hitbox for bombs (0.85x)
        const hitRadius = fruit.radius * (fruit.kind === "bomb" ? 0.85 : 1.45);

        // Projection of fruit center onto line segment
        const u = Math.max(0, Math.min(1, ((fruit.x - p1.x) * dx + (fruit.y - p1.y) * dy) / lenSq));
        const closestX = p1.x + u * dx;
        const closestY = p1.y + u * dy;
        const distSq = (fruit.x - closestX) * (fruit.x - closestX) + (fruit.y - closestY) * (fruit.y - closestY);

        if (distSq <= hitRadius * hitRadius) {
          sliceFruit(fruit, cutAngle);
        }
      });
    },
    [sliceFruit]
  );

  // AI Sensei Bot Simulation (Gentle companion that never hits bombs)
  useEffect(() => {
    if (inMenu || gameOver) return;

    // Bot interval: Easy mode is a calm safety-net guardian, Medium is relaxed, Hard is friendly sparring
    const intervalMs = botDiff === "easy" ? 1800 : botDiff === "medium" ? 1200 : 750;
    const interval = setInterval(() => {
      const unsliced = fruitsRef.current.filter((f) => !f.isSliced);
      if (unsliced.length === 0) return;

      // BOT NEVER HITS BOMBS!
      const targetFruits = unsliced.filter((f) => f.kind !== "bomb");
      if (targetFruits.length === 0) return;

      let target: FruitEntity | undefined;
      if (botDiff === "easy") {
        // Easy bot acts as Guardian Sensei: only assists if a fruit is falling low (y > 470) to prevent strikes!
        target = targetFruits.find((f) => f.y > 470 && f.vy > 0);
      } else {
        // Medium & Hard: gently slice a fruit near apex
        target = targetFruits.find((f) => f.vy > -1 && f.y < 460) || targetFruits[0];
      }

      if (!target) return;

      // Execute smooth visual slice
      const angle = (Math.random() - 0.5) * Math.PI;
      const swipeDist = target.radius * 2.6;
      const p1 = {
        x: target.x - Math.cos(angle) * swipeDist,
        y: target.y - Math.sin(angle) * swipeDist,
        time: performance.now(),
      };
      const p2 = {
        x: target.x + Math.cos(angle) * swipeDist,
        y: target.y + Math.sin(angle) * swipeDist,
        time: performance.now(),
      };

      bladePointsRef.current.push(p1);
      bladePointsRef.current.push(p2);

      if (!isMuted) arcadeSfx.playBladeSwipe();
      sliceFruit(target, angle);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [inMenu, gameOver, botDiff, isMuted, sliceFruit]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floaty slow-motion physics scale
      const timeScale = freezeTimer > 0 ? 0.35 : 1.0;
      const gravity = 0.20 * timeScale;

      // ── 1. Authentic Fruit Ninja Japanese Cedar Wood Dojo Background ──
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#2c180b");
      grad.addColorStop(0.5, "#3d2210");
      grad.addColorStop(1, "#201107");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vertical cedar wood plank seams with wood rivets
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 2;
      for (let x = 60; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        // Wooden nail rivets
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        for (let ny = 80; ny < canvas.height; ny += 140) {
          ctx.beginPath();
          ctx.arc(x - 3, ny, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Traditional Sensei Dojo Crest
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 95, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── 2. Wall Juice Splatters (viscous stains with gravity drips) ──
      juiceSplattersRef.current.forEach((sp) => {
        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();

        sp.drips.forEach((dp) => {
          ctx.beginPath();
          ctx.moveTo(sp.x + dp.x, sp.y + dp.y);
          ctx.lineTo(sp.x + dp.x, sp.y + dp.y + dp.len);
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.stroke();
        });
        ctx.restore();

        sp.alpha -= 0.0004; // long-lasting juicy wall stain
      });
      juiceSplattersRef.current = juiceSplattersRef.current.filter((sp) => sp.alpha > 0);

      // ── 3. Active Airborne Fruits (3D rendered Fruit Ninja models) ──
      fruitsRef.current.forEach((fruit) => {
        fruit.x += fruit.vx * timeScale;
        fruit.y += fruit.vy * timeScale;
        fruit.vy += gravity;
        fruit.rotation += fruit.vRot * timeScale;

        if (fruit.isSliced) return;

        const def = FRUIT_DEFS[fruit.kind];

        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);

        if (fruit.kind === "bomb") {
          // Cast-Iron Round Bomb with danger skull & animated fuse spark
          ctx.shadowColor = "rgba(239, 68, 68, 0.4)";
          ctx.shadowBlur = 12;

          const bombGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, fruit.radius);
          bombGrad.addColorStop(0, "#52525b");
          bombGrad.addColorStop(0.4, "#27272a");
          bombGrad.addColorStop(1, "#09090b");
          ctx.fillStyle = bombGrad;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          // Iron rim collar
          ctx.fillStyle = "#3f3f46";
          ctx.fillRect(-6, -fruit.radius - 4, 12, 6);

          // Danger skull emblem
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💀", 0, 1);

          // Fuse rope
          fruit.fuseTimer += 0.25;
          const fuseTipX = 14;
          const fuseTipY = -fruit.radius - 12;
          ctx.strokeStyle = "#ca8a04";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -fruit.radius - 4);
          ctx.quadraticCurveTo(8, -fruit.radius - 8, fuseTipX, fuseTipY);
          ctx.stroke();

          // Sputtering spark particles
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(
            fuseTipX + (Math.random() - 0.5) * 5,
            fuseTipY + (Math.random() - 0.5) * 5,
            3 + Math.sin(fruit.fuseTimer) * 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (fruit.kind === "golden_star") {
          // 5-Point Shimmering Starfruit
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 20;
          ctx.fillStyle = "#fbbf24";
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
        } else if (fruit.kind === "freeze_banana" || fruit.kind === "frenzy_banana" || fruit.kind === "banana") {
          // Curved Crescent Banana Model
          const isFreeze = fruit.kind === "freeze_banana";
          const isFrenzy = fruit.kind === "frenzy_banana";

          ctx.shadowColor = isFreeze ? "#38bdf8" : isFrenzy ? "#f43f5e" : "#ca8a04";
          ctx.shadowBlur = isFreeze || isFrenzy ? 16 : 6;

          // Banana curved body
          ctx.fillStyle = isFreeze ? "#38bdf8" : isFrenzy ? "#fb7185" : "#facc15";
          ctx.beginPath();
          ctx.ellipse(0, 0, fruit.radius * 1.2, fruit.radius * 0.6, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Green stem tip
          ctx.fillStyle = isFreeze ? "#e0f2fe" : isFrenzy ? "#fda4af" : "#65a30d";
          ctx.fillRect(-fruit.radius * 1.2, -4, 8, 6);

          // Dark brown flower tip
          ctx.fillStyle = "#451a03";
          ctx.fillRect(fruit.radius * 1.15, -2, 5, 4);

          // Longitudinal facet highlight
          ctx.strokeStyle = isFreeze ? "#ffffff" : isFrenzy ? "#ffe4e6" : "#fef08a";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, -4, fruit.radius * 0.8, 0.2, Math.PI - 0.2);
          ctx.stroke();

          // Special icon overlay
          if (isFreeze) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("❄️", 0, 4);
          } else if (isFrenzy) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("⚡", 0, 4);
          }
        } else if (fruit.kind === "watermelon") {
          // 3D Spherical Watermelon with Jagged Dark-Green Stripes
          const melonGrad = ctx.createRadialGradient(-8, -8, 4, 0, 0, fruit.radius);
          melonGrad.addColorStop(0, "#22c55e");
          melonGrad.addColorStop(0.5, "#16a34a");
          melonGrad.addColorStop(1, "#14532d");
          ctx.fillStyle = melonGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, fruit.radius * 1.05, fruit.radius * 0.95, 0, 0, Math.PI * 2);
          ctx.fill();

          // Dark Green Longitudinal Tiger Stripes
          ctx.strokeStyle = "#052e16";
          ctx.lineWidth = 4;
          for (let st = -2; st <= 2; st++) {
            ctx.beginPath();
            ctx.moveTo(st * 11, -fruit.radius * 0.85);
            ctx.quadraticCurveTo(st * 16, 0, st * 11, fruit.radius * 0.85);
            ctx.stroke();
          }

          // Top stem
          ctx.fillStyle = "#78350f";
          ctx.fillRect(-2, -fruit.radius - 3, 4, 6);
        } else if (fruit.kind === "orange") {
          // 3D Spherical Orange with Stippled Citrus Rind
          const orangeGrad = ctx.createRadialGradient(-6, -6, 3, 0, 0, fruit.radius);
          orangeGrad.addColorStop(0, "#fb923c");
          orangeGrad.addColorStop(0.6, "#ea580c");
          orangeGrad.addColorStop(1, "#9a3412");
          ctx.fillStyle = orangeGrad;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          // Green stem rosette
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(0, -fruit.radius + 3, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (fruit.kind === "strawberry") {
          // Conical Heart Strawberry with Leafy Calyx Crown
          const berryGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, fruit.radius);
          berryGrad.addColorStop(0, "#f87171");
          berryGrad.addColorStop(0.5, "#dc2626");
          berryGrad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = berryGrad;
          ctx.beginPath();
          ctx.moveTo(0, fruit.radius);
          ctx.bezierCurveTo(-fruit.radius * 1.2, 0, -fruit.radius * 0.8, -fruit.radius * 0.8, 0, -fruit.radius * 0.7);
          ctx.bezierCurveTo(fruit.radius * 0.8, -fruit.radius * 0.8, fruit.radius * 1.2, 0, 0, fruit.radius);
          ctx.fill();

          // Yellow achene seed dots
          ctx.fillStyle = "#fef08a";
          for (let sy = -10; sy <= 12; sy += 7) {
            for (let sx = -12; sx <= 12; sx += 7) {
              if (Math.abs(sx) + Math.abs(sy) < fruit.radius * 1.1) {
                ctx.fillRect(sx, sy, 1.5, 2);
              }
            }
          }

          // Green Leafy Crown
          ctx.fillStyle = "#16a34a";
          for (let l = -2; l <= 2; l++) {
            ctx.beginPath();
            ctx.ellipse(l * 6, -fruit.radius * 0.7, 5, 8, l * 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (fruit.kind === "pineapple") {
          // Golden Pineapple with Diamond Scales and Spiky Leaf Crown
          const pineGrad = ctx.createRadialGradient(-6, -6, 3, 0, 0, fruit.radius);
          pineGrad.addColorStop(0, "#fde047");
          pineGrad.addColorStop(0.5, "#ca8a04");
          pineGrad.addColorStop(1, "#713f12");
          ctx.fillStyle = pineGrad;
          ctx.beginPath();
          ctx.ellipse(0, 4, fruit.radius * 0.85, fruit.radius * 1.05, 0, 0, Math.PI * 2);
          ctx.fill();

          // Diagonal diamond criss-cross mesh
          ctx.strokeStyle = "#854d0e";
          ctx.lineWidth = 1.5;
          for (let d = -16; d <= 16; d += 9) {
            ctx.beginPath();
            ctx.moveTo(d - 12, -fruit.radius + 6);
            ctx.lineTo(d + 12, fruit.radius + 4);
            ctx.moveTo(d + 12, -fruit.radius + 6);
            ctx.lineTo(d - 12, fruit.radius + 4);
            ctx.stroke();
          }

          // Spiky green bromeliad crown leaves
          ctx.fillStyle = "#15803d";
          for (let pl = -3; pl <= 3; pl++) {
            ctx.beginPath();
            ctx.moveTo(pl * 4, -fruit.radius * 0.6);
            ctx.lineTo(pl * 7, -fruit.radius * 1.4);
            ctx.lineTo(pl * 4 + 4, -fruit.radius * 0.6);
            ctx.fill();
          }
        } else {
          // Generic 3D Shaded Sphere (Coconut, Kiwi, Dragonfruit)
          const radGrad = ctx.createRadialGradient(-fruit.radius * 0.2, -fruit.radius * 0.2, 3, 0, 0, fruit.radius);
          radGrad.addColorStop(0, def.innerColor);
          radGrad.addColorStop(0.7, def.outerColor);
          radGrad.addColorStop(1, "#18181b");
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          if (fruit.kind === "dragonfruit") {
            // Green dragonfruit scale tips
            ctx.fillStyle = "#4ade80";
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * fruit.radius * 0.8, Math.sin(a) * fruit.radius * 0.8);
              ctx.lineTo(Math.cos(a) * fruit.radius * 1.25, Math.sin(a) * fruit.radius * 1.25);
              ctx.lineTo(Math.cos(a + 0.3) * fruit.radius * 0.85, Math.sin(a + 0.3) * fruit.radius * 0.85);
              ctx.fill();
            }
          }
        }

        ctx.restore();
      });

      // Strike Check: Regular fruits falling past the bottom of the screen
      fruitsRef.current.forEach((fruit) => {
        if (!fruit.isSliced && fruit.y > canvas.height + 50 && fruit.vy > 0) {
          if (fruit.kind !== "bomb" && fruit.kind !== "freeze_banana" && fruit.kind !== "frenzy_banana") {
            // Register a Strike!
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
      fruitsRef.current = fruitsRef.current.filter((f) => f.y <= canvas.height + 60);

      // ── 4. Sliced Fruit Halves with Authentic Cross-Section Pulp & Seeds ──
      slicedHalvesRef.current.forEach((half) => {
        half.x += half.vx * timeScale;
        half.y += half.vy * timeScale;
        half.vy += gravity * 1.1;
        half.rotation += half.vRot * timeScale;
        half.alpha = Math.max(0, half.alpha - 0.009 * timeScale);

        const def = FRUIT_DEFS[half.kind];
        ctx.save();
        ctx.globalAlpha = half.alpha;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);

        // Semicircular Half Clip
        ctx.beginPath();
        ctx.arc(0, 0, def.radius, 0, Math.PI, half.side === 1);
        ctx.closePath();
        ctx.clip();

        // 1. Outer Skin
        ctx.fillStyle = def.outerColor;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
        ctx.fill();

        // 2. White Albedo / Pith Rind
        ctx.fillStyle = def.rindColor;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius * 0.88, 0, Math.PI * 2);
        ctx.fill();

        // 3. Juicy Flesh Face
        ctx.fillStyle = def.innerColor;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius * 0.78, 0, Math.PI * 2);
        ctx.fill();

        // 4. Species-Specific Cross-Section Anatomy
        if (half.kind === "watermelon") {
          // Teardrop black watermelon seeds
          ctx.fillStyle = "#18181b";
          for (let sd = -2; sd <= 2; sd++) {
            ctx.beginPath();
            ctx.ellipse(sd * 9, half.side * 12, 2, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (half.kind === "orange") {
          // Radial citrus segment spokes
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.2;
          for (let sp = 0; sp < Math.PI; sp += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(sp) * def.radius * 0.75, Math.sin(sp) * def.radius * 0.75);
            ctx.stroke();
          }
        } else if (half.kind === "kiwi") {
          // White core + black seed sunburst
          ctx.fillStyle = "#ecfccb";
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#18181b";
          for (let a = 0; a < Math.PI; a += 0.3) {
            ctx.fillRect(Math.cos(a) * 11, Math.sin(a) * 11, 1.5, 1.5);
          }
        } else if (half.kind === "coconut") {
          // Pure white thick coconut meat with dark center
          ctx.fillStyle = "#18181b";
          ctx.beginPath();
          ctx.arc(0, 0, def.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        // Exposed glistening slice cut line
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-def.radius, 0);
        ctx.lineTo(def.radius, 0);
        ctx.stroke();

        ctx.restore();
      });
      slicedHalvesRef.current = slicedHalvesRef.current.filter((h) => h.alpha > 0);

      // ── 5. Airborne Liquid Droplets ──
      dropletsRef.current.forEach((d) => {
        d.x += d.vx * timeScale;
        d.y += d.vy * timeScale;
        d.vy += gravity * 0.8;
        d.alpha -= 0.015 * timeScale;

        ctx.save();
        ctx.fillStyle = d.color;
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      dropletsRef.current = dropletsRef.current.filter((d) => d.alpha > 0);

      // ── 6. Starburst Critical Particles ──
      starburstsRef.current.forEach((st) => {
        st.x += st.vx * timeScale;
        st.y += st.vy * timeScale;
        st.rotation += st.vRot;
        st.alpha -= 0.02 * timeScale;

        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(st.rotation);
        ctx.fillStyle = st.color;
        ctx.globalAlpha = Math.max(0, st.alpha);
        ctx.fillRect(-st.size / 2, -st.size / 2, st.size, st.size);
        ctx.restore();
      });
      starburstsRef.current = starburstsRef.current.filter((st) => st.alpha > 0);

      // ── 7. Floating Comic Badges & Combos ──
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy * timeScale;
        ft.alpha -= 0.015 * timeScale;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = `900 ${ft.size}px monospace`;
        ctx.textAlign = "center";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

      // ── 8. Trailing Blade Sparks ──
      bladeSparksRef.current.forEach((spk) => {
        spk.x += spk.vx;
        spk.y += spk.vy;
        spk.alpha -= 0.03;

        ctx.save();
        ctx.fillStyle = spk.color;
        ctx.globalAlpha = Math.max(0, spk.alpha);
        ctx.beginPath();
        ctx.arc(spk.x, spk.y, spk.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      bladeSparksRef.current = bladeSparksRef.current.filter((spk) => spk.alpha > 0);

      // ── 9. Glowing Razor Blade Swipe Trail ──
      const now = performance.now();
      bladePointsRef.current = bladePointsRef.current.filter((pt) => now - pt.time < 190);

      if (bladePointsRef.current.length > 1) {
        const blade = BLADE_STYLES[selectedBlade];
        ctx.save();
        ctx.shadowColor = blade.glow;
        ctx.shadowBlur = 16;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < bladePointsRef.current.length; i++) {
          const p1 = bladePointsRef.current[i - 1];
          const p2 = bladePointsRef.current[i];
          const age = (now - p2.time) / 190;
          const width = (1 - age) * 11; // bold tapered blade trail

          // Outer luminous glow
          ctx.strokeStyle = blade.color;
          ctx.lineWidth = Math.max(1, width);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // White incandescent core
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1, width * 0.45);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── 10. Freeze Slow-Motion Screen Border Vignette ──
      if (freezeTimer > 0) {
        ctx.save();
        const freezeVignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.height * 0.35,
          canvas.width / 2,
          canvas.height / 2,
          canvas.height * 0.65
        );
        freezeVignette.addColorStop(0, "rgba(56, 189, 248, 0)");
        freezeVignette.addColorStop(1, "rgba(2, 132, 199, 0.45)");
        ctx.fillStyle = freezeVignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ice crystals at screen corners
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("❄️", 15, 30);
        ctx.fillText("❄️", canvas.width - 30, 30);
        ctx.restore();
      }

      // ── 11. Screen Flash Overlay (Critical Strike / Bomb Detonation) ──
      if (screenFlashRef.current > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlashRef.current})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        screenFlashRef.current = Math.max(0, screenFlashRef.current - 0.08);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, selectedBlade, isMuted, freezeTimer]);

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
    if (!isMuted) arcadeSfx.playBladeSwipe();
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

      // Push glowing tip spark
      const blade = BLADE_STYLES[selectedBlade];
      bladeSparksRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: blade.color,
        size: 2 + Math.random() * 3,
        alpha: 1,
      });
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

  // Pre-Game Modal (accessible via Dojo Menu button)
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
              <span className="absolute text-5xl translate-x-7 -translate-y-4 animate-pulse">🗡️</span>
            </div>
          }
          howToPlaySteps={[
            {
              title: "Swipe to Slice",
              desc: "Drag or swipe across the canvas to carve through fruits with precision razor cuts.",
              icon: "🗡️",
            },
            {
              title: "Special Bananas",
              desc: "Slice Freeze Bananas for slow-motion matrix time and Frenzy Bananas for a massive fruit deluge!",
              icon: "🍌",
            },
            {
              title: "Critical Slices",
              desc: "Lucky strikes trigger gold starburst Critical Slices awarding +10 bonus points!",
              icon: "🌟",
            },
            {
              title: "Avoid Bombs",
              desc: "Slicing a sizzling fuse bomb triggers an instant devastating detonation!",
              icon: "💣",
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
          title="Exit to Lounge"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score Readout */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-3.5 py-1 rounded-xl border border-white/10 shadow-md">
          <span className="text-xs font-black text-amber-400">SCORE</span>
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

      {/* ── Active Powerup Indicators ── */}
      {(freezeTimer > 0 || frenzyTimer > 0) && (
        <div className="w-full flex items-center justify-center gap-2 my-0.5 z-30 animate-pulse">
          {freezeTimer > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-black uppercase">
              ❄️ FREEZE SLOW-MO: {freezeTimer}s
            </span>
          )}
          {frenzyTimer > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 text-[10px] font-black uppercase">
              🍌 FRENZY DELUGE: {frenzyTimer}s
            </span>
          )}
        </div>
      )}

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
                onClick={() => (onBack ? onBack() : setInMenu(true))}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs uppercase rounded-xl border border-neutral-800 transition-all cursor-pointer"
              >
                EXIT TO LOUNGE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Game Footer Status ── */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono px-2 py-1">
        <span>SENSEI AI: {botDiff.toUpperCase()} (SAFE ASSIST)</span>
        <span>SWIPE TO SLICE • 60 FPS</span>
      </div>
    </div>
  );
}
