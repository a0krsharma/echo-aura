"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, X, Calendar, Clock, Sparkles, CheckCircle2, User, Gamepad2, Mic, Trophy } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { createClash } from "@/lib/clashes";
import { createArcadeMatch, type ArcadeGameType } from "@/lib/arcade";
import { createNotification } from "@/lib/notifications";
import { Timestamp } from "firebase/firestore";
import { soundSynth } from "@/lib/soundSynthesizer";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOpponentHandle?: string;
  defaultOpponentUid?: string;
  defaultTopic?: string;
}

const ARCADE_GAMES: { type: ArcadeGameType; name: string; icon: string; desc: string }[] = [
  { type: "ludo", name: "15X15 CYBER LUDO", icon: "🎲", desc: "1v1 high-stakes board race & captures" },
  { type: "pool", name: "8-BALL POOL", icon: "🎱", desc: "2D real-time physics pool table duel" },
  { type: "carrom", name: "CARROM BOARD", icon: "⚪", desc: "Striker & coin pocketing physics" },
  { type: "glow_hockey", name: "GLOW HOCKEY", icon: "⚡", desc: "Neon air hockey 60fps clash" },
  { type: "chess", name: "CHESS GRID PROTOCOL", icon: "♟️", desc: "8x8 tactical battle on stage" },
  { type: "gomoku", name: "GOMOKU (5 IN A ROW)", icon: "⬛", desc: "15x15 tactical stone alignment" },
  { type: "reversi", name: "REVERSI / OTHELLO", icon: "🔄", desc: "8x8 disk flipping battle" },
  { type: "dots_and_boxes", name: "DOTS & BOXES", icon: "🕸️", desc: "Grid lock box capture strategy" },
  { type: "snakes_and_ladders", name: "SNAKES & LADDERS", icon: "🪜", desc: "10x10 circuit jumpers race" },
  { type: "connect4", name: "CONNECT FOUR MATRIX", icon: "🔴", desc: "7x6 data-stream token drop battle" },
  { type: "battleship", name: "BATTLESHIP RADAR", icon: "🚢", desc: "10x10 radar naval command artillery" },
  { type: "sudoku", name: "1V1 SUDOKU RACE", icon: "🧩", desc: "Speed data-grid hacking race" },
  { type: "snake", name: "SNAKE SCORE DUEL", icon: "🐍", desc: "Phosphor terminal high-score showdown" },
  { type: "wordle", name: "CIPHER WORDLE DUEL", icon: "🔤", desc: "5-letter code-breaker clash" },
];

export default function ChallengeModal({
  isOpen,
  onClose,
  defaultOpponentHandle = "",
  defaultOpponentUid,
  defaultTopic = "",
}: ChallengeModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Mode: "DEBATE" or "ARCADE"
  const [challengeCategory, setChallengeCategory] = useState<"DEBATE" | "ARCADE">("ARCADE");

  // Debate State
  const [handle, setHandle] = useState(defaultOpponentHandle || "");
  const [topic, setTopic] = useState(defaultTopic || "");
  const [title, setTitle] = useState("");
  const [posA, setPosA] = useState("");
  const [posB, setPosB] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  // Arcade Game State
  const [selectedGame, setSelectedGame] = useState<ArcadeGameType>("ludo");
  const [enableVoice, setEnableVoice] = useState(true);
  const [stakes, setStakes] = useState(50);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getDefaultScheduledTime = (hoursAhead = 1) => {
    const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const canSendDebate = Boolean(topic.trim().length >= 2 && user);

  // 1. Launch Debate Clash
  const handleSendDebate = async () => {
    if (!canSendDebate || !user) {
      if (!user) setError("You must be logged in to challenge.");
      else if (topic.trim().length < 2) setError("Please enter a debate topic or motion.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const myHandle = user.handle || "@YOU";
      const cleanOpponentHandle = handle.trim()
        ? handle.trim().startsWith("@")
          ? handle.trim()
          : `@${handle.trim()}`
        : "@CHALLENGER";

      const finalPosA = posA.trim() || "IN FAVOR / PRO";
      const finalPosB = posB.trim() || "AGAINST / CON";
      const finalTitle = title.trim() || `1V1 DEBATE: ${topic.trim().toUpperCase()}`;

      let schedTimestamp: Timestamp | null = null;
      if (scheduleMode && scheduledFor) {
        schedTimestamp = Timestamp.fromDate(new Date(scheduledFor));
      }

      const newId = await createClash({
        title: finalTitle,
        topic: topic.trim(),
        handleA: myHandle,
        posA: finalPosA,
        handleB: cleanOpponentHandle,
        posB: finalPosB,
        creatorUid: user.uid,
        creatorHandle: myHandle,
        targetUid: defaultOpponentUid,
        status: scheduleMode ? "upcoming" : "live",
        scheduledFor: schedTimestamp,
      });

      onClose();
      router.push(`/stage/${newId}`);
    } catch (err: any) {
      console.error("[ChallengeModal] Failed to launch debate:", err);
      setError(err?.message || "Failed to initialize debate stage. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // 2. Launch Arcade Game Clash
  const handleSendGameChallenge = async () => {
    if (!user) {
      setError("You must be logged in to send a game challenge.");
      return;
    }

    setBusy(true);
    setError(null);
    soundSynth.playSubtlePop();

    try {
      const targetOpponent = handle.trim() || defaultOpponentHandle || "@OPPONENT";
      const matchTitle = `1V1 ${selectedGame.toUpperCase()} CLASH // ${user.handle || "@HOST"} VS ${targetOpponent}`;

      const matchId = await createArcadeMatch({
        gameType: selectedGame,
        title: matchTitle,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        hostAvatar: user.photoUrl || user.photoURL,
        mode: "MULTIPLAYER",
        maxPlayers: 2,
        enableVoice,
        stakes,
      });

      // Send challenge notification to opponent
      if (defaultOpponentUid && user.uid !== defaultOpponentUid) {
        await createNotification(defaultOpponentUid, {
          type: "stage",
          fromUid: user.uid,
          fromHandle: user.handle || "@HOST",
          clashId: matchId,
          clashTitle: `1v1 ${selectedGame.toUpperCase()} Game Challenge`,
          text: `challenged you to a 1v1 ${selectedGame.toUpperCase()} match! Tap to play!`,
        });
      }

      soundSynth.playAirhorn();
      onClose();
      router.push(`/arcade?matchId=${matchId}`);
    } catch (err: any) {
      console.error("[ChallengeModal] Failed to launch game challenge:", err);
      setError(err?.message || "Failed to initialize game arena. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in font-mono text-white select-none">
      <div className="w-full max-w-lg bg-neutral-950 border-2 border-white p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b-2 border-white pb-3">
          <div className="space-y-0.5">
            <p className="text-[10px] tracking-widest text-white uppercase flex items-center gap-1.5 font-extrabold">
              <Swords className="w-3.5 h-3.5 text-white animate-pulse" />
              // 1V1 CHALLENGE PROTOCOL
            </p>
            <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
              CHALLENGE {defaultOpponentHandle ? defaultOpponentHandle.toUpperCase() : "OPPONENT"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 border border-neutral-800 hover:border-white"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 border border-red-800 bg-red-950/50 text-red-300 text-xs font-bold uppercase">
            ⚠️ {error}
          </div>
        )}

        {/* Challenge Category Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setChallengeCategory("ARCADE")}
            className={`p-2.5 text-center border-2 font-extrabold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              challengeCategory === "ARCADE"
                ? "border-white bg-white text-black shadow-lg ring-1 ring-white"
                : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            <Gamepad2 size={15} />
            <span>[ 🎮 RETRO GAMES ]</span>
          </button>

          <button
            type="button"
            onClick={() => setChallengeCategory("DEBATE")}
            className={`p-2.5 text-center border-2 font-extrabold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              challengeCategory === "DEBATE"
                ? "border-white bg-white text-black shadow-lg ring-1 ring-white"
                : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            <Mic size={15} />
            <span>[ 🎙️ STAGE DEBATE ]</span>
          </button>
        </div>

        {/* ── ARCADE GAME CHALLENGE VIEW ── */}
        {challengeCategory === "ARCADE" && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-widest text-neutral-400 block uppercase font-bold">
                1. SELECT 1V1 GAME
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {ARCADE_GAMES.map((g) => {
                  const isSel = selectedGame === g.type;
                  return (
                    <button
                      key={g.type}
                      type="button"
                      onClick={() => {
                        setSelectedGame(g.type);
                        soundSynth.playSubtlePop();
                      }}
                      className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                        isSel
                          ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                          : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
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

            {/* Voice & Stakes Grid */}
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
                  onChange={(e) => setStakes(Number(e.target.value))}
                  className="w-full py-2 px-2 bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-white uppercase"
                >
                  <option value={0}>0 (CASUAL)</option>
                  <option value={50}>50 (+100 WIN)</option>
                  <option value={100}>100 (+200 WIN)</option>
                  <option value={250}>250 (+500 WIN)</option>
                </select>
              </div>
            </div>

            {/* Launch Game Challenge Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={busy || !user}
                onClick={handleSendGameChallenge}
                className="w-full py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-mono font-extrabold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-2xl"
              >
                <Gamepad2 size={16} strokeWidth={2.5} />
                <span>
                  {busy
                    ? "INITIALIZING ARENA..."
                    : `[ ⚔️ CHALLENGE TO ${selectedGame.toUpperCase()} ]`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE DEBATE CHALLENGE VIEW ── */}
        {challengeCategory === "DEBATE" && (
          <div className="space-y-4 pt-1">
            {/* Transmission Type Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode(false)}
                className={`p-2 text-center border font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !scheduleMode
                    ? "border-white bg-white text-black shadow-md"
                    : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                }`}
              >
                <Swords size={13} />
                <span>[ ⚡ LIVE NOW ]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode(true);
                  if (!scheduledFor) setScheduledFor(getDefaultScheduledTime(1));
                }}
                className={`p-2 text-center border font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  scheduleMode
                    ? "border-white bg-white text-black shadow-md"
                    : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                }`}
              >
                <Calendar size={13} />
                <span>[ 📅 SCHEDULE ]</span>
              </button>
            </div>

            {scheduleMode && (
              <div className="p-3 border border-neutral-800 bg-black space-y-1.5 animate-fade-in">
                <label className="text-[10px] tracking-widest text-neutral-400 block uppercase font-bold">
                  TRANSMISSION DATE & TIME:
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  style={{ colorScheme: "dark" }}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 p-2 text-xs text-white outline-none focus:border-white cursor-pointer"
                />
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] tracking-widest text-neutral-400 block mb-1 uppercase font-bold flex items-center justify-between">
                  <span>DEBATE TOPIC / MOTION *</span>
                  <span className="text-[9px] text-[#1DB954]">REQUIRED</span>
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Is AI going to replace junior developers by 2027?"
                  rows={2}
                  className="w-full bg-black border border-neutral-800 focus:border-white p-2.5 text-xs text-white placeholder-neutral-700 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
                  DEBATE TITLE (OPTIONAL)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. THE AI CODING DISRUPTION"
                  className="w-full bg-black border border-neutral-800 focus:border-white p-2 text-xs text-white placeholder-neutral-700 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
                    SIDE A ({user?.handle || "@YOU"})
                  </label>
                  <input
                    value={posA}
                    onChange={(e) => setPosA(e.target.value)}
                    placeholder="IN FAVOR / PRO"
                    className="w-full bg-black border border-neutral-800 focus:border-white p-2 text-xs text-white placeholder-neutral-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
                    SIDE B ({defaultOpponentHandle || "@OPPONENT"})
                  </label>
                  <input
                    value={posB}
                    onChange={(e) => setPosB(e.target.value)}
                    placeholder="AGAINST / CON"
                    className="w-full bg-black border border-neutral-800 focus:border-white p-2 text-xs text-white placeholder-neutral-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Launch Debate Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!canSendDebate || busy}
                onClick={handleSendDebate}
                className="w-full py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-mono font-extrabold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-2xl"
              >
                <Swords size={16} strokeWidth={2.5} />
                <span>
                  {busy ? "LAUNCHING..." : scheduleMode ? "[ SCHEDULE DEBATE ]" : "[ LAUNCH 1V1 DEBATE ]"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
