"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Flame, Shield, Zap, Target } from "lucide-react";

interface KnifeThrowerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

interface EmbeddedKnife {
  id: number;
  angle: number; // in radians relative to log rotation
  owner: "p1" | "p2" | "neutral";
  stickTime: number; // for spring oscillation recoil
}

interface Apple {
  id: number;
  angle: number;
  sliced: boolean;
  type: "apple" | "ruby";
}

interface SlicedHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  alpha: number;
  type: "apple" | "ruby";
}

interface FlyingKnife {
  owner: "p1" | "p2";
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1; // 1 = upwards from bottom, -1 = downwards from top
  trail: { x: number; y: number; alpha: number }[];
}

interface BrokenPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  color: string;
  alpha: number;
  size: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface JuiceDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

interface WoodFissure {
  angle: number;
  length: number;
  subBranches: { angleOffset: number; len: number }[];
}

export default function KnifeThrowerGame({
  match,
  currentUid,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: KnifeThrowerProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Round scores (First to 3 wins)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Quiver counts per round
  const MAX_KNIVES = 7;
  const [p1KnivesLeft, setP1KnivesLeft] = useState(MAX_KNIVES);
  const [p2KnivesLeft, setP2KnivesLeft] = useState(MAX_KNIVES);

  // Round stats & combo
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [comboCount, setComboCount] = useState(0);

  const [embeddedKnives, setEmbeddedKnives] = useState<EmbeddedKnife[]>([]);
  const [apples, setApples] = useState<Apple[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [bannerMessage, setBannerMessage] = useState("TAP TO THROW BLADES!");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Log rotation state
  const logRotationRef = useRef(0);
  const logSpeedRef = useRef(0.038);
  const targetSpeedRef = useRef(0.038);
  const choreoTimerRef = useRef(0);
  const choreoModeRef = useRef<"normal" | "slow" | "reverse" | "stutter" | "frenzy">("normal");

  // Physics & Particle refs
  const p1FlyingRef = useRef<FlyingKnife | null>(null);
  const p2FlyingRef = useRef<FlyingKnife | null>(null);
  const p1InputBuffered = useRef(false);
  const p2InputBuffered = useRef(false);

  const sparksRef = useRef<Spark[]>([]);
  const juiceDropletsRef = useRef<JuiceDroplet[]>([]);
  const slicedHalvesRef = useRef<SlicedHalf[]>([]);
  const brokenPiecesRef = useRef<BrokenPiece[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const woodFissuresRef = useRef<WoodFissure[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; r: number; maxR: number; alpha: number; color: string }[]>([]);

  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idGenRef = useRef(100);

  // Screen shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2.5)), 30);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Wins(0);
    setP2Wins(0);
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
    setMatchWinner(null);
    setInMenu(false);
    resetRound(1);
  }, []);

  // Reset round with stage progression
  const resetRound = useCallback((roundNum = 1) => {
    setRoundOver(false);
    setRoundWinner(null);
    setP1KnivesLeft(MAX_KNIVES);
    setP2KnivesLeft(MAX_KNIVES);
    setComboCount(0);
    setBannerMessage("EMBED ALL 7 BLADES! DON'T CLASH!");

    p1FlyingRef.current = null;
    p2FlyingRef.current = null;
    p1InputBuffered.current = false;
    p2InputBuffered.current = false;

    sparksRef.current = [];
    juiceDropletsRef.current = [];
    slicedHalvesRef.current = [];
    brokenPiecesRef.current = [];
    floatingScoresRef.current = [];
    shockwavesRef.current = [];
    woodFissuresRef.current = [];

    logRotationRef.current = 0;
    logSpeedRef.current = 0.038;
    targetSpeedRef.current = 0.038;
    choreoTimerRef.current = 0;
    choreoModeRef.current = "normal";

    // Setup initial obstacles according to stage
    const initial: EmbeddedKnife[] = [];
    const initialApples: Apple[] = [];

    if (roundNum === 1) {
      // Stage 1: Ancient Oak (1 obstacle, 2 apples)
      initial.push({ id: idGenRef.current++, angle: 0, owner: "neutral", stickTime: 0 });
      initialApples.push(
        { id: idGenRef.current++, angle: Math.PI * 0.5, sliced: false, type: "apple" },
        { id: idGenRef.current++, angle: Math.PI * 1.4, sliced: false, type: "apple" }
      );
    } else if (roundNum === 2) {
      // Stage 2: Ironbound Redwood (2 obstacles, 1 apple, 1 ruby)
      initial.push(
        { id: idGenRef.current++, angle: 0, owner: "neutral", stickTime: 0 },
        { id: idGenRef.current++, angle: Math.PI * 0.85, owner: "neutral", stickTime: 0 }
      );
      initialApples.push(
        { id: idGenRef.current++, angle: Math.PI * 0.4, sliced: false, type: "apple" },
        { id: idGenRef.current++, angle: Math.PI * 1.55, sliced: false, type: "ruby" }
      );
    } else {
      // Stage 3+: Darkwood Boss (3 obstacles, 2 rubies)
      initial.push(
        { id: idGenRef.current++, angle: 0, owner: "neutral", stickTime: 0 },
        { id: idGenRef.current++, angle: Math.PI * 0.65, owner: "neutral", stickTime: 0 },
        { id: idGenRef.current++, angle: Math.PI * 1.35, owner: "neutral", stickTime: 0 }
      );
      initialApples.push(
        { id: idGenRef.current++, angle: Math.PI * 0.35, sliced: false, type: "ruby" },
        { id: idGenRef.current++, angle: Math.PI * 1.05, sliced: false, type: "ruby" }
      );
    }

    setEmbeddedKnives(initial);
    setApples(initialApples);
  }, []);

  // Trigger floating score popup
  const addFloatingScore = (x: number, y: number, text: string, color = "#facc15") => {
    floatingScoresRef.current.push({
      id: idGenRef.current++,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.8,
    });
  };

  // Add impact fissure to log
  const addWoodFissure = (angle: number) => {
    woodFissuresRef.current.push({
      angle,
      length: 12 + Math.random() * 8,
      subBranches: [
        { angleOffset: -0.25 - Math.random() * 0.3, len: 4 + Math.random() * 5 },
        { angleOffset: 0.25 + Math.random() * 0.3, len: 4 + Math.random() * 5 },
      ],
    });
  };

  // Throw knife handler
  const throwKnife = useCallback((owner: "p1" | "p2") => {
    if (roundOver || matchWinner) return;

    if (owner === "p1") {
      if (p1FlyingRef.current) {
        // Buffer input so user can rapid-tap smoothly
        p1InputBuffered.current = true;
        return;
      }
      if (p1KnivesLeft <= 0) return;

      arcadeSfx.playWhoosh();
      setP1KnivesLeft((k) => k - 1);
      p1FlyingRef.current = {
        owner: "p1",
        x: 180,
        y: 345,
        speed: 28,
        direction: 1,
        trail: [],
      };
    } else {
      if (p2FlyingRef.current) {
        p2InputBuffered.current = true;
        return;
      }
      if (p2KnivesLeft <= 0) return;

      arcadeSfx.playWhoosh();
      setP2KnivesLeft((k) => k - 1);
      p2FlyingRef.current = {
        owner: "p2",
        x: 180,
        y: 55,
        speed: 28,
        direction: -1,
        trail: [],
      };
    }
  }, [roundOver, matchWinner, p1KnivesLeft, p2KnivesLeft]);

  // Shatter knife on collision with existing blade
  const shatterKnife = (who: "p1" | "p2", hitX: number, hitY: number) => {
    arcadeSfx.playKnifeClash();
    setScreenShake(16);

    // Shockwave ring
    shockwavesRef.current.push({
      x: hitX,
      y: hitY,
      r: 6,
      maxR: 48,
      alpha: 1,
      color: who === "p1" ? "#60a5fa" : "#f87171",
    });

    // Sparks bursting outward
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 9;
      sparksRef.current.push({
        x: hitX,
        y: hitY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        color: i % 3 === 0 ? "#fef08a" : i % 3 === 1 ? "#fbbf24" : "#ef4444",
        size: 2.5 + Math.random() * 3,
      });
    }

    // Broken steel blade chunks tumbling
    const bladeColor = who === "p1" ? "#3b82f6" : "#ef4444";
    for (let i = 0; i < 4; i++) {
      brokenPiecesRef.current.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 8,
        vy: who === "p1" ? -4 - Math.random() * 5 : 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.5,
        color: i === 0 ? "#cbd5e1" : bladeColor,
        alpha: 1,
        size: 6 + Math.random() * 8,
      });
    }

    // Handle losing round
    const victor = who === "p1" ? "p2" : "p1";
    handleRoundEnd(victor, `${who === "p1" ? "YOU" : "OPPONENT"} CLASHED BLADES!`);
  };

  // Check round end
  const handleRoundEnd = (winner: "p1" | "p2", reason: string) => {
    if (roundOver) return;
    setRoundOver(true);
    setRoundWinner(winner);
    setBannerMessage(reason);

    if (winner === "p1") {
      arcadeSfx.playVictory();
      setP1Wins((w) => {
        const next = w + 1;
        if (next >= 3) {
          setMatchWinner("p1");
          if (currentUid && match?.id) {
            updateArcadeGameScore(match.id, currentUid, "knife_thrower" as any, 100, true);
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
  };

  // Next round trigger
  const advanceToNextRound = () => {
    const next = currentRound + 1;
    setCurrentRound(next);
    resetRound(next);
  };

  // Bot AI throw loop with trajectory prediction
  useEffect(() => {
    if (inMenu || playMode !== "bot" || roundOver || matchWinner || p2KnivesLeft <= 0) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const scheduleNextThrow = () => {
      const interval =
        botDiff === "hard"
          ? 550 + Math.random() * 450
          : botDiff === "medium"
          ? 900 + Math.random() * 650
          : 1350 + Math.random() * 850;

      botTimerRef.current = setTimeout(() => {
        if (roundOver || matchWinner || p2FlyingRef.current) return;

        // Calculate time of flight: knife travels from y=55 to y=148 at 28px/frame (~3.3 frames)
        const flightFrames = 3.3;
        const projectedRotation = logRotationRef.current + logSpeedRef.current * flightFrames;

        // Target angle on log when arriving from top is 3*PI/2
        const targetImpactAngle = ((Math.PI * 1.5 - projectedRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        // Calculate clearance to nearest embedded knife
        let minAngularDiff = Infinity;
        embeddedKnives.forEach((k) => {
          let diff = Math.abs(k.angle - targetImpactAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < minAngularDiff) minAngularDiff = diff;
        });

        // Angular width threshold: ~0.26 rad
        const isSafe = minAngularDiff > 0.27;

        if (botDiff === "hard") {
          // Hard bot only throws when strictly safe, unless cornered
          if (isSafe || Math.random() < 0.04) {
            throwKnife("p2");
          }
        } else if (botDiff === "medium") {
          if (isSafe || Math.random() < 0.16) {
            throwKnife("p2");
          }
        } else {
          // Easy bot throws casually regardless of safety
          if (isSafe || Math.random() < 0.4) {
            throwKnife("p2");
          }
        }

        scheduleNextThrow();
      }, interval);
    };

    scheduleNextThrow();

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [inMenu, playMode, roundOver, matchWinner, p2KnivesLeft, botDiff, embeddedKnives, throwKnife]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        throwKnife("p1");
      }
      if (playMode === "friend" && (e.key === "ArrowUp" || e.key === "w" || e.key === "W")) {
        throwKnife("p2");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [throwKnife, playMode]);

  // =========================================================================
  // MAIN CANVAS RENDER & PHYSICS LOOP
  // =========================================================================
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const LOG_X = 180;
    const LOG_Y = 200;
    const LOG_RADIUS = 54;

    const loop = () => {
      const now = Date.now();

      // 1. Rotation Choreography with Momentum Easing
      choreoTimerRef.current += 1;
      if (choreoTimerRef.current % 130 === 0) {
        const rand = Math.random();
        if (rand < 0.22) {
          choreoModeRef.current = "reverse";
          targetSpeedRef.current = -0.042;
        } else if (rand < 0.45) {
          choreoModeRef.current = "stutter";
          targetSpeedRef.current = 0.015;
        } else if (rand < 0.65) {
          choreoModeRef.current = "frenzy";
          targetSpeedRef.current = 0.06;
        } else {
          choreoModeRef.current = "normal";
          targetSpeedRef.current = 0.038;
        }
      }

      // Smooth lerp speed toward target
      logSpeedRef.current += (targetSpeedRef.current - logSpeedRef.current) * 0.05;
      logRotationRef.current += logSpeedRef.current;

      // 2. Process Player 1 Flying Knife (Moving UP from bottom)
      if (p1FlyingRef.current) {
        const knife = p1FlyingRef.current;
        knife.trail.push({ x: knife.x, y: knife.y, alpha: 0.6 });
        if (knife.trail.length > 5) knife.trail.shift();

        knife.y -= knife.speed;

        // Check contact with log perimeter
        if (knife.y <= LOG_Y + LOG_RADIUS + 12) {
          // Angle on log relative to log rotation: bottom entrance is PI/2
          const relativeAngle = ((Math.PI * 0.5 - logRotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

          // Check if clashes with existing knife
          let clashed = false;
          let tightestGap = Infinity;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - relativeAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < tightestGap) tightestGap = diff;
            if (diff < 0.22) {
              clashed = true;
              break;
            }
          }

          if (clashed) {
            shatterKnife("p1", LOG_X, LOG_Y + LOG_RADIUS);
            p1FlyingRef.current = null;
          } else {
            // Embed successfully!
            arcadeSfx.playKnifeStick();
            setScreenShake(4);
            p1FlyingRef.current = null;
            addWoodFissure(relativeAngle);

            // Close call bonus
            if (tightestGap < 0.38) {
              addFloatingScore(LOG_X, LOG_Y + LOG_RADIUS + 10, "CLOSE CALL! +250", "#fbbf24");
              setP1Score((s) => s + 250);
            } else {
              addFloatingScore(LOG_X, LOG_Y + LOG_RADIUS + 10, "+100", "#60a5fa");
              setP1Score((s) => s + 100);
            }

            setEmbeddedKnives((prev) => [
              ...prev,
              { id: idGenRef.current++, angle: relativeAngle, owner: "p1", stickTime: now },
            ]);

            // Slice fruit check
            apples.forEach((apple) => {
              if (!apple.sliced) {
                let aDiff = Math.abs(apple.angle - relativeAngle);
                if (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;
                if (aDiff < 0.26) {
                  apple.sliced = true;
                  arcadeSfx.playMatchSuccess();
                  setScreenShake(8);

                  const bonus = apple.type === "ruby" ? 500 : 300;
                  setP1Score((s) => s + bonus);
                  addFloatingScore(LOG_X, LOG_Y + LOG_RADIUS - 10, `${apple.type === "ruby" ? "💎 +500" : "🍎 +300"}`, "#ec4899");

                  // Sliced halves
                  slicedHalvesRef.current.push(
                    { x: LOG_X, y: LOG_Y + LOG_RADIUS, vx: -3.5, vy: 2, rot: 0, vrot: -0.18, alpha: 1, type: apple.type },
                    { x: LOG_X, y: LOG_Y + LOG_RADIUS, vx: 3.5, vy: 2, rot: 0, vrot: 0.18, alpha: 1, type: apple.type }
                  );

                  // Sweet juice droplets
                  for (let i = 0; i < 14; i++) {
                    const jAngle = Math.random() * Math.PI * 2;
                    const jSpd = 2 + Math.random() * 5;
                    juiceDropletsRef.current.push({
                      x: LOG_X,
                      y: LOG_Y + LOG_RADIUS,
                      vx: Math.cos(jAngle) * jSpd,
                      vy: Math.sin(jAngle) * jSpd + 1.2,
                      radius: 2 + Math.random() * 2.5,
                      alpha: 1,
                      color: apple.type === "ruby" ? "#f472b6" : "#ef4444",
                    });
                  }
                }
              }
            });

            // Check buffered input for rapid tapping
            if (p1InputBuffered.current && p1KnivesLeft > 0) {
              p1InputBuffered.current = false;
              throwKnife("p1");
            }

            // Check if P1 finished all knives
            if (p1KnivesLeft <= 1) {
              setTimeout(() => {
                if (!roundOver) handleRoundEnd("p1", "🎉 PLAYER 1 EMBEDDED ALL BLADES!");
              }, 300);
            }
          }
        }
      }

      // 3. Process Player 2 Flying Knife (Moving DOWN from top)
      if (p2FlyingRef.current) {
        const knife = p2FlyingRef.current;
        knife.trail.push({ x: knife.x, y: knife.y, alpha: 0.6 });
        if (knife.trail.length > 5) knife.trail.shift();

        knife.y += knife.speed;

        // Check contact with log perimeter
        if (knife.y >= LOG_Y - LOG_RADIUS - 12) {
          // Angle on log relative to log rotation: top entrance is 3*PI/2
          const relativeAngle = ((Math.PI * 1.5 - logRotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

          let clashed = false;
          let tightestGap = Infinity;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - relativeAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < tightestGap) tightestGap = diff;
            if (diff < 0.22) {
              clashed = true;
              break;
            }
          }

          if (clashed) {
            shatterKnife("p2", LOG_X, LOG_Y - LOG_RADIUS);
            p2FlyingRef.current = null;
          } else {
            arcadeSfx.playKnifeStick();
            setScreenShake(4);
            p2FlyingRef.current = null;
            addWoodFissure(relativeAngle);

            if (tightestGap < 0.38) {
              addFloatingScore(LOG_X, LOG_Y - LOG_RADIUS - 10, "CLOSE CALL! +250", "#fbbf24");
              setP2Score((s) => s + 250);
            } else {
              addFloatingScore(LOG_X, LOG_Y - LOG_RADIUS - 10, "+100", "#f87171");
              setP2Score((s) => s + 100);
            }

            setEmbeddedKnives((prev) => [
              ...prev,
              { id: idGenRef.current++, angle: relativeAngle, owner: "p2", stickTime: now },
            ]);

            // Check fruit slice
            apples.forEach((apple) => {
              if (!apple.sliced) {
                let aDiff = Math.abs(apple.angle - relativeAngle);
                if (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;
                if (aDiff < 0.26) {
                  apple.sliced = true;
                  arcadeSfx.playMatchSuccess();
                  setScreenShake(8);

                  const bonus = apple.type === "ruby" ? 500 : 300;
                  setP2Score((s) => s + bonus);
                  addFloatingScore(LOG_X, LOG_Y - LOG_RADIUS + 10, `${apple.type === "ruby" ? "💎 +500" : "🍎 +300"}`, "#ec4899");

                  slicedHalvesRef.current.push(
                    { x: LOG_X, y: LOG_Y - LOG_RADIUS, vx: -3.5, vy: -2, rot: 0, vrot: -0.18, alpha: 1, type: apple.type },
                    { x: LOG_X, y: LOG_Y - LOG_RADIUS, vx: 3.5, vy: -2, rot: 0, vrot: 0.18, alpha: 1, type: apple.type }
                  );

                  for (let i = 0; i < 14; i++) {
                    const jAngle = Math.random() * Math.PI * 2;
                    const jSpd = 2 + Math.random() * 5;
                    juiceDropletsRef.current.push({
                      x: LOG_X,
                      y: LOG_Y - LOG_RADIUS,
                      vx: Math.cos(jAngle) * jSpd,
                      vy: Math.sin(jAngle) * jSpd - 1.2,
                      radius: 2 + Math.random() * 2.5,
                      alpha: 1,
                      color: apple.type === "ruby" ? "#f472b6" : "#ef4444",
                    });
                  }
                }
              }
            });

            if (p2InputBuffered.current && p2KnivesLeft > 0) {
              p2InputBuffered.current = false;
              throwKnife("p2");
            }

            if (p2KnivesLeft <= 1) {
              setTimeout(() => {
                if (!roundOver) handleRoundEnd("p2", "🎉 OPPONENT EMBEDDED ALL BLADES!");
              }, 300);
            }
          }
        }
      }

      // =====================================================================
      // 4. CANVAS RENDERING
      // =====================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Atmospheric Dark Dungeon/Tavern Backdrop
      const bgGrad = ctx.createRadialGradient(LOG_X, LOG_Y, 20, LOG_X, LOG_Y, 240);
      bgGrad.addColorStop(0, "#292524");
      bgGrad.addColorStop(0.5, "#1c1917");
      bgGrad.addColorStop(1, "#0c0a09");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Faint target concentric trajectory guides
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(LOG_X, LOG_Y, LOG_RADIUS + 32, 0, Math.PI * 2);
      ctx.stroke();

      // ROTATING TARGET LOG
      ctx.save();
      ctx.translate(LOG_X, LOG_Y);
      ctx.rotate(logRotationRef.current);

      // Log Drop Shadow on Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(0, 8, LOG_RADIUS + 4, 0, Math.PI * 2);
      ctx.fill();

      // Outer Rugged Bark Band
      const barkGrad = ctx.createRadialGradient(0, 0, LOG_RADIUS - 6, 0, 0, LOG_RADIUS + 3);
      barkGrad.addColorStop(0, "#542a12");
      barkGrad.addColorStop(0.7, "#361808");
      barkGrad.addColorStop(1, "#180a03");
      ctx.fillStyle = barkGrad;
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS + 3, 0, Math.PI * 2);
      ctx.fill();

      // Forged Steel Reinforcement Band around circumference
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Iron Stud Rivets on Band
      for (let i = 0; i < 8; i++) {
        const rAngle = (i * Math.PI) / 4;
        const rx = Math.cos(rAngle) * (LOG_RADIUS - 1);
        const ry = Math.sin(rAngle) * (LOG_RADIUS - 1);
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sawn Timber End-Grain Face
      const woodFaceGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, LOG_RADIUS - 3);
      woodFaceGrad.addColorStop(0, "#451a03");
      woodFaceGrad.addColorStop(0.3, "#78350f");
      woodFaceGrad.addColorStop(0.65, "#92400e");
      woodFaceGrad.addColorStop(0.9, "#b45309");
      woodFaceGrad.addColorStop(1, "#713f12");
      ctx.fillStyle = woodFaceGrad;
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS - 3, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Annual Growth Rings
      [LOG_RADIUS - 10, LOG_RADIUS - 18, LOG_RADIUS - 26, LOG_RADIUS - 34, LOG_RADIUS - 42].forEach((r, idx) => {
        ctx.strokeStyle = idx % 2 === 0 ? "rgba(69, 26, 3, 0.45)" : "rgba(180, 83, 9, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Natural wood check cracks / fissures
      woodFissuresRef.current.forEach((fis) => {
        ctx.save();
        ctx.rotate(fis.angle);
        ctx.strokeStyle = "#1a0802";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, LOG_RADIUS - 3);
        ctx.lineTo(0, LOG_RADIUS - 3 - fis.length);
        fis.subBranches.forEach((sb) => {
          ctx.moveTo(0, LOG_RADIUS - 3 - fis.length * 0.6);
          ctx.lineTo(Math.sin(sb.angleOffset) * sb.len, LOG_RADIUS - 3 - fis.length * 0.6 - Math.cos(sb.angleOffset) * sb.len);
        });
        ctx.stroke();
        ctx.restore();
      });

      // Center Brass Target Boss
      const bossGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 15);
      bossGrad.addColorStop(0, "#fde047");
      bossGrad.addColorStop(0.5, "#ca8a04");
      bossGrad.addColorStop(1, "#713f12");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#533306";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bullseye Center Star/Crosshair
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();

      // RENDER EMBEDDED KNIVES WITH SPRING OSCILLATION RECOIL
      embeddedKnives.forEach((k) => {
        ctx.save();
        ctx.rotate(k.angle);

        // Spring oscillation decay (blade vibrates for ~180ms after stick)
        let recoilAngle = 0;
        const elapsed = now - k.stickTime;
        if (elapsed < 180 && k.stickTime > 0) {
          const progress = elapsed / 180;
          recoilAngle = Math.sin(progress * Math.PI * 6) * (1 - progress) * 0.08;
        }
        ctx.rotate(recoilAngle);

        const isP1 = k.owner === "p1";
        const isP2 = k.owner === "p2";
        const bladeColor = isP1 ? "#3b82f6" : isP2 ? "#ef4444" : "#94a3b8";
        const glowColor = isP1 ? "rgba(59,130,246,0.5)" : isP2 ? "rgba(239,68,68,0.5)" : "transparent";

        // Blade drop shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-2, LOG_RADIUS, 4, 32);

        // Forged Steel Double-Edged Blade
        ctx.fillStyle = bladeColor;
        ctx.beginPath();
        ctx.moveTo(-4, LOG_RADIUS);
        ctx.lineTo(-2.2, LOG_RADIUS + 24);
        ctx.lineTo(0, LOG_RADIUS + 32);
        ctx.lineTo(2.2, LOG_RADIUS + 24);
        ctx.lineTo(4, LOG_RADIUS);
        ctx.closePath();
        ctx.fill();

        // Polished Blade Fuller / Specular Highlight
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, LOG_RADIUS + 4);
        ctx.lineTo(0, LOG_RADIUS + 26);
        ctx.stroke();

        // Glowing runic edge line
        if (isP1 || isP2) {
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-3.5, LOG_RADIUS + 2);
          ctx.lineTo(0, LOG_RADIUS + 32);
          ctx.lineTo(3.5, LOG_RADIUS + 2);
          ctx.stroke();
        }

        // Crossguard Quillons
        ctx.fillStyle = "#334155";
        ctx.fillRect(-5.5, LOG_RADIUS + 8, 11, 3);

        // Leather-Wrapped Hilt Handle
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-2.5, LOG_RADIUS + 11, 5, 14);
        // Grip wrap stripes
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2.5, LOG_RADIUS + 14);
        ctx.lineTo(2.5, LOG_RADIUS + 14);
        ctx.moveTo(-2.5, LOG_RADIUS + 18);
        ctx.lineTo(2.5, LOG_RADIUS + 18);
        ctx.moveTo(-2.5, LOG_RADIUS + 22);
        ctx.lineTo(2.5, LOG_RADIUS + 22);
        ctx.stroke();

        // Brass Pommel
        ctx.fillStyle = "#ca8a04";
        ctx.beginPath();
        ctx.arc(0, LOG_RADIUS + 26, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // RENDER APPLES & RUBIES
      apples.forEach((apple) => {
        if (apple.sliced) return;
        ctx.save();
        ctx.rotate(apple.angle);
        ctx.translate(0, LOG_RADIUS);

        if (apple.type === "ruby") {
          // Shimmering Faceted Royal Ruby Gem
          const rubyGrad = ctx.createLinearGradient(-7, -7, 7, 7);
          rubyGrad.addColorStop(0, "#f472b6");
          rubyGrad.addColorStop(0.5, "#ec4899");
          rubyGrad.addColorStop(1, "#9d174d");
          ctx.fillStyle = rubyGrad;

          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(8, -2);
          ctx.lineTo(5, 7);
          ctx.lineTo(-5, 7);
          ctx.lineTo(-8, -2);
          ctx.closePath();
          ctx.fill();

          // Internal facets
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(0, 7);
          ctx.moveTo(-8, -2);
          ctx.lineTo(8, -2);
          ctx.stroke();

          // Glint sparkle
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-2, -4, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 3D Red Delicious Apple
          const appleGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
          appleGrad.addColorStop(0, "#f87171");
          appleGrad.addColorStop(0.6, "#dc2626");
          appleGrad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = appleGrad;

          // Apple body
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();

          // Shiny specular highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
          ctx.beginPath();
          ctx.arc(-2.5, -2.5, 2, 0, Math.PI * 2);
          ctx.fill();

          // Curved Wooden Stem & Green Leaf
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.quadraticCurveTo(2, -11, 4, -13);
          ctx.stroke();

          ctx.fillStyle = "#15803d";
          ctx.beginPath();
          ctx.ellipse(3, -11, 3.5, 1.8, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      ctx.restore(); // END ROTATING LOG

      // RENDER FLYING KNIFE FOR PLAYER 1 (Moving Up)
      if (p1FlyingRef.current) {
        const k = p1FlyingRef.current;

        // Motion trail ribbon
        k.trail.forEach((pt, idx) => {
          ctx.fillStyle = `rgba(59, 130, 246, ${(idx / k.trail.length) * 0.4})`;
          ctx.fillRect(pt.x - 2, pt.y, 4, 14);
        });

        ctx.save();
        ctx.translate(k.x, k.y);

        // Blade
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(-4.5, 0);
        ctx.lineTo(-2.5, -24);
        ctx.lineTo(0, -32);
        ctx.lineTo(2.5, -24);
        ctx.lineTo(4.5, 0);
        ctx.closePath();
        ctx.fill();

        // Polished center fuller
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, -26);
        ctx.stroke();

        // Crossguard & Hilt
        ctx.fillStyle = "#334155";
        ctx.fillRect(-6, 0, 12, 3);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-2.5, 3, 5, 15);
        ctx.fillStyle = "#ca8a04";
        ctx.beginPath();
        ctx.arc(0, 19, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // RENDER FLYING KNIFE FOR PLAYER 2 (Moving Down)
      if (p2FlyingRef.current) {
        const k = p2FlyingRef.current;

        k.trail.forEach((pt, idx) => {
          ctx.fillStyle = `rgba(239, 68, 68, ${(idx / k.trail.length) * 0.4})`;
          ctx.fillRect(pt.x - 2, pt.y - 14, 4, 14);
        });

        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(Math.PI);

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-4.5, 0);
        ctx.lineTo(-2.5, -24);
        ctx.lineTo(0, -32);
        ctx.lineTo(2.5, -24);
        ctx.lineTo(4.5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, -26);
        ctx.stroke();

        ctx.fillStyle = "#334155";
        ctx.fillRect(-6, 0, 12, 3);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-2.5, 3, 5, 15);
        ctx.fillStyle = "#ca8a04";
        ctx.beginPath();
        ctx.arc(0, 19, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // RENDER SHOCKWAVES
      shockwavesRef.current = shockwavesRef.current
        .map((sw) => ({
          ...sw,
          r: sw.r + 3.2,
          alpha: sw.alpha - 0.06,
        }))
        .filter((sw) => sw.alpha > 0);

      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // RENDER JUICE DROPLETS
      juiceDropletsRef.current = juiceDropletsRef.current
        .map((jd) => ({
          ...jd,
          x: jd.x + jd.vx,
          y: jd.y + jd.vy,
          vy: jd.vy + 0.25,
          alpha: jd.alpha - 0.035,
        }))
        .filter((jd) => jd.alpha > 0);

      juiceDropletsRef.current.forEach((jd) => {
        ctx.save();
        ctx.fillStyle = jd.color;
        ctx.globalAlpha = jd.alpha;
        ctx.beginPath();
        ctx.arc(jd.x, jd.y, jd.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // RENDER SLICED FRUIT HALVES
      slicedHalvesRef.current = slicedHalvesRef.current
        .map((sh) => ({
          ...sh,
          x: sh.x + sh.vx,
          y: sh.y + sh.vy,
          vy: sh.vy + 0.26,
          rot: sh.rot + sh.vrot,
          alpha: sh.alpha - 0.028,
        }))
        .filter((sh) => sh.alpha > 0);

      slicedHalvesRef.current.forEach((sh) => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.globalAlpha = sh.alpha;

        if (sh.type === "ruby") {
          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(6, 0);
          ctx.lineTo(0, 6);
          ctx.closePath();
          ctx.fill();
        } else {
          // Apple skin & cream flesh
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.arc(0, 0, 7.5, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI);
          ctx.fill();
          // Seed
          ctx.fillStyle = "#451a03";
          ctx.beginPath();
          ctx.ellipse(0, 2, 1, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // RENDER BROKEN BLADE SHARDS
      brokenPiecesRef.current = brokenPiecesRef.current
        .map((bp) => ({
          ...bp,
          x: bp.x + bp.vx,
          y: bp.y + bp.vy,
          vy: bp.vy + 0.28,
          rot: bp.rot + bp.vrot,
          alpha: bp.alpha - 0.03,
        }))
        .filter((bp) => bp.alpha > 0);

      brokenPiecesRef.current.forEach((bp) => {
        ctx.save();
        ctx.translate(bp.x, bp.y);
        ctx.rotate(bp.rot);
        ctx.globalAlpha = bp.alpha;
        ctx.fillStyle = bp.color;
        ctx.fillRect(-bp.size / 2, -bp.size / 4, bp.size, bp.size / 2);
        ctx.restore();
      });

      // RENDER SPARKS
      sparksRef.current = sparksRef.current
        .map((sp) => ({
          ...sp,
          x: sp.x + sp.vx,
          y: sp.y + sp.vy,
          life: sp.life - 0.045,
        }))
        .filter((sp) => sp.life > 0);

      sparksRef.current.forEach((sp) => {
        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.life;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // RENDER FLOATING SCORES
      floatingScoresRef.current = floatingScoresRef.current
        .map((fs) => ({
          ...fs,
          y: fs.y + fs.vy,
          alpha: fs.alpha - 0.025,
        }))
        .filter((fs) => fs.alpha > 0);

      floatingScoresRef.current.forEach((fs) => {
        ctx.save();
        ctx.fillStyle = fs.color;
        ctx.globalAlpha = fs.alpha;
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      });

      ctx.restore(); // END SHAKE

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, screenShake, embeddedKnives, apples, p1KnivesLeft, p2KnivesLeft, roundOver, matchWinner]);

  // Quiver HUD helper
  const renderQuiver = (left: number, color: "blue" | "red", isInverted = false) => (
    <div className={`flex items-center gap-1.5 ${isInverted ? "rotate-180" : ""}`}>
      {Array.from({ length: MAX_KNIVES }).map((_, idx) => (
        <div
          key={idx}
          className={`w-2.5 h-6 rounded-xs transition-all duration-300 relative ${
            idx < left
              ? color === "blue"
                ? "bg-gradient-to-t from-blue-700 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]"
                : "bg-gradient-to-t from-red-700 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
              : "bg-neutral-800/60 opacity-30 border border-white/5"
          }`}
        >
          {idx < left && (
            <div className="absolute inset-x-0.5 top-0.5 h-1.5 bg-white/60 rounded-xs" />
          )}
        </div>
      ))}
    </div>
  );

  const knifeHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-amber-950/40 rounded-2xl flex items-center justify-center border border-amber-500/20 overflow-hidden">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {/* Outer Log Target */}
          <circle cx="80" cy="80" r="48" fill="#542a12" stroke="#180a03" strokeWidth="4" />
          <circle cx="80" cy="80" r="45" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          <circle cx="80" cy="80" r="32" fill="none" stroke="#92400e" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="20" fill="none" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="12" fill="#ca8a04" stroke="#713f12" strokeWidth="1" />

          {/* Sliced Apple on rim */}
          <circle cx="114" cy="80" r="7" fill="#ef4444" />
          <circle cx="112" cy="78" r="2" fill="#ffffff" opacity="0.7" />

          {/* Blue Knife Embedded */}
          <g transform="translate(80, 126)">
            <polygon points="0,-22 -4,0 4,0" fill="#3b82f6" />
            <line x1="0" y1="-2" x2="0" y2="-18" stroke="#ffffff" strokeWidth="1" />
            <rect x="-5" y="0" width="10" height="2.5" fill="#334155" />
            <rect x="-2" y="2.5" width="4" height="10" fill="#0f172a" />
          </g>

          {/* Red Knife Embedded */}
          <g transform="translate(80, 34) rotate(180)">
            <polygon points="0,-22 -4,0 4,0" fill="#ef4444" />
            <line x1="0" y1="-2" x2="0" y2="-18" stroke="#ffffff" strokeWidth="1" />
            <rect x="-5" y="0" width="10" height="2.5" fill="#334155" />
            <rect x="-2" y="2.5" width="4" height="10" fill="#0f172a" />
          </g>

          {/* Spark Burst */}
          <circle cx="80" cy="80" r="1.5" fill="#facc15" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Shared Spinning Log Duel",
      desc: "You launch Blue knives from bottom; Opponent launches Red knives from top!",
      icon: "🗡️",
    },
    {
      title: "Don't Clash Blades!",
      desc: "Striking ANY already embedded blade shatters your knife and loses the round instantly!",
      icon: "💥",
    },
    {
      title: "Full-Screen Rapid Touch",
      desc: "Tap anywhere on your half to throw instantly! Embed all 7 knives to win.",
      icon: "⚡",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="KNIFE THROWER"
          subtitle="Precision Blade Duel"
          categoryTag="DEXTERITY & AIM"
          accentColor="#ea580c"
          objective="Launch blades into the spinning timber round! Dodge obstacles and slice apples. First to 3 round wins!"
          heroGraphic={knifeHero}
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
      {/* Top HUD & Scoreboard */}
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
          <span>STAGE {currentRound}</span>
        </div>
      </div>

      {/* Player 2 Quiver & Status (Top) */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 py-1 z-30">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-red-400 uppercase">
            {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2 (RED)"}
          </span>
          {renderQuiver(p2KnivesLeft, "red", playMode === "friend")}
        </div>

        {playMode === "friend" && (
          <button
            type="button"
            onPointerDown={() => throwKnife("p2")}
            className="px-4 py-2 bg-red-600 active:bg-red-700 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md cursor-pointer select-none touch-none"
          >
            P2 THROW ▲
          </button>
        )}
      </div>

      {/* Live Status Notice */}
      <div className="w-full max-w-sm text-center my-0.5 z-30">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {bannerMessage}
        </span>
      </div>

      {/* Main Canvas Arena with Full-Screen Touch Detection */}
      <div className="relative w-full max-w-sm h-[390px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Interactive Full-Screen Touch Split Zones:
            Tap TOP HALF throws for P2 (in friend mode)!
            Tap BOTTOM HALF throws for P1! */}
        <div className="absolute inset-0 flex flex-col z-20 cursor-pointer">
          <div
            onPointerDown={() => {
              if (playMode === "friend") throwKnife("p2");
            }}
            className="flex-1 active:bg-red-500/5 transition-colors"
          />
          <div
            onPointerDown={() => throwKnife("p1")}
            className="flex-1 active:bg-blue-500/5 transition-colors"
          />
        </div>

        {/* Round Over Modal */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-40 text-center">
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
              {roundWinner === "p1" ? "🎉 BLUE SCORES POINT!" : "💥 RED SCORES POINT!"}
            </h3>
            <p className="text-xs font-bold text-neutral-300 mt-1">{bannerMessage}</p>
            <p className="text-sm font-black text-emerald-400 mt-2">
              Score: {p1Score} pts
            </p>
            <button
              type="button"
              onPointerDown={advanceToNextRound}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              NEXT STAGE
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
              {matchWinner === "p1" ? "BLUE VICTORY!" : "RED VICTORY!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Wins} - {p2Wins}</p>
            <p className="text-sm font-bold text-amber-400 mt-1">Total Points: {p1Score}</p>

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

      {/* Player 1 Quiver & Throw Pedal (Bottom) */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 py-2 z-30">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-blue-400 uppercase">P1 (BLUE)</span>
          {renderQuiver(p1KnivesLeft, "blue", false)}
        </div>

        <button
          type="button"
          onPointerDown={() => throwKnife("p1")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg cursor-pointer select-none touch-none"
        >
          THROW BLADE ▲
        </button>
      </div>

      {/* Footer touch guide */}
      <div className="w-full max-w-sm text-center pb-1 z-30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          TAP ANYWHERE ON SCREEN OR PRESS SPACEBAR TO THROW
        </span>
      </div>
    </div>
  );
}
