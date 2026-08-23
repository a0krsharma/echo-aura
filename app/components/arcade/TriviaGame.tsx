"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitTriviaAnswer, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle } from "lucide-react";

interface TriviaGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TriviaGame({ match, currentUid }: TriviaGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const ts = match.triviaState;
  if (!ts) return <div className="text-white font-mono p-4">Loading Signal Race Quiz...</div>;

  const currentQ = ts.currentQuestion;
  const myScore = ts.scores[currentUid] || 0;

  const handleSelectOption = async (index: number) => {
    if (selectedIdx !== null || match.status === "FINISHED") return;
    setSelectedIdx(index);
    soundSynth.playSnare();

    try {
      const result = await submitTriviaAnswer(match.id, currentUid, index);
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
          // TRIVIA [ SIGNAL RACE CODE QUIZ ]
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
            SCORE: {myScore} PTS
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-5 space-y-3 rounded-xl shadow-2xl">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
          QUESTION {ts.questionIndex + 1} OF {ts.totalQuestions}
        </span>
        <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
          {currentQ.question}
        </h3>
      </div>

      {/* 4 Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {currentQ.options.map((opt, idx) => {
          const isChosen = selectedIdx === idx;
          const isCorrect = isChosen && idx === currentQ.answerIndex;
          const isWrong = isChosen && idx !== currentQ.answerIndex;

          return (
            <button
              key={idx}
              type="button"
              disabled={selectedIdx !== null || match.status === "FINISHED"}
              onClick={() => handleSelectOption(idx)}
              className={`p-3.5 border-2 text-left text-xs font-bold uppercase transition-all cursor-pointer rounded-lg ${
                isCorrect
                  ? "bg-emerald-600 text-black border-emerald-400 font-extrabold"
                  : isWrong
                  ? "bg-red-900 text-white border-red-500 font-extrabold"
                  : "bg-neutral-950 border-neutral-800 text-white hover:border-white hover:bg-neutral-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border border-neutral-700 flex items-center justify-center text-[10px]">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Telemetry */}
      {ts.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ts.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle || "QUIZ COMPLETED!"}
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 100} AURA POINTS
          </p>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
