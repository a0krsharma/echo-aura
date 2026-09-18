"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Tv,
  Volume2,
  VolumeX,
  Share2,
  Sparkles,
  Search,
  SkipForward,
  SkipBack,
  Loader2,
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";

export interface TelepartySyncState {
  videoId: string;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  startedByHandle: string;
}

interface TelepartyWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userHandle: string;
  isHost?: boolean;
  onBroadcastSpeech?: (text: string) => void;
  syncState?: TelepartySyncState;
  onUpdateSyncState?: (state: TelepartySyncState) => void;
  onOpenInviteFriends?: () => void;
  spaceId?: string;
}

const DYNAMIC_VIBES = [
  { label: "🔥 Party Hits", query: "party dance songs" },
  { label: "☕ 24/7 Lofi", query: "lofi hip hop radio live" },
  { label: "🪩 Club EDM", query: "club party dance edm mix" },
  { label: "💃 Bollywood Dance", query: "bollywood party dance songs" },
  { label: "🎂 Birthday Special", query: "happy birthday celebration songs" },
  { label: "🪐 Synthwave", query: "synthwave cyberpunk mix" },
];

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export default function TelepartyWatchModal({
  isOpen,
  onClose,
  userHandle,
  isHost = false,
  onBroadcastSpeech,
  syncState,
  onUpdateSyncState,
  onOpenInviteFriends,
  spaceId,
}: TelepartyWatchModalProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("jfKfPfyJRdk");
  const [videoTitle, setVideoTitle] = useState("Lofi Hip Hop Radio — Beats to Relax/Study");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [inviteToast, setInviteToast] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; channelTitle: string; thumbnail: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);

  const [embedOrigin, setEmbedOrigin] = useState("");

  // Suppress third-party Chrome extension errors (like Teleparty / content-youtube-embed)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmbedOrigin(window.location.origin);
    }

    const handleExtensionError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const file = event.filename || "";
      if (
        file.includes("chrome-extension://") ||
        file.includes("content-youtube-embed") ||
        msg.includes("This script should only be loaded in a browser extension")
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    window.addEventListener("error", handleExtensionError, true);
    return () => {
      window.removeEventListener("error", handleExtensionError, true);
    };
  }, []);

  // Sync with external state if passed
  useEffect(() => {
    if (syncState && syncState.videoId && syncState.videoId !== currentVideoId) {
      setCurrentVideoId(syncState.videoId);
      setVideoTitle(syncState.title || "Synchronized Watch Party");
      setIsPlaying(syncState.isPlaying);
    }
  }, [syncState, currentVideoId]);

  if (!isOpen) return null;

  const handleLoadVideo = (id: string, title?: string) => {
    spacesSfx.playKeyNote(4);
    setCurrentVideoId(id);
    const resolvedTitle = title || `YouTube Video (${id})`;
    setVideoTitle(resolvedTitle);
    setIsPlaying(true);

    const nextState: TelepartySyncState = {
      videoId: id,
      title: resolvedTitle,
      isPlaying: true,
      currentTime: 0,
      lastUpdated: Date.now(),
      startedByHandle: userHandle,
    };
    onUpdateSyncState?.(nextState);
    onBroadcastSpeech?.(`📺 @${userHandle} started Watch Party: "${resolvedTitle}"! Gather round to watch! 🍿`);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setSearchResults(data.results);
        }
      }
    } catch (err) {
      console.error("YouTube search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextVideo = async () => {
    spacesSfx.playKeyNote(6);
    if (searchResults.length > 0) {
      const curIdx = searchResults.findIndex((v) => v.id === currentVideoId);
      const nextIdx = (curIdx + 1) % searchResults.length;
      const nextVid = searchResults[nextIdx];
      handleLoadVideo(nextVid.id, nextVid.title);
      setInviteToast(`⏭️ NEXT VIDEO: "${nextVid.title}"`);
      setTimeout(() => setInviteToast(null), 3000);
      return;
    }

    // If no search results in memory, search dynamically for next party track
    try {
      setIsSearching(true);
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(videoTitle || "party bangers live")}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          setSearchResults(data.results);
          const nextVid = data.results.find((v: any) => v.id !== currentVideoId) || data.results[0];
          handleLoadVideo(nextVid.id, nextVid.title);
          setInviteToast(`⏭️ NEXT VIDEO: "${nextVid.title}"`);
          setTimeout(() => setInviteToast(null), 3000);
          return;
        }
      }
    } catch {} finally {
      setIsSearching(false);
    }
  };

  const handlePrevVideo = () => {
    spacesSfx.playKeyNote(3);
    if (searchResults.length > 0) {
      const curIdx = searchResults.findIndex((v) => v.id === currentVideoId);
      const prevIdx = (curIdx - 1 + searchResults.length) % searchResults.length;
      const prevVid = searchResults[prevIdx];
      handleLoadVideo(prevVid.id, prevVid.title);
      setInviteToast(`⏮️ PREVIOUS VIDEO: "${prevVid.title}"`);
      setTimeout(() => setInviteToast(null), 3000);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(inputUrl);
    if (id) {
      handleLoadVideo(id, `Custom Stream (${id})`);
      setInputUrl("");
    } else if (inputUrl.trim()) {
      await handleSearch(inputUrl.trim());
    }
  };

  const handleSendReaction = (emoji: string) => {
    spacesSfx.playKeyNote(1);
    const newReaction = {
      id: Math.random().toString(),
      emoji,
      x: Math.random() * 80 + 10,
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMiniMode
          ? "bottom-24 right-6 w-80 sm:w-96 shadow-2xl rounded-3xl overflow-hidden border border-purple-500/50 bg-neutral-950"
          : "inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      }`}
    >
      {/* Flying Reactions Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-10 text-3xl animate-bounce"
            style={{ left: `${r.x}%`, animationDuration: "1.8s" }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div
        className={`w-full bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl ${
          isMiniMode ? "h-auto" : "max-w-4xl max-h-[92vh]"
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase text-white tracking-wider">
                  Teleparty Cinema
                </span>
                <span className="text-[10px] bg-red-600 text-white font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  SYNC LIVE
                </span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400 truncate max-w-[220px] sm:max-w-md">
                {videoTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev Video Button */}
            <button
              onClick={handlePrevVideo}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Previous Video"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Next Video Button */}
            <button
              onClick={handleNextVideo}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Next Video"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* PiP Mini Mode Toggle */}
            <button
              onClick={() => setIsMiniMode(!isMiniMode)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title={isMiniMode ? "Expand to Full Screen" : "Minimize to Corner PiP"}
            >
              {isMiniMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Embed Player */}
        <div className="relative w-full aspect-video bg-black overflow-hidden group">
          <iframe
            key={currentVideoId}
            src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&mute=${
              isMuted ? "1" : "0"
            }${embedOrigin ? `&origin=${encodeURIComponent(embedOrigin)}` : ""}`}
            title={videoTitle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Co-Watching Controls & Reaction Bar */}
        <div className="p-3 sm:p-4 bg-neutral-900/60 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevVideo}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
              title="Previous Video"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextVideo}
              className="px-3 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-200 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Skip to Next YouTube Video"
            >
              <SkipForward className="w-4 h-4 text-red-400" />
              <span>Next Song / Video</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
              title={isMuted ? "Unmute Video" : "Mute Video"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                spacesSfx.playKeyNote(5);
                const watchUrl = typeof window !== "undefined"
                  ? `${window.location.origin}${window.location.pathname}?teleparty=${currentVideoId}`
                  : "";
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(watchUrl || window.location.href);
                }
                setInviteToast("✅ Watch Party link copied! Opening friends invite...");
                setTimeout(() => setInviteToast(null), 3500);
                if (onOpenInviteFriends) {
                  onOpenInviteFriends();
                }
                onBroadcastSpeech?.(`🍿 Watching "${videoTitle}" with @${userHandle}! Join our watch party!`);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/50 text-purple-200 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-purple-600/20"
              title="Copy Watch Party Link & Invite Friends"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Friends</span>
            </button>
          </div>

          {/* Invite Toast Notification */}
          {inviteToast && (
            <div className="w-full text-center py-1 px-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] rounded-xl animate-in fade-in slide-in-from-top-1">
              {inviteToast}
            </div>
          )}

          {/* Quick Reaction Emoji Bursts */}
          <div className="flex items-center gap-1">
            {["🍿", "🔥", "👏", "💖", "😂", "🎂"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-sm transition active:scale-125 cursor-pointer"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Search Section (Hidden in Mini Mode) */}
        {!isMiniMode && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-neutral-950">
            {/* Custom YouTube URL & Live Search Loader */}
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search any YouTube song/artist, or paste link (e.g., https://youtu.be/...)"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black rounded-xl transition cursor-pointer active:scale-95 shrink-0 shadow-lg shadow-red-600/30 flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Search / Play</span>
              </button>
            </form>

            {/* Dynamic Vibe Search Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {DYNAMIC_VIBES.map((vibe) => (
                <button
                  key={vibe.query}
                  type="button"
                  onClick={() => {
                    setActiveVibe(vibe.label);
                    setInputUrl(vibe.query);
                    handleSearch(vibe.query);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap transition cursor-pointer border ${
                    activeVibe === vibe.label
                      ? "bg-red-600 text-white border-red-500 shadow-sm"
                      : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800"
                  }`}
                >
                  {vibe.label}
                </button>
              ))}
            </div>

            {/* Dynamic Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-neutral-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Search Results ({searchResults.length} videos)</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">Tap to play & sync for room</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {searchResults.map((vid) => (
                    <button
                      key={vid.id}
                      onClick={() => handleLoadVideo(vid.id, vid.title)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer group ${
                        currentVideoId === vid.id
                          ? "border-red-500 bg-red-950/30 text-white shadow-md"
                          : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300"
                      }`}
                    >
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-16 h-12 rounded-xl object-cover shrink-0 border border-neutral-800 group-hover:scale-105 transition"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-bold truncate group-hover:text-white">
                          {vid.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">
                          {vid.channelTitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
