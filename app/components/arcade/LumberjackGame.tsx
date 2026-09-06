"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { RotateCcw, ArrowLeft, Trophy, Flame, Zap, Sparkles } from "lucide-react";

interface LumberjackGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

type BranchSide = "none" | "left" | "right";

interface TrunkSegment {
  id: number;
  branch: BranchSide;
}

interface FlyingChunk {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  branch: BranchSide;
}

interface SplinterParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

export default function LumberjackGame({
  match,
  currentUid,
  onBack,
}: LumberjackGameProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");
  const [hiScore, setHiScore] = useState(0);

  // Game state
  const [score, setScore] = useState(0);
  const [playerSide, setPlayerSide] = useState<"left" | "right">("left");
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [isChoppingAnim, setIsChoppingAnim] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // Visual trunk & effects
  const [trunk, setTrunk] = useState<TrunkSegment[]>([]);
  const [flyingChunks, setFlyingChunks] = useState<FlyingChunk[]>([]);
  const [splinters, setSplinters] = useState<SplinterParticle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatText[]>([]);

  const trunkIdCounter = useRef(100);
  const chunkIdCounter = useRef(1);
  const splinterIdCounter = useRef(1);
  const floatIdCounter = useRef(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_lumberjack_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Safe branch generator (minimum 1 blank space between opposing branches)
  const createInitialTrunk = useCallback((): TrunkSegment[] => {
    const list: TrunkSegment[] = [];
    let lastBranch: BranchSide = "none";
    for (let i = 0; i < 8; i++) {
      let branch: BranchSide = "none";
      if (i >= 2) {
        if (lastBranch === "none") {
          branch = Math.random() < 0.48 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        } else {
          branch = "none";
        }
      }
      list.push({ id: i, branch });
      lastBranch = branch;
    }
    return list;
  }, []);

  // Start new game
  const startGame = useCallback(
    (mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
      setPlayMode(mode);
      setBotDiff(diff);
      setScore(0);
      setCombo(0);
      setIsFever(false);
      setPlayerSide("left");
      setGameOver(false);
      setTimeLeft(100);
      setFlyingChunks([]);
      setSplinters([]);
      setFloatingTexts([]);
      setTrunk(createInitialTrunk());
      setInMenu(false);
    },
    [createInitialTrunk]
  );

  // Countdown loop
  useEffect(() => {
    if (inMenu || gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const decayRate = isFever ? 0.6 : 0.9 + Math.min(score * 0.025, 2.5);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - decayRate;
        if (next <= 0) {
          handleGameOver();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [inMenu, gameOver, score, isFever]);

  // Particle & Physics Animation Loop
  useEffect(() => {
    if (inMenu) return;
    const anim = requestAnimationFrame(() => {
      setFlyingChunks((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 1.2,
            rot: c.rot + c.vrot,
          }))
          .filter((c) => c.y < 650)
      );

      setSplinters((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.9,
            life: p.life - 0.04,
          }))
          .filter((p) => p.life > 0)
      );

      setFloatingTexts((prev) =>
        prev
          .map((ft) => ({
            ...ft,
            y: ft.y - 2,
          }))
          .filter((ft) => ft.y > 100)
      );
    });
    return () => cancelAnimationFrame(anim);
  }, [flyingChunks, splinters, floatingTexts, inMenu]);

  // Game over
  const handleGameOver = useCallback(() => {
    setGameOver(true);
    arcadeSfx.playPenaltyBuzz();
    if (score > hiScore) {
      setHiScore(score);
      try {
        localStorage.setItem("echo_lumberjack_hi", String(score));
      } catch {}
    }
    if (currentUid && match?.id) {
      updateArcadeGameScore(match.id, currentUid, "lumberjack" as any, score, true);
    }
  }, [score, hiScore, currentUid, match]);

  // Chop action
  const chop = useCallback(
    (side: "left" | "right") => {
      if (gameOver || inMenu) return;

      arcadeSfx.playAxeChop();
      setPlayerSide(side);
      setIsChoppingAnim(true);
      setTimeout(() => setIsChoppingAnim(false), 90);

      // Screen shake
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 80);

      // Check collision with branch on bottom segment
      const bottomSegment = trunk[0];
      if (bottomSegment && bottomSegment.branch === side) {
        handleGameOver();
        return;
      }

      // Successful Chop
      const pointsToAdd = isFever ? 2 : 1;
      const newScore = score + pointsToAdd;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setTimeLeft((t) => Math.min(100, t + 4.5));

      // Trigger Fever Mode if combo > 15
      if (newCombo >= 15 && !isFever) {
        setIsFever(true);
        arcadeSfx.playVictory();
        setFloatingTexts((prev) => [
          ...prev,
          { id: floatIdCounter.current++, text: "🔥 FEVER MODE 2X! 🔥", x: 140, y: 260, color: "#f59e0b" },
        ]);
        if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
        feverTimerRef.current = setTimeout(() => {
          setIsFever(false);
        }, 5000);
      } else if (newCombo % 10 === 0) {
        setFloatingTexts((prev) => [
          ...prev,
          { id: floatIdCounter.current++, text: `${newCombo} COMBO!`, x: 150, y: 280, color: "#10b981" },
        ]);
      }

      // Flying wood chunk
      const chunkVx = side === "left" ? 10 + Math.random() * 5 : -(10 + Math.random() * 5);
      setFlyingChunks((prev) => [
        ...prev,
        {
          id: chunkIdCounter.current++,
          x: 160,
          y: 280,
          vx: chunkVx,
          vy: -7 - Math.random() * 4,
          rot: 0,
          vrot: (Math.random() - 0.5) * 25,
          branch: bottomSegment ? bottomSegment.branch : "none",
        },
      ]);

      // Splinters explosion
      const newSplinters: SplinterParticle[] = [];
      for (let i = 0; i < (isFever ? 12 : 7); i++) {
        newSplinters.push({
          id: splinterIdCounter.current++,
          x: side === "left" ? 120 : 200,
          y: 310,
          vx: (side === "left" ? 1 : -1) * (Math.random() * 9 + 3),
          vy: -Math.random() * 8 - 3,
          size: Math.random() * 6 + 3,
          color: isFever ? "#fef08a" : Math.random() > 0.5 ? "#b45309" : "#d97706",
          life: 1,
        });
      }
      setSplinters((prev) => [...prev.slice(-30), ...newSplinters]);

      // Check next descending segment
      const nextSegment = trunk[1];
      if (nextSegment && nextSegment.branch === side) {
        handleGameOver();
        return;
      }

      // Shift trunk down and append new segment
      setTrunk((prev) => {
        const remaining = prev.slice(1);
        const last = remaining[remaining.length - 1];
        let branch: BranchSide = "none";
        if (last && last.branch === "none") {
          branch = Math.random() < 0.48 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        }
        return [...remaining, { id: trunkIdCounter.current++, branch }];
      });
    },
    [gameOver, inMenu, trunk, score, combo, isFever, handleGameOver]
  );

  // Bot AI loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver) {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
      return;
    }

    const cadence = botDiff === "hard" ? 175 : botDiff === "medium" ? 250 : 340;
    botTimerRef.current = setInterval(() => {
      const nextSegment = trunk[1];
      let targetSide: "left" | "right" = playerSide;

      if (nextSegment && nextSegment.branch !== "none") {
        targetSide = nextSegment.branch === "left" ? "right" : "left";
      }

      // 3% intentional human error
      if (Math.random() < 0.03) {
        targetSide = targetSide === "left" ? "right" : "left";
      }

      chop(targetSide);
    }, cadence);

    return () => {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, [inMenu, playMode, botDiff, gameOver, trunk, playerSide, chop]);

  // Hero Vector Graphic
  const lumberjackHero = (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <polygon points="80,15 95,45 65,45" fill="#15803d" />
          <polygon points="80,35 105,75 55,75" fill="#166534" />
          <polygon points="80,65 115,115 45,115" fill="#14532d" />
          <rect x="73" y="115" width="14" height="25" fill="#78350f" rx="3" />
          <rect x="110" y="40" width="30" height="95" fill="#b45309" rx="4" />
          <rect x="115" y="40" width="8" height="95" fill="#d97706" />
          <path d="M140 70 L158 65 L158 75 Z" fill="#92400e" />
          <rect x="35" y="105" width="8" height="25" fill="#1e3a8a" rx="3" />
          <rect x="47" y="105" width="8" height="25" fill="#1e3a8a" rx="3" />
          <rect x="30" y="65" width="30" height="42" fill="#dc2626" rx="6" />
          <line x1="45" y1="65" x2="45" y2="107" stroke="#7f1d1d" strokeWidth="2" />
          <circle cx="45" cy="50" r="14" fill="#fed7aa" />
          <path d="M31 46 Q45 28 59 46 Z" fill="#ea580c" />
          <circle cx="45" cy="30" r="4" fill="#c2410c" />
          <path d="M36 52 Q45 64 54 52 Z" fill="#78350f" />
          <line x1="45" y1="75" x2="90" y2="55" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M85 45 L105 50 L95 65 L80 60 Z" fill="#94a3b8" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tap Left or Right",
      desc: "Tap the left side of the screen to chop from the left; tap right to chop from the right.",
      icon: "🪓",
    },
    {
      title: "Dodge Falling Branches",
      desc: "Every cut shifts the tree down. Avoid standing under descending timber branches!",
      icon: "🌲",
    },
    {
      title: "Activate Fever Mode",
      desc: "Maintain a rapid cutting cadence of 15+ combo to unlock the Golden Fiery Axe with 2x points!",
      icon: "🔥",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="LUMBERJACK"
          subtitle="Speed Reflex Timber Duel"
          categoryTag="SPEED REFLEX"
          accentColor="#4CAF50"
          objective="Tap left or right to chop timber and avoid branches! Unleash 2x Fever Mode on high combo streaks!"
          heroGraphic={lumberjackHero}
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
    <div className={`min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans ${screenShake ? "translate-y-1" : ""}`}>
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score & Fever Multiplier */}
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-black tracking-tight drop-shadow-md ${isFever ? "text-amber-300 animate-pulse" : "text-emerald-400"}`}>
            {score}
          </div>
          {combo > 5 && (
            <div className={`flex items-center gap-1 text-xs font-black uppercase tracking-widest ${isFever ? "text-amber-400" : "text-emerald-400"}`}>
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo} COMBO {isFever ? "(2X FEVER!)" : ""}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>{hiScore}</span>
        </div>
      </div>

      {/* Accelerating Timer Bar */}
      <div className="w-full max-w-xs h-3 bg-neutral-900 rounded-full overflow-hidden border border-white/15 my-2">
        <div
          className={`h-full transition-all duration-100 ${
            isFever ? "bg-amber-400 animate-pulse" : timeLeft > 50 ? "bg-emerald-500" : timeLeft > 25 ? "bg-amber-500" : "bg-red-500 animate-pulse"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, timeLeft))}%` }}
        />
      </div>

      {/* Main Canvas Arena */}
      <div className="relative w-full max-w-sm h-[460px] bg-gradient-to-b from-sky-900/40 via-emerald-950/30 to-neutral-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-end">
        {/* Floating Combo Banners */}
        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className="absolute font-black text-sm uppercase tracking-wider pointer-events-none drop-shadow-lg z-30"
            style={{ left: `${ft.x}px`, top: `${ft.y}px`, color: ft.color }}
          >
            {ft.text}
          </div>
        ))}

        {/* Flying Chunks */}
        {flyingChunks.map((chunk) => (
          <div
            key={chunk.id}
            className="absolute w-20 h-14 bg-gradient-to-r from-amber-800 to-amber-700 border border-amber-950 rounded-md shadow-2xl pointer-events-none"
            style={{
              left: `${chunk.x}px`,
              top: `${chunk.y}px`,
              transform: `rotate(${chunk.rot}deg)`,
            }}
          >
            {chunk.branch !== "none" && (
              <div
                className={`absolute top-2 w-12 h-6 bg-emerald-800 rounded-sm ${
                  chunk.branch === "left" ? "-left-10" : "-right-10"
                }`}
              />
            )}
          </div>
        ))}

        {/* Splinters */}
        {splinters.map((sp) => (
          <div
            key={sp.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${sp.x}px`,
              top: `${sp.y}px`,
              width: `${sp.size}px`,
              height: `${sp.size}px`,
              backgroundColor: sp.color,
              opacity: sp.life,
            }}
          />
        ))}

        {/* Central Tree Trunk Segments with 3D Bark Rings */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 w-22 flex flex-col-reverse items-center z-10">
          {trunk.slice(0, 6).map((seg, idx) => (
            <div
              key={seg.id}
              className="relative w-22 h-14 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 border-y border-amber-950/70 shadow-md shrink-0 flex items-center justify-center rounded-xs"
            >
              {/* Bark Grain Ribs */}
              <div className="w-1.5 h-full bg-amber-950/50 absolute left-3" />
              <div className="w-1 h-full bg-amber-600/40 absolute right-4" />
              <div className="w-1 h-full bg-amber-800/60 absolute left-8" />

              {/* Branch Left */}
              {seg.branch === "left" && (
                <div className="absolute -left-20 top-2 w-20 h-8 bg-gradient-to-l from-amber-800 to-emerald-800 rounded-l-2xl border border-amber-950 flex items-center px-1 shadow-md">
                  <span className="text-xs">🍃</span>
                </div>
              )}

              {/* Branch Right */}
              {seg.branch === "right" && (
                <div className="absolute -right-20 top-2 w-20 h-8 bg-gradient-to-r from-amber-800 to-emerald-800 rounded-r-2xl border border-amber-950 flex items-center justify-end px-1 shadow-md">
                  <span className="text-xs">🍃</span>
                </div>
              )}
            </div>
          ))}

          {/* Root Stump */}
          <div className="w-32 h-9 bg-amber-950 rounded-t-xl -mb-2 border-t-2 border-amber-700/60" />
        </div>

        {/* Animated Lumberjack Character Rig */}
        <div
          className={`absolute bottom-12 z-20 transition-all duration-75 ${
            playerSide === "left" ? "left-6" : "right-6 scale-x-[-1]"
          }`}
        >
          <div className="relative w-20 h-28 flex flex-col items-center">
            {/* Beanie Hat */}
            <div className="w-9 h-5 bg-orange-600 rounded-t-full border-t border-orange-400" />
            {/* Head & Beard */}
            <div className="w-8 h-7 bg-amber-200 rounded-b-md flex items-center justify-center relative">
              <span className="text-xs">🧔</span>
            </div>
            {/* Flannel Shirt with Suspenders */}
            <div className="w-12 h-11 bg-red-600 border border-red-900 rounded-md relative flex justify-between px-1.5">
              <div className="w-1.5 h-full bg-neutral-900" />
              <div className="w-1.5 h-full bg-neutral-900" />
            </div>
            {/* Legs with Boots */}
            <div className="flex gap-1.5 -mt-1">
              <div className="w-4 h-7 bg-blue-900 rounded-b-md border-b-2 border-neutral-900" />
              <div className="w-4 h-7 bg-blue-900 rounded-b-md border-b-2 border-neutral-900" />
            </div>
            {/* Axe with swing motion */}
            <div
              className={`absolute -top-1 -right-4 text-2xl transition-transform duration-75 ${
                isChoppingAnim ? "rotate-45 translate-x-2" : "-rotate-12"
              } ${isFever ? "drop-shadow-[0_0_8px_rgba(245,158,11,1)]" : ""}`}
            >
              {isFever ? "✨🪓" : "🪓"}
            </div>
          </div>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">SQUASHED!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Watch out for falling branches!</p>

            <div className="bg-white/10 rounded-2xl p-4 my-4 w-full max-w-[220px]">
              <div className="text-xs uppercase text-neutral-400 font-bold">Your Score</div>
              <div className="text-4xl font-black text-emerald-400">{score}</div>
              {score >= hiScore && score > 0 && (
                <div className="text-xs font-black text-amber-400 mt-1 uppercase tracking-wider">
                  🏆 NEW BEST!
                </div>
              )}
            </div>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>CHOP AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Dual Touch Chop Controls */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onPointerDown={() => chop("left")}
          className="h-20 bg-[#1E88E5] hover:bg-[#1976D2] border-b-4 border-[#1565C0] active:border-b-0 active:translate-y-1 text-white font-black text-xl rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all cursor-pointer select-none"
        >
          <span className="text-2xl">🪓</span>
          <span className="text-xs uppercase tracking-wider text-blue-100 mt-1">CHOP LEFT</span>
        </button>

        <button
          type="button"
          onPointerDown={() => chop("right")}
          className="h-20 bg-[#0288D1] hover:bg-[#0277BD] border-b-4 border-[#01579B] active:border-b-0 active:translate-y-1 text-white font-black text-xl rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all cursor-pointer select-none"
        >
          <span className="text-2xl">🪓</span>
          <span className="text-xs uppercase tracking-wider text-cyan-100 mt-1">CHOP RIGHT</span>
        </button>
      </div>
    </div>
  );
}
