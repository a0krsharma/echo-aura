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
  Headphones,
} from "lucide-react";
import { partyMusicEngine, PARTY_PLAYLIST, PartyTrack } from "@/lib/partyMusicEngine";
import { SpaceSpotifySyncState } from "@/lib/spaces";
import {
  searchSpotifyTracks,
  playSpotifyTrack,
  pauseSpotifyPlayback,
  getSpotifyToken,
  initiateSpotifyLogin,
  disconnectSpotify,
} from "@/lib/spotify";

export interface PartyMusicBarProps {
  userHandle?: string;
  compact?: boolean;
  onSongChanged?: (newTrack: PartyTrack) => void;
  onOpenTeleparty?: () => void;
  spotifySyncState?: SpaceSpotifySyncState | null;
  onUpdateSpotifySync?: (sync: SpaceSpotifySyncState | null) => void;
  className?: string;
}

// ── Top Curated Spotify Party Presets (Valid 22-character Spotify Track IDs) ──
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
    id: "1BxfuPKGuaTgP7aM0XbdCe",
    title: "Hona Tha Pyar",
    artist: "Atif Aslam & Hadiqa Kiani",
    uri: "spotify:track:1BxfuPKGuaTgP7aM0XbdCe",
    coverArt: "🌙",
    bpm: 95,
    genre: "lofi" as const,
  },
  {
    id: "6dgUZaU8gCclVv6mUeBkg4",
    title: "Kesariya",
    artist: "Arijit Singh & Pritam",
    uri: "spotify:track:6dgUZaU8gCclVv6mUeBkg4",
    coverArt: "🌸",
    bpm: 90,
    genre: "lofi" as const,
  },
  {
    id: "6i0VGEFzgVHGk5n5Qcce1S",
    title: "Tauba Tauba",
    artist: "Karan Aujla",
    uri: "spotify:track:6i0VGEFzgVHGk5n5Qcce1S",
    coverArt: "🕺",
    bpm: 132,
    genre: "punjabi" as const,
  },
  {
    id: "76QZzVz4C9c5zPq68z1yR1",
    title: "Brown Munde",
    artist: "AP Dhillon & Gurinder Gill",
    uri: "spotify:track:76QZzVz4C9c5zPq68z1yR1",
    coverArt: "⚡",
    bpm: 135,
    genre: "punjabi" as const,
  },
  {
    id: "6Gz3q3Qf6qY44nZ5h6GkIu",
    title: "Pasoori",
    artist: "Ali Sethi & Shae Gill",
    uri: "spotify:track:6Gz3q3Qf6qY44nZ5h6GkIu",
    coverArt: "💃",
    bpm: 122,
    genre: "bollywood" as const,
  },
  {
    id: "7MXV0PtteFYTl0P0K2aGRF",
    title: "Starboy",
    artist: "The Weeknd & Daft Punk",
    uri: "spotify:track:7MXV0PtteFYTl0P0K2aGRF",
    coverArt: "⚡",
    bpm: 186,
    genre: "edm" as const,
  },
  {
    id: "7qiZfU4dY1lWllzX7mPBI3",
    title: "Shape of You",
    artist: "Ed Sheeran",
    uri: "spotify:track:7qiZfU4dY1lWllzX7mPBI3",
    coverArt: "🔥",
    bpm: 96,
    genre: "edm" as const,
  },
  {
    id: "463CkQjx2Zk1yXoBuRxM9i",
    title: "Levitating",
    artist: "Dua Lipa",
    uri: "spotify:track:463CkQjx2Zk1yXoBuRxM9i",
    coverArt: "✨",
    bpm: 103,
    genre: "edm" as const,
  },
];

function extractSpotifyTrackId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.startsWith("spotify:track:")) {
    return trimmed.replace("spotify:track:", "").trim();
  }
  const match = trimmed.match(/track\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  return trimmed;
}

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

  // Spotify Authentication & Modal State
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyModalOpen, setSpotifyModalOpen] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState("");
  const [spotifyStatusMsg, setSpotifyStatusMsg] = useState<string | null>(null);
  const [inSpaceBeatsActive, setInSpaceBeatsActive] = useState(false);

  useEffect(() => {
    setSpotifyToken(getSpotifyToken());
    const unsub = partyMusicEngine.subscribe((state) => {
      setMusicState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Synchronize remote Spotify doc state with local audio engine and native playback
  useEffect(() => {
    if (spotifySyncState && spotifySyncState.isPlaying && spotifySyncState.trackId) {
      partyMusicEngine.playSpotifyTrack({
        id: spotifySyncState.trackId,
        title: spotifySyncState.trackName,
        artist: spotifySyncState.artistName,
        coverArt: spotifySyncState.albumArt || "🟢",
        bpm: 128,
      });

      // If user has authorized their Spotify account, sync playback on their active device
      if (spotifyToken && spotifySyncState.trackUri) {
        const elapsed = Math.max(0, Date.now() - (spotifySyncState.startedAt || Date.now()));
        playSpotifyTrack(spotifySyncState.trackUri, elapsed)
          .then((res) => {
            if (!res.success) {
              setSpotifyStatusMsg(res.message || "Spotify playback requires Premium or active app");
            } else {
              setSpotifyStatusMsg(null);
            }
          })
          .catch(() => {});
      } else if (!spotifyToken) {
        setSpotifyStatusMsg("Spotify account not linked. Tap Play on the player below, or link Spotify.");
      }
    } else if (spotifySyncState && !spotifySyncState.isPlaying) {
      if (spotifyToken) {
        pauseSpotifyPlayback().catch(() => {});
      }
    }
  }, [spotifySyncState, spotifyToken]);

  const handleSelectSpotifyTrack = (track: {
    id: string;
    title: string;
    artist: string;
    uri?: string;
    coverArt?: string;
    bpm?: number;
  }) => {
    const cleanId = extractSpotifyTrackId(track.id);
    const trackUri = track.uri || `spotify:track:${cleanId}`;

    // 1. Update partyMusicEngine metadata and pause procedural synth
    partyMusicEngine.playSpotifyTrack({
      id: cleanId,
      title: track.title,
      artist: track.artist,
      coverArt: track.coverArt || "🟢",
      bpm: track.bpm || 128,
    });

    // 2. Broadcast Spotify Live Sync state to all users in the Space
    const syncData: SpaceSpotifySyncState = {
      trackId: cleanId,
      trackUri: trackUri,
      trackName: track.title,
      artistName: track.artist,
      albumArt: track.coverArt || "🟢",
      durationMs: 210000,
      progressMs: 0,
      isPlaying: true,
      startedAt: Date.now(),
      djHandle: userHandle,
    };
    onUpdateSpotifySync?.(syncData);

    // 3. Control user's native Spotify player if connected
    if (spotifyToken) {
      playSpotifyTrack(trackUri, 0)
        .then((res) => {
          if (!res.success) {
            setSpotifyStatusMsg(res.message || "Spotify playback failed");
          } else {
            setSpotifyStatusMsg(null);
          }
        })
        .catch(() => {});
    } else {
      setSpotifyStatusMsg("Connect your Spotify account to auto-control playback across devices.");
    }

    setSpotifyModalOpen(false);
    setSkipToast(`🟢 NOW PLAYING: "${track.title}" on Spotify! 🎶`);
    setTimeout(() => setSkipToast(null), 4000);
  };

  const handleSearchSpotify = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = spotifySearchQuery.trim();
    if (!query) return;

    setIsSearchingSpotify(true);
    try {
      let results: any[] = [];
      if (spotifyToken) {
        results = await searchSpotifyTracks(query);
      }

      // If Spotify API returned no results or user is not logged in, search curated presets
      if (results.length === 0) {
        const qLower = query.toLowerCase();
        results = SPOTIFY_PARTY_PRESETS.filter(
          (p) =>
            p.title.toLowerCase().includes(qLower) ||
            p.artist.toLowerCase().includes(qLower)
        ).map((p) => ({
          id: p.id,
          name: p.title,
          artists: [{ name: p.artist }],
          uri: p.uri,
          album: { images: [{ url: "" }] },
        }));
      }

      setSpotifyResults(results);
    } catch {
      setSpotifyResults([]);
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handlePasteCustomSpotify = () => {
    if (!customSpotifyUrl.trim()) return;
    const cleanId = extractSpotifyTrackId(customSpotifyUrl.trim());
    if (cleanId) {
      handleSelectSpotifyTrack({
        id: cleanId,
        title: `Spotify Track (${cleanId.slice(0, 6)}...)`,
        artist: "Spotify Live Selection",
        uri: `spotify:track:${cleanId}`,
        coverArt: "🟢",
        bpm: 126,
      });
      setCustomSpotifyUrl("");
    }
  };

  const handleTogglePlay = () => {
    if (spotifySyncState?.trackId) {
      const nextPlaying = !spotifySyncState.isPlaying;
      const progress = Math.max(0, Date.now() - (spotifySyncState.startedAt || Date.now()));
      const updatedSync: SpaceSpotifySyncState = {
        ...spotifySyncState,
        isPlaying: nextPlaying,
        progressMs: progress,
        startedAt: nextPlaying ? Date.now() - progress : spotifySyncState.startedAt,
      };
      onUpdateSpotifySync?.(updatedSync);

      if (spotifyToken && spotifySyncState.trackUri) {
        if (nextPlaying) {
          playSpotifyTrack(spotifySyncState.trackUri, progress).catch(() => {});
        } else {
          pauseSpotifyPlayback().catch(() => {});
        }
      }
    } else {
      partyMusicEngine.togglePlay();
    }
  };

  const handleNext = () => {
    if (spotifySyncState?.trackId) {
      // Pick next curated hit
      const curIdx = SPOTIFY_PARTY_PRESETS.findIndex((p) => p.id === spotifySyncState.trackId);
      const nextIdx = (curIdx + 1) % SPOTIFY_PARTY_PRESETS.length;
      handleSelectSpotifyTrack(SPOTIFY_PARTY_PRESETS[nextIdx]);
    } else {
      const res = partyMusicEngine.voteToSkip(userHandle);
      if (res.skipped) {
        setSkipToast(res.message);
        setTimeout(() => setSkipToast(null), 3000);
        onSongChanged?.(partyMusicEngine.getState().track);
      }
    }
  };

  const handlePrev = () => {
    if (spotifySyncState?.trackId) {
      const curIdx = SPOTIFY_PARTY_PRESETS.findIndex((p) => p.id === spotifySyncState.trackId);
      const prevIdx = (curIdx - 1 + SPOTIFY_PARTY_PRESETS.length) % SPOTIFY_PARTY_PRESETS.length;
      handleSelectSpotifyTrack(SPOTIFY_PARTY_PRESETS[prevIdx]);
    } else {
      partyMusicEngine.previousTrack();
      onSongChanged?.(partyMusicEngine.getState().track);
    }
  };

  const handleSelectTrack = (index: number) => {
    // Switch from Spotify back to internal party playlist
    onUpdateSpotifySync?.(null);
    partyMusicEngine.setExternalAudio(false);
    partyMusicEngine.play(index);
    setPlaylistOpen(false);
    onSongChanged?.(PARTY_PLAYLIST[index]);
  };

  const handleBackToEchoRadio = () => {
    onUpdateSpotifySync?.(null);
    partyMusicEngine.setExternalAudio(false);
    partyMusicEngine.play();
    setSkipToast("📻 Switched back to Echo Party Radio!");
    setTimeout(() => setSkipToast(null), 3000);
  };

  const handlePlayFastParty = () => {
    onUpdateSpotifySync?.(null);
    partyMusicEngine.setExternalAudio(false);
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

  const isSpotifyActive = Boolean(spotifySyncState?.isPlaying && spotifySyncState?.trackId);
  const activeTrackTitle = isSpotifyActive ? spotifySyncState!.trackName : musicState.track.title;
  const activeTrackArtist = isSpotifyActive ? spotifySyncState!.artistName : musicState.track.artist;
  const activeCoverArt = isSpotifyActive ? spotifySyncState!.albumArt || "🟢" : musicState.track.coverArt;
  const isPlayingActive = isSpotifyActive ? Boolean(spotifySyncState?.isPlaying) : musicState.isPlaying;

  return (
    <div
      className={`relative z-40 bg-neutral-950/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 rounded-2xl p-3 transition-all ${className}`}
    >
      {/* 🟢 SPOTIFY LIVE SYNC BANNER */}
      {isSpotifyActive && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center justify-between shadow-sm animate-in fade-in flex-wrap gap-2">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-black text-white shrink-0 flex items-center gap-1">
              <span>🟢</span>
              <span>SPOTIFY CO-LISTENING:</span>
            </span>
            <span className="truncate text-white font-bold">
              {activeTrackTitle} - {activeTrackArtist}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-emerald-400/90 font-bold">DJ: @{spotifySyncState?.djHandle || "Host"}</span>
            <a
              href={`https://open.spotify.com/track/${spotifySyncState?.trackId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition"
              title="Open full track in native Spotify App"
            >
              <span>App</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <button
              type="button"
              onClick={handleBackToEchoRadio}
              className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white px-2 py-0.5 rounded-lg border border-neutral-800 transition cursor-pointer"
            >
              Echo Radio
            </button>
          </div>
        </div>
      )}

      {/* Skip feedback toast */}
      {skipToast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-50">
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
                isPlayingActive ? "rotate-[360deg] shadow-emerald-500/20" : ""
              }`}
              style={{
                transition: isPlayingActive ? "transform 6s linear infinite" : "none",
              }}
            >
              <span>{activeCoverArt}</span>
            </div>
            {isPlayingActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                {activeTrackTitle}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold shrink-0 ${
                  isSpotifyActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                }`}
              >
                {isSpotifyActive ? "SPOTIFY" : musicState.track.genre}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 truncate">
              <span>{activeTrackArtist}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-emerald-400 font-mono text-[10px]">
                {isSpotifyActive ? "REAL-TIME SYNC" : `${musicState.track.bpm} BPM`}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Animated Frequency Bars when playing */}
          {isPlayingActive && (
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
              isPlayingActive
                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30 scale-105"
                : "bg-white hover:bg-neutral-200 text-neutral-950"
            }`}
            title={isPlayingActive ? "Pause Music" : "Play Music"}
          >
            {isPlayingActive ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Next / Change Song button */}
          <button
            onClick={handleNext}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
            title="Change party track for the room"
          >
            <SkipForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Change Song</span>
          </button>

          {/* ⚡ Fast Party Mode Button */}
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
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group ${
              isSpotifyActive
                ? "border-emerald-400 bg-emerald-500/30 text-white shadow-emerald-500/30"
                : "border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white shadow-emerald-500/20"
            }`}
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
              title="Sync YouTube Videos or Audio with Room"
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

        {/* Right: Volume Slider */}
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

      {/* 🟢 Live Spotify Embedded Player (Plays Authentic Audio from Spotify) */}
      {isSpotifyActive && (
        <div className="mt-2.5 rounded-xl overflow-hidden border border-emerald-500/40 bg-black/90 shadow-md">
          <div className="px-2.5 py-1 bg-emerald-950/70 border-b border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE SPOTIFY CO-LISTENING</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">DJ: @{spotifySyncState?.djHandle || "Host"}</span>
              <a
                href={`https://open.spotify.com/track/${spotifySyncState?.trackId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-0.5 transition"
              >
                <span>App</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                type="button"
                onClick={handleBackToEchoRadio}
                className="text-[9px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded border border-neutral-800 transition cursor-pointer"
                title="Exit Spotify and return to Echo procedural party beats"
              >
                Exit Spotify
              </button>
            </div>
          </div>
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifySyncState?.trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full bg-black block"
          />

          {/* Guidance Banner & In-Space Audio Fallback */}
          <div className="px-3 py-2 bg-neutral-900/95 border-t border-neutral-800 flex flex-col gap-2">
            <div className="flex items-start gap-2 text-[11px] text-amber-300">
              <span className="text-xs">💡</span>
              <div className="flex-1">
                <span className="font-semibold text-neutral-200">
                  {spotifyStatusMsg || "Click ▶️ Play on the player above to start Spotify audio in your browser."}
                </span>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Spotify API requires Spotify Premium to start audio automatically on other apps. You can also listen via In-Space Beats below!
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => {
                  const next = !inSpaceBeatsActive;
                  setInSpaceBeatsActive(next);
                  partyMusicEngine.setExternalAudio(!next);
                  setSkipToast(
                    next
                      ? "🔊 In-Space Beats Active! Playing procedural audio in sync for all guests."
                      : "🔇 In-Space Beats Muted. Listening via Spotify player only."
                  );
                  setTimeout(() => setSkipToast(null), 3500);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  inSpaceBeatsActive
                    ? "bg-emerald-500 text-neutral-950 shadow-sm"
                    : "bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                <span>{inSpaceBeatsActive ? "🔊 In-Space Beats: ON" : "🎧 Play In-Space Beats (All Hear)"}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <a
                  href={`spotify:track:${spotifySyncState?.trackId}`}
                  className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-mono transition flex items-center gap-1"
                  title="Open in Spotify Desktop / Mobile App"
                >
                  <span>Open Spotify App</span>
                  <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Track Progress Bar (when in internal party mode) */}
      {!isSpotifyActive && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
          <span>{formatTime(musicState.elapsedSeconds)}</span>
          <div className="relative flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${musicState.progress}%` }}
            />
          </div>
          <span>{formatTime(musicState.track.durationSeconds)}</span>
        </div>
      )}

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
              const isCur = idx === musicState.trackIndex && !isSpotifyActive;
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
                    <span className="px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/30">
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
                    <span>Spotify Room Live Co-Listening</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      HEARD BY ALL
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-400">
                    Queue a song from Spotify for all participants in the space to hear together
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

            {/* Spotify Account Status & Connect Button */}
            {spotifyToken ? (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-mono font-bold">Spotify Account Connected</span>
                  <span className="text-[10px] text-emerald-400 font-mono">(Lossless Web Sync On)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    disconnectSpotify();
                    setSpotifyToken(null);
                  }}
                  className="text-[10px] text-neutral-400 hover:text-rose-400 font-mono underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
                <div className="min-w-0 pr-2">
                  <div className="text-white font-bold font-mono text-xs flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Connect Your Spotify Account</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Unlock full 100M+ track search & native device co-listening
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => initiateSpotifyLogin(typeof window !== "undefined" ? window.location.href : undefined)}
                  className="px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold font-mono text-xs transition cursor-pointer shrink-0 shadow-sm"
                >
                  Connect
                </button>
              </div>
            )}

            {/* Spotify Search Bar */}
            <form onSubmit={handleSearchSpotify} className="relative">
              <input
                type="text"
                placeholder="Search songs or artists (e.g. Arijit, Diljit, Lucky Ali, Weeknd)..."
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
                          uri: item.uri || `spotify:track:${item.id}`,
                          coverArt: item.album?.images?.[0]?.url || "🟢",
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
                <span className="text-[10px] text-emerald-400">Instant Co-Listening</span>
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
                Or Paste Any Spotify Track Link:
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
                  disabled={!customSpotifyUrl.trim()}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-40"
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
