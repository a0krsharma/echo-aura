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
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
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
  onInviteFriend,
  onRandomMatch,
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
          x: targetSide === "left" ? -25 : 25,
          y: 0,
          vx: targetSide === "left" ? 14 + Math.random() * 5 : -14 - Math.random() * 5,
          vy: -8 - Math.random() * 4,
          rot: 0,
          vrot: targetSide === "left" ? 0.35 : -0.35,
          branch: choppedSegment ? choppedSegment.branch : "none",
        },
      ]);

      // 5. Sawdust Splinters Spray
      const newSawdust: SawdustParticle[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = targetSide === "left" ? -0.2 - Math.random() * 0.8 : Math.PI + 0.2 + Math.random() * 0.8;
        const spd = 4 + Math.random() * 7;
        newSawdust.push({
          id: idCounter.current++,
          x: targetSide === "left" ? -18 : 18,
          y: 10,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 3 + Math.random() * 3.5,
          color: i % 3 === 0 ? "#facc15" : i % 3 === 1 ? "#d97706" : "#78350f",
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

  // =========================================================================
  // REALISTIC BOTANICAL TREE RENDERING ENGINE (ORGANIC SVG)
  // =========================================================================

  // 1. Realistic Organic Trunk Segment (128px wide × 64px tall)
  // Each segment has natural volumetric cylindrical shading, deep bark furrows,
  // knot variations, living emerald moss clinging to crevices, and cut sawn grain lines.
  const renderRealisticTrunkSVG = (segId: number) => {
    const variant = segId % 4;
    const gradId = `barkGrad_${segId}`;
    const mossGradId = `mossGrad_${segId}`;

    return (
      <svg
        viewBox="0 0 128 64"
        className="w-32 h-16 shrink-0 block overflow-visible select-none pointer-events-none drop-shadow-md"
      >
        <defs>
          {/* Volumetric 3D cylindrical lighting across the trunk */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e1008" />
            <stop offset="7%" stopColor="#432212" />
            <stop offset="22%" stopColor="#2c160b" />
            <stop offset="42%" stopColor="#5c3218" />
            <stop offset="60%" stopColor="#7a4422" />
            <stop offset="78%" stopColor="#532d16" />
            <stop offset="92%" stopColor="#281409" />
            <stop offset="100%" stopColor="#120803" />
          </linearGradient>

          {/* Living forest moss gradient */}
          <linearGradient id={mossGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#65a30d" />
            <stop offset="50%" stopColor="#4d7c0f" />
            <stop offset="100%" stopColor="#1e3a0f" />
          </linearGradient>
        </defs>

        {/* Base Cylindrical Trunk Body */}
        <rect x="0" y="0" width="128" height="64" fill={`url(#${gradId})`} />

        {/* Sawn Cut Joint Seams (Top & Bottom subtle timber grain) */}
        <line x1="0" y1="0.5" x2="128" y2="0.5" stroke="#120803" strokeWidth="1.2" opacity="0.9" />
        <line x1="0" y1="63.5" x2="128" y2="63.5" stroke="#0a0402" strokeWidth="1.2" opacity="0.95" />

        {/* Deep Vertical Bark Furrows & Raised Ridges */}
        {/* Furrow 1 (Left shade) */}
        <path
          d="M 16,0 Q 18,22 14,40 T 17,64"
          fill="none"
          stroke="#150a04"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 18.5,0 Q 20.5,22 16.5,40 T 19.5,64"
          fill="none"
          stroke="#8a4f29"
          strokeWidth="1.2"
          opacity="0.6"
        />

        {/* Furrow 2 (Center-Left deep crease) */}
        <path
          d="M 38,0 Q 35,18 40,36 T 36,64"
          fill="none"
          stroke="#120703"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 41,0 Q 38,18 43,36 T 39,64"
          fill="none"
          stroke="#9a5a30"
          strokeWidth="1.4"
          opacity="0.75"
        />

        {/* Furrow 3 (Center sunny ridge) */}
        <path
          d="M 64,0 Q 67,26 62,44 T 66,64"
          fill="none"
          stroke="#1d0e06"
          strokeWidth="2"
        />
        <path
          d="M 66.5,0 Q 69.5,26 64.5,44 T 68.5,64"
          fill="none"
          stroke="#a66235"
          strokeWidth="1.8"
          opacity="0.85"
        />

        {/* Furrow 4 (Right mid-ridge) */}
        <path
          d="M 88,0 Q 85,20 90,38 T 86,64"
          fill="none"
          stroke="#150904"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 90.5,0 Q 87.5,20 92.5,38 T 88.5,64"
          fill="none"
          stroke="#854823"
          strokeWidth="1.4"
          opacity="0.65"
        />

        {/* Furrow 5 (Right edge shadow groove) */}
        <path
          d="M 110,0 Q 112,28 108,46 T 111,64"
          fill="none"
          stroke="#0d0502"
          strokeWidth="2.8"
        />

        {/* Organic Variant Variations: Knots, Moss, Bark Plates */}
        {variant === 0 && (
          /* Natural Wood Knot with Concentric Swirling Grain */
          <g transform="translate(54, 28)">
            <ellipse cx="0" cy="0" rx="9" ry="6" fill="#1b0c05" stroke="#3b1d0c" strokeWidth="1.5" />
            <ellipse cx="-1" cy="0" rx="5" ry="3" fill="#0d0502" />
            <path
              d="M -16,-12 Q 0,-18 16,-10 M -18,12 Q 0,18 18,10"
              fill="none"
              stroke="#8c5029"
              strokeWidth="1"
              opacity="0.7"
            />
          </g>
        )}

        {variant === 1 && (
          /* Velvet Forest Moss clinging to bark hollow */
          <g transform="translate(30, 22)">
            <path
              d="M 0,0 C 4,-6 14,-5 18,0 C 22,6 18,16 12,18 C 6,20 0,14 0,8 Z"
              fill={`url(#${mossGradId})`}
              opacity="0.9"
            />
            {/* Moss spore specks */}
            <circle cx="6" cy="4" r="1.2" fill="#a3e635" opacity="0.8" />
            <circle cx="12" cy="8" r="1.5" fill="#bef264" opacity="0.75" />
            <circle cx="8" cy="12" r="1" fill="#84cc16" opacity="0.8" />
          </g>
        )}

        {variant === 2 && (
          /* Prominent Bark Plate Flakes & Lichen */
          <g>
            <path
              d="M 72,12 Q 82,14 84,26 Q 74,28 72,12 Z"
              fill="#522a13"
              stroke="#210f06"
              strokeWidth="1"
              opacity="0.8"
            />
            <circle cx="78" cy="46" r="2" fill="#84cc16" opacity="0.65" />
            <circle cx="82" cy="48" r="1.4" fill="#a3e635" opacity="0.7" />
          </g>
        )}

        {variant === 3 && (
          /* Weathered Lichen cluster & twin bark crevices */
          <g>
            <circle cx="24" cy="32" r="2.5" fill="#4ade80" opacity="0.45" />
            <circle cx="26" cy="35" r="1.8" fill="#86efac" opacity="0.5" />
            <line x1="48" y1="18" x2="52" y2="46" stroke="#120703" strokeWidth="2" opacity="0.8" />
          </g>
        )}

        {/* Ambient Left Rim Highlight (Sunlight filtering through canopy) */}
        <line x1="2" y1="0" x2="2" y2="64" stroke="#e09f67" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  };

  // 2. Realistic Sculpted Branch Limb with Botanical Needle Boughs & Pinecone
  // Rendered with natural woody tapering branch collar, multi-tiered pine needle sprays,
  // rich forest foliage shading, and an authentic dangling pinecone.
  const renderRealisticBranchSVG = (side: "left" | "right") => {
    const isLeft = side === "left";

    return (
      <div
        className={`absolute top-1 pointer-events-none z-20 select-none ${
          isLeft ? "-left-[118px]" : "-right-[118px]"
        }`}
        style={{
          transform: isLeft ? "none" : "scaleX(-1)",
        }}
      >
        <svg
          viewBox="0 0 128 76"
          className="w-32 h-20 overflow-visible drop-shadow-xl"
        >
          <defs>
            {/* Branch wood gradient with cylindrical lighting */}
            <linearGradient id={`branchWood_${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c4322" />
              <stop offset="35%" stopColor="#5a2f16" />
              <stop offset="75%" stopColor="#381b0c" />
              <stop offset="100%" stopColor="#1a0b05" />
            </linearGradient>

            {/* Pine needle multi-tone gradients */}
            <linearGradient id={`needleDark_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <linearGradient id={`needleMid_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id={`needleSun_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Pinecone scale gradient */}
            <linearGradient id={`coneGrad_${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#291104" />
            </linearGradient>
          </defs>

          {/* 1. Branch Collar Swelling (Natural organic junction into trunk on right) */}
          <path
            d="M 128,14 C 114,14 100,22 80,24 C 60,26 40,28 16,32 C 12,33 10,36 12,38 C 16,42 42,40 68,38 C 96,36 114,48 128,52 Z"
            fill={`url(#branchWood_${side})`}
            stroke="#1c0c05"
            strokeWidth="1.2"
          />

          {/* Woody bark grain lines along branch limb */}
          <path
            d="M 126,26 Q 84,28 32,34"
            fill="none"
            stroke="#96542c"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <path
            d="M 126,38 Q 90,36 45,38"
            fill="none"
            stroke="#1a0b05"
            strokeWidth="1.8"
            opacity="0.9"
          />

          {/* 2. Hanging Organic Pinecone */}
          <g transform="translate(68, 38)">
            {/* Small wood twig */}
            <line x1="0" y1="0" x2="3" y2="7" stroke="#381b0c" strokeWidth="1.5" />
            {/* Pinecone body */}
            <path
              d="M 0,6 C 7,6 10,12 8,19 C 6,24 1,26 0,26 C -1,26 -6,24 -8,19 C -10,12 -7,6 0,6 Z"
              fill={`url(#coneGrad_${side})`}
              stroke="#1a0b05"
              strokeWidth="0.8"
            />
            {/* Pinecone wooden scale ridges */}
            <path d="M -6,11 Q 0,14 6,11" stroke="#a16207" strokeWidth="1.2" fill="none" opacity="0.85" />
            <path d="M -7,16 Q 0,19 7,16" stroke="#a16207" strokeWidth="1.2" fill="none" opacity="0.85" />
            <path d="M -5,21 Q 0,23 5,21" stroke="#a16207" strokeWidth="1.2" fill="none" opacity="0.85" />
          </g>

          {/* 3. Layered Botanical Pine Needle Boughs */}
          {/* Back Shadow Needle Cluster */}
          <g fill={`url(#needleDark_${side})`}>
            {/* Fan 1 (Tip bough) */}
            <path d="M 16,32 C -4,26 -14,20 -18,12 C -12,24 -2,32 12,36 Z" />
            <path d="M 14,34 C -8,32 -20,28 -24,22 C -18,34 -4,38 10,38 Z" />
            <path d="M 12,36 C -10,40 -20,44 -22,50 C -14,46 -2,42 12,38 Z" />
            {/* Fan 2 (Mid bough) */}
            <path d="M 45,28 C 30,16 20,8 14,0 C 22,12 36,22 42,30 Z" />
            <path d="M 46,30 C 28,24 16,18 8,10 C 18,22 34,28 42,32 Z" />
          </g>

          {/* Middle Dense Pine Needle Cluster */}
          <g fill={`url(#needleMid_${side})`}>
            {/* Outer tip sprays */}
            <path d="M 18,31 C 2,24 -6,18 -12,12 C -6,22 4,28 16,33 Z" />
            <path d="M 18,32 C -2,28 -14,26 -20,22 C -12,30 2,34 16,35 Z" />
            <path d="M 18,33 C 0,36 -12,40 -16,46 C -8,42 4,38 16,36 Z" />
            {/* Upper sprigs */}
            <path d="M 48,27 C 34,14 26,6 18, -2 C 26,8 38,18 46,28 Z" />
            <path d="M 52,27 C 38,18 30,12 24, 4 C 32,14 42,22 48,29 Z" />
            <path d="M 56,26 C 44,16 38,10 32, 2 C 40,12 48,20 54,28 Z" />
            {/* Lower lush tuft */}
            <path d="M 38,36 C 24,44 14,52 10,60 C 18,52 30,44 38,38 Z" />
            <path d="M 42,35 C 28,46 20,56 16,66 C 24,56 34,46 40,38 Z" />
          </g>

          {/* Front Sun-Drenched Needle Tips (Vibrant highlights) */}
          <g fill={`url(#needleSun_${side})`} opacity="0.95">
            <path d="M 19,30 C 6,22 0,16 -6,10 C -1,18 8,24 18,31 Z" />
            <path d="M 19,32 C 2,30 -6,28 -12,24 C -5,30 6,33 17,34 Z" />
            <path d="M 49,26 C 36,15 28,8 22, 1 C 28,10 38,18 47,27 Z" />
            <path d="M 53,26 C 42,16 34,11 28, 5 C 34,13 44,20 50,27 Z" />
            <path d="M 39,35 C 28,42 20,49 16,56 C 22,49 32,42 38,37 Z" />
          </g>

          {/* Crisp needle stroke lines for authentic botanical sharpness */}
          <g stroke="#6ee7b7" strokeWidth="0.8" opacity="0.6">
            <line x1="18" y1="31" x2="-8" y2="11" />
            <line x1="18" y1="33" x2="-14" y2="23" />
            <line x1="18" y1="35" x2="-10" y2="44" />
            <line x1="48" y1="26" x2="20" y2="0" />
            <line x1="54" y1="25" x2="30" y2="3" />
            <line x1="40" y1="36" x2="14" y2="62" />
          </g>
        </svg>
      </div>
    );
  };

  // 3. Render Trunk Segment Container
  const renderTrunkSegment = (seg: TrunkSegment) => {
    return (
      <div
        key={seg.id}
        className="relative w-32 h-16 shrink-0 flex items-center justify-center select-none"
      >
        {/* Realistic Organic Trunk SVG */}
        {renderRealisticTrunkSVG(seg.id)}

        {/* Realistic Left Branch */}
        {seg.branch === "left" && renderRealisticBranchSVG("left")}

        {/* Realistic Right Branch */}
        {seg.branch === "right" && renderRealisticBranchSVG("right")}
      </div>
    );
  };

  // 4. Massive Ancient Buttress Roots & Forest Loam Base (260px wide × 72px tall)
  const renderRealisticTreeBase = () => {
    return (
      <div className="relative w-64 h-18 -mb-2 z-10 flex items-end justify-center pointer-events-none select-none">
        <svg viewBox="0 0 256 72" className="w-64 h-18 overflow-visible drop-shadow-2xl">
          <defs>
            <linearGradient id="rootWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5a2f16" />
              <stop offset="40%" stopColor="#381b0c" />
              <stop offset="85%" stopColor="#200d04" />
              <stop offset="100%" stopColor="#0d0401" />
            </linearGradient>

            <linearGradient id="rootMossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="60%" stopColor="#3f6212" />
              <stop offset="100%" stopColor="#142607" />
            </linearGradient>

            <linearGradient id="forestLoamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="100%" stopColor="#0c0a09" />
            </linearGradient>
          </defs>

          {/* Forest Loam Earth Bed */}
          <path
            d="M 0,58 Q 128,52 256,58 L 256,72 L 0,72 Z"
            fill="url(#forestLoamGrad)"
          />

          {/* Sprawling Buttressed Ancient Roots */}
          {/* Main Trunk flare & 3 giant arching buttresses */}
          <path
            d="M 64,0 L 192,0 C 190,14 200,28 218,44 C 234,56 250,62 254,66 C 240,68 214,64 196,56 C 182,50 176,38 168,26 C 158,40 152,54 154,68 C 142,68 126,67 122,54 C 118,40 110,26 98,24 C 88,38 80,52 68,64 C 52,66 26,68 4,66 C 14,60 32,54 46,42 C 60,30 62,14 64,0 Z"
            fill="url(#rootWoodGrad)"
            stroke="#120703"
            strokeWidth="1.5"
          />

          {/* Deep root hollow crevices */}
          <path
            d="M 88,24 Q 78,44 68,64 M 168,26 Q 174,44 186,60 M 128,12 Q 132,36 134,66"
            fill="none"
            stroke="#0a0301"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Sunlit root ridge crests */}
          <path
            d="M 66,4 Q 52,30 36,46 M 190,4 Q 206,32 230,52 M 124,14 Q 122,34 118,52"
            fill="none"
            stroke="#8c5029"
            strokeWidth="1.5"
            opacity="0.75"
          />

          {/* Lush Velvet Moss Blankets covering the root crowns */}
          <path
            d="M 60,6 C 72,2 96,8 108,16 C 96,20 74,18 60,6 Z"
            fill="url(#rootMossGrad)"
            opacity="0.9"
          />
          <path
            d="M 152,14 C 168,8 188,4 196,8 C 192,18 174,22 152,14 Z"
            fill="url(#rootMossGrad)"
            opacity="0.9"
          />
          <path
            d="M 28,48 C 38,44 48,46 54,54 C 44,56 34,54 28,48 Z"
            fill="url(#rootMossGrad)"
            opacity="0.85"
          />
          <path
            d="M 204,50 C 214,46 226,48 232,56 C 222,58 212,56 204,50 Z"
            fill="url(#rootMossGrad)"
            opacity="0.85"
          />

          {/* Forest floor grass tufts & fallen pine needles */}
          <g stroke="#65a30d" strokeWidth="1.5" strokeLinecap="round">
            <line x1="20" y1="64" x2="16" y2="52" />
            <line x1="22" y1="64" x2="24" y2="50" />
            <line x1="24" y1="64" x2="28" y2="54" />

            <line x1="140" y1="68" x2="138" y2="58" />
            <line x1="142" y1="68" x2="146" y2="56" />

            <line x1="238" y1="66" x2="234" y2="54" />
            <line x1="240" y1="66" x2="244" y2="52" />
          </g>
        </svg>
      </div>
    );
  };

  // 5. Realistic Flying Chopped Log with Cut End-Grain Growth Rings & Branch
  const renderRealisticFlyingLog = (fl: FlyingLog) => {
    return (
      <div
        key={fl.id}
        className="absolute w-32 h-16 pointer-events-none z-40 select-none drop-shadow-2xl"
        style={{
          transform: `translate(${fl.x}px, ${fl.y}px) rotate(${fl.rot}rad)`,
          bottom: "55px",
        }}
      >
        <svg viewBox="0 0 128 64" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`flyBark_${fl.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7a4422" />
              <stop offset="50%" stopColor="#532d16" />
              <stop offset="100%" stopColor="#281409" />
            </linearGradient>

            {/* Sawn end-grain cross-section */}
            <radialGradient id={`endGrain_${fl.id}`} cx="45%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="25%" stopColor="#78350f" />
              <stop offset="55%" stopColor="#b45309" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="94%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#291104" />
            </radialGradient>
          </defs>

          {/* Cylindrical Bark Trunk Flank */}
          <rect x="22" y="6" width="102" height="52" rx="4" fill={`url(#flyBark_${fl.id})`} stroke="#170903" strokeWidth="1.5" />
          {/* Bark ridges on flying log */}
          <line x1="45" y1="6" x2="45" y2="58" stroke="#170903" strokeWidth="2" />
          <line x1="47" y1="6" x2="47" y2="58" stroke="#9a5a30" strokeWidth="1.2" opacity="0.7" />
          <line x1="82" y1="6" x2="82" y2="58" stroke="#170903" strokeWidth="2" />
          <line x1="84" y1="6" x2="84" y2="58" stroke="#9a5a30" strokeWidth="1.2" opacity="0.7" />

          {/* Sawn Timber Round (Cut Face with Concentric Annual Growth Rings) */}
          <ellipse cx="22" cy="32" rx="20" ry="26" fill={`url(#endGrain_${fl.id})`} stroke="#170903" strokeWidth="2" />
          {/* Growth Rings */}
          <ellipse cx="22" cy="32" rx="15" ry="19" fill="none" stroke="#78350f" strokeWidth="1" opacity="0.85" />
          <ellipse cx="22" cy="32" rx="10" ry="13" fill="none" stroke="#522409" strokeWidth="1" opacity="0.9" />
          <ellipse cx="22" cy="32" rx="5" ry="6" fill="none" stroke="#361504" strokeWidth="1.2" />
          {/* Pith center */}
          <circle cx="21" cy="32" r="2" fill="#200a02" />
          {/* Radial check split crack */}
          <path d="M 21,32 L 35,22 M 21,32 L 28,45" stroke="#1f0a02" strokeWidth="1" />
        </svg>

        {/* If the chopped segment had a branch, it tumbles along with it! */}
        {fl.branch === "left" && renderRealisticBranchSVG("left")}
        {fl.branch === "right" && renderRealisticBranchSVG("right")}
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
            ? "left-4"
            : "right-4 scale-x-[-1]"
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

  const lumberHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-950/40 rounded-2xl flex items-center justify-center border border-emerald-500/20 overflow-hidden">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {/* Sunbeams filtering through redwood canopy */}
          <polygon points="0,0 80,0 120,160 20,160" fill="white" opacity="0.05" />
          <polygon points="60,0 140,0 160,160 80,160" fill="white" opacity="0.04" />

          {/* Grand Ancient Redwood Trunk */}
          <rect x="58" y="10" width="44" height="135" fill="#5a2f16" stroke="#1f0e06" strokeWidth="2" />
          <line x1="70" y1="10" x2="70" y2="145" stroke="#170803" strokeWidth="2.5" />
          <line x1="72" y1="10" x2="72" y2="145" stroke="#9a5a30" strokeWidth="1.2" opacity="0.8" />
          <line x1="90" y1="10" x2="90" y2="145" stroke="#170803" strokeWidth="2.5" />
          <line x1="92" y1="10" x2="92" y2="145" stroke="#9a5a30" strokeWidth="1.2" opacity="0.8" />

          {/* Moss Patch */}
          <circle cx="76" cy="70" r="5" fill="#65a30d" opacity="0.85" />
          <circle cx="80" cy="73" r="3.5" fill="#a3e635" opacity="0.8" />

          {/* Realistic Branch Left */}
          <g transform="translate(18, 38)">
            <path d="M 40,10 C 25,10 10,16 0,20 C 10,22 25,20 40,24 Z" fill="#451e0b" />
            <path d="M 12,18 C -4,12 -10,6 -14,0 C -8,12 2,18 10,20 Z" fill="#047857" />
            <path d="M 14,19 C -2,16 -12,14 -16,10 C -8,18 4,20 12,21 Z" fill="#10b981" />
            {/* Hanging Pinecone */}
            <ellipse cx="22" cy="24" rx="4" ry="7" fill="#78350f" stroke="#291104" strokeWidth="0.8" />
          </g>

          {/* Realistic Branch Right */}
          <g transform="translate(102, 85) scale(-1, 1)">
            <path d="M 40,10 C 25,10 10,16 0,20 C 10,22 25,20 40,24 Z" fill="#451e0b" />
            <path d="M 12,18 C -4,12 -10,6 -14,0 C -8,12 2,18 10,20 Z" fill="#047857" />
            <path d="M 14,19 C -2,16 -12,14 -16,10 C -8,18 4,20 12,21 Z" fill="#10b981" />
          </g>

          {/* Buttressed Root Base */}
          <path d="M 46,145 C 32,152 15,158 8,160 L 152,160 C 145,158 128,152 114,145 Z" fill="#381b0c" stroke="#120703" strokeWidth="1.5" />
          <ellipse cx="60" cy="148" rx="10" ry="3" fill="#65a30d" opacity="0.85" />
          <ellipse cx="102" cy="148" rx="12" ry="3" fill="#65a30d" opacity="0.85" />

          {/* Steel Lumberjack Double-Bit Axe */}
          <g transform="translate(42, 120) rotate(-35)">
            <polygon points="0,-16 16,-10 12,2 0,-3" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1" />
            <rect x="-2" y="-3" width="4.5" height="28" fill="#d97706" rx="1" />
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
          onPlayFriend={onInviteFriend || (() => startGame("friend"))}
          onPlayBot={(diff) => startGame("bot", diff)}
          onRandomMatch={onRandomMatch}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

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
        className={`relative w-full max-w-sm h-[430px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-end justify-center pb-2 ${
          screenShake > 0 ? "translate-y-1" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, #09120e 0%, #0d2818 45%, #143e21 75%, #051a0d 100%)",
        }}
      >
        {/* Atmospheric Forest Mist & God Rays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
          {/* Volumetric sunbeams */}
          <div
            className="absolute -top-10 -left-20 w-[500px] h-[400px]"
            style={{
              background: "conic-gradient(from 135deg at 20% 0%, transparent 0deg, rgba(255,255,255,0.12) 15deg, transparent 30deg, rgba(255,255,255,0.08) 45deg, transparent 65deg)",
            }}
          />
          {/* Deep distant pine silhouettes */}
          <div className="absolute inset-x-0 bottom-12 h-36 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-800/40 via-emerald-950/20 to-transparent" />
        </div>

        {/* Tree Trunk Stack (Segment 0 at bottom, 5 above) */}
        <div className="relative w-32 flex flex-col-reverse items-center z-10">
          {p1Trunk.slice(0, 6).map((seg) => renderTrunkSegment(seg))}

          {/* Majestic Sprawling Buttress Root Base */}
          {renderRealisticTreeBase()}
        </div>

        {/* Lumberjack Character */}
        {renderLumberjack(p1Side, p1Chopping, p1Squashed, "blue")}

        {/* Realistic Flying Chopped Logs */}
        {flyingLogs.map((fl) => renderRealisticFlyingLog(fl))}

        {/* Sawdust Splinters Spray */}
        {sawdust.map((sp) => (
          <div
            key={sp.id}
            className="absolute rounded-xs pointer-events-none z-50"
            style={{
              left: `calc(50% + ${sp.x}px)`,
              bottom: `calc(75px + ${sp.y}px)`,
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
