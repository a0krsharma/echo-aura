"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { firePoolShot, type ArcadeMatch, type PoolBall } from "@/lib/arcade";
import { executePoolBotShot } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  Sparkles,
  HelpCircle,
  Users,
  Compass,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Flame,
  ShieldAlert,
  ArrowLeftRight,
  Target,
} from "lucide-react";

interface PoolGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const TABLE_WIDTH = 380;
const TABLE_HEIGHT = 480;
const CUSHION = 24;
const PLAYABLE_MIN_X = CUSHION + 2;
const PLAYABLE_MAX_X = TABLE_WIDTH - CUSHION - 2;
const PLAYABLE_MIN_Y = CUSHION + 2;
const PLAYABLE_MAX_Y = TABLE_HEIGHT - CUSHION - 2;

const FRICTION = 0.986;
const RESTITUTION = 0.89;

// 6 Official Tournament Pocket Positions
const POCKETS = [
  { x: CUSHION, y: CUSHION, name: "TOP_LEFT" },
  { x: TABLE_WIDTH / 2, y: CUSHION - 4, name: "TOP_MID" },
  { x: TABLE_WIDTH - CUSHION, y: CUSHION, name: "TOP_RIGHT" },
  { x: CUSHION, y: TABLE_HEIGHT - CUSHION, name: "BOT_LEFT" },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION + 4, name: "BOT_MID" },
  { x: TABLE_WIDTH - CUSHION, y: TABLE_HEIGHT - CUSHION, name: "BOT_RIGHT" },
];
const POCKET_RADIUS = 24;
const POCKET_DEPTH_RADIUS = 16;

// Ball Color Palette (Official Tournament Balls)
const BALL_COLORS: Record<string, string> = {
  "1": "#eab308", // Solid Yellow
  "2": "#2563eb", // Solid Blue
  "3": "#dc2626", // Solid Red
  "4": "#7c3aed", // Solid Purple
  "5": "#ea580c", // Solid Orange
  "6": "#16a34a", // Solid Green
  "7": "#7f1d1d", // Solid Maroon
  "8": "#09090b", // 8-Ball Black
  "9": "#eab308", // Stripe Yellow
  "10": "#2563eb", // Stripe Blue
  "11": "#dc2626", // Stripe Red
  "12": "#7c3aed", // Stripe Purple
  "13": "#ea580c", // Stripe Orange
  "14": "#16a34a", // Stripe Green
  "15": "#7f1d1d", // Stripe Maroon
};

// ── The 5 Official Popular Pool Disciplines ─────────────────────────────────────
export type PoolDiscipline = "8_BALL" | "9_BALL" | "10_BALL" | "STRAIGHT_POOL" | "ONE_POCKET";

export interface PoolDisciplineConfig {
  id: PoolDiscipline;
  name: string;
  shortName: string;
  badge: string;
  icon: string;
  ballsCount: number;
  description: string;
  scoringRule: string;
  winCondition: string;
}

export const POOL_DISCIPLINES: Record<PoolDiscipline, PoolDisciplineConfig> = {
  "8_BALL": {
    id: "8_BALL",
    name: "8-Ball Pool",
    shortName: "8-Ball",
    badge: "Solids vs Stripes",
    icon: "🎱",
    ballsCount: 15,
    description: "The most widely played game globally. Clear your assigned group (Solids 1-7 or Stripes 9-15), then legally pocket the 8-Ball to win.",
    scoringRule: "10 pts per legal ball",
    winCondition: "Legally pocket the 8-Ball after clearing your suit",
  },
  "9_BALL": {
    id: "9_BALL",
    name: "9-Ball Pro",
    shortName: "9-Ball",
    badge: "Pro Rotation",
    icon: "🟡",
    ballsCount: 9,
    description: "The dominant professional rotation game. Always strike the lowest-numbered ball first. Legally sinking the 9-ball on any shot instantly wins the rack.",
    scoringRule: "10 pts per legal ball; lowest ball first",
    winCondition: "Legally pocket the 9-Ball on any shot",
  },
  "10_BALL": {
    id: "10_BALL",
    name: "10-Ball Championship",
    shortName: "10-Ball",
    badge: "Call-Shot Rotation",
    icon: "🔟",
    ballsCount: 10,
    description: "A disciplined, call-shot rotation discipline favored in world-class tournaments to eliminate luck. Hit lowest ball first; legally pocket 10-Ball to win.",
    scoringRule: "10 pts per legal ball; lowest ball first",
    winCondition: "Legally pocket the 10-Ball",
  },
  "STRAIGHT_POOL": {
    id: "STRAIGHT_POOL",
    name: "Straight Pool (14.1)",
    shortName: "14.1 Run",
    badge: "14.1 Continuous",
    icon: "🎯",
    ballsCount: 15,
    description: "A traditional high-run game where each pocketed ball = 1 point. After 14 balls, they are re-racked with apex empty, using the 15th ball as a break ball.",
    scoringRule: "1 point per legally pocketed ball",
    winCondition: "First player to reach 15 points (or clear rack)",
  },
  "ONE_POCKET": {
    id: "ONE_POCKET",
    name: "One Pocket",
    shortName: "One Pocket",
    badge: "Tactical Chess",
    icon: "🛡️",
    ballsCount: 15,
    description: "A chess-like tactical game with all 15 balls. P1 assigned Bot-Left foot pocket; P2 assigned Bot-Right. First to legally guide 8 balls into designated pocket wins.",
    scoringRule: "1 point per ball scored in designated pocket",
    winCondition: "First player to guide 8 balls into their pocket",
  },
};

// Generate authentic rack geometry for all 5 disciplines
export function createDisciplineRack(discipline: PoolDiscipline): PoolBall[] {
  const cue: PoolBall = { id: "cue", x: 190, y: 360, vx: 0, vy: 0, radius: 10, color: "#ffffff", type: "cue", isPocketed: false };
  const balls: PoolBall[] = [cue];
  const apexX = 190, apexY = 140, r = 10, spacingY = 17, spacingX = 20;

  if (discipline === "8_BALL" || discipline === "STRAIGHT_POOL" || discipline === "ONE_POCKET") {
    // 15-ball full triangle rack
    // Row 1 (Apex): 1
    balls.push({ id: "b1", x: apexX, y: apexY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["1"], number: 1, type: "solid", isPocketed: false });
    // Row 2: 2, 9
    balls.push({ id: "b2", x: apexX - spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["2"], number: 2, type: "solid", isPocketed: false });
    balls.push({ id: "b9", x: apexX + spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["9"], number: 9, type: "stripe", isPocketed: false });
    // Row 3: 3, 8 (Center!), 10
    balls.push({ id: "b3", x: apexX - spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["3"], number: 3, type: "solid", isPocketed: false });
    balls.push({ id: "b8", x: apexX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["8"], number: 8, type: "8ball", isPocketed: false });
    balls.push({ id: "b10", x: apexX + spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["10"], number: 10, type: "stripe", isPocketed: false });
    // Row 4: 4, 11, 5, 12
    balls.push({ id: "b4", x: apexX - 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["4"], number: 4, type: "solid", isPocketed: false });
    balls.push({ id: "b11", x: apexX - 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["11"], number: 11, type: "stripe", isPocketed: false });
    balls.push({ id: "b5", x: apexX + 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["5"], number: 5, type: "solid", isPocketed: false });
    balls.push({ id: "b12", x: apexX + 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["12"], number: 12, type: "stripe", isPocketed: false });
    // Row 5: 6, 13, 7, 14, 15
    balls.push({ id: "b6", x: apexX - 2 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["6"], number: 6, type: "solid", isPocketed: false });
    balls.push({ id: "b13", x: apexX - 1 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["13"], number: 13, type: "stripe", isPocketed: false });
    balls.push({ id: "b7", x: apexX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["7"], number: 7, type: "solid", isPocketed: false });
    balls.push({ id: "b14", x: apexX + 1 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["14"], number: 14, type: "stripe", isPocketed: false });
    balls.push({ id: "b15", x: apexX + 2 * spacingX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["15"], number: 15, type: "stripe", isPocketed: false });
  } else if (discipline === "9_BALL") {
    // 9-ball diamond rack (1 at apex, 9 dead in center)
    // Row 1: 1
    balls.push({ id: "b1", x: apexX, y: apexY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["1"], number: 1, type: "solid", isPocketed: false });
    // Row 2: 2, 3
    balls.push({ id: "b2", x: apexX - spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["2"], number: 2, type: "solid", isPocketed: false });
    balls.push({ id: "b3", x: apexX + spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["3"], number: 3, type: "solid", isPocketed: false });
    // Row 3: 4, 9 (Center!), 5
    balls.push({ id: "b4", x: apexX - spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["4"], number: 4, type: "solid", isPocketed: false });
    balls.push({ id: "b9", x: apexX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["9"], number: 9, type: "stripe", isPocketed: false });
    balls.push({ id: "b5", x: apexX + spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["5"], number: 5, type: "solid", isPocketed: false });
    // Row 4: 6, 7
    balls.push({ id: "b6", x: apexX - spacingX / 2, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["6"], number: 6, type: "solid", isPocketed: false });
    balls.push({ id: "b7", x: apexX + spacingX / 2, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["7"], number: 7, type: "solid", isPocketed: false });
    // Row 5: 8
    balls.push({ id: "b8", x: apexX, y: apexY - spacingY * 4, vx: 0, vy: 0, radius: r, color: BALL_COLORS["8"], number: 8, type: "8ball", isPocketed: false });
  } else if (discipline === "10_BALL") {
    // 10-ball triangle rack (1 at apex, 10 dead in center)
    // Row 1: 1
    balls.push({ id: "b1", x: apexX, y: apexY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["1"], number: 1, type: "solid", isPocketed: false });
    // Row 2: 2, 3
    balls.push({ id: "b2", x: apexX - spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["2"], number: 2, type: "solid", isPocketed: false });
    balls.push({ id: "b3", x: apexX + spacingX / 2, y: apexY - spacingY, vx: 0, vy: 0, radius: r, color: BALL_COLORS["3"], number: 3, type: "solid", isPocketed: false });
    // Row 3: 4, 10 (Center!), 5
    balls.push({ id: "b4", x: apexX - spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["4"], number: 4, type: "solid", isPocketed: false });
    balls.push({ id: "b10", x: apexX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["10"], number: 10, type: "stripe", isPocketed: false });
    balls.push({ id: "b5", x: apexX + spacingX, y: apexY - spacingY * 2, vx: 0, vy: 0, radius: r, color: BALL_COLORS["5"], number: 5, type: "solid", isPocketed: false });
    // Row 4: 6, 7, 8, 9
    balls.push({ id: "b6", x: apexX - 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["6"], number: 6, type: "solid", isPocketed: false });
    balls.push({ id: "b7", x: apexX - 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["7"], number: 7, type: "solid", isPocketed: false });
    balls.push({ id: "b8", x: apexX + 0.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["8"], number: 8, type: "8ball", isPocketed: false });
    balls.push({ id: "b9", x: apexX + 1.5 * spacingX, y: apexY - spacingY * 3, vx: 0, vy: 0, radius: r, color: BALL_COLORS["9"], number: 9, type: "stripe", isPocketed: false });
  }

  return balls;
}

export default function PoolGame({ match, currentUid }: PoolGameProps) {
  const [discipline, setDiscipline] = useState<PoolDiscipline>("8_BALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showProPhysics, setShowProPhysics] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ps = match.poolState;
  const isMyTurn = ps?.currentTurnUid === currentUid && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;

  // Aiming, Spin and Controls State
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [isBallInHand, setIsBallInHand] = useState(false);
  const [isPushOutDeclared, setIsPushOutDeclared] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Local physics pieces state
  const ballsRef = useRef<PoolBall[]>([]);
  const isSimulatingRef = useRef(false);
  const pocketedThisShotRef = useRef<PoolBall[]>([]);
  const cueScratchRef = useRef(false);
  const firstContactBallRef = useRef<PoolBall | null>(null);
  const isBreakShotRef = useRef(false);
  const pocketLocationsThisShotRef = useRef<{ ball: PoolBall; pocketName: string }[]>([]);

  // Initialize or Sync balls from match state
  useEffect(() => {
    if (ps?.ballsStr && !isSimulatingRef.current) {
      try {
        const parsed = JSON.parse(ps.ballsStr);
        ballsRef.current = parsed;
      } catch (e) {
        console.error("Failed to parse pool balls:", e);
      }
    } else if (!ps?.ballsStr) {
      ballsRef.current = createDisciplineRack("8_BALL");
    }
  }, [ps?.ballsStr]);

  // Handle Switching Discipline
  const handleSelectDiscipline = useCallback(async (newDiscipline: PoolDiscipline) => {
    setDiscipline(newDiscipline);
    soundSynth.playSubtlePop();
    const newRack = createDisciplineRack(newDiscipline);
    ballsRef.current = newRack;
    setIsBallInHand(false);
    setIsPushOutDeclared(false);

    try {
      await firePoolShot(
        match.id,
        currentUid,
        0,
        0,
        newRack,
        {
          nextTurnUid: currentUid,
          p1Score: 0,
          p2Score: 0,
          actionLog: `🎯 Switched discipline to ${POOL_DISCIPLINES[newDiscipline].name}. Rack set!`,
        }
      );
    } catch (e) {
      console.error("Failed to update discipline rack:", e);
    }
  }, [currentUid, match.id]);

  // Determine assigned suit for active players (8-Ball)
  const p1Suit = ps?.p1Type || null; // "SOLIDS" | "STRIPES" | null
  const p2Suit = ps?.p2Type || null;
  const myAssignedSuit = isPlayer1 ? p1Suit : p2Suit;

  // Find lowest-numbered ball on table for rotation games (9-Ball & 10-Ball)
  const lowestBallOnTable = useMemo(() => {
    const unpocketed = ballsRef.current.filter((b) => b.type !== "cue" && !b.isPocketed && b.number !== undefined);
    if (unpocketed.length === 0) return null;
    return unpocketed.reduce((min, b) => ((b.number || 99) < (min.number || 99) ? b : min), unpocketed[0]);
  }, [ballsRef.current, ps?.ballsStr]);

  // Trigger AI Bot Shot in VS_COMPUTER mode
  useEffect(() => {
    if (!ps || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === ps.currentTurnUid && p.isBot
    );
    if (botPlayer && !isSimulatingRef.current) {
      executePoolBotShot(match);
    }
  }, [match, ps?.currentTurnUid]);

  // Main Canvas & Continuous Physics Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const updatePhysicsAndRender = () => {
      const balls = ballsRef.current;
      let anyMoving = false;

      // 1. Physics Sub-Stepping for High Accuracy & Continuous Collision
      const subSteps = 3;
      for (let step = 0; step < subSteps; step++) {
        balls.forEach((b) => {
          if (b.isPocketed) return;

          const speed = Math.hypot(b.vx, b.vy);
          if (speed > 0.05) {
            anyMoving = true;
            b.x += b.vx / subSteps;
            b.y += b.vy / subSteps;

            b.vx *= Math.pow(FRICTION, 1 / subSteps);
            b.vy *= Math.pow(FRICTION, 1 / subSteps);

            // Cushion Rebounds with Cushion Restitution & Rail Grip
            if (b.x - b.radius < PLAYABLE_MIN_X) {
              b.x = PLAYABLE_MIN_X + b.radius;
              b.vx = -b.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (b.x + b.radius > PLAYABLE_MAX_X) {
              b.x = PLAYABLE_MAX_X - b.radius;
              b.vx = -b.vx * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            if (b.y - b.radius < PLAYABLE_MIN_Y) {
              b.y = PLAYABLE_MIN_Y + b.radius;
              b.vy = -b.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            } else if (b.y + b.radius > PLAYABLE_MAX_Y) {
              b.y = PLAYABLE_MAX_Y - b.radius;
              b.vy = -b.vy * RESTITUTION;
              if (speed > 1.2) soundSynth.playSubtlePop();
            }

            // Pocket Gravity & Pocketing Check
            POCKETS.forEach((pkt) => {
              const dToPocket = Math.hypot(b.x - pkt.x, b.y - pkt.y);
              if (dToPocket < POCKET_RADIUS) {
                // Suction toward pocket hole
                const pullForce = 0.38;
                b.vx += ((pkt.x - b.x) / dToPocket) * pullForce;
                b.vy += ((pkt.y - b.y) / dToPocket) * pullForce;

                if (dToPocket < POCKET_DEPTH_RADIUS) {
                  b.isPocketed = true;
                  b.vx = 0;
                  b.vy = 0;
                  pocketedThisShotRef.current.push({ ...b });
                  pocketLocationsThisShotRef.current.push({ ball: { ...b }, pocketName: pkt.name });

                  if (b.type === "cue") {
                    cueScratchRef.current = true;
                    soundSynth.playBuzzer();
                  } else if (b.type === "8ball" || b.number === 9 || b.number === 10) {
                    soundSynth.playFanfare();
                  } else {
                    soundSynth.playSnare();
                  }
                }
              }
            });
          } else {
            b.vx = 0;
            b.vy = 0;
          }
        });

        // 2. Elastic Circle-to-Circle Collision Resolution
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            if (b1.isPocketed || b2.isPocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist && dist > 0.0001) {
              const nx = dx / dist;
              const ny = dy / dist;

              // Track First Contact for Rotation / Suit Legality
              if ((b1.type === "cue" || b2.type === "cue") && !firstContactBallRef.current) {
                firstContactBallRef.current = b1.type === "cue" ? b2 : b1;
              }

              // Positional Correction to Prevent Overlap Penetration
              const overlap = minDist - dist;
              b1.x -= nx * overlap * 0.5;
              b1.y -= ny * overlap * 0.5;
              b2.x += nx * overlap * 0.5;
              b2.y += ny * overlap * 0.5;

              // Relative Velocity along Normal
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              b1.vx -= p * nx * 0.96;
              b1.vy -= p * ny * 0.96;
              b2.vx += p * nx * 0.96;
              b2.vy += p * ny * 0.96;

              const hitSpeed = Math.hypot(kx, ky);
              if (hitSpeed > 0.8) soundSynth.playSubtlePop();
            }
          }
        }
      }

      // Check if Simulation Finished
      if (isSimulatingRef.current && !anyMoving) {
        isSimulatingRef.current = false;
        setIsSimulating(false);
        finalizeShotTurn();
      }

      // ── Render Luxury Pool Arena Canvas ──
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // A. Polished Hardwood Outer Bevel Rails & Corner Brass Plates
      ctx.fillStyle = "#1e1008";
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Inlaid Diamond Reference Markers
      ctx.fillStyle = "#fef08a";
      const diamondsX = [CUSHION + 45, CUSHION + 115, CUSHION + 185, CUSHION + 255, CUSHION + 325];
      const diamondsY = [CUSHION + 60, CUSHION + 140, CUSHION + 220, CUSHION + 300, CUSHION + 380];

      // Top & Bottom Rails Diamonds
      diamondsX.forEach((dx) => {
        if (dx > CUSHION && dx < TABLE_WIDTH - CUSHION) {
          ctx.beginPath();
          ctx.arc(dx, CUSHION / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dx, TABLE_HEIGHT - CUSHION / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Left & Right Rails Diamonds
      diamondsY.forEach((dy) => {
        if (dy > CUSHION && dy < TABLE_HEIGHT - CUSHION) {
          ctx.beginPath();
          ctx.arc(CUSHION / 2, dy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(TABLE_WIDTH - CUSHION / 2, dy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // B. Tournament Worsted Green Felt Bed
      const feltGrad = ctx.createRadialGradient(
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        40,
        TABLE_WIDTH / 2,
        TABLE_HEIGHT / 2,
        280
      );
      feltGrad.addColorStop(0, "#0d5c36");
      feltGrad.addColorStop(0.7, "#064e2e");
      feltGrad.addColorStop(1, "#04361f");

      ctx.fillStyle = feltGrad;
      ctx.fillRect(CUSHION, CUSHION, TABLE_WIDTH - CUSHION * 2, TABLE_HEIGHT - CUSHION * 2);

      // Felt Texture Subtle Shadow Borders
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(CUSHION, CUSHION, TABLE_WIDTH - CUSHION * 2, TABLE_HEIGHT - CUSHION * 2);

      // Head String Line (Kitchen)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(CUSHION, TABLE_HEIGHT - 120);
      ctx.lineTo(TABLE_WIDTH - CUSHION, TABLE_HEIGHT - 120);
      ctx.stroke();
      ctx.setLineDash([]);

      // Foot Spot Dot (Apex Spot)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(190, 140, 3, 0, Math.PI * 2);
      ctx.fill();

      // C. 6 Drop Pockets (Deep Leather Net Holes with Brass Rims)
      POCKETS.forEach((pkt) => {
        // Brass Rim Plates
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#854d0e";
        ctx.fill();

        // Deep Pocket Net Hole
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_DEPTH_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();

        // Pocket Inner Shadow Ring
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Highlight Designated Pockets in ONE POCKET mode
      if (discipline === "ONE_POCKET") {
        ctx.save();
        // P1 Pocket: BOT_LEFT
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(CUSHION, TABLE_HEIGHT - CUSHION, POCKET_RADIUS + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#34d399";
        ctx.font = "bold 8px monospace";
        ctx.fillText("P1 GOAL", CUSHION + 14, TABLE_HEIGHT - CUSHION - 16);

        // P2 Pocket: BOT_RIGHT
        ctx.strokeStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(TABLE_WIDTH - CUSHION, TABLE_HEIGHT - CUSHION, POCKET_RADIUS + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#60a5fa";
        ctx.fillText("P2 GOAL", TABLE_WIDTH - CUSHION - 20, TABLE_HEIGHT - CUSHION - 16);
        ctx.restore();
      }

      // D. Draw Tournament Balls with 3D Specular Shading & Numbers
      balls.forEach((b) => {
        if (b.isPocketed) return;

        ctx.save();
        // Drop Shadow
        ctx.beginPath();
        ctx.arc(b.x + 1.5, b.y + 2, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
        ctx.fill();

        // Pulsing Gold Target Halo for Lowest Ball in Rotation Games (9-Ball & 10-Ball)
        if ((discipline === "9_BALL" || discipline === "10_BALL") && lowestBallOnTable && lowestBallOnTable.id === b.id) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 2]);
          ctx.stroke();
        }

        // Ball Body
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        if (b.type === "cue") {
          // Pure White Cue Ball with Specular Glow
          const cueGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          cueGrad.addColorStop(0, "#ffffff");
          cueGrad.addColorStop(0.85, "#e5e7eb");
          cueGrad.addColorStop(1, "#9ca3af");
          ctx.fillStyle = cueGrad;
          ctx.fill();

          // Red Target Measurement Dot
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
        } else if (b.type === "8ball" || b.number === 8) {
          // Solid Black 8-Ball
          const blackGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          blackGrad.addColorStop(0, "#4b5563");
          blackGrad.addColorStop(0.4, "#111827");
          blackGrad.addColorStop(1, "#030712");
          ctx.fillStyle = blackGrad;
          ctx.fill();

          // Center White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.44, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("8", b.x, b.y + 0.5);
        } else if (b.type === "solid") {
          // Solid Color Ball (1-7)
          const col = BALL_COLORS[String(b.number)] || "#eab308";
          const sGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          sGrad.addColorStop(0, "#ffffff");
          sGrad.addColorStop(0.3, col);
          sGrad.addColorStop(1, "#09090b");
          ctx.fillStyle = sGrad;
          ctx.fill();

          // Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.44, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.number), b.x, b.y + 0.5);
        } else if (b.type === "stripe") {
          // Striped Ball (9-15)
          const col = BALL_COLORS[String(b.number)] || "#eab308";

          // White Base Ball
          const baseGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
          baseGrad.addColorStop(0, "#ffffff");
          baseGrad.addColorStop(0.7, "#f3f4f6");
          baseGrad.addColorStop(1, "#9ca3af");
          ctx.fillStyle = baseGrad;
          ctx.fill();

          // Center Colored Stripe Belt
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, -Math.PI / 3, Math.PI / 3);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
          ctx.fillStyle = col;
          ctx.fill();

          // Center White Number Circle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.46, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.number), b.x, b.y + 0.5);
        }
        ctx.restore();
      });

      // E. WPA Mathematical Ghost Ball & Tangent Trajectory System
      if (isAiming && dragStart && dragCurrent) {
        const cueBall = balls.find((b) => b.type === "cue");
        if (cueBall && !cueBall.isPocketed) {
          const pullDx = dragStart.x - dragCurrent.x;
          const pullDy = dragStart.y - dragCurrent.y;
          const aimDist = Math.hypot(pullDx, pullDy);

          if (aimDist > 2) {
            const dirX = pullDx / aimDist;
            const dirY = pullDy / aimDist;
            const rayMaxDist = 320;

            // Find closest object ball in line of aim (Ghost Ball Raycast)
            let closestT = rayMaxDist;
            let targetBall: PoolBall | null = null;
            const R2 = cueBall.radius * 2;

            for (const b of balls) {
              if (b.type === "cue" || b.isPocketed) continue;

              const Dx = cueBall.x - b.x;
              const Dy = cueBall.y - b.y;

              const dotD = dirX * Dx + dirY * Dy;
              const c = Dx * Dx + Dy * Dy - R2 * R2;
              const disc = dotD * dotD - c;

              if (disc >= 0) {
                const t = -dotD - Math.sqrt(disc);
                if (t > 0 && t < closestT) {
                  closestT = t;
                  targetBall = b;
                }
              }
            }

            ctx.save();
            if (targetBall) {
              const ghostX = cueBall.x + dirX * closestT;
              const ghostY = cueBall.y + dirY * closestT;

              // 1. Cue Ball to Ghost Ball Laser Ray
              ctx.beginPath();
              ctx.moveTo(cueBall.x, cueBall.y);
              ctx.lineTo(ghostX, ghostY);
              ctx.strokeStyle = "#34d399";
              ctx.setLineDash([5, 3]);
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // 2. Ghost Ball Circle at Impact Point
              ctx.beginPath();
              ctx.arc(ghostX, ghostY, cueBall.radius, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 2]);
              ctx.stroke();

              // 3. Object Ball Departure Path (Line of Centers Vector)
              const objDirX = targetBall.x - ghostX;
              const objDirY = targetBall.y - ghostY;
              const objDist = Math.hypot(objDirX, objDirY);

              if (objDist > 0.001) {
                const normObjX = objDirX / objDist;
                const normObjY = objDirY / objDist;

                ctx.beginPath();
                ctx.moveTo(targetBall.x, targetBall.y);
                ctx.lineTo(targetBall.x + normObjX * 120, targetBall.y + normObjY * 120);
                ctx.strokeStyle = "#fde047"; // Yellow Object Ball Path
                ctx.setLineDash([]);
                ctx.lineWidth = 2;
                ctx.stroke();

                // 4. Cue Ball 90-Degree Tangent Deflection Line
                const tangentX = -normObjY;
                const tangentY = normObjX;

                ctx.beginPath();
                ctx.moveTo(ghostX, ghostY);
                ctx.lineTo(ghostX + tangentX * 60, ghostY + tangentY * 60);
                ctx.moveTo(ghostX, ghostY);
                ctx.lineTo(ghostX - tangentX * 60, ghostY - tangentY * 60);
                ctx.strokeStyle = "rgba(56, 189, 248, 0.75)"; // Cyan 90-degree line
                ctx.lineWidth = 1.5;
                ctx.setLineDash([2, 2]);
                ctx.stroke();
              }
            } else {
              // Open Bank/Kick Shot Ray to Cushion
              ctx.beginPath();
              ctx.moveTo(cueBall.x, cueBall.y);
              ctx.lineTo(cueBall.x + dirX * rayMaxDist, cueBall.y + dirY * rayMaxDist);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
              ctx.setLineDash([4, 4]);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.restore();

            // F. Tournament Hardwood Cue Stick with Carbon Fiber Ferrule
            ctx.save();
            const cueStickLength = 160;
            const cueOffset = 18 + power * 0.4;
            const stickStartX = cueBall.x - dirX * cueOffset;
            const stickStartY = cueBall.y - dirY * cueOffset;
            const stickEndX = cueBall.x - dirX * (cueOffset + cueStickLength);
            const stickEndY = cueBall.y - dirY * (cueOffset + cueStickLength);

            const cueGrad = ctx.createLinearGradient(stickStartX, stickStartY, stickEndX, stickEndY);
            cueGrad.addColorStop(0, "#e5e7eb"); // Phenolic Tip / Ferrule
            cueGrad.addColorStop(0.08, "#1f2937"); // Carbon Joint
            cueGrad.addColorStop(0.3, "#b45309"); // Maple Forearm
            cueGrad.addColorStop(0.8, "#78350f"); // Hardwood Butt
            cueGrad.addColorStop(1, "#1c1917");

            ctx.beginPath();
            ctx.moveTo(stickStartX, stickStartY);
            ctx.lineTo(stickEndX, stickEndY);
            ctx.strokeStyle = cueGrad;
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(updatePhysicsAndRender);
    };

    animId = requestAnimationFrame(updatePhysicsAndRender);
    return () => cancelAnimationFrame(animId);
  }, [discipline, isAiming, dragStart, dragCurrent, power, lowestBallOnTable]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || isSimulating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Ball in Hand Placement Mode
    if (isBallInHand) {
      const cueBall = ballsRef.current.find((b) => b.type === "cue");
      if (cueBall) {
        cueBall.x = Math.max(PLAYABLE_MIN_X + cueBall.radius, Math.min(PLAYABLE_MAX_X - cueBall.radius, clickX));
        cueBall.y = Math.max(PLAYABLE_MIN_Y + cueBall.radius, Math.min(PLAYABLE_MAX_Y - cueBall.radius, clickY));
        cueBall.isPocketed = false;
        cueBall.vx = 0;
        cueBall.vy = 0;
        setIsBallInHand(false);
        soundSynth.playSubtlePop();
      }
      return;
    }

    // Aiming Initiation
    const cueBall = ballsRef.current.find((b) => b.type === "cue");
    if (cueBall && !cueBall.isPocketed) {
      setIsAiming(true);
      setDragStart({ x: clickX, y: clickY });
      setDragCurrent({ x: clickX, y: clickY });
      setPower(0);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || !dragStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    setDragCurrent({ x: curX, y: curY });

    const dist = Math.hypot(dragStart.x - curX, dragStart.y - curY);
    const calculatedPower = Math.min(100, Math.round((dist / 140) * 100));
    setPower(calculatedPower);
  };

  const handlePointerUp = () => {
    if (!isAiming || !dragStart || !dragCurrent) {
      setIsAiming(false);
      return;
    }

    const cueBall = ballsRef.current.find((b) => b.type === "cue");
    if (cueBall) {
      const pullDx = dragStart.x - dragCurrent.x;
      const pullDy = dragStart.y - dragCurrent.y;
      const pullDist = Math.hypot(pullDx, pullDy);

      if (pullDist > 4) {
        const forceMultiplier = 0.34;
        const impulseX = pullDx * forceMultiplier;
        const impulseY = pullDy * forceMultiplier;

        cueBall.vx = impulseX;
        cueBall.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        pocketLocationsThisShotRef.current = [];
        cueScratchRef.current = false;
        firstContactBallRef.current = null;

        // Check if this is the Break Shot
        const totalRemaining = ballsRef.current.filter((b) => b.type !== "cue" && !b.isPocketed).length;
        isBreakShotRef.current = totalRemaining === POOL_DISCIPLINES[discipline].ballsCount;

        isSimulatingRef.current = true;
        setIsSimulating(true);
      }
    }

    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
  };

  // Finalize Shot and Apply Official Discipline Rules
  const finalizeShotTurn = useCallback(async () => {
    const pocketed = pocketedThisShotRef.current;
    const pocketLocations = pocketLocationsThisShotRef.current;
    const isScratch = cueScratchRef.current;
    const balls = ballsRef.current;
    const isBreak = isBreakShotRef.current;
    const firstHit = firstContactBallRef.current;

    let nextTurnUid = ps?.currentTurnUid || currentUid;
    let newP1Score = ps?.p1Score || 0;
    let newP2Score = ps?.p2Score || 0;
    let newP1Type = ps?.p1Type || null;
    let newP2Type = ps?.p2Type || null;
    let actionLog = "";
    let isGameOver = false;
    let winnerUid = currentUid;
    const opponentUid = playerUids.find((id) => id !== currentUid) || currentUid;

    // Reset Cue Ball if Scratched
    const cueBall = balls.find((b) => b.type === "cue");
    if (cueBall) {
      cueBall.isPocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
      if (isScratch) {
        cueBall.x = TABLE_WIDTH / 2;
        cueBall.y = TABLE_HEIGHT - 110;
        setIsBallInHand(true);
      }
    }

    // ── DISCIPLINE SPECIFIC RESOLUTION ──

    if (discipline === "8_BALL") {
      const eightBallPocketed = pocketed.some((b) => b.type === "8ball");
      const solidsPocketed = pocketed.filter((b) => b.type === "solid").length;
      const stripesPocketed = pocketed.filter((b) => b.type === "stripe").length;
      const remainingSolids = balls.filter((b) => b.type === "solid" && !b.isPocketed).length;
      const remainingStripes = balls.filter((b) => b.type === "stripe" && !b.isPocketed).length;
      const myCurrentSuit = isPlayer1 ? newP1Type : newP2Type;
      const myRemainingGroupCount = myCurrentSuit === "SOLIDS" ? remainingSolids : myCurrentSuit === "STRIPES" ? remainingStripes : remainingSolids + remainingStripes;

      if (isBreak) {
        const totalPocketedOnBreak = solidsPocketed + stripesPocketed + (eightBallPocketed ? 1 : 0);
        const ballsCrossedHeadString = balls.filter((b) => b.type !== "cue" && !b.isPocketed && b.y > TABLE_HEIGHT - 120).length;
        const breakScore = totalPocketedOnBreak + ballsCrossedHeadString;
        if (breakScore >= 3 && !isScratch) {
          actionLog = `⚡ THREE-POINT BREAK PASSED (${totalPocketedOnBreak} pocketed + ${ballsCrossedHeadString} crossed)! Legal break.`;
        } else if (isScratch) {
          actionLog = `⚠️ BREAK SCRATCH! Opponent awarded Ball-in-Hand!`;
        } else {
          actionLog = `⚠️ SOFT BREAK (Score: ${breakScore}/3). Opponent may accept or pass back!`;
        }
      }

      if (isScratch) {
        soundSynth.playBuzzer();
        if (eightBallPocketed) {
          actionLog = "❌ 8-BALL SCRATCH FOUL! Instant loss.";
          isGameOver = true;
          winnerUid = opponentUid;
        } else {
          actionLog = "⚠️ SCRATCH! Cue ball in pocket. Opponent awarded Ball-in-Hand!";
          nextTurnUid = opponentUid;
        }
      } else if (eightBallPocketed) {
        if (myCurrentSuit && myRemainingGroupCount === 0) {
          actionLog = "🏆 8-BALL POCKETED LEGALLY! WPA CHAMPIONSHIP VICTORY!";
          isGameOver = true;
          winnerUid = currentUid;
          soundSynth.playFanfare();
        } else {
          actionLog = "❌ 8-Ball pocketed prematurely! Automatic frame loss.";
          isGameOver = true;
          winnerUid = opponentUid;
          soundSynth.playBuzzer();
        }
      } else if (solidsPocketed > 0 || stripesPocketed > 0) {
        if (!newP1Type && !newP2Type) {
          if (solidsPocketed > 0 && stripesPocketed === 0) {
            if (isPlayer1) { newP1Type = "SOLIDS"; newP2Type = "STRIPES"; }
            else { newP2Type = "SOLIDS"; newP1Type = "STRIPES"; }
            actionLog = `${match.players[currentUid]?.handle || "Player"} claimed SOLIDS!`;
          } else if (stripesPocketed > 0 && solidsPocketed === 0) {
            if (isPlayer1) { newP1Type = "STRIPES"; newP2Type = "SOLIDS"; }
            else { newP2Type = "STRIPES"; newP1Type = "SOLIDS"; }
            actionLog = `${match.players[currentUid]?.handle || "Player"} claimed STRIPES!`;
          }
        }

        const assignedTargetPocketed =
          (myCurrentSuit === "SOLIDS" && solidsPocketed > 0) ||
          (myCurrentSuit === "STRIPES" && stripesPocketed > 0) ||
          (!myCurrentSuit);

        if (assignedTargetPocketed) {
          const count = solidsPocketed + stripesPocketed;
          if (isPlayer1) newP1Score += count * 10;
          else newP2Score += count * 10;
          actionLog = `Pocketed ${count} ball(s)! Turn continues!`;
          nextTurnUid = currentUid;
        } else {
          actionLog = "Pocketed opponent's ball. Turn passes.";
          nextTurnUid = opponentUid;
        }
      } else {
        nextTurnUid = opponentUid;
        actionLog = isPushOutDeclared ? "✋ PUSH-OUT EXECUTED! Opponent may accept table or pass back." : "No ball pocketed. Turn passes.";
        setIsPushOutDeclared(false);
      }
    } else if (discipline === "9_BALL") {
      const nineBallPocketed = pocketed.some((b) => b.number === 9);
      const isLegalHit = !firstHit || (lowestBallOnTable && firstHit.number === lowestBallOnTable.number);

      if (isScratch || !isLegalHit) {
        soundSynth.playBuzzer();
        actionLog = isScratch ? "⚠️ SCRATCH! Ball-in-Hand for opponent." : `⚠️ FOUL! Failed to hit lowest ball (#${lowestBallOnTable?.number}) first.`;
        nextTurnUid = opponentUid;
      } else if (nineBallPocketed) {
        actionLog = "🏆 9-BALL LEGALLY POCKETED! VICTORY!";
        isGameOver = true;
        winnerUid = currentUid;
        soundSynth.playFanfare();
      } else if (pocketed.length > 0) {
        const count = pocketed.length;
        if (isPlayer1) newP1Score += count * 10;
        else newP2Score += count * 10;
        actionLog = `Legally pocketed ${count} ball(s)! Turn continues!`;
        nextTurnUid = currentUid;
      } else {
        nextTurnUid = opponentUid;
        actionLog = "No ball pocketed. Turn passes.";
      }
    } else if (discipline === "10_BALL") {
      const tenBallPocketed = pocketed.some((b) => b.number === 10);
      const isLegalHit = !firstHit || (lowestBallOnTable && firstHit.number === lowestBallOnTable.number);

      if (isScratch || !isLegalHit) {
        soundSynth.playBuzzer();
        actionLog = isScratch ? "⚠️ SCRATCH! Ball-in-Hand for opponent." : `⚠️ FOUL! Failed to hit lowest ball (#${lowestBallOnTable?.number}) first.`;
        nextTurnUid = opponentUid;
      } else if (tenBallPocketed) {
        actionLog = "🏆 10-BALL LEGALLY POCKETED! CHAMPIONSHIP VICTORY!";
        isGameOver = true;
        winnerUid = currentUid;
        soundSynth.playFanfare();
      } else if (pocketed.length > 0) {
        const count = pocketed.length;
        if (isPlayer1) newP1Score += count * 10;
        else newP2Score += count * 10;
        actionLog = `Legally pocketed ${count} ball(s)! Turn continues!`;
        nextTurnUid = currentUid;
      } else {
        nextTurnUid = opponentUid;
        actionLog = "No ball pocketed. Turn passes.";
      }
    } else if (discipline === "STRAIGHT_POOL") {
      if (isScratch) {
        soundSynth.playBuzzer();
        actionLog = "⚠️ SCRATCH! -1 Point deduction and Ball-in-Hand.";
        if (isPlayer1) newP1Score = Math.max(0, newP1Score - 1);
        else newP2Score = Math.max(0, newP2Score - 1);
        nextTurnUid = opponentUid;
      } else if (pocketed.length > 0) {
        const count = pocketed.length;
        if (isPlayer1) newP1Score += count;
        else newP2Score += count;
        actionLog = `Scored +${count} point(s)! High run continues!`;
        nextTurnUid = currentUid;

        const remainingCount = balls.filter((b) => b.type !== "cue" && !b.isPocketed).length;
        if (remainingCount <= 1 || newP1Score >= 15 || newP2Score >= 15) {
          actionLog = `🏆 STRAIGHT POOL TARGET REACHED! Winner: ${match.players[currentUid]?.handle || "Player"}!`;
          isGameOver = true;
          winnerUid = currentUid;
          soundSynth.playFanfare();
        }
      } else {
        nextTurnUid = opponentUid;
        actionLog = "No ball pocketed. Turn passes.";
      }
    } else if (discipline === "ONE_POCKET") {
      const myDesignatedPocket = isPlayer1 ? "BOT_LEFT" : "BOT_RIGHT";
      const legalScored = pocketLocations.filter((item) => item.pocketName === myDesignatedPocket).length;

      if (isScratch) {
        soundSynth.playBuzzer();
        actionLog = "⚠️ SCRATCH! Ball-in-Hand for opponent.";
        nextTurnUid = opponentUid;
      } else if (legalScored > 0) {
        if (isPlayer1) newP1Score += legalScored;
        else newP2Score += legalScored;
        actionLog = `Scored +${legalScored} ball(s) in designated pocket (${myDesignatedPocket})!`;
        nextTurnUid = currentUid;

        const currentScore = isPlayer1 ? newP1Score : newP2Score;
        if (currentScore >= 8) {
          actionLog = `🏆 8 BALLS SCORED IN DESIGNATED POCKET! ONE POCKET VICTORY!`;
          isGameOver = true;
          winnerUid = currentUid;
          soundSynth.playFanfare();
        }
      } else {
        nextTurnUid = opponentUid;
        actionLog = "No ball scored in designated pocket. Turn passes.";
      }
    }

    await firePoolShot(
      match.id,
      currentUid,
      0,
      0,
      balls,
      {
        nextTurnUid,
        p1Score: newP1Score,
        p2Score: newP2Score,
        actionLog,
        isGameOver,
        winnerUid,
      }
    );
  }, [currentUid, discipline, isPlayer1, isPushOutDeclared, lowestBallOnTable, match.id, match.players, playerUids, ps]);

  // Inventory of remaining balls
  const balls = ballsRef.current;
  const remainingSolids = balls.filter((b) => b.type === "solid" && !b.isPocketed).length;
  const remainingStripes = balls.filter((b) => b.type === "stripe" && !b.isPocketed).length;
  const isEightBallOnTable = balls.some((b) => b.type === "8ball" && !b.isPocketed);
  const activeDisciplineConfig = POOL_DISCIPLINES[discipline];

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(16,185,129,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.5)] text-lg">
            {activeDisciplineConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                {activeDisciplineConfig.name}
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded">
                {activeDisciplineConfig.badge}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[ps?.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR SHOT" : "OPPONENT'S SHOT"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Push-Out Declaration Button (Available on Shot #2) */}
          {isMyTurn && !isSimulating && (
            <button
              type="button"
              onClick={() => {
                setIsPushOutDeclared(!isPushOutDeclared);
                soundSynth.playSubtlePop();
              }}
              className={`px-2.5 py-1.5 border font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1 ${
                isPushOutDeclared
                  ? "bg-amber-500 text-black border-amber-400 font-black shadow-md animate-pulse"
                  : "border-neutral-700 bg-black hover:border-amber-400 text-amber-300"
              }`}
              title="Declare Push-Out shot immediately after break"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>{isPushOutDeclared ? "PUSH ACTIVE" : "PUSH-OUT"}</span>
            </button>
          )}

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
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="pool" />

      {/* ── 5 Popular Pool Disciplines Interactive Selector ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase">
          <span>CHOOSE POPULAR POOL DISCIPLINE (TOP 5):</span>
          <span className="text-emerald-400">{activeDisciplineConfig.winCondition}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 bg-black/90 p-1.5 rounded-xl border border-emerald-500/40 shadow-inner">
          {(Object.keys(POOL_DISCIPLINES) as PoolDiscipline[]).map((key) => {
            const disc = POOL_DISCIPLINES[key];
            const isSelected = discipline === key;
            return (
              <button
                key={disc.id}
                type="button"
                onClick={() => handleSelectDiscipline(disc.id)}
                className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.7)] scale-[1.03]"
                    : "bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-600 hover:text-white"
                }`}
                title={disc.description}
              >
                <span className="text-base">{disc.icon}</span>
                <span className="truncate w-full text-center leading-none text-[9px] font-black">{disc.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY ON MIC
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
                  handle: `@POOL_SHARK_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Pool:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Dynamic Discipline Status & Ball Inventory HUD ── */}
      {discipline === "8_BALL" && (
        <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
          {/* Solids (1-7) */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-yellow-400 font-bold uppercase flex items-center gap-1">
              🟡 SOLIDS (1-7)
            </span>
            <span className="text-lg font-black text-white font-mono">{remainingSolids} / 7</span>
            <span className="text-[8px] text-neutral-400">
              {p1Suit === "SOLIDS" ? "PLAYER 1" : p2Suit === "SOLIDS" ? "PLAYER 2" : "OPEN TABLE"}
            </span>
          </div>

          {/* 8-Ball (Black) */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-700 space-y-0.5">
            <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
              🎱 8-BALL
            </span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {isEightBallOnTable ? "ON TABLE" : "POCKETED"}
            </span>
            <span className="text-[8px] text-emerald-300">POCKET LAST TO WIN</span>
          </div>

          {/* Stripes (9-15) */}
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
              🔵 STRIPES (9-15)
            </span>
            <span className="text-lg font-black text-white font-mono">{remainingStripes} / 7</span>
            <span className="text-[8px] text-neutral-400">
              {p1Suit === "STRIPES" ? "PLAYER 1" : p2Suit === "STRIPES" ? "PLAYER 2" : "OPEN TABLE"}
            </span>
          </div>
        </div>
      )}

      {(discipline === "9_BALL" || discipline === "10_BALL") && (
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
              🎯 CURRENT TARGET BALL (LOWEST)
            </span>
            <span className="text-lg font-black text-amber-300 font-mono">
              BALL #{lowestBallOnTable?.number ?? "NONE"}
            </span>
            <span className="text-[8px] text-neutral-400">MUST STRIKE FIRST TO BE LEGAL</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
              🏆 WINNING MONEY BALL
            </span>
            <span className="text-lg font-black text-emerald-300 font-mono">
              {discipline === "9_BALL" ? "9-BALL" : "10-BALL"}
            </span>
            <span className="text-[8px] text-neutral-400">LEGALLY POCKET TO WIN FRAME</span>
          </div>
        </div>
      )}

      {discipline === "STRAIGHT_POOL" && (
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase">PLAYER 1 RUN SCORE</span>
            <span className="text-xl font-black text-white font-mono">{ps?.p1Score || 0} / 15 PTS</span>
            <span className="text-[8px] text-neutral-400">+1 PT PER LEGALLY POCKETED BALL</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase">PLAYER 2 RUN SCORE</span>
            <span className="text-xl font-black text-white font-mono">{ps?.p2Score || 0} / 15 PTS</span>
            <span className="text-[8px] text-neutral-400">14-BALL CONTINUOUS RE-RACK</span>
          </div>
        </div>
      )}

      {discipline === "ONE_POCKET" && (
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 text-center">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/50 space-y-0.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase">P1 GOAL: BOT-LEFT POCKET</span>
            <span className="text-xl font-black text-emerald-300 font-mono">{ps?.p1Score || 0} / 8 BALLS</span>
            <span className="text-[8px] text-neutral-300">RACE TO 8 BALLS TO WIN</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-950/40 border border-blue-500/50 space-y-0.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase">P2 GOAL: BOT-RIGHT POCKET</span>
            <span className="text-xl font-black text-blue-300 font-mono">{ps?.p2Score || 0} / 8 BALLS</span>
            <span className="text-[8px] text-neutral-300">RACE TO 8 BALLS TO WIN</span>
          </div>
        </div>
      )}

      {/* Action Telemetry Log */}
      {ps?.lastActionLog && (
        <div className="border border-emerald-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{ps.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe Pool Table Canvas ── */}
      <div className="relative aspect-[380/480] max-w-[380px] sm:max-w-[400px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#1a0b04] via-[#2b1006] to-[#0f0502] border-4 border-[#451e0f] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />

        {/* Ball in Hand Alert Floating Badge */}
        {isBallInHand && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-bounce shadow-lg">
            ✋ BALL-IN-HAND: TAP ANYWHERE ON TABLE TO PLACE CUE BALL
          </div>
        )}
      </div>

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>CUE STRIKE VELOCITY &amp; TENSION:</span>
          <span className="text-emerald-400 font-mono font-black">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-400 text-center pt-1 font-mono">
          {isMyTurn
            ? "DRAG CUE BALL BACKWARD TO AIM & SET POWER ➔ GHOST BALL SHOWS 90° DEFLECTION ➔ RELEASE TO STRIKE!"
            : "WAITING FOR OPPONENT TO AIM & STRIKE..."}
        </p>
      </div>

      {/* ── WPA Pro Diamond Kicking & Advanced Physics Guide HUD ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProPhysics(!showProPhysics)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-emerald-400" />
            🎱 WPA PRO DIAMOND SYSTEMS (CORNER-5, PLUS SYSTEM &amp; 3-POINT BREAK)
          </span>
          {showProPhysics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProPhysics && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">1. ⚡ THREE-POINT BREAK RULE:</span>
              Total score: Pocketed Balls + Crossed Head-String Balls &ge; 3. Prevents soft breaking!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">2. 📐 1-RAIL &amp; 2-RAIL PLUS SYSTEM:</span>
              1-Rail: Aim through midpoint M. 2-Rail: 1st Rail Aim = Target Arrival - Cue Origin.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">3. 🎯 3-RAIL &amp; 4-RAIL CORNER-5 SYSTEM:</span>
              1st Rail Aim = Origin - 3rd Rail Arrival. 4th Cushion Shift: T4 = T3 + (Origin - 50) / 4.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">4. 🏎️ SPEED DRIFT &amp; CUSHION COMPRESSION:</span>
              Soft stroke (widens +0.5 to 1.0 diamond) ➔ Aim 2-4 pts lower. Hard stroke ➔ Aim 3-6 pts higher.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">5. 🔄 THE TIKI SHOT (RAIL-FIRST CAROM):</span>
              Rail ➔ Object Ball ➔ Same Cushion. Squeeze clearance with inside spin and gap offset.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">6. 🔀 THE RENVERSE (REVERSE CORNER SYSTEM):</span>
              Aim = (Origin &times; Target) / 100 (Max Reverse English). 90° corner turn transforms reverse spin into Super-Running propulsion!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">7. ⚡ GRAND TRAVERSE (DOUBLE-CHECK ZIG-ZAG):</span>
              Aim = Origin + (Distance / 2) with 3 tips reverse English across parallel long rails for a tight symmetric Z-path.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">8. ☂️ UMBRELLA SHOT (PARAPLUIE):</span>
              Aim = Arrival_3 - Origin. High follow curves into 2nd rail; running English expands canopy across long rails.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">9. 🦋 BUTTERFLY SYSTEM (LE PAPILLON 5-CUSHION):</span>
              Aim = (Origin + Target_4) / 2. Figure-8 double-crossing trajectory connecting diagonally opposite corners!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">10. ➕ PLUS-TWO SYSTEM &amp; BRICOLE:</span>
              Aim = Target_3 - Origin. Short ➔ Long rail with running English yields +2 diamonds forward bounce expansion.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">11. 📐 K-SYSTEM (SHORT-ANGLE QUADRANT):</span>
              Aim = (Origin &times; Arrival_2) / 100 or Aim = Origin - 2T. Tight 2-cushion quadrant calculations.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">12. ⚪ DEAD-BALL (NO-SPIN SPECULAR):</span>
              Aim = (Origin + Arrival) / 2. Center-ball stun eliminates squirt/swerve with pure specular reflection.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">13. 🖐️ FIVE-BALL SYSTEM (STUN 90° TANGENT):</span>
              Aim = (Origin &times; Arrival_2) / 5. Pure sliding stun (-0.5 tips low, 0 sidespin) for exact 90° tangent caroms.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">14. ⚡ ROJANO SYSTEM (REVERSE-STUN CAROMS):</span>
              Aim = Origin - Arrival. Low reverse English checks 1st cushion and inverts to running on 2nd rail.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">15. 🪞 SARDA SYSTEM (LONG-RAIL REVERSE WRAP):</span>
              Aim (Long Rail) = Origin - (Arrival_3 &times; 1.5). Long ➔ Short ➔ Long carom with max reverse English.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">16. 🔄 SARDA VS RENVERSE TACTICAL MATRIX:</span>
              Sarda (Long-First) for OB1 along rails &amp; deep linear track (10-30). Renverse (Short-First) for wide sweeping center arcs (20-55).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">17. 🛡️ CUSHION-FIRST BRICOLE REVERSE CAROM:</span>
              Aim = ((Origin + Projection_OB1) / 2) - C_rev. Reverse spin checks 1st rail to pocket or carom blocked, tucked balls!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">18. 🎯 PIQUÉ (VERTICAL MASSÉ &amp; HOOK ESCAPES):</span>
              60°-85° cue elevation dart strike imparts heavy rotation with low translation, curving around snookers via cloth friction!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">19. ⚖️ WPA TOURNAMENT JUMP &amp; FOUL LAWS:</span>
              Downward compression on top hemisphere only (Rule 6.7, cue &ge; 40 in). Shovel/scoop under equator is an automatic foul!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">20. 📹 REFEREE FROZEN-BALL &amp; VAR PROTOCOL:</span>
              Gap &lt; 5mm requires &ge; 45° elevation or 90° tangent cut to avoid double-hit foul. 120-1000 fps high-speed VAR review standard.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">21. 🚀 JUMP BALLISTICS &amp; PARABOLIC TRAJECTORY:</span>
              v0x = J cos(&theta;)/m, v0z = e_slate &times; J sin(&theta;)/m. Parabolic arc clears 57.15mm blockers with downward compression!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">22. 🪂 TOUCHDOWN DAMPENING &amp; POST-LANDING SPIN:</span>
              Micro-hops decay by ~50% per bounce. Airborne spin L = I&omega; is conserved in flight, engaging draw/follow/swerve on touchdown!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">23. 🎯 DART-GRIP VS PENDULUM BIOMECHANICS:</span>
              Dart-Grip (60°-85° wrist snap &amp; high tripod) for 2-8&quot; tight snookers; Pendulum (30°-55° elbow hinge) for long jumps with spin control!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">24. 🔬 PHENOLIC JUMP ENGINEERING &amp; DWELL TIME:</span>
              Phenolic tips (95+ Shore D, e&approx;0.90) cut dwell time to &le; 1.8ms to prevent double-hits. Conical 14mm taper resists buckling.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">25. ⚡ CARBON FIBER VS WOOD BREAK SHAFTS:</span>
              Carbon fiber (E=130-230 GPa, low end-mass 12-16g) yields 92-96% energy transfer efficiency and low squirt vs maple (22-28g).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">26. 💥 10-BALL BREAK CONTROL DYNAMICS:</span>
              Controlled 19.5-22.5 mph speed with 3°-5.5° cut angle transfers 92-96% energy, parking the cue ball center while potting the 1-ball side!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">27. 📄 TEMPLATE RACKS &amp; 1,500 M/S SHOCKWAVE:</span>
              Mylar cutouts establish 100% frozen tangency (&delta;=0). Impulse propagates at 1,500 m/s with 90-95% efficiency, eliminating slug racks!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">28. 📦 MATCHROOM BREAK BOX &amp; 3-POINT RULE:</span>
              Break Box (central 50% width inside kitchen) + 3-Point Rule (Pocketed + Crossed &ge; 3) eliminates soft breaks and guarantees high-energy dispersion!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">29. ✋ PUSH-OUT GAME THEORY &amp; EV EQUILIBRIUM:</span>
              Shot #2 Cake-Cutting principle targets EV_Opponent &approx; EV_Shooter. Exploit asymmetric jump, kick, and safety skill advantages!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">30. 🛡️ 5 ELITE SAFETY COUNTER-STRATEGIES:</span>
              1. Full-Table Split 2. Thin Feather Snooker 3. Rail-Freeze Drag (draw cancels bounce) 4. Pocket-Jaw Trap 5. Two-Way Containment!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">31. 🪞 SPOT-ON-THE-WALL OPTICAL KICKING:</span>
              Planar mirror reflection: project target distance d past cushion nose (P_virtual = P_cushion + (P_cushion - P_target)) with dead-center stun!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">32. 📏 1-CUSHION PARALLEL SHIFT SYSTEM:</span>
              Baseline midpoint M ➔ 90° rail node ➔ lateral shift to CB. For unequal depths, shift aim &Delta;x &approx; |d1 - d2| / 4 toward closer ball!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">33. 📐 2-CUSHION PARALLEL SHIFT (CORNER INVERSION):</span>
              Corner-to-target line: midpoint M ➔ corner vertex ➔ parallel shift to CB. Inverts rays parallel to corner line without math!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">34. ➕ PLUS SYSTEM (AIM = ARRIVAL - ORIGIN):</span>
              Diamond arithmetic with 2-2.5 tips running English delivers exact multi-rail tracks; use Parallel Shift for rapid visual escapes.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">35. 🔄 CORNER-5 VS PLUS SYSTEM DUALITY:</span>
              Corner-5 (Subtraction: Aim = Origin - Arrival) routes perimeter loops from long rail; Plus System (Addition: Arrival = Origin + Aim) routes corner wraps from short rail.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-emerald-400 font-bold block mb-0.5">36. 🧪 50-TO-20 BENCHMARK &amp; CLOTH CALIBRATION:</span>
              Shoot 50 ➔ 30 with 2 tips spin (expects 20). If table plays long (+&Delta;) or short (-&Delta;), adjust: Aim = (Origin - Arrival) - &Delta;!
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#10b981]" />
          <h2 className="text-xl font-black text-emerald-300 uppercase tracking-widest">
            🏆 {activeDisciplineConfig.name.toUpperCase()} VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You dominated the table in ${activeDisciplineConfig.name} and earned +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
