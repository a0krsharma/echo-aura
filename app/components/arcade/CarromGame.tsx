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
  Shield,
  RotateCcw,
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

// 4 Corner Pockets
const POCKETS = [
  { x: 30, y: 30 },
  { x: BOARD_SIZE - 30, y: 30 },
  { x: 30, y: BOARD_SIZE - 30 },
  { x: BOARD_SIZE - 30, y: BOARD_SIZE - 30 },
];

export default function CarromGame({ match, currentUid }: CarromGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cs = match.carromState;
  const isMyTurn = cs?.currentTurnUid === currentUid && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;

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

      // --- 1. Physics Sub-Stepping for High Precision ---
      const subSteps = 3;
      for (let step = 0; step < subSteps; step++) {
        pieces.forEach((p) => {
          if (p.isPocketed) return;

          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 0.05) {
            anyMoving = true;
            p.x += (p.vx / subSteps);
            p.y += (p.vy / subSteps);

            p.vx *= Math.pow(FRICTION, 1 / subSteps);
            p.vy *= Math.pow(FRICTION, 1 / subSteps);

            // Cushion Frame Collisions
            if (p.x - p.radius < PLAYABLE_MIN) {
              p.x = PLAYABLE_MIN + p.radius;
              p.vx = -p.vx * RESTITUTION;
              if (speed > 1.5) soundSynth.playSubtlePop();
            } else if (p.x + p.radius > PLAYABLE_MAX) {
              p.x = PLAYABLE_MAX - p.radius;
              p.vx = -p.vx * RESTITUTION;
              if (speed > 1.5) soundSynth.playSubtlePop();
            }

            if (p.y - p.radius < PLAYABLE_MIN) {
              p.y = PLAYABLE_MIN + p.radius;
              p.vy = -p.vy * RESTITUTION;
              if (speed > 1.5) soundSynth.playSubtlePop();
            } else if (p.y + p.radius > PLAYABLE_MAX) {
              p.y = PLAYABLE_MAX - p.radius;
              p.vy = -p.vy * RESTITUTION;
              if (speed > 1.5) soundSynth.playSubtlePop();
            }

            // Pocket Gravity & Pocketing Check
            POCKETS.forEach((pkt) => {
              const dToPocket = Math.hypot(p.x - pkt.x, p.y - pkt.y);
              if (dToPocket < POCKET_RADIUS) {
                // Gravitational pull into pocket hole
                const pullForce = 0.4;
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

        // 2. Piece-to-Piece Elastic Collisions with Mass Conservation
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

              // Separate overlapping pieces
              p1.x -= nx * overlap;
              p1.y -= ny * overlap;
              p2.x += nx * overlap;
              p2.y += ny * overlap;

              // Striker is ~3.2x heavier than regular carrom men
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

      // A. Polished Satin Maple / Birchwood Surface
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

      // E. Center Mandala & Rose Pattern
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
      ctx.lineWidth = 2;
      ctx.stroke();

      // F. 4 Baselines with Red Endpoint Circles
      const drawBaseline = (yPos: number, isBottom: boolean) => {
        const lineOffset = 55;
        const startX = lineOffset + 20;
        const endX = BOARD_SIZE - lineOffset - 20;

        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.5;

        // Front and Back baseline
        ctx.beginPath();
        ctx.moveTo(startX, yPos - 3);
        ctx.lineTo(endX, yPos - 3);
        ctx.moveTo(startX, yPos + 3);
        ctx.lineTo(endX, yPos + 3);
        ctx.stroke();

        // Left Red Circle Endpoint
        ctx.beginPath();
        ctx.arc(startX - 2, yPos, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Red Circle Endpoint
        ctx.beginPath();
        ctx.arc(endX + 2, yPos, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // Bottom baseline (Player)
      drawBaseline(BOARD_SIZE - 55, true);
      // Top baseline (Opponent)
      drawBaseline(55, false);

      // G. Render Carrom Pieces (Men + Queen + Striker)
      pieces.forEach((p) => {
        if (p.isPocketed) return;

        // Realistic Drop Shadow
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

      // H. Precision Trajectory Guideline when Aiming
      if (isAiming && dragStart && dragCurrent) {
        const striker = pieces.find((p) => p.type === "striker");
        if (striker && !striker.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;
          const aimLength = Math.hypot(pullDx, pullDy);

          if (aimLength > 2) {
            const dirX = pullDx / aimLength;
            const dirY = pullDy / aimLength;
            const rayDist = 280;

            // Direct Aim Laser Line
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);
            ctx.lineTo(striker.x + dirX * rayDist, striker.y + dirY * rayDist);
            ctx.strokeStyle = "#10b981";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();

            // Pullback Vector
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

  // Finalize Shot and Apply Official Tournament Carrom Rules
  const finalizeShotTurn = useCallback(async () => {
    const pocketed = pocketedThisShotRef.current;
    const isFoul = strikerFoulRef.current;
    const pieces = piecesRef.current;

    let nextTurnUid = cs?.currentTurnUid || currentUid;
    let newP1Score = cs?.p1Score || 0;
    let newP2Score = cs?.p2Score || 0;
    let newHasQueen = cs?.hasQueen || null;
    let newQueenPending = cs?.queenPendingUid || null;
    let actionLog = "";

    // Reset striker to baseline for next shot
    const striker = pieces.find((p) => p.type === "striker");
    if (striker) {
      striker.isPocketed = false;
      striker.vx = 0;
      striker.vy = 0;
      striker.x = BOARD_SIZE / 2;
      striker.y = BOARD_SIZE - 55;
    }

    const whitePocketed = pocketed.filter((p) => p.type === "white").length;
    const blackPocketed = pocketed.filter((p) => p.type === "black").length;
    const queenPocketed = pocketed.some((p) => p.type === "queen");

    // 1. Check Striker Foul
    if (isFoul) {
      actionLog = "⚠️ FOUL! Striker in pocket. Penalty applied!";
      // Turn passes to opponent
      const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
      nextTurnUid = opponentUid;

      // If queen was pending, return Queen to center
      if (newQueenPending === currentUid) {
        newQueenPending = null;
        const queen = pieces.find((p) => p.type === "queen");
        if (queen) {
          queen.isPocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
          queen.vx = 0;
          queen.vy = 0;
        }
      }
    } else {
      // 2. Queen Pocketing & Covering
      if (queenPocketed && !newHasQueen) {
        newQueenPending = currentUid;
        actionLog = "👑 QUEEN POCKETED! Pocket a cover coin to secure it!";
      } else if (newQueenPending === currentUid) {
        // Player was seeking Queen cover
        const validCover = isPlayer1 ? whitePocketed > 0 : blackPocketed > 0;
        if (validCover) {
          newHasQueen = currentUid;
          newQueenPending = null;
          if (isPlayer1) newP1Score += 25;
          else newP2Score += 25;
          actionLog = "🎉 QUEEN COVERED! +25 Points Awarded!";
          soundSynth.playFanfare();
        } else {
          // Failed to cover: Queen returns to center
          newQueenPending = null;
          const queen = pieces.find((p) => p.type === "queen");
          if (queen) {
            queen.isPocketed = false;
            queen.x = BOARD_SIZE / 2;
            queen.y = BOARD_SIZE / 2;
            queen.vx = 0;
            queen.vy = 0;
          }
          actionLog = "Queen not covered! Returned to center circle.";
        }
      }

      // 3. Regular Scoring & Turn Awarding
      if (isPlayer1 && whitePocketed > 0) {
        newP1Score += whitePocketed * 10;
        actionLog = `Pocketed ${whitePocketed} White (+${whitePocketed * 10} pts)! Bonus Turn!`;
        nextTurnUid = currentUid; // Bonus shot
      } else if (!isPlayer1 && blackPocketed > 0) {
        newP2Score += blackPocketed * 10;
        actionLog = `Pocketed ${blackPocketed} Black (+${blackPocketed * 10} pts)! Bonus Turn!`;
        nextTurnUid = currentUid; // Bonus shot
      } else if (queenPocketed) {
        // Sinking queen gives another shot to cover
        nextTurnUid = currentUid;
      } else {
        // Missed shot: turn passes to opponent
        const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;
        nextTurnUid = opponentUid;
        actionLog = "No coin pocketed. Turn passes.";
      }
    }

    // 4. Check Victory Condition
    const remainingCoins = pieces.filter((p) => p.type !== "striker" && !p.isPocketed);
    const isGameOver = remainingCoins.length === 0;

    await fireCarromShot(
      match.id,
      currentUid,
      0,
      0,
      striker?.x || 200,
      striker?.y || 345,
      pieces,
      {
        nextTurnUid,
        p1Score: newP1Score,
        p2Score: newP2Score,
        hasQueen: newHasQueen,
        queenPendingUid: newQueenPending,
        actionLog,
        isGameOver,
        winnerUid: newP1Score >= newP2Score ? playerUids[0] : playerUids[1] || currentUid,
      }
    );
  }, [cs, currentUid, isPlayer1, match.id, playerUids]);

  // Adjust baseline position slider
  const handleBaselineChange = (newX: number) => {
    setStrikerBaselineX(newX);
    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker && striker.vx === 0 && striker.vy === 0 && !isSimulating) {
      striker.x = newX;
      striker.y = BOARD_SIZE - 55;
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
      {/* ── Top Match Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            ⚪
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                CHAMPIONSHIP CARROM
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                PHYSICS PRO
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[cs?.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR SHOT" : "OPPONENT'S TURN"}
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
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="carrom" />

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
                console.error("Failed to take seat in Carrom:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Live Carrom Coin Inventory & Score HUD ── */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-amber-500/30 text-center">
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            ⚪ WHITE MEN
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingWhite} / 9</span>
          <span className="text-[9px] text-emerald-400">+10 PTS EACH</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-950/40 border border-red-500/40">
          <span className="text-[10px] text-red-300 font-bold uppercase flex items-center gap-1">
            👑 RED QUEEN
          </span>
          <span className="text-lg font-black text-red-400 font-mono">
            {cs?.hasQueen ? "COVERED 🏆" : isQueenOnBoard ? "ON BOARD" : "PENDING COVER"}
          </span>
          <span className="text-[9px] text-amber-300">+25 PTS (COVER REQ)</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            ⚫ BLACK MEN
          </span>
          <span className="text-lg font-black text-neutral-300 font-mono">{remainingBlack} / 9</span>
          <span className="text-[9px] text-emerald-400">+10 PTS EACH</span>
        </div>
      </div>

      {/* Action Telemetry Banner */}
      {cs?.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{cs.lastActionLog}</span>
        </div>
      )}

      {/* ── World-Class Photorealistic Carrom Board Canvas ── */}
      <div className="relative aspect-square max-w-[420px] sm:max-w-[450px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#2b1307] via-[#45220c] to-[#1a0b04] border-4 border-[#6e3713] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
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
              <CircleDot className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              SLIDE STRIKER ALONG BASELINE:
            </span>
            <span className="text-amber-400 font-mono font-black">{Math.round(strikerBaselineX)}px</span>
          </div>
          <input
            type="range"
            min={75}
            max={BOARD_SIZE - 75}
            value={strikerBaselineX}
            onChange={(e) => handleBaselineChange(Number(e.target.value))}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      )}

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>STRIKE VELOCITY & TENSION:</span>
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
            ? "1. POSITION ON BASELINE ➔ 2. DRAG FROM STRIKER TO AIM ➔ 3. RELEASE TO STRIKE!"
            : "WAITING FOR OPPONENT TO AIM & SHOOT..."}
        </p>
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 CARROM CHAMPIONSHIP CLEARED!
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
