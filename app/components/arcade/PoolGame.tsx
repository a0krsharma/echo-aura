"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
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
  Compass,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Flame,
  ShieldAlert,
  ArrowLeftRight,
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

// 6 Official Tournament Pocket Positions
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
  "1": "#eab308", // Solid Yellow
  "2": "#2563eb", // Solid Blue
  "3": "#dc2626", // Solid Red
  "4": "#7c3aed", // Solid Purple
  "5": "#ea580c", // Solid Orange
  "6": "#16a34a", // Solid Green
  "7": "#7f1d1d", // Solid Maroon
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
  const [showProPhysics, setShowProPhysics] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ps = match.poolState;
  const isMyTurn = ps?.currentTurnUid === currentUid && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;

  // Aiming, Spin and Controls State
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [isBallInHand, setIsBallInHand] = useState(false);
  const [isPushOutDeclared, setIsPushOutDeclared] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Local physics pieces state
  const ballsRef = useRef<PoolBall[]>([]);
  const isSimulatingRef = useRef(false);
  const pocketedThisShotRef = useRef<PoolBall[]>([]);
  const cueScratchRef = useRef(false);
  const firstContactBallRef = useRef<PoolBall | null>(null);
  const isBreakShotRef = useRef(false);

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

  // Determine assigned suit for active players
  const p1Suit = ps?.p1Type || null; // "SOLIDS" | "STRIPES" | null
  const p2Suit = ps?.p2Type || null;
  const myAssignedSuit = isPlayer1 ? p1Suit : p2Suit;

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

      // 1. Physics Sub-Stepping for High Accuracy & Continuous Collision
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

            // Cushion Rebounds with Cushion Restitution & Rail Grip
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
                // Suction toward pocket hole
                const pullForce = 0.38;
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

        // 2. Elastic Circle-to-Circle Collision Resolution
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
              // Record first contact made by cue ball
              if ((b1.type === "cue" || b2.type === "cue") && !firstContactBallRef.current) {
                firstContactBallRef.current = b1.type === "cue" ? { ...b2 } : { ...b1 };
              }

              // Positional Separation to prevent sticking
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;

              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              // Elastic Impulse Exchange (Equal Mass)
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = (kx * nx + ky * ny);

              b1.vx -= p * nx * RESTITUTION;
              b1.vy -= p * ny * RESTITUTION;
              b2.vx += p * nx * RESTITUTION;
              b2.vy += p * ny * RESTITUTION;

              if (Math.hypot(b1.vx, b1.vy) > 1.2) {
                soundSynth.playSubtlePop();
              }
            }
          }
        }
      }

      // Check if simulation just finished
      if (isSimulatingRef.current && !anyMoving) {
        isSimulatingRef.current = false;
        setIsSimulating(false);
        finalizeShotTurn();
      }

      // --- 3. Photorealistic Table Rendering ---
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // A. Deluxe Mahogany Rail Frame with Pearl Diamonds
      ctx.fillStyle = "#2b1006";
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Bevel Border
      ctx.strokeStyle = "#451e0f";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, TABLE_WIDTH - 4, TABLE_HEIGHT - 4);

      // B. Tournament Green Worsted Velvet Felt Bed
      const feltGrad = ctx.createRadialGradient(
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        40,
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        TABLE_HEIGHT * 0.7
      );
      feltGrad.addColorStop(0, "#059669"); // Emerald Center
      feltGrad.addColorStop(0.7, "#047857");
      feltGrad.addColorStop(1, "#065f46"); // Dark Edge
      ctx.fillStyle = feltGrad;
      ctx.fillRect(CUSHION, CUSHION, TABLE_WIDTH - CUSHION * 2, TABLE_HEIGHT - CUSHION * 2);

      // Cushion Nose Rubber Inset
      ctx.strokeStyle = "#022c22";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(CUSHION, CUSHION, TABLE_WIDTH - CUSHION * 2, TABLE_HEIGHT - CUSHION * 2);

      // Pearl Sight Diamonds along Rails
      const diamondRadius = 2.5;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";

      // Top & Bottom Rail Diamonds (3 each side)
      [1, 2, 3].forEach((i) => {
        const x = CUSHION + ((TABLE_WIDTH - CUSHION * 2) * i) / 4;
        ctx.beginPath();
        ctx.arc(x, CUSHION / 2, diamondRadius, 0, Math.PI * 2);
        ctx.arc(x, TABLE_HEIGHT - CUSHION / 2, diamondRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Left & Right Rail Diamonds (7 each side)
      [1, 2, 3, 4, 5, 6, 7].forEach((i) => {
        const y = CUSHION + ((TABLE_HEIGHT - CUSHION * 2) * i) / 8;
        ctx.beginPath();
        ctx.arc(CUSHION / 2, y, diamondRadius, 0, Math.PI * 2);
        ctx.arc(TABLE_WIDTH - CUSHION / 2, y, diamondRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // C. 6 Tournament Pockets with Brass Rim Plates & Depth Nets
      POCKETS.forEach((pkt) => {
        // Brass Rim Plate
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS + 3, 0, Math.PI * 2);
        ctx.fillStyle = "#92400e";
        ctx.fill();

        // Inner Brass Edge
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#b45309";
        ctx.fill();

        // Deep Net Pocket Hole
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_DEPTH_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();
      });

      // Head String Line & Foot Spot Markings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CUSHION, TABLE_HEIGHT - 120);
      ctx.lineTo(TABLE_WIDTH - CUSHION, TABLE_HEIGHT - 120);
      ctx.stroke();

      // Foot Spot (Apex of Rack)
      ctx.beginPath();
      ctx.arc(TABLE_WIDTH / 2, 130, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();

      // D. Render 3D High-Gloss Pool Balls (1-15 + Cue Ball)
      balls.forEach((b) => {
        if (b.isPocketed) return;

        // Dynamic 3D Drop Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x + 2, b.y + 3, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();
        ctx.restore();

        // Ball Body
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        if (b.type === "cue") {
          // Deluxe Ivory Cue Ball
          const cueGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          cueGrad.addColorStop(0, "#ffffff");
          cueGrad.addColorStop(0.7, "#f3f4f6");
          cueGrad.addColorStop(1, "#d1d5db");
          ctx.fillStyle = cueGrad;
          ctx.fill();

          // Red Dot Spot on Cue Ball
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
        } else if (b.type === "8ball") {
          // 8-Ball Black Resin
          const eightGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          eightGrad.addColorStop(0, "#3f3f46");
          eightGrad.addColorStop(0.4, "#18181b");
          eightGrad.addColorStop(1, "#09090b");
          ctx.fillStyle = eightGrad;
          ctx.fill();

          // White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.48, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("8", b.x, b.y + 0.5);
        } else if (b.type === "solid") {
          // Solid Color Ball (1-7)
          const col = BALL_COLORS[String(b.number)] || "#eab308";
          const sGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          sGrad.addColorStop(0, "#ffffff");
          sGrad.addColorStop(0.3, col);
          sGrad.addColorStop(1, "#09090b");
          ctx.fillStyle = sGrad;
          ctx.fill();

          // Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.44, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.number), b.x, b.y + 0.5);
        } else if (b.type === "stripe") {
          // Striped Ball (9-15)
          const col = BALL_COLORS[String(b.number)] || "#eab308";

          // White Base Ball
          const baseGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          baseGrad.addColorStop(0, "#ffffff");
          baseGrad.addColorStop(0.7, "#f3f4f6");
          baseGrad.addColorStop(1, "#9ca3af");
          ctx.fillStyle = baseGrad;
          ctx.fill();

          // Center Colored Stripe Belt
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, -Math.PI / 3, Math.PI / 3);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
          ctx.fillStyle = col;
          ctx.fill();

          // Center White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.46, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.number), b.x, b.y + 0.5);
        }
        ctx.restore();
      });

      // E. WPA Mathematical Ghost Ball & Tangent Trajectory System
      if (isAiming && dragStart && dragCurrent) {
        const cueBall = balls.find((b) => b.type === "cue");
        if (cueBall && !cueBall.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;
          const aimDist = Math.hypot(pullDx, pullDy);

          if (aimDist > 2) {
            const dirX = pullDx / aimDist;
            const dirY = pullDy / aimDist;
            const rayMaxDist = 320;

            // Find closest object ball in line of aim (Ghost Ball Raycast)
            let closestT = rayMaxDist;
            let targetBall: PoolBall | null = null;
            const R2 = cueBall.radius * 2;

            for (const b of balls) {
              if (b.type === "cue" || b.isPocketed) continue;

              // Vector from cue ball to target ball: D = P_cue - P_target
              const Dx = cueBall.x - b.x;
              const Dy = cueBall.y - b.y;

              const dotD = dirX * Dx + dirY * Dy;
              const c = Dx * Dx + Dy * Dy - R2 * R2;
              const disc = dotD * dotD - c;

              if (disc >= 0) {
                const t = -dotD - Math.sqrt(disc);
                if (t > 0 && t < closestT) {
                  closestT = t;
                  targetBall = b;
                }
              }
            }

            ctx.save();
            if (targetBall) {
              const ghostX = cueBall.x + dirX * closestT;
              const ghostY = cueBall.y + dirY * closestT;

              // 1. Cue Ball to Ghost Ball Laser Ray
              ctx.beginPath();
              ctx.moveTo(cueBall.x, cueBall.y);
              ctx.lineTo(ghostX, ghostY);
              ctx.strokeStyle = "#34d399";
              ctx.setLineDash([5, 3]);
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // 2. Ghost Ball Circle at Impact Point
              ctx.beginPath();
              ctx.arc(ghostX, ghostY, cueBall.radius, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 2]);
              ctx.stroke();

              // 3. Target Ball Departure Vector along Line of Centers (Normal)
              const normDx = targetBall.x - ghostX;
              const normDy = targetBall.y - ghostY;
              const normLen = Math.hypot(normDx, normDy) || 1;
              const nx = normDx / normLen;
              const ny = normDy / normLen;

              ctx.beginPath();
              ctx.moveTo(targetBall.x, targetBall.y);
              ctx.lineTo(targetBall.x + nx * 100, targetBall.y + ny * 100);
              ctx.strokeStyle = "#fbbf24";
              ctx.setLineDash([]);
              ctx.lineWidth = 2;
              ctx.stroke();

              // 4. Cue Ball 90° Tangent Deflection Vector
              const dotNormal = dirX * nx + dirY * ny;
              const defX = dirX - nx * dotNormal;
              const defY = dirY - ny * dotNormal;
              const defLen = Math.hypot(defX, defY) || 1;

              ctx.beginPath();
              ctx.moveTo(ghostX, ghostY);
              ctx.lineTo(ghostX + (defX / defLen) * 60, ghostY + (defY / defLen) * 60);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
              ctx.setLineDash([3, 3]);
              ctx.lineWidth = 1.5;
              ctx.stroke();
            } else {
              // Direct Aim Ray (No collision)
              ctx.beginPath();
              ctx.moveTo(cueBall.x, cueBall.y);
              ctx.lineTo(cueBall.x + dirX * rayMaxDist, cueBall.y + dirY * rayMaxDist);
              ctx.strokeStyle = "#34d399";
              ctx.setLineDash([6, 4]);
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            ctx.restore();

            // 3D Ash Wood Cue Stick Behind Cue Ball
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

            // Cue Tip Chalk
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

    // Handle Ball-in-Hand Drag Placement
    if (isBallInHand && cueBall) {
      const clampedX = Math.max(PLAYABLE_MIN_X + cueBall.radius, Math.min(PLAYABLE_MAX_X - cueBall.radius, x));
      const clampedY = Math.max(PLAYABLE_MIN_Y + cueBall.radius, Math.min(PLAYABLE_MAX_Y - cueBall.radius, y));
      cueBall.x = clampedX;
      cueBall.y = clampedY;
      setIsBallInHand(false);
      soundSynth.playSubtlePop();
      return;
    }

    if (cueBall && Math.hypot(cueBall.x - x, cueBall.y - y) < cueBall.radius * 3.8) {
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
        const forceMultiplier = 0.34;
        const impulseX = pullDx * forceMultiplier;
        const impulseY = pullDy * forceMultiplier;

        cueBall.vx = impulseX;
        cueBall.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        cueScratchRef.current = false;
        firstContactBallRef.current = null;

        // Check if this is the Break Shot
        const totalRemaining = ballsRef.current.filter((b) => b.type !== "cue" && !b.isPocketed).length;
        isBreakShotRef.current = totalRemaining === 15;

        isSimulatingRef.current = true;
        setIsSimulating(true);
      }
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  // Finalize Shot and Apply Official WPA 8-Ball Rules & Three-Point Break
  const finalizeShotTurn = useCallback(async () => {
    const pocketed = pocketedThisShotRef.current;
    const isScratch = cueScratchRef.current;
    const balls = ballsRef.current;
    const isBreak = isBreakShotRef.current;

    let nextTurnUid = ps?.currentTurnUid || currentUid;
    let newP1Score = ps?.p1Score || 0;
    let newP2Score = ps?.p2Score || 0;
    let newP1Type = ps?.p1Type || null;
    let newP2Type = ps?.p2Type || null;
    let actionLog = "";
    let isGameOver = false;
    let winnerUid = currentUid;

    // Reset Cue Ball if Scratched
    const cueBall = balls.find((b) => b.type === "cue");
    if (cueBall) {
      cueBall.isPocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
      if (isScratch) {
        cueBall.x = TABLE_WIDTH / 2;
        cueBall.y = TABLE_HEIGHT - 110;
        setIsBallInHand(true);
      }
    }

    const eightBallPocketed = pocketed.some((b) => b.type === "8ball");
    const solidsPocketed = pocketed.filter((b) => b.type === "solid").length;
    const stripesPocketed = pocketed.filter((b) => b.type === "stripe").length;

    const remainingSolids = balls.filter((b) => b.type === "solid" && !b.isPocketed).length;
    const remainingStripes = balls.filter((b) => b.type === "stripe" && !b.isPocketed).length;

    const myCurrentSuit = isPlayer1 ? newP1Type : newP2Type;
    const myRemainingGroupCount = myCurrentSuit === "SOLIDS" ? remainingSolids : myCurrentSuit === "STRIPES" ? remainingStripes : remainingSolids + remainingStripes;

    // ── 1. Three-Point Break Rule Evaluation on Break Shot ──
    if (isBreak) {
      const totalPocketedOnBreak = solidsPocketed + stripesPocketed + (eightBallPocketed ? 1 : 0);
      const ballsCrossedHeadString = balls.filter((b) => b.type !== "cue" && !b.isPocketed && b.y > TABLE_HEIGHT - 120).length;
      const breakScore = totalPocketedOnBreak + ballsCrossedHeadString;

      if (breakScore >= 3 && !isScratch) {
        actionLog = `⚡ THREE-POINT BREAK PASSED (${totalPocketedOnBreak} pocketed + ${ballsCrossedHeadString} crossed)! Legal break.`;
      } else if (isScratch) {
        actionLog = `⚠️ BREAK SCRATCH! Opponent awarded Ball-in-Hand anywhere on table!`;
      } else {
        actionLog = `⚠️ SOFT BREAK (Score: ${breakScore}/3). Opponent may accept or pass back!`;
      }
    }

    // ── 2. Check Scratch & Foul Conditions ──
    if (isScratch) {
      soundSynth.playBuzzer();
      if (eightBallPocketed) {
        // Instant Loss: 8-Ball sunk while scratching!
        actionLog = "❌ 8-BALL SCRATCH FOUL! Instant loss.";
        isGameOver = true;
        winnerUid = playerUids.find((id) => id !== currentUid) || currentUid;
      } else {
        actionLog = "⚠️ SCRATCH! Cue ball in pocket. Opponent awarded Ball-in-Hand!";
        const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
        nextTurnUid = opponentUid;
      }
    } else if (eightBallPocketed) {
      // ── 3. Eight Ball Pocketed ──
      if (myCurrentSuit && myRemainingGroupCount === 0) {
        // Legal Win! Cleared all assigned balls before pocketing 8-Ball
        actionLog = "🏆 8-BALL POCKETED LEGALLY! WPA CHAMPIONSHIP VICTORY!";
        isGameOver = true;
        winnerUid = currentUid;
        soundSynth.playFanfare();
      } else {
        // Instant Loss: 8-ball pocketed before clearing suit!
        actionLog = "❌ 8-Ball pocketed prematurely! Automatic frame loss.";
        isGameOver = true;
        winnerUid = playerUids.find((id) => id !== currentUid) || currentUid;
        soundSynth.playBuzzer();
      }
    } else if (solidsPocketed > 0 || stripesPocketed > 0) {
      // ── 4. Open Table Suit Assignment & Turn Continuation ──
      if (!newP1Type && !newP2Type) {
        // First legal ball claims suit!
        if (solidsPocketed > 0 && stripesPocketed === 0) {
          if (isPlayer1) { newP1Type = "SOLIDS"; newP2Type = "STRIPES"; }
          else { newP2Type = "SOLIDS"; newP1Type = "STRIPES"; }
          actionLog = `${match.players[currentUid]?.handle || "Player"} claimed SOLIDS!`;
        } else if (stripesPocketed > 0 && solidsPocketed === 0) {
          if (isPlayer1) { newP1Type = "STRIPES"; newP2Type = "SOLIDS"; }
          else { newP2Type = "STRIPES"; newP1Type = "SOLIDS"; }
          actionLog = `${match.players[currentUid]?.handle || "Player"} claimed STRIPES!`;
        }
      }

      // Check if player pocketed their own assigned ball
      const assignedTargetPocketed =
        (myCurrentSuit === "SOLIDS" && solidsPocketed > 0) ||
        (myCurrentSuit === "STRIPES" && stripesPocketed > 0) ||
        (!myCurrentSuit); // Open table

      if (assignedTargetPocketed) {
        const count = solidsPocketed + stripesPocketed;
        if (isPlayer1) newP1Score += count * 10;
        else newP2Score += count * 10;

        actionLog = `Pocketed ${count} ball(s)! Turn continues!`;
        nextTurnUid = currentUid; // Bonus shot
      } else {
        // Pocketed ONLY opponent ball: turn passes
        actionLog = "Pocketed opponent's ball. Turn passes.";
        const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
        nextTurnUid = opponentUid;
      }
    } else {
      // ── 5. Blank Shot: Turn Passes ──
      const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
      nextTurnUid = opponentUid;
      actionLog = isPushOutDeclared ? "✋ PUSH-OUT EXECUTED! Opponent may accept table or pass back." : "No ball pocketed. Turn passes.";
      setIsPushOutDeclared(false);
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
  }, [currentUid, isPlayer1, isPushOutDeclared, match.id, match.players, playerUids, ps]);

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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.5)] text-lg">
            🎱
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                8-BALL POOL PRO
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded">
                WPA TOURNAMENT
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[ps?.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR SHOT" : "OPPONENT'S SHOT"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Push-Out Declaration Button */}
          {isMyTurn && !isSimulating && (
            <button
              type="button"
              onClick={() => {
                setIsPushOutDeclared(!isPushOutDeclared);
                soundSynth.playSubtlePop();
              }}
              className={`px-2.5 py-1.5 border font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1 ${
                isPushOutDeclared
                  ? "bg-amber-500 text-black border-amber-400 font-black shadow-md animate-pulse"
                  : "border-neutral-700 bg-black hover:border-amber-400 text-amber-300"
              }`}
              title="Declare Push-Out shot immediately after break"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>{isPushOutDeclared ? "PUSH ACTIVE" : "PUSH-OUT"}</span>
            </button>
          )}

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
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="pool" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY ON MIC
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
                  handle: `@POOL_SHARK_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Pool:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Live Suit Status & Ball Inventory HUD ── */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
        {/* Solids (1-7) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-yellow-400 font-bold uppercase flex items-center gap-1">
            🟡 SOLIDS (1-7)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingSolids} / 7</span>
          <span className="text-[8px] text-neutral-400">
            {p1Suit === "SOLIDS" ? "PLAYER 1" : p2Suit === "SOLIDS" ? "PLAYER 2" : "OPEN TABLE"}
          </span>
        </div>

        {/* 8-Ball (Black) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-700 space-y-0.5">
          <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
            🎱 8-BALL
          </span>
          <span className="text-sm font-black text-emerald-400 font-mono">
            {isEightBallOnTable ? "ON TABLE" : "POCKETED"}
          </span>
          <span className="text-[8px] text-emerald-300">POCKET LAST TO WIN</span>
        </div>

        {/* Stripes (9-15) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
            🔵 STRIPES (9-15)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingStripes} / 7</span>
          <span className="text-[8px] text-neutral-400">
            {p1Suit === "STRIPES" ? "PLAYER 1" : p2Suit === "STRIPES" ? "PLAYER 2" : "OPEN TABLE"}
          </span>
        </div>
      </div>

      {/* Action Telemetry Log */}
      {ps?.lastActionLog && (
        <div className="border border-emerald-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{ps.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe 8-Ball Table Canvas ── */}
      <div className="relative aspect-[380/480] max-w-[380px] sm:max-w-[400px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#1a0b04] via-[#2b1006] to-[#0f0502] border-4 border-[#451e0f] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />

        {/* Ball in Hand Alert Floating Badge */}
        {isBallInHand && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-bounce shadow-lg">
            ✋ BALL-IN-HAND: TAP ANYWHERE ON TABLE TO PLACE CUE BALL
          </div>
        )}
      </div>

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>CUE STRIKE VELOCITY &amp; TENSION:</span>
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
            ? "DRAG CUE BALL BACKWARD TO AIM & SET POWER ➔ GHOST BALL SHOWS 90° DEFLECTION ➔ RELEASE TO STRIKE!"
            : "WAITING FOR OPPONENT TO AIM & STRIKE..."}
        </p>
      </div>

      {/* ── WPA Pro Diamond Kicking & Advanced Physics Guide HUD ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProPhysics(!showProPhysics)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-emerald-400" />
            🎱 WPA PRO DIAMOND SYSTEMS (CORNER-5, PLUS SYSTEM &amp; 3-POINT BREAK)
          </span>
          {showProPhysics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProPhysics && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">1. ⚡ THREE-POINT BREAK RULE:</span>
              Total score: Pocketed Balls + Crossed Head-String Balls &ge; 3. Prevents soft breaking!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">2. 📐 1-RAIL &amp; 2-RAIL PLUS SYSTEM:</span>
              1-Rail: Aim through midpoint M. 2-Rail: 1st Rail Aim = Target Arrival - Cue Origin.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">3. 🎯 3-RAIL &amp; 4-RAIL CORNER-5 SYSTEM:</span>
              1st Rail Aim = Origin - 3rd Rail Arrival. 4th Cushion Shift: T4 = T3 + (Origin - 50) / 4.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">4. 🏎️ SPEED DRIFT &amp; CUSHION COMPRESSION:</span>
              Soft stroke (widens +0.5 to 1.0 diamond) ➔ Aim 2-4 pts lower. Hard stroke ➔ Aim 3-6 pts higher.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">5. 🔄 THE TIKI SHOT (RAIL-FIRST CAROM):</span>
              Rail ➔ Object Ball ➔ Same Cushion. Squeeze clearance with inside spin and gap offset.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">6. 🔀 THE RENVERSE (REVERSE CORNER SYSTEM):</span>
              Aim = (Origin &times; Target) / 100 (Max Reverse English). 90° corner turn transforms reverse spin into Super-Running propulsion!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">7. ⚡ GRAND TRAVERSE (DOUBLE-CHECK ZIG-ZAG):</span>
              Aim = Origin + (Distance / 2) with 3 tips reverse English across parallel long rails for a tight symmetric Z-path.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">8. ☂️ UMBRELLA SHOT (PARAPLUIE):</span>
              Aim = Arrival_3 - Origin. High follow curves into 2nd rail; running English expands canopy across long rails.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">9. 🦋 BUTTERFLY SYSTEM (LE PAPILLON 5-CUSHION):</span>
              Aim = (Origin + Target_4) / 2. Figure-8 double-crossing trajectory connecting diagonally opposite corners!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">10. ➕ PLUS-TWO SYSTEM &amp; BRICOLE:</span>
              Aim = Target_3 - Origin. Short ➔ Long rail with running English yields +2 diamonds forward bounce expansion.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">11. 📐 K-SYSTEM (SHORT-ANGLE QUADRANT):</span>
              Aim = (Origin &times; Arrival_2) / 100 or Aim = Origin - 2T. Tight 2-cushion quadrant calculations.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">12. ⚪ DEAD-BALL (NO-SPIN SPECULAR):</span>
              Aim = (Origin + Arrival) / 2. Center-ball stun eliminates squirt/swerve with pure specular reflection.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">13. 🖐️ FIVE-BALL SYSTEM (STUN 90° TANGENT):</span>
              Aim = (Origin &times; Arrival_2) / 5. Pure sliding stun (-0.5 tips low, 0 sidespin) for exact 90° tangent caroms.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">14. ⚡ ROJANO SYSTEM (REVERSE-STUN CAROMS):</span>
              Aim = Origin - Arrival. Low reverse English checks 1st cushion and inverts to running on 2nd rail.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">15. 🪞 SARDA SYSTEM (LONG-RAIL REVERSE WRAP):</span>
              Aim (Long Rail) = Origin - (Arrival_3 &times; 1.5). Long ➔ Short ➔ Long carom with max reverse English.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">16. 🔄 SARDA VS RENVERSE TACTICAL MATRIX:</span>
              Sarda (Long-First) for OB1 along rails &amp; deep linear track (10-30). Renverse (Short-First) for wide sweeping center arcs (20-55).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">17. 🛡️ CUSHION-FIRST BRICOLE REVERSE CAROM:</span>
              Aim = ((Origin + Projection_OB1) / 2) - C_rev. Reverse spin checks 1st rail to pocket or carom blocked, tucked balls!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">18. 🎯 PIQUÉ (VERTICAL MASSÉ &amp; HOOK ESCAPES):</span>
              60°-85° cue elevation dart strike imparts heavy rotation with low translation, curving around snookers via cloth friction!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">19. ⚖️ WPA TOURNAMENT JUMP &amp; FOUL LAWS:</span>
              Downward compression on top hemisphere only (Rule 6.7, cue &ge; 40 in). Shovel/scoop under equator is an automatic foul!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">20. 📹 REFEREE FROZEN-BALL &amp; VAR PROTOCOL:</span>
              Gap &lt; 5mm requires &ge; 45° elevation or 90° tangent cut to avoid double-hit foul. 120-1000 fps high-speed VAR review standard.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">21. 🚀 JUMP BALLISTICS &amp; PARABOLIC TRAJECTORY:</span>
              v0x = J cos(&theta;)/m, v0z = e_slate &times; J sin(&theta;)/m. Parabolic arc clears 57.15mm blockers with downward compression!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">22. 🪂 TOUCHDOWN DAMPENING &amp; POST-LANDING SPIN:</span>
              Micro-hops decay by ~50% per bounce. Airborne spin L = I&omega; is conserved in flight, engaging draw/follow/swerve on touchdown!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">23. 🎯 DART-GRIP VS PENDULUM BIOMECHANICS:</span>
              Dart-Grip (60°-85° wrist snap &amp; high tripod) for 2-8&quot; tight snookers; Pendulum (30°-55° elbow hinge) for long jumps with spin control!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">24. 🔬 PHENOLIC JUMP ENGINEERING &amp; DWELL TIME:</span>
              Phenolic tips (95+ Shore D, e&approx;0.90) cut dwell time to &le; 1.8ms to prevent double-hits. Conical 14mm taper resists buckling.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">25. ⚡ CARBON FIBER VS WOOD BREAK SHAFTS:</span>
              Carbon fiber (E=130-230 GPa, low end-mass 12-16g) yields 92-96% energy transfer efficiency and low squirt vs maple (22-28g).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">26. 💥 10-BALL BREAK CONTROL DYNAMICS:</span>
              Controlled 19.5-22.5 mph speed with 3°-5.5° cut angle transfers 92-96% energy, parking the cue ball center while potting the 1-ball side!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">27. 📄 TEMPLATE RACKS &amp; 1,500 M/S SHOCKWAVE:</span>
              Mylar cutouts establish 100% frozen tangency (&delta;=0). Impulse propagates at 1,500 m/s with 90-95% efficiency, eliminating slug racks!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">28. 📦 MATCHROOM BREAK BOX &amp; 3-POINT RULE:</span>
              Break Box (central 50% width inside kitchen) + 3-Point Rule (Pocketed + Crossed &ge; 3) eliminates soft breaks and guarantees high-energy dispersion!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">29. ✋ PUSH-OUT GAME THEORY &amp; EV EQUILIBRIUM:</span>
              Shot #2 Cake-Cutting principle targets EV_Opponent &approx; EV_Shooter. Exploit asymmetric jump, kick, and safety skill advantages!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">30. 🛡️ 5 ELITE SAFETY COUNTER-STRATEGIES:</span>
              1. Full-Table Split 2. Thin Feather Snooker 3. Rail-Freeze Drag (draw cancels bounce) 4. Pocket-Jaw Trap 5. Two-Way Containment!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">31. 🪞 SPOT-ON-THE-WALL OPTICAL KICKING:</span>
              Planar mirror reflection: project target distance d past cushion nose (P_virtual = P_cushion + (P_cushion - P_target)) with dead-center stun!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">32. 📏 1-CUSHION PARALLEL SHIFT SYSTEM:</span>
              Baseline midpoint M ➔ 90° rail node ➔ lateral shift to CB. For unequal depths, shift aim &Delta;x &approx; |d1 - d2| / 4 toward closer ball!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">33. 📐 2-CUSHION PARALLEL SHIFT (CORNER INVERSION):</span>
              Corner-to-target line: midpoint M ➔ corner vertex ➔ parallel shift to CB. Inverts rays parallel to corner line without math!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">34. ➕ PLUS SYSTEM (AIM = ARRIVAL - ORIGIN):</span>
              Diamond arithmetic with 2-2.5 tips running English delivers exact multi-rail tracks; use Parallel Shift for rapid visual escapes.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">35. 🔄 CORNER-5 VS PLUS SYSTEM DUALITY:</span>
              Corner-5 (Subtraction: Aim = Origin - Arrival) routes perimeter loops from long rail; Plus System (Addition: Arrival = Origin + Aim) routes corner wraps from short rail.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">36. 🧪 50-TO-20 BENCHMARK &amp; CLOTH CALIBRATION:</span>
              Shoot 50 ➔ 30 with 2 tips spin (expects 20). If table plays long (+&Delta;) or short (-&Delta;), adjust: Aim = (Origin - Arrival) - &Delta;!
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#10b981]" />
          <h2 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
            🏆 8-BALL POOL CHAMPIONSHIP VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You dominated the table and earned +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
