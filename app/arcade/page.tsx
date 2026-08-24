"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import { findOrJoinQueue } from "@/lib/arcadeQueue";
import {
  createArcadeMatch,
  joinArcadeMatch,
  subscribeArcadeMatch,
  subscribeLobbyArcadeMatches,
  deleteArcadeMatch,
  leaveArcadeMatch,
  sendSpectatorEvent,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import ArcadeVoiceChannel from "@/app/components/arcade/ArcadeVoiceChannel";
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
import MelodyBuzzerGame from "@/app/components/arcade/MelodyBuzzerGame";
import TabooGame from "@/app/components/arcade/TabooGame";
import PitchArenaGame from "@/app/components/arcade/PitchArenaGame";
import TwentyQuestionsGame from "@/app/components/arcade/TwentyQuestionsGame";
import RajaMantriGame from "@/app/components/arcade/RajaMantriGame";
import HandCricketGame from "@/app/components/arcade/HandCricketGame";
import BookCricketGame from "@/app/components/arcade/BookCricketGame";
import BingoGame from "@/app/components/arcade/BingoGame";
import NPATGame from "@/app/components/arcade/NPATGame";
import TwoTruthsGame from "@/app/components/arcade/TwoTruthsGame";
import HangmanGame from "@/app/components/arcade/HangmanGame";
import MathBlitzGame from "@/app/components/arcade/MathBlitzGame";
import ArcadeInviteModal from "@/app/components/arcade/ArcadeInviteModal";
import ArcadeCreateModal from "@/app/components/arcade/ArcadeCreateModal";
import ArcadeGameRulesModal from "@/app/components/arcade/ArcadeGameRulesModal";
import ArcadeRevengeCardModal from "@/app/components/arcade/ArcadeRevengeCardModal";
import ArcadeTournamentBracketModal from "@/app/components/arcade/ArcadeTournamentBracketModal";
import ViralStoryGeneratorModal from "@/app/components/arcade/ViralStoryGeneratorModal";
import LiveVoiceFilterDock from "@/app/components/arcade/LiveVoiceFilterDock";
import MidnightGhostGrid from "@/app/components/arcade/MidnightGhostGrid";
import ChallengeLauncherModal from "@/app/components/arcade/ChallengeLauncherModal";
import IncomingChallengeListener from "@/app/components/arcade/IncomingChallengeListener";
import VoicePartyLounge from "@/app/components/arcade/VoicePartyLounge";
import VoiceMechanicGames from "@/app/components/arcade/VoiceMechanicGames";
import ViralMegaMechanicsHub from "@/app/components/arcade/ViralMegaMechanicsHub";
import { TERMINAL_BADGES, getAllBadges } from "@/lib/terminalBadges";
import { type StreakBountyTarget } from "@/lib/viralMechanics";
import { type VoiceFilterMode } from "@/lib/voiceModulator";
import { type GhostLoungePreset } from "@/lib/midnightGhost";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  Gamepad2,
  Trophy,
  Flame,
  Swords,
  Zap,
  ArrowLeft,
  Play,
  Share2,
  Mic2,
  Trash2,
  Brain,
  CircleDollarSign,
  Music,
  HelpCircle,
  Crown,
  Search,
  Filter,
  Video,
  Moon,
  Volume2,
  Activity,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { updateArcadeElo } from "@/lib/userDoc";

type CategoryFilter = "ALL" | "CARD" | "PAPER" | "PHYSICS" | "TACTICAL" | "PARTY" | "PUZZLE";

interface MasterRankedGame {
  id: ArcadeGameType;
  name: string;
  category: CategoryFilter;
  icon: string;
  isPlayable: boolean;
}

const MASTER_50_GAMES: MasterRankedGame[] = [
  // ── 🔥 Most Popular & Essential Classics (Top Tier) ──
  { id: "ludo", name: "Ludo", category: "TACTICAL", icon: "🎲", isPlayable: true },
  { id: "uno", name: "Uno", category: "CARD", icon: "🎴", isPlayable: true },
  { id: "glow_hockey", name: "Glow Hockey", category: "PHYSICS", icon: "⚡", isPlayable: true },
  { id: "snake", name: "Retro Snake", category: "PUZZLE", icon: "🐍", isPlayable: true },
  { id: "teen_patti", name: "Teen Patti", category: "CARD", icon: "🔥", isPlayable: true },
  { id: "raja_mantri", name: "Raja Mantri Chor Sipahi", category: "PAPER", icon: "👑", isPlayable: true },
  { id: "book_cricket", name: "Book Cricket", category: "PAPER", icon: "📖", isPlayable: true },
  { id: "hand_cricket", name: "Hand Cricket", category: "PAPER", icon: "🏏", isPlayable: true },
  { id: "pool", name: "8-Ball Pool", category: "PHYSICS", icon: "🎱", isPlayable: true },
  { id: "carrom", name: "Carrom", category: "PHYSICS", icon: "⚪", isPlayable: true },
  { id: "rummy", name: "Indian Rummy", category: "CARD", icon: "🃏", isPlayable: true },
  { id: "chess", name: "Chess", category: "TACTICAL", icon: "♟️", isPlayable: true },
  { id: "connect4", name: "Connect 4", category: "TACTICAL", icon: "🔴", isPlayable: true },
  { id: "call_break", name: "Call Break", category: "CARD", icon: "♠️", isPlayable: true },
  { id: "bingo", name: "Bingo", category: "PAPER", icon: "🔢", isPlayable: true },
  { id: "snakes_and_ladders", name: "Snakes & Ladders", category: "TACTICAL", icon: "🪜", isPlayable: true },
  { id: "dots_and_boxes", name: "Dots and Boxes", category: "TACTICAL", icon: "🕸️", isPlayable: true },

  // ── 📝 Word, Deduction & Solo Logic ──
  { id: "npat", name: "Name Place Animal Thing", category: "PAPER", icon: "📝", isPlayable: true },
  { id: "hangman", name: "Hangman", category: "PAPER", icon: "🔤", isPlayable: true },
  { id: "skribbl", name: "Skribbl", category: "PARTY", icon: "🎨", isPlayable: true },
  { id: "2048", name: "2048", category: "PUZZLE", icon: "🔢", isPlayable: true },
  { id: "wordle", name: "Wordle", category: "PUZZLE", icon: "🔐", isPlayable: true },
  { id: "sudoku", name: "Sudoku", category: "PUZZLE", icon: "🧩", isPlayable: true },
  { id: "puzzle15", name: "15 Puzzle", category: "PUZZLE", icon: "🔢", isPlayable: true },
  { id: "math_blitz", name: "Math Blitz", category: "PUZZLE", icon: "⚡", isPlayable: true },

  // ── ♠️ Card, Wagering & Voice Party ──
  { id: "poker", name: "Texas Hold'em Poker", category: "CARD", icon: "♦️", isPlayable: true },
  { id: "blackjack", name: "Blackjack 21", category: "CARD", icon: "♣️", isPlayable: true },
  { id: "cheat_bluff", name: "Cheat / Bluff", category: "CARD", icon: "🚨", isPlayable: true },
  { id: "twenty_questions", name: "20 Questions", category: "PARTY", icon: "❓", isPlayable: true },
  { id: "melody_buzzer", name: "Melody Relay", category: "PARTY", icon: "🎵", isPlayable: true },
  { id: "two_truths", name: "Two Truths & a Lie", category: "PARTY", icon: "🎭", isPlayable: true },
  { id: "taboo", name: "Taboo", category: "PARTY", icon: "🚫", isPlayable: true },
  { id: "pitch_arena", name: "Pitch Arena", category: "PARTY", icon: "🎙️", isPlayable: true },
];

function ArcadeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeMatch, setActiveMatch] = useState<ArcadeMatch | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [lobbyMatches, setLobbyMatches] = useState<ArcadeMatch[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultGameType, setDefaultGameType] = useState<ArcadeGameType>("ludo");
  const [inviteModalMatch, setInviteModalMatch] = useState<ArcadeMatch | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesModalGameType, setRulesModalGameType] = useState<string>("ludo");
  const [revengeModalMatch, setRevengeModalMatch] = useState<ArcadeMatch | null>(null);
  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [initialTournamentId, setInitialTournamentId] = useState<string | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchingGame, setSearchingGame] = useState<string | null>(null);
  const cancelQueueRef = React.useRef<(() => void) | null>(null);

  const handleFindMatch = async (gameId: ArcadeGameType) => {
    if (!user) return;
    setIsSearching(true);
    setSearchingGame(gameId);
    
    const cancelFn = await findOrJoinQueue(
      user?.uid,
      user.handle || "@ANON",
      user.photoUrl || user.photoURL || "",
      gameId,
      (matchId) => {
        setIsSearching(false);
        setSearchingGame(null);
        setActiveMatchId(matchId);
      }
    );
    cancelQueueRef.current = cancelFn;
  };

  const handleCancelSearch = () => {
    if (cancelQueueRef.current) {
      cancelQueueRef.current();
      cancelQueueRef.current = null;
    }
    setIsSearching(false);
    setSearchingGame(null);
  };

  
  const rtcClient = React.useMemo(() => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }), []);
  const [rawMicStream, setRawMicStream] = useState<MediaStream | null>(null);
  const [processedMicStream, setProcessedMicStream] = useState<MediaStream | null>(null);

  // Viral Growth Engine State
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyParams, setStoryParams] = useState({
    gameName: "LUDO CYBER MASTER",
    scoreText: "Wiped the lobby with 4 home runs!",
    roomId: "8912",
  });
  const lastSpectatorEventTs = React.useRef<number>(0);

  const [challengeLauncherOpen, setChallengeLauncherOpen] = useState(false);
  const [challengeParams, setChallengeParams] = useState({
    gameType: "ludo",
    gameName: "Ludo Cyber Master",
    roomId: "room_8912",
    matchId: "match_8912",
  });

  const [voiceDockOpen, setVoiceDockOpen] = useState(false);
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterMode>("clean");
  const [voicePartyOpen, setVoicePartyOpen] = useState(false);
  const [voiceMechanicOpen, setVoiceMechanicOpen] = useState(false);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);
  const [viralHubOpen, setViralHubOpen] = useState(false);
  const [botDifficultyModalOpen, setBotDifficultyModalOpen] = useState(false);
  const [pendingBotGameType, setPendingBotGameType] = useState<ArcadeGameType | null>(null);

  const handleOpenBotDifficulty = (gameId: ArcadeGameType) => {
    setPendingBotGameType(gameId);
    setBotDifficultyModalOpen(true);
  };

  const handleChallengeBounty = (target: StreakBountyTarget) => {
    handleOpenChallenge(
      target.gameType.toLowerCase(),
      `${target.gameType} BOUNTY CLASH`,
      "room_bounty",
      `match_${target.id}`
    );
  };

  const handleOpenChallenge = (gameType = "ludo", gameName = "Ludo Cyber Master", rId = "room_8912", mId = "match_8912") => {
    setChallengeParams({ gameType, gameName, roomId: rId, matchId: mId });
    setChallengeLauncherOpen(true);
  };

  const handleOpenStory = (gameName = "ARCADE ARENA", scoreText = "Crushed the lobby with high aura!", rId = "8912") => {
    setStoryParams({ gameName, scoreText, roomId: rId });
    setStoryModalOpen(true);
  };

  const handleJoinGhostLounge = async (preset: GhostLoungePreset) => {
    if (!user) return;
    try {
      const matchId = await createArcadeMatch({
        gameType: preset.gameType as ArcadeGameType,
        title: preset.title,
        hostUid: user?.uid,
        hostHandle: `${user.handle || "@ANON"} [👻 GHOST]`,
        hostAvatar: user.photoUrl || user.photoURL,
        mode: "MULTIPLAYER",
        maxPlayers: 4,
        enableVoice: true,
        stakes: preset.auraStake,
      });
      setActiveMatchId(matchId);
    } catch (e) {
      console.error("Ghost lounge creation failed:", e);
    }
  };

  // Auto-load match or tournament from URL params
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
  }, [searchParams]);

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
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        setRawMicStream(s);
        stream = s;
      }).catch(console.error);
    } else {
      setRawMicStream(null);
      setProcessedMicStream(null);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [activeMatch?.id, activeMatch?.enableVoice, user]);

  // Auto-join if opened via invite link and authenticated
  useEffect(() => {
    if (
      activeMatch &&
      user &&
      !activeMatch.players?.[user?.uid] &&
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

  // Listen for Spectator Soundboard Events
  useEffect(() => {
    if (activeMatch?.lastSpectatorEvent) {
      const event = activeMatch.lastSpectatorEvent;
      if (event.ts > lastSpectatorEventTs.current) {
        lastSpectatorEventTs.current = event.ts;
        if (event.type === "AIRHORN") soundSynth.playAirhorn();
        if (event.type === "APPLAUSE") soundSynth.playApplause();
        if (event.type === "BOING") soundSynth.playBoing();
      }
    }
  }, [activeMatch?.lastSpectatorEvent]);

  const handleOpenCreate = (type: ArcadeGameType) => {
    setDefaultGameType(type);
    setCreateModalOpen(true);
  };

  const handleOpenRules = (gameId: string) => {
    setRulesModalGameType(gameId);
    setRulesModalOpen(true);
  };

  const handleLaunchSolo = async (type: ArcadeGameType, difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM") => {
    if (!user) return;
    try {
      let maxPlayers = 2;
      if (
        type === "ludo" ||
        type === "call_break" ||
        type === "bhabhi_thulla" ||
        type === "mendicot" ||
        type === "raja_mantri"
      ) {
        maxPlayers = 4;
      } else if (
        type === "rummy" ||
        type === "teen_patti" ||
        type === "satte_pe_satta" ||
        type === "cheat_bluff" ||
        type === "poker"
      ) {
        maxPlayers = 6;
      } else if (
        type === "minesweeper" ||
        type === "2048" ||
        type === "snake" ||
        type === "wordle" ||
        type === "puzzle15" ||
        type === "mastermind" ||
        type === "solitaire"
      ) {
        maxPlayers = 1;
      }

      const matchId = await createArcadeMatch({
        gameType: type,
        title: `${type.toUpperCase()} // SOLO VS NEURAL BOT`,
        hostUid: user?.uid,
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
        uid: user?.uid,
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
        await leaveArcadeMatch(mId, user?.uid);
      } catch (e) {
        console.warn("Failed to clean up match:", e);
      }
    }
  };

  // Update Elo once per match on the Winner's client
  const eloUpdatedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (activeMatch?.status === "FINISHED" && activeMatch.winnerUid === user?.uid) {
      if (eloUpdatedRef.current !== activeMatch.id) {
        eloUpdatedRef.current = activeMatch.id;
        const loserUid = Object.keys(activeMatch.players || {}).find(id => id !== user?.uid && !id.startsWith("bot"));
        if (loserUid) {
          if(user) updateArcadeElo(user.uid, loserUid).catch(() => {});
        }
      }
    }
  }, [activeMatch?.status, activeMatch?.winnerUid, user?.uid]);

  // Auto-clean match if user closes tab or navigates away
  useEffect(() => {
    const handleUnload = () => {
      if (activeMatchId && user) {
        leaveArcadeMatch(activeMatchId, user?.uid).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [activeMatchId, user]);

  const filteredGames = MASTER_50_GAMES.filter((g) => {
    const matchesCategory = activeCategory === "ALL" || g.category === activeCategory;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black text-white font-mono pb-24 relative">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {activeMatchId ? (
            <button
              onClick={handleExitActiveMatch}
              className="px-2.5 py-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[ LEAVE ARENA ]</span>
            </button>
          ) : (
            <Link
              href="/"
              className="px-2 py-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[ ECHO ]</span>
            </Link>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <Gamepad2 className="w-4 h-4 text-white shrink-0" />
            <h1 className="font-bold text-xs sm:text-sm tracking-widest uppercase text-white truncate">
              ECHO ARCADE // 50 GAMES
            </h1>
          </div>
        </div>

        {/* Clean, Segmented Top Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setTournamentModalOpen(true)}
            className="px-2.5 py-1 border border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-white hover:text-white font-bold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="Tournaments & Brackets"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden md:inline">TOURNAMENT</span>
          </button>

          <button
            type="button"
            onClick={() => setBadgesModalOpen(true)}
            className="px-2.5 py-1 border border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-white hover:text-white font-bold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="Aura Badges & Hall of Fame"
          >
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">BADGES</span>
          </button>

          <button
            type="button"
            onClick={() => setVoicePartyOpen(!voicePartyOpen)}
            className={`px-2.5 py-1 border font-bold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              voicePartyOpen
                ? "border-white bg-white text-black font-black"
                : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-white hover:text-white"
            }`}
            title="Live Voice Lounges & Roast Ring"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>VOICE PARTY</span>
          </button>

          <button
            type="button"
            onClick={() => setViralHubOpen(!viralHubOpen)}
            className={`px-2.5 py-1 border font-bold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              viralHubOpen
                ? "border-white bg-white text-black font-black"
                : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-white hover:text-white"
            }`}
            title="Ghost Protocol & Bounties"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BOUNTIES</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenChallenge("ludo", "Cyber Arcade Challenge", "lobby", "global")}
            className="px-2.5 py-1 border border-white bg-white text-black hover:bg-neutral-200 font-black text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer shadow"
            title="1v1 Trash-Talk Duel"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>1V1 DUEL</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeMatch ? (
          /* ── Active Game Arena View ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExitActiveMatch}
                  className="px-2.5 py-1 border border-red-900 bg-red-950/60 hover:bg-red-900 hover:text-white text-red-300 font-bold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>[ ← EXIT ARENA ]</span>
                </button>
                <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <span>MATCH: {activeMatch.id.slice(0, 8)}</span>
                  <span>•</span>
                  <span>MODE: {activeMatch.mode === "VS_COMPUTER" ? "🤖 VS AI" : "👥 MULTIPLAYER"}</span>
                  <span>•</span>
                  <span>HOST: {activeMatch.hostHandle}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {activeMatch.status === "FINISHED" && (
                  <button
                    type="button"
                    onClick={() => setRevengeModalMatch(activeMatch)}
                    className="px-2.5 py-1 border border-white bg-white text-black hover:bg-neutral-200 font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>[ ⚔️ REVENGE CARD ]</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenRules(activeMatch.gameType)}
                  className="px-2 py-1 border border-neutral-700 bg-black text-neutral-300 hover:border-white hover:text-white font-bold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>RULES</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStory(activeMatch.gameType.toUpperCase(), "Battling in the cyber arena!", activeMatch.id)}
                  className="px-2.5 py-1 border border-neutral-700 bg-black text-neutral-300 hover:border-white hover:text-white font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-3 h-3" />
                  <span>[ 📱 STATUS VIDEO ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenChallenge(activeMatch.gameType, activeMatch.gameType.toUpperCase(), activeMatch.id, activeMatch.id)}
                  className="px-2.5 py-1 border border-neutral-700 bg-black text-neutral-300 hover:border-white hover:text-white font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Swords className="w-3 h-3" />
                  <span>[ ⚔️ POKE RIVAL ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteModalMatch(activeMatch)}
                  className="px-2.5 py-1 border border-white bg-white text-black hover:bg-neutral-200 font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3 h-3" />
                  <span>[ 🔗 INVITE 🎙️ ]</span>
                </button>

                {user?.uid === activeMatch.hostUid && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(activeMatch.id)}
                    className="p-1 border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer"
                    title="Delete / Terminate Arena"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="text-white font-bold border border-neutral-800 bg-neutral-900 px-2 py-0.5 uppercase">
                  STATUS: {activeMatch.status}
                </span>
              </div>
            </div>

            {/* In-Match Live Voice Filters & Reaction Soundboard */}
            {user && !activeMatch.players?.[user?.uid] ? (
              <div className="w-full bg-neutral-950 border-2 border-dashed border-neutral-700 p-3 mb-4 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                    LIVE SPECTATOR MODE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendSpectatorEvent(activeMatch.id, user.handle, "AIRHORN")}
                    className="px-3 py-1.5 bg-neutral-900 border border-blue-900 hover:bg-blue-900 hover:border-blue-500 text-blue-400 font-bold text-[10px] uppercase rounded transition-all"
                  >
                    📢 AIRHORN
                  </button>
                  <button
                    onClick={() => sendSpectatorEvent(activeMatch.id, user.handle, "APPLAUSE")}
                    className="px-3 py-1.5 bg-neutral-900 border border-emerald-900 hover:bg-emerald-900 hover:border-emerald-500 text-emerald-400 font-bold text-[10px] uppercase rounded transition-all"
                  >
                    👏 APPLAUSE
                  </button>
                  <button
                    onClick={() => sendSpectatorEvent(activeMatch.id, user.handle, "BOING")}
                    className="px-3 py-1.5 bg-neutral-900 border border-amber-900 hover:bg-amber-900 hover:border-amber-500 text-amber-400 font-bold text-[10px] uppercase rounded transition-all"
                  >
                    🤪 BOING
                  </button>
                </div>
              </div>
            ) : (
              <AgoraRTCProvider client={rtcClient}>
                <div className="flex flex-col gap-2">
                  <LiveVoiceFilterDock
                    currentFilter={activeVoiceFilter}
                    onFilterChange={(f) => setActiveVoiceFilter(f)}
                    rawMediaStream={rawMicStream}
                    onProcessedStream={setProcessedMicStream}
                  />
                  {activeMatch.enableVoice && (
                    <ArcadeVoiceChannel matchId={activeMatch.id} processedStream={processedMicStream} />
                  )}
                </div>
              </AgoraRTCProvider>
            )}

            {/* Victory Story Showcase Overlay */}
            {activeMatch.status === "FINISHED" && activeMatch.winnerUid === user?.uid && (
              <div className="w-full bg-gradient-to-r from-emerald-950 to-emerald-900 border-2 border-emerald-400 p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-[0_0_30px_rgba(16,185,129,0.3)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 text-black rounded-full flex items-center justify-center font-black shadow-[0_0_15px_#10b981] shrink-0">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-lg sm:text-xl tracking-widest drop-shadow-md">
                      VICTORY SECURED
                    </h3>
                    <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">
                      Showcase this win on your Insta / WhatsApp Story
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenStory(
                    activeMatch.gameType.toUpperCase(),
                    `Just dominated ${activeMatch.gameType.toUpperCase()}!`,
                    activeMatch.id
                  )}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-200 text-black font-black uppercase text-sm rounded shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                >
                  <Share2 className="w-5 h-5" />
                  <span>[ SHARE TO STORY ]</span>
                </button>
              </div>
            )}

            {/* Game Renderers */}
            {activeMatch.gameType === "rummy" && (
              <RummyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "call_break" && (
              <CallBreakGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "teen_patti" && (
              <TeenPattiGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "cheat_bluff" && (
              <CheatBluffGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "poker" && (
              <PokerGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "blackjack" && (
              <BlackjackGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "uno" && (
              <UnoGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "skribbl" && (
              <SkribblGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "taboo" && (
              <TabooGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "melody_buzzer" && (
              <MelodyBuzzerGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "pitch_arena" && (
              <PitchArenaGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "twenty_questions" && (
              <TwentyQuestionsGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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
            {activeMatch.gameType === "two_truths" && (
              <TwoTruthsGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "hangman" && (
              <HangmanGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "math_blitz" && (
              <MathBlitzGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "ludo" && (
              <LudoGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "pool" && (
              <PoolGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "carrom" && (
              <CarromGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "glow_hockey" && (
              <GlowHockeyGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snake" && (
              <SnakeGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "chess" && (
              <ChessGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "dots_and_boxes" && (
              <DotsAndBoxesGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snakes_and_ladders" && (
              <SnakesLaddersGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "connect4" && (
              <Connect4Game match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "sudoku" && (
              <SudokuGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "2048" && (
              <Game2048 match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "wordle" && (
              <WordleGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "puzzle15" && (
              <Puzzle15Game match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}

            {user && !activeMatch.players?.[user?.uid] && activeMatch.status !== "FINISHED" && (
              <button
                type="button"
                onClick={() => handleJoinMatch(activeMatch.id)}
                className="w-full max-w-xl mx-auto block py-3 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer shadow-xl"
              >
                [ 🎮 JOIN THIS MATCH AS PLAYER ]
              </button>
            )}
          </div>
        ) : (
          /* ── Arcade Hub & Lobby Discovery ── */
          <div className="space-y-6">
            {/* Collapsible Voice Modulator & Soundboard Drawer */}
            {voiceDockOpen && (
              <div className="animate-in fade-in slide-in-from-top-3 duration-200">
                <LiveVoiceFilterDock
                  currentFilter={activeVoiceFilter}
                  onFilterChange={(f) => setActiveVoiceFilter(f)}
                />
              </div>
            )}

            {/* Hero Banner */}
            <div className="border border-neutral-800 bg-neutral-950 p-4 sm:p-5 space-y-3 relative overflow-hidden font-mono">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-black text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 uppercase tracking-widest flex items-center gap-1.5">
                  <Gamepad2 className="w-3 h-3 text-white" />
                  <span>ECHO ARCADE // 50 MULTIPLAYER ARENAS</span>
                </span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                  LIVE AUDIO LOUNGE &amp; PvP
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
                Real-Time Multiplayer &amp; Party Arenas
              </h2>
              <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
                Play Carrom, 8-Ball Pool, Glow Hockey, Ludo, Card Bluffing, Raja Mantri, and Retro Classics live with friends or intelligent AI bots.
              </p>

              {/* Quick Launchers */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => handleOpenChallenge("ludo", "Ludo Cyber Master", "room_8912", "match_8912")}
                  className="px-3 py-1.5 border border-white bg-white text-black hover:bg-neutral-200 font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>1V1 TRASH-TALK DUEL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoicePartyOpen(!voicePartyOpen)}
                  className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>VOICE LOUNGE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRules("ludo")}
                  className="px-3 py-1.5 border border-neutral-800 bg-black hover:border-neutral-500 text-neutral-300 hover:text-white font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>RULES &amp; MANUAL</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStory("ECHO CYBER ARCADE", "Crushing the multiplayer lounge!", "8912")}
                  className="px-3 py-1.5 border border-neutral-800 bg-black hover:border-neutral-500 text-neutral-300 hover:text-white font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ml-auto"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>STATUS STORY</span>
                </button>
              </div>
            </div>

            {/* Voice Party & Social Confession Lounges (Roast Ring, Defend Absurd, Mimicry, Truth/Dare) */}
            {voicePartyOpen && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <VoicePartyLounge
                  currentUid={user?.uid || ""}
                  userHandle={user?.handle || "@PLAYER"}
                />
              </div>
            )}

            {/* 1v1 Tongue Twister Faceoff with Friend */}
            {voiceMechanicOpen && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <VoiceMechanicGames
                  userHandle={user?.handle || "@YOU"}
                  friendHandle="@FRIEND"
                />
              </div>
            )}

            {/* 5 Viral Mega-Mechanics Engine (Ghost Protocol, Streak Bounties, Mystery Node, Turf Wars, Capsules) */}
            {viralHubOpen && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <ViralMegaMechanicsHub
                  userHandle={user?.handle || "@PLAYER"}
                  onChallengeBounty={handleChallengeBounty}
                  onJoinGhostLounge={handleJoinGhostLounge}
                />
              </div>
            )}

            {/* The Midnight Ghost Grid (FOMO Time-Locked Lounges 11 PM - 4 AM) */}
            <MidnightGhostGrid onJoinGhostLounge={handleJoinGhostLounge} />

            {/* Category Filter Tabs & Search Bar */}
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Search Bar */}
                <div className="flex-1 min-w-[260px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH ANY OF 50 GAMES (NAME, MECHANIC, CATEGORY)..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-white pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-neutral-500 uppercase outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenRules("ludo")}
                  className="px-3 py-2 border border-white bg-black hover:bg-white hover:text-black text-white font-extrabold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>[ ❓ READ ALL 50 RULES ]</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(
                  [
                    { id: "ALL", label: "ALL 1-50 RANKED" },
                    { id: "CARD", label: "♠️ CARD & BLUFFING" },
                    { id: "PAPER", label: "👑 PAPER & DESI" },
                    { id: "PHYSICS", label: "🎱 2D PHYSICS" },
                    { id: "TACTICAL", label: "♟️ TACTICAL BOARDS" },
                    { id: "PARTY", label: "🎙️ VOICE PARTY" },
                    { id: "PUZZLE", label: "🧩 SOLO LOGIC" },
                  ] as const
                ).map((tab) => {
                  const isActive = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id as any)}
                      className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-black border-white"
                          : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-500 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 50 Games Directory Grid / Table */}
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
                <span>GAMES DIRECTORY ({filteredGames.length})</span>
                <span className="text-[10px] text-neutral-500">TAP TO PLAY INSTANTLY</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="border border-neutral-800 hover:border-white bg-neutral-950 p-3.5 flex flex-col justify-between transition-all rounded shadow-md group hover:bg-neutral-900/60"
                  >
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="text-3xl sm:text-2xl group-hover:scale-110 transition-transform">
                        {game.icon}
                      </div>
                      <h4 className="font-bold text-xs uppercase text-white tracking-wide truncate" title={game.name}>
                        {game.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-neutral-900 mt-2">
                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => handleOpenBotDifficulty(game.id)}
                        className="py-1.5 px-1 border border-neutral-700 bg-black hover:border-white hover:bg-white hover:text-black text-white font-bold text-[10px] uppercase transition-all cursor-pointer text-center truncate"
                        title={`Play ${game.name} vs AI Bot`}
                      >
                        [ 🤖 BOT ]
                      </button>

                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => handleOpenCreate(game.id)}
                        className="py-1.5 px-1 border border-white bg-white text-black hover:bg-neutral-200 font-bold text-[10px] uppercase transition-all cursor-pointer text-center truncate shadow"
                        title={`Create PvP Room in ${game.name}`}
                      >
                        [ 👥 PvP ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Open Match Lobbies */}
            <div className="space-y-3 pt-6 border-t border-neutral-900">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                // LIVE OPEN MATCH LOBBIES ({lobbyMatches.length})
              </h3>

              {lobbyMatches.length === 0 ? (
                <div className="border border-neutral-800 bg-neutral-950 p-8 text-center space-y-2">
                  <p className="text-xs text-neutral-500 uppercase">NO ACTIVE LOBBIES RIGHT NOW.</p>
                  <p className="text-[10px] text-neutral-600">CREATE A MATCH ABOVE TO START A GAME!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lobbyMatches.map((m) => {
                    const playerCount = Object.keys(m.players || {}).length;
                    const isFull = playerCount >= m.maxPlayers;
                    const isHost = user?.uid === m.hostUid;

                    return (
                      <div
                        key={m.id}
                        className="border border-neutral-800 hover:border-neutral-700 bg-neutral-950 p-3.5 flex items-center justify-between flex-wrap gap-3 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase text-white">{m.title || "ARCADE ARENA"}</span>
                            <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5">
                              {m.mode === "VS_COMPUTER" ? "AI BOT" : (m.gameType || "ARENA").toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-2">
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
                            className="p-2 border border-neutral-700 hover:border-white text-white transition-all cursor-pointer"
                            title="Invite Friends"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {isHost && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(m.id)}
                              className="p-2 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                              title="Delete Arena Lobby"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                            className="px-4 py-2 border-2 border-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                          >
                            {m.players?.[user?.uid || ""]
                              ? "[ RESUME ]"
                              : isFull
                              ? "[ SPECTATE ]"
                              : "[ JOIN & PLAY ⚔️ ]"}
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

      {/* Floating Bottom-Right [ ? RULES & MANUAL ] Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => handleOpenRules(activeMatch?.gameType || "ludo")}
          className="px-4 py-2.5 bg-black border-2 border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center gap-2 rounded-full cursor-pointer hover:scale-105 active:scale-95"
        >
          <HelpCircle className="w-4 h-4 animate-bounce" />
          <span className="font-mono tracking-wider">[ ❓ HELP & RULES ]</span>
        </button>
      </div>

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
            uid: user?.uid,
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

      {/* Dynamic Revenge Card Modal */}
      {revengeModalMatch && (
        <ArcadeRevengeCardModal
          isOpen={!!revengeModalMatch}
          onClose={() => setRevengeModalMatch(null)}
          match={revengeModalMatch}
          currentUid={user?.uid || ""}
        />
      )}

      {/* Campus Night Battles Tournament Bracket Modal */}
      {tournamentModalOpen && (
        <ArcadeTournamentBracketModal
          isOpen={tournamentModalOpen}
          onClose={() => {
            setTournamentModalOpen(false);
            setInitialTournamentId(undefined);
          }}
          gameType={activeMatch?.gameType || "hand_cricket"}
          hostUid={activeMatch?.hostUid || user?.uid || ""}
          currentUid={user?.uid || ""}
          initialTournamentId={initialTournamentId}
        />
      )}

      {/* 1-Tap Viral Status & Story Generator Modal */}
      <ViralStoryGeneratorModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        gameName={storyParams.gameName}
        userHandle={user?.handle || "@PLAYER"}
        scoreText={storyParams.scoreText}
        roomId={storyParams.roomId}
      />

      {/* 1v1 Auto-Poke & Trash-Talk Challenge Launcher Modal */}
      {user && (
        <ChallengeLauncherModal
          isOpen={challengeLauncherOpen}
          onClose={() => setChallengeLauncherOpen(false)}
          gameType={challengeParams.gameType}
          gameName={challengeParams.gameName}
          roomId={challengeParams.roomId}
          matchId={challengeParams.matchId}
          user={{
            uid: user?.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
        />
      )}

      {/* In-App Real-Time Incoming Challenge Alert */}
      <IncomingChallengeListener
        user={user ? { uid: user?.uid, handle: user.handle || "@ANON" } : null}
        onAcceptChallenge={(challenge) => {
          setActiveMatchId(challenge.roomId);
        }}
      />

      {/* Bot Difficulty Modal */}
      {botDifficultyModalOpen && pendingBotGameType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-sm bg-black border-2 border-white p-6 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.2)] flex flex-col items-center">
            <button
              onClick={() => {
                setBotDifficultyModalOpen(false);
                setPendingBotGameType(null);
              }}
              className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center mb-4 w-12 h-12 bg-white rounded-full">
              <span className="text-2xl">🤖</span>
            </div>
            <h2 className="text-lg font-black uppercase text-center mb-1 tracking-widest">
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
                className="w-full py-3 border-2 border-green-500 bg-green-950/40 text-green-400 font-black text-sm uppercase hover:bg-green-900 transition-colors cursor-pointer group flex justify-between px-4 items-center"
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
                className="w-full py-3 border-2 border-yellow-500 bg-yellow-950/40 text-yellow-400 font-black text-sm uppercase hover:bg-yellow-900 transition-colors cursor-pointer group flex justify-between px-4 items-center"
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
                className="w-full py-3 border-2 border-red-500 bg-red-950/40 text-red-400 font-black text-sm uppercase hover:bg-red-900 transition-colors cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)] group flex justify-between px-4 items-center"
              >
                <span>[ TERMINATOR ]</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">HARD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Winner Badges & Profile Flairs Modal */}
      {badgesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-2xl bg-black border-2 border-yellow-400 p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(250,204,21,0.2)] max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setBadgesModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-black uppercase tracking-widest">
                <Crown className="w-4 h-4 text-yellow-400 animate-bounce" />
                <span>// TERMINAL WINNER BADGES & PROFILE FLAIRS</span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white">
                Glowing Neon Elite Accolades
              </h2>
              <p className="text-xs text-neutral-400">
                Unlock glowing neon badges by dominating matches and displaying flairs on handles & rooms.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getAllBadges().map((badge) => (
                <div
                  key={badge.code}
                  className={`p-3.5 border-2 rounded-xl space-y-2 ${badge.borderColor} ${badge.bgGlow}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{badge.icon}</span>
                    <span className={`text-[10px] font-black uppercase font-mono ${badge.color}`}>
                      {badge.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-black uppercase text-white">{badge.title}</h4>
                  <p className="text-[10px] text-neutral-300">{badge.unlockCondition}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArcadePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white font-mono p-8">Loading Echo Arcade...</div>}>
      <ArcadeContent />
    </Suspense>
  );
}
