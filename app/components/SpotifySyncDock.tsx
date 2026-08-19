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
  Sparkles,
  Settings,
  Copy,
  Check,
  X,
  Disc3,
  Flame,
  RadioTower
} from "lucide-react";
import { 
  getSpotifyToken, 
  initiateSpotifyLogin, 
  disconnectSpotify, 
  searchSpotifyTracks, 
  playSpotifyTrack, 
  pauseSpotifyPlayback, 
  seekSpotifyPlayback,
  getSpotifyClientId,
  setCustomSpotifyClientId,
  isSpotifyConfigured,
  getSpotifyRedirectUri
} from "@/lib/spotify";
import { updateSpotifySyncState, type Room, type SpotifySyncState } from "@/lib/rooms";

interface SpotifySyncDockProps {
  room: Room;
  isHost: boolean;
  currentUserUid: string;
}

// ── Quick Party Presets for Instant 1-Tap DJ Queueing ──────────────────────────
const QUICK_PARTY_PRESETS = [
  {
    id: "4HlFJV71xXKIGcU3kRyttv",
    uri: "spotify:track:4HlFJV71xXKIGcU3kRyttv",
    name: "O Sanam",
    artist: "Lucky Ali",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27341e97d195a6ad5dbe888c3a1",
    durationMs: 226000,
  },
  {
    id: "5fqGgYV8XbXvT8Z8L6Qv2I",
    uri: "spotify:track:5fqGgYV8XbXvT8Z8L6Qv2I",
    name: "Apna Bana Le",
    artist: "Arijit Singh, Sachin-Jigar",
    albumArt: "https://i.scdn.co/image/ab67616d0000b273d2a7bc7e954efb5ef60d5b5b",
    durationMs: 261000,
  },
  {
    id: "3yHyi9c165DHvL8r999999",
    uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b",
    name: "Blinding Lights",
    artist: "The Weeknd",
    albumArt: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
    durationMs: 200000,
  },
  {
    id: "2qpmMpWLR9EKRsiQm9q3V2",
    uri: "spotify:track:2qpmMpWLR9EKRsiQm9q3V2",
    name: "Lover",
    artist: "Diljit Dosanjh",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27301bcfeae3a2be1fc64b4c730",
    durationMs: 191000,
  },
];

function extractTrackId(uriOrUrl: string): string {
  if (!uriOrUrl) return "";
  if (uriOrUrl.startsWith("spotify:track:")) {
    return uriOrUrl.replace("spotify:track:", "");
  }
  const match = uriOrUrl.match(/track\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  return uriOrUrl.trim();
}

export default function SpotifySyncDock({ room, isHost, currentUserUid }: SpotifySyncDockProps) {
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);
  const [progressMs, setProgressMs] = useState<number>(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [customTrackUrl, setCustomTrackUrl] = useState("");
  
  // Spotify Client ID Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState("");
  const [copiedUri, setCopiedUri] = useState(false);

  const syncState = room.spotifySyncState;
  const lastSyncedTrackRef = useRef<string | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check Spotify Token & Client ID on Mount
  useEffect(() => {
    setToken(getSpotifyToken());
    setInputClientId(getSpotifyClientId());
  }, []);

  // ── Listener Auto-Sync Engine ──────────────────────────────────────────────
  useEffect(() => {
    if (!syncState) return;

    const now = Date.now();
    const elapsed = now - syncState.startedAt;
    const offset = Math.abs(elapsed - progressMs);
    setSyncOffsetMs(offset);

    if (syncState.isPlaying && token && !isHost) {
      if (lastSyncedTrackRef.current !== syncState.activeTrackUri) {
        lastSyncedTrackRef.current = syncState.activeTrackUri;
        playSpotifyTrack(syncState.activeTrackUri, elapsed);
      }
    } else if (!syncState.isPlaying && token && !isHost) {
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

  // ── Connect Spotify Trigger ────────────────────────────────────────────────
  const handleConnect = () => {
    if (!isSpotifyConfigured()) {
      setShowConfigModal(true);
      return;
    }
    initiateSpotifyLogin(window.location.pathname);
  };

  const handleSaveConfigAndConnect = () => {
    if (!inputClientId.trim()) return;
    setCustomSpotifyClientId(inputClientId.trim());
    setShowConfigModal(false);
    initiateSpotifyLogin(window.location.pathname);
  };

  const handleCopyUri = () => {
    const uri = getSpotifyRedirectUri();
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  // ── Host Search Spotify ───────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchSpotifyTracks(searchQuery.trim());
    if (results.length > 0) {
      setSearchResults(results);
    } else {
      // If Web API search returns empty or token lacks search permissions, fall back to filtered presets
      const q = searchQuery.toLowerCase();
      const fallback = QUICK_PARTY_PRESETS.filter(
        p => p.name.toLowerCase().includes(q) || p.artist.toLowerCase().includes(q)
      );
      setSearchResults(fallback);
    }
    setIsSearching(false);
  };

  // ── Host Controls Broadcast ───────────────────────────────────────────────
  const handleHostPlayTrack = async (track: any) => {
    setShowSearchModal(false);
    const uri = track.uri || `spotify:track:${track.id}`;
    const newSyncState: SpotifySyncState = {
      activeTrackUri: uri,
      trackName: track.name,
      artistName: track.artists?.map((a: any) => a.name).join(", ") || track.artist || "Unknown Artist",
      albumArt: track.album?.images?.[0]?.url || track.albumArt || "",
      startedAt: Date.now(),
      isPlaying: true,
      hostUid: currentUserUid,
      durationMs: track.duration_ms || track.durationMs || 180000,
    };

    // 1. Attempt remote play on Host's Spotify if token exists
    if (token) {
      await playSpotifyTrack(uri, 0);
    }
    // 2. Broadcast timestamp to Firebase Realtime / Firestore
    await updateSpotifySyncState(room.id, newSyncState);
  };

  const handleHostCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trackId = extractTrackId(customTrackUrl.trim());
    if (!trackId) return;

    handleHostPlayTrack({
      id: trackId,
      uri: `spotify:track:${trackId}`,
      name: "Spotify Custom Selection",
      artist: "Selected Track",
      albumArt: "",
      durationMs: 210000,
    });
    setCustomTrackUrl("");
  };

  const handleHostTogglePlay = async () => {
    if (!syncState) return;

    const nextPlaying = !syncState.isPlaying;
    if (nextPlaying) {
      if (token) {
        await playSpotifyTrack(syncState.activeTrackUri, progressMs);
      }
      await updateSpotifySyncState(room.id, {
        ...syncState,
        isPlaying: true,
        startedAt: Date.now() - progressMs,
      });
    } else {
      if (token) {
        await pauseSpotifyPlayback();
      }
      await updateSpotifySyncState(room.id, {
        ...syncState,
        isPlaying: false,
      });
    }
  };

  const fmtMs = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const totalDurationMs = syncState?.durationMs || 210000;
  const progressPercent = Math.min(100, (progressMs / totalDurationMs) * 100);
  const activeTrackId = syncState ? extractTrackId(syncState.activeTrackUri) : "";

  return (
    <div className="bg-neutral-950 border border-neutral-800 p-3.5 font-mono text-white space-y-3 shadow-xl">
      {/* Top Protocol Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span className="font-bold tracking-widest text-[#1DB954] uppercase flex items-center gap-1.5">
            <Disc3 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" style={{ animationDuration: "6s" }} />
            // SPOTIFY DJ PARTY · LIVE MIC & MUSIC SYNC
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {isHost && (
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="border border-[#1DB954] bg-[#1DB954] text-black font-bold px-2.5 py-1 uppercase tracking-wider hover:bg-[#1ed760] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              <span>[ DJ QUEUE TRACK ]</span>
            </button>
          )}

          {token ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[#1DB954] border border-[#1DB954]/40 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                SPOTIFY SYNC ACTIVE
              </span>
              <button
                type="button"
                onClick={() => {
                  disconnectSpotify();
                  setToken(null);
                }}
                className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                title="Disconnect Spotify"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="border border-neutral-800 hover:border-[#1DB954] bg-black text-neutral-300 hover:text-[#1DB954] px-2 py-0.5 uppercase tracking-wider transition-colors cursor-pointer"
            >
              [ CONNECT ACCOUNT ]
            </button>
          )}
        </div>
      </div>

      {/* Now Playing Monitor */}
      {syncState ? (
        <div className="space-y-3">
          <div className="bg-black border border-neutral-900 p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-[200px]">
              {syncState.albumArt ? (
                <img
                  src={syncState.albumArt}
                  alt={syncState.trackName}
                  className="w-12 h-12 border border-neutral-800 object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
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
                    ? ">> TRANSMITTING DJ PLAYBACK TIMESTAMP"
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
                  title={syncState.isPlaying ? "Pause Broadcast" : "Resume Broadcast"}
                >
                  {syncState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="px-2.5 py-2 border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:border-white font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Disc3 className="w-3 h-3 text-[#1DB954]" />
                  <span>CHANGE TRACK</span>
                </button>
              </div>
            )}
          </div>

          {/* Embedded Spotify Interactive Player */}
          {activeTrackId && (
            <div className="border border-neutral-900 overflow-hidden bg-black">
              <iframe
                src={`https://open.spotify.com/embed/track/${activeTrackId}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="w-full bg-black"
              />
            </div>
          )}
        </div>
      ) : (
        /* Standby state when no track is playing */
        <div className="bg-black border border-neutral-900 p-5 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2">
              <RadioTower className="w-4 h-4 text-[#1DB954] animate-pulse" />
              SPOTIFY DJ GRID STANDBY
            </p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
              {isHost 
                ? "You are the Room DJ. Queue any song to start synchronized co-listening for all listeners."
                : "Waiting for Room DJ to drop the first track..."}
            </p>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="border border-[#1DB954] bg-[#1DB954] text-black font-bold px-4 py-2 text-xs uppercase tracking-widest hover:bg-[#1ed760] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-lg"
            >
              <Search className="w-3.5 h-3.5" />
              <span>[ SELECT & BROADCAST TRACK ]</span>
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

      {/* ── Spotify App Configuration Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-white max-w-md w-full p-5 font-mono text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1DB954] flex items-center gap-2">
                <Settings className="w-4 h-4" />
                // SPOTIFY DEVELOPER SETUP
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 leading-relaxed">
              <p>
                To enable 1-tap Spotify co-listening with $0 server cost, configure your Spotify Client ID.
              </p>
              
              <div className="p-2.5 border border-neutral-800 bg-black space-y-1.5">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">
                  1. REQUIRED REDIRECT URI:
                </span>
                <div className="flex items-center justify-between bg-neutral-900 p-2 border border-neutral-800 text-[10px] text-white">
                  <span className="truncate">{getSpotifyRedirectUri()}</span>
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="text-xs hover:text-[#1DB954] cursor-pointer ml-2"
                  >
                    {copiedUri ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">
                  2. ENTER SPOTIFY CLIENT ID:
                </span>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="Paste your 32-character Client ID..."
                  className="w-full bg-black border border-neutral-800 focus:border-[#1DB954] text-xs p-2.5 text-white outline-none"
                />
              </div>

              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#1DB954] hover:underline flex items-center gap-1 font-bold pt-1"
              >
                <span>OPEN SPOTIFY DEVELOPER DASHBOARD</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
              <button
                type="button"
                onClick={handleSaveConfigAndConnect}
                disabled={!inputClientId.trim()}
                className="flex-1 py-3 border border-[#1DB954] bg-[#1DB954] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#1ed760] transition-colors disabled:opacity-40 cursor-pointer"
              >
                [ SAVE & CONNECT SPOTIFY ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Host Track Search & DJ Queue Modal ── */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white max-w-lg w-full p-5 font-mono text-white space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1DB954] flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-[#1DB954]" />
                // SPOTIFY DJ QUEUE SELECTION
              </span>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            {/* Direct URL Paste Form */}
            <form onSubmit={handleHostCustomUrl} className="space-y-1.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">
                PASTE SPOTIFY TRACK LINK / URI:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTrackUrl}
                  onChange={(e) => setCustomTrackUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/... or spotify:track:..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-[#1DB954] text-xs p-2 text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={!customTrackUrl.trim()}
                  className="px-3 py-2 border border-white bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-30 cursor-pointer shrink-0"
                >
                  BROADCAST
                </button>
              </div>
            </form>

            <div className="relative border-t border-neutral-900 pt-3">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block mb-1.5">
                OR SEARCH SPOTIFY CATALOG:
              </span>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song title or artist (e.g. Lucky Ali, Arijit, Weekend)..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-[#1DB954] text-xs p-2.5 text-white outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 border border-[#1DB954] bg-[#1DB954] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#1ed760] transition-colors cursor-pointer shrink-0"
                >
                  {isSearching ? "..." : "SEARCH"}
                </button>
              </form>
            </div>

            {/* Quick Presets / Results */}
            <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-neutral-900 pr-1 max-h-60">
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest block pt-1">
                {searchResults.length > 0 ? "SEARCH RESULTS:" : "POPULAR DJ PRESETS:"}
              </span>
              {(searchResults.length > 0 ? searchResults : QUICK_PARTY_PRESETS).map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleHostPlayTrack(t)}
                  className="pt-2 flex items-center justify-between gap-3 hover:bg-neutral-950 p-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {(t.album?.images?.[0]?.url || t.albumArt) && (
                      <img
                        src={t.album?.images?.[0]?.url || t.albumArt}
                        alt={t.name}
                        className="w-9 h-9 object-cover border border-neutral-800 shrink-0"
                      />
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white uppercase truncate">{t.name}</p>
                      <p className="text-[10px] text-neutral-400 uppercase truncate">
                        {t.artists?.map((a: any) => a.name).join(", ") || t.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="border border-[#1DB954] bg-[#1DB954] text-black font-bold text-[10px] px-2.5 py-1 uppercase tracking-wider shrink-0 hover:bg-[#1ed760]"
                  >
                    PLAY
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
