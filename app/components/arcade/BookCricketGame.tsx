"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { flipBookCricketPage, type ArcadeMatch } from "@/lib/arcade";
import { executeBookCricketBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, BookOpen, HelpCircle } from "lucide-react";

interface BookCricketGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function BookCricketGame({ match, currentUid }: BookCricketGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const bcs = match.bookCricketState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!bcs || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
    if (botPlayer && bcs.currentBatsmanUid === botPlayer.uid) {
      executeBookCricketBotTurn(match);
    }
  }, [match, bcs?.runs, bcs?.balls, bcs?.currentBatsmanUid]);

  if (!bcs) return <div className="text-white font-mono p-4">Loading Book Cricket...</div>;

  const handleFlip = async () => {
    if (match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await flipBookCricketPage(match.id, currentUid);
      if (result.isOut) soundSynth.playBuzzer();
      else if (result.runs >= 4) soundSynth.playFanfare();
      else soundSynth.playSubtlePop();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          // BOOK CRICKET [ PAGE FLIPPER ]
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
            {bcs.runs} / {bcs.wickets}
          </span>
        </div>
      </div>

      {/* Retro Textbook Canvas */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-4 rounded-xl shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            TEXTBOOK PAGE SCOREBOARD
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono">
            {bcs.runs} <span className="text-sm text-neutral-500 font-normal">RUNS ({bcs.balls} BALLS)</span>
          </div>
        </div>

        {bcs.lastFlippedPage !== null && (
          <div className="p-4 border-2 border-emerald-400 bg-black text-emerald-300 font-black text-xl uppercase tracking-widest rounded-xl shadow-lg animate-pulse inline-block">
            📖 FLIPPED PAGE #{bcs.lastFlippedPage}
          </div>
        )}

        <button
          type="button"
          disabled={match.status === "FINISHED"}
          onClick={handleFlip}
          className="w-full py-3.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-xl rounded-lg"
        >
          [ 📖 FLIP TEXTBOOK PAGE (BALL #{bcs.balls + 1}) ]
        </button>
      </div>

      {/* Action Telemetry */}
      {bcs.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{bcs.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 INNINGS COMPLETED WITH {bcs.runs} RUNS!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +100 AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
