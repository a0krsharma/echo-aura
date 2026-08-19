"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Music, 
  Search, 
  Play, 
  Pause, 
  X, 
  Flame, 
  Sparkles, 
  Radio, 
  Check, 
  Headphones,
  Volume2
} from "lucide-react";
import { SOUND_CATALOG, SoundItem, searchSounds, getTrendingSounds } from "@/lib/soundCatalog";
import { soundSynth } from "@/lib/soundSynthesizer";

interface SoundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (sound: SoundItem) => void;
  activeSoundId?: string | null;
}

export default function SoundPickerModal({
  isOpen,
  onClose,
  onSelectSound,
  activeSoundId,
}: SoundPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const filteredSounds = searchQuery.trim()
    ? searchSounds(searchQuery)
    : getTrendingSounds(selectedCategory);

  const handleTogglePreview = (sound: SoundItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    if (previewingId === sound.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewingId(null);
      return;
    }

    // 1. Trigger zero-latency Web Audio Synth tone immediately
    soundSynth.playById(sound.id);
    setPreviewingId(sound.id);

    // 2. Safely attempt remote audio preview
    if (audioRef.current && sound.audioUrl) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = sound.audioUrl;
        audioRef.current.play().catch(() => {
          // Fallback handled cleanly by soundSynth
        });
      } catch {
        // Fallback handled cleanly by soundSynth
      }
    }

    // Auto-reset preview indicator after duration
    const previewDuration = Math.min((sound.durationSec || 3) * 1000, 5000);
    previewTimerRef.current = setTimeout(() => {
      setPreviewingId(null);
    }, previewDuration);
  };

  const handleSelect = (sound: SoundItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    setPreviewingId(null);
    onSelectSound(sound);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none animate-fade-in">
      {/* Hidden Audio Player for Remote Preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPreviewingId(null)}
        preload="none"
        className="hidden"
      />

      <div className="bg-neutral-950 border border-white max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              // SOUND HUB · AUDIO VAULT
            </span>
          </div>
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className="text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search viral memes, AI stems, or acoustic loops..."
            className="w-full bg-black border border-neutral-800 focus:border-white text-xs pl-9 pr-3 py-2.5 text-white outline-none placeholder-neutral-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 text-[10px]">
          {[
            { id: "ALL", label: "ALL SOUNDS" },
            { id: "VOICE_MEME", label: "🔥 VIRAL MEMES" },
            { id: "AI_STEM", label: "⚡ AI STEMS" },
            { id: "LOFI_BEAT", label: "🎧 LO-FI BEATS" },
            { id: "ACOUSTIC", label: "🎸 ACOUSTIC" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 uppercase tracking-wider whitespace-nowrap transition-colors border cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-white text-black border-white font-bold"
                  : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sound Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh] divide-y divide-neutral-900">
          {filteredSounds.length === 0 ? (
            <div className="text-center py-8 text-neutral-600 text-xs">
              NO MATCHING AUDIO STEMS FOUND
            </div>
          ) : (
            filteredSounds.map((sound) => {
              const isSelected = activeSoundId === sound.id;
              const isPreviewing = previewingId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() => handleSelect(sound)}
                  className={`pt-2 flex items-center justify-between p-2.5 rounded-none border transition-colors cursor-pointer group ${
                    isSelected
                      ? "bg-neutral-900 border-white"
                      : "bg-black border-neutral-900 hover:border-neutral-700 hover:bg-neutral-950"
                  }`}
                >
                  {/* Left: Play/Preview Button + Info */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePreview(sound, e)}
                      className={`w-8 h-8 flex items-center justify-center border transition-colors shrink-0 ${
                        isPreviewing
                          ? "bg-white text-black border-white animate-pulse"
                          : "bg-neutral-950 text-white border-neutral-800 group-hover:border-white"
                      }`}
                      title={isPreviewing ? "Pause Audition" : "Audition Audio"}
                    >
                      {isPreviewing ? (
                        <Pause className="w-3.5 h-3.5 fill-black" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      )}
                    </button>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white uppercase truncate">
                          {sound.title}
                        </p>
                        {sound.isVoiceMeme && (
                          <span className="text-[8px] bg-neutral-900 border border-neutral-700 text-neutral-300 px-1 py-0.2 uppercase font-bold shrink-0">
                            MEME
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 uppercase truncate">
                        {sound.artist} · {sound.durationSec}s · {sound.usageCount} uses
                      </p>
                    </div>
                  </div>

                  {/* Right: Select Action Button */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isSelected ? (
                      <span className="border border-white bg-white text-black text-[9px] font-bold px-2 py-1 uppercase flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        ATTACHED
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(sound);
                        }}
                        className="border border-neutral-800 hover:border-white text-neutral-300 hover:text-white text-[9px] font-bold px-2 py-1 uppercase transition-colors"
                      >
                        [ USE ]
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[9px] text-neutral-500">
          <span>// ALL SOUNDS ARE ZERO-ROYALTY & DMCA-CLEARED</span>
          <span>ECHO ACOUSTICS</span>
        </div>
      </div>
    </div>
  );
}
