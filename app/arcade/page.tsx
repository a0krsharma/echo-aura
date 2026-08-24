"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  createArcadeMatch,
  joinArcadeMatch,
  subscribeArcadeMatch,
  subscribeLobbyArcadeMatches,
  deleteArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import LudoGame from "@/app/components/arcade/LudoGame";
import ChessGame from "@/app/components/arcade/ChessGame";
import Connect4Game from "@/app/components/arcade/Connect4Game";
import BattleshipGame from "@/app/components/arcade/BattleshipGame";
import SudokuGame from "@/app/components/arcade/SudokuGame";
import Game2048 from "@/app/components/arcade/Game2048";
import WordleGame from "@/app/components/arcade/WordleGame";
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
import SattePeSattaGame from "@/app/components/arcade/SattePeSattaGame";
import CheatBluffGame from "@/app/components/arcade/CheatBluffGame";
import LiarsDiceGame from "@/app/components/arcade/LiarsDiceGame";
import CodenamesGame from "@/app/components/arcade/CodenamesGame";
import SkribblGame from "@/app/components/arcade/SkribblGame";
import YahtzeeGame from "@/app/components/arcade/YahtzeeGame";
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
} from "lucide-react";
import Link from "next/link";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

type CategoryFilter = "ALL" | "CARD" | "PAPER" | "PHYSICS" | "TACTICAL" | "PARTY" | "PUZZLE";

interface MasterRankedGame {
  rank: number;
  id: ArcadeGameType;
  name: string;
  category: CategoryFilter;
  categoryLabel: string;
  icon: string;
  mechanic: string;
  isPlayable: boolean;
}

const MASTER_50_GAMES: MasterRankedGame[] = [
  { rank: 1, id: "rummy", name: "Indian 13-Card Rummy", category: "CARD", categoryLabel: "Card & Sequences", icon: "🃏", mechanic: "Pure sequence, second sequence, and sets with wild jokers and 0 deadwood show.", isPlayable: true },
  { rank: 2, id: "call_break", name: "Call Break (Lakdi)", category: "CARD", categoryLabel: "Trick-Taking Trump", icon: "♠️", mechanic: "Spades permanent trumps, bidding 1-13 tricks with overtrick bonus scoring.", isPlayable: true },
  { rank: 3, id: "teen_patti", name: "Teen Patti (3-Card Flush)", category: "CARD", categoryLabel: "Social Wagering", icon: "🔥", mechanic: "Blind vs Seen betting, Trail/Sequence/Color hand rankings, and pot showdowns.", isPlayable: true },
  { rank: 4, id: "ludo", name: "Ludo (Terminal Edition)", category: "TACTICAL", categoryLabel: "Tactical Board", icon: "🎲", mechanic: "4-token home run race with real-time dice rolls and voice banter.", isPlayable: true },
  { rank: 5, id: "chess", name: "Chess (Grid Protocol)", category: "TACTICAL", categoryLabel: "Tactical Board", icon: "♟️", mechanic: "Pure black & white grandmaster mastery with FIDE rule validation.", isPlayable: true },
  { rank: 6, id: "uno", name: "Uno / Crazy Eights", category: "CARD", categoryLabel: "Card & Discard", icon: "🎴", mechanic: "Color, number, and action card matching with turn reversals.", isPlayable: true },
  { rank: 7, id: "satte_pe_satta", name: "Satte Pe Satta (7 of Hearts)", category: "CARD", categoryLabel: "Card Shedding", icon: "❤️", mechanic: "7 of Hearts opening table, extending 8->K and 6->A across four suits.", isPlayable: true },
  { rank: 8, id: "cheat_bluff", name: "Cheat / Bluff (I Doubt It)", category: "CARD", categoryLabel: "Card Bluffing", icon: "🚨", mechanic: "Sequential face-down discards with high-stakes 'Cheat!' challenge callouts.", isPlayable: true },
  { rank: 9, id: "poker", name: "Texas Hold'em Poker", category: "CARD", categoryLabel: "Card Bluffing", icon: "♦️", mechanic: "2-card hole, community flop/turn/river betting, and pot calculation.", isPlayable: true },
  { rank: 10, id: "blackjack", name: "Blackjack 21", category: "CARD", categoryLabel: "Card Probability", icon: "♣️", mechanic: "Hitting, standing, doubling to beat dealer hand total without exceeding 21.", isPlayable: true },
  { rank: 11, id: "snakes_and_ladders", name: "Snakes & Ladders (Circuit)", category: "TACTICAL", categoryLabel: "Board Race", icon: "🪜", mechanic: "100-tile boustrophedon track with 3D dice rolls and live player tickers.", isPlayable: true },
  { rank: 12, id: "raja_mantri", name: "Raja Mantri Chor Sipahi", category: "PAPER", categoryLabel: "Paper Chit", icon: "👑", mechanic: "4-chit role distribution with voice cross-examination and micro-bluffing.", isPlayable: true },
  { rank: 13, id: "hand_cricket", name: "Hand Cricket (Odd-Even)", category: "PAPER", categoryLabel: "Schoolyard Mind", icon: "🏏", mechanic: "1–6 number throws with run accumulation and wicket sniping.", isPlayable: true },
  { rank: 14, id: "book_cricket", name: "Book Cricket", category: "PAPER", categoryLabel: "Classroom Paper", icon: "📖", mechanic: "Page-flipping run scoring based on even/odd digits.", isPlayable: true },
  { rank: 15, id: "bingo", name: "Bingo / 25-Cross", category: "PAPER", categoryLabel: "Classroom Grid", icon: "🔢", mechanic: "Crossing off 1–25 called numbers to complete 5 linear lines.", isPlayable: true },
  { rank: 16, id: "connect4", name: "Connect Four Matrix", category: "TACTICAL", categoryLabel: "Grid Alignment", icon: "🔴", mechanic: "Dropping colored tokens into a 7x6 vertical matrix.", isPlayable: true },
  { rank: 17, id: "sudoku", name: "Sudoku Data Matrix", category: "PUZZLE", categoryLabel: "Solo Logic", icon: "🧩", mechanic: "9x9 number-placement puzzle with zero calculation errors.", isPlayable: true },
  { rank: 18, id: "2048", name: "2048 Binary Merge", category: "PUZZLE", categoryLabel: "Tile Merge", icon: "🔢", mechanic: "Merging powers-of-two tiles along a 4x4 sliding grid.", isPlayable: true },
  { rank: 19, id: "glow_hockey", name: "Glow Hockey", category: "PHYSICS", categoryLabel: "Fast 2D Physics", icon: "⚡", mechanic: "Neon paddle deflection and puck striking duels.", isPlayable: true },
  { rank: 20, id: "dots_and_boxes", name: "Dots and Boxes (Dabba)", category: "TACTICAL", categoryLabel: "Territory Grid", icon: "🕸️", mechanic: "Drawing lines between nodes to complete 4-sided captured boxes.", isPlayable: true },
  { rank: 21, id: "hangman", name: "Hangman Word Scaffold", category: "PAPER", categoryLabel: "Word Deduction", icon: "🔤", mechanic: "Guessing secret phrase letters before gallows limbs appear.", isPlayable: true },
  { rank: 22, id: "math_blitz", name: "Arithmetic Math Blitz", category: "PUZZLE", categoryLabel: "Math Speed Duel", icon: "⚡", mechanic: "Rapid 1v1 mental math speed battle with 3s timers.", isPlayable: true },
  { rank: 23, id: "wordle", name: "Wordle / Cipher", category: "PUZZLE", categoryLabel: "Linguistic Strategy", icon: "🔐", mechanic: "Deduce 5-letter cipher with color feedback.", isPlayable: true },
  { rank: 24, id: "skribbl", name: "Skribbl / Pictionary", category: "PARTY", categoryLabel: "Vector Canvas", icon: "🎨", mechanic: "Vector path drawing with live open-mic guessing.", isPlayable: true },
  { rank: 25, id: "codenames", name: "Codenames Decryption", category: "PARTY", categoryLabel: "Deduction Grid", icon: "🕵️", mechanic: "5x5 operative word grid decryption via one-word clues.", isPlayable: true },
  { rank: 26, id: "twenty_questions", name: "20 Questions / Decryption", category: "PARTY", categoryLabel: "Verbal Deduction", icon: "❓", mechanic: "Yes/No interrogations to identify a hidden entity.", isPlayable: true },
  { rank: 27, id: "npat", name: "Name, Place, Animal, Thing", category: "PAPER", categoryLabel: "Rapid Vocabulary", icon: "📝", mechanic: "30-second timed round naming categories for a specific letter.", isPlayable: true },
  { rank: 28, id: "melody_buzzer", name: "Antakshari / Melody Relay", category: "PARTY", categoryLabel: "Voice Music Relay", icon: "🎵", mechanic: "Singing/reciting poetry starting with previous ending verse.", isPlayable: true },
  { rank: 29, id: "two_truths", name: "Two Truths & a Lie", category: "PARTY", categoryLabel: "Voice Bluffing", icon: "🎭", mechanic: "Audio deduction identifying 1 fabricate lie amongst truths.", isPlayable: true },
  { rank: 30, id: "taboo", name: "Taboo Word Shield", category: "PARTY", categoryLabel: "Voice Vocabulary", icon: "🚫", mechanic: "Describing keywords without uttering forbidden taboo terms.", isPlayable: true },
  { rank: 31, id: "pitch_arena", name: "Pitch Arena (Absurd Defense)", category: "PARTY", categoryLabel: "Voice Debate", icon: "🎙️", mechanic: "60-second rapid absurd pitch with audience tip voting.", isPlayable: true },
  { rank: 32, id: "puzzle15", name: "15-Puzzle Sliding Matrix", category: "PUZZLE", categoryLabel: "Tile Sliding", icon: "🔢", mechanic: "Sliding numbered square tiles into 1-15 numerical order.", isPlayable: true },
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

  // Viral Growth Engine State
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyParams, setStoryParams] = useState({
    gameName: "LUDO CYBER MASTER",
    scoreText: "Wiped the lobby with 4 home runs!",
    roomId: "8912",
  });

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
  const [viralHubOpen, setViralHubOpen] = useState(false);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

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
        hostUid: user.uid,
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

  const handleLaunchSolo = async (type: ArcadeGameType) => {
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
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        mode: maxPlayers === 1 ? "MULTIPLAYER" : "VS_COMPUTER",
        maxPlayers,
        enableVoice: false,
        stakes: 0,
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
      await deleteArcadeMatch(matchId, user.uid);
      setActiveMatchId(null);
      setActiveMatch(null);
    }
  };

  const filteredGames = MASTER_50_GAMES.filter((g) => {
    const matchesCategory = activeCategory === "ALL" || g.category === activeCategory;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.mechanic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black text-white font-mono pb-24 relative">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeMatchId ? (
            <button
              onClick={() => {
                setActiveMatchId(null);
                setActiveMatch(null);
              }}
              className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>[ LEAVE ARENA ]</span>
            </button>
          ) : (
            <Link
              href="/"
              className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>[ ECHO ]</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
            <h1 className="font-bold text-sm tracking-widest uppercase text-white">
              ECHO ARCADE // 50-GAME LOUNGE
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenStory(activeMatch?.gameType ? activeMatch.gameType.toUpperCase() : "RETRO ARCADE", "Crushed the lobby with high aura!", activeMatch?.id || "8912")}
            className="px-2.5 py-1 border border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="Export 15s Animated Video or Cassette Story"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">[ 📱 STORY STUDIO ]</span>
            <span className="sm:hidden">[ 📱 STORY ]</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenChallenge(activeMatch?.gameType || "ludo", "Ludo Cyber Master", activeMatch?.id || "room_8912", activeMatch?.id || "match_8912")}
            className="px-2.5 py-1 border border-rose-500 bg-rose-950/40 text-rose-300 hover:bg-rose-500 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="1v1 Trash-Talk Poke & Challenge Rival"
          >
            <Swords className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">[ ⚔️ POKE / DUEL ]</span>
            <span className="sm:hidden">[ ⚔️ DUEL ]</span>
          </button>

          <button
            type="button"
            onClick={() => setVoiceDockOpen(!voiceDockOpen)}
            className={`px-2.5 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              voiceDockOpen
                ? "border-emerald-400 bg-emerald-400 text-black"
                : "border-neutral-700 bg-black text-neutral-300 hover:border-white"
            }`}
            title="Toggle Client-Side Voice Modulators & Soundboard"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>[ 🎙️ VOICE FX ]</span>
          </button>

          <button
            type="button"
            onClick={() => setVoicePartyOpen(!voicePartyOpen)}
            className={`px-2.5 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              voicePartyOpen
                ? "border-purple-400 bg-purple-400 text-black"
                : "border-purple-800 bg-purple-950/40 text-purple-300 hover:border-purple-400"
            }`}
            title="60s Roast Ring, Defend Absurd, Mimicry & Truth/Dare"
          >
            <Mic2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">[ 🎙️ VOICE PARTY ]</span>
          </button>

          <button
            type="button"
            onClick={() => setVoiceMechanicOpen(!voiceMechanicOpen)}
            className={`px-2.5 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              voiceMechanicOpen
                ? "border-amber-400 bg-amber-400 text-black"
                : "border-amber-800 bg-amber-950/40 text-amber-300 hover:border-amber-400"
            }`}
            title="1v1 Tongue Twister Faceoff with Friend"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">[ 👅 TONGUE TWISTERS ]</span>
            <span className="sm:hidden">[ 👅 TWISTERS ]</span>
          </button>

          <button
            type="button"
            onClick={() => setBadgesModalOpen(true)}
            className="px-2.5 py-1 border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="View Terminal Winner Badges & Profile Flairs"
          >
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">[ 👑 BADGES ]</span>
          </button>

          <button
            type="button"
            onClick={() => setViralHubOpen(!viralHubOpen)}
            className={`px-2.5 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              viralHubOpen
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-rose-800 bg-rose-950/40 text-rose-300 hover:border-rose-400"
            }`}
            title="Ghost Protocol, Streak Bounties, Mystery Node & Turf Wars"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">[ ⚡ HIT LIST & BOUNTIES ]</span>
            <span className="sm:hidden">[ ⚡ BOUNTIES ]</span>
          </button>

          <button
            type="button"
            onClick={() => setTournamentModalOpen(true)}
            className="px-2.5 py-1 border border-amber-400 bg-amber-950/40 text-amber-300 hover:bg-amber-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">[ 🏆 TOURNAMENT ]</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenRules(activeMatch?.gameType || "ludo")}
            className="px-2.5 py-1 border border-neutral-700 bg-black text-neutral-400 hover:border-white hover:text-white font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>[ ❓ ]</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeMatch ? (
          /* ── Active Game Arena View ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs flex-wrap gap-2">
              <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <span>MATCH: {activeMatch.id.slice(0, 8)}</span>
                <span>•</span>
                <span>MODE: {activeMatch.mode === "VS_COMPUTER" ? "🤖 VS AI" : "👥 MULTIPLAYER"}</span>
                <span>•</span>
                <span>HOST: {activeMatch.hostHandle}</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {activeMatch.status === "FINISHED" && (
                  <button
                    type="button"
                    onClick={() => setRevengeModalMatch(activeMatch)}
                    className="px-2.5 py-1 border-2 border-red-500 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-lg animate-bounce"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>[ ⚔️ REVENGE CARD / SHARE ]</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenRules(activeMatch.gameType)}
                  className="px-2 py-1 border border-emerald-400 bg-black text-emerald-300 hover:bg-emerald-400 hover:text-black font-bold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>RULES</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenStory(activeMatch.gameType.toUpperCase(), "Battling in the cyber arena!", activeMatch.id)}
                  className="px-2.5 py-1 border border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-400 hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-3 h-3" />
                  <span>[ 📱 STATUS VIDEO ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenChallenge(activeMatch.gameType, activeMatch.gameType.toUpperCase(), activeMatch.id, activeMatch.id)}
                  className="px-2.5 py-1 border border-rose-500 bg-rose-950/40 text-rose-300 hover:bg-rose-500 hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Swords className="w-3 h-3" />
                  <span>[ ⚔️ POKE RIVAL ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteModalMatch(activeMatch)}
                  className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3 h-3" />
                  <span>[ 🔗 INVITE 🎙️ ]</span>
                </button>

                {user?.uid === activeMatch.hostUid && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(activeMatch.id)}
                    className="p-1 border border-red-900 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
                    title="Delete / Terminate Arena"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="text-white font-bold border border-neutral-700 px-2 py-0.5 uppercase">
                  STATUS: {activeMatch.status}
                </span>
              </div>
            </div>

            {/* In-Match Live Voice Filters & Reaction Soundboard */}
            <LiveVoiceFilterDock
              currentFilter={activeVoiceFilter}
              onFilterChange={(f) => setActiveVoiceFilter(f)}
            />

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
            {activeMatch.gameType === "satte_pe_satta" && (
              <SattePeSattaGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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
            {activeMatch.gameType === "liars_dice" && (
              <LiarsDiceGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "codenames" && (
              <CodenamesGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "skribbl" && (
              <SkribblGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "yahtzee" && (
              <YahtzeeGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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
            {activeMatch.gameType === "battleship" && (
              <BattleshipGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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

            {user && !activeMatch.players?.[user.uid] && activeMatch.status !== "FINISHED" && (
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
            <div className="border-2 border-white bg-black p-6 space-y-4 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
                <Flame className="w-4 h-4 text-white animate-bounce" />
                <span>// PREMIER RETRO LOUNGE // $0 SERVER INFRASTRUCTURE // LIVE AUDIO</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Ranked Multiplayer & Retro Arcade Suite: Paper Chits, 2D Physics, Card Bluffing & Voice Party Showdowns.
              </h2>
              <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
                Connect in real-time voice channels to play Raja Mantri Chor Sipahi, Hand Cricket, Book Cricket, 8-Ball Pool, Texas Hold'em, Uno, Carrom, Ludo, Skribbl, Codenames, Bingo, Hangman, and nostalgic classroom & board classics.
              </p>

              {/* 1-Tap Growth Engine Quick Launchers */}
              <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleOpenStory("ECHO CYBER ARCADE", "Crushing the multiplayer lounge!", "8912")}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>[ 📱 1-TAP WHATSAPP / IG STATUS VIDEO EXPORT ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenChallenge("ludo", "Ludo Cyber Master", "room_8912", "match_8912")}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-lg transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>[ ⚔️ 1v1 TRASH-TALK DUEL LAUNCHER ]</span>
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
            <div className="space-y-3">
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
                  className="px-3 py-2 border-2 border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-400 hover:text-black font-extrabold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>[ ❓ READ ALL 50 RULES ]</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === "ALL"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  [ ALL 1-50 RANKED ]
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("CARD")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "CARD"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>♠️ CARD & BLUFFING</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("PAPER")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "PAPER"
                      ? "bg-amber-400 text-black border-amber-400"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>👑 NOSTALGIC PAPER & DESI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("PHYSICS")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "PHYSICS"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>🎱 2D PHYSICS TABLES</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("TACTICAL")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "TACTICAL"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>♟️ TACTICAL BOARDS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("PARTY")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "PARTY"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>🎙️ VOICE PARTY & DEDUCTION</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("PUZZLE")}
                  className={`px-3 py-1.5 border font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    activeCategory === "PUZZLE"
                      ? "bg-white text-black border-white"
                      : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  <span>🧩 SOLO LOGIC & PUZZLES</span>
                </button>
              </div>
            </div>

            {/* 50 Games Directory Grid / Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
                <span>DIRECTORY SHOWING {filteredGames.length} OF 50 RANKED GAMES</span>
                <span>SORTED BY ENGAGEMENT & RETENTION RANK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredGames.map((game) => (
                  <div
                    key={`${game.rank}-${game.id}`}
                    className="border-2 border-neutral-800 hover:border-white bg-neutral-950 p-4 space-y-3 flex flex-col justify-between transition-all rounded-none shadow-md group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase">
                        <span className="font-black text-emerald-400">RANK #{game.rank}</span>
                        <span className="border border-neutral-800 bg-black px-1.5 py-0.5">
                          {game.categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{game.icon}</span>
                        <h4 className="font-black text-xs uppercase text-white tracking-wide">
                          {game.name}
                        </h4>
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-relaxed">
                        {game.mechanic}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={() => handleOpenRules(game.id)}
                        className="p-2 border border-neutral-700 hover:border-emerald-400 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        title={`Read ${game.name} Rules`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenChallenge(game.id, game.name, "room_8912", "match_8912")}
                        className="p-2 border border-rose-900 bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-xs uppercase transition-all cursor-pointer"
                        title={`1v1 Trash-Talk Duel in ${game.name}`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => handleOpenCreate(game.id)}
                        className="flex-1 py-2 border border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all cursor-pointer shadow"
                      >
                        [ 🎮 PLAY #{game.rank} ]
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
            uid: user.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
        />
      )}

      {/* In-App Real-Time Incoming Challenge Alert */}
      <IncomingChallengeListener
        user={user ? { uid: user.uid, handle: user.handle || "@ANON" } : null}
        onAcceptChallenge={(challenge) => {
          setActiveMatchId(challenge.roomId);
        }}
      />

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
