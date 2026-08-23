"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { askTwentyQuestion, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, HelpCircle, Send } from "lucide-react";

interface TwentyQuestionsGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function TwentyQuestionsGame({ match, currentUid, isHost }: TwentyQuestionsGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");

  const tqs = match.twentyQuestionsState;
  if (!tqs) return <div className="text-white font-mono p-4">Loading 20 Questions...</div>;

  const questionLog: { askerHandle: string; question: string; answer: string }[] = JSON.parse(
    tqs.questionLogStr || "[]"
  );

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || isHost || match.status === "FINISHED") return;

    const q = questionInput;
    setQuestionInput("");
    soundSynth.playSnare();

    try {
      await askTwentyQuestion(match.id, match.players[currentUid]?.handle || "@ANON", q);
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
          // 20 QUESTIONS [ DATA DECRYPTION ]
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
            {tqs.questionsRemaining} QUESTIONS LEFT
          </span>
        </div>
      </div>

      {/* Secret Subject Card */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-5 text-center space-y-2 rounded-xl shadow-2xl">
        {isHost ? (
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              YOUR SECRET CONCEPT / TOPIC (ANSWER YES / NO ON MIC)
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              🔒 {tqs.targetSubject}
            </h2>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              ASK YES / NO QUESTIONS OVER MIC TO GUESS THE SECRET
            </span>
            <p className="text-xs text-neutral-300">
              The host can only reply with "YES", "NO", or "IRRELEVANT".
            </p>
          </div>
        )}
      </div>

      {/* Question Log */}
      <div className="space-y-2 max-h-48 overflow-y-auto bg-neutral-950 p-3 border border-neutral-800 rounded-xl">
        <span className="text-[10px] text-neutral-500 font-bold uppercase">
          TRANSMITTED QUESTIONS ({questionLog.length}/20):
        </span>
        {questionLog.map((log, i) => (
          <div key={i} className="text-xs space-y-0.5 border-b border-neutral-900 pb-1.5">
            <div className="text-neutral-400 font-bold">
              #{i + 1} {log.askerHandle}: <span className="text-white">"{log.question}"</span>
            </div>
          </div>
        ))}
      </div>

      {/* Question Input Form */}
      {!isHost && (
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            placeholder="TYPE QUESTION OR GUESS..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2 border-2 border-white bg-white text-black font-extrabold text-xs uppercase hover:bg-neutral-200 cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>ASK</span>
          </button>
        </form>
      )}

      {/* Action Telemetry */}
      {tqs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{tqs.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
