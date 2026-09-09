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
  suspensionStiffness: number;
  suspensionDamping: number;
}

const VEHICLES: Record<VehicleType, VehicleDef> = {
  jeep: {
    type: "jeep",
    name: "Classic 4x4 Jeep",
    bodyColor: "#dc2626", // Classic Red
    wheelRadius: 15,
    wheelBase: 52,
    suspensionHeight: 18,
    motorTorque: 0.46,
    airTiltSpeed: 0.052,
    weight: 1.0,
    suspensionStiffness: 0.22,
    suspensionDamping: 0.14,
  },
  monster: {
    type: "monster",
    name: "Monster Truck",
    bodyColor: "#2563eb", // Royal Blue
    wheelRadius: 23,
    wheelBase: 64,
    suspensionHeight: 28,
    motorTorque: 0.58,
    airTiltSpeed: 0.044,
    weight: 1.35,
    suspensionStiffness: 0.26,
    suspensionDamping: 0.16,
  },
  buggy: {
    type: "buggy",
    name: "Dune Buggy",
    bodyColor: "#eab308", // Desert Gold
    wheelRadius: 13,
    wheelBase: 48,
    suspensionHeight: 15,
    motorTorque: 0.48,
    airTiltSpeed: 0.065,
    weight: 0.85,
    suspensionStiffness: 0.2,
    suspensionDamping: 0.12,
  },
};

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

  // Gameplay State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string>("DRIVER DOWN!");
  const [isMuted, setIsMuted] = useState(false);

  // Controls input state
  const isGasPressedRef = useRef(false);
  const isBrakePressedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Physics Simulation State
  const carXRef = useRef(120);
  const carYRef = useRef(200);
  const carVxRef = useRef(0);
  const carVyRef = useRef(0);
  const carAngleRef = useRef(0); // In radians
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
    // Multi-harmonic sine waves creating natural rolling hills, slopes & peaks
    const baseH = 430;
    const hill1 = Math.sin(x * 0.0032) * 78;
    const hill2 = Math.sin(x * 0.008 + 1.2) * 38;
    const hill3 = Math.sin(x * 0.018 + 3.2) * 14;
    const gentleDip = Math.sin(x * 0.0008) * 25;
    return baseH + hill1 + hill2 + hill3 + gentleDip;
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
      const targetX = farthestX + 1400;
      let startX =
        terrainPointsRef.current.length > 0
          ? terrainPointsRef.current[terrainPointsRef.current.length - 1].x + step
          : 0;

      for (let x = startX; x <= targetX; x += step) {
        const y = getTerrainHeight(x);
        terrainPointsRef.current.push({ x, y });

        // Spawn gold coins in clusters on hill peaks & downslopes
        if (x > 200 && x % 88 === 0) {
          coinsRef.current.push({
            x,
            y: y - 22,
            collected: false,
          });
        }

        // Spawn Fuel Jerrycans every ~340m
        if (x > 320 && x % 340 === 0) {
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
      const vt = vType || selectedVehicle;

      setScore(0);
      setCoins(0);
      setDistance(0);
      setFuel(100);
      setGameOver(false);

      carXRef.current = 120;
      carYRef.current = getTerrainHeight(120) - 35;
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

  // Fuel depletion ticker (Gentle and fair)
  useEffect(() => {
    if (gameOver || inMenu) return;
    const interval = setInterval(() => {
      setFuel((prev) => {
        // Slow burn on idle, moderate burn on gas
        const drain = isGasPressedRef.current ? 1.0 : 0.35;
        const next = Math.max(0, prev - drain);
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

  // 60 FPS Physics Simulation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.34;
    const vDef = VEHICLES[selectedVehicle];

    const render = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // ── Physics Updates ──
      if (!gameOver && !inMenu) {
        const carX = carXRef.current;
        const carY = carYRef.current;
        const angle = carAngleRef.current;

        // Coordinates of front & rear wheels
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
            // Forward traction aligned with hill slope
            const slope = getTerrainSlope(carX);
            const driveForce = vDef.motorTorque * (isRearTouching ? 1.0 : 0.6);
            carVxRef.current += Math.cos(slope) * driveForce;
            carVyRef.current += Math.sin(slope) * driveForce;
            wheelRotationRef.current += 0.35;

            // Dirt roost particles from rear wheel
            if (isRearTouching && Math.random() < 0.4) {
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

            if (!isMuted && Math.random() < 0.25) {
              arcadeSfx.playEngineRev(1.3);
            }
          } else {
            // Air tilt: Lean backward (Backflip)
            carAngularVelRef.current += vDef.airTiltSpeed;
            if (!isMuted && Math.random() < 0.2) {
              arcadeSfx.playEngineRev(1.7);
            }
          }
        }

        // 2. Brake / Reverse Pedal
        if (isBrakePressedRef.current && fuel > 0) {
          if (onGround) {
            // Braking / Reverse
            const slope = getTerrainSlope(carX);
            carVxRef.current -= Math.cos(slope) * (vDef.motorTorque * 0.65);
            wheelRotationRef.current -= 0.2;
            if (!isMuted && Math.random() < 0.08) {
              arcadeSfx.playBrakeSqueal();
            }
          } else {
            // Air tilt: Lean forward (Frontflip)
            carAngularVelRef.current -= vDef.airTiltSpeed;
          }
        }

        // 3. Ground Spring-Damper Suspension
        if (isRearTouching) {
          const penetration = vDef.wheelRadius - rearDist;
          const springForce = penetration * vDef.suspensionStiffness;
          carVyRef.current -= springForce;
          carAngularVelRef.current -= springForce * 0.015;
          // Normal position clamp so wheel never sinks deep
          if (penetration > 4) {
            carYRef.current -= (penetration - 4) * 0.5;
          }
        }

        if (isFrontTouching) {
          const penetration = vDef.wheelRadius - frontDist;
          const springForce = penetration * vDef.suspensionStiffness;
          carVyRef.current -= springForce;
          carAngularVelRef.current += springForce * 0.015;
          // Normal position clamp
          if (penetration > 4) {
            carYRef.current -= (penetration - 4) * 0.5;
          }
        }

        // Ground Friction & Damping
        if (onGround) {
          carVxRef.current *= 0.988;
          carAngularVelRef.current *= 0.82;

          // Stunt Completion Check upon Landing
          if (isAirborneRef.current) {
            const airDuration = (performance.now() - airStartTimeRef.current) / 1000;
            if (airDuration > 1.1) {
              const bonus = Math.floor(airDuration * 120);
              setScore((s) => s + bonus);
              if (!isMuted) arcadeSfx.playStuntCheer();

              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.38,
                text: `⏱️ AIR TIME! +${bonus}`,
                color: "#38bdf8",
                size: 20,
                alpha: 1,
                vy: -1.6,
              });
            }

            // Check 360° Backflips / Frontflips
            const rotations = Math.round(cumulativeAirRotationRef.current / (Math.PI * 2));
            if (Math.abs(rotations) >= 1) {
              const stuntName = rotations > 0 ? "BACKFLIP!" : "FRONTFLIP!";
              const bonus = Math.abs(rotations) * 500;
              setScore((s) => s + bonus);
              if (!isMuted) arcadeSfx.playStuntCheer();

              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.3,
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
          // Mid-Air flight
          if (!isAirborneRef.current) {
            isAirborneRef.current = true;
            airStartTimeRef.current = performance.now();
            lastAirAngleRef.current = carAngleRef.current;
          }

          const deltaAngle = carAngleRef.current - lastAirAngleRef.current;
          cumulativeAirRotationRef.current += deltaAngle;
          lastAirAngleRef.current = carAngleRef.current;

          carAngularVelRef.current *= 0.985;
        }

        // Apply Linear & Angular velocities
        carXRef.current += carVxRef.current;
        carYRef.current += carVyRef.current;
        carAngleRef.current += carAngularVelRef.current;

        // Driver Head Ragdoll Joint
        const targetNeck = -carAngularVelRef.current * 4.5 - carVxRef.current * 0.025;
        neckVelRef.current += (targetNeck - neckAngleRef.current) * 0.28;
        neckVelRef.current *= 0.76;
        neckAngleRef.current += neckVelRef.current;

        // 4. FAIR ROLLOVER & NECK-FLIP DETECTION:
        // Only trigger crash if the vehicle is genuinely upside-down (angle > 105° or < -105°)
        // AND the helmet actually collides with the ground plane!
        const isUpsideDown = Math.cos(carAngleRef.current) < -0.25;
        if (isUpsideDown) {
          const headX = carXRef.current + Math.sin(carAngleRef.current) * 24;
          const headY = carYRef.current - Math.cos(carAngleRef.current) * 24;
          const terrainAtHead = getTerrainHeight(headX);

          if (headY >= terrainAtHead) {
            // Severe inverted crash!
            setGameOver(true);
            setGameOverReason("DRIVER DOWN / NECK FLIP! 💀");
            if (!isMuted) arcadeSfx.playVehicleCrash();
          }
        }

        // Distance & Score progression
        const distMeters = Math.max(0, Math.floor((carXRef.current - 120) / 10));
        setDistance(distMeters);
        setScore((prev) => {
          const next = Math.max(prev, distMeters);
          setHighScore((h) => Math.max(h, next));
          return next;
        });

        // Extend terrain ahead
        if (carXRef.current > terrainPointsRef.current[terrainPointsRef.current.length - 90].x) {
          populateTerrainAhead(carXRef.current);
        }

        // 5. Coin & Fuel Jerrycan pickups
        coinsRef.current.forEach((c) => {
          if (!c.collected && Math.hypot(c.x - carXRef.current, c.y - carYRef.current) < 38) {
            c.collected = true;
            setCoins((cn) => cn + 1);
            setScore((s) => s + 50);
            if (!isMuted) arcadeSfx.playSubwayCoin();

            for (let sp = 0; sp < 3; sp++) {
              particlesRef.current.push({
                x: c.x,
                y: c.y,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 5 - 2,
                color: "#facc15",
                size: 3.5,
                alpha: 1,
              });
            }
          }
        });

        fuelCansRef.current.forEach((f) => {
          if (!f.collected && Math.hypot(f.x - carXRef.current, f.y - carYRef.current) < 42) {
            f.collected = true;
            setFuel(100);
            if (!isMuted) arcadeSfx.playFuelGulp();

            floatingTextsRef.current.push({
              id: Math.random(),
              x: canvasW / 2,
              y: canvasH * 0.4,
              text: "⛽ 100% FUEL REFILLED!",
              color: "#22c55e",
              size: 20,
              alpha: 1,
              vy: -1.8,
            });
          }
        });
      }

      // ── CANVAS RENDERING ──
      ctx.save();

      // Camera Tracking centered on vehicle
      const camX = carXRef.current - canvasW * 0.35;
      const camY = carYRef.current - canvasH * 0.54;

      // 1. Sky & Cloudscape Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
      skyGrad.addColorStop(0, "#0284c7");
      skyGrad.addColorStop(0.5, "#38bdf8");
      skyGrad.addColorStop(1, "#bae6fd");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Sun with warm corona
      ctx.save();
      const sunX = canvasW * 0.82;
      const sunY = 75;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 44);
      sunGrad.addColorStop(0, "#fef08a");
      sunGrad.addColorStop(0.5, "rgba(254, 240, 138, 0.5)");
      sunGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Parallax Distant Mountains
      ctx.save();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(0, canvasH);
      for (let mx = 0; mx <= canvasW; mx += 50) {
        const my = 220 + Math.sin((mx + camX * 0.14) * 0.009) * 50;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(canvasW, canvasH);
      ctx.fill();
      ctx.restore();

      // 2. Render Deformable Hill Terrain (World Coordinates)
      ctx.save();
      ctx.translate(-camX, -camY);

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

        // Rich Soil Gradient
        const soilGrad = ctx.createLinearGradient(0, 360, 0, 720);
        soilGrad.addColorStop(0, "#78350f");
        soilGrad.addColorStop(0.35, "#451a03");
        soilGrad.addColorStop(1, "#1c1917");
        ctx.fillStyle = soilGrad;
        ctx.fill();

        // Lush Green Grass Top Ribbon
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 10;
        ctx.stroke();

        // Subtle Grass Fringe line
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 3;
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
        ctx.strokeStyle = "#b45309";
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

      // Suspension Struts
      ctx.strokeStyle = "#64748b";
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
        ctx.roundRect(-halfBase - 6, -20, vDef.wheelBase + 12, 24, 6);
        ctx.fill();
        // Cabin
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-halfBase + 8, -36, 30, 16);
        // Dual Chrome Exhaust Stacks
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-halfBase + 2, -44, 4, 24);
        ctx.fillRect(-halfBase + 7, -44, 4, 24);
      } else if (vDef.type === "buggy") {
        // Dune Buggy space frame
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
        ctx.roundRect(-halfBase - 4, -15, vDef.wheelBase + 8, 18, 5);
        ctx.fill();
        // Windshield Frame & Glass
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-halfBase + 4, -30, 26, 15);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-halfBase + 7, -28, 20, 11);
        // Spare tire on rear
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-halfBase - 7, -6, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Driver Neck & Bobbing Head with Helmet
      ctx.save();
      ctx.translate(-halfBase + 16, -26);
      ctx.rotate(neckAngleRef.current);

      // Body / Shoulders
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(-5, 0, 10, 8);

      // White Racing Helmet
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -9, 8, 0, Math.PI * 2);
      ctx.fill();

      // Black Visor
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(1, -12, 6, 6);
      ctx.restore();

      // Exhaust Smoke Particles
      if (isGasPressedRef.current && Math.random() < 0.35) {
        particlesRef.current.push({
          x: carXRef.current - Math.cos(carAngleRef.current) * (halfBase + 12),
          y: carYRef.current - Math.sin(carAngleRef.current) * (halfBase + 12),
          vx: -Math.cos(carAngleRef.current) * 4 + (Math.random() - 0.5),
          vy: -Math.sin(carAngleRef.current) * 4 - Math.random() * 2,
          color: "rgba(255, 255, 255, 0.75)",
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

        // Silver Alloy Rim
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(0, 0, vDef.wheelRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawWheel(-halfBase, vDef.suspensionHeight);
      drawWheel(halfBase, vDef.suspensionHeight);

      ctx.restore(); // End vehicle transform

      // Particles (Dirt & Smoke)
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

      ctx.restore(); // End camera transform

      // 5. Floating Stunt Texts (Rendered in screen space for crisp clarity!)
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
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

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
              <p>
                Coins Collected: <strong className="text-yellow-400">{coins}</strong> 🪙
              </p>
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

      {/* ── Multi-Touch Independent 2-Pedal Controls ── */}
      <div className="w-full grid grid-cols-2 gap-3 pt-2.5 z-30 px-1">
        {/* BRAKE Pedal */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            isBrakePressedRef.current = true;
          }}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            isBrakePressedRef.current = false;
          }}
          onPointerCancel={() => {
            isBrakePressedRef.current = false;
          }}
          className="py-4 bg-gradient-to-b from-red-900/60 to-red-950/80 active:from-red-800 active:to-red-900 border-2 border-red-500/60 hover:border-red-400 text-red-300 font-black text-sm uppercase rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer select-none touch-none"
        >
          <span className="text-base font-black">◄ BRAKE</span>
          <span className="text-[9px] text-red-400 font-mono">REVERSE / LEAN FWD</span>
        </button>

        {/* GAS Pedal */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            isGasPressedRef.current = true;
          }}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            isGasPressedRef.current = false;
          }}
          onPointerCancel={() => {
            isGasPressedRef.current = false;
          }}
          className="py-4 bg-gradient-to-b from-emerald-900/60 to-emerald-950/80 active:from-emerald-800 active:to-emerald-900 border-2 border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-black text-sm uppercase rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer select-none touch-none"
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
