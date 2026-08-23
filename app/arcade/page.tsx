"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  createArcadeMatch,
  joinArcadeMatch,
  subscribeArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import SudokuGame from "@/app/components/arcade/SudokuGame";
import LudoGame from "@/app/components/arcade/LudoGame";
import { Gamepad2, Trophy, Flame, Swords, Zap, ArrowLeft, Play, RefreshCw, User } from "lucide-react";
import Link from "next/link";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export default function ArcadePage() {
  const { user } = useAuth();
  const [activeMatch, setActiveMatch] = useState<ArcadeMatch | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [lobbyMatches, setLobbyMatches] = useState<ArcadeMatch[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<ArcadeGameType>("sudoku");
  const [creating, setCreating] = useState(false);

  // Subscribe to active match if playing
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setActiveMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  // Subscribe to open arcade matches in the lobby
  useEffect(() => {
    const db = getFirebaseDb();
    let unsub: (() => void) | null = null;
    try {
      const q = query(collection(db, "arcade_matches"), limit(15));
      unsub = onSnapshot(
        q,
        (snap) => {
          const matches: ArcadeMatch[] = [];
          snap.forEach((doc) => {
            matches.push({ id: doc.id, ...doc.data() } as ArcadeMatch);
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

  const handleCreateMatch = async (type: ArcadeGameType) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const matchId = await createArcadeMatch({
        gameType: type,
        title: type === "sudoku" ? "SUDOKU BATTLE ARENA" : "CYBER LUDO CLASH",
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        stakes: 50,
      });
      setActiveMatchId(matchId);
    } catch (e) {
      console.error("Failed to create match:", e);
    } finally {
      setCreating(false);
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
    } catch (e) {
      console.error("Failed to join match:", e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono pb-24 selection:bg-white selection:text-black">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-800 px-4 py-3 max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeMatchId ? (
            <button
              type="button"
              onClick={() => {
                setActiveMatchId(null);
                setActiveMatch(null);
              }}
              className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/"
              className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-white animate-pulse" />
            <h1 className="font-bold text-sm sm:text-base uppercase tracking-widest">
              ECHO ARCADE // SOCIAL GAMING LOUNGE
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-400 font-bold border border-emerald-900 bg-emerald-950/50 px-2 py-0.5 hidden sm:inline">
            ● 0-LATENCY SYNC
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {activeMatch ? (
          /* ── Active Game Arena View ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs">
              <span className="text-neutral-400 uppercase tracking-wider">
                MATCH ID: {activeMatch.id.slice(0, 8)} • HOST: {activeMatch.hostHandle}
              </span>
              <span className="text-white font-bold border border-neutral-700 px-2 py-0.5 uppercase">
                STATUS: {activeMatch.status}
              </span>
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
            <div className="border border-neutral-800 bg-neutral-950 p-6 space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
                <Flame className="w-4 h-4 text-white animate-bounce" />
                <span>// VOICE-INTEGRATED MULTIPLAYER RETRO GAMING</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white leading-tight">
                Play Retro Terminal Games Live While Talking Trash On Audio.
              </h2>
              <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                Compete in real-time Sudoku speed battles or roll high-stakes 3D dice in Cyber Ludo. 
                Win matches to earn +100 Aura points and unlock the exclusive Arcade Champion badge!
              </p>
            </div>

            {/* Quick Game Launch Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-white" />
                // CHOOSE ARENA PROTOCOL
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sudoku Card */}
                <div className="border border-neutral-800 hover:border-white bg-black p-5 space-y-4 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-3xl">🧩</div>
                    <h4 className="font-bold text-base uppercase text-white group-hover:tracking-wider transition-all">
                      SUDOKU BATTLE GRID
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      1v1 Speed Data-Grid Hack. Race your opponent to solve the puzzle with zero mistakes.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">2 PLAYERS • +100 AURA</span>
                    <button
                      type="button"
                      disabled={creating || !user}
                      onClick={() => handleCreateMatch("sudoku")}
                      className="px-4 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      [ CREATE 1V1 ]
                    </button>
                  </div>
                </div>

                {/* Ludo Card */}
                <div className="border border-neutral-800 hover:border-white bg-black p-5 space-y-4 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-3xl">🎲</div>
                    <h4 className="font-bold text-base uppercase text-white group-hover:tracking-wider transition-all">
                      CYBER LUDO CLASH
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      2-to-4 Player Turn-Based Retro Dice Clash. Move your cyber tokens home and capture enemies.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">2-4 PLAYERS • +100 AURA</span>
                    <button
                      type="button"
                      disabled={creating || !user}
                      onClick={() => handleCreateMatch("ludo")}
                      className="px-4 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      [ CREATE LOBBY ]
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
                        className="border border-neutral-800 hover:border-neutral-700 bg-neutral-950 p-3.5 flex items-center justify-between flex-wrap gap-2 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{m.gameType === "sudoku" ? "🧩" : "🎲"}</span>
                            <span className="font-bold text-xs uppercase text-white">{m.title}</span>
                            <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5">
                              {m.gameType.toUpperCase()}
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

                        <button
                          type="button"
                          onClick={() => {
                            if (m.players[user?.uid || ""]) {
                              setActiveMatchId(m.id);
                            } else {
                              handleJoinMatch(m.id);
                            }
                          }}
                          className="px-4 py-2 border border-white hover:bg-white hover:text-black font-bold text-xs uppercase transition-all cursor-pointer"
                        >
                          {m.players[user?.uid || ""]
                            ? "[ RESUME ]"
                            : isFull
                            ? "[ SPECTATE ]"
                            : "[ JOIN MATCH ⚔️ ]"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
