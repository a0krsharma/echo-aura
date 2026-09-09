"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { RotateCcw, ArrowLeft, Trophy, Flame, Zap, Sparkles, User, Bot, AlertTriangle } from "lucide-react";

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

interface FlyingLog {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  branch: BranchSide;
}

interface SawdustParticle {
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

  // Duel match scores (First to 3 legs)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Live chop counts (Race to 50 logs per leg)
  const TARGET_CHOPS = 50;
  const [p1Chops, setP1Chops] = useState(0);
  const [p2Chops, setP2Chops] = useState(0);

  // Player 1 state
  const [p1Side, setP1Side] = useState<"left" | "right">("left");
  const [p1Chopping, setP1Chopping] = useState(false);
  const [p1Squashed, setP1Squashed] = useState(false);
  const [p1TimeLeft, setP1TimeLeft] = useState(100); // 0 to 100
  const [p1Combo, setP1Combo] = useState(0);
  const [p1IsFever, setP1IsFever] = useState(false);

  // Player 2 / Bot state (in friend 2-player split mode)
  const [p2Side, setP2Side] = useState<"left" | "right">("right");
  const [p2Chopping, setP2Chopping] = useState(false);
  const [p2Squashed, setP2Squashed] = useState(false);
  const [p2TimeLeft, setP2TimeLeft] = useState(100);

  // Tree trunks
  const [p1Trunk, setP1Trunk] = useState<TrunkSegment[]>([]);
  const [p2Trunk, setP2Trunk] = useState<TrunkSegment[]>([]);

  // Physics particles
  const [flyingLogs, setFlyingLogs] = useState<FlyingLog[]>([]);
  const [sawdust, setSawdust] = useState<SawdustParticle[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const idCounter = useRef(100);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 3)), 35);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Generate an authentic safe tree trunk
  // In classic Timberman: Segment 0 is at ground (no branch).
  // Segments 1+ have branches, ensuring no consecutive opposite branches without spacing.
  const generateInitialTree = useCallback((): TrunkSegment[] => {
    const list: TrunkSegment[] = [];
    list.push({ id: idCounter.current++, branch: "none" }); // ground segment 0
    let lastBranch: BranchSide = "none";

    for (let i = 1; i < 9; i++) {
      let branch: BranchSide = "none";
      if (lastBranch === "none") {
        branch = Math.random() < 0.48 ? (Math.random() < 0.5 ? "left" : "right") : "none";
      } else {
        branch = "none"; // Give breathing room between branches
      }
      list.push({ id: idCounter.current++, branch });
      lastBranch = branch;
    }
    return list;
  }, []);

  // Start new game match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Wins(0);
    setP2Wins(0);
    setMatchWinner(null);
    setInMenu(false);
    resetRound();
  }, []);

  // Reset round
  const resetRound = useCallback(() => {
    setRoundOver(false);
    setRoundWinner(null);
    setBannerNotice(null);
    setP1Chops(0);
    setP2Chops(0);
    setP1Side("left");
    setP2Side("right");
    setP1Chopping(false);
    setP2Chopping(false);
    setP1Squashed(false);
    setP2Squashed(false);
    setP1TimeLeft(100);
    setP2TimeLeft(100);
    setP1Combo(0);
    setP1IsFever(false);
    setFlyingLogs([]);
    setSawdust([]);
    setP1Trunk(generateInitialTree());
    setP2Trunk(generateInitialTree());
  }, [generateInitialTree]);

  // Handle round completion
  const handleRoundEnd = useCallback(
    (winner: "p1" | "p2", reason: string) => {
      if (roundOver) return;
      setRoundOver(true);
      setRoundWinner(winner);
      setBannerNotice(reason);

      if (winner === "p1") {
        arcadeSfx.playVictory();
        setP1Wins((w) => {
          const next = w + 1;
          if (next >= 3) {
            setMatchWinner("p1");
            if (currentUid && match?.id) {
              updateArcadeGameScore(match.id, currentUid, "lumberjack" as any, 100, true);
            }
          }
          return next;
        });
      } else {
        arcadeSfx.playPenaltyBuzz();
        setP2Wins((w) => {
          const next = w + 1;
          if (next >= 3) setMatchWinner("p2");
          return next;
        });
      }
    },
    [roundOver, currentUid, match]
  );

  // Time decay loop
  useEffect(() => {
    if (inMenu || roundOver || matchWinner) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const drainSpeed = p1IsFever ? 0.6 : 0.85 + Math.min(p1Chops * 0.02, 1.8);

    timerIntervalRef.current = setInterval(() => {
      setP1TimeLeft((prev) => {
        const next = prev - drainSpeed;
        if (next <= 0) {
          handleRoundEnd("p2", "TIME OUT! SQUASHED BY EXHAUSTION!");
          return 0;
        }
        return next;
      });

      if (playMode === "friend") {
        setP2TimeLeft((prev) => {
          const next = prev - drainSpeed;
          if (next <= 0) {
            handleRoundEnd("p1", "PLAYER 2 RAN OUT OF TIME!");
            return 0;
          }
          return next;
        });
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [inMenu, roundOver, matchWinner, p1Chops, p1IsFever, playMode, handleRoundEnd]);

  // Chop action for Player 1 or Player 2
  const chop = useCallback(
    (who: "p1" | "p2", targetSide: "left" | "right") => {
      if (roundOver || matchWinner) return;

      const isP1 = who === "p1";
      const currentTrunk = isP1 ? p1Trunk : p2Trunk;
      const setTrunk = isP1 ? setP1Trunk : setP2Trunk;
      const setSide = isP1 ? setP1Side : setP2Side;
      const setChopping = isP1 ? setP1Chopping : setP2Chopping;
      const setChops = isP1 ? setP1Chops : setP2Chops;
      const currentChops = isP1 ? p1Chops : p2Chops;

      // 1. Move lumberjack to the chopping side
      setSide(targetSide);
      setChopping(true);
      setTimeout(() => setChopping(false), 70);
      arcadeSfx.playAxeChop();

      if (isP1) {
        setScreenShake(5);
        setP1TimeLeft((t) => Math.min(100, t + 11)); // Add time on each chop
      } else {
        setP2TimeLeft((t) => Math.min(100, t + 11));
      }

      // 2. Authentic Timberman collision logic:
      // Segment 0 is at ground level.
      // Segment 1 is right above the lumberjack's head!
      // When chopped, segment 0 flies away and segment 1 drops down to ground level!
      // If segment 1 has a branch on `targetSide`, IT DROPS ONTO YOUR HEAD!
      const segmentAboveHead = currentTrunk[1];
      if (segmentAboveHead && segmentAboveHead.branch === targetSide) {
        // SQUASHED!
        arcadeSfx.playPenaltyBuzz();
        if (isP1) setP1Squashed(true);
        else setP2Squashed(true);

        const victor = isP1 ? "p2" : "p1";
        handleRoundEnd(victor, `${isP1 ? "YOU" : "OPPONENT"} GOT SQUASHED BY A BRANCH!`);
        return;
      }

      // 3. Successful chop
      const nextChops = currentChops + 1;
      setChops(nextChops);

      if (isP1) {
        const nextCombo = p1Combo + 1;
        setP1Combo(nextCombo);
        if (nextCombo >= 15 && !p1IsFever) {
          setP1IsFever(true);
          arcadeSfx.playVictory();
          setTimeout(() => setP1IsFever(false), 4500);
        }
      }

      // 4. Flying Log Physics
      const choppedSegment = currentTrunk[0];
      setFlyingLogs((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          x: targetSide === "left" ? -20 : 20,
          y: 0,
          vx: targetSide === "left" ? 14 + Math.random() * 5 : -14 - Math.random() * 5,
          vy: -8 - Math.random() * 3,
          rot: 0,
          vrot: targetSide === "left" ? 0.35 : -0.35,
          branch: choppedSegment ? choppedSegment.branch : "none",
        },
      ]);

      // 5. Sawdust Splinters Spray
      const newSawdust: SawdustParticle[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = targetSide === "left" ? -0.2 - Math.random() * 0.8 : Math.PI + 0.2 + Math.random() * 0.8;
        const spd = 4 + Math.random() * 6;
        newSawdust.push({
          id: idCounter.current++,
          x: targetSide === "left" ? -15 : 15,
          y: 10,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 3 + Math.random() * 3,
          color: i % 2 === 0 ? "#facc15" : "#b45309",
          life: 1,
        });
      }
      setSawdust((prev) => [...prev, ...newSawdust]);

      // 6. Tree slides down by 1 segment, new segment generated at top
      setTrunk((prev) => {
        const remaining = prev.slice(1);
        const lastBranch = remaining[remaining.length - 1]?.branch || "none";
        let newBranch: BranchSide = "none";
        if (lastBranch === "none") {
          newBranch = Math.random() < 0.48 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        }
        return [...remaining, { id: idCounter.current++, branch: newBranch }];
      });

      // 7. Check if target 50 reached
      if (nextChops >= TARGET_CHOPS) {
        handleRoundEnd(who, `${isP1 ? "YOU" : "OPPONENT"} CHOPPED 50 LOGS FIRST!`);
      }
    },
    [roundOver, matchWinner, p1Trunk, p2Trunk, p1Chops, p2Chops, p1Combo, p1IsFever, handleRoundEnd]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P1: ArrowLeft / A for Left, ArrowRight / D for Right
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") chop("p1", "left");
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") chop("p1", "right");

      // P2 in friend mode: J for Left, L for Right
      if (playMode === "friend") {
        if (e.key === "j" || e.key === "J") chop("p2", "left");
        if (e.key === "l" || e.key === "L") chop("p2", "right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chop, playMode]);

  // Solo Bot AI simulation loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || roundOver || matchWinner) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const scheduleBotChop = () => {
      // Cadence:
      // Hard: ~135ms (~7.4 chops/sec)
      // Medium: ~220ms (~4.5 chops/sec)
      // Easy: ~380ms (~2.6 chops/sec)
      const delay =
        botDiff === "hard"
          ? 120 + Math.random() * 30
          : botDiff === "medium"
          ? 190 + Math.random() * 60
          : 340 + Math.random() * 90;

      botTimerRef.current = setTimeout(() => {
        if (roundOver || matchWinner || p2Trunk.length < 2) return;

        // Bot inspects segment 1 (above head)
        const segmentAbove = p2Trunk[1];
        let safeSide: "left" | "right" = p2Side;

        if (segmentAbove.branch === "left") {
          safeSide = "right"; // Must chop from right
        } else if (segmentAbove.branch === "right") {
          safeSide = "left"; // Must chop from left
        }

        // Mistake rate by difficulty:
        const mistakeChance = botDiff === "hard" ? 0.015 : botDiff === "medium" ? 0.045 : 0.12;
        if (Math.random() < mistakeChance && segmentAbove.branch !== "none") {
          // Bot errs and chops into branch!
          chop("p2", segmentAbove.branch);
        } else {
          chop("p2", safeSide);
        }

        scheduleBotChop();
      }, delay);
    };

    scheduleBotChop();

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [inMenu, playMode, roundOver, matchWinner, botDiff, p2Trunk, p2Side, chop]);

  // Particle physics loop
  useEffect(() => {
    if (inMenu) return;
    const interval = setInterval(() => {
      setFlyingLogs((prev) =>
        prev
          .map((l) => ({
            ...l,
            x: l.x + l.vx,
            y: l.y + l.vy,
            vy: l.vy + 1.1,
            rot: l.rot + l.vrot,
          }))
          .filter((l) => l.y < 420)
      );

      setSawdust((prev) =>
        prev
          .map((s) => ({
            ...s,
            x: s.x + s.vx,
            y: s.y + s.vy,
            vy: s.vy + 0.6,
            life: s.life - 0.07,
          }))
          .filter((s) => s.life > 0)
      );
    }, 28);

    return () => clearInterval(interval);
  }, [inMenu]);

  const lumberHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-950/40 rounded-2xl flex items-center justify-center border border-emerald-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Majestic Redwood Trunk */}
          <rect x="62" y="15" width="36" height="130" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
          <line x1="72" y1="15" x2="72" y2="145" stroke="#92400e" strokeWidth="2" />
          <line x1="88" y1="15" x2="88" y2="145" stroke="#5c2406" strokeWidth="2" />
          {/* Branches with lush needle clusters */}
          <g transform="translate(30, 45)">
            <path d="M 32,10 L 0,10 Q -4,5 0,0 L 32,0 Z" fill="#5c2406" />
            <ellipse cx="6" cy="5" rx="14" ry="8" fill="#15803d" />
          </g>
          <g transform="translate(98, 95)">
            <path d="M 0,10 L 32,10 Q 36,5 32,0 L 0,0 Z" fill="#5c2406" />
            <ellipse cx="26" cy="5" rx="14" ry="8" fill="#15803d" />
          </g>
          {/* Lumberjack Axe */}
          <g transform="translate(45, 125) rotate(-35)">
            <polygon points="0,-16 14,-10 10,2 0,-3" fill="#94a3b8" stroke="#f8fafc" strokeWidth="1" />
            <rect x="-2" y="-3" width="4" height="26" fill="#ca8a04" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tap Left or Right to Chop",
      desc: "Tap anywhere on the left half to chop left; tap right half to chop right! Super fast.",
      icon: "🪓",
    },
    {
      title: "Watch the Segment Above Your Head!",
      desc: "If the segment above you has a branch, switch to the other side before chopping!",
      icon: "⚠️",
    },
    {
      title: "Race to 50 Chops",
      desc: "Keep the timer full and out-chop your rival. First to 3 round victories wins!",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="LUMBERJACK"
          subtitle="Pro Timber Chop Duel"
          categoryTag="SPEED REFLEX"
          accentColor="#E65100"
          objective="Chop trees with lightning speed! Dodge falling branches and beat the bot to 50 chops!"
          heroGraphic={lumberHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  // Render an Authentic Majestic Tree Segment
  const renderTrunkSegment = (seg: TrunkSegment) => {
    return (
      <div
        key={seg.id}
        className="relative w-28 h-16 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 border-y border-amber-950/80 shadow-md shrink-0 flex items-center justify-center"
      >
        {/* Deep Redwood Bark Texture Lines */}
        <div className="w-1.5 h-full bg-amber-950/70 absolute left-4" />
        <div className="w-2 h-full bg-amber-900/50 absolute left-9" />
        <div className="w-1.5 h-full bg-amber-700/40 absolute right-8" />
        <div className="w-2 h-full bg-amber-950/80 absolute right-4" />

        {/* Real Sturdy Branch on Left */}
        {seg.branch === "left" && (
          <div className="absolute -left-24 top-2 flex items-center pointer-events-none z-20">
            {/* Foliage pine cluster */}
            <div className="w-12 h-10 -mr-3 bg-gradient-to-l from-emerald-900 to-emerald-700 rounded-full border border-emerald-950 shadow-md flex items-center justify-center">
              <span className="text-xs">🌲</span>
            </div>
            {/* Wooden branch limb */}
            <div className="w-16 h-8 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 rounded-l-2xl border-y border-l border-amber-950 shadow-lg" />
          </div>
        )}

        {/* Real Sturdy Branch on Right */}
        {seg.branch === "right" && (
          <div className="absolute -right-24 top-2 flex items-center pointer-events-none z-20">
            {/* Wooden branch limb */}
            <div className="w-16 h-8 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 rounded-r-2xl border-y border-r border-amber-950 shadow-lg" />
            {/* Foliage pine cluster */}
            <div className="w-12 h-10 -ml-3 bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-full border border-emerald-950 shadow-md flex items-center justify-center">
              <span className="text-xs">🌲</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Handsome Animated Lumberjack Character
  const renderLumberjack = (
    side: "left" | "right",
    isChopping: boolean,
    isSquashed: boolean,
    theme: "blue" | "red"
  ) => {
    const isBlue = theme === "blue";
    return (
      <div
        className={`absolute bottom-4 z-30 transition-all duration-75 pointer-events-none ${
          isSquashed
            ? "scale-y-40 opacity-80"
            : side === "left"
            ? "left-6"
            : "right-6 scale-x-[-1]"
        }`}
      >
        <div className="relative w-20 h-28 flex flex-col items-center">
          {/* Beanie Knit Cap */}
          <div
            className={`w-9 h-5 ${
              isBlue ? "bg-orange-600" : "bg-red-600"
            } rounded-t-full border-t border-white/40 shadow-sm`}
          />
          {/* Head & Rugged Beard */}
          <div className="w-8 h-7 bg-amber-200 rounded-b-md flex items-center justify-center relative shadow-xs">
            <span className="text-sm">{isSquashed ? "😵" : "🧔"}</span>
          </div>
          {/* Buffalo Plaid Flannel Shirt */}
          <div
            className={`w-12 h-11 ${
              isBlue ? "bg-blue-700" : "bg-red-700"
            } border border-black/40 rounded-md relative flex justify-between px-1.5 shadow-md`}
          >
            <div className="w-1.5 h-full bg-neutral-950 opacity-60" />
            <div className="w-1.5 h-full bg-neutral-950 opacity-60" />
          </div>
          {/* Denim Jeans & Boots */}
          <div className="flex gap-1.5 -mt-1">
            <div className="w-4 h-7 bg-slate-900 rounded-b-md border-b-2 border-amber-900" />
            <div className="w-4 h-7 bg-slate-900 rounded-b-md border-b-2 border-amber-900" />
          </div>
          {/* Steel Double-Bit Axe */}
          <div
            className={`absolute -top-1 -right-4 text-2xl transition-transform duration-75 ${
              isChopping ? "rotate-45 translate-x-2" : "-rotate-15"
            }`}
          >
            🪓
          </div>
        </div>
      </div>
    );
  };

  const isSolo = playMode === "bot";

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden">
      {/* Top Header & Scoreboard */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-1 z-30">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Duel Leg Wins */}
        <div className="flex items-center gap-4 bg-neutral-900/90 px-4 py-1.5 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">YOU (P1)</span>
            <span className="text-2xl font-black text-blue-500">{p1Wins}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              {isSolo ? `BOT (${botDiff.toUpperCase()})` : "P2"}
            </span>
            <span className="text-2xl font-black text-red-500">{p2Wins}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 3</span>
        </div>
      </div>

      {/* Live Rival Race Gauge (Chops Progress to 50) */}
      <div className="w-full max-w-sm flex flex-col gap-1 px-3 my-1 z-30">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-blue-400 flex items-center gap-1">
            <span>YOU: {p1Chops}/{TARGET_CHOPS}</span>
          </span>
          <span className="text-red-400 flex items-center gap-1">
            <span>{isSolo ? `BOT: ${p2Chops}/${TARGET_CHOPS}` : `P2: ${p2Chops}/${TARGET_CHOPS}`}</span>
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden flex p-0.5 border border-white/15">
          <div
            className="h-full bg-blue-500 rounded-l-full transition-all duration-100"
            style={{ width: `${(p1Chops / TARGET_CHOPS) * 50}%` }}
          />
          <div className="w-0.5 h-full bg-white/40" />
          <div
            className="h-full bg-red-500 rounded-r-full transition-all duration-100 ml-auto"
            style={{ width: `${(p2Chops / TARGET_CHOPS) * 50}%` }}
          />
        </div>

        {/* Adrenaline Ticking Timer Bar for P1 */}
        <div className="w-full flex items-center gap-2 mt-0.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-75 ${
                p1TimeLeft > 40 ? "bg-emerald-500" : p1TimeLeft > 20 ? "bg-amber-500" : "bg-red-500 animate-pulse"
              }`}
              style={{ width: `${p1TimeLeft}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Timber Arena */}
      <div
        className={`relative w-full max-w-sm h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-end justify-center pb-2 ${
          screenShake > 0 ? "translate-y-1" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #14532d 75%, #052e16 100%)",
        }}
      >
        {/* Distant Forest Silhouettes & Mist */}
        <div className="absolute inset-0 opacity-25 pointer-events-none flex items-end">
          <div className="w-full h-44 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600 via-transparent to-transparent" />
        </div>

        {/* Tree Trunk Stack (Segment 0 at bottom, 5 above) */}
        <div className="relative w-28 flex flex-col-reverse items-center z-10">
          {p1Trunk.slice(0, 6).map((seg) => renderTrunkSegment(seg))}

          {/* Majestic Mossy Root Stump */}
          <div className="w-40 h-10 bg-amber-950 rounded-t-2xl -mb-2 border-t-4 border-emerald-900 shadow-xl" />
        </div>

        {/* Lumberjack Character */}
        {renderLumberjack(p1Side, p1Chopping, p1Squashed, "blue")}

        {/* Flying Chopped Logs */}
        {flyingLogs.map((fl) => (
          <div
            key={fl.id}
            className="absolute w-28 h-16 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 rounded-sm border border-amber-950 shadow-lg pointer-events-none z-40"
            style={{
              transform: `translate(${fl.x}px, ${fl.y}px) rotate(${fl.rot}rad)`,
              bottom: "45px",
            }}
          />
        ))}

        {/* Sawdust Splinters Spray */}
        {sawdust.map((sp) => (
          <div
            key={sp.id}
            className="absolute rounded-xs pointer-events-none z-50"
            style={{
              left: `calc(50% + ${sp.x}px)`,
              bottom: `calc(70px + ${sp.y}px)`,
              width: `${sp.size}px`,
              height: `${sp.size * 1.5}px`,
              backgroundColor: sp.color,
              opacity: sp.life,
              transform: `translate(${sp.vx * 3}px, ${sp.vy * 3}px)`,
            }}
          />
        ))}

        {/* Universal Full-Screen Touch Zones:
            Tap LEFT HALF to chop left!
            Tap RIGHT HALF to chop right! */}
        <div className="absolute inset-0 grid grid-cols-2 z-20 cursor-pointer">
          <div
            onPointerDown={() => chop("p1", "left")}
            className="h-full active:bg-blue-500/10 transition-colors"
          />
          <div
            onPointerDown={() => chop("p1", "right")}
            className="h-full active:bg-blue-500/10 transition-colors"
          />
        </div>

        {/* Round Over Modal */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-50 text-center">
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
              {roundWinner === "p1" ? "🎉 YOU WON THE ROUND!" : "💥 OPPONENT WON THE ROUND!"}
            </h3>
            <p className="text-xs font-bold text-neutral-300 mt-1">{bannerNotice}</p>
            <p className="text-sm font-black text-emerald-400 mt-2">
              Score: {p1Chops} vs {p2Chops} chops
            </p>
            <button
              type="button"
              onPointerDown={resetRound}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              NEXT ROUND
            </button>
          </div>
        )}

        {/* Match Finished Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-50 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "VICTORY CHAMPION!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Legs: {p1Wins} - {p2Wins}</p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch Control Guide Pedals */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-2 mt-1 z-30">
        <button
          type="button"
          onPointerDown={() => chop("p1", "left")}
          className="h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer select-none touch-none"
        >
          <span>◄ CHOP LEFT</span>
        </button>

        <button
          type="button"
          onPointerDown={() => chop("p1", "right")}
          className="h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer select-none touch-none"
        >
          <span>CHOP RIGHT ►</span>
        </button>
      </div>

      {/* Footer prompt */}
      <div className="w-full max-w-sm text-center py-1 z-30">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          TAP ANYWHERE ON SCREEN TO CHOP (LEFT OR RIGHT)
        </span>
      </div>
    </div>
  );
}
