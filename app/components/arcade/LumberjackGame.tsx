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
  lane: "p1" | "p2";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
}

interface SplinterParticle {
  id: number;
  lane: "p1" | "p2";
  x: number;
  y: number;
  vx: number;
  vy: number;
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

  // Round scores (First to 3 wins)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Live chop race progress (First to 50 logs)
  const TARGET_CHOPS = 50;
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Side, setP1Side] = useState<"left" | "right">("left");
  const [p2Side, setP2Side] = useState<"left" | "right">("right");
  const [p1Chopping, setP1Chopping] = useState(false);
  const [p2Chopping, setP2Chopping] = useState(false);
  const [p1Squashed, setP1Squashed] = useState(false);
  const [p2Squashed, setP2Squashed] = useState(false);

  // Combos & Fever
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [screenShake, setScreenShake] = useState(0);

  // Trees for P1 and P2
  const [p1Trunk, setP1Trunk] = useState<TrunkSegment[]>([]);
  const [p2Trunk, setP2Trunk] = useState<TrunkSegment[]>([]);
  const [flyingChunks, setFlyingChunks] = useState<FlyingChunk[]>([]);
  const [splinters, setSplinters] = useState<SplinterParticle[]>([]);

  const idCounter = useRef(100);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate safe tree trunk
  const generateTrunk = useCallback((): TrunkSegment[] => {
    const list: TrunkSegment[] = [];
    let lastBranch: BranchSide = "none";
    for (let i = 0; i < 8; i++) {
      let branch: BranchSide = "none";
      if (i >= 2) {
        if (lastBranch === "none") {
          branch = Math.random() < 0.45 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        } else {
          branch = "none";
        }
      }
      list.push({ id: idCounter.current++, branch });
      lastBranch = branch;
    }
    return list;
  }, []);

  // Screen shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 40);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start match
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
    setP1Score(0);
    setP2Score(0);
    setP1Combo(0);
    setP2Combo(0);
    setP1Squashed(false);
    setP2Squashed(false);
    setP1Side("left");
    setP2Side("right");
    setFlyingChunks([]);
    setSplinters([]);
    setP1Trunk(generateTrunk());
    setP2Trunk(generateTrunk());
  }, [generateTrunk]);

  // Handle round completion
  const handleRoundEnd = useCallback(
    (winner: "p1" | "p2", reason: string) => {
      if (roundOver) return;
      setRoundOver(true);
      setRoundWinner(winner);

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

  // Chop logic for player
  const chop = useCallback(
    (who: "p1" | "p2", side: "left" | "right") => {
      if (roundOver || matchWinner) return;

      const isP1 = who === "p1";
      const currentTrunk = isP1 ? p1Trunk : p2Trunk;
      const setTrunk = isP1 ? setP1Trunk : setP2Trunk;
      const setSide = isP1 ? setP1Side : setP2Side;
      const setChopping = isP1 ? setP1Chopping : setP2Chopping;
      const currentScore = isP1 ? p1Score : p2Score;
      const setScore = isP1 ? setP1Score : setP2Score;
      const setCombo = isP1 ? setP1Combo : setP2Combo;

      arcadeSfx.playAxeChop();
      setSide(side);
      setChopping(true);
      setTimeout(() => setChopping(false), 75);

      if (isP1) setScreenShake(6);

      // Check collision with the bottom trunk segment
      const bottomSegment = currentTrunk[0];
      if (bottomSegment && bottomSegment.branch === side) {
        // Squashed by branch!
        arcadeSfx.playPenaltyBuzz();
        if (isP1) setP1Squashed(true);
        else setP2Squashed(true);

        const victor = isP1 ? "p2" : "p1";
        handleRoundEnd(victor, `${isP1 ? "PLAYER 1" : "PLAYER 2"} SQUASHED BY BRANCH!`);
        return;
      }

      // Successful Chop
      const newScore = currentScore + 1;
      setScore(newScore);
      setCombo((c) => c + 1);

      // Spawn flying chunk
      setFlyingChunks((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          lane: who,
          x: side === "left" ? -40 : 40,
          y: 0,
          vx: side === "left" ? 6 + Math.random() * 4 : -6 - Math.random() * 4,
          vy: -6 - Math.random() * 3,
          rot: 0,
          vrot: side === "left" ? 0.2 : -0.2,
        },
      ]);

      // Sawdust splinters
      const newSplinters: SplinterParticle[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        newSplinters.push({
          id: idCounter.current++,
          lane: who,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: i % 2 === 0 ? "#f59e0b" : "#78350f",
          life: 1,
        });
      }
      setSplinters((prev) => [...prev, ...newSplinters]);

      // Pop bottom segment and push new top segment
      setTrunk((prev) => {
        const remaining = prev.slice(1);
        const lastBranch = remaining[remaining.length - 1]?.branch || "none";
        let newBranch: BranchSide = "none";
        if (lastBranch === "none") {
          newBranch = Math.random() < 0.45 ? (Math.random() < 0.5 ? "left" : "right") : "none";
        }
        return [...remaining, { id: idCounter.current++, branch: newBranch }];
      });

      // Check if reached 50 chops
      if (newScore >= TARGET_CHOPS) {
        handleRoundEnd(who, `${isP1 ? "PLAYER 1" : "PLAYER 2"} REACHED 50 CHOPS!`);
      }
    },
    [roundOver, matchWinner, p1Trunk, p2Trunk, p1Score, p2Score, handleRoundEnd]
  );

  // Keyboard controls for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P1: A (Left) / D (Right) or Left/Right arrows
      if (e.key === "a" || e.key === "A") chop("p1", "left");
      if (e.key === "d" || e.key === "D") chop("p1", "right");

      // P2 (Friend mode): Left/Right arrow keys or J/L
      if (playMode === "friend") {
        if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") chop("p2", "left");
        if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") chop("p2", "right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chop, playMode]);

  // Bot AI auto-chop loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || roundOver || matchWinner) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const scheduleBotChop = () => {
      // Speed tuned by difficulty:
      // Hard: ~130ms (superfast ~7.5 chops/sec)
      // Medium: ~220ms (~4.5 chops/sec)
      // Easy: ~380ms (~2.6 chops/sec)
      const delay =
        botDiff === "hard"
          ? 110 + Math.random() * 40
          : botDiff === "medium"
          ? 180 + Math.random() * 80
          : 320 + Math.random() * 120;

      botTimerRef.current = setTimeout(() => {
        if (roundOver || matchWinner || p2Trunk.length === 0) return;

        const bottom = p2Trunk[0];
        const nextAbove = p2Trunk[1];

        // Safe side calculation:
        // Bot should chop from opposite side of bottom branch
        let safeSide: "left" | "right" = p2Side;

        if (bottom.branch === "left") {
          safeSide = "right";
        } else if (bottom.branch === "right") {
          safeSide = "left";
        } else if (nextAbove && nextAbove.branch !== "none") {
          // Lookahead to prepare for next segment
          safeSide = nextAbove.branch === "left" ? "right" : "left";
        }

        // Mistake rate by difficulty:
        const mistakeRate = botDiff === "hard" ? 0.015 : botDiff === "medium" ? 0.05 : 0.14;
        if (Math.random() < mistakeRate && bottom.branch !== "none") {
          // Bot makes error and chops into branch!
          chop("p2", bottom.branch);
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

  // Particle physics animation loop
  useEffect(() => {
    if (inMenu) return;
    const interval = setInterval(() => {
      setFlyingChunks((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 0.9,
            rot: c.rot + c.vrot,
          }))
          .filter((c) => c.y < 350)
      );

      setSplinters((prev) =>
        prev
          .map((s) => ({
            ...s,
            x: s.x + s.vx,
            y: s.y + s.vy,
            vy: s.vy + 0.5,
            life: s.life - 0.06,
          }))
          .filter((s) => s.life > 0)
      );
    }, 28);

    return () => clearInterval(interval);
  }, [inMenu]);

  const lumberjackHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-950/40 rounded-2xl flex items-center justify-center border border-emerald-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Trunk */}
          <rect x="68" y="20" width="24" height="120" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          {/* Branches */}
          <rect x="42" y="55" width="26" height="10" rx="3" fill="#15803d" />
          <rect x="92" y="95" width="26" height="10" rx="3" fill="#15803d" />
          {/* Blue Axe */}
          <g transform="translate(50, 115) rotate(-30)">
            <polygon points="0,-16 12,-12 8,0 0,-4" fill="#3b82f6" />
            <rect x="-2" y="-4" width="4" height="24" fill="#ca8a04" />
          </g>
          {/* Red Axe */}
          <g transform="translate(110, 115) rotate(30)">
            <polygon points="0,-16 -12,-12 -8,0 0,-4" fill="#ef4444" />
            <rect x="-2" y="-4" width="4" height="24" fill="#ca8a04" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Head-to-Head Timber Race",
      desc: "Chop left or right to avoid falling branches. First to 50 chops wins!",
      icon: "🪓",
    },
    {
      title: "Don't Get Squashed!",
      desc: "Chopping into a branch crushes your lumberjack and loses the round instantly!",
      icon: "💥",
    },
    {
      title: "Dual 2-Player & Bot Duel",
      desc: "Compete live on the same screen! First to win 3 rounds claims victory.",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="LUMBERJACK"
          subtitle="Speed Timber Chop Duel"
          categoryTag="REFLEX RACE"
          accentColor="#E65100"
          objective="Race to chop 50 logs! Avoid falling branches or get squashed. First to 3 round wins!"
          heroGraphic={lumberjackHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  // Render a Timber Lane (Tree + Lumberjack + Controls)
  const renderTimberLane = (
    who: "p1" | "p2",
    trunk: TrunkSegment[],
    side: "left" | "right",
    isChopping: boolean,
    isSquashed: boolean,
    score: number,
    themeColor: "blue" | "red"
  ) => {
    const isP1 = who === "p1";
    const isThemeBlue = themeColor === "blue";

    return (
      <div className="flex-1 flex flex-col items-center justify-between h-full relative px-1">
        {/* Lane Header & Progress */}
        <div className="w-full flex items-center justify-between px-2 py-1 bg-neutral-900/80 rounded-xl border border-white/10 mb-1 z-20">
          <span className={`text-[10px] uppercase font-black ${isThemeBlue ? "text-blue-400" : "text-red-400"}`}>
            {isP1 ? "YOU (P1)" : playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2"}
          </span>
          <span className="text-xs font-black text-amber-400">
            {score}/{TARGET_CHOPS}
          </span>
        </div>

        {/* Tree Trunk & Character Arena */}
        <div className="relative w-full flex-1 rounded-2xl bg-gradient-to-b from-neutral-900/60 to-neutral-950/80 border border-white/10 overflow-hidden flex items-end justify-center pb-2">
          {/* Tree Trunk Stack */}
          <div className="relative w-14 flex flex-col-reverse items-center z-10">
            {trunk.slice(0, 6).map((seg) => (
              <div
                key={seg.id}
                className="relative w-14 h-11 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 border-y border-amber-950 shadow-md shrink-0 flex items-center justify-center"
              >
                {/* Branch Left */}
                {seg.branch === "left" && (
                  <div className="absolute -left-12 top-1.5 w-12 h-6 bg-gradient-to-l from-amber-800 to-emerald-800 rounded-l-xl border border-amber-950 flex items-center px-1 shadow-sm">
                    <span className="text-[10px]">🍃</span>
                  </div>
                )}
                {/* Branch Right */}
                {seg.branch === "right" && (
                  <div className="absolute -right-12 top-1.5 w-12 h-6 bg-gradient-to-r from-amber-800 to-emerald-800 rounded-r-xl border border-amber-950 flex items-center justify-end px-1 shadow-sm">
                    <span className="text-[10px]">🍃</span>
                  </div>
                )}
              </div>
            ))}
            {/* Stump */}
            <div className="w-20 h-6 bg-amber-950 rounded-t-lg -mb-1 border-t border-amber-700/60" />
          </div>

          {/* Lumberjack Character */}
          <div
            className={`absolute bottom-2 z-20 transition-all duration-75 ${
              isSquashed
                ? "scale-y-50 opacity-75"
                : side === "left"
                ? "left-2"
                : "right-2 scale-x-[-1]"
            }`}
          >
            <div className="relative w-14 h-20 flex flex-col items-center">
              {/* Beanie Hat */}
              <div className={`w-7 h-4 ${isThemeBlue ? "bg-blue-600" : "bg-red-600"} rounded-t-full border-t border-white/30`} />
              {/* Head */}
              <div className="w-6 h-5 bg-amber-200 rounded-b-sm flex items-center justify-center">
                <span className="text-[10px]">{isSquashed ? "😵" : "🧔"}</span>
              </div>
              {/* Flannel Shirt */}
              <div className={`w-9 h-8 ${isThemeBlue ? "bg-blue-700" : "bg-red-700"} border border-black/30 rounded-sm`} />
              {/* Axe */}
              <div
                className={`absolute -top-1 -right-3 text-xl transition-transform duration-75 ${
                  isChopping ? "rotate-45 translate-x-1" : "-rotate-12"
                }`}
              >
                🪓
              </div>
            </div>
          </div>

          {/* Flying Chunks */}
          {flyingChunks
            .filter((c) => c.lane === who)
            .map((c) => (
              <div
                key={c.id}
                className="absolute w-12 h-9 bg-amber-800 rounded-sm border border-amber-950 shadow-sm pointer-events-none z-30"
                style={{
                  transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rot}rad)`,
                  bottom: "35px",
                }}
              />
            ))}
        </div>

        {/* Dual Chop Buttons for this Lane */}
        <div className="w-full grid grid-cols-2 gap-1.5 mt-2 z-20">
          <button
            type="button"
            disabled={!isP1 && playMode === "bot"}
            onPointerDown={() => chop(who, "left")}
            className={`h-16 ${
              isThemeBlue ? "bg-blue-600 active:bg-blue-700 border-blue-800" : "bg-red-600 active:bg-red-700 border-red-800"
            } border-b-4 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex flex-col items-center justify-center cursor-pointer select-none touch-none`}
          >
            <span>🪓</span>
            <span className="text-[9px] mt-0.5">LEFT</span>
          </button>

          <button
            type="button"
            disabled={!isP1 && playMode === "bot"}
            onPointerDown={() => chop(who, "right")}
            className={`h-16 ${
              isThemeBlue ? "bg-blue-700 active:bg-blue-800 border-blue-900" : "bg-red-700 active:bg-red-800 border-red-900"
            } border-b-4 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex flex-col items-center justify-center cursor-pointer select-none touch-none`}
          >
            <span>🪓</span>
            <span className="text-[9px] mt-0.5">RIGHT</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-1 z-20">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Duel Score */}
        <div className="flex items-center gap-4 bg-neutral-900/90 px-4 py-1.5 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">BLUE (P1)</span>
            <span className="text-2xl font-black text-blue-500">{p1Wins}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              RED ({playMode === "bot" ? "BOT" : "P2"})
            </span>
            <span className="text-2xl font-black text-red-500">{p2Wins}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-500/40">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 3</span>
        </div>
      </div>

      {/* Target prompt */}
      <div className="w-full max-w-sm text-center my-0.5 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          RACE TO 50 CHOPS! DODGE BRANCHES!
        </span>
      </div>

      {/* Dual Timber Lanes Arena */}
      <div className="relative w-full max-w-sm h-[400px] flex gap-2 my-1 z-10">
        {/* Left Lane: Player 1 (Blue) */}
        {renderTimberLane("p1", p1Trunk, p1Side, p1Chopping, p1Squashed, p1Score, "blue")}

        {/* Right Lane: Player 2 / Bot (Red) */}
        {renderTimberLane("p2", p2Trunk, p2Side, p2Chopping, p2Squashed, p2Score, "red")}

        {/* Round Over Modal */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-40 text-center rounded-2xl">
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
              {roundWinner === "p1" ? "🎉 BLUE WINS ROUND!" : "💥 RED WINS ROUND!"}
            </h3>
            <p className="text-xs font-bold text-neutral-300 mt-1">
              Score: {p1Score} vs {p2Score} chops
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

        {/* Match Winner Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-50 animate-fadeIn text-center rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "BLUE VICTORY!" : "RED VICTORY!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Match Score: {p1Wins} - {p2Wins}</p>

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

      {/* Footer Instructions */}
      <div className="w-full max-w-sm text-center py-1 z-20">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {playMode === "friend" ? "2-PLAYER RACE: TAP CHOP BUTTONS SIMULTANEOUSLY" : "BEAT THE BOT TO 50 LOGS WITHOUT GETTING SQUASHED"}
        </span>
      </div>
    </div>
  );
}
