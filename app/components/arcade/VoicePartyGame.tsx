"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Mic,
  Trophy,
  Sparkles,
  HelpCircle,
  Users,
  Clock,
  Send,
  RotateCcw,
  Volume2,
  Share2,
  Gavel,
  Radio,
  Flame,
  Laugh,
  Music,
  Scale,
  Newspaper,
  BookOpen,
} from "lucide-react";

interface VoicePartyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

// 1. Courtroom Debate Cases
const COURTROOM_CASES = [
  { caseNo: "CASE #801", crime: "Ate the last slice of pizza at 3 AM without asking anyone", penalty: "Must pay for next 2 food orders" },
  { caseNo: "CASE #802", crime: "Left best friend on 'Seen' on WhatsApp for 48 continuous hours", penalty: "Must write a 50-word apology poem on mic" },
  { caseNo: "CASE #803", crime: "Sang completely out of tune during group gaming session", penalty: "Must sing a nursery rhyme like an opera singer" },
  { caseNo: "CASE #804", crime: "Claimed to be '5 minutes away' while actually still in bed", penalty: "Must admit 3 embarrassing secrets on live audio" },
  { caseNo: "CASE #805", crime: "Used phone hotspot and drained 5GB of data in 10 minutes", penalty: "Hotspot ban for 1 full week" },
];

// 2. 9 PM News Anchor Headlines
const NEWS_HEADLINES = [
  { topic: "THE NATION WANTS TO KNOW: Why did you take 3 hours to reply to a single 'Hi'?!", hashtag: "#ReplyScam" },
  { topic: "BREAKING DEBATE: Is waking up at 1 PM on Sunday a constitutional fundamental right?!", hashtag: "#SleepMafia" },
  { topic: "PRIME TIME CLASH: Who actually controls the TV remote and AC temperature in the house?!", hashtag: "#RemoteWar" },
  { topic: "SPECIAL INVESTIGATION: Secret chai addiction exposed — 7 cups a day?!", hashtag: "#ChaiGate" },
];

// 3. Singer Roleplay Styles & Challenges
const SINGER_CHALLENGES = [
  { singer: "Arijit Singh (Heartbroken Melody)", task: "Sing 'Twinkle Twinkle Little Star' like you just had the worst heartbreak of your life" },
  { singer: "Yo Yo Honey Singh (Speed Desi Rap)", task: "Rap 'Machli Jal Ki Rani Hai' with heavy autotune and hip-hop swagger" },
  { singer: "Jagjit Singh (Soulful Ghazal Vibrato)", task: "Sing 'Lungi Dance' as a slow, deep melancholy Urdu Ghazal with harmonium" },
  { singer: "Anu Malik (Explosive High-Energy)", task: "Sing 'Chanda Mama Door Ke' with loud screaming aggression and rhyming punches" },
  { singer: "Alka Yagnik (90s Pure Romance)", task: "Sing 'Apna Time Aayega' like a sweet 1994 Bollywood romantic melody" },
];

// 4. Desi Mushaira Themes & Couplets
const MUSHAIRA_THEMES = [
  { theme: "Ishq & Chai (Love & Tea)", starter: "Chai ki pyali mein ghul gaya tera noor...", meter: "Wah Wah / Irshaad" },
  { theme: "Hostel Life & Broke Nights", starter: "Pocket mein bacha tha sirf das rupaiye ka note...", meter: "Dad-o-Tehseen" },
  { theme: "Exams & Syllabus Pain", starter: "Kitaab kholi toh neend ne dastak di...", meter: "Aah-o-Fughan" },
  { theme: "Yaari & Dosti (True Friendship)", starter: "Dost woh jo bina puche bill chukaye...", meter: "Subahanallah" },
];

// 5. Tone Shift Dialogues
const TONE_SHIFT_CHALLENGES = [
  { dialogue: "Mogambo khush hua!", style: "Sobbing and crying uncontrollably 😭" },
  { dialogue: "Pushpa, Pushparaj... jhukega nahi sala!", style: "Polite 5-star hotel receptionist 👔" },
  { dialogue: "Rishtey mein toh hum tumhare baap lagte hain!", style: "ASMR whisper / soothing yoga instructor 🧘" },
  { dialogue: "Kitne aadmi the?! Sambha... bata kitne the!", style: "Loving grandmother offering warm ladoos 👵" },
];

export default function VoicePartyGame({ match, currentUid }: VoicePartyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Mode Specific Indexes
  const [caseIdx, setCaseIdx] = useState(0);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [singerIdx, setSingerIdx] = useState(0);
  const [mushairaIdx, setMushairaIdx] = useState(0);
  const [toneIdx, setToneIdx] = useState(0);

  // Jury Score Tally
  const [verdictScore, setVerdictScore] = useState({ up: 0, down: 0 });

  const gameType = match.gameType;
  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 6;
  const isHost = match.hostUid === currentUid;

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            soundSynth.playBuzzer();
            return 0;
          }
          if (prev <= 6) {
            soundSynth.playSubtlePop();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleStartTimer = (seconds = 45) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    soundSynth.playSnare();
  };

  const handleNextPrompt = () => {
    soundSynth.playSubtlePop();
    setVerdictScore({ up: 0, down: 0 });
    if (gameType === "courtroom_debate") setCaseIdx((prev) => (prev + 1) % COURTROOM_CASES.length);
    else if (gameType === "news_anchor") setHeadlineIdx((prev) => (prev + 1) % NEWS_HEADLINES.length);
    else if (gameType === "singer_roleplay") setSingerIdx((prev) => (prev + 1) % SINGER_CHALLENGES.length);
    else if (gameType === "mushaira") setMushairaIdx((prev) => (prev + 1) % MUSHAIRA_THEMES.length);
    else if (gameType === "tone_shift") setToneIdx((prev) => (prev + 1) % TONE_SHIFT_CHALLENGES.length);
    setTimerSeconds(45);
    setIsTimerRunning(false);
  };

  const getGameHeaderMeta = () => {
    switch (gameType) {
      case "courtroom_debate":
        return { title: "VOICE COURTROOM DEBATE", icon: <Scale className="w-5 h-5 text-amber-400" />, badge: "ORDER IN THE COURT" };
      case "news_anchor":
        return { title: "9 PM NEWS ANCHOR SHOWDOWN", icon: <Newspaper className="w-5 h-5 text-red-500" />, badge: "PRIME TIME DEBATE" };
      case "singer_roleplay":
        return { title: "SINGER ROLEPLAY BATTLE", icon: <Music className="w-5 h-5 text-purple-400" />, badge: "VOCAL IMPRESSIONS" };
      case "mushaira":
        return { title: "DESI MUSHAIRA & SHAYARI SLAM", icon: <BookOpen className="w-5 h-5 text-emerald-400" />, badge: "URDU POETRY ARENA" };
      case "tone_shift":
        return { title: "TONE-SHIFT DIALOGUE CLASH", icon: <Sparkles className="w-5 h-5 text-yellow-400" />, badge: "IMPROV ACTING" };
      case "laughing_trap":
        return { title: "THE LAUGHING TRAP (MIC GATE)", icon: <Laugh className="w-5 h-5 text-green-400" />, badge: "DON'T LAUGH" };
      default:
        return { title: "VOICE PARTY ARENA", icon: <Mic className="w-5 h-5 text-white" />, badge: "LIVE AUDIO LOUNGE" };
    }
  };

  const meta = getGameHeaderMeta();

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-neutral-700 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_60px_rgba(255,255,255,0.1)] rounded-2xl">
      {/* ── Top Control Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 text-white flex items-center justify-center font-black shadow-md">
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-white tracking-wider">
                {meta.title}
              </span>
              <span className="px-1.5 py-0.2 bg-white/10 text-neutral-300 border border-white/20 text-[9px] font-bold rounded">
                {meta.badge}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Host: <span className="text-white font-bold">{match.hostHandle}</span> • Live Microphone Open
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType={gameType} />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-2 border-white p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span className="font-black uppercase text-neutral-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO SPEAK ON LIVE MIC
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!currentUid) return;
              try {
                const { joinArcadeMatch } = await import("@/lib/arcade");
                await joinArcadeMatch(match.id, {
                  uid: currentUid,
                  handle: `@SPEAKER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Voice Party:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Main Interactive Voice Arena Screen ── */}
      <div className="relative border-4 border-neutral-800 bg-gradient-to-b from-neutral-950 via-black to-neutral-950 p-6 rounded-2xl text-center space-y-4 shadow-2xl overflow-hidden">
        {/* Timer & Round Status Bar */}
        <div className="flex items-center justify-between text-xs text-neutral-300 font-bold uppercase">
          <span className="flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-emerald-400 animate-bounce" />
            LIVE MIC STAGE
          </span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black border ${
              timerSeconds <= 7
                ? "border-red-500 bg-red-950 text-red-400 animate-pulse"
                : "border-neutral-700 bg-neutral-900 text-neutral-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}</span>
          </div>
        </div>

        {/* Dynamic Center Prompt Cards by Game Type */}
        {gameType === "courtroom_debate" && (
          <div className="space-y-3 py-2">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">
              ⚖️ {COURTROOM_CASES[caseIdx].caseNo} — THE CRIMINAL CHARGE:
            </span>
            <div className="p-4 bg-neutral-900/80 border-2 border-amber-500/50 rounded-2xl shadow-xl space-y-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                &quot;{COURTROOM_CASES[caseIdx].crime}&quot;
              </h2>
              <p className="text-xs text-amber-200 font-mono">
                Proposed Penalty: <span className="text-white font-bold">{COURTROOM_CASES[caseIdx].penalty}</span>
              </p>
            </div>
            <p className="text-[11px] text-neutral-400">
              Accuser presents argument for 45s ➔ Defendant cross-examines ➔ Judge &amp; Jury deliver verdict!
            </p>
          </div>
        )}

        {gameType === "news_anchor" && (
          <div className="space-y-3 py-2">
            <div className="inline-block px-3 py-1 bg-red-600 text-white font-black text-[10px] uppercase rounded-full animate-pulse shadow-[0_0_15px_#dc2626]">
              🚨 BREAKING NEWS CLASH
            </div>
            <div className="p-4 bg-neutral-900/80 border-2 border-red-600 rounded-2xl shadow-xl space-y-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                &quot;{NEWS_HEADLINES[headlineIdx].topic}&quot;
              </h2>
              <span className="text-xs font-black text-red-400">{NEWS_HEADLINES[headlineIdx].hashtag}</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Anchor screams questions into mic! Panelist has 30s to defend before getting muted!
            </p>
          </div>
        )}

        {gameType === "singer_roleplay" && (
          <div className="space-y-3 py-2">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block">
              🎤 SINGER IMPRESSION CHALLENGE:
            </span>
            <div className="p-4 bg-neutral-900/80 border-2 border-purple-500/50 rounded-2xl shadow-xl space-y-2">
              <span className="text-xs font-black text-purple-300 uppercase block">
                STYLE: {SINGER_CHALLENGES[singerIdx].singer}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                &quot;{SINGER_CHALLENGES[singerIdx].task}&quot;
              </h2>
            </div>
            <p className="text-[11px] text-neutral-400">
              Sing the track in this signature voice into the mic! Audience rates Oscar vs Overacting!
            </p>
          </div>
        )}

        {gameType === "mushaira" && (
          <div className="space-y-3 py-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
              📜 DESI SHAYARI &amp; POETRY SLAM:
            </span>
            <div className="p-4 bg-neutral-900/80 border-2 border-emerald-500/50 rounded-2xl shadow-xl space-y-2">
              <span className="text-xs font-black text-emerald-300 uppercase block">
                THEME: {MUSHAIRA_THEMES[mushairaIdx].theme}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide italic">
                &quot;{MUSHAIRA_THEMES[mushairaIdx].starter}&quot;
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold">Meter: {MUSHAIRA_THEMES[mushairaIdx].meter}</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Recite your couplets on mic! Room audience hits [ IRSHAAD! ] &amp; [ WAH WAH! ]
            </p>
          </div>
        )}

        {gameType === "tone_shift" && (
          <div className="space-y-3 py-2">
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest block">
              🎭 TONE-SHIFT IMPROV CHALLENGE:
            </span>
            <div className="p-4 bg-neutral-900/80 border-2 border-yellow-500/50 rounded-2xl shadow-xl space-y-2">
              <h2 className="text-lg font-black text-white uppercase tracking-wide">
                &quot;{TONE_SHIFT_CHALLENGES[toneIdx].dialogue}&quot;
              </h2>
              <p className="text-xs text-yellow-300 font-bold uppercase">
                Perform In Tone: <span className="text-white">{TONE_SHIFT_CHALLENGES[toneIdx].style}</span>
              </p>
            </div>
            <p className="text-[11px] text-neutral-400">
              Deliver this iconic dialogue under the contradictory emotion without breaking character!
            </p>
          </div>
        )}

        {/* Timer Control Bar */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {!isTimerRunning ? (
            <button
              type="button"
              onClick={() => handleStartTimer(gameType === "news_anchor" ? 30 : 45)}
              className="px-5 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 cursor-pointer shadow-md transition-all active:scale-95"
            >
              [ ▶️ START MIC TURN (45s) ]
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsTimerRunning(false);
                soundSynth.playBuzzer();
              }}
              className="px-5 py-2 border-2 border-red-500 bg-red-600 text-white font-black text-xs uppercase rounded-xl hover:bg-red-500 cursor-pointer shadow-md transition-all active:scale-95"
            >
              [ ⏹️ STOP MIC TURN ]
            </button>
          )}

          <button
            type="button"
            onClick={handleNextPrompt}
            className="px-4 py-2 border border-neutral-700 bg-neutral-900 hover:border-white text-neutral-200 font-bold text-xs uppercase rounded-xl cursor-pointer transition-all"
          >
            [ 🔄 NEXT TOPIC ]
          </button>
        </div>
      </div>

      {/* ── Interactive Soundboard & Jury Verdict Bar ── */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
          <span>ROOM SOUNDBOARD &amp; AUDIENCE JURY:</span>
          <span className="text-[10px] text-white font-mono font-bold">
            VOTES: 👍 {verdictScore.up} | 👎 {verdictScore.down}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {gameType === "courtroom_debate" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  soundSynth.playSnare();
                  soundSynth.playSnare();
                }}
                className="py-2.5 px-2 border border-amber-700 bg-amber-950/40 hover:bg-amber-900 text-amber-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Gavel className="w-4 h-4" />
                <span>🔨 ORDER!</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth.playFanfare();
                  setVerdictScore((prev) => ({ ...prev, up: prev.up + 1 }));
                }}
                className="py-2.5 px-2 border border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                🕊️ INNOCENT (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth.playBuzzer();
                  setVerdictScore((prev) => ({ ...prev, down: prev.down + 1 }));
                }}
                className="py-2.5 px-2 border border-red-700 bg-red-950/40 hover:bg-red-900 text-red-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                ⚖️ GUILTY! (+1)
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playApplause()}
                className="py-2.5 px-2 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                👏 APPLAUSE
              </button>
            </>
          ) : gameType === "mushaira" ? (
            <>
              <button
                type="button"
                onClick={() => soundSynth.playFanfare()}
                className="py-2.5 px-2 border border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                📜 IRSHAAD!
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playApplause()}
                className="py-2.5 px-2 border border-purple-700 bg-purple-950/40 hover:bg-purple-900 text-purple-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                👏 WAH WAH!
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playAirhorn()}
                className="py-2.5 px-2 border border-amber-700 bg-amber-950/40 hover:bg-amber-900 text-amber-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                🌸 MUKAMMAL!
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playBuzzer()}
                className="py-2.5 px-2 border border-red-700 bg-red-950/40 hover:bg-red-900 text-red-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                🤪 BE-BAHAR
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  soundSynth.playFanfare();
                  setVerdictScore((prev) => ({ ...prev, up: prev.up + 1 }));
                }}
                className="py-2.5 px-2 border border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center truncate"
              >
                🏆 OSCAR (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth.playBuzzer();
                  setVerdictScore((prev) => ({ ...prev, down: prev.down + 1 }));
                }}
                className="py-2.5 px-2 border border-red-700 bg-red-950/40 hover:bg-red-900 text-red-300 font-black text-xs uppercase rounded-xl transition-all cursor-pointer text-center truncate"
              >
                📉 CUT 50 RS (-1)
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playAirhorn()}
                className="py-2.5 px-2 border border-amber-700 bg-amber-950/40 hover:bg-amber-900 text-amber-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer text-center truncate"
              >
                📢 AIRHORN
              </button>
              <button
                type="button"
                onClick={() => soundSynth.playApplause()}
                className="py-2.5 px-2 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer text-center truncate"
              >
                👏 CHEER
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
