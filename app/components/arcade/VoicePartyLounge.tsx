"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  Flame,
  Swords,
  Crown,
  Sparkles,
  Zap,
  Volume2,
  Clock,
  Compass,
  Check,
  X,
  AlertTriangle,
  Radio,
  Music,
  Laugh,
  HelpCircle,
  Film,
  Users,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { TERMINAL_BADGES } from "@/lib/terminalBadges";

type VoicePartyMode =
  | "ROAST_RING"
  | "DEFEND_ABSURD"
  | "MIMICRY"
  | "HOT_SEAT"
  | "TRUTH_DARE";

interface VoicePartyLoungeProps {
  currentUid: string;
  userHandle: string;
  players?: { uid: string; handle: string; photoUrl?: string }[];
}

const ABSURD_STANCES = [
  "Chai is overrated; warm tap water is the superior beverage.",
  "Pineapple is the sacred crowning ingredient of royal Biryani.",
  "Monday mornings are objectively better than Friday nights.",
  "Sleeping with wet socks on activates 100% of human brain power.",
  "Mosquitoes are just trying to give us free acupuncture.",
  "Cereal should strictly be eaten with orange juice, not milk.",
];

const MIMICRY_PROMPTS = [
  { title: "Gabbar Singh (Sholay)", line: "Kitne aadmi the?! Sambha... bata kitne the!" },
  { title: "The Dark Knight (Bane)", line: "Ah, you think darkness is your ally. You merely adopted the dark." },
  { title: "Shah Rukh Khan (Romantic)", line: "K-k-k... Kiran! Rahul, naam toh suna hi hoga?" },
  { title: "Arnold (Terminator)", line: "I'll be back. Hasta la vista, baby." },
  { title: "Godfather (Vito Corleone)", line: "I'm gonna make him an offer he can't refuse." },
];

const VOICE_TRUTHS = [
  "Share the single most embarrassing search in your browser history this week.",
  "What is a secret opinion you hold that would get you instantly kicked from your friend group?",
  "Read aloud the exact last text message you sent on WhatsApp without giving any context.",
  "Who in this room would you eliminate first in a zombie apocalypse and why?",
  "What is the most ridiculous lie you told someone with a completely straight face?",
];

const AUDIO_DARES = [
  "🎙️ THE RADIO HOST: Deliver a 30-second dramatic cricket commentary describing what another player in this room is wearing.",
  "📻 THE VOCAL FILTER DARE: Keep an anonymous ghost or walkie-talkie audio filter active for the next 3 rounds.",
  "🎭 THE OPERATIC CONFESSION: Sing your next answer like a dramatic grand opera singer.",
  "📱 THE VOICE NOTE PRANK: Record a 5-second absurd voice meme and send it to an offline contact right now.",
  "🦁 ANIMAL CALL: Do your loudest, most impassioned lion roar or donkey bray on open microphone.",
];

export default function VoicePartyLounge({
  currentUid,
  userHandle,
  players = [],
}: VoicePartyLoungeProps) {
  const [activeTab, setActiveTab] = useState<VoicePartyMode>("ROAST_RING");

  // 1. Roast Ring State
  const [roastRound, setRoastRound] = useState<1 | 2>(1);
  const [roastTimer, setRoastTimer] = useState<number>(30);
  const [isRoastRunning, setIsRoastRunning] = useState<boolean>(false);
  const [roastScoreA, setRoastScoreA] = useState<number>(0);
  const [roastScoreB, setRoastScoreB] = useState<number>(0);

  // 2. Defend Absurd State
  const [absurdStance, setAbsurdStance] = useState<string>(ABSURD_STANCES[0]);
  const [absurdTimer, setAbsurdTimer] = useState<number>(45);
  const [isAbsurdRunning, setIsAbsurdRunning] = useState<boolean>(false);
  const [absurdVotes, setAbsurdVotes] = useState<{ convinced: number; rejected: number }>({
    convinced: 0,
    rejected: 0,
  });

  // 3. Mimicry State
  const [mimicIdx, setMimicIdx] = useState<number>(0);

  // 4. Hot Seat State
  const [hotSeatTimer, setHotSeatTimer] = useState<number>(60);
  const [isHotSeatRunning, setIsHotSeatRunning] = useState<boolean>(false);

  // 5. Spin Needle & Truth/Dare State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [needleAngle, setNeedleAngle] = useState<number>(0);
  const [selectedVictim, setSelectedVictim] = useState<string>(userHandle);
  const [currentTruth, setCurrentTruth] = useState<string>(VOICE_TRUTHS[0]);
  const [currentDare, setCurrentDare] = useState<string>(AUDIO_DARES[0]);
  const [forfeitedChickens, setForfeitedChickens] = useState<string[]>([]);
  const [communityVoltsPot, setCommunityVoltsPot] = useState<number>(250);

  // Roast timer tick
  useEffect(() => {
    let interval: any;
    if (isRoastRunning && roastTimer > 0) {
      interval = setInterval(() => setRoastTimer((t) => t - 1), 1000);
    } else if (roastTimer === 0 && isRoastRunning) {
      soundSynth.playBuzzer();
      if (roastRound === 1) {
        setRoastRound(2);
        setRoastTimer(30);
      } else {
        setIsRoastRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRoastRunning, roastTimer, roastRound]);

  // Absurd timer tick
  useEffect(() => {
    let interval: any;
    if (isAbsurdRunning && absurdTimer > 0) {
      interval = setInterval(() => setAbsurdTimer((t) => t - 1), 1000);
    } else if (absurdTimer === 0 && isAbsurdRunning) {
      soundSynth.playGong();
      setIsAbsurdRunning(false);
    }
    return () => clearInterval(interval);
  }, [isAbsurdRunning, absurdTimer]);

  // Hot Seat timer tick
  useEffect(() => {
    let interval: any;
    if (isHotSeatRunning && hotSeatTimer > 0) {
      interval = setInterval(() => setHotSeatTimer((t) => t - 1), 1000);
    } else if (hotSeatTimer === 0 && isHotSeatRunning) {
      soundSynth.playBuzzer();
      setIsHotSeatRunning(false);
    }
    return () => clearInterval(interval);
  }, [isHotSeatRunning, hotSeatTimer]);

  // Spin Compass Needle
  const handleSpinNeedle = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundSynth.playSnare();

    const randomRotations = 5 + Math.floor(Math.random() * 6);
    const randomDegree = Math.floor(Math.random() * 360);
    const finalAngle = needleAngle + randomRotations * 360 + randomDegree;
    setNeedleAngle(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      soundSynth.playFanfare();
      const mockList = players.length > 0 ? players.map((p) => p.handle) : [userHandle, "@RIVAL_1", "@CHAMP_99", "@HOSTEL_PRO"];
      const chosen = mockList[Math.floor(Math.random() * mockList.length)];
      setSelectedVictim(chosen);
      setCurrentTruth(VOICE_TRUTHS[Math.floor(Math.random() * VOICE_TRUTHS.length)]);
      setCurrentDare(AUDIO_DARES[Math.floor(Math.random() * AUDIO_DARES.length)]);
    }, 2800);
  };

  const handleForfeit = () => {
    soundSynth.playBuzzer();
    setCommunityVoltsPot((p) => p + 50);
    if (!forfeitedChickens.includes(selectedVictim)) {
      setForfeitedChickens([...forfeitedChickens, selectedVictim]);
    }
  };

  return (
    <div className="bg-black border-2 border-white p-4 sm:p-6 rounded-xl font-mono text-white space-y-6 shadow-2xl select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-400">
            <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>// VOICE ARENA & SOCIAL CONFESSION SUITE</span>
          </div>
          <h2 className="text-lg font-black uppercase text-white">
            Live Party Mic Duels & Confession Vault
          </h2>
        </div>

        {/* Community Pot */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-yellow-500/60 px-3 py-1.5 rounded-lg shadow-inner">
          <Zap className="w-4 h-4 text-yellow-400 animate-bounce" />
          <div className="text-right">
            <div className="text-[9px] text-yellow-400 font-bold uppercase">COMMUNITY VOLTS POT:</div>
            <div className="text-sm font-black text-white">{communityVoltsPot} VOLTS ⚡</div>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("ROAST_RING")}
          className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "ROAST_RING"
              ? "border-rose-500 bg-rose-950/50 text-rose-300 ring-1 ring-rose-500"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>60S ROAST RING</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DEFEND_ABSURD")}
          className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "DEFEND_ABSURD"
              ? "border-amber-400 bg-amber-950/50 text-amber-300 ring-1 ring-amber-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>DEFEND THE ABSURD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MIMICRY")}
          className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "MIMICRY"
              ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 ring-1 ring-cyan-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          <Film className="w-3.5 h-3.5 text-cyan-400" />
          <span>ACCENT & MIMICRY</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HOT_SEAT")}
          className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "HOT_SEAT"
              ? "border-red-500 bg-red-950/50 text-red-300 ring-1 ring-red-500"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>SABOTEUR HOT SEAT</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TRUTH_DARE")}
          className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "TRUTH_DARE"
              ? "border-emerald-400 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>TRUTH & DARE NEEDLE</span>
        </button>
      </div>

      {/* ── TAB 1: 60-SECOND ROAST RING ── */}
      {activeTab === "ROAST_RING" && (
        <div className="bg-neutral-950 border border-rose-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-rose-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>1v1 MIC ROAST RING (30S TURNS)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Improvise hilarious punchlines over the lo-fi beat. Audience votes crown the winner.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-white font-mono">{roastTimer}S</div>
              <div className="text-[9px] text-rose-400 font-bold uppercase">
                {isRoastRunning ? `ROUND ${roastRound}: ${roastRound === 1 ? "PLAYER 1" : "PLAYER 2"}` : "ROUND PAUSED"}
              </div>
            </div>
          </div>

          {/* Duelists Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded-xl space-y-2 ${roastRound === 1 && isRoastRunning ? "border-rose-500 bg-rose-950/30 ring-1 ring-rose-500" : "border-neutral-800 bg-black"}`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-rose-400">🔴 CREATOR 1</span>
                <span className="text-white">{roastScoreA} VOTES</span>
              </div>
              <div className="text-sm font-black text-white truncate">{userHandle}</div>
              <button
                type="button"
                onClick={() => {
                  setRoastScoreA((s) => s + 1);
                  soundSynth.playSubtlePop();
                }}
                className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase rounded transition-all cursor-pointer active:scale-95"
              >
                🔥 VOTE ROAST (+1)
              </button>
            </div>

            <div className={`p-3 border rounded-xl space-y-2 ${roastRound === 2 && isRoastRunning ? "border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500" : "border-neutral-800 bg-black"}`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-cyan-400">🔵 CREATOR 2</span>
                <span className="text-white">{roastScoreB} VOTES</span>
              </div>
              <div className="text-sm font-black text-white truncate">@RIVAL_MC</div>
              <button
                type="button"
                onClick={() => {
                  setRoastScoreB((s) => s + 1);
                  soundSynth.playSubtlePop();
                }}
                className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase rounded transition-all cursor-pointer active:scale-95"
              >
                🔥 VOTE ROAST (+1)
              </button>
            </div>
          </div>

          {/* Controls & Audience Reactions */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
            <button
              type="button"
              onClick={() => {
                soundSynth.playFanfare();
                setIsRoastRunning(!isRoastRunning);
              }}
              className="py-2.5 px-6 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95"
            >
              {isRoastRunning ? "[ ⏸️ PAUSE BOUT ]" : "[ 🎙️ START 60S ROAST BOUT ]"}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => soundSynth.playApplause()}
                className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-white text-xs rounded transition-all cursor-pointer"
              >
                👏
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playAirhorn()}
                className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-white text-xs rounded transition-all cursor-pointer"
              >
                📢
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playBoing()}
                className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-white text-xs rounded transition-all cursor-pointer"
              >
                💀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DEFEND THE ABSURD ── */}
      {activeTab === "DEFEND_ABSURD" && (
        <div className="bg-neutral-950 border border-amber-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>DEFEND THE ABSURD (45S DEBATE DUEL)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                The terminal assigns a ridiculous stance. Deliver a deadpan serious defense!
              </p>
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-white font-mono">{absurdTimer}S</div>
              <div className="text-[9px] text-amber-400 font-bold uppercase">
                {isAbsurdRunning ? "DEFENSE IN PROGRESS" : "STANDBY"}
              </div>
            </div>
          </div>

          {/* Assigned Stance Box */}
          <div className="bg-black border-2 border-amber-400 p-4 rounded-xl space-y-2 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              ASSIGNED RIDICULOUS STANCE:
            </div>
            <div className="text-sm sm:text-base font-black text-white italic">
              "{absurdStance}"
            </div>
          </div>

          {/* Actions & Audience Poll */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                soundSynth.playSnare();
                const next = ABSURD_STANCES[Math.floor(Math.random() * ABSURD_STANCES.length)];
                setAbsurdStance(next);
                setAbsurdTimer(45);
              }}
              className="py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white font-bold text-xs uppercase rounded-lg transition-all cursor-pointer"
            >
              🎲 NEW STANCE
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth.playFanfare();
                setIsAbsurdRunning(!isAbsurdRunning);
              }}
              className="py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95"
            >
              {isAbsurdRunning ? "PAUSE CLOCK" : "START 45S DEFENSE 🎙️"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAbsurdVotes((v) => ({ ...v, convinced: v.convinced + 1 }));
                  soundSynth.playApplause();
                }}
                className="flex-1 py-2.5 bg-emerald-950 border border-emerald-600 hover:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer"
              >
                CONVINCED ({absurdVotes.convinced})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbsurdVotes((v) => ({ ...v, rejected: v.rejected + 1 }));
                  soundSynth.playBuzzer();
                }}
                className="flex-1 py-2.5 bg-rose-950 border border-rose-600 hover:bg-rose-600 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer"
              >
                REJECTED ({absurdVotes.rejected})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACCENT & MIMICRY SHOWDOWN ── */}
      {activeTab === "MIMICRY" && (
        <div className="bg-neutral-950 border border-cyan-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-cyan-400 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-cyan-400" />
                <span>ACCENT & POP-CULTURE MIMICRY SHOWDOWN</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Mimic iconic movie and dialogue accents on mic. Room rates tone and accuracy!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundSynth.playSubtlePop();
                setMimicIdx((i) => (i + 1) % MIMICRY_PROMPTS.length);
              }}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-cyan-400 text-cyan-300 font-bold text-xs uppercase rounded cursor-pointer"
            >
              NEXT PROMPT ⏭️
            </button>
          </div>

          {/* Dialogue Cue Card */}
          <div className="bg-black border-2 border-cyan-400 p-4 rounded-xl space-y-2 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase">
              <span>CHARACTER / ICON:</span>
              <span className="text-white font-black">{MIMICRY_PROMPTS[mimicIdx].title}</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              "{MIMICRY_PROMPTS[mimicIdx].line}"
            </div>
          </div>

          {/* Soundboard Rating Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-neutral-400 font-bold uppercase">
              ROOM SOUNDBOARD RATINGS:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => soundSynth.playApplause()}
                className="py-2 bg-emerald-950 border border-emerald-600 hover:bg-emerald-600 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                👑 10/10 MASTERPIECE
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playAirhorn()}
                className="py-2 bg-amber-950 border border-amber-600 hover:bg-amber-600 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                🔥 SPOT-ON VIBE
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playBoing()}
                className="py-2 bg-purple-950 border border-purple-600 hover:bg-purple-600 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                🎭 FUNNY ATTEMPT
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playBuzzer()}
                className="py-2 bg-rose-950 border border-rose-600 hover:bg-rose-600 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                ❌ SOUNDS NOTHING LIKE IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SABOTEUR HOT SEAT ── */}
      {activeTab === "HOT_SEAT" && (
        <div className="bg-neutral-950 border border-red-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <span>SABOTEUR HOT SEAT (60S INTERROGATION)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Suspect is grilled by the entire lounge with rapid-fire questions to break their alibi.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-white font-mono">{hotSeatTimer}S</div>
              <div className="text-[9px] text-red-400 font-bold uppercase">
                {isHotSeatRunning ? "HOT SEAT ACTIVE" : "STANDBY"}
              </div>
            </div>
          </div>

          <div className="bg-black border-2 border-red-500 p-4 rounded-xl text-center space-y-2">
            <div className="text-xs text-neutral-400 uppercase font-bold">CURRENT SUSPECT ON GRILLE:</div>
            <div className="text-xl font-black text-red-400">{userHandle}</div>
            <p className="text-xs text-neutral-300 max-w-md mx-auto">
              Lounge members: Unmute and cross-examine this suspect immediately. If their voice falters, vote GUILTY.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundSynth.playSubBoom();
                setIsHotSeatRunning(!isHotSeatRunning);
              }}
              className="py-3 px-8 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-xl active:scale-95"
            >
              {isHotSeatRunning ? "PAUSE INTERROGATION" : "START 60S HOT SEAT 🔥"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 5: TRUTH & DARE NEEDLE ── */}
      {activeTab === "TRUTH_DARE" && (
        <div className="bg-neutral-950 border border-emerald-900/60 p-4 rounded-xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>SPIN THE TERMINAL NEEDLE // TRUTH & AUDIO DARES</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Neon compass lands on a random voice node. Forfeit costs 50 VOLTS or Chicken Node badge!
              </p>
            </div>
          </div>

          {/* Compass & Needle */}
          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            <div className="relative w-44 h-44 rounded-full border-4 border-emerald-500 bg-black flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              {/* Compass Compass Markings */}
              <div className="absolute top-2 text-[10px] text-emerald-400 font-bold font-mono">N</div>
              <div className="absolute bottom-2 text-[10px] text-emerald-400 font-bold font-mono">S</div>
              <div className="absolute left-2 text-[10px] text-emerald-400 font-bold font-mono">W</div>
              <div className="absolute right-2 text-[10px] text-emerald-400 font-bold font-mono">E</div>

              {/* Spinning Neon Needle */}
              <div
                className="w-2 h-28 bg-gradient-to-t from-emerald-500 via-rose-500 to-amber-300 rounded-full shadow-lg transition-transform duration-[2800ms] ease-out"
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: "center center",
                }}
              />
              <div className="absolute w-5 h-5 bg-white border-2 border-black rounded-full" />
            </div>

            <button
              type="button"
              onClick={handleSpinNeedle}
              disabled={isSpinning}
              className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-xl cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSpinning ? "SPINNING COMPASS NEEDLE..." : "[ 🎯 SPIN THE COMPASS NEEDLE ]"}
            </button>
          </div>

          {/* Selected Player & Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Truth Box */}
            <div className="bg-black border-2 border-cyan-400 p-4 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase">
                <span>🔐 VOICE TRUTH FOR {selectedVictim}:</span>
                <span>VAULT</span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                "{currentTruth}"
              </p>
            </div>

            {/* Dare Box */}
            <div className="bg-black border-2 border-rose-500 p-4 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase">
                <span>⚡ LIVE AUDIO DARE:</span>
                <span>ON MIC</span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                "{currentDare}"
              </p>
            </div>
          </div>

          {/* Forfeit Penalty Controls */}
          <div className="bg-neutral-900 border border-orange-900/80 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase">
                <span>🐔 FORFEIT PENALTY</span>
                <span className="px-2 py-0.5 bg-orange-950 border border-orange-700 text-orange-300 text-[9px] rounded font-black">
                  [ 🐔 CHICKEN_NODE ]
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Refusing to answer truth or dare adds 50 VOLTS to the community room pot.
              </p>
            </div>

            <button
              type="button"
              onClick={handleForfeit}
              className="py-2 px-4 bg-orange-600 hover:bg-orange-500 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer active:scale-95 shadow"
            >
              FORFEIT (PAY 50 VOLTS) ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
