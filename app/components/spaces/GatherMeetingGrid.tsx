"use client";

/**
 * app/components/spaces/GatherMeetingGrid.tsx
 * ─────────────────────────────────────────────────────
 * Authentic Gather.town Video Meeting Grid (Image 1)
 * Features:
 * - Header: Room title (e.g. "📅 Design Review"), lock icon, layout switchers (PiP, Split, Grid)
 * - Video Call Grid with realistic participant video/avatar tiles
 * - Audio visualizer waveforms & speaking indicators
 * - Bottom Control Bar: Jukebox note, mic toggle, video toggle, emoji reactions, and End Call
 */

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Lock,
  Grid,
  Columns2,
  Maximize2,
  Minimize2,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Smile,
  Volume2,
  MoreVertical,
  Users,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface MeetingParticipant {
  uid: string;
  name: string;
  role: string;
  avatarColor: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
}

interface GatherMeetingGridProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle?: string;
  isPrivate?: boolean;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onSendEmote?: (emote: string) => void;
}

const DEFAULT_PARTICIPANTS: MeetingParticipant[] = [
  {
    uid: "p_natasha",
    name: "Natasha",
    role: "Lead Designer",
    avatarColor: "#ec4899",
    isSpeaking: true,
    isMuted: false,
    isVideoOn: true,
  },
  {
    uid: "p_cameron",
    name: "Cameron",
    role: "Engineering",
    avatarColor: "#38bdf8",
    isSpeaking: false,
    isMuted: false,
    isVideoOn: true,
  },
  {
    uid: "p_scott",
    name: "Scott",
    role: "Product Manager",
    avatarColor: "#10b981",
    isSpeaking: false,
    isMuted: true,
    isVideoOn: true,
  },
  {
    uid: "p_melodie",
    name: "Melodie",
    role: "UX Researcher",
    avatarColor: "#f59e0b",
    isSpeaking: false,
    isMuted: false,
    isVideoOn: true,
  },
  {
    uid: "p_eva",
    name: "Eva",
    role: "Marketing Lead",
    avatarColor: "#8b5cf6",
    isSpeaking: true,
    isMuted: false,
    isVideoOn: true,
  },
  {
    uid: "p_joshua",
    name: "Joshua",
    role: "Fullstack Eng",
    avatarColor: "#06b6d4",
    isSpeaking: false,
    isMuted: true,
    isVideoOn: true,
  },
];

const MEETING_EMOJIS = ["👏", "❤️", "👍", "🎉", "😂", "✋", "🔥", "💡"];

export default function GatherMeetingGrid({
  isOpen,
  onClose,
  meetingTitle = "Design Review",
  isPrivate = true,
  localAvatar,
  remoteAvatars,
  onSendEmote,
}: GatherMeetingGridProps) {
  const [layoutMode, setLayoutMode] = useState<"grid" | "split" | "pip">("grid");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>("Natasha");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participants, setParticipants] = useState<MeetingParticipant[]>(DEFAULT_PARTICIPANTS);

  // Random speaking waveform simulator for lifelike immersion
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setParticipants((prev) =>
        prev.map((p) => {
          const shouldSpeak = Math.random() > 0.65;
          return { ...p, isSpeaking: shouldSpeak };
        })
      );
    }, 2800);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMic = () => {
    setIsMicMuted(!isMicMuted);
    spacesSfx.playKeyNote(!isMicMuted ? 1 : 4);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    spacesSfx.playKeyNote(!isVideoOff ? 1 : 5);
  };

  const triggerReaction = (em: string) => {
    spacesSfx.playEmotePop();
    onSendEmote?.(em);
    setShowEmojiPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Meeting Header Bar (From Image 1) */}
        <div className="px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center gap-2 text-xs font-mono font-bold text-white shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{meetingTitle}</span>
            </div>
            {isPrivate && (
              <span className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400 text-[10px] font-mono flex items-center gap-1 font-bold">
                <Lock className="w-3 h-3" />
                <span>LOCKED ROOM</span>
              </span>
            )}
            <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{participants.length + 1} present</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Layout switchers */}
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === "grid" ? "bg-cyan-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("split")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === "split" ? "bg-cyan-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
              title="Split View"
            >
              <Columns2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Grid Canvas (Image 1: 6 Participants + You) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div
            className={`grid gap-3 ${
              layoutMode === "split"
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {/* You (Self tile) */}
            <div className="relative aspect-video rounded-2xl bg-neutral-900 border-2 border-cyan-500/50 shadow-lg overflow-hidden flex items-center justify-center group">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-inner"
                style={{
                  backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
                }}
              >
                {localAvatar.handle.charAt(1) || "U"}
              </div>
              {/* Bottom label */}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-sm border border-neutral-800 text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                <span>{localAvatar.handle} (You)</span>
                {isMicMuted ? (
                  <MicOff className="w-3 h-3 text-rose-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>

            {/* Remote Participants */}
            {participants.map((p) => (
              <div
                key={p.uid}
                className={`relative aspect-video rounded-2xl bg-neutral-900 overflow-hidden flex items-center justify-center transition-all ${
                  p.isSpeaking
                    ? "border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] ring-2 ring-emerald-500/30"
                    : "border border-neutral-800"
                }`}
              >
                {/* Simulated Stylized Video Camera Surface */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-inner"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name.charAt(0)}
                </div>

                {/* Animated Audio Waveform for active speaker */}
                {p.isSpeaking && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 bg-black/60 px-2 py-1 rounded-lg">
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce delay-75" />
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce delay-150" />
                  </div>
                )}

                {/* Bottom Tag */}
                <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-sm border border-neutral-800 text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                  <span>{p.name}</span>
                  {p.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Control Dock (From Image 1 bottom bar) */}
        <div className="p-3 sm:p-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => spacesSfx.playFocusBell()}
              className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Ambient Music"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="More Meeting Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Core AV Pill Controls */}
          <div className="flex items-center gap-2">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-2xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                isMicMuted
                  ? "bg-rose-950/80 border border-rose-700 text-rose-300"
                  : "bg-emerald-950/80 border border-emerald-600 text-emerald-300"
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <ChevronUp className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Video Camera Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-2xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                isVideoOff
                  ? "bg-rose-950/80 border border-rose-700 text-rose-300"
                  : "bg-emerald-950/80 border border-emerald-600 text-emerald-300"
              }`}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <ChevronUp className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Emoji Reaction */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 rounded-2xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-amber-300 transition-colors cursor-pointer shadow-md"
                title="React in Meeting"
              >
                <Smile className="w-4 h-4" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-neutral-950 border border-neutral-800 p-2 rounded-2xl shadow-2xl flex items-center gap-1 z-50 animate-in zoom-in-95">
                  {MEETING_EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => triggerReaction(em)}
                      className="p-1.5 hover:scale-125 transition-transform text-lg cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leave Meeting Button */}
          <button
            onClick={() => {
              spacesSfx.playSitPop();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/20 active:scale-95"
          >
            Leave Call
          </button>
        </div>
      </div>
    </div>
  );
}
