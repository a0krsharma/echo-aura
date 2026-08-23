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
import SudokuGame from "./SudokuGame";
import LudoGame from "./LudoGame";
import { Gamepad2, X, Users, Trophy, Play, Sparkles } from "lucide-react";

interface ArcadeRoomDockProps {
  roomId: string;
  isHost: boolean;
}

export default function ArcadeRoomDock({ roomId, isHost }: ArcadeRoomDockProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<ArcadeMatch | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<ArcadeGameType>("sudoku");
  const [creating, setCreating] = useState(false);

  // Subscribe to match if matchId is set
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  const handleLaunchGame = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const matchId = await createArcadeMatch({
        gameType: selectedGameType,
        title: `${selectedGameType.toUpperCase()} BATTLE // ROOM ${roomId.slice(0, 5)}`,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        roomId,
        stakes: 50,
      });
      setActiveMatchId(matchId);
    } catch (e) {
      console.error("Failed to create match:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!user || !activeMatchId) return;
    try {
      await joinArcadeMatch(activeMatchId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        avatar: user.photoUrl || user.photoURL,
      });
    } catch (e) {
      console.error("Failed to join match:", e);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-950 border border-neutral-800 hover:border-white hover:bg-neutral-900 text-white font-mono text-xs uppercase font-bold transition-all shadow-lg cursor-pointer group"
      >
        <Gamepad2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
        <span>[ 🎮 LAUNCH SOCIAL ARCADE LOUNGE ]</span>
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="w-full border-2 border-white bg-black p-4 font-mono text-white space-y-4 shadow-2xl relative my-3">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-bold text-xs uppercase tracking-widest">
            // LIVE AUDIO GAMING LOUNGE
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-neutral-500 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!match ? (
        <div className="space-y-4">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider">
            Play turn-based terminal games together while live on audio. 0 server latency, 100% synchronized.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedGameType("sudoku")}
              className={`p-3 border text-left transition-all ${
                selectedGameType === "sudoku"
                  ? "border-white bg-neutral-900 text-white font-bold"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              <div className="text-xs uppercase font-bold">🧩 SUDOKU BATTLE</div>
              <div className="text-[9px] text-neutral-500 mt-1">1v1 Speed Data-Grid Race</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("ludo")}
              className={`p-3 border text-left transition-all ${
                selectedGameType === "ludo"
                  ? "border-white bg-neutral-900 text-white font-bold"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              <div className="text-xs uppercase font-bold">🎲 CYBER LUDO</div>
              <div className="text-[9px] text-neutral-500 mt-1">2-4 Player Retro Dice Clash</div>
            </button>
          </div>

          <button
            type="button"
            disabled={creating || !user}
            onClick={handleLaunchGame}
            className="w-full py-3 bg-white text-black hover:bg-neutral-200 font-mono font-bold text-xs uppercase transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{creating ? "INITIALIZING GRID..." : `[ START ${selectedGameType.toUpperCase()} ON STAGE ]`}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Game Renderer */}
          {match.gameType === "sudoku" && (
            <SudokuGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}

          {match.gameType === "ludo" && (
            <LudoGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}

          {/* Join button if spectator */}
          {user && !match.players[user.uid] && match.status !== "FINISHED" && (
            <button
              type="button"
              onClick={handleJoinGame}
              className="w-full py-2.5 bg-neutral-900 border border-white hover:bg-white hover:text-black font-bold text-xs uppercase transition-all"
            >
              [ 🎮 JOIN AS PLAYER ]
            </button>
          )}
        </div>
      )}
    </div>
  );
}
