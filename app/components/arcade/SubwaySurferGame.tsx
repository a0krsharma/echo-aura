"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Trophy } from "lucide-react";

export interface SubwaySurferProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Types ──
type Lane = -1 | 0 | 1; // -1: Left, 0: Center, 1: Right

type ObstacleType =
  | "low_hurdle"
  | "high_barrier"
  | "train_static"
  | "train_moving";

type PowerupType = "magnet" | "hoverboard" | "jetpack" | "sneakers" | "multiplier";

interface ObstacleEntity {
  id: number;
  type: ObstacleType;
  lane: Lane;
  z: number; // Distance in meters ahead (0 = player camera, 240 = horizon)
  length: number; // For trains
  speedZ: number; // If moving towards player
}

interface CoinEntity {
  id: number;
  lane: Lane;
  z: number;
  y: number; // 0 = track ground, 55 = train roof, >0 = air arc
  collected: boolean;
  sparkleAngle: number;
}

interface PowerupItem {
  id: number;
  type: PowerupType;
  lane: Lane;
  z: number;
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

export default function SubwaySurferGame({
  match,
  currentUid,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: SubwaySurferProps) {
  const initialDiff = (match?.difficulty?.toLowerCase() as BotDifficulty) || "medium";
  const [inMenu, setInMenu] = useState(false);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

  // Gameplay State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Active Power-up Durations (seconds)
  const [hasHoverboard, setHasHoverboard] = useState(false);
  const [hoverboardTimer, setHoverboardTimer] = useState(0);
  const [magnetTimer, setMagnetTimer] = useState(0);
  const [jetpackTimer, setJetpackTimer] = useState(0);
  const [sneakersTimer, setSneakersTimer] = useState(0);
  const [multiplierTimer, setMultiplierTimer] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Physics & Track Position
  const playerLaneRef = useRef<Lane>(0);
  const targetLaneRef = useRef<Lane>(0);
  const laneXRef = useRef<number>(0); // -1 to +1 smoothly interpolated
  const playerYRef = useRef<number>(0); // 0 = ground, 55 = train roof
  const playerVyRef = useRef<number>(0);
  const isRollingRef = useRef<boolean>(false);
  const rollTimerRef = useRef<number>(0);
  const baseSpeedRef = useRef<number>(initialDiff === "easy" ? 18 : initialDiff === "medium" ? 22 : 28);
  const runSpeedRef = useRef<number>(baseSpeedRef.current);
  const trackDistanceRef = useRef<number>(0);
  const inspectorDistanceRef = useRef<number>(28); // meters behind player

  // Entities
  const obstaclesRef = useRef<ObstacleEntity[]>([]);
  const coinsRef = useRef<CoinEntity[]>([]);
  const powerupsRef = useRef<PowerupItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);

  // Touch Swipe Handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // 3D Perspective Projection Helper
  const project3D = useCallback((laneOffset: number, yOffset: number, z: number, canvasW: number, canvasH: number) => {
    const horizonY = canvasH * 0.34;
    const fov = 175;
    const scale = fov / (fov + Math.max(0.1, z));

    const groundTrackWidth = canvasW * 0.86;
    const laneWidth = groundTrackWidth / 3;

    const screenX = canvasW / 2 + laneOffset * laneWidth * scale;
    const groundY = canvasH * 0.86;
    const screenY = horizonY + (groundY - horizonY) * scale - yOffset * scale * 1.55;

    return { x: screenX, y: screenY, scale };
  }, []);

  // Deploy Hoverboard
  const deployHoverboard = useCallback(() => {
    setHasHoverboard(true);
    setHoverboardTimer(20);
    if (!isMuted) arcadeSfx.playHoverboardDeploy();
    floatingTextsRef.current.push({
      id: Math.random(),
      x: 180,
      y: 260,
      text: "🛹 HOVERBOARD ACTIVE!",
      color: "#38bdf8",
      size: 20,
      alpha: 1,
      vy: -1.5,
    });
  }, [isMuted]);

  // Jump Action
  const handleJump = useCallback(() => {
    // Can jump if on ground or on train roof
    const onGround = playerYRef.current === 0;
    const onTrain = Math.abs(playerYRef.current - 55) < 3;
    if (onGround || onTrain) {
      const jumpPower = sneakersTimer > 0 ? 15.2 : 11.4;
      playerVyRef.current = jumpPower;
      if (!isMuted) arcadeSfx.playSubwayJump();
    }
  }, [sneakersTimer, isMuted]);

  // Roll Action
  const handleRoll = useCallback(() => {
    if (playerYRef.current > 0) {
      // Fast drop down from air
      playerVyRef.current = -18;
    }
    isRollingRef.current = true;
    rollTimerRef.current = 36; // ~600ms
    if (!isMuted) arcadeSfx.playSubwayRoll();
  }, [isMuted]);

  // Lane Shift Action
  const handleLaneChange = useCallback((dir: -1 | 1) => {
    const nextLane = Math.max(-1, Math.min(1, targetLaneRef.current + dir)) as Lane;
    if (nextLane !== targetLaneRef.current) {
      targetLaneRef.current = nextLane;
      playerLaneRef.current = nextLane;
      if (!isMuted) arcadeSfx.playSubwayRoll();
    }
  }, [isMuted]);

  // Spawn Track Chunk ahead
  const spawnTrackChunk = useCallback((zDistance: number) => {
    const lanes: Lane[] = [-1, 0, 1];
    const pickLane = () => lanes[Math.floor(Math.random() * lanes.length)];

    const roll = Math.random();
    if (roll < 0.38) {
      // Commuter Train (Stationary or Oncoming)
      const tLane = pickLane();
      const isMoving = Math.random() < 0.35 && botDiff !== "easy";
      const trainLen = 75;

      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        type: isMoving ? "train_moving" : "train_static",
        lane: tLane,
        z: zDistance,
        length: trainLen,
        speedZ: isMoving ? 8 : 0, // Gentle oncoming speed so it's reactable & fair
      });

      if (isMoving && !isMuted && Math.random() < 0.5) {
        arcadeSfx.playTrainHorn();
      }

      // Coins row on top of train roof!
      for (let c = 0; c < 5; c++) {
        coinsRef.current.push({
          id: Math.random(),
          lane: tLane,
          z: zDistance + 10 + c * 13,
          y: 55, // Train roof height
          collected: false,
          sparkleAngle: Math.random() * Math.PI * 2,
        });
      }

      // Also spawn a ground lane of coins in an adjacent lane
      const otherLane = ((tLane + 1 + 1) % 3 - 1) as Lane;
      for (let c = 0; c < 4; c++) {
        coinsRef.current.push({
          id: Math.random(),
          lane: otherLane,
          z: zDistance + c * 12,
          y: 0,
          collected: false,
          sparkleAngle: Math.random() * Math.PI * 2,
        });
      }
    } else if (roll < 0.72) {
      // Roadblock Hurdles (Jump over or Roll under)
      const hLane = pickLane();
      const isHigh = Math.random() < 0.42;

      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        type: isHigh ? "high_barrier" : "low_hurdle",
        lane: hLane,
        z: zDistance,
        length: 6,
        speedZ: 0,
      });

      // Arc of coins over low hurdle
      if (!isHigh) {
        for (let a = 0; a < 4; a++) {
          coinsRef.current.push({
            id: Math.random(),
            lane: hLane,
            z: zDistance - 12 + a * 9,
            y: Math.sin((a / 3) * Math.PI) * 44 + 8,
            collected: false,
            sparkleAngle: Math.random() * Math.PI * 2,
          });
        }
      } else {
        // Ground coins under high barrier
        for (let a = 0; a < 3; a++) {
          coinsRef.current.push({
            id: Math.random(),
            lane: hLane,
            z: zDistance - 8 + a * 8,
            y: 0,
            collected: false,
            sparkleAngle: Math.random() * Math.PI * 2,
          });
        }
      }
    } else {
      // Open Coin Runway with Power-up opportunity
      const cLane = pickLane();
      for (let c = 0; c < 6; c++) {
        coinsRef.current.push({
          id: Math.random(),
          lane: cLane,
          z: zDistance + c * 11,
          y: 0,
          collected: false,
          sparkleAngle: Math.random() * Math.PI * 2,
        });
      }

      // 22% chance of spawning a power-up
      if (Math.random() < 0.22) {
        const types: PowerupType[] = ["magnet", "hoverboard", "jetpack", "sneakers", "multiplier"];
        const pType = types[Math.floor(Math.random() * types.length)];
        powerupsRef.current.push({
          id: Date.now() + Math.random(),
          type: pType,
          lane: pickLane(),
          z: zDistance + 24,
          y: 8,
          collected: false,
        });
      }
    }
  }, [isMuted, botDiff]);

  // Start / Reset Run
  const startRun = useCallback((diff: BotDifficulty = "medium") => {
    setBotDiff(diff);
    setScore(0);
    setCoins(0);
    setMultiplier(1);
    setDistance(0);
    setGameOver(false);
    setHasHoverboard(false);
    setHoverboardTimer(0);
    setMagnetTimer(0);
    setJetpackTimer(0);
    setSneakersTimer(0);
    setMultiplierTimer(0);

    playerLaneRef.current = 0;
    targetLaneRef.current = 0;
    laneXRef.current = 0;
    playerYRef.current = 0;
    playerVyRef.current = 0;
    isRollingRef.current = false;
    rollTimerRef.current = 0;

    const base = diff === "easy" ? 17 : diff === "medium" ? 22 : 27;
    baseSpeedRef.current = base;
    runSpeedRef.current = base;
    trackDistanceRef.current = 0;
    inspectorDistanceRef.current = 28;

    obstaclesRef.current = [];
    coinsRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];

    // Pre-populate track segments ahead
    for (let z = 50; z < 320; z += 50) {
      spawnTrackChunk(z);
    }
    setInMenu(false);
  }, [spawnTrackChunk]);

  // Initial population on mount
  useEffect(() => {
    startRun(botDiff);
  }, [startRun, botDiff]);

  // Power-up Timer Tickers
  useEffect(() => {
    if (gameOver || inMenu) return;
    const interval = setInterval(() => {
      setHoverboardTimer((t) => {
        if (t <= 1) setHasHoverboard(false);
        return Math.max(0, t - 1);
      });
      setMagnetTimer((t) => Math.max(0, t - 1));
      setJetpackTimer((t) => Math.max(0, t - 1));
      setSneakersTimer((t) => Math.max(0, t - 1));
      setMultiplierTimer((t) => {
        if (t <= 1) setMultiplier(1);
        return Math.max(0, t - 1);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, inMenu]);

  // Keyboard Navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameOver || inMenu) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleLaneChange(-1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleLaneChange(1);
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
        e.preventDefault();
        handleJump();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleRoll();
      } else if (e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        deployHoverboard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameOver, inMenu, handleLaneChange, handleJump, handleRoll, deployHoverboard]);

  // Touch & Pointer Gestures
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    if (now - lastTapTimeRef.current < 280) {
      deployHoverboard();
    }
    lastTapTimeRef.current = now;

    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now,
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > 160) {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) handleLaneChange(1);
        else handleLaneChange(-1);
      } else {
        if (dy < 0) handleJump();
        else handleRoll();
      }
    }
    touchStartRef.current = null;
  };

  // 60 FPS Physics & Render Engine
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.52;

    const render = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // ── Physics Updates ──
      if (!gameOver && !inMenu) {
        const dt = 1 / 60;

        // Smooth lane change lerp
        laneXRef.current += (targetLaneRef.current - laneXRef.current) * 0.28;

        // Dynamic Speed Escalation with Distance (Gentle curve)
        const distKm = trackDistanceRef.current / 1000;
        const maxSpeed = botDiff === "easy" ? 24 : botDiff === "medium" ? 30 : 36;
        runSpeedRef.current = Math.min(maxSpeed, baseSpeedRef.current + distKm * 4.5);
        const speed = runSpeedRef.current;

        // Determine ground level: 55 if player is on top of a train, else 0
        let supportFloor = 0;
        obstaclesRef.current.forEach((obs) => {
          if (obs.type === "train_static" || obs.type === "train_moving") {
            const laneDiff = Math.abs(laneXRef.current - obs.lane);
            // Player is over train if lane aligns and depth is within train body
            if (laneDiff < 0.55 && obs.z <= 6 && obs.z >= -obs.length) {
              if (playerYRef.current >= 50) {
                supportFloor = 55; // Solid train roof floor!
              }
            }
          }
        });

        // Jump & Gravity Simulation
        if (jetpackTimer > 0) {
          // Jetpack sky flight
          playerYRef.current = 85;
          playerVyRef.current = 0;
        } else {
          playerYRef.current += playerVyRef.current;
          playerVyRef.current -= gravity;

          if (playerYRef.current <= supportFloor) {
            playerYRef.current = supportFloor;
            playerVyRef.current = 0;
          }
        }

        // Roll timer countdown
        if (isRollingRef.current) {
          rollTimerRef.current -= 1;
          if (rollTimerRef.current <= 0) {
            isRollingRef.current = false;
          }
        }

        // World Travel Progression
        trackDistanceRef.current += speed * dt;
        setDistance(Math.floor(trackDistanceRef.current));
        setScore((prev) => {
          const next = prev + Math.floor(speed * 0.16 * multiplier);
          setHighScore((h) => Math.max(h, next));
          return next;
        });

        // Inspector Distance recovery
        inspectorDistanceRef.current = Math.min(30, inspectorDistanceRef.current + dt * 1.2);

        // Advance Obstacles towards camera
        obstaclesRef.current.forEach((obs) => {
          obs.z -= (speed + obs.speedZ) * dt * 2.4;
        });

        // Advance Coins & Powerups
        coinsRef.current.forEach((c) => {
          c.z -= speed * dt * 2.4;

          // Magnet Attraction
          if (magnetTimer > 0 && !c.collected && c.z < 90 && c.z > -8) {
            const targetX = targetLaneRef.current;
            c.lane += (targetX - c.lane) * 0.18;
            c.y += (playerYRef.current - c.y) * 0.18;
          }
        });

        powerupsRef.current.forEach((p) => {
          p.z -= speed * dt * 2.4;
        });

        // Generate track ahead
        const farthestObstacle = obstaclesRef.current.reduce((max, o) => Math.max(max, o.z), 0);
        if (farthestObstacle < 240) {
          spawnTrackChunk(260 + Math.random() * 40);
        }

        // ── Collision Checks ──
        // 1. Coins Collection
        coinsRef.current.forEach((c) => {
          if (!c.collected && Math.abs(c.z) < 7) {
            const laneMatch = Math.abs(laneXRef.current - c.lane) < 0.52;
            const heightMatch = Math.abs(playerYRef.current - c.y) < 32;
            if (laneMatch && heightMatch) {
              c.collected = true;
              setCoins((cn) => cn + 1);
              setScore((s) => s + 10 * multiplier);
              if (!isMuted) arcadeSfx.playSubwayCoin();

              // Gold coin sparkle particle burst
              for (let sp = 0; sp < 3; sp++) {
                particlesRef.current.push({
                  x: canvasW / 2 + c.lane * (canvasW * 0.26),
                  y: canvasH * 0.72 - c.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: -Math.random() * 5 - 2,
                  color: "#facc15",
                  size: 3.5,
                  alpha: 1,
                });
              }
            }
          }
        });

        // 2. Power-ups Pickup
        powerupsRef.current.forEach((p) => {
          if (!p.collected && Math.abs(p.z) < 8) {
            if (Math.abs(laneXRef.current - p.lane) < 0.55 && Math.abs(playerYRef.current - p.y) < 35) {
              p.collected = true;
              if (!isMuted) arcadeSfx.playVictory();

              if (p.type === "hoverboard") deployHoverboard();
              else if (p.type === "magnet") setMagnetTimer(16);
              else if (p.type === "jetpack") {
                setJetpackTimer(8);
                if (!isMuted) arcadeSfx.playJetpackRoar();
              } else if (p.type === "sneakers") setSneakersTimer(16);
              else if (p.type === "multiplier") {
                setMultiplier(2);
                setMultiplierTimer(16);
              }

              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.45,
                text: `⚡ ${p.type.toUpperCase()}!`,
                color: "#f59e0b",
                size: 22,
                alpha: 1,
                vy: -1.8,
              });
            }
          }
        });

        // 3. Obstacle Collision
        obstaclesRef.current.forEach((obs) => {
          if (jetpackTimer > 0) return; // Immune in sky

          const laneMatch = Math.abs(laneXRef.current - obs.lane) < 0.46;
          if (!laneMatch) return;

          let crashed = false;

          if (obs.type === "low_hurdle") {
            // Low hurdle is at z ≈ 0; crash if jumping height is < 20
            if (obs.z > -4 && obs.z < 5) {
              if (playerYRef.current < 20) {
                crashed = true;
              }
            }
          } else if (obs.type === "high_barrier") {
            // Overhead gantry: must be crouch-rolling underneath
            if (obs.z > -4 && obs.z < 5) {
              if (!isRollingRef.current && playerYRef.current < 32) {
                crashed = true;
              }
            }
          } else if (obs.type === "train_static" || obs.type === "train_moving") {
            // Train collision: only crash if hitting front face without being on roof
            const isAtFrontFace = obs.z > -5 && obs.z < 7;
            if (isAtFrontFace && playerYRef.current < 48) {
              crashed = true;
            }
          }

          if (crashed) {
            if (hasHoverboard) {
              // Hoverboard absorbs crash!
              setHasHoverboard(false);
              setHoverboardTimer(0);
              obs.z = -120; // Clear obstacle
              screenShakeRef.current = 14;
              if (!isMuted) arcadeSfx.playCrashThud();

              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.4,
                text: "🛡️ HOVERBOARD SAVED YOU!",
                color: "#38bdf8",
                size: 20,
                alpha: 1,
                vy: -2,
              });
            } else {
              // Game Over!
              setGameOver(true);
              screenShakeRef.current = 24;
              if (!isMuted) arcadeSfx.playCrashThud();
            }
          }
        });

        // Cleanup passed entities
        obstaclesRef.current = obstaclesRef.current.filter((o) => o.z > -120);
        coinsRef.current = coinsRef.current.filter((c) => c.z > -20 && !c.collected);
        powerupsRef.current = powerupsRef.current.filter((p) => p.z > -20 && !p.collected);
      }

      // ── RENDERING ──
      ctx.save();

      // Screen Shake
      if (screenShakeRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1.2);
      }

      // 1. Sunset Sky Backdrop & Glow
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.42);
      skyGrad.addColorStop(0, "#0c0a09");
      skyGrad.addColorStop(0.4, "#1c1917");
      skyGrad.addColorStop(0.7, "#7c2d12"); // Sunset crimson
      skyGrad.addColorStop(1, "#f97316"); // Golden horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Sun on Horizon
      const sunGrad = ctx.createRadialGradient(canvasW / 2, canvasH * 0.34, 4, canvasW / 2, canvasH * 0.34, 48);
      sunGrad.addColorStop(0, "#fef08a");
      sunGrad.addColorStop(0.5, "rgba(251, 146, 60, 0.6)");
      sunGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(canvasW / 2, canvasH * 0.34, 48, 0, Math.PI * 2);
      ctx.fill();

      // Distant City Skyline Silhouettes
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(15, canvasH * 0.2, 45, canvasH * 0.16);
      ctx.fillRect(68, canvasH * 0.16, 55, canvasH * 0.2);
      ctx.fillRect(132, canvasH * 0.22, 42, canvasH * 0.14);
      ctx.fillRect(182, canvasH * 0.15, 65, canvasH * 0.21);
      ctx.fillRect(256, canvasH * 0.23, 48, canvasH * 0.13);
      ctx.fillRect(312, canvasH * 0.18, 40, canvasH * 0.18);

      // 2. Track Ballast Ground (Dark gravel bed)
      const groundGrad = ctx.createLinearGradient(0, canvasH * 0.34, 0, canvasH);
      groundGrad.addColorStop(0, "#292524");
      groundGrad.addColorStop(0.4, "#1c1917");
      groundGrad.addColorStop(1, "#0c0a09");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvasH * 0.34, canvasW, canvasH * 0.66);

      // Side Tunnel / Embankment Walls with Graffiti accents
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.moveTo(0, canvasH * 0.34);
      ctx.lineTo(canvasW * 0.08, canvasH * 0.34);
      ctx.lineTo(0, canvasH);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(canvasW, canvasH * 0.34);
      ctx.lineTo(canvasW * 0.92, canvasH * 0.34);
      ctx.lineTo(canvasW, canvasH);
      ctx.fill();

      // 3. Wooden Railway Sleepers (Ties moving towards camera)
      const tieSpacing = 15;
      const tieScroll = (trackDistanceRef.current * 18) % tieSpacing;
      for (let tz = tieScroll; tz < 250; tz += tieSpacing) {
        const pL = project3D(-1.55, 0, tz, canvasW, canvasH);
        const pR = project3D(1.55, 0, tz, canvasW, canvasH);
        ctx.strokeStyle = "rgba(120, 53, 15, 0.45)";
        ctx.lineWidth = Math.max(1, 4.5 * pL.scale);
        ctx.beginPath();
        ctx.moveTo(pL.x, pL.y);
        ctx.lineTo(pR.x, pR.y);
        ctx.stroke();
      }

      // 4. Polished Steel Rails (Separating 3 tracks)
      for (let r = -1.5; r <= 1.5; r += 1.0) {
        const topP = project3D(r, 0, 240, canvasW, canvasH);
        const botP = project3D(r, 0, 0, canvasW, canvasH);

        // Steel top gleam
        ctx.strokeStyle = "#e4e4e7";
        ctx.lineWidth = Math.max(1.5, 4.2 * botP.scale);
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();

        // Dark rail shadow under-lip
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        ctx.lineWidth = Math.max(1, 2 * botP.scale);
        ctx.beginPath();
        ctx.moveTo(topP.x + 1, topP.y + 1);
        ctx.lineTo(botP.x + 2, botP.y + 2);
        ctx.stroke();
      }

      // 5. Overhead Catenary Cable Poles
      const poleSpacing = 65;
      const poleScroll = (trackDistanceRef.current * 18) % poleSpacing;
      for (let pz = poleScroll; pz < 250; pz += poleSpacing) {
        const pLeft = project3D(-1.65, 0, pz, canvasW, canvasH);
        const pRight = project3D(1.65, 0, pz, canvasW, canvasH);
        const pTopL = project3D(-1.65, 80, pz, canvasW, canvasH);
        const pTopR = project3D(1.65, 80, pz, canvasW, canvasH);

        ctx.strokeStyle = "rgba(113, 113, 122, 0.5)";
        ctx.lineWidth = Math.max(1, 2.5 * pLeft.scale);

        // Vertical poles
        ctx.beginPath();
        ctx.moveTo(pLeft.x, pLeft.y);
        ctx.lineTo(pTopL.x, pTopL.y);
        ctx.moveTo(pRight.x, pRight.y);
        ctx.lineTo(pTopR.x, pTopR.y);
        // Horizontal gantry beam
        ctx.lineTo(pTopL.x, pTopL.y);
        ctx.stroke();
      }

      // 6. Render Obstacles (Sorted by distance Z descending)
      const sortedObstacles = [...obstaclesRef.current].sort((a, b) => b.z - a.z);
      sortedObstacles.forEach((obs) => {
        if (obs.z < 0 && obs.z < -obs.length) return;

        const p = project3D(obs.lane, 0, Math.max(1, obs.z), canvasW, canvasH);

        if (obs.type === "train_static" || obs.type === "train_moving") {
          // Commuter Train 3D Box
          const trainW = 46 * p.scale;
          const trainH = 78 * p.scale;
          const trainX = p.x - trainW / 2;
          const trainY = p.y - trainH;

          // Main Coach Body (Vibrant Red-Orange with metallic sheen)
          const bodyGrad = ctx.createLinearGradient(trainX, trainY, trainX + trainW, trainY);
          bodyGrad.addColorStop(0, "#b91c1c");
          bodyGrad.addColorStop(0.4, "#ef4444");
          bodyGrad.addColorStop(0.8, "#dc2626");
          bodyGrad.addColorStop(1, "#991b1b");
          ctx.fillStyle = bodyGrad;
          ctx.fillRect(trainX, trainY, trainW, trainH);

          // Roof Plate (Light gray with corrugated vents)
          ctx.fillStyle = "#e4e4e7";
          ctx.fillRect(trainX, trainY, trainW, 10 * p.scale);
          ctx.fillStyle = "#a1a1aa";
          ctx.fillRect(trainX + 4 * p.scale, trainY + 2 * p.scale, trainW - 8 * p.scale, 4 * p.scale);

          // Yellow Safety Line across waist
          ctx.fillStyle = "#facc15";
          ctx.fillRect(trainX, trainY + trainH * 0.45, trainW, 5 * p.scale);

          // Front Windshield Glass
          const glassGrad = ctx.createLinearGradient(trainX, trainY, trainX, trainY + 20 * p.scale);
          glassGrad.addColorStop(0, "#38bdf8");
          glassGrad.addColorStop(1, "#0284c7");
          ctx.fillStyle = glassGrad;
          ctx.fillRect(trainX + 5 * p.scale, trainY + 12 * p.scale, trainW - 10 * p.scale, 18 * p.scale);

          // Headlights
          const lightY = trainY + trainH - 12 * p.scale;
          const lightRadius = 4.5 * p.scale;

          if (obs.type === "train_moving") {
            // Volumetric glowing headlight beams
            ctx.shadowColor = "#fef08a";
            ctx.shadowBlur = 15;
            ctx.fillStyle = "#fef08a";
            ctx.beginPath();
            ctx.arc(trainX + 9 * p.scale, lightY, lightRadius, 0, Math.PI * 2);
            ctx.arc(trainX + trainW - 9 * p.scale, lightY, lightRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = "#cbd5e1";
            ctx.beginPath();
            ctx.arc(trainX + 9 * p.scale, lightY, lightRadius, 0, Math.PI * 2);
            ctx.arc(trainX + trainW - 9 * p.scale, lightY, lightRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (obs.type === "low_hurdle") {
          // Low Wooden Roadblock with Diagonal Hazard Stripes
          const bW = 40 * p.scale;
          const bH = 22 * p.scale;
          const bX = p.x - bW / 2;
          const bY = p.y - bH;

          // Yellow barrier bar
          ctx.fillStyle = "#facc15";
          ctx.fillRect(bX, bY, bW, bH);

          // Black hazard stripes
          ctx.fillStyle = "#18181b";
          for (let s = 0; s < bW; s += 8 * p.scale) {
            ctx.beginPath();
            ctx.moveTo(bX + s, bY + bH);
            ctx.lineTo(bX + s + 4 * p.scale, bY + bH);
            ctx.lineTo(bX + s + 8 * p.scale, bY);
            ctx.lineTo(bX + s + 4 * p.scale, bY);
            ctx.fill();
          }

          // Metal Support Legs
          ctx.fillStyle = "#71717a";
          ctx.fillRect(bX - 2 * p.scale, bY + bH, 4 * p.scale, 4 * p.scale);
          ctx.fillRect(bX + bW - 2 * p.scale, bY + bH, 4 * p.scale, 4 * p.scale);
        } else if (obs.type === "high_barrier") {
          // Overhead Track Gantry (Roll under)
          const gW = 46 * p.scale;
          const gH = 50 * p.scale;
          const gX = p.x - gW / 2;
          const gY = p.y - gH;

          // Side Steel Truss Columns
          ctx.fillStyle = "#52525b";
          ctx.fillRect(gX, gY, 5 * p.scale, gH);
          ctx.fillRect(gX + gW - 5 * p.scale, gY, 5 * p.scale, gH);

          // Overhead Crossbeam with hazard lights
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(gX, gY, gW, 14 * p.scale);

          // Flashing Red Signal Lamp
          const flash = Math.sin(performance.now() * 0.01) > 0;
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = flash ? 14 : 4;
          ctx.fillStyle = flash ? "#fecaca" : "#b91c1c";
          ctx.beginPath();
          ctx.arc(gX + gW / 2, gY + 7 * p.scale, 3.5 * p.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 7. Render Coins & Power-up Items
      coinsRef.current.forEach((c) => {
        if (c.collected || c.z < 0) return;
        const p = project3D(c.lane, c.y, c.z, canvasW, canvasH);
        const radius = Math.max(1.8, 8.0 * p.scale);

        // 3D Spinning Gold Coin
        const spin = Math.sin(performance.now() * 0.009 + c.id) * radius;
        ctx.save();
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.abs(spin), radius, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.5 * p.scale;
        ctx.stroke();
        ctx.restore();
      });

      powerupsRef.current.forEach((item) => {
        if (item.collected || item.z < 0) return;
        const p = project3D(item.lane, item.y, item.z, canvasW, canvasH);
        const boxSize = 24 * p.scale;

        ctx.save();
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(p.x - boxSize / 2, p.y - boxSize / 2, boxSize, boxSize, 5 * p.scale);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 * p.scale;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(8, 13 * p.scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const icon =
          item.type === "hoverboard"
            ? "🛹"
            : item.type === "magnet"
            ? "🧲"
            : item.type === "jetpack"
            ? "🚀"
            : item.type === "sneakers"
            ? "👟"
            : "2️⃣";
        ctx.fillText(icon, p.x, p.y);
        ctx.restore();
      });

      // 8. Render Runner Character (Jake)
      const playerPos = project3D(laneXRef.current, playerYRef.current, 0, canvasW, canvasH);
      const isRoll = isRollingRef.current;
      const pScale = playerPos.scale * 1.35;
      const pW = 34 * pScale;
      const pH = (isRoll ? 24 : 58) * pScale;
      const pX = playerPos.x;
      const pY = playerPos.y;

      ctx.save();
      ctx.translate(pX, pY);

      // Ground Shadow
      const groundPos = project3D(laneXRef.current, 0, 0, canvasW, canvasH);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(0, groundPos.y - pY, pW * 0.65, 5.5 * pScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hoverboard under feet
      if (hasHoverboard) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(-pW * 0.85, -4, pW * 1.7, 7 * pScale, 4);
        ctx.fill();

        // Neon side stripe
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-pW * 0.8, -2, pW * 1.6, 2 * pScale);
        ctx.shadowBlur = 0;

        // Thrust sparks
        particlesRef.current.push({
          x: pX - pW * 0.6,
          y: pY,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          color: "#38bdf8",
          size: 2.5,
          alpha: 1,
        });
      }

      // Jetpack Thrusters
      if (jetpackTimer > 0) {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-pW * 0.5, -pH * 0.6, 6 * pScale, 20 * pScale);
        ctx.fillRect(pW * 0.5 - 6 * pScale, -pH * 0.6, 6 * pScale, 20 * pScale);

        // Fiery exhaust particles
        for (let j = 0; j < 2; j++) {
          particlesRef.current.push({
            x: pX + (j === 0 ? -pW * 0.45 : pW * 0.45),
            y: pY - pH * 0.3,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 4 + 2,
            color: Math.random() < 0.5 ? "#facc15" : "#ef4444",
            size: 4,
            alpha: 1,
          });
        }
      }

      // Runner Body (Teal/Blue Hoodie)
      const legStride = Math.sin(performance.now() * 0.018) * 8 * pScale;
      ctx.fillStyle = "#0284c7"; // Hoodie
      ctx.fillRect(-pW * 0.45, -pH * 0.85, pW * 0.9, pH * 0.55);

      // White chest zipper & hood trim
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1.5 * pScale, -pH * 0.85, 3 * pScale, pH * 0.5);

      // Jeans & Running Legs
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-pW * 0.35, -pH * 0.3, pW * 0.3, pH * 0.3 + legStride);
      ctx.fillRect(pW * 0.05, -pH * 0.3, pW * 0.3, pH * 0.3 - legStride);

      // Sneakers (Red or Glowing Green with Sneakers Powerup)
      ctx.fillStyle = sneakersTimer > 0 ? "#22c55e" : "#ef4444";
      ctx.fillRect(-pW * 0.4, legStride - 4, pW * 0.35, 6 * pScale);
      ctx.fillRect(pW * 0.05, -legStride - 4, pW * 0.35, 6 * pScale);

      // Head & Backward Red Cap
      ctx.fillStyle = "#fbcfe8";
      ctx.beginPath();
      ctx.arc(0, -pH * 0.95, pW * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Backward Cap
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, -pH * 1.02, pW * 0.32, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-pW * 0.32, -pH * 1.05, 8 * pScale, 4 * pScale); // Visor

      ctx.restore();

      // 9. Grumpy Inspector & Dog Chase
      if (!gameOver && inspectorDistanceRef.current < 26) {
        const inspPos = project3D(laneXRef.current, 0, -inspectorDistanceRef.current, canvasW, canvasH);
        const inspScale = inspPos.scale * 1.4;

        // Inspector Uniform
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(inspPos.x - 16 * inspScale, inspPos.y - 45 * inspScale, 32 * inspScale, 45 * inspScale);

        // Security Cap & Gold Badge
        ctx.fillStyle = "#172554";
        ctx.fillRect(inspPos.x - 14 * inspScale, inspPos.y - 52 * inspScale, 28 * inspScale, 8 * inspScale);
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(inspPos.x - 4 * inspScale, inspPos.y - 36 * inspScale, 8 * inspScale, 8 * inspScale);

        // Guard Dog running right beside inspector
        ctx.fillStyle = "#78350f";
        ctx.fillRect(inspPos.x + 22 * inspScale, inspPos.y - 20 * inspScale, 20 * inspScale, 18 * inspScale);
        // Spiked collar
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(inspPos.x + 22 * inspScale, inspPos.y - 18 * inspScale, 4 * inspScale, 14 * inspScale);
      }

      // 10. Particles
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.035;

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((pt) => pt.alpha > 0);

      // 11. Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.02;

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

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, inMenu, project3D, hasHoverboard, jetpackTimer, sneakersTimer, multiplier, isMuted, deployHoverboard, spawnTrackChunk, botDiff]);

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

        {/* Score & Coins Readout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1 rounded-xl border border-white/10 shadow-md">
            <span className="text-xs font-black text-amber-400">SCORE</span>
            <span className="text-lg font-black text-white">{score}</span>
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

      {/* ── Active Power-ups Bar ── */}
      <div className="w-full flex items-center justify-center gap-1.5 my-1 z-30 flex-wrap min-h-[24px]">
        {hoverboardTimer > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-black uppercase flex items-center gap-1">
            <span>🛹 HOVERBOARD:</span>
            <span>{hoverboardTimer}s</span>
          </span>
        )}
        {magnetTimer > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 text-[10px] font-black uppercase flex items-center gap-1">
            <span>🧲 MAGNET:</span>
            <span>{magnetTimer}s</span>
          </span>
        )}
        {jetpackTimer > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400 text-orange-300 text-[10px] font-black uppercase flex items-center gap-1">
            <span>🚀 JETPACK:</span>
            <span>{jetpackTimer}s</span>
          </span>
        )}
        {sneakersTimer > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
            <span>👟 SNEAKERS:</span>
            <span>{sneakersTimer}s</span>
          </span>
        )}
        {multiplierTimer > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-black uppercase flex items-center gap-1">
            <span>2️⃣ 2X SCORE:</span>
            <span>{multiplierTimer}s</span>
          </span>
        )}
      </div>

      {/* ── Main Canvas Arena ── */}
      <div className="relative w-full aspect-[9/15] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800">
        <canvas
          ref={canvasRef}
          width={360}
          height={600}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-pointer touch-none"
        />

        {/* Hoverboard Deployment Quick Button */}
        <button
          type="button"
          onClick={deployHoverboard}
          className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer z-30 shadow-lg ${
            hasHoverboard
              ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
              : "bg-black/60 border-white/20 text-white hover:border-cyan-400 hover:text-cyan-300"
          }`}
        >
          <span>🛹</span>
          <span>{hasHoverboard ? `${hoverboardTimer}s` : "HOVERBOARD"}</span>
        </button>

        {/* Game Over Banner Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 z-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mb-3 shadow-lg">
              💥
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-wider mb-1">
              CAUGHT BY INSPECTOR!
            </h2>
            <div className="space-y-1 text-xs text-neutral-400 mb-4 font-mono">
              <p>
                Distance: <strong className="text-amber-400 text-base">{distance}m</strong>
              </p>
              <p>
                Coins: <strong className="text-yellow-400 text-base">{coins}</strong> 🪙 • Final Score: {score}
              </p>
            </div>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => startRun(botDiff)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm uppercase rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>SURF AGAIN</span>
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

      {/* ── On-Screen Touch Controls ── */}
      <div className="w-full grid grid-cols-4 gap-1.5 pt-2 z-30">
        <button
          type="button"
          onClick={() => handleLaneChange(-1)}
          className="py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-black text-xs uppercase rounded-xl border border-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          ◄ LEFT
        </button>

        <button
          type="button"
          onClick={handleJump}
          className="py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-amber-400 font-black text-xs uppercase rounded-xl border border-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          ▲ JUMP
        </button>

        <button
          type="button"
          onClick={handleRoll}
          className="py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-cyan-400 font-black text-xs uppercase rounded-xl border border-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          ▼ ROLL
        </button>

        <button
          type="button"
          onClick={() => handleLaneChange(1)}
          className="py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-black text-xs uppercase rounded-xl border border-neutral-800 flex items-center justify-center transition-all cursor-pointer"
        >
          RIGHT ►
        </button>
      </div>

      {/* ── Bottom HUD Footer Status ── */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono px-2 pt-1.5">
        <span>SUBWAY RUNNER // 60 FPS</span>
        <span>SWIPE OR ARROWS TO SURF</span>
      </div>
    </div>
  );
}
