"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy, Zap, Flame, Sparkles, Volume2, VolumeX, Shield, Crosshair } from "lucide-react";

export interface BottleShooterProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

export type BottleType =
  | "wine"
  | "beer"
  | "whiskey"
  | "champagne"
  | "golden"
  | "tnt"
  | "shield";

interface BottleDef {
  type: BottleType;
  name: string;
  width: number;
  height: number;
  points: number;
  glassColor: string;
  liquidColor: string;
  capColor: string;
  isHazard?: boolean;
  isObstacle?: boolean;
}

const BOTTLE_DEFS: Record<BottleType, BottleDef> = {
  wine: {
    type: "wine",
    name: "Emerald Wine",
    width: 22,
    height: 58,
    points: 10,
    glassColor: "#15803d",
    liquidColor: "rgba(185, 28, 28, 0.85)",
    capColor: "#dc2626",
  },
  beer: {
    type: "beer",
    name: "Golden Lager",
    width: 24,
    height: 52,
    points: 10,
    glassColor: "#92400e",
    liquidColor: "rgba(245, 158, 11, 0.85)",
    capColor: "#facc15",
  },
  whiskey: {
    type: "whiskey",
    name: "Aged Bourbon",
    width: 28,
    height: 54,
    points: 15,
    glassColor: "#b45309",
    liquidColor: "rgba(217, 119, 6, 0.85)",
    capColor: "#78350f",
  },
  champagne: {
    type: "champagne",
    name: "Crystal Fizz",
    width: 24,
    height: 62,
    points: 20,
    glassColor: "#0284c7",
    liquidColor: "rgba(254, 240, 138, 0.85)",
    capColor: "#fef08a",
  },
  golden: {
    type: "golden",
    name: "Golden Royale",
    width: 26,
    height: 60,
    points: 50,
    glassColor: "#eab308",
    liquidColor: "rgba(251, 191, 36, 0.95)",
    capColor: "#ffffff",
  },
  tnt: {
    type: "tnt",
    name: "TNT Explosive",
    width: 32,
    height: 48,
    points: 25,
    glassColor: "#dc2626",
    liquidColor: "rgba(239, 68, 68, 0.9)",
    capColor: "#f59e0b",
    isHazard: true,
  },
  shield: {
    type: "shield",
    name: "Armor Shield",
    width: 30,
    height: 56,
    points: 0,
    glassColor: "#64748b",
    liquidColor: "rgba(148, 163, 184, 0.5)",
    capColor: "#334155",
    isObstacle: true,
  },
};

// ── Motion Paths for Targets ──
export type TargetMotion = "static" | "conveyor" | "pendulum" | "sinusoid";

interface TargetEntity {
  id: number;
  type: BottleType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  motion: TargetMotion;
  motionParam: number; // phase or oscillation offset
  isHit: boolean;
  shelfRow: number;
}

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
}

interface LiquidDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

interface BulletImpact {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  isRicochet: boolean;
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

export default function BottleShooterGame({
  match,
  currentUid,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: BottleShooterProps) {
  const initialDiff = ((match?.difficulty?.toLowerCase() as BotDifficulty) || "medium");
  const [inMenu, setInMenu] = useState(false);
  const [botDiff, setBotDiff] = useState<BotDifficulty>(initialDiff);

  // Game Progress
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [ammo, setAmmo] = useState(6);
  const [isReloading, setIsReloading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [hits, setHits] = useState(0);

  const [isMuted, setIsMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Entities & Physics
  const targetsRef = useRef<TargetEntity[]>([]);
  const shardsRef = useRef<GlassShard[]>([]);
  const liquidRef = useRef<LiquidDrop[]>([]);
  const impactsRef = useRef<BulletImpact[]>([]);
  const scoresRef = useRef<FloatingScore[]>([]);

  // Crosshair
  const crosshairRef = useRef<{ x: number; y: number }>({ x: 180, y: 300 });
  const recoilOffsetRef = useRef(0);

  // Shelf setup (3 wooden shooting tiers)
  const SHELF_Y = [160, 290, 420];

  // Spawn Target Layout
  const populateTargets = useCallback(() => {
    const list: TargetEntity[] = [];
    let idCounter = 1;

    // Row 1 (Top, Small fast moving conveyor)
    for (let i = 0; i < 4; i++) {
      const types: BottleType[] = ["wine", "beer", "champagne", "golden"];
      list.push({
        id: idCounter++,
        type: types[i % types.length],
        x: 40 + i * 80,
        y: SHELF_Y[0] - 30,
        baseX: 40 + i * 80,
        baseY: SHELF_Y[0] - 30,
        vx: 1.2,
        motion: "conveyor",
        motionParam: i,
        isHit: false,
        shelfRow: 0,
      });
    }

    // Row 2 (Middle, Static bottles + 1 TNT + 1 moving Armor Shield)
    const midTypes: BottleType[] = ["whiskey", "tnt", "wine", "shield"];
    for (let i = 0; i < 4; i++) {
      const isShield = midTypes[i] === "shield";
      list.push({
        id: idCounter++,
        type: midTypes[i],
        x: 45 + i * 75,
        y: SHELF_Y[1] - 30,
        baseX: 45 + i * 75,
        baseY: SHELF_Y[1] - 30,
        vx: isShield ? 1.8 : 0,
        motion: isShield ? "pendulum" : "static",
        motionParam: i * 0.8,
        isHit: false,
        shelfRow: 1,
      });
    }

    // Row 3 (Bottom, Oscillating pendulums & heavy whiskey jugs)
    const botTypes: BottleType[] = ["beer", "champagne", "whiskey", "beer"];
    for (let i = 0; i < 4; i++) {
      list.push({
        id: idCounter++,
        type: botTypes[i],
        x: 40 + i * 80,
        y: SHELF_Y[2] - 30,
        baseX: 40 + i * 80,
        baseY: SHELF_Y[2] - 30,
        vx: 0,
        motion: "sinusoid",
        motionParam: i * 1.5,
        isHit: false,
        shelfRow: 2,
      });
    }

    targetsRef.current = list;
  }, []);

  // Ensure targets are populated on initial mount
  useEffect(() => {
    populateTargets();
  }, [populateTargets]);

  // Start / Reset Session
  const startGame = useCallback((diff?: BotDifficulty) => {
    if (diff) setBotDiff(diff);
    setScore(0);
    setAmmo(6);
    setIsReloading(false);
    setTimeLeft(60);
    setGameOver(false);
    setStreak(0);
    setTotalShots(0);
    setHits(0);
    shardsRef.current = [];
    liquidRef.current = [];
    impactsRef.current = [];
    scoresRef.current = [];
    populateTargets();
    setInMenu(false);
  }, [populateTargets]);

  // Reload action
  const triggerReload = useCallback(() => {
    if (isReloading || ammo === 6) return;
    setIsReloading(true);
    if (!isMuted) arcadeSfx.playRevolverReload();

    setTimeout(() => {
      setAmmo(6);
      setIsReloading(false);
    }, 650);
  }, [isReloading, ammo, isMuted]);

  // Fire Gunshot
  const shootAt = useCallback(
    (targetX: number, targetY: number) => {
      if (gameOver || inMenu || isReloading) return;

      if (ammo <= 0) {
        if (!isMuted) arcadeSfx.playEmptyChamber();
        triggerReload();
        return;
      }

      setAmmo((a) => a - 1);
      setTotalShots((s) => s + 1);
      if (!isMuted) arcadeSfx.playGunshot();

      // Recoil screen kick
      recoilOffsetRef.current = 6;

      let hitAny = false;

      // Check collision with target bottles (front to back)
      targetsRef.current.forEach((tgt) => {
        if (tgt.isHit) return;
        const def = BOTTLE_DEFS[tgt.type];

        const left = tgt.x - def.width / 2;
        const right = tgt.x + def.width / 2;
        const top = tgt.y - def.height;
        const bottom = tgt.y;

        if (targetX >= left && targetX <= right && targetY >= top && targetY <= bottom) {
          hitAny = true;

          if (def.isObstacle) {
            // Steel Armor Shield -> Ricochet!
            if (!isMuted) arcadeSfx.playRicochet();
            impactsRef.current.push({
              x: targetX,
              y: targetY,
              radius: 18,
              alpha: 1,
              isRicochet: true,
            });
            scoresRef.current.push({
              id: Math.random(),
              x: targetX,
              y: targetY - 15,
              text: "RICOCHET!",
              color: "#94a3b8",
              alpha: 1,
              vy: -1,
            });
            return;
          }

          tgt.isHit = true;
          setHits((h) => h + 1);
          setStreak((s) => s + 1);

          if (def.isHazard) {
            // TNT Explosion clears row!
            if (!isMuted) arcadeSfx.playBombExplosion();
            targetsRef.current.forEach((other) => {
              if (!other.isHit && Math.hypot(other.x - tgt.x, other.y - tgt.y) < 130) {
                other.isHit = true;
              }
            });
          } else {
            if (!isMuted) arcadeSfx.playGlassShatter();
          }

          // Points
          const streakMultiplier = streak >= 5 ? 2 : 1;
          const awarded = def.points * streakMultiplier;
          setScore((sc) => {
            const next = sc + awarded;
            setHighScore((h) => Math.max(h, next));
            return next;
          });

          scoresRef.current.push({
            id: Math.random(),
            x: targetX,
            y: targetY - 20,
            text: `+${awarded}${streakMultiplier > 1 ? " (2x)" : ""}`,
            color: def.capColor,
            alpha: 1,
            vy: -1.5,
          });

          // Spawn Glass Shards (14-18 shards)
          for (let s = 0; s < 16; s++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            shardsRef.current.push({
              x: tgt.x,
              y: tgt.y - def.height * 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2.5,
              rot: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.3,
              size: 3 + Math.random() * 6,
              color: def.glassColor,
              alpha: 1,
            });
          }

          // Spawn Liquid Droplets
          for (let l = 0; l < 18; l++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 6;
            liquidRef.current.push({
              x: tgt.x,
              y: tgt.y - def.height * 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 3,
              size: 2.5 + Math.random() * 4,
              color: def.liquidColor,
              alpha: 0.9,
            });
          }

          // Impact Flash
          impactsRef.current.push({
            x: targetX,
            y: targetY,
            radius: 20,
            alpha: 1,
            isRicochet: false,
          });
        }
      });

      if (!hitAny) {
        setStreak(0);
        impactsRef.current.push({
          x: targetX,
          y: targetY,
          radius: 10,
          alpha: 0.8,
          isRicochet: false,
        });
      }

      // Respawn targets if all breakable ones cleared
      const remainingBreakables = targetsRef.current.filter((t) => !t.isHit && !BOTTLE_DEFS[t.type].isObstacle);
      if (remainingBreakables.length === 0) {
        setTimeout(() => {
          populateTargets();
          if (!isMuted) arcadeSfx.playVictory();
        }, 300);
      }
    },
    [gameOver, inMenu, isReloading, ammo, isMuted, triggerReload, streak, populateTargets]
  );

  // Timer Countdown
  useEffect(() => {
    if (inMenu || gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          if (!isMuted) arcadeSfx.playVictory();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inMenu, gameOver, isMuted]);

  // AI Marksman Bot (Shoots targets alongside the player)
  useEffect(() => {
    if (inMenu || gameOver) return;

    const intervalMs = botDiff === "easy" ? 1400 : botDiff === "medium" ? 850 : 420;
    const interval = setInterval(() => {
      const activeTargets = targetsRef.current.filter(
        (t) => !t.isHit && !BOTTLE_DEFS[t.type].isObstacle
      );
      if (activeTargets.length === 0) return;

      // Pick target
      const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
      if (!target) return;

      const accuracy = botDiff === "easy" ? 0.6 : botDiff === "medium" ? 0.82 : 0.96;
      const def = BOTTLE_DEFS[target.type];

      let aimX = target.x;
      let aimY = target.y - def.height * 0.5;

      if (Math.random() > accuracy) {
        // Miss slightly
        aimX += (Math.random() - 0.5) * 50;
        aimY += (Math.random() - 0.5) * 50;
      }

      crosshairRef.current = { x: aimX, y: aimY };
      shootAt(aimX, aimY);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [inMenu, gameOver, botDiff, shootAt]);

  // 60 FPS Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gravity = 0.35;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── 1. Saloon Range Background & Wood Planks ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, "#1c1917");
      bgGrad.addColorStop(0.4, "#292524");
      bgGrad.addColorStop(1, "#0c0a09");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant target range silhouette
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, 100);

      // Wooden Shelves with Brass Rails
      SHELF_Y.forEach((sy) => {
        // Shelf shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(10, sy, canvas.width - 20, 14);

        // Solid wood beam
        const woodGrad = ctx.createLinearGradient(0, sy - 10, 0, sy + 6);
        woodGrad.addColorStop(0, "#78350f");
        woodGrad.addColorStop(0.5, "#451a03");
        woodGrad.addColorStop(1, "#291002");
        ctx.fillStyle = woodGrad;
        ctx.fillRect(15, sy - 6, canvas.width - 30, 12);

        // Brass support bracket
        ctx.fillStyle = "#d97706";
        ctx.fillRect(20, sy + 6, 8, 14);
        ctx.fillRect(canvas.width - 28, sy + 6, 8, 14);
      });

      // ── 2. Update & Render Target Bottles ──
      const time = performance.now() * 0.002;
      targetsRef.current.forEach((tgt) => {
        const def = BOTTLE_DEFS[tgt.type];

        // Apply motion
        if (tgt.motion === "conveyor") {
          tgt.x += tgt.vx;
          if (tgt.x > canvas.width - 25) tgt.vx = -Math.abs(tgt.vx);
          if (tgt.x < 25) tgt.vx = Math.abs(tgt.vx);
        } else if (tgt.motion === "pendulum") {
          tgt.x = tgt.baseX + Math.sin(time * 2 + tgt.motionParam) * 55;
        } else if (tgt.motion === "sinusoid") {
          tgt.y = tgt.baseY + Math.sin(time * 3 + tgt.motionParam) * 6;
        }

        if (tgt.isHit) return;

        ctx.save();
        ctx.translate(tgt.x, tgt.y);

        if (def.isObstacle) {
          // Steel Armor Shield
          ctx.fillStyle = "#64748b";
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-def.width / 2, -def.height, def.width, def.height, 6);
          ctx.fill();
          ctx.stroke();

          // Steel rivets
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.arc(0, -def.height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (def.isHazard) {
          // TNT Barrel
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(-def.width / 2, -def.height, def.width, def.height);
          ctx.fillStyle = "#facc15";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("TNT", 0, -def.height * 0.4);

          // Yellow caution stripes
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(-def.width / 2, -def.height, def.width, def.height);
        } else {
          // Authentic 3D Glass Bottle
          // 1. Bottle Body
          ctx.fillStyle = def.glassColor;
          ctx.beginPath();
          ctx.roundRect(-def.width / 2, -def.height * 0.65, def.width, def.height * 0.65, [
            0,
            0,
            4,
            4,
          ]);
          ctx.fill();

          // 2. Bottle Neck
          const neckW = def.width * 0.4;
          ctx.fillRect(-neckW / 2, -def.height, neckW, def.height * 0.38);

          // 3. Liquid level
          ctx.fillStyle = def.liquidColor;
          ctx.fillRect(
            -def.width / 2 + 2,
            -def.height * 0.55,
            def.width - 4,
            def.height * 0.52
          );

          // 4. Bottle Cap / Cork
          ctx.fillStyle = def.capColor;
          ctx.fillRect(-neckW / 2 - 1, -def.height - 3, neckW + 2, 5);

          // 5. Specular Gloss Highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx.fillRect(-def.width / 2 + 3, -def.height * 0.62, 3, def.height * 0.58);
        }

        ctx.restore();
      });

      // ── 3. Glass Shards & Shrapnel Physics ──
      shardsRef.current.forEach((sh) => {
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.vy += gravity * 1.2;
        sh.rot += sh.vRot;
        sh.alpha -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, sh.alpha);
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.fillStyle = sh.color;
        ctx.beginPath();
        ctx.moveTo(-sh.size, -sh.size);
        ctx.lineTo(sh.size, -sh.size * 0.4);
        ctx.lineTo(0, sh.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      shardsRef.current = shardsRef.current.filter((sh) => sh.alpha > 0);

      // ── 4. Liquid Splash Droplets ──
      liquidRef.current.forEach((ld) => {
        ld.x += ld.vx;
        ld.y += ld.vy;
        ld.vy += gravity * 0.9;
        ld.alpha -= 0.02;

        ctx.save();
        ctx.fillStyle = ld.color;
        ctx.globalAlpha = Math.max(0, ld.alpha);
        ctx.beginPath();
        ctx.arc(ld.x, ld.y, ld.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      liquidRef.current = liquidRef.current.filter((ld) => ld.alpha > 0);

      // ── 5. Muzzle / Bullet Impacts ──
      impactsRef.current.forEach((imp) => {
        imp.alpha -= 0.08;
        ctx.save();
        ctx.globalAlpha = Math.max(0, imp.alpha);
        ctx.fillStyle = imp.isRicochet ? "#facc15" : "#ffffff";
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, imp.radius * (1 - imp.alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      impactsRef.current = impactsRef.current.filter((imp) => imp.alpha > 0);

      // ── 6. Floating Score Numbers ──
      scoresRef.current.forEach((sc) => {
        sc.y += sc.vy;
        sc.alpha -= 0.02;
        ctx.save();
        ctx.globalAlpha = Math.max(0, sc.alpha);
        ctx.fillStyle = sc.color;
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText(sc.text, sc.x, sc.y);
        ctx.restore();
      });
      scoresRef.current = scoresRef.current.filter((sc) => sc.alpha > 0);

      // ── 7. Tactical Laser Aiming Reticle / Crosshair ──
      const ch = crosshairRef.current;
      ctx.save();
      ctx.translate(0, -recoilOffsetRef.current);
      recoilOffsetRef.current = Math.max(0, recoilOffsetRef.current - 0.5);

      // Laser guide line
      ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height);
      ctx.lineTo(ch.x, ch.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer targeting circle
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(ch.x - 22, ch.y);
      ctx.lineTo(ch.x + 22, ch.y);
      ctx.moveTo(ch.x, ch.y - 22);
      ctx.lineTo(ch.x, ch.y + 22);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, isMuted]);

  // Pointer Interaction
  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    crosshairRef.current = { x, y };
    shootAt(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    crosshairRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const accuracyPct = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 100;

  // Pre-Game Modal
  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-amber-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="BOTTLE SHOOTER"
          subtitle="Precision Range Gunner"
          categoryTag="SPORTS & PHYSICS"
          accentColor="#d97706"
          objective="Shoot moving target bottles before the clock expires! Beware of steel armor ricochets and trigger explosive TNT chains!"
          heroGraphic={
            <div className="relative w-36 h-36 flex items-center justify-center">
              <span className="text-6xl animate-bounce">🍾</span>
              <span className="absolute text-5xl translate-x-8 -translate-y-2 animate-pulse">
                🎯
              </span>
            </div>
          }
          howToPlaySteps={[
            {
              title: "Aim & Shoot",
              desc: "Tap or click on bottles to fire your 6-shot heavy caliber revolver.",
              icon: "🎯",
            },
            {
              title: "6-Round Cylinder",
              desc: "Manage your ammo carefully! Tap RELOAD or empty chamber to reload.",
              icon: "🔄",
            },
            {
              title: "TNT Chain Explosions",
              desc: "Shoot explosive TNT barrels to clear nearby bottles in a massive chain blast.",
              icon: "🧨",
            },
            {
              title: "Avoid Steel Shields",
              desc: "Bullets ricochet harmlessly off steel armor shields without scoring points.",
              icon: "🛡️",
            },
          ]}
          onPlayFriend={onInviteFriend || (() => startGame("medium"))}
          onPlayBot={(diff) => startGame(diff)}
          onRandomMatch={onRandomMatch}
          onBack={onBack || (() => window.history.back())}
          hiScore={highScore}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-between p-2 select-none touch-none bg-neutral-950 text-white font-sans relative overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl">
      {/* ── Top Match Header HUD ── */}
      <div className="w-full flex items-center justify-between px-2 py-1.5 z-30">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : setInMenu(true))}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-300 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score Readout */}
        <div className="flex items-center gap-2 bg-neutral-900/90 px-3 py-1 rounded-xl border border-white/10 shadow-md">
          <span className="text-xs font-bold text-amber-400">SCORE</span>
          <span className="text-xl font-black text-white">{score}</span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-xl border shadow-md font-mono text-sm font-black ${
            timeLeft <= 10
              ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse"
              : "bg-neutral-900/90 border-neutral-700 text-neutral-200"
          }`}
        >
          <span>⏱️ {timeLeft}s</span>
        </div>

        {/* Mute Button */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* ── Revolver Chamber & Ammo HUD ── */}
      <div className="w-full flex items-center justify-between px-3 py-1 bg-neutral-900/80 rounded-xl border border-neutral-800 my-1 z-30">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-neutral-400">CHAMBER:</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <span
                key={idx}
                className={`w-3.5 h-6 rounded-sm border transition-all ${
                  idx < ammo
                    ? "bg-gradient-to-b from-amber-400 to-yellow-600 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "bg-neutral-800/60 border-neutral-700 opacity-30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Reload Button */}
        <button
          type="button"
          onClick={triggerReload}
          disabled={isReloading || ammo === 6}
          className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer border ${
            isReloading
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse"
              : ammo <= 1
              ? "bg-red-600 text-white border-red-500 animate-bounce"
              : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
          }`}
        >
          {isReloading ? "RELOADING..." : "RELOAD 🔄"}
        </button>
      </div>

      {/* ── Main Canvas Range ── */}
      <div className="relative w-full aspect-[9/15] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800">
        <canvas
          ref={canvasRef}
          width={360}
          height={600}
          onPointerDown={handleCanvasPointer}
          onPointerMove={handlePointerMove}
          className="w-full h-full cursor-none touch-none"
        />

        {/* Game Over Banner Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 z-40 select-none">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-4xl mb-3 shadow-lg">
              🎯
            </div>
            <h2 className="text-2xl font-black uppercase text-white tracking-wider mb-1">
              RANGE COMPLETE
            </h2>
            <div className="space-y-1 text-xs text-neutral-400 mb-4 font-mono">
              <p>
                Final Score: <strong className="text-amber-400 text-base">{score}</strong> • Best: {highScore}
              </p>
              <p>Accuracy: <strong className="text-emerald-400">{accuracyPct}%</strong> ({hits}/{totalShots} shots)</p>
            </div>

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => startGame(botDiff)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm uppercase rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>SHOOT AGAIN</span>
              </button>

              <button
                type="button"
                onClick={() => setInMenu(true)}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs uppercase rounded-xl border border-neutral-800 transition-all cursor-pointer"
              >
                RANGE MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom HUD Readout ── */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono px-2 py-1">
        <span>MARKSMAN BOT: {botDiff.toUpperCase()}</span>
        <span>ACCURACY: {accuracyPct}%</span>
      </div>
    </div>
  );
}
