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
  Zap,
  Tv,
  Search,
  ExternalLink,
  X,
  RadioTower,
} from "lucide-react";
import { partyMusicEngine, PARTY_PLAYLIST, PartyTrack } from "@/lib/partyMusicEngine";
import { SpaceSpotifySyncState } from "@/lib/spaces";
import { searchSpotifyTracks, playSpotifyTrack } from "@/lib/spotify";

export interface PartyMusicBarProps {
  userHandle?: string;
  compact?: boolean;
  onSongChanged?: (newTrack: PartyTrack) => void;
  onOpenTeleparty?: () => void;
  spotifySyncState?: SpaceSpotifySyncState | null;
  onUpdateSpotifySync?: (sync: SpaceSpotifySyncState | null) => void;
  className?: string;
}

// ── Top Spotify Party Presets for Instant 1-Tap Queueing ──
const SPOTIFY_PARTY_PRESETS = [
  {
    id: "4HlFJV71xXKIGcU3kRyttv",
    title: "O Sanam",
    artist: "Lucky Ali",
    uri: "spotify:track:4HlFJV71xXKIGcU3kRyttv",
    coverArt: "✨",
    bpm: 104,
    genre: "lofi" as const,
  },
  {
    id: "5fqGgYV8XbXvT8Z8L6Qv2I",
    title: "Apna Bana Le",
    artist: "Arijit Singh & Sachin-Jigar",
    uri: "spotify:track:5fqGgYV8XbXvT8Z8L6Qv2I",
    coverArt: "🌸",
    bpm: 92,
    genre: "lofi" as const,
  },
  {
    id: "0VjIjW4GlUZAMYd2vXMi3b",
    title: "Blinding Lights",
    artist: "The Weeknd",
    uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b",
    coverArt: "⚡",
    bpm: 171,
    genre: "edm" as const,
  },
  {
    id: "2qpmMpWLR9EKRsiQm9q3V2",
    title: "Lover",
    artist: "Diljit Dosanjh",
    uri: "spotify:track:2qpmMpWLR9EKRsiQm9q3V2",
    coverArt: "🔥",
    bpm: 122,
    genre: "punjabi" as const,
  },
  {
    id: "kala_chashma",
    title: "Kala Chashma (Club Remix)",
    artist: "Badshah & Neha Kakkar",
    uri: "spotify:track:1KhlzV6Z6j4009N00",
    coverArt: "🕶️",
    bpm: 128,
    genre: "bollywood" as const,
  },
  {
    id: "tauba_tauba",
    title: "Tauba Tauba",
    artist: "Karan Aujla",
    uri: "spotify:track:7BGY871239912",
    coverArt: "🕺",
    bpm: 132,
    genre: "punjabi" as const,
  },
  {
    id: "brown_munde",
    title: "Brown Munde",
    artist: "AP Dhillon & Gurinder Gill",
    uri: "spotify:track:61298418900",
    coverArt: "⚡",
    bpm: 135,
    genre: "punjabi" as const,
  },
  {
    id: "kesariya",
    title: "Kesariya (Lo-Fi)",
    artist: "Arijit Singh & Pritam",
    uri: "spotify:track:9812984100",
    coverArt: "🌙",
    bpm: 90,
    genre: "lofi" as const,
  },
];

export function PartyMusicBar({
  userHandle = "Guest",
  compact = false,
  onSongChanged,
  onOpenTeleparty,
  spotifySyncState,
  onUpdateSpotifySync,
  className = "",
}: PartyMusicBarProps) {
  const [musicState, setMusicState] = useState(partyMusicEngine.getState());
  const [isMuted, setIsMuted] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistFilter, setPlaylistFilter] = useState<"all" | "fast" | "punjabi" | "bollywood" | "lofi">("all");
  const [prevVolume, setPrevVolume] = useState(0.35);
  const [skipToast, setSkipToast] = useState<string | null>(null);

  // Spotify Modal State
  const [spotifyModalOpen, setSpotifyModalOpen] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState("");

  useEffect(() => {
    const unsub = partyMusicEngine.subscribe((state) => {
      setMusicState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Listen to external Spotify sync state from SpaceDoc so all participants hear the song
  useEffect(() => {
    if (spotifySyncState && spotifySyncState.isPlaying) {
      if (musicState.track.title !== spotifySyncState.trackName) {
        partyMusicEngine.playSpotifyTrack({
          id: spotifySyncState.trackId,
          title: spotifySyncState.trackName,
          artist: spotifySyncState.artistName,
          coverArt: spotifySyncState.albumArt || "🟢",
          bpm: 128,
        });
      }
    }
  }, [spotifySyncState]);

  const handleSelectSpotifyTrack = (track: {
    id: string;
    title: string;
    artist: string;
    uri?: string;
    coverArt?: string;
    bpm?: number;
  }) => {
    // 1. Play in PartyMusicEngine so ALL participants hear it synchronized via Web Audio
    partyMusicEngine.playSpotifyTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverArt: track.coverArt || "🟢",
      bpm: track.bpm || 128,
    });

    // 2. Broadcast Spotify Live Sync state to all users in the Space
    const syncData: SpaceSpotifySyncState = {
      trackId: track.id,
      trackUri: track.uri || `spotify:track:${track.id}`,
      trackName: track.title,
      artistName: track.artist,
      albumArt: track.coverArt || "🟢",
      durationMs: 195000,
      progressMs: 0,
      isPlaying: true,
      startedAt: Date.now(),
      djHandle: userHandle,
    };
    onUpdateSpotifySync?.(syncData);

    // 3. Try user's Spotify Web API if they have a connected token
    if (track.uri) {
      playSpotifyTrack(track.uri).catch(() => {});
    }

    setSpotifyModalOpen(false);
    setSkipToast(`🟢 LIVE SPOTIFY SYNC: "${track.title}" by ${track.artist}! 🎶`);
    setTimeout(() => setSkipToast(null), 4000);
  };

  const handleSearchSpotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifySearchQuery.trim()) return;
    setIsSearchingSpotify(true);
    try {
      const results = await searchSpotifyTracks(spotifySearchQuery);
      setSpotifyResults(results);
    } catch {
      setSpotifyResults([]);
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handlePasteCustomSpotify = () => {
    if (!customSpotifyUrl.trim()) return;
    const match = customSpotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    const trackId = match ? match[1] : customSpotifyUrl.replace("spotify:track:", "").trim();
    if (trackId) {
      handleSelectSpotifyTrack({
        id: trackId,
        title: `Spotify Track (${trackId.slice(0, 6)})`,
        artist: "Spotify Live Queue",
        uri: `spotify:track:${trackId}`,
        coverArt: "🟢",
        bpm: 126,
      });
      setCustomSpotifyUrl("");
    }
  };

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

  const handlePlayFastParty = () => {
    const fastItems = PARTY_PLAYLIST.map((t, idx) => ({ t, idx })).filter(
      (item) => item.t.bpm >= 130
    );
    if (fastItems.length > 0) {
      const nextFast =
        fastItems.find((item) => item.idx !== musicState.trackIndex) || fastItems[0];
      partyMusicEngine.play(nextFast.idx);
      setSkipToast(`⚡ ${nextFast.t.bpm} BPM FAST PARTY: "${nextFast.t.title}"! 🔥`);
      setTimeout(() => setSkipToast(null), 3500);
      onSongChanged?.(nextFast.t);
    }
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
      {/* 🟢 SPOTIFY LIVE SYNC BANNER */}
      {spotifySyncState?.isPlaying && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-black text-white shrink-0 flex items-center gap-1">
              <span>🟢</span>
              <span>SPOTIFY SYNC:</span>
            </span>
            <span className="truncate text-white font-bold">
              {spotifySyncState.trackName} - {spotifySyncState.artistName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-emerald-400/90 font-bold">DJ: @{spotifySyncState.djHandle}</span>
            {spotifySyncState.trackId && (
              <a
                href={`https://open.spotify.com/track/${spotifySyncState.trackId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition"
              >
                <span>Spotify</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      )}

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

          {/* Skip / Change Song button */}
          <button
            onClick={handleNext}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
            title="Don't like this song? Click to change party track for the room!"
          >
            <SkipForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Change Song</span>
          </button>

          {/* ⚡ Fast Party Mode Button (130-142 BPM) */}
          <button
            onClick={handlePlayFastParty}
            className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
            title="Cue 130-142 BPM High-Tempo Fast Party Bangers"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">⚡ Fast Party</span>
          </button>

          {/* 🟢 Spotify Room Sync Button */}
          <button
            type="button"
            onClick={() => setSpotifyModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/20 group"
            title="Play Spotify Music Synced Across All Space Participants"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Spotify</span>
          </button>

          {/* YouTube / Watch Party Audio Sync */}
          {onOpenTeleparty && (
            <button
              onClick={onOpenTeleparty}
              className="px-2.5 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/25 text-red-300 hover:text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Sync YouTube Videos or Spotify Audio with Room"
            >
              <Tv className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline">Sync YouTube</span>
            </button>
          )}

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

      {/* Playlist Drawer with Fast Party Filters */}
      {playlistOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Party Queue ({PARTY_PLAYLIST.length} Tracks)
            </span>
            <span className="text-[10px] text-neutral-500">Synced Room Audio</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {(
              [
                { id: "all", label: "All Tracks" },
                { id: "fast", label: "⚡ Fast Party (130+ BPM)" },
                { id: "punjabi", label: "🔥 Punjabi" },
                { id: "bollywood", label: "💃 Bollywood" },
                { id: "lofi", label: "🌙 Lo-Fi" },
              ] as const
            ).map((flt) => (
              <button
                key={flt.id}
                onClick={() => setPlaylistFilter(flt.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition cursor-pointer ${
                  playlistFilter === flt.id
                    ? "bg-emerald-500 text-neutral-950 shadow-xs"
                    : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800"
                }`}
              >
                {flt.label}
              </button>
            ))}
          </div>

          {/* Track List */}
          <div className="space-y-1">
            {PARTY_PLAYLIST.map((t, idx) => {
              const isCur = idx === musicState.trackIndex;
              if (playlistFilter === "fast" && t.bpm < 130) return null;
              if (playlistFilter === "punjabi" && t.genre !== "punjabi") return null;
              if (playlistFilter === "bollywood" && t.genre !== "bollywood") return null;
              if (playlistFilter === "lofi" && t.genre !== "lofi") return null;

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
                        {t.bpm >= 130 && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                            ⚡ {t.bpm} BPM
                          </span>
                        )}
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
        </div>
      )}

      {/* ── SPOTIFY SEARCH & ROOM SYNC MODAL ── */}
      {spotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-950 border border-emerald-500/40 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-base shadow-md shadow-emerald-500/30">
                  🟢
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
                    <span>Spotify Room Live Sync</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      HEARD BY ALL
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-400">
                    Queue a song for all participants in the space to hear together
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSpotifyModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotify Search Bar */}
            <form onSubmit={handleSearchSpotify} className="relative">
              <input
                type="text"
                placeholder="Search songs or artists on Spotify..."
                value={spotifySearchQuery}
                onChange={(e) => setSpotifySearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 pl-9 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-emerald-400 text-xs font-mono text-white outline-none placeholder:text-neutral-500"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <button
                type="submit"
                disabled={isSearchingSpotify}
                className="absolute right-2 top-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs font-mono transition cursor-pointer disabled:opacity-50"
              >
                {isSearchingSpotify ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Search Results if any */}
            {spotifyResults.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-mono font-bold uppercase text-emerald-400">
                  Search Results:
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {spotifyResults.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        handleSelectSpotifyTrack({
                          id: item.id,
                          title: item.name,
                          artist: item.artists?.map((a: any) => a.name).join(", ") || "Artist",
                          uri: item.uri,
                          coverArt: "🟢",
                          bpm: 128,
                        })
                      }
                      className="w-full p-2 rounded-xl bg-neutral-900/80 hover:bg-emerald-950/40 border border-neutral-800 hover:border-emerald-500/50 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {item.artists?.map((a: any) => a.name).join(", ")}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-emerald-500 text-neutral-950 text-[10px] font-mono font-bold shrink-0">
                        Queue For All
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 1-Tap Curated Spotify Party Hits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-neutral-400">
                <span>1-Tap Spotify Party Hits</span>
                <span className="text-[10px] text-emerald-400">Instant Sync</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SPOTIFY_PARTY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectSpotifyTrack(p)}
                    className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-400/50 hover:bg-emerald-950/20 text-left transition flex items-center gap-2.5 cursor-pointer group"
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {p.coverArt}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{p.artist}</div>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 shrink-0">
                      {p.bpm} BPM
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paste Custom Spotify Link */}
            <div className="pt-2 border-t border-neutral-800 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-neutral-400">
                Or Paste Spotify Track Link:
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="https://open.spotify.com/track/..."
                  value={customSpotifyUrl}
                  onChange={(e) => setCustomSpotifyUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-emerald-400 text-xs font-mono text-white outline-none placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={handlePasteCustomSpotify}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Play
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
