"use client";

/**
 * app/components/spaces/HostEventModal.tsx
 * ─────────────────────────────────────────────────────
 * Space Customization & Event Hosting Center:
 * - 1-Click Space Rename
 * - Instant Vibe & Ambiance Switcher:
 *   🎃 Horror Night, 🪩 Party Club, 🍷 Candlelight Dinner Gala, 🍃 Sukoon Zen,
 *   ⚡ Midnight Cyberpunk, ☀️ Sunny Daylight, 🌧️ Cozy Lofi Rain, 🌅 Sunset
 * - Event Hosting Presets (Dinner, Party, Horror Night, Sukoon, Arcade Battle, Study)
 * - Live Space Announcement Broadcaster
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Palette,
  Megaphone,
  Check,
  Flame,
  Music,
  Wine,
  Moon,
  Sun,
  CloudRain,
  Sunset,
  Ghost,
  Radio,
  Gamepad2,
  BookOpen,
  Send,
  Edit2,
  Calendar,
} from "lucide-react";
import { SpaceDoc, SpaceVibe, SPACE_VIBES } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface HostEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: SpaceDoc;
  onUpdateSpace: (updates: Partial<SpaceDoc>) => void;
  onTeleportTo?: (x: number, y: number) => void;
}

export default function HostEventModal({
  isOpen,
  onClose,
  space,
  onUpdateSpace,
  onTeleportTo,
}: HostEventModalProps) {
  const [spaceName, setSpaceName] = useState(space.name);
  const [selectedVibe, setSelectedVibe] = useState<SpaceVibe>(space.vibe || "MIDNIGHT_NEON");
  const [announcementText, setAnnouncementText] = useState(space.announcement?.text || "");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Space Rename & Vibe Change
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    spacesSfx.playKeyNote(5);
    onUpdateSpace({
      name: spaceName.trim() || space.name,
      vibe: selectedVibe,
    });
    setSavedFeedback("Space updated successfully!");
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  // Host Preset Events (Dinner, Party, Horror, Sukoon, etc.)
  const handleHostPreset = (
    presetName: string,
    presetVibe: SpaceVibe,
    announcement: string,
    teleportCoords?: { x: number; y: number }
  ) => {
    spacesSfx.playFocusBell();
    setSelectedVibe(presetVibe);
    setAnnouncementText(announcement);

    onUpdateSpace({
      vibe: presetVibe,
      announcement: {
        text: announcement,
        expiresAt: Date.now() + 1000 * 60 * 30, // 30 minutes
      },
    });

    if (teleportCoords && onTeleportTo) {
      onTeleportTo(teleportCoords.x, teleportCoords.y);
    }

    setSavedFeedback(`🎉 Hosted ${presetName}!`);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  // Publish Announcement
  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    spacesSfx.playKeyNote(4);
    onUpdateSpace({
      announcement: {
        text: announcementText.trim(),
        expiresAt: Date.now() + 1000 * 60 * 20, // 20 minutes
      },
    });
    setSavedFeedback("Announcement broadcasted!");
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const handleClearAnnouncement = () => {
    setAnnouncementText("");
    onUpdateSpace({ announcement: null });
    spacesSfx.playKeyNote(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-white tracking-tight">
                HOST CENTER & CUSTOMIZATION
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Rename space, change theme atmosphere & host live experiences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto scrollbar-thin">
          {/* Feedback banner */}
          {savedFeedback && (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{savedFeedback}</span>
            </div>
          )}

          {/* 1. Rename Space */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rename Space:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                maxLength={45}
                placeholder="Space Name"
                className="flex-1 bg-neutral-900/80 border border-neutral-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition cursor-pointer shadow-sm shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* 2. 1-Click Event Hosting Presets */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>Host an Event Now (1-Click Presets):</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  icon: "🎂",
                  title: "Birthday Party",
                  name: "Virtual Birthday Party",
                  vibe: "PARTY_CLUB" as const,
                  announcement: "🎂 Birthday Party is LIVE! Cake cutting & celebration at the Fountain Room!",
                  coords: { x: 1200, y: 350 },
                },
                {
                  icon: "🍷",
                  title: "Dinner Gala",
                  name: "Candlelight Dinner Gala",
                  vibe: "DINNER_GALA" as const,
                  announcement: "🍷 Candlelight Dinner Gala is now open! Take your seat at the banquet table.",
                  coords: { x: 1200, y: 340 },
                },
                {
                  icon: "🪩",
                  title: "Club Party",
                  name: "Epic Club Party",
                  vibe: "PARTY_CLUB" as const,
                  announcement: "🪩 Party is LIVE! Meet at the DJ dance floor for drinks & music.",
                  coords: { x: 760, y: 140 },
                },
                {
                  icon: "👻",
                  title: "Ghost Dating",
                  name: "Ghost Dating & Mystery Blind Meetup",
                  vibe: "HORROR_NIGHT" as const,
                  announcement: "👻 Ghost Dating / Mystery Meetup is LIVE! Discover connections.",
                  coords: { x: 430, y: 140 },
                },
                {
                  icon: "💼",
                  title: "Co-Work",
                  name: "Co-Work & Strategy Sprint",
                  vibe: "SUNNY_DAYLIGHT" as const,
                  announcement: "💼 Co-Work Sprint in progress! Grab your desk & collaborate.",
                  coords: { x: 270, y: 280 },
                },
                {
                  icon: "📚",
                  title: "Study Session",
                  name: "Deep Focus Study",
                  vibe: "COZY_RAINY" as const,
                  announcement: "📚 25/5 Pomodoro study sprint active in the Silent Sanctuary.",
                  coords: { x: 1200, y: 260 },
                },
                {
                  icon: "🍃",
                  title: "Sukoon / Zen",
                  name: "Sukoon Zen Sanctuary",
                  vibe: "SUKOON_ZEN" as const,
                  announcement: "🍃 Welcome to Sukoon Sanctuary. Relaxation, tranquility & peace.",
                  coords: { x: 800, y: 560 },
                },
                {
                  icon: "🕹️",
                  title: "Arcade Games",
                  name: "Arcade & Games Championship",
                  vibe: "MIDNIGHT_NEON" as const,
                  announcement: "🕹️ Table games championship starting now at the Arcade!",
                  coords: { x: 410, y: 420 },
                },
              ].map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => handleHostPreset(p.name, p.vibe, p.announcement, p.coords)}
                  className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 hover:border-cyan-400/50 hover:bg-neutral-850 text-left transition cursor-pointer flex items-center gap-2 group"
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {p.icon}
                  </span>
                  <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 truncate">
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Theme & Atmosphere Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Choose Theme & Atmosphere:</span>
            </label>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {Object.values(SPACE_VIBES).map((vibeDef) => {
                const isSelected = selectedVibe === vibeDef.id;
                return (
                  <button
                    key={vibeDef.id}
                    type="button"
                    onClick={() => {
                      setSelectedVibe(vibeDef.id);
                      onUpdateSpace({ vibe: vibeDef.id });
                      spacesSfx.playKeyNote(2);
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/60 shadow-md scale-105"
                        : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700"
                    }`}
                    title={vibeDef.name}
                  >
                    <span className="text-lg">{vibeDef.icon}</span>
                    <span
                      className={`text-[10px] font-mono font-bold truncate ${
                        isSelected ? "text-cyan-300" : "text-neutral-300"
                      }`}
                    >
                      {vibeDef.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Broadcast Space Announcement */}
          <form onSubmit={handlePublishAnnouncement} className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Broadcast Live Announcement:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                maxLength={90}
                placeholder="Type banner message for all participants..."
                className="flex-1 bg-neutral-900/80 border border-neutral-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!announcementText.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-mono font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
              {space.announcement && (
                <button
                  type="button"
                  onClick={handleClearAnnouncement}
                  className="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-mono text-xs transition cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
