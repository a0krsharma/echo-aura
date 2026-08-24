"use client";

import React, { useRef, useEffect, useState } from "react";
import Matter from "matter-js";
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
const WALL_THICKNESS = 40;

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

  const sparksRef = useRef<Spark[]>([]);
  const p1TargetRef = useRef({ x: WIDTH / 2, y: HEIGHT - 60 });
  
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

  // Main Matter.js Engine & Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Matter.js Setup ---
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    
    // Create Puck
    const puck = Matter.Bodies.circle(WIDTH / 2, HEIGHT / 2, PUCK_RADIUS, {
      restitution: 0.95, // Bouncy
      friction: 0.001,
      frictionAir: 0.01,
      density: 0.04, // Very light
      label: "puck"
    });
    Matter.Body.setVelocity(puck, { x: (Math.random() - 0.5) * 4, y: 4 });

    // Create Paddles
    const p1Paddle = Matter.Bodies.circle(WIDTH / 2, HEIGHT - 60, PADDLE_RADIUS, {
      restitution: 0.5,
      friction: 0,
      frictionAir: 0.1,
      density: 1, // Heavy mallet
      label: "paddle1"
    });
    const p2Paddle = Matter.Bodies.circle(WIDTH / 2, 60, PADDLE_RADIUS, {
      restitution: 0.5,
      friction: 0,
      frictionAir: 0.1,
      density: 1,
      label: "paddle2"
    });

    // Create Walls
    const wallOptions = { isStatic: true, restitution: 0.8, friction: 0 };
    const leftWall = Matter.Bodies.rectangle(-WALL_THICKNESS/2, HEIGHT/2, WALL_THICKNESS, HEIGHT + WALL_THICKNESS*2, wallOptions);
    const rightWall = Matter.Bodies.rectangle(WIDTH + WALL_THICKNESS/2, HEIGHT/2, WALL_THICKNESS, HEIGHT + WALL_THICKNESS*2, wallOptions);
    
    // Top and Bottom walls need gaps for goals
    const sideWallWidth = (WIDTH - GOAL_WIDTH) / 2;
    const topLeft = Matter.Bodies.rectangle(sideWallWidth/2, -WALL_THICKNESS/2, sideWallWidth, WALL_THICKNESS, wallOptions);
    const topRight = Matter.Bodies.rectangle(WIDTH - sideWallWidth/2, -WALL_THICKNESS/2, sideWallWidth, WALL_THICKNESS, wallOptions);
    
    const bottomLeft = Matter.Bodies.rectangle(sideWallWidth/2, HEIGHT + WALL_THICKNESS/2, sideWallWidth, WALL_THICKNESS, wallOptions);
    const bottomRight = Matter.Bodies.rectangle(WIDTH - sideWallWidth/2, HEIGHT + WALL_THICKNESS/2, sideWallWidth, WALL_THICKNESS, wallOptions);

    Matter.Composite.add(engine.world, [
      puck, p1Paddle, p2Paddle,
      leftWall, rightWall, topLeft, topRight, bottomLeft, bottomRight
    ]);

    // Handle Collisions
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const speed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y);
        
        if (bodyA.label === "puck" || bodyB.label === "puck") {
          const impactX = bodyA.position.x + (bodyB.position.x - bodyA.position.x)/2;
          const impactY = bodyA.position.y + (bodyB.position.y - bodyA.position.y)/2;
          
          if (bodyA.label.includes("paddle") || bodyB.label.includes("paddle")) {
            const padLabel = bodyA.label.includes("paddle") ? bodyA.label : bodyB.label;
            emitSparks(impactX, impactY, padLabel === "paddle1" ? "#00ffcc" : "#ff0055", Math.min(speed, 10));
            if (speed > 4) soundSynth.playSnare();
          } else {
            // Hit wall
            if (speed > 2) {
               emitSparks(impactX, impactY, "#38bdf8", 3);
               soundSynth.playSubtlePop();
            }
          }
        }
      });
    });

    const resetPuck = (scoredP1: boolean) => {
      Matter.Body.setPosition(puck, { x: WIDTH / 2, y: HEIGHT / 2 });
      Matter.Body.setVelocity(puck, { x: (Math.random() - 0.5) * 4, y: scoredP1 ? 4 : -4 });
      Matter.Body.setPosition(p1Paddle, { x: WIDTH / 2, y: HEIGHT - 60 });
      Matter.Body.setVelocity(p1Paddle, { x: 0, y: 0 });
      Matter.Body.setPosition(p2Paddle, { x: WIDTH / 2, y: 60 });
      Matter.Body.setVelocity(p2Paddle, { x: 0, y: 0 });
    };

    let animId: number;

    const update = () => {
      // Player 1 Paddle Velocity Control (Towards target)
      const p1Target = p1TargetRef.current;
      const dx1 = p1Target.x - p1Paddle.position.x;
      const dy1 = p1Target.y - p1Paddle.position.y;
      Matter.Body.setVelocity(p1Paddle, { x: dx1 * 0.3, y: dy1 * 0.3 });

      // Player 2 Bot Logic
      if (isVsBot) {
        let p2TargetX = puck.position.x;
        let p2TargetY = puck.position.y < HEIGHT / 2 ? Math.max(60, puck.position.y - 30) : 60;
        
        // Clamp to top half
        p2TargetX = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, p2TargetX));
        p2TargetY = Math.max(PADDLE_RADIUS, Math.min(HEIGHT / 2 - PADDLE_RADIUS, p2TargetY));

        const dx2 = p2TargetX - p2Paddle.position.x;
        const dy2 = p2TargetY - p2Paddle.position.y;
        Matter.Body.setVelocity(p2Paddle, { x: dx2 * 0.12, y: dy2 * 0.12 });
      }

      // Step Physics Engine
      Matter.Engine.update(engine, 1000 / 60);

      // Clamp puck velocity to prevent crazy clipping
      const speed = Math.hypot(puck.velocity.x, puck.velocity.y);
      if (speed > 25) {
        Matter.Body.setVelocity(puck, { 
          x: (puck.velocity.x / speed) * 25, 
          y: (puck.velocity.y / speed) * 25 
        });
      }

      // Goal Checks
      const inGoalX = puck.position.x > (WIDTH - GOAL_WIDTH) / 2 && puck.position.x < (WIDTH + GOAL_WIDTH) / 2;
      
      if (puck.position.y < -PUCK_RADIUS) {
        if (inGoalX) {
          soundSynth.playFanfare();
          emitSparks(puck.position.x, 10, "#22c55e", 30);
          setP1Score((s) => {
            const next = s + 1;
            updateGlowHockeyScore(match.id, currentUid, next, p2Score);
            return next;
          });
          resetPuck(true);
        }
      } else if (puck.position.y > HEIGHT + PUCK_RADIUS) {
        if (inGoalX) {
          soundSynth.playBuzzer();
          emitSparks(puck.position.x, HEIGHT - 10, "#ef4444", 30);
          setP2Score((s) => {
            const next = s + 1;
            updateGlowHockeyScore(match.id, Object.keys(match.players || {}).find(u => u !== currentUid) || currentUid, p1Score, next);
            return next;
          });
          resetPuck(false);
        }
      }

      // Keep paddles in their halves
      if (p1Paddle.position.y < HEIGHT / 2 + PADDLE_RADIUS) {
        Matter.Body.setPosition(p1Paddle, { x: p1Paddle.position.x, y: HEIGHT / 2 + PADDLE_RADIUS });
        Matter.Body.setVelocity(p1Paddle, { x: p1Paddle.velocity.x, y: Math.max(0, p1Paddle.velocity.y) });
      }
      if (p2Paddle.position.y > HEIGHT / 2 - PADDLE_RADIUS) {
        Matter.Body.setPosition(p2Paddle, { x: p2Paddle.position.x, y: HEIGHT / 2 - PADDLE_RADIUS });
        Matter.Body.setVelocity(p2Paddle, { x: p2Paddle.velocity.x, y: Math.min(0, p2Paddle.velocity.y) });
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

      // --- Rendering (Canvas) ---
      ctx.fillStyle = "#040914"; 
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Table Glow Lines
      ctx.strokeStyle = "rgba(16, 200, 255, 0.6)";
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
      ctx.shadowBlur = 0;

      // Goals (Top & Bottom Slots with Neon Glow)
      ctx.fillStyle = "#ff0055"; 
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 20;
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, 0, GOAL_WIDTH, 8);

      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 20;
      ctx.fillRect((WIDTH - GOAL_WIDTH) / 2, HEIGHT - 8, GOAL_WIDTH, 8);
      ctx.shadowBlur = 0;

      // Render P2 Paddle
      ctx.beginPath();
      ctx.arc(p2Paddle.position.x, p2Paddle.position.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0055";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.fillStyle = "#330011"; 
      ctx.beginPath();
      ctx.arc(p2Paddle.position.x, p2Paddle.position.y, PADDLE_RADIUS - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Render P1 Paddle
      ctx.beginPath();
      ctx.arc(p1Paddle.position.x, p1Paddle.position.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.fillStyle = "#002211"; 
      ctx.beginPath();
      ctx.arc(p1Paddle.position.x, p1Paddle.position.y, PADDLE_RADIUS - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Puck
      ctx.beginPath();
      ctx.arc(puck.position.x, puck.position.y, PUCK_RADIUS, 0, Math.PI * 2);
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
    
    return () => {
      cancelAnimationFrame(animId);
      Matter.Engine.clear(engine);
    };
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

    // Player 1 controls bottom half paddle
    p1TargetRef.current.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, x));
    p1TargetRef.current.y = Math.max(HEIGHT / 2 + PADDLE_RADIUS, Math.min(HEIGHT - PADDLE_RADIUS, y));
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
