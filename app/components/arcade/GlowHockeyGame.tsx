"use client";

import React, { useRef, useEffect, useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateGlowHockeyScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Zap, HelpCircle } from "lucide-react";

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

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function GlowHockeyGame({ match, currentUid }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState(gh?.p2Score || 0);

  const isVsBot = match.mode === "VS_COMPUTER";

  const puckRef = useRef({ x: WIDTH / 2, y: HEIGHT / 2, vx: 3, vy: 4 });
  const p1PaddleRef = useRef({ x: WIDTH / 2, y: HEIGHT - 60, prevX: WIDTH / 2, prevY: HEIGHT - 60 });
  const p2PaddleRef = useRef({ x: WIDTH / 2, y: 60, prevX: WIDTH / 2, prevY: 60 });
  const sparksRef = useRef<Spark[]>([]);

  const emitSparks = (x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 0.3 + 0.2,
        color,
      });
    }
  };

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

      // 1. Bot AI Movement (Adaptive Smooth Interpolation)
      if (isVsBot) {
        p2.prevX = p2.x;
        p2.prevY = p2.y;
        const targetX = puck.x;
        // Bot defense strategy
        p2.x += (targetX - p2.x) * 0.14;
        p2.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, p2.x));
        const targetY = puck.y < HEIGHT / 2 ? Math.max(60, puck.y - 30) : 60;
        p2.y += (targetY - p2.y) * 0.08;
      }

      // 2. Sub-step Physics (2 passes per frame to prevent tunneling)
      for (let step = 0; step < 2; step++) {
        puck.x += puck.vx * 0.5;
        puck.y += puck.vy * 0.5;

        // Friction
        puck.vx *= 0.997;
        puck.vy *= 0.997;

        // Side Wall Bounces
        if (puck.x - PUCK_RADIUS < 0) {
          puck.x = PUCK_RADIUS;
          puck.vx = Math.abs(puck.vx) * 0.96;
          emitSparks(puck.x, puck.y, "#38bdf8", 4);
          soundSynth.playSubtlePop();
        } else if (puck.x + PUCK_RADIUS > WIDTH) {
          puck.x = WIDTH - PUCK_RADIUS;
          puck.vx = -Math.abs(puck.vx) * 0.96;
          emitSparks(puck.x, puck.y, "#38bdf8", 4);
          soundSynth.playSubtlePop();
        }

        // Goal Checks (Top and Bottom)
        const inGoalX = puck.x > (WIDTH - GOAL_WIDTH) / 2 && puck.x < (WIDTH + GOAL_WIDTH) / 2;

        if (puck.y - PUCK_RADIUS < 0) {
          if (inGoalX) {
            soundSynth.playFanfare();
            emitSparks(puck.x, 10, "#22c55e", 20);
            setP1Score((s) => {
              const next = s + 1;
              updateGlowHockeyScore(match.id, currentUid, next, p2Score);
              return next;
            });
            resetPuck(true);
            break;
          } else {
            puck.y = PUCK_RADIUS;
            puck.vy = Math.abs(puck.vy) * 0.96;
            emitSparks(puck.x, puck.y, "#38bdf8", 4);
            soundSynth.playSubtlePop();
          }
        } else if (puck.y + PUCK_RADIUS > HEIGHT) {
          if (inGoalX) {
            soundSynth.playBuzzer();
            emitSparks(puck.x, HEIGHT - 10, "#ef4444", 20);
            setP2Score((s) => {
              const next = s + 1;
              updateGlowHockeyScore(match.id, Object.keys(match.players || {}).find(u => u !== currentUid) || currentUid, p1Score, next);
              return next;
            });
            resetPuck(false);
            break;
          } else {
            puck.y = HEIGHT - PUCK_RADIUS;
            puck.vy = -Math.abs(puck.vy) * 0.96;
            emitSparks(puck.x, puck.y, "#38bdf8", 4);
            soundSynth.playSubtlePop();
          }
        }

        // Paddle Collisions (Dynamic impulse transfer based on swing velocity)
        const handlePaddleCollision = (pad: { x: number; y: number; prevX?: number; prevY?: number }, isPlayer: boolean) => {
          const dx = puck.x - pad.x;
          const dy = puck.y - pad.y;
          const dist = Math.hypot(dx, dy);

          if (dist < PUCK_RADIUS + PADDLE_RADIUS) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            puck.x = pad.x + nx * (PUCK_RADIUS + PADDLE_RADIUS + 2);
            puck.y = pad.y + ny * (PUCK_RADIUS + PADDLE_RADIUS + 2);

            const padVx = (pad.x - (pad.prevX || pad.x)) * 0.4;
            const padVy = (pad.y - (pad.prevY || pad.y)) * 0.4;

            const baseSpeed = Math.max(7, Math.hypot(puck.vx, puck.vy) * 1.06);
            puck.vx = nx * baseSpeed + padVx;
            puck.vy = ny * baseSpeed + padVy;

            // Cap max speed
            const currentSpeed = Math.hypot(puck.vx, puck.vy);
            if (currentSpeed > 18) {
              puck.vx = (puck.vx / currentSpeed) * 18;
              puck.vy = (puck.vy / currentSpeed) * 18;
            }

            emitSparks(puck.x, puck.y, isPlayer ? "#38bdf8" : "#22c55e", 10);
            soundSynth.playSnare();
          }
        };

        handlePaddleCollision(p1, true);
        handlePaddleCollision(p2, false);
      }

      // Update Sparks
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life += 0.016;
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.life >= sp.maxLife) {
          sparks.splice(i, 1);
        }
      }

      // 3. Render Canvas
      // 3. Render Canvas
      ctx.fillStyle = "#040914"; // Deep arcade cabinet background
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Table Glow Lines
      ctx.strokeStyle = "rgba(16, 200, 255, 0.6)"; // Neon cyan border
      ctx.lineWidth = 4;
      ctx.shadowColor = "#0ea5e9";
      ctx.shadowBlur = 10;
      ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);

      // Center Line and Circle
      ctx.strokeStyle = "rgba(16, 200, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, HEIGHT / 2);
      ctx.lineTo(WIDTH - 4, HEIGHT / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Goals (Top & Bottom Slots with Neon Glow)
      ctx.fillStyle = "#ff0055"; // Top Goal (Opponent)
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 20;
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, 0, GOAL_WIDTH, 8);

      ctx.fillStyle = "#00ffcc"; // Bottom Goal (Player)
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 20;
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, HEIGHT - 8, GOAL_WIDTH, 8);
      ctx.shadowBlur = 0;

      // Render P2 Paddle (Red Glow)
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0055";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.fillStyle = "#330011"; // Inner circle for realistic paddle look
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, PADDLE_RADIUS - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Render P1 Paddle (Cyan Glow)
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.fillStyle = "#002211"; // Inner circle for realistic paddle look
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, PADDLE_RADIUS - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Puck (Neon Yellow Glow for realistic arcade puck)
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, PUCK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render Collision Sparks
      for (const sp of sparks) {
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, 1 - sp.life / sp.maxLife);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isVsBot, match.id, currentUid, p2Score, p1Score]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Record previous position for swing momentum
    p1PaddleRef.current.prevX = p1PaddleRef.current.x;
    p1PaddleRef.current.prevY = p1PaddleRef.current.y;

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

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ GLOW HOCKEY RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="glow_hockey"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
