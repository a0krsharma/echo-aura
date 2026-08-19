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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  const filteredSounds = searchQuery.trim()
    ? searchSounds(searchQuery)
    : getTrendingSounds(selectedCategory);

  const handleTogglePreview = (sound: SoundItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingId === sound.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = sound.audioUrl;
        audioRef.current.play().then(() => {
          setPreviewingId(sound.id);
        }).catch((err) => {
          console.warn("Preview audio play error:", err);
          setPreviewingId(null);
        });
      }
    }
  };

  const handleSelect = (sound: SoundItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPreviewingId(null);
    onSelectSound(sound);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none animate-fade-in">
      {/* Hidden Audio Player for Preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPreviewingId(null)}
        className="hidden"
      />

      <div className="bg-neutral-950 border border-white max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              // SOUND HUB · INSTAGRAM-STYLE PICKER
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
              className="text-neutral-500 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] uppercase font-bold scrollbar-none">
            {[
              { id: "ALL", label: "🔥 TRENDING" },
              { id: "VOICE_MEME", label: "🗣️ VOICE MEMES" },
              { id: "AI_STEM", label: "🎵 AI STEMS" },
              { id: "ACOUSTIC", label: "🎸 ACOUSTIC" },
              { id: "LOFI_BEAT", label: "☕ LO-FI" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? "border-white bg-white text-black font-extrabold shadow-sm"
                    : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Sound List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {filteredSounds.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 uppercase">
              NO SOUNDS FOUND MATCHING QUERY
            </div>
          ) : (
            filteredSounds.map((sound) => {
              const isSelected = activeSoundId === sound.id;
              const isPlaying = previewingId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() => handleSelect(sound)}
                  className={`p-3 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-white bg-neutral-900 shadow-md"
                      : "border-neutral-900 bg-black hover:border-neutral-600 hover:bg-neutral-950"
                  }`}
                >
                  {/* Left: Play preview & title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePreview(sound, e)}
                      className={`w-8 h-8 rounded-none border flex items-center justify-center shrink-0 transition-colors ${
                        isPlaying
                          ? "border-white bg-white text-black"
                          : "border-neutral-700 bg-neutral-950 text-white hover:border-white"
                      }`}
                      title={isPlaying ? "Pause Preview" : "Play Preview"}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white uppercase truncate">
                          {sound.title}
                        </span>
                        {sound.isVoiceMeme && (
                          <span className="text-[9px] bg-white text-black font-extrabold px-1 uppercase shrink-0">
                            MEME
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {sound.artist} • {sound.durationSec}s • {sound.usageCount} POSTS
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(sound);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors shrink-0 ${
                      isSelected
                        ? "border-white bg-white text-black"
                        : "border-neutral-800 text-neutral-300 hover:border-white hover:text-white"
                    }`}
                  >
                    {isSelected ? "[ SELECTED ]" : "[ + USE AUDIO ]"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="border-t border-neutral-900 pt-2 flex items-center justify-between text-[9px] text-neutral-500 uppercase">
          <span>// 100% ROYALTY-FREE & DMCA-SAFE</span>
          <span>ECHO COMMUNITY SOUND HUB</span>
        </div>
      </div>
    </div>
  );
}
