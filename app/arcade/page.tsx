"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  joinArcadeMatch,
  subscribeArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import SudokuGame from "@/app/components/arcade/SudokuGame";
import LudoGame from "@/app/components/arcade/LudoGame";
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
      setActiveMatchId(matchId); // Still allow viewing
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
            <span>LIVE VOICE CHAT ACTIVE</span>
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
                <span className="text-white font-bold border border-neutral-700 px-2 py-0.5 uppercase">
                  STATUS: {activeMatch.status}
                </span>
              </div>
            </div>

            {activeMatch.gameType === "sudoku" && (
              <SudokuGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}

            {activeMatch.gameType === "ludo" && (
              <LudoGame
                match={activeMatch}
                currentUid={user?.uid || ""}
                isHost={activeMatch.hostUid === user?.uid}
              />
            )}

            {user && !activeMatch.players[user.uid] && activeMatch.status !== "FINISHED" && (
              <button
                type="button"
                onClick={() => handleJoinMatch(activeMatch.id)}
                className="w-full max-w-xl mx-auto block py-3 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer"
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
                <span>// MULTIPLAYER & SOLO BOT AUDIO GAMING</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Play Retro Games Live While Talking Trash On Voice.
              </h2>
              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                Choose between **Single Player vs Smart Computer AI** or **Multiplayer Battles (2, 3, 4, 6 players)**. 
                Drop real-time reactions, chat in-game, and earn +100 Aura points!
              </p>
            </div>

            {/* Quick Game Launch Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-white" />
                // CHOOSE ARENA PROTOCOL
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ludo Game Launch Card */}
                <div className="border-2 border-white bg-neutral-950 p-5 space-y-4 hover:border-white transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-2xl">🎲</span>
                      <h4 className="font-extrabold text-base uppercase text-white tracking-wide">
                        15X15 PHYSICAL CYBER LUDO
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Authentic 15x15 monochrome board with 3D physical pip die, tactical captures, and solo or 2-4 player modes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">
                      SOLO VS BOT • 2-4 PLAYERS
                    </span>
                    <button
                      type="button"
                      disabled={!user}
                      onClick={() => handleOpenCreate("ludo")}
                      className="px-5 py-2.5 bg-white text-black font-extrabold text-xs uppercase hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-md"
                    >
                      [ CONFIGURE & PLAY 🎲 ]
                    </button>
                  </div>
                </div>

                {/* Sudoku Game Launch Card */}
                <div className="border-2 border-neutral-700 bg-neutral-950 p-5 space-y-4 hover:border-white transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-2xl">🧩</span>
                      <h4 className="font-extrabold text-base uppercase text-white tracking-wide">
                        1V1 SUDOKU DATA-GRID BATTLE
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Competitive speed puzzle matrix. Race against an AI bot or another player to fill numbers with zero mistakes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">
                      SOLO VS AI • 1V1 MULTIPLAYER
                    </span>
                    <button
                      type="button"
                      disabled={!user}
                      onClick={() => handleOpenCreate("sudoku")}
                      className="px-5 py-2.5 border-2 border-white bg-black text-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      [ CONFIGURE & PLAY 🧩 ]
                    </button>
                  </div>
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
                    return (
                      <div
                        key={m.id}
                        className="border border-neutral-800 hover:border-neutral-700 bg-neutral-950 p-3.5 flex items-center justify-between flex-wrap gap-3 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{m.gameType === "sudoku" ? "🧩" : "🎲"}</span>
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
