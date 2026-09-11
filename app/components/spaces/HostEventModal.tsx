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
          <div className="space-y-2">
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
                placeholder="Space Name (e.g. Midnight Chill Cafe, Party Lounge)"
                className="flex-1 bg-neutral-900/80 border border-neutral-700 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-sm font-mono text-white outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                Save
              </button>
            </div>
          </div>

          {/* 2. 1-Click Event Hosting Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Host an Event Now (1-Click Presets):</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Preset 1: Candlelight Dinner Gala */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Candlelight Dinner Gala",
                    "DINNER_GALA",
                    "🍷 Candlelight Dinner Gala is now open! Take your seat at the banquet table.",
                    { x: 1200, y: 340 }
                  )
                }
                className="p-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🍷</span>
                  <span className="text-xs font-mono font-bold text-amber-300 group-hover:text-white">
                    Host Dinner Gala
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  Golden chandelier lighting, candlelight banquet & jazz atmosphere.
                </p>
              </button>

              {/* Preset 2: Nightclub Party & Rave */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Epic Club Party",
                    "PARTY_CLUB",
                    "🪩 Party is LIVE! Meet at the DJ dance floor for drinks & music.",
                    { x: 760, y: 140 }
                  )
                }
                className="p-3 rounded-2xl border border-pink-500/30 bg-pink-950/20 hover:bg-pink-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🪩</span>
                  <span className="text-xs font-mono font-bold text-pink-300 group-hover:text-white">
                    Host Club Party
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  Sweeping laser light beams, neon strobes & dance floor energy.
                </p>
              </button>

              {/* Preset 3: Spooky Horror Night */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Spooky Horror Night",
                    "HORROR_NIGHT",
                    "🎃 Beware: Horror Night has fallen! Press [G] to turn on Ghost Mode.",
                    { x: 430, y: 140 }
                  )
                }
                className="p-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🎃</span>
                  <span className="text-xs font-mono font-bold text-purple-300 group-hover:text-white">
                    Host Horror Night
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  Haunted fog, glowing jack-o'-lanterns & phantom wisps.
                </p>
              </button>

              {/* Preset 4: Sukoon Zen Sanctuary */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Sukoon Zen Sanctuary",
                    "SUKOON_ZEN",
                    "🍃 Welcome to Sukoon Sanctuary. Relaxation, tranquility & peace.",
                    { x: 800, y: 560 }
                  )
                }
                className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🍃</span>
                  <span className="text-xs font-mono font-bold text-emerald-300 group-hover:text-white">
                    Host Sukoon / Zen
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  Tranquil koi pond, floating lotus petals & soothing ambiance.
                </p>
              </button>

              {/* Preset 5: Arcade Tournament */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Arcade Championship",
                    "MIDNIGHT_NEON",
                    "🕹️ Super Mario & Guitar Hero Tournament starting now at Arcade!",
                    { x: 410, y: 420 }
                  )
                }
                className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🕹️</span>
                  <span className="text-xs font-mono font-bold text-indigo-300 group-hover:text-white">
                    Host Arcade Tournament
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  20+ retro arcade games, Super Mario 2-player & rhythm battles.
                </p>
              </button>

              {/* Preset 6: Focus Study Session */}
              <button
                type="button"
                onClick={() =>
                  handleHostPreset(
                    "Deep Focus Study",
                    "COZY_RAINY",
                    "📚 25/5 Pomodoro study sprint active in the Silent Sanctuary.",
                    { x: 1200, y: 260 }
                  )
                }
                className="p-3 rounded-2xl border border-sky-500/30 bg-sky-950/20 hover:bg-sky-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📚</span>
                  <span className="text-xs font-mono font-bold text-sky-300 group-hover:text-white">
                    Host Study Session
                  </span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 leading-tight">
                  25-min Pomodoro timer, ambient lofi rain & whiteboard collaboration.
                </p>
              </button>
            </div>
          </div>

          {/* 3. Theme & Atmosphere Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Choose Theme & Atmosphere:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/60 shadow-lg scale-105"
                        : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700"
                    }`}
                  >
                    <span className="text-2xl">{vibeDef.icon}</span>
                    <span
                      className={`text-xs font-mono font-bold ${
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
          <form onSubmit={handlePublishAnnouncement} className="space-y-2">
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
                className="flex-1 bg-neutral-900/80 border border-neutral-700 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-sm font-mono text-white outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!announcementText.trim()}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
              {space.announcement && (
                <button
                  type="button"
                  onClick={handleClearAnnouncement}
                  className="px-3 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
                  title="Clear Announcement"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
