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
  Clock,
  Search,
} from "lucide-react";

interface ArcadeTournamentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; handle: string; photoUrl?: string };
  onTournamentCreated: (tournamentId: string) => void;
}

const ALL_TOURNAMENT_GAMES = [
  // Voice Party
  { id: "antakshari", name: "Bollywood Antakshari", icon: "🎶", category: "VOICE", desc: "Sing hit songs on mic with Hindi letter wheel" },
  { id: "courtroom_debate", name: "Courtroom Debate", icon: "⚖️", category: "VOICE", desc: "Accuser vs Defender with Judge gavel & jury" },
  { id: "news_anchor", name: "9 PM News Anchor Clash", icon: "📰", category: "VOICE", desc: "The Nation Wants To Know debate" },
  { id: "singer_roleplay", name: "Singer Roleplay Battle", icon: "🎤", category: "VOICE", desc: "Sing hit tracks in singer voices" },
  { id: "mushaira", name: "Desi Mushaira & Shayari", icon: "📜", category: "VOICE", desc: "Urdu/Hindi poetry slam with Wah-Wah cheers" },
  { id: "two_truths", name: "Two Truths & A Lie", icon: "🤫", category: "VOICE", desc: "Voice party bluffing with live jury voting" },
  { id: "pitch_arena", name: "Pitch Arena / Shark Mic", icon: "🎙️", category: "VOICE", desc: "60-second crazy startup improv battle" },

  // Board & Tactics
  { id: "ludo", name: "Ludo 3D", icon: "🎲", category: "BOARD", desc: "World-class 3D wooden board & dice" },
  { id: "monopoly", name: "Monopoly Real Estate", icon: "🎩", category: "BOARD", desc: "40-tile tournament property & 32-house lock" },
  { id: "chess", name: "Grandmaster Chess", icon: "♟️", category: "BOARD", desc: "3D luxury walnut Staunton piece chess" },
  { id: "connect4", name: "Connect 4 Arena", icon: "🔴", category: "BOARD", desc: "3D upright arcade grid with gravity drop" },
  { id: "snakes_and_ladders", name: "Snakes & Ladders", icon: "🪜", category: "BOARD", desc: "3D golden ladders & ivory dice" },
  { id: "dots_and_boxes", name: "Dots & Boxes", icon: "🕸️", category: "BOARD", desc: "Tactical line-drawing box capture" },

  // Physics & Sports
  { id: "carrom", name: "Championship Carrom", icon: "⚪", category: "PHYSICS", desc: "19-piece tournament rack with real physics" },
  { id: "pool", name: "8-Ball / 9-Ball Pool", icon: "🎱", category: "PHYSICS", desc: "Top 5 disciplines: 8-Ball, 9-Ball, 10-Ball" },
  { id: "glow_hockey", name: "Glow Hockey Pro", icon: "⚡", category: "PHYSICS", desc: "Cyberpunk 2D air hockey with neon sparks" },

  // Casino & Cards
  { id: "uno", name: "Uno Royale", icon: "🎴", category: "CARD", desc: "Fast card matching & wild draw penalties" },
  { id: "teen_patti", name: "Royal Teen Patti", icon: "👑", category: "CARD", desc: "3D casino felt 3-card flush & blind chaal" },
  { id: "poker", name: "Texas Hold'em Poker", icon: "♦️", category: "CARD", desc: "3D casino felt with community board" },
  { id: "blackjack", name: "Blackjack 21", icon: "♣️", category: "CARD", desc: "Hit, stand, double down vs dealer" },
  { id: "rummy", name: "Indian Rummy", icon: "🃏", category: "CARD", desc: "13-card pure sequences & sets" },
  { id: "call_break", name: "Call Break", icon: "♠️", category: "CARD", desc: "4-player strategic spades bidding" },
  { id: "cheat_bluff", name: "Cheat / Bluff", icon: "🚨", category: "CARD", desc: "Call out liars or bluff your cards away" },

  // Paper & Nostalgia
  { id: "raja_mantri", name: "Raja Mantri Chor Sipahi", icon: "🤴", category: "PAPER", desc: "Classic 4-role royal bluff game" },
  { id: "hand_cricket", name: "Hand Cricket", icon: "🏏", category: "PAPER", desc: "Odd-even fingers run-scoring duel" },
  { id: "book_cricket", name: "Book Cricket", icon: "📖", category: "PAPER", desc: "Page-flipping score chase" },
  { id: "bingo", name: "Bingo 5x5", icon: "🔢", category: "PAPER", desc: "Number matrix line completion" },
  { id: "npat", name: "Name Place Animal Thing", icon: "📝", category: "PAPER", desc: "Speed vocabulary category challenge" },
  { id: "skribbl", name: "Skribbl Drawing", icon: "🎨", category: "PAPER", desc: "Live canvas drawing & guessing" },

  // Solo & Puzzles
  { id: "wordle", name: "Wordle Cyber", icon: "🔐", category: "PUZZLE", desc: "5-letter word deduction in 6 tries" },
  { id: "sudoku", name: "Master Sudoku", icon: "🧩", category: "PUZZLE", desc: "9x9 logical number placement" },
  { id: "math_blitz", name: "Math Blitz", icon: "⚡", category: "PUZZLE", desc: "High-speed mental arithmetic test" },
];

const PRESET_TITLES = [
  "🔥 HOSTEL 4 MIDNIGHT BATTLE",
  "🏆 CAMPUS CHAMPIONS LEAGUE",
  "👑 B-BLOCK ROOM 302 CARROM CUP",
  "⚡ FRIDAY NIGHT HAND CRICKET SHOWDOWN",
  "🚀 GRANDMASTER CHESS CLASH",
  "🎩 MONOPOLY TYCOON CHAMPIONSHIP",
  "🎶 BOLLYWOOD ANTAKSHARI JURY CUP",
];

const SCHEDULE_OPTIONS = [
  { id: 0, label: "⚡ INSTANT (Starts when queue fills)", offsetMin: 0 },
  { id: 5, label: "⏳ IN 5 MINUTES", offsetMin: 5 },
  { id: 15, label: "⏳ IN 15 MINUTES", offsetMin: 15 },
  { id: 30, label: "⏳ IN 30 MINUTES", offsetMin: 30 },
  { id: 60, label: "⏳ IN 1 HOUR", offsetMin: 60 },
  { id: 120, label: "🌙 TONIGHT 10:00 PM", offsetMin: 120 },
];

export default function ArcadeTournamentCreateModal({
  isOpen,
  onClose,
  user,
  onTournamentCreated,
}: ArcadeTournamentCreateModalProps) {
  const [gameType, setGameType] = useState("monopoly");
  const [size, setSize] = useState<TournamentSize>(8);
  const [title, setTitle] = useState("🔥 HOSTEL 4 MIDNIGHT BATTLE");
  const [stakes, setStakes] = useState(100);
  const [format, setFormat] = useState<"SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION">("SINGLE_ELIMINATION");
  const [scheduleOffset, setScheduleOffset] = useState(0);
  const [gameSearch, setGameSearch] = useState("");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const totalPrizePot = size * stakes;
  const filteredGames = ALL_TOURNAMENT_GAMES.filter((g) =>
    g.name.toLowerCase().includes(gameSearch.toLowerCase()) ||
    g.category.toLowerCase().includes(gameSearch.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    soundSynth.playSubtlePop();

    const scheduledStartTime = Date.now() + scheduleOffset * 60 * 1000;

    try {
      const tournamentId = await createArcadeTournament({
        title: title.trim() || `${gameType.toUpperCase()} TOURNAMENT`,
        gameType,
        hostUid: user.uid,
        hostHandle: user.handle || "@HOST",
        hostAvatar: user.photoUrl || "",
        size,
        stakes,
        format,
        scheduledStartTime,
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
      <div className="relative w-full max-w-xl bg-neutral-950 border-2 border-neutral-700 p-5 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] select-none max-h-[92vh] overflow-y-auto rounded-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer rounded-lg"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-4 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
            <Trophy className="w-4 h-4 animate-pulse text-amber-400" />
            <span>// ECHO CLUB • TOURNAMENT HOST &amp; SCHEDULER</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
            HOST CHAMPIONSHIP BRACKET
          </h2>
          <p className="text-[11px] text-neutral-400">
            Schedule live tournament queues, set entry stakes, and crown champions!
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
              className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white uppercase rounded-xl"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white hover:border-neutral-600 rounded-md transition-all cursor-pointer truncate max-w-[200px]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Select Game with Search */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
                SELECT TOURNAMENT GAME ({ALL_TOURNAMENT_GAMES.length} TITLES)
              </label>
              <div className="w-36 relative">
                <input
                  type="text"
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  placeholder="FILTER GAMES..."
                  className="w-full bg-neutral-900 border border-neutral-800 px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-white uppercase rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {filteredGames.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGameType(g.id)}
                  className={`p-2 border text-left rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    gameType === g.id
                      ? "border-amber-400 bg-amber-950/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <span className="text-base">{g.icon}</span>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-[11px] truncate uppercase">{g.name}</p>
                    <p className="text-[9px] text-neutral-500 truncate">{g.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Start Time */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>TOURNAMENT START SCHEDULE</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleOffset(opt.offsetMin)}
                  className={`py-2 px-2 border text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer text-center ${
                    scheduleOffset === opt.offsetMin
                      ? "border-amber-400 bg-amber-950/60 text-white shadow-sm font-black"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bracket Size & Format */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bracket Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
                BRACKET SEEDS
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[4, 8, 16].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s as TournamentSize)}
                    className={`py-2 border font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center ${
                      size === s
                        ? "border-white bg-white text-black shadow-md"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    <p className="font-black">{s}P</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Bracket Format */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
                FORMAT
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormat("SINGLE_ELIMINATION")}
                  className={`py-2 px-1 border text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer text-center ${
                    format === "SINGLE_ELIMINATION"
                      ? "border-white bg-white text-black shadow-md"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  SINGLE KNOCKOUT
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("DOUBLE_ELIMINATION")}
                  className={`py-2 px-1 border text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer text-center ${
                    format === "DOUBLE_ELIMINATION"
                      ? "border-white bg-white text-black shadow-md"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  DOUBLE ELIM
                </button>
              </div>
            </div>
          </div>

          {/* Entry Stakes & Pot Calculator */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl items-center">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-neutral-400 font-bold">
                ENTRY STAKE / PLAYER
              </label>
              <select
                value={stakes}
                onChange={(e) => setStakes(Number(e.target.value))}
                className="w-full bg-black border border-neutral-800 px-2.5 py-1.5 text-xs text-white font-bold rounded-lg focus:outline-none focus:border-white"
              >
                <option value={0}>FREE (0 AURA)</option>
                <option value={50}>50 AURA</option>
                <option value={100}>100 AURA</option>
                <option value={250}>250 AURA</option>
                <option value={500}>500 AURA</option>
                <option value={1000}>1000 AURA</option>
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
            <Trophy className="w-4 h-4 text-black" />
            <span>{creating ? "PUBLISHING BRACKET..." : "HOST & LAUNCH TOURNAMENT"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
