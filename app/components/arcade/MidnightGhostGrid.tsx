"use client";

import React, { useState, useEffect } from "react";
import {
  Moon,
  Ghost,
  Lock,
  Unlock,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Radio,
  Skull,
  ShieldAlert,
} from "lucide-react";
import {
  getMidnightGhostStatus,
  GHOST_LOUNGES,
  type MidnightStatus,
  type GhostLoungePreset,
} from "@/lib/midnightGhost";
import { soundSynth } from "@/lib/soundSynthesizer";

interface MidnightGhostGridProps {
  onJoinGhostLounge: (preset: GhostLoungePreset) => void;
}

export default function MidnightGhostGrid({ onJoinGhostLounge }: MidnightGhostGridProps) {
  const [status, setStatus] = useState<MidnightStatus>(getMidnightGhostStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setStatus(getMidnightGhostStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoungeClick = (preset: GhostLoungePreset) => {
    if (!status.isUnlocked) {
      soundSynth.playBuzzer();
      return;
    }
    soundSynth.playFanfare();
    onJoinGhostLounge(preset);
  };

  return (
    <div className="border-2 border-purple-600/80 bg-black p-4 sm:p-6 rounded-xl font-mono text-white space-y-4 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.18)] select-none">
      {/* Background Neon Grid Ambience */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/30 via-transparent to-black" />

      {/* Header & Status Bar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/60 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-400">
            <Moon className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>// THE MIDNIGHT GHOST GRID [ TIME-LOCKED FOMO ]</span>
          </div>
          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide flex items-center gap-2">
            <span>{status.isUnlocked ? "🔓 GHOST GRID ACTIVE (11 PM - 4 AM)" : "🔒 TIME-LOCKED VAULT"}</span>
          </h3>
        </div>

        {/* Live Countdown Badge */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-purple-700/60 px-3 py-1.5 rounded-lg shadow-inner">
          <Clock className="w-4 h-4 text-purple-400 animate-spin" />
          <div className="text-right">
            <div className="text-[9px] text-purple-400 font-bold uppercase">
              {status.isUnlocked ? "SUNRISE PURGE IN:" : "OPENS AT 11:00 PM IN:"}
            </div>
            <div className="text-sm font-black text-white font-mono tracking-widest">
              {status.formattedCountdown}
            </div>
          </div>
        </div>
      </div>

      {/* Purge Banner */}
      <div className="relative flex items-center gap-2 text-[11px] text-purple-300 bg-purple-950/40 border border-purple-900/80 p-2.5 rounded-lg">
        <Skull className="w-4 h-4 text-purple-400 shrink-0" />
        <span>
          <strong className="text-white uppercase font-black">Self-Destructing State:</strong> All
          chat logs, voice audio clips, and ghost tables are completely purged from servers at
          sunrise (6:00 AM).
        </span>
      </div>

      {/* Ghost Table Cards */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GHOST_LOUNGES.map((lounge) => {
          return (
            <div
              key={lounge.id}
              className={`p-3.5 border-2 rounded-xl transition-all flex flex-col justify-between gap-3 ${
                status.isUnlocked
                  ? "border-purple-500 bg-neutral-950 hover:border-purple-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                  : "border-neutral-800 bg-neutral-950/60 opacity-80"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{lounge.icon}</span>
                  <span className="px-2 py-0.5 bg-purple-950 border border-purple-700 text-purple-300 font-mono text-[9px] font-bold uppercase rounded">
                    +{lounge.auraStake} AURA
                  </span>
                </div>
                <h4 className="text-xs font-black uppercase text-white truncate">{lounge.title}</h4>
                <p className="text-[10px] text-neutral-400 line-clamp-2">{lounge.tagline}</p>
                <div className="text-[9px] text-purple-400 font-bold uppercase truncate">
                  ⚡ {lounge.vibe}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLoungeClick(lounge)}
                disabled={!status.isUnlocked}
                className={`w-full py-2 font-black text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  status.isUnlocked
                    ? "bg-purple-600 hover:bg-purple-500 text-white active:scale-95"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-500 cursor-not-allowed"
                }`}
              >
                {status.isUnlocked ? (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>[ ENTER GHOST TABLE ]</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCKED UNTIL 11 PM</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
