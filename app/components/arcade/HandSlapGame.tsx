"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Shield, Zap, Trophy, Flame, AlertTriangle, Users, Bot } from "lucide-react";

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
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Scores (First to 5)
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Role, setP1Role] = useState<Role>("attacker");

  // Psychological Tension & Flinch Rules
  const [p1Flinches, setP1Flinches] = useState(0);
  const [p2Flinches, setP2Flinches] = useState(0);
  const [slapRednessP1, setSlapRednessP1] = useState(0); // 0 to 5 trauma level
  const [slapRednessP2, setSlapRednessP2] = useState(0);
  const [statusBanner, setStatusBanner] = useState<string>("READY! TENSION RISING...");
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  // Animation states
  // Attacker Hand Position: 0 (rest), 1 (slap strike), -0.3 (feint twitch)
  const [attackerProgress, setAttackerProgress] = useState(0);
  // Defender Hand Position: 0 (rest), -1 (retracted dodge)
  const [defenderProgress, setDefenderProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const actionLock = useRef(false);
  const slapInitiatedTime = useRef<number>(0);
  const botTimer = useRef<NodeJS.Timeout | null>(null);

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
      setAttackerProgress(-0.4); // Quick twitch forward

      // Popups
      popupsRef.current.push({
        x: 180,
        y: 190,
        text: "👀 FEINT BAIT!",
        color: "#fbbf24",
        alpha: 1,
      });

      setTimeout(() => {
        setAttackerProgress(0);
      }, 120);
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
          // DIRECT HIT! Bone-cracking THWACK!
          arcadeSfx.playSlap();
          setScreenShake(14);

          // Shockwave at contact point
          shockwavesRef.current.push({
            x: 180,
            y: 200,
            radius: 10,
            maxRadius: 65,
            alpha: 1,
          });

          // Impact Sparks & Sweat Droplets
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            particlesRef.current.push({
              x: 180,
              y: 200,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              color: i % 2 === 0 ? "#ef4444" : "#fef08a",
              size: 2.5 + Math.random() * 2.5,
            });
          }

          // Increase redness of the defender
          if (activeAttacker === "p1") {
            setSlapRednessP2((r) => Math.min(5, r + 1));
            popupsRef.current.push({
              x: 180,
              y: 190,
              text: "💥 THWACK! +1 POINT!",
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
            setSlapRednessP1((r) => Math.min(5, r + 1));
            popupsRef.current.push({
              x: 180,
              y: 190,
              text: "💥 OUCH! +1 POINT!",
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
            y: 190,
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
        }, 350);
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
              y: 190,
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
              y: 190,
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
      }, 420);
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
          ? 800 + Math.random() * 1200
          : botDiff === "medium"
          ? 1100 + Math.random() * 1600
          : 1500 + Math.random() * 2000;

      botTimer.current = setTimeout(() => {
        if (actionLock.current) return;
        // 35% chance to feint first
        if (Math.random() < 0.35) {
          triggerFeint("p2");
          // Follow up with slap shortly after feint
          botTimer.current = setTimeout(() => {
            triggerSlap("p2");
          }, 350 + Math.random() * 400);
        } else {
          triggerSlap("p2");
        }
      }, waitMs);
    } else {
      // Bot is defending: reacts when attacker initiates strike
      if (attackerProgress > 0) {
        const reactionMs =
          botDiff === "hard"
            ? 120 + Math.random() * 60 // Razor-sharp reflex
            : botDiff === "medium"
            ? 160 + Math.random() * 90
            : 220 + Math.random() * 130;

        const willDodge =
          Math.random() < (botDiff === "hard" ? 0.88 : botDiff === "medium" ? 0.65 : 0.42);

        botTimer.current = setTimeout(() => {
          if (willDodge) {
            triggerDodge("p2");
          }
        }, reactionMs);
      }
    }

    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [inMenu, playMode, gameOver, p1Role, attackerProgress, botDiff, triggerSlap, triggerFeint, triggerDodge]);

  // Main Canvas Render Loop (Hyper-Realistic Anatomical Hands)
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Helper: Draw realistic anatomical hand
    const drawHand = (
      x: number,
      y: number,
      isTop: boolean,
      isAttackingHand: boolean,
      rednessLevel: number,
      displacementY: number,
      idleTremor: number
    ) => {
      ctx.save();
      ctx.translate(x, y + displacementY + idleTremor);

      if (isTop) {
        ctx.scale(1, -1); // Invert vertically for opponent / top player
      }

      // Hand Drop Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 55, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base Realistic Skin Tone Gradient (Healthy Tan)
      let baseColor = "#e0a97c";
      let shadeColor = "#c58a5e";
      let knuckleColor = "#ad7148";

      // Apply dynamic redness / bruise trauma
      if (rednessLevel > 0) {
        const rRatio = Math.min(1, rednessLevel * 0.22);
        // Blend towards inflamed scarlet
        baseColor = rRatio > 0.6 ? "#e15353" : "#e68478";
        shadeColor = rRatio > 0.6 ? "#b91c1c" : "#b85348";
        knuckleColor = rRatio > 0.6 ? "#991b1b" : "#8e3830";
      }

      // Palm Contour Path
      const palmGrad = ctx.createLinearGradient(-45, 0, 45, 50);
      palmGrad.addColorStop(0, baseColor);
      palmGrad.addColorStop(1, shadeColor);
      ctx.fillStyle = palmGrad;

      ctx.beginPath();
      ctx.moveTo(-38, 20);
      // Thumb abductor swell
      ctx.quadraticCurveTo(-52, 0, -42, -22);
      // Index finger base
      ctx.lineTo(-24, -38);
      // Middle finger base
      ctx.lineTo(0, -42);
      // Ring finger base
      ctx.lineTo(24, -38);
      // Pinky finger base
      ctx.lineTo(42, -24);
      // Outer palm edge
      ctx.quadraticCurveTo(46, 12, 38, 32);
      // Wrist
      ctx.lineTo(-38, 32);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = shadeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Finger Anatomical Rendering Function
      const drawFinger = (
        fx: number,
        fy: number,
        fWidth: number,
        fLength: number,
        fAngle: number
      ) => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fAngle);

        // Finger body gradient
        const fGrad = ctx.createLinearGradient(-fWidth / 2, 0, fWidth / 2, -fLength);
        fGrad.addColorStop(0, baseColor);
        fGrad.addColorStop(1, shadeColor);
        ctx.fillStyle = fGrad;

        ctx.beginPath();
        ctx.roundRect(-fWidth / 2, -fLength, fWidth, fLength, [fWidth / 2, fWidth / 2, 2, 2]);
        ctx.fill();
        ctx.strokeStyle = shadeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Knuckle Joint Creases
        ctx.strokeStyle = knuckleColor;
        ctx.lineWidth = 1.5;
        [-fLength * 0.35, -fLength * 0.68].forEach((ky) => {
          ctx.beginPath();
          ctx.arc(0, ky, fWidth * 0.35, Math.PI * 0.2, Math.PI * 0.8);
          ctx.stroke();
        });

        // Fingernail
        ctx.fillStyle = "rgba(255, 235, 235, 0.8)";
        ctx.beginPath();
        ctx.roundRect(-fWidth * 0.32, -fLength + 2, fWidth * 0.64, fLength * 0.22, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 100, 100, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      };

      // Draw 5 Articulated Fingers
      // 1. Thumb
      drawFinger(-40, -10, 15, 34, -0.65);
      // 2. Index
      drawFinger(-22, -36, 13.5, 46, -0.08);
      // 3. Middle (Longest)
      drawFinger(0, -40, 14, 52, 0.02);
      // 4. Ring
      drawFinger(20, -36, 13, 47, 0.12);
      // 5. Pinky
      drawFinger(38, -24, 11.5, 38, 0.25);

      // Wrist Forearm
      ctx.fillStyle = shadeColor;
      ctx.fillRect(-34, 30, 68, 50);

      // Palm Creases & Life Lines
      ctx.strokeStyle = "rgba(100, 40, 20, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-15, 10, 25, 0.2, Math.PI * 0.6);
      ctx.stroke();

      // Slap Welt / Bruise overlay on dorsal hand
      if (rednessLevel > 0) {
        ctx.save();
        const bruiseAlpha = Math.min(0.85, rednessLevel * 0.18);
        ctx.fillStyle = `rgba(185, 28, 28, ${bruiseAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, -5, 34, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stinging welt fingerprint lines
        if (rednessLevel >= 2) {
          ctx.strokeStyle = "rgba(127, 29, 29, 0.6)";
          ctx.lineWidth = 3;
          [-12, -4, 4, 12].forEach((wx) => {
            ctx.beginPath();
            ctx.moveTo(wx - 2, -18);
            ctx.lineTo(wx + 2, 10);
            ctx.stroke();
          });
        }

        // Severe heat steam smoke wisps at level 5
        if (rednessLevel >= 4 && Math.random() < 0.4) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + displacementY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: isTop ? 2 : -2,
            life: 1,
            color: "rgba(255, 200, 200, 0.6)",
            size: 3 + Math.random() * 3,
          });
        }
        ctx.restore();
      }

      ctx.restore();
    };

    const loop = () => {
      idleTimeRef.current += 0.05;
      const t = idleTimeRef.current;
      const naturalTremor = Math.sin(t * 4) * 1.5;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Camera impact shake
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Wooden Tavern Duel Table Background
      const tableGrad = ctx.createLinearGradient(0, 0, 0, 420);
      tableGrad.addColorStop(0, "#291307");
      tableGrad.addColorStop(0.5, "#451a03");
      tableGrad.addColorStop(1, "#1a0c04");
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood plank seams
      ctx.strokeStyle = "rgba(251, 191, 36, 0.08)";
      ctx.lineWidth = 2;
      [70, 140, 210, 280, 350].forEach((lineY) => {
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(360, lineY);
        ctx.stroke();
      });

      // Table Center Red Line Divider
      ctx.strokeStyle = "rgba(239, 68, 68, 0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(20, 210);
      ctx.lineTo(340, 210);
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate hand positions
      // Top Hand (P2 / Opponent): Centered around y = 120
      // Bottom Hand (P1 / You): Centered around y = 300
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
        120,
        true,
        !isP1Attacking,
        slapRednessP2,
        topDisplace,
        naturalTremor
      );

      // Render Bottom Hand (Player 1)
      drawHand(
        180,
        300,
        false,
        isP1Attacking,
        slapRednessP1,
        bottomDisplace,
        naturalTremor
      );

      // Update & Render Shockwaves
      shockwavesRef.current = shockwavesRef.current
        .map((sw) => ({
          ...sw,
          radius: sw.radius + 4,
          alpha: sw.alpha - 0.06,
        }))
        .filter((sw) => sw.alpha > 0);

      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 4;
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
          vy: p.vy + 0.2, // gravity
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
          y: pop.y - 1.5,
          alpha: pop.alpha - 0.03,
        }))
        .filter((pop) => pop.alpha > 0);

      popupsRef.current.forEach((pop) => {
        ctx.save();
        ctx.globalAlpha = pop.alpha;
        ctx.font = "900 16px sans-serif";
        ctx.fillStyle = pop.color;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });

      ctx.restore(); // end shake transform

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, p1Role, attackerProgress, defenderProgress, slapRednessP1, slapRednessP2, screenShake]);

  // Hero Graphic
  const handSlapHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950/40 rounded-2xl flex items-center justify-center border border-red-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <ellipse cx="80" cy="80" rx="70" ry="70" fill="#451a03" stroke="#92400e" strokeWidth="4" />
          {/* Top Hand */}
          <path
            d="M 80,25 Q 95,25 98,50 L 102,75 Q 80,82 58,75 L 62,50 Q 65,25 80,25 Z"
            fill="#e0a97c"
            stroke="#b45309"
            strokeWidth="3"
          />
          {/* Bottom Hand */}
          <path
            d="M 80,135 Q 65,135 62,110 L 58,85 Q 80,78 102,85 L 98,110 Q 95,135 80,135 Z"
            fill="#e0a97c"
            stroke="#b45309"
            strokeWidth="3"
          />
          {/* Slap Clash Ring */}
          <circle cx="80" cy="80" r="16" fill="none" stroke="#fef08a" strokeWidth="4" strokeDasharray="6 4" />
          <polygon points="80,68 85,76 94,76 87,82 90,91 80,85 70,91 73,82 66,76 75,76" fill="#ef4444" />
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
      title: "Tactical Micro-Feints",
      desc: "Attacker can tap FEINT to twitch fingers forward! Baits defender into panicking.",
      icon: "👀",
    },
    {
      title: "3 Flinch Penalty",
      desc: "Defender cannot retreat without an attack! 3 false dodges awards a free point to opponent.",
      icon: "🚨",
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
          objective="Attacker slaps before Defender dodges! Micro-feint to bait false retreats. First to 5 wins!"
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

