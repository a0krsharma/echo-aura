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
  Users,
  User,
  Heart,
  Shield,
  Gamepad2,
} from "lucide-react";

export interface SuperMarioGameProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Entity Types ──
type CharacterId = "mario" | "luigi";
type MarioForm = "small" | "super" | "fire";

interface PlayerState {
  id: CharacterId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: "left" | "right";
  isGrounded: boolean;
  isJumping: boolean;
  jumpTimer: number;
  form: MarioForm;
  invulnerableTimer: number;
  isDead: boolean;
  deathVy: number;
  slideOnFlag: boolean;
  walkFrame: number;
  bubbleTimer: number;
  score: number;
  coins: number;
  lives: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  type:
    | "ground"
    | "brick"
    | "question_coin"
    | "question_shroom"
    | "question_flower"
    | "empty"
    | "pipe";
  originalY: number;
  bumpVy: number;
  bumpOffset: number;
}

interface SafetyCloud {
  x: number;
  y: number;
  w: number;
  h: number;
  bounceOffset: number;
  bounceVy: number;
}

interface AirCoin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  angle: number;
}

interface Goomba {
  id: number;
  x: number;
  y: number;
  vx: number;
  isAlive: boolean;
  isSquished: boolean;
  squishTimer: number;
  stepCycle: number;
}

interface Item {
  id: number;
  type: "shroom" | "flower";
  x: number;
  y: number;
  vx: number;
  vy: number;
  collected: boolean;
}

interface Fireball {
  id: number;
  owner: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  alive: boolean;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  color?: string;
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

  // ── Mode & Settings ──
  const [playerMode, setPlayerMode] = useState<"1P" | "2P">("1P");
  const [activeMobilePlayer, setActiveMobilePlayer] = useState<CharacterId>("mario");
  const [isMuted, setIsMuted] = useState(false);
  const [speedLevel, setSpeedLevel] = useState<"chill" | "normal">("chill");

  // Game UI States
  const [p1Score, setP1Score] = useState(0);
  const [p1Coins, setP1Coins] = useState(0);
  const [p1Lives, setP1Lives] = useState(3);
  const [p1Form, setP1Form] = useState<MarioForm>("small");

  const [p2Score, setP2Score] = useState(0);
  const [p2Coins, setP2Coins] = useState(0);
  const [p2Lives, setP2Lives] = useState(3);
  const [p2Form, setP2Form] = useState<MarioForm>("small");

  const [gameOver, setGameOver] = useState(false);
  const [stageClear, setStageClear] = useState(false);
  const [stageClearWinner, setStageClearWinner] = useState<string | null>(null);

  // Input Keys Map
  const keysPressed = useRef<Record<string, boolean>>({});

  // ── Player Entities Ref ──
  const p1Ref = useRef<PlayerState>({
    id: "mario",
    name: "Mario",
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
    walkFrame: 0,
    bubbleTimer: 0,
    score: 0,
    coins: 0,
    lives: 3,
  });

  const p2Ref = useRef<PlayerState>({
    id: "luigi",
    name: "Luigi",
    x: 16,
    y: 280,
    w: 16,
    h: 22,
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
    walkFrame: 0,
    bubbleTimer: 0,
    score: 0,
    coins: 0,
    lives: 3,
  });

  // Camera and Level Entities Ref
  const cameraXRef = useRef(0);
  const blocksRef = useRef<Block[]>([]);
  const safetyCloudsRef = useRef<SafetyCloud[]>([]);
  const airCoinsRef = useRef<AirCoin[]>([]);
  const goombasRef = useRef<Goomba[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const fireballsRef = useRef<Fireball[]>([]);
  const debrisRef = useRef<Debris[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<FloatingScore[]>([]);

  // Flagpole coordinates
  const flagPoleX = 2400;
  const castleX = 2520;

  // Track scores in refs for sync
  const scoreRef = useRef({ p1: 0, p2: 0 });
  useEffect(() => {
    scoreRef.current.p1 = p1Score;
    scoreRef.current.p2 = p2Score;
  }, [p1Score, p2Score]);

  // ── Build World 1-1 Layout with Pit Safety Clouds & Floating Coins ──
  const initLevel = useCallback(() => {
    const blocks: Block[] = [];

    // 1. Ground Segments (with 2 pit zones)
    const groundSegments = [
      { start: 0, end: 1100 },
      { start: 1180, end: 1700 },
      { start: 1780, end: 2700 },
    ];

    groundSegments.forEach((seg) => {
      for (let x = seg.start; x < seg.end; x += 24) {
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

    // 2. Bouncy Safety Clouds across pits (makes it forgiving & easy!)
    safetyCloudsRef.current = [
      { x: 1100, y: 352, w: 80, h: 20, bounceOffset: 0, bounceVy: 0 },
      { x: 1700, y: 352, w: 80, h: 20, bounceOffset: 0, bounceVy: 0 },
    ];

    // 3. Question Blocks & Brick Blocks (generous rewards!)
    const blockDefs: {
      x: number;
      y: number;
      type: "brick" | "question_coin" | "question_shroom" | "question_flower";
    }[] = [
      // Early warm-up block
      { x: 180, y: 240, type: "question_coin" },
      { x: 230, y: 240, type: "brick" },
      { x: 254, y: 240, type: "question_shroom" },
      { x: 278, y: 240, type: "brick" },
      { x: 302, y: 240, type: "question_coin" },

      // High block over first pipe
      { x: 420, y: 190, type: "question_flower" },

      // Mid-stage brick row
      { x: 740, y: 240, type: "brick" },
      { x: 764, y: 240, type: "question_shroom" },
      { x: 788, y: 240, type: "brick" },
      { x: 812, y: 240, type: "question_coin" },
      { x: 836, y: 240, type: "brick" },

      // High overhead cache
      { x: 920, y: 170, type: "question_flower" },
      { x: 944, y: 170, type: "brick" },
      { x: 968, y: 170, type: "question_coin" },

      // Post-pit clusters
      { x: 1320, y: 240, type: "question_shroom" },
      { x: 1344, y: 240, type: "brick" },
      { x: 1368, y: 240, type: "question_coin" },
      { x: 1460, y: 190, type: "brick" },
      { x: 1484, y: 190, type: "question_flower" },
      { x: 1508, y: 190, type: "brick" },

      // Pre-castle staircase blocks
      { x: 2020, y: 240, type: "brick" },
      { x: 2044, y: 240, type: "question_shroom" },
      { x: 2068, y: 240, type: "brick" },
    ];

    blockDefs.forEach((b) => {
      blocks.push({
        x: b.x,
        y: b.y,
        w: 24,
        h: 24,
        type: b.type,
        originalY: b.y,
        bumpVy: 0,
        bumpOffset: 0,
      });
    });

    // 4. Warp Pipes
    const pipes = [
      { x: 380, h: 48 },
      { x: 560, h: 72 },
      { x: 700, h: 96 },
      { x: 900, h: 96 },
      { x: 1240, h: 48 },
      { x: 1600, h: 72 },
    ];

    pipes.forEach((p) => {
      blocks.push({
        x: p.x,
        y: 336 - p.h,
        w: 38,
        h: p.h,
        type: "pipe",
        originalY: 336 - p.h,
        bumpVy: 0,
        bumpOffset: 0,
      });
    });

    // 5. Pyramid Steps leading to Flagpole
    const stairs = [
      { startX: 2160, steps: 4, dir: 1 },
      { startX: 2280, steps: 5, dir: 1 },
    ];

    stairs.forEach((st) => {
      for (let s = 0; s < st.steps; s++) {
        for (let sy = 0; sy <= s; sy++) {
          blocks.push({
            x: st.startX + s * 24,
            y: 336 - (sy + 1) * 24,
            w: 24,
            h: 24,
            type: "brick",
            originalY: 336 - (sy + 1) * 24,
            bumpVy: 0,
            bumpOffset: 0,
          });
        }
      }
    });

    blocksRef.current = blocks;

    // 6. Floating Airborne Coins in arches
    const airCoins: AirCoin[] = [];
    let coinId = 1;
    // Arch over first pipe
    for (let i = 0; i < 5; i++) {
      airCoins.push({
        id: coinId++,
        x: 350 + i * 24,
        y: 240 - Math.sin((i / 4) * Math.PI) * 36,
        collected: false,
        angle: (i * 45) % 360,
      });
    }
    // Arch over second pipe
    for (let i = 0; i < 5; i++) {
      airCoins.push({
        id: coinId++,
        x: 530 + i * 24,
        y: 220 - Math.sin((i / 4) * Math.PI) * 36,
        collected: false,
        angle: (i * 45) % 360,
      });
    }
    // Above safety cloud 1
    for (let i = 0; i < 3; i++) {
      airCoins.push({
        id: coinId++,
        x: 1120 + i * 22,
        y: 270,
        collected: false,
        angle: (i * 60) % 360,
      });
    }
    // Arch over pre-castle pyramid
    for (let i = 0; i < 6; i++) {
      airCoins.push({
        id: coinId++,
        x: 2160 + i * 22,
        y: 190 - Math.sin((i / 5) * Math.PI) * 28,
        collected: false,
        angle: (i * 40) % 360,
      });
    }
    airCoinsRef.current = airCoins;

    // 7. Slow & Friendly Goombas (gentle speed 0.38 - 0.45 px/frame)
    goombasRef.current = [
      { id: 1, x: 340, y: 316, vx: -0.38, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 2, x: 640, y: 316, vx: -0.4, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 3, x: 840, y: 316, vx: 0.4, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 4, x: 1040, y: 316, vx: -0.42, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 5, x: 1300, y: 316, vx: -0.4, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 6, x: 1400, y: 316, vx: 0.4, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 7, x: 1540, y: 316, vx: -0.42, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
      { id: 8, x: 1940, y: 316, vx: -0.45, isAlive: true, isSquished: false, squishTimer: 0, stepCycle: 0 },
    ];

    itemsRef.current = [];
    fireballsRef.current = [];
    debrisRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
  }, []);

  // Reset Game
  const resetGame = useCallback(
    (freshAll = true) => {
      initLevel();
      p1Ref.current = {
        id: "mario",
        name: "Mario",
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
        walkFrame: 0,
        bubbleTimer: 0,
        score: freshAll ? 0 : p1Ref.current.score,
        coins: freshAll ? 0 : p1Ref.current.coins,
        lives: freshAll ? 3 : p1Ref.current.lives,
      };

      p2Ref.current = {
        id: "luigi",
        name: "Luigi",
        x: 16,
        y: 280,
        w: 16,
        h: 22,
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
        walkFrame: 0,
        bubbleTimer: 0,
        score: freshAll ? 0 : p2Ref.current.score,
        coins: freshAll ? 0 : p2Ref.current.coins,
        lives: freshAll ? 3 : p2Ref.current.lives,
      };

      cameraXRef.current = 0;
      setP1Form("small");
      setP2Form("small");
      setGameOver(false);
      setStageClear(false);
      setStageClearWinner(null);

      if (freshAll) {
        setP1Score(0);
        setP1Coins(0);
        setP1Lives(3);
        setP2Score(0);
        setP2Coins(0);
        setP2Lives(3);
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
      const code = e.code;
      const key = e.key.toLowerCase();
      keysPressed.current[code] = true;
      keysPressed.current[key] = true;

      // P1 Jump (Space / W / ArrowUp if in 1P mode)
      if (
        (code === "Space" || code === "KeyW" || (playerMode === "1P" && code === "ArrowUp")) &&
        p1Ref.current.isGrounded &&
        !p1Ref.current.isDead
      ) {
        p1Ref.current.vy = speedLevel === "chill" ? -7.8 : -8.5;
        p1Ref.current.isGrounded = false;
        p1Ref.current.isJumping = true;
        p1Ref.current.jumpTimer = 14;
        if (!isMuted) arcadeSfx.playMarioJump();
      }

      // P1 Fireball (KeyF / KeyJ / Shift)
      if ((code === "KeyF" || code === "KeyJ" || (playerMode === "1P" && code === "ShiftRight")) && !p1Ref.current.isDead) {
        handleFireball("mario");
      }

      // P2 Jump (ArrowUp / Numpad0 in 2P mode)
      if (playerMode === "2P") {
        if (
          (code === "ArrowUp" || code === "Numpad0") &&
          p2Ref.current.isGrounded &&
          !p2Ref.current.isDead
        ) {
          p2Ref.current.vy = speedLevel === "chill" ? -8.2 : -8.8; // Luigi jumps slightly higher & floatier!
          p2Ref.current.isGrounded = false;
          p2Ref.current.isJumping = true;
          p2Ref.current.jumpTimer = 16;
          if (!isMuted) arcadeSfx.playMarioJump();
        }

        // P2 Fireball (Enter / ControlRight / NumpadDecimal)
        if ((code === "Enter" || code === "ControlRight" || code === "NumpadEnter") && !p2Ref.current.isDead) {
          handleFireball("luigi");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      keysPressed.current[code] = false;
      keysPressed.current[key] = false;

      if (code === "Space" || code === "KeyW" || (playerMode === "1P" && code === "ArrowUp")) {
        p1Ref.current.isJumping = false;
      }
      if (code === "ArrowUp" || code === "Numpad0") {
        p2Ref.current.isJumping = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isMuted, playerMode, speedLevel]);

  // Fireball Shoot Action
  const handleFireball = (charId: CharacterId) => {
    const player = charId === "mario" ? p1Ref.current : p2Ref.current;
    if (player.form !== "fire" || player.isDead) return;
    const existing = fireballsRef.current.filter((fb) => fb.owner === charId);
    if (existing.length >= 3) return;

    const dir = player.facing === "right" ? 1 : -1;
    fireballsRef.current.push({
      id: Date.now() + Math.random(),
      owner: charId,
      x: player.x + (dir === 1 ? 16 : -6),
      y: player.y + 8,
      vx: dir * (speedLevel === "chill" ? 5.2 : 6.5),
      vy: 1.8,
      rot: 0,
      alive: true,
    });
    if (!isMuted) arcadeSfx.playMarioFireball();
  };

  // Jump Action for Mobile Button
  const handleJumpPress = (charId: CharacterId) => {
    const player = charId === "mario" ? p1Ref.current : p2Ref.current;
    if (player.isGrounded && !player.isDead) {
      player.vy = charId === "mario" ? (speedLevel === "chill" ? -7.8 : -8.5) : (speedLevel === "chill" ? -8.2 : -8.8);
      player.isGrounded = false;
      player.isJumping = true;
      player.jumpTimer = 14;
      if (!isMuted) arcadeSfx.playMarioJump();
    }
  };

  // Death Handling
  const handlePlayerDeath = useCallback(
    (charId: CharacterId) => {
      const player = charId === "mario" ? p1Ref.current : p2Ref.current;
      const other = charId === "mario" ? p2Ref.current : p1Ref.current;
      if (player.isDead) return;

      player.isDead = true;
      player.deathVy = -8.5;
      if (!isMuted) arcadeSfx.playMarioDie();

      // Check lives
      if (charId === "mario") {
        setP1Lives((prev) => {
          const next = prev - 1;
          player.lives = next;

          if (playerMode === "1P") {
            if (next <= 0) {
              setGameOver(true);
              if (match) {
                updateArcadeGameScore(match.id, currentUid || "player", "super_mario", scoreRef.current.p1, true);
              }
            } else {
              setTimeout(() => {
                respawnPlayer(player);
                setP1Form("small");
              }, 1500);
            }
          } else {
            // 2P Co-Op mode: as long as brother is alive, respawn in rescue bubble!
            if (!other.isDead || other.lives > 0) {
              player.bubbleTimer = 120;
              setTimeout(() => {
                respawnBeside(player, other);
                setP1Form("small");
              }, 1800);
            } else if (next <= 0 && other.lives <= 0) {
              setGameOver(true);
              if (match) {
                updateArcadeGameScore(
                  match.id,
                  currentUid || "player",
                  "super_mario",
                  Math.max(scoreRef.current.p1, scoreRef.current.p2),
                  true
                );
              }
            }
          }
          return Math.max(0, next);
        });
      } else {
        // Luigi
        setP2Lives((prev) => {
          const next = prev - 1;
          player.lives = next;

          if (!other.isDead || other.lives > 0) {
            player.bubbleTimer = 120;
            setTimeout(() => {
              respawnBeside(player, other);
              setP2Form("small");
            }, 1800);
          } else if (next <= 0 && other.lives <= 0) {
            setGameOver(true);
            if (match) {
              updateArcadeGameScore(
                match.id,
                currentUid || "player",
                "super_mario",
                Math.max(scoreRef.current.p1, scoreRef.current.p2),
                true
              );
            }
          }
          return Math.max(0, next);
        });
      }
    },
    [currentUid, isMuted, match, playerMode]
  );

  const handlePlayerDeathRef = useRef(handlePlayerDeath);
  handlePlayerDeathRef.current = handlePlayerDeath;

  // Helper respawn functions
  const respawnPlayer = (player: PlayerState) => {
    player.x = Math.max(40, cameraXRef.current + 30);
    player.y = 280;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = false;
    player.isJumping = false;
    player.form = "small";
    player.invulnerableTimer = 140; // 2.3 seconds shield
    player.isDead = false;
    player.deathVy = 0;
    player.slideOnFlag = false;
  };

  const respawnBeside = (player: PlayerState, teammate: PlayerState) => {
    player.x = Math.max(30, teammate.isDead ? cameraXRef.current + 30 : teammate.x - 20);
    player.y = 260;
    player.vx = 0;
    player.vy = -3;
    player.isGrounded = false;
    player.isJumping = false;
    player.form = "small";
    player.invulnerableTimer = 160; // 2.6 seconds shield
    player.isDead = false;
    player.deathVy = 0;
    player.slideOnFlag = false;
    floatersRef.current.push({
      x: player.x,
      y: player.y - 12,
      text: `${player.name} REVIVED! 🫧`,
      color: "#38bdf8",
      alpha: 1,
    });
    if (!isMuted) arcadeSfx.playMarioPowerup();
  };

  // ── 60 FPS Canvas Game Engine ──
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let globalTick = 0;

    const loop = () => {
      globalTick++;
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const isChill = speedLevel === "chill";

      // ── Physics Parameters (Slow, Gentle & Easy) ──
      const maxSpeed = isChill ? 2.1 : 3.0;
      const sprintSpeed = isChill ? 3.0 : 4.4;
      const accel = isChill ? 0.35 : 0.45;
      const friction = isChill ? 0.85 : 0.82;
      const gravity = isChill ? 0.32 : 0.46;

      // ── Update Player 1 (Mario) ──
      if (!p1.isDead && !p1.slideOnFlag) {
        const left =
          keysPressed.current["KeyA"] ||
          (playerMode === "1P" && (keysPressed.current["ArrowLeft"] || keysPressed.current["arrowleft"]));
        const right =
          keysPressed.current["KeyD"] ||
          (playerMode === "1P" && (keysPressed.current["ArrowRight"] || keysPressed.current["arrowright"]));
        const sprint = keysPressed.current["ShiftLeft"] || keysPressed.current["KeyF"] || keysPressed.current["KeyJ"];

        const curMax = sprint ? sprintSpeed : maxSpeed;
        if (left && !right) {
          p1.vx = Math.max(-curMax, p1.vx - accel);
          p1.facing = "left";
          p1.walkFrame += 0.15;
        } else if (right && !left) {
          p1.vx = Math.min(curMax, p1.vx + accel);
          p1.facing = "right";
          p1.walkFrame += 0.15;
        } else {
          p1.vx *= friction;
          if (Math.abs(p1.vx) < 0.1) p1.vx = 0;
        }

        // Variable Jump (hold jump for higher arc)
        if (p1.isJumping && p1.jumpTimer > 0) {
          p1.vy -= 0.28;
          p1.jumpTimer -= 1;
        }

        // Apply gravity & vertical movement
        p1.vy += gravity;
        if (p1.vy > 8.0) p1.vy = 8.0;

        // Apply horizontal movement & camera boundary
        p1.x += p1.vx;
        if (p1.x < cameraXRef.current + 8) {
          p1.x = cameraXRef.current + 8;
          p1.vx = 0;
        }

        // Horizontal Block Collisions
        blocksRef.current.forEach((b) => {
          const by = b.originalY + b.bumpOffset;
          if (p1.x < b.x + b.w && p1.x + p1.w > b.x && p1.y < by + b.h && p1.y + p1.h > by) {
            if (p1.vx > 0) {
              p1.x = b.x - p1.w;
              p1.vx = 0;
            } else if (p1.vx < 0) {
              p1.x = b.x + b.w;
              p1.vx = 0;
            }
          }
        });

        // Apply vertical movement
        p1.y += p1.vy;
        p1.isGrounded = false;

        // Vertical Block Collisions & Headbutting Blocks
        blocksRef.current.forEach((b) => {
          const by = b.originalY + b.bumpOffset;
          if (p1.x + 3 < b.x + b.w && p1.x + p1.w - 3 > b.x && p1.y < by + b.h && p1.y + p1.h > by) {
            // Landing on top
            if (p1.vy > 0 && p1.y + p1.h - p1.vy <= by + 8) {
              p1.y = by - p1.h;
              p1.vy = 0;
              p1.isGrounded = true;
            }
            // Headbutt from below
            else if (p1.vy < 0 && p1.y - p1.vy >= by + b.h - 10) {
              p1.y = by + b.h;
              p1.vy = 1;
              p1.isJumping = false;

              // Question block triggered
              if (b.type.startsWith("question")) {
                b.bumpVy = -4.5;
                if (!isMuted) arcadeSfx.playMarioBump();

                if (b.type === "question_coin") {
                  b.type = "empty";
                  p1.coins += 1;
                  p1.score += 200;
                  setP1Coins(p1.coins);
                  setP1Score(p1.score);
                  floatersRef.current.push({ x: b.x + 4, y: b.y - 12, text: "+200", color: "#facc15", alpha: 1 });
                  if (!isMuted) arcadeSfx.playMarioCoin();
                } else if (b.type === "question_shroom") {
                  b.type = "empty";
                  itemsRef.current.push({
                    id: Date.now(),
                    type: "shroom",
                    x: b.x + 4,
                    y: b.y - 20,
                    vx: 0.8,
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
                    vy: -1.2,
                    collected: false,
                  });
                  if (!isMuted) arcadeSfx.playMarioPowerup();
                }
              }
              // Brick Block Hit
              else if (b.type === "brick") {
                if (p1.form !== "small") {
                  if (!isMuted) arcadeSfx.playMarioStomp();
                  p1.score += 50;
                  setP1Score(p1.score);
                  blocksRef.current = blocksRef.current.filter((bk) => bk !== b);
                  debrisRef.current.push(
                    { x: b.x, y: b.y, vx: -2.5, vy: -5, color: "#c84c0c" },
                    { x: b.x + 12, y: b.y, vx: 2.5, vy: -5, color: "#c84c0c" },
                    { x: b.x, y: b.y + 12, vx: -1.8, vy: -3.5, color: "#c84c0c" },
                    { x: b.x + 12, y: b.y + 12, vx: 1.8, vy: -3.5, color: "#c84c0c" }
                  );
                } else {
                  b.bumpVy = -3.2;
                  if (!isMuted) arcadeSfx.playMarioBump();
                }
              }
            }
          }
        });

        // Bouncy Safety Cloud Collision (Forgiving Pit Cushion)
        safetyCloudsRef.current.forEach((cloud) => {
          if (
            p1.x + p1.w > cloud.x &&
            p1.x < cloud.x + cloud.w &&
            p1.y + p1.h >= cloud.y - 4 &&
            p1.y + p1.h <= cloud.y + cloud.h + 12 &&
            p1.vy > 0
          ) {
            p1.y = cloud.y - p1.h;
            p1.vy = -8.8; // High joyful trampoline bounce!
            cloud.bounceVy = 4;
            floatersRef.current.push({ x: cloud.x + 20, y: cloud.y - 14, text: "BOING! SAFE! ☁️", color: "#f472b6", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioSpring();
          }
        });

        // Fall into deep bottom pit (fallback if safety missed)
        if (p1.y > 400) {
          handlePlayerDeathRef.current("mario");
        }

        // Reached Flagpole
        if (p1.x >= flagPoleX && !stageClear) {
          p1.slideOnFlag = true;
          p1.vx = 0;
          p1.vy = 2.0;
          setStageClear(true);
          setStageClearWinner("Mario");
          p1.score += 5000;
          setP1Score(p1.score);
          floatersRef.current.push({ x: flagPoleX, y: 160, text: "MARIO WINS! +5000", color: "#facc15", alpha: 1 });
          if (!isMuted) arcadeSfx.playMarioStageClear();
          if (match) {
            updateArcadeGameScore(match.id, currentUid || "player", "super_mario", p1.score, true);
          }
        }

        if (p1.invulnerableTimer > 0) p1.invulnerableTimer -= 1;
      }

      // ── Update Player 2 (Luigi) in 2P Mode ──
      if (playerMode === "2P" && !p2.isDead && !p2.slideOnFlag) {
        let left = keysPressed.current["ArrowLeft"] || keysPressed.current["arrowleft"];
        let right = keysPressed.current["ArrowRight"] || keysPressed.current["arrowright"];
        let sprint = keysPressed.current["Enter"] || keysPressed.current["ControlRight"];

        // Buddy AI Assist: If no user keys pressed for Luigi, Luigi intelligently follows Mario!
        const hasUserInput = left || right || keysPressed.current["ArrowUp"];
        if (!hasUserInput && !p1.isDead) {
          const distToMario = p1.x - p2.x;
          if (distToMario > 40) {
            right = true;
          } else if (distToMario < -40) {
            left = true;
          }
          // Jump over obstacles or jump when Mario jumps
          const obstacleAhead = blocksRef.current.some(
            (b) => b.x > p2.x && b.x < p2.x + 36 && p2.y + p2.h > b.originalY
          );
          if ((obstacleAhead || p1.isJumping) && p2.isGrounded && Math.random() < 0.08) {
            p2.vy = isChill ? -8.2 : -8.8;
            p2.isGrounded = false;
            p2.isJumping = true;
            p2.jumpTimer = 14;
          }
        }

        const curMax = sprint ? sprintSpeed : maxSpeed;
        if (left && !right) {
          p2.vx = Math.max(-curMax, p2.vx - accel);
          p2.facing = "left";
          p2.walkFrame += 0.15;
        } else if (right && !left) {
          p2.vx = Math.min(curMax, p2.vx + accel);
          p2.facing = "right";
          p2.walkFrame += 0.15;
        } else {
          p2.vx *= friction;
          if (Math.abs(p2.vx) < 0.1) p2.vx = 0;
        }

        if (p2.isJumping && p2.jumpTimer > 0) {
          p2.vy -= 0.3; // Luigi floaty hangtime!
          p2.jumpTimer -= 1;
        }

        p2.vy += gravity;
        if (p2.vy > 8.0) p2.vy = 8.0;

        p2.x += p2.vx;
        if (p2.x < cameraXRef.current + 8) {
          p2.x = cameraXRef.current + 8;
          p2.vx = 0;
        }

        // Horizontal Block Collisions for P2
        blocksRef.current.forEach((b) => {
          const by = b.originalY + b.bumpOffset;
          if (p2.x < b.x + b.w && p2.x + p2.w > b.x && p2.y < by + b.h && p2.y + p2.h > by) {
            if (p2.vx > 0) {
              p2.x = b.x - p2.w;
              p2.vx = 0;
            } else if (p2.vx < 0) {
              p2.x = b.x + b.w;
              p2.vx = 0;
            }
          }
        });

        p2.y += p2.vy;
        p2.isGrounded = false;

        // Vertical Block Collisions for P2
        blocksRef.current.forEach((b) => {
          const by = b.originalY + b.bumpOffset;
          if (p2.x + 3 < b.x + b.w && p2.x + p2.w - 3 > b.x && p2.y < by + b.h && p2.y + p2.h > by) {
            if (p2.vy > 0 && p2.y + p2.h - p2.vy <= by + 8) {
              p2.y = by - p2.h;
              p2.vy = 0;
              p2.isGrounded = true;
            } else if (p2.vy < 0 && p2.y - p2.vy >= by + b.h - 10) {
              p2.y = by + b.h;
              p2.vy = 1;
              p2.isJumping = false;

              if (b.type.startsWith("question")) {
                b.bumpVy = -4.5;
                if (!isMuted) arcadeSfx.playMarioBump();
                if (b.type === "question_coin") {
                  b.type = "empty";
                  p2.coins += 1;
                  p2.score += 200;
                  setP2Coins(p2.coins);
                  setP2Score(p2.score);
                  floatersRef.current.push({ x: b.x + 4, y: b.y - 12, text: "+200", color: "#4ade80", alpha: 1 });
                  if (!isMuted) arcadeSfx.playMarioCoin();
                } else if (b.type === "question_shroom") {
                  b.type = "empty";
                  itemsRef.current.push({
                    id: Date.now(),
                    type: "shroom",
                    x: b.x + 4,
                    y: b.y - 20,
                    vx: 0.8,
                    vy: -2,
                    collected: false,
                  });
                }
              }
            }
          }
        });

        // Bouncy Safety Cloud Collision for P2
        safetyCloudsRef.current.forEach((cloud) => {
          if (
            p2.x + p2.w > cloud.x &&
            p2.x < cloud.x + cloud.w &&
            p2.y + p2.h >= cloud.y - 4 &&
            p2.y + p2.h <= cloud.y + cloud.h + 12 &&
            p2.vy > 0
          ) {
            p2.y = cloud.y - p2.h;
            p2.vy = -9.2;
            cloud.bounceVy = 4;
            floatersRef.current.push({ x: cloud.x + 20, y: cloud.y - 14, text: "BOING! SAFE! ☁️", color: "#4ade80", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioSpring();
          }
        });

        if (p2.y > 400) {
          handlePlayerDeathRef.current("luigi");
        }

        // P2 reaches Flagpole
        if (p2.x >= flagPoleX && !stageClear) {
          p2.slideOnFlag = true;
          p2.vx = 0;
          p2.vy = 2.0;
          setStageClear(true);
          setStageClearWinner("Luigi");
          p2.score += 5000;
          setP2Score(p2.score);
          floatersRef.current.push({ x: flagPoleX, y: 160, text: "LUIGI WINS! +5000", color: "#4ade80", alpha: 1 });
          if (!isMuted) arcadeSfx.playMarioStageClear();
        }

        if (p2.invulnerableTimer > 0) p2.invulnerableTimer -= 1;
      }

      // ── Flagpole Victory Slide Down ──
      [p1, p2].forEach((pl) => {
        if (pl.slideOnFlag) {
          pl.y = Math.min(316, pl.y + 2.2);
          if (pl.y >= 316) {
            pl.x = Math.min(castleX, pl.x + 1.6);
          }
        }
        if (pl.isDead) {
          pl.deathVy += 0.4;
          pl.y += pl.deathVy;
        }
      });

      // ── Smooth Camera Centering ──
      const leadX = playerMode === "1P" ? p1.x : Math.max(p1.isDead ? 0 : p1.x, p2.isDead ? 0 : p2.x);
      const targetCamX = Math.max(0, leadX - 140);
      if (targetCamX > cameraXRef.current) {
        cameraXRef.current += (targetCamX - cameraXRef.current) * 0.1;
      }

      // ── Safety Clouds Bounce Animation ──
      safetyCloudsRef.current.forEach((cloud) => {
        if (cloud.bounceOffset !== 0 || cloud.bounceVy !== 0) {
          cloud.bounceOffset += cloud.bounceVy;
          cloud.bounceVy -= 0.6;
          if (cloud.bounceOffset <= 0) {
            cloud.bounceOffset = 0;
            cloud.bounceVy = 0;
          }
        }
      });

      // ── Block Bumping Animation ──
      blocksRef.current.forEach((b) => {
        if (b.bumpVy !== 0 || b.bumpOffset !== 0) {
          b.bumpOffset += b.bumpVy;
          b.bumpVy += 0.7;
          if (b.bumpOffset >= 0) {
            b.bumpOffset = 0;
            b.bumpVy = 0;
          }
        }
      });

      // ── Floating Air Coins Collection & Sparkles ──
      airCoinsRef.current.forEach((coin) => {
        if (coin.collected) return;
        coin.angle = (coin.angle + 4) % 360;

        [p1, p2].forEach((pl) => {
          if (pl.isDead || (pl.id === "luigi" && playerMode === "1P")) return;
          if (
            pl.x < coin.x + 14 &&
            pl.x + pl.w > coin.x &&
            pl.y < coin.y + 14 &&
            pl.y + pl.h > coin.y
          ) {
            coin.collected = true;
            pl.coins += 1;
            pl.score += 100;
            if (pl.id === "mario") {
              setP1Coins(pl.coins);
              setP1Score(pl.score);
            } else {
              setP2Coins(pl.coins);
              setP2Score(pl.score);
            }
            floatersRef.current.push({ x: coin.x, y: coin.y - 8, text: "+100", color: "#facc15", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioSparkle();

            // Spawn bright sparkle particles
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              particlesRef.current.push({
                x: coin.x + 7,
                y: coin.y + 7,
                vx: Math.cos(ang) * 2,
                vy: Math.sin(ang) * 2,
                color: "#fde047",
                life: 15,
                maxLife: 15,
                size: 2.5,
              });
            }
          }
        });
      });

      // ── Items Physics & Collection ──
      itemsRef.current.forEach((item) => {
        if (item.collected) return;
        if (item.type === "shroom") {
          item.x += item.vx;
          item.vy = Math.min(5, item.vy + 0.35);
          item.y += item.vy;

          blocksRef.current.forEach((b) => {
            if (item.x < b.x + b.w && item.x + 16 > b.x && item.y < b.y + b.h && item.y + 16 > b.y) {
              if (item.vy > 0) {
                item.y = b.y - 16;
                item.vy = 0;
              } else {
                item.vx = -item.vx;
              }
            }
          });
        }

        // Touch player
        [p1, p2].forEach((pl) => {
          if (pl.isDead || (pl.id === "luigi" && playerMode === "1P")) return;
          if (
            pl.x < item.x + 16 &&
            pl.x + pl.w > item.x &&
            pl.y < item.y + 16 &&
            pl.y + pl.h > item.y
          ) {
            item.collected = true;
            pl.score += 1000;
            if (item.type === "shroom") {
              if (pl.form === "small") pl.form = "super";
              pl.h = 28;
            } else if (item.type === "flower") {
              pl.form = "fire";
              pl.h = 28;
            }
            if (pl.id === "mario") {
              setP1Form(pl.form);
              setP1Score(pl.score);
            } else {
              setP2Form(pl.form);
              setP2Score(pl.score);
            }
            floatersRef.current.push({
              x: pl.x,
              y: pl.y - 14,
              text: item.type === "flower" ? "FIRE POWER! +1000" : "SUPER! +1000",
              color: "#fb923c",
              alpha: 1,
            });
            if (!isMuted) arcadeSfx.playMarioPowerup();
          }
        });
      });

      // ── Fireballs Physics & Collision ──
      fireballsRef.current.forEach((fb) => {
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vy = Math.min(5, fb.vy + 0.35);
        fb.rot += 0.25;

        // Ground bounce
        blocksRef.current.forEach((b) => {
          if (fb.x < b.x + b.w && fb.x + 8 > b.x && fb.y < b.y + b.h && fb.y + 8 > b.y) {
            if (fb.vy > 0) {
              fb.y = b.y - 8;
              fb.vy = -3.8;
            } else {
              fb.alive = false;
            }
          }
        });

        // Hit Goombas
        goombasRef.current.forEach((g) => {
          if (g.isAlive && fb.x < g.x + 20 && fb.x + 8 > g.x && fb.y < g.y + 20 && fb.y + 8 > g.y) {
            fb.alive = false;
            g.isAlive = false;
            const scorer = fb.owner === "mario" ? p1 : p2;
            scorer.score += 200;
            if (scorer.id === "mario") setP1Score(scorer.score);
            else setP2Score(scorer.score);
            floatersRef.current.push({ x: g.x, y: g.y - 8, text: "+200", color: "#f87171", alpha: 1 });
            if (!isMuted) arcadeSfx.playMarioStomp();
          }
        });

        if (fb.y > 380 || fb.x > cameraXRef.current + 420) fb.alive = false;
      });
      fireballsRef.current = fireballsRef.current.filter((fb) => fb.alive);

      // ── Goombas AI, Walking & Stomps ──
      goombasRef.current.forEach((g) => {
        if (g.isSquished) {
          g.squishTimer -= 1;
          if (g.squishTimer <= 0) g.isAlive = false;
          return;
        }
        if (!g.isAlive) return;

        g.x += g.vx;
        g.stepCycle += 0.08;

        // Pipe / Obstacle reverse
        blocksRef.current.forEach((b) => {
          if (b.type === "pipe" || b.type === "brick" || b.type === "ground") {
            if (g.x < b.x + b.w && g.x + 20 > b.x && g.y < b.y + b.h && g.y + 20 > b.y) {
              g.vx = -g.vx;
            }
          }
        });

        // Interacting with players (Super Forgiving Stomp!)
        [p1, p2].forEach((pl) => {
          if (pl.isDead || pl.slideOnFlag || (pl.id === "luigi" && playerMode === "1P")) return;
          if (
            pl.x < g.x + 19 &&
            pl.x + pl.w > g.x + 1 &&
            pl.y < g.y + 19 &&
            pl.y + pl.h > g.y + 1
          ) {
            // Stomp from above (generous: if descending or anywhere in top 70%)
            if (pl.vy >= -1.0 && pl.y + pl.h - pl.vy <= g.y + 12) {
              g.isSquished = true;
              g.squishTimer = 35;
              pl.vy = -7.5; // High bounce
              pl.score += 100;
              if (pl.id === "mario") setP1Score(pl.score);
              else setP2Score(pl.score);
              floatersRef.current.push({ x: g.x, y: g.y - 10, text: "+100", color: "#facc15", alpha: 1 });
              if (!isMuted) arcadeSfx.playMarioStomp();
            }
            // Touched from side
            else if (pl.invulnerableTimer <= 0) {
              if (pl.form !== "small") {
                pl.form = "small";
                pl.h = 20;
                pl.invulnerableTimer = 120; // 2 seconds safety shield
                if (pl.id === "mario") setP1Form("small");
                else setP2Form("small");
                if (!isMuted) arcadeSfx.playMarioBump();
              } else {
                handlePlayerDeathRef.current(pl.id);
              }
            }
          }
        });
      });

      // ── Particles & Debris ──
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      debrisRef.current.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.45;
      });
      debrisRef.current = debrisRef.current.filter((d) => d.y < 420);

      // Floaters
      floatersRef.current.forEach((f) => {
        f.y -= 0.5;
        f.alpha -= 0.018;
      });
      floatersRef.current = floatersRef.current.filter((f) => f.alpha > 0);

      // ── RENDER SCENE (Rich High-Detail Pixel Aesthetics) ──
      const camX = Math.round(cameraXRef.current);
      ctx.save();

      // 1. Far Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
      skyGrad.addColorStop(0, "#3b82f6");
      skyGrad.addColorStop(0.5, "#60a5fa");
      skyGrad.addColorStop(1, "#93c5fd");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 400, 360);

      // 2. Parallax Layer 1: Distant Purple Mountains (camX * 0.08)
      ctx.save();
      const mountainOff = -Math.round(camX * 0.08) % 400;
      ctx.translate(mountainOff, 0);
      for (let m = -400; m < 800; m += 200) {
        ctx.fillStyle = "#6366f1";
        ctx.beginPath();
        ctx.moveTo(m, 336);
        ctx.lineTo(m + 100, 190);
        ctx.lineTo(m + 200, 336);
        ctx.closePath();
        ctx.fill();

        // Snow Cap
        ctx.fillStyle = "#e0e7ff";
        ctx.beginPath();
        ctx.moveTo(m + 78, 222);
        ctx.lineTo(m + 100, 190);
        ctx.lineTo(m + 122, 222);
        ctx.lineTo(m + 110, 216);
        ctx.lineTo(m + 100, 225);
        ctx.lineTo(m + 90, 216);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 3. Parallax Layer 2: Midground Rolling Green Hills & Shrubs (camX * 0.22)
      ctx.save();
      const hillOff = -Math.round(camX * 0.22) % 480;
      ctx.translate(hillOff, 0);
      for (let h = -480; h < 960; h += 240) {
        // Shaded Hill
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.arc(h + 80, 336, 75, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(h + 80, 336, 60, Math.PI, 0);
        ctx.fill();

        // Bush
        ctx.fillStyle = "#166534";
        ctx.beginPath();
        ctx.arc(h + 170, 336, 18, Math.PI, 0);
        ctx.arc(h + 190, 336, 24, Math.PI, 0);
        ctx.arc(h + 210, 336, 18, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.arc(h + 190, 336, 19, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();

      // 4. Parallax Layer 3: Autonomous Drifting Pixel Clouds
      const cloudDrift = (globalTick * 0.15) % 800;
      for (let c = 0; c < 3; c++) {
        const cx = ((c * 280 + cloudDrift) % 600) - 80;
        const cy = 40 + c * 25;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(cx + 18, cy + 10, 14, 0, Math.PI * 2);
        ctx.arc(cx + 34, cy + 4, 18, 0, Math.PI * 2);
        ctx.arc(cx + 52, cy + 8, 15, 0, Math.PI * 2);
        ctx.arc(cx + 66, cy + 12, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Main World Coordinate Layer ──
      ctx.save();
      ctx.translate(-camX, 0);

      // Flagpole & Finishing Castle
      // Flagpole
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(flagPoleX, 96, 4, 240);
      // Golden ball on top
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(flagPoleX + 2, 94, 6, 0, Math.PI * 2);
      ctx.fill();

      // Waving Victory Flag
      const flagWave = Math.sin(globalTick * 0.1) * 3;
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(flagPoleX - 26, 106 + flagWave);
      ctx.lineTo(flagPoleX, 98);
      ctx.lineTo(flagPoleX, 122);
      ctx.lineTo(flagPoleX - 26, 126 + flagWave);
      ctx.closePath();
      ctx.fill();

      // Castle (detailed brick fortress)
      ctx.fillStyle = "#b45309";
      ctx.fillRect(castleX, 230, 88, 106);
      // Crenellations on top
      for (let cr = 0; cr < 4; cr++) {
        ctx.fillRect(castleX + cr * 24, 218, 14, 12);
      }
      // Arched Dark Entryway
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(castleX + 44, 290, 16, Math.PI, 0);
      ctx.rect(castleX + 28, 290, 32, 46);
      ctx.fill();
      // Castle Banners
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(castleX + 16, 206, 2, 12);
      ctx.fillRect(castleX + 70, 206, 2, 12);
      ctx.beginPath();
      ctx.moveTo(castleX + 18, 206);
      ctx.lineTo(castleX + 30, 211);
      ctx.lineTo(castleX + 18, 216);
      ctx.closePath();
      ctx.fill();

      // ── Pit Safety Cloud Cushions ──
      safetyCloudsRef.current.forEach((cloud) => {
        const cy = cloud.y + cloud.bounceOffset;
        ctx.fillStyle = "#fbcfe8";
        ctx.strokeStyle = "#f472b6";
        ctx.lineWidth = 1.5;
        // Bouncy rounded cloud lobes
        ctx.beginPath();
        ctx.arc(cloud.x + 16, cy + 10, 12, 0, Math.PI * 2);
        ctx.arc(cloud.x + 40, cy + 6, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 64, cy + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Trampoline Spring Coil Indicator
        ctx.strokeStyle = "#db2777";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cloud.x + 36, cy + 16);
        ctx.lineTo(cloud.x + 44, cy + 20);
        ctx.lineTo(cloud.x + 36, cy + 24);
        ctx.stroke();
      });

      // ── Blocks & Warp Pipes Rendering ──
      blocksRef.current.forEach((b) => {
        const by = b.originalY + b.bumpOffset;
        if (b.type === "ground") {
          // Terracotta brick texture
          ctx.fillStyle = "#c84c0c";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = "#e06c28";
          ctx.fillRect(b.x, by, b.w, 2);
          // Grout seams
          ctx.fillStyle = "#000000";
          ctx.fillRect(b.x + 3, by + 3, 2, 2);
          ctx.fillRect(b.x + b.w - 5, by + 3, 2, 2);
          ctx.fillRect(b.x + 3, by + b.h - 5, 2, 2);
          ctx.fillRect(b.x + b.w - 5, by + b.h - 5, 2, 2);
          // Green grass trim on top block
          if (by <= 336) {
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(b.x, by - 1, b.w, 3);
            ctx.fillStyle = "#15803d";
            for (let g = 0; g < b.w; g += 6) {
              ctx.fillRect(b.x + g, by + 2, 2, 2);
            }
          }
        } else if (b.type === "brick") {
          ctx.fillStyle = "#b45309";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, by, b.w, b.h);
          // Brick masonry lines
          ctx.fillStyle = "#d97706";
          ctx.fillRect(b.x + 2, by + 2, b.w - 4, 2);
          ctx.fillStyle = "#78350f";
          ctx.fillRect(b.x + b.w / 2, by + 4, 1, b.h - 8);
        } else if (b.type.startsWith("question")) {
          // Shimmering golden gradient question block
          const pulse = (Math.sin(globalTick * 0.08) + 1) * 0.15;
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, by, b.w, b.h);

          // Corner Metallic Rivets
          ctx.fillStyle = "#451a03";
          ctx.fillRect(b.x + 2, by + 2, 2, 2);
          ctx.fillRect(b.x + b.w - 4, by + 2, 2, 2);
          ctx.fillRect(b.x + 2, by + b.h - 4, 2, 2);
          ctx.fillRect(b.x + b.w - 4, by + b.h - 4, 2, 2);

          // Golden Aura glow & pulsing "?"
          ctx.fillStyle = `rgba(254, 240, 138, ${0.7 + pulse})`;
          ctx.font = "900 14px monospace";
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
          // Green Warp Pipe with 3D tubular gradient
          const pipeGrad = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
          pipeGrad.addColorStop(0, "#16a34a");
          pipeGrad.addColorStop(0.3, "#4ade80");
          pipeGrad.addColorStop(0.7, "#16a34a");
          pipeGrad.addColorStop(1, "#14532d");
          ctx.fillStyle = pipeGrad;
          ctx.fillRect(b.x, by + 16, b.w, b.h - 16);

          // Pipe Collar Rim
          ctx.fillStyle = pipeGrad;
          ctx.fillRect(b.x - 3, by, b.w + 6, 16);
          ctx.strokeStyle = "#052e16";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(b.x - 3, by, b.w + 6, 16);
          ctx.strokeRect(b.x, by + 16, b.w, b.h - 16);

          // Dark interior mouth depth
          ctx.fillStyle = "#022c22";
          ctx.fillRect(b.x - 1, by + 1, b.w + 2, 3);
        }
      });

      // ── Airborne 3D Rotating Gold Coins ──
      airCoinsRef.current.forEach((coin) => {
        if (coin.collected) return;
        const scaleX = Math.cos((coin.angle * Math.PI) / 180);
        const w = Math.max(2, Math.abs(scaleX) * 12);
        const cx = coin.x + 6;
        const cy = coin.y + 6;

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Shiny specular glint
        if (Math.abs(scaleX) > 0.4) {
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(cx - 1, cy - 3, 2, 6);
        }
      });

      // ── Powerup Items ──
      itemsRef.current.forEach((item) => {
        if (item.collected) return;
        if (item.type === "shroom") {
          // Super Mushroom with 3 polka dots & cute eyes
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 6, 8, Math.PI, 0);
          ctx.fill();

          // Dots
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 3, 2.5, 0, Math.PI * 2);
          ctx.arc(item.x + 3, item.y + 6, 2, 0, Math.PI * 2);
          ctx.arc(item.x + 13, item.y + 6, 2, 0, Math.PI * 2);
          ctx.fill();

          // Stalk & eyes
          ctx.fillStyle = "#fed7aa";
          ctx.fillRect(item.x + 4, item.y + 6, 8, 8);
          ctx.fillStyle = "#000000";
          ctx.fillRect(item.x + 5, item.y + 8, 1.5, 3);
          ctx.fillRect(item.x + 9, item.y + 8, 1.5, 3);
        } else if (item.type === "flower") {
          // Fire Flower with spinning rainbow petals
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ── Fireballs with Ember Trails ──
      fireballsRef.current.forEach((fb) => {
        ctx.save();
        ctx.translate(fb.x + 4, fb.y + 4);
        ctx.rotate(fb.rot);

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(1, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Goombas (Detailed Pixel Shading & Waddling Legs) ──
      goombasRef.current.forEach((g) => {
        if (!g.isAlive) return;
        if (g.isSquished) {
          ctx.fillStyle = "#9a3412";
          ctx.fillRect(g.x, g.y + 13, 20, 5);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px monospace";
          ctx.fillText("x x", g.x + 5, g.y + 17);
          return;
        }

        // Mushroom Cap with soft top shading
        ctx.fillStyle = "#9a3412";
        ctx.beginPath();
        ctx.arc(g.x + 10, g.y + 8, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#c2410c";
        ctx.beginPath();
        ctx.arc(g.x + 8, g.y + 6, 5, Math.PI, 0);
        ctx.fill();

        // Tan Stalk
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(g.x + 5, g.y + 8, 10, 8);

        // Big Expressive Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(g.x + 5, g.y + 8, 3, 5);
        ctx.fillRect(g.x + 12, g.y + 8, 3, 5);
        ctx.fillStyle = "#000000";
        ctx.fillRect(g.x + 6, g.y + 10, 2, 2.5);
        ctx.fillRect(g.x + 13, g.y + 10, 2, 2.5);

        // Waddling Feet (alternates with stepCycle)
        const footWaddle = Math.sin(g.stepCycle) * 2;
        ctx.fillStyle = "#000000";
        ctx.fillRect(g.x + 2, g.y + 15 + footWaddle, 6, 3);
        ctx.fillRect(g.x + 12, g.y + 15 - footWaddle, 6, 3);
      });

      // ── Particles & Debris ──
      particlesRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      debrisRef.current.forEach((d) => {
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, 5, 5);
      });

      // ── Draw Players (Mario & Luigi) ──
      const drawPlayerSprite = (pl: PlayerState, isLuigi: boolean) => {
        if (pl.invulnerableTimer % 4 >= 2) return; // Blinking invulnerability

        ctx.save();
        ctx.translate(pl.x, pl.y);

        const isMoving = Math.abs(pl.vx) > 0.15;
        const walkCycle = isMoving ? Math.sin(pl.walkFrame) * 3 : 0;
        const isFire = pl.form === "fire";

        // Colors
        const primaryColor = isLuigi ? (isFire ? "#ffffff" : "#16a34a") : isFire ? "#ffffff" : "#dc2626";
        const overallColor = isLuigi ? (isFire ? "#16a34a" : "#1e3a8a") : isFire ? "#dc2626" : "#0284c7";

        // Cap with Visor Brim
        ctx.fillStyle = primaryColor;
        ctx.fillRect(pl.facing === "right" ? 4 : 0, 0, 12, 5);
        ctx.fillRect(pl.facing === "right" ? 2 : 2, 4, 14, 2); // Brim

        // Shirt
        ctx.fillRect(2, 6, 12, pl.form === "small" ? 8 : 14);

        // Face & Nose
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(pl.facing === "right" ? 5 : 1, 3, 9, 5);

        // Mustache & Eye
        ctx.fillStyle = "#451a03";
        ctx.fillRect(pl.facing === "right" ? 10 : 2, 4, 2, 2); // Eye
        ctx.fillRect(pl.facing === "right" ? 7 : 1, 6, 6, 2.5); // Mustache

        // Overalls
        ctx.fillStyle = overallColor;
        if (pl.form === "small") {
          ctx.fillRect(2, 10, 12, 6);
          // Yellow Brass Buttons
          ctx.fillStyle = "#facc15";
          ctx.fillRect(4, 11, 2, 2);
          ctx.fillRect(10, 11, 2, 2);

          // Boots
          ctx.fillStyle = "#78350f";
          ctx.fillRect(1, 16 + walkCycle, 6, 4);
          ctx.fillRect(9, 16 - walkCycle, 6, 4);
        } else {
          ctx.fillRect(2, 14, 12, 11);
          // Yellow Brass Buttons
          ctx.fillStyle = "#facc15";
          ctx.fillRect(4, 15, 2, 2);
          ctx.fillRect(10, 15, 2, 2);

          // Boots
          ctx.fillStyle = "#78350f";
          ctx.fillRect(1, 25 + walkCycle, 6, 4);
          ctx.fillRect(9, 25 - walkCycle, 6, 4);
        }

        // Indicator tag above character in 2P mode
        if (playerMode === "2P") {
          ctx.fillStyle = isLuigi ? "#4ade80" : "#ef4444";
          ctx.font = "900 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(isLuigi ? "LUIGI" : "MARIO", 8, -4);
        }

        ctx.restore();
      };

      // Draw Mario (P1)
      drawPlayerSprite(p1, false);

      // Draw Luigi (P2) in 2P Mode
      if (playerMode === "2P") {
        drawPlayerSprite(p2, true);
      }

      // Floating Scores & Notifications
      floatersRef.current.forEach((f) => {
        ctx.save();
        ctx.font = "900 11px monospace";
        ctx.fillStyle = f.color ? f.color : `rgba(255, 255, 255, ${f.alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });

      ctx.restore(); // End camera transform

      // ── Retro HUD Overlay (Exact NES Aesthetic with 2P Support) ──
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 10px monospace";
      ctx.textAlign = "left";

      if (playerMode === "1P") {
        // MARIO
        ctx.fillStyle = p1.form === "fire" ? "#f97316" : p1.form === "super" ? "#38bdf8" : "#ffffff";
        ctx.fillText("MARIO", 16, 18);
        ctx.fillText(String(p1.score).padStart(6, "0"), 16, 30);

        // COINS
        ctx.fillStyle = "#facc15";
        ctx.fillText("COINS", 110, 18);
        ctx.fillText(`x${String(p1.coins).padStart(2, "0")}`, 110, 30);

        // WORLD
        ctx.fillStyle = "#ffffff";
        ctx.fillText("WORLD", 200, 18);
        ctx.fillText("1-1", 200, 30);

        // LIVES
        ctx.fillStyle = "#ef4444";
        ctx.fillText("LIVES", 280, 18);
        ctx.fillText(`❤️ x${p1.lives}`, 280, 30);

        // CHILL BADGE
        ctx.fillStyle = isChill ? "#38bdf8" : "#a855f7";
        ctx.fillText(isChill ? "🍃 CHILL" : "⚡ FAST", 346, 24);
      } else {
        // 2-PLAYER DUAL SCOREBOARD
        // P1 Mario
        ctx.fillStyle = "#ef4444";
        ctx.fillText("1P MARIO", 12, 16);
        ctx.fillText(`${String(p1.score).padStart(5, "0")} ❤️x${p1.lives}`, 12, 28);

        // P2 Luigi
        ctx.fillStyle = "#22c55e";
        ctx.fillText("2P LUIGI", 124, 16);
        ctx.fillText(`${String(p2.score).padStart(5, "0")} 💚x${p2.lives}`, 124, 28);

        // COINS
        ctx.fillStyle = "#facc15";
        ctx.fillText("COINS", 236, 16);
        ctx.fillText(`x${p1.coins + p2.coins}`, 236, 28);

        // WORLD & MODE
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("2P CO-OP", 308, 16);
        ctx.fillText("W 1-1", 308, 28);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isMuted, match, currentUid, stageClear, playerMode, speedLevel]);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* ── Main Canvas Viewport with Retro TV Border ── */}
      <div className="relative w-full max-w-[420px] bg-black rounded-3xl overflow-hidden border-4 border-neutral-800 shadow-2xl">
        {/* Top Control Bar with 1P/2P Mode & Speed Switch */}
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-auto">
          {/* 1P / 2P Mode Toggle Pill */}
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-1 rounded-xl border border-neutral-700 text-[10px] font-mono">
            <button
              onClick={() => {
                setPlayerMode("1P");
                resetGame(true);
              }}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                playerMode === "1P" ? "bg-red-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              1P SOLO
            </button>
            <button
              onClick={() => {
                setPlayerMode("2P");
                resetGame(true);
              }}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1 ${
                playerMode === "2P" ? "bg-emerald-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>2P CO-OP</span>
            </button>
          </div>

          {/* Speed Level & Audio Controls */}
          <div className="flex items-center gap-1.5">
            {/* Chill / Normal Speed Toggle */}
            <button
              onClick={() => setSpeedLevel((s) => (s === "chill" ? "normal" : "chill"))}
              className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold border backdrop-blur-md transition-all cursor-pointer ${
                speedLevel === "chill"
                  ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                  : "bg-neutral-900 border-neutral-700 text-neutral-300"
              }`}
              title="Toggle Game Speed"
            >
              {speedLevel === "chill" ? "🍃 SLOW & EASY" : "⚡ NORMAL"}
            </button>

            {/* Sound Toggle */}
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
        </div>

        {/* 60 FPS Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={360}
          className="w-full h-auto block image-rendering-pixelated bg-[#3b82f6]"
        />

        {/* Game Over Modal Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <span className="text-4xl mb-2">💀</span>
            <h2 className="text-2xl font-black font-mono text-red-500 tracking-wider mb-1 uppercase">GAME OVER</h2>
            <p className="text-xs text-neutral-400 font-mono mb-4">
              {playerMode === "1P"
                ? `FINAL SCORE: ${p1Score.toLocaleString()} • COINS: ${p1Coins}`
                : `TEAM SCORE: ${(p1Score + p2Score).toLocaleString()} • P1: ${p1Score} | P2: ${p2Score}`}
            </p>
            <button
              onClick={() => resetGame(true)}
              className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs flex items-center gap-2 shadow-lg shadow-red-600/40 cursor-pointer active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        {/* Stage Clear Modal Screen */}
        {stageClear && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <span className="text-4xl mb-2 animate-bounce">🏰</span>
            <h2 className="text-2xl font-black font-mono text-yellow-400 tracking-wider mb-1 uppercase">
              STAGE CLEAR!
            </h2>
            <p className="text-xs text-emerald-400 font-mono mb-1">
              {playerMode === "2P" && stageClearWinner ? `🏆 ${stageClearWinner.toUpperCase()} REACHED THE FLAGPOLE FIRST!` : "CONGRATULATIONS!"}
            </p>
            <p className="text-xs text-neutral-400 font-mono mb-4">
              {playerMode === "1P"
                ? `TOTAL SCORE: ${p1Score.toLocaleString()} • COINS: ${p1Coins}`
                : `P1 MARIO: ${p1Score} • P2 LUIGI: ${p2Score}`}
            </p>
            <button
              onClick={() => resetGame(true)}
              className="px-6 py-2.5 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-black text-xs flex items-center gap-2 shadow-lg shadow-yellow-500/40 cursor-pointer active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CONTINUE ADVENTURE</span>
            </button>
          </div>
        )}

        {/* ── Mobile Touch Controls (from uploaded reference image) ── */}
        <div className="bg-neutral-950 p-4 border-t-2 border-neutral-800 flex items-center justify-between select-none">
          {/* 2P Mobile Active Controller Selector (when in 2P mode) */}
          {playerMode === "2P" && (
            <div className="absolute top-[370px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/90 px-2 py-1 rounded-full border border-neutral-700 text-[9px] font-mono">
              <span className="text-neutral-400">TOUCH CONTROLS:</span>
              <button
                onClick={() => setActiveMobilePlayer("mario")}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer ${
                  activeMobilePlayer === "mario" ? "bg-red-600 text-white" : "text-neutral-400"
                }`}
              >
                P1 (MARIO)
              </button>
              <button
                onClick={() => setActiveMobilePlayer("luigi")}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer ${
                  activeMobilePlayer === "luigi" ? "bg-emerald-600 text-white" : "text-neutral-400"
                }`}
              >
                P2 (LUIGI)
              </button>
            </div>
          )}

          {/* D-Pad Buttons: LEFT & RIGHT */}
          <div className="flex items-center gap-3">
            {/* Left Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                if (activeMobilePlayer === "mario") {
                  keysPressed.current["KeyA"] = true;
                  keysPressed.current["ArrowLeft"] = true;
                } else {
                  keysPressed.current["ArrowLeft"] = true;
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["KeyA"] = false;
                keysPressed.current["ArrowLeft"] = false;
              }}
              onPointerLeave={() => {
                keysPressed.current["KeyA"] = false;
                keysPressed.current["ArrowLeft"] = false;
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
                if (activeMobilePlayer === "mario") {
                  keysPressed.current["KeyD"] = true;
                  keysPressed.current["ArrowRight"] = true;
                } else {
                  keysPressed.current["ArrowRight"] = true;
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["KeyD"] = false;
                keysPressed.current["ArrowRight"] = false;
              }}
              onPointerLeave={() => {
                keysPressed.current["KeyD"] = false;
                keysPressed.current["ArrowRight"] = false;
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
                handleFireball(activeMobilePlayer);
                keysPressed.current["ShiftLeft"] = true;
                keysPressed.current["Enter"] = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                keysPressed.current["ShiftLeft"] = false;
                keysPressed.current["Enter"] = false;
              }}
              onPointerLeave={() => {
                keysPressed.current["ShiftLeft"] = false;
                keysPressed.current["Enter"] = false;
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
                handleJumpPress(activeMobilePlayer);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (activeMobilePlayer === "mario") p1Ref.current.isJumping = false;
                else p2Ref.current.isJumping = false;
              }}
              className="w-18 h-18 rounded-full bg-[#dc2626] border-4 border-[#ef4444] active:scale-95 flex items-center justify-center text-white font-mono font-black text-xs uppercase shadow-2xl shadow-red-500/30 transition-transform cursor-pointer tracking-wider"
              title="Jump"
            >
              JUMP
            </button>
          </div>
        </div>

        {/* Quick Keyboard Instructions Bar */}
        <div className="bg-black/90 px-4 py-2 text-[9px] font-mono text-neutral-400 text-center border-t border-neutral-900 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold">P1 (Mario):</span>
            <span>[A/D] Walk</span>
            <span>•</span>
            <span>[W/Space] Jump</span>
            <span>•</span>
            <span>[F/Shift] Fire</span>
          </div>
          {playerMode === "2P" && (
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span>P2 (Luigi):</span>
              <span className="text-neutral-300">[←/→] Walk</span>
              <span>•</span>
              <span className="text-neutral-300">[↑] Jump</span>
              <span>•</span>
              <span className="text-neutral-300">[Enter] Fire</span>
              <span>•</span>
              <span className="text-cyan-400">(Or Buddy AI Assist)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
