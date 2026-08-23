"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { voteTwoTruthsLie, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle, CheckCircle2, XCircle } from "lucide-react";

interface TwoTruthsGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TwoTruthsGame({ match, currentUid }: TwoTruthsGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [votedIdx, setVotedIdx] = useState<number | null>(null);

  const tts = match.twoTruthsState;
  if (!tts) return <div className="text-white font-mono p-4">Loading Two Truths and a Lie...</div>;

  const isSpeaker = tts.speakerUid === currentUid;

  const handleVote = async (index: number) => {
    if (isSpeaker || votedIdx !== null || match.status === "FINISHED") return;
    setVotedIdx(index);
    soundSynth.playSnare();

    try {
      const result = await voteTwoTruthsLie(match.id, currentUid, index);
      if (result.correct) soundSynth.playFanfare();
      else soundSynth.playBuzzer();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          // TWO TRUTHS AND A LIE [ NODE VERIFICATION ]
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
            {isSpeaker ? "● YOU ARE SPEAKER" : "LISTEN & VOTE"}
          </span>
        </div>
      </div>

      {/* 3 Statements */}
      <div className="space-y-3">
        <span className="text-[10px] text-neutral-400 font-bold uppercase block">
          {isSpeaker
            ? "YOUR 3 STATEMENTS (TWO ARE TRUE, ONE IS A LIE):"
            : "DEBATE ON MIC AND VOTE FOR THE STATEMENT YOU THINK IS THE LIE:"}
        </span>

        {tts.statements.map((stmt, idx) => {
          const isLie = idx === tts.lieIndex;
          const showResult = tts.isRevealed;

          return (
            <button
              key={idx}
              type="button"
              disabled={isSpeaker || votedIdx !== null || match.status === "FINISHED"}
              onClick={() => handleVote(idx)}
              className={`w-full p-4 border-2 text-left font-bold text-xs uppercase transition-all rounded-xl cursor-pointer ${
                showResult && isLie
                  ? "bg-red-950 border-red-500 text-red-300 ring-2 ring-red-500"
                  : showResult && !isLie
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                  : votedIdx === idx
                  ? "bg-neutral-800 border-white text-white"
                  : "bg-neutral-950 border-neutral-800 text-white hover:border-neutral-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full border border-neutral-700 flex items-center justify-center text-xs shrink-0">
                  #{idx + 1}
                </span>
                <span className="leading-relaxed">{stmt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Telemetry */}
      {tts.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{tts.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
