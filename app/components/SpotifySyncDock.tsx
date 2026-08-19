"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, 
  Play, 
  Pause, 
  Search, 
  Music, 
  Volume2, 
  ExternalLink, 
  CheckCircle2, 
  RotateCw,
  LogOut,
  Sparkles
} from "lucide-react";
import { 
  getSpotifyToken, 
  initiateSpotifyLogin, 
  disconnectSpotify, 
  searchSpotifyTracks, 
  playSpotifyTrack, 
  pauseSpotifyPlayback, 
  seekSpotifyPlayback 
} from "@/lib/spotify";
import { updateSpotifySyncState, type Room, type SpotifySyncState } from "@/lib/rooms";

interface SpotifySyncDockProps {
  room: Room;
  isHost: boolean;
  currentUserUid: string;
}

export default function SpotifySyncDock({ room, isHost, currentUserUid }: SpotifySyncDockProps) {
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);
  const [progressMs, setProgressMs] = useState<number>(0);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const syncState = room.spotifySyncState;
  const lastSyncedTrackRef = useRef<string | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check Spotify Token on Mount
  useEffect(() => {
    setToken(getSpotifyToken());
  }, []);

  // ── Listener Auto-Sync Engine ──────────────────────────────────────────────
  useEffect(() => {
    if (!token || !syncState || isHost) return;

    const now = Date.now();
    const elapsed = now - syncState.startedAt;
    const offset = Math.abs(elapsed - progressMs);
    setSyncOffsetMs(offset);

    if (syncState.isPlaying) {
      if (lastSyncedTrackRef.current !== syncState.activeTrackUri) {
        lastSyncedTrackRef.current = syncState.activeTrackUri;
        // Skip to exact elapsed timestamp
        playSpotifyTrack(syncState.activeTrackUri, elapsed);
      }
    } else {
      pauseSpotifyPlayback();
    }
  }, [syncState, token, isHost]);

  // ── Progress Bar Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (syncState && syncState.isPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - syncState.startedAt;
        setProgressMs(elapsed);
      }, 1000);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [syncState]);

  // ── Host Search Spotify ───────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchSpotifyTracks(searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
  };

  // ── Host Play Track & Broadcast State ─────────────────────────────────────
  const handleHostPlayTrack = async (track: any) => {
    const trackUri = track.uri;
    const durationMs = track.duration_ms || 210000;
    const startedAt = Date.now();

    // 1. Play on Host Spotify
    await playSpotifyTrack(trackUri, 0);

    // 2. Broadcast to Firebase Room State
    const payload: SpotifySyncState = {
      activeTrackUri: trackUri,
      trackName: track.name,
      artistName: track.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
      albumArt: track.album?.images?.[0]?.url || "",
      startedAt,
      isPlaying: true,
      hostUid: currentUserUid,
      durationMs,
    };

    await updateSpotifySyncState(room.id, payload);
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // ── Host Toggle Play/Pause ────────────────────────────────────────────────
  const handleHostTogglePlay = async () => {
    if (!syncState) return;

    if (syncState.isPlaying) {
      await pauseSpotifyPlayback();
      await updateSpotifySyncState(room.id, {
        ...syncState,
        isPlaying: false,
      });
    } else {
      const remainingStartedAt = Date.now() - progressMs;
      await playSpotifyTrack(syncState.activeTrackUri, progressMs);
      await updateSpotifySyncState(room.id, {
        ...syncState,
        startedAt: remainingStartedAt,
        isPlaying: true,
      });
    }
  };

  // Format Milliseconds to MM:SS
  const fmtMs = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const totalDurationMs = syncState?.durationMs || 210000;
  const progressPercent = Math.min(100, (progressMs / totalDurationMs) * 100);

  return (
    <div className="bg-neutral-950 border border-neutral-800 p-3.5 font-mono text-white space-y-3 shadow-xl">
      {/* Top Protocol Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span className="font-bold tracking-widest text-[#1DB954] uppercase">
            // SPOTIFY CO-LISTENING SYNC
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {token ? (
            <span className="text-[#1DB954] border border-[#1DB954]/40 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              SPOTIFY CONNECTED
            </span>
          ) : (
            <button
              type="button"
              onClick={() => initiateSpotifyLogin(window.location.pathname)}
              className="border border-[#1DB954] bg-[#1DB954] text-black font-bold px-2.5 py-1 uppercase tracking-wider hover:bg-[#1ed760] transition-colors cursor-pointer"
            >
              [ CONNECT SPOTIFY (1-TAP) ]
            </button>
          )}
        </div>
      </div>

      {/* Now Playing Monitor */}
      {syncState ? (
        <div className="bg-black border border-neutral-900 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 overflow-hidden">
            {syncState.albumArt ? (
              <img
                src={syncState.albumArt}
                alt={syncState.trackName}
                className="w-11 h-11 border border-neutral-800 object-cover shrink-0 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-neutral-500" />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white uppercase truncate tracking-wide">
                {syncState.trackName}
              </p>
              <p className="text-[10px] text-neutral-400 uppercase truncate">
                {syncState.artistName}
              </p>
              <span className="text-[9px] text-[#1DB954] tracking-widest block mt-0.5">
                {isHost
                  ? ">> TRANSMITTING PLAYBACK TIMESTAMP"
                  : `>> SYNC OFFSET: +${syncOffsetMs}ms (SYNCHRONIZED)`}
              </span>
            </div>
          </div>

          {/* Host Controls */}
          {isHost && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleHostTogglePlay}
                className="p-2 border border-white bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {syncState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="px-2.5 py-2 border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:border-white font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3 h-3" />
                <span>[ QUEUE TRACK ]</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Standby state when no track is playing */
        <div className="bg-black border border-neutral-900 p-4 text-center space-y-2">
          <p className="text-xs text-neutral-400 uppercase tracking-widest">
            &gt;&gt; SPOTIFY GRID STANDBY · NO ACTIVE TRACK QUEUED
          </p>
          {isHost && token && (
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="border border-[#1DB954] bg-[#1DB954] text-black font-bold px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-[#1ed760] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>[ SEARCH & BROADCAST TRACK ]</span>
            </button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {syncState && (
        <div className="space-y-1">
          <div className="w-full bg-neutral-900 h-1.5 overflow-hidden border border-neutral-800">
            <div
              className="bg-[#1DB954] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-neutral-500 tabular-nums">
            <span>{fmtMs(progressMs)}</span>
            <span>{fmtMs(totalDurationMs)}</span>
          </div>
        </div>
      )}

      {/* Host Track Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white max-w-lg w-full p-5 font-mono text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1DB954] flex items-center gap-2">
                <Search className="w-4 h-4" />
                // SPOTIFY TRACK SEARCH
              </span>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search song title or artist (e.g. Lucky Ali, Jagjit Singh, A.R. Rahman)..."
                className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-[#1DB954] text-xs p-2.5 text-white outline-none uppercase"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 border border-[#1DB954] bg-[#1DB954] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#1ed760] transition-colors cursor-pointer"
              >
                {isSearching ? "..." : "SEARCH"}
              </button>
            </form>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-neutral-900">
              {searchResults.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleHostPlayTrack(t)}
                  className="pt-2 flex items-center justify-between gap-3 hover:bg-neutral-950 p-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {t.album?.images?.[0]?.url && (
                      <img src={t.album.images[0].url} alt={t.name} className="w-9 h-9 object-cover border border-neutral-800" />
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white uppercase truncate">{t.name}</p>
                      <p className="text-[10px] text-neutral-400 uppercase truncate">
                        {t.artists?.map((a: any) => a.name).join(", ")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="border border-white bg-white text-black font-bold text-[10px] px-2.5 py-1 uppercase tracking-wider shrink-0"
                  >
                    BROADCAST
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
