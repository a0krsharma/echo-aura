"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fireCarromShot, type ArcadeMatch, type CarromPiece } from "@/lib/arcade";
import { executeCarromBotShot } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  CircleDot,
  HelpCircle,
  Users,
  Sparkles,
  Zap,
  Flame,
  Crown,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Target,
  Compass,
} from "lucide-react";

interface CarromGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const BOARD_SIZE = 400;
const FRAME_THICKNESS = 20;
const PLAYABLE_MIN = FRAME_THICKNESS + 2;
const PLAYABLE_MAX = BOARD_SIZE - FRAME_THICKNESS - 2;

const FRICTION = 0.985;
const RESTITUTION = 0.88;
const POCKET_RADIUS = 26;
const POCKET_DEPTH_RADIUS = 18;

// 4 Tournament Corner Pockets
const POCKETS = [
  { x: 30, y: 30 },
  { x: BOARD_SIZE - 30, y: 30 },
  { x: 30, y: BOARD_SIZE - 30 },
  { x: BOARD_SIZE - 30, y: BOARD_SIZE - 30 },
];

export default function CarromGame({ match, currentUid }: CarromGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cs = match.carromState;
  const isMyTurn = cs?.currentTurnUid === currentUid && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;
  const myTargetColor = isPlayer1 ? "white" : "black";

  // Aiming and Controls State
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [strikerBaselineX, setStrikerBaselineX] = useState(BOARD_SIZE / 2);
  const [isSimulating, setIsSimulating] = useState(false);

  // Local physics pieces state
  const piecesRef = useRef<CarromPiece[]>([]);
  const isSimulatingRef = useRef(false);
  const pocketedThisShotRef = useRef<CarromPiece[]>([]);
  const strikerFoulRef = useRef(false);

  // Sync pieces from match state
  useEffect(() => {
    if (cs?.piecesStr && !isSimulatingRef.current) {
      try {
        const parsed = JSON.parse(cs.piecesStr);
        piecesRef.current = parsed;
      } catch (e) {
        console.error("Failed to parse carrom pieces:", e);
      }
    }
  }, [cs?.piecesStr]);

  // Determine current active baseline Y (bottom for player 1, top for player 2 / bot)
  const currentTurnUid = cs?.currentTurnUid || playerUids[0];
  const isTurnPlayer1 = playerUids[0] === currentTurnUid;
  const activeBaselineY = isTurnPlayer1 ? BOARD_SIZE - 55 : 55;

  // Trigger AI Bot Shot in VS_COMPUTER mode
  useEffect(() => {
    if (!cs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === cs.currentTurnUid && p.isBot
    );
    if (botPlayer && !isSimulatingRef.current) {
      executeCarromBotShot(match);
    }
  }, [match, cs?.currentTurnUid]);

  // Main Canvas & Continuous Physics Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const updatePhysicsAndRender = () => {
      const pieces = piecesRef.current;
      let anyMoving = false;

      // 1. Physics Sub-Stepping for High Accuracy & Smooth Momentum
      const subSteps = 3;
      for (let step = 0; step < subSteps; step++) {
        pieces.forEach((p) => {
          if (p.isPocketed) return;

          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 0.05) {
            anyMoving = true;
            p.x += p.vx / subSteps;
            p.y += p.vy / subSteps;

            p.vx *= Math.pow(FRICTION, 1 / subSteps);
            p.vy *= Math.pow(FRICTION, 1 / subSteps);

            // Cushion Rebounds off Wooden Frame
            if (p.x - p.radius < PLAYABLE_MIN) {
              p.x = PLAYABLE_MIN + p.radius;
              p.vx = -p.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (p.x + p.radius > PLAYABLE_MAX) {
              p.x = PLAYABLE_MAX - p.radius;
              p.vx = -p.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            if (p.y - p.radius < PLAYABLE_MIN) {
              p.y = PLAYABLE_MIN + p.radius;
              p.vy = -p.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (p.y + p.radius > PLAYABLE_MAX) {
              p.y = PLAYABLE_MAX - p.radius;
              p.vy = -p.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            // Pocket Gravity & Pocketing Check
            POCKETS.forEach((pkt) => {
              const dToPocket = Math.hypot(p.x - pkt.x, p.y - pkt.y);
              if (dToPocket < POCKET_RADIUS) {
                // Suction toward pocket hole
                const pullForce = 0.35;
                p.vx += ((pkt.x - p.x) / dToPocket) * pullForce;
                p.vy += ((pkt.y - p.y) / dToPocket) * pullForce;

                if (dToPocket < POCKET_DEPTH_RADIUS) {
                  p.isPocketed = true;
                  p.vx = 0;
                  p.vy = 0;
                  pocketedThisShotRef.current.push({ ...p });

                  if (p.type === "striker") {
                    strikerFoulRef.current = true;
                    soundSynth.playBuzzer();
                  } else if (p.type === "queen") {
                    soundSynth.playFanfare();
                  } else {
                    soundSynth.playSnare();
                  }
                }
              }
            });
          } else {
            p.vx = 0;
            p.vy = 0;
          }
        });

        // 2. Elastic Piece-to-Piece Collisions
        for (let i = 0; i < pieces.length; i++) {
          for (let j = i + 1; j < pieces.length; j++) {
            const p1 = pieces[i];
            const p2 = pieces[j];
            if (p1.isPocketed || p2.isPocketed) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p1.radius + p2.radius;

            if (dist < minDist && dist > 0) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;

              p1.x -= nx * overlap;
              p1.y -= ny * overlap;
              p2.x += nx * overlap;
              p2.y += ny * overlap;

              const m1 = p1.type === "striker" ? 3.2 : 1.0;
              const m2 = p2.type === "striker" ? 3.2 : 1.0;

              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const p = (2 * (nx * kx + ny * ky)) / (m1 + m2);

              p1.vx -= p * m2 * nx * RESTITUTION;
              p1.vy -= p * m2 * ny * RESTITUTION;
              p2.vx += p * m1 * nx * RESTITUTION;
              p2.vy += p * m1 * ny * RESTITUTION;

              if (Math.hypot(p1.vx, p1.vy) > 1.2) {
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

      // --- 3. Photorealistic Board Rendering ---
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // A. Polished Satin English Birchwood Surface
      const surfaceGrad = ctx.createRadialGradient(
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        30,
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        BOARD_SIZE * 0.7
      );
      surfaceGrad.addColorStop(0, "#f7edd8");
      surfaceGrad.addColorStop(0.6, "#eedab5");
      surfaceGrad.addColorStop(1, "#dfc699");
      ctx.fillStyle = surfaceGrad;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // B. Deluxe Rosewood Outer Frame with Bevels
      ctx.strokeStyle = "#381a08";
      ctx.lineWidth = FRAME_THICKNESS;
      ctx.strokeRect(FRAME_THICKNESS / 2, FRAME_THICKNESS / 2, BOARD_SIZE - FRAME_THICKNESS, BOARD_SIZE - FRAME_THICKNESS);

      // Inner Cushion Inset Line
      ctx.strokeStyle = "#5a2d0c";
      ctx.lineWidth = 3;
      ctx.strokeRect(FRAME_THICKNESS, FRAME_THICKNESS, BOARD_SIZE - FRAME_THICKNESS * 2, BOARD_SIZE - FRAME_THICKNESS * 2);

      // Brass Corner Plate Highlights
      const cornerOffsets = [
        [0, 0],
        [BOARD_SIZE, 0],
        [0, BOARD_SIZE],
        [BOARD_SIZE, BOARD_SIZE],
      ];
      cornerOffsets.forEach(([cx, cy]) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#854d0e";
        ctx.beginPath();
        ctx.arc(0, 0, FRAME_THICKNESS * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // C. 4 Corner Pockets with Metal Rings & Depth
      POCKETS.forEach((pkt) => {
        // Drop Shadow
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fill();

        // Brass Ring Rim
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

      // D. Diagonal Foul Arrows (Pocket to Center)
      ctx.strokeStyle = "rgba(185, 28, 28, 0.4)";
      ctx.lineWidth = 1.5;
      const pocketAngles = [
        Math.PI / 4,
        (3 * Math.PI) / 4,
        (7 * Math.PI) / 4,
        (5 * Math.PI) / 4,
      ];
      pocketAngles.forEach((angle) => {
        const startX = BOARD_SIZE / 2 + Math.cos(angle) * 70;
        const startY = BOARD_SIZE / 2 + Math.sin(angle) * 70;
        const endX = BOARD_SIZE / 2 + Math.cos(angle) * 165;
        const endY = BOARD_SIZE / 2 + Math.sin(angle) * 165;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#b91c1c";
        ctx.fill();
      });

      // E. Center Mandala & Queen Circle Pattern
      const center = BOARD_SIZE / 2;

      // Outer Concentric Ring
      ctx.strokeStyle = "#b91c1c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center, center, 65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, 61, 0, Math.PI * 2);
      ctx.stroke();

      // Middle Floral Circle
      ctx.strokeStyle = "rgba(185, 28, 28, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center, center, 32, 0, Math.PI * 2);
      ctx.stroke();

      // Center Rose Red Spot (Queen placement)
      ctx.beginPath();
      ctx.arc(center, center, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1;
      ctx.stroke();

      // F. 4 Official Baselines with Edge Circles
      const drawBaseline = (yPos: number) => {
        const startX = 75;
        const endX = BOARD_SIZE - 75;
        const lineOffset = 6;

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, yPos - lineOffset);
        ctx.lineTo(endX, yPos - lineOffset);
        ctx.moveTo(startX, yPos + lineOffset);
        ctx.lineTo(endX, yPos + lineOffset);
        ctx.stroke();

        // Left and Right Base Circles
        [startX, endX].forEach((x) => {
          ctx.beginPath();
          ctx.arc(x, yPos, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(220, 38, 38, 0.2)";
          ctx.fill();
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, yPos, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
        });
      };

      // Top & Bottom Baselines
      drawBaseline(55);
      drawBaseline(BOARD_SIZE - 55);

      // Left & Right Baselines (Perpendicular)
      ctx.save();
      ctx.translate(BOARD_SIZE / 2, BOARD_SIZE / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-BOARD_SIZE / 2, -BOARD_SIZE / 2);
      drawBaseline(55);
      drawBaseline(BOARD_SIZE - 55);
      ctx.restore();

      // G. Render 3D Carrom Pieces & Striker
      pieces.forEach((p) => {
        if (p.isPocketed) return;

        // Dynamic 3D Drop Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x + 2, p.y + 3, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fill();
        ctx.restore();

        // Piece Body
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (p.type === "queen") {
          // Deluxe Royal Ruby Queen
          const qGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          qGrad.addColorStop(0, "#f87171");
          qGrad.addColorStop(0.5, "#dc2626");
          qGrad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = qGrad;
          ctx.fill();

          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Gold Star / Crown Center Emblem
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#fef08a";
          ctx.fill();
        } else if (p.type === "white") {
          // Polished Natural Ivory / White Wood
          const wGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          wGrad.addColorStop(0, "#ffffff");
          wGrad.addColorStop(0.6, "#f3f4f6");
          wGrad.addColorStop(1, "#d1d5db");
          ctx.fillStyle = wGrad;
          ctx.fill();

          ctx.strokeStyle = "#9ca3af";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Engraved inner wood ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.type === "black") {
          // Polished Ebony / Dark Wood
          const bGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          bGrad.addColorStop(0, "#4b5563");
          bGrad.addColorStop(0.5, "#1f2937");
          bGrad.addColorStop(1, "#030712");
          ctx.fillStyle = bGrad;
          ctx.fill();

          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Engraved inner ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(156, 163, 175, 0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.type === "striker") {
          // Deluxe Heavyweight Emerald Striker
          const sGrad = ctx.createRadialGradient(p.x - 4, p.y - 4, 3, p.x, p.y, p.radius);
          sGrad.addColorStop(0, "#6ee7b7");
          sGrad.addColorStop(0.4, "#10b981");
          sGrad.addColorStop(1, "#064e3b");
          ctx.fillStyle = sGrad;
          ctx.fill();

          ctx.strokeStyle = "#ecfdf5";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner Mandala Rings
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.restore();
      });

      // H. Precision Trajectory Guideline with Cushion Bank-Shot Reflection
      if (isAiming && dragStart && dragCurrent) {
        const striker = pieces.find((p) => p.type === "striker");
        if (striker && !striker.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;
          const aimLength = Math.hypot(pullDx, pullDy);

          if (aimLength > 2) {
            const dirX = pullDx / aimLength;
            const dirY = pullDy / aimLength;
            const rayDist = 260;

            // Direct Aim Laser Line
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);

            // Compute intersection with cushion wall for bank shot preview
            let endX = striker.x + dirX * rayDist;
            let endY = striker.y + dirY * rayDist;
            let bounced = false;
            let bounceStartX = 0;
            let bounceStartY = 0;
            let bounceEndX = 0;
            let bounceEndY = 0;

            if (endX < PLAYABLE_MIN) {
              const fraction = (PLAYABLE_MIN - striker.x) / (dirX * rayDist);
              bounceStartX = PLAYABLE_MIN;
              bounceStartY = striker.y + dirY * rayDist * fraction;
              bounceEndX = PLAYABLE_MIN - dirX * rayDist * (1 - fraction);
              bounceEndY = bounceStartY + dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            } else if (endX > PLAYABLE_MAX) {
              const fraction = (PLAYABLE_MAX - striker.x) / (dirX * rayDist);
              bounceStartX = PLAYABLE_MAX;
              bounceStartY = striker.y + dirY * rayDist * fraction;
              bounceEndX = PLAYABLE_MAX - dirX * rayDist * (1 - fraction);
              bounceEndY = bounceStartY + dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            }

            if (endY < PLAYABLE_MIN) {
              const fraction = (PLAYABLE_MIN - striker.y) / (dirY * rayDist);
              bounceStartX = striker.x + dirX * rayDist * fraction;
              bounceStartY = PLAYABLE_MIN;
              bounceEndX = bounceStartX + dirX * rayDist * (1 - fraction);
              bounceEndY = PLAYABLE_MIN - dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            } else if (endY > PLAYABLE_MAX) {
              const fraction = (PLAYABLE_MAX - striker.y) / (dirY * rayDist);
              bounceStartX = striker.x + dirX * rayDist * fraction;
              bounceStartY = PLAYABLE_MAX;
              bounceEndX = bounceStartX + dirX * rayDist * (1 - fraction);
              bounceEndY = PLAYABLE_MAX - dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            }

            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "#10b981";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 8;
            ctx.stroke();

            // Bank Reflection Ray
            if (bounced) {
              ctx.beginPath();
              ctx.moveTo(bounceStartX, bounceStartY);
              ctx.lineTo(bounceEndX, bounceEndY);
              ctx.strokeStyle = "#34d399";
              ctx.setLineDash([4, 4]);
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            ctx.restore();

            // Pullback Vector Indicator
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);
            ctx.lineTo(striker.x - dirX * Math.min(aimLength, 60), striker.y - dirY * Math.min(aimLength, 60));
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(updatePhysicsAndRender);
    };

    animId = requestAnimationFrame(updatePhysicsAndRender);
    return () => cancelAnimationFrame(animId);
  }, [isAiming, dragStart, dragCurrent, strikerBaselineX]);

  // Pointer Aiming Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || match.status === "FINISHED" || isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const striker = piecesRef.current.find((p) => p.type === "striker");

    if (striker && Math.hypot(striker.x - x, striker.y - y) < striker.radius * 2.8) {
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

    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;
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

    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker) {
      const pullDx = dragStart.x - dragCurrent.x;
      const pullDy = dragStart.y - dragCurrent.y;
      const pullDist = Math.hypot(pullDx, pullDy);

      if (pullDist > 4) {
        const forceMultiplier = 0.32;
        const impulseX = pullDx * forceMultiplier;
        const impulseY = pullDy * forceMultiplier;

        striker.vx = impulseX;
        striker.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        strikerFoulRef.current = false;
        isSimulatingRef.current = true;
        setIsSimulating(true);
      }
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  // Finalize Shot and Apply Official ICF Tournament Carrom Rules
  const finalizeShotTurn = useCallback(async () => {
    const pocketed = pocketedThisShotRef.current;
    const isStrikerFoul = strikerFoulRef.current;
    const pieces = piecesRef.current;

    let nextTurnUid = cs?.currentTurnUid || currentUid;
    let newP1Score = cs?.p1Score || 0;
    let newP2Score = cs?.p2Score || 0;
    let newP1Due = cs?.p1Due || 0;
    let newP2Due = cs?.p2Due || 0;
    let newHasQueen = cs?.hasQueen || null;
    let newQueenPending = cs?.queenPendingUid || null;
    let actionLog = "";

    // Reset striker to active player baseline
    const striker = pieces.find((p) => p.type === "striker");
    if (striker) {
      striker.isPocketed = false;
      striker.vx = 0;
      striker.vy = 0;
      striker.x = strikerBaselineX;
      striker.y = activeBaselineY;
    }

    const whitePocketed = pocketed.filter((p) => p.type === "white").length;
    const blackPocketed = pocketed.filter((p) => p.type === "black").length;
    const queenPocketed = pocketed.some((p) => p.type === "queen");

    const myPocketedCount = isPlayer1 ? whitePocketed : blackPocketed;
    const opponentPocketedCount = isPlayer1 ? blackPocketed : whitePocketed;

    // Helper: Return 1 coin of player back to center
    const returnPenaltyCoinToCenter = (type: "white" | "black"): boolean => {
      const pocketedCoin = pieces.find((p) => p.type === type && p.isPocketed);
      if (pocketedCoin) {
        pocketedCoin.isPocketed = false;
        pocketedCoin.x = BOARD_SIZE / 2 + (Math.random() * 10 - 5);
        pocketedCoin.y = BOARD_SIZE / 2 + (Math.random() * 10 - 5);
        pocketedCoin.vx = 0;
        pocketedCoin.vy = 0;
        return true;
      }
      return false;
    };

    // Helper: Return Queen to center circle
    const returnQueenToCenter = () => {
      const queen = pieces.find((p) => p.type === "queen");
      if (queen) {
        queen.isPocketed = false;
        queen.x = BOARD_SIZE / 2;
        queen.y = BOARD_SIZE / 2;
        queen.vx = 0;
        queen.vy = 0;
      }
    };

    // Count remaining pieces before resolving
    const remainingWhiteBefore = pieces.filter((p) => p.type === "white" && !p.isPocketed).length;
    const remainingBlackBefore = pieces.filter((p) => p.type === "black" && !p.isPocketed).length;
    const myRemainingBefore = isPlayer1 ? remainingWhiteBefore : remainingBlackBefore;
    const isQueenOnBoardBefore = pieces.some((p) => p.type === "queen" && !p.isPocketed);

    // ── 1. Check Striker Foul (Due Penalty Return) ──
    if (isStrikerFoul) {
      soundSynth.playBuzzer();

      // Return player's pocketed coin to center if available, otherwise record Due
      const returned = returnPenaltyCoinToCenter(myTargetColor);
      if (!returned) {
        if (isPlayer1) newP1Due += 1;
        else newP2Due += 1;
        actionLog = "⚠️ STRIKER FOUL! 0 coins in bank. Marked as 1 Due penalty!";
      } else {
        actionLog = "⚠️ STRIKER FOUL! 1 Penalty coin returned to center circle!";
      }

      // If player also pocketed their own piece in this shot, that piece also returns to center
      if (myPocketedCount > 0) {
        returnPenaltyCoinToCenter(myTargetColor);
      }

      // If queen was pending cover by this player, Queen returns to center
      if (newQueenPending === currentUid) {
        newQueenPending = null;
        returnQueenToCenter();
      }

      // Turn immediately passes to opponent
      const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
      nextTurnUid = opponentUid;
    } else {
      // ── 2. Outstanding "Due" Penalty Repayment ──
      let activeDue = isPlayer1 ? newP1Due : newP2Due;
      let effectiveMyPocketed = myPocketedCount;

      if (activeDue > 0 && myPocketedCount > 0) {
        // Pay off 1 Due penalty coin by returning it to center
        returnPenaltyCoinToCenter(myTargetColor);
        if (isPlayer1) newP1Due -= 1;
        else newP2Due -= 1;
        effectiveMyPocketed -= 1;
        actionLog = "💸 1 Due penalty coin paid back and returned to center!";
      }

      // ── 3. Queen Pocketing & Official Cover Verification ──
      if (queenPocketed && !newHasQueen) {
        // Did player pocket Queen AND their own piece in the SAME shot?
        if (effectiveMyPocketed > 0) {
          // Immediately Covered!
          newHasQueen = currentUid;
          newQueenPending = null;
          actionLog = "👑 QUEEN & COVER SUNK IN SAME SHOT! Queen claimed! Bonus turn awarded!";
          soundSynth.playFanfare();
          nextTurnUid = currentUid; // Retain turn
        } else {
          // Queen sunk alone -> Next shot is the mandatory Cover Shot
          newQueenPending = currentUid;
          actionLog = "👑 QUEEN SUNK! Pocket one of your pieces on the next shot to cover!";
          nextTurnUid = currentUid; // Bonus shot to cover
        }
      } else if (newQueenPending === currentUid) {
        // Player was on Cover Shot turn
        if (effectiveMyPocketed > 0) {
          // Queen Covered successfully!
          newHasQueen = currentUid;
          newQueenPending = null;
          actionLog = `🎉 QUEEN COVERED! Pocketed ${effectiveMyPocketed} coin(s)! Bonus Turn!`;
          soundSynth.playFanfare();
          nextTurnUid = currentUid; // Retain turn
        } else {
          // Cover Failed! Queen re-centered
          newQueenPending = null;
          returnQueenToCenter();
          actionLog = "❌ Queen not covered! Queen placed back in center circle. Turn passes.";
          const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
          nextTurnUid = opponentUid;
        }
      } else {
        // ── 4. Regular Scoring & Turn Flow ──
        if (effectiveMyPocketed > 0) {
          actionLog = `Pocketed ${effectiveMyPocketed} ${myTargetColor.toUpperCase()}! Bonus Turn awarded!`;
          nextTurnUid = currentUid; // Retains turn
        } else if (opponentPocketedCount > 0) {
          // Pocketed ONLY opponent piece: Opponent piece stays pocketed, turn passes
          actionLog = `Opponent's coin pocketed. Turn passes.`;
          const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
          nextTurnUid = opponentUid;
        } else {
          // Blank shot: turn passes
          actionLog = "No coin pocketed. Turn passes.";
          const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
          nextTurnUid = opponentUid;
        }
      }
    }

    // ── 5. Check Tournament Victory & Last Piece Rule ──
    const remainingWhite = pieces.filter((p) => p.type === "white" && !p.isPocketed).length;
    const remainingBlack = pieces.filter((p) => p.type === "black" && !p.isPocketed).length;
    const isQueenStillOnBoard = pieces.some((p) => p.type === "queen" && !p.isPocketed);

    let isGameOver = false;
    let winnerUid = currentUid;

    // Last Piece Rule: Clearing all 9 pieces while Queen is still on board = LOSS!
    if (remainingWhite === 0 && isQueenStillOnBoard) {
      isGameOver = true;
      winnerUid = playerUids[1] || currentUid; // Opponent wins
      actionLog = "⚠️ LAST PIECE FOUL! Cleared all pieces without Queen. Opponent wins board!";
    } else if (remainingBlack === 0 && isQueenStillOnBoard) {
      isGameOver = true;
      winnerUid = playerUids[0] || currentUid; // Player 1 wins
      actionLog = "⚠️ LAST PIECE FOUL! Cleared all pieces without Queen. Opponent wins board!";
    } else if (remainingWhite === 0) {
      // Player 1 cleared board legally
      isGameOver = true;
      winnerUid = playerUids[0] || currentUid;
      // ICF Score: 1 pt per remaining opponent piece + (3 pts for Queen if winner < 21 pts)
      let boardPts = remainingBlack;
      if (newHasQueen === winnerUid && newP1Score < 21) {
        boardPts += 3;
      }
      newP1Score += boardPts;
      actionLog = `🏆 BOARD CLEARED! White wins +${boardPts} ICF Points!`;
    } else if (remainingBlack === 0) {
      // Player 2 cleared board legally
      isGameOver = true;
      winnerUid = playerUids[1] || currentUid;
      let boardPts = remainingWhite;
      if (newHasQueen === winnerUid && newP2Score < 21) {
        boardPts += 3;
      }
      newP2Score += boardPts;
      actionLog = `🏆 BOARD CLEARED! Black wins +${boardPts} ICF Points!`;
    }

    await fireCarromShot(
      match.id,
      currentUid,
      0,
      0,
      striker?.x || BOARD_SIZE / 2,
      striker?.y || activeBaselineY,
      pieces,
      {
        nextTurnUid,
        p1Score: newP1Score,
        p2Score: newP2Score,
        p1Due: newP1Due,
        p2Due: newP2Due,
        hasQueen: newHasQueen,
        queenPendingUid: newQueenPending,
        actionLog,
        isGameOver,
        winnerUid,
      }
    );
  }, [activeBaselineY, cs, currentUid, isPlayer1, match.id, myTargetColor, playerUids, strikerBaselineX]);

  // Adjust baseline position slider
  const handleBaselineChange = (newX: number) => {
    setStrikerBaselineX(newX);
    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker && striker.vx === 0 && striker.vy === 0 && !isSimulating) {
      striker.x = newX;
      striker.y = activeBaselineY;
    }
  };

  // Count remaining carrom men on board
  const pieces = piecesRef.current;
  const remainingWhite = pieces.filter((p) => p.type === "white" && !p.isPocketed).length;
  const remainingBlack = pieces.filter((p) => p.type === "black" && !p.isPocketed).length;
  const isQueenOnBoard = pieces.some((p) => p.type === "queen" && !p.isPocketed);

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-amber-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(245,158,11,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] text-lg">
            ⚪
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                CHAMPIONSHIP CARROM
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                ICF OFFICIAL
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[cs?.currentTurnUid || ""]?.handle || "Player"}</span> ({isTurnPlayer1 ? "⚪ White" : "⚫ Black"}) • {isMyTurn ? "YOUR STRIKE" : "OPPONENT'S TURN"}
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
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="carrom" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border-2 border-amber-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-amber-200 truncate">
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
                  handle: `@CARROM_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Carrom:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Live Carrom Men Inventory, Queen Status & Due Penalty HUD ── */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-amber-500/30 text-center">
        {/* Player 1 (White) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
            ⚪ WHITE ({cs?.p1Score || 0} PTS)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingWhite} / 9</span>
          {(cs?.p1Due || 0) > 0 && (
            <span className="text-[8px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-800">
              🔴 DUE: {cs?.p1Due} COIN(S)
            </span>
          )}
        </div>

        {/* Queen (Red) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-700 space-y-0.5">
          <span className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1">
            👑 QUEEN (3 PTS)
          </span>
          <span className="text-sm font-black text-amber-400 font-mono">
            {cs?.hasQueen ? "COVERED 🏆" : cs?.queenPendingUid ? "COVER PENDING ⏳" : isQueenOnBoard ? "ON BOARD" : "POCKETED"}
          </span>
          <span className="text-[8px] text-amber-300">21-PT CAP APPLIES</span>
        </div>

        {/* Player 2 (Black) */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            ⚫ BLACK ({cs?.p2Score || 0} PTS)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingBlack} / 9</span>
          {(cs?.p2Due || 0) > 0 && (
            <span className="text-[8px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-800">
              🔴 DUE: {cs?.p2Due} COIN(S)
            </span>
          )}
        </div>
      </div>

      {/* Action Telemetry Log */}
      {cs?.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{cs.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe Carrom Board Canvas ── */}
      <div className="relative aspect-square max-w-[400px] sm:max-w-[420px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#2b1307] via-[#45220c] to-[#1a0b04] border-4 border-[#6e3713] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── Striker Baseline Position Slider ── */}
      {isMyTurn && !isSimulating && (
        <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-inner">
          <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
            <span className="flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              SLIDE STRIKER ON BASELINE:
            </span>
            <span className="text-amber-400 font-mono font-black">{Math.round(strikerBaselineX)}px</span>
          </div>
          <input
            type="range"
            min={75}
            max={BOARD_SIZE - 75}
            value={strikerBaselineX}
            onChange={(e) => handleBaselineChange(Number(e.target.value))}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      )}

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>STRIKE VELOCITY &amp; TENSION:</span>
          <span className="text-amber-400 font-mono font-black">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-400 text-center pt-1 font-mono">
          {isMyTurn
            ? "1. POSITION STRIKER ➔ 2. DRAG FROM STRIKER TO AIM (LASER SHOWS BANK SHOT) ➔ 3. RELEASE TO STRIKE!"
            : "WAITING FOR OPPONENT TO AIM & SHOOT..."}
        </p>
      </div>

      {/* ── Pro Shot Mechanics Interactive Guide ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProTips(!showProTips)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-amber-400" />
            🎯 ICF PRO SHOT TECHNIQUES (THUMBING, CUTS, REBOUNDS, CANNONS)
          </span>
          {showProTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProTips && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">1. 🤙 THUMB SHOT (THUMBING):</span>
              Reverse pocketing near own baseline without crossing diagonal foul lines.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">2. 📐 BOARD CUTS (THIN / THICK CUTS):</span>
              Aim at the &quot;ghost coin&quot; position to impart 15° to 80° deflection into corner pockets.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">3. 🪞 REBOUND &amp; FRAME BANK SHOTS:</span>
              Use the wooden cushion frame to bounce striker or coin around opponent blocker pieces.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">4. 💥 DOUBLE TOUCH &amp; CANNONS:</span>
              Hit Piece A to drive Piece B into the pocket, or execute split shots between touching pieces.
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 CARROM CHAMPIONSHIP VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You dominated the board and scored +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
