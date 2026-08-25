"use client";

import React, { useRef, useEffect, useState } from "react";
import Matter from "matter-js";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateGlowHockeyScore, syncGlowHockeyState, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Zap, HelpCircle, Users, Sparkles, Flame, Crown } from "lucide-react";

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

export default function GlowHockeyGame({ match, currentUid, isHost }: GlowHockeyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gh = match.glowHockeyState;
  const [p1Score, setP1Score] = useState(gh?.p1Score || 0);
  const [p2Score, setP2Score] = useState(gh?.p2Score || 0);
  const isVsBot = match.mode === "VS_COMPUTER";

  const sparksRef = useRef<Spark[]>([]);
  const p1TargetRef = useRef({ x: WIDTH / 2, y: HEIGHT - 60 });
  const p2TargetRef = useRef({ x: WIDTH / 2, y: 60 });
  const lastSyncRef = useRef<number>(0);
  
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
      restitution: 0.95,
      friction: 0.001,
      frictionAir: 0.01,
      density: 0.04,
      label: "puck"
    });
    Matter.Body.setVelocity(puck, { x: (Math.random() - 0.5) * 4, y: 4 });

    // Create Paddles
    const p1Paddle = Matter.Bodies.circle(WIDTH / 2, HEIGHT - 60, PADDLE_RADIUS, {
      restitution: 0.5,
      friction: 0,
      frictionAir: 0.1,
      density: 1,
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
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      // 1. Update Paddle Positions smoothly
      const p1Pos = p1Paddle.position;
      const targetP1 = p1TargetRef.current;
      Matter.Body.setVelocity(p1Paddle, {
        x: (targetP1.x - p1Pos.x) * 15,
        y: (targetP1.y - p1Pos.y) * 15,
      });

      if (isVsBot) {
        const puckPos = puck.position;
        const targetX = puckPos.x;
        const targetY = Math.min(HEIGHT / 2 - 40, Math.max(50, puckPos.y - 30));
        p2TargetRef.current = { x: targetX, y: targetY };
      }

      const p2Pos = p2Paddle.position;
      const targetP2 = p2TargetRef.current;
      Matter.Body.setVelocity(p2Paddle, {
        x: (targetP2.x - p2Pos.x) * (isVsBot ? 6 : 15),
        y: (targetP2.y - p2Pos.y) * (isVsBot ? 6 : 15),
      });

      // 2. Step Physics Engine
      Matter.Engine.update(engine, dt * 1000);

      // Clamp puck speed
      const pVel = puck.velocity;
      const currentSpeed = Math.hypot(pVel.x, pVel.y);
      const maxSpeed = 16;
      if (currentSpeed > maxSpeed) {
        Matter.Body.setVelocity(puck, {
          x: (pVel.x / currentSpeed) * maxSpeed,
          y: (pVel.y / currentSpeed) * maxSpeed,
        });
      }

      // 3. Goal Checking
      const puckY = puck.position.y;
      const puckX = puck.position.x;
      const goalLeft = (WIDTH - GOAL_WIDTH) / 2;
      const goalRight = goalLeft + GOAL_WIDTH;

      if (puckY < -PUCK_RADIUS && puckX >= goalLeft && puckX <= goalRight) {
        // P1 Scored (Bottom player into top goal)
        soundSynth.playFanfare();
        emitSparks(WIDTH / 2, 20, "#00ffcc", 20);
        setP1Score((s) => {
          const next = s + 1;
          if (isHost) updateGlowHockeyScore(match.id, currentUid, next, p2Score);
          return next;
        });
        resetPuck(true);
      } else if (puckY > HEIGHT + PUCK_RADIUS && puckX >= goalLeft && puckX <= goalRight) {
        // P2 Scored (Top player into bottom goal)
        soundSynth.playAirhorn();
        emitSparks(WIDTH / 2, HEIGHT - 20, "#ff0055", 20);
        setP2Score((s) => {
          const next = s + 1;
          if (isHost) updateGlowHockeyScore(match.id, currentUid, p1Score, next);
          return next;
        });
        resetPuck(false);
      }

      // Reset if stuck out of bounds
      if (puck.position.x < 0 || puck.position.x > WIDTH || puck.position.y < -50 || puck.position.y > HEIGHT + 50) {
        resetPuck(true);
      }

      // 4. Render Photorealistic Neon Cyberpunk Table
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Rink Surface Gradient
      const rinkGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      rinkGrad.addColorStop(0, "#030712");
      rinkGrad.addColorStop(0.5, "#0b0f19");
      rinkGrad.addColorStop(1, "#030712");
      ctx.fillStyle = rinkGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Center Dividing Line & Glowing Circle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Goal Areas (Top & Bottom)
      ctx.fillStyle = "rgba(255, 0, 85, 0.25)";
      ctx.fillRect(goalLeft, 0, GOAL_WIDTH, 12);
      ctx.fillStyle = "rgba(0, 255, 204, 0.25)";
      ctx.fillRect(goalLeft, HEIGHT - 12, GOAL_WIDTH, 12);

      // Render Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render 3D Neon Puck
      const pPos = puck.position;
      ctx.beginPath();
      ctx.arc(pPos.x, pPos.y, PUCK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Render P1 Paddle (Cyan Striker)
      ctx.beginPath();
      ctx.arc(p1Paddle.position.x, p1Paddle.position.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Render P2 Paddle (Magenta Striker)
      ctx.beginPath();
      ctx.arc(p2Paddle.position.x, p2Paddle.position.y, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0055";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      Matter.Engine.clear(engine);
    };
  }, [currentUid, isHost, isVsBot, match.id, p1Score, p2Score]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let mappedX = x;
    let mappedY = y;
    if (!isHost && !isVsBot) {
      mappedX = WIDTH - x;
      mappedY = HEIGHT - y;
      p2TargetRef.current.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, mappedX));
      p2TargetRef.current.y = Math.max(PADDLE_RADIUS, Math.min(HEIGHT / 2 - PADDLE_RADIUS, mappedY));
    } else {
      p1TargetRef.current.x = Math.max(PADDLE_RADIUS, Math.min(WIDTH - PADDLE_RADIUS, mappedX));
      p1TargetRef.current.y = Math.max(HEIGHT / 2 + PADDLE_RADIUS, Math.min(HEIGHT - PADDLE_RADIUS, mappedY));
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-cyan-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(6,182,212,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-cyan-400 tracking-wider">
                GLOW HOCKEY PRO
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold rounded">
                NEON 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Score: <span className="text-cyan-300 font-bold">{p1Score}</span> - <span className="text-pink-400 font-bold">{p2Score}</span> (FIRST TO 7)
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
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="glow_hockey" />

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
                console.error("Failed to take seat in GlowHockey:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── 3D Cyberpunk Neon Arena Canvas ── */}
      <div className="relative aspect-[340/460] max-w-[340px] sm:max-w-[380px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-neutral-950 via-cyan-950/40 to-neutral-950 border-4 border-cyan-500/60 shadow-[0_20px_50px_rgba(6,182,212,0.3)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          className="touch-none cursor-grab w-full h-full rounded-xl"
          style={{ transform: (!isHost && !isVsBot) ? "rotate(180deg)" : "none" }}
        />
      </div>

      <p className="text-[11px] text-cyan-300 text-center font-mono uppercase tracking-wider">
        DRAG YOUR CYAN MALLET TO SMASH THE PUCK INTO THE OPPONENT'S GOAL!
      </p>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-cyan-400 bg-gradient-to-b from-cyan-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-cyan-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#06b6d4]" />
          <h2 className="text-xl font-black text-cyan-300 uppercase tracking-widest">
            🏆 GLOW HOCKEY CHAMPIONSHIP WON!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You dominated the arena and scored +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
