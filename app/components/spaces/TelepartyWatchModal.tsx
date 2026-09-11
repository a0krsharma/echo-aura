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
}

const PRESET_CHANNELS = [
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio — Beats to Relax/Study",
    category: "Lofi & Chill",
    icon: "☕",
    badge: "24/7 LIVE",
  },
  {
    id: "5qap5aO4i9A",
    title: "Boiler Room & Club Rave Party Hits",
    category: "Club & Dance",
    icon: "🪩",
    badge: "PARTY BASS",
  },
  {
    id: "yJg-Y5byMMw",
    title: "Bollywood Party Dance Anthems 2026",
    category: "Party Bangers",
    icon: "💃",
    badge: "VIRAL",
  },
  {
    id: "nl62hhiBMOM",
    title: "Grand Happy Birthday Celebration Beats",
    category: "Birthday Special",
    icon: "🎂",
    badge: "CELEBRATION",
  },
  {
    id: "4xDzrJKXOOY",
    title: "Synthwave Cyberpunk Midnight Ride",
    category: "Chill Vibe",
    icon: "🪐",
    badge: "RETRO",
  },
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
}: TelepartyWatchModalProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("jfKfPfyJRdk");
  const [videoTitle, setVideoTitle] = useState("Lofi Hip Hop Radio — Beats to Relax/Study");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [isMiniMode, setIsMiniMode] = useState(false);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(inputUrl);
    if (id) {
      handleLoadVideo(id, `Custom Stream (${id})`);
      setInputUrl("");
    } else {
      alert("Please enter a valid YouTube link or 11-character video ID!");
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
            src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&mute=${
              isMuted ? "1" : "0"
            }`}
            title={videoTitle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Co-Watching Controls & Reaction Bar */}
        <div className="p-3 sm:p-4 bg-neutral-900/60 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
              title={isMuted ? "Unmute Video" : "Mute Video"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                spacesSfx.playKeyNote(3);
                onBroadcastSpeech?.(`🍿 Watching "${videoTitle}" with @${userHandle}! Come sit with us!`);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Space</span>
            </button>
          </div>

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

        {/* Input & Presets Section (Hidden in Mini Mode) */}
        {!isMiniMode && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-neutral-950">
            {/* Custom YouTube URL Loader */}
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Paste YouTube Link or Video ID (e.g., https://youtu.be/...)"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black rounded-xl transition cursor-pointer active:scale-95 shrink-0 shadow-lg shadow-red-600/30"
              >
                Play & Sync
              </button>
            </form>

            {/* Curated Party Streams */}
            <div>
              <div className="text-[11px] font-mono font-bold uppercase text-neutral-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Curated Party Stations & Playlists</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => handleLoadVideo(ch.id, ch.title)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer group ${
                      currentVideoId === ch.id
                        ? "border-red-500 bg-red-950/30 text-white shadow-md"
                        : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-black/40 border border-neutral-800 group-hover:scale-110 transition">
                        {ch.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold truncate group-hover:text-white">
                          {ch.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {ch.category}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 shrink-0 ml-2">
                      {ch.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
