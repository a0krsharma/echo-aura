"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  createArcadeMatch,
  subscribeArcadeMatch,
  joinArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";

// Game Components
import SubwaySurferGame from "@/app/components/arcade/SubwaySurferGame";
import HillClimbRacingGame from "@/app/components/arcade/HillClimbRacingGame";
import FruitNinjaGame from "@/app/components/arcade/FruitNinjaGame";
import Connect4Game from "@/app/components/arcade/Connect4Game";
import ChessGame from "@/app/components/arcade/ChessGame";
import LudoGame from "@/app/components/arcade/LudoGame";
import UnoGame from "@/app/components/arcade/UnoGame";
import PoolGame from "@/app/components/arcade/PoolGame";
import CarromGame from "@/app/components/arcade/CarromGame";
import GlowHockeyGame from "@/app/components/arcade/GlowHockeyGame";
import SnakesArenaGame from "@/app/components/arcade/SnakesArenaGame";
import FruitMergeGame from "@/app/components/arcade/FruitMergeGame";
import CandyMatchGame from "@/app/components/arcade/CandyMatchGame";
import NutsAndBoltsGame from "@/app/components/arcade/NutsAndBoltsGame";
import Game2048 from "@/app/components/arcade/Game2048";
import WordleGame from "@/app/components/arcade/WordleGame";
import SnakeGame from "@/app/components/arcade/SnakeGame";
import PingPongGame from "@/app/components/arcade/PingPongGame";
import DartsGame from "@/app/components/arcade/DartsGame";
import KnifeThrowerGame from "@/app/components/arcade/KnifeThrowerGame";
import BottleShooterGame from "@/app/components/arcade/BottleShooterGame";
import DotsAndBoxesGame from "@/app/components/arcade/DotsAndBoxesGame";
import SnakesLaddersGame from "@/app/components/arcade/SnakesLaddersGame";

import {
  X,
  ArrowLeft,
  Gamepad2,
  Users,
  Trophy,
  Sparkles,
  Search,
  Bot,
  Play,
  Share2,
  Volume2,
  RotateCcw,
  Zap,
} from "lucide-react";

export interface SpaceArcadeGameDef {
  id: ArcadeGameType | "retro_invaders";
  name: string;
  category: "ACTION" | "BOARD" | "CARDS" | "PUZZLE";
  icon: string;
  description: string;
  players: string;
  color: string;
  badge?: string;
}

export const SPACE_ARCADE_GAMES: SpaceArcadeGameDef[] = [
  // 🛹 Action & Runner
  {
    id: "subway_surfer",
    name: "Subway Surfers",
    category: "ACTION",
    icon: "🛹",
    description: "3D canvas endless track runner with barrier dodging & gold coin multiplier.",
    players: "1-4 Players",
    color: "#0284c7",
    badge: "POPULAR",
  },
  {
    id: "hill_climb",
    name: "Hill Climb Racing",
    category: "ACTION",
    icon: "🚗",
    description: "2D physics jeep climbing steep bouncy hills with torque control & gas fuel.",
    players: "1-4 Players",
    color: "#eab308",
    badge: "HOT",
  },
  {
    id: "fruit_ninja",
    name: "Fruit Ninja",
    category: "ACTION",
    icon: "🍉",
    description: "Juicy blade slicing frenzy with combos, slow-motion bananas & bomb traps.",
    players: "1-2 Players",
    color: "#22c55e",
    badge: "CLASSIC",
  },
  {
    id: "snakes",
    name: "Snakes Arena",
    category: "ACTION",
    icon: "🐍",
    description: "Multiplayer slither arena! Consume orbs, encircle rivals & dominate floor.",
    players: "1-8 Players",
    color: "#10b981",
  },
  {
    id: "ping_pong",
    name: "Arcade Ping Pong",
    category: "ACTION",
    icon: "🏓",
    description: "High-speed table tennis rally with spin shots & angle deflection.",
    players: "2 Players",
    color: "#06b6d4",
  },
  {
    id: "darts",
    name: "Target Darts",
    category: "ACTION",
    icon: "🎯",
    description: "Precision dart throwing towards the 50-point bullseye.",
    players: "2 Players",
    color: "#ef4444",
  },
  {
    id: "knife_thrower",
    name: "Knife Thrower",
    category: "ACTION",
    icon: "🔪",
    description: "Fast-paced blade flinging into rotating logs without colliding.",
    players: "1-2 Players",
    color: "#f97316",
  },
  {
    id: "bottle_shooter",
    name: "Bottle Shooter",
    category: "ACTION",
    icon: "🍾",
    description: "Western target range: shatter flying glass bottles before time expires.",
    players: "1-2 Players",
    color: "#64748b",
  },
  {
    id: "retro_invaders",
    name: "Space Invaders 8-Bit",
    category: "ACTION",
    icon: "👾",
    description: "Retro 8-bit laser shooter arcade cabinet with pixel invaders & score tracker.",
    players: "1 Player",
    color: "#818cf8",
  },

  // ♟️ Board & Strategy
  {
    id: "connect4",
    name: "Connect 4",
    category: "BOARD",
    icon: "🔵",
    description: "Classic vertical 4-in-a-row tactical token drop duel.",
    players: "2 Players",
    color: "#38bdf8",
    badge: "PvP DUEL",
  },
  {
    id: "chess",
    name: "Grandmaster Chess",
    category: "BOARD",
    icon: "♟️",
    description: "Turn-based chess with legal move highlights, check & checkmate detection.",
    players: "2 Players",
    color: "#f59e0b",
  },
  {
    id: "ludo",
    name: "Ludo Club Party",
    category: "BOARD",
    icon: "🎲",
    description: "4-player token race with custom dice rolls, safe stars & knockout rules.",
    players: "2-4 Players",
    color: "#f43f5e",
    badge: "4 PLAYERS",
  },
  {
    id: "pool",
    name: "8-Ball Billiards",
    category: "BOARD",
    icon: "🎱",
    description: "Realistic cue ball physics, pocket targeting & solid/stripe tournament.",
    players: "2 Players",
    color: "#14b8a6",
  },
  {
    id: "carrom",
    name: "Carrom Board",
    category: "BOARD",
    icon: "⚪",
    description: "Classic striker board with smooth rebounds, carrom men & queen cover.",
    players: "2 Players",
    color: "#d97706",
  },
  {
    id: "glow_hockey",
    name: "Glow Air Hockey",
    category: "BOARD",
    icon: "🏒",
    description: "Hyper-speed neon air hockey table with paddle physics & sound synth pucks.",
    players: "2 Players",
    color: "#a855f7",
  },
  {
    id: "dots_and_boxes",
    name: "Dots and Boxes",
    category: "BOARD",
    icon: "🔲",
    description: "Connect grid dots to capture territorial squares and score combos.",
    players: "2 Players",
    color: "#06b6d4",
  },
  {
    id: "snakes_and_ladders",
    name: "Snakes & Ladders",
    category: "BOARD",
    icon: "🪜",
    description: "Roll dice to climb ladders and avoid giant sliding snakes to reach 100.",
    players: "2-4 Players",
    color: "#84cc16",
  },

  // 🃏 Cards & Party
  {
    id: "uno",
    name: "Uno Card Party",
    category: "CARDS",
    icon: "🔴",
    description: "Wild cards, Draw-4 penalties, Skips and Reverse cards with friends.",
    players: "2-4 Players",
    color: "#ec4899",
    badge: "FAVORITE",
  },

  // 🧩 Puzzles & Chill
  {
    id: "fruit_merge",
    name: "Fruit Merge (Suika)",
    category: "PUZZLE",
    icon: "🍒",
    description: "Drop fruits to merge matching pairs into giant watermelon explosions!",
    players: "1-2 Players",
    color: "#fb7185",
  },
  {
    id: "candy_match",
    name: "Candy Match 3",
    category: "PUZZLE",
    icon: "🍬",
    description: "Match 3 colorful candies to trigger sweet chain reaction explosions.",
    players: "1-2 Players",
    color: "#f472b6",
  },
  {
    id: "nuts_and_bolts",
    name: "Nuts & Bolts Puzzle",
    category: "PUZZLE",
    icon: "🔩",
    description: "Unscrew metal pins and plates in sequence to drop heavy mechanical iron.",
    players: "1 Player",
    color: "#94a3b8",
  },
  {
    id: "2048",
    name: "2048 Number Merge",
    category: "PUZZLE",
    icon: "🔢",
    description: "Slide numbered tiles to merge powers of 2 all the way to 2048!",
    players: "1 Player",
    color: "#eab308",
  },
  {
    id: "wordle",
    name: "Wordle Guess",
    category: "PUZZLE",
    icon: "🟩",
    description: "Guess the hidden 5-letter word with green & yellow tile clues.",
    players: "1-2 Players",
    color: "#22c55e",
  },
  {
    id: "snake",
    name: "Retro Classic Snake",
    category: "PUZZLE",
    icon: "🐍",
    description: "Collect apples, steer without crashing into your own growing tail.",
    players: "1 Player",
    color: "#10b981",
  },
];

interface SpaceArcadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onUpdateStatus?: (status: string) => void;
  onSendSpeech?: (text: string) => void;
}

export default function SpaceArcadeModal({
  isOpen,
  onClose,
  spaceId,
  localAvatar,
  remoteAvatars,
  onUpdateStatus,
  onSendSpeech,
}: SpaceArcadeModalProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGame, setActiveGame] = useState<SpaceArcadeGameDef | null>(null);

  // Active match data
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ArcadeMatch | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  // 👾 Retro Space Invaders Canvas State (for retro_invaders)
  const retroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [retroScore, setRetroScore] = useState(0);
  const [retroGameOver, setRetroGameOver] = useState(false);
  const retroState = useRef<{
    playerX: number;
    lasers: Array<{ x: number; y: number }>;
    invaders: Array<{ x: number; y: number; vx: number; alive: boolean }>;
    keys: Record<string, boolean>;
    score: number;
  }>({
    playerX: 200,
    lasers: [],
    invaders: [],
    keys: {},
    score: 0,
  });

  // Find friends sitting nearby or on the same rug
  const seatedFriends = remoteAvatars.filter((av) => {
    if (localAvatar.activeRugId && av.activeRugId === localAvatar.activeRugId) {
      return true;
    }
    const dist = Math.hypot(localAvatar.x - av.x, localAvatar.y - av.y);
    return dist <= 280 && av.isSitting;
  });

  // Subscribe to match if playing
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setActiveMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  // Clean up on close
  const handleClose = () => {
    setActiveGame(null);
    setActiveMatchId(null);
    setActiveMatch(null);
    onUpdateStatus?.("Online");
    onClose();
  };

  // Launch a game
  const handleLaunchGame = async (
    gameDef: SpaceArcadeGameDef,
    mode: "MULTIPLAYER" | "VS_COMPUTER" = "MULTIPLAYER"
  ) => {
    spacesSfx.playKeyNote(4);
    setActiveGame(gameDef);
    onUpdateStatus?.(`🎮 Playing ${gameDef.name}`);
    onSendSpeech?.(`🎮 Seated at Arcade: Playing ${gameDef.name}!`);

    if (gameDef.id === "retro_invaders") {
      // Launch 8-bit canvas
      initRetroInvaders();
      return;
    }

    if (!user) return;
    setIsCreatingMatch(true);

    try {
      let maxPlayers = 2;
      if (gameDef.players.includes("4")) maxPlayers = 4;
      else if (gameDef.players.includes("8")) maxPlayers = 8;
      else if (gameDef.players.includes("1 Player")) maxPlayers = 1;

      const hasFriendsSeated = seatedFriends.length > 0;
      const actualMode = maxPlayers === 1 ? "MULTIPLAYER" : hasFriendsSeated ? "MULTIPLAYER" : "VS_COMPUTER";

      const matchId = await createArcadeMatch({
        gameType: gameDef.id as ArcadeGameType,
        title: `${gameDef.name} @ Lounge Table`,
        hostUid: user.uid,
        hostHandle: user.handle || "@EXPLORER",
        hostAvatar: user.photoUrl || user.photoURL,
        mode: actualMode,
        maxPlayers,
        enableVoice: false, // Voice is handled continuously by Echo Spaces Agora proximity!
        stakes: 0,
        difficulty: "MEDIUM",
      });

      setActiveMatchId(matchId);
    } catch (e) {
      console.warn("Error creating match:", e);
    } finally {
      setIsCreatingMatch(false);
    }
  };

  // 👾 Retro Space Invaders logic
  const initRetroInvaders = () => {
    const invs: Array<{ x: number; y: number; vx: number; alive: boolean }> = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        invs.push({
          x: 40 + c * 48,
          y: 40 + r * 36,
          vx: 1.2,
          alive: true,
        });
      }
    }
    retroState.current = {
      playerX: 200,
      lasers: [],
      invaders: invs,
      keys: {},
      score: 0,
    };
    setRetroScore(0);
    setRetroGameOver(false);
  };

  // Run Retro Invaders Canvas loop
  useEffect(() => {
    if (activeGame?.id !== "retro_invaders") return;
    let animId: number;
    const canvas = retroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      retroState.current.keys[e.key.toLowerCase()] = true;
      if (e.key === " " && !retroGameOver) {
        e.preventDefault();
        retroState.current.lasers.push({
          x: retroState.current.playerX + 15,
          y: 310,
        });
        spacesSfx.playArcadeLaser();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      retroState.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const loop = () => {
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, 400, 360);

      // Starfield
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      for (let i = 0; i < 20; i++) {
        const sx = (i * 37) % 400;
        const sy = (i * 49 + performance.now() * 0.05) % 360;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      if (!retroGameOver) {
        if (retroState.current.keys["arrowleft"] || retroState.current.keys["a"]) {
          retroState.current.playerX = Math.max(10, retroState.current.playerX - 4);
        }
        if (retroState.current.keys["arrowright"] || retroState.current.keys["d"]) {
          retroState.current.playerX = Math.min(360, retroState.current.playerX + 4);
        }

        // Move lasers
        retroState.current.lasers.forEach((l) => (l.y -= 7));
        retroState.current.lasers = retroState.current.lasers.filter((l) => l.y > 0);

        // Move invaders
        let changeDir = false;
        retroState.current.invaders.forEach((inv) => {
          if (!inv.alive) return;
          inv.x += inv.vx;
          if (inv.x < 15 || inv.x > 365) changeDir = true;
        });

        if (changeDir) {
          retroState.current.invaders.forEach((inv) => {
            inv.vx = -inv.vx * 1.05;
            inv.y += 12;
            if (inv.y >= 300 && inv.alive) setRetroGameOver(true);
          });
        }

        // Collision
        retroState.current.lasers.forEach((l) => {
          retroState.current.invaders.forEach((inv) => {
            if (
              inv.alive &&
              l.x >= inv.x - 8 &&
              l.x <= inv.x + 28 &&
              l.y >= inv.y - 8 &&
              l.y <= inv.y + 24
            ) {
              inv.alive = false;
              l.y = -100;
              retroState.current.score += 25;
              setRetroScore(retroState.current.score);
              spacesSfx.playArcadeExplosion();
            }
          });
        });
      }

      // Draw Invaders
      retroState.current.invaders.forEach((inv) => {
        if (!inv.alive) return;
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(inv.x, inv.y, 22, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(inv.x + 4, inv.y + 4, 4, 4);
        ctx.fillRect(inv.x + 14, inv.y + 4, 4, 4);
      });

      // Draw Lasers
      ctx.fillStyle = "#f43f5e";
      retroState.current.lasers.forEach((l) => {
        ctx.fillRect(l.x, l.y, 3, 10);
      });

      // Draw Player Ship
      const px = retroState.current.playerX;
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(px + 16, 310);
      ctx.lineTo(px, 335);
      ctx.lineTo(px + 32, 335);
      ctx.closePath();
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [activeGame?.id, retroGameOver]);

  if (!isOpen) return null;

  // Filter games by category & search
  const filteredGames = SPACE_ARCADE_GAMES.filter((g) => {
    const matchesCat = selectedCategory === "ALL" || g.category === selectedCategory;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[820px] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* ── TOP HEADER BAR ── */}
        <header className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            {activeGame ? (
              <button
                onClick={() => {
                  setActiveGame(null);
                  setActiveMatchId(null);
                  setActiveMatch(null);
                  onUpdateStatus?.("Online");
                  spacesSfx.playKeyNote(2);
                }}
                className="p-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1 text-xs font-mono transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">ARCADE LOBBY</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                    <span>ECHO ARCADE LOUNGE</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-[10px]">
                      24 GAMES
                    </span>
                  </h2>
                </div>
              </div>
            )}

            {activeGame && (
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeGame.icon}</span>
                <span className="text-sm font-bold font-mono text-white">{activeGame.name}</span>
              </div>
            )}
          </div>

          {/* Seated Table Presence & Proximity Voice Notice */}
          <div className="flex items-center gap-3">
            {/* Seated Friends Chips */}
            <div className="hidden md:flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1 rounded-2xl border border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>AT TABLE:</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/40 text-[10px] font-mono font-bold text-cyan-300">
                  You ({localAvatar.handle})
                </span>
                {seatedFriends.map((f) => (
                  <span
                    key={f.uid}
                    className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1"
                  >
                    <span>{f.handle}</span>
                    <Volume2 className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  </span>
                ))}
              </div>
            </div>

            {/* Invite Friends Button */}
            <button
              onClick={() => {
                spacesSfx.playKeyNote(5);
                onSendSpeech?.("🎮 Hey everyone, let's play arcade games at the lounge table!");
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono transition-all cursor-pointer"
              title="Broadcast invitation to space"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Call to Table</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-neutral-950 via-neutral-900/40 to-neutral-950 scrollbar-none">
          {activeGame ? (
            /* ── IN-GAME PLAYING CONTAINER ── */
            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
              {/* 👾 1. Retro Space Invaders */}
              {activeGame.id === "retro_invaders" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-between w-full max-w-[400px] font-mono text-xs">
                    <span className="text-cyan-400 font-bold">SCORE: {retroScore}</span>
                    <span className="text-neutral-400">[A, D] / Arrows to Move • [SPACE] to Fire</span>
                  </div>
                  <canvas
                    ref={retroCanvasRef}
                    width={400}
                    height={360}
                    className="rounded-2xl border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.25)] bg-neutral-950"
                  />
                  {retroGameOver && (
                    <div className="flex items-center gap-3">
                      <span className="text-rose-400 font-mono font-bold text-sm">GAME OVER</span>
                      <button
                        onClick={initRetroInvaders}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>PLAY AGAIN</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 🛹 2. Subway Surfers */}
              {activeGame.id === "subway_surfer" && activeMatch && (
                <div className="w-full max-w-4xl">
                  <SubwaySurferGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                    onBack={() => setActiveGame(null)}
                  />
                </div>
              )}

              {/* 🚗 3. Hill Climb Racing */}
              {activeGame.id === "hill_climb" && activeMatch && (
                <div className="w-full max-w-4xl">
                  <HillClimbRacingGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                    onBack={() => setActiveGame(null)}
                  />
                </div>
              )}

              {/* 🍉 4. Fruit Ninja */}
              {activeGame.id === "fruit_ninja" && activeMatch && (
                <div className="w-full max-w-4xl">
                  <FruitNinjaGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                    onBack={() => setActiveGame(null)}
                  />
                </div>
              )}

              {/* 🔵 5. Connect 4 */}
              {activeGame.id === "connect4" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <Connect4Game
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* ♟️ 6. Chess */}
              {activeGame.id === "chess" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <ChessGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🎲 7. Ludo */}
              {activeGame.id === "ludo" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <LudoGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🔴 8. Uno */}
              {activeGame.id === "uno" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <UnoGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🎱 9. Pool */}
              {activeGame.id === "pool" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <PoolGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* ⚪ 10. Carrom */}
              {activeGame.id === "carrom" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <CarromGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🏒 11. Glow Hockey */}
              {activeGame.id === "glow_hockey" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <GlowHockeyGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🐍 12. Snakes Arena */}
              {activeGame.id === "snakes" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <SnakesArenaGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🍒 13. Fruit Merge */}
              {activeGame.id === "fruit_merge" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <FruitMergeGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🍬 14. Candy Match */}
              {activeGame.id === "candy_match" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <CandyMatchGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🔩 15. Nuts and Bolts */}
              {activeGame.id === "nuts_and_bolts" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <NutsAndBoltsGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🔢 16. 2048 */}
              {activeGame.id === "2048" && activeMatch && (
                <div className="w-full max-w-md">
                  <Game2048
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🟩 17. Wordle */}
              {activeGame.id === "wordle" && activeMatch && (
                <div className="w-full max-w-md">
                  <WordleGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🐍 18. Snake */}
              {activeGame.id === "snake" && activeMatch && (
                <div className="w-full max-w-md">
                  <SnakeGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🏓 19. Ping Pong */}
              {activeGame.id === "ping_pong" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <PingPongGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🎯 20. Darts */}
              {activeGame.id === "darts" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <DartsGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🔪 21. Knife Thrower */}
              {activeGame.id === "knife_thrower" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <KnifeThrowerGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🍾 22. Bottle Shooter */}
              {activeGame.id === "bottle_shooter" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <BottleShooterGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🔲 23. Dots and Boxes */}
              {activeGame.id === "dots_and_boxes" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <DotsAndBoxesGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* 🪜 24. Snakes and Ladders */}
              {activeGame.id === "snakes_and_ladders" && activeMatch && (
                <div className="w-full max-w-3xl">
                  <SnakesLaddersGame
                    match={activeMatch}
                    currentUid={user?.uid || ""}
                    isHost={activeMatch.hostUid === user?.uid}
                  />
                </div>
              )}

              {/* Loading Indicator while creating match */}
              {isCreatingMatch && (
                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-cyan-300">
                    Connecting live arcade match for space table...
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* ── GAME CATALOG BROWSER ── */
            <div className="space-y-6">
              {/* Seated Table Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-cyan-950/20 to-neutral-900 border border-neutral-800 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xl">
                    🪑
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold font-mono text-white flex items-center gap-2">
                      <span>Virtual Arcade Table</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-normal">
                        Spatial Voice Connected
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {seatedFriends.length > 0
                        ? `You are sitting with ${seatedFriends.map((f) => f.handle).join(", ")}. Launch any game to play together!`
                        : "Sit at the lounge table with friends to play multiplayer, or enjoy solo vs AI!"}
                    </p>
                  </div>
                </div>

                {seatedFriends.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {seatedFriends.length + 1} Seated Players Ready
                    </span>
                  </div>
                )}
              </div>

              {/* Category Filter Pills & Search */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {[
                    { id: "ALL", label: "All Games", icon: "🕹️" },
                    { id: "ACTION", label: "Action & Runner", icon: "⚡" },
                    { id: "BOARD", label: "Board & Strategy", icon: "♟️" },
                    { id: "CARDS", label: "Cards & Party", icon: "🃏" },
                    { id: "PUZZLE", label: "Puzzles & Chill", icon: "🧩" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        spacesSfx.playKeyNote(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search arcade..."
                    className="bg-transparent text-xs font-mono text-white placeholder-neutral-500 outline-none w-full"
                  />
                </div>
              </div>

              {/* Game Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="group relative p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900 transition-all shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
                            {game.icon}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                              {game.name}
                            </h4>
                            <span className="text-[10px] font-mono text-neutral-500">
                              {game.players}
                            </span>
                          </div>
                        </div>

                        {game.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono font-bold text-amber-300">
                            {game.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-400 font-sans mt-2.5 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    {/* Launch Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60">
                      {seatedFriends.length > 0 ? (
                        <button
                          onClick={() => handleLaunchGame(game, "MULTIPLAYER")}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>PLAY WITH SEATED FRIENDS</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleLaunchGame(game, "MULTIPLAYER")}
                            className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>PLAY NOW</span>
                          </button>
                          <button
                            onClick={() => handleLaunchGame(game, "VS_COMPUTER")}
                            className="p-2 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
                            title="Play Solo vs Neural AI Bot"
                          >
                            <Bot className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
