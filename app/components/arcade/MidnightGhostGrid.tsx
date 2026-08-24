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
    <div className="border border-neutral-800 bg-black p-4 sm:p-6 rounded-xl font-mono text-white space-y-4 shadow-2xl select-none">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
            <Moon className="w-4 h-4 text-white" />
            <span>// THE MIDNIGHT GHOST GRID [ TIME-LOCKED FOMO ]</span>
          </div>
          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide flex items-center gap-2">
            <span>{status.isUnlocked ? "🔓 GHOST GRID ACTIVE (11 PM - 4 AM)" : "🔒 TIME-LOCKED VAULT"}</span>
          </h3>
        </div>

        {/* Live Countdown Badge */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded">
          <Clock className="w-4 h-4 text-white" />
          <div className="text-right">
            <div className="text-[9px] text-neutral-400 font-bold uppercase">
              {status.isUnlocked ? "SUNRISE PURGE IN:" : "OPENS AT 11:00 PM IN:"}
            </div>
            <div className="text-sm font-black text-white font-mono tracking-widest">
              {status.formattedCountdown}
            </div>
          </div>
        </div>
      </div>

      {/* Purge Banner */}
      <div className="flex items-center gap-2 text-[11px] text-neutral-300 bg-neutral-950 border border-neutral-800 p-2.5 rounded">
        <Skull className="w-4 h-4 text-white shrink-0" />
        <span>
          <strong className="text-white uppercase font-black">Self-Destructing State:</strong> All
          chat logs, voice audio clips, and ghost tables are completely purged from servers at
          sunrise (6:00 AM).
        </span>
      </div>

      {/* Ghost Table Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GHOST_LOUNGES.map((lounge) => {
          return (
            <div
              key={lounge.id}
              className={`p-3.5 border rounded transition-all flex flex-col justify-between gap-3 ${
                status.isUnlocked
                  ? "border-neutral-700 bg-neutral-950 hover:border-white shadow-lg"
                  : "border-neutral-800 bg-neutral-950/60 opacity-80"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xl">{lounge.icon}</span>
                  <span className="text-[9px] font-bold uppercase border border-neutral-800 px-1.5 py-0.5 text-white">
                    +{lounge.auraStake} AURA
                  </span>
                </div>

                <div className="font-black text-xs uppercase text-white truncate">
                  {lounge.title}
                </div>
                <div className="text-[10px] text-neutral-400 leading-relaxed">
                  {lounge.tagline}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <div className="text-[9px] text-neutral-400 font-bold uppercase truncate">
                  ⚡ {lounge.vibe}
                </div>

                <button
                  type="button"
                  disabled={!status.isUnlocked}
                  onClick={() => handleLoungeClick(lounge)}
                  className={`w-full py-2 border rounded font-black text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    status.isUnlocked
                      ? "border-white bg-white text-black hover:bg-neutral-200 shadow active:scale-95"
                      : "border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed"
                  }`}
                >
                  {status.isUnlocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>[ ENTER LOUNGE ]</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>[ LOCKED ]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
