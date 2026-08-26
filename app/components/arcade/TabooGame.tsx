"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitTabooGuess, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Ban, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface TabooGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TabooGame({ match, currentUid, isHost }: TabooGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const ts = match.tabooState;
  if (!ts) return <div className="text-white font-mono p-4">Loading Forbidden Lexicon...</div>;

  const isSpeaker = ts.activeSpeakerUid === currentUid;

  const handleResolve = async (isCorrect: boolean) => {
    if (match.status === "FINISHED") return;
    if (isCorrect) soundSynth.playFanfare();
    else soundSynth.playBuzzer();

    try {
      await submitTabooGuess(match.id, currentUid, isCorrect);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Ban className="w-4 h-4 text-red-500" />
          // TABOO [ FORBIDDEN LEXICON ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            {isSpeaker ? "● YOU ARE DESCRIBING" : "LISTEN & GUESS"}
          </span>
        </div>
      </div>

      {/* Taboo Card */}
      <div className="border-4 border-red-950 bg-neutral-950 p-6 text-center space-y-4 rounded-2xl shadow-2xl">
        {isSpeaker ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                TARGET WORD TO DESCRIBE
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                🎯 {ts.targetWord}
              </h2>
            </div>

            <div className="space-y-2 pt-3 border-t border-red-950">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                <Ban className="w-3.5 h-3.5" />
                <span>FORBIDDEN WORDS (DO NOT UTTER):</span>
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {ts.forbiddenWords.map((word, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-red-950/60 border border-red-800 text-red-300 font-extrabold text-xs rounded"
                  >
                    🚫 {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-6">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              LISTEN TO THE SPEAKER OVER VOICE
            </span>
            <p className="text-xs text-neutral-300">
              Shout your guesses over the microphone! The speaker is describing a secret concept.
            </p>
          </div>
        )}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleResolve(true)}
            className="py-3 border-2 border-emerald-500 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500 hover:text-black font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>[ ✓ CORRECT GUESS ]</span>
          </button>
          <button
            type="button"
            onClick={() => handleResolve(false)}
            className="py-3 border-2 border-red-800 bg-red-950/40 text-red-400 hover:bg-red-800 hover:text-white font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded"
          >
            <XCircle className="w-4 h-4" />
            <span>[ ✗ FORBIDDEN WORD ]</span>
          </button>
        </div>
      )}

      {/* Action Telemetry */}
      {ts.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ts.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
