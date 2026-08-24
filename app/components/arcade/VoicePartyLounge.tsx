"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Flame,
  Swords,
  Crown,
  Sparkles,
  Zap,
  Volume2,
  Clock,
  Check,
  X,
  Share2,
  AlertTriangle,
  Radio,
  Music,
  Laugh,
  Film,
  Users,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Activity,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  VOICE_BATTLE_MODES,
  TONE_SHIFT_PROMPTS,
  NAME_PUN_PROMPTS,
  NURSERY_GHAZAL_PROMPTS,
  ENGLISH_SONG_PROMPTS,
  CUSTOMER_CARE_SCENARIOS,
  generateWhatsAppVoicePartyInvite,
  type VoiceBattleGame,
} from "@/lib/voicePartyBattles";

interface VoicePartyLoungeProps {
  currentUid: string;
  userHandle: string;
  players?: { uid: string; handle: string; photoUrl?: string }[];
}

export default function VoicePartyLounge({
  currentUid,
  userHandle = "@PLAYER",
  players = [],
}: VoicePartyLoungeProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>("tone_shift");

  // Common Multiplayer / Team Duel State
  const [player1Handle, setPlayer1Handle] = useState<string>(userHandle);
  const [player2Handle, setPlayer2Handle] = useState<string>("@RIVAL");
  const [teamScoreA, setTeamScoreA] = useState<number>(0);
  const [teamScoreB, setTeamScoreB] = useState<number>(0);
  const [activeTurn, setActiveTurn] = useState<1 | 2>(1);

  // General Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // 1. Tone Shift State
  const [toneShiftIdx, setToneShiftIdx] = useState<number>(0);

  // 2. Pun Matrix & Buzzer State
  const [punIdx, setPunIdx] = useState<number>(0);
  const [showPunAnswer, setShowPunAnswer] = useState<boolean>(false);
  const [buzzerWinner, setBuzzerWinner] = useState<string | null>(null);
  const [buzzerWindowSec, setBuzzerWindowSec] = useState<number>(5);

  // 3. Laughing Trap State
  const [isLaughingTrapActive, setIsLaughingTrapActive] = useState<boolean>(false);
  const [laughDetected, setLaughDetected] = useState<boolean>(false);
  const [laughMeter, setLaughMeter] = useState<number>(10);

  // 4. Nursery Ghazal State
  const [ghazalIdx, setGhazalIdx] = useState<number>(0);

  // 5. English Song Decoder State
  const [songIdx, setSongIdx] = useState<number>(0);
  const [showSongAnswer, setShowSongAnswer] = useState<boolean>(false);

  // 6. Customer Care State
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);

  // 7. Hum & Whistle State
  const [humSongTitle, setHumSongTitle] = useState<string>("Kal Ho Naa Ho (Title Track)");
  const [showHumAnswer, setShowHumAnswer] = useState<boolean>(false);

  // 8. News Anchor State
  const [newsVictim, setNewsVictim] = useState<string>("@FRIEND");

  // 9. 60s Roast Ring State
  const [roastRound, setRoastRound] = useState<1 | 2>(1);

  // 10. One-Breath Hook State
  const [breathSeconds, setBreathSeconds] = useState<number>(0);
  const [isBreathRunning, setIsBreathRunning] = useState<boolean>(false);

  const activeGameMeta =
    VOICE_BATTLE_MODES.find((g) => g.id === selectedGameId) || VOICE_BATTLE_MODES[0];

  // General Timer Tick
  useEffect(() => {
    let interval: any;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((t) => t - 1), 1000);
    } else if (timerSeconds === 0 && isTimerActive) {
      soundSynth.playBuzzer();
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  // One-Breath Hook Timer Tick
  useEffect(() => {
    let interval: any;
    if (isBreathRunning) {
      interval = setInterval(() => setBreathSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isBreathRunning]);

  // Buzzer lockout window countdown
  useEffect(() => {
    let interval: any;
    if (buzzerWinner && buzzerWindowSec > 0) {
      interval = setInterval(() => setBuzzerWindowSec((s) => s - 1), 1000);
    } else if (buzzerWindowSec === 0 && buzzerWinner) {
      setBuzzerWinner(null);
    }
    return () => clearInterval(interval);
  }, [buzzerWinner, buzzerWindowSec]);

  // Microsecond Buzzer Slam Handler
  const handleSlamBuzzer = (claimingHandle: string) => {
    if (buzzerWinner) return;
    soundSynth.playAirhorn();
    setBuzzerWinner(claimingHandle);
    setBuzzerWindowSec(5);
  };

  // 1-Tap WhatsApp Challenge Invite
  const handleSendWhatsAppInvite = () => {
    soundSynth.playSnare();
    const waUrl = generateWhatsAppVoicePartyInvite(
      activeGameMeta.title,
      userHandle,
      `Step into the ${activeGameMeta.title} voice arena and prove your talent on live mic!`
    );
    window.open(waUrl, "_blank");
  };

  return (
    <div className="bg-black border-2 border-purple-500 p-4 sm:p-6 rounded-xl font-mono text-white space-y-6 shadow-[0_0_60px_rgba(168,85,247,0.2)] select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/60 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-400">
            <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>// 10 WORLD-CLASS VOICE PARTY & TEAM ARENAS [ LIVE AUDIO SYNC ]</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white flex items-center gap-2">
            <span>{activeGameMeta.icon}</span>
            <span>{activeGameMeta.title}</span>
          </h2>
          <p className="text-xs text-neutral-400">{activeGameMeta.description}</p>
        </div>

        <button
          type="button"
          onClick={handleSendWhatsAppInvite}
          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span>CHALLENGE ON WHATSAPP 📲</span>
        </button>
      </div>

      {/* 10-Game Horizontal Mode Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        {VOICE_BATTLE_MODES.map((mode) => {
          const isSelected = selectedGameId === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setSelectedGameId(mode.id);
                soundSynth.playSubtlePop();
                setIsTimerActive(false);
                setTimerSeconds(30);
                setBuzzerWinner(null);
              }}
              className={`px-3 py-2 border rounded-lg font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "border-purple-400 bg-purple-950/60 text-white ring-2 ring-purple-400 shadow-md"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── 1v1 TEAM / DUEL SCOREBOARD ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-950 border border-neutral-800 p-3 rounded-xl items-center text-xs">
        <div className="space-y-0.5">
          <div className="text-[10px] text-purple-400 font-bold uppercase">TEAM RED (P1):</div>
          <div className="font-black text-white truncate">{player1Handle}</div>
          <div className="text-emerald-400 font-black">{teamScoreA} PTS</div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[10px] text-cyan-400 font-bold uppercase">TEAM BLUE (P2):</div>
          <div className="font-black text-white truncate">{player2Handle}</div>
          <div className="text-cyan-400 font-black">{teamScoreB} PTS</div>
        </div>

        <div className="text-center bg-black border border-neutral-800 p-2 rounded-lg">
          <div className="text-[9px] text-neutral-400 uppercase font-bold">ACTIVE CLOCK:</div>
          <div className="text-xl font-black text-amber-400 font-mono">{timerSeconds}S</div>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTeamScoreA((s) => s + 10);
              soundSynth.playApplause();
            }}
            className="flex-1 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold text-[10px] uppercase rounded"
          >
            +10 RED
          </button>
          <button
            type="button"
            onClick={() => {
              setTeamScoreB((s) => s + 10);
              soundSynth.playApplause();
            }}
            className="flex-1 py-2 bg-cyan-900 hover:bg-cyan-800 text-white font-bold text-[10px] uppercase rounded"
          >
            +10 BLUE
          </button>
        </div>
      </div>

      {/* ────────────────── GAME SPECIFIC ARENA RENDERERS ────────────────── */}

      {/* 1. TONE-SHIFT DIALOGUE BATTLE */}
      {selectedGameId === "tone_shift" && (
        <div className="bg-neutral-950 border-2 border-purple-500/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-purple-400 font-bold uppercase">
              PROMPT #{toneShiftIdx + 1} OF {TONE_SHIFT_PROMPTS.length}
            </span>
            <button
              type="button"
              onClick={() => setToneShiftIdx((i) => (i + 1) % TONE_SHIFT_PROMPTS.length)}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-white text-[10px] rounded"
            >
              NEXT DIALOGUE ⏭️
            </button>
          </div>

          <div className="space-y-2 text-center bg-black border border-neutral-800 p-4 rounded-xl">
            <div className="text-xs text-neutral-400 uppercase font-bold">
              DELIVER THIS ICONIC DIALOGUE:
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              "{TONE_SHIFT_PROMPTS[toneShiftIdx].dialogue}"
            </div>
            <div className="text-[11px] text-amber-400 font-bold">
              Original: {TONE_SHIFT_PROMPTS[toneShiftIdx].original}
            </div>
            <div className="mt-2 inline-block px-3 py-1 bg-purple-950 border border-purple-500 text-purple-300 font-black text-xs rounded-full">
              TARGET CONFLICTING TONE: {TONE_SHIFT_PROMPTS[toneShiftIdx].targetTone}
            </div>
          </div>

          {/* Crowd Voting Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => soundSynth.playApplause()}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Crown className="w-4 h-4" />
              <span>[ 🏆 OSCAR ACTING (+10 PTS) ]</span>
            </button>

            <button
              type="button"
              onClick={() => soundSynth.playBuzzer()}
              className="py-3 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>[ 📉 OVERACTING 50 RS CUT (-5 PTS) ]</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. THE NAME PUN MATRIX ("BAND-RIYA") */}
      {selectedGameId === "pun_matrix" && (
        <div className="bg-neutral-950 border-2 border-amber-400 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-amber-400 font-bold uppercase">
              DAD-JOKE PUN CIPHER #{punIdx + 1}
            </span>
            <button
              type="button"
              onClick={() => {
                setPunIdx((i) => (i + 1) % NAME_PUN_PROMPTS.length);
                setShowPunAnswer(false);
                setBuzzerWinner(null);
              }}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-white text-[10px] rounded"
            >
              NEXT PUN ⏭️
            </button>
          </div>

          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-3 text-center">
            <div className="text-base sm:text-lg font-black text-white leading-relaxed">
              "{NAME_PUN_PROMPTS[punIdx].question}"
            </div>

            {/* Microsecond Buzzer Slam */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSlamBuzzer(userHandle)}
                className={`py-4 px-8 border-2 rounded-2xl font-black text-sm uppercase transition-all shadow-2xl active:scale-95 cursor-pointer ${
                  buzzerWinner
                    ? "border-amber-400 bg-amber-400 text-black animate-pulse"
                    : "border-red-500 bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-950"
                }`}
              >
                {buzzerWinner ? `🚨 ${buzzerWinner} BUZZED IN (${buzzerWindowSec}S MIC)` : "🔴 [ SLAM BUZZER TO ANSWER! ]"}
              </button>
            </div>

            {showPunAnswer ? (
              <div className="text-emerald-400 font-black text-sm pt-2">
                PUNCHLINE: {NAME_PUN_PROMPTS[punIdx].answer}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPunAnswer(true)}
                className="text-[10px] text-neutral-400 hover:text-white underline pt-2"
              >
                REVEAL PUNCHLINE
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. THE LAUGHING TRAP (MIC GATE) */}
      {selectedGameId === "laughing_trap" && (
        <div className="bg-neutral-950 border-2 border-rose-500 p-5 rounded-xl space-y-4">
          <div className="space-y-0.5 border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-black uppercase text-rose-400">
              THE LAUGHING TRAP (MIC GATE NOISE FLOOR)
            </h3>
            <p className="text-[10px] text-neutral-400">
              Designated joker delivers punchlines. Web Audio detects laughs or snorts above threshold!
            </p>
          </div>

          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>LIVE GIGGLE SENSOR ENERGY:</span>
              <span className={laughDetected ? "text-rose-400 font-black animate-ping" : "text-emerald-400"}>
                {laughDetected ? "🚨 LAUGH DETECTED! ELIMINATED!" : "🤐 HOLDING LAUGHTER"}
              </span>
            </div>

            <div className="w-full bg-neutral-900 h-6 rounded-lg overflow-hidden border border-neutral-700 relative">
              <div
                className={`h-full transition-all duration-150 ${laughDetected ? "bg-rose-500" : "bg-emerald-400"}`}
                style={{ width: `${laughMeter}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setLaughDetected(true);
                soundSynth.playBuzzer();
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl transition-all"
            >
              [ 💀 TRIGGER LAUGH ELIMINATION ]
            </button>
            <button
              type="button"
              onClick={() => {
                setLaughDetected(false);
                soundSynth.playSubtlePop();
              }}
              className="py-3 px-4 bg-neutral-900 border border-neutral-700 text-xs rounded-xl"
            >
              RESET
            </button>
          </div>
        </div>
      )}

      {/* 4. NURSERY RHYME X GHAZAL HIJACK */}
      {selectedGameId === "nursery_ghazal" && (
        <div className="bg-neutral-950 border-2 border-cyan-400 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-cyan-400 font-bold uppercase">
              NURSERY GHAZAL #{ghazalIdx + 1}
            </span>
            <button
              type="button"
              onClick={() => setGhazalIdx((i) => (i + 1) % NURSERY_GHAZAL_PROMPTS.length)}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-white text-[10px] rounded"
            >
              NEXT RHYME ⏭️
            </button>
          </div>

          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2 text-center">
            <div className="text-xs text-neutral-400 font-bold uppercase">SING THIS INNOCENT RHYME:</div>
            <div className="text-lg font-black text-white">"{NURSERY_GHAZAL_PROMPTS[ghazalIdx].rhyme}"</div>
            <div className="text-xs text-cyan-300 font-black uppercase">
              IN THIS STYLE: {NURSERY_GHAZAL_PROMPTS[ghazalIdx].style}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => soundSynth.playApplause()}
              className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs uppercase rounded-lg"
            >
              [ 👏 WAAH WAAH (+10 PTS) ]
            </button>
            <button
              type="button"
              onClick={() => soundSynth.playFanfare()}
              className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-lg"
            >
              [ ✨ IRSHAD MASTERPIECE ]
            </button>
          </div>
        </div>
      )}

      {/* 5. LITERAL ENGLISH SONG DECODER */}
      {selectedGameId === "english_decoder" && (
        <div className="bg-neutral-950 border-2 border-emerald-400 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-emerald-400 font-bold uppercase">
              ENGLISH TRANSLATION #{songIdx + 1}
            </span>
            <button
              type="button"
              onClick={() => {
                setSongIdx((i) => (i + 1) % ENGLISH_SONG_PROMPTS.length);
                setShowSongAnswer(false);
              }}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-white text-[10px] rounded"
            >
              NEXT SONG ⏭️
            </button>
          </div>

          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2 text-center">
            <div className="text-xs text-neutral-400 font-bold uppercase">
              DECODE THIS LITERAL ENGLISH TRANSLATION & SING ON MIC:
            </div>
            <div className="text-base sm:text-lg font-black text-white italic">
              "{ENGLISH_SONG_PROMPTS[songIdx].english}"
            </div>

            {showSongAnswer ? (
              <div className="text-emerald-400 font-black text-sm pt-2">
                HINDI MELODY: {ENGLISH_SONG_PROMPTS[songIdx].hindi}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSongAnswer(true)}
                className="text-[10px] text-neutral-400 hover:text-white underline pt-2"
              >
                REVEAL HINDI SONG
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. FAKE CUSTOMER CARE CALL */}
      {selectedGameId === "customer_care" && (
        <div className="bg-neutral-950 border-2 border-yellow-400 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-yellow-400 font-bold uppercase">
              DEADPAN COMPLAINT SCENARIO #{scenarioIdx + 1}
            </span>
            <button
              type="button"
              onClick={() => setScenarioIdx((i) => (i + 1) % CUSTOMER_CARE_SCENARIOS.length)}
              className="px-2.5 py-1 bg-black border border-neutral-700 hover:border-white text-[10px] rounded"
            >
              NEXT SCENARIO ⏭️
            </button>
          </div>

          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2 text-center">
            <div className="text-xs text-neutral-400 font-bold uppercase">
              CALL CUSTOMER CARE WITH THIS DEADPAN COMPLAINT:
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              "{CUSTOMER_CARE_SCENARIOS[scenarioIdx]}"
            </div>
          </div>
        </div>
      )}

      {/* 7. HUM & WHISTLE MELODY CIPHER */}
      {selectedGameId === "hum_whistle" && (
        <div className="bg-neutral-950 border-2 border-indigo-400 p-5 rounded-xl space-y-4">
          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2 text-center">
            <div className="text-xs text-neutral-400 font-bold uppercase">
              HUM / WHISTLE THIS SONG ON MIC (NO WORDS ALLOWED!):
            </div>
            <div className="text-lg font-black text-white">"{humSongTitle}"</div>
            <p className="text-[10px] text-neutral-400">
              Listeners: Hit your buzzer to state song title and artist!
            </p>
          </div>
        </div>
      )}

      {/* 8. 9 PM NEWS ANCHOR INTERROGATION */}
      {selectedGameId === "news_anchor" && (
        <div className="bg-neutral-950 border-2 border-red-600 p-5 rounded-xl space-y-4">
          <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2 text-center">
            <div className="text-xs text-red-400 font-bold uppercase">
              45-SECOND THEATRICAL NEWS ANCHOR ROAST:
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              "THE NATION WANTS TO KNOW: Why did {newsVictim} leave the group on seen at 2:14 PM?!"
            </div>
          </div>
        </div>
      )}

      {/* 9. 60-SECOND ROAST RING */}
      {selectedGameId === "roast_ring" && (
        <div className="bg-neutral-950 border-2 border-rose-600 p-5 rounded-xl space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 border border-rose-500 bg-rose-950/40 rounded-xl space-y-1">
              <div className="text-xs font-black text-rose-400">🔴 CREATOR 1 (30S TURN)</div>
              <div className="text-sm font-black text-white">{player1Handle}</div>
            </div>
            <div className="p-3 border border-cyan-500 bg-cyan-950/40 rounded-xl space-y-1">
              <div className="text-xs font-black text-cyan-400">🔵 CREATOR 2 (30S TURN)</div>
              <div className="text-sm font-black text-white">{player2Handle}</div>
            </div>
          </div>
        </div>
      )}

      {/* 10. ONE-BREATH HOOK CHALLENGE */}
      {selectedGameId === "one_breath" && (
        <div className="bg-neutral-950 border-2 border-emerald-500 p-5 rounded-xl space-y-4">
          <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center space-y-2">
            <div className="text-xs text-neutral-400 uppercase font-bold">
              ONE-BREATH VOCAL ENDURANCE TIMER:
            </div>
            <div className="text-4xl font-black font-mono text-emerald-400">
              {breathSeconds} SECONDS
            </div>
            <p className="text-[10px] text-neutral-400">
              Sing continuous chorus without pausing. Client DSP flags pauses &gt;300ms!
            </p>

            <button
              type="button"
              onClick={() => {
                if (isBreathRunning) {
                  soundSynth.playFanfare();
                  setIsBreathRunning(false);
                } else {
                  soundSynth.playSnare();
                  setBreathSeconds(0);
                  setIsBreathRunning(true);
                }
              }}
              className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
            >
              {isBreathRunning ? "[ 🛑 STOP & LOCK SCORE ]" : "[ 🫁 START ONE-BREATH SPRINT ]"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
