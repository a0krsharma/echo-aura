"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitNPATEntry, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, FileText, Send } from "lucide-react";

interface NPATGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function NPATGame({ match, currentUid }: NPATGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [animal, setAnimal] = useState("");
  const [thing, setThing] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const ns = match.npatState;
  if (!ns) return <div className="text-white font-mono p-4">Loading NPAT Card...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !place || !animal || !thing || isSubmitted || match.status === "FINISHED") return;

    setIsSubmitted(true);
    soundSynth.playFanfare();

    try {
      await submitNPATEntry(match.id, currentUid, name, place, animal, thing);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-400" />
          // NAME, PLACE, ANIMAL, THING [ NPAT ]
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
        </div>
      </div>

      {/* Announced Letter Banner */}
      <div className="border-4 border-neutral-800 bg-neutral-950 p-6 text-center space-y-2 rounded-2xl shadow-2xl">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
          ANNOUNCED LETTER FOR THIS ROUND
        </span>
        <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-widest animate-pulse">
          [ {ns.currentLetter} ]
        </div>
        <p className="text-xs text-neutral-400">
          All 4 entries must start with the letter <span className="text-white font-bold">{ns.currentLetter}</span>!
        </p>
      </div>

      {/* 4 Data Entry Inputs */}
      <form onSubmit={handleSubmit} className="space-y-3 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
              👤 NAME (STARTS WITH {ns.currentLetter}):
            </label>
            <input
              type="text"
              disabled={isSubmitted}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SAMUEL"
              className="w-full bg-black border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
              🌍 PLACE (STARTS WITH {ns.currentLetter}):
            </label>
            <input
              type="text"
              disabled={isSubmitted}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. SPAIN"
              className="w-full bg-black border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
              🦁 ANIMAL (STARTS WITH {ns.currentLetter}):
            </label>
            <input
              type="text"
              disabled={isSubmitted}
              value={animal}
              onChange={(e) => setAnimal(e.target.value)}
              placeholder="e.g. SHARK"
              className="w-full bg-black border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
              📦 THING (STARTS WITH {ns.currentLetter}):
            </label>
            <input
              type="text"
              disabled={isSubmitted}
              value={thing}
              onChange={(e) => setThing(e.target.value)}
              placeholder="e.g. SATELLITE"
              className="w-full bg-black border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitted || !name || !place || !animal || !thing}
          className="w-full py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all disabled:opacity-40 cursor-pointer rounded shadow-xl flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitted ? "[ CARD SUBMITTED! ]" : "[ SUBMIT NPAT CARD 📝 ]"}</span>
        </button>
      </form>

      {/* Action Telemetry */}
      {ns.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ns.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
