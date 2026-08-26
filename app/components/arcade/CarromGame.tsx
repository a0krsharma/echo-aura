"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fireCarromShot, type ArcadeMatch, type CarromPiece } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  HelpCircle,
  Users,
  Sparkles,
  Zap,
  Flame,
  Crown,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Target,
  Compass,
  RotateCcw,
  Sparkle,
} from "lucide-react";

interface CarromGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const BOARD_SIZE = 400;
const FRAME_THICKNESS = 20;
const PLAYABLE_MIN = FRAME_THICKNESS + 2;
const PLAYABLE_MAX = BOARD_SIZE - FRAME_THICKNESS - 2;

// 4 Tournament Corner Pockets
const POCKETS = [
  { x: 30, y: 30, name: "TOP_LEFT" },
  { x: BOARD_SIZE - 30, y: 30, name: "TOP_RIGHT" },
  { x: 30, y: BOARD_SIZE - 30, name: "BOT_LEFT" },
  { x: BOARD_SIZE - 30, y: BOARD_SIZE - 30, name: "BOT_RIGHT" },
];
const POCKET_MOUTH_RADIUS = 28;
const POCKET_DROP_RADIUS = 18;

// ── 4 Core Carrom Striking Grips ──────────────────────────────────────────────
export type CarromGrip = "INDEX" | "MIDDLE_STRAIGHT" | "SCISSORS_KAINCHI" | "THUMB_FLICK";

export interface CarromGripConfig {
  id: CarromGrip;
  name: string;
  shortName: string;
  icon: string;
  badge: string;
  powerMultiplier: number;
  cutAuthority: number;
  description: string;
}

export const CARROM_GRIPS: Record<CarromGrip, CarromGripConfig> = {
  INDEX: {
    id: "INDEX",
    name: "Index Finger Flick (Direct Point)",
    shortName: "Index Flick",
    icon: "☝️",
    badge: "Max Accuracy",
    powerMultiplier: 1.0,
    cutAuthority: 1.0,
    description: "Thumb locks index tip. Delivers pinpoint straight-line accuracy, controlled deceleration, and low scratch risk.",
  },
  MIDDLE_STRAIGHT: {
    id: "MIDDLE_STRAIGHT",
    name: "Middle Finger / Straight Grip (Max Power)",
    shortName: "Middle (Power)",
    icon: "🖕",
    badge: "100% Kinetic Break",
    powerMultiplier: 1.25,
    cutAuthority: 1.05,
    description: "Long middle finger lever drives through equator with +25% kinetic impulse for cluster splitting and long frame rebounds.",
  },
  SCISSORS_KAINCHI: {
    id: "SCISSORS_KAINCHI",
    name: "Scissors Grip (Kainchi / Acute Cuts)",
    shortName: "Kainchi (Cut)",
    icon: "✂️",
    badge: "Sharp 60°+ Tangents",
    powerMultiplier: 0.95,
    cutAuthority: 1.35,
    description: "Middle over index interlock. Snaps along angled sweeping arcs for extreme acute slices (≥ 60°) into near pockets.",
  },
  THUMB_FLICK: {
    id: "THUMB_FLICK",
    name: "Thumb Flick (Reverse & Baseline)",
    shortName: "Thumb Flick",
    icon: "👍",
    badge: "Reverse Strike",
    powerMultiplier: 1.1,
    cutAuthority: 1.15,
    description: "Thumb curled under palm snaps backward. Perfect for striking pieces resting behind or touching the baseline.",
  },
};

// ── Surface Powder Chemistry Physics ──────────────────────────────────────────
export type CarromPowder = "BORIC_ACID" | "DISCO_POLYMER";

export interface CarromPowderConfig {
  id: CarromPowder;
  name: string;
  friction: number;
  restitution: number;
  badge: string;
  description: string;
}

export const CARROM_POWDERS: Record<CarromPowder, CarromPowderConfig> = {
  BORIC_ACID: {
    id: "BORIC_ACID",
    name: "Boric Acid (ICF Standard)",
    friction: 0.985,
    restitution: 0.88,
    badge: "ICF Tournament Grade",
    description: "Hexagonal planar crystalline sheets create controlled dry slip planes (μk ≈ 0.08–0.12) for tactile cut control.",
  },
  DISCO_POLYMER: {
    id: "DISCO_POLYMER",
    name: "Disco Super-Glide (Polymer)",
    friction: 0.992,
    restitution: 0.92,
    badge: "Micro Ball-Bearings",
    description: "Microscopic polymer beads (20–50 μm) eliminate friction (μk < 0.04) for blazing rebounds and ultra-fast gliding.",
  },
};

export default function CarromGame({ match, currentUid }: CarromGameProps) {
  const [activeGrip, setActiveGrip] = useState<CarromGrip>("MIDDLE_STRAIGHT");
  const [activePowder, setActivePowder] = useState<CarromPowder>("BORIC_ACID");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cs = match.carromState;
  const isMyTurn = (cs?.currentTurnUid === currentUid || !cs?.currentTurnUid) && match.status === "PLAYING";
  const playerUids = Object.keys(match.players || {});
  const isPlayer1 = playerUids[0] === currentUid;
  const myTargetColor = isPlayer1 ? "white" : "black";

  // Aiming, Controls and UI State
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [strikerBaselineX, setStrikerBaselineX] = useState(BOARD_SIZE / 2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [slamDeclared, setSlamDeclared] = useState<string | null>(null);

  // Stable Sync Refs
  const matchRef = useRef(match);
  matchRef.current = match;
  const csRef = useRef(cs);
  csRef.current = cs;
  const currentUidRef = useRef(currentUid);
  currentUidRef.current = currentUid;
  const activeGripRef = useRef(activeGrip);
  activeGripRef.current = activeGrip;
  const activePowderRef = useRef(activePowder);
  activePowderRef.current = activePowder;

  const dragStartRef = useRef(dragStart);
  dragStartRef.current = dragStart;
  const dragCurrentRef = useRef(dragCurrent);
  dragCurrentRef.current = dragCurrent;
  const isAimingRef = useRef(isAiming);
  isAimingRef.current = isAiming;
  const powerRef = useRef(power);
  powerRef.current = power;
  const strikerBaselineXRef = useRef(strikerBaselineX);
  strikerBaselineXRef.current = strikerBaselineX;

  // Local physics pieces state
  const piecesRef = useRef<CarromPiece[]>([]);
  const isSimulatingRef = useRef(false);
  const activeShooterUidRef = useRef<string>(currentUid);
  const watchdogTimerRef = useRef<any>(null);
  const pocketedThisShotRef = useRef<CarromPiece[]>([]);
  const strikerFoulRef = useRef(false);
  const turnCountRef = useRef<number>(1);

  // Sync pieces from match state
  useEffect(() => {
    if (cs?.piecesStr && !isSimulatingRef.current) {
      try {
        const parsed = JSON.parse(cs.piecesStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          piecesRef.current = parsed;
        }
      } catch (e) {
        console.error("Failed to parse carrom pieces:", e);
      }
    }
  }, [cs?.piecesStr]);

  // Determine active baseline Y
  const currentTurnUid = cs?.currentTurnUid || playerUids[0];
  const isTurnPlayer1 = playerUids[0] === currentTurnUid;
  const activeBaselineY = isTurnPlayer1 ? BOARD_SIZE - 55 : 55;

  // Safety Unlock Failsafe
  const forceUnlockTurn = useCallback(() => {
    piecesRef.current.forEach((p) => {
      p.vx = 0;
      p.vy = 0;
    });
    isSimulatingRef.current = false;
    setIsSimulating(false);
    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
    setPower(0);
    soundSynth.playSubtlePop();
  }, []);

  // Finalize Shot and Apply Official ICF Rules
  const finalizeShotTurn = useCallback(async () => {
    const latestMatch = matchRef.current;
    const latestCs = latestMatch.carromState;
    const currentActiveUid = currentUidRef.current;

    const pocketed = [...pocketedThisShotRef.current];
    const isStrikerPocketed = strikerFoulRef.current;
    const pieces = piecesRef.current;

    const currentPlayersList = Object.keys(latestMatch.players || {});
    const shooterUid = activeShooterUidRef.current || latestCs?.currentTurnUid || currentActiveUid;
    const isShooterP1 = currentPlayersList[0] === shooterUid;
    const otherPlayerUid = currentPlayersList.find((id) => id !== shooterUid) || currentActiveUid;
    const shooterHandle = latestMatch.players[shooterUid]?.handle || "Shooter";
    const shooterColor = isShooterP1 ? "white" : "black";

    let nextTurnUid = otherPlayerUid;
    let newP1Score = latestCs?.p1Score || 0;
    let newP2Score = latestCs?.p2Score || 0;
    let newQueenCovered = latestCs?.queenCovered || false;
    let newQueenCoverAttempt = latestCs?.queenCoverAttempt || false;
    let newDueCount = latestCs?.dueCount || 0;
    let actionLog = "";
    let isGameOver = false;
    let winnerUid = shooterUid;

    const ownColorPocketed = pocketed.filter((p) => p.type === shooterColor).length;
    const opponentColorPocketed = pocketed.filter((p) => p.type === (shooterColor === "white" ? "black" : "white")).length;
    const queenPocketed = pocketed.some((p) => p.type === "queen");

    const remainingWhite = pieces.filter((p) => p.type === "white" && !p.isPocketed).length;
    const remainingBlack = pieces.filter((p) => p.type === "black" && !p.isPocketed).length;
    const isQueenOnBoard = pieces.some((p) => p.type === "queen" && !p.isPocketed);

    // 1. Foul: Striker in Pocket (Scratch)
    if (isStrikerPocketed) {
      soundSynth.playBuzzer();
      newDueCount += 1;
      actionLog = `⚠️ FOUL! Striker pocketed by ${shooterHandle}. 1 Due penalty owed!`;
      nextTurnUid = otherPlayerUid;

      // Respot queen if potted with scratch
      if (queenPocketed) {
        const queen = pieces.find((p) => p.type === "queen");
        if (queen) {
          queen.isPocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
          queen.vx = 0;
          queen.vy = 0;
        }
        newQueenCoverAttempt = false;
      }
    }
    // 2. Queen Execution & Cover Adjudication
    else if (newQueenCoverAttempt) {
      if (ownColorPocketed > 0) {
        newQueenCovered = true;
        newQueenCoverAttempt = false;
        actionLog = `👑 QUEEN COVERED by ${shooterHandle}! +3 Queen bonus secured. Turn continues!`;
        soundSynth.playFanfare();
        nextTurnUid = shooterUid; // COVERED -> KEEPS SHOOTING!
      } else {
        newQueenCoverAttempt = false;
        const queen = pieces.find((p) => p.type === "queen");
        if (queen) {
          queen.isPocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
          queen.vx = 0;
          queen.vy = 0;
        }
        actionLog = `⚠️ QUEEN NOT COVERED! Returned to center circle. Turn passes.`;
        nextTurnUid = otherPlayerUid;
      }
    } else if (queenPocketed) {
      if (ownColorPocketed > 0) {
        newQueenCovered = true;
        actionLog = `👑 QUEEN POCKETED & COVERED in same stroke by ${shooterHandle}! Turn continues!`;
        soundSynth.playFanfare();
        nextTurnUid = shooterUid;
      } else {
        newQueenCoverAttempt = true;
        actionLog = `👑 QUEEN POCKETED by ${shooterHandle}! Must pocket ${shooterColor.toUpperCase()} on next shot to cover!`;
        nextTurnUid = shooterUid; // SANK QUEEN -> TAKES COVER SHOT!
      }
    }
    // 3. Normal Potting Success
    else if (ownColorPocketed > 0) {
      if (isShooterP1) newP1Score += ownColorPocketed;
      else newP2Score += ownColorPocketed;

      actionLog = `${shooterHandle} pocketed ${ownColorPocketed} ${shooterColor.toUpperCase()}! Turn continues!`;
      nextTurnUid = shooterUid; // GOALED -> KEEPS SHOOTING!
    } else if (opponentColorPocketed > 0) {
      actionLog = `${shooterHandle} pocketed opponent's piece. Turn passes.`;
      nextTurnUid = otherPlayerUid;
    } else {
      nextTurnUid = otherPlayerUid;
      actionLog = `${shooterHandle} missed. Turn passes.`;
    }

    // 4. Check for ICF Grand Slam & Board Victory
    const myRemaining = shooterColor === "white" ? remainingWhite : remainingBlack;
    const oppRemaining = shooterColor === "white" ? remainingBlack : remainingWhite;

    if (myRemaining === 0) {
      if (!newQueenCovered && isQueenOnBoard) {
        actionLog = `❌ LAST PIECE FOUL by ${shooterHandle}! Cleared suit while Queen remains on board. Automatic loss!`;
        isGameOver = true;
        winnerUid = otherPlayerUid;
        soundSynth.playBuzzer();
      } else {
        // Calculate Board Score (Remaining opponent pieces + 3 pts Queen bonus subject to 21-pt cap)
        const currentCumScore = isShooterP1 ? newP1Score : newP2Score;
        const queenBonus = newQueenCovered && currentCumScore < 22 ? 3 : 0;
        const boardPts = oppRemaining + queenBonus;

        // Check for Grand Slam
        if (turnCountRef.current === 1 && oppRemaining === 9) {
          const isWhiteSlam = isShooterP1;
          const slamTitle = isWhiteSlam ? "WHITE SLAM" : "BLACK SLAM";
          setSlamDeclared(slamTitle);
          actionLog = `🏆 FLUTE! ${slamTitle} EXECUTED by ${shooterHandle}! Perfect Inning clearance (+${boardPts} PTS)!`;
        } else {
          actionLog = `🏆 BOARD OVER! ${shooterHandle} cleared the board (+${boardPts} PTS)!`;
        }

        isGameOver = true;
        winnerUid = shooterUid;
        soundSynth.playFanfare();
      }
    }

    // Reset striker position to baseline
    const striker = pieces.find((p) => p.type === "striker");
    if (striker) {
      striker.isPocketed = false;
      striker.x = BOARD_SIZE / 2;
      striker.y = nextTurnUid === playerUids[0] ? BOARD_SIZE - 55 : 55;
      striker.vx = 0;
      striker.vy = 0;
    }

    turnCountRef.current += 1;
    isSimulatingRef.current = false;
    setIsSimulating(false);

    try {
      await fireCarromShot(
        latestMatch.id,
        currentActiveUid,
        0,
        0,
        strikerBaselineXRef.current,
        activeBaselineY,
        pieces,
        {
          nextTurnUid,
          p1Score: newP1Score,
          p2Score: newP2Score,
          queenCovered: newQueenCovered,
          queenCoverAttempt: newQueenCoverAttempt,
          dueCount: newDueCount,
          actionLog,
          isGameOver,
          winnerUid,
        }
      );
    } catch (err) {
      console.error("Failed to fire carrom shot turn:", err);
    }
  }, [activeBaselineY, playerUids]);

  // Start Safety Watchdog Timer
  const startWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      if (isSimulatingRef.current) {
        piecesRef.current.forEach((p) => {
          p.vx = 0;
          p.vy = 0;
        });
        finalizeShotTurn();
      }
    }, 3500);
  }, [finalizeShotTurn]);

  // Intelligent AI Bot Shot
  useEffect(() => {
    if (!cs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === cs.currentTurnUid && p.isBot
    );
    if (botPlayer && !isSimulatingRef.current) {
      const timer = setTimeout(() => {
        if (isSimulatingRef.current) return;
        const pieces = piecesRef.current;
        const striker = pieces.find((p) => p.type === "striker");
        const targets = pieces.filter((p) => p.type !== "striker" && !p.isPocketed);
        if (!striker || targets.length === 0) return;

        activeShooterUidRef.current = botPlayer.uid;
        const botColor = playerUids[0] === botPlayer.uid ? "white" : "black";
        let myTargets = targets.filter((p) => p.type === botColor);
        if (cs.queenCoverAttempt) {
          myTargets = targets.filter((p) => p.type === botColor);
        } else if (targets.some((p) => p.type === "queen")) {
          const queen = targets.find((p) => p.type === "queen");
          if (queen) myTargets.unshift(queen);
        }

        const chosenTarget = myTargets[0] || targets[0];

        // Ghost-ball aim toward nearest corner pocket
        let bestPocket = POCKETS[0];
        let minPktDist = 9999;
        POCKETS.forEach((pkt) => {
          const d = Math.hypot(pkt.x - chosenTarget.x, pkt.y - chosenTarget.y);
          if (d < minPktDist) {
            minPktDist = d;
            bestPocket = pkt;
          }
        });

        const toPktX = bestPocket.x - chosenTarget.x;
        const toPktY = bestPocket.y - chosenTarget.y;
        const toPktDist = Math.hypot(toPktX, toPktY) || 1;
        const normPktX = toPktX / toPktDist;
        const normPktY = toPktY / toPktDist;

        const ghostX = chosenTarget.x - normPktX * (chosenTarget.radius + striker.radius);
        const ghostY = chosenTarget.y - normPktY * (chosenTarget.radius + striker.radius);

        const aimDx = ghostX - striker.x;
        const aimDy = ghostY - striker.y;
        const aimDist = Math.hypot(aimDx, aimDy) || 1;

        const speed = 11 + Math.random() * 4;
        const impulseX = (aimDx / aimDist) * speed + (Math.random() - 0.5) * 0.6;
        const impulseY = (aimDy / aimDist) * speed + (Math.random() - 0.5) * 0.6;

        striker.vx = impulseX;
        striker.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        strikerFoulRef.current = false;

        isSimulatingRef.current = true;
        setIsSimulating(true);
        startWatchdog();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [match, cs?.currentTurnUid, isSimulating, cs, playerUids, startWatchdog]);

  // Main Canvas & Continuous Physics Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const updatePhysicsAndRender = () => {
      const pieces = piecesRef.current;
      const powder = CARROM_POWDERS[activePowderRef.current];
      let anyMoving = false;

      // 1. Physics Sub-Stepping for High Accuracy
      const subSteps = 3;
      for (let step = 0; step < subSteps; step++) {
        pieces.forEach((p) => {
          if (p.isPocketed) return;

          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 0.06) {
            anyMoving = true;
            p.x += p.vx / subSteps;
            p.y += p.vy / subSteps;

            p.vx *= Math.pow(powder.friction, 1 / subSteps);
            p.vy *= Math.pow(powder.friction, 1 / subSteps);

            // A. Check if Ball is Inside ANY Corner Pocket Mouth
            let nearPocket: typeof POCKETS[0] | null = null;
            let distToPocket = 999;
            for (const pkt of POCKETS) {
              const d = Math.hypot(p.x - pkt.x, p.y - pkt.y);
              if (d < POCKET_MOUTH_RADIUS) {
                nearPocket = pkt;
                distToPocket = d;
                break;
              }
            }

            if (nearPocket) {
              // Pocket Suction Gravity
              const pullForce = 0.55;
              p.vx += ((nearPocket.x - p.x) / distToPocket) * pullForce;
              p.vy += ((nearPocket.y - p.y) / distToPocket) * pullForce;

              if (distToPocket < POCKET_DROP_RADIUS) {
                p.isPocketed = true;
                p.vx = 0;
                p.vy = 0;
                pocketedThisShotRef.current.push({ ...p });

                if (p.type === "striker") {
                  strikerFoulRef.current = true;
                  soundSynth.playBuzzer();
                } else if (p.type === "queen") {
                  soundSynth.playFanfare();
                } else {
                  soundSynth.playSnare();
                }
              }
            } else {
              // B. Solid Frame Cushion Rebounds
              if (p.x - p.radius < PLAYABLE_MIN) {
                p.x = PLAYABLE_MIN + p.radius;
                p.vx = -p.vx * powder.restitution;
                if (speed > 1.2) soundSynth.playSubtlePop();
              } else if (p.x + p.radius > PLAYABLE_MAX) {
                p.x = PLAYABLE_MAX - p.radius;
                p.vx = -p.vx * powder.restitution;
                if (speed > 1.2) soundSynth.playSubtlePop();
              }

              if (p.y - p.radius < PLAYABLE_MIN) {
                p.y = PLAYABLE_MIN + p.radius;
                p.vy = -p.vy * powder.restitution;
                if (speed > 1.2) soundSynth.playSubtlePop();
              } else if (p.y + p.radius > PLAYABLE_MAX) {
                p.y = PLAYABLE_MAX - p.radius;
                p.vy = -p.vy * powder.restitution;
                if (speed > 1.2) soundSynth.playSubtlePop();
              }
            }
          } else {
            p.vx = 0;
            p.vy = 0;
          }
        });

        // 2. Elastic Circle-to-Circle Collision Resolution
        for (let i = 0; i < pieces.length; i++) {
          for (let j = i + 1; j < pieces.length; j++) {
            const p1 = pieces[i];
            const p2 = pieces[j];
            if (p1.isPocketed || p2.isPocketed) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p1.radius + p2.radius;

            if (dist < minDist && dist > 0.0001) {
              const nx = dx / dist;
              const ny = dy / dist;

              const overlap = minDist - dist;
              p1.x -= nx * overlap * 0.5;
              p1.y -= ny * overlap * 0.5;
              p2.x += nx * overlap * 0.5;
              p2.y += ny * overlap * 0.5;

              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const hitSpeed = Math.hypot(kx, ky);

              if (hitSpeed > 0.05) {
                const p = 2 * (nx * kx + ny * ky) / 2;
                p1.vx -= p * nx * 0.95;
                p1.vy -= p * ny * 0.95;
                p2.vx += p * nx * 0.95;
                p2.vy += p * ny * 0.95;

                if (hitSpeed > 1.2) soundSynth.playSubtlePop();
              }
            }
          }
        }
      }

      // Check if Simulation Finished
      if (isSimulatingRef.current && !anyMoving) {
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        finalizeShotTurn();
      }

      // ── Render Deluxe Lacquered Plywood Carrom Board ──
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // A. Lacquered Natural Plywood Surface
      const surfaceGrad = ctx.createRadialGradient(
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        30,
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        220
      );
      surfaceGrad.addColorStop(0, "#fde68a");
      surfaceGrad.addColorStop(0.6, "#fef3c7");
      surfaceGrad.addColorStop(1, "#f59e0b");

      ctx.fillStyle = surfaceGrad;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // B. Deluxe Rosewood Outer Frame with Bevels
      ctx.strokeStyle = "#381a08";
      ctx.lineWidth = FRAME_THICKNESS;
      ctx.strokeRect(FRAME_THICKNESS / 2, FRAME_THICKNESS / 2, BOARD_SIZE - FRAME_THICKNESS, BOARD_SIZE - FRAME_THICKNESS);

      // Inner Cushion Inset Line
      ctx.strokeStyle = "#5a2d0c";
      ctx.lineWidth = 3;
      ctx.strokeRect(FRAME_THICKNESS, FRAME_THICKNESS, BOARD_SIZE - FRAME_THICKNESS * 2, BOARD_SIZE - FRAME_THICKNESS * 2);

      // Brass Corner Plate Highlights
      const cornerOffsets = [[0, 0], [BOARD_SIZE, 0], [0, BOARD_SIZE], [BOARD_SIZE, BOARD_SIZE]];
      cornerOffsets.forEach(([cx, cy]) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#854d0e";
        ctx.beginPath();
        ctx.arc(0, 0, FRAME_THICKNESS * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // C. 4 Corner Drop Pockets
      POCKETS.forEach((pkt) => {
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_MOUTH_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_MOUTH_RADIUS - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#a16207";
        ctx.fill();
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_DROP_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();
      });

      // D. Diagonal Foul Arrows
      ctx.strokeStyle = "rgba(185, 28, 28, 0.4)";
      ctx.lineWidth = 1.5;
      const pocketAngles = [Math.PI / 4, (3 * Math.PI) / 4, (7 * Math.PI) / 4, (5 * Math.PI) / 4];
      pocketAngles.forEach((angle) => {
        const startX = BOARD_SIZE / 2 + Math.cos(angle) * 70;
        const startY = BOARD_SIZE / 2 + Math.sin(angle) * 70;
        const endX = BOARD_SIZE / 2 + Math.cos(angle) * 165;
        const endY = BOARD_SIZE / 2 + Math.sin(angle) * 165;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#b91c1c";
        ctx.fill();
      });

      // E. Center Mandala & Queen Circle
      const center = BOARD_SIZE / 2;
      ctx.strokeStyle = "#b91c1c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center, center, 65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, 61, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(185, 28, 28, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center, center, 32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1;
      ctx.stroke();

      // F. 4 Official Baselines with Edge Red Circles
      const drawBaseline = (yPos: number) => {
        const startX = 75;
        const endX = BOARD_SIZE - 75;
        const lineOffset = 6;

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, yPos - lineOffset);
        ctx.lineTo(endX, yPos - lineOffset);
        ctx.moveTo(startX, yPos + lineOffset);
        ctx.lineTo(endX, yPos + lineOffset);
        ctx.stroke();

        [startX, endX].forEach((x) => {
          ctx.beginPath();
          ctx.arc(x, yPos, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(220, 38, 38, 0.2)";
          ctx.fill();
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, yPos, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
        });
      };

      drawBaseline(55);
      drawBaseline(BOARD_SIZE - 55);

      ctx.save();
      ctx.translate(BOARD_SIZE / 2, BOARD_SIZE / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-BOARD_SIZE / 2, -BOARD_SIZE / 2);
      drawBaseline(55);
      drawBaseline(BOARD_SIZE - 55);
      ctx.restore();

      // G. Render 3D Carrom Pieces & Striker
      pieces.forEach((p) => {
        if (p.isPocketed) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x + 2, p.y + 3, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (p.type === "queen") {
          const qGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          qGrad.addColorStop(0, "#f87171");
          qGrad.addColorStop(0.5, "#dc2626");
          qGrad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = qGrad;
          ctx.fill();

          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#fef08a";
          ctx.fill();
        } else if (p.type === "white") {
          const wGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          wGrad.addColorStop(0, "#ffffff");
          wGrad.addColorStop(0.6, "#f3f4f6");
          wGrad.addColorStop(1, "#d1d5db");
          ctx.fillStyle = wGrad;
          ctx.fill();

          ctx.strokeStyle = "#9ca3af";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(107, 114, 128, 0.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.type === "black") {
          const bGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, p.radius);
          bGrad.addColorStop(0, "#4b5563");
          bGrad.addColorStop(0.5, "#1f2937");
          bGrad.addColorStop(1, "#030712");
          ctx.fillStyle = bGrad;
          ctx.fill();

          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(156, 163, 175, 0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.type === "striker") {
          const sGrad = ctx.createRadialGradient(p.x - 4, p.y - 4, 3, p.x, p.y, p.radius);
          sGrad.addColorStop(0, "#6ee7b7");
          sGrad.addColorStop(0.4, "#10b981");
          sGrad.addColorStop(1, "#064e3b");
          ctx.fillStyle = sGrad;
          ctx.fill();

          ctx.strokeStyle = "#ecfdf5";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.restore();
      });

      // H. Precision Trajectory Guideline with Cushion Bank Reflection
      if (isAimingRef.current && dragStartRef.current && dragCurrentRef.current) {
        const striker = pieces.find((p) => p.type === "striker");
        if (striker && !striker.isPocketed) {
          const pullDx = dragStartRef.current.x - dragCurrentRef.current.x;
          const pullDy = dragStartRef.current.y - dragCurrentRef.current.y;
          const aimLength = Math.hypot(pullDx, pullDy);

          if (aimLength > 2) {
            const dirX = pullDx / aimLength;
            const dirY = pullDy / aimLength;
            const rayDist = 260;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);

            let endX = striker.x + dirX * rayDist;
            let endY = striker.y + dirY * rayDist;
            let bounced = false;
            let bounceStartX = 0, bounceStartY = 0, bounceEndX = 0, bounceEndY = 0;

            if (endX < PLAYABLE_MIN) {
              const fraction = (PLAYABLE_MIN - striker.x) / (dirX * rayDist);
              bounceStartX = PLAYABLE_MIN;
              bounceStartY = striker.y + dirY * rayDist * fraction;
              bounceEndX = PLAYABLE_MIN - dirX * rayDist * (1 - fraction);
              bounceEndY = bounceStartY + dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            } else if (endX > PLAYABLE_MAX) {
              const fraction = (PLAYABLE_MAX - striker.x) / (dirX * rayDist);
              bounceStartX = PLAYABLE_MAX;
              bounceStartY = striker.y + dirY * rayDist * fraction;
              bounceEndX = PLAYABLE_MAX - dirX * rayDist * (1 - fraction);
              bounceEndY = bounceStartY + dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            }

            if (endY < PLAYABLE_MIN) {
              const fraction = (PLAYABLE_MIN - striker.y) / (dirY * rayDist);
              bounceStartX = striker.x + dirX * rayDist * fraction;
              bounceStartY = PLAYABLE_MIN;
              bounceEndX = bounceStartX + dirX * rayDist * (1 - fraction);
              bounceEndY = PLAYABLE_MIN - dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            } else if (endY > PLAYABLE_MAX) {
              const fraction = (PLAYABLE_MAX - striker.y) / (dirY * rayDist);
              bounceStartX = striker.x + dirX * rayDist * fraction;
              bounceStartY = PLAYABLE_MAX;
              bounceEndX = bounceStartX + dirX * rayDist * (1 - fraction);
              bounceEndY = PLAYABLE_MAX - dirY * rayDist * (1 - fraction);
              endX = bounceStartX;
              endY = bounceStartY;
              bounced = true;
            }

            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "#10b981";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.stroke();

            if (bounced) {
              ctx.beginPath();
              ctx.moveTo(bounceStartX, bounceStartY);
              ctx.lineTo(bounceEndX, bounceEndY);
              ctx.strokeStyle = "#34d399";
              ctx.setLineDash([4, 4]);
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            ctx.restore();

            // Pullback Vector Indicator
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);
            ctx.lineTo(striker.x - dirX * Math.min(aimLength, 60), striker.y - dirY * Math.min(aimLength, 60));
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(updatePhysicsAndRender);
    };

    animId = requestAnimationFrame(updatePhysicsAndRender);
    return () => {
      cancelAnimationFrame(animId);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [finalizeShotTurn]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isTurn = (csRef.current?.currentTurnUid === currentUidRef.current || !csRef.current?.currentTurnUid) && matchRef.current.status === "PLAYING";
    if (!isTurn || isSimulatingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;
    const clickX = (e.clientX - rect.left) * scale;
    const clickY = (e.clientY - rect.top) * scale;

    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker && !striker.isPocketed) {
      striker.vx = 0;
      striker.vy = 0;
      activeShooterUidRef.current = currentUidRef.current;
      setIsAiming(true);
      isAimingRef.current = true;
      setDragStart({ x: clickX, y: clickY });
      dragStartRef.current = { x: clickX, y: clickY };
      setDragCurrent({ x: clickX, y: clickY });
      dragCurrentRef.current = { x: clickX, y: clickY };
      setPower(0);
      powerRef.current = 0;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAimingRef.current || !dragStartRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;
    const curX = (e.clientX - rect.left) * scale;
    const curY = (e.clientY - rect.top) * scale;

    setDragCurrent({ x: curX, y: curY });
    dragCurrentRef.current = { x: curX, y: curY };

    const dist = Math.hypot(dragStartRef.current.x - curX, dragStartRef.current.y - curY);
    const calculatedPower = Math.min(100, Math.round((dist / 120) * 100));
    setPower(calculatedPower);
    powerRef.current = calculatedPower;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (!isAimingRef.current || !dragStartRef.current || !dragCurrentRef.current) {
      setIsAiming(false);
      isAimingRef.current = false;
      return;
    }

    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker) {
      const pullDx = dragStartRef.current.x - dragCurrentRef.current.x;
      const pullDy = dragStartRef.current.y - dragCurrentRef.current.y;
      const pullDist = Math.hypot(pullDx, pullDy);

      if (pullDist > 4) {
        const grip = CARROM_GRIPS[activeGripRef.current];
        const forceMultiplier = 0.32 * grip.powerMultiplier;
        const impulseX = pullDx * forceMultiplier;
        const impulseY = pullDy * forceMultiplier;

        activeShooterUidRef.current = currentUidRef.current;
        striker.vx = impulseX;
        striker.vy = impulseY;

        soundSynth.playSnare();
        pocketedThisShotRef.current = [];
        strikerFoulRef.current = false;

        isSimulatingRef.current = true;
        setIsSimulating(true);
        startWatchdog();
      }
    }

    setIsAiming(false);
    isAimingRef.current = false;
    setDragStart(null);
    dragStartRef.current = null;
    setDragCurrent(null);
    dragCurrentRef.current = null;
    setPower(0);
    powerRef.current = 0;
  };

  // Move Striker on Baseline
  const handleBaselinePositionChange = (newX: number) => {
    const clampedX = Math.max(75, Math.min(BOARD_SIZE - 75, newX));
    setStrikerBaselineX(clampedX);
    strikerBaselineXRef.current = clampedX;

    const striker = piecesRef.current.find((p) => p.type === "striker");
    if (striker && !isSimulatingRef.current) {
      striker.x = clampedX;
      striker.y = activeBaselineY;
      striker.vx = 0;
      striker.vy = 0;
    }
  };

  // Inventory of remaining pieces
  const pieces = piecesRef.current;
  const remainingWhite = pieces.filter((p) => p.type === "white" && !p.isPocketed).length;
  const remainingBlack = pieces.filter((p) => p.type === "black" && !p.isPocketed).length;
  const isQueenOnBoard = pieces.some((p) => p.type === "queen" && !p.isPocketed);
  const activeGripConfig = CARROM_GRIPS[activeGrip];
  const activePowderConfig = CARROM_POWDERS[activePowder];

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-amber-600/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(217,119,6,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] text-lg">
            ⚪
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                CHAMPIONSHIP CARROM
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                ICF OFFICIAL
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{match.players[cs?.currentTurnUid || ""]?.handle || "Player"}</span> • {isMyTurn ? "YOUR SHOT" : "OPPONENT'S SHOT"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSimulating && (
            <button
              type="button"
              onClick={forceUnlockTurn}
              className="px-2 py-1.5 border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900 text-amber-300 font-bold text-[9px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
              title="Unlock striker if physics settled"
            >
              <RotateCcw className="w-3 h-3 animate-spin" />
              <span>UNLOCK</span>
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
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="carrom" />

      {/* ── ICF Grand Slam Live Adjudicator Banner ── */}
      {slamDeclared && (
        <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-950 via-amber-900 to-black p-3 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-bounce">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
            <div>
              <span className="text-sm font-black text-amber-200 uppercase tracking-widest block">
                ⚡ ICF GRAND SLAM: {slamDeclared}!
              </span>
              <span className="text-[10px] text-amber-300 font-mono">
                Flawless Inning 1 runout! Official Scorecard Entry: &quot;{slamDeclared.startsWith("WHITE") ? "WS" : "BS"}&quot; (+12 PTS).
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-400 text-black font-black text-xs uppercase rounded-lg shadow-md">
            +12 PTS
          </span>
        </div>
      )}

      {/* ── 4 Core Striking Grips Interactive Selector ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase">
          <span>SELECT STRIKING GRIP:</span>
          <span className="text-amber-400">{activeGripConfig.badge}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 bg-black/90 p-1.5 rounded-xl border border-amber-500/40 shadow-inner">
          {(Object.keys(CARROM_GRIPS) as CarromGrip[]).map((key) => {
            const grip = CARROM_GRIPS[key];
            const isSelected = activeGrip === key;
            return (
              <button
                key={grip.id}
                type="button"
                onClick={() => {
                  setActiveGrip(grip.id);
                  activeGripRef.current = grip.id;
                  soundSynth.playSubtlePop();
                }}
                className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)] scale-[1.03]"
                    : "bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-600 hover:text-white"
                }`}
                title={grip.description}
              >
                <span className="text-base">{grip.icon}</span>
                <span className="truncate w-full text-center leading-none text-[9px] font-black">{grip.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Surface Powder Physics Selector ── */}
      <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <Sparkle className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-400 font-bold uppercase text-[10px]">SURFACE POWDER:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(CARROM_POWDERS) as CarromPowder[]).map((key) => {
            const pwd = CARROM_POWDERS[key];
            const isSelected = activePowder === key;
            return (
              <button
                key={pwd.id}
                type="button"
                onClick={() => {
                  setActivePowder(pwd.id);
                  activePowderRef.current = pwd.id;
                  soundSynth.playSubtlePop();
                }}
                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-amber-400 text-black border-amber-300 font-black shadow-sm"
                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                }`}
                title={pwd.description}
              >
                {pwd.badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border-2 border-amber-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-amber-200 truncate">
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
                  handle: `@CARROM_KING_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Carrom:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Piece Inventory & Queen Status HUD ── */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-amber-500/30 text-center">
        {/* White Pieces */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
            ⚪ WHITE (P1)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingWhite} / 9</span>
          <span className="text-[8px] text-neutral-400">
            {myTargetColor === "white" ? "YOUR TARGET" : "OPPONENT"}
          </span>
        </div>

        {/* Red Queen */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 border border-neutral-700 space-y-0.5">
          <span className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1">
            👑 QUEEN (3 PTS)
          </span>
          <span className={`text-xs font-black font-mono ${cs?.queenCovered ? "text-emerald-400" : cs?.queenCoverAttempt ? "text-amber-400 animate-pulse" : isQueenOnBoard ? "text-red-400" : "text-neutral-500"}`}>
            {cs?.queenCovered
              ? "COVERED (+3 PTS)"
              : cs?.queenCoverAttempt
              ? "COVER SHOT ACTIVE"
              : isQueenOnBoard
              ? "ON BOARD"
              : "POCKETED"}
          </span>
          <span className="text-[8px] text-neutral-400">
            {cs?.dueCount ? `⚠️ ${cs.dueCount} DUE PENALTY` : "MUST COVER TO CLAIM"}
          </span>
        </div>

        {/* Black Pieces */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/60 border border-neutral-800 space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            ⚫ BLACK (P2)
          </span>
          <span className="text-lg font-black text-white font-mono">{remainingBlack} / 9</span>
          <span className="text-[8px] text-neutral-400">
            {myTargetColor === "black" ? "YOUR TARGET" : "OPPONENT"}
          </span>
        </div>
      </div>

      {/* Action Telemetry Log */}
      {cs?.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{cs.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe Carrom Board Canvas ── */}
      <div className="relative aspect-square max-w-[400px] mx-auto p-2 rounded-2xl bg-gradient-to-br from-[#2a1306] via-[#3a1a08] to-[#1a0802] border-4 border-[#5a2a0c] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="touch-none cursor-crosshair w-full h-full rounded-xl"
        />
      </div>

      {/* ── Baseline Striker Placement Slider ── */}
      {isMyTurn && !isSimulating && (
        <div className="space-y-1 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
          <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
            <span>POSITION STRIKER ON BASELINE:</span>
            <span className="text-amber-400 font-mono font-black">{Math.round(strikerBaselineX)} PX</span>
          </div>
          <input
            type="range"
            min={75}
            max={BOARD_SIZE - 75}
            value={strikerBaselineX}
            onChange={(e) => handleBaselinePositionChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
            <span>[LEFT BASE CIRCLE]</span>
            <span>[CENTER BASELINE]</span>
            <span>[RIGHT BASE CIRCLE]</span>
          </div>
        </div>
      )}

      {/* ── Power & Shot Instruction HUD ── */}
      <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex justify-between text-xs text-neutral-300 font-bold uppercase">
          <span>STRIKER TENSION &amp; POWER ({activeGripConfig.name}):</span>
          <span className="text-amber-400 font-mono font-black">{power}%</span>
        </div>
        <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-red-500 h-full transition-all duration-75"
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-400 text-center pt-1 font-mono">
          {isMyTurn
            ? "DRAG STRIKER BACKWARD TO SET TRAJECTORY & POWER ➔ RELEASE TO FLICK!"
            : "WAITING FOR OPPONENT TO STRIKE..."}
        </p>
      </div>

      {/* ── ICF Pro Carrom Masteries & Physics Guide ── */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProTips(!showProTips)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase">
            <Compass className="w-4 h-4 text-amber-400" />
            🏆 ICF PRO MASTERIES (SLAMS, 4 GRIPS, POWDER PHYSICS &amp; DEFENSE)
          </span>
          {showProTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProTips && (
          <div className="p-3 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-400 font-mono bg-black/50">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">1. ⚡ THE WHITE &amp; BLACK SLAM (INNING 1 RUNOUT):</span>
              White Slam: Breaker clears all 9 White + Queen on Turn 1 (+12 pts). Black Slam: Non-breaker clears all 9 Black + Queen on Turn 1 (+12 pts).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">2. ☝️ 4 CORE STRIKING GRIPS:</span>
              Index (Direct accuracy), Middle Straight (100% kinetic break power), Scissors/Kainchi (Sharp 60°+ tangent slices), Thumb (Reverse baseline shots).
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">3. 🧪 POWDER CHEMISTRY (BORIC ACID VS DISCO):</span>
              Boric Acid (H3BO3) forms crystalline slip planes (μk ≈ 0.08–0.12) for tactile cut control; Disco polymer spheres roll with μk &lt; 0.04.
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">4. 🛡️ 3 PRO DEFENSIVE STRATEGIES:</span>
              1. Frame-Freeze Lock (push opponent piece flush against rail, 0mm gap). 2. Pocket-Mouth Choke (Gardi). 3. Queen Shielding!
            </div>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-amber-400 font-bold block mb-0.5">5. 👑 QUEEN COVERING &amp; 22-POINT CAP RULE:</span>
              Queen must be covered by sinking your piece on the same or immediate next shot. Once score reaches 22+ pts, Queen awards 0 bonus pts.
            </div>
          </div>
        )}
      </div>

      {/* ── Victory Celebration Declaration ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 CARROM CHAMPIONSHIP VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You cleared the board and earned +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
