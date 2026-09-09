"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Trophy, Shield, AlertTriangle, Sparkles } from "lucide-react";

interface TrafficJamGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Car {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  angularVel: number;
  radius: number;
  color: string;
  isFallen: boolean;
  fallScale: number;
  isBoosting: boolean;
  boostCharge: number; // 0 to 100
  bumperSquash: number; // 0 to 1 for impact compression
  squashAngle: number;
}

interface SkidMark {
  x: number;
  y: number;
  angle: number;
  opacity: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface WaterSplash {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface CrackLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  opacity: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface SinkingSlab {
  angle: number;
  distance: number;
  scale: number;
  alpha: number;
  tilt: number;
}

export default function TrafficJamGame({
  match,
  currentUid,
  onBack,
}: TrafficJamGameProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Match score (First to 3 wins)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Arena shrinking stage
  const INITIAL_RADIUS = 152;
  const [arenaRadius, setArenaRadius] = useState(INITIAL_RADIUS);
  const [shrinkTimer, setShrinkTimer] = useState(15);
  const [isWobbling, setIsWobbling] = useState(false);
  const [screenShake, setScreenShake] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const p1Ref = useRef<Car>({
    x: 125,
    y: 190,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    angularVel: 0,
    radius: 17,
    color: "#ef4444",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
    bumperSquash: 0,
    squashAngle: 0,
  });

  const p2Ref = useRef<Car>({
    x: 235,
    y: 190,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    speed: 0,
    angularVel: 0,
    radius: 17,
    color: "#3b82f6",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
    bumperSquash: 0,
    squashAngle: 0,
  });

  const skidMarksRef = useRef<SkidMark[]>([]);
  const smokeParticlesRef = useRef<SmokeParticle[]>([]);
  const splashesRef = useRef<WaterSplash[]>([]);
  const cracksRef = useRef<CrackLine[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const sinkingSlabsRef = useRef<SinkingSlab[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; r: number; alpha: number; color: string }[]>([]);
  const splashId = useRef(1);

  // Controls for P1 & P2
  const p1InputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const p2InputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2.5)), 30);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Wins(0);
    setP2Wins(0);
    setMatchWinner(null);
    setRoundWinner(null);
    setInMenu(false);
    resetRound();
  }, []);

  const resetRound = useCallback(() => {
    setRoundOver(false);
    setRoundWinner(null);
    setArenaRadius(INITIAL_RADIUS);
    setShrinkTimer(15);
    setIsWobbling(false);
    skidMarksRef.current = [];
    smokeParticlesRef.current = [];
    splashesRef.current = [];
    cracksRef.current = [];
    sparksRef.current = [];
    sinkingSlabsRef.current = [];
    shockwavesRef.current = [];

    p1Ref.current = {
      x: 125,
      y: 190,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      angularVel: 0,
      radius: 17,
      color: "#ef4444",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
      bumperSquash: 0,
      squashAngle: 0,
    };

    p2Ref.current = {
      x: 235,
      y: 190,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      angularVel: 0,
      radius: 17,
      color: "#3b82f6",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
      bumperSquash: 0,
      squashAngle: 0,
    };
  }, []);

  // Arena collapse timer
  useEffect(() => {
    if (inMenu || roundOver || matchWinner) return;

    const interval = setInterval(() => {
      setShrinkTimer((prev) => {
        if (prev === 5) {
          // Warning wobble & perimeter fissure cracks
          setIsWobbling(true);
          arcadeSfx.playButtonTap();
          for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            cracksRef.current.push({
              startX: 180 + Math.cos(angle) * (arenaRadius - 28),
              startY: 190 + Math.sin(angle) * (arenaRadius - 28),
              endX: 180 + Math.cos(angle) * arenaRadius,
              endY: 190 + Math.sin(angle) * arenaRadius,
              opacity: 1,
            });
          }
        }

        if (prev <= 1) {
          // Collapse outer slabs into ocean
          const nextRadius = Math.max(65, arenaRadius - 26);
          setArenaRadius(nextRadius);
          setIsWobbling(false);
          cracksRef.current = [];
          arcadeSfx.playCarBump();
          setScreenShake(8);

          // Spawn sinking slabs
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            sinkingSlabsRef.current.push({
              angle: a,
              distance: arenaRadius - 10,
              scale: 1,
              alpha: 1,
              tilt: (Math.random() - 0.5) * 0.4,
            });
          }

          // Water ring splashes
          for (let a = 0; a < Math.PI * 2; a += 0.5) {
            splashesRef.current.push({
              id: splashId.current++,
              x: 180 + Math.cos(a) * (arenaRadius - 10),
              y: 190 + Math.sin(a) * (arenaRadius - 10),
              radius: 8,
              maxRadius: 24,
              opacity: 1,
            });
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inMenu, roundOver, matchWinner, arenaRadius]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P1
      if (e.key === "w" || e.key === "W") p1InputRef.current.up = true;
      if (e.key === "s" || e.key === "S") p1InputRef.current.down = true;
      if (e.key === "a" || e.key === "A") p1InputRef.current.left = true;
      if (e.key === "d" || e.key === "D") p1InputRef.current.right = true;
      if (e.code === "Space" || e.key === "Shift") triggerBoost("p1");

      // P2 (Dual local keyboard)
      if (e.key === "ArrowUp" || e.key === "i" || e.key === "I") p2InputRef.current.up = true;
      if (e.key === "ArrowDown" || e.key === "k" || e.key === "K") p2InputRef.current.down = true;
      if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") p2InputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") p2InputRef.current.right = true;
      if (e.key === "Enter" || e.key === "o" || e.key === "O") triggerBoost("p2");
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // P1
      if (e.key === "w" || e.key === "W") p1InputRef.current.up = false;
      if (e.key === "s" || e.key === "S") p1InputRef.current.down = false;
      if (e.key === "a" || e.key === "A") p1InputRef.current.left = false;
      if (e.key === "d" || e.key === "D") p1InputRef.current.right = false;

      // P2
      if (e.key === "ArrowUp" || e.key === "i" || e.key === "I") p2InputRef.current.up = false;
      if (e.key === "ArrowDown" || e.key === "k" || e.key === "K") p2InputRef.current.down = false;
      if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") p2InputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") p2InputRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Trigger Nitro Boost
  const triggerBoost = (who: "p1" | "p2") => {
    const car = who === "p1" ? p1Ref.current : p2Ref.current;
    if (car.boostCharge >= 35 && !car.isFallen) {
      car.boostCharge -= 35;
      car.isBoosting = true;
      car.speed = Math.min(6.6, car.speed + 3.2);
      arcadeSfx.playWhoosh();
      setScreenShake(6);

      // Nitro exhaust puff
      for (let i = 0; i < 8; i++) {
        smokeParticlesRef.current.push({
          x: car.x - Math.cos(car.angle) * car.radius,
          y: car.y - Math.sin(car.angle) * car.radius,
          vx: -Math.cos(car.angle) * 3 + (Math.random() - 0.5) * 2,
          vy: -Math.sin(car.angle) * 3 + (Math.random() - 0.5) * 2,
          radius: 3 + Math.random() * 4,
          alpha: 0.9,
        });
      }

      setTimeout(() => {
        car.isBoosting = false;
      }, 380);
    }
  };

  // Upgraded Predator Bot AI with Tactical Flanking & Edge Shove
  const updateBotAI = () => {
    if (playMode !== "bot") return;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    if (p2.isFallen || p1.isFallen) return;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.hypot(dx, dy);

    // Calculate nearest edge from P1 to shove them into water!
    const p1AngleFromCenter = Math.atan2(p1.y - 190, p1.x - 180);
    const p2DistFromCenter = Math.hypot(p2.x - 180, p2.y - 190);
    const isNearEdge = p2DistFromCenter > arenaRadius - 38;

    // Tactical target: If hard bot, aim for P1's center-side to shove them OUTWARDS
    let targetX = p1.x;
    let targetY = p1.y;

    if (botDiff === "hard" && dist > 40) {
      // Flank around: position between P1 and center
      const pushX = p1.x - Math.cos(p1AngleFromCenter) * 16;
      const pushY = p1.y - Math.sin(p1AngleFromCenter) * 16;
      targetX = pushX;
      targetY = pushY;
    }

    const tdx = targetX - p2.x;
    const tdy = targetY - p2.y;
    const targetAngle = Math.atan2(tdy, tdx);

    let diffAngle = targetAngle - p2.angle;
    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    const turnRate = botDiff === "hard" ? 0.13 : botDiff === "medium" ? 0.085 : 0.055;

    // If P2 is close to the falling edge, prioritize emergency center steering
    if (isNearEdge && (botDiff !== "easy" || Math.random() < 0.6)) {
      const centerAngle = Math.atan2(190 - p2.y, 180 - p2.x);
      let cDiff = centerAngle - p2.angle;
      while (cDiff < -Math.PI) cDiff += Math.PI * 2;
      while (cDiff > Math.PI) cDiff -= Math.PI * 2;
      p2.angle += Math.sign(cDiff) * Math.min(Math.abs(cDiff), turnRate * 1.6);
      p2InputRef.current.up = true;
    } else {
      // Steer toward target
      p2.angle += Math.sign(diffAngle) * Math.min(Math.abs(diffAngle), turnRate);

      if (Math.abs(diffAngle) < 0.55) {
        p2InputRef.current.up = true;

        // Tactical Nitro Ram
        if (botDiff === "hard" && dist < 110 && Math.abs(diffAngle) < 0.22) {
          triggerBoost("p2");
        } else if (botDiff === "medium" && dist < 85 && Math.abs(diffAngle) < 0.35 && Math.random() < 0.08) {
          triggerBoost("p2");
        }
      } else {
        p2InputRef.current.up = botDiff === "hard" || Math.random() < 0.55;
      }
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
      // 1. Update Bot AI
      updateBotAI();

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // 2. Recharge Nitro Boosts
      if (p1.boostCharge < 100) p1.boostCharge = Math.min(100, p1.boostCharge + 0.3);
      if (p2.boostCharge < 100) p2.boostCharge = Math.min(100, p2.boostCharge + 0.3);

      // Recover bumper squash
      if (p1.bumperSquash > 0) p1.bumperSquash = Math.max(0, p1.bumperSquash - 0.08);
      if (p2.bumperSquash > 0) p2.bumperSquash = Math.max(0, p2.bumperSquash - 0.08);

      // 3. Process Player 1 Physics
      if (!p1.isFallen) {
        if (p1InputRef.current.left) p1.angle -= 0.08;
        if (p1InputRef.current.right) p1.angle += 0.08;

        if (p1InputRef.current.up) {
          p1.speed = Math.min(4.0, p1.speed + 0.18);
        } else if (p1InputRef.current.down) {
          p1.speed = Math.max(-2.2, p1.speed - 0.14);
        } else {
          p1.speed *= 0.94; // Friction
        }

        // Add velocity with inertia
        p1.vx = p1.vx * 0.9 + Math.cos(p1.angle) * p1.speed * 0.1;
        p1.vy = p1.vy * 0.9 + Math.sin(p1.angle) * p1.speed * 0.1;
        p1.x += Math.cos(p1.angle) * p1.speed + p1.vx;
        p1.y += Math.sin(p1.angle) * p1.speed + p1.vy;

        // Drifting Skid Marks & Tire Smoke
        const isTurningSharp = p1InputRef.current.left || p1InputRef.current.right;
        if (Math.abs(p1.speed) > 2.0 && (isTurningSharp || p1.isBoosting)) {
          skidMarksRef.current.push({
            x: p1.x - Math.cos(p1.angle) * 12,
            y: p1.y - Math.sin(p1.angle) * 12,
            angle: p1.angle,
            opacity: 0.75,
          });

          // Drift smoke puff
          if (Math.random() < 0.4) {
            smokeParticlesRef.current.push({
              x: p1.x - Math.cos(p1.angle) * 14 + (Math.random() - 0.5) * 6,
              y: p1.y - Math.sin(p1.angle) * 14 + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -0.4 - Math.random() * 0.5,
              radius: 3 + Math.random() * 3.5,
              alpha: 0.7,
            });
          }
        }
      } else {
        // Sinking into ocean
        p1.fallScale = Math.max(0, p1.fallScale - 0.035);
        p1.angle += 0.18;
      }

      // 4. Process Player 2 Physics
      if (!p2.isFallen) {
        if (p2InputRef.current.left) p2.angle -= 0.08;
        if (p2InputRef.current.right) p2.angle += 0.08;

        if (p2InputRef.current.up) {
          p2.speed = Math.min(4.0, p2.speed + 0.18);
        } else if (p2InputRef.current.down) {
          p2.speed = Math.max(-2.2, p2.speed - 0.14);
        } else {
          p2.speed *= 0.94;
        }

        p2.vx = p2.vx * 0.9 + Math.cos(p2.angle) * p2.speed * 0.1;
        p2.vy = p2.vy * 0.9 + Math.sin(p2.angle) * p2.speed * 0.1;
        p2.x += Math.cos(p2.angle) * p2.speed + p2.vx;
        p2.y += Math.sin(p2.angle) * p2.speed + p2.vy;

        const isTurningSharp = p2InputRef.current.left || p2InputRef.current.right;
        if (Math.abs(p2.speed) > 2.0 && (isTurningSharp || p2.isBoosting)) {
          skidMarksRef.current.push({
            x: p2.x - Math.cos(p2.angle) * 12,
            y: p2.y - Math.sin(p2.angle) * 12,
            angle: p2.angle,
            opacity: 0.75,
          });

          if (Math.random() < 0.4) {
            smokeParticlesRef.current.push({
              x: p2.x - Math.cos(p2.angle) * 14 + (Math.random() - 0.5) * 6,
              y: p2.y - Math.sin(p2.angle) * 14 + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -0.4 - Math.random() * 0.5,
              radius: 3 + Math.random() * 3.5,
              alpha: 0.7,
            });
          }
        }
      } else {
        p2.fallScale = Math.max(0, p2.fallScale - 0.035);
        p2.angle += 0.18;
      }

      // 5. Bumper-to-Bumper Elastic Impulse & Compression Physics
      if (!p1.isFallen && !p2.isFallen) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart
          const overlap = (minDist - dist) * 0.55;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Visual bumper squash
          p1.bumperSquash = 0.85;
          p1.squashAngle = Math.atan2(ny, nx) - p1.angle;
          p2.bumperSquash = 0.85;
          p2.squashAngle = Math.atan2(-ny, -nx) - p2.angle;

          // Impulse force calculation
          const boostMultiplier = (p1.isBoosting ? 2.2 : 1.0) + (p2.isBoosting ? 2.2 : 1.0);
          const force = (Math.abs(p1.speed) + Math.abs(p2.speed) + 2.8) * 1.45 * boostMultiplier;

          p1.vx = -nx * force;
          p1.vy = -ny * force;
          p2.vx = nx * force;
          p2.vy = ny * force;

          p1.speed *= -0.35;
          p2.speed *= -0.35;

          setScreenShake(Math.min(16, 5 + force * 1.3));
          arcadeSfx.playCarBump();

          // Shockwave at impact point
          const midX = (p1.x + p2.x) * 0.5;
          const midY = (p1.y + p2.y) * 0.5;
          shockwavesRef.current.push({
            x: midX,
            y: midY,
            r: 5,
            alpha: 1,
            color: "#facc15",
          });

          // Spawn friction welding sparks
          for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 3 + Math.random() * 7;
            sparksRef.current.push({
              x: midX,
              y: midY,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1,
              color: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#fde047" : "#f97316",
              size: 2 + Math.random() * 2,
            });
          }
        }
      }

      // 6. Check Ring-Outs / Ocean Plunges
      const p1Dist = Math.hypot(p1.x - 180, p1.y - 190);
      const p2Dist = Math.hypot(p2.x - 180, p2.y - 190);

      if (!p1.isFallen && p1Dist > arenaRadius) {
        p1.isFallen = true;
        arcadeSfx.playCarBump();
        splashesRef.current.push({
          id: splashId.current++,
          x: p1.x,
          y: p1.y,
          radius: 10,
          maxRadius: 36,
          opacity: 1,
        });
        handleRoundEnd("p2");
      }

      if (!p2.isFallen && p2Dist > arenaRadius) {
        p2.isFallen = true;
        arcadeSfx.playCarBump();
        splashesRef.current.push({
          id: splashId.current++,
          x: p2.x,
          y: p2.y,
          radius: 10,
          maxRadius: 36,
          opacity: 1,
        });
        handleRoundEnd("p1");
      }

      // =====================================================================
      // 7. CANVAS RENDERING
      // =====================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Deep Ocean Water Background
      const waterGrad = ctx.createRadialGradient(180, 190, 40, 180, 190, 220);
      waterGrad.addColorStop(0, "#0369a1");
      waterGrad.addColorStop(0.5, "#075985");
      waterGrad.addColorStop(0.85, "#0c4a6e");
      waterGrad.addColorStop(1, "#020617");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ocean Caustic Waves
      const t = Date.now() * 0.0022;
      ctx.lineWidth = 2;
      for (let r = arenaRadius + 14; r < 230; r += 22) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 - (r / 230) * 0.06})`;
        ctx.beginPath();
        ctx.arc(180, 190, r + Math.sin(t + r * 0.5) * 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sinking outer slabs (when ring collapsed)
      sinkingSlabsRef.current = sinkingSlabsRef.current
        .map((sl) => ({
          ...sl,
          scale: sl.scale - 0.02,
          alpha: sl.alpha - 0.025,
          distance: sl.distance + 0.5,
        }))
        .filter((sl) => sl.alpha > 0);

      sinkingSlabsRef.current.forEach((sl) => {
        ctx.save();
        ctx.translate(180, 190);
        ctx.rotate(sl.angle);
        ctx.translate(0, sl.distance);
        ctx.scale(sl.scale, sl.scale);
        ctx.globalAlpha = sl.alpha;
        ctx.fillStyle = "#334155";
        ctx.fillRect(-12, -8, 24, 16);
        ctx.restore();
      });

      // FLOATING ASPHALT ARENA ISLAND
      ctx.save();
      if (isWobbling) {
        ctx.translate((Math.random() - 0.5) * 4.0, (Math.random() - 0.5) * 4.0);
      }

      // Platform Outer Drop Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.beginPath();
      ctx.arc(180, 200, arenaRadius + 2, 0, Math.PI * 2);
      ctx.fill();

      // Concrete Curb Edge Rim
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Safety Hazard Stripes / Warning Beacons on Rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius + 4, 0, Math.PI * 2);
      ctx.arc(180, 190, arenaRadius - 7, 0, Math.PI * 2, true);
      ctx.clip();

      const stripeCount = 28;
      for (let i = 0; i < stripeCount; i++) {
        const a = (i * Math.PI * 2) / stripeCount;
        ctx.fillStyle =
          isWobbling && Math.floor(Date.now() / 150) % 2 === 0
            ? i % 2 === 0 ? "#ef4444" : "#111827"
            : i % 2 === 0 ? "#eab308" : "#0f172a";
        ctx.beginPath();
        ctx.moveTo(180, 190);
        ctx.arc(180, 190, arenaRadius + 12, a, a + (Math.PI * 2) / stripeCount);
        ctx.fill();
      }
      ctx.restore();

      // Inner Asphalt Tarmac Surface
      const asphaltGrad = ctx.createRadialGradient(180, 190, 8, 180, 190, arenaRadius);
      asphaltGrad.addColorStop(0, "#27272a");
      asphaltGrad.addColorStop(0.75, "#18181b");
      asphaltGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = asphaltGrad;
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius - 7, 0, Math.PI * 2);
      ctx.fill();

      // Center Bullseye Target & Starting Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(180, 190, 48, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(180, 190, 95, 0, Math.PI * 2);
      ctx.stroke();

      // Crumbling Edge Fissures
      cracksRef.current.forEach((c) => {
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(c.startX, c.startY);
        ctx.lineTo(c.endX, c.endY);
        ctx.stroke();
      });

      // Render Skid Marks on Tarmac
      skidMarksRef.current = skidMarksRef.current
        .map((sm) => ({ ...sm, opacity: sm.opacity - 0.006 }))
        .filter((sm) => sm.opacity > 0);

      skidMarksRef.current.forEach((sm) => {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.fillStyle = `rgba(0, 0, 0, ${sm.opacity * 0.55})`;
        ctx.fillRect(-4, -10, 8, 3.5);
        ctx.fillRect(-4, 7, 8, 3.5);
        ctx.restore();
      });

      ctx.restore(); // end wobbling island

      // Helper to Draw High-Octane 2.5D Bumper Car
      const drawBumperCar = (car: Car, isPlayer1: boolean) => {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.scale(car.fallScale, car.fallScale);
        ctx.rotate(car.angle);

        // 1. Neon Chassis Underglow
        const underglowColor = isPlayer1 ? "rgba(244, 63, 94, 0.45)" : "rgba(6, 182, 212, 0.45)";
        ctx.fillStyle = underglowColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, car.radius + 6, car.radius + 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.beginPath();
        ctx.ellipse(0, 4, car.radius + 4, car.radius + 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Thick Heavy Rubber Bumper Rim with Compression Elasticity
        ctx.save();
        if (car.bumperSquash > 0) {
          ctx.rotate(car.squashAngle);
          ctx.scale(1 - car.bumperSquash * 0.15, 1);
          ctx.rotate(-car.squashAngle);
        }

        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, car.radius + 3, car.radius + 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Segmented Rubber Bumper Ridges
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        for (let b = 0; b < Math.PI * 2; b += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(b) * (car.radius - 1), Math.sin(b) * (car.radius - 1));
          ctx.lineTo(Math.cos(b) * (car.radius + 3), Math.sin(b) * (car.radius + 3));
          ctx.stroke();
        }
        ctx.restore();

        // 4. Metallic Molded Fiberglass Racing Body
        const carGrad = ctx.createLinearGradient(-car.radius, -car.radius, car.radius, car.radius);
        carGrad.addColorStop(0, isPlayer1 ? "#f87171" : "#60a5fa");
        carGrad.addColorStop(0.4, isPlayer1 ? "#dc2626" : "#2563eb");
        carGrad.addColorStop(0.85, isPlayer1 ? "#991b1b" : "#1e40af");
        carGrad.addColorStop(1, isPlayer1 ? "#450a0a" : "#172554");
        ctx.fillStyle = carGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, car.radius - 1.5, car.radius - 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hood Racing Stripe
        ctx.fillStyle = isPlayer1 ? "#fee2e2" : "#dbeafe";
        ctx.fillRect(-2, -car.radius + 3, 4, car.radius * 1.6);

        // 5. Cockpit & Driver Helmet
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(-2, 0, 7.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Racing Helmet with Reflective Visor
        ctx.fillStyle = isPlayer1 ? "#facc15" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
        ctx.fill();

        // Dark Visor Reflection
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(1.5, 0, 3.2, -0.7, 0.7);
        ctx.fill();

        // 6. Chrome Rear Roll Bar
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(-7, 0, 7.5, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();

        // 7. Overhead Electric Contact Spark Pole
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.arc(-11, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(-14, 0);
        ctx.stroke();

        // Occasional pole electrical spark
        if (Math.random() < 0.15) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(-17 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4);
          ctx.stroke();
        }

        // 8. Twin Xenon Headlights with Projected Light Cones
        ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
        ctx.beginPath();
        ctx.moveTo(car.radius - 2, -6);
        ctx.lineTo(car.radius + 34, -16);
        ctx.lineTo(car.radius + 34, -1);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(car.radius - 2, 6);
        ctx.lineTo(car.radius + 34, 1);
        ctx.lineTo(car.radius + 34, 16);
        ctx.closePath();
        ctx.fill();

        // Headlight bulbs
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(car.radius - 3, -6, 2.5, 0, Math.PI * 2);
        ctx.arc(car.radius - 3, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 9. Nitro Afterburner Exhaust Flames
        if (car.isBoosting) {
          // Orange outer flame
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.moveTo(-car.radius - 2, -5);
          ctx.lineTo(-car.radius - 18 - Math.random() * 10, 0);
          ctx.lineTo(-car.radius - 2, 5);
          ctx.fill();

          // Blue core flame
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-car.radius - 2, -3);
          ctx.lineTo(-car.radius - 10 - Math.random() * 6, 0);
          ctx.lineTo(-car.radius - 2, 3);
          ctx.fill();
        }

        ctx.restore();
      };

      // Draw Cars
      drawBumperCar(p1, true);
      drawBumperCar(p2, false);

      // Render Drift Smoke Particles
      smokeParticlesRef.current = smokeParticlesRef.current
        .map((sm) => ({
          ...sm,
          x: sm.x + sm.vx,
          y: sm.y + sm.vy,
          radius: sm.radius + 0.35,
          alpha: sm.alpha - 0.035,
        }))
        .filter((sm) => sm.alpha > 0);

      smokeParticlesRef.current.forEach((sm) => {
        ctx.save();
        ctx.fillStyle = `rgba(226, 232, 240, ${sm.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Shockwaves
      shockwavesRef.current = shockwavesRef.current
        .map((sw) => ({
          ...sw,
          r: sw.r + 3.5,
          alpha: sw.alpha - 0.07,
        }))
        .filter((sw) => sw.alpha > 0);

      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Render Collision Sparks
      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          life: s.life - 0.045,
        }))
        .filter((s) => s.life > 0);

      sparksRef.current.forEach((s) => {
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Water Splashes
      splashesRef.current = splashesRef.current
        .map((sp) => ({
          ...sp,
          radius: sp.radius + 1.6,
          opacity: sp.opacity - 0.035,
        }))
        .filter((sp) => sp.opacity > 0);

      splashesRef.current.forEach((sp) => {
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${sp.opacity})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(186, 230, 253, ${sp.opacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // end shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, isWobbling, arenaRadius, screenShake, playMode, botDiff]);

  // Round winner handler
  const handleRoundEnd = (winner: "p1" | "p2") => {
    if (roundOver) return;
    setRoundOver(true);
    setRoundWinner(winner);

    if (winner === "p1") {
      arcadeSfx.playVictory();
      setP1Wins((w) => {
        const next = w + 1;
        if (next >= 3) {
          setMatchWinner("p1");
          if (currentUid && match?.id) {
            updateArcadeGameScore(match.id, currentUid, "traffic_jam" as any, 100, true);
          }
        }
        return next;
      });
    } else {
      arcadeSfx.playPenaltyBuzz();
      setP2Wins((w) => {
        const next = w + 1;
        if (next >= 3) setMatchWinner("p2");
        return next;
      });
    }
  };

  const trafficHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-500/20 overflow-hidden">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {/* Water */}
          <circle cx="80" cy="80" r="70" fill="#0369a1" />
          <circle cx="80" cy="80" r="62" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" />
          {/* Asphalt Arena */}
          <circle cx="80" cy="80" r="54" fill="#27272a" stroke="#eab308" strokeWidth="3.5" strokeDasharray="9 4" />
          <circle cx="80" cy="80" r="22" fill="none" stroke="white" strokeWidth="1.5" opacity="0.15" />

          {/* Red Car */}
          <g transform="translate(60, 80) rotate(15)">
            <ellipse cx="0" cy="0" rx="16" ry="12" fill="#ef4444" stroke="#475569" strokeWidth="2.5" />
            <circle cx="-3" cy="0" r="4.5" fill="#0f172a" />
            <circle cx="0" cy="0" r="3" fill="#facc15" />
          </g>

          {/* Blue Car */}
          <g transform="translate(100, 80) rotate(-165)">
            <ellipse cx="0" cy="0" rx="16" ry="12" fill="#3b82f6" stroke="#475569" strokeWidth="2.5" />
            <circle cx="-3" cy="0" r="4.5" fill="#0f172a" />
            <circle cx="0" cy="0" r="3" fill="#38bdf8" />
          </g>

          {/* Sparks */}
          <circle cx="80" cy="80" r="14" fill="none" stroke="#fef08a" strokeWidth="3" strokeDasharray="4 3" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Steer, Drift & Ram Rivals",
      desc: "Turn your bumper car and slam into the enemy to launch them toward the water!",
      icon: "🚗",
    },
    {
      title: "Turbo Nitro Ram (`⚡`)",
      desc: "Tap NITRO to unleash a supersonic impulse blast and shatter enemy defense!",
      icon: "⚡",
    },
    {
      title: "Collapsing Outer Slabs",
      desc: "Perimeter fissures wobble and plunge into the ocean every 15s. First to 3 wins!",
      icon: "⚠️",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="TRAFFIC JAM"
          subtitle="Arena Bumper Cars"
          categoryTag="PHYSICS ARENA"
          accentColor="#37474F"
          objective="Ram opponents into the ocean! Use Nitro charges to push rivals off collapsing asphalt tiles! First to 3 wins."
          heroGraphic={trafficHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  // Render touch controls for a player
  const renderControls = (who: "p1" | "p2", isInverted = false) => {
    const isP1 = who === "p1";
    const inputRefTarget = isP1 ? p1InputRef : p2InputRef;
    const carRef = isP1 ? p1Ref : p2Ref;

    return (
      <div className={`w-full max-w-sm flex items-center justify-between gap-2 px-3 py-1.5 ${isInverted ? "rotate-180" : ""}`}>
        {/* Left / Right Steering Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={() => { inputRefTarget.current.left = true; }}
            onPointerUp={() => { inputRefTarget.current.left = false; }}
            onPointerLeave={() => { inputRefTarget.current.left = false; }}
            className="w-14 h-14 bg-neutral-800 active:bg-neutral-700 border-2 border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md active:scale-95 transition-transform"
          >
            ◄
          </button>
          <button
            type="button"
            onPointerDown={() => { inputRefTarget.current.right = true; }}
            onPointerUp={() => { inputRefTarget.current.right = false; }}
            onPointerLeave={() => { inputRefTarget.current.right = false; }}
            className="w-14 h-14 bg-neutral-800 active:bg-neutral-700 border-2 border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md active:scale-95 transition-transform"
          >
            ►
          </button>
        </div>

        {/* Drive Forward GAS */}
        <button
          type="button"
          onPointerDown={() => { inputRefTarget.current.up = true; }}
          onPointerUp={() => { inputRefTarget.current.up = false; }}
          onPointerLeave={() => { inputRefTarget.current.up = false; }}
          className={`flex-1 h-14 ${isP1 ? "bg-red-600 hover:bg-red-700 border-b-4 border-red-800" : "bg-blue-600 hover:bg-blue-700 border-b-4 border-blue-800"} active:border-b-0 active:translate-y-1 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-lg`}
        >
          <span>GAS ▲</span>
        </button>

        {/* Turbo Nitro Boost */}
        <button
          type="button"
          onPointerDown={() => triggerBoost(who)}
          className="w-16 h-14 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-xs flex flex-col items-center justify-center text-white cursor-pointer select-none touch-none shadow-lg relative overflow-hidden"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="text-[9px] font-black">NITRO</span>
          {/* Charge indicator meter */}
          <div
            className="absolute bottom-0 inset-x-0 h-1 bg-amber-300"
            style={{ width: `${carRef.current.boostCharge}%` }}
          />
        </button>
      </div>
    );
  };

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
            <span className="text-[10px] uppercase font-bold text-red-400">RED (P1)</span>
            <span className="text-2xl font-black text-red-500">{p1Wins}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">
              BLUE ({playMode === "bot" ? `BOT` : "P2"})
            </span>
            <span className="text-2xl font-black text-blue-500">{p2Wins}</span>
          </div>
        </div>

        {/* Collapse Countdown Warning */}
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
            shrinkTimer <= 5
              ? "bg-red-950 text-red-400 border-red-500/50 animate-pulse"
              : "bg-amber-950/70 text-amber-400 border-amber-500/40"
          }`}
        >
          <span>⚠️ {shrinkTimer}s</span>
        </div>
      </div>

      {/* Player 2 Tabletop Controls (Inverted for local 2-Player Friend Mode) */}
      {playMode === "friend" && renderControls("p2", true)}

      {/* Main Canvas Arena */}
      <div className="relative w-full max-w-sm h-[370px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={380} className="w-full h-full" />

        {/* Round Over Banner */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-40 text-center">
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
              {roundWinner === "p1" ? "🎉 RED SCORES POINT!" : "💥 BLUE SCORES POINT!"}
            </h3>
            <p className="text-xs font-bold text-neutral-300 mt-1">First to 3 wins the match</p>
            <button
              type="button"
              onPointerDown={resetRound}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              NEXT ROUND
            </button>
          </div>
        )}

        {/* Match Winner Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-50 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "RED VICTORY!" : "BLUE VICTORY!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Wins} - {p2Wins}</p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Player 1 Controls (Bottom) */}
      {renderControls("p1", false)}

      {/* Footer prompt */}
      <div className="w-full max-w-sm text-center pb-1 z-30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          WASD / ARROWS TO STEER & DRIVE • SPACE TO NITRO RAM
        </span>
      </div>
    </div>
  );
}
