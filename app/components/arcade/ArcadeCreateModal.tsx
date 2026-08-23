"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  createArcadeMatch,
  type ArcadeGameType,
  type ArcadeMatchMode,
} from "@/lib/arcade";
import { X, Play, Bot, Users, Mic, Trophy, Sparkles, Shield, Swords, Gamepad2, Brain } from "lucide-react";

interface ArcadeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; handle: string; photoUrl?: string; photoURL?: string };
  onMatchCreated: (matchId: string) => void;
  defaultGameType?: ArcadeGameType;
  roomId?: string;
}

const MULTIPLAYER_GAMES: { type: ArcadeGameType; name: string; desc: string; icon: string; defaultPlayers: number }[] = [
  { type: "ludo", name: "15X15 CYBER LUDO", desc: "Classic 2-4p race with 3D die & captures", icon: "🎲", defaultPlayers: 4 },
  { type: "chess", name: "CHESS GRID PROTOCOL", desc: "8x8 tactical battle vs AI or opponent", icon: "♟️", defaultPlayers: 2 },
  { type: "connect4", name: "CONNECT FOUR MATRIX", desc: "7x6 data-stream token drop battle", icon: "🔴", defaultPlayers: 2 },
  { type: "battleship", name: "BATTLESHIP RADAR", desc: "10x10 fog-of-war naval command", icon: "🚢", defaultPlayers: 2 },
  { type: "sudoku", name: "1V1 SUDOKU RACE", desc: "Speed data-grid hacking race", icon: "🧩", defaultPlayers: 2 },
];

const SOLO_GAMES: { type: ArcadeGameType; name: string; desc: string; icon: string }[] = [
  { type: "minesweeper", name: "MINESWEEPER CLEAR", desc: "Disarm 9x9 logic bombs with flags", icon: "💣" },
  { type: "2048", name: "2048 BINARY MERGE", desc: "Slide & merge matching numbers", icon: "🔢" },
  { type: "snake", name: "TERMINAL SNAKE", desc: "Phosphor canvas retro snake arcade", icon: "🐍" },
  { type: "wordle", name: "CIPHER WORDLE", desc: "Decrypt 5-letter secret system cipher", icon: "🔤" },
];

export default function ArcadeCreateModal({
  isOpen,
  onClose,
  user,
  onMatchCreated,
  defaultGameType = "ludo",
  roomId,
}: ArcadeCreateModalProps) {
  const [category, setCategory] = useState<"MULTIPLAYER" | "SOLO">("MULTIPLAYER");
  const [gameType, setGameType] = useState<ArcadeGameType>(defaultGameType);
  const [mode, setMode] = useState<ArcadeMatchMode>("MULTIPLAYER");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [stakes, setStakes] = useState<number>(50);
  const [creating, setCreating] = useState<boolean>(false);

  if (!isOpen) return null;

  const isSoloOnly = ["minesweeper", "2048", "snake", "wordle"].includes(gameType);

  const handleSelectGame = (type: ArcadeGameType, isSoloCategory: boolean) => {
    setGameType(type);
    if (isSoloCategory) {
      setMode("VS_COMPUTER");
      setMaxPlayers(1);
    } else {
      const g = MULTIPLAYER_GAMES.find((m) => m.type === type);
      setMaxPlayers(g?.defaultPlayers || 2);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    soundSynth.playSubtlePop();

    const title = isSoloOnly
      ? `${gameType.toUpperCase()} // SOLO PUZZLE GRID`
      : mode === "VS_COMPUTER"
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
        mode: isSoloOnly ? "VS_COMPUTER" : mode,
        maxPlayers: isSoloOnly ? 1 : mode === "VS_COMPUTER" ? 2 : maxPlayers,
        enableVoice,
        stakes: isSoloOnly ? 0 : stakes,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-lg bg-black border-2 border-white p-5 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] space-y-4 my-auto">
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
            <span>// SELECT & CONFIGURE RETRO PROTOCOL</span>
          </div>
          <h2 className="text-lg font-extrabold uppercase text-white">
            RETRO ARCADE ARENA LAUNCHER
          </h2>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory("MULTIPLAYER");
              handleSelectGame("ludo", false);
            }}
            className={`py-2 px-3 border-2 font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              category === "MULTIPLAYER"
                ? "border-white bg-white text-black ring-2 ring-white"
                : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>MULTIPLAYER LOUNGE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory("SOLO");
              handleSelectGame("minesweeper", true);
            }}
            className={`py-2 px-3 border-2 font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              category === "SOLO"
                ? "border-white bg-white text-black ring-2 ring-white"
                : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>SOLO PUZZLE & ARCADE</span>
          </button>
        </div>

        {/* Game List Grid */}
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            {category === "MULTIPLAYER" ? "1. SELECT MULTIPLAYER GAME" : "1. SELECT SOLO ARCADE PUZZLE"}
          </label>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {(category === "MULTIPLAYER" ? MULTIPLAYER_GAMES : SOLO_GAMES).map((g) => {
              const isSelected = gameType === g.type;
              return (
                <button
                  key={g.type}
                  type="button"
                  onClick={() => handleSelectGame(g.type, category === "SOLO")}
                  className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{g.icon}</span>
                    <span className="text-xs uppercase font-extrabold text-white truncate">{g.name}</span>
                  </div>
                  <div className="text-[9px] text-neutral-400 mt-1 line-clamp-1">{g.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Selector (If Multiplayer Category) */}
        {category === "MULTIPLAYER" && (
          <div className="space-y-2">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              2. OPPONENTS / MODE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("VS_COMPUTER")}
                className={`p-2 border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                  mode === "VS_COMPUTER"
                    ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-white">🤖 VS COMPUTER AI</div>
                  <div className="text-[9px] text-neutral-400">Play solo vs smart bot</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("MULTIPLAYER")}
                className={`p-2 border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                  mode === "MULTIPLAYER"
                    ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <Users className="w-4 h-4 text-white shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-white">👥 MULTIPLAYER</div>
                  <div className="text-[9px] text-neutral-400">Open lobby / invite friends</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Player Capacity (If Multiplayer Mode) */}
        {category === "MULTIPLAYER" && mode === "MULTIPLAYER" && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              3. PLAYER CAPACITY
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 6].map((num) => {
                const isDis = (gameType === "chess" || gameType === "connect4" || gameType === "battleship" || gameType === "sudoku") && num > 2;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isDis}
                    onClick={() => setMaxPlayers(num)}
                    className={`py-1.5 border text-center font-bold text-xs uppercase transition-all cursor-pointer disabled:opacity-20 ${
                      maxPlayers === num
                        ? "border-white bg-white text-black font-extrabold"
                        : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
                    }`}
                  >
                    {num} PLAYERS
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Voice Toggle & Stakes */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
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
                <span>{enableVoice ? "ENABLED 🎙️" : "OFF"}</span>
              </div>
              <span className="text-[9px] font-mono">[{enableVoice ? "ON" : "OFF"}]</span>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              AURA STAKES
            </label>
            <select
              value={stakes}
              disabled={isSoloOnly}
              onChange={(e) => setStakes(Number(e.target.value))}
              className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-white uppercase disabled:opacity-40"
            >
              <option value={0}>0 AURA (CASUAL)</option>
              <option value={50}>50 AURA (+100 WIN)</option>
              <option value={100}>100 AURA (+200 WIN)</option>
              <option value={250}>250 AURA (+500 WIN)</option>
            </select>
          </div>
        </div>

        {/* Launch Button */}
        <button
          type="button"
          disabled={creating}
          onClick={handleCreate}
          className="w-full py-3.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-mono font-extrabold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-2xl"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>{creating ? "INITIALIZING ARENA..." : `[ ⚔️ START ${gameType.toUpperCase()} ]`}</span>
        </button>
      </div>
    </div>
  );
}
