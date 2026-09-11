"use client";

/**
 * app/components/spaces/GatherBottomDock.tsx
 * ─────────────────────────────────────────────────────
 * Authentic Gather.town Bottom Floating Dock & Control Pill
 * Replicating the exact UI from user reference photos:
 * - Images 1, 2, 3: "💬 Meetings", "💬 Chat", "⚡ Activity" Tab Bar
 * - Bottom-Left Pill: Avatar, Name, Availability (Active, Busy, Away), Focus note (Image 5)
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
  Headphones,
  Calendar,
  Zap,
  Clock,
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
  onOpenMeetingModal: () => void;
  onOpenActivityMap: () => void;
  onSendEmote: (emote: string) => void;
  onToggleHandRaise: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateHandle?: (newHandle: string) => void;
}

const GATHER_QUICK_EMOTES = ["👏", "❤️", "🎉", "👍", "😂", "🔥", "☕", "👋"];

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
  onOpenMeetingModal,
  onOpenActivityMap,
  onSendEmote,
  onToggleHandRaise,
  onUpdateStatus,
  onUpdateHandle,
}: GatherBottomDockProps) {
  // Mic & Camera state
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Availability & Deep Focus (From Image 5: "Set Your Availability")
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [availability, setAvailability] = useState<"active" | "busy" | "away">("active");
  const [focusNote, setFocusNote] = useState("Deep focus until 12:30");
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Edit Name
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

  const handleSelectAvailability = (mode: "active" | "busy" | "away") => {
    setAvailability(mode);
    const label =
      mode === "busy" ? "🎧 Busy" : mode === "away" ? "🟠 Away" : "🟢 Active";
    onUpdateStatus(`${label}${mode === "busy" ? ` • ${focusNote}` : ""}`);
    spacesSfx.playKeyNote(mode === "busy" ? 1 : 3);
  };

  const handleSaveFocusNote = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingNote(false);
    onUpdateStatus(`🎧 Busy • ${focusNote}`);
    spacesSfx.playKeyNote(2);
  };

  return (
    <>
      {/* ── TOP-CENTER GATHER APP TABS (Images 1, 2, 3) ── */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-neutral-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-800 shadow-xl select-none">
        {/* Meetings Tab (Image 1) */}
        <button
          type="button"
          onClick={onOpenMeetingModal}
          className="px-3 py-1 rounded-xl text-xs font-mono font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Open Video Meetings Grid"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Meetings</span>
        </button>

        {/* Chat Tab (Image 3) */}
        <button
          type="button"
          onClick={() => onToggleRightDrawer("chat")}
          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
            isRightDrawerOpen && rightDrawerTab === "chat"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "text-neutral-300 hover:text-white hover:bg-neutral-900"
          }`}
          title="Open Space Chat"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chat</span>
        </button>

        {/* Activity Tab (Image 2) */}
        <button
          type="button"
          onClick={onOpenActivityMap}
          className="px-3 py-1 rounded-xl text-xs font-mono font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Live Birds-Eye Office Map"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Activity</span>
        </button>
      </div>

      {/* ── 1. BOTTOM-LEFT FLOATING GATHER PILL ── */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-1.5 gap-2 select-none animate-in fade-in slide-in-from-bottom-2">
        {/* Gather Icon Badge */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-md">
          🍇
        </div>

        {/* User Identity & Availability Section */}
        <div className="relative flex items-center gap-2 pr-2 border-r border-neutral-800">
          {/* Avatar Circle with Status Indicator */}
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
                availability === "busy"
                  ? "bg-amber-500"
                  : availability === "away"
                  ? "bg-rose-500"
                  : "bg-emerald-400"
              }`}
            />
          </div>

          {/* Name & Availability Pill (Image 5: "Set Your Availability") */}
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

            {/* Availability Trigger (Active, Busy, Away) */}
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 text-left cursor-pointer transition-colors"
            >
              <span className="truncate max-w-[90px]">
                {availability === "busy"
                  ? "🎧 Busy"
                  : availability === "away"
                  ? "🟠 Away"
                  : "🟢 Active"}
              </span>
              <ChevronUp className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>

          {/* Availability & Deep Focus Popup (Image 5 Modal) */}
          {statusMenuOpen && (
            <div className="absolute bottom-12 left-0 w-64 bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl p-3 space-y-3 z-50 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider">
                  Set Your Availability
                </span>
                <button
                  onClick={() => setStatusMenuOpen(false)}
                  className="text-neutral-500 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 3 Availability Buttons (From Image 5) */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleSelectAvailability("active")}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                    availability === "active"
                      ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  🟢 Active
                </button>

                <button
                  onClick={() => handleSelectAvailability("busy")}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                    availability === "busy"
                      ? "bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  🎧 Busy
                </button>

                <button
                  onClick={() => handleSelectAvailability("away")}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                    availability === "away"
                      ? "bg-rose-950/80 border border-rose-500/50 text-rose-300 shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  🟠 Away
                </button>
              </div>

              {/* Focus message tooltip (Image 5: "💡 Deep focus until 12:30") */}
              {availability === "busy" && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between">
                    <span>Deep Focus Context:</span>
                    <Headphones className="w-3 h-3 text-amber-400" />
                  </div>

                  {isEditingNote ? (
                    <form onSubmit={handleSaveFocusNote} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={focusNote}
                        onChange={(e) => setFocusNote(e.target.value)}
                        className="w-full px-2 py-1 rounded-xl bg-neutral-900 text-xs font-mono text-white border border-amber-400 outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="p-1 rounded bg-amber-400 text-black text-xs font-bold"
                      >
                        ✓
                      </button>
                    </form>
                  ) : (
                    <div
                      onClick={() => setIsEditingNote(true)}
                      className="p-2 rounded-xl bg-black/80 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
                      title="Click to edit focus message"
                    >
                      <span className="truncate">💡 {focusNote}</span>
                      <Edit2 className="w-3 h-3 text-amber-400 shrink-0" />
                    </div>
                  )}
                  <p className="text-[9px] text-neutral-500 font-mono">
                    Colleagues will see you are focused and proximity audio is whispered.
                  </p>
                </div>
              )}
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

        {/* Quick Reaction Emote Bar */}
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

        {/* Participants Drawer Toggle Button */}
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
