"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SpaceDoc,
  SpaceVibe,
  updateSpaceDoc,
  deleteSpaceDoc,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  X,
  Settings,
  Flame,
  Sun,
  CloudRain,
  Moon,
  Clock,
  Megaphone,
  Trash2,
  Lock,
  Globe,
  Check,
  AlertTriangle,
} from "lucide-react";

interface HostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: SpaceDoc;
  onSpaceUpdated?: (updates: Partial<SpaceDoc>) => void;
}

const VIBES: { id: SpaceVibe; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "MIDNIGHT_NEON",
    label: "Midnight Neon",
    icon: <Moon className="w-4 h-4 text-cyan-400" />,
    desc: "Cyberpunk dark with glowing floor outlines",
  },
  {
    id: "SUNNY_DAYLIGHT",
    label: "Sunny Daylight",
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    desc: "Oak parquet with soft golden sunbeams",
  },
  {
    id: "COZY_RAINY",
    label: "Cozy Rainy",
    icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
    desc: "Window rain streaks, fireplace & lofi audio",
  },
  {
    id: "SUNSET_LOFI",
    label: "Sunset Lo-Fi",
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    desc: "Pastel dusk with drifting sakura petals",
  },
];

export default function HostSettingsModal({
  isOpen,
  onClose,
  space,
  onSpaceUpdated,
}: HostSettingsModalProps) {
  const router = useRouter();

  const [activeVibe, setActiveVibe] = useState<SpaceVibe>(space.vibe);
  const [announcementText, setAnnouncementText] = useState("");
  const [isPublic, setIsPublic] = useState(space.isPublic ?? true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Change Space Vibe
  const handleChangeVibe = async (v: SpaceVibe) => {
    setActiveVibe(v);
    spacesSfx.playKeyNote(4);
    try {
      await updateSpaceDoc(space.id, { vibe: v });
      onSpaceUpdated?.({ vibe: v });
      setFeedback(`Atmosphere changed to ${v.replace("_", " ")}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to update vibe:", err);
    }
  };

  // Extend Expiry
  const handleExtendExpiry = async (additionalMinutes: number) => {
    spacesSfx.playZoneChime();
    const currentExpiry = space.expiresAt ? Math.max(space.expiresAt, Date.now()) : Date.now();
    const newExpiresAt = currentExpiry + additionalMinutes * 60 * 1000;

    try {
      await updateSpaceDoc(space.id, { expiresAt: newExpiresAt });
      onSpaceUpdated?.({ expiresAt: newExpiresAt });
      setFeedback(`Space extended by ${additionalMinutes} minutes!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to extend space:", err);
    }
  };

  // Make Permanent
  const handleMakePermanent = async () => {
    spacesSfx.playZoneChime();
    try {
      await updateSpaceDoc(space.id, { expiresAt: null });
      onSpaceUpdated?.({ expiresAt: null });
      setFeedback("Space set to Permanent (Never expires).");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to set permanent:", err);
    }
  };

  // Broadcast Announcement
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    spacesSfx.playConcertFanfare();
    const announcement = {
      text: announcementText.trim(),
      expiresAt: Date.now() + 30000, // 30s broadcast
    };

    try {
      await updateSpaceDoc(space.id, { announcement });
      onSpaceUpdated?.({ announcement });
      setAnnouncementText("");
      setFeedback("Broadcast alert sent to all room participants!");
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("Failed to broadcast:", err);
    }
  };

  // Toggle Public / Unlisted
  const handleTogglePublic = async () => {
    const nextPublic = !isPublic;
    setIsPublic(nextPublic);
    try {
      await updateSpaceDoc(space.id, { isPublic: nextPublic });
      onSpaceUpdated?.({ isPublic: nextPublic });
      setFeedback(nextPublic ? "Space is now visible in Lobby." : "Space is now Unlisted (direct link only).");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to toggle public state:", err);
    }
  };

  // Delete Space
  const handleDeleteSpace = async () => {
    setIsDeleting(true);
    try {
      spacesSfx.playGavelStrike();
      await deleteSpaceDoc(space.id);
      router.push("/spaces");
    } catch (err) {
      console.error("Failed to delete space:", err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">HOST COMMAND SUITE</h3>
              <p className="text-[11px] text-neutral-400 font-mono">Space: {space.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {feedback && (
            <div className="px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>{feedback}</span>
            </div>
          )}

          {/* 1. Switch Vibe Live */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
              1. Dynamic Atmospheric Vibe
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VIBES.map((v) => {
                const isSelected = activeVibe === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleChangeVibe(v.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 text-white font-bold shadow-md"
                        : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-black/40 border border-neutral-800 shrink-0">
                      {v.icon}
                    </div>
                    <div>
                      <div className="text-xs font-mono">{v.label}</div>
                      <div className="text-[9px] text-neutral-500 leading-tight line-clamp-1">
                        {v.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Broadcast Room Announcement */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              2. Broadcast Room Announcement
            </label>
            <form onSubmit={handleBroadcastAnnouncement} className="flex gap-2">
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="e.g. 5-minute break started! Rejoin at the main stage."
                maxLength={90}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!announcementText.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-mono font-bold text-xs disabled:opacity-40 transition-all cursor-pointer"
              >
                BLAST
              </button>
            </form>
          </div>

          {/* 3. Space Lifespan Management */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                3. Extend Lifespan
              </label>
              <span className="text-[10px] font-mono text-neutral-400">
                {space.expiresAt
                  ? `Expires: ${new Date(space.expiresAt).toLocaleTimeString()}`
                  : "Permanent Space"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleExtendExpiry(30)}
                className="py-2 px-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                +30 Mins
              </button>
              <button
                onClick={() => handleExtendExpiry(60)}
                className="py-2 px-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                +1 Hour
              </button>
              <button
                onClick={() => handleExtendExpiry(120)}
                className="py-2 px-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                +2 Hours
              </button>
              <button
                onClick={handleMakePermanent}
                className="py-2 px-2 rounded-xl border border-cyan-800/60 bg-cyan-950/30 hover:border-cyan-500 text-xs font-mono text-cyan-300 hover:text-white transition-all cursor-pointer"
              >
                Permanent
              </button>
            </div>
          </div>

          {/* 4. Room Visibility */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe className="w-4 h-4 text-cyan-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
              <div>
                <div className="text-xs font-bold text-white font-mono">
                  {isPublic ? "Public Lobby Discovery" : "Unlisted Space"}
                </div>
                <div className="text-[10px] text-neutral-500">
                  {isPublic ? "Anyone can discover and join" : "Only people with link can join"}
                </div>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              className="px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-white transition-all cursor-pointer"
            >
              {isPublic ? "Make Unlisted" : "Make Public"}
            </button>
          </div>

          {/* 5. Danger Zone: Delete Space */}
          <div className="pt-2 border-t border-neutral-900">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 rounded-2xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>TERMINATE & DELETE SPACE</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2 text-rose-300 text-xs font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>Are you sure? This permanently deletes the space and kicks attendees.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white text-xs font-mono cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleDeleteSpace}
                    disabled={isDeleting}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? "DELETING..." : "CONFIRM DELETE"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
