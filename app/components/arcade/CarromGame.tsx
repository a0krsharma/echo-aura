"use client";

import React, { useRef, useEffect, useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fireCarromShot, type ArcadeMatch, type CarromPiece } from "@/lib/arcade";
import { executeCarromBotShot } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, CircleDot, HelpCircle } from "lucide-react";

interface CarromGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const BOARD_SIZE = 380;
const FRICTION = 0.982;
const RESTITUTION = 0.86;

const POCKETS = [
  { x: 26, y: 26 },
  { x: BOARD_SIZE - 26, y: 26 },
  { x: 26, y: BOARD_SIZE - 26 },
  { x: BOARD_SIZE - 26, y: BOARD_SIZE - 26 },
];
const POCKET_RADIUS = 24;

export default function CarromGame({ match, currentUid }: CarromGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cs = match.carromState;
  const isMyTurn = cs?.currentTurnUid === currentUid && match.status === "PLAYING";

  // Trigger AI Bot Shot in VS_COMPUTER mode
  useEffect(() => {
    if (!cs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === cs.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeCarromBotShot(match);
    }
  }, [match, cs?.currentTurnUid]);

  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [strikerBaselineX, setStrikerBaselineX] = useState(BOARD_SIZE / 2);

  const piecesRef = useRef<CarromPiece[]>([]);

  useEffect(() => {
    if (cs?.piecesStr) {
      piecesRef.current = JSON.parse(cs.piecesStr);
    }
  }, [cs?.piecesStr]);

  // Main Canvas Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const update = () => {
      const pieces = piecesRef.current;

      // 1. Move & Friction
      pieces.forEach((piece) => {
        if (piece.isPocketed) return;
        piece.x += piece.vx;
        piece.y += piece.vy;

        piece.vx *= FRICTION;
        piece.vy *= FRICTION;

        if (Math.hypot(piece.vx, piece.vy) < 0.05) {
          piece.vx = 0;
          piece.vy = 0;
        }

        // Frame collision
        if (piece.x - piece.radius < 20) {
          piece.x = 20 + piece.radius;
          piece.vx = -piece.vx * RESTITUTION;
        } else if (piece.x + piece.radius > BOARD_SIZE - 20) {
          piece.x = BOARD_SIZE - 20 - piece.radius;
          piece.vx = -piece.vx * RESTITUTION;
        }

        if (piece.y - piece.radius < 20) {
          piece.y = 20 + piece.radius;
          piece.vy = -piece.vy * RESTITUTION;
        } else if (piece.y + piece.radius > BOARD_SIZE - 20) {
          piece.y = BOARD_SIZE - 20 - piece.radius;
          piece.vy = -piece.vy * RESTITUTION;
        }

        // Pocket checking
        POCKETS.forEach((pkt) => {
          if (Math.hypot(piece.x - pkt.x, piece.y - pkt.y) < POCKET_RADIUS) {
            piece.isPocketed = true;
            piece.vx = 0;
            piece.vy = 0;
            if (piece.type === "striker") {
              setTimeout(() => {
                piece.isPocketed = false;
                piece.x = strikerBaselineX;
                piece.y = BOARD_SIZE - 55;
              }, 400);
            }
          }
        });
      });

      // 2. Piece-to-Piece Collisions
      for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
          const p1 = pieces[i];
          const p2 = pieces[j];
          if (p1.isPocketed || p2.isPocketed) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p1.radius + p2.radius) {
            const overlap = (p1.radius + p2.radius - dist) / 2;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            p1.x -= nx * overlap;
            p1.y -= ny * overlap;
            p2.x += nx * overlap;
            p2.y += ny * overlap;

            const kx = p1.vx - p2.vx;
            const ky = p1.vy - p2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            p1.vx -= p * nx * RESTITUTION;
            p1.vy -= p * ny * RESTITUTION;
            p2.vx += p * nx * RESTITUTION;
            p2.vy += p * ny * RESTITUTION;
          }
        }
      }

      // 3. Render Canvas
      ctx.fillStyle = "#18181b"; // Dark wooden finish
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Wooden Frame
      ctx.strokeStyle = "#3f3f46";
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, BOARD_SIZE - 16, BOARD_SIZE - 16);

      // Pockets
      POCKETS.forEach((pkt) => {
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.strokeStyle = "#52525b";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Center Circle & Concentric Rings
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 40, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // Baselines
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(50, BOARD_SIZE - 55);
      ctx.lineTo(BOARD_SIZE - 50, BOARD_SIZE - 55);
      ctx.stroke();

      // Render Pieces
      pieces.forEach((piece) => {
        if (piece.isPocketed) return;

        ctx.beginPath();
        ctx.arc(piece.x, piece.y, piece.radius, 0, Math.PI * 2);
        ctx.fillStyle = piece.color;
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = piece.type === "striker" ? 10 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = piece.type === "white" ? "#000" : "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Render Aiming Line
      if (isAiming && dragStart && dragCurrent) {
        const striker = pieces.find((p) => p.type === "striker");
        if (striker && !striker.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;

          ctx.beginPath();
          ctx.moveTo(striker.x, striker.y);
          ctx.lineTo(striker.x + pullDx * 2, striker.y + pullDy * 2);
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
  }, [isAiming, dragStart, dragCurrent, strikerBaselineX]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || match.status === "FINISHED") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const striker = piecesRef.current.find((p) => p.type === "striker");

    if (striker && Math.hypot(striker.x - x, striker.y - y) < striker.radius * 2.5) {
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

    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker) {
      const impulseX = (dragStart.x - dragCurrent.x) * 0.24;
      const impulseY = (dragStart.y - dragCurrent.y) * 0.24;

      striker.vx = impulseX;
      striker.vy = impulseY;
      soundSynth.playSnare();

      await fireCarromShot(
        match.id,
        currentUid,
        impulseX,
        impulseY,
        striker.x,
        striker.y,
        piecesRef.current
      );
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  const handleBaselineChange = (newX: number) => {
    setStrikerBaselineX(newX);
    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker && striker.vx === 0 && striker.vy === 0) {
      striker.x = newX;
      striker.y = BOARD_SIZE - 55;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-3 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <CircleDot className="w-4 h-4 text-emerald-400" />
          // CARROM BOARD [ PHYSICS ARENA ]
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

      {/* Carrom Canvas */}
      <div className="relative border-2 border-neutral-700 bg-black flex justify-center shadow-2xl">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair max-w-full"
        />
      </div>

      {/* Striker Position Slider */}
      {isMyTurn && (
        <div className="space-y-1 bg-neutral-950 p-2.5 border border-neutral-800">
          <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase">
            <span>POSITION STRIKER:</span>
            <span className="text-white font-mono">{Math.round(strikerBaselineX)}px</span>
          </div>
          <input
            type="range"
            min={60}
            max={BOARD_SIZE - 60}
            value={strikerBaselineX}
            onChange={(e) => handleBaselineChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      )}

      {/* Power Meter */}
      <div className="space-y-1 bg-neutral-950 p-2.5 border border-neutral-800">
        <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase">
          <span>STRIKER FORCE:</span>
          <span className="text-emerald-400 font-mono">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2 border border-neutral-800 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[9px] text-neutral-500 text-center pt-1">
          POSITION STRIKER ON BASELINE ➔ DRAG BACK TO AIM & RELEASE.
        </p>
      </div>

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CLEARED THE CARROM BOARD!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ CARROM RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="carrom"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
