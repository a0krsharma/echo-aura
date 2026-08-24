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
import type { EchoUser } from "@/lib/userDoc";
import { Lock } from "lucide-react";

interface LiveVoiceFilterDockProps {
  currentFilter?: VoiceFilterMode;
  onFilterChange?: (filter: VoiceFilterMode) => void;
  rawMediaStream?: MediaStream | null;
  user?: EchoUser | null;
  onProcessedStream?: (stream: MediaStream) => void;
}

export default function LiveVoiceFilterDock({
  currentFilter = "clean",
  onFilterChange,
  rawMediaStream,
  onProcessedStream,
  user,
}: LiveVoiceFilterDockProps) {
  const [activeFilter, setActiveFilter] = useState<VoiceFilterMode>(currentFilter);
  const [lastPlayedSound, setLastPlayedSound] = useState<string | null>(null);

  React.useEffect(() => {
    if (rawMediaStream) {
      const processed = voiceModulator.processStream(rawMediaStream, activeFilter);
      if (onProcessedStream) {
        onProcessedStream(processed);
      }
    }
  }, [rawMediaStream, activeFilter]);

  const handleSelectFilter = (mode: VoiceFilterMode) => {
    setActiveFilter(mode);
    soundSynth.playSubtlePop();
    if (onFilterChange) {
      onFilterChange(mode);
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
        <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
          <Mic className="w-4 h-4" />
          <span>// LIVE VOICE FILTERS &amp; FX</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-bold uppercase">
          PRO AUDIO DSP
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
              className={`p-2.5 border rounded text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "border-white bg-white text-black font-black"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{f.icon}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
              </div>
              <div>
                <div className="text-[11px] font-bold truncate">{f.name}</div>
                <div className={`text-[9px] truncate ${isSelected ? "text-neutral-700" : "text-neutral-500"}`}>{f.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reaction Soundboard Header & Buttons */}
      <div className="space-y-2 pt-2 border-t border-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase text-white">
            <Volume2 className="w-3.5 h-3.5" />
            <span>CUSTOM REACTION SOUNDBOARD:</span>
          </div>
          {lastPlayedSound && (
            <span className="text-[10px] text-white font-black uppercase border border-neutral-700 px-1.5 py-0.5">
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
              className="py-2 px-2.5 bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-white font-bold text-[11px] uppercase rounded transition-all text-center cursor-pointer active:scale-95 shadow-sm"
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
