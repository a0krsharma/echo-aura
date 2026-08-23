"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
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

            {/* 9 Game Renderers */}
            {activeMatch.gameType === "ludo" && (
              <LudoGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "chess" && (
              <ChessGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "connect4" && (
              <Connect4Game
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "battleship" && (
              <BattleshipGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "sudoku" && (
              <SudokuGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "minesweeper" && (
              <MinesweeperGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "2048" && (
              <Game2048
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "snake" && (
              <SnakeGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}
            {activeMatch.gameType === "wordle" && (
              <WordleGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
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
                Play Retro Lounge Games & Solo Puzzles While Talking Live.
              </h2>
              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                Compete in multiplayer board games (Ludo, Chess, Connect 4, Battleship) or chill with solo matrix puzzles (Sudoku, Minesweeper, 2048, Snake, Wordle).
              </p>
            </div>

            {/* Section 1: Multiplayer Lounge Games */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5 text-white" />
                  // MULTIPLAYER SOCIAL LOUNGE (2-6P OR VS BOT)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Ludo */}
                <div className="border-2 border-white bg-neutral-950 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-xl">🎲</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">15X15 CYBER LUDO</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      Classic race with 3D die, captures, and safe stars.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("ludo")}
                    className="w-full py-2 bg-white text-black font-extrabold text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
                  >
                    [ PLAY LUDO ]
                  </button>
                </div>

                {/* 2. Chess */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">♟️</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">CHESS PROTOCOL</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      8x8 tactical battle vs Grandmaster AI or friend.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("chess")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY CHESS ]
                  </button>
                </div>

                {/* 3. Connect 4 */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🔴</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">CONNECT FOUR</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      7x6 data-stream token drop 4-in-a-row race.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("connect4")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY CONNECT 4 ]
                  </button>
                </div>

                {/* 4. Battleship */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🚢</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">BATTLESHIP RADAR</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      10x10 radar command naval artillery battle.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("battleship")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY BATTLESHIP ]
                  </button>
                </div>

                {/* 5. Sudoku */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-4 space-y-3 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-1">
                    <span className="text-xl">🧩</span>
                    <h4 className="font-extrabold text-xs uppercase text-white">1V1 SUDOKU RACE</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      Head-to-head competitive data-grid puzzle race.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("sudoku")}
                    className="w-full py-2 border border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
                  >
                    [ PLAY SUDOKU ]
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Solo Arcade & Puzzle Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-white" />
                  // SOLO PUZZLE & RETRO ARCADE GRID
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    onClick={() => handleOpenCreate("minesweeper")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ PLAY ]
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
                    onClick={() => handleOpenCreate("2048")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ PLAY ]
                  </button>
                </div>

                {/* Snake */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🐍</span>
                    <h4 className="font-bold text-xs uppercase text-white">SNAKE ARCADE</h4>
                    <p className="text-[9px] text-neutral-500">Phosphor terminal snake</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("snake")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ PLAY ]
                  </button>
                </div>

                {/* Wordle */}
                <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2 flex flex-col justify-between hover:border-white transition-all">
                  <div className="space-y-0.5">
                    <span className="text-lg">🔤</span>
                    <h4 className="font-bold text-xs uppercase text-white">CIPHER WORDLE</h4>
                    <p className="text-[9px] text-neutral-500">5-letter decrypting</p>
                  </div>
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleOpenCreate("wordle")}
                    className="w-full py-1.5 border border-white bg-white text-black font-bold text-[10px] uppercase hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    [ PLAY ]
                  </button>
                </div>
              </div>
            </div>

            {/* Live Open Match Lobbies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                  // LIVE OPEN MATCH LOBBIES ({lobbyMatches.length})
                </h3>
              </div>

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
