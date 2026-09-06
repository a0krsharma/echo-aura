"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Flame, Sparkles } from "lucide-react";

interface CupPongProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Cup {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  cleared: boolean;
  isRocking: boolean;
}

interface FlyingBall {
  x: number;
  y: number;
  z: number; // 3D height
  vx: number;
  vy: number;
  vz: number;
  isFire: boolean;
  // Rim roll state if caught on cup rim
  rimRollCupId: number | null;
  rimAngle: number;
  rimSpeed: number;
  rimTime: number;
}

interface FoamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export default function CupPongGame({
  match,
  currentUid,
  onBack,
}: CupPongProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Game state
  const [cups, setCups] = useState<Cup[]>([]);
  const [ballsLeft, setBallsLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [consecutiveSinks, setConsecutiveSinks] = useState(0);
  const [isOnFire, setIsOnFire] = useState(false);
  const [statusMessage, setStatusMessage] = useState("DRAG TO AIM • RELEASE TO TOSS");
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  // Trajectory preview
  const [aimingPreview, setAimingPreview] = useState<{ vx: number; vy: number; vz: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flyingBallRef = useRef<FlyingBall | null>(null);
  const foamParticlesRef = useRef<FoamParticle[]>([]);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Initialize initial 6-cup pyramid
  const createInitialCups = useCallback((): Cup[] => {
    return [
      // Row 1 (Back 3 cups)
      { id: 1, x: 130, y: 70, targetX: 130, targetY: 70, cleared: false, isRocking: false },
      { id: 2, x: 180, y: 70, targetX: 180, targetY: 70, cleared: false, isRocking: false },
      { id: 3, x: 230, y: 70, targetX: 230, targetY: 70, cleared: false, isRocking: false },
      // Row 2 (Middle 2 cups)
      { id: 4, x: 155, y: 110, targetX: 155, targetY: 110, cleared: false, isRocking: false },
      { id: 5, x: 205, y: 110, targetX: 205, targetY: 110, cleared: false, isRocking: false },
      // Row 3 (Front 1 cup)
      { id: 6, x: 180, y: 150, targetX: 180, targetY: 150, cleared: false, isRocking: false },
    ];
  }, []);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_cup_pong_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Dynamic Re-Rack Logic: 6 -> 3 -> 1
  const checkAndApplyReRack = (activeCups: Cup[]) => {
    const remaining = activeCups.filter((c) => !c.cleared);
    if (remaining.length === 3) {
      // Re-rack to tight 3-cup triangle (2 back, 1 front)
      arcadeSfx.playMatchSuccess();
      setStatusMessage("🔄 RE-RACK! TIGHT 3-CUP TRIANGLE!");
      return activeCups.map((c) => {
        if (c.cleared) return c;
        const indexInRemaining = remaining.findIndex((r) => r.id === c.id);
        if (indexInRemaining === 0) return { ...c, targetX: 155, targetY: 85 };
        if (indexInRemaining === 1) return { ...c, targetX: 205, targetY: 85 };
        return { ...c, targetX: 180, targetY: 125 };
      });
    } else if (remaining.length === 1) {
      // Re-rack to single centered "ISLAND" cup
      arcadeSfx.playMatchSuccess();
      setStatusMessage("🏝️ LAST CUP ISLAND! DOUBLE VALUE!");
      return activeCups.map((c) => {
        if (c.cleared) return c;
        return { ...c, targetX: 180, targetY: 95 };
      });
    }
    return activeCups;
  };

  // Start game
  const startGame = useCallback(
    (mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
      setPlayMode(mode);
      setBotDiff(diff);
      setCups(createInitialCups());
      setBallsLeft(10);
      setScore(0);
      setConsecutiveSinks(0);
      setIsOnFire(false);
      setGameOver(false);
      setVictory(false);
      setAimingPreview(null);
      flyingBallRef.current = null;
      foamParticlesRef.current = [];
      setStatusMessage("DRAG TO AIM • RELEASE TO TOSS!");
      setInMenu(false);
    },
    [createInitialCups]
  );

  // Toss ball
  const tossBall = useCallback(
    (vx: number, vy: number, vz: number) => {
      if (inMenu || gameOver || victory || flyingBallRef.current !== null || ballsLeft <= 0) return;

      arcadeSfx.playWhoosh();
      setBallsLeft((b) => b - 1);
      setAimingPreview(null);

      flyingBallRef.current = {
        x: 180,
        y: 350,
        z: 0,
        vx,
        vy,
        vz,
        isFire: isOnFire,
        rimRollCupId: null,
        rimAngle: 0,
        rimSpeed: 0,
        rimTime: 0,
      };
    },
    [inMenu, gameOver, victory, ballsLeft, isOnFire]
  );

  // Main Canvas & 3D Parabolic Trajectory Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      // Smooth cup re-rack interpolations
      setCups((prevCups) =>
        prevCups.map((cup) => {
          const dx = cup.targetX - cup.x;
          const dy = cup.targetY - cup.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            return {
              ...cup,
              x: cup.x + dx * 0.1,
              y: cup.y + dy * 0.1,
            };
          }
          return cup;
        })
      );

      const ball = flyingBallRef.current;

      if (ball) {
        if (ball.rimRollCupId !== null) {
          // Rim Roll-Around Physics
          const cup = cups.find((c) => c.id === ball.rimRollCupId);
          if (cup) {
            ball.rimAngle += ball.rimSpeed;
            ball.rimSpeed *= 0.94; // friction decay
            ball.rimTime += 1;

            ball.x = cup.x + Math.cos(ball.rimAngle) * 14;
            ball.y = cup.y + Math.sin(ball.rimAngle) * 6;
            ball.z = 10;

            if (ball.rimTime > 25 || ball.rimSpeed < 0.04) {
              // Rim roll decided: drops in or spills out!
              const dropsIn = Math.random() < 0.65;
              if (dropsIn) {
                // SUNK FROM RIM ROLL!
                arcadeSfx.playCupSink();
                setStatusMessage("🎯 IN OFF THE RIM! WHAT A SHOT!");
                handleCupSink(cup.id);
              } else {
                // Spills off rim onto table
                arcadeSfx.playPingPongBounce(false);
                setStatusMessage("LIP OUT! SO CLOSE!");
                flyingBallRef.current = null;
                setConsecutiveSinks(0);
                setIsOnFire(false);
                if (ballsLeft <= 0) setGameOver(true);
              }
            }
          }
        } else {
          // 3D Parabolic Trajectory
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.z += ball.vz;
          ball.vz -= 0.62; // gravity

          // Flame particles if On Fire
          if (ball.isFire && Math.random() < 0.8) {
            foamParticlesRef.current.push({
              x: ball.x + (Math.random() - 0.5) * 6,
              y: ball.y - ball.z,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 2,
              life: 1,
              color: Math.random() > 0.4 ? "#f97316" : "#fef08a",
              size: 3 + Math.random() * 2,
            });
          }

          // Ball lands on table level (z <= 0)
          if (ball.z <= 0 && ball.y < 320) {
            ball.z = 0;

            // Check cup hits
            let hitCup: Cup | null = null;
            let hitDist = 999;
            for (const cup of cups) {
              if (!cup.cleared) {
                const dist = Math.hypot(ball.x - cup.x, (ball.y - cup.y) * 1.6);
                if (dist < hitDist) {
                  hitDist = dist;
                  hitCup = cup;
                }
              }
            }

            if (hitCup && hitDist <= 13) {
              // Direct bullseye sink!
              arcadeSfx.playCupSink();
              setStatusMessage("SPLASH! DIRECT HIT! 🎯");
              handleCupSink(hitCup.id);
            } else if (hitCup && hitDist > 13 && hitDist <= 22) {
              // Lip of cup: trigger rim roll-around!
              arcadeSfx.playPingPongBounce(false);
              setStatusMessage("🌀 RIM ROLL-AROUND!");
              ball.rimRollCupId = hitCup.id;
              ball.rimAngle = Math.atan2(ball.y - hitCup.y, ball.x - hitCup.x);
              ball.rimSpeed = 0.38;
              ball.rimTime = 0;
            } else {
              // Table miss
              arcadeSfx.playPingPongBounce(false);
              setStatusMessage("MISSED! ADJUST YOUR ANGLE!");
              flyingBallRef.current = null;
              setConsecutiveSinks(0);
              setIsOnFire(false);

              if (ballsLeft <= 0) {
                setGameOver(true);
                arcadeSfx.playPenaltyBuzz();
              }
            }
          } else if (ball.y < -30 || ball.y > 450) {
            flyingBallRef.current = null;
            setConsecutiveSinks(0);
            setIsOnFire(false);
            if (ballsLeft <= 0) {
              setGameOver(true);
              arcadeSfx.playPenaltyBuzz();
            }
          }
        }
      }

      // Update foam particles
      foamParticlesRef.current = foamParticlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          life: p.life - 0.04,
        }))
        .filter((p) => p.life > 0);

      // ── RENDER BEER PONG TABLE ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark tavern background
      ctx.fillStyle = "#0c0a09";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3D Perspective Wooden Pong Table
      const tableGrad = ctx.createLinearGradient(180, 40, 180, 380);
      tableGrad.addColorStop(0, "#451a03");
      tableGrad.addColorStop(0.5, "#78350f");
      tableGrad.addColorStop(1, "#291003");
      ctx.fillStyle = tableGrad;

      ctx.beginPath();
      ctx.moveTo(55, 40);
      ctx.lineTo(305, 40);
      ctx.lineTo(345, 380);
      ctx.lineTo(15, 380);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Wood plank slats
      ctx.strokeStyle = "rgba(251, 191, 36, 0.12)";
      ctx.lineWidth = 2;
      [110, 180, 250].forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(lx, 40);
        ctx.lineTo(lx > 180 ? lx + 35 : lx - 35, 380);
        ctx.stroke();
      });

      // Render Cups with 3D Ribs & Beer Liquid
      cups.forEach((cup) => {
        if (!cup.cleared) {
          // Cup base drop shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y + 24, 15, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Solo Cup Tapered Body
          const cupGrad = ctx.createLinearGradient(cup.x - 14, cup.y, cup.x + 14, cup.y);
          cupGrad.addColorStop(0, "#b91c1c");
          cupGrad.addColorStop(0.4, "#ef4444");
          cupGrad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = cupGrad;

          ctx.beginPath();
          ctx.moveTo(cup.x - 14, cup.y);
          ctx.lineTo(cup.x + 14, cup.y);
          ctx.lineTo(cup.x + 10, cup.y + 24);
          ctx.lineTo(cup.x - 10, cup.y + 24);
          ctx.closePath();
          ctx.fill();

          // Plastic Rib Horizontal Ridges
          ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
          ctx.lineWidth = 1.5;
          [cup.y + 7, cup.y + 14, cup.y + 20].forEach((ry) => {
            ctx.beginPath();
            ctx.moveTo(cup.x - 12 + (ry - cup.y) * 0.15, ry);
            ctx.lineTo(cup.x + 12 - (ry - cup.y) * 0.15, ry);
            ctx.stroke();
          });

          // Rolled White Plastic Top Lip
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Amber Beer Liquid Surface
          const beerGrad = ctx.createRadialGradient(cup.x, cup.y + 2, 2, cup.x, cup.y + 2, 12);
          beerGrad.addColorStop(0, "#fef08a");
          beerGrad.addColorStop(0.6, "#f59e0b");
          beerGrad.addColorStop(1, "#b45309");
          ctx.fillStyle = beerGrad;
          ctx.beginPath();
          ctx.ellipse(cup.x, cup.y + 2, 11, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Liquid Foam Bubbles
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.beginPath();
          ctx.arc(cup.x - 3, cup.y + 1, 2, 0, Math.PI * 2);
          ctx.arc(cup.x + 4, cup.y + 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Render Interactive Aim Trajectory Guide
      if (aimingPreview && !ball) {
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        let simX = 180;
        let simY = 350;
        let simZ = 0;
        let simVx = aimingPreview.vx;
        let simVy = aimingPreview.vy;
        let simVz = aimingPreview.vz;

        ctx.moveTo(simX, simY);
        for (let step = 0; step < 24; step++) {
          simX += simVx;
          simY += simVy;
          simZ += simVz;
          simVz -= 0.62;
          ctx.lineTo(simX, simY - simZ);
          if (simZ <= 0 && step > 5) break;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Landing target reticle
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(simX, simY, 12, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render Foam / Splash Particles
      foamParticlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Render Flying Ball & Dynamic Shadow
      if (ball) {
        // Shadow on Table
        const sY = ball.y + 14;
        const sRad = 8 * (1 + ball.z * 0.03);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(ball.x, sY, sRad, sRad * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Parabolic Ball (displaced vertically by z)
        const screenY = ball.y - ball.z;
        const ballGrad = ctx.createRadialGradient(
          ball.x - 2,
          screenY - 2,
          1,
          ball.x,
          screenY,
          8
        );
        if (ball.isFire) {
          ballGrad.addColorStop(0, "#fef08a");
          ballGrad.addColorStop(0.5, "#f97316");
          ballGrad.addColorStop(1, "#dc2626");
        } else {
          ballGrad.addColorStop(0, "#ffffff");
          ballGrad.addColorStop(0.7, "#f8fafc");
          ballGrad.addColorStop(1, "#cbd5e1");
        }

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(ball.x, screenY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ball.isFire ? "#ea580c" : "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (ballsLeft > 0 && !gameOver && !victory) {
        // Ready ball at bottom
        ctx.save();
        ctx.translate(180, 345);
        if (isOnFire) {
          const fireGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 25);
          fireGrad.addColorStop(0, "rgba(249, 115, 22, 0.6)");
          fireGrad.addColorStop(1, "rgba(249, 115, 22, 0)");
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = isOnFire ? "#f59e0b" : "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isOnFire ? "#dc2626" : "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, cups, ballsLeft, gameOver, victory, aimingPreview, isOnFire]);

  // Sink handling
  const handleCupSink = (sunkCupId: number) => {
    // Foam splash
    const sunkCup = cups.find((c) => c.id === sunkCupId);
    if (sunkCup) {
      for (let i = 0; i < 20; i++) {
        foamParticlesRef.current.push({
          x: sunkCup.x + (Math.random() - 0.5) * 12,
          y: sunkCup.y,
          vx: (Math.random() - 0.5) * 6,
          vy: -3 - Math.random() * 4,
          life: 1,
          color: i % 2 === 0 ? "#fef08a" : "#ffffff",
          size: 2.5 + Math.random() * 2.5,
        });
      }
    }

    const nextSinks = consecutiveSinks + 1;
    setConsecutiveSinks(nextSinks);
    if (nextSinks >= 2 && !isOnFire) {
      setIsOnFire(true);
      arcadeSfx.playVictory();
      setStatusMessage("🔥 HE'S ON FIRE!! BALL IGNITED!");
    }

    const bonus = isOnFire ? 200 : 100;
    setScore((s) => {
      const ns = s + bonus;
      if (ns > hiScore) {
        setHiScore(ns);
        try {
          localStorage.setItem("echo_cup_pong_hi", String(ns));
        } catch {}
      }
      return ns;
    });

    flyingBallRef.current = null;

    // Clear cup and re-rack
    setCups((prev) => {
      const updated = prev.map((c) => (c.id === sunkCupId ? { ...c, cleared: true } : c));
      const remaining = updated.filter((c) => !c.cleared).length;

      if (remaining === 0) {
        setVictory(true);
        arcadeSfx.playVictory();
        if (currentUid && match?.id) {
          updateArcadeGameScore(match.id, currentUid, "cup_pong" as any, 350, true);
        }
        return updated;
      }

      return checkAndApplyReRack(updated);
    });
  };

  // Pointer swipe & aiming handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameOver || victory || flyingBallRef.current !== null || (playMode === "bot" && ballsLeft % 2 === 0)) return;
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeStartRef.current || flyingBallRef.current !== null) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    const dt = Math.max(1, Date.now() - swipeStartRef.current.time);

    if (dy < -20) {
      const speed = Math.min(Math.abs(dy) / dt, 3.4);
      const vx = dx * 0.045;
      const vy = -3.6 - speed * 1.4;
      const vz = 9.2 + speed * 1.9;
      setAimingPreview({ vx, vy, vz });
    }
  };

  const handlePointerUp = () => {
    if (!swipeStartRef.current || flyingBallRef.current !== null) return;
    swipeStartRef.current = null;

    if (aimingPreview) {
      tossBall(aimingPreview.vx, aimingPreview.vy, aimingPreview.vz);
      setAimingPreview(null);
    }
  };

  // Bot AI toss loop
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver || victory || flyingBallRef.current !== null) return;

    if (ballsLeft % 2 === 0) {
      const timer = setTimeout(() => {
        const accuracy = botDiff === "hard" ? 0.78 : botDiff === "medium" ? 0.52 : 0.32;
        const willHit = Math.random() < accuracy;

        const targetCup = cups.find((c) => !c.cleared);
        if (targetCup) {
          const vx = willHit ? (targetCup.x - 180) * 0.045 : (Math.random() - 0.5) * 3.5;
          const vy = willHit ? -6.2 : -5.2 - Math.random() * 2.5;
          const vz = willHit ? 13.2 : 11 + Math.random() * 4;
          tossBall(vx, vy, vz);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inMenu, playMode, ballsLeft, gameOver, victory, botDiff, cups, tossBall]);

  // Hero Graphic
  const cupPongHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-blue-950/40 rounded-2xl flex items-center justify-center border border-blue-500/20">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <polygon points="20,45 140,45 155,140 5,140" fill="#451a03" stroke="#78350f" strokeWidth="3" />

          {/* Red Cups */}
          <g transform="translate(60, 65)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>
          <g transform="translate(80, 65)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>
          <g transform="translate(100, 65)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>
          <g transform="translate(70, 85)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>
          <g transform="translate(90, 85)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>
          <g transform="translate(80, 105)">
            <polygon points="-8,0 8,0 6,16 -6,16" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#f8fafc" />
            <ellipse cx="0" cy="1" rx="6" ry="2.5" fill="#f59e0b" />
          </g>

          {/* Flaming Ball */}
          <circle cx="80" cy="125" r="6" fill="#f59e0b" stroke="#dc2626" strokeWidth="1.5" />
          <path d="M80,120 Q80,75 80,95" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Touch & Drag to Aim",
      desc: "Drag back to view the dotted trajectory preview arc. Release to toss the ball toward the cups!",
      icon: "🥤",
    },
    {
      title: "Rim Roll-Arounds & Re-Racks",
      desc: "Landed shots trigger thrilling rim roll-arounds! Cups automatically re-rack as they clear.",
      icon: "🌀",
    },
    {
      title: "He's On Fire!",
      desc: "Sink 2 cups consecutively to catch fire! Flaming balls score double bonus points!",
      icon: "🔥",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-blue-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="CUP PONG"
          subtitle="Arcade Table Toss"
          categoryTag="DEXTERITY & AIM"
          accentColor="#0288D1"
          objective="Drag to aim trajectory and flick balls into the red cup pyramid! Clear all cups to win!"
          heroGraphic={cupPongHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
          hiScore={hiScore}
        />
      </div>
    );
  }

  const remainingCups = cups.filter((c) => !c.cleared).length;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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

        {/* Cups Remaining */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black text-red-500 drop-shadow-md">
            {remainingCups} / 6
          </div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">CUPS LEFT</span>
        </div>

        {/* Balls Left & On Fire Badge */}
        <div className="flex items-center gap-1.5">
          {isOnFire && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/50 animate-bounce">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>ON FIRE!</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-300 bg-neutral-900/80 px-2.5 py-1 rounded-full border border-white/15">
            <span>⚪ {ballsLeft}</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full max-w-sm text-center my-1">
        <span className="text-xs font-black tracking-wider uppercase text-neutral-300">
          {statusMessage}
        </span>
      </div>

      {/* 2.5D Beer Pong Table Canvas */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={400} className="w-full h-full" />

        {/* Victory Modal */}
        {victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">
              ALL CUPS CLEARED!
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Flawless Cup Pong victory!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameOver && !victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💥
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">OUT OF BALLS!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Cups remaining: {remainingCups}
            </p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startGame(playMode, botDiff);
              }}
              className="w-full max-w-[220px] py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Swipe prompt */}
      <div className="w-full max-w-sm flex flex-col items-center py-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-bounce">
          ▲
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400 mt-1">
          DRAG TO PREVIEW AIM • RELEASE TO TOSS
        </span>
      </div>
    </div>
  );
}

