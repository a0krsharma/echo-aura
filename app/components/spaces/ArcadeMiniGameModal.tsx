"use client";

import React, { useState, useEffect, useRef } from "react";
import { spacesSfx } from "@/lib/spacesSfx";
import { X, Play, RotateCcw, Trophy, Gamepad2 } from "lucide-react";

interface ArcadeMiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArcadeMiniGameModal({ isOpen, onClose }: ArcadeMiniGameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameState = useRef<{
    playerX: number;
    lasers: Array<{ x: number; y: number }>;
    invaders: Array<{ x: number; y: number; vx: number; alive: boolean }>;
    keys: Record<string, boolean>;
    score: number;
  }>({
    playerX: 200,
    lasers: [],
    invaders: [],
    keys: {},
    score: 0,
  });

  const initGame = () => {
    const invs: Array<{ x: number; y: number; vx: number; alive: boolean }> = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        invs.push({
          x: 40 + c * 48,
          y: 40 + r * 36,
          vx: 1.2,
          alive: true,
        });
      }
    }
    gameState.current = {
      playerX: 200,
      lasers: [],
      invaders: invs,
      keys: {},
      score: 0,
    };
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    spacesSfx.playKeyNote(4);
  };

  useEffect(() => {
    if (!isOpen) return;
    initGame();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      gameState.current.keys[e.key.toLowerCase()] = true;
      if (e.key === " " && !gameOver && gameStarted) {
        e.preventDefault();
        // Fire laser
        gameState.current.lasers.push({
          x: gameState.current.playerX,
          y: 260,
        });
        spacesSfx.playArcadeLaser();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      gameState.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isOpen, gameOver, gameStarted]);

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      // Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let i = 0; i < 20; i++) {
        ctx.fillRect((i * 47) % 400, (i * 31 + performance.now() * 0.05) % 300, 1.5, 1.5);
      }

      if (gameStarted && !gameOver) {
        const state = gameState.current;

        // Player Move
        if (state.keys["a"] || state.keys["arrowleft"]) {
          state.playerX = Math.max(20, state.playerX - 4.5);
        }
        if (state.keys["d"] || state.keys["arrowright"]) {
          state.playerX = Math.min(380, state.playerX + 4.5);
        }

        // Draw Player Ship
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(state.playerX, 260);
        ctx.lineTo(state.playerX - 14, 280);
        ctx.lineTo(state.playerX + 14, 280);
        ctx.closePath();
        ctx.fill();

        // Update & Draw Lasers
        ctx.fillStyle = "#f43f5e";
        state.lasers.forEach((l) => {
          l.y -= 7;
          ctx.fillRect(l.x - 1.5, l.y, 3, 10);
        });
        state.lasers = state.lasers.filter((l) => l.y > 0);

        // Update & Draw Invaders
        let reverse = false;
        let allDead = true;

        state.invaders.forEach((inv) => {
          if (!inv.alive) return;
          allDead = false;
          inv.x += inv.vx;
          if (inv.x < 15 || inv.x > 385) reverse = true;

          // Hit check
          state.lasers.forEach((l) => {
            if (Math.hypot(l.x - inv.x, l.y - inv.y) < 16) {
              inv.alive = false;
              l.y = -100;
              state.score += 100;
              setScore(state.score);
              setHighScore((prev) => Math.max(prev, state.score));
              spacesSfx.playArcadeExplosion();
            }
          });

          // Draw Alien
          ctx.fillStyle = "#eab308";
          ctx.beginPath();
          ctx.roundRect(inv.x - 12, inv.y - 10, 24, 20, 4);
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.fillRect(inv.x - 7, inv.y - 4, 4, 4);
          ctx.fillRect(inv.x + 3, inv.y - 4, 4, 4);

          // Game Over check if alien reaches player
          if (inv.y > 250) {
            setGameOver(true);
            spacesSfx.playGavelStrike();
          }
        });

        if (reverse) {
          state.invaders.forEach((inv) => {
            inv.vx = -inv.vx * 1.05;
            inv.y += 12;
          });
        }

        if (allDead) {
          // Next wave
          initGame();
        }
      }

      // Game Over Overlay
      if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", 200, 140);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px monospace";
        ctx.fillText(`SCORE: ${score}`, 200, 170);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, gameOver, gameStarted, score]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-mono font-bold text-white">SPACE ARCADE CAB</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-mono text-amber-400">
              <Trophy className="w-3.5 h-3.5" />
              <span>{score}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Screen */}
        <div className="bg-black p-4 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="rounded-2xl border border-neutral-800 shadow-inner"
          />
        </div>

        {/* Controls Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-900/40 text-xs font-mono">
          <div className="text-neutral-500 text-[10px]">
            <span>[A/D] MOVE • [SPACE] LASER</span>
          </div>
          <button
            onClick={initGame}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>
      </div>
    </div>
  );
}
