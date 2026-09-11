"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  Flame,
  Zap,
} from "lucide-react";

export interface SuperMarioGameProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Types ──
type MarioForm = "small" | "super" | "fire";

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "ground" | "brick" | "question_coin" | "question_shroom" | "question_flower" | "empty" | "pipe";
  originalY: number;
  bumpVy: number;
  bumpOffset: number;
}

interface Goomba {
  id: number;
  x: number;
  y: number;
  vx: number;
  isAlive: boolean;
  isSquished: boolean;
  squishTimer: number;
}

interface Item {
  id: number;
  type: "coin" | "shroom" | "flower";
  x: number;
  y: number;
  vx: number;
  vy: number;
  collected: boolean;
}

interface Fireball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  alpha: number;
}

export default function SuperMarioGame({
  match,
  currentUid,
  isHost,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: SuperMarioGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [marioForm, setMarioForm] = useState<MarioForm>("small");
  const [gameOver, setGameOver] = useState(false);
  const [stageClear, setStageClear] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Input states
  const keysPressed = useRef<Record<string, boolean>>({});

  // Mario physics and entity state
  const marioRef = useRef({
    x: 40,
    y: 280,
    w: 16,
    h: 20,
    vx: 0,
    vy: 0,
    facing: "right" as "left" | "right",
    isGrounded: false,
    isJumping: false,
    jumpTimer: 0,
    form: "small" as MarioForm,
    invulnerableTimer: 0,
    isDead: false,
    deathVy: 0,
    slideOnFlag: false,
  });

  // World entities
  const cameraXRef = useRef(0);
  const blocksRef = useRef<Block[]>([]);
  const goombasRef = useRef<Goomba[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const fireballsRef = useRef<Fireball[]>([]);
  const debrisRef = useRef<Debris[]>([]);
  const floatersRef = useRef<FloatingScore[]>([]);

  // Flagpole coordinates
  const flagPoleX = 2400;
  const castleX = 2520;

  // Build World 1-1 level layout
  const initLevel = useCallback(() => {
    const blocks: Block[] = [];

    // 1. Continuous Ground with classic pits
    const groundSegments = [
      { start: 0, end: 1100 },
      { start: 1180, end: 1700 },
      { start: 1780, end: 2700 },
    ];

    groundSegments.forEach((seg) => {
      for (let x = seg.start; x < seg.end; x += 24) {
        // Ground top block
        blocks.push({
          x,
          y: 336,
          w: 24,
          h: 24,
          type: "ground",
          originalY: 336,
          bumpVy: 0,
          bumpOffset: 0,
        });
        // Sub-ground filler
        blocks.push({
          x,
          y: 360,
          w: 24,
          h: 24,
          type: "ground",
          originalY: 360,
          bumpVy: 0,
          bumpOffset: 0,
        });
      }
    });

    // 2. Question Blocks & Bricks
    // Early intro question block
    blocks.push({ x: 260, y: 240, w: 24, h: 24, type: "question_coin", originalY: 240, bumpVy: 0, bumpOffset: 0 });

    // 3-Block row (Brick, Mushroom ?, Brick)
    blocks.push({ x: 380, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 404, y: 240, w: 24, h: 24, type: "question_shroom", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 428, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });

    // Higher question block
    blocks.push({ x: 404, y: 160, w: 24, h: 24, type: "question_coin", originalY: 160, bumpVy: 0, bumpOffset: 0 });

    // Warp Pipe 1 (Low)
    blocks.push({ x: 540, y: 288, w: 36, h: 48, type: "pipe", originalY: 288, bumpVy: 0, bumpOffset: 0 });

    // Warp Pipe 2 (Medium)
    blocks.push({ x: 740, y: 264, w: 36, h: 72, type: "pipe", originalY: 264, bumpVy: 0, bumpOffset: 0 });

    // Mid-level question line (Fire Flower, Coin, Brick)
    blocks.push({ x: 900, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 924, y: 240, w: 24, h: 24, type: "question_flower", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 948, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 972, y: 240, w: 24, h: 24, type: "question_coin", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    blocks.push({ x: 996, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });

    // Warp Pipe 3 (Tall)
    blocks.push({ x: 1060, y: 240, w: 36, h: 96, type: "pipe", originalY: 240, bumpVy: 0, bumpOffset: 0 });

    // Post-pit multi-level blocks
    for (let bx = 1240; bx < 1380; bx += 24) {
      blocks.push({ x: bx, y: 240, w: 24, h: 24, type: "brick", originalY: 240, bumpVy: 0, bumpOffset: 0 });
    }
    blocks.push({ x: 1312, y: 160, w: 24, h: 24, type: "question_coin", originalY: 160, bumpVy: 0, bumpOffset: 0 });

    // Staircase before flagpole
    const stepCount = 5;
    for (let s = 0; s < stepCount; s++) {
      for (let sy = 0; sy <= s; sy++) {
        blocks.push({
          x: 2100 + s * 24,
          y: 336 - (sy + 1) * 24,
          w: 24,
          h: 24,
          type: "ground",
          originalY: 336 - (sy + 1) * 24,
          bumpVy: 0,
          bumpOffset: 0,
        });
      }
    }

    blocksRef.current = blocks;

    // 3. Goombas patrolling
    goombasRef.current = [
      { id: 1, x: 340, y: 316, vx: -0.9, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 2, x: 640, y: 316, vx: -0.9, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 3, x: 840, y: 316, vx: 0.9, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 4, x: 1020, y: 316, vx: -0.9, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 5, x: 1300, y: 316, vx: -1.0, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 6, x: 1360, y: 316, vx: 1.0, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 7, x: 1540, y: 316, vx: -1.0, isAlive: true, isSquished: false, squishTimer: 0 },
      { id: 8, x: 1900, y: 316, vx: -1.1, isAlive: true, isSquished: false, squishTimer: 0 },
    ];

    itemsRef.current = [];
    fireballsRef.current = [];
    debrisRef.current = [];
    floatersRef.current = [];
  }, []);

  // Reset Mario on start or restart
  const resetGame = useCallback(
    (freshLives = true) => {
      initLevel();
      marioRef.current = {
        x: 40,
        y: 280,
        w: 16,
        h: 20,
        vx: 0,
        vy: 0,
        facing: "right",
        isGrounded: false,
        isJumping: false,
        jumpTimer: 0,
        form: "small",
        invulnerableTimer: 0,
        isDead: false,
        deathVy: 0,
        slideOnFlag: false,
      };
      cameraXRef.current = 0;
      setMarioForm("small");
      setGameOver(false);
      setStageClear(false);
      if (freshLives) {
        setScore(0);
        setCoins(0);
        setLives(3);
      }
      arcadeSfx.playButtonTap();
    },
    [initLevel]
  );

  useEffect(() => {
    resetGame(true);
  }, [resetGame]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Jump trigger
      if (
        (key === " " || key === "arrowup" || key === "w") &&
        marioRef.current.isGrounded &&
        !marioRef.current.isDead
      ) {
        marioRef.current.vy = -9.2;
        marioRef.current.isGrounded = false;
        marioRef.current.isJumping = true;
        marioRef.current.jumpTimer = 12;
        if (!isMuted) arcadeSfx.playMarioJump();
      }

      // Fireball trigger
      if ((key === "f" || key === "j" || key === "shift") && !marioRef.current.isDead) {
        handleFireball();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (key === " " || key === "arrowup" || key === "w") {
        marioRef.current.isJumping = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isMuted]);

  // Fireball Shoot Action
  const handleFireball = () => {
    if (marioRef.current.form !== "fire" || marioRef.current.isDead) return;
    if (fireballsRef.current.length >= 3) return; // Limit on-screen fireballs

    const dir = marioRef.current.facing === "right" ? 1 : -1;
    fireballsRef.current.push({
      id: Date.now() + Math.random(),
      x: marioRef.current.x + (dir === 1 ? 16 : -4),
      y: marioRef.current.y + 8,
      vx: dir * 6.5,
      vy: 2.5,
      alive: true,
    });
    if (!isMuted) arcadeSfx.playMarioFireball();
  };

  // Jump Action for button
  const handleJumpPress = () => {
    if (marioRef.current.isGrounded && !marioRef.current.isDead) {
      marioRef.current.vy = -9.2;
      marioRef.current.isGrounded = false;
      marioRef.current.isJumping = true;
      marioRef.current.jumpTimer = 12;
      if (!isMuted) arcadeSfx.playMarioJump();
    }
  };

  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const handleMarioDeath = useCallback(() => {
    if (marioRef.current.isDead) return;
    marioRef.current.isDead = true;
    marioRef.current.deathVy = -9;
    if (!isMuted) arcadeSfx.playMarioDie();

    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        setGameOver(true);
        if (match) {
          updateArcadeGameScore(match.id, currentUid || "player", "super_mario", scoreRef.current, true);
        }
      } else {
        setTimeout(() => {
          marioRef.current = {
            x: Math.max(40, cameraXRef.current + 20),
            y: 280,
            w: 16,
            h: 20,
            vx: 0,
            vy: 0,
            facing: "right",
            isGrounded: false,
            isJumping: false,
            jumpTimer: 0,
            form: "small",
            invulnerableTimer: 120,
            isDead: false,
            deathVy: 0,
            slideOnFlag: false,
          };
          setMarioForm("small");
        }, 1500);
      }
      return Math.max(0, nextLives);
    });
  }, [currentUid, isMuted, match]);

  const handleMarioDeathRef = useRef(handleMarioDeath);
  handleMarioDeathRef.current = handleMarioDeath;

  // ── 60 FPS Engine Game Loop ──
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const mario = marioRef.current;

      // ── 1. Mario Movement & Physics ──
      if (!mario.isDead && !mario.slideOnFlag) {
        const left = keysPressed.current["arrowleft"] || keysPressed.current["a"];
        const right = keysPressed.current["arrowright"] || keysPressed.current["d"];
        const sprint = keysPressed.current["shift"] || keysPressed.current["f"] || keysPressed.current["j"];

        const maxSpeed = sprint ? 4.8 : 3.2;
        const accel = 0.45;
        const friction = 0.82;

        if (left && !right) {
          mario.vx = Math.max(-maxSpeed, mario.vx - accel);
          mario.facing = "left";
        } else if (right && !left) {
          mario.vx = Math.min(maxSpeed, mario.vx + accel);
          mario.facing = "right";
        } else {
          mario.vx *= friction;
          if (Math.abs(mario.vx) < 0.1) mario.vx = 0;
        }

        // Variable Jump (hold jump for higher jump arc)
        if (mario.isJumping && mario.jumpTimer > 0) {
          mario.vy -= 0.35;
          mario.jumpTimer -= 1;
        }

        // Gravity
        mario.vy += 0.52;
        if (mario.vy > 9) mario.vy = 9;

        // Apply Horizontal Movement
        mario.x += mario.vx;

        // Camera Lock left boundary (can't walk backwards off-screen)
        if (mario.x < cameraXRef.current + 8) {
          mario.x = cameraXRef.current + 8;
          mario.vx = 0;
        }

        // Horizontal Block Collisions
        blocksRef.current.forEach((b) => {
          if (
            mario.x < b.x + b.w &&
            mario.x + mario.w > b.x &&
            mario.y < b.y + b.h &&
            mario.y + mario.h > b.y
          ) {
            if (mario.vx > 0) {
              mario.x = b.x - mario.w;
              mario.vx = 0;
            } else if (mario.vx < 0) {
              mario.x = b.x + b.w;
              mario.vx = 0;
            }
          }
        });

        // Apply Vertical Movement
        mario.y += mario.vy;
        mario.isGrounded = false;

        // Vertical Block Collisions & Headbutting Blocks
        blocksRef.current.forEach((b) => {
          const blockActualY = b.originalY + b.bumpOffset;
          if (
            mario.x + 3 < b.x + b.w &&
            mario.x + mario.w - 3 > b.x &&
            mario.y < blockActualY + b.h &&
            mario.y + mario.h > blockActualY
          ) {
            // Landing on top of block
            if (mario.vy > 0 && mario.y + mario.h - mario.vy <= blockActualY + 8) {
              mario.y = blockActualY - mario.h;
              mario.vy = 0;
              mario.isGrounded = true;
            }
            // Hitting block from underneath
            else if (mario.vy < 0 && mario.y - mario.vy >= blockActualY + b.h - 10) {
              mario.y = blockActualY + b.h;
              mario.vy = 1;
              mario.isJumping = false;

              // Question block triggered
              if (b.type.startsWith("question")) {
                b.bumpVy = -4.5;
                if (!isMuted) arcadeSfx.playMarioBump();

                if (b.type === "question_coin") {
                  b.type = "empty";
                  setCoins((c) => c + 1);
                  setScore((s) => s + 200);
                  floatersRef.current.push({ x: b.x + 4, y: b.y - 12, text: "+200", alpha: 1 });
                  if (!isMuted) arcadeSfx.playMarioCoin();
                } else if (b.type === "question_shroom") {
                  b.type = "empty";
                  itemsRef.current.push({
                    id: Date.now(),
                    type: "shroom",
                    x: b.x + 4,
                    y: b.y - 20,
                    vx: 1.2,
                    vy: -2,
                    collected: false,
                  });
                  if (!isMuted) arcadeSfx.playMarioPowerup();
                } else if (b.type === "question_flower") {
                  b.type = "empty";
                  itemsRef.current.push({
                    id: Date.now(),
                    type: "flower",
                    x: b.x + 4,
                    y: b.y - 20,
                    vx: 0,
                    vy: -1.5,
                    collected: false,
                  });
                  if (!isMuted) arcadeSfx.playMarioPowerup();
                }
              }
              // Brick Block Hit
              else if (b.type === "brick") {
                if (mario.form !== "small") {
                  // Shatter brick into 4 fragments!
                  if (!isMuted) arcadeSfx.playMarioStomp();
                  setScore((s) => s + 50);
                  blocksRef.current = blocksRef.current.filter((bk) => bk !== b);
                  debrisRef.current.push(
                    { x: b.x, y: b.y, vx: -2.5, vy: -6, color: "#c84c0c" },
                    { x: b.x + 12, y: b.y, vx: 2.5, vy: -6, color: "#c84c0c" },
                    { x: b.x, y: b.y + 12, vx: -2.0, vy: -4, color: "#c84c0c" },
                    { x: b.x + 12, y: b.y + 12, vx: 2.0, vy: -4, color: "#c84c0c" }
                  );
                } else {
                  b.bumpVy = -3.5;
                  if (!isMuted) arcadeSfx.playMarioBump();
                }
              }
            }
          }
        });

        // Fell into pit
        if (mario.y > 390) {
          handleMarioDeathRef.current();
        }

        // Reached Flagpole
        if (mario.x >= flagPoleX && !stageClear) {
          mario.slideOnFlag = true;
          mario.vx = 0;
          mario.vy = 2.5;
          setStageClear(true);
          setScore((s) => s + 5000);
          floatersRef.current.push({ x: flagPoleX, y: 160, text: "STAGE CLEAR! +5000", alpha: 1 });
          if (!isMuted) arcadeSfx.playMarioStageClear();
          if (match) {
            updateArcadeGameScore(match.id, currentUid || "player", "super_mario", scoreRef.current + 5000, true);
          }
        }

        // Invulnerability timer countdown
        if (mario.invulnerableTimer > 0) {
          mario.invulnerableTimer -= 1;
        }
      }

      // Flagpole slide down
      if (mario.slideOnFlag) {
        mario.y = Math.min(316, mario.y + 2.5);
        if (mario.y >= 316) {
          mario.x = Math.min(castleX, mario.x + 1.8);
        }
      }

      // Death animation
      if (mario.isDead) {
        mario.deathVy += 0.45;
        mario.y += mario.deathVy;
      }

      // Smooth Camera tracking
      const targetCamX = mario.x - 140;
      if (targetCamX > cameraXRef.current) {
        cameraXRef.current = targetCamX;
      }

      // ── 2. Block Bumping Animation ──
      blocksRef.current.forEach((b) => {
        if (b.bumpVy !== 0 || b.bumpOffset !== 0) {
          b.bumpOffset += b.bumpVy;
          b.bumpVy += 0.8;
          if (b.bumpOffset >= 0) {
            b.bumpOffset = 0;
            b.bumpVy = 0;
          }
        }
      });

      // ── 3. Debris Physics ──
      debrisRef.current.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.5;
      });
      debrisRef.current = debrisRef.current.filter((d) => d.y < 420);

      // ── 4. Item Physics & Collection ──
      itemsRef.current.forEach((item) => {
        if (item.collected) return;
        if (item.type === "shroom") {
          item.x += item.vx;
          item.vy = Math.min(6, item.vy + 0.4);
          item.y += item.vy;

          // Ground & block collision for mushroom
          blocksRef.current.forEach((b) => {
            if (
              item.x < b.x + b.w &&
              item.x + 16 > b.x &&
              item.y < b.y + b.h &&
              item.y + 16 > b.y
            ) {
              if (item.vy > 0) {
                item.y = b.y - 16;
                item.vy = 0;
              } else {
                item.vx = -item.vx;
              }
            }
          });
        }

        // Touch Mario
        if (
          !mario.isDead &&
          mario.x < item.x + 16 &&
          mario.x + mario.w > item.x &&
          mario.y < item.y + 16 &&
          mario.y + mario.h > item.y
        ) {
          item.collected = true;
          setScore((s) => s + 1000);
          floatersRef.current.push({ x: item.x, y: item.y - 10, text: "+1000", alpha: 1 });
          if (!isMuted) arcadeSfx.playMarioPowerup();

          if (item.type === "shroom" && mario.form === "small") {
            mario.form = "super";
            mario.h = 28;
            mario.y -= 8;
            setMarioForm("super");
          } else if (item.type === "flower") {
            mario.form = "fire";
            mario.h = 28;
            setMarioForm("fire");
          }
        }
      });

      // ── 5. Fireballs Physics ──
      fireballsRef.current.forEach((fb) => {
        if (!fb.alive) return;
        fb.x += fb.vx;
        fb.vy += 0.45;
        fb.y += fb.vy;

        // Bounce on blocks
        blocksRef.current.forEach((b) => {
          if (
            fb.x < b.x + b.w &&
            fb.x + 8 > b.x &&
            fb.y < b.y + b.h &&
            fb.y + 8 > b.y
          ) {
            if (fb.vy > 0) {
              fb.y = b.y - 8;
              fb.vy = -4.2; // Bounce up!
            } else {
              fb.alive = false;
            }
          }
        });

        // Hit Goombas
        goombasRef.current.forEach((g) => {
          if (
            g.isAlive &&
            fb.x < g.x + 20 &&
            fb.x + 8 > g.x &&
            fb.y < g.y + 20 &&
            fb.y + 8 > g.y
          ) {
            fb.alive = false;
            g.isAlive = false;
            setScore((s) => s + 200);
            floatersRef.current.push({ x: g.x, y: g.y - 8, text: "+200", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioStomp();
          }
        });

        if (fb.y > 380 || fb.x > cameraXRef.current + 420) fb.alive = false;
      });
      fireballsRef.current = fireballsRef.current.filter((fb) => fb.alive);

      // ── 6. Goombas AI & Stomp Collisions ──
      goombasRef.current.forEach((g) => {
        if (g.isSquished) {
          g.squishTimer -= 1;
          if (g.squishTimer <= 0) g.isAlive = false;
          return;
        }
        if (!g.isAlive) return;

        // Move Goomba
        g.x += g.vx;

        // Pipe/Edge turnaround
        blocksRef.current.forEach((b) => {
          if (b.type === "pipe" || b.type === "brick" || b.type === "ground") {
            if (
              g.x < b.x + b.w &&
              g.x + 20 > b.x &&
              g.y < b.y + b.h &&
              g.y + 20 > b.y
            ) {
              g.vx = -g.vx;
            }
          }
        });

        // Interaction with Mario
        if (
          !mario.isDead &&
          !mario.slideOnFlag &&
          mario.x < g.x + 18 &&
          mario.x + mario.w > g.x + 2 &&
          mario.y < g.y + 18 &&
          mario.y + mario.h > g.y + 2
        ) {
          // Mario stomps Goomba from above
          if (mario.vy > 0 && mario.y + mario.h - mario.vy <= g.y + 8) {
            g.isSquished = true;
            g.squishTimer = 30;
            mario.vy = -7.5; // Bounce off enemy
            setScore((s) => s + 100);
            floatersRef.current.push({ x: g.x, y: g.y - 10, text: "+100", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioStomp();
          }
          // Mario touched from side
          else if (mario.invulnerableTimer <= 0) {
            if (mario.form !== "small") {
              mario.form = "small";
              mario.h = 20;
              mario.invulnerableTimer = 90;
              setMarioForm("small");
              if (!isMuted) arcadeSfx.playMarioBump();
            } else {
              handleMarioDeathRef.current();
            }
          }
        }
      });

      // ── 7. Floaters Update ──
      floatersRef.current.forEach((f) => {
        f.y -= 0.6;
        f.alpha -= 0.02;
      });
      floatersRef.current = floatersRef.current.filter((f) => f.alpha > 0);

      // ── 8. RENDER CANVAS SCENE (NES Super Mario Bros Aesthetic) ──
      const camX = Math.round(cameraXRef.current);
      ctx.save();

      // Clear sky
      ctx.fillStyle = "#5c94fc";
      ctx.fillRect(0, 0, 400, 360);

      ctx.save();
      ctx.translate(-camX, 0);

      // Background Hills & Bushes
      for (let hx = 0; hx < 2800; hx += 420) {
        // Rolling green hill
        ctx.fillStyle = "#00a800";
        ctx.beginPath();
        ctx.arc(hx + 120, 336, 64, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#80d010";
        ctx.beginPath();
        ctx.arc(hx + 120, 336, 44, Math.PI, 0);
        ctx.fill();

        // Bush
        ctx.fillStyle = "#00a800";
        ctx.beginPath();
        ctx.arc(hx + 280, 336, 16, Math.PI, 0);
        ctx.arc(hx + 300, 336, 22, Math.PI, 0);
        ctx.arc(hx + 320, 336, 16, Math.PI, 0);
        ctx.fill();

        // Clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(hx + 180, 70, 18, 0, Math.PI * 2);
        ctx.arc(hx + 200, 64, 22, 0, Math.PI * 2);
        ctx.arc(hx + 224, 70, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Flagpole & Castle
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(flagPoleX, 100, 4, 236);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(flagPoleX + 2, 98, 6, 0, Math.PI * 2);
      ctx.fill();
      // Flag
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(flagPoleX - 24, 110);
      ctx.lineTo(flagPoleX, 98);
      ctx.lineTo(flagPoleX, 122);
      ctx.closePath();
      ctx.fill();

      // Castle
      ctx.fillStyle = "#c84c0c";
      ctx.fillRect(castleX, 240, 80, 96);
      ctx.fillStyle = "#000000";
      ctx.fillRect(castleX + 26, 280, 28, 56);

      // Draw Blocks
      blocksRef.current.forEach((b) => {
        const by = b.originalY + b.bumpOffset;
        if (b.type === "ground") {
          ctx.fillStyle = "#c84c0c";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = "#fc9838";
          ctx.fillRect(b.x, by, b.w, 2);
          ctx.fillStyle = "#000000";
          ctx.fillRect(b.x + 3, by + 3, 2, 2);
          ctx.fillRect(b.x + b.w - 5, by + 3, 2, 2);
          ctx.fillRect(b.x + 3, by + b.h - 5, 2, 2);
          ctx.fillRect(b.x + b.w - 5, by + b.h - 5, 2, 2);
        } else if (b.type === "brick") {
          ctx.fillStyle = "#c84c0c";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, by, b.w, b.h);
          ctx.fillStyle = "#fc9838";
          ctx.fillRect(b.x + 2, by + 2, b.w - 4, 2);
        } else if (b.type.startsWith("question")) {
          // Golden glowing question block
          ctx.fillStyle = "#fc9838";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, by, b.w, b.h);

          // Rivets
          ctx.fillStyle = "#78350f";
          ctx.fillRect(b.x + 2, by + 2, 2, 2);
          ctx.fillRect(b.x + b.w - 4, by + 2, 2, 2);
          ctx.fillRect(b.x + 2, by + b.h - 4, 2, 2);
          ctx.fillRect(b.x + b.w - 4, by + b.h - 4, 2, 2);

          // Animated white "?"
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", b.x + b.w / 2, by + b.h / 2);
        } else if (b.type === "empty") {
          ctx.fillStyle = "#78350f";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, by, b.w, b.h);
        } else if (b.type === "pipe") {
          // Green Warp Pipe
          ctx.fillStyle = "#00a800";
          ctx.fillRect(b.x, by, b.w, b.h);
          // Pipe Lip
          ctx.fillStyle = "#80d010";
          ctx.fillRect(b.x - 3, by, b.w + 6, 16);
          ctx.strokeStyle = "#005000";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(b.x - 3, by, b.w + 6, 16);
          ctx.strokeRect(b.x, by + 16, b.w, b.h - 16);
        }
      });

      // Draw Items
      itemsRef.current.forEach((item) => {
        if (item.collected) return;
        if (item.type === "shroom") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 6, 8, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = "#fed7aa";
          ctx.fillRect(item.x + 4, item.y + 6, 8, 8);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(item.x + 6, item.y + 2, 4, 4);
        } else if (item.type === "flower") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Fireballs
      fireballsRef.current.forEach((fb) => {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(fb.x + 4, fb.y + 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(fb.x + 4, fb.y + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Debris fragments
      debrisRef.current.forEach((d) => {
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, 6, 6);
      });

      // Draw Goombas
      goombasRef.current.forEach((g) => {
        if (!g.isAlive) return;
        if (g.isSquished) {
          ctx.fillStyle = "#9a3412";
          ctx.fillRect(g.x, g.y + 12, 20, 6);
          return;
        }
        // Goomba Cap
        ctx.fillStyle = "#9a3412";
        ctx.beginPath();
        ctx.arc(g.x + 10, g.y + 8, 10, Math.PI, 0);
        ctx.fill();
        // Stem
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(g.x + 5, g.y + 8, 10, 8);
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.fillRect(g.x + 6, g.y + 9, 2, 4);
        ctx.fillRect(g.x + 12, g.y + 9, 2, 4);
      });

      // Draw Mario
      if (mario.invulnerableTimer % 4 < 2) {
        ctx.save();
        ctx.translate(mario.x, mario.y);

        const isMoving = Math.abs(mario.vx) > 0.2;
        const walkCycle = isMoving ? Math.sin(performance.now() * 0.02) * 3 : 0;
        const isFire = mario.form === "fire";

        // Hat & Shirt (Red for regular, White for Fire Mario)
        ctx.fillStyle = isFire ? "#ffffff" : "#dc2626";
        ctx.fillRect(mario.facing === "right" ? 4 : 0, 0, 12, 5); // Hat
        ctx.fillRect(2, 6, 12, mario.form === "small" ? 8 : 12); // Shirt

        // Face
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(mario.facing === "right" ? 5 : 2, 3, 9, 5);

        // Mustache & Eye
        ctx.fillStyle = "#000000";
        ctx.fillRect(mario.facing === "right" ? 10 : 3, 4, 2, 2);
        ctx.fillRect(mario.facing === "right" ? 7 : 2, 6, 6, 2);

        // Overalls (Blue for regular, Red for Fire Mario)
        ctx.fillStyle = isFire ? "#dc2626" : "#0284c7";
        if (mario.form === "small") {
          ctx.fillRect(2, 10, 12, 6);
          // Shoes
          ctx.fillStyle = "#78350f";
          ctx.fillRect(1, 16 + walkCycle, 6, 4);
          ctx.fillRect(9, 16 - walkCycle, 6, 4);
        } else {
          ctx.fillRect(2, 14, 12, 10);
          // Shoes
          ctx.fillStyle = "#78350f";
          ctx.fillRect(1, 24 + walkCycle, 6, 4);
          ctx.fillRect(9, 24 - walkCycle, 6, 4);
        }

        ctx.restore();
      }

      // Draw Floating Scores
      floatersRef.current.forEach((f) => {
        ctx.save();
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });

      ctx.restore(); // End camera transform

      // ── 9. Retro HUD Overlay (Exact NES Aesthetic) ──
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "left";

      // SCORE
      ctx.fillText("SCORE", 20, 20);
      ctx.fillText(String(score).padStart(6, "0"), 20, 32);

      // COINS
      ctx.fillText("COINS", 120, 20);
      ctx.fillText(`x${String(coins).padStart(2, "0")}`, 120, 32);

      // WORLD
      ctx.fillText("WORLD", 220, 20);
      ctx.fillText("1-1", 220, 32);

      // MARIO STATUS
      ctx.fillStyle = mario.form === "fire" ? "#f97316" : mario.form === "super" ? "#38bdf8" : "#ffffff";
      ctx.fillText("MARIO", 310, 20);
      ctx.fillText(mario.form.toUpperCase(), 310, 32);

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [score, coins, isMuted, match, currentUid, stageClear]);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* ── Main Canvas Viewport with Retro TV Border ── */}
      <div className="relative w-full max-w-[400px] bg-black rounded-3xl overflow-hidden border-4 border-neutral-800 shadow-2xl">
        {/* Top Control Overlay */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
              title="Exit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 60 FPS HTML5 Mario Game Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={360}
          className="w-full h-[360px] block"
        />

        {/* Game Over / Victory Overlay */}
        {(gameOver || stageClear) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in z-30">
            <div className="text-center space-y-1">
              <span className="text-4xl">{stageClear ? "🏆" : "💀"}</span>
              <h2 className="text-xl font-mono font-black text-white tracking-wider">
                {stageClear ? "WORLD 1-1 CLEARED!" : "GAME OVER"}
              </h2>
              <p className="text-xs font-mono text-neutral-400">
                Final Score: <strong className="text-amber-300">{score}</strong> • Coins:{" "}
                <strong className="text-yellow-400">{coins}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => resetGame(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-bold text-xs flex items-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-2xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-mono text-xs cursor-pointer"
                >
                  EXIT
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── MOBILE TOUCH CONTROLS (Exact Replica of Uploaded Image) ── */}
        <div className="bg-[#18181b] border-t-2 border-neutral-800 px-6 py-4 flex items-center justify-between z-20">
          {/* Left / Right Circular D-Pad */}
          <div className="flex items-center gap-3">
            {/* Left Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                keysPressed.current["arrowleft"] = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["arrowleft"] = false;
              }}
              onPointerLeave={(e) => {
                keysPressed.current["arrowleft"] = false;
              }}
              className="w-14 h-14 rounded-full bg-neutral-900 border-2 border-neutral-700 active:bg-neutral-800 active:scale-95 flex items-center justify-center text-white shadow-xl transition-transform cursor-pointer"
              title="Move Left"
            >
              <span className="text-xl font-black font-mono">←</span>
            </button>

            {/* Right Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                keysPressed.current["arrowright"] = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["arrowright"] = false;
              }}
              onPointerLeave={(e) => {
                keysPressed.current["arrowright"] = false;
              }}
              className="w-14 h-14 rounded-full bg-neutral-900 border-2 border-neutral-700 active:bg-neutral-800 active:scale-95 flex items-center justify-center text-white shadow-xl transition-transform cursor-pointer"
              title="Move Right"
            >
              <span className="text-xl font-black font-mono">→</span>
            </button>
          </div>

          {/* Action Buttons: FIRE & JUMP */}
          <div className="flex items-center gap-3">
            {/* Fire / Sprint Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleFireball();
                keysPressed.current["shift"] = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["shift"] = false;
              }}
              onPointerLeave={(e) => {
                keysPressed.current["shift"] = false;
              }}
              className="w-14 h-14 rounded-full bg-[#854d0e] border-2 border-[#a16207] active:scale-95 flex items-center justify-center text-[#fef08a] font-mono font-black text-xs uppercase shadow-xl transition-transform cursor-pointer tracking-wider"
              title="Shoot Fireball / Sprint"
            >
              FIRE
            </button>

            {/* Big Red JUMP Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleJumpPress();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                marioRef.current.isJumping = false;
              }}
              className="w-18 h-18 rounded-full bg-[#dc2626] border-4 border-[#ef4444] active:scale-95 flex items-center justify-center text-white font-mono font-black text-xs uppercase shadow-2xl shadow-red-500/30 transition-transform cursor-pointer tracking-wider"
              title="Jump"
            >
              JUMP
            </button>
          </div>
        </div>

        {/* Quick Keyboard Instructions Bar */}
        <div className="bg-black/90 px-4 py-1.5 text-[9px] font-mono text-neutral-500 text-center border-t border-neutral-900 flex items-center justify-center gap-2">
          <span>🎮 Keyboard: [A/D] or [Arrows] Walk</span>
          <span>•</span>
          <span>[SPACE/W] Jump</span>
          <span>•</span>
          <span>[F/J] Fireball</span>
        </div>
      </div>
    </div>
  );
}
