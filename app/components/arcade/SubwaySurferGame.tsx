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
type Lane = -1 | 0 | 1; // Left, Center, Right

type ObstacleType =
  | "low_hurdle"      // Jump over
  | "high_barrier"    // Roll under
  | "train_static"    // Parked train
  | "train_moving"    // Oncoming train
  | "light_pole";     // Side obstacle

type PowerupType = "magnet" | "hoverboard" | "jetpack" | "sneakers" | "multiplier";

interface ObstacleEntity {
  id: number;
  type: ObstacleType;
  lane: Lane;
  z: number; // Distance in meters ahead (0 = player, 200 = horizon)
  height: number;
  width: number;
  length: number; // For trains
  speedZ: number; // If moving towards player
}

interface CoinEntity {
  id: number;
  lane: Lane;
  z: number;
  y: number; // 0 = ground, > 0 = airborne
  collected: boolean;
}

interface PowerupItem {
  id: number;
  type: PowerupType;
  lane: Lane;
  z: number;
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

  // Active Power-up Durations (in seconds)
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
  const laneXRef = useRef<number>(0); // -1 to +1 interpolated
  const playerYRef = useRef<number>(0); // 0 = ground, >0 = jumping
  const playerVyRef = useRef<number>(0);
  const isRollingRef = useRef<boolean>(false);
  const rollTimerRef = useRef<number>(0);
  const runSpeedRef = useRef<number>(24); // World scroll speed m/s
  const trackDistanceRef = useRef<number>(0);
  const lastSwipeTime = useRef<number>(0);
  const inspectorDistanceRef = useRef<number>(25); // distance behind player in meters

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

  // Perspective 3D Projection Helper
  const project3D = useCallback((laneOffset: number, yOffset: number, z: number, canvasW: number, canvasH: number) => {
    // Horizon vanishing point
    const horizonY = canvasH * 0.36;
    const fov = 160;
    const scale = fov / (fov + Math.max(0.1, z));

    // Ground lane width at screen bottom vs horizon
    const groundTrackWidth = canvasW * 0.82;
    const laneWidth = groundTrackWidth / 3;

    const screenX = canvasW / 2 + laneOffset * laneWidth * scale;
    const groundY = canvasH * 0.88;
    const screenY = horizonY + (groundY - horizonY) * scale - yOffset * scale * 1.6;

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
      y: 280,
      text: "🛹 HOVERBOARD ACTIVE!",
      color: "#38bdf8",
      size: 20,
      alpha: 1,
      vy: -1.5,
    });
  }, [isMuted]);

  // Jump Action
  const handleJump = useCallback(() => {
    if (playerYRef.current === 0) {
      const jumpPower = sneakersTimer > 0 ? 15.5 : 11.2;
      playerVyRef.current = jumpPower;
      if (!isMuted) arcadeSfx.playSubwayJump();
    }
  }, [sneakersTimer, isMuted]);

  // Roll Action
  const handleRoll = useCallback(() => {
    if (playerYRef.current > 0) {
      // Fast drop dive down
      playerVyRef.current = -18;
    }
    isRollingRef.current = true;
    rollTimerRef.current = 28; // ~450ms
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

  // Spawn Obstacle / Train Segment ahead on tracks
  const spawnTrackChunk = useCallback((zDistance: number) => {
    const lanes: Lane[] = [-1, 0, 1];
    const pickLane = () => lanes[Math.floor(Math.random() * lanes.length)];

    const roll = Math.random();
    if (roll < 0.35) {
      // High-Speed Moving or Static Train
      const tLane = pickLane();
      const isMoving = Math.random() < 0.45;
      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        type: isMoving ? "train_moving" : "train_static",
        lane: tLane,
        z: zDistance,
        height: 60,
        width: 48,
        length: 80,
        speedZ: isMoving ? 18 : 0,
      });

      if (isMoving && !isMuted) {
        arcadeSfx.playTrainHorn();
      }

      // Spawn coin line on top of the train!
      for (let c = 0; c < 5; c++) {
        coinsRef.current.push({
          id: Math.random(),
          lane: tLane,
          z: zDistance + 10 + c * 14,
          y: 65, // on top of train roof
          collected: false,
        });
      }
    } else if (roll < 0.65) {
      // Roadblock hurdles (low jump or high roll)
      const hLane = pickLane();
      const isHigh = Math.random() < 0.4;
      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        type: isHigh ? "high_barrier" : "low_hurdle",
        lane: hLane,
        z: zDistance,
        height: isHigh ? 55 : 24,
        width: 42,
        length: 8,
        speedZ: 0,
      });

      // Arc of coins over low hurdle
      if (!isHigh) {
        for (let a = 0; a < 4; a++) {
          coinsRef.current.push({
            id: Math.random(),
            lane: hLane,
            z: zDistance - 15 + a * 10,
            y: Math.sin((a / 3) * Math.PI) * 45 + 10,
            collected: false,
          });
        }
      }
    } else {
      // Ground coin trail + chance of powerup
      const cLane = pickLane();
      for (let c = 0; c < 6; c++) {
        coinsRef.current.push({
          id: Math.random(),
          lane: cLane,
          z: zDistance + c * 10,
          y: 0,
          collected: false,
        });
      }

      // 18% chance of powerup item
      if (Math.random() < 0.18) {
        const types: PowerupType[] = ["magnet", "hoverboard", "jetpack", "sneakers", "multiplier"];
        const pType = types[Math.floor(Math.random() * types.length)];
        powerupsRef.current.push({
          id: Date.now() + Math.random(),
          type: pType,
          lane: pickLane(),
          z: zDistance + 25,
          collected: false,
        });
      }
    }
  }, [isMuted]);

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
    runSpeedRef.current = diff === "easy" ? 18 : diff === "medium" ? 24 : 32;
    trackDistanceRef.current = 0;
    inspectorDistanceRef.current = 28;

    obstaclesRef.current = [];
    coinsRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];

    // Pre-populate track segments ahead
    for (let z = 60; z < 320; z += 55) {
      spawnTrackChunk(z);
    }
    setInMenu(false);
  }, [spawnTrackChunk]);

  // Initial population
  useEffect(() => {
    startRun(botDiff);
  }, [startRun, botDiff]);

  // Timers Tick
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

  // Touch Swipe Gesture Processing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    // Double tap hoverboard activation
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

    if (distSq > 240) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal lane switch
        if (dx > 0) handleLaneChange(1);
        else handleLaneChange(-1);
      } else {
        // Vertical jump or roll
        if (dy < 0) handleJump();
        else handleRoll();
      }
    }
    touchStartRef.current = null;
  };

  // Main 60 FPS Engine Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.58;

    const render = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // ── Physics Updates ──
      if (!gameOver && !inMenu) {
        // Lane lerp
        laneXRef.current += (targetLaneRef.current - laneXRef.current) * 0.22;

        // Jump & Gravity
        if (playerYRef.current > 0 || playerVyRef.current !== 0) {
          playerYRef.current += playerVyRef.current;
          playerVyRef.current -= gravity;
          if (playerYRef.current <= 0) {
            playerYRef.current = 0;
            playerVyRef.current = 0;
          }
        }

        // Jetpack flight
        if (jetpackTimer > 0) {
          playerYRef.current = 80; // High in the sky
          playerVyRef.current = 0;
        }

        // Roll timer
        if (isRollingRef.current) {
          rollTimerRef.current -= 1;
          if (rollTimerRef.current <= 0) {
            isRollingRef.current = false;
          }
        }

        // World travel progression
        const dt = 1 / 60;
        const speed = runSpeedRef.current;
        trackDistanceRef.current += speed * dt;
        setDistance(Math.floor(trackDistanceRef.current));
        setScore((prev) => {
          const next = prev + Math.floor(speed * 0.15 * multiplier);
          setHighScore((h) => Math.max(h, next));
          return next;
        });

        // Inspector chase recovery
        inspectorDistanceRef.current = Math.min(30, inspectorDistanceRef.current + dt * 1.5);

        // Advance obstacles towards camera
        obstaclesRef.current.forEach((obs) => {
          obs.z -= (speed + obs.speedZ) * dt * 2.8;
        });

        // Advance coins & powerups
        coinsRef.current.forEach((c) => {
          c.z -= speed * dt * 2.8;

          // Magnet Attraction
          if (magnetTimer > 0 && !c.collected && c.z < 80 && c.z > -5) {
            const laneDiff = targetLaneRef.current - c.lane;
            c.lane = targetLaneRef.current;
            c.y += (playerYRef.current - c.y) * 0.25;
          }
        });

        powerupsRef.current.forEach((p) => {
          p.z -= speed * dt * 2.8;
        });

        // Continuous track generation ahead
        const farthestObstacle = obstaclesRef.current.reduce((max, o) => Math.max(max, o.z), 0);
        if (farthestObstacle < 240) {
          spawnTrackChunk(260 + Math.random() * 40);
        }

        // ── Collision Checks ──
        // 1. Coins Collection
        coinsRef.current.forEach((c) => {
          if (!c.collected && Math.abs(c.z) < 6) {
            const laneMatch = Math.abs(laneXRef.current - c.lane) < 0.45;
            const heightMatch = Math.abs(playerYRef.current - c.y) < 32;
            if (laneMatch && heightMatch) {
              c.collected = true;
              setCoins((cn) => cn + 1);
              setScore((s) => s + 10 * multiplier);
              if (!isMuted) arcadeSfx.playSubwayCoin();

              // Sparkle particle
              particlesRef.current.push({
                x: canvasW / 2 + c.lane * (canvasW * 0.25),
                y: canvasH * 0.72 - c.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 4 - 2,
                color: "#facc15",
                size: 3,
                alpha: 1,
              });
            }
          }
        });

        // 2. Power-ups Pickup
        powerupsRef.current.forEach((p) => {
          if (!p.collected && Math.abs(p.z) < 8) {
            if (Math.abs(laneXRef.current - p.lane) < 0.5 && playerYRef.current < 40) {
              p.collected = true;
              if (!isMuted) arcadeSfx.playVictory();

              if (p.type === "hoverboard") deployHoverboard();
              else if (p.type === "magnet") setMagnetTimer(15);
              else if (p.type === "jetpack") {
                setJetpackTimer(6);
                if (!isMuted) arcadeSfx.playJetpackRoar();
              } else if (p.type === "sneakers") setSneakersTimer(15);
              else if (p.type === "multiplier") {
                setMultiplier(2);
                setMultiplierTimer(15);
              }

              floatingTextsRef.current.push({
                id: Math.random(),
                x: canvasW / 2,
                y: canvasH * 0.5,
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
          if (jetpackTimer > 0) return; // Jetpack immune

          // Check if obstacle is right at player depth
          const isAtPlayerDepth = obs.z > -obs.length && obs.z < 8;
          if (isAtPlayerDepth) {
            const laneMatch = Math.abs(laneXRef.current - obs.lane) < 0.45;

            if (laneMatch) {
              let crashed = false;

              if (obs.type === "low_hurdle") {
                // Must be jumping above hurdle height (24px)
                if (playerYRef.current < 20) crashed = true;
              } else if (obs.type === "high_barrier") {
                // Must be rolling underneath
                if (!isRollingRef.current && playerYRef.current < 30) crashed = true;
              } else if (obs.type === "train_static" || obs.type === "train_moving") {
                // Train roof is at y=60; must be on roof or miss
                if (playerYRef.current < 55) crashed = true;
              }

              if (crashed) {
                if (hasHoverboard) {
                  // Hoverboard shields one crash!
                  setHasHoverboard(false);
                  setHoverboardTimer(0);
                  obs.z = -100; // clear obstacle
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
                  // Game Over crash!
                  setGameOver(true);
                  screenShakeRef.current = 24;
                  if (!isMuted) arcadeSfx.playCrashThud();
                }
              }
            }
          }
        });

        // Garbage collection of passed entities
        obstaclesRef.current = obstaclesRef.current.filter((o) => o.z > -120);
        coinsRef.current = coinsRef.current.filter((c) => c.z > -20 && !c.collected);
        powerupsRef.current = powerupsRef.current.filter((p) => p.z > -20 && !p.collected);
      }

      // ── CANVAS RENDERING (Pseudo-3D Perspective) ──
      ctx.save();

      // Screen Shake
      if (screenShakeRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1.2);
      }

      // 1. Sky & Horizon Gradient (Subway Sunset / Cyber Dawn)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.4);
      skyGrad.addColorStop(0, "#09090b");
      skyGrad.addColorStop(0.5, "#18181b");
      skyGrad.addColorStop(1, "#3f3f46");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Distant City Skyline Silhouettes
      ctx.fillStyle = "#18181b";
      ctx.fillRect(20, canvasH * 0.22, 50, canvasH * 0.16);
      ctx.fillRect(80, canvasH * 0.18, 65, canvasH * 0.2);
      ctx.fillRect(160, canvasH * 0.25, 45, canvasH * 0.13);
      ctx.fillRect(220, canvasH * 0.19, 80, canvasH * 0.19);
      ctx.fillRect(310, canvasH * 0.24, 40, canvasH * 0.14);

      // 2. Track Ballast Floor (Dark Asphalt / Gravel)
      const groundGrad = ctx.createLinearGradient(0, canvasH * 0.36, 0, canvasH);
      groundGrad.addColorStop(0, "#27272a");
      groundGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvasH * 0.36, canvasW, canvasH * 0.64);

      // 3. Steel Rails & Railroad Ties (Wooden sleepers moving forward)
      const horizonY = canvasH * 0.36;
      const trackBaseWidth = canvasW * 0.82;
      const laneWidth = trackBaseWidth / 3;

      // Draw Wooden Sleepers
      const tieSpacing = 16;
      const scrollOffset = (trackDistanceRef.current * 18) % tieSpacing;
      for (let tz = scrollOffset; tz < 260; tz += tieSpacing) {
        const pL = project3D(-1.5, 0, tz, canvasW, canvasH);
        const pR = project3D(1.5, 0, tz, canvasW, canvasH);
        ctx.strokeStyle = "rgba(120, 53, 15, 0.4)";
        ctx.lineWidth = Math.max(1, 4 * pL.scale);
        ctx.beginPath();
        ctx.moveTo(pL.x, pL.y);
        ctx.lineTo(pR.x, pR.y);
        ctx.stroke();
      }

      // Draw 4 Steel Rails (separating 3 tracks)
      for (let r = -1.5; r <= 1.5; r += 1.0) {
        const topP = project3D(r, 0, 240, canvasW, canvasH);
        const botP = project3D(r, 0, 0, canvasW, canvasH);

        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = Math.max(1.5, 4.5 * botP.scale);
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();
      }

      // 4. Render Track Obstacles (Sorted by distance Z descending for depth)
      const sortedObstacles = [...obstaclesRef.current].sort((a, b) => b.z - a.z);
      sortedObstacles.forEach((obs) => {
        if (obs.z < 0 && obs.z < -obs.length) return;

        const p = project3D(obs.lane, 0, Math.max(1, obs.z), canvasW, canvasH);

        if (obs.type === "train_static" || obs.type === "train_moving") {
          // Train Car Body
          const trainW = 44 * p.scale;
          const trainH = 75 * p.scale;
          const trainX = p.x - trainW / 2;
          const trainY = p.y - trainH;

          // Side / Front gradient
          const trainGrad = ctx.createLinearGradient(trainX, trainY, trainX + trainW, trainY);
          trainGrad.addColorStop(0, "#dc2626");
          trainGrad.addColorStop(0.5, "#ef4444");
          trainGrad.addColorStop(1, "#991b1b");
          ctx.fillStyle = trainGrad;
          ctx.fillRect(trainX, trainY, trainW, trainH);

          // Roof metal sheet
          ctx.fillStyle = "#e4e4e7";
          ctx.fillRect(trainX, trainY, trainW, 8 * p.scale);

          // Front Windshield
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(trainX + 4 * p.scale, trainY + 12 * p.scale, trainW - 8 * p.scale, 18 * p.scale);

          // Headlights for moving train
          if (obs.type === "train_moving") {
            ctx.shadowColor = "#fef08a";
            ctx.shadowBlur = 15;
            ctx.fillStyle = "#fef08a";
            ctx.beginPath();
            ctx.arc(trainX + 8 * p.scale, trainY + trainH - 12 * p.scale, 5 * p.scale, 0, Math.PI * 2);
            ctx.arc(trainX + trainW - 8 * p.scale, trainY + trainH - 12 * p.scale, 5 * p.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else if (obs.type === "low_hurdle") {
          // Low wooden roadblock barrier with hazard stripes
          const bW = 38 * p.scale;
          const bH = 22 * p.scale;
          const bX = p.x - bW / 2;
          const bY = p.y - bH;

          ctx.fillStyle = "#eab308";
          ctx.fillRect(bX, bY, bW, bH);

          // Black diagonal stripes
          ctx.fillStyle = "#18181b";
          for (let s = 0; s < bW; s += 8 * p.scale) {
            ctx.fillRect(bX + s, bY, 4 * p.scale, bH);
          }
        } else if (obs.type === "high_barrier") {
          // Elevated signal gantry (roll underneath)
          const gW = 44 * p.scale;
          const gH = 48 * p.scale;
          const gX = p.x - gW / 2;
          const gY = p.y - gH;

          // Side poles
          ctx.fillStyle = "#71717a";
          ctx.fillRect(gX, gY, 5 * p.scale, gH);
          ctx.fillRect(gX + gW - 5 * p.scale, gY, 5 * p.scale, gH);

          // Top crossbeam with flashing red light
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(gX, gY, gW, 14 * p.scale);

          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 10;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(gX + gW / 2, gY + 7 * p.scale, 3 * p.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 5. Render Coins & Powerups
      coinsRef.current.forEach((c) => {
        if (c.collected || c.z < 0) return;
        const p = project3D(c.lane, c.y, c.z, canvasW, canvasH);
        const radius = Math.max(1.5, 7.5 * p.scale);

        // Spinning Gold Coin
        const spin = Math.sin(performance.now() * 0.008 + c.id) * radius;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.abs(spin), radius, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5 * p.scale;
        ctx.stroke();
      });

      powerupsRef.current.forEach((item) => {
        if (item.collected || item.z < 0) return;
        const p = project3D(item.lane, 12, item.z, canvasW, canvasH);
        const boxSize = 22 * p.scale;

        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(p.x - boxSize / 2, p.y - boxSize / 2, boxSize, boxSize, 4 * p.scale);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Icon inside powerup box
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(8, 12 * p.scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const icon = item.type === "hoverboard" ? "🛹" : item.type === "magnet" ? "🧲" : item.type === "jetpack" ? "🚀" : item.type === "sneakers" ? "👟" : "2️⃣";
        ctx.fillText(icon, p.x, p.y);
      });

      // 6. Render Player Runner Character
      const playerPos = project3D(laneXRef.current, playerYRef.current, 0, canvasW, canvasH);
      const isRoll = isRollingRef.current;
      const pScale = playerPos.scale * 1.35;
      const pW = 32 * pScale;
      const pH = (isRoll ? 26 : 56) * pScale;
      const pX = playerPos.x;
      const pY = playerPos.y;

      ctx.save();
      ctx.translate(pX, pY);

      // Shadow on Ground
      const groundPos = project3D(laneXRef.current, 0, 0, canvasW, canvasH);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, groundPos.y - pY, pW * 0.7, 6 * pScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hoverboard under feet
      if (hasHoverboard) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(-pW * 0.8, -4, pW * 1.6, 7 * pScale, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Thruster sparks
        particlesRef.current.push({
          x: pX - pW * 0.7,
          y: pY,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          color: "#38bdf8",
          size: 2.5,
          alpha: 1,
        });
      }

      // Jetpack Thruster
      if (jetpackTimer > 0) {
        // Dual fire jets
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-pW * 0.5, -pH * 0.5, 6 * pScale, 18 * pScale);
        ctx.fillRect(pW * 0.5 - 6 * pScale, -pH * 0.5, 6 * pScale, 18 * pScale);

        // Exhaust smoke particles
        particlesRef.current.push({
          x: pX - pW * 0.3,
          y: pY - pH * 0.3,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 4 + 2,
          color: Math.random() < 0.5 ? "#facc15" : "#ef4444",
          size: 4,
          alpha: 1,
        });
      }

      // Runner Body (Blue Hoodie Jacket & Jeans)
      ctx.fillStyle = "#2563eb"; // Blue hoodie
      ctx.fillRect(-pW * 0.45, -pH * 0.85, pW * 0.9, pH * 0.55);

      // Jeans / Legs with running stride animation
      const legStride = Math.sin(performance.now() * 0.018) * 8 * pScale;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-pW * 0.35, -pH * 0.3, pW * 0.3, (pH * 0.3) + legStride);
      ctx.fillRect(pW * 0.05, -pH * 0.3, pW * 0.3, (pH * 0.3) - legStride);

      // Red Sneakers
      ctx.fillStyle = sneakersTimer > 0 ? "#22c55e" : "#ef4444";
      ctx.fillRect(-pW * 0.4, legStride - 4, pW * 0.35, 6 * pScale);
      ctx.fillRect(pW * 0.05, -legStride - 4, pW * 0.35, 6 * pScale);

      // Head & Backward Red Cap
      ctx.fillStyle = "#fbcfe8"; // skin tone
      ctx.beginPath();
      ctx.arc(0, -pH * 0.95, pW * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Red Cap with visor turned back
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, -pH * 1.02, pW * 0.32, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-pW * 0.32, -pH * 1.05, 8 * pScale, 4 * pScale); // visor

      ctx.restore();

      // 7. Grumpy Inspector & Dog Chase Behind
      if (!gameOver && inspectorDistanceRef.current < 26) {
        const inspPos = project3D(laneXRef.current, 0, -inspectorDistanceRef.current, canvasW, canvasH);
        const inspScale = inspPos.scale * 1.4;
        ctx.fillStyle = "#1e3a8a"; // Police uniform
        ctx.fillRect(inspPos.x - 16 * inspScale, inspPos.y - 45 * inspScale, 32 * inspScale, 45 * inspScale);
        ctx.fillStyle = "#fef08a"; // Badge
        ctx.fillRect(inspPos.x - 4 * inspScale, inspPos.y - 35 * inspScale, 8 * inspScale, 8 * inspScale);
      }

      // 8. Particles (Coins & Thrusters)
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

      // 9. Floating Score & Power-up Text Badges
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
  }, [gameOver, inMenu, project3D, hasHoverboard, jetpackTimer, sneakersTimer, multiplier, isMuted, deployHoverboard, spawnTrackChunk]);

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
      <div className="w-full flex items-center justify-center gap-1.5 my-1 z-30 flex-wrap">
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

        {/* Double-Tap Hoverboard Indicator */}
        {!hasHoverboard && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/10 text-[9px] font-mono text-neutral-400 z-30 pointer-events-none">
            DOUBLE-TAP SCREEN TO DEPLOY 🛹 HOVERBOARD
          </div>
        )}

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

      {/* ── On-Screen Touch Controls (Mobile Ergonomics) ── */}
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
