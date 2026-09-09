"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Flame, Shield } from "lucide-react";

interface KnifeThrowerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface EmbeddedKnife {
  angle: number; // in radians relative to log rotation
  owner: "p1" | "p2" | "neutral";
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
  color: string;
}

interface FlyingKnife {
  owner: "p1" | "p2";
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1; // 1 = upwards from bottom, -1 = downwards from top
}

interface BrokenPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  isBlade: boolean;
  color: string;
  alpha: number;
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

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export default function KnifeThrowerGame({
  match,
  currentUid,
  onBack,
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

  const [embeddedKnives, setEmbeddedKnives] = useState<EmbeddedKnife[]>([]);
  const [apples, setApples] = useState<Apple[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [bannerMessage, setBannerMessage] = useState("TAP YOUR ZONE TO THROW KNIVES!");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Log rotation state
  const logRotationRef = useRef(0);
  const logSpeedRef = useRef(0.035);
  const choreoTimerRef = useRef(0);
  const choreoModeRef = useRef<"normal" | "slow" | "reverse" | "stutter">("normal");

  // Physics refs
  const p1FlyingRef = useRef<FlyingKnife | null>(null);
  const p2FlyingRef = useRef<FlyingKnife | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const slicedHalvesRef = useRef<SlicedHalf[]>([]);
  const brokenPiecesRef = useRef<BrokenPiece[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Screen shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 35);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start new match
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
    setP1KnivesLeft(MAX_KNIVES);
    setP2KnivesLeft(MAX_KNIVES);
    setBannerMessage("EMBED ALL KNIVES! DON'T CLASH BLADES!");

    p1FlyingRef.current = null;
    p2FlyingRef.current = null;
    sparksRef.current = [];
    slicedHalvesRef.current = [];
    brokenPiecesRef.current = [];
    floatingScoresRef.current = [];
    logRotationRef.current = 0;
    logSpeedRef.current = 0.035;
    choreoTimerRef.current = 0;
    choreoModeRef.current = "normal";

    // Initial obstacle setup
    const initial: EmbeddedKnife[] = [
      { angle: 0, owner: "neutral" },
      { angle: Math.PI * 0.65, owner: "neutral" },
      { angle: Math.PI * 1.35, owner: "neutral" },
    ];
    setEmbeddedKnives(initial);

    setApples([
      { id: 1, angle: Math.PI * 0.35, sliced: false, type: "apple" },
      { id: 2, angle: Math.PI * 1.05, sliced: false, type: "ruby" },
      { id: 3, angle: Math.PI * 1.75, sliced: false, type: "apple" },
    ]);
  }, []);

  // Throw knife handler
  const throwKnife = useCallback((owner: "p1" | "p2") => {
    if (roundOver || matchWinner) return;

    if (owner === "p1") {
      if (p1FlyingRef.current || p1KnivesLeft <= 0) return;
      arcadeSfx.playWhoosh();
      setP1KnivesLeft((k) => k - 1);
      p1FlyingRef.current = {
        owner: "p1",
        x: 180,
        y: 350,
        speed: 26,
        direction: 1,
      };
    } else {
      if (p2FlyingRef.current || p2KnivesLeft <= 0) return;
      arcadeSfx.playWhoosh();
      setP2KnivesLeft((k) => k - 1);
      p2FlyingRef.current = {
        owner: "p2",
        x: 180,
        y: 50,
        speed: 26,
        direction: -1,
      };
    }
  }, [roundOver, matchWinner, p1KnivesLeft, p2KnivesLeft]);

  // Shatter knife on collision with existing blade
  const shatterKnife = (who: "p1" | "p2", hitX: number, hitY: number) => {
    arcadeSfx.playKnifeClash();
    setScreenShake(12);

    // Sparks
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 7;
      sparksRef.current.push({
        x: hitX,
        y: hitY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        color: i % 2 === 0 ? "#fde047" : "#ef4444",
        size: 2.5 + Math.random() * 2.5,
      });
    }

    // Broken blade piece flying away
    brokenPiecesRef.current.push({
      x: hitX,
      y: hitY,
      vx: (Math.random() - 0.5) * 6,
      vy: who === "p1" ? -5 - Math.random() * 4 : 5 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      isBlade: true,
      color: who === "p1" ? "#3b82f6" : "#ef4444",
      alpha: 1,
    });

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

  // Bot AI throw loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || roundOver || matchWinner || p2KnivesLeft <= 0) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const scheduleNextThrow = () => {
      const interval =
        botDiff === "hard"
          ? 700 + Math.random() * 500
          : botDiff === "medium"
          ? 1000 + Math.random() * 800
          : 1400 + Math.random() * 1000;

      botTimerRef.current = setTimeout(() => {
        if (roundOver || matchWinner || p2FlyingRef.current) return;

        // Bot checks gap safety at top log entrance (angle = 3*PI/2)
        const targetImpactAngle = ((Math.PI * 1.5 - logRotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        let minAngularDiff = Infinity;
        embeddedKnives.forEach((k) => {
          let diff = Math.abs(k.angle - targetImpactAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < minAngularDiff) minAngularDiff = diff;
        });

        // Safe angle gap is roughly 0.28 rad
        const isSafe = minAngularDiff > 0.28;

        if (botDiff === "hard") {
          // Hard bot only throws when strictly safe, unless cornered
          if (isSafe || Math.random() < 0.1) {
            throwKnife("p2");
          }
        } else if (botDiff === "medium") {
          if (isSafe || Math.random() < 0.3) {
            throwKnife("p2");
          }
        } else {
          // Easy bot throws casually regardless of safety
          throwKnife("p2");
        }

        scheduleNextThrow();
      }, interval);
    };

    scheduleNextThrow();

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [inMenu, playMode, roundOver, matchWinner, p2KnivesLeft, botDiff, embeddedKnives, throwKnife]);

  // Main Canvas Render Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const LOG_X = 180;
    const LOG_Y = 200;
    const LOG_RADIUS = 52;

    const loop = () => {
      // 1. Update log rotation choreography
      choreoTimerRef.current += 1;
      if (choreoTimerRef.current % 120 === 0) {
        const rand = Math.random();
        if (rand < 0.3) {
          choreoModeRef.current = "reverse";
          logSpeedRef.current = -0.04;
        } else if (rand < 0.6) {
          choreoModeRef.current = "stutter";
          logSpeedRef.current = 0.02;
        } else {
          choreoModeRef.current = "normal";
          logSpeedRef.current = 0.045;
        }
      }

      logRotationRef.current += logSpeedRef.current;

      // 2. Process Player 1 Flying Knife (Moving UP from bottom)
      if (p1FlyingRef.current) {
        const knife = p1FlyingRef.current;
        knife.y -= knife.speed;

        // Check contact with log perimeter
        if (knife.y <= LOG_Y + LOG_RADIUS + 12) {
          // Evaluate impact angle on log
          const relativeAngle = ((Math.PI * 0.5 - logRotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

          // Check if clashes with existing knife
          let clashed = false;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - relativeAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
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
            p1FlyingRef.current = null;
            setEmbeddedKnives((prev) => [...prev, { angle: relativeAngle, owner: "p1" }]);

            // Slice fruit check
            apples.forEach((apple) => {
              if (!apple.sliced) {
                let aDiff = Math.abs(apple.angle - relativeAngle);
                if (aDiff > Math.PI) aDiff = Math.PI * 2 - aDiff;
                if (aDiff < 0.25) {
                  apple.sliced = true;
                  arcadeSfx.playMatchSuccess();
                  // Splat halves
                  slicedHalvesRef.current.push(
                    { x: LOG_X, y: LOG_Y + LOG_RADIUS, vx: -3, vy: 2, rot: 0, vrot: -0.15, alpha: 1, color: apple.type === "ruby" ? "#ec4899" : "#ef4444" },
                    { x: LOG_X, y: LOG_Y + LOG_RADIUS, vx: 3, vy: 2, rot: 0, vrot: 0.15, alpha: 1, color: apple.type === "ruby" ? "#ec4899" : "#ef4444" }
                  );
                }
              }
            });

            // Check if P1 out of knives & finished successfully
            if (p1KnivesLeft <= 1) {
              setTimeout(() => {
                if (!roundOver) handleRoundEnd("p1", "🎉 PLAYER 1 EMBEDDED ALL KNIVES!");
              }, 300);
            }
          }
        }
      }

      // 3. Process Player 2 Flying Knife (Moving DOWN from top)
      if (p2FlyingRef.current) {
        const knife = p2FlyingRef.current;
        knife.y += knife.speed;

        // Check contact with log perimeter
        if (knife.y >= LOG_Y - LOG_RADIUS - 12) {
          // Evaluate impact angle on top
          const relativeAngle = ((Math.PI * 1.5 - logRotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

          let clashed = false;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - relativeAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 0.22) {
              clashed = true;
              break;
            }
          }

          if (clashed) {
            shatterKnife("p2", LOG_X, LOG_Y - LOG_RADIUS);
            p2FlyingRef.current = null;
          } else {
            // Embed successfully!
            arcadeSfx.playKnifeStick();
            p2FlyingRef.current = null;
            setEmbeddedKnives((prev) => [...prev, { angle: relativeAngle, owner: "p2" }]);

            // Check if P2 out of knives & finished successfully
            if (p2KnivesLeft <= 1) {
              setTimeout(() => {
                if (!roundOver) handleRoundEnd("p2", "🎉 PLAYER 2 EMBEDDED ALL KNIVES!");
              }, 300);
            }
          }
        }
      }

      // 4. RENDER TO CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Dark Wood Tavern Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 400);
      bgGrad.addColorStop(0, "#1c1917");
      bgGrad.addColorStop(0.5, "#292524");
      bgGrad.addColorStop(1, "#0c0a09");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rotating Target Log
      ctx.save();
      ctx.translate(LOG_X, LOG_Y);
      ctx.rotate(logRotationRef.current);

      // Log Drop Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 6, LOG_RADIUS + 2, 0, Math.PI * 2);
      ctx.fill();

      // Log Bark Outer Ring
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#270d02";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Concentric Wood Growth Rings
      [LOG_RADIUS - 8, LOG_RADIUS - 18, LOG_RADIUS - 28, LOG_RADIUS - 38].forEach((r, idx) => {
        ctx.strokeStyle = idx % 2 === 0 ? "rgba(120, 53, 15, 0.5)" : "rgba(180, 83, 9, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Brass Center Boss with Rivets
      ctx.fillStyle = "#ca8a04";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Embedded Knives (Radially outward from log center)
      embeddedKnives.forEach((k) => {
        ctx.save();
        ctx.rotate(k.angle);

        // Blade steel sticking out
        const bladeColor = k.owner === "p1" ? "#3b82f6" : k.owner === "p2" ? "#ef4444" : "#94a3b8";
        ctx.fillStyle = bladeColor;
        ctx.beginPath();
        ctx.moveTo(-3.5, LOG_RADIUS);
        ctx.lineTo(-2, LOG_RADIUS + 28);
        ctx.lineTo(0, LOG_RADIUS + 34);
        ctx.lineTo(2, LOG_RADIUS + 28);
        ctx.lineTo(3.5, LOG_RADIUS);
        ctx.closePath();
        ctx.fill();

        // Handle
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-2.5, LOG_RADIUS + 12, 5, 16);
        ctx.restore();
      });

      // Render Apples / Rubies on Log
      apples.forEach((apple) => {
        if (apple.sliced) return;
        ctx.save();
        ctx.rotate(apple.angle);
        ctx.translate(0, LOG_RADIUS);

        if (apple.type === "ruby") {
          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(7, 0);
          ctx.lineTo(0, 8);
          ctx.lineTo(-7, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
          ctx.fill();
          // Stem
          ctx.strokeStyle = "#15803d";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.lineTo(2, -11);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore(); // end rotating log

      // Render Flying Knife for Player 1 (Moving Up)
      if (p1FlyingRef.current) {
        const k = p1FlyingRef.current;
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(0, -28);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-3, 0, 6, 16);
        ctx.restore();
      }

      // Render Flying Knife for Player 2 (Moving Down)
      if (p2FlyingRef.current) {
        const k = p2FlyingRef.current;
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(Math.PI);
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(0, -28);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-3, 0, 6, 16);
        ctx.restore();
      }

      // Render Sliced Fruit Halves
      slicedHalvesRef.current = slicedHalvesRef.current
        .map((sh) => ({
          ...sh,
          x: sh.x + sh.vx,
          y: sh.y + sh.vy,
          vy: sh.vy + 0.25,
          rot: sh.rot + sh.vrot,
          alpha: sh.alpha - 0.03,
        }))
        .filter((sh) => sh.alpha > 0);

      slicedHalvesRef.current.forEach((sh) => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.globalAlpha = sh.alpha;
        ctx.fillStyle = sh.color;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI);
        ctx.fill();
        ctx.restore();
      });

      // Render Broken Blade Pieces
      brokenPiecesRef.current = brokenPiecesRef.current
        .map((bp) => ({
          ...bp,
          x: bp.x + bp.vx,
          y: bp.y + bp.vy,
          vy: bp.vy + 0.25,
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
        ctx.fillRect(-2, -8, 4, 16);
        ctx.restore();
      });

      // Render Sparks
      sparksRef.current = sparksRef.current
        .map((sp) => ({
          ...sp,
          x: sp.x + sp.vx,
          y: sp.y + sp.vy,
          life: sp.life - 0.05,
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

      ctx.restore(); // end shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, screenShake, embeddedKnives, apples, p1KnivesLeft, p2KnivesLeft, roundOver]);

  const knifeHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-amber-950/40 rounded-2xl flex items-center justify-center border border-amber-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="80" cy="80" r="45" fill="#451a03" stroke="#92400e" strokeWidth="4" />
          <circle cx="80" cy="80" r="30" fill="none" stroke="#78350f" strokeWidth="2" />
          <circle cx="80" cy="80" r="14" fill="#ca8a04" />
          {/* Blue Knife */}
          <g transform="translate(80, 130)">
            <polygon points="0,-24 -4,0 4,0" fill="#3b82f6" />
            <rect x="-3" y="0" width="6" height="12" fill="#1e293b" />
          </g>
          {/* Red Knife */}
          <g transform="translate(80, 30) rotate(180)">
            <polygon points="0,-24 -4,0 4,0" fill="#ef4444" />
            <rect x="-3" y="0" width="6" height="12" fill="#1e293b" />
          </g>
          <circle cx="80" cy="80" r="12" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Shared Spinning Log Duel",
      desc: "Player 1 launches Blue knives from bottom; Opponent launches Red knives from top!",
      icon: "🗡️",
    },
    {
      title: "Don't Clash Blades!",
      desc: "Striking ANY already embedded knife instantly shatters your blade and loses the round!",
      icon: "💥",
    },
    {
      title: "First to 3 Points Wins",
      desc: "Embed all your knives safely or force your rival to shatter to claim victory!",
      icon: "🏆",
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
          objective="Launch knives into the spinning log! Don't hit existing blades. First to 3 round wins!"
          heroGraphic={knifeHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  // Quiver HUD helper
  const renderQuiver = (left: number, color: string, isInverted = false) => (
    <div className={`flex items-center gap-1 ${isInverted ? "rotate-180" : ""}`}>
      {Array.from({ length: MAX_KNIVES }).map((_, idx) => (
        <div
          key={idx}
          className={`w-3 h-5 rounded-xs transition-all duration-300 ${
            idx < left
              ? color === "blue"
                ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
              : "bg-neutral-800 opacity-25"
          }`}
        />
      ))}
    </div>
  );

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

        {/* Score */}
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

      {/* Player 2 Quiver / Control Area (Top, inverted for tabletop friend mode) */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 py-1 z-20">
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

      {/* Status banner */}
      <div className="w-full max-w-sm text-center my-0.5 z-20">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {bannerMessage}
        </span>
      </div>

      {/* Canvas Arena */}
      <div className="relative w-full max-w-sm h-[370px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Round Over Modal */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn z-30">
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
              {roundWinner === "p1" ? "🎉 BLUE SCORES POINT!" : "💥 RED SCORES POINT!"}
            </h3>
            <p className="text-xs font-bold text-neutral-300 mt-1">{bannerMessage}</p>
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
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "BLUE VICTORY!" : "RED VICTORY!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Wins} - {p2Wins}</p>

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

      {/* Player 1 Quiver & Throw Trigger (Bottom) */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 py-2 z-20">
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
    </div>
  );
}
