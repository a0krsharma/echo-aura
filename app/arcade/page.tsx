"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import { findOrJoinQueue } from "@/lib/arcadeQueue";
import {
  createArcadeMatch,
  joinArcadeMatch,
  rematchArcadeMatch,
  subscribeArcadeMatch,
  subscribeLobbyArcadeMatches,
  deleteArcadeMatch,
  leaveArcadeMatch,
  processWagerPayouts,
  addGhostParticipantToMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import MicrophoneSoundCheckModal from "@/app/components/MicrophoneSoundCheckModal";
import ArcadeVoiceChannel from "@/app/components/arcade/ArcadeVoiceChannel";
import AntakshariGame from "@/app/components/arcade/AntakshariGame";
import VoicePartyGame from "@/app/components/arcade/VoicePartyGame";
import MelodyBuzzerGame from "@/app/components/arcade/MelodyBuzzerGame";
import TwoTruthsGame from "@/app/components/arcade/TwoTruthsGame";
import PitchArenaGame from "@/app/components/arcade/PitchArenaGame";
import LudoGame from "@/app/components/arcade/LudoGame";
import ChessGame from "@/app/components/arcade/ChessGame";
import Connect4Game from "@/app/components/arcade/Connect4Game";
import SudokuGame from "@/app/components/arcade/SudokuGame";
import Game2048 from "@/app/components/arcade/Game2048";
import WordleGame from "@/app/components/arcade/WordleGame";
import SnakeGame from "@/app/components/arcade/SnakeGame";
import PoolGame from "@/app/components/arcade/PoolGame";
import CarromGame from "@/app/components/arcade/CarromGame";
import GlowHockeyGame from "@/app/components/arcade/GlowHockeyGame";
import DotsAndBoxesGame from "@/app/components/arcade/DotsAndBoxesGame";
import SnakesLaddersGame from "@/app/components/arcade/SnakesLaddersGame";
import Puzzle15Game from "@/app/components/arcade/Puzzle15Game";
import PokerGame from "@/app/components/arcade/PokerGame";
import BlackjackGame from "@/app/components/arcade/BlackjackGame";
import UnoGame from "@/app/components/arcade/UnoGame";
import RummyGame from "@/app/components/arcade/RummyGame";
import CallBreakGame from "@/app/components/arcade/CallBreakGame";
import TeenPattiGame from "@/app/components/arcade/TeenPattiGame";
import CheatBluffGame from "@/app/components/arcade/CheatBluffGame";
import SkribblGame from "@/app/components/arcade/SkribblGame";
import RajaMantriGame from "@/app/components/arcade/RajaMantriGame";
import HandCricketGame from "@/app/components/arcade/HandCricketGame";
import BookCricketGame from "@/app/components/arcade/BookCricketGame";
import BingoGame from "@/app/components/arcade/BingoGame";
import NPATGame from "@/app/components/arcade/NPATGame";
import HangmanGame from "@/app/components/arcade/HangmanGame";
import MathBlitzGame from "@/app/components/arcade/MathBlitzGame";
import BattleshipGame from "@/app/components/arcade/BattleshipGame";
import MonopolyGame from "@/app/components/arcade/MonopolyGame";
import ArcadeInviteModal from "@/app/components/arcade/ArcadeInviteModal";
import ArcadeCreateModal from "@/app/components/arcade/ArcadeCreateModal";
import ArcadeGameRulesModal from "@/app/components/arcade/ArcadeGameRulesModal";
import ArcadeTournamentBracketModal from "@/app/components/arcade/ArcadeTournamentBracketModal";
import IncomingChallengeListener from "@/app/components/arcade/IncomingChallengeListener";
import {
  Gamepad2,
  Trophy,
  Zap,
  ArrowLeft,
  Share2,
  Trash2,
  HelpCircle,
  Search,
  Users,
  Sparkles,
  X,
  Mic2,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { updateArcadeElo } from "@/lib/userDoc";

type CategoryFilter = "ALL" | "VOICE" | "BOARD" | "PHYSICS" | "CARD" | "PAPER" | "PUZZLE";

interface MasterRankedGame {
  id: ArcadeGameType;
  name: string;
  category: CategoryFilter;
  icon: string;
  description: string;
}

const CLEAN_GAMES: MasterRankedGame[] = [
  // ── 🎙️ Voice Party & Antakshari (Live Mic Games) ──
  { id: "antakshari", name: "Bollywood Antakshari", category: "VOICE", icon: "🎶", description: "Sing hit songs on mic with Hindi letter wheel, turn timer & audience cheer jury" },
  { id: "courtroom_debate", name: "Voice Courtroom Debate", category: "VOICE", icon: "⚖️", description: "Accuser vs Defender with Judge gavel soundboard and jury verdict voting" },
  { id: "news_anchor", name: "9 PM News Anchor Clash", category: "VOICE", icon: "📰", description: "The Nation Wants To Know! Aggressive prime-time news debate with breaking tickers" },
  { id: "singer_roleplay", name: "Singer Roleplay Battle", category: "VOICE", icon: "🎤", description: "Sing hit tracks in hilarious singer voices (Arijit, Honey Singh, Jagjit Ghazal, Alka)" },
  { id: "mushaira", name: "Desi Mushaira & Shayari", category: "VOICE", icon: "📜", description: "Royal Urdu/Hindi poetry slam with live Wah-Wah and Irshaad reaction cheers" },
  { id: "tone_shift", name: "Tone-Shift Dialogue Clash", category: "VOICE", icon: "🎭", description: "Deliver iconic dialogues in contradictory funny emotions (Mogambo crying, Pushpa polite)" },
  { id: "melody_buzzer", name: "Hum & Whistle (Melody Relay)", category: "VOICE", icon: "🎵", description: "Hum or whistle secret Bollywood hits on mic; room members smash the speed buzzer to guess" },
  { id: "two_truths", name: "Two Truths & A Lie", category: "VOICE", icon: "🤫", description: "Voice party bluffing with live jury voting and truth reveal" },
  { id: "pitch_arena", name: "Pitch Arena / Shark Mic", category: "VOICE", icon: "🎙️", description: "60-second crazy startup & product improv battle on live microphone" },

  // ── 🎲 Board & Tactical Strategy ──
  { id: "ludo", name: "Ludo 3D", category: "BOARD", icon: "🎲", description: "World-class 3D wooden board & dice" },
  { id: "carrom", name: "Championship Carrom", category: "PHYSICS", icon: "⚪", description: "19-piece tournament rack with real physics" },
  { id: "pool", name: "Pool (8-Ball, 9-Ball, 10-Ball, 14.1, 1-Pocket)", category: "PHYSICS", icon: "🎱", description: "Top 5 disciplines: 8-Ball, 9-Ball, 10-Ball, Straight Pool 14.1, and One Pocket" },
  { id: "glow_hockey", name: "Glow Hockey Pro", category: "PHYSICS", icon: "⚡", description: "Cyberpunk 2D air hockey with neon sparks" },
  { id: "chess", name: "Grandmaster Chess", category: "BOARD", icon: "♟️", description: "3D luxury walnut & Staunton piece chess" },
  { id: "connect4", name: "Connect 4 Arena", category: "BOARD", icon: "🔴", description: "3D upright arcade grid with gravity drop" },
  { id: "snakes_and_ladders", name: "Snakes & Ladders", category: "BOARD", icon: "🪜", description: "3D golden ladders, snakes & ivory dice" },
  { id: "dots_and_boxes", name: "Dots & Boxes", category: "BOARD", icon: "🕸️", description: "Tactical line-drawing box capture" },
  { id: "battleship", name: "Naval Battleship", category: "BOARD", icon: "🎯", description: "3D holographic radar fleet combat" },
  { id: "monopoly", name: "Monopoly Real Estate", category: "BOARD", icon: "🎩", description: "Official 40-tile tournament real estate with 32-house lock & Markov ROI" },

  // ── ♠️ Casino, Card & Bluffing ──
  { id: "uno", name: "Uno Royale", category: "CARD", icon: "🎴", description: "Fast card matching & wild draw penalties" },
  { id: "teen_patti", name: "Royal Teen Patti", category: "CARD", icon: "👑", description: "3D casino felt 3-card flush & blind chaal" },
  { id: "poker", name: "Texas Hold'em Poker", category: "CARD", icon: "♦️", description: "3D casino felt with community board & pot" },
  { id: "blackjack", name: "Blackjack 21", category: "CARD", icon: "♣️", description: "Hit, stand, double down vs AI dealer" },
  { id: "rummy", name: "Indian Rummy", category: "CARD", icon: "🃏", description: "13-card pure sequences & sets" },
  { id: "call_break", name: "Call Break", category: "CARD", icon: "♠️", description: "4-player strategic spades bidding" },
  { id: "cheat_bluff", name: "Cheat / Bluff", category: "CARD", icon: "🚨", description: "Call out liars or bluff your cards away" },

  // ── 👑 Paper, Party & Desi Nostalgia ──
  { id: "raja_mantri", name: "Raja Mantri Chor Sipahi", category: "PAPER", icon: "🤴", description: "Classic 4-role royal bluff game" },
  { id: "hand_cricket", name: "Hand Cricket", category: "PAPER", icon: "🏏", description: "Odd-even fingers run-scoring duel" },
  { id: "book_cricket", name: "Book Cricket", category: "PAPER", icon: "📖", description: "Page-flipping score chase" },
  { id: "bingo", name: "Bingo 5x5", category: "PAPER", icon: "🔢", description: "Number matrix line completion" },
  { id: "npat", name: "Name Place Animal Thing", category: "PAPER", icon: "📝", description: "Speed vocabulary category challenge" },
  { id: "skribbl", name: "Skribbl Drawing", category: "PAPER", icon: "🎨", description: "Live canvas drawing & guessing" },

  // ── 🧩 Solo Puzzles & Logic ──
  { id: "snake", name: "Retro Snake", category: "PUZZLE", icon: "🐍", description: "Classic arcade apple eating snake" },
  { id: "2048", name: "2048 Fusion", category: "PUZZLE", icon: "🔢", description: "Tile-sliding number addition" },
  { id: "wordle", name: "Wordle Cyber", category: "PUZZLE", icon: "🔐", description: "5-letter word deduction in 6 tries" },
  { id: "sudoku", name: "Master Sudoku", category: "PUZZLE", icon: "🧩", description: "9x9 logical number placement" },
  { id: "puzzle15", name: "15 Puzzle", category: "PUZZLE", icon: "🔢", description: "Sliding tile number ordering" },
  { id: "hangman", name: "Hangman", category: "PUZZLE", icon: "🔤", description: "Save the stickman with letter guesses" },
  { id: "math_blitz", name: "Math Blitz", category: "PUZZLE", icon: "⚡", description: "High-speed mental arithmetic test" },
];

function ArcadeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeMatch, setActiveMatch] = useState<ArcadeMatch | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [lobbyMatches, setLobbyMatches] = useState<ArcadeMatch[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultGameType, setDefaultGameType] = useState<ArcadeGameType>("antakshari");
  const [inviteModalMatch, setInviteModalMatch] = useState<ArcadeMatch | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesModalGameType, setRulesModalGameType] = useState<string>("antakshari");
  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [initialTournamentId, setInitialTournamentId] = useState<string | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [botDifficultyModalOpen, setBotDifficultyModalOpen] = useState(false);
  const [pendingBotGameType, setPendingBotGameType] = useState<ArcadeGameType | null>(null);

  const [soundCheckOpen, setSoundCheckOpen] = useState(false);
  const [ghostTimerSec, setGhostTimerSec] = useState<number | null>(null);

  const rtcClient = useMemo(() => {
    return AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });
  }, [activeMatchId]);
  const [rawMicStream, setRawMicStream] = useState<MediaStream | null>(null);

  // 1. Zero-Install Deep Links Engine (Under 2 seconds auto-mount)
  useEffect(() => {
    const paramMatchId = searchParams.get("matchId") || searchParams.get("join");
    if (paramMatchId) {
      setActiveMatchId(paramMatchId);
    }
    const paramTourId = searchParams.get("tournamentId");
    if (paramTourId) {
      setInitialTournamentId(paramTourId);
      setTournamentModalOpen(true);
    }
    const paramGame = searchParams.get("game") || searchParams.get("gameType");
    const isChallenger = searchParams.get("challenger") === "true";
    if (paramGame && !paramMatchId && user) {
      const matchedGame = CLEAN_GAMES.find((g) => g.id === paramGame.toLowerCase());
      if (matchedGame) {
        handleOpenCreate(matchedGame.id);
      }
    }
  }, [searchParams, user]);

  // 2. Ghost Participant Fallback Engine (Activates within 3.5s if solo in multiplayer)
  useEffect(() => {
    if (!activeMatch || activeMatch.mode === "VS_COMPUTER" || activeMatch.status !== "WAITING") {
      setGhostTimerSec(null);
      return;
    }
    const playerCount = Object.keys(activeMatch.players || {}).length;
    if (playerCount === 1 && activeMatch.hostUid === user?.uid) {
      setGhostTimerSec(4);
      const interval = setInterval(() => {
        setGhostTimerSec((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            addGhostParticipantToMatch(activeMatch.id).catch(console.warn);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setGhostTimerSec(null);
    }
  }, [activeMatch?.id, activeMatch?.status, activeMatch?.players, activeMatch?.hostUid, user?.uid]);

  // Subscribe to active match if playing
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setActiveMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  // Microphone capturing for Voice Channels
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeMatch && activeMatch.enableVoice && user) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          setRawMicStream(s);
          stream = s;
        })
        .catch(console.error);
    } else {
      setRawMicStream(null);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [activeMatch?.id, activeMatch?.enableVoice, user]);

  // Auto-join if opened via invite link and authenticated
  useEffect(() => {
    if (
      activeMatch &&
      user &&
      !activeMatch.players?.[user.uid] &&
      activeMatch.status !== "FINISHED"
    ) {
      const currentCount = Object.keys(activeMatch.players || {}).length;
      if (currentCount < (activeMatch.maxPlayers || 4)) {
        handleJoinMatch(activeMatch.id);
      }
    }
  }, [activeMatch, user]);

  // Subscribe to open arcade matches in the lobby
  useEffect(() => {
    const unsub = subscribeLobbyArcadeMatches((matches) => {
      setLobbyMatches(matches);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleOpenCreate = (type: ArcadeGameType) => {
    setDefaultGameType(type);
    setCreateModalOpen(true);
  };

  const handleOpenRules = (gameId: string) => {
    setRulesModalGameType(gameId);
    setRulesModalOpen(true);
  };

  const handleOpenBotDifficulty = (gameId: ArcadeGameType) => {
    setPendingBotGameType(gameId);
    setBotDifficultyModalOpen(true);
  };

  const handleLaunchSolo = async (
    type: ArcadeGameType,
    difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"
  ) => {
    if (!user) return;
    try {
      let maxPlayers = 2;
      if (
        type === "ludo" ||
        type === "call_break" ||
        type === "raja_mantri" ||
        type === "antakshari" ||
        type === "melody_buzzer" ||
        type === "two_truths" ||
        type === "pitch_arena" ||
        type === "courtroom_debate" ||
        type === "news_anchor" ||
        type === "singer_roleplay" ||
        type === "mushaira" ||
        type === "tone_shift"
      ) {
        maxPlayers = 4;
      } else if (
        type === "rummy" ||
        type === "teen_patti" ||
        type === "cheat_bluff" ||
        type === "poker"
      ) {
        maxPlayers = 6;
      } else if (
        type === "2048" ||
        type === "snake" ||
        type === "wordle" ||
        type === "puzzle15" ||
        type === "sudoku"
      ) {
        maxPlayers = 1;
      }

      const matchId = await createArcadeMatch({
        gameType: type,
        title: `${type.toUpperCase()} // SOLO VS NEURAL BOT`,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        mode: maxPlayers === 1 ? "MULTIPLAYER" : "VS_COMPUTER",
        maxPlayers,
        enableVoice: false,
        stakes: 0,
        difficulty,
      });
      setActiveMatchId(matchId);
    } catch (e) {
      console.error("Failed to launch solo match:", e);
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    if (!user) return;
    try {
      await joinArcadeMatch(matchId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        avatar: user.photoUrl || user.photoURL,
      });
      setActiveMatchId(matchId);
    } catch (e: any) {
      console.error("Failed to join match:", e);
      setActiveMatchId(matchId);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to terminate and delete this arena lobby?")) {
      await deleteArcadeMatch(matchId);
      setActiveMatchId(null);
      setActiveMatch(null);
    }
  };

  const handleExitActiveMatch = async () => {
    if (!activeMatch) {
      setActiveMatchId(null);
      setActiveMatch(null);
      return;
    }
    const mId = activeMatch.id;
    setActiveMatchId(null);
    setActiveMatch(null);
    if (user) {
      try {
        await leaveArcadeMatch(mId, user.uid);
      } catch (e) {
        console.warn("Failed to clean up match:", e);
      }
    }
  };

  const [isRematching, setIsRematching] = useState(false);

  const handleRematch = async () => {
    if (!activeMatch || !user || isRematching) return;
    try {
      setIsRematching(true);
      const newMatchId = await rematchArcadeMatch(activeMatch, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        avatar: user.photoUrl || user.photoURL,
      });
      setActiveMatchId(newMatchId);
    } catch (e) {
      console.error("Failed to trigger rematch:", e);
    } finally {
      setIsRematching(false);
    }
  };

  // Update Elo once per match on the Winner's client
  const eloUpdatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeMatch?.status === "FINISHED" && activeMatch.winnerUid === user?.uid) {
      if (eloUpdatedRef.current !== activeMatch.id) {
        eloUpdatedRef.current = activeMatch.id;
        const loserUid = Object.keys(activeMatch.players || {}).find(
          (id) => id !== user?.uid && !id.startsWith("bot")
        );
        if (loserUid) {
          if (user) updateArcadeElo(user.uid, loserUid).catch(() => {});
          if (user) processWagerPayouts(activeMatch.id, user.uid).catch(() => {});
        }
      }
    }
  }, [activeMatch?.status, activeMatch?.winnerUid, user?.uid]);

  // Filter games based on search and category
  const filteredGames = useMemo(() => {
    return CLEAN_GAMES.filter((g) => {
      const matchesCategory = activeCategory === "ALL" || g.category === activeCategory;
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white font-mono pb-24 relative">
      {/* ── Top Clean Navigation Bar ── */}
      {/* ── Top Unified Clean Header ── */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        {activeMatch ? (
          /* ── In-Match Header Mode ── */
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleExitActiveMatch}
                className="px-2.5 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs rounded-lg font-bold"
                title="Exit to Echo Club Lobby"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>EXIT</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-lg">
                  {CLEAN_GAMES.find((g) => g.id === activeMatch.gameType)?.icon || "🎮"}
                </span>
                <span className="font-black text-xs sm:text-sm uppercase tracking-wide text-white truncate">
                  {CLEAN_GAMES.find((g) => g.id === activeMatch.gameType)?.name || activeMatch.gameType.toUpperCase()}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold">
                  {activeMatch.mode === "VS_COMPUTER" ? "🤖 VS BOT" : "👥 MULTI"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
              {/* Rematch Button */}
              <button
                type="button"
                onClick={handleRematch}
                disabled={isRematching}
                className={`px-3 py-1.5 border font-black uppercase text-xs transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-sm active:scale-95 ${
                  activeMatch.status === "FINISHED"
                    ? "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300 animate-pulse"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white"
                }`}
                title="Play Again with same players"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRematching ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isRematching ? "REMATCHING..." : "REMATCH"}</span>
              </button>

              {/* Sound Check Button */}
              <button
                type="button"
                onClick={() => setSoundCheckOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 font-bold uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Microphone Sound Check"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">MIC CHECK</span>
              </button>

              {/* Single Rules Button */}
              <button
                type="button"
                onClick={() => handleOpenRules(activeMatch.gameType)}
                className="px-2.5 sm:px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white font-bold uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="View Rules & Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>RULES</span>
              </button>

              {/* Invite Button for Multiplayer */}
              {activeMatch.mode !== "VS_COMPUTER" && (
                <button
                  type="button"
                  onClick={() => setInviteModalMatch(activeMatch)}
                  className="px-3 py-1.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black uppercase text-xs transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-sm active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">INVITE</span>
                </button>
              )}

              {user?.uid === activeMatch.hostUid && (
                <button
                  type="button"
                  onClick={() => handleDeleteMatch(activeMatch.id)}
                  className="p-1.5 border border-red-900 bg-red-950 text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer rounded-lg"
                  title="Delete Match"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* ── Lobby Header Mode ── */
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="px-2.5 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs rounded-lg font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ECHO</span>
              </Link>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center font-black shadow-md">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="font-black text-xs sm:text-sm tracking-wider uppercase text-white truncate">
                    ECHO CLUB
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSoundCheckOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
                title="Microphone Sound Check"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">MIC CHECK</span>
              </button>

              <button
                type="button"
                onClick={() => setTournamentModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-yellow-400 hover:text-yellow-300 font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden md:inline">TOURNAMENT</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRules("antakshari")}
                className="px-2.5 sm:px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>RULES</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreate("antakshari")}
                className="px-3 sm:px-3.5 py-1.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer rounded-lg shadow-md active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>CREATE</span>
              </button>
            </div>
          </>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeMatch ? (
          /* ── Active Game Arena View ── */
          <div className="space-y-4">
            {/* Ghost Participant Fallback Notification Bar */}
            {activeMatch.status === "WAITING" && activeMatch.mode !== "VS_COMPUTER" && Object.keys(activeMatch.players || {}).length < activeMatch.maxPlayers && (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs text-neutral-300 font-sans">
                    {ghostTimerSec !== null ? (
                      <>Waiting for challenger... Auto-dropping <strong>Ghost AI</strong> in <strong>{ghostTimerSec}s</strong> so the room never stays dead.</>
                    ) : (
                      <>Awaiting opponent to join...</>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => addGhostParticipantToMatch(activeMatch.id)}
                  className="px-3 py-1 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm shrink-0"
                >
                  🤖 DROP GHOST AI NOW
                </button>
              </div>
            )}

            {/* Universal Match Finished & Rematch Bar */}
            {activeMatch.status === "FINISHED" && (
              <div className="border-2 border-emerald-400 bg-gradient-to-r from-emerald-950/80 via-black to-neutral-950 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-[0_0_40px_rgba(52,211,153,0.3)] animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400 text-black flex items-center justify-center font-black text-xl shadow-lg">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase text-emerald-300 tracking-wider">
                      MATCH CONCLUDED • {activeMatch.winnerHandle || "GAME OVER"}
                    </h3>
                    <p className="text-xs text-neutral-300 font-mono">
                      Ready for another round? Replay with the same players and settings.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRematch}
                    disabled={isRematching}
                    className="px-5 py-2.5 border-2 border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer rounded-xl shadow-lg active:scale-95"
                  >
                    <RotateCcw className={`w-4 h-4 ${isRematching ? "animate-spin" : ""}`} />
                    <span>{isRematching ? "CREATING REMATCH..." : "[ 🔄 PLAY REMATCH NOW ]"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExitActiveMatch}
                    className="px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white font-bold text-xs uppercase transition-all rounded-xl cursor-pointer"
                  >
                    [ EXIT TO LOBBY ]
                  </button>
                </div>
              </div>
            )}

            {/* In-Match Live Voice Channel */}
            {activeMatch.enableVoice !== false && (
              <AgoraRTCProvider client={rtcClient}>
                <ArcadeVoiceChannel
                  matchId={activeMatch.id}
                  isSpectator={Boolean(user && !activeMatch.players?.[user.uid])}
                  processedStream={rawMicStream}
                />
              </AgoraRTCProvider>
            )}

            {/* Voice Party Games Renderers */}
            {activeMatch.gameType === "antakshari" && (
              <AntakshariGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {(activeMatch.gameType === "courtroom_debate" ||
              activeMatch.gameType === "news_anchor" ||
              activeMatch.gameType === "singer_roleplay" ||
              activeMatch.gameType === "mushaira" ||
              activeMatch.gameType === "tone_shift") && (
              <VoicePartyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "melody_buzzer" && (
              <MelodyBuzzerGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "two_truths" && (
              <TwoTruthsGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "pitch_arena" && (
              <PitchArenaGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}

            {/* Board & Card & Puzzle Renderers */}
            {activeMatch.gameType === "ludo" && (
              <LudoGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "carrom" && (
              <CarromGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "pool" && (
              <PoolGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "glow_hockey" && (
              <GlowHockeyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "chess" && (
              <ChessGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "connect4" && (
              <Connect4Game match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snakes_and_ladders" && (
              <SnakesLaddersGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "dots_and_boxes" && (
              <DotsAndBoxesGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "battleship" && (
              <BattleshipGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "monopoly" && (
              <MonopolyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "uno" && (
              <UnoGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} onRematch={handleRematch} />
            )}
            {activeMatch.gameType === "teen_patti" && (
              <TeenPattiGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "poker" && (
              <PokerGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "blackjack" && (
              <BlackjackGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "rummy" && (
              <RummyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "call_break" && (
              <CallBreakGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "cheat_bluff" && (
              <CheatBluffGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "raja_mantri" && (
              <RajaMantriGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "hand_cricket" && (
              <HandCricketGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "book_cricket" && (
              <BookCricketGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "bingo" && (
              <BingoGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "npat" && (
              <NPATGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "skribbl" && (
              <SkribblGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snake" && (
              <SnakeGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "2048" && (
              <Game2048 match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "wordle" && (
              <WordleGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "sudoku" && (
              <SudokuGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "puzzle15" && (
              <Puzzle15Game match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "hangman" && (
              <HangmanGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "math_blitz" && (
              <MathBlitzGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
          </div>
        ) : (
          /* ── Modern World-Class Gaming Lounge ── */
          <div className="space-y-6">
            {/* Quick Stats & Welcome Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg">
                  🎮
                </div>
                <div>
                  <div className="text-xs font-black text-white">39 TITLES</div>
                  <div className="text-[10px] text-neutral-400 font-bold">100% FREE &amp; FAIR</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-400/10 border border-pink-400/30 flex items-center justify-center text-lg">
                  🎙️
                </div>
                <div>
                  <div className="text-xs font-black text-white">VOICE ARENA</div>
                  <div className="text-[10px] text-neutral-400 font-bold">LIVE MIC &amp; PARTY</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <div className="text-xs font-black text-white">AI BOT RIVAL</div>
                  <div className="text-[10px] text-neutral-400 font-bold">ADAPTIVE DIFFICULTY</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <div className="text-xs font-black text-white">TOURNAMENTS</div>
                  <div className="text-[10px] text-neutral-400 font-bold">AURA REWARDS</div>
                </div>
              </div>
            </div>

            {/* Search & Category Filter Pills */}
            <div className="space-y-3">
              {/* Search Field */}
              <div className="w-full relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH 39 GAMES (ANTAKSHARI, MONOPOLY, CHESS, POOL, LUDO, CARROM)..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-500 pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-neutral-500 uppercase outline-none rounded-2xl transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 text-neutral-500 hover:text-white text-xs font-bold"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                {(
                  [
                    { id: "ALL", label: `ALL GAMES (${CLEAN_GAMES.length})`, icon: "🌟" },
                    { id: "VOICE", label: "VOICE & PARTY", icon: "🎙️" },
                    { id: "BOARD", label: "BOARD & TACTICS", icon: "🎲" },
                    { id: "PHYSICS", label: "SPORTS & PHYSICS", icon: "🎱" },
                    { id: "CARD", label: "CASINO & CARDS", icon: "♠️" },
                    { id: "PAPER", label: "PAPER & NOSTALGIA", icon: "👑" },
                    { id: "PUZZLE", label: "SOLO & LOGIC", icon: "🧩" },
                  ] as const
                ).map((tab) => {
                  const isActive = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id as any)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-white text-black shadow-md font-black"
                          : "bg-neutral-900/80 text-neutral-400 border border-neutral-800/80 hover:border-neutral-600 hover:text-white"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean Game Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-wider">
                <span>GAMES DIRECTORY ({filteredGames.length})</span>
                <span className="text-[10px] text-neutral-500">INSTANT PLAY SOLO OR MULTIPLAYER</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="group relative bg-gradient-to-b from-neutral-900/90 via-neutral-950/90 to-neutral-950 border border-neutral-800/80 hover:border-neutral-600 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                          {game.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-black text-sm uppercase text-white tracking-wide truncate">
                              {game.name}
                            </h4>
                            {game.category === "VOICE" && (
                              <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-300 border border-pink-500/30 text-[9px] font-bold rounded-full shrink-0">
                                🎙️ MIC
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                            {game.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-800/60 mt-3.5">
                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => handleOpenBotDifficulty(game.id)}
                        className="py-2 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 hover:border-neutral-500 font-bold text-xs uppercase transition-all cursor-pointer text-center truncate rounded-xl shadow-sm"
                        title={`Play ${game.name} vs AI Bot`}
                      >
                        🤖 SOLO BOT
                      </button>

                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => handleOpenCreate(game.id)}
                        className="py-2 px-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all cursor-pointer text-center truncate rounded-xl shadow-md active:scale-95"
                        title={`Create Multiplayer Room in ${game.name}`}
                      >
                        👥 MULTI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Open Match Lobbies */}
            <div className="space-y-3 pt-6 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-neutral-300 tracking-wider flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>ACTIVE TABLES &amp; ROOMS ({lobbyMatches.length})</span>
                </h3>
                <button
                  onClick={() => handleOpenCreate("antakshari")}
                  className="text-[11px] font-bold text-neutral-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span>+ HOST NEW TABLE</span>
                </button>
              </div>

              {lobbyMatches.length === 0 ? (
                <div className="border border-neutral-800/80 bg-gradient-to-b from-neutral-900/40 to-neutral-950/80 p-8 text-center space-y-2 rounded-2xl">
                  <p className="text-xs text-neutral-300 font-bold uppercase">NO ACTIVE LOBBIES RIGHT NOW</p>
                  <p className="text-[11px] text-neutral-500">
                    Host your own table or challenge an AI bot instantly!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lobbyMatches.map((m) => {
                    const playerCount = Object.keys(m.players || {}).length;
                    const isFull = playerCount >= m.maxPlayers;
                    const isHost = user?.uid === m.hostUid;

                    return (
                      <div
                        key={m.id}
                        className="border border-neutral-800 hover:border-neutral-700 bg-neutral-950 p-4 flex items-center justify-between flex-wrap gap-3 transition-all rounded-2xl shadow-md"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase text-white">
                              {m.title || "CLUB ARENA"}
                            </span>
                            <span className="text-[10px] text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full bg-neutral-900 font-bold">
                              {m.mode === "VS_COMPUTER" ? "AI BOT" : (m.gameType || "ARENA").toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                            <span>HOST: {m.hostHandle}</span>
                            <span>•</span>
                            <span>PLAYERS: {playerCount}/{m.maxPlayers}</span>
                            <span>•</span>
                            <span>STAKES: +{m.stakes * 2} AURA</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInviteModalMatch(m)}
                            className="p-2 border border-neutral-700 hover:border-white text-white transition-all cursor-pointer rounded-xl"
                            title="Invite Friends"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {isHost && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(m.id)}
                              className="p-2 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer rounded-xl"
                              title="Delete Arena Lobby"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (m.players?.[user?.uid || ""]) {
                                setActiveMatchId(m.id);
                              } else {
                                handleJoinMatch(m.id);
                              }
                            }}
                            className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all cursor-pointer rounded-xl shadow-md"
                          >
                            {m.players?.[user?.uid || ""]
                              ? "RESUME"
                              : isFull
                              ? "SPECTATE"
                              : "JOIN & PLAY"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Master Rules & Tactical Manual Modal */}
      <ArcadeGameRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        initialGameType={rulesModalGameType}
      />

      {/* Match Configuration Modal */}
      {user && (
        <ArcadeCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          user={{
            uid: user.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
          defaultGameType={defaultGameType}
          onMatchCreated={(matchId) => {
            setActiveMatchId(matchId);
          }}
        />
      )}

      {/* Global Invite Modal */}
      {inviteModalMatch && (
        <ArcadeInviteModal
          isOpen={!!inviteModalMatch}
          onClose={() => setInviteModalMatch(null)}
          match={inviteModalMatch}
        />
      )}

      {/* Tournament Bracket Modal */}
      {tournamentModalOpen && (
        <ArcadeTournamentBracketModal
          isOpen={tournamentModalOpen}
          onClose={() => {
            setTournamentModalOpen(false);
            setInitialTournamentId(undefined);
          }}
          gameType={activeMatch?.gameType || "antakshari"}
          hostUid={activeMatch?.hostUid || user?.uid || ""}
          currentUid={user?.uid || ""}
          initialTournamentId={initialTournamentId}
        />
      )}

      {/* In-App Real-Time Incoming Challenge Alert */}
      <IncomingChallengeListener
        user={user ? { uid: user.uid, handle: user.handle || "@ANON" } : null}
        onAcceptChallenge={(challenge) => {
          setActiveMatchId(challenge.roomId);
        }}
      />

      {/* Bot Difficulty Modal */}
      {botDifficultyModalOpen && pendingBotGameType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-sm bg-neutral-950 border-2 border-white p-6 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.2)] flex flex-col items-center rounded-2xl">
            <button
              onClick={() => {
                setBotDifficultyModalOpen(false);
                setPendingBotGameType(null);
              }}
              className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center mb-4 w-12 h-12 bg-white rounded-full text-2xl text-black flex items-center justify-center">
              🤖
            </div>
            <h2 className="text-lg font-black uppercase text-center mb-1 tracking-wider">
              SELECT AI DIFFICULTY
            </h2>
            <p className="text-xs text-neutral-400 text-center mb-6 max-w-[250px]">
              Choose the intelligence level of your Neural Bot opponent.
            </p>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleLaunchSolo(pendingBotGameType, "EASY");
                  setBotDifficultyModalOpen(false);
                }}
                className="w-full py-3 border-2 border-green-500 bg-green-950/40 text-green-400 font-black text-sm uppercase hover:bg-green-900 transition-colors cursor-pointer group flex justify-between px-4 items-center rounded-xl"
              >
                <span>[ CASUAL ]</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">EASY</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLaunchSolo(pendingBotGameType, "MEDIUM");
                  setBotDifficultyModalOpen(false);
                }}
                className="w-full py-3 border-2 border-yellow-500 bg-yellow-950/40 text-yellow-400 font-black text-sm uppercase hover:bg-yellow-900 transition-colors cursor-pointer group flex justify-between px-4 items-center rounded-xl"
              >
                <span>[ NEURAL ]</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">MEDIUM</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLaunchSolo(pendingBotGameType, "HARD");
                  setBotDifficultyModalOpen(false);
                }}
                className="w-full py-3 border-2 border-red-500 bg-red-950/40 text-red-400 font-black text-sm uppercase hover:bg-red-900 transition-colors cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)] group flex justify-between px-4 items-center rounded-xl"
              >
                <span>[ TERMINATOR ]</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">HARD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Tap Microphone Sound Check Modal */}
      <MicrophoneSoundCheckModal
        isOpen={soundCheckOpen}
        onClose={() => setSoundCheckOpen(false)}
      />
    </div>
  );
}

export default function ArcadePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white font-mono p-8 text-center text-xs">Loading Echo Club...</div>}>
      <ArcadeContent />
    </Suspense>
  );
}
