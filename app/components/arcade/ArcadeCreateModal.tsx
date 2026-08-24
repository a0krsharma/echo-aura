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

const GAME_META: Record<string, { name: string; icon: string; desc: string; maxAllowed: number }> = {
  rummy: { name: "INDIAN 13-CARD RUMMY", icon: "🃏", desc: "Pure sequences, second runs, and sets with wild jokers", maxAllowed: 6 },
  call_break: { name: "CALL BREAK (LAKDI)", icon: "♠️", desc: "Spades permanent trumps with bidding & overtrick scoring", maxAllowed: 4 },
  teen_patti: { name: "TEEN PATTI (3-CARD FLUSH)", icon: "🔥", desc: "Blind vs Seen wagering with Trail, Pure Sequence & Flushes", maxAllowed: 6 },
  satte_pe_satta: { name: "SATTE PE SATTA (7 OF HEARTS)", icon: "❤️", desc: "7 of Hearts opener extending 8->K and 6->A across suits", maxAllowed: 6 },
  bhabhi_thulla: { name: "BHABHI / THULLA (GET AWAY)", icon: "🛡️", desc: "Ace of Spades lead, throw penalty Thullas & avoid being Bhabhi", maxAllowed: 4 },
  mendicot: { name: "MENDICOT (DEHLA PAKAD)", icon: "👥", desc: "2v2 partnership trick-taking capturing all four 10s (Kot)", maxAllowed: 4 },
  cheat_bluff: { name: "CHEAT / BLUFF (I DOUBT IT)", icon: "🚨", desc: "Sequential face-down card shedding & high-stakes bluff calls", maxAllowed: 6 },
  solitaire: { name: "KLONDIKE SOLITAIRE", icon: "🂠", desc: "7-column tableau with alternating red/black builds to Ace-King", maxAllowed: 1 },
  ludo: { name: "15X15 CYBER LUDO", icon: "🎲", desc: "Classic dice race with 3D die & captures", maxAllowed: 4 },
  chess: { name: "CHESS GRID PROTOCOL", icon: "♟️", desc: "8x8 pure black & white tactical battle vs AI or opponent", maxAllowed: 2 },
  connect4: { name: "CONNECT FOUR MATRIX", icon: "🔴", desc: "7x6 data-stream token drop battle", maxAllowed: 2 },
  sudoku: { name: "1V1 SUDOKU RACE", icon: "🧩", desc: "Speed data-grid hacking race", maxAllowed: 2 },
  glow_hockey: { name: "GLOW HOCKEY", icon: "⚡", desc: "Neon air hockey 60fps clash", maxAllowed: 2 },
  gomoku: { name: "GOMOKU (5 IN A ROW)", icon: "⬛", desc: "15x15 tactical stone alignment", maxAllowed: 2 },
  reversi: { name: "REVERSI / OTHELLO", icon: "🔄", desc: "8x8 disk flipping battle", maxAllowed: 2 },
  dots_and_boxes: { name: "DOTS & BOXES", icon: "🕸️", desc: "Grid lock box capture strategy", maxAllowed: 2 },
  snakes_and_ladders: { name: "SNAKES & LADDERS", icon: "🪜", desc: "10x10 circuit jumpers race", maxAllowed: 4 },
  minesweeper: { name: "MINESWEEPER CLEAR", icon: "💣", desc: "Disarm 9x9 logic bombs with flags", maxAllowed: 1 },
  "2048": { name: "2048 BINARY MERGE", icon: "🔢", desc: "Slide & merge matching numbers", maxAllowed: 1 },
  wordle: { name: "CIPHER WORDLE", icon: "🔤", desc: "Decrypt 5-letter secret system cipher", maxAllowed: 1 },
  puzzle15: { name: "15-PUZZLE SLIDER", icon: "🧩", desc: "Slide 15 tiles into numerical order", maxAllowed: 1 },
  poker: { name: "TEXAS HOLD'EM", icon: "♠️", desc: "Card protocol with betting & voice tells", maxAllowed: 6 },
  blackjack: { name: "BLACKJACK 21", icon: "🃏", desc: "Target score 21 vs AI data dealer", maxAllowed: 2 },
  uno: { name: "FLOW OVERRIDE (UNO)", icon: "🎴", desc: "Match color & value action card battle", maxAllowed: 4 },
  codenames: { name: "CODENAMES", icon: "🕵️", desc: "5x5 word decryption grid with spymaster", maxAllowed: 8 },
  skribbl: { name: "VECTOR SKRIBBL", icon: "🎨", desc: "Live vector sketching & word guessing", maxAllowed: 8 },
  quoridor: { name: "QUORIDOR RUNNER", icon: "🧱", desc: "Pawn race with blocking firewall walls", maxAllowed: 2 },
  taboo: { name: "FORBIDDEN LEXICON", icon: "🚫", desc: "Describe words without forbidden vocabulary", maxAllowed: 8 },
  melody_buzzer: { name: "MELODY HUMMER", icon: "🎵", desc: "Hum tunes into mic with speed buzzer guesses", maxAllowed: 8 },
  pitch_arena: { name: "PITCH ARENA", icon: "💡", desc: "Defend absurd startup ideas on live mic", maxAllowed: 8 },
  twenty_questions: { name: "20 QUESTIONS", icon: "❓", desc: "Deduce secret concept with Yes/No questions", maxAllowed: 8 },
  raja_mantri: { name: "RAJA MANTRI CHOR SIPAHI", icon: "👑", desc: "Folded paper chit bluffing & voice interrogation", maxAllowed: 4 },
  hand_cricket: { name: "HAND CRICKET (ODD-EVEN)", icon: "🏏", desc: "1-6 simultaneous finger throw mind game", maxAllowed: 2 },
  book_cricket: { name: "BOOK CRICKET", icon: "📖", desc: "Page flipper runs & wicket scoreboard", maxAllowed: 2 },
  bingo: { name: "BINGO 25-CROSS", icon: "🔢", desc: "5x5 number grid with voice calls & B-I-N-G-O lines", maxAllowed: 6 },
  npat: { name: "NAME PLACE ANIMAL THING", icon: "📝", desc: "Fast letter race across 4 categories", maxAllowed: 8 },
  two_truths: { name: "TWO TRUTHS & A LIE", icon: "🎭", desc: "Voice verification & spot the lie debate", maxAllowed: 8 },
  hangman: { name: "HANGMAN WORD SCAFFOLD", icon: "🔤", desc: "Guess secret cipher letters before gallows completes", maxAllowed: 4 },
  math_blitz: { name: "MATRIX MATH BLITZ", icon: "⚡", desc: "Rapid 1v1 mental arithmetic speed duel", maxAllowed: 2 },
};

export default function ArcadeCreateModal({
  isOpen,
  onClose,
  user,
  onMatchCreated,
  defaultGameType = "ludo",
  roomId,
}: ArcadeCreateModalProps) {
  const meta = GAME_META[defaultGameType] || GAME_META.ludo;
  const isSoloOnly = meta.maxAllowed === 1;

  const [mode, setMode] = useState<ArcadeMatchMode>("MULTIPLAYER");
  const [maxPlayers, setMaxPlayers] = useState<number>(meta.maxAllowed >= 4 ? 4 : 2);
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [stakes, setStakes] = useState<number>(50);
  const [creating, setCreating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    soundSynth.playSubtlePop();

    const title = isSoloOnly
      ? `${defaultGameType.toUpperCase()} // SOLO PUZZLE GRID`
      : mode === "VS_COMPUTER"
      ? `${defaultGameType.toUpperCase()} // SOLO VS NEURAL BOT`
      : `${defaultGameType.toUpperCase()} ${maxPlayers}P CLASH // ${user.handle || "@HOST"}`;

    try {
      const matchId = await createArcadeMatch({
        gameType: defaultGameType,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-black border-2 border-white p-5 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] space-y-4">
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
            <span>// QUICK LAUNCH ARENA</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold uppercase text-white flex items-center gap-2">
            <span>{meta.icon}</span>
            <span>{meta.name}</span>
          </h2>
          <p className="text-[10px] text-neutral-400">{meta.desc}</p>
        </div>

        {/* 1. Opponent / Mode Selector */}
        {!isSoloOnly && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              1. CHOOSE GAME MODE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("VS_COMPUTER")}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                  mode === "VS_COMPUTER"
                    ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-white">🤖 VS BOT (SOLO)</div>
                  <div className="text-[9px] text-neutral-400">Play vs Smart AI</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("MULTIPLAYER")}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                  mode === "MULTIPLAYER"
                    ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <Users className="w-4 h-4 text-white shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-white">👥 MULTIPLAYER</div>
                  <div className="text-[9px] text-neutral-400">PvP / Invite Friends</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. Player Capacity (If Multiplayer) */}
        {!isSoloOnly && mode === "MULTIPLAYER" && meta.maxAllowed > 2 && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              2. PLAYER CAPACITY
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxPlayers(num)}
                  className={`py-2 border text-center font-bold text-xs uppercase transition-all cursor-pointer ${
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

        {/* 3. Voice Lounge & Stakes */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              VOICE & CHAT
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
              className="w-full py-2 px-2 bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-white uppercase disabled:opacity-40"
            >
              <option value={0}>0 (CASUAL)</option>
              <option value={50}>50 (+100 WIN)</option>
              <option value={100}>100 (+200 WIN)</option>
              <option value={250}>250 (+500 WIN)</option>
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
          <span>{creating ? "LAUNCHING ARENA..." : `[ ⚔️ START ${meta.name} NOW ]`}</span>
        </button>
      </div>
    </div>
  );
}
