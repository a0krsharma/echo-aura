"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Shield, Zap, Trophy, AlertTriangle, Users, Bot, Flame } from "lucide-react";

interface HandSlapGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

type Role = "attacker" | "defender";

interface ImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export default function HandSlapGame({
  match,
  currentUid,
  onBack,
}: HandSlapGameProps) {
  const initialMode: "bot" | "friend" = match?.mode === "MULTIPLAYER" ? "friend" : "bot";
  const rawDiff = (match?.difficulty || "").toLowerCase();
  const initialDiff: BotDifficulty = rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
  const hasPreselectedMode = Boolean(match?.mode);

  const [inMenu, setInMenu] = useState(!hasPreselectedMode);
  const [playMode, setPlayMode] = useState<"bot" | "friend">(initialMode);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

  // Scores (First to 5)
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Role, setP1Role] = useState<Role>("attacker");

  // Psychological Tension & Flinch Rules
  const [p1Flinches, setP1Flinches] = useState(0);
  const [p2Flinches, setP2Flinches] = useState(0);
  const [slapRednessP1, setSlapRednessP1] = useState(0); // 0 to 5 redness trauma
  const [slapRednessP2, setSlapRednessP2] = useState(0);
  const [statusBanner, setStatusBanner] = useState<string>("READY! TENSION RISING...");
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Animation states
  // Attacker Hand Position: 0 (rest), 1 (slap strike), -0.25 (feint twitch)
  const [attackerProgress, setAttackerProgress] = useState(0);
  // Defender Hand Position: 0 (rest), -1 (retracted dodge)
  const [defenderProgress, setDefenderProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const actionLock = useRef(false);
  const slapInitiatedTime = useRef<number>(0);
  const botTimer = useRef<NodeJS.Timeout | null>(null);

  // Flash & vibration refs for slapped hands
  const slapFlashP1Ref = useRef(0);
  const slapFlashP2Ref = useRef(0);

  // Particle & FX refs
  const particlesRef = useRef<ImpactParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const popupsRef = useRef<FloatingPopup[]>([]);
  const idleTimeRef = useRef(0);

  // Shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 3)), 30);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setP1Role("attacker");
    setP1Flinches(0);
    setP2Flinches(0);
    setSlapRednessP1(0);
    setSlapRednessP2(0);
    slapFlashP1Ref.current = 0;
    slapFlashP2Ref.current = 0;
    setAttackerProgress(0);
    setDefenderProgress(0);
    setScreenShake(0);
    setLastReactionMs(null);
    setStatusBanner("ATTACKER: SLAP OR FEINT! DEFENDER: DODGE!");
    setGameOver(false);
    setWinner(null);
    actionLock.current = false;
    particlesRef.current = [];
    shockwavesRef.current = [];
    popupsRef.current = [];
    setInMenu(false);
  }, []);

  // Auto-start immediately if mode & difficulty were chosen in lobby (never ask twice)
  useEffect(() => {
    if (hasPreselectedMode) {
      startGame(initialMode, initialDiff);
    }
  }, [hasPreselectedMode, initialMode, initialDiff, startGame]);

  const concludeGame = useCallback(
    (wonBy: "p1" | "p2") => {
      setGameOver(true);
      setWinner(wonBy);
      arcadeSfx.playVictory();
      if (wonBy === "p1" && currentUid && match?.id) {
        updateArcadeGameScore(match.id, currentUid, "hand_slap" as any, 100, true);
      }
    },
    [currentUid, match]
  );

  // Trigger Feint Twitch Bait
  const triggerFeint = useCallback(
    (by: "p1" | "p2") => {
      const activeAttacker = p1Role === "attacker" ? "p1" : "p2";
      if (by !== activeAttacker || actionLock.current || gameOver) return;

      arcadeSfx.playButtonTap();
      setAttackerProgress(-0.35); // Quick twitch forward

      // Popups
      popupsRef.current.push({
        x: 180,
        y: 195,
        text: "👀 FEINT BAIT!",
        color: "#fbbf24",
        alpha: 1,
      });

      setTimeout(() => {
        setAttackerProgress(0);
      }, 130);
    },
    [p1Role, gameOver]
  );

  // Trigger Slap Strike
  const triggerSlap = useCallback(
    (by: "p1" | "p2") => {
      const activeAttacker = p1Role === "attacker" ? "p1" : "p2";
      if (by !== activeAttacker || actionLock.current || gameOver) return;

      actionLock.current = true;
      slapInitiatedTime.current = Date.now();

      // Slap animation starts
      setAttackerProgress(1);
      arcadeSfx.playWhoosh();

      // Strike impact evaluated after 160ms flight time
      setTimeout(() => {
        const defenderDodged = defenderProgress < -0.4;
        const reactionDuration = Date.now() - slapInitiatedTime.current;
        setLastReactionMs(reactionDuration);

        if (!defenderDodged) {
          // DIRECT HIT! THWACK!
          arcadeSfx.playSlap();
          setScreenShake(14);

          // Shockwave at contact point
          shockwavesRef.current.push({
            x: 180,
            y: 200,
            radius: 12,
            maxRadius: 75,
            alpha: 1,
          });

          // Impact Sparks & Stinging Sweat Droplets
          for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 7;
            particlesRef.current.push({
              x: 180,
              y: 200,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              color: i % 2 === 0 ? "#ef4444" : "#fde047",
              size: 2.5 + Math.random() * 3,
            });
          }

          // Increase redness and trigger sting flash of the defender
          if (activeAttacker === "p1") {
            slapFlashP2Ref.current = 1.0;
            setSlapRednessP2((r) => Math.min(5, r + 1));
            popupsRef.current.push({
              x: 180,
              y: 180,
              text: "💥 THWACK! OPPONENT TURNS RED!",
              color: "#ef4444",
              alpha: 1,
            });
            const nextScore = p1Score + 1;
            setP1Score(nextScore);
            setStatusBanner(`DIRECT HIT! (${reactionDuration}ms)`);
            if (nextScore >= 5) {
              concludeGame("p1");
              return;
            }
          } else {
            slapFlashP1Ref.current = 1.0;
            setSlapRednessP1((r) => Math.min(5, r + 1));
            popupsRef.current.push({
              x: 180,
              y: 210,
              text: "🔥 OUCH! YOUR HAND TURNS RED!",
              color: "#ef4444",
              alpha: 1,
            });
            const nextScore = p2Score + 1;
            setP2Score(nextScore);
            setStatusBanner(`OPPONENT HIT! (${reactionDuration}ms)`);
            if (nextScore >= 5) {
              concludeGame("p2");
              return;
            }
          }
        } else {
          // CLEAN DODGE! Whiffed table thud & roles swap!
          arcadeSfx.playPingPongBounce(false);
          popupsRef.current.push({
            x: 180,
            y: 195,
            text: "💨 WHIFF! CLEAN DODGE!",
            color: "#38bdf8",
            alpha: 1,
          });
          setStatusBanner(`DODGED IN ${reactionDuration}ms! ROLES SWAP!`);

          // Clear flinches and swap roles
          setP1Flinches(0);
          setP2Flinches(0);
          setP1Role((r) => (r === "attacker" ? "defender" : "attacker"));
        }

        // Return hands to rest
        setTimeout(() => {
          setAttackerProgress(0);
          setDefenderProgress(0);
          actionLock.current = false;
        }, 360);
      }, 160);
    },
    [p1Role, defenderProgress, p1Score, p2Score, concludeGame, gameOver]
  );

  // Trigger Dodge / Retreat
  const triggerDodge = useCallback(
    (by: "p1" | "p2") => {
      const activeDefender = p1Role === "defender" ? "p1" : "p2";
      if (by !== activeDefender || actionLock.current || gameOver) return;

      arcadeSfx.playWhoosh();
      setDefenderProgress(-1); // Jerk hand back

      // Check if this was a premature flinch (attacker hasn't started slapping)
      const isAttacking = attackerProgress > 0.2;
      if (!isAttacking) {
        // FALSE RETREAT / FLINCH!
        if (activeDefender === "p1") {
          const next = p1Flinches + 1;
          setP1Flinches(next);
          if (next >= 3) {
            arcadeSfx.playPenaltyBuzz();
            popupsRef.current.push({
              x: 180,
              y: 195,
              text: "🚨 3 FLINCHES! PENALTY TO P2!",
              color: "#f43f5e",
              alpha: 1,
            });
            setP1Flinches(0);
            const nextScore = p2Score + 1;
            setP2Score(nextScore);
            if (nextScore >= 5) concludeGame("p2");
          } else {
            setStatusBanner(`⚠️ FLINCH! (${next}/3 FALSE RETREATS)`);
          }
        } else {
          const next = p2Flinches + 1;
          setP2Flinches(next);
          if (next >= 3) {
            arcadeSfx.playPenaltyBuzz();
            popupsRef.current.push({
              x: 180,
              y: 195,
              text: "🚨 3 FLINCHES! PENALTY TO P1!",
              color: "#f43f5e",
              alpha: 1,
            });
            setP2Flinches(0);
            const nextScore = p1Score + 1;
            setP1Score(nextScore);
            if (nextScore >= 5) concludeGame("p1");
          } else {
            setStatusBanner(`⚠️ BOT FLINCHED! (${next}/3)`);
          }
        }
      }

      // Restore position smoothly
      setTimeout(() => {
        if (!actionLock.current) {
          setDefenderProgress(0);
        }
      }, 400);
    },
    [p1Role, attackerProgress, p1Flinches, p2Flinches, p1Score, p2Score, concludeGame, gameOver]
  );

  // Bot AI loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver) {
      if (botTimer.current) clearTimeout(botTimer.current);
      return;
    }

    const isBotAttacker = p1Role === "defender";

    if (isBotAttacker) {
      // Bot is attacking: delays, feints, and strikes
      const waitMs =
        botDiff === "hard"
          ? 750 + Math.random() * 1100
          : botDiff === "medium"
          ? 1000 + Math.random() * 1400
          : 1400 + Math.random() * 1800;

      botTimer.current = setTimeout(() => {
        if (actionLock.current) return;
        // 35% chance to feint first
        if (Math.random() < 0.35) {
          triggerFeint("p2");
          // Follow up with real slap shortly after
          botTimer.current = setTimeout(() => {
            if (!actionLock.current) triggerSlap("p2");
          }, 350 + Math.random() * 300);
        } else {
          triggerSlap("p2");
        }
      }, waitMs);
    } else {
      // Bot is defender: reacts to player's attack
      if (attackerProgress > 0.15 && !actionLock.current) {
        // Reaction delay based on difficulty
        const reactionDelay =
          botDiff === "hard"
            ? 120 + Math.random() * 70 // ~155ms (Hard)
            : botDiff === "medium"
            ? 170 + Math.random() * 80 // ~210ms (Medium)
            : 240 + Math.random() * 90; // ~285ms (Easy)

        botTimer.current = setTimeout(() => {
          // 85% chance to successfully dodge on Hard, 65% on Medium, 40% on Easy
          const dodgeChance = botDiff === "hard" ? 0.85 : botDiff === "medium" ? 0.65 : 0.4;
          if (Math.random() < dodgeChance) {
            triggerDodge("p2");
          }
        }, reactionDelay);
      }
    }

    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [inMenu, playMode, gameOver, p1Role, attackerProgress, botDiff, triggerSlap, triggerFeint, triggerDodge]);

  // Main Canvas Render Loop (Normal Human Hands & Slap Redness)
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Normal hand contour path
    // Origin (0, 0) is at palm center. Fingers extend towards -y, wrist towards +y.
    const traceNormalHandPath = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      // Left forearm
      c.moveTo(-22, 95);
      c.lineTo(-22, 52);

      // Thenar eminence (palm thumb mound)
      c.bezierCurveTo(-26, 40, -38, 28, -42, 12);

      // Thumb projection outward
      c.bezierCurveTo(-46, -2, -50, -14, -48, -26);

      // Rounded thumb tip
      c.quadraticCurveTo(-44, -36, -34, -33);

      // Thumb inner edge
      c.bezierCurveTo(-28, -26, -25, -12, -22, 4);

      // Web space between thumb and index finger
      c.quadraticCurveTo(-20, -10, -24, -26);

      // Index finger (2nd digit)
      c.lineTo(-26, -64);
      c.quadraticCurveTo(-19, -76, -12, -64);
      c.lineTo(-12, -26);

      // Web space between index and middle finger
      c.quadraticCurveTo(-11, -16, -9, -26);

      // Middle finger (3rd digit - longest)
      c.lineTo(-9, -78);
      c.quadraticCurveTo(0, -92, 9, -78);
      c.lineTo(9, -26);

      // Web space between middle and ring finger
      c.quadraticCurveTo(10, -16, 12, -26);

      // Ring finger (4th digit)
      c.lineTo(12, -68);
      c.quadraticCurveTo(19, -80, 26, -68);
      c.lineTo(26, -22);

      // Web space between ring and pinky finger
      c.quadraticCurveTo(27, -14, 29, -18);

      // Pinky finger (5th digit - shortest)
      c.lineTo(29, -50);
      c.quadraticCurveTo(35, -59, 41, -50);
      c.lineTo(39, -14);

      // Hypothenar (outer palm edge)
      c.bezierCurveTo(42, 6, 40, 32, 34, 50);

      // Right wrist & forearm
      c.lineTo(22, 52);
      c.lineTo(22, 95);

      c.closePath();
    };

    // Draw normal human hand with authentic slap redness
    const drawHand = (
      x: number,
      y: number,
      isTop: boolean,
      isAttackingHand: boolean,
      rednessLevel: number,
      displacementY: number,
      idleTremor: number,
      flashIntensity: number
    ) => {
      ctx.save();

      // Recoil vibration when slapped
      const stingJolt = flashIntensity > 0 ? Math.sin(flashIntensity * 30) * flashIntensity * 8 : 0;
      ctx.translate(x, y + displacementY + idleTremor + stingJolt);

      if (isTop) {
        // Inverted 180° so opponent's hand points down toward player across the table
        ctx.rotate(Math.PI);
      }

      // Soft natural hand drop shadow on table
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 15, 52, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Palette calculation:
      // Normal healthy skin (Level 0) -> progressively reddens as slapped (Level 1 to 5)
      const r = Math.min(5, Math.max(0, rednessLevel));

      let cHighlight: string;
      let cBase: string;
      let cShadow: string;
      let cStroke: string;
      let cCrease: string;

      if (r === 0) {
        // Normal healthy human skin tone
        cHighlight = "#fde2cb";
        cBase = "#f4be9b";
        cShadow = "#dd9a73";
        cStroke = "#c48259";
        cCrease = "rgba(160, 95, 60, 0.25)";
      } else if (r === 1) {
        // Level 1: Flushed warm pink-red from first slap
        cHighlight = "#fca898";
        cBase = "#f29888";
        cShadow = "#db6654";
        cStroke = "#c44e3c";
        cCrease = "rgba(180, 50, 40, 0.35)";
      } else if (r === 2) {
        // Level 2: Distinctly red and irritated
        cHighlight = "#f8786b";
        cBase = "#ea5446";
        cShadow = "#c83327";
        cStroke = "#aa2217";
        cCrease = "rgba(170, 30, 25, 0.45)";
      } else if (r === 3) {
        // Level 3: Fiery bright red inflamed skin
        cHighlight = "#ef4444";
        cBase = "#dc2626";
        cShadow = "#991b1b";
        cStroke = "#7f1d1d";
        cCrease = "rgba(130, 15, 15, 0.55)";
      } else if (r === 4) {
        // Level 4: Swollen deep crimson red
        cHighlight = "#dc2626";
        cBase = "#b91c1c";
        cShadow = "#7f1d1d";
        cStroke = "#550b0b";
        cCrease = "rgba(90, 10, 10, 0.65)";
      } else {
        // Level 5: Scorched burning bright red
        cHighlight = "#ff3b30";
        cBase = "#991b1b";
        cShadow = "#450a0a";
        cStroke = "#2b0505";
        cCrease = "rgba(60, 5, 5, 0.8)";
      }

      // Red heat aura when slapped
      if (r >= 2) {
        ctx.shadowColor = `rgba(239, 68, 68, ${0.25 + r * 0.12})`;
        ctx.shadowBlur = 8 + r * 5;
      }

      // 1. Fill base hand with smooth natural skin gradient
      const skinGrad = ctx.createLinearGradient(-36, 0, 36, 30);
      skinGrad.addColorStop(0, cShadow);
      skinGrad.addColorStop(0.28, cHighlight);
      skinGrad.addColorStop(0.68, cBase);
      skinGrad.addColorStop(1, cShadow);

      traceNormalHandPath(ctx);
      ctx.fillStyle = skinGrad;
      ctx.fill();

      // Reset shadow for inner details
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 2. Subtle dorsal tendon highlights (natural hand ridges)
      ctx.save();
      ctx.strokeStyle = cHighlight;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = 0.28;
      // Index tendon
      ctx.beginPath();
      ctx.moveTo(-18, 25);
      ctx.lineTo(-19, -35);
      ctx.stroke();
      // Middle tendon
      ctx.beginPath();
      ctx.moveTo(-2, 30);
      ctx.lineTo(0, -45);
      ctx.stroke();
      // Ring tendon
      ctx.beginPath();
      ctx.moveTo(14, 25);
      ctx.lineTo(18, -35);
      ctx.stroke();
      ctx.restore();

      // 3. Natural Translucent Fingernails
      const drawNail = (
        nx: number,
        ny: number,
        nw: number,
        nh: number,
        angle: number
      ) => {
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(angle);

        // Nail bed pink flush
        ctx.fillStyle = r > 0 ? "rgba(220, 38, 38, 0.45)" : "rgba(235, 175, 160, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 0, nw, nh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Translucent nail shine
        ctx.fillStyle = "rgba(255, 250, 245, 0.45)";
        ctx.beginPath();
        ctx.ellipse(0, -nh * 0.25, nw * 0.75, nh * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      drawNail(-38, -30, 5.5, 4.5, -0.4); // Thumb
      drawNail(-19, -68, 5, 4.5, 0); // Index
      drawNail(0, -83, 5.5, 5, 0); // Middle
      drawNail(19, -72, 5, 4.5, 0); // Ring
      drawNail(35, -53, 4, 3.5, 0.15); // Pinky

      // 4. Natural Knuckle Creases (Soft, thin horizontal wrinkles)
      ctx.save();
      ctx.strokeStyle = cCrease;
      ctx.lineWidth = 1.2;

      // Thumb joint
      ctx.beginPath();
      ctx.arc(-39, -16, 5, -0.2, Math.PI * 0.5);
      ctx.stroke();

      // Finger joint creases
      const fingerCreases = [
        { x: -19, y1: -46, y2: -32, w: 4.5 },
        { x: 0, y1: -56, y2: -38, w: 5 },
        { x: 19, y1: -48, y2: -34, w: 4.5 },
        { x: 35, y1: -36, y2: -24, w: 3.5 },
      ];

      fingerCreases.forEach((fc) => {
        ctx.beginPath();
        ctx.moveTo(fc.x - fc.w, fc.y1);
        ctx.lineTo(fc.x + fc.w, fc.y1);
        ctx.moveTo(fc.x - fc.w + 0.5, fc.y2);
        ctx.lineTo(fc.x + fc.w - 0.5, fc.y2);
        ctx.stroke();
      });

      // Wrist fold line
      ctx.beginPath();
      ctx.moveTo(-16, 50);
      ctx.quadraticCurveTo(0, 52, 16, 50);
      ctx.stroke();
      ctx.restore();

      // 5. Authentic Slap Marks & Red Stinging Welts (when slapped)
      if (r > 0) {
        ctx.save();
        // Central red impact blush
        const weltAlpha = Math.min(0.85, 0.3 + r * 0.12);
        const weltGrad = ctx.createRadialGradient(0, 5, 2, 0, 5, 34);
        weltGrad.addColorStop(0, `rgba(185, 28, 28, ${weltAlpha})`);
        weltGrad.addColorStop(0.6, `rgba(225, 29, 72, ${weltAlpha * 0.7})`);
        weltGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = weltGrad;
        ctx.beginPath();
        ctx.ellipse(0, 5, 32, 24, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 4 Slap Finger Streaks stamped across the hand
        const weltFingerAlpha = Math.min(0.8, 0.25 + r * 0.12);
        ctx.fillStyle = `rgba(180, 20, 20, ${weltFingerAlpha})`;
        const slapFingerMarks = [
          { x: -16, y: 0, w: 6, h: 26, rot: -0.15 },
          { x: -5, y: -4, w: 7, h: 32, rot: -0.05 },
          { x: 6, y: -2, w: 6.5, h: 30, rot: 0.05 },
          { x: 17, y: 3, w: 5.5, h: 24, rot: 0.18 },
        ];

        slapFingerMarks.forEach((m) => {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, m.w * 0.5, m.h * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Heat smoke wisps for heavily slapped hands (Level 3+)
        if (r >= 3 && Math.random() < 0.35) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 45,
            y: y + displacementY + (isTop ? -10 : 10),
            vx: (Math.random() - 0.5) * 1.2,
            vy: isTop ? 1.8 : -1.8,
            life: 1,
            color: "rgba(255, 180, 180, 0.65)",
            size: 2.5 + Math.random() * 3,
          });
        }
        ctx.restore();
      }

      // 6. Clean, natural outer hand contour outline
      traceNormalHandPath(ctx);
      ctx.strokeStyle = cStroke;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 7. Instant Stinging Red Flash overlay upon impact
      if (flashIntensity > 0) {
        ctx.save();
        traceNormalHandPath(ctx);
        ctx.fillStyle = `rgba(239, 68, 68, ${flashIntensity * 0.65})`;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    };

    const loop = () => {
      idleTimeRef.current += 0.05;
      const t = idleTimeRef.current;
      const naturalTremor = Math.sin(t * 3.5) * 1.2;

      // Decay slap impact flashes
      if (slapFlashP1Ref.current > 0) {
        slapFlashP1Ref.current = Math.max(0, slapFlashP1Ref.current - 0.05);
      }
      if (slapFlashP2Ref.current > 0) {
        slapFlashP2Ref.current = Math.max(0, slapFlashP2Ref.current - 0.05);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Camera impact shake
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Warm Wooden Duel Table Background
      const tableGrad = ctx.createLinearGradient(0, 0, 0, 400);
      tableGrad.addColorStop(0, "#381c0e");
      tableGrad.addColorStop(0.5, "#542a15");
      tableGrad.addColorStop(1, "#271207");
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood plank seams
      ctx.strokeStyle = "rgba(254, 215, 170, 0.09)";
      ctx.lineWidth = 2;
      [65, 130, 200, 270, 340].forEach((lineY) => {
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(360, lineY);
        ctx.stroke();
      });

      // Table Center Clash Line Divider
      ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(15, 200);
      ctx.lineTo(345, 200);
      ctx.stroke();
      ctx.setLineDash([]);

      const isP1Attacking = p1Role === "attacker";

      // Slap velocity offsets
      let topDisplace = 0;
      let bottomDisplace = 0;

      if (isP1Attacking) {
        // P1 attacks toward P2 (moves up toward center)
        bottomDisplace = attackerProgress * -85;
        // P2 dodges (pulls backward away from center)
        topDisplace = defenderProgress * -45;
      } else {
        // P2 attacks toward P1 (moves down toward center)
        topDisplace = attackerProgress * 85;
        // P1 dodges (pulls backward away from center)
        bottomDisplace = defenderProgress * 45;
      }

      // Render Top Hand (Opponent / P2)
      drawHand(
        180,
        110,
        true,
        !isP1Attacking,
        slapRednessP2,
        topDisplace,
        naturalTremor,
        slapFlashP2Ref.current
      );

      // Render Bottom Hand (Player 1 / You)
      drawHand(
        180,
        290,
        false,
        isP1Attacking,
        slapRednessP1,
        bottomDisplace,
        naturalTremor,
        slapFlashP1Ref.current
      );

      // Update & Render Shockwaves
      shockwavesRef.current = shockwavesRef.current
        .map((sw) => ({
          ...sw,
          radius: sw.radius + 4.5,
          alpha: sw.alpha - 0.06,
        }))
        .filter((sw) => sw.alpha > 0);

      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Update & Render Particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.18,
          life: p.life - 0.04,
        }))
        .filter((p) => p.life > 0);

      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Update & Render Floating Popups
      popupsRef.current = popupsRef.current
        .map((pop) => ({
          ...pop,
          y: pop.y - 1.4,
          alpha: pop.alpha - 0.03,
        }))
        .filter((pop) => pop.alpha > 0);

      popupsRef.current.forEach((pop) => {
        ctx.save();
        ctx.globalAlpha = pop.alpha;
        ctx.font = "900 15px sans-serif";
        ctx.fillStyle = pop.color;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 6;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, p1Role, attackerProgress, defenderProgress, slapRednessP1, slapRednessP2, screenShake]);

  // Redness pip status helper
  const renderRednessMeter = (level: number, label: string) => {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/90 border border-white/10 shadow-sm text-[10px] font-bold">
        <span className="text-neutral-400">{label}:</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((idx) => (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx <= level
                  ? idx <= 2
                    ? "bg-amber-500 shadow-[0_0_6px_#f59e0b]"
                    : "bg-red-500 shadow-[0_0_6px_#ef4444]"
                  : "bg-neutral-700"
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Hero Graphic (Normal Hands Clashing with Red Slap Marks)
  const handSlapHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center border border-red-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <ellipse cx="80" cy="80" rx="72" ry="72" fill="#451a03" stroke="#92400e" strokeWidth="4" />
          {/* Top Hand (Normal Healthy Tan) */}
          <path
            d="M 68,18 Q 72,42 70,62 Q 80,68 90,62 Q 88,42 92,18 Z"
            fill="#f4be9b"
            stroke="#c48259"
            strokeWidth="2.5"
          />
          {/* Bottom Slapped Hand (Turning Red from Slap!) */}
          <path
            d="M 68,142 Q 72,118 70,98 Q 80,92 90,98 Q 88,118 92,142 Z"
            fill="#ef4444"
            stroke="#b91c1c"
            strokeWidth="2.5"
          />
          {/* Red Slap Handprint Marks */}
          <ellipse cx="80" cy="104" rx="10" ry="6" fill="#991b1b" opacity="0.8" />
          {/* Slap Impact Burst */}
          <circle cx="80" cy="80" r="15" fill="none" stroke="#fef08a" strokeWidth="3" strokeDasharray="5 3" />
          <polygon points="80,66 84,75 94,75 86,81 89,91 80,84 71,91 74,81 66,75 76,75" fill="#ef4444" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Real Quick-Draw Rules",
      desc: "Attacker hovers above. Tap SLAP to strike downward. Defender must dodge within 200ms!",
      icon: "⚡",
    },
    {
      title: "Slapped Hands Turn Red",
      desc: "Every time a hand gets slapped, it visibly turns redder and more inflamed! 5 slaps = victory.",
      icon: "✋",
    },
    {
      title: "Tactical Micro-Feints",
      desc: "Attacker can tap FEINT to twitch fingers forward! Baits defender into false retreats (3 flinches penalty).",
      icon: "👀",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="HAND SLAP"
          subtitle="Red Hands Reflex Duel"
          categoryTag="QUICK-DRAW REFLEX"
          accentColor="#E53935"
          objective="Attacker slaps before Defender dodges! Slapped hands turn redder with each hit. First to 5 wins!"
          heroGraphic={handSlapHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  const isP1Attacker = p1Role === "attacker";

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans relative">
      {/* Top Header & Scoreboard */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2 z-20">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Duel Score */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">YOU</span>
            <span className="text-2xl font-black text-blue-500">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">
              {playMode === "bot" ? `BOT (${botDiff.toUpperCase()})` : "P2"}
            </span>
            <span className="text-2xl font-black text-red-500">{p2Score}</span>
          </div>
        </div>

        {/* First to 5 Badge */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>TO 5</span>
        </div>
      </div>

      {/* Redness & Damage Readout */}
      <div className="w-full max-w-sm flex items-center justify-between px-3 mt-1 z-20">
        {renderRednessMeter(slapRednessP1, "YOUR REDNESS")}
        {renderRednessMeter(slapRednessP2, playMode === "bot" ? "BOT REDNESS" : "P2 REDNESS")}
      </div>

      {/* Tension Banner & Flinch / Reflex Info */}
      <div className="w-full max-w-sm flex flex-col items-center gap-1 my-1 z-20">
        <div className="text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-neutral-900/90 border border-white/15 text-neutral-200 shadow-md">
          {statusBanner}
        </div>

        {/* Flinch warning & Reaction time */}
        <div className="flex items-center justify-between w-full px-4 text-[11px] font-bold text-neutral-400">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>FLINCHES: {isP1Attacker ? p2Flinches : p1Flinches}/3</span>
          </span>
          {lastReactionMs !== null && (
            <span className="text-emerald-400 font-black">
              ⚡ {lastReactionMs}ms REFLEX
            </span>
          )}
        </div>
      </div>

      {/* 2-Player Top Inverted Controls (Only active in 2-Player Friend Mode) */}
      {playMode === "friend" && (
        <div className="w-full max-w-sm rotate-180 mb-2">
          {!isP1Attacker ? (
            /* P2 is Attacker */
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onPointerDown={() => triggerFeint("p2")}
                className="h-14 bg-amber-600 hover:bg-amber-700 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-white font-black text-xs rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer"
              >
                <span className="text-base">👀</span>
                <span>FEINT</span>
              </button>
              <button
                type="button"
                onPointerDown={() => triggerSlap("p2")}
                className="col-span-2 h-14 bg-red-600 hover:bg-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💥 SLAP!</span>
              </button>
            </div>
          ) : (
            /* P2 is Defender */
            <button
              type="button"
              onPointerDown={() => triggerDodge("p2")}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-5 h-5" />
              <span>DODGE / RETREAT</span>
            </button>
          )}
        </div>
      )}

      {/* Canvas Anatomical Hands Arena */}
      <div className="relative w-full max-w-sm h-[380px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {winner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Final Score: {p1Score} - {p2Score}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Player 1 Action Controls (Bottom) */}
      <div className="w-full max-w-sm flex flex-col gap-2 mt-2 z-20">
        {isP1Attacker ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onPointerDown={() => triggerFeint("p1")}
              className="h-16 bg-amber-600 hover:bg-amber-700 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-white font-black text-xs rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all"
            >
              <span className="text-xl">👀</span>
              <span className="uppercase tracking-wider">FEINT</span>
            </button>

            <button
              type="button"
              onPointerDown={() => triggerSlap("p1")}
              className="col-span-2 h-16 bg-red-600 hover:bg-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span className="text-2xl">💥</span>
              <span className="uppercase tracking-wider">SLAP!</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={() => triggerDodge("p1")}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer transition-all"
          >
            <Shield className="w-6 h-6" />
            <span className="uppercase tracking-wider">DODGE / PULL BACK</span>
          </button>
        )}
      </div>
    </div>
  );
}
