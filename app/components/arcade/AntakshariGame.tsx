"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  submitAntakshariSong,
  passAntakshariTurn,
  type ArcadeMatch,
} from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Mic,
  Music,
  Trophy,
  Sparkles,
  HelpCircle,
  Users,
  Clock,
  Send,
  RotateCcw,
  Volume2,
  ThumbsUp,
  Share2,
} from "lucide-react";

interface AntakshariGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

// Common Antakshari Hindi Letters
const HINDI_LETTERS = [
  { char: "म", roman: "M", hints: ["Mere Samne Wali Khidki", "Main Hoon Na", "Mera Joota Hai Japani", "Mehbooba Mehbooba"] },
  { char: "न", roman: "N", hints: ["Neele Neele Ambar Par", "Nadaan Parindey", "Na Tum Jano Na Hum", "Namo Namo"] },
  { char: "र", roman: "R", hints: ["Roop Tera Mastana", "Raabta", "Rang Barse", "Ruk Ja O Dil Deewane"] },
  { char: "स", roman: "S", hints: ["Suraj Hua Maddham", "Senorita", "Samjhawan", "Shayad"] },
  { char: "क", roman: "K", hints: ["Kabhi Khushi Kabhie Gham", "Kabira", "Kal Ho Naa Ho", "Kesariya"] },
  { char: "ल", roman: "L", hints: ["Lag Ja Gale", "Lungi Dance", "Laila Main Laila", "London Thumakda"] },
  { char: "ह", roman: "H", hints: ["Hawa Hawa", "Humma Humma", "Hasi Ban Gaye", "Hare Krishna Hare Ram"] },
  { char: "द", roman: "D", hints: ["Dil Diyan Gallan", "Deewana Hua Badal", "Dil Se Re", "Dum Maro Dum"] },
  { char: "प", roman: "P", hints: ["Pehla Nasha", "Pee Loon", "Paani Da Rang", "Pyaar Hua Iqraar Hua"] },
  { char: "य", roman: "Y", hints: ["Yeh Shaam Mastani", "Yeh Dosti Hum Nahi", "Yaad Piya Ki Aane Lagi", "Yun Hi Chala Chal"] },
  { char: "त", roman: "T", hints: ["Tum Hi Ho", "Tujhe Dekha Toh", "Tere Bina", "Tera Ban Jaunga"] },
  { char: "ब", roman: "B", hints: ["Badtameez Dil", "Bulleya", "Bekhayali", "Bole Chudiyan"] },
  { char: "ज", roman: "J", hints: ["Jai Ho", "Jab Se Tere Naina", "Jiya Jale", "Jeene Ke Hain Chaar Din"] },
  { char: "ग", roman: "G", hints: ["Galliyan", "Ghungroo", "Genda Phool", "Gulabi Aankhen"] },
  { char: "अ", roman: "A", hints: ["Apna Time Aayega", "Ae Dil Hai Mushkil", "Aankh Marey", "Aashiqui Mein Teri"] },
];

export default function AntakshariGame({ match, currentUid }: AntakshariGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [typedSong, setTypedSong] = useState("");
  const [selectedNextLetter, setSelectedNextLetter] = useState("न");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const as = match.antakshariState;
  const isMyTurn = as?.currentTurnUid === currentUid;
  const currentLetterData =
    HINDI_LETTERS.find((l) => l.char === as?.currentLetter) || HINDI_LETTERS[0];

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 4;

  // Turn Countdown Timer
  useEffect(() => {
    if (match.status !== "PLAYING") return;
    setTimerSeconds(30);

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        if (prev <= 6) {
          soundSynth.playSubtlePop();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [as?.currentTurnUid, as?.currentLetter, match.status]);

  const handleSubmitSong = async (songTitleToSubmit?: string) => {
    const finalTitle = songTitleToSubmit || typedSong;
    if (!finalTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    soundSynth.playFanfare();

    try {
      await submitAntakshariSong(match.id, currentUid, finalTitle.trim(), selectedNextLetter);
      setTypedSong("");
    } catch (e) {
      console.error("Failed to submit Antakshari song:", e);
      soundSynth.playBuzzer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePass = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    soundSynth.playBuzzer();

    try {
      await passAntakshariTurn(match.id, currentUid);
    } catch (e) {
      console.error("Failed to pass turn:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-pink-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(236,72,153,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-pink-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(236,72,153,0.5)] text-lg">
            🎶
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-pink-400 tracking-wider">
                BOLLYWOOD ANTAKSHARI
              </span>
              <span className="px-1.5 py-0.2 bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[9px] font-bold rounded">
                LIVE MIC DUEL
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Singer:{" "}
              <span className="text-white font-bold">
                {match.players[as?.currentTurnUid || ""]?.handle || "Player"}
              </span>{" "}
              • {isMyTurn ? "YOUR MIC SPOTLIGHT 🎙️" : "LISTEN & ENJOY"}
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
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE FRIENDS 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="antakshari" />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-pink-950 via-purple-950 to-pink-950 border-2 border-pink-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(236,72,153,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-pink-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-pink-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} SINGERS) • TAKE A SEAT TO SING ON MIC
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
                  handle: `@SINGER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Antakshari:", e);
              }
            }}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── 3D Glowing Active Letter Showcase ── */}
      <div className="relative border-4 border-pink-500/40 bg-gradient-to-b from-pink-950/60 via-black to-purple-950/60 p-6 rounded-2xl text-center space-y-4 shadow-[0_0_40px_rgba(236,72,153,0.2)] overflow-hidden">
        {/* Ambient Stage Lights */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-pink-500/30 blur-3xl pointer-events-none rounded-full" />

        <div className="flex items-center justify-between text-xs text-pink-300 font-bold uppercase">
          <span className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-pink-400" />
            ROUND {as?.round || 1}
          </span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black border ${
              timerSeconds <= 7
                ? "border-red-500 bg-red-950/80 text-red-400 animate-pulse"
                : "border-pink-500/40 bg-pink-950/50 text-pink-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}</span>
          </div>
        </div>

        {/* Big Letter Glyph */}
        <div className="space-y-1 py-2">
          <span className="text-[11px] text-pink-400 font-bold uppercase tracking-widest block">
            SING A SONG STARTING WITH LETTER:
          </span>
          <div className="inline-flex items-baseline gap-3 px-6 py-2 bg-black/60 border-2 border-pink-500 rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.4)]">
            <span className="text-6xl font-black text-white font-serif drop-shadow-[0_0_20px_#ec4899]">
              {as?.currentLetter || "म"}
            </span>
            <span className="text-2xl font-black text-pink-400">
              [{currentLetterData.roman}]
            </span>
          </div>
        </div>

        {/* Singer Mic Spotlight Aura */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-full">
            <Mic className={`w-4 h-4 ${isMyTurn ? "text-emerald-400 animate-bounce" : "text-pink-400"}`} />
            <span className="font-bold">
              {isMyTurn ? "🎙️ YOUR MIC IS LIVE — SING INTO MIC!" : `🎙️ ${match.players[as?.currentTurnUid || ""]?.handle || "Player"} is singing`}
            </span>
          </div>
        </div>

        {/* Quick Song Suggestions / Hints for current letter */}
        <div className="pt-2 border-t border-neutral-800">
          <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-2">
            💡 QUICK SONG INSPIRATIONS FOR [{as?.currentLetter}]:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {currentLetterData.hints.map((hint, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isMyTurn) setTypedSong(hint);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  isMyTurn
                    ? "border-pink-500/50 bg-pink-950/40 text-pink-200 hover:border-pink-400 hover:bg-pink-900 cursor-pointer"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 cursor-default"
                }`}
              >
                🎵 {hint}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Singer Submission Controls ── */}
      {isMyTurn && (
        <div className="space-y-3 bg-neutral-950 border-2 border-pink-500/50 p-4 rounded-2xl shadow-xl">
          <span className="text-xs font-black text-pink-300 uppercase tracking-wider block">
            ✅ SUBMIT SUNG SONG & PASS NEXT LETTER:
          </span>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typedSong}
              onChange={(e) => setTypedSong(e.target.value)}
              placeholder={`Song starting with "${as?.currentLetter}"...`}
              className="flex-1 bg-black border border-neutral-700 focus:border-pink-400 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-neutral-500 uppercase outline-none"
            />
            <button
              type="button"
              disabled={!typedSong.trim() || isSubmitting}
              onClick={() => handleSubmitSong()}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs uppercase rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SUBMIT (+10)</span>
            </button>
          </div>

          {/* Ending Letter Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">
              PICK NEXT OPPONENT LETTER (YOUR SONG ENDED WITH):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {HINDI_LETTERS.map((item) => (
                <button
                  key={item.char}
                  type="button"
                  onClick={() => setSelectedNextLetter(item.char)}
                  className={`px-3 py-1.5 rounded-lg font-black border transition-all cursor-pointer ${
                    selectedNextLetter === item.char
                      ? "border-pink-400 bg-pink-500 text-black shadow-md scale-105"
                      : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                  }`}
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handlePass}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase underline cursor-pointer"
            >
              [ ❌ DON'T KNOW SONG? PASS TURN ]
            </button>
          </div>
        </div>
      )}

      {/* ── Audience Live Jury Cheer Reactions ── */}
      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
          <span>LIVE AUDIENCE JURY:</span>
          <span className="text-[10px] text-pink-400 font-bold">TAP TO CHEER ON MIC</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              soundSynth.playApplause();
            }}
            className="py-2 px-1 border border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center truncate"
          >
            👏 SHABASH
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playFanfare();
            }}
            className="py-2 px-1 border border-pink-800 bg-pink-950/40 hover:bg-pink-900 text-pink-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center truncate"
          >
            🎶 WAH WAH
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playAirhorn();
            }}
            className="py-2 px-1 border border-amber-800 bg-amber-950/40 hover:bg-amber-900 text-amber-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center truncate"
          >
            📢 ENCORE!
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playBuzzer();
            }}
            className="py-2 px-1 border border-red-800 bg-red-950/40 hover:bg-red-900 text-red-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center truncate"
          >
            🤪 BESURA
          </button>
        </div>
      </div>

      {/* ── Antakshari Song Chain History ── */}
      <div className="space-y-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            SONG CHAIN FEED ({as?.songHistory?.length || 0})
          </span>
          <span className="text-[10px] text-neutral-500">CONNECTED HITS</span>
        </div>

        {(!as?.songHistory || as.songHistory.length === 0) ? (
          <p className="text-xs text-neutral-500 text-center py-4 italic">
            Song chain is waiting to start. Sing the first song on [{as?.currentLetter || "म"}]!
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {as.songHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-2 bg-black border border-neutral-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-pink-500 text-black font-black flex items-center justify-center text-xs">
                    {item.letter}
                  </span>
                  <div>
                    <span className="font-bold text-white uppercase block">{item.song}</span>
                    <span className="text-[10px] text-pink-400">By {item.singerHandle}</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">+10 PTS</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
