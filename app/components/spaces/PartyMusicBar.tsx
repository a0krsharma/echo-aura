"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  Disc,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { partyMusicEngine, PARTY_PLAYLIST, PartyTrack } from "@/lib/partyMusicEngine";

interface PartyMusicBarProps {
  userHandle?: string;
  compact?: boolean;
  onSongChanged?: (newTrack: PartyTrack) => void;
  className?: string;
}

export function PartyMusicBar({
  userHandle = "Guest",
  compact = false,
  onSongChanged,
  className = "",
}: PartyMusicBarProps) {
  const [musicState, setMusicState] = useState(partyMusicEngine.getState());
  const [isMuted, setIsMuted] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.35);
  const [skipToast, setSkipToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = partyMusicEngine.subscribe((state) => {
      setMusicState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleTogglePlay = () => {
    partyMusicEngine.togglePlay();
  };

  const handleNext = () => {
    const res = partyMusicEngine.voteToSkip(userHandle);
    if (res.skipped) {
      setSkipToast(res.message);
      setTimeout(() => setSkipToast(null), 3000);
      onSongChanged?.(partyMusicEngine.getState().track);
    }
  };

  const handlePrev = () => {
    partyMusicEngine.previousTrack();
    onSongChanged?.(partyMusicEngine.getState().track);
  };

  const handleSelectTrack = (index: number) => {
    partyMusicEngine.play(index);
    setPlaylistOpen(false);
    onSongChanged?.(PARTY_PLAYLIST[index]);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    partyMusicEngine.setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      partyMusicEngine.setVolume(prevVolume || 0.35);
      setIsMuted(false);
    } else {
      setPrevVolume(musicState.volume);
      partyMusicEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentTrack = musicState.track;

  // Genre badge color
  const getGenreColor = (genre: string) => {
    switch (genre) {
      case "punjabi":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "bollywood":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "edm":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "antakshari":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }
  };

  return (
    <div
      className={`relative z-40 bg-neutral-950/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 rounded-2xl p-3 transition-all ${className}`}
    >
      {/* Skip feedback toast */}
      {skipToast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{skipToast}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Left: Album Vinyl & Track Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative group flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center text-2xl shadow-inner select-none transition-transform duration-500 ${
                musicState.isPlaying ? "rotate-[360deg] shadow-emerald-500/20" : ""
              }`}
              style={{
                transition: musicState.isPlaying ? "transform 6s linear infinite" : "none",
              }}
            >
              <span>{currentTrack.coverArt}</span>
            </div>
            {musicState.isPlaying && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                {currentTrack.title}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold shrink-0 ${getGenreColor(
                  currentTrack.genre
                )}`}
              >
                {currentTrack.genre}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 truncate">
              <span>{currentTrack.artist}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-emerald-400 font-mono text-[10px]">{currentTrack.bpm} BPM</span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Animated Frequency Bars when playing */}
          {musicState.isPlaying && (
            <div className="hidden md:flex items-end gap-0.5 h-5 px-1 mr-1">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s] h-5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.4s] h-2.5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s] h-4" />
            </div>
          )}

          {/* Previous Track */}
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={handleTogglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
              musicState.isPlaying
                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30 scale-105"
                : "bg-white hover:bg-neutral-200 text-neutral-950"
            }`}
            title={musicState.isPlaying ? "Pause Party Music" : "Play Party Music"}
          >
            {musicState.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Skip / Change Song button (The core requirement: "user can change the song if not liked") */}
          <button
            onClick={handleNext}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
            title="Don't like this song? Click to change party track for the room!"
          >
            <SkipForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Change Song</span>
          </button>

          {/* Playlist Dropdown Toggle */}
          <button
            onClick={() => setPlaylistOpen(!playlistOpen)}
            className={`p-2 rounded-xl border text-xs transition-colors flex items-center gap-1 cursor-pointer ${
              playlistOpen
                ? "bg-neutral-800 border-emerald-500 text-emerald-300"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Party Playlist"
          >
            <Disc className="w-4 h-4" />
            {playlistOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right: Volume Slider (Hidden on ultra-compact) */}
        {!compact && (
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-neutral-800">
            <button
              onClick={handleToggleMute}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || musicState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : musicState.volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              title={`Volume: ${Math.round(musicState.volume * 100)}%`}
            />
          </div>
        )}
      </div>

      {/* Track Progress Bar */}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
        <span>{formatTime(musicState.elapsedSeconds)}</span>
        <div className="relative flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
            style={{ width: `${musicState.progress}%` }}
          />
        </div>
        <span>{formatTime(currentTrack.durationSeconds)}</span>
      </div>

      {/* Playlist Drawer */}
      {playlistOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1 pb-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Party Queue ({PARTY_PLAYLIST.length} Tracks)
            </span>
            <span className="text-[10px] text-neutral-500">Synced Room Audio</span>
          </div>

          {PARTY_PLAYLIST.map((t, idx) => {
            const isCur = idx === musicState.trackIndex;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTrack(idx)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                  isCur
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-200"
                    : "hover:bg-neutral-900 text-neutral-300 hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{t.coverArt}</span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-xs flex items-center gap-1.5">
                      {t.title}
                      {isCur && <span className="text-[10px] text-emerald-400 font-mono">● LIVE</span>}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">{t.artist}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-neutral-500">
                  <span className={`px-1.5 py-0.5 rounded border ${getGenreColor(t.genre)}`}>
                    {t.genre}
                  </span>
                  {isCur && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
