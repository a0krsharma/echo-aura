"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import {
  SpaceCategory,
  SpaceVibe,
  createSpaceDoc,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  X,
  Sparkles,
  Clock,
  Users,
  Shield,
  Palette,
  Flame,
  Sun,
  CloudRain,
  Moon,
  ChevronRight,
} from "lucide-react";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
}

interface CategoryOption {
  id: SpaceCategory;
  name: string;
  icon: string;
  color: string;
  desc: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "OFFICE",
    name: "Virtual Office",
    icon: "🏢",
    color: "#38bdf8",
    desc: "Desks, conference table, whiteboard & private rugs for agile teams.",
  },
  {
    id: "LIBRARY",
    name: "Silent Library",
    icon: "📚",
    color: "#a78bfa",
    desc: "Deep focus sanctuary with 25/5 Pomodoro and whisper proximity.",
  },
  {
    id: "MUSIC",
    name: "Music Jam Studio",
    icon: "🎵",
    color: "#f43f5e",
    desc: "Live 8-key piano synth, 4-pad drum machine & acoustic floor.",
  },
  {
    id: "CONCERT",
    name: "Concert Stage",
    icon: "🎤",
    color: "#eab308",
    desc: "Elevated spotlight stage, audience dance floor & fanfare soundboard.",
  },
  {
    id: "DEBATE",
    name: "Debate Arena",
    icon: "⚖️",
    color: "#10b981",
    desc: "Judge's gavel podium, timed speeches & live proposition voting.",
  },
  {
    id: "CAMPUS",
    name: "Campus Commons",
    icon: "🎓",
    color: "#06b6d4",
    desc: "Atrium fountain, courtyards & cross-disciplinary study quads.",
  },
  {
    id: "CUSTOM",
    name: "Custom Living Room",
    icon: "✨",
    color: "#ec4899",
    desc: "Freeform open sandbox metaverse space for events and hangouts.",
  },
];

interface VibeOption {
  id: SpaceVibe;
  label: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
  desc: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: "MIDNIGHT_NEON",
    label: "Midnight Neon",
    icon: <Moon className="w-4 h-4 text-cyan-400" />,
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/20",
    desc: "Cyberpunk dark palette with glowing cyan/magenta floor accents.",
  },
  {
    id: "SUNNY_DAYLIGHT",
    label: "Sunny Daylight",
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    desc: "Warm oak parquet, soft golden sunbeams and calm ambiance.",
  },
  {
    id: "COZY_RAINY",
    label: "Cozy Rainy",
    icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
    border: "border-indigo-500/40",
    bg: "bg-indigo-950/20",
    desc: "Diagonal rain streaks, warm fireplace embers & lofi ambient.",
  },
  {
    id: "SUNSET_LOFI",
    label: "Sunset Lo-Fi",
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    border: "border-rose-500/40",
    bg: "bg-rose-950/20",
    desc: "Pastel dusk purples with drifting sakura blossom petals.",
  },
];

const LIFESPAN_OPTIONS = [
  { label: "1 Hour", minutes: 60, desc: "Quick sprint or meeting" },
  { label: "2 Hours", minutes: 120, desc: "Standard workshop" },
  { label: "4 Hours", minutes: 240, desc: "Long study session" },
  { label: "24 Hours", minutes: 1440, desc: "Day-long conference" },
  { label: "Permanent", minutes: null, desc: "Always open campus" },
];

export default function CreateSpaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSpaceModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SpaceCategory>("OFFICE");
  const [vibe, setVibe] = useState<SpaceVibe>("MIDNIGHT_NEON");
  const [lifespanMinutes, setLifespanMinutes] = useState<number | null>(120);
  const [maxParticipants, setMaxParticipants] = useState<number>(25);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for your space.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      spacesSfx.playZoneChime();

      const now = Date.now();
      const expiresAt = lifespanMinutes ? now + lifespanMinutes * 60 * 1000 : null;

      const spaceId = await createSpaceDoc({
        name: name.trim(),
        description: description.trim() || `Welcome to ${name.trim()}! Join and walk around.`,
        category,
        vibe,
        hostUid: user?.uid || "guest_host",
        hostHandle: user?.handle || "@HOST",
        hostAvatar: user?.photoUrl || user?.photoURL,
        participantCount: 1,
        maxParticipants,
        isPublic,
        createdAt: now,
        expiresAt,
        whiteboardNotes: "",
        whiteboardDrawings: "",
        announcement: null,
      });

      if (onCreated) {
        onCreated(spaceId);
      } else {
        router.push(`/spaces/${spaceId}`);
      }
      onClose();
    } catch (err: any) {
      console.error("[CreateSpaceModal] Error creating space:", err);
      setError(err?.message || "Failed to create space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono tracking-tight">
                BUILD NEW ECHO SPACE
              </h2>
              <p className="text-xs text-neutral-400">
                Gather-grade 2D spatial room with proximity voice & rugs.
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {/* 1. Name & Description */}
          <div className="space-y-3">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
              1. Space Name & Purpose
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Systems Sync or Late Night Lo-Fi Study"
              maxLength={60}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 focus:border-cyan-500 rounded-2xl text-sm text-white placeholder-neutral-500 outline-none transition-all font-mono"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for attendees (optional)"
              maxLength={120}
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 focus:border-cyan-500 rounded-xl text-xs text-neutral-300 placeholder-neutral-600 outline-none transition-all font-mono"
            />
          </div>

          {/* 2. Choose Space Category */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
                2. Select Space Archetype
              </label>
              <span className="text-[10px] font-mono text-cyan-400">
                {CATEGORY_OPTIONS.find((c) => c.id === category)?.name}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      spacesSfx.playKeyNote(1);
                    }}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-28 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl">{cat.icon}</span>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono">{cat.name}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-2 leading-snug mt-0.5">
                        {cat.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Space Atmospheric Vibe */}
          <div className="space-y-3">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
              3. Visual & Sound Vibe
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VIBE_OPTIONS.map((v) => {
                const isSelected = vibe === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVibe(v.id);
                      spacesSfx.playKeyNote(3);
                    }}
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? `${v.border} ${v.bg} shadow-lg`
                        : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-black/40 border border-neutral-800 shrink-0">
                      {v.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        {v.label}
                        {isSelected && (
                          <span className="text-[10px] text-cyan-400 font-normal">● ACTIVE</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                        {v.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Lifespan & Expiry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                4. Space Lifespan & Auto-Expiry
              </label>
              <span className="text-[10px] font-mono text-neutral-400">
                Auto-cleans when expired
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LIFESPAN_OPTIONS.map((opt) => {
                const isSelected = lifespanMinutes === opt.minutes;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setLifespanMinutes(opt.minutes);
                      spacesSfx.playKeyNote(5);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/30 text-white font-bold"
                        : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-mono">{opt.label}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Capacity & Access */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Max Attendees
              </label>
              <select
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value={10}>10 Attendees (Intimate)</option>
                <option value={25}>25 Attendees (Standard Team)</option>
                <option value={50}>50 Attendees (Department Sync)</option>
                <option value={100}>100 Attendees (All-Hands)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Discovery
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    isPublic
                      ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                      : "border-neutral-800 bg-neutral-900/60 text-neutral-400"
                  }`}
                >
                  🌐 Public Lobby
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    !isPublic
                      ? "border-amber-400 bg-amber-950/40 text-amber-300 font-bold"
                      : "border-neutral-800 bg-neutral-900/60 text-neutral-400"
                  }`}
                >
                  🔒 Unlisted Link
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-bold text-xs hover:from-cyan-400 hover:to-blue-400 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>CONSTRUCTING SPACE...</span>
            ) : (
              <>
                <span>SPAWN SPACE</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
