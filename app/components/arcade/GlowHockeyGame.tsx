"use client";

import React, { useRef, useEffect, useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateGlowHockeyScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Zap } from "lucide-react";

interface GlowHockeyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const WIDTH = 340;
const HEIGHT = 460;
const PADDLE_RADIUS = 22;
const PUCK_RADIUS = 14;
const GOAL_WIDTH = 130;

export default function GlowHockeyGame({ match, currentUid }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState(gh?.p2Score || 0);

  const isHostPlayer = match.hostUid === currentUid;
  const isVsBot = match.mode === "VS_COMPUTER";

  const puckRef = useRef({ x: WIDTH / 2, y: HEIGHT / 2, vx: 3, vy: 4 });
  const p1PaddleRef = useRef({ x: WIDTH / 2, y: HEIGHT - 60 });
  const p2PaddleRef = useRef({ x: WIDTH / 2, y: 60 });

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resetPuck = (scoredP1: boolean) => {
      puckRef.current.x = WIDTH / 2;
      puckRef.current.y = HEIGHT / 2;
      puckRef.current.vx = (Math.random() - 0.5) * 4;
      puckRef.current.vy = scoredP1 ? 4 : -4;
    };

    const update = () => {
      const puck = puckRef.current;
      const p1 = p1PaddleRef.current;
      const p2 = p2PaddleRef.current;

      // 1. Bot AI Movement (if playing vs AI)
      if (isVsBot) {
        const targetX = puck.x;
        p2.x += (targetX - p2.x) * 0.12;
        p2.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, p2.x));
      }

      // 2. Move Puck
      puck.x += puck.vx;
      puck.y += puck.vy;

      // Friction
      puck.vx *= 0.994;
      puck.vy *= 0.994;

      // Side Wall Bounces
      if (puck.x - PUCK_RADIUS < 0) {
        puck.x = PUCK_RADIUS;
        puck.vx = -puck.vx * 0.95;
        soundSynth.playSubtlePop();
      } else if (puck.x + PUCK_RADIUS > WIDTH) {
        puck.x = WIDTH - PUCK_RADIUS;
        puck.vx = -puck.vx * 0.95;
        soundSynth.playSubtlePop();
      }

      // Goal Checks (Top and Bottom)
      const inGoalX = puck.x > (WIDTH - GOAL_WIDTH) / 2 && puck.x < (WIDTH + GOAL_WIDTH) / 2;

      if (puck.y - PUCK_RADIUS < 0) {
        if (inGoalX) {
          // P1 Scored Goal!
          soundSynth.playFanfare();
          setP1Score((s) => {
            const next = s + 1;
            updateGlowHockeyScore(match.id, currentUid, next, p2Score);
            return next;
          });
          resetPuck(true);
        } else {
          puck.y = PUCK_RADIUS;
          puck.vy = -puck.vy * 0.95;
          soundSynth.playSubtlePop();
        }
      } else if (puck.y + PUCK_RADIUS > HEIGHT) {
        if (inGoalX) {
          // P2 Scored Goal!
          soundSynth.playBuzzer();
          setP2Score((s) => {
            const next = s + 1;
            updateGlowHockeyScore(match.id, Object.keys(match.players).find(u => u !== currentUid) || currentUid, p1Score, next);
            return next;
          });
          resetPuck(false);
        } else {
          puck.y = HEIGHT - PUCK_RADIUS;
          puck.vy = -puck.vy * 0.95;
          soundSynth.playSubtlePop();
        }
      }

      // Paddle Collisions (Elastic reflection)
      const handlePaddleCollision = (pad: { x: number; y: number }) => {
        const dx = puck.x - pad.x;
        const dy = puck.y - pad.y;
        const dist = Math.hypot(dx, dy);

        if (dist < PUCK_RADIUS + PADDLE_RADIUS) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          puck.x = pad.x + nx * (PUCK_RADIUS + PADDLE_RADIUS + 2);
          puck.y = pad.y + ny * (PUCK_RADIUS + PADDLE_RADIUS + 2);

          const speed = Math.max(6, Math.hypot(puck.vx, puck.vy) * 1.05);
          puck.vx = nx * speed;
          puck.vy = ny * speed;
          soundSynth.playSnare();
        }
      };

      handlePaddleCollision(p1);
      handlePaddleCollision(p2);

      // 3. Render Canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Table Glow Lines
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);

      // Center Line and Circle
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Goals (Top & Bottom Slots)
      ctx.fillStyle = "#22c55e";
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, 0, GOAL_WIDTH, 6);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, HEIGHT - 6, GOAL_WIDTH, 6);

      // Render P1 Paddle (Cyan Glow)
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render P2 Paddle (Green Glow)
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Puck (Neon Red Glow)
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, PUCK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isVsBot, match.id, currentUid, p2Score, p1Score]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Player controls bottom half paddle
    p1PaddleRef.current.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, x));
    p1PaddleRef.current.y = Math.max(HEIGHT / 2 + PADDLE_RADIUS, Math.min(HEIGHT - PADDLE_RADIUS, y));
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-3 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          // GLOW HOCKEY [ NEON AIR ARENA ]
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
            SCORE: {p1Score} - {p2Score} (FIRST TO 7)
          </span>
        </div>
      </div>

      {/* Glow Hockey Canvas */}
      <div className="relative border-2 border-neutral-700 bg-black flex justify-center shadow-2xl">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          className="touch-none cursor-grab max-w-full"
        />
      </div>

      <p className="text-[10px] text-neutral-400 text-center uppercase tracking-wider">
        DRAG YOUR CYAN MALLET TO SMASH THE PUCK INTO THE OPPONENT'S GOAL!
      </p>

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} WON THE GLOW HOCKEY CLASH!
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
