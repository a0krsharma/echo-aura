"use client";

import React, { useState, useEffect, useRef } from "react";
import { SpaceZoneId, SpatialAvatar, SPACES_ZONES } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  Sparkles,
  Flame,
  Clock,
  Dumbbell,
  BookOpen,
  PartyPopper,
  Gamepad2,
  Compass,
  Trophy,
  Coffee,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2,
  CheckCircle2,
  X,
} from "lucide-react";

interface SpaceWorldNavigatorProps {
  currentZone: SpaceZoneId;
  remoteAvatars: SpatialAvatar[];
  onTeleport: (x: number, y: number) => void;
  onSendSpeech: (text: string) => void;
  onSendEmote: (emote: string) => void;
  onTriggerConfetti: () => void;
  onOpenPartyGames: () => void;
  onOpenArcade: () => void;
  onOpenWhiteboard: () => void;
  onOpenMusic: () => void;
}

const WISDOM_QUOTES = [
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "Focus is a muscle. The more you protect your attention, the stronger it grows.", author: "Deep Work" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];

export default function SpaceWorldNavigator({
  currentZone,
  remoteAvatars,
  onTeleport,
  onSendSpeech,
  onSendEmote,
  onTriggerConfetti,
  onOpenPartyGames,
  onOpenArcade,
  onOpenWhiteboard,
  onOpenMusic,
}: SpaceWorldNavigatorProps) {
  // ── 1. Retention: Daily Streak System ──
  const [streakDays, setStreakDays] = useState(1);
  const [showStreakModal, setShowStreakModal] = useState(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastVisit = localStorage.getItem("echo_last_visit_date");
      const savedStreak = parseInt(localStorage.getItem("echo_space_streak") || "1", 10);

      if (!lastVisit) {
        localStorage.setItem("echo_last_visit_date", today);
        localStorage.setItem("echo_space_streak", "1");
        setStreakDays(1);
      } else if (lastVisit !== today) {
        const lastDate = new Date(lastVisit);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 1) {
          const nextStreak = savedStreak + 1;
          localStorage.setItem("echo_space_streak", nextStreak.toString());
          localStorage.setItem("echo_last_visit_date", today);
          setStreakDays(nextStreak);
        } else if (diffDays > 1) {
          localStorage.setItem("echo_space_streak", "1");
          localStorage.setItem("echo_last_visit_date", today);
          setStreakDays(1);
        } else {
          setStreakDays(savedStreak);
        }
      } else {
        setStreakDays(savedStreak);
      }
    } catch {}
  }, []);

  // ── 2. Retention: Time-in-Space Aura Passive Generator ──
  const [auraSecondsLeft, setAuraSecondsLeft] = useState(120); // 2-min cycle
  const [auraPointsEarned, setAuraPointsEarned] = useState(0);
  const [auraRewardToast, setAuraRewardToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setAuraSecondsLeft((prev) => {
        if (prev <= 1) {
          // Award +15 Aura
          spacesSfx.playZoneChime();
          setAuraPointsEarned((p) => p + 15);
          setAuraRewardToast("+15 Aura Earned for Chilling in Space! ✨");
          setTimeout(() => setAuraRewardToast(null), 3500);
          return 120; // reset 2 min
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── 3. Gym Stats: Local Rep Counter ──
  const [gymReps, setGymReps] = useState(() => {
    try {
      return parseInt(localStorage.getItem("echo_gym_reps") || "0", 10);
    } catch {
      return 0;
    }
  });

  const handlePumpReps = () => {
    spacesSfx.playKeyNote(5);
    const newReps = gymReps + 10;
    setGymReps(newReps);
    try {
      localStorage.setItem("echo_gym_reps", newReps.toString());
    } catch {}
    onSendEmote("💪");
    onSendSpeech(`🏋️‍♂️ Pumped 10 reps! (${newReps} total sets finished) 💪🔥`);
    setAuraPointsEarned((p) => p + 15);
    setAuraRewardToast("+15 Aura for Fitness! 💪");
    setTimeout(() => setAuraRewardToast(null), 3000);
  };

  const handleHydrate = () => {
    spacesSfx.playSitPop();
    onSendEmote("🥤");
    onSendSpeech("🥤 Ahh cold water! Hydration check complete. 💧✨");
    setAuraPointsEarned((p) => p + 5);
    setAuraRewardToast("+5 Aura for Hydration! 🥤");
    setTimeout(() => setAuraRewardToast(null), 2500);
  };

  // ── 4. Library & Study: 25-Min Pomodoro Timer ──
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const pomoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showWisdomModal, setShowWisdomModal] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    if (pomoActive) {
      pomoTimerRef.current = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(pomoTimerRef.current as NodeJS.Timeout);
            setPomoActive(false);
            spacesSfx.playPartyFanfare();
            onSendSpeech("🎓 25-Min Pomodoro Study Session Complete! +50 Focus Aura! 🧠✨");
            setAuraPointsEarned((p) => p + 50);
            setAuraRewardToast("🎓 +50 Focus Aura! Pomodoro Finished! 📚");
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomoTimerRef.current) clearInterval(pomoTimerRef.current);
    }
    return () => {
      if (pomoTimerRef.current) clearInterval(pomoTimerRef.current);
    };
  }, [pomoActive, onSendSpeech]);

  const togglePomodoro = () => {
    spacesSfx.playKeyNote(3);
    if (!pomoActive && pomoSeconds === 25 * 60) {
      onSendSpeech("📚 Started 25-min Pomodoro Study Session. Focus mode ON! 🧠");
    }
    setPomoActive((prev) => !prev);
  };

  const resetPomodoro = () => {
    spacesSfx.playSitPop();
    setPomoActive(false);
    setPomoSeconds(25 * 60);
  };

  const formatPomoTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ── 5. Fountain Coin Toss ──
  const handleTossCoin = () => {
    spacesSfx.playKeyNote(6);
    onSendEmote("✨");
    onSendSpeech("🪙 Tossed a coin into the Echo Fountain! Wishing everyone abundance & peace ✨⛲");
    setAuraPointsEarned((p) => p + 5);
    setAuraRewardToast("+5 Aura! Fountain Wish Made ✨");
    setTimeout(() => setAuraRewardToast(null), 2500);
  };

  // Count avatars per zone
  const getZoneCount = (zoneId: SpaceZoneId) => {
    const countRemote = remoteAvatars.filter((a) => a.activeZone === zoneId).length;
    const isCurrentHere = currentZone === zoneId || (zoneId === "party" && currentZone === "music");
    return countRemote + (isCurrentHere ? 1 : 0);
  };

  // Zone Configurations
  const ZONES_NAV: {
    id: SpaceZoneId;
    label: string;
    icon: string;
    color: string;
    spawnX: number;
    spawnY: number;
  }[] = [
    { id: "party", label: "Party Area", icon: "🪩", color: "from-pink-500 to-rose-500", spawnX: 270, spawnY: 880 },
    { id: "games", label: "Game Zone", icon: "🕹️", color: "from-purple-500 to-indigo-500", spawnX: 270, spawnY: 320 },
    { id: "gym", label: "Gym Area", icon: "🏋️‍♂️", color: "from-amber-500 to-orange-500", spawnX: 1280, spawnY: 880 },
    { id: "library", label: "Study Room", icon: "📚", color: "from-emerald-500 to-teal-500", spawnX: 1280, spawnY: 320 },
    { id: "courtyard", label: "Central Plaza", icon: "⛲", color: "from-cyan-500 to-blue-500", spawnX: 775, spawnY: 550 },
  ];

  const normalizedCurrentZone = currentZone === "music" ? "party" : currentZone;

  return (
    <>
      {/* Floating Aura Notification Toast */}
      {auraRewardToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-mono text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span className="font-bold">{auraRewardToast}</span>
        </div>
      )}

      {/* Main World Navigator Bar */}
      <div className="bg-neutral-950/95 border-b border-neutral-800/90 px-2 sm:px-4 py-2 z-20 shrink-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* LEFT: 1-Click Zone Fast Travel Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Jump:</span>
            </span>

            {ZONES_NAV.map((z) => {
              const isSelected = normalizedCurrentZone === z.id;
              const count = getZoneCount(z.id);

              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => onTeleport(z.spawnX, z.spawnY)}
                  className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isSelected
                      ? `bg-gradient-to-r ${z.color} text-white border-transparent shadow-lg shadow-black/40 scale-105 ring-1 ring-white/30`
                      : "bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800"
                  }`}
                  title={`Teleport to ${z.label}`}
                >
                  <span className="text-sm">{z.icon}</span>
                  <span>{z.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                        isSelected ? "bg-black/30 text-white" : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT: Zone-Contextual 1-Click Quick Actions & Gamification */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 justify-between md:justify-end">
            {/* 1. Contextual Zone Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* GYM ZONE ACTIONS */}
              {normalizedCurrentZone === "gym" && (
                <>
                  <button
                    type="button"
                    onClick={handlePumpReps}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-mono text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                    title="Work out in the gym (+15 Aura)"
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Pump 10 Reps</span>
                    <span className="text-[10px] bg-black/20 px-1 rounded text-neutral-900">
                      {gymReps} done
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleHydrate}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Drink water & replenish energy"
                  >
                    <span>🥤</span>
                    <span>Hydrate</span>
                  </button>
                </>
              )}

              {/* STUDY & LIBRARY ZONE ACTIONS */}
              {normalizedCurrentZone === "library" && (
                <>
                  <div className="flex items-center gap-1 bg-neutral-900/90 border border-emerald-500/40 rounded-xl px-2 py-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-xs font-black text-emerald-300">
                      {formatPomoTime(pomoSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className="ml-1 p-1 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer"
                      title={pomoActive ? "Pause Focus Timer" : "Start 25-min Focus"}
                    >
                      {pomoActive ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                    </button>
                    {pomoSeconds !== 25 * 60 && (
                      <button
                        type="button"
                        onClick={resetPomodoro}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWisdomModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Read Daily Wisdom & Inspiration"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Daily Wisdom</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenWhiteboard}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Open Collaboration Whiteboard"
                  >
                    <span>📝</span>
                    <span>Whiteboard</span>
                  </button>
                </>
              )}

              {/* PARTY AREA ACTIONS */}
              {normalizedCurrentZone === "party" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      spacesSfx.playPartyFanfare();
                      onSendEmote("💃");
                      onSendSpeech("🪩 Dancing to the party rhythm! Let's vibe! ✨🔥");
                    }}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-mono text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                  >
                    <span>💃</span>
                    <span>Dance!</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      spacesSfx.playKeyNote(5);
                      onTriggerConfetti();
                      onSendSpeech("🎉 Confetti Cannon Activated! 🎊");
                    }}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-pink-500/50 text-pink-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <PartyPopper className="w-3.5 h-3.5" />
                    <span>Confetti</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenMusic}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <span>🎵</span>
                    <span>DJ Tracks</span>
                  </button>
                </>
              )}

              {/* GAME ZONE ACTIONS */}
              {normalizedCurrentZone === "games" && (
                <>
                  <button
                    type="button"
                    onClick={onOpenPartyGames}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-mono text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                  >
                    <span>🎲</span>
                    <span>Ludo & UNO</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenArcade}
                    className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>24 Retro Games</span>
                  </button>
                </>
              )}

              {/* CENTRAL PLAZA ACTIONS */}
              {normalizedCurrentZone === "courtyard" && (
                <>
                  <button
                    type="button"
                    onClick={handleTossCoin}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                    title="Toss a coin into the fountain (+5 Aura)"
                  >
                    <span>🪙</span>
                    <span>Toss Fountain Coin</span>
                  </button>
                </>
              )}
            </div>

            {/* 2. Retention Streak Pill & Time-in-Space Progress */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-800 shrink-0">
              {/* Daily Streak */}
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="px-2 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1 hover:bg-amber-900/60 transition cursor-pointer"
                title="Daily Visit Streak Rewards"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span>{streakDays}d Streak</span>
              </button>

              {/* Aura Accumulator Pill */}
              <div
                className="px-2 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-mono text-[11px] flex items-center gap-1"
                title="Passive Aura XP earned by hanging out in Space (+15 Aura every 2 mins)"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="font-bold">+{auraPointsEarned + 15}</span>
                <span className="text-neutral-500 text-[10px]">
                  ({Math.floor(auraSecondsLeft / 60)}:
                  {(auraSecondsLeft % 60).toString().padStart(2, "0")})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DAILY STREAK MODAL ── */}
      {showStreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl">
              🔥
            </div>

            <div>
              <h3 className="text-lg font-mono font-black text-white">
                {streakDays}-Day Space Streak!
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Visit Echo Spaces daily to unlock multiplier Aura XP and exclusive room cosmetics.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="p-2.5 rounded-2xl bg-neutral-900 border border-amber-500/40 text-center">
                <div className="text-xs text-amber-400 font-mono font-bold">Day 1</div>
                <div className="text-sm font-black text-white mt-1">+50 XP</div>
                <div className="text-[10px] text-neutral-400">Unlocked</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                <div className="text-xs text-purple-400 font-mono font-bold">Day 3</div>
                <div className="text-sm font-black text-white mt-1">🔥 Badge</div>
                <div className="text-[10px] text-neutral-400">{streakDays >= 3 ? "Unlocked" : "Locked"}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                <div className="text-xs text-pink-400 font-mono font-bold">Day 7</div>
                <div className="text-sm font-black text-white mt-1">👑 Crown</div>
                <div className="text-[10px] text-neutral-400">{streakDays >= 7 ? "Unlocked" : "Locked"}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStreakModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-mono font-black text-xs hover:from-amber-400 hover:to-orange-400 transition cursor-pointer"
            >
              Keep Streaking! 🔥
            </button>
          </div>
        </div>
      )}

      {/* ── DAILY WISDOM MODAL ── */}
      {showWisdomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-950 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                <BookOpen className="w-4 h-4" />
                <span>Library Focus & Daily Wisdom</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWisdomModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-left">
              <p className="text-sm text-neutral-200 font-serif italic leading-relaxed">
                &ldquo;{WISDOM_QUOTES[currentQuoteIndex].text}&rdquo;
              </p>
              <p className="text-xs text-emerald-400 font-mono font-bold mt-3 text-right">
                — {WISDOM_QUOTES[currentQuoteIndex].author}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentQuoteIndex((prev) => (prev + 1) % WISDOM_QUOTES.length)
                }
                className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs font-bold transition cursor-pointer"
              >
                Next Quote 📖
              </button>

              <button
                type="button"
                onClick={() => {
                  const q = WISDOM_QUOTES[currentQuoteIndex];
                  onSendSpeech(`📖 "${q.text}" — ${q.author}`);
                  setShowWisdomModal(false);
                  spacesSfx.playKeyNote(4);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black transition cursor-pointer"
              >
                Share to Space 💬
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
