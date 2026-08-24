"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { buzzMelodyTrack, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Trophy, Share2, Sparkles, Music, BellRing, HelpCircle } from "lucide-react";

interface MelodyBuzzerGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function MelodyBuzzerGame({ match, currentUid }: MelodyBuzzerGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const ms = match.melodyBuzzerState;
  if (!ms) return <div className="text-white font-mono p-4">Loading Melody Buzzer...</div>;

  const isHummer = ms.hummerUid === currentUid;
  const isBuzzed = ms.buzzedPlayerUid !== null;
  const isMeBuzzed = ms.buzzedPlayerUid === currentUid;

  const handleBuzzIn = async () => {
    if (isHummer || isBuzzed || match.status === "FINISHED") return;
    soundSynth.playAirhorn();

    try {
      await buzzMelodyTrack(match.id, currentUid);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Music className="w-4 h-4 text-emerald-400" />
          // MELODY HUMMER [ SPEED BUZZER ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2 py-0.5 border border-white bg-black hover:bg-white hover:text-black font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            {isHummer ? "● YOU ARE HUMMING" : "LISTEN & BUZZ IN"}
          </span>
        </div>
      </div>

      {/* Secret Track Header */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-3 rounded-2xl shadow-2xl">
        {isHummer ? (
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              YOUR SECRET MELODY TO HUM / WHISTLE INTO MIC
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              🎵 "{ms.currentTrackTitle}"
            </h2>
            <p className="text-xs text-neutral-400">
              Hum the melody rhythmically! Do NOT speak any lyrics.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              LISTEN TO THE HUMMER OVER LIVE VOICE
            </span>
            <p className="text-xs text-neutral-300">
              Recognize the song? Hit the buzzer instantly to take the mic!
            </p>
          </div>
        )}
      </div>

      {/* Giant Speed Buzzer Button */}
      {!isHummer && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            disabled={isBuzzed || match.status === "FINISHED"}
            onClick={handleBuzzIn}
            className={`w-44 h-44 rounded-full border-8 font-black text-lg uppercase flex flex-col items-center justify-center gap-2 transition-all shadow-2xl active:scale-90 cursor-pointer ${
              isMeBuzzed
                ? "bg-emerald-500 border-emerald-300 text-black animate-pulse"
                : isBuzzed
                ? "bg-neutral-900 border-neutral-700 text-neutral-600 cursor-not-allowed"
                : "bg-red-600 border-red-400 text-white hover:bg-red-500 hover:scale-105"
            }`}
          >
            <BellRing className="w-8 h-8" />
            <span>{isMeBuzzed ? "YOU BUZZED!" : isBuzzed ? "BUZZED" : "BUZZ IN!"}</span>
          </button>
        </div>
      )}

      {/* Action Telemetry */}
      {ms.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ms.lastActionLog}</span>
        </div>
      )}

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="melody_buzzer"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
