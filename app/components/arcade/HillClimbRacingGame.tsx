"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Trophy, Flame } from "lucide-react";

export interface HillClimbProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Vehicle Varieties ──
type VehicleType = "jeep" | "monster" | "buggy";

interface VehicleDef {
  type: VehicleType;
  name: string;
  bodyColor: string;
  wheelRadius: number;
  wheelBase: number;
  suspensionHeight: number;
  motorTorque: number;
  airTiltSpeed: number;
  weight: number;
}

const VEHICLES: Record<VehicleType, VehicleDef> = {
  jeep: {
    type: "jeep",
    name: "Classic 4x4 Jeep",
    bodyColor: "#dc2626", // Classic Red
    wheelRadius: 14,
    wheelBase: 50,
    suspensionHeight: 18,
    motorTorque: 0.38,
    airTiltSpeed: 0.045,
    weight: 1.0,
  },
  monster: {
    type: "monster",
    name: "Monster Truck",
    bodyColor: "#2563eb", // Blue
    wheelRadius: 22,
    wheelBase: 62,
    suspensionHeight: 28,
    motorTorque: 0.48,
    airTiltSpeed: 0.038,
    weight: 1.35,
  },
  buggy: {
    type: "buggy",
    name: "Dune Buggy",
    bodyColor: "#eab308", // Yellow
    wheelRadius: 12,
    wheelBase: 54,
    suspensionHeight: 15,
    motorTorque: 0.44,
    airTiltSpeed: 0.06,
    weight: 0.85,
  },
};

interface CoinItem {
  x: number;
  y: number;
  collected: boolean;
}

interface FuelCanItem {
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
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

export default function HillClimbRacingGame({
  match,
  currentUid,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: HillClimbProps) {
  const initialDiff = (match?.difficulty?.toLowerCase() as BotDifficulty) || "medium";
  const [inMenu, setInMenu] = useState(false);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("jeep");

  // Game Stats
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [airTimeSec, setAirTimeSec] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string>("DRIVER DOWN!");
  const [isMuted, setIsMuted] = useState(false);

  // Controls input state
  const isGasPressedRef = useRef(false);
  const isBrakePressedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Physics Simulation State
  const carXRef = useRef(100);
  const carYRef = useRef(200);
  const carVxRef = useRef(0);
  const carVyRef = useRef(0);
  const carAngleRef = useRef(0); // in radians
  const carAngularVelRef = useRef(0);
  const rearSuspensionRef = useRef(0);
  const frontSuspensionRef = useRef(0);
  const wheelRotationRef = useRef(0);

  // Driver Head Ragdoll angle
  const neckAngleRef = useRef(0);
  const neckVelRef = useRef(0);

  // Air time & stunt tracking
  const isAirborneRef = useRef(false);
  const airStartTimeRef = useRef(0);
  const cumulativeAirRotationRef = useRef(0);
  const lastAirAngleRef = useRef(0);

  // Terrain generation parameters
  const terrainPointsRef = useRef<{ x: number; y: number }[]>([]);
  const coinsRef = useRef<CoinItem[]>([]);
  const fuelCansRef = useRef<FuelCanItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Mathematical Spline Height Function
  const getTerrainHeight = useCallback((x: number) => {
    // Multi-frequency Perlin-style harmonic sine wave hills
    const hill1 = Math.sin(x * 0.0035) * 85;
    const hill2 = Math.sin(x * 0.009 + 1.2) * 45;
    const hill3 = Math.sin(x * 0.02 + 3.4) * 18;
    const bridgeDip = Math.sin(x * 0.001) * 30;
    return 420 + hill1 + hill2 + hill3 + bridgeDip;
  }, []);

  // Compute terrain normal angle at x
  const getTerrainSlope = useCallback(
    (x: number) => {
      const dx = 4;
      const y1 = getTerrainHeight(x - dx);
      const y2 = getTerrainHeight(x + dx);
      return Math.atan2(y2 - y1, dx * 2);
    },
    [getTerrainHeight]
  );

  // Populate terrain & items ahead of car
  const populateTerrainAhead = useCallback(
    (farthestX: number) => {
      const step = 8;
      const targetX = farthestX + 1200;
      let startX = terrainPointsRef.current.length > 0 ? terrainPointsRef.current[terrainPointsRef.current.length - 1].x + step : 0;

      for (let x = startX; x <= targetX; x += step) {
        const y = getTerrainHeight(x);
        terrainPointsRef.current.push({ x, y });

        // Spawn Coins on hilltops
        if (x > 250 && x % 96 === 0) {
          coinsRef.current.push({
            x,
            y: y - 22,
            collected: false,
          });
        }

        // Spawn Fuel Jerrycans every ~450m
        if (x > 400 && x % 440 === 0) {
          fuelCansRef.current.push({
            x,
            y: y - 26,
            collected: false,
          });
        }
      }
    },
    [getTerrainHeight]
  );

  // Start / Reset Session
  const startGame = useCallback(
    (diff?: BotDifficulty, vType?: VehicleType) => {
      if (diff) setBotDiff(diff);
      const vehicle = vType ? VEHICLES[vType] : VEHICLES[selectedVehicle];

      setScore(0);
      setCoins(0);
      setDistance(0);
      setFuel(100);
      setAirTimeSec(0);
      setGameOver(false);

      carXRef.current = 120;
      carYRef.current = getTerrainHeight(120) - 40;
      carVxRef.current = 0;
      carVyRef.current = 0;
      carAngleRef.current = 0;
      carAngularVelRef.current = 0;
      rearSuspensionRef.current = 0;
      frontSuspensionRef.current = 0;
      wheelRotationRef.current = 0;
      neckAngleRef.current = 0;
      neckVelRef.current = 0;
      isAirborneRef.current = false;
      cumulativeAirRotationRef.current = 0;

      terrainPointsRef.current = [];
      coinsRef.current = [];
      fuelCansRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];

      populateTerrainAhead(120);
      setInMenu(false);
    },
    [getTerrainHeight, populateTerrainAhead, selectedVehicle]
  );

  // Initial mount
  useEffect(() => {
    startGame(botDiff, selectedVehicle);
  }, [startGame, botDiff, selectedVehicle]);

  // Fuel depletion ticker
  useEffect(() => {
    if (gameOver || inMenu) return;
    const interval = setInterval(() => {
      setFuel((prev) => {
        // Faster drain under gas, slower idle
        const drainRate = isGasPressedRef.current ? 1.4 : 0.4;
        const next = Math.max(0, prev - drainRate);
        if (next <= 0) {
          setGameOver(true);
          setGameOverReason("OUT OF FUEL! ⛽");
          if (!isMuted) arcadeSfx.playPenaltyBuzz();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, inMenu, isMuted]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameOver || inMenu) return;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        isGasPressedRef.current = true;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        isBrakePressedRef.current = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        isGasPressedRef.current = false;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        isBrakePressedRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gameOver, inMenu]);

  // 60 FPS Engine Simulation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.32;
    const vDef = VEHICLES[selectedVehicle];

    const render = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // ── Physics Updates ──
      if (!gameOver && !inMenu) {
        const carX = carXRef.current;
        const carY = carYRef.current;
        const angle = carAngleRef.current;

        // Calculate world coordinates of front & rear wheels
        const halfBase = vDef.wheelBase / 2;
        const rearWheelX = carX - Math.cos(angle) * halfBase;
        const rearWheelY = carY - Math.sin(angle) * halfBase + vDef.suspensionHeight;
        const frontWheelX = carX + Math.cos(angle) * halfBase;
        const frontWheelY = carY + Math.sin(angle) * halfBase + vDef.suspensionHeight;

        // Terrain heights under wheels
        const terrainRearY = getTerrainHeight(rearWheelX);
        const terrainFrontY = getTerrainHeight(frontWheelX);

        const rearDist = terrainRearY - rearWheelY;
        const frontDist = terrainFrontY - frontWheelY;

        const isRearTouching = rearDist <= vDef.wheelRadius;
        const isFrontTouching = frontDist <= vDef.wheelRadius;
        const onGround = isRearTouching || isFrontTouching;

        // Gravity
        carVyRef.current += gravity;

        // 1. Gas Pedal / Throttle
        if (isGasPressedRef.current && fuel > 0) {
          if (onGround) {
            // Forward traction
            const slope = getTerrainSlope(carX);
            const driveForce = vDef.motorTorque * (isRearTouching ? 1.0 : 0.5);
            carVxRef.current += Math.cos(slope) * driveForce;
            carVyRef.current += Math.sin(slope) * driveForce;
            wheelRotationRef.current += 0.35;

            // Dirt particles from rear tire
            if (isRearTouching && Math.random() < 0.45) {
              particlesRef.current.push({
                x: rearWheelX,
                y: rearWheelY + vDef.wheelRadius,
                vx: -Math.cos(slope) * (3 + Math.random() * 4),
                vy: -Math.random() * 3 - 1,
                color: "#78350f",
                size: 3 + Math.random() * 2.5,
                alpha: 1,
              });
            }

            if (!isMuted) arcadeSfx.playEngineRev(1.4);
          } else {
            // Air tilt: Lean backward (Backflip)
            carAngularVelRef.current += vDef.airTiltSpeed;
            if (!isMuted) arcadeSfx.playEngineRev(1.8);
          }
        }

        // 2. Brake / Reverse Pedal
        if (isBrakePressedRef.current && fuel > 0) {
          if (onGround) {
            // Braking / Reverse
            const slope = getTerrainSlope(carX);
            carVxRef.current -= Math.cos(slope) * (vDef.motorTorque * 0.65);
            wheelRotationRef.current -= 0.2;
            if (!isMuted && Math.random() < 0.1) arcadeSfx.playBrakeSqueal();
          } else {
            // Air tilt: Lean forward (Frontflip)
            carAngularVelRef.current -= vDef.airTiltSpeed;
          }
        }

        // 3. Ground Spring Suspension & Normal Forces
        if (isRearTouching) {
          const penetration = vDef.wheelRadius - rearDist;
          const springForce = penetration * 0.18;
          carVyRef.current -= springForce;
          carAngularVelRef.current -= springForce * 0.012;
        }

        if (isFrontTouching) {
          const penetration = vDef.wheelRadius - frontDist;
          const springForce = penetration * 0.18;
          carVyRef.current -= springForce;
          carAngularVelRef.current += springForce * 0.012;
        }

        // Ground Friction damping
        if (onGround) {
          carVxRef.current *= 0.985;
          carAngularVelRef.current *= 0.88;

          // Air Time Stunt Completion Check
          if (isAirborneRef.current) {
            const airDuration = (performance.now() - airStartTimeRef.current) / 1000;
            if (airDuration > 1.2) {
              const bonus = Math.floor(airDuration * 100);
              setScore((s) => s + bonus);
              if (!isMuted) arcadeSfx.playStuntCheer();
              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.4,
                text: `⏱️ AIR TIME! +${bonus}`,
                color: "#38bdf8",
                size: 20,
                alpha: 1,
                vy: -1.6,
              });
            }

            // Check Backflips / Frontflips (cumulative 360 degree rotation in air)
            const rotations = Math.round(cumulativeAirRotationRef.current / (Math.PI * 2));
            if (Math.abs(rotations) >= 1) {
              const stuntName = rotations > 0 ? "BACKFLIP!" : "FRONTFLIP!";
              const bonus = Math.abs(rotations) * 500;
              setScore((s) => s + bonus);
              if (!isMuted) arcadeSfx.playStuntCheer();
              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.32,
                text: `🌀 ${stuntName} +${bonus}!`,
                color: "#f59e0b",
                size: 24,
                alpha: 1,
                vy: -2,
              });
            }

            isAirborneRef.current = false;
            cumulativeAirRotationRef.current = 0;
          }
        } else {
          // In Mid-Air
          if (!isAirborneRef.current) {
            isAirborneRef.current = true;
            airStartTimeRef.current = performance.now();
            lastAirAngleRef.current = carAngleRef.current;
          }

          // Accumulate rotation for flips
          const deltaAngle = carAngleRef.current - lastAirAngleRef.current;
          cumulativeAirRotationRef.current += deltaAngle;
          lastAirAngleRef.current = carAngleRef.current;

          carAngularVelRef.current *= 0.985;
        }

        // Apply Linear & Angular velocities
        carXRef.current += carVxRef.current;
        carYRef.current += carVyRef.current;
        carAngleRef.current += carAngularVelRef.current;

        // Driver Head Ragdoll Spring Joint
        const targetNeck = -carAngularVelRef.current * 4 - (carVxRef.current * 0.03);
        neckVelRef.current += (targetNeck - neckAngleRef.current) * 0.25;
        neckVelRef.current *= 0.78;
        neckAngleRef.current += neckVelRef.current;

        // 4. CRASH & ROLLOVER CHECK: Driver Head Strikes Ground
        // Head world position (above chassis)
        const headX = carXRef.current + Math.sin(carAngleRef.current) * 25;
        const headY = carYRef.current - Math.cos(carAngleRef.current) * 25;
        const terrainAtHead = getTerrainHeight(headX);

        if (headY >= terrainAtHead - 4) {
          // Severe rollover / Neck Flip crash!
          setGameOver(true);
          setGameOverReason("DRIVER DOWN / NECK FLIP! 💀");
          if (!isMuted) arcadeSfx.playVehicleCrash();
        }

        // Distance & Score progression
        const distMeters = Math.max(0, Math.floor((carXRef.current - 120) / 10));
        setDistance(distMeters);
        setScore((prev) => {
          const next = Math.max(prev, distMeters);
          setHighScore((h) => Math.max(h, next));
          return next;
        });

        // Extend terrain as car travels forward
        if (carXRef.current > terrainPointsRef.current[terrainPointsRef.current.length - 80].x) {
          populateTerrainAhead(carXRef.current);
        }

        // 5. Coin & Fuel Jerrycan pickups
        coinsRef.current.forEach((c) => {
          if (!c.collected && Math.hypot(c.x - carXRef.current, c.y - carYRef.current) < 36) {
            c.collected = true;
            setCoins((cn) => cn + 1);
            setScore((s) => s + 50);
            if (!isMuted) arcadeSfx.playSubwayCoin();

            particlesRef.current.push({
              x: c.x,
              y: c.y,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 4 - 2,
              color: "#facc15",
              size: 3,
              alpha: 1,
            });
          }
        });

        fuelCansRef.current.forEach((f) => {
          if (!f.collected && Math.hypot(f.x - carXRef.current, f.y - carYRef.current) < 38) {
            f.collected = true;
            setFuel(100);
            if (!isMuted) arcadeSfx.playFuelGulp();
            floatingTextsRef.current.push({
              id: Math.random(),
              x: canvasW / 2,
              y: canvasH * 0.45,
              text: "⛽ 100% FUEL REFILLED!",
              color: "#ef4444",
              size: 20,
              alpha: 1,
              vy: -1.8,
            });
          }
        });
      }

      // ── CANVAS CAMERA TRACKING & RENDERING ──
      ctx.save();

      // Camera centered on vehicle
      const camX = carXRef.current - canvasW * 0.35;
      const camY = carYRef.current - canvasH * 0.55;

      // 1. Parallax Sky Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
      skyGrad.addColorStop(0, "#0284c7"); // Blue sky
      skyGrad.addColorStop(0.5, "#38bdf8");
      skyGrad.addColorStop(1, "#bae6fd");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Sun
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(canvasW * 0.85, 80, 36, 0, Math.PI * 2);
      ctx.fill();

      // Parallax Distant Mountains
      ctx.save();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(0, canvasH);
      for (let mx = 0; mx <= canvasW; mx += 60) {
        const my = 220 + Math.sin((mx + camX * 0.15) * 0.01) * 45;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(canvasW, canvasH);
      ctx.fill();
      ctx.restore();

      // 2. Render Deformable Hill Terrain (Camera Transform)
      ctx.save();
      ctx.translate(-camX, -camY);

      // Grass & Dirt Spline
      ctx.beginPath();
      const firstIdx = Math.max(0, Math.floor(camX / 8) - 10);
      const lastIdx = Math.min(terrainPointsRef.current.length - 1, Math.floor((camX + canvasW) / 8) + 15);

      if (terrainPointsRef.current.length > 0) {
        ctx.moveTo(terrainPointsRef.current[firstIdx].x, terrainPointsRef.current[firstIdx].y);
        for (let i = firstIdx; i <= lastIdx; i++) {
          const pt = terrainPointsRef.current[i];
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.lineTo(terrainPointsRef.current[lastIdx].x, camY + canvasH + 200);
        ctx.lineTo(terrainPointsRef.current[firstIdx].x, camY + canvasH + 200);
        ctx.closePath();

        // Rich Soil Fill
        const soilGrad = ctx.createLinearGradient(0, 380, 0, 700);
        soilGrad.addColorStop(0, "#78350f");
        soilGrad.addColorStop(0.3, "#451a03");
        soilGrad.addColorStop(1, "#1c1917");
        ctx.fillStyle = soilGrad;
        ctx.fill();

        // Vibrant Green Grass Top Border
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 9;
        ctx.stroke();
      }

      // 3. Render Coins & Fuel Jerrycans along terrain
      coinsRef.current.forEach((c) => {
        if (c.collected || c.x < camX - 40 || c.x > camX + canvasW + 40) return;
        ctx.save();
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      fuelCansRef.current.forEach((f) => {
        if (f.collected || f.x < camX - 40 || f.x > camX + canvasW + 40) return;
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#dc2626";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(f.x - 9, f.y - 12, 18, 24, 4);
        ctx.fill();

        // Handle
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(f.x - 6, f.y - 17, 12, 5);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAS", f.x, f.y + 4);
        ctx.restore();
      });

      // 4. Render Vehicle Chassis, Wheels & Driver
      ctx.save();
      ctx.translate(carXRef.current, carYRef.current);
      ctx.rotate(carAngleRef.current);

      const halfBase = vDef.wheelBase / 2;

      // Suspension Arms
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-halfBase, 0);
      ctx.lineTo(-halfBase, vDef.suspensionHeight);
      ctx.moveTo(halfBase, 0);
      ctx.lineTo(halfBase, vDef.suspensionHeight);
      ctx.stroke();

      // Vehicle Chassis Body
      ctx.fillStyle = vDef.bodyColor;
      ctx.beginPath();
      if (vDef.type === "monster") {
        ctx.roundRect(-halfBase - 6, -18, vDef.wheelBase + 12, 22, 6);
        ctx.fill();
        // Cabin
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-halfBase + 6, -34, 30, 16);
      } else if (vDef.type === "buggy") {
        // Roll cage tubular frame
        ctx.roundRect(-halfBase - 4, -12, vDef.wheelBase + 8, 16, 4);
        ctx.fill();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-halfBase, -12);
        ctx.lineTo(-6, -30);
        ctx.lineTo(halfBase - 8, -12);
        ctx.stroke();
      } else {
        // Classic Jeep Body
        ctx.roundRect(-halfBase - 4, -14, vDef.wheelBase + 8, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-halfBase + 4, -28, 26, 14); // Windshield frame
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-halfBase + 7, -26, 20, 10); // Glass
      }

      // Driver Neck & Bobbing Head with Helmet
      ctx.save();
      ctx.translate(-halfBase + 16, -26);
      ctx.rotate(neckAngleRef.current);

      // Body & Shoulders
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-5, 0, 10, 8);

      // Helmet Head
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -9, 8, 0, Math.PI * 2);
      ctx.fill();

      // Helmet Visor
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(1, -12, 6, 6);
      ctx.restore();

      // Exhaust Pipe & Smoke
      ctx.fillStyle = "#64748b";
      ctx.fillRect(-halfBase - 9, -6, 6, 4);

      if (isGasPressedRef.current && Math.random() < 0.35) {
        particlesRef.current.push({
          x: carXRef.current - Math.cos(carAngleRef.current) * (halfBase + 12),
          y: carYRef.current - Math.sin(carAngleRef.current) * (halfBase + 12),
          vx: -Math.cos(carAngleRef.current) * 4 + (Math.random() - 0.5),
          vy: -Math.sin(carAngleRef.current) * 4 - Math.random() * 2,
          color: "rgba(255, 255, 255, 0.7)",
          size: 4 + Math.random() * 4,
          alpha: 0.8,
        });
      }

      // Draw Rotating Front & Rear Wheels
      const drawWheel = (wx: number, wy: number) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(wheelRotationRef.current);

        // Black Rubber Tire
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 0, vDef.wheelRadius, 0, Math.PI * 2);
        ctx.fill();

        // Tire Treads
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (vDef.wheelRadius - 4), Math.sin(a) * (vDef.wheelRadius - 4));
          ctx.lineTo(Math.cos(a) * vDef.wheelRadius, Math.sin(a) * vDef.wheelRadius);
          ctx.stroke();
        }

        // Silver Alloy Hubcap
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(0, 0, vDef.wheelRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawWheel(-halfBase, vDef.suspensionHeight);
      drawWheel(halfBase, vDef.suspensionHeight);

      ctx.restore(); // end car transform

      // Particles (Dirt roosts & exhaust smoke)
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.025;

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((pt) => pt.alpha > 0);

      // Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.015;

        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size}px monospace`;
        ctx.textAlign = "center";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x + camX, ft.y + camY);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

      ctx.restore(); // end camera transform

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, inMenu, selectedVehicle, getTerrainHeight, getTerrainSlope, fuel, isMuted]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl">
      {/* ── Top Match Header HUD ── */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 z-30">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : setInMenu(true))}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-300 transition-all cursor-pointer"
          title="Exit to Lounge"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Distance & Coins */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1 rounded-xl border border-white/10 shadow-md">
            <span className="text-xs font-black text-cyan-400">DIST</span>
            <span className="text-lg font-black text-white">{distance}m</span>
          </div>

          <div className="flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/40 text-amber-300 shadow-md">
            <span className="text-sm">🪙</span>
            <span className="text-sm font-black">{coins}</span>
          </div>
        </div>

        {/* Mute Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* ── Dynamic Fuel Tank Gauge ── */}
      <div className="w-full px-3 my-1 z-30 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
          <span className="text-red-400 flex items-center gap-1">
            <span>⛽ FUEL TANK</span>
          </span>
          <span className={fuel <= 20 ? "text-red-400 font-bold animate-pulse" : "text-neutral-400"}>
            {Math.round(fuel)}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              fuel <= 20
                ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                : fuel <= 45
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, fuel))}%` }}
          />
        </div>
      </div>

      {/* ── Vehicle Selector Pills ── */}
      <div className="w-full flex items-center justify-center gap-1.5 my-1 z-30">
        {(Object.keys(VEHICLES) as VehicleType[]).map((vt) => (
          <button
            key={vt}
            type="button"
            onClick={() => {
              setSelectedVehicle(vt);
              startGame(botDiff, vt);
            }}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
              selectedVehicle === vt
                ? "bg-white text-black border-white shadow-xs font-black"
                : "bg-neutral-900/80 text-neutral-400 border-neutral-800"
            }`}
          >
            {VEHICLES[vt].name}
          </button>
        ))}
      </div>

      {/* ── Main Canvas Arena ── */}
      <div className="relative w-full aspect-[9/15] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800">
        <canvas ref={canvasRef} width={360} height={600} className="w-full h-full touch-none" />

        {/* Game Over Banner Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 z-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mb-3 shadow-lg">
              🚗
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-wider mb-1">
              {gameOverReason}
            </h2>
            <div className="space-y-1 text-xs text-neutral-400 mb-4 font-mono">
              <p>
                Distance Climbed: <strong className="text-cyan-400 text-base">{distance}m</strong> • Best: {highScore}m
              </p>
              <p>Coins Collected: <strong className="text-yellow-400">{coins}</strong> 🪙</p>
            </div>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => startGame(botDiff, selectedVehicle)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-sm uppercase rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RACE AGAIN</span>
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

      {/* ── 2-Pedal Touch Controls (GAS & BRAKE) ── */}
      <div className="w-full grid grid-cols-2 gap-3 pt-2.5 z-30 px-1">
        {/* BRAKE Pedal */}
        <button
          type="button"
          onPointerDown={() => {
            isBrakePressedRef.current = true;
          }}
          onPointerUp={() => {
            isBrakePressedRef.current = false;
          }}
          onPointerLeave={() => {
            isBrakePressedRef.current = false;
          }}
          className="py-4 bg-gradient-to-b from-red-900/60 to-red-950/80 active:from-red-800 active:to-red-900 border-2 border-red-500/60 hover:border-red-400 text-red-300 font-black text-sm uppercase rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-base font-black">◄ BRAKE</span>
          <span className="text-[9px] text-red-400 font-mono">REVERSE / LEAN FWD</span>
        </button>

        {/* GAS Pedal */}
        <button
          type="button"
          onPointerDown={() => {
            isGasPressedRef.current = true;
          }}
          onPointerUp={() => {
            isGasPressedRef.current = false;
          }}
          onPointerLeave={() => {
            isGasPressedRef.current = false;
          }}
          className="py-4 bg-gradient-to-b from-emerald-900/60 to-emerald-950/80 active:from-emerald-800 active:to-emerald-900 border-2 border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-black text-sm uppercase rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-base font-black">GAS ►</span>
          <span className="text-[9px] text-emerald-400 font-mono">THROTTLE / LEAN BACK</span>
        </button>
      </div>

      {/* ── Bottom HUD Footer Status ── */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono px-2 pt-1.5">
        <span>HILL CLIMB RACING // 60 FPS</span>
        <span>PEDALS OR ARROW KEYS</span>
      </div>
    </div>
  );
}
