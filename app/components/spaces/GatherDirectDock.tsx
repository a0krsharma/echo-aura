"use client";

/**
 * app/components/spaces/GatherDirectDock.tsx
 * ─────────────────────────────────────────────────────
 * Authentic Gather 1-on-1 / Small Group Mini-Dock (Image 3)
 * Features:
 * - Direct video tiles with active speaker wave
 * - "+" Button to invite nearby teammates
 * - Direct message input & quick mute/cam controls
 */

import React, { useState } from "react";
import {
  X,
  Plus,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Info,
} from "lucide-react";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface GatherDirectDockProps {
  isOpen: boolean;
  onClose: () => void;
  targetAvatar: SpatialAvatar | null;
  localAvatar: SpatialAvatar;
  onOpenFullMeeting: () => void;
  onOpenChat: () => void;
}

export default function GatherDirectDock({
  isOpen,
  onClose,
  targetAvatar,
  localAvatar,
  onOpenFullMeeting,
  onOpenChat,
}: GatherDirectDockProps) {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  if (!isOpen || !targetAvatar) return null;

  return (
    <div className="fixed top-16 left-4 z-40 animate-in slide-in-from-left duration-200">
      <div className="w-80 bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white">
              Direct Conversation
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenFullMeeting}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Expand to Full Meeting Grid"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2 Video Tiles Side-by-Side (From Image 3) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Target Avatar Tile */}
          <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner"
              style={{ backgroundColor: targetAvatar.hoodieColor || "#ec4899" }}
            >
              {targetAvatar.handle.charAt(1) || "T"}
            </div>
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono font-bold text-white">
              {targetAvatar.handle}
            </div>
          </div>

          {/* You Tile */}
          <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-cyan-500/50 overflow-hidden flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner"
              style={{
                backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
              }}
            >
              {localAvatar.handle.charAt(1) || "U"}
            </div>
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono font-bold text-cyan-300">
              You
            </div>
          </div>
        </div>

        {/* Controls and Invite Teammate Button */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-1.5 rounded-xl text-xs ${
                isMicMuted ? "bg-rose-950 text-rose-300" : "bg-neutral-900 text-emerald-400"
              }`}
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-1.5 rounded-xl text-xs ${
                isVideoOff ? "bg-rose-950 text-rose-300" : "bg-neutral-900 text-emerald-400"
              }`}
            >
              {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onOpenChat}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs cursor-pointer"
              title="Open Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onOpenFullMeeting}
            className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center gap-1 cursor-pointer"
            title="Invite more teammates"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>Invite</span>
          </button>
        </div>
      </div>
    </div>
  );
}
