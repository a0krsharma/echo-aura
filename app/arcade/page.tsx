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
import MonopolyGame from "@/app/components/arcade/MonopolyGame";
import FruitMergeGame from "@/app/components/arcade/FruitMergeGame";
import SnakesArenaGame from "@/app/components/arcade/SnakesArenaGame";
import NutsAndBoltsGame from "@/app/components/arcade/NutsAndBoltsGame";
import CandyMatchGame from "@/app/components/arcade/CandyMatchGame";
import LumberjackGame from "@/app/components/arcade/LumberjackGame";
import HandSlapGame from "@/app/components/arcade/HandSlapGame";
import RockPaperScissorsGame from "@/app/components/arcade/RockPaperScissorsGame";
import KnifeThrowerGame from "@/app/components/arcade/KnifeThrowerGame";
import PingPongGame from "@/app/components/arcade/PingPongGame";
import DartsGame from "@/app/components/arcade/DartsGame";
import FindMatchGame from "@/app/components/arcade/FindMatchGame";
import CupPongGame from "@/app/components/arcade/CupPongGame";
import FruitNinjaGame from "@/app/components/arcade/FruitNinjaGame";
import BottleShooterGame from "@/app/components/arcade/BottleShooterGame";
import SubwaySurferGame from "@/app/components/arcade/SubwaySurferGame";
import HillClimbRacingGame from "@/app/components/arcade/HillClimbRacingGame";
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
  Bot,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { updateArcadeElo, awardAura } from "@/lib/userDoc";
import { createPost } from "@/lib/posts";
import { soundSynth } from "@/lib/soundSynthesizer";

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
  { id: "fruit_merge", name: "Fruit Merge (Suika)", category: "PHYSICS", icon: "🍉", description: "Matter.js rigid-body 11-tier fruit fusion & juice splashes" },
  { id: "snakes", name: "Snakes Arena (Slither)", category: "PHYSICS", icon: "🐍", description: "60 FPS vector arena slither battle vs AI bots with boost trails" },
  { id: "nuts_and_bolts", name: "Nuts & Bolts", category: "PUZZLE", icon: "🔩", description: "Color sorting logic puzzle with threaded bolts & hex nuts" },
  { id: "candy_match", name: "Candy Match-3", category: "PUZZLE", icon: "🍬", description: "8x8 candy swap cascade with striped beams & color bombs" },
  { id: "lumberjack", name: "Lumberjack", category: "PHYSICS", icon: "🪓", description: "Speed reflex timber chop avoiding falling branches" },
  { id: "hand_slap", name: "Hand Slap (Red Hands)", category: "PHYSICS", icon: "✋", description: "Quick-draw reflex battle with attacker slap & defender dodge" },
  { id: "rock_paper_scissors", name: "Rock Paper Scissors", category: "PAPER", icon: "🪨", description: "3D icon buttons, 1-2-3 rhythm bounce, sudden death overtime" },
  { id: "knife_thrower", name: "Knife Thrower", category: "PHYSICS", icon: "🗡️", description: "Rotating target log with variable speeds & blade clash physics" },
  { id: "ping_pong", name: "Ping Pong", category: "PHYSICS", icon: "🏓", description: "Tabletop swipe tennis with curve spin & apex power smashes" },
  { id: "darts", name: "Darts 301", category: "PHYSICS", icon: "🎯", description: "Official 301 countdown, swipe velocity & checkout calculator" },
  { id: "find_match", name: "Find Match", category: "PUZZLE", icon: "🔍", description: "Projective geometry card deck with 1 exact matching symbol" },
  { id: "cup_pong", name: "Cup Pong", category: "PHYSICS", icon: "🥤", description: "Parabolic 3D flick toss into red party cup pyramids" },
  { id: "fruit_ninja", name: "Fruit Ninja Dojo", category: "PHYSICS", icon: "🍉", description: "60 FPS blade swipe slicing, multi-fruit combos, juicy wall splatters & bomb dodging" },
  { id: "bottle_shooter", name: "Saloon Bottle Shooter", category: "PHYSICS", icon: "🍾", description: "6-shot revolver precision target gunner with glass shrapnel physics & TNT chain blasts" },
  { id: "subway_surfer", name: "Subway Surf Rush", category: "PHYSICS", icon: "🏃‍♂️", description: "3D perspective 3-track subway runner with oncoming trains, hoverboards, jetpacks & inspector chase" },
  { id: "hill_climb", name: "Hill Climb Legends", category: "PHYSICS", icon: "🚗", description: "2-pedal terrain physics racer with suspension, air flips, fuel canisters & 3 vehicles" },
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
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [pendingFriendsGameType, setPendingFriendsGameType] = useState<ArcadeGameType | null>(null);
  const [randomMatchSearching, setRandomMatchSearching] = useState(false);
  const [randomMatchGame, setRandomMatchGame] = useState<ArcadeGameType | null>(null);
  const [randomMatchTimer, setRandomMatchTimer] = useState(5);
  const queueCancelRef = useRef<(() => void) | null>(null);

  const [soundCheckOpen, setSoundCheckOpen] = useState(false);
  const [ghostTimerSec, setGhostTimerSec] = useState<number | null>(null);
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
      // @ts-ignore - isTournament exists on tournament documents
      if (!activeMatch || activeMatch.mode === "VS_COMPUTER" || activeMatch.status !== "WAITING" || activeMatch.isChallenge || activeMatch.isTournament) {
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
    }, [activeMatch?.id, activeMatch?.status, activeMatch?.players, activeMatch?.hostUid, activeMatch?.isChallenge, activeMatch?.mode, user?.uid]);

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

  const handleOpenFriendsModal = (gameId: ArcadeGameType) => {
    setPendingFriendsGameType(gameId);
    setFriendsModalOpen(true);
  };

  const handleStartRandomMatch = async (gameType: ArcadeGameType) => {
    if (!user) return;
    setFriendsModalOpen(false);
    setRandomMatchGame(gameType);
    setRandomMatchTimer(5);
    setRandomMatchSearching(true);
    soundSynth.playSubtlePop();

    try {
      const cancelFn = await findOrJoinQueue(
        user.uid,
        user.handle || "@ANON",
        user.photoUrl || user.photoURL || "",
        gameType,
        (matchId) => {
          soundSynth.playFanfare();
          setRandomMatchSearching(false);
          setRandomMatchGame(null);
          setActiveMatchId(matchId);
        }
      );
      queueCancelRef.current = cancelFn;
    } catch (e) {
      console.warn("Queue error:", e);
    }
  };

  const handleCancelRandomMatch = () => {
    if (queueCancelRef.current) {
      queueCancelRef.current();
      queueCancelRef.current = null;
    }
    setRandomMatchSearching(false);
    setRandomMatchGame(null);
  };

  // Random match timer: if no opponent is found in 5s, auto-launch vs Bot!
  useEffect(() => {
    if (!randomMatchSearching || !randomMatchGame) return;
    if (randomMatchTimer <= 0) {
      if (queueCancelRef.current) {
        queueCancelRef.current();
        queueCancelRef.current = null;
      }
      setRandomMatchSearching(false);
      const targetGame = randomMatchGame;
      setRandomMatchGame(null);
      soundSynth.playSubtlePop();
      handleLaunchSolo(targetGame, "MEDIUM");
      return;
    }
    const t = setTimeout(() => {
      setRandomMatchTimer((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [randomMatchSearching, randomMatchTimer, randomMatchGame]);

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

  // Victory Mic Drop Post to Frequency
  const [isPostingVictory, setIsPostingVictory] = useState(false);
  const [hasPostedVictory, setHasPostedVictory] = useState(false);

  // Reset victory post state on new match
  useEffect(() => {
    setHasPostedVictory(false);
  }, [activeMatch?.id]);

  const handlePostVictoryToFrequency = async () => {
    if (!user || !activeMatch) return;
    setIsPostingVictory(true);
    try {
      // 1. Play victory sounds & mic drop fanfare
      soundSynth.playFanfare();
      setTimeout(() => soundSynth.playApplause(), 600);

      // 2. Award victory Aura bonus
      await awardAura(user.uid, 50);

      const gameObj = CLEAN_GAMES.find((g) => g.id === activeMatch.gameType);
      const gameName = gameObj?.name || "Arcade Match";
      const victoryCaption = `🏆 Just dropped the mic with a VICTORY in ${gameName} on Echo Arcade! 🎙️💥 Current Arcade Champion. Who's stepping up next? #EchoArcade #ArcadeWinner #MicDrop #Aura`;

      // 3. Post to Frequency feed
      await createPost({
        audioUrl: "https://res.cloudinary.com/echo-aura/video/upload/v1/victory_fanfare.mp3",
        caption: victoryCaption,
        authorUid: user.uid,
        authorHandle: user.handle || "@CHAMPION",
        tags: ["ARCADE", "WINNER", "MICDROP", (gameObj?.category || "GAMING").toUpperCase()],
        durationSec: 5,
        duration: "00:05",
      });

      setHasPostedVictory(true);
    } catch (err) {
      console.error("Failed to post victory to frequency:", err);
    } finally {
      setIsPostingVictory(false);
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
    <div className="min-h-screen bg-black text-white font-mono relative">
      {/* ── Top Unified Clean Header ── */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-lg">
        {activeMatch ? (
          /* ── In-Match Header Mode ── */
          <>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleExitActiveMatch}
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs rounded-lg font-bold shrink-0"
                title="Exit to Echo Club Lobby"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">EXIT</span>
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base sm:text-lg shrink-0">
                  {CLEAN_GAMES.find((g) => g.id === activeMatch.gameType)?.icon || "🎮"}
                </span>
                <span className="font-black text-xs sm:text-sm uppercase tracking-wide text-white truncate max-w-[120px] sm:max-w-[220px]">
                  {CLEAN_GAMES.find((g) => g.id === activeMatch.gameType)?.name || activeMatch.gameType.toUpperCase()}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold shrink-0">
                  {activeMatch.mode === "VS_COMPUTER" ? "🤖 VS BOT" : "👥 MULTI"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 text-xs shrink-0">
              {/* Rematch Button */}
              <button
                type="button"
                onClick={handleRematch}
                disabled={isRematching}
                className={`p-1.5 sm:px-3 sm:py-1.5 border font-black uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm active:scale-95 ${
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
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 font-bold uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Microphone Sound Check"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">MIC CHECK</span>
              </button>

              {/* Single Rules Button */}
              <button
                type="button"
                onClick={() => handleOpenRules(activeMatch.gameType)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white font-bold uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="View Rules & Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">RULES</span>
              </button>

              {/* Play with Friends: Random Match (5s auto-bot fallback) */}
              <button
                type="button"
                onClick={() => handleStartRandomMatch(activeMatch.gameType)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-bold uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Search online random opponent (auto-bot in 5s)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">RANDOM MATCH</span>
              </button>

              {/* Play with Friends: Invite Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                className="p-1.5 sm:px-3 sm:py-1.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black uppercase text-xs transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm active:scale-95"
                title="Invite Friends"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">INVITE</span>
              </button>

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
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/"
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-xs rounded-lg font-bold shrink-0"
                title="Back to Feed"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ECHO</span>
              </Link>

              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white text-black rounded-lg flex items-center justify-center font-black shadow-md shrink-0">
                  <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h1 className="font-black text-xs sm:text-sm tracking-wider uppercase text-white truncate">
                  ECHO CLUB
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSoundCheckOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Microphone Sound Check"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">MIC CHECK</span>
              </button>

              <Link
                href="/leaderboard"
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-yellow-400 hover:text-yellow-300 font-bold text-xs uppercase transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Leaderboard"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden md:inline">LEADERBOARD</span>
              </Link>

              <button
                type="button"
                onClick={() => setTournamentModalOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 border border-amber-500/50 bg-amber-950/30 text-amber-300 hover:border-amber-400 hover:bg-amber-900/50 font-bold text-xs uppercase transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Tournament Bracket & Arena Matches"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">TOURNAMENT</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRules("antakshari")}
                className="px-2 py-1.5 sm:px-2.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white font-bold text-xs uppercase transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-sm"
                title="Rules & Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">RULES</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreate("antakshari")}
                className="px-2.5 sm:px-3.5 py-1.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all flex items-center gap-1 cursor-pointer rounded-lg shadow-md active:scale-95"
                title="Create Match"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>CREATE</span>
              </button>
            </div>
          </>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-40 sm:pb-24">
        {activeMatch ? (
          /* ── Active Game Arena View ── */
          <div className="space-y-4">
            {/* Ghost Participant Fallback Notification Bar */}
            {activeMatch.status === "WAITING" && activeMatch.mode !== "VS_COMPUTER" && Object.keys(activeMatch.players || {}).length < activeMatch.maxPlayers && (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 shadow-md flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="text-xs text-neutral-300 font-sans truncate">
                    {ghostTimerSec !== null ? (
                      <>Waiting for challenger... Auto-dropping <strong>Ghost AI</strong> in <strong>{ghostTimerSec}s</strong> so the room never stays dead.</>
                    ) : (
                      <>Awaiting opponent to join...</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleStartRandomMatch(activeMatch.gameType)}
                    className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>⚡ RANDOM MATCH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteModalMatch(activeMatch)}
                    className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>INVITE FRIENDS</span>
                  </button>
                  <button
                    onClick={() => addGhostParticipantToMatch(activeMatch.id)}
                    className="px-2.5 py-1 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm"
                  >
                    🤖 DROP GHOST NOW
                  </button>
                </div>
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
                  {/* Celebratory Mic Drop Button on Victory */}
                  {user && (activeMatch.winnerUid === user.uid || !activeMatch.winnerUid) && (
                    <button
                      type="button"
                      onClick={handlePostVictoryToFrequency}
                      disabled={isPostingVictory || hasPostedVictory}
                      className={`px-4 py-2.5 border font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer rounded-xl active:scale-95 ${
                        hasPostedVictory
                          ? "border-emerald-500 bg-emerald-950/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          : "border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                      }`}
                    >
                      <Flame className={`w-4 h-4 ${hasPostedVictory ? "text-emerald-400" : "fill-black text-black"}`} />
                      <span>
                        {isPostingVictory
                          ? "POSTING TO FREQUENCY..."
                          : hasPostedVictory
                          ? "✓ POSTED WITH MIC DROP 🎙️"
                          : "🎙️ POST TO FREQUENCY // MIC DROP 💥"}
                      </span>
                    </button>
                  )}

                  {hasPostedVictory && (
                    <Link
                      href="/"
                      target="_blank"
                      className="px-3.5 py-2.5 border border-emerald-500/80 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-bold text-xs uppercase transition-all rounded-xl cursor-pointer flex items-center gap-1 shadow-md animate-pulse"
                      title="See your victory live on the Frequency feed"
                    >
                      <span>VIEW ON FEED ↗</span>
                    </Link>
                  )}

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
              <ArcadeVoiceChannel
                matchId={activeMatch.id}
                isSpectator={Boolean(user && !activeMatch.players?.[user.uid])}
                processedStream={rawMicStream}
              />
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
            {activeMatch.gameType === "fruit_merge" && (
              <FruitMergeGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snakes" && (
              <SnakesArenaGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "nuts_and_bolts" && (
              <NutsAndBoltsGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "candy_match" && (
              <CandyMatchGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "lumberjack" && (
              <LumberjackGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "hand_slap" && (
              <HandSlapGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "rock_paper_scissors" && (
              <RockPaperScissorsGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "knife_thrower" && (
              <KnifeThrowerGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "ping_pong" && (
              <PingPongGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "darts" && (
              <DartsGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "find_match" && (
              <FindMatchGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "cup_pong" && (
              <CupPongGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "fruit_ninja" && (
              <FruitNinjaGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onBack={handleExitActiveMatch}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "bottle_shooter" && (
              <BottleShooterGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onBack={handleExitActiveMatch}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "subway_surfer" && (
              <SubwaySurferGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onBack={handleExitActiveMatch}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
            {activeMatch.gameType === "hill_climb" && (
              <HillClimbRacingGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
                onBack={handleExitActiveMatch}
                onInviteFriend={() => {
                  if (activeMatch.mode === "VS_COMPUTER") {
                    handleOpenCreate(activeMatch.gameType);
                  } else {
                    setInviteModalMatch(activeMatch);
                  }
                }}
                onRandomMatch={() => handleStartRandomMatch(activeMatch.gameType)}
              />
            )}
          </div>
        ) : (
          /* ── Modern World-Class Gaming Lounge ── */
          <div className="space-y-6">

            {/* Search & Category Filter Pills */}
            <div className="space-y-3">
              {/* Search Field */}
              <div className="w-full relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`SEARCH ${CLEAN_GAMES.length} GAMES (ANTAKSHARI, MONOPOLY, CHESS, POOL, LUDO, CARROM)...`}
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
                      <div
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => handleLaunchSolo(game.id, "MEDIUM")}
                        title={`Launch ${game.name}`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                          {game.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-black text-sm uppercase text-white tracking-wide truncate group-hover:text-amber-400 transition-colors">
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

                    <div className="mt-3.5 pt-3 border-t border-neutral-800/80 space-y-2">
                      {/* 1. Solo Bot (Easy / Medium / Hard) */}
                      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1 shrink-0">
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          <span>BOT:</span>
                        </span>
                        <div className="grid grid-cols-3 gap-1 flex-1">
                          {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                            <button
                              key={diff}
                              type="button"
                              disabled={!user}
                              onClick={() => handleLaunchSolo(game.id, diff)}
                              className={`py-1 px-1 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer text-center ${
                                diff === "EASY"
                                  ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-800/60 hover:border-emerald-400"
                                  : diff === "MEDIUM"
                                  ? "border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-800/60 hover:border-amber-400"
                                  : "border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-800/60 hover:border-red-400"
                              }`}
                              title={`Play ${game.name} vs ${diff} Bot`}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Play with Friends (Random Match with 5s auto-bot & Invite Friends) */}
                      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span>PLAY WITH FRIENDS:</span>
                          </span>
                          <span className="text-[9px] text-neutral-500 font-mono">5s AUTO-BOT</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            disabled={!user}
                            onClick={() => handleStartRandomMatch(game.id)}
                            className="py-1.5 px-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/60 hover:border-amber-400 text-amber-300 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95 truncate"
                            title={`Search for random online player in ${game.name} with 5s auto-bot fallback`}
                          >
                            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">⚡ RANDOM MATCH</span>
                          </button>

                          <button
                            type="button"
                            disabled={!user}
                            onClick={() => handleOpenCreate(game.id)}
                            className="py-1.5 px-2 bg-white text-black hover:bg-neutral-200 border border-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95 truncate"
                            title={`Create room & invite friends to play ${game.name}`}
                          >
                            <Share2 className="w-3 h-3 text-black shrink-0" />
                            <span className="truncate">👥 INVITE FRIENDS</span>
                          </button>
                        </div>
                      </div>
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



      {/* Play with Friends Modal (Random Match vs Invite Friends) */}
      {friendsModalOpen && pendingFriendsGameType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-sm bg-neutral-950 border-2 border-white p-6 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.2)] flex flex-col items-center rounded-2xl">
            <button
              onClick={() => {
                setFriendsModalOpen(false);
                setPendingFriendsGameType(null);
              }}
              className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center mb-3 w-12 h-12 bg-white rounded-full text-2xl text-black">
              👥
            </div>
            <h2 className="text-lg font-black uppercase text-center mb-1 tracking-wider">
              PLAY WITH FRIENDS
            </h2>
            <p className="text-xs text-neutral-400 text-center mb-5">
              Choose quick random matchmaking or invite friends to a private table
            </p>

            <div className="w-full space-y-3">
              {/* Option 1: Random Match */}
              <button
                type="button"
                onClick={() => handleStartRandomMatch(pendingFriendsGameType)}
                className="w-full py-3.5 px-4 border-2 border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-black text-sm uppercase transition-all cursor-pointer rounded-xl flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="leading-tight">RANDOM MATCH</div>
                    <div className="text-[10px] text-amber-200/70 font-sans font-normal normal-case">
                      Find player online (auto-bot in 5s)
                    </div>
                  </div>
                </div>
                <span className="text-xs">⚡</span>
              </button>

              {/* Option 2: Invite Friends */}
              <button
                type="button"
                onClick={() => {
                  const game = pendingFriendsGameType;
                  setFriendsModalOpen(false);
                  handleOpenCreate(game);
                }}
                className="w-full py-3.5 px-4 border-2 border-blue-500 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 font-black text-sm uppercase transition-all cursor-pointer rounded-xl flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Users className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="leading-tight">INVITE FRIENDS</div>
                    <div className="text-[10px] text-blue-200/70 font-sans font-normal normal-case">
                      Create room &amp; share invite link
                    </div>
                  </div>
                </div>
                <span className="text-xs">🔗</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Random Match Searching Overlay */}
      {randomMatchSearching && randomMatchGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-sm bg-neutral-950 border-2 border-amber-400 p-6 font-mono text-white shadow-[0_0_60px_rgba(245,158,11,0.3)] flex flex-col items-center rounded-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl animate-pulse">
              ⚡
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-amber-400 tracking-wider">
                SEARCHING FOR CHALLENGER...
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Looking for players online in {CLEAN_GAMES.find((g) => g.id === randomMatchGame)?.name}
              </p>
            </div>

            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300 font-sans">
                Auto-matching with Neural Bot in <strong>{randomMatchTimer}s</strong>...
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancelRandomMatch}
              className="w-full py-2.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
            >
              CANCEL
            </button>
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
