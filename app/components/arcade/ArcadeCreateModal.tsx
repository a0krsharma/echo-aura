"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  createArcadeMatch,
  type ArcadeGameType,
  type ArcadeMatchMode,
} from "@/lib/arcade";
import { X, Play, Bot, Users, Mic, Trophy, Sparkles, Shield, Swords } from "lucide-react";

interface ArcadeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; handle: string; photoUrl?: string; photoURL?: string };
  onMatchCreated: (matchId: string) => void;
  defaultGameType?: ArcadeGameType;
  roomId?: string;
}

export default function ArcadeCreateModal({
  isOpen,
  onClose,
  user,
  onMatchCreated,
  defaultGameType = "ludo",
  roomId,
}: ArcadeCreateModalProps) {
  const [gameType, setGameType] = useState<ArcadeGameType>(defaultGameType);
  const [mode, setMode] = useState<ArcadeMatchMode>("MULTIPLAYER");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [stakes, setStakes] = useState<number>(50);
  const [creating, setCreating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    soundSynth.playSubtlePop();

    const title =
      mode === "VS_COMPUTER"
        ? `${gameType.toUpperCase()} // SOLO VS NEURAL BOT`
        : `${gameType.toUpperCase()} ${maxPlayers}P CLASH // ${user.handle || "@HOST"}`;

    try {
      const matchId = await createArcadeMatch({
        gameType,
        title,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        roomId,
        mode,
        maxPlayers: mode === "VS_COMPUTER" ? 2 : maxPlayers,
        enableVoice,
        stakes,
      });

      soundSynth.playAirhorn();
      onMatchCreated(matchId);
      onClose();
    } catch (e: any) {
      console.error("Failed to create match:", e);
      soundSynth.playBuzzer();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-black border-2 border-white p-5 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b-2 border-white pb-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-400 uppercase">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>// CREATE CUSTOM GAME ARENA</span>
          </div>
          <h2 className="text-lg font-extrabold uppercase text-white">
            CONFIGURE ARENA PROTOCOL
          </h2>
        </div>

        {/* 1. Protocol / Game Type */}
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            1. SELECT GAME PROTOCOL
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setGameType("ludo");
                setMaxPlayers(4);
              }}
              className={`p-3 border-2 text-left transition-all cursor-pointer ${
                gameType === "ludo"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎲 15X15 CYBER LUDO</div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Monochrome board with 3D pip die & pawn captures
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setGameType("sudoku");
                setMaxPlayers(2);
              }}
              className={`p-3 border-2 text-left transition-all cursor-pointer ${
                gameType === "sudoku"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🧩 1V1 SUDOKU BATTLE</div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Competitive speed data-grid hacking race
              </div>
            </button>
          </div>
        </div>

        {/* 2. Mode: Solo VS Bot or Multiplayer */}
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            2. SELECT MATCH OPPONENTS
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("VS_COMPUTER")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === "VS_COMPUTER"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <Bot className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs uppercase font-bold text-white">🤖 VS COMPUTER AI</div>
                <div className="text-[9px] text-neutral-400">Play solo against smart bots</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("MULTIPLAYER")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === "MULTIPLAYER"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <Users className="w-5 h-5 text-white shrink-0" />
              <div>
                <div className="text-xs uppercase font-bold text-white">👥 MULTIPLAYER</div>
                <div className="text-[9px] text-neutral-400">Play with friends or open lobby</div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Player Capacity (if Multiplayer) */}
        {mode === "MULTIPLAYER" && (
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              3. PLAYER CAPACITY
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={gameType === "sudoku" && num > 2}
                  onClick={() => setMaxPlayers(num)}
                  className={`py-2 border text-center font-bold text-xs uppercase transition-all cursor-pointer disabled:opacity-30 ${
                    maxPlayers === num
                      ? "border-white bg-white text-black font-extrabold"
                      : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {num} PLAYERS
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Voice Chat & Stakes */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Voice Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              VOICE LOUNGE
            </label>
            <button
              type="button"
              onClick={() => setEnableVoice(!enableVoice)}
              className={`w-full py-2 px-3 border text-left text-xs font-bold uppercase flex items-center justify-between transition-all cursor-pointer ${
                enableVoice
                  ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                  : "border-neutral-800 bg-neutral-950 text-neutral-500"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>{enableVoice ? "ENABLED 🎙️" : "DISABLED"}</span>
              </div>
              <span className="text-[9px] font-mono">[{enableVoice ? "ON" : "OFF"}]</span>
            </button>
          </div>

          {/* Stakes Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              AURA STAKES
            </label>
            <select
              value={stakes}
              onChange={(e) => setStakes(Number(e.target.value))}
              className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
            >
              <option value={0}>0 AURA (CASUAL)</option>
              <option value={50}>50 AURA (+100 WIN)</option>
              <option value={100}>100 AURA (+200 WIN)</option>
              <option value={250}>250 AURA (+500 WIN)</option>
            </select>
          </div>
        </div>

        {/* Create Submit Action */}
        <button
          type="button"
          disabled={creating}
          onClick={handleCreate}
          className="w-full py-3.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-mono font-extrabold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-2xl"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>{creating ? "INITIALIZING ARENA..." : "[ ⚔️ LAUNCH ARENA MATCH ]"}</span>
        </button>
      </div>
    </div>
  );
}
