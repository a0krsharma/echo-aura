"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  createArcadeTournament,
  type TournamentSize,
} from "@/lib/arcadeTournaments";
import {
  X,
  Trophy,
  Users,
  Flame,
  Swords,
  Crown,
  Sparkles,
  Moon,
  Zap,
} from "lucide-react";

interface ArcadeTournamentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; handle: string; photoUrl?: string };
  onTournamentCreated: (tournamentId: string) => void;
}

const TOURNAMENT_GAMES = [
  { id: "hand_cricket", name: "Hand Cricket", icon: "🏏", desc: "Classic classroom fingers showdown" },
  { id: "raja_mantri", name: "Raja Mantri Chor Sipahi", icon: "👑", desc: "4-Player bluffing & chit guessing" },
  { id: "uno", name: "Uno Cyber Master", icon: "🃏", desc: "108-Card stacking & Jump-In battles" },
  { id: "ludo", name: "15x15 Cyber Ludo", icon: "🎲", desc: "Dice rolls & home corridor defense" },
  { id: "chess", name: "Cyber Chess", icon: "♟️", desc: "Strategic timed checkmate duels" },
  { id: "carrom", name: "Carrom Board", icon: "⚪", desc: "2D physics carrom strike arena" },
  { id: "pool", name: "8-Ball Pool", icon: "🎱", desc: "Billiards cue angles & pocketing" },
  { id: "connect4", name: "Connect 4", icon: "🔴", desc: "Grid tactical token dropping" },
  { id: "rummy", name: "13-Card Indian Rummy", icon: "🂡", desc: "Sequence & meld card declarations" },
  { id: "teen_patti", name: "Teen Patti Flush", icon: "♠️", desc: "3-Card poker bluffing showdown" },
];

const PRESET_TITLES = [
  "🔥 HOSTEL 4 MIDNIGHT BATTLE",
  "🏆 CAMPUS CHAMPIONS LEAGUE",
  "👑 B-BLOCK ROOM 302 CARROM CUP",
  "⚡ FRIDAY NIGHT HAND CRICKET SHOWDOWN",
  "🚀 DORM GRANDMASTER CHESS DUEL",
];

export default function ArcadeTournamentCreateModal({
  isOpen,
  onClose,
  user,
  onTournamentCreated,
}: ArcadeTournamentCreateModalProps) {
  const [gameType, setGameType] = useState("hand_cricket");
  const [size, setSize] = useState<TournamentSize>(8);
  const [title, setTitle] = useState("🔥 HOSTEL 4 MIDNIGHT BATTLE");
  const [stakes, setStakes] = useState(100);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const totalPrizePot = size * stakes;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    soundSynth.playSubtlePop();

    try {
      const tournamentId = await createArcadeTournament({
        title: title.trim() || `${gameType.toUpperCase()} CAMPUS TOURNAMENT`,
        gameType,
        hostUid: user.uid,
        hostHandle: user.handle || "@HOST",
        hostAvatar: user.photoUrl || "",
        size,
        stakes,
      });

      soundSynth.playAirhorn();
      onTournamentCreated(tournamentId);
      onClose();
    } catch (err: any) {
      console.error("Failed to create tournament:", err);
      alert(err.message || "Failed to create tournament");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-black border-2 border-white p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.3)] select-none max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-4 border-b-2 border-white pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
            <Moon className="w-4 h-4 animate-pulse" />
            <span>// HOSTEL NIGHT BATTLES • TOURNAMENT CREATOR</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
            CREATE CAMPUS BRACKET TOURNAMENT
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold">
            Organize 4, 8, or 16-player single-elimination battles with live mic commentary!
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {/* Tournament Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              TOURNAMENT TITLE // HOSTEL / COMMUNITY NAME
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HOSTEL 4 MIDNIGHT HAND CRICKET CUP"
              className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white uppercase rounded"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 rounded transition-all cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Select Game */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              SELECT TOURNAMENT GAME
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {TOURNAMENT_GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGameType(g.id)}
                  className={`p-2 border text-left rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                    gameType === g.id
                      ? "border-amber-400 bg-amber-950/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <span className="text-lg">{g.icon}</span>
                  <div className="overflow-hidden">
                    <p className="font-black text-[11px] truncate uppercase">{g.name}</p>
                    <p className="text-[9px] text-neutral-500 truncate">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bracket Size: 4, 8, 16 Players */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              BRACKET SIZE (SEEDS)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 8, 16].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s as TournamentSize)}
                  className={`py-2.5 px-3 border-2 font-black text-xs uppercase rounded-lg transition-all cursor-pointer text-center ${
                    size === s
                      ? "border-white bg-white text-black shadow-lg"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  <p className="text-sm font-black">{s} PLAYERS</p>
                  <p className="text-[9px] font-normal">
                    {s === 16 ? "4 ROUNDS" : s === 8 ? "3 ROUNDS" : "2 ROUNDS"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Entry Stakes & Pot Calculator */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl items-center">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400 font-bold">
                ENTRY STAKE / PLAYER
              </label>
              <select
                value={stakes}
                onChange={(e) => setStakes(Number(e.target.value))}
                className="w-full bg-black border border-neutral-800 px-2.5 py-1.5 text-xs text-white font-bold rounded focus:outline-none focus:border-white"
              >
                <option value={0}>FREE (0 AURA)</option>
                <option value={50}>50 AURA</option>
                <option value={100}>100 AURA</option>
                <option value={250}>250 AURA</option>
                <option value={500}>500 AURA</option>
              </select>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">TOTAL CHAMPION POT</span>
              <p className="text-base font-black text-yellow-400">
                +{totalPrizePot} AURA
              </p>
              <p className="text-[9px] text-emerald-400 font-bold">
                Winner takes 100% of pot!
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3.5 border-2 border-amber-400 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Trophy className="w-4 h-4" />
            <span>{creating ? "PUBLISHING BRACKET..." : "CREATE & LAUNCH TOURNAMENT"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
