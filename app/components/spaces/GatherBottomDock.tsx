"use client";

/**
 * app/components/spaces/GatherBottomDock.tsx
 * ─────────────────────────────────────────────────────
 * Streamlined, Simple & Essential Space Action Dock
 * 
 * Provides:
 * - Avatar badge with 1-click handle edit
 * - Instant 1-tap quick reactions (👋, 🎉, ❤️, 🔥, 👏, 😂)
 * - Hand raise toggle (✋)
 * - Direct 1-tap "🎲 Table Games" launcher (Ludo, UNO, Bottle, RPS)
 * - 💬 Chat drawer toggle
 * - 👥 Participants counter drawer toggle
 * - 🔗 1-click Share/Invite button
 * - Clean overflow menu for secondary tools (Whiteboard, Build mode)
 */

import React, { useState } from "react";
import {
  Hand,
  MessageSquare,
  Users,
  Share2,
  Gamepad2,
  Sparkles,
  Edit2,
  Check,
  MoreHorizontal,
  Edit3,
  Hammer,
  Dices,
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
  onOpenPartyGames?: () => void;
  onOpenWhiteboard: () => void;
  onOpenMeetingModal?: () => void;
  onOpenActivityMap?: () => void;
  onOpenInvite?: () => void;
  onSendEmote: (emote: string) => void;
  onToggleHandRaise: () => void;
  onUpdateStatus?: (status: string) => void;
  onUpdateHandle?: (newHandle: string) => void;
}

const QUICK_REACTIONS = ["👋", "🎉", "❤️", "🔥", "👏", "😂"];

export default function GatherBottomDock({
  localAvatar,
  participantCount,
  isDecorateMode,
  onToggleDecorateMode,
  isRightDrawerOpen,
  rightDrawerTab,
  onToggleRightDrawer,
  onOpenArcade,
  onOpenPartyGames,
  onOpenWhiteboard,
  onOpenInvite,
  onSendEmote,
  onToggleHandRaise,
  onUpdateHandle,
}: GatherBottomDockProps) {
  // Edit Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localAvatar.handle);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && onUpdateHandle) {
      onUpdateHandle(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleLaunchGames = () => {
    spacesSfx.playKeyNote(4);
    if (onOpenPartyGames) {
      onOpenPartyGames();
    } else {
      onOpenArcade();
    }
  };

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl shadow-2xl p-1.5 gap-1.5 sm:gap-2 select-none max-w-[96vw] overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-bottom-2">
      {/* 1. Avatar Badge & Name */}
      <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-neutral-800 shrink-0">
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-inner shrink-0 ring-1 ring-white/10"
          style={{
            backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
          }}
        >
          {localAvatar.handle.charAt(1) || localAvatar.handle.charAt(0) || "U"}
        </div>

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
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="text-xs font-mono font-bold text-white flex items-center gap-1 hover:text-cyan-300 transition-colors max-w-[90px] sm:max-w-[110px] truncate cursor-pointer"
            title="Click to change your name"
          >
            <span className="truncate">{localAvatar.handle}</span>
            <Edit2 className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
          </button>
        )}
      </div>

      {/* 2. Quick Reactions Bar */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {QUICK_REACTIONS.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onSendEmote(em)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-neutral-900 active:scale-90 hover:scale-115 transition-all text-xs sm:text-sm flex items-center justify-center cursor-pointer"
            title={`React with ${em}`}
          >
            {em}
          </button>
        ))}

        {/* Hand Raise [H] */}
        <button
          type="button"
          onClick={onToggleHandRaise}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
            localAvatar.isHandRaised
              ? "bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20 scale-105"
              : "text-neutral-400 hover:text-amber-300 hover:bg-neutral-900"
          }`}
          title="Raise / Lower Hand"
        >
          <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* 3. Walking Hint (Desktop) */}
      <div className="hidden xl:flex items-center text-[11px] font-mono text-neutral-400 px-3 border-x border-neutral-800/80 whitespace-nowrap">
        <span>💡 Tap anywhere to walk • Sit at table to play</span>
      </div>

      {/* 4. Action Launchers */}
      <div className="flex items-center gap-1 sm:gap-1.5 pl-1 border-l border-neutral-800 shrink-0">
        {/* 🎲 Table Games (Ludo, UNO, Bottle, RPS) */}
        <button
          type="button"
          onClick={handleLaunchGames}
          className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Play Table Games (Ludo, UNO, Spin the Bottle, RPS)"
        >
          <Dices className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Table Games</span>
          <span className="sm:hidden">Games</span>
        </button>

        {/* 💬 Room Chat */}
        <button
          type="button"
          onClick={() => onToggleRightDrawer("chat")}
          className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            isRightDrawerOpen && rightDrawerTab === "chat"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent"
          }`}
          title="Open Room Chat"
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
          <span className="hidden sm:inline text-xs font-bold">Chat</span>
        </button>

        {/* 👥 Participants */}
        <button
          type="button"
          onClick={() => onToggleRightDrawer("participants")}
          className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
            isRightDrawerOpen && rightDrawerTab === "participants"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent"
          }`}
          title="View Participants"
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
          <span className="text-[11px]">{participantCount}</span>
        </button>

        {/* 🔗 Invite Friends */}
        {onOpenInvite && (
          <button
            type="button"
            onClick={onOpenInvite}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-mono font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            title="Invite Friends"
          >
            <Share2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="hidden md:inline text-xs">Invite</span>
          </button>
        )}

        {/* More Tools Popover (...) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`p-1.5 sm:p-2 rounded-xl text-xs font-mono transition-all flex items-center justify-center cursor-pointer shrink-0 ${
              moreMenuOpen || isDecorateMode
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
            title="More Options (Whiteboard, Build Mode)"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {moreMenuOpen && (
            <div className="absolute bottom-12 right-0 w-44 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenWhiteboard();
                }}
                className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Whiteboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onToggleDecorateMode();
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                  isDecorateMode
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "hover:bg-neutral-900 text-neutral-300 hover:text-white"
                }`}
              >
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                <span>{isDecorateMode ? "Exit Decorate" : "Decorate Space"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
