"use client";

/**
 * app/components/spaces/GatherBottomDock.tsx
 * ─────────────────────────────────────────────────────
 * Authentic Gather.town Bottom Floating Dock & Control Pill
 * Replicating the exact UI from user reference photos:
 * - Bottom-Left Pill: Avatar, Name, Status, Mic, Cam, Screen, Hand, Emotes
 * - Bottom-Right Toolbar: Build Hammer, Whiteboard, Arcade, Chat, Participants
 */

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Hand,
  Smile,
  Hammer,
  MessageSquare,
  Users,
  ChevronUp,
  Edit2,
  Coffee,
  Check,
  Gamepad2,
  Edit3,
  Flame,
  Sparkles,
} from "lucide-react";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface GatherBottomDockProps {
  localAvatar: SpatialAvatar;
  participantCount: number;
  isDecorateMode: boolean;
  onToggleDecorateMode: () => void;
  isRightDrawerOpen: boolean;
  rightDrawerTab: "chat" | "participants";
  onToggleRightDrawer: (tab: "chat" | "participants") => void;
  onOpenArcade: () => void;
  onOpenWhiteboard: () => void;
  onSendEmote: (emote: string) => void;
  onToggleHandRaise: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateHandle?: (newHandle: string) => void;
}

const GATHER_QUICK_EMOTES = ["👏", "❤️", "🎉", "👍", "😂", "🔥", "☕", "👋"];

const STATUS_PRESETS = [
  { label: "Available", icon: "🟢", desc: "Open to conversations & syncs" },
  { label: "In a meeting", icon: "🟡", desc: "Currently in a call or private rug" },
  { label: "Focusing", icon: "🟣", desc: "Deep work (whisper mode)" },
  { label: "Do Not Disturb", icon: "🔴", desc: "Please do not interrupt" },
  { label: "Grabbing Coffee", icon: "☕", desc: "Away from keyboard" },
];

export default function GatherBottomDock({
  localAvatar,
  participantCount,
  isDecorateMode,
  onToggleDecorateMode,
  isRightDrawerOpen,
  rightDrawerTab,
  onToggleRightDrawer,
  onOpenArcade,
  onOpenWhiteboard,
  onSendEmote,
  onToggleHandRaise,
  onUpdateStatus,
  onUpdateHandle,
}: GatherBottomDockProps) {
  // Mic & Camera state
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Menus
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localAvatar.handle);

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    spacesSfx.playKeyNote(next ? 1 : 4);
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    spacesSfx.playKeyNote(next ? 1 : 5);
  };

  const toggleScreen = () => {
    const next = !isScreenSharing;
    setIsScreenSharing(next);
    spacesSfx.playKeyNote(3);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && onUpdateHandle) {
      onUpdateHandle(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleSelectStatus = (status: string) => {
    onUpdateStatus(status);
    setStatusMenuOpen(false);
    spacesSfx.playKeyNote(2);
  };

  return (
    <>
      {/* ── 1. BOTTOM-LEFT FLOATING GATHER PILL ── */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-1.5 gap-2 select-none animate-in fade-in slide-in-from-bottom-2">
        {/* Gather Icon Badge */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-md">
          🍇
        </div>

        {/* User Identity Section */}
        <div className="relative flex items-center gap-2 pr-2 border-r border-neutral-800">
          {/* Avatar Circle with Online Dot */}
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-inner"
              style={{
                backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
              }}
            >
              {localAvatar.handle.charAt(1) || localAvatar.handle.charAt(0) || "U"}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-950 ${
                localAvatar.statusText === "Do Not Disturb"
                  ? "bg-rose-500"
                  : localAvatar.statusText === "In a meeting"
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
          </div>

          {/* Name & Status */}
          <div className="flex flex-col">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-20 px-1 py-0.5 rounded bg-neutral-900 text-[11px] font-mono text-white border border-cyan-400 outline-none"
                  autoFocus
                  onBlur={handleSaveName}
                />
                <button type="submit" className="text-cyan-400 text-xs">
                  <Check className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="text-xs font-mono font-bold text-white flex items-center gap-1 hover:text-cyan-300 cursor-pointer transition-colors max-w-[100px] truncate"
                title="Click to edit name"
              >
                <span className="truncate">{localAvatar.handle}</span>
                <Edit2 className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              </div>
            )}

            {/* Status Dropdown Trigger */}
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 text-left cursor-pointer transition-colors"
            >
              <span className="truncate max-w-[80px]">
                {localAvatar.statusText || "Available"}
              </span>
              <ChevronUp className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>

          {/* Status Picker Menu */}
          {statusMenuOpen && (
            <div className="absolute bottom-12 left-0 w-52 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2 py-1">
                Set Your Status
              </div>
              {STATUS_PRESETS.map((st) => (
                <button
                  key={st.label}
                  onClick={() => handleSelectStatus(st.label)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                    localAvatar.statusText === st.label
                      ? "bg-cyan-950/60 text-cyan-300 font-bold"
                      : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                  }`}
                >
                  <span>{st.icon}</span>
                  <div>
                    <div>{st.label}</div>
                    <div className="text-[9px] text-neutral-500 font-normal">{st.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AV Controls Section */}
        <div className="flex items-center gap-1 pr-1 border-r border-neutral-800">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-0.5 ${
              isMicMuted
                ? "bg-rose-950/40 text-rose-400 hover:bg-rose-900/40"
                : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 shadow-sm"
            }`}
            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Camera Toggle Button */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-0.5 ${
              isVideoOff
                ? "bg-rose-950/40 text-rose-400 hover:bg-rose-900/40"
                : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 shadow-sm"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share Button */}
          <button
            type="button"
            onClick={toggleScreen}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isScreenSharing
                ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <ScreenShare className="w-4 h-4" />
          </button>

          {/* Hand Raise Button [H] */}
          <button
            type="button"
            onClick={onToggleHandRaise}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              localAvatar.isHandRaised
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105"
                : "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900"
            }`}
            title="Raise / Lower Hand [H]"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Reaction Emote Bar (Gather detail from user photo) */}
        <div className="hidden sm:flex items-center gap-0.5">
          {GATHER_QUICK_EMOTES.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onSendEmote(em)}
              className="p-1.5 rounded-lg hover:bg-neutral-900 hover:scale-125 transition-all text-sm cursor-pointer"
              title={`React with ${em}`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. BOTTOM-RIGHT FLOATING TOOLBAR ── */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-1.5 gap-1.5 select-none animate-in fade-in slide-in-from-bottom-2">
        {/* Hammer / Build Tool (Furniture Decorator) */}
        <button
          type="button"
          onClick={onToggleDecorateMode}
          className={`p-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
            isDecorateMode
              ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20 scale-105"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
          title={isDecorateMode ? "Close Build Mode" : "Build / Place Furniture [Hammer]"}
        >
          <Hammer className="w-4 h-4" />
          <span className="hidden md:inline text-[11px]">Build</span>
        </button>

        {/* Whiteboard */}
        <button
          type="button"
          onClick={onOpenWhiteboard}
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
          title="Open Whiteboard"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Arcade */}
        <button
          type="button"
          onClick={onOpenArcade}
          className="p-2 rounded-xl text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition-all cursor-pointer"
          title="Play Retro Space Arcade"
        >
          <Gamepad2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-neutral-800 mx-0.5" />

        {/* Chat Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleRightDrawer("chat")}
          className={`p-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
            isRightDrawerOpen && rightDrawerTab === "chat"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
          title="Open Room Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Participants Drawer Toggle Button (Shows live participant count: e.g. "👥 75") */}
        <button
          type="button"
          onClick={() => onToggleRightDrawer("participants")}
          className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            isRightDrawerOpen && rightDrawerTab === "participants"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-neutral-300 hover:text-white hover:bg-neutral-900"
          }`}
          title="View Participants Directory"
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>{participantCount}</span>
        </button>
      </div>
    </>
  );
}
