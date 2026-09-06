"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles } from "lucide-react";

interface KnifeThrowerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface EmbeddedKnife {
  angle: number; // in radians relative to log rotation
}

interface Apple {
  angle: number;
  sliced: boolean;
}

interface FlyingKnife {
  y: number;
  speed: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function KnifeThrowerGame({
  match,
  currentUid,
  onBack,
}: KnifeThrowerProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Game state
  const [knivesLeft, setKnivesLeft] = useState(20);
  const [embeddedKnives, setEmbeddedKnives] = useState<EmbeddedKnife[]>([]);
  const [apples, setApples] = useState<Apple[]>([]);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [logJolt, setLogJolt] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation physics
  const logRotationRef = useRef(0);
  const logSpeedRef = useRef(0.03);
  const flyingKnifeRef = useRef<FlyingKnife | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_knife_thrower_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Start game
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setKnivesLeft(20);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    setLogJolt(false);
    flyingKnifeRef.current = null;
    sparksRef.current = [];
    logRotationRef.current = 0;
    logSpeedRef.current = 0.03;

    // Generate initial embedded obstacles & apples
    const initialKnives: EmbeddedKnife[] = [
      { angle: 0 },
      { angle: Math.PI * 0.7 },
    ];
    const initialApples: Apple[] = [
      { angle: Math.PI * 0.35, sliced: false },
      { angle: Math.PI * 1.4, sliced: false },
    ];

    setEmbeddedKnives(initialKnives);
    setApples(initialApples);
    setInMenu(false);
  }, []);

  // Launch knife
  const throwKnife = useCallback(() => {
    if (inMenu || gameOver || victory || flyingKnifeRef.current !== null || knivesLeft <= 0) return;

    arcadeSfx.playWhoosh();
    flyingKnifeRef.current = {
      y: 360,
      speed: 18,
    };
    setKnivesLeft((k) => k - 1);
  }, [inMenu, gameOver, victory, knivesLeft]);

  // Main Canvas Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const logCenter = { x: 180, y: 140 };
    const logRadius = 60;
    let time = 0;

    const loop = () => {
      time += 0.03;

      // Variable sine-wave acceleration & reversals
      logSpeedRef.current = 0.035 * Math.sin(time * 0.8) + 0.02 * Math.cos(time * 1.5);
      logRotationRef.current += logSpeedRef.current;

      // Update Flying Knife
      if (flyingKnifeRef.current) {
        flyingKnifeRef.current.y -= flyingKnifeRef.current.speed;

        // Check impact with log
        if (flyingKnifeRef.current.y <= logCenter.y + logRadius + 15) {
          // Knife reached the log!
          // Calculate relative angle on the log
          // Bottom of log corresponds to angle PI/2 in standard coords
          let hitAngle = Math.PI / 2 - logRotationRef.current;
          while (hitAngle < 0) hitAngle += Math.PI * 2;
          hitAngle = hitAngle % (Math.PI * 2);

          // Check collision with existing knives (angular clearance ~ 0.28 rad)
          let collided = false;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - hitAngle);
            while (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 0.26) {
              collided = true;
              break;
            }
          }

          if (collided) {
            // Shatter knife! Blade sparks!
            arcadeSfx.playKnifeClash();
            for (let i = 0; i < 15; i++) {
              sparksRef.current.push({
                x: logCenter.x,
                y: logCenter.y + logRadius + 10,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
              });
            }
            flyingKnifeRef.current = null;
            setGameOver(true);
            arcadeSfx.playPenaltyBuzz();
            return;
          } else {
            // Embedded successfully!
            arcadeSfx.playKnifeStick();
            setLogJolt(true);
            setTimeout(() => setLogJolt(false), 80);

            // Check if sliced any apple
            setApples((prevApples) =>
              prevApples.map((apple) => {
                if (apple.sliced) return apple;
                let diff = Math.abs(apple.angle - hitAngle);
                while (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < 0.3) {
                  arcadeSfx.playMatchSuccess();
                  setScore((s) => s + 50); // Bonus apple points!
                  return { ...apple, sliced: true };
                }
                return apple;
              })
            );

            setEmbeddedKnives((prev) => [...prev, { angle: hitAngle }]);
            setScore((s) => {
              const ns = s + 10;
              if (ns > hiScore) {
                setHiScore(ns);
                try {
                  localStorage.setItem("echo_knife_thrower_hi", String(ns));
                } catch {}
              }
              return ns;
            });

            flyingKnifeRef.current = null;

            // Check if won 20 knives
            if (knivesLeft - 1 <= 0) {
              setVictory(true);
              arcadeSfx.playVictory();
              if (currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "knife_thrower" as any, score + 200, true);
              }
            }
          }
        }
      }

      // Update sparks
      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          life: s.life - 0.05,
        }))
        .filter((s) => s.life > 0);

      // ── RENDER ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Wood Log
      ctx.save();
      ctx.translate(logCenter.x, logCenter.y + (logJolt ? -6 : 0));
      ctx.rotate(logRotationRef.current);

      // Wood rings
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.arc(0, 0, logRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#78350f";
      ctx.stroke();

      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.arc(0, 0, logRadius - 12, 0, Math.PI * 2);
      ctx.fill();

      // Tree rings
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, logRadius - 26, 0, Math.PI * 2);
      ctx.stroke();

      // Embedded Knives
      embeddedKnives.forEach((k) => {
        ctx.save();
        ctx.rotate(k.angle);
        // Blade stuck in wood
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-3, logRadius - 10, 6, 25);
        // Handle
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-5, logRadius + 15, 10, 20);
        ctx.restore();
      });

      // Bonus Apples
      apples.forEach((a) => {
        if (!a.sliced) {
          ctx.save();
          ctx.rotate(a.angle);
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, logRadius - 6, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#15803d"; // leaf
          ctx.fillRect(0, logRadius - 20, 3, 6);
          ctx.restore();
        }
      });

      ctx.restore();

      // Draw Sparks
      sparksRef.current.forEach((s) => {
        ctx.fillStyle = `rgba(251, 191, 36, ${s.life})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Flying Knife
      if (flyingKnifeRef.current) {
        const fy = flyingKnifeRef.current.y;
        ctx.save();
        ctx.translate(logCenter.x, fy);
        // Blade
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(4, 0);
        ctx.lineTo(-4, 0);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-3, 0, 6, 18);
        // Handle
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-5, 18, 10, 20);
        ctx.restore();
      }

      // Ready Knife at Bottom
      if (!flyingKnifeRef.current && knivesLeft > 0 && !gameOver && !victory) {
        ctx.save();
        ctx.translate(logCenter.x, 340);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(4, 0);
        ctx.lineTo(-4, 0);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-3, 0, 6, 18);
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-5, 18, 10, 20);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, embeddedKnives, apples, gameOver, victory, knivesLeft, logJolt, hiScore, score, currentUid, match]);

  // Bot AI loop: Rotational raycaster
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || victory) return;

    const interval = setInterval(() => {
      if (flyingKnifeRef.current !== null) return;

      // Predict bottom angle
      let hitAngle = Math.PI / 2 - logRotationRef.current;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      hitAngle = hitAngle % (Math.PI * 2);

      // Safe clearance check
      let safe = true;
      for (const k of embeddedKnives) {
        let diff = Math.abs(k.angle - hitAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.35) {
          safe = false;
          break;
        }
      }

      if (safe && Math.random() < (botDiff === "hard" ? 0.9 : botDiff === "medium" ? 0.65 : 0.4)) {
        throwKnife();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [inMenu, playMode, gameOver, victory, embeddedKnives, botDiff, throwKnife]);

  // Hero Graphic
  const knifeHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-amber-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Wood Log */}
          <circle cx="80" cy="70" r="45" fill="#92400e" stroke="#78350f" strokeWidth="4" />
          <circle cx="80" cy="70" r="32" fill="#b45309" />
          <circle cx="80" cy="70" r="18" stroke="#78350f" strokeWidth="2" fill="none" />

          {/* Embedded Knives */}
          <g transform="translate(80, 70) rotate(-45)">
            <rect x="-3" y="42" width="6" height="15" fill="#94a3b8" />
            <rect x="-5" y="57" width="10" height="14" fill="#ea580c" />
          </g>
          <g transform="translate(80, 70) rotate(55)">
            <rect x="-3" y="42" width="6" height="15" fill="#94a3b8" />
            <rect x="-5" y="57" width="10" height="14" fill="#ea580c" />
          </g>

          {/* Bonus Apple */}
          <circle cx="80" cy="40" r="9" fill="#ef4444" />

          {/* Flying Knife */}
          <g transform="translate(80, 135)">
            <polygon points="0,-15 4,-2 -4,-2" fill="#f8fafc" />
            <rect x="-3" y="-2" width="6" height="12" fill="#94a3b8" />
            <rect x="-4" y="10" width="8" height="12" fill="#ea580c" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tap to Throw Knives",
      desc: "Tap anywhere on screen to launch a knife straight into the rotating wooden log!",
      icon: "🗡️",
    },
    {
      title: "Don't Hit Other Blades",
      desc: "Hitting an existing knife shatters your blade and instantly ends your streak!",
      icon: "💥",
    },
    {
      title: "Slice Apples for Bonus",
      desc: "Hit pinned apples on the log for massive score multipliers. Land 20 knives to win!",
      icon: "🍎",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="KNIFE THROWER"
          subtitle="Precision Arcade"
          categoryTag="DEXTERITY & AIM"
          accentColor="#ea580c"
          objective="Tap to launch knives into the rotating log. Don't hit existing blades! Embed 20 knives to win!"
          heroGraphic={knifeHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
          hiScore={hiScore}
        />
      </div>
    );
  }

  return (
    <div
      onPointerDown={throwKnife}
      className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans cursor-pointer"
    >
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setInMenu(true);
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Knives Left Counter */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black text-amber-400 drop-shadow-md">
            {knivesLeft}
          </div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">KNIVES REMAINING</span>
        </div>

        {/* Score & HI */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>{score}</span>
        </div>
      </div>

      {/* Canvas Log Arena */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">BLADE SHATTERED!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">You struck an existing knife!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}

        {/* Victory Modal */}
        {victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">PERFECT LOG CLEAR!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">All 20 knives cleanly embedded!</p>
            <div className="text-3xl font-black text-yellow-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Tap Banner Prompt */}
      <div className="w-full max-w-sm text-center py-2">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          TAP ANYWHERE TO THROW KNIFE
        </span>
      </div>
    </div>
  );
}
