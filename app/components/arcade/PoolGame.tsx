"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { firePoolShot, type ArcadeMatch, type PoolBall } from "@/lib/arcade";
import { executePoolBotShot } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  Sparkles,
  HelpCircle,
  Users,
} from "lucide-react";

interface PoolGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const TABLE_WIDTH = 380;
const TABLE_HEIGHT = 480;
const CUSHION = 24;
const PLAYABLE_MIN_X = CUSHION + 2;
const PLAYABLE_MAX_X = TABLE_WIDTH - CUSHION - 2;
const PLAYABLE_MIN_Y = CUSHION + 2;
const PLAYABLE_MAX_Y = TABLE_HEIGHT - CUSHION - 2;

const FRICTION = 0.986;
const RESTITUTION = 0.89;

// 6 Tournament Pocket Positions
const POCKETS = [
  { x: CUSHION, y: CUSHION, name: "TOP_LEFT" },
  { x: TABLE_WIDTH / 2, y: CUSHION - 4, name: "TOP_MID" },
  { x: TABLE_WIDTH - CUSHION, y: CUSHION, name: "TOP_RIGHT" },
  { x: CUSHION, y: TABLE_HEIGHT - CUSHION, name: "BOT_LEFT" },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION + 4, name: "BOT_MID" },
  { x: TABLE_WIDTH - CUSHION, y: TABLE_HEIGHT - CUSHION, name: "BOT_RIGHT" },
];
const POCKET_RADIUS = 24;
const POCKET_DEPTH_RADIUS = 16;

// Ball Color Palette (Official Tournament Balls)
const BALL_COLORS: Record<string, string> = {
  "1": "#eab308", // Yellow
  "2": "#2563eb", // Blue
  "3": "#dc2626", // Red
  "4": "#7c3aed", // Purple
  "5": "#ea580c", // Orange
  "6": "#16a34a", // Green
  "7": "#7f1d1d", // Maroon
  "8": "#09090b", // 8-Ball Black
  "9": "#eab308", // Stripe Yellow
  "10": "#2563eb", // Stripe Blue
  "11": "#dc2626", // Stripe Red
  "12": "#7c3aed", // Stripe Purple
  "13": "#ea580c", // Stripe Orange
  "14": "#16a34a", // Stripe Green
  "15": "#7f1d1d", // Stripe Maroon
};

export default function PoolGame({ match, currentUid }: PoolGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ps = match.poolState;
  const isMyTurn = ps?.currentTurnUid === currentUid && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;

  // Aiming and Controls State
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Local physics pieces state
  const ballsRef = useRef<PoolBall[]>([]);
  const isSimulatingRef = useRef(false);
  const pocketedThisShotRef = useRef<PoolBall[]>([]);
  const cueScratchRef = useRef(false);

  // Sync balls from match state
  useEffect(() => {
    if (ps?.ballsStr && !isSimulatingRef.current) {
      try {
        const parsed = JSON.parse(ps.ballsStr);
        ballsRef.current = parsed;
      } catch (e) {
        console.error("Failed to parse pool balls:", e);
      }
    }
  }, [ps?.ballsStr]);

  // Trigger AI Bot Shot in VS_COMPUTER mode
  useEffect(() => {
    if (!ps || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === ps.currentTurnUid && p.isBot
    );
    if (botPlayer && !isSimulatingRef.current) {
      executePoolBotShot(match);
    }
  }, [match, ps?.currentTurnUid]);

  // Main Canvas & Continuous Physics Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const updatePhysicsAndRender = () => {
      const balls = ballsRef.current;
      let anyMoving = false;

      // 1. Physics Sub-Stepping for High-Speed Ball Accuracy
      const subSteps = 3;
      for (let step = 0; step < subSteps; step++) {
        balls.forEach((b) => {
          if (b.isPocketed) return;

          const speed = Math.hypot(b.vx, b.vy);
          if (speed > 0.05) {
            anyMoving = true;
            b.x += b.vx / subSteps;
            b.y += b.vy / subSteps;

            b.vx *= Math.pow(FRICTION, 1 / subSteps);
            b.vy *= Math.pow(FRICTION, 1 / subSteps);

            // Cushion Frame Rebound
            if (b.x - b.radius < PLAYABLE_MIN_X) {
              b.x = PLAYABLE_MIN_X + b.radius;
              b.vx = -b.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (b.x + b.radius > PLAYABLE_MAX_X) {
              b.x = PLAYABLE_MAX_X - b.radius;
              b.vx = -b.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            if (b.y - b.radius < PLAYABLE_MIN_Y) {
              b.y = PLAYABLE_MIN_Y + b.radius;
              b.vy = -b.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (b.y + b.radius > PLAYABLE_MAX_Y) {
              b.y = PLAYABLE_MAX_Y - b.radius;
              b.vy = -b.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            // Pocket Gravity & Pocketing Check
            POCKETS.forEach((pkt) => {
              const dToPocket = Math.hypot(b.x - pkt.x, b.y - pkt.y);
              if (dToPocket < POCKET_RADIUS) {
                // Gravitational suction into pocket
                const pullForce = 0.35;
                b.vx += ((pkt.x - b.x) / dToPocket) * pullForce;
                b.vy += ((pkt.y - b.y) / dToPocket) * pullForce;

                if (dToPocket < POCKET_DEPTH_RADIUS) {
                  b.isPocketed = true;
                  b.vx = 0;
                  b.vy = 0;
                  pocketedThisShotRef.current.push({ ...b });

                  if (b.type === "cue") {
                    cueScratchRef.current = true;
                    soundSynth.playBuzzer();
                  } else if (b.type === "8ball") {
                    soundSynth.playFanfare();
                  } else {
                    soundSynth.playSnare();
                  }
                }
              }
            });
          } else {
            b.vx = 0;
            b.vy = 0;
          }
        });

        // 2. Ball-to-Ball Elastic Collisions
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            if (b1.isPocketed || b2.isPocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist && dist > 0) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;

              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              b1.vx -= p * nx * RESTITUTION;
              b1.vy -= p * ny * RESTITUTION;
              b2.vx += p * nx * RESTITUTION;
              b2.vy += p * ny * RESTITUTION;

              if (Math.hypot(b1.vx, b1.vy) > 1.0) {
                soundSynth.playSubtlePop();
              }
            }
          }
        }
      }

      // Check if simulation just completed
      if (isSimulatingRef.current && !anyMoving) {
        isSimulatingRef.current = false;
        setIsSimulating(false);
        finalizeShotTurn();
      }

      // --- 3. Photorealistic Table Rendering ---
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // A. Championship Green Velvet Felt Bed
      const feltGrad = ctx.createRadialGradient(
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        40,
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        TABLE_HEIGHT * 0.7
      );
      feltGrad.addColorStop(0, "#059669"); // Vivid Emerald Green
      feltGrad.addColorStop(0.6, "#047857");
      feltGrad.addColorStop(1, "#065f46"); // Rich Deep Green
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // B. Deluxe Mahogany Wooden Rails with Bevels
      ctx.strokeStyle = "#381a08";
      ctx.lineWidth = CUSHION;
      ctx.strokeRect(CUSHION / 2, CUSHION / 2, TABLE_WIDTH - CUSHION, TABLE_HEIGHT - CUSHION);

      // Inner Cushion Rubber Border
      ctx.strokeStyle = "#064e3b";
      ctx.lineWidth = 4;
      ctx.strokeRect(CUSHION, CUSHION, TABLE_WIDTH - CUSHION * 2, TABLE_HEIGHT - CUSHION * 2);

      // Pearl Diamond Sights on Rails
      const diamondPositions = [
        [TABLE_WIDTH / 4, CUSHION / 2],
        [(TABLE_WIDTH * 3) / 4, CUSHION / 2],
        [TABLE_WIDTH / 4, TABLE_HEIGHT - CUSHION / 2],
        [(TABLE_WIDTH * 3) / 4, TABLE_HEIGHT - CUSHION / 2],
        [CUSHION / 2, TABLE_HEIGHT / 4],
        [CUSHION / 2, (TABLE_HEIGHT * 3) / 4],
        [TABLE_WIDTH - CUSHION / 2, TABLE_HEIGHT / 4],
        [TABLE_WIDTH - CUSHION / 2, (TABLE_HEIGHT * 3) / 4],
      ];
      diamondPositions.forEach(([dx, dy]) => {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // C. Head String & Foot Spot Markings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CUSHION, TABLE_HEIGHT - 110);
      ctx.lineTo(TABLE_WIDTH - CUSHION, TABLE_HEIGHT - 110);
      ctx.stroke();

      // Foot spot
      ctx.beginPath();
      ctx.arc(TABLE_WIDTH / 2, 130, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fill();

      // D. 6 Deep Leather Drop Pockets with Brass Rims
      POCKETS.forEach((pkt) => {
        // Drop Shadow
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fill();

        // Brass Pocket Lip
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#a16207";
        ctx.fill();
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Deep Net Pocket Hole
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_DEPTH_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();
      });

      // E. Render 3D Shiny Billiards Balls
      balls.forEach((b) => {
        if (b.isPocketed) return;

        // Dynamic 3D Drop Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x + 2, b.y + 3, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();
        ctx.restore();

        // 3D Spherical Radial Gradient
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        if (b.type === "cue") {
          // Pure Ivory Cue Ball
          const cueGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          cueGrad.addColorStop(0, "#ffffff");
          cueGrad.addColorStop(0.7, "#f3f4f6");
          cueGrad.addColorStop(1, "#9ca3af");
          ctx.fillStyle = cueGrad;
          ctx.fill();

          // Red Dot Target on Cue Ball
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
        } else if (b.type === "8ball") {
          // Glossy 8-Ball
          const eightGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          eightGrad.addColorStop(0, "#4b5563");
          eightGrad.addColorStop(0.5, "#1f2937");
          eightGrad.addColorStop(1, "#09090b");
          ctx.fillStyle = eightGrad;
          ctx.fill();

          // White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 6px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("8", b.x, b.y);
        } else if (b.type === "solid") {
          // Solid Colored Ball
          const baseCol = BALL_COLORS[String(b.id)] || "#eab308";
          const sGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          sGrad.addColorStop(0, "#ffffff");
          sGrad.addColorStop(0.3, baseCol);
          sGrad.addColorStop(1, "#000000");
          ctx.fillStyle = sGrad;
          ctx.fill();

          // White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 5px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.id), b.x, b.y);
        } else if (b.type === "stripe") {
          // Striped Colored Ball
          const baseCol = BALL_COLORS[String(b.id)] || "#2563eb";
          const strGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          strGrad.addColorStop(0, "#ffffff");
          strGrad.addColorStop(0.6, "#f3f4f6");
          strGrad.addColorStop(1, "#9ca3af");
          ctx.fillStyle = strGrad;
          ctx.fill();

          // Central Colored Stripe Band
          ctx.save();
          ctx.clip();
          ctx.fillStyle = baseCol;
          ctx.fillRect(b.x - b.radius, b.y - b.radius * 0.45, b.radius * 2, b.radius * 0.9);
          ctx.restore();

          // White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 5px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.id), b.x, b.y);
        }

        ctx.restore();
      });

      // F. 3D Wooden Cue Stick & Dynamic Aim Laser
      if (isAiming && dragStart && dragCurrent) {
        const cueBall = balls.find((b) => b.type === "cue");
        if (cueBall && !cueBall.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;
          const aimDist = Math.hypot(pullDx, pullDy);

          if (aimDist > 2) {
            const dirX = pullDx / aimDist;
            const dirY = pullDy / aimDist;
            const laserLen = 320;

            // Direct Aim Guide Laser
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cueBall.x, cueBall.y);
            ctx.lineTo(cueBall.x + dirX * laserLen, cueBall.y + dirY * laserLen);
            ctx.strokeStyle = "#34d399";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.shadowColor = "#34d399";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();

            // 3D Wooden Cue Stick Rendering Behind Cue Ball
            const cueStickOffset = 18 + Math.min(aimDist * 0.8, 65);
            const cueStartX = cueBall.x - dirX * cueStickOffset;
            const cueStartY = cueBall.y - dirY * cueStickOffset;
            const cueEndX = cueStartX - dirX * 180;
            const cueEndY = cueStartY - dirY * 180;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cueStartX, cueStartY);
            ctx.lineTo(cueEndX, cueEndY);
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.stroke();

            // Cue Tip White Chalk
            ctx.beginPath();
            ctx.moveTo(cueStartX, cueStartY);
            ctx.lineTo(cueStartX - dirX * 10, cueStartY - dirY * 10);
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(updatePhysicsAndRender);
    };

    animId = requestAnimationFrame(updatePhysicsAndRender);
    return () => cancelAnimationFrame(animId);
  }, [isAiming, dragStart, dragCurrent]);

  // Pointer Handlers for Aiming & Shooting
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || match.status === "FINISHED" || isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const cueBall = ballsRef.current.find((b) => b.type === "cue");

    if (cueBall && Math.hypot(cueBall.x - x, cueBall.y - y) < cueBall.radius * 3.5) {
      setIsAiming(true);
      setDragStart({ x, y });
      setDragCurrent({ x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || !dragStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    setDragCurrent(current);

    const pullDist = Math.hypot(dragStart.x - current.x, dragStart.y - current.y);
    setPower(Math.min(Math.round((pullDist / 120) * 100), 100));
  };

  const handlePointerUp = async () => {
    if (!isAiming || !dragStart || !dragCurrent) return;

    const cueBall = ballsRef.current.find((b) => b.type === "cue");
    if (cueBall) {
      const pullDx = dragStart.x - dragCurrent.x;
      const pullDy = dragStart.y - dragCurrent.y;
      const pullDist = Math.hypot(pullDx, pullDy);

      if (pullDist > 4) {
        const forceMultiplier = 0.32;
        const impulseX = pullDx * forceMultiplier;
        const impulseY = pullDy * forceMultiplier;

        cueBall.vx = impulseX;
        cueBall.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        cueScratchRef.current = false;
        isSimulatingRef.current = true;
        setIsSimulating(true);
      }
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  // Finalize Shot and Apply Official 8-Ball Rules
  const finalizeShotTurn = useCallback(async () => {
    const pocketed = pocketedThisShotRef.current;
    const isScratch = cueScratchRef.current;
    const balls = ballsRef.current;

    let nextTurnUid = ps?.currentTurnUid || currentUid;
    let newP1Score = ps?.p1Score || 0;
    let newP2Score = ps?.p2Score || 0;
    let actionLog = "";
    let isGameOver = false;
    let winnerUid = currentUid;

    // Reset Cue Ball if Scratched
    const cueBall = balls.find((b) => b.type === "cue");
    if (cueBall) {
      cueBall.isPocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
      cueBall.x = TABLE_WIDTH / 2;
      cueBall.y = TABLE_HEIGHT - 100;
    }

    const eightBallPocketed = pocketed.some((b) => b.type === "8ball");
    const solidsPocketed = pocketed.filter((b) => b.type === "solid").length;
    const stripesPocketed = pocketed.filter((b) => b.type === "stripe").length;

    // 1. Check Scratch Foul
    if (isScratch) {
      actionLog = "⚠️ SCRATCH! Cue ball in pocket. Foul ball in hand!";
      const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
      nextTurnUid = opponentUid;
    } else if (eightBallPocketed) {
      // 2. Eight Ball Pocketed
      const remainingTargets = balls.filter((b) => (b.type === "solid" || b.type === "stripe") && !b.isPocketed);
      if (remainingTargets.length === 0) {
        actionLog = "🏆 8-BALL POCKETED CLEANLY! VICTORY!";
        isGameOver = true;
        winnerUid = currentUid;
        soundSynth.playFanfare();
      } else {
        actionLog = "❌ 8-Ball pocketed early! Automatic loss.";
        isGameOver = true;
        winnerUid = playerUids.find((id) => id !== currentUid) || currentUid;
        soundSynth.playBuzzer();
      }
    } else if (solidsPocketed > 0 || stripesPocketed > 0) {
      // 3. Object Balls Pocketed
      const count = solidsPocketed + stripesPocketed;
      if (isPlayer1) newP1Score += count * 10;
      else newP2Score += count * 10;

      actionLog = `Pocketed ${count} ball(s) (+${count * 10} pts)! Bonus shot awarded!`;
      nextTurnUid = currentUid;
    } else {
      // 4. No Ball Pocketed
      const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
      nextTurnUid = opponentUid;
      actionLog = "No ball pocketed. Turn passes.";
    }

    await firePoolShot(
      match.id,
      currentUid,
      0,
      0,
      balls,
      {
        nextTurnUid,
        p1Score: newP1Score,
        p2Score: newP2Score,
        actionLog,
        isGameOver,
        winnerUid,
      }
    );
  }, [currentUid, isPlayer1, match.id, playerUids, ps]);

  // Inventory of remaining balls
  const balls = ballsRef.current;
  const remainingSolids = balls.filter((b) => b.type === "solid" && !b.isPocketed).length;
  const remainingStripes = balls.filter((b) => b.type === "stripe" && !b.isPocketed).length;
  const isEightBallOnTable = balls.some((b) => b.type === "8ball" && !b.isPocketed);

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(16,185,129,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            🎱
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                GRAND CHAMPION 8-BALL
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded">
                DELUXE 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[ps?.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR SHOT" : "OPPONENT'S TURN"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="pool" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY & TALK ON LIVE MIC
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!currentUid) return;
              try {
                const { joinArcadeMatch } = await import("@/lib/arcade");
                await joinArcadeMatch(match.id, {
                  uid: currentUid,
                  handle: `@PLAYER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Pool:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Live Ball Inventory & Table Score HUD ── */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800">
          <span className="text-[10px] text-yellow-400 font-bold uppercase flex items-center gap-1">
            🟡 SOLIDS (1-7)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingSolids} / 7</span>
          <span className="text-[9px] text-emerald-400">+10 PTS EACH</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-700">
          <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
            🎱 8-BALL
          </span>
          <span className="text-lg font-black text-emerald-400 font-mono">
            {isEightBallOnTable ? "ON TABLE" : "POCKETED 🏆"}
          </span>
          <span className="text-[9px] text-amber-300">WINNING SHOT</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800">
          <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
            🔵 STRIPES (9-15)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingStripes} / 7</span>
          <span className="text-[9px] text-emerald-400">+10 PTS EACH</span>
        </div>
      </div>

      {/* Action Telemetry Log */}
      {ps?.lastActionLog && (
        <div className="border border-emerald-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{ps.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe Billiards Table Canvas ── */}
      <div className="relative aspect-[380/480] max-w-[380px] sm:max-w-[420px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#2b1307] via-[#45220c] to-[#1a0b04] border-4 border-[#6e3713] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>CUE SHOT POWER & TENSION:</span>
          <span className="text-emerald-400 font-mono font-black">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-400 text-center pt-1 font-mono">
          {isMyTurn
            ? "DRAG FROM CUE BALL TO AIM ➔ PULL BACK FOR POWER ➔ RELEASE TO STRIKE!"
            : "WAITING FOR OPPONENT TO LINE UP SHOT..."}
        </p>
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#10b981]" />
          <h2 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
            🏆 8-BALL CHAMPIONSHIP VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You pocketed the 8-Ball and scored +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
