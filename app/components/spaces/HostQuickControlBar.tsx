"use client";

/**
 * app/components/spaces/HostQuickControlBar.tsx
 * ─────────────────────────────────────────────────────
 * Floating Host Quick-Action Hub:
 * - 🔔 "Gather All" Bell: Summons all friends to Campfire, Banquet, or Stage
 * - 🎲 Party & Game Toolkit (Dice, Bottle, Birthday, Chai Cards, Screen Share)
 * - 🎧 Quick Ambiance Music Toggle
 * - 🔗 1-Click WhatsApp / Telegram / Link Invite
 * - 📸 Group Photo Booth
 * - 👑 Vibe & Atmosphere Preset Switcher
 */

import React, { useState } from "react";
import {
  Bell,
  Sparkles,
  Dice5,
  Radio,
  Share2,
  Camera,
  Crown,
  ChevronDown,
  Volume2,
  VolumeX,
  MapPin,
  Check,
  Send,
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";
import { SpaceDoc } from "@/lib/spaces";

interface HostQuickControlBarProps {
  space: SpaceDoc;
  isHost: boolean;
  onOpenPartyTools: () => void;
  onOpenHostSettings: () => void;
  onOpenInvite: () => void;
  onGatherFriends: (destinationName: string, x: number, y: number) => void;
  onQuickSnapPhoto: () => void;
}

const GATHER_POINTS = [
  { name: "Campfire Patio", icon: "🪵", x: 800, y: 150 },
  { name: "Fountain Banquet Table", icon: "⛲", x: 1200, y: 350 },
  { name: "Retro Pixel Arcade", icon: "🕹️", x: 410, y: 420 },
  { name: "Concert Amphitheater", icon: "🎤", x: 800, y: 860 },
  { name: "Espresso Coffee Bar", icon: "☕", x: 270, y: 240 },
];

export default function HostQuickControlBar({
  space,
  isHost,
  onOpenPartyTools,
  onOpenHostSettings,
  onOpenInvite,
  onGatherFriends,
  onQuickSnapPhoto,
}: HostQuickControlBarProps) {
  const [gatherDropdownOpen, setGatherDropdownOpen] = useState(false);
  const [isAmbiancePlaying, setIsAmbiancePlaying] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const handleToggleAmbiance = () => {
    if (isAmbiancePlaying) {
      spacesSfx.stopAmbiance();
      setIsAmbiancePlaying(false);
    } else {
      spacesSfx.startAmbiance("lofi");
      setIsAmbiancePlaying(true);
    }
  };

  const handleQuickGather = (point: (typeof GATHER_POINTS)[0]) => {
    spacesSfx.playGatherBell();
    setGatherDropdownOpen(false);
    onGatherFriends(point.name, point.x, point.y);
  };

  return (
    <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
      <div className="bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md rounded-2xl px-2 py-1.5 flex items-center gap-1.5 shadow-2xl">
        {/* 1. Gather All Friends (Bell) */}
        <div className="relative">
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setGatherDropdownOpen(!gatherDropdownOpen);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Gather all attendees in space to one location"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="hidden sm:inline">Gather All</span>
            <ChevronDown className="w-3 h-3 text-amber-400/80" />
          </button>

          {/* Gather Locations Dropdown */}
          {gatherDropdownOpen && (
            <div className="absolute top-10 left-0 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                🔔 Summon Everyone To:
              </div>
              {GATHER_POINTS.map((pt) => (
                <button
                  key={pt.name}
                  onClick={() => handleQuickGather(pt)}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-200 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span className="text-base">{pt.icon}</span>
                  <span>{pt.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Party & Games Suite */}
        <button
          onClick={() => {
            spacesSfx.playKeyNote(4);
            onOpenPartyTools();
          }}
          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Open Party Games, Dice Roller, Truth/Dare, Cake, Chai Date cards"
        >
          <Dice5 className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Party & Games</span>
        </button>

        {/* 3. Quick Ambiance Music */}
        <button
          onClick={() => {
            spacesSfx.playKeyNote(3);
            handleToggleAmbiance();
          }}
          className={`px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
            isAmbiancePlaying
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
              : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
          title="Toggle Lofi Background Ambiance Music"
        >
          <Radio className={`w-3.5 h-3.5 ${isAmbiancePlaying ? "text-cyan-400 animate-pulse" : "text-neutral-400"}`} />
          <span className="hidden md:inline">{isAmbiancePlaying ? "Lofi Radio ON" : "Ambiance"}</span>
        </button>

        {/* 4. Instant Invite Friends */}
        <button
          onClick={() => {
            spacesSfx.playKeyNote(1);
            onOpenInvite();
          }}
          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Invite Friends via WhatsApp, Telegram, or Link"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Invite</span>
        </button>

        {/* 5. Photo Booth Quick Snap */}
        <button
          onClick={() => {
            spacesSfx.playKeyNote(5);
            onQuickSnapPhoto();
          }}
          className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
          title="Take Group Polaroid Memory"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* 6. Host & Vibe Settings */}
        <button
          onClick={() => {
            spacesSfx.playKeyNote(6);
            onOpenHostSettings();
          }}
          className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
          title="Host & Atmosphere Settings (Horror, Party, Dinner, Sukoon)"
        >
          <Crown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
