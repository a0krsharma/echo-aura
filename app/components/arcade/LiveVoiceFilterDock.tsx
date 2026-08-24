"use client";

import React, { useState } from "react";
import {
  Mic,
  Radio,
  Ghost,
  Bot,
  Megaphone,
  Volume2,
  Sparkles,
  Zap,
  Flame,
  Check,
} from "lucide-react";
import {
  VOICE_FILTERS,
  type VoiceFilterMode,
  voiceModulator,
} from "@/lib/voiceModulator";
import { soundSynth } from "@/lib/soundSynthesizer";

interface LiveVoiceFilterDockProps {
  currentFilter?: VoiceFilterMode;
  onFilterChange?: (filter: VoiceFilterMode) => void;
  rawMediaStream?: MediaStream | null;
}

export default function LiveVoiceFilterDock({
  currentFilter = "clean",
  onFilterChange,
  rawMediaStream,
}: LiveVoiceFilterDockProps) {
  const [activeFilter, setActiveFilter] = useState<VoiceFilterMode>(currentFilter);
  const [lastPlayedSound, setLastPlayedSound] = useState<string | null>(null);

  const handleSelectFilter = (mode: VoiceFilterMode) => {
    setActiveFilter(mode);
    soundSynth.playSubtlePop();
    if (onFilterChange) {
      onFilterChange(mode);
    }
    if (rawMediaStream) {
      voiceModulator.processStream(rawMediaStream, mode);
    }
  };

  const playSoundEffect = (name: string, fn: () => void) => {
    fn();
    setLastPlayedSound(name);
    setTimeout(() => setLastPlayedSound(null), 1200);
  };

  const SOUNDBOARD_ITEMS = [
    { name: "AIRHORN 📢", action: () => soundSynth.playAirhorn() },
    { name: "STADIUM ROAR 🏟️", action: () => soundSynth.playFanfare() },
    { name: "FAIL BUZZER ❌", action: () => soundSynth.playBuzzer() },
    { name: "SNARE 🥁", action: () => soundSynth.playSnare() },
    { name: "TEMPLE GONG 🔔", action: () => soundSynth.playGong() },
    { name: "APPLAUSE 👏", action: () => soundSynth.playApplause() },
    { name: "GHOST HOWL 👻", action: () => soundSynth.playBoing() },
    { name: "808 SUB BOOM 💥", action: () => soundSynth.playSubBoom() },
  ];

  return (
    <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-xl font-mono text-white space-y-4 shadow-2xl">
      {/* Voice Modulator Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-400">
          <Mic className="w-4 h-4 animate-pulse" />
          <span>// CLIENT-SIDE VOICE MODULATORS [ $0 SERVER COST ]</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-bold uppercase">
          WEB AUDIO API DSP
        </span>
      </div>

      {/* Filter Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {VOICE_FILTERS.map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleSelectFilter(f.id)}
              className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "border-emerald-400 bg-emerald-950/50 text-white font-black ring-1 ring-emerald-400"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{f.icon}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div>
                <div className="text-[11px] font-bold truncate">{f.name}</div>
                <div className="text-[9px] text-neutral-500 truncate">{f.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reaction Soundboard Header & Buttons */}
      <div className="space-y-2 pt-2 border-t border-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase text-amber-400">
            <Volume2 className="w-3.5 h-3.5" />
            <span>CUSTOM REACTION SOUNDBOARD (1-SEC MEMES):</span>
          </div>
          {lastPlayedSound && (
            <span className="text-[10px] text-amber-300 font-black uppercase animate-pulse">
              PLAYING: {lastPlayedSound}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOUNDBOARD_ITEMS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => playSoundEffect(item.name, item.action)}
              className="py-2 px-2.5 bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:bg-neutral-800 text-white font-bold text-[11px] uppercase rounded-lg transition-all text-center cursor-pointer active:scale-95 shadow-sm"
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
