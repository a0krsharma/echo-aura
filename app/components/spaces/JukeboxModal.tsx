"use client";

import React, { useState } from "react";
import { spacesSfx } from "@/lib/spacesSfx";
import { X, Disc3, Play, Pause, SkipForward, Volume2 } from "lucide-react";

interface JukeboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JUKEBOX_TRACKS = [
  { id: "rainy_tokyo", title: "Midnight Tokyo Rain", genre: "Chillhop", icon: "🌧️" },
  { id: "sakura_dust", title: "Sakura Blossom Dust", genre: "Pastel Lo-Fi", icon: "🌸" },
  { id: "coffee_study", title: "Barista Study Sessions", genre: "Jazzy Beats", icon: "☕" },
  { id: "cyber_dusk", title: "Neon Cyberpunk Skyline", genre: "Synthwave", icon: "⚡" },
];

export default function JukeboxModal({ isOpen, onClose }: JukeboxModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);

  if (!isOpen) return null;

  const currentTrack = JUKEBOX_TRACKS[activeTrackIndex];

  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    spacesSfx.toggleRainAmbience(nextPlay);
    spacesSfx.playKeyNote(nextPlay ? 3 : 1);
  };

  const handleNextTrack = () => {
    const nextIdx = (activeTrackIndex + 1) % JUKEBOX_TRACKS.length;
    setActiveTrackIndex(nextIdx);
    spacesSfx.playKeyNote(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc3 className={`w-5 h-5 text-rose-400 ${isPlaying ? "animate-spin" : ""}`} />
            <span className="text-xs font-mono font-bold text-white">VINTAGE JUKEBOX</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vinyl Disc Animation */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-950 border-4 border-neutral-700 shadow-2xl flex items-center justify-center transition-all ${
              isPlaying ? "animate-spin [animation-duration:4s]" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-lg">
              {currentTrack.icon}
            </div>
          </div>

          <div className="text-center space-y-0.5">
            <div className="text-sm font-bold font-mono text-white">{currentTrack.title}</div>
            <div className="text-[11px] font-mono text-neutral-400">{currentTrack.genre}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleTogglePlay}
            className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-400 text-black flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={handleNextTrack}
            className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
