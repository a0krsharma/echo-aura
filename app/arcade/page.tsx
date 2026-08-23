"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  createArcadeMatch,
  joinArcadeMatch,
  subscribeArcadeMatch,
  deleteArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import LudoGame from "@/app/components/arcade/LudoGame";
import ChessGame from "@/app/components/arcade/ChessGame";
import Connect4Game from "@/app/components/arcade/Connect4Game";
import BattleshipGame from "@/app/components/arcade/BattleshipGame";
import SudokuGame from "@/app/components/arcade/SudokuGame";
import MinesweeperGame from "@/app/components/arcade/MinesweeperGame";
import Game2048 from "@/app/components/arcade/Game2048";
import SnakeGame from "@/app/components/arcade/SnakeGame";
import WordleGame from "@/app/components/arcade/WordleGame";
import PoolGame from "@/app/components/arcade/PoolGame";
import CarromGame from "@/app/components/arcade/CarromGame";
import GlowHockeyGame from "@/app/components/arcade/GlowHockeyGame";
import GomokuGame from "@/app/components/arcade/GomokuGame";
import ReversiGame from "@/app/components/arcade/ReversiGame";
import DotsAndBoxesGame from "@/app/components/arcade/DotsAndBoxesGame";
import SnakesLaddersGame from "@/app/components/arcade/SnakesLaddersGame";
import Puzzle15Game from "@/app/components/arcade/Puzzle15Game";
import MastermindGame from "@/app/components/arcade/MastermindGame";
import PokerGame from "@/app/components/arcade/PokerGame";
import BlackjackGame from "@/app/components/arcade/BlackjackGame";
import UnoGame from "@/app/components/arcade/UnoGame";
import LiarsDiceGame from "@/app/components/arcade/LiarsDiceGame";
import CodenamesGame from "@/app/components/arcade/CodenamesGame";
import SkribblGame from "@/app/components/arcade/SkribblGame";
import TriviaGame from "@/app/components/arcade/TriviaGame";
import QuoridorGame from "@/app/components/arcade/QuoridorGame";
import YahtzeeGame from "@/app/components/arcade/YahtzeeGame";
import MelodyBuzzerGame from "@/app/components/arcade/MelodyBuzzerGame";
import TabooGame from "@/app/components/arcade/TabooGame";
import PitchArenaGame from "@/app/components/arcade/PitchArenaGame";
import TwentyQuestionsGame from "@/app/components/arcade/TwentyQuestionsGame";
import ArcadeInviteModal from "@/app/components/arcade/ArcadeInviteModal";
import ArcadeCreateModal from "@/app/components/arcade/ArcadeCreateModal";
import {
  Gamepad2,
  Trophy,
  Flame,
  Swords,
  Zap,
  ArrowLeft,
  Play,
  RefreshCw,
  User,
  Share2,
  Mic2,
  Bot,
  Users,
  Trash2,
  Brain,
  CircleDollarSign,
  Dices,
  Shield,
  Music,
  Paintbrush,
  HelpCircle,
  Ban,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

function ArcadeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeMatch, setActiveMatch] = useState<ArcadeMatch | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [lobbyMatches, setLobbyMatches] = useState<ArcadeMatch[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultGameType, setDefaultGameType] = useState<ArcadeGameType>("ludo");
  const [inviteModalMatch, setInviteModalMatch] = useState<ArcadeMatch | null>(null);

  // Auto-load match from URL param ?matchId=XYZ or ?join=XYZ
  useEffect(() => {
    const paramMatchId = searchParams.get("matchId") || searchParams.get("join");
    if (paramMatchId) {
      setActiveMatchId(paramMatchId);
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
      !activeMatch.players[user.uid] &&
      activeMatch.status !== "FINISHED"
    ) {
      const currentCount = Object.keys(activeMatch.players || {}).length;
      if (currentCount < activeMatch.maxPlayers) {
        handleJoinMatch(activeMatch.id);
      }
    }
  }, [activeMatch, user]);

  // Subscribe to open arcade matches in the lobby
  useEffect(() => {
    const db = getFirebaseDb();
    let unsub: (() => void) | null = null;
    try {
      const q = query(collection(db, "rooms"), limit(30));
      unsub = onSnapshot(
        q,
        (snap) => {
          const matches: ArcadeMatch[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            if (data.isArcade || data.gameType) {
              matches.push({ id: doc.id, ...data } as ArcadeMatch);
            }
          });
          setLobbyMatches(matches);
        },
        (err) => {
          console.warn("Arcade lobby listener warning:", err.message);
        }
      );
    } catch (e) {
      console.warn("Arcade lobby init note:", e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleOpenCreate = (type: ArcadeGameType) => {
    setDefaultGameType(type);
    setCreateModalOpen(true);
  };

  const handleLaunchSolo = async (type: ArcadeGameType) => {
    if (!user) return;
    try {
      const matchId = await createArcadeMatch({
        gameType: type,
        title: `${type.toUpperCase()} // SOLO GRID`,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        mode: "VS_COMPUTER",
        maxPlayers: 1,
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

  return (
    <div className="min-h-screen bg-black text-white font-mono pb-24">
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
              ECHO ARCADE // SOCIAL LOUNGE
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-white font-bold border border-white bg-neutral-900 px-2 py-0.5 hidden sm:inline flex items-center gap-1.5">
            <Mic2 className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LIVE AUDIO CHANNEL ENABLED</span>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalMatch(activeMatch)}
                  className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3 h-3" />
                  <span>[ 🔗 INVITE PLAYERS & TALK 🎙️ ]</span>
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

            {/* Game Renderers */}
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
            {activeMatch.gameType === "trivia" && (
              <TriviaGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "quoridor" && (
              <QuoridorGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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
            {activeMatch.gameType === "gomoku" && (
              <GomokuGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "reversi" && (
              <ReversiGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
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
            {activeMatch.gameType === "minesweeper" && (
              <MinesweeperGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "2048" && (
              <Game2048 match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "snake" && (
              <SnakeGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "wordle" && (
              <WordleGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "puzzle15" && (
              <Puzzle15Game match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}
            {activeMatch.gameType === "mastermind" && (
              <MastermindGame match={activeMatch} currentUid={user?.uid || ""} isHost={activeMatch.hostUid === user?.uid} />
            )}

            {user && !activeMatch.players[user.uid] && activeMatch.status !== "FINISHED" && (
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
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="border-2 border-white bg-black p-6 space-y-3 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
                <Flame className="w-4 h-4 text-white animate-bounce" />
                <span>// SOCIAL AUDIO GAMING ARENA // $0 SERVER INFRASTRUCTURE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Play Voice Bluffing, Card Protocols, 2D Physics Tables & Party Games While Talking Live.
              </h2>
              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                Connect in real-time voice channels to play Texas Hold'em, Blackjack, Uno, Liar's Dice, Codenames, Vector Skribbl, Signal Race Trivia, 8-Ball Pool, Carrom, Glow Hockey, and interactive party improv games.
              </p>
            </div>

            {/* Category 1: Voice Bluffing & Card Protocols */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <CircleDollarSign className="w-3.5 h-3.5 text-white" />
                // VOICE BLUFFING & CARD PROTOCOLS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Poker */}
                <div className="border-2 border-white bg-neutral-950 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xl">♠️</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">TEXAS HOLD'EM</h4>
                    <p className="text-[10px] text-neutral-400">Heads-up betting, community cards & voice tells.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("poker")}
                    className="w-full py-2 bg-white text-black font-extrabold text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
                  >
                    [ PLAY POKER ]
                  </button>
                </div>

                {/* Blackjack */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🃏</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">BLACKJACK 21</h4>
                    <p className="text-[10px] text-neutral-400">Hit, stand & double down vs AI data dealer.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("blackjack")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY BLACKJACK ]
                  </button>
                </div>

                {/* Uno */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎴</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">UNO MATRIX</h4>
                    <p className="text-[10px] text-neutral-400">Match color, value & drop action cards.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("uno")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY UNO ]
                  </button>
                </div>

                {/* Liar's Dice */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎲</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">LIAR'S DICE</h4>
                    <p className="text-[10px] text-neutral-400">Hidden dice trays & call bluff showdowns.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("liars_dice")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY LIAR'S DICE ]
                  </button>
                </div>
              </div>
            </div>

            {/* Category 2: Live Party & Acoustic Showdowns */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-white" />
                // LIVE PARTY, CANVAS & ACOUSTIC SHOWDOWNS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Skribbl */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎨</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">VECTOR SKRIBBL</h4>
                    <p className="text-[10px] text-neutral-400">Live vector drawing board & word guessing.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("skribbl")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY SKRIBBL ]
                  </button>
                </div>

                {/* Codenames */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🕵️</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">CODENAMES</h4>
                    <p className="text-[10px] text-neutral-400">5x5 decryption grid with spymaster word clues.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("codenames")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY CODENAMES ]
                  </button>
                </div>

                {/* Signal Race Trivia */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">SIGNAL TRIVIA</h4>
                    <p className="text-[10px] text-neutral-400">Timed code and tech multiple choice rounds.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("trivia")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY TRIVIA ]
                  </button>
                </div>

                {/* Melody Buzzer */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎵</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">MELODY HUMMER</h4>
                    <p className="text-[10px] text-neutral-400">Hum melodies into mic with speed buzzer guesses.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("melody_buzzer")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY HUMMER ]
                  </button>
                </div>

                {/* Taboo */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🚫</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">FORBIDDEN LEXICON</h4>
                    <p className="text-[10px] text-neutral-400">Describe secret keywords without taboo words.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("taboo")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY TABOO ]
                  </button>
                </div>

                {/* Pitch Arena */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">💡</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">PITCH ARENA</h4>
                    <p className="text-[10px] text-neutral-400">Defend absurd startup ideas on live mic for Volts.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("pitch_arena")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY PITCH ARENA ]
                  </button>
                </div>

                {/* 20 Questions */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">❓</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">20 QUESTIONS</h4>
                    <p className="text-[10px] text-neutral-400">Deduce secret topics with Yes/No voice queries.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("twenty_questions")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY 20 QUESTIONS ]
                  </button>
                </div>

                {/* Quoridor */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🧱</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">QUORIDOR RUNNER</h4>
                    <p className="text-[10px] text-neutral-400">Pawn race to opposite wall with barrier placement.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("quoridor")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY QUORIDOR ]
                  </button>
                </div>
              </div>
            </div>

            {/* Category 3: 2D Physics Tables & Board Classics */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-white" />
                // 2D PHYSICS TABLES & BOARD CLASSICS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Ludo */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎲</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">15X15 CYBER LUDO</h4>
                    <p className="text-[10px] text-neutral-400">Classic race with 3D die & captures.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("ludo")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY LUDO ]
                  </button>
                </div>

                {/* Pool */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🎱</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">8-BALL POOL</h4>
                    <p className="text-[10px] text-neutral-400">2D physics table with cue aiming & pockets.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("pool")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY POOL ]
                  </button>
                </div>

                {/* Carrom */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">⚪</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">CARROM BOARD</h4>
                    <p className="text-[10px] text-neutral-400">Striker sliding & coin pocketing physics.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("carrom")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY CARROM ]
                  </button>
                </div>

                {/* Glow Hockey */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">GLOW HOCKEY</h4>
                    <p className="text-[10px] text-neutral-400">60FPS neon glow air hockey clash vs AI or 2P.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("glow_hockey")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY HOCKEY ]
                  </button>
                </div>
              </div>
            </div>

            {/* Category 4: Solo Puzzles & Deduction Grid (1-Tap Instant Launch) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-white" />
                // SOLO PUZZLES & DEDUCTION (1-TAP INSTANT PLAY)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {/* 15-Puzzle */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🧩</span>
                    <h4 className="font-bold text-xs uppercase text-white">15-PUZZLE</h4>
                    <p className="text-[9px] text-neutral-500">Slide into 1-15 order</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("puzzle15")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>

                {/* Mastermind */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🔐</span>
                    <h4 className="font-bold text-xs uppercase text-white">MASTERMIND</h4>
                    <p className="text-[9px] text-neutral-500">4-digit code bypass</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("mastermind")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>

                {/* Minesweeper */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">💣</span>
                    <h4 className="font-bold text-xs uppercase text-white">MINESWEEPER</h4>
                    <p className="text-[9px] text-neutral-500">9x9 bomb clearing</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("minesweeper")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>

                {/* 2048 */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🔢</span>
                    <h4 className="font-bold text-xs uppercase text-white">2048 MERGE</h4>
                    <p className="text-[9px] text-neutral-500">Slide & merge tiles</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("2048")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>

                {/* Snake */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🐍</span>
                    <h4 className="font-bold text-xs uppercase text-white">SNAKE</h4>
                    <p className="text-[9px] text-neutral-500">3 speed modes</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("snake")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>

                {/* Wordle */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🔤</span>
                    <h4 className="font-bold text-xs uppercase text-white">WORDLE</h4>
                    <p className="text-[9px] text-neutral-500">5-letter decrypting</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleLaunchSolo("wordle")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ ⚡ PLAY ]
                  </button>
                </div>
              </div>
            </div>

            {/* Live Open Match Lobbies */}
            <div className="space-y-3">
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
                            <span className="font-bold text-xs uppercase text-white">{m.title}</span>
                            <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5">
                              {m.mode === "VS_COMPUTER" ? "AI BOT" : m.gameType.toUpperCase()}
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
                              if (m.players[user?.uid || ""]) {
                                setActiveMatchId(m.id);
                              } else {
                                handleJoinMatch(m.id);
                              }
                            }}
                            className="px-4 py-2 border-2 border-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                          >
                            {m.players[user?.uid || ""]
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
