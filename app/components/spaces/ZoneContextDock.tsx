"use client";

import React, { useState, useEffect } from "react";
import {
  SpaceZoneId,
  SPACES_ZONES,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Music,
  Heart,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  X,
  CheckCircle2,
  Gavel,
  Radio,
  Share2,
} from "lucide-react";

interface ZoneContextDockProps {
  currentZone: SpaceZoneId;
  onSendEmote: (emote: string) => void;
  onUpdateStatus: (status: string) => void;
  onTossCoin?: () => void;
}

export default function ZoneContextDock({
  currentZone,
  onSendEmote,
  onUpdateStatus,
  onTossCoin,
}: ZoneContextDockProps) {
  const zone = SPACES_ZONES[currentZone] || SPACES_ZONES.courtyard;

  // ── Library Pomodoro Timer State ──
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSecsLeft, setPomoSecsLeft] = useState(25 * 60);
  const [rainEnabled, setRainEnabled] = useState(false);
  const [pomoCompletedCount, setPomoCompletedCount] = useState(0);

  // ── Office Whiteboard / Scratchpad State ──
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [notes, setNotes] = useState(
    "// SPRINT ROADMAP //\n1. Deploy 2D Living Space Metaverse (Office, Library, Music, Concert, Debate)\n2. Seamless walk-in spatial audio proximity\n3. Interactive whiteboard & 8-key piano jam"
  );

  // ── Debate Voting State ──
  const [debateTimerActive, setDebateTimerActive] = useState(false);
  const [debateSecsLeft, setDebateSecsLeft] = useState(60);
  const [agreeVotes, setAgreeVotes] = useState(14);
  const [disagreeVotes, setDisagreeVotes] = useState(9);
  const [userVoted, setUserVoted] = useState<"agree" | "disagree" | null>(null);

  // ── Music Pad Active Highlights ──
  const [activeDrumPad, setActiveDrumPad] = useState<string | null>(null);
  const [activePianoKey, setActivePianoKey] = useState<number | null>(null);

  // 1. Pomodoro interval
  useEffect(() => {
    if (!pomoActive) return;
    const interval = setInterval(() => {
      setPomoSecsLeft((prev) => {
        if (prev <= 1) {
          setPomoActive(false);
          setPomoCompletedCount((c) => c + 1);
          spacesSfx.playFocusBell();
          alert("🎉 [ FOCUS SESSION COMPLETE ] You earned +50 Aura for 25 minutes of deep focus!");
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomoActive]);

  // 2. Debate Timer interval
  useEffect(() => {
    if (!debateTimerActive) return;
    const interval = setInterval(() => {
      setDebateSecsLeft((prev) => {
        if (prev <= 1) {
          setDebateTimerActive(false);
          spacesSfx.playGavelStrike();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [debateTimerActive]);

  // Rain toggle
  const handleToggleRain = () => {
    const next = !rainEnabled;
    setRainEnabled(next);
    spacesSfx.toggleRainAmbience(next);
  };

  // Keyboard shortcut for piano notes in music room
  useEffect(() => {
    if (currentZone !== "music") return;
    const onKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        "1": 0, "2": 1, "3": 2, "4": 3,
        "5": 4, "6": 5, "7": 6, "8": 7,
      };
      if (e.key in keyMap) {
        const noteIdx = keyMap[e.key];
        spacesSfx.playPianoNote(noteIdx);
        setActivePianoKey(noteIdx);
        setTimeout(() => setActivePianoKey(null), 200);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentZone]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <>
      {/* ── Contextual Zone Dock ── */}
      <div className="w-full max-w-2xl mx-auto bg-neutral-950/90 backdrop-blur-md border-t border-x border-neutral-800 rounded-t-2xl p-3 shadow-2xl transition-all select-none">
        {/* Zone Banner Title */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <span className="text-base">{zone.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {zone.name}
                </span>
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase"
                  style={{ backgroundColor: `${zone.color}22`, color: zone.color }}
                >
                  {zone.category}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-sans line-clamp-1">
                {zone.description}
              </p>
            </div>
          </div>
        </div>

        {/* 🏢 1. Virtual Office Controls */}
        {currentZone === "office" && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
              <span className="text-neutral-500 font-mono">STATUS:</span>
              {[
                { label: "💻 Coding", text: "💻 In Deep Focus" },
                { label: "☕ Break", text: "☕ Grabbing Coffee" },
                { label: "🎧 Listening", text: "🎧 Listening to Music" },
                { label: "💬 Open", text: "💬 Open to Chat" },
              ].map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => onUpdateStatus(st.text)}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-700/80 rounded-lg text-neutral-200 font-mono transition-all cursor-pointer"
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setWhiteboardOpen(true)}
              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 rounded-xl text-xs font-black uppercase text-sky-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>WHITEBOARD & NOTES</span>
            </button>
          </div>
        )}

        {/* 📚 2. Quiet Sanctuary Library Controls */}
        {currentZone === "library" && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-base font-mono font-black text-white">
                  {formatTime(pomoSecsLeft)}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">
                  (POMODORO)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPomoActive(!pomoActive)}
                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded-xl text-purple-300 transition-all cursor-pointer active:scale-95"
                title={pomoActive ? "Pause Focus" : "Start 25m Focus"}
              >
                {pomoActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPomoActive(false);
                  setPomoSecsLeft(25 * 60);
                }}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 transition-all cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleRain}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                rainEnabled
                  ? "bg-purple-500/30 border-purple-400 text-purple-200 shadow-sm"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span>🌧️ LOFI RAIN:</span>
              <span>{rainEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>
        )}

        {/* 🎵 3. Music Academy & Jam Studio Controls */}
        {currentZone === "music" && (
          <div className="space-y-2">
            {/* 8-Key Grand Piano */}
            <div className="flex items-center gap-1 justify-center">
              {[
                { note: "C4", key: "1" },
                { note: "D4", key: "2" },
                { note: "E4", key: "3" },
                { note: "F4", key: "4" },
                { note: "G4", key: "5" },
                { note: "A4", key: "6" },
                { note: "B4", key: "7" },
                { note: "C5", key: "8" },
              ].map((p, idx) => (
                <button
                  key={p.note}
                  type="button"
                  onClick={() => {
                    spacesSfx.playPianoNote(idx);
                    setActivePianoKey(idx);
                    setTimeout(() => setActivePianoKey(null), 180);
                  }}
                  className={`flex-1 py-3 px-1 rounded-lg text-center transition-all cursor-pointer font-mono font-black text-xs ${
                    activePianoKey === idx
                      ? "bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-95"
                      : "bg-neutral-900 border border-neutral-700/80 text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  <div className="text-[11px]">{p.note}</div>
                  <div className="text-[8px] text-neutral-500">[{p.key}]</div>
                </button>
              ))}
            </div>

            {/* 4-Pad Drum Machine */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { id: "kick", label: "🥁 KICK", color: "from-amber-600 to-amber-700" },
                { id: "snare", label: "💥 SNARE", color: "from-rose-600 to-rose-700" },
                { id: "hihat", label: "✨ HI-HAT", color: "from-cyan-600 to-cyan-700" },
                { id: "sub808", label: "🔊 808 SUB", color: "from-purple-600 to-purple-700" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    spacesSfx.playDrum(d.id as any);
                    setActiveDrumPad(d.id);
                    setTimeout(() => setActiveDrumPad(null), 150);
                  }}
                  className={`py-2 px-1 rounded-xl text-center font-mono font-black text-[11px] uppercase transition-all cursor-pointer shadow-md border border-white/10 ${
                    activeDrumPad === d.id
                      ? "bg-white text-black scale-95 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                      : `bg-gradient-to-r ${d.color} text-white hover:opacity-90 active:scale-95`
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🎤 4. Concert & Festival Stage Controls */}
        {currentZone === "concert" && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-amber-400">EMOTES:</span>
              {[
                { emoji: "💃", label: "Dance" },
                { emoji: "👋", label: "Wave" },
                { emoji: "🎉", label: "Cheer" },
                { emoji: "🔥", label: "Fire" },
                { emoji: "❤️", label: "Heart" },
              ].map((em) => (
                <button
                  key={em.label}
                  type="button"
                  onClick={() => {
                    onSendEmote(em.emoji);
                    spacesSfx.playCheerFanfare();
                  }}
                  className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-90 border border-neutral-800 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{em.emoji}</span>
                  <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">
                    {em.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400">
                STAGE BROADCAST: <strong>ACTIVE 🎙️</strong>
              </span>
            </div>
          </div>
        )}

        {/* ⚖️ 5. Town Hall Debate Arena Controls */}
        {currentZone === "debate" && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Debate Timer & Gavel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => spacesSfx.playGavelStrike()}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-400/50 rounded-xl text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Strike the Gavel (*BANG BANG* ORDER IN COURT!)"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>GAVEL</span>
              </button>

              <div className="flex items-center gap-1 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800 text-xs font-mono font-bold">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{debateSecsLeft}s</span>
                <button
                  type="button"
                  onClick={() => setDebateTimerActive(!debateTimerActive)}
                  className="ml-1 text-[9px] text-neutral-400 hover:text-white uppercase"
                >
                  [{debateTimerActive ? "PAUSE" : "START"}]
                </button>
              </div>
            </div>

            {/* Spectator Live Voting */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400">VOTE:</span>
              <button
                type="button"
                onClick={() => {
                  if (userVoted !== "agree") {
                    setAgreeVotes((v) => v + 1);
                    if (userVoted === "disagree") setDisagreeVotes((v) => Math.max(0, v - 1));
                    setUserVoted("agree");
                    spacesSfx.playSitPop();
                  }
                }}
                className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  userVoted === "agree"
                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>AGREE ({agreeVotes})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (userVoted !== "disagree") {
                    setDisagreeVotes((v) => v + 1);
                    if (userVoted === "agree") setAgreeVotes((v) => Math.max(0, v - 1));
                    setUserVoted("disagree");
                    spacesSfx.playSitPop();
                  }
                }}
                className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  userVoted === "disagree"
                    ? "bg-rose-500/30 border-rose-400 text-rose-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <ThumbsDown className="w-3 h-3" />
                <span>DISAGREE ({disagreeVotes})</span>
              </button>
            </div>
          </div>
        )}

        {/* ⛲ Central Courtyard Controls */}
        {currentZone === "courtyard" && (
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-neutral-400">
            <span>WALK INTO ANY ROOM TO JOIN LIVE ACTIVITIES // 5 ZONES CONNECTED</span>
            {onTossCoin && (
              <button
                type="button"
                onClick={onTossCoin}
                className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 rounded-xl text-teal-300 font-bold uppercase cursor-pointer"
              >
                🪙 TOSS FOUNTAIN COIN
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Office Whiteboard Modal ── */}
      {whiteboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 font-mono">
          <div className="w-full max-w-xl bg-neutral-950 border-2 border-sky-400/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  // VIRTUAL OFFICE // COLLABORATIVE SCRATCHPAD
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhiteboardOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                placeholder="Type team brainstorm notes, roadmaps, code snippets..."
                className="w-full p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs font-mono text-sky-100 placeholder-neutral-500 outline-none focus:border-sky-400 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>CHANGES SYNCED IN MEMORY WITH ROOM ATTENDEES</span>
                <button
                  type="button"
                  onClick={() => {
                    setWhiteboardOpen(false);
                    spacesSfx.playSitPop();
                  }}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-black uppercase rounded-xl transition-all cursor-pointer"
                >
                  SAVE & CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
