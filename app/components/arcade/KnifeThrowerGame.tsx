"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Flame } from "lucide-react";

interface KnifeThrowerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface EmbeddedKnife {
  angle: number; // in radians relative to log rotation
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
  y: number;
  speed: number;
}

interface BrokenPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  isBlade: boolean;
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

  // Game state
  const TOTAL_KNIVES = 15;
  const [knivesLeft, setKnivesLeft] = useState(TOTAL_KNIVES);
  const [embeddedKnives, setEmbeddedKnives] = useState<EmbeddedKnife[]>([]);
  const [apples, setApples] = useState<Apple[]>([]);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [screenShake, setScreenShake] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation choreography
  const logRotationRef = useRef(0);
  const logSpeedRef = useRef(0.035);
  const choreoTimerRef = useRef(0);
  const choreoModeRef = useRef<"normal" | "slow" | "reverse" | "stutter">("normal");
  const choreoTargetSpeedRef = useRef(0.035);

  // Physics refs
  const flyingKnifeRef = useRef<FlyingKnife | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const slicedHalvesRef = useRef<SlicedHalf[]>([]);
  const brokenPiecesRef = useRef<BrokenPiece[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_knife_thrower_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Screen shake decay
  useEffect(() => {
    if (screenShake <= 0) return;
    const t = setTimeout(() => setScreenShake((s) => Math.max(0, s - 2)), 40);
    return () => clearTimeout(t);
  }, [screenShake]);

  // Start game / next stage
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium", newStage = 1) => {
    setPlayMode(mode);
    setBotDiff(diff);
    setStage(newStage);
    setKnivesLeft(TOTAL_KNIVES);
    if (newStage === 1) setScore(0);
    setGameOver(false);
    setVictory(false);
    setScreenShake(0);
    flyingKnifeRef.current = null;
    sparksRef.current = [];
    slicedHalvesRef.current = [];
    brokenPiecesRef.current = [];
    floatingScoresRef.current = [];
    logRotationRef.current = 0;
    logSpeedRef.current = 0.035;
    choreoTimerRef.current = 0;
    choreoModeRef.current = "normal";

    // Setup obstacles based on stage
    const initialKnives: EmbeddedKnife[] = [];
    const initialApples: Apple[] = [];

    if (newStage === 1) {
      initialKnives.push({ angle: 0 });
      initialKnives.push({ angle: Math.PI * 0.75 });
      initialApples.push({ id: 1, angle: Math.PI * 0.35, sliced: false, type: "apple" });
      initialApples.push({ id: 2, angle: Math.PI * 1.35, sliced: false, type: "apple" });
    } else {
      // Boss or advanced log
      initialKnives.push({ angle: 0 }, { angle: Math.PI * 0.5 }, { angle: Math.PI * 1.1 });
      initialApples.push({ id: 1, angle: Math.PI * 0.25, sliced: false, type: "ruby" });
      initialApples.push({ id: 2, angle: Math.PI * 0.8, sliced: false, type: "apple" });
      initialApples.push({ id: 3, angle: Math.PI * 1.6, sliced: false, type: "ruby" });
    }

    setEmbeddedKnives(initialKnives);
    setApples(initialApples);
    setInMenu(false);
  }, []);

  // Launch knife
  const throwKnife = useCallback(() => {
    if (inMenu || gameOver || victory || flyingKnifeRef.current !== null || knivesLeft <= 0) return;

    arcadeSfx.playWhoosh();
    flyingKnifeRef.current = {
      y: 350,
      speed: 22,
    };
    setKnivesLeft((k) => k - 1);
  }, [inMenu, gameOver, victory, knivesLeft]);

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const logCenter = { x: 180, y: 135 };
    const logRadius = 65;

    const loop = () => {
      // 1. Rotation choreography AI
      choreoTimerRef.current += 1;
      const t = choreoTimerRef.current;

      // Switch choreography patterns every 110 frames
      if (t % 110 === 0) {
        const rand = Math.random();
        if (rand < 0.35) {
          choreoModeRef.current = "normal";
          choreoTargetSpeedRef.current = (0.035 + (stage - 1) * 0.01) * (Math.random() > 0.5 ? 1 : -1);
        } else if (rand < 0.65) {
          choreoModeRef.current = "reverse";
          choreoTargetSpeedRef.current = -logSpeedRef.current * 1.3;
          arcadeSfx.playWhoosh();
        } else {
          choreoModeRef.current = "stutter";
          choreoTargetSpeedRef.current = 0.01;
        }
      }

      // Smoothly approach target speed
      logSpeedRef.current += (choreoTargetSpeedRef.current - logSpeedRef.current) * 0.06;
      if (choreoModeRef.current === "stutter") {
        logSpeedRef.current += Math.sin(t * 0.3) * 0.025;
      }
      logRotationRef.current += logSpeedRef.current;

      // 2. Update Flying Knife
      if (flyingKnifeRef.current) {
        flyingKnifeRef.current.y -= flyingKnifeRef.current.speed;

        // Check impact with log perimeter
        if (flyingKnifeRef.current.y <= logCenter.y + logRadius + 18) {
          // Calculate hit angle relative to log
          // Bottom of log is angle PI/2 in screen space
          let hitAngle = Math.PI / 2 - logRotationRef.current;
          while (hitAngle < 0) hitAngle += Math.PI * 2;
          hitAngle = hitAngle % (Math.PI * 2);

          // Check collision with existing embedded knives
          let collided = false;
          for (const k of embeddedKnives) {
            let diff = Math.abs(k.angle - hitAngle);
            while (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 0.28) {
              collided = true;
              break;
            }
          }

          if (collided) {
            // Blade clash!
            arcadeSfx.playKnifeClash();
            setScreenShake(12);

            // Broken knife physics: blade snaps off, handle drops
            brokenPiecesRef.current.push({
              x: logCenter.x,
              y: logCenter.y + logRadius + 5,
              vx: (Math.random() - 0.5) * 8 - 4,
              vy: -6 - Math.random() * 4,
              rot: 0,
              vrot: 0.25,
              isBlade: true,
              alpha: 1,
            });
            brokenPiecesRef.current.push({
              x: logCenter.x,
              y: logCenter.y + logRadius + 22,
              vx: (Math.random() - 0.5) * 6 + 3,
              vy: 2 + Math.random() * 3,
              rot: 0,
              vrot: -0.2,
              isBlade: false,
              alpha: 1,
            });

            // Electric spark cascade
            for (let i = 0; i < 28; i++) {
              sparksRef.current.push({
                x: logCenter.x,
                y: logCenter.y + logRadius + 15,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.8) * 10,
                life: 1,
                color: i % 2 === 0 ? "#fef08a" : "#f97316",
                size: 2 + Math.random() * 3,
              });
            }

            flyingKnifeRef.current = null;
            setGameOver(true);
            arcadeSfx.playPenaltyBuzz();
            return;
          } else {
            // Embedded successfully!
            arcadeSfx.playKnifeStick();
            setScreenShake(5);

            // Wood splinter sparks
            for (let i = 0; i < 8; i++) {
              sparksRef.current.push({
                x: logCenter.x + (Math.random() - 0.5) * 10,
                y: logCenter.y + logRadius + 5,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 0.8,
                color: "#d97706",
                size: 2,
              });
            }

            // Check if sliced any apple / ruby
            setApples((prevApples) =>
              prevApples.map((apple) => {
                if (apple.sliced) return apple;
                let diff = Math.abs(apple.angle - hitAngle);
                while (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < 0.32) {
                  arcadeSfx.playMatchSuccess();
                  const bonus = apple.type === "ruby" ? 100 : 50;
                  setScore((s) => s + bonus);

                  // Floating popup
                  floatingScoresRef.current.push({
                    x: logCenter.x,
                    y: logCenter.y + logRadius - 10,
                    text: apple.type === "ruby" ? "+100 RUBY!" : "+50 JUICY!",
                    color: apple.type === "ruby" ? "#ec4899" : "#ef4444",
                    alpha: 1,
                  });

                  // Split into 2 tumbling halves
                  const appleScreenAngle = apple.angle + logRotationRef.current;
                  const ax = logCenter.x + Math.cos(appleScreenAngle) * (logRadius - 5);
                  const ay = logCenter.y + Math.sin(appleScreenAngle) * (logRadius - 5);

                  slicedHalvesRef.current.push(
                    {
                      x: ax - 6,
                      y: ay,
                      vx: -3 - Math.random() * 2,
                      vy: -2 - Math.random() * 3,
                      rot: 0,
                      vrot: -0.15,
                      alpha: 1,
                      color: apple.type === "ruby" ? "#f43f5e" : "#ef4444",
                    },
                    {
                      x: ax + 6,
                      y: ay,
                      vx: 3 + Math.random() * 2,
                      vy: -2 - Math.random() * 3,
                      rot: 0,
                      vrot: 0.15,
                      alpha: 1,
                      color: apple.type === "ruby" ? "#f43f5e" : "#ef4444",
                    }
                  );

                  // Splashing juice droplets
                  for (let i = 0; i < 16; i++) {
                    sparksRef.current.push({
                      x: ax,
                      y: ay,
                      vx: (Math.random() - 0.5) * 8,
                      vy: (Math.random() - 0.7) * 7,
                      life: 1,
                      color: apple.type === "ruby" ? "#fb7185" : "#dc2626",
                      size: 2.5 + Math.random() * 2.5,
                    });
                  }

                  return { ...apple, sliced: true };
                }
                return apple;
              })
            );

            setEmbeddedKnives((prev) => [...prev, { angle: hitAngle }]);
            setScore((s) => {
              const ns = s + 10;
              if (ns > hiScore) {
                setHiScore(ns);
                try {
                  localStorage.setItem("echo_knife_thrower_hi", String(ns));
                } catch {}
              }
              return ns;
            });

            flyingKnifeRef.current = null;

            // Check if cleared this log
            if (knivesLeft - 1 <= 0) {
              setVictory(true);
              arcadeSfx.playVictory();
              if (currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "knife_thrower" as any, score + 250, true);
              }
            }
          }
        }
      }

      // 3. Update Sparks
      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          vy: s.vy + 0.25, // gravity
          life: s.life - 0.04,
        }))
        .filter((s) => s.life > 0);

      // 4. Update Sliced Halves
      slicedHalvesRef.current = slicedHalvesRef.current
        .map((h) => ({
          ...h,
          x: h.x + h.vx,
          y: h.y + h.vy,
          vy: h.vy + 0.3,
          rot: h.rot + h.vrot,
          alpha: h.alpha - 0.02,
        }))
        .filter((h) => h.alpha > 0);

      // 5. Update Broken Pieces
      brokenPiecesRef.current = brokenPiecesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.35,
          rot: p.rot + p.vrot,
          alpha: p.alpha - 0.02,
        }))
        .filter((p) => p.alpha > 0);

      // 6. Update Floating Scores
      floatingScoresRef.current = floatingScoresRef.current
        .map((fs) => ({
          ...fs,
          y: fs.y - 1.2,
          alpha: fs.alpha - 0.025,
        }))
        .filter((fs) => fs.alpha > 0);

      // ── RENDER ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply screen shake
      if (screenShake > 0) {
        const sx = (Math.random() - 0.5) * screenShake;
        const sy = (Math.random() - 0.5) * screenShake;
        ctx.translate(sx, sy);
      }

      // Dark radial background
      const bgGrad = ctx.createRadialGradient(180, 180, 20, 180, 180, 240);
      bgGrad.addColorStop(0, "#1e293b");
      bgGrad.addColorStop(1, "#090d16");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render 3D Oak Log
      ctx.save();
      ctx.translate(logCenter.x, logCenter.y);
      ctx.rotate(logRotationRef.current);

      // Log Drop Shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#592708";
      ctx.beginPath();
      ctx.arc(0, 0, logRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer Bark Rim with Bark Ridges
      ctx.fillStyle = "#6b330b";
      ctx.beginPath();
      ctx.arc(0, 0, logRadius, 0, Math.PI * 2);
      ctx.fill();

      // Textured Bark notches around perimeter
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 3;
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (logRadius - 6), Math.sin(a) * (logRadius - 6));
        ctx.lineTo(Math.cos(a) * logRadius, Math.sin(a) * logRadius);
        ctx.stroke();
      }

      // Inner Wood Core
      const woodGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, logRadius - 8);
      woodGrad.addColorStop(0, "#d97706");
      woodGrad.addColorStop(0.6, "#b45309");
      woodGrad.addColorStop(1, "#78350f");
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.arc(0, 0, logRadius - 8, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Tree Growth Rings
      ctx.strokeStyle = "rgba(69, 26, 3, 0.4)";
      ctx.lineWidth = 2;
      [16, 28, 42, 54].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Center Brass Boss / Medallion with Rivets
      ctx.fillStyle = "#ca8a04";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center skull or star rivet
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Embedded Knives
      embeddedKnives.forEach((k) => {
        ctx.save();
        ctx.rotate(k.angle);

        // Blade embedded in log
        const bladeGrad = ctx.createLinearGradient(-4, 0, 4, 0);
        bladeGrad.addColorStop(0, "#94a3b8");
        bladeGrad.addColorStop(0.5, "#ffffff");
        bladeGrad.addColorStop(1, "#64748b");
        ctx.fillStyle = bladeGrad;
        ctx.fillRect(-3.5, logRadius - 10, 7, 26);

        // Crossguard
        ctx.fillStyle = "#334155";
        ctx.fillRect(-6, logRadius + 14, 12, 4);

        // Textured Orange Grip Handle
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-4.5, logRadius + 18, 9, 20);

        // Handle Pommel
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-5, logRadius + 38, 10, 3);
        ctx.restore();
      });

      // Bonus Apples / Rubies
      apples.forEach((a) => {
        if (!a.sliced) {
          ctx.save();
          ctx.rotate(a.angle);
          if (a.type === "ruby") {
            // Glowing Ruby Diamond
            ctx.fillStyle = "#ec4899";
            ctx.beginPath();
            ctx.moveTo(0, logRadius - 18);
            ctx.lineTo(8, logRadius - 8);
            ctx.lineTo(0, logRadius + 2);
            ctx.lineTo(-8, logRadius - 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            // Juicy Apple
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(0, logRadius - 8, 11, 0, Math.PI * 2);
            ctx.fill();
            // Apple shine
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.beginPath();
            ctx.arc(-3, logRadius - 11, 3, 0, Math.PI * 2);
            ctx.fill();
            // Green leaf
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(0, logRadius - 21, 3, 5);
          }
          ctx.restore();
        }
      });

      ctx.restore(); // end log transform

      // Render Sliced Halves
      slicedHalvesRef.current.forEach((h) => {
        ctx.save();
        ctx.globalAlpha = h.alpha;
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot);
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI);
        ctx.fill();
        ctx.restore();
      });

      // Render Broken Knife Pieces
      brokenPiecesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.isBlade) {
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(4, 8);
          ctx.lineTo(-4, 8);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = "#ea580c";
          ctx.fillRect(-4, -10, 8, 20);
        }
        ctx.restore();
      });

      // Render Sparks & Splashes
      sparksRef.current.forEach((s) => {
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Render Floating Popups
      floatingScoresRef.current.forEach((fs) => {
        ctx.save();
        ctx.globalAlpha = fs.alpha;
        ctx.font = "900 15px sans-serif";
        ctx.fillStyle = fs.color;
        ctx.textAlign = "center";
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      });

      // Flying Knife
      if (flyingKnifeRef.current) {
        const fy = flyingKnifeRef.current.y;
        ctx.save();
        ctx.translate(logCenter.x, fy);

        // Blade Point
        const bGrad = ctx.createLinearGradient(-4, 0, 4, 0);
        bGrad.addColorStop(0, "#cbd5e1");
        bGrad.addColorStop(0.5, "#ffffff");
        bGrad.addColorStop(1, "#94a3b8");
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(5, 0);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        // Lower Blade
        ctx.fillRect(-3.5, 0, 7, 18);

        // Crossguard
        ctx.fillStyle = "#334155";
        ctx.fillRect(-7, 18, 14, 4);

        // Handle
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-5, 22, 10, 20);

        // Pommel
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-5, 42, 10, 3);
        ctx.restore();
      }

      // Ready Knife at Launch Station
      if (!flyingKnifeRef.current && knivesLeft > 0 && !gameOver && !victory) {
        ctx.save();
        ctx.translate(logCenter.x, 340);

        // Launch indicator glow
        const glowGrad = ctx.createRadialGradient(0, 10, 2, 0, 10, 35);
        glowGrad.addColorStop(0, "rgba(251, 191, 36, 0.35)");
        glowGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 10, 35, 0, Math.PI * 2);
        ctx.fill();

        // Blade
        const bGrad = ctx.createLinearGradient(-4, 0, 4, 0);
        bGrad.addColorStop(0, "#cbd5e1");
        bGrad.addColorStop(0.5, "#ffffff");
        bGrad.addColorStop(1, "#94a3b8");
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(5, 0);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(-3.5, 0, 7, 18);
        ctx.fillStyle = "#334155";
        ctx.fillRect(-7, 18, 14, 4);
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-5, 22, 10, 20);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-5, 42, 10, 3);
        ctx.restore();
      }

      ctx.restore(); // end shake transform

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, embeddedKnives, apples, gameOver, victory, knivesLeft, hiScore, score, currentUid, match, stage, screenShake]);

  // Bot AI loop: Rotational clearance raycaster
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || victory) return;

    const interval = setInterval(() => {
      if (flyingKnifeRef.current !== null) return;

      let hitAngle = Math.PI / 2 - logRotationRef.current;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      hitAngle = hitAngle % (Math.PI * 2);

      let safe = true;
      for (const k of embeddedKnives) {
        let diff = Math.abs(k.angle - hitAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.38) {
          safe = false;
          break;
        }
      }

      if (safe && Math.random() < (botDiff === "hard" ? 0.92 : botDiff === "medium" ? 0.68 : 0.42)) {
        throwKnife();
      }
    }, 220);

    return () => clearInterval(interval);
  }, [inMenu, playMode, gameOver, victory, embeddedKnives, botDiff, throwKnife]);

  // Hero Graphic
  const knifeHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-amber-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="80" cy="70" r="46" fill="#92400e" stroke="#78350f" strokeWidth="5" />
          <circle cx="80" cy="70" r="34" fill="#b45309" />
          <circle cx="80" cy="70" r="20" stroke="#78350f" strokeWidth="2" fill="none" />
          <circle cx="80" cy="70" r="10" fill="#ca8a04" />

          {/* Knives */}
          <g transform="translate(80, 70) rotate(-45)">
            <rect x="-3" y="42" width="6" height="15" fill="#e2e8f0" />
            <rect x="-5" y="57" width="10" height="14" fill="#ea580c" />
          </g>
          <g transform="translate(80, 70) rotate(55)">
            <rect x="-3" y="42" width="6" height="15" fill="#e2e8f0" />
            <rect x="-5" y="57" width="10" height="14" fill="#ea580c" />
          </g>

          {/* Ruby & Apple */}
          <circle cx="80" cy="38" r="9" fill="#ef4444" />
          <polygon points="110,65 116,73 110,81 104,73" fill="#ec4899" />

          {/* Flying Knife */}
          <g transform="translate(80, 135)">
            <polygon points="0,-16 5,-2 -5,-2" fill="#f8fafc" />
            <rect x="-3" y="-2" width="6" height="14" fill="#94a3b8" />
            <rect x="-4" y="12" width="8" height="12" fill="#ea580c" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Tap to Launch Knife",
      desc: "Tap anywhere on screen to launch a knife straight into the rotating wooden log!",
      icon: "🗡️",
    },
    {
      title: "Don't Clash Blades",
      desc: "Striking an existing blade shatters your knife and instantly ends the run!",
      icon: "💥",
    },
    {
      title: "Slice Apples & Rubies",
      desc: "Slice bonus items on the log for juicy points! Embed all 15 knives to clear the stage.",
      icon: "🍎",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="KNIFE THROWER"
          subtitle="Precision Arcade"
          categoryTag="DEXTERITY & AIM"
          accentColor="#ea580c"
          objective="Tap to launch knives into the rotating log. Don't hit existing blades! Embed 15 knives to win!"
          heroGraphic={knifeHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend", "medium", 1)}
          onPlayBot={(diff) => startGame("bot", diff, 1)}
          onBack={onBack || (() => window.history.back())}
          hiScore={hiScore}
        />
      </div>
    );
  }

  return (
    <div
      onPointerDown={throwKnife}
      className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans cursor-pointer"
    >
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setInMenu(true);
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Stage & Knives Left */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black text-amber-400 drop-shadow-md tracking-wider">
            {knivesLeft}
          </div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">
            STAGE {stage} • KNIVES LEFT
          </span>
        </div>

        {/* Score & HI */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>{score}</span>
        </div>
      </div>

      {/* Canvas Log Arena with Quiver HUD on Left */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Quiver HUD: Stack of knife silhouettes on left edge */}
        <div className="absolute left-3 bottom-6 flex flex-col-reverse gap-1 pointer-events-none">
          {Array.from({ length: TOTAL_KNIVES }).map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-3.5 rounded-xs transition-all duration-300 ${
                idx < knivesLeft
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  : "bg-neutral-800 opacity-30"
              }`}
            />
          ))}
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">BLADE SHATTERED!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">You struck an existing knife!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff, 1);
              }}
              className="w-full max-w-[220px] py-3.5 bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}

        {/* Victory Modal */}
        {victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">
              {stage === 1 ? "STAGE 1 CLEARED!" : "MASTER THROWER!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              {stage === 1 ? "Get ready for Stage 2 Boss Log!" : "All logs cleared flawlessly!"}
            </p>
            <div className="text-3xl font-black text-yellow-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (stage === 1) {
                  startGame(playMode, botDiff, 2);
                } else {
                  startGame(playMode, botDiff, 1);
                }
              }}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{stage === 1 ? "NEXT STAGE" : "PLAY AGAIN"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tap Banner Prompt */}
      <div className="w-full max-w-sm text-center py-2">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          TAP ANYWHERE TO THROW KNIFE
        </span>
      </div>
    </div>
  );
}
