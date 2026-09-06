"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { RotateCcw, ArrowLeft, Trophy, Flame } from "lucide-react";

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

interface ChipParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
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
  const [timeLeft, setTimeLeft] = useState(100); // 0 to 100%
  const [combo, setCombo] = useState(0);

  // 2-Player state (if in friend mode)
  const [p2Score, setP2Score] = useState(0);
  const [p2Side, setP2Side] = useState<"left" | "right">("left");
  const [p2GameOver, setP2GameOver] = useState(false);

  // Visual trunk
  const [trunk, setTrunk] = useState<TrunkSegment[]>([]);
  const [p2Trunk, setP2Trunk] = useState<TrunkSegment[]>([]);
  const [flyingChunks, setFlyingChunks] = useState<FlyingChunk[]>([]);
  const [chips, setChips] = useState<ChipParticle[]>([]);

  const trunkIdCounter = useRef(100);
  const chunkIdCounter = useRef(1);
  const chipIdCounter = useRef(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_lumberjack_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Safe branch generation generator
  const createInitialTrunk = useCallback((): TrunkSegment[] => {
    const list: TrunkSegment[] = [];
    let lastBranch: BranchSide = "none";
    for (let i = 0; i < 8; i++) {
      let branch: BranchSide = "none";
      if (i >= 2) {
        // Guarantee at least 1 blank between opposite branches
        if (lastBranch === "none") {
          branch = Math.random() < 0.45 ? (Math.random() < 0.5 ? "left" : "right") : "none";
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
      setP2Score(0);
      setCombo(0);
      setPlayerSide("left");
      setP2Side("left");
      setGameOver(false);
      setP2GameOver(false);
      setTimeLeft(100);
      setFlyingChunks([]);
      setChips([]);
      setTrunk(createInitialTrunk());
      setP2Trunk(createInitialTrunk());
      setInMenu(false);
    },
    [createInitialTrunk]
  );

  // Timer countdown loop
  useEffect(() => {
    if (inMenu || gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Shrinks faster as score increases
    const decayRate = 0.8 + Math.min(score * 0.025, 2.5);
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
  }, [inMenu, gameOver, score]);

  // Particle & Chunk Physics Loop
  useEffect(() => {
    if (inMenu) return;
    const anim = requestAnimationFrame(() => {
      setFlyingChunks((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 1.2, // gravity
            rot: c.rot + c.vrot,
          }))
          .filter((c) => c.y < 600)
      );

      setChips((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.8,
            life: p.life - 0.05,
          }))
          .filter((p) => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(anim);
  }, [flyingChunks, chips, inMenu]);

  // Handle Game Over
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

  // Chop action for player 1
  const chop = useCallback(
    (side: "left" | "right") => {
      if (gameOver || inMenu) return;

      arcadeSfx.playAxeChop();
      setPlayerSide(side);

      // Check collision with the branch at bottom segment (trunk[0])
      const bottomSegment = trunk[0];
      if (bottomSegment && bottomSegment.branch === side) {
        // Immediate squash by branch!
        handleGameOver();
        return;
      }

      // Successful chop!
      const newScore = score + 1;
      setScore(newScore);
      setCombo((c) => c + 1);
      setTimeLeft((t) => Math.min(100, t + 4));

      // Spawn flying chunk
      const chunkVx = side === "left" ? 9 + Math.random() * 4 : -(9 + Math.random() * 4);
      setFlyingChunks((prev) => [
        ...prev,
        {
          id: chunkIdCounter.current++,
          x: 160,
          y: 280,
          vx: chunkVx,
          vy: -6 - Math.random() * 4,
          rot: 0,
          vrot: (Math.random() - 0.5) * 20,
          branch: bottomSegment ? bottomSegment.branch : "none",
        },
      ]);

      // Spawn wood chips
      const newChips: ChipParticle[] = [];
      for (let i = 0; i < 6; i++) {
        newChips.push({
          id: chipIdCounter.current++,
          x: side === "left" ? 120 : 200,
          y: 300,
          vx: (side === "left" ? 1 : -1) * (Math.random() * 8 + 2),
          vy: -Math.random() * 8 - 2,
          size: Math.random() * 5 + 3,
          color: Math.random() > 0.5 ? "#b45309" : "#d97706",
          life: 1,
        });
      }
      setChips((prev) => [...prev.slice(-20), ...newChips]);

      // Check if next branch immediately squashes player
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
          branch = Math.random() < 0.45 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        }
        return [...remaining, { id: trunkIdCounter.current++, branch }];
      });
    },
    [gameOver, inMenu, trunk, score, handleGameOver]
  );

  // Bot AI loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver) {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
      return;
    }

    const cadence = botDiff === "hard" ? 180 : botDiff === "medium" ? 260 : 360;
    botTimerRef.current = setInterval(() => {
      // Bot determines safe side
      const nextSegment = trunk[1];
      let targetSide: "left" | "right" = playerSide;

      if (nextSegment && nextSegment.branch !== "none") {
        targetSide = nextSegment.branch === "left" ? "right" : "left";
      }

      // 3% intentional human misread error on high speeds
      if (Math.random() < 0.03) {
        targetSide = targetSide === "left" ? "right" : "left";
      }

      chop(targetSide);
    }, cadence);

    return () => {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, [inMenu, playMode, botDiff, gameOver, trunk, playerSide, chop]);

  // Hero Vector Graphic for Lumberjack
  const lumberjackHero = (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Forest Pine Background */}
          <polygon points="80,15 95,45 65,45" fill="#15803d" />
          <polygon points="80,35 105,75 55,75" fill="#166534" />
          <polygon points="80,65 115,115 45,115" fill="#14532d" />
          <rect x="73" y="115" width="14" height="25" fill="#78350f" rx="3" />

          {/* Wooden Tree Trunk */}
          <rect x="110" y="40" width="30" height="95" fill="#b45309" rx="4" />
          <rect x="115" y="40" width="8" height="95" fill="#d97706" />
          {/* Branch */}
          <path d="M140 70 L158 65 L158 75 Z" fill="#92400e" />

          {/* Lumberjack Character */}
          {/* Legs */}
          <rect x="35" y="105" width="8" height="25" fill="#1e3a8a" rx="3" />
          <rect x="47" y="105" width="8" height="25" fill="#1e3a8a" rx="3" />
          {/* Flannel Shirt */}
          <rect x="30" y="65" width="30" height="42" fill="#dc2626" rx="6" />
          <line x1="45" y1="65" x2="45" y2="107" stroke="#7f1d1d" strokeWidth="2" />
          {/* Head & Beanie */}
          <circle cx="45" cy="50" r="14" fill="#fed7aa" />
          <path d="M31 46 Q45 28 59 46 Z" fill="#ea580c" />
          <circle cx="45" cy="30" r="4" fill="#c2410c" />
          {/* Beard */}
          <path d="M36 52 Q45 64 54 52 Z" fill="#78350f" />
          {/* Axe */}
          <line x1="45" y1="75" x2="90" y2="55" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M85 45 L105 50 L95 65 L80 60 Z" fill="#94a3b8" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tap Left or Right",
      desc: "Tap the left side of the screen to chop from the left, or tap the right side to chop from the right.",
      icon: "🪓",
    },
    {
      title: "Dodge Falling Branches",
      desc: "Every cut shifts the tree down by one segment. Never stand under a descending branch!",
      icon: "🌲",
    },
    {
      title: "Beat the Timer",
      desc: "The countdown bar accelerates as your score climbs. Maintain a rapid cutting cadence.",
      icon: "⏱️",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="LUMBERJACK"
          subtitle="Speed Reflex Duel"
          categoryTag="SPEED REFLEX"
          accentColor="#4CAF50"
          objective="Tap on the left or right side to cut down the tree. But be careful not to get hit by the branches!"
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
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score & Combo */}
        <div className="flex flex-col items-center">
          <div className="text-4xl font-black tracking-tight text-emerald-400 drop-shadow-md">
            {score}
          </div>
          {combo > 5 && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-400 uppercase tracking-widest animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>{combo} COMBO</span>
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
            timeLeft > 50 ? "bg-emerald-500" : timeLeft > 25 ? "bg-amber-500" : "bg-red-500 animate-pulse"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, timeLeft))}%` }}
        />
      </div>

      {/* Main Gameplay Canvas / Arena */}
      <div className="relative w-full max-w-sm h-[460px] bg-gradient-to-b from-sky-900/40 via-emerald-950/30 to-neutral-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-end">
        {/* Sky Clouds / Pine silhouette */}
        <div className="absolute top-4 left-4 w-12 h-4 bg-white/10 rounded-full" />
        <div className="absolute top-10 right-6 w-16 h-5 bg-white/10 rounded-full" />

        {/* Dynamic Flying Chunks */}
        {flyingChunks.map((chunk) => (
          <div
            key={chunk.id}
            className="absolute w-16 h-12 bg-amber-700 border border-amber-900 rounded-md shadow-lg pointer-events-none"
            style={{
              left: `${chunk.x}px`,
              top: `${chunk.y}px`,
              transform: `rotate(${chunk.rot}deg)`,
            }}
          >
            {chunk.branch !== "none" && (
              <div
                className={`absolute top-2 w-10 h-6 bg-emerald-700 rounded-sm ${
                  chunk.branch === "left" ? "-left-8" : "-right-8"
                }`}
              />
            )}
          </div>
        ))}

        {/* Splashing Wood Chips */}
        {chips.map((chip) => (
          <div
            key={chip.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${chip.x}px`,
              top: `${chip.y}px`,
              width: `${chip.size}px`,
              height: `${chip.size}px`,
              backgroundColor: chip.color,
              opacity: chip.life,
            }}
          />
        ))}

        {/* Central Tree Trunk Segments */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 w-20 flex flex-col-reverse items-center z-10">
          {trunk.slice(0, 6).map((seg, idx) => (
            <div
              key={seg.id}
              className="relative w-20 h-14 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 border-y border-amber-950/60 shadow-sm shrink-0 flex items-center justify-center"
            >
              {/* Bark wood grain */}
              <div className="w-1.5 h-full bg-amber-900/40 absolute left-4" />
              <div className="w-1 h-full bg-amber-600/30 absolute right-5" />

              {/* Branch Left */}
              {seg.branch === "left" && (
                <div className="absolute -left-20 top-2 w-20 h-8 bg-gradient-to-l from-amber-800 to-emerald-800 rounded-l-xl border border-amber-950 flex items-center px-1 shadow-md">
                  <span className="text-xs">🍃</span>
                </div>
              )}

              {/* Branch Right */}
              {seg.branch === "right" && (
                <div className="absolute -right-20 top-2 w-20 h-8 bg-gradient-to-r from-amber-800 to-emerald-800 rounded-r-xl border border-amber-950 flex items-center justify-end px-1 shadow-md">
                  <span className="text-xs">🍃</span>
                </div>
              )}
            </div>
          ))}

          {/* Trunk Root Stump */}
          <div className="w-28 h-8 bg-amber-950 rounded-t-lg -mb-2 border-t-2 border-amber-700/60" />
        </div>

        {/* Lumberjack Character */}
        <div
          className={`absolute bottom-12 z-20 transition-all duration-75 ${
            playerSide === "left" ? "left-6" : "right-6 scale-x-[-1]"
          }`}
        >
          <div className="relative w-16 h-24 flex flex-col items-center">
            {/* Beanie */}
            <div className="w-8 h-4 bg-orange-600 rounded-t-full" />
            {/* Face */}
            <div className="w-7 h-6 bg-amber-200 rounded-b-md flex items-center justify-center">
              <span className="text-[10px]">🧔</span>
            </div>
            {/* Flannel Shirt */}
            <div className="w-10 h-10 bg-red-600 border border-red-800 rounded-md" />
            {/* Legs */}
            <div className="flex gap-1 -mt-1">
              <div className="w-3 h-6 bg-blue-900 rounded-b-sm" />
              <div className="w-3 h-6 bg-blue-900 rounded-b-sm" />
            </div>
            {/* Axe Swing Effect */}
            <div className="absolute -top-1 -right-3 text-xl animate-bounce">🪓</div>
          </div>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              SQUASHED!
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Watch out for falling timber branches!
            </p>

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

      {/* Dual Touch Chop Controls (Left & Right halves) */}
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
