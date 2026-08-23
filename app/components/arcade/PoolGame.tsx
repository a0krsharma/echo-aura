"use client";

import React, { useRef, useEffect, useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { firePoolShot, type ArcadeMatch, type PoolBall } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, CircleDot } from "lucide-react";

interface PoolGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const TABLE_WIDTH = 380;
const TABLE_HEIGHT = 440;
const FRICTION = 0.985;
const RESTITUTION = 0.88;

const POCKETS = [
  { x: 20, y: 20 },
  { x: TABLE_WIDTH / 2, y: 15 },
  { x: TABLE_WIDTH - 20, y: 20 },
  { x: 20, y: TABLE_HEIGHT - 20 },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 15 },
  { x: TABLE_WIDTH - 20, y: TABLE_HEIGHT - 20 },
];
const POCKET_RADIUS = 22;

export default function PoolGame({ match, currentUid }: PoolGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ps = match.poolState;
  const isMyTurn = ps?.currentTurnUid === currentUid && match.status === "PLAYING";

  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);

  const ballsRef = useRef<PoolBall[]>([]);

  useEffect(() => {
    if (ps?.ballsStr) {
      ballsRef.current = JSON.parse(ps.ballsStr);
    }
  }, [ps?.ballsStr]);

  // Main Canvas Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const update = () => {
      const balls = ballsRef.current;

      // 1. Move & apply friction
      balls.forEach((ball) => {
        if (ball.isPocketed) return;
        ball.x += ball.vx;
        ball.y += ball.vy;

        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        if (Math.hypot(ball.vx, ball.vy) < 0.05) {
          ball.vx = 0;
          ball.vy = 0;
        }

        // Cushion bounce
        if (ball.x - ball.radius < 24) {
          ball.x = 24 + ball.radius;
          ball.vx = -ball.vx * RESTITUTION;
        } else if (ball.x + ball.radius > TABLE_WIDTH - 24) {
          ball.x = TABLE_WIDTH - 24 - ball.radius;
          ball.vx = -ball.vx * RESTITUTION;
        }

        if (ball.y - ball.radius < 24) {
          ball.y = 24 + ball.radius;
          ball.vy = -ball.vy * RESTITUTION;
        } else if (ball.y + ball.radius > TABLE_HEIGHT - 24) {
          ball.y = TABLE_HEIGHT - 24 - ball.radius;
          ball.vy = -ball.vy * RESTITUTION;
        }

        // Pocket checking
        POCKETS.forEach((pkt) => {
          if (Math.hypot(ball.x - pkt.x, ball.y - pkt.y) < POCKET_RADIUS) {
            ball.isPocketed = true;
            ball.vx = 0;
            ball.vy = 0;
            if (ball.type === "cue") {
              // Scratch cue reset
              setTimeout(() => {
                ball.isPocketed = false;
                ball.x = TABLE_WIDTH / 2;
                ball.y = TABLE_HEIGHT - 100;
              }, 500);
            }
          }
        });
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

          if (dist < b1.radius + b2.radius) {
            const overlap = (b1.radius + b2.radius - dist) / 2;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

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
          }
        }
      }

      // 3. Render Table
      ctx.fillStyle = "#0a1f14"; // Dark felt
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Table Border / Cushions
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, TABLE_WIDTH - 14, TABLE_HEIGHT - 14);

      // Pockets
      POCKETS.forEach((pkt) => {
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.strokeStyle = "#3f3f46";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Headstring line
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, TABLE_HEIGHT - 100);
      ctx.lineTo(TABLE_WIDTH - 24, TABLE_HEIGHT - 100);
      ctx.stroke();

      // Render Balls
      balls.forEach((ball) => {
        if (ball.isPocketed) return;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = ball.type === "cue" ? 8 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ball Number
        if (ball.number) {
          ctx.fillStyle = ball.type === "stripe" ? "#000" : "#fff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(ball.number), ball.x, ball.y);
        }
      });

      // Aiming Trajectory
      if (isAiming && dragStart && dragCurrent) {
        const cue = balls.find((b) => b.type === "cue");
        if (cue && !cue.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;

          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + pullDx * 2, cue.y + pullDy * 2);
          ctx.strokeStyle = "#10b981";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isAiming, dragStart, dragCurrent]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cue = ballsRef.current.find((b) => b.type === "cue");

    if (cue && Math.hypot(cue.x - x, cue.y - y) < cue.radius * 3) {
      setIsAiming(true);
      setDragStart({ x, y });
      setDragCurrent({ x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || !dragStart) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragCurrent(current);

    const pullDist = Math.hypot(dragStart.x - current.x, dragStart.y - current.y);
    setPower(Math.min(Math.round((pullDist / 100) * 100), 100));
  };

  const handlePointerUp = async () => {
    if (!isAiming || !dragStart || !dragCurrent) return;

    const cue = ballsRef.current.find((b) => b.type === "cue");
    if (cue) {
      const impulseX = (dragStart.x - dragCurrent.x) * 0.22;
      const impulseY = (dragStart.y - dragCurrent.y) * 0.22;

      cue.vx = impulseX;
      cue.vy = impulseY;
      soundSynth.playSnare();

      await firePoolShot(match.id, currentUid, impulseX, impulseY, ballsRef.current);
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-3 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <CircleDot className="w-4 h-4 text-emerald-400" />
          // 8-BALL POOL [ PHYSICS TABLE ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            {isMyTurn ? "● YOUR SHOT" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* Pool Table Canvas */}
      <div className="relative border-2 border-neutral-700 bg-black flex justify-center shadow-2xl">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair max-w-full"
        />
      </div>

      {/* Cue Power Meter */}
      <div className="space-y-1 bg-neutral-950 p-2.5 border border-neutral-800">
        <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase">
          <span>CUE STRIKE POWER:</span>
          <span className="text-emerald-400 font-mono">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2 border border-neutral-800 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[9px] text-neutral-500 text-center pt-1">
          DRAG BACK ON THE WHITE CUE BALL TO AIM & RELEASE TO STRIKE.
        </p>
      </div>

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} SUNK THE 8-BALL & WON!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
