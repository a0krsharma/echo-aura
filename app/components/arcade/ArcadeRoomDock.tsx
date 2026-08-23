"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  joinArcadeMatch,
  subscribeArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import LudoGame from "./LudoGame";
import ChessGame from "./ChessGame";
import Connect4Game from "./Connect4Game";
import BattleshipGame from "./BattleshipGame";
import SudokuGame from "./SudokuGame";
import MinesweeperGame from "./MinesweeperGame";
import Game2048 from "./Game2048";
import SnakeGame from "./SnakeGame";
import WordleGame from "./WordleGame";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeCreateModal from "./ArcadeCreateModal";
import { Gamepad2, X, Users, Trophy, Play, Sparkles, Share2, Mic2 } from "lucide-react";

interface ArcadeRoomDockProps {
  roomId: string;
  isHost: boolean;
}

export default function ArcadeRoomDock({ roomId, isHost }: ArcadeRoomDockProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<ArcadeMatch | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<ArcadeGameType>("ludo");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Auto-open if matchId URL param exists
  useEffect(() => {
    const paramMatchId = searchParams.get("matchId");
    if (paramMatchId) {
      setActiveMatchId(paramMatchId);
      setIsOpen(true);
    }
  }, [searchParams]);

  // Subscribe to match if matchId is set
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

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
      <div className="w-full bg-neutral-950 border-2 border-neutral-800 p-3 rounded-none flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-xs">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // SOCIAL GAMING DOCK
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            • MULTIPLAYER & SOLO RETRO ARCADE ON STAGE
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-1.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-md"
        >
          [ 🎮 LAUNCH GAME ARENA ]
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-black border-2 border-white p-4 font-mono text-white space-y-4 shadow-[0_0_30px_rgba(255,255,255,0.15)] select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold text-xs uppercase tracking-widest text-white">
            // LIVE STAGE GAMING ARENA
          </span>
          <span className="text-[10px] text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 hidden sm:inline flex items-center gap-1">
            <Mic2 className="w-2.5 h-2.5" />
            <span>VOICE CONNECTED</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {match && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>[ 🔗 INVITE PLAYERS & TALK 🎙️ ]</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white p-1 cursor-pointer border border-neutral-800 hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!match ? (
        <div className="space-y-4">
          <p className="text-[11px] text-neutral-300 uppercase tracking-wider">
            Project any arcade board directly above the live stage. Everyone in the room can play and talk simultaneously!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedGameType("ludo")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "ludo"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎲 LUDO</div>
              <div className="text-[9px] text-neutral-400">15x15 Dice Race</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("chess")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "chess"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">♟️ CHESS</div>
              <div className="text-[9px] text-neutral-400">8x8 Grid Protocol</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("connect4")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "connect4"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🔴 CONNECT 4</div>
              <div className="text-[9px] text-neutral-400">7x6 Drop Grid</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("battleship")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "battleship"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🚢 BATTLESHIP</div>
              <div className="text-[9px] text-neutral-400">10x10 Radar Arena</div>
            </button>
          </div>

          <button
            type="button"
            disabled={!user}
            onClick={() => setCreateModalOpen(true)}
            className="w-full py-3 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-mono font-extrabold text-xs uppercase transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-xl"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>[ CONFIGURE & START {selectedGameType.toUpperCase()} ON STAGE ]</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Game Renderers */}
          {match.gameType === "ludo" && (
            <LudoGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "chess" && (
            <ChessGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "connect4" && (
            <Connect4Game match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "battleship" && (
            <BattleshipGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "sudoku" && (
            <SudokuGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "minesweeper" && (
            <MinesweeperGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "2048" && (
            <Game2048 match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "snake" && (
            <SnakeGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "wordle" && (
            <WordleGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}

          {/* Join button if spectator */}
          {user && !match.players[user.uid] && match.status !== "FINISHED" && (
            <button
              type="button"
              onClick={handleJoinGame}
              className="w-full py-2.5 bg-neutral-950 border-2 border-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
            >
              [ 🎮 JOIN THIS MATCH AS PLAYER ]
            </button>
          )}
        </div>
      )}

      {/* Match Create Modal */}
      {user && (
        <ArcadeCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          user={{
            uid: user.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
          defaultGameType={selectedGameType}
          roomId={roomId}
          onMatchCreated={(matchId) => {
            setActiveMatchId(matchId);
          }}
        />
      )}

      {/* Invite Modal */}
      {match && (
        <ArcadeInviteModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          match={match}
        />
      )}
    </div>
  );
}
