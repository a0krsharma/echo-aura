"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Trophy, Shield, AlertTriangle } from "lucide-react";

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
  radius: number;
  color: string;
  isFallen: boolean;
  fallScale: number;
  isBoosting: boolean;
  boostCharge: number; // 0 to 100
}

interface SkidMark {
  x: number;
  y: number;
  angle: number;
  opacity: number;
}

interface WaterSplash {
  id: number;
  x: number;
  y: number;
  radius: number;
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
  const [arenaRadius, setArenaRadius] = useState(150);
  const [shrinkTimer, setShrinkTimer] = useState(15);
  const [isWobbling, setIsWobbling] = useState(false);
  const [screenShake, setScreenShake] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const p1Ref = useRef<Car>({
    x: 130,
    y: 190,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    radius: 16,
    color: "#ef4444",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
  });

  const p2Ref = useRef<Car>({
    x: 230,
    y: 190,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    speed: 0,
    radius: 16,
    color: "#3b82f6",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
  });

  const skidMarksRef = useRef<SkidMark[]>([]);
  const splashesRef = useRef<WaterSplash[]>([]);
  const cracksRef = useRef<CrackLine[]>([]);
  const sparksRef = useRef<Spark[]>([]);
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
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 35);
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
    setArenaRadius(150);
    setShrinkTimer(15);
    setIsWobbling(false);
    skidMarksRef.current = [];
    splashesRef.current = [];
    cracksRef.current = [];
    sparksRef.current = [];

    p1Ref.current = {
      x: 125,
      y: 190,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      radius: 16,
      color: "#ef4444",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
    };

    p2Ref.current = {
      x: 235,
      y: 190,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      radius: 16,
      color: "#3b82f6",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
    };
  }, []);

  // Arena collapse timer
  useEffect(() => {
    if (inMenu || roundOver || matchWinner) return;

    const interval = setInterval(() => {
      setShrinkTimer((prev) => {
        if (prev === 4) {
          // Warning wobble & cracks
          setIsWobbling(true);
          arcadeSfx.playButtonTap();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI * 2) / 10;
            cracksRef.current.push({
              startX: 180 + Math.cos(angle) * (arenaRadius - 25),
              startY: 190 + Math.sin(angle) * (arenaRadius - 25),
              endX: 180 + Math.cos(angle) * arenaRadius,
              endY: 190 + Math.sin(angle) * arenaRadius,
              opacity: 1,
            });
          }
        }

        if (prev <= 1) {
          // Collapse outer ring into water
          setArenaRadius((r) => Math.max(65, r - 25));
          setIsWobbling(false);
          cracksRef.current = [];
          arcadeSfx.playCarBump();

          // Water ring splashes
          for (let a = 0; a < Math.PI * 2; a += 0.6) {
            splashesRef.current.push({
              id: splashId.current++,
              x: 180 + Math.cos(a) * arenaRadius,
              y: 190 + Math.sin(a) * arenaRadius,
              radius: 9,
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

  // Keyboard controls (P1: WASD / Arrows, P2: IJKL or Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P1
      if (e.key === "w" || e.key === "W") p1InputRef.current.up = true;
      if (e.key === "s" || e.key === "S") p1InputRef.current.down = true;
      if (e.key === "a" || e.key === "A") p1InputRef.current.left = true;
      if (e.key === "d" || e.key === "D") p1InputRef.current.right = true;
      if (e.key === " " || e.key === "Shift") triggerBoost("p1");

      // P2 (Arrows or IJKL for local dual keyboard)
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

  const triggerBoost = (who: "p1" | "p2") => {
    const car = who === "p1" ? p1Ref.current : p2Ref.current;
    if (car.boostCharge >= 35 && !car.isFallen) {
      car.boostCharge -= 35;
      car.isBoosting = true;
      car.speed = Math.min(6.2, car.speed + 3.0);
      arcadeSfx.playWhoosh();
      setTimeout(() => {
        car.isBoosting = false;
      }, 350);
    }
  };

  // Bot AI behavior (3 tiers)
  const updateBotAI = () => {
    if (playMode !== "bot") return;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    if (p2.isFallen || p1.isFallen) return;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // Arena center distance
    const distFromCenter = Math.hypot(p2.x - 180, p2.y - 190);
    const isNearEdge = distFromCenter > arenaRadius - 35;

    // Angle difference normalized
    let diffAngle = targetAngle - p2.angle;
    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    const turnRate = botDiff === "hard" ? 0.12 : botDiff === "medium" ? 0.08 : 0.05;

    if (isNearEdge && botDiff !== "easy") {
      // Avoid falling off the ring: turn back toward arena center
      const centerAngle = Math.atan2(190 - p2.y, 180 - p2.x);
      let cDiff = centerAngle - p2.angle;
      while (cDiff < -Math.PI) cDiff += Math.PI * 2;
      while (cDiff > Math.PI) cDiff -= Math.PI * 2;
      p2.angle += Math.sign(cDiff) * Math.min(Math.abs(cDiff), turnRate * 1.5);
      p2InputRef.current.up = true;
    } else {
      // Steer toward player
      p2.angle += Math.sign(diffAngle) * Math.min(Math.abs(diffAngle), turnRate);

      if (Math.abs(diffAngle) < 0.6) {
        p2InputRef.current.up = true;
        // Hard / Medium nitro attack when lined up
        if (botDiff === "hard" && dist < 95 && Math.abs(diffAngle) < 0.25) {
          triggerBoost("p2");
        } else if (botDiff === "medium" && dist < 70 && Math.random() < 0.05) {
          triggerBoost("p2");
        }
      } else {
        p2InputRef.current.up = botDiff === "hard" || Math.random() < 0.6;
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
      if (p1.boostCharge < 100) p1.boostCharge = Math.min(100, p1.boostCharge + 0.25);
      if (p2.boostCharge < 100) p2.boostCharge = Math.min(100, p2.boostCharge + 0.25);

      // 3. Process Player 1 Physics
      if (!p1.isFallen) {
        if (p1InputRef.current.left) p1.angle -= 0.075;
        if (p1InputRef.current.right) p1.angle += 0.075;

        if (p1InputRef.current.up) {
          p1.speed = Math.min(3.8, p1.speed + 0.16);
        } else if (p1InputRef.current.down) {
          p1.speed = Math.max(-2.0, p1.speed - 0.12);
        } else {
          p1.speed *= 0.95; // Friction
        }

        // Add velocity
        p1.vx = p1.vx * 0.9 + Math.cos(p1.angle) * p1.speed * 0.1;
        p1.vy = p1.vy * 0.9 + Math.sin(p1.angle) * p1.speed * 0.1;
        p1.x += Math.cos(p1.angle) * p1.speed + p1.vx;
        p1.y += Math.sin(p1.angle) * p1.speed + p1.vy;

        // Skid marks when turning at high speed
        if (Math.abs(p1.speed) > 2.2 && (p1InputRef.current.left || p1InputRef.current.right || p1.isBoosting)) {
          skidMarksRef.current.push({
            x: p1.x - Math.cos(p1.angle) * 12,
            y: p1.y - Math.sin(p1.angle) * 12,
            angle: p1.angle,
            opacity: 0.7,
          });
        }
      } else {
        // Falling into water
        p1.fallScale = Math.max(0, p1.fallScale - 0.04);
        p1.angle += 0.15;
      }

      // 4. Process Player 2 Physics
      if (!p2.isFallen) {
        if (p2InputRef.current.left) p2.angle -= 0.075;
        if (p2InputRef.current.right) p2.angle += 0.075;

        if (p2InputRef.current.up) {
          p2.speed = Math.min(3.8, p2.speed + 0.16);
        } else if (p2InputRef.current.down) {
          p2.speed = Math.max(-2.0, p2.speed - 0.12);
        } else {
          p2.speed *= 0.95;
        }

        p2.vx = p2.vx * 0.9 + Math.cos(p2.angle) * p2.speed * 0.1;
        p2.vy = p2.vy * 0.9 + Math.sin(p2.angle) * p2.speed * 0.1;
        p2.x += Math.cos(p2.angle) * p2.speed + p2.vx;
        p2.y += Math.sin(p2.angle) * p2.speed + p2.vy;

        if (Math.abs(p2.speed) > 2.2 && (p2InputRef.current.left || p2InputRef.current.right || p2.isBoosting)) {
          skidMarksRef.current.push({
            x: p2.x - Math.cos(p2.angle) * 12,
            y: p2.y - Math.sin(p2.angle) * 12,
            angle: p2.angle,
            opacity: 0.7,
          });
        }
      } else {
        p2.fallScale = Math.max(0, p2.fallScale - 0.04);
        p2.angle += 0.15;
      }

      // 5. Bumper-to-Bumper Collision Elastic Impulse
      if (!p1.isFallen && !p2.isFallen) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart
          const overlap = (minDist - dist) * 0.5;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Impulse force calculation
          const boostMultiplier = (p1.isBoosting ? 2.0 : 1.0) + (p2.isBoosting ? 2.0 : 1.0);
          const force = (Math.abs(p1.speed) + Math.abs(p2.speed) + 2.5) * 1.35 * boostMultiplier;

          p1.vx = -nx * force;
          p1.vy = -ny * force;
          p2.vx = nx * force;
          p2.vy = ny * force;

          p1.speed *= -0.3;
          p2.speed *= -0.3;

          setScreenShake(Math.min(14, 4 + force * 1.2));
          arcadeSfx.playCarBump();

          // Spawn collision sparks
          for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            sparksRef.current.push({
              x: (p1.x + p2.x) * 0.5,
              y: (p1.y + p2.y) * 0.5,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1,
              color: i % 2 === 0 ? "#fde047" : "#f97316",
            });
          }
        }
      }

      // 6. Check Ring-Outs / Water Falls
      const p1Dist = Math.hypot(p1.x - 180, p1.y - 190);
      const p2Dist = Math.hypot(p2.x - 180, p2.y - 190);

      if (!p1.isFallen && p1Dist > arenaRadius) {
        p1.isFallen = true;
        arcadeSfx.playCarBump();
        splashesRef.current.push({
          id: splashId.current++,
          x: p1.x,
          y: p1.y,
          radius: 12,
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
          radius: 12,
          opacity: 1,
        });
        handleRoundEnd("p1");
      }

      // 7. RENDER TO CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Screen shake
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Deep Ocean Water Background
      const waterGrad = ctx.createRadialGradient(180, 190, 50, 180, 190, 200);
      waterGrad.addColorStop(0, "#082f49");
      waterGrad.addColorStop(0.6, "#0c4a6e");
      waterGrad.addColorStop(1, "#030712");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Water Ripple Waves
      const t = Date.now() * 0.002;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 1.5;
      for (let r = arenaRadius + 15; r < 210; r += 20) {
        ctx.beginPath();
        ctx.arc(180, 190, r + Math.sin(t + r) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating Asphalt Arena Island
      ctx.save();
      if (isWobbling) {
        ctx.translate((Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 3.5);
      }

      // Platform Outer Drop Shadow in Water
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(180, 198, arenaRadius, 0, Math.PI * 2);
      ctx.fill();

      // Platform Rim (Concrete Curb)
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Hazard Stripes on Edge Rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius + 4, 0, Math.PI * 2);
      ctx.arc(180, 190, arenaRadius - 6, 0, Math.PI * 2, true);
      ctx.clip();

      for (let a = 0; a < Math.PI * 2; a += 0.2) {
        ctx.fillStyle = Math.floor(a * 5) % 2 === 0 ? "#eab308" : "#0f172a";
        ctx.beginPath();
        ctx.moveTo(180, 190);
        ctx.arc(180, 190, arenaRadius + 10, a, a + 0.1);
        ctx.fill();
      }
      ctx.restore();

      // Inner Asphalt Surface
      const asphaltGrad = ctx.createRadialGradient(180, 190, 10, 180, 190, arenaRadius);
      asphaltGrad.addColorStop(0, "#27272a");
      asphaltGrad.addColorStop(0.85, "#18181b");
      asphaltGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = asphaltGrad;
      ctx.beginPath();
      ctx.arc(180, 190, arenaRadius - 6, 0, Math.PI * 2);
      ctx.fill();

      // Center Arena Bullseye Ring
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(180, 190, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Render Crumbling Edge Cracks
      cracksRef.current.forEach((c) => {
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(c.startX, c.startY);
        ctx.lineTo(c.endX, c.endY);
        ctx.stroke();
      });

      // Render Skid Marks
      skidMarksRef.current = skidMarksRef.current
        .map((sm) => ({ ...sm, opacity: sm.opacity - 0.005 }))
        .filter((sm) => sm.opacity > 0);

      skidMarksRef.current.forEach((sm) => {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.fillStyle = `rgba(0, 0, 0, ${sm.opacity * 0.45})`;
        ctx.fillRect(-4, -10, 8, 3.5);
        ctx.fillRect(-4, 7, 8, 3.5);
        ctx.restore();
      });

      ctx.restore(); // end wobbling platform

      // Helper to Draw Bumper Car
      const drawBumperCar = (car: Car, isPlayer1: boolean) => {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.scale(car.fallScale, car.fallScale);
        ctx.rotate(car.angle);

        // Car drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.ellipse(0, 4, car.radius + 3, car.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Rubber Outer Bumper Strip (Thick protective ring)
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, car.radius + 2, car.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Main Vibrant Metallic Fiberglass Body
        const carGrad = ctx.createLinearGradient(-car.radius, -car.radius, car.radius, car.radius);
        carGrad.addColorStop(0, isPlayer1 ? "#ef4444" : "#3b82f6");
        carGrad.addColorStop(0.6, isPlayer1 ? "#b91c1c" : "#1d4ed8");
        carGrad.addColorStop(1, isPlayer1 ? "#7f1d1d" : "#1e3a8a");
        ctx.fillStyle = carGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, car.radius - 2, car.radius - 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit / Driver Helmet
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-2, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // Driver Visor Helmet
        ctx.fillStyle = isPlayer1 ? "#fde047" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, -0.6, 0.6);
        ctx.fill();

        // Chrome Roll Bar
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-6, 0, 7.5, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();

        // Glowing Headlights
        ctx.fillStyle = "#fef08a";
        ctx.shadowColor = "#fef08a";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(car.radius - 4, -6, 2.5, 0, Math.PI * 2);
        ctx.arc(car.radius - 4, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Nitro Exhaust Flames
        if (car.isBoosting) {
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.moveTo(-car.radius, -4);
          ctx.lineTo(-car.radius - 14 - Math.random() * 8, 0);
          ctx.lineTo(-car.radius, 4);
          ctx.fill();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-car.radius, -2);
          ctx.lineTo(-car.radius - 8, 0);
          ctx.lineTo(-car.radius, 2);
          ctx.fill();
        }

        ctx.restore();
      };

      // Draw Cars
      drawBumperCar(p1, true);
      drawBumperCar(p2, false);

      // Render Collision Sparks
      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          life: s.life - 0.05,
        }))
        .filter((s) => s.life > 0);

      sparksRef.current.forEach((s) => {
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Water Splashes
      splashesRef.current = splashesRef.current
        .map((sp) => ({
          ...sp,
          radius: sp.radius + 1.2,
          opacity: sp.opacity - 0.03,
        }))
        .filter((sp) => sp.opacity > 0);

      splashesRef.current.forEach((sp) => {
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${sp.opacity})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.stroke();
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
      <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center border border-slate-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Water */}
          <circle cx="80" cy="80" r="70" fill="#082f49" />
          {/* Asphalt Arena */}
          <circle cx="80" cy="80" r="54" fill="#27272a" stroke="#eab308" strokeWidth="3" strokeDasharray="8 4" />
          {/* Red Car */}
          <g transform="translate(62, 80) rotate(15)">
            <ellipse cx="0" cy="0" rx="14" ry="11" fill="#ef4444" stroke="#475569" strokeWidth="2.5" />
            <circle cx="-2" cy="0" r="4" fill="#0f172a" />
          </g>
          {/* Blue Car */}
          <g transform="translate(98, 80) rotate(-165)">
            <ellipse cx="0" cy="0" rx="14" ry="11" fill="#3b82f6" stroke="#475569" strokeWidth="2.5" />
            <circle cx="-2" cy="0" r="4" fill="#0f172a" />
          </g>
          {/* Sparks */}
          <circle cx="80" cy="80" r="12" fill="none" stroke="#fef08a" strokeWidth="3" strokeDasharray="4 3" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Steer & Ram Rivals",
      desc: "Turn your bumper car and slam into the enemy to send them spinning toward the water!",
      icon: "🚗",
    },
    {
      title: "Turbo Nitro Ram (`⚡`)",
      desc: "Tap NITRO to unleash a supersonic high-impulse ramming blast!",
      icon: "⚡",
    },
    {
      title: "Collapsing Outer Ring",
      desc: "Platform perimeter cracks and drops into the water every 15s. First to 3 wins!",
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
          objective="Ram opponents into the water! Use Nitro charges to push rivals off collapsing edge tiles! First to 3 wins."
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
            className="w-14 h-14 bg-neutral-800 active:bg-neutral-700 border-2 border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md"
          >
            ◄
          </button>
          <button
            type="button"
            onPointerDown={() => { inputRefTarget.current.right = true; }}
            onPointerUp={() => { inputRefTarget.current.right = false; }}
            onPointerLeave={() => { inputRefTarget.current.right = false; }}
            className="w-14 h-14 bg-neutral-800 active:bg-neutral-700 border-2 border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center text-white cursor-pointer select-none touch-none shadow-md"
          >
            ►
          </button>
        </div>

        {/* Drive Forward */}
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
          className="w-16 h-14 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-xs flex flex-col items-center justify-center text-white cursor-pointer select-none touch-none shadow-lg"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="text-[9px] font-black">NITRO</span>
        </button>
      </div>
    );
  };

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

        {/* Score */}
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

        {/* Collapse Countdown */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <span>⚠️ {shrinkTimer}s</span>
        </div>
      </div>

      {/* Player 2 Tabletop Controls (Inverted for local 2-Player Friend Mode) */}
      {playMode === "friend" && renderControls("p2", true)}

      {/* Main Canvas Arena */}
      <div className="relative w-full max-w-sm h-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={380} className="w-full h-full" />

        {/* Round Over Banner */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-30">
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
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
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
    </div>
  );
}
