"use client";

/**
 * app/components/spaces/CreateSpaceModal.tsx
 * ─────────────────────────────────────────────────────
 * Gather.town Inspired Multi-Step Survey Wizard
 * Modeled after https://app.v2.gather.town/get-started-survey
 * Supports ANY space archetype, rich modular addons, capacity scale,
 * and live avatar preview.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import {
  SpaceCategory,
  SpaceVibe,
  AvatarConfig,
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
  ChevronLeft,
  Gamepad2,
  Coffee,
  Edit3,
  Disc3,
  Building2,
  BookOpen,
  Mic,
  Scale,
  Layers,
  Lock,
  Check,
  ArrowRight,
  Volume2,
  Tv,
} from "lucide-react";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
}

interface ArchetypeOption {
  id: SpaceCategory;
  name: string;
  icon: string;
  tagline: string;
  desc: string;
  color: string;
  defaultName: string;
  recommendedAddons: string[];
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: "OFFICE",
    name: "Virtual Office & Coworking",
    icon: "🏢",
    tagline: "High-productivity team workspace",
    desc: "Personal desks, team meeting pods, conference table, whiteboard & breakout watercooler.",
    color: "#38bdf8",
    defaultName: "Team Central HQ",
    recommendedAddons: ["whiteboard", "coffee", "rugs", "arcade"],
  },
  {
    id: "LIBRARY",
    name: "Silent Sanctuary & Study Quad",
    icon: "📚",
    tagline: "Distraction-free deep work",
    desc: "Silent carrels, 25/5 Pomodoro timers, cozy reading nooks, and low-proximity whisper circles.",
    color: "#a78bfa",
    defaultName: "Polymath Silent Library",
    recommendedAddons: ["pomodoro", "rain_ambient", "rugs", "whiteboard"],
  },
  {
    id: "ARCADE",
    name: "Retro Arcade & Gaming Arena",
    icon: "🕹️",
    tagline: "Social hangout with multiplayer arcade",
    desc: "Super Mario co-op cabinets, Guitar Hero, Mini Composer, 20+ retro games, and player lounges.",
    color: "#f43f5e",
    defaultName: "Retro Pixel Arcade",
    recommendedAddons: ["arcade", "jukebox", "coffee", "fountain"],
  },
  {
    id: "CAFE",
    name: "Chill Lounge & Rooftop Patio",
    icon: "☕",
    tagline: "Casual conversation & social mixers",
    desc: "Espresso barista counter, plush couches, outdoor campfire with embers, and ambient garden fountain.",
    color: "#f59e0b",
    defaultName: "Midnight Espresso Lounge",
    recommendedAddons: ["coffee", "campfire", "fountain", "jukebox"],
  },
  {
    id: "MUSIC",
    name: "Music Jam Studio",
    icon: "🎵",
    tagline: "Creative audio & live instruments",
    desc: "Live 8-key piano synthesizer, 4-pad drum machine, acoustic jam floor, and vinyl turntable.",
    color: "#ec4899",
    defaultName: "Echo Soundstage & Jam Studio",
    recommendedAddons: ["instruments", "jukebox", "stage_mic"],
  },
  {
    id: "CONCERT",
    name: "Concert Stage & Festival Hall",
    icon: "🎤",
    tagline: "All-hands keynotes & live shows",
    desc: "Elevated spotlight stage, audience dance floor, fanfare soundboard, and broadcaster podium.",
    color: "#eab308",
    defaultName: "Grand Festival Amphitheater",
    recommendedAddons: ["stage_mic", "jukebox", "fountain"],
  },
  {
    id: "DEBATE",
    name: "Town Hall Debate Arena",
    icon: "⚖️",
    tagline: "Proposition/opposition speeches & live voting",
    desc: "Speaker podiums, judge's gavel soundboard, jury caucus rugs, and audience proposition voting.",
    color: "#10b981",
    defaultName: "Metropolitan Debate Forum",
    recommendedAddons: ["gavel", "stage_mic", "whiteboard"],
  },
  {
    id: "CAMPUS",
    name: "All-in-One Global Campus",
    icon: "🎓",
    tagline: "Interconnected mega universe",
    desc: "Central fountain courtyard connecting Office, Library, Jam Studio, Concert Stage, and Debate Arena.",
    color: "#06b6d4",
    defaultName: "Genesis Global Campus",
    recommendedAddons: ["elevators", "fountain", "whiteboard", "arcade", "coffee"],
  },
  {
    id: "CUSTOM",
    name: "Custom Sandbox Universe",
    icon: "✨",
    tagline: "Freeform open living space",
    desc: "Design your own space from scratch with custom furniture placement, rugs, and interactive stations.",
    color: "#8b5cf6",
    defaultName: "Freeform Creative Sandbox",
    recommendedAddons: ["whiteboard", "arcade", "fountain", "jukebox"],
  },
];

interface PurposeTag {
  id: string;
  label: string;
  icon: string;
}

const PURPOSE_TAGS: PurposeTag[] = [
  { id: "coworking", label: "Daily Coworking", icon: "💼" },
  { id: "study", label: "Deep Focus & Study", icon: "📖" },
  { id: "social", label: "Casual Social & Hangouts", icon: "☕" },
  { id: "gamenight", label: "Game Nights & Tournaments", icon: "🎮" },
  { id: "allhands", label: "Team All-Hands & Keynotes", icon: "🎤" },
  { id: "jamming", label: "Music Jamming & DJ Sets", icon: "🎵" },
  { id: "hackathon", label: "Hackathons & Workshops", icon: "⚡" },
  { id: "debates", label: "Debates & Town Halls", icon: "⚖️" },
];

interface CapacityTier {
  id: string;
  label: string;
  range: string;
  desc: string;
  max: number;
}

const CAPACITY_TIERS: CapacityTier[] = [
  { id: "cozy", label: "Small & Cozy", range: "2 - 10 people", desc: "Perfect for fast syncs and tight-knit crews.", max: 10 },
  { id: "team", label: "Standard Team", range: "10 - 25 people", desc: "Ideal for agile pods and study groups.", max: 25 },
  { id: "department", label: "Department / Club", range: "25 - 60 people", desc: "For company departments or communities.", max: 60 },
  { id: "mega", label: "Mega Campus", range: "60 - 150+ people", desc: "Large-scale conferences and all-hands.", max: 150 },
];

interface AddonOption {
  id: string;
  name: string;
  icon: string;
  desc: string;
  category: "gaming" | "productivity" | "audio" | "amenity";
}

const ADDONS_CATALOG: AddonOption[] = [
  {
    id: "arcade",
    name: "Retro Space Arcade Lounge",
    icon: "🕹️",
    desc: "Multiplayer arcade cabinets with Super Mario Co-Op, Guitar Hero & 20+ games.",
    category: "gaming",
  },
  {
    id: "coffee",
    name: "Barista Espresso Station",
    icon: "☕",
    desc: "Interactive espresso machine that dispenses holding coffee mugs and brewing SFX.",
    category: "amenity",
  },
  {
    id: "whiteboard",
    name: "Collaborative Whiteboard",
    icon: "📋",
    desc: "Real-time interactive canvas for sketches, architecture diagrams & sticky notes.",
    category: "productivity",
  },
  {
    id: "jukebox",
    name: "High-Fidelity Vinyl Jukebox",
    icon: "📻",
    desc: "Lo-Fi beats, synthwave streams, and customizable space ambient soundscapes.",
    category: "audio",
  },
  {
    id: "rugs",
    name: "Soundproof Private Rugs",
    icon: "🔒",
    desc: "Gather-style isolated audio zones where only people on the rug can hear each other.",
    category: "productivity",
  },
  {
    id: "fountain",
    name: "Interactive Wishing Fountain",
    icon: "⛲",
    desc: "Marble courtyard fountain with coin-toss interactions and animated water sprays.",
    category: "amenity",
  },
  {
    id: "campfire",
    name: "Outdoor Campfire & Logs",
    icon: "🪵",
    desc: "Wood-burning campfire with glowing ember physics and acoustic seating.",
    category: "amenity",
  },
  {
    id: "elevators",
    name: "Multi-Floor Elevators",
    icon: "🛗",
    desc: "Elevator portals to jump seamlessly between 1st, 3rd, 4th, and ROOF floors.",
    category: "amenity",
  },
  {
    id: "stage_mic",
    name: "Spotlight Broadcaster Stage",
    icon: "🎙️",
    desc: "Stage mic that broadcasts your voice space-wide regardless of distance.",
    category: "audio",
  },
];

const VIBE_OPTIONS: { id: SpaceVibe; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "MIDNIGHT_NEON",
    label: "Midnight Neon",
    icon: <Moon className="w-4 h-4 text-cyan-400" />,
    desc: "Cyberpunk dark palette with glowing cyan/magenta floor accents.",
  },
  {
    id: "SUNNY_DAYLIGHT",
    label: "Sunny Daylight",
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    desc: "Warm oak parquet, soft golden sunbeams and calm daylight.",
  },
  {
    id: "COZY_RAINY",
    label: "Cozy Rainy",
    icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
    desc: "Rain streaks on glass, warm fireplace embers & lofi ambient.",
  },
  {
    id: "SUNSET_LOFI",
    label: "Sunset Lo-Fi",
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    desc: "Pastel dusk purples with drifting sakura blossom petals.",
  },
];

const LIFESPAN_OPTIONS = [
  { label: "1 Hour", minutes: 60, desc: "Quick sprint or sync" },
  { label: "2 Hours", minutes: 120, desc: "Standard workshop" },
  { label: "4 Hours", minutes: 240, desc: "Long study session" },
  { label: "24 Hours", minutes: 1440, desc: "Day-long conference" },
  { label: "Permanent HQ", minutes: null, desc: "Always open campus" },
];

export default function CreateSpaceModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSpaceModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Wizard Step (1: Archetype, 2: Identity, 3: Capacity, 4: Addons, 5: Atmosphere & Persona)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [category, setCategory] = useState<SpaceCategory>("OFFICE");
  const [name, setName] = useState("Team Central HQ");
  const [description, setDescription] = useState("");
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(["coworking", "social"]);
  const [selectedCapacity, setSelectedCapacity] = useState<string>("team");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([
    "whiteboard",
    "coffee",
    "rugs",
    "arcade",
    "fountain",
  ]);
  const [vibe, setVibe] = useState<SpaceVibe>("MIDNIGHT_NEON");
  const [lifespanMinutes, setLifespanMinutes] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  // Avatar Quick Preview
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    skinTone: "#fed7aa",
    hairStyle: "short",
    hairColor: "#fde047",
    outfit: "hoodie",
    outfitColor: "#38bdf8",
    accessory: "none",
    headwear: "none",
    pet: "dog",
    isGhost: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load avatar config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_spaces_avatar");
      if (saved) {
        setAvatarConfig(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  if (!isOpen) return null;

  // Handle archetype selection
  const handleSelectArchetype = (arch: ArchetypeOption) => {
    setCategory(arch.id);
    setName(arch.defaultName);
    setSelectedAddons(arch.recommendedAddons);
    spacesSfx.playKeyNote(2);
  };

  const togglePurpose = (pid: string) => {
    spacesSfx.playKeyNote(1);
    setSelectedPurposes((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  const toggleAddon = (aid: string) => {
    spacesSfx.playKeyNote(3);
    setSelectedAddons((prev) =>
      prev.includes(aid) ? prev.filter((x) => x !== aid) : [...prev, aid]
    );
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !name.trim()) {
      setError("Please provide a name for your space.");
      return;
    }
    setError(null);
    spacesSfx.playKeyNote(4);
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    spacesSfx.playKeyNote(1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit and Create Space
  const handleCreateSpace = async () => {
    if (!name.trim()) {
      setError("Please give your space a name.");
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      spacesSfx.playZoneChime();

      const capDef = CAPACITY_TIERS.find((c) => c.id === selectedCapacity) || CAPACITY_TIERS[1];
      const now = Date.now();
      const expiresAt = lifespanMinutes ? now + lifespanMinutes * 60 * 1000 : null;

      // Save updated avatar config to storage
      try {
        localStorage.setItem("echo_spaces_avatar", JSON.stringify(avatarConfig));
      } catch (e) {}

      const spaceId = await createSpaceDoc({
        name: name.trim(),
        description:
          description.trim() ||
          `Welcome to ${name.trim()}! Powered by Echo Spaces 2D Metaverse.`,
        category,
        vibe,
        hostUid: user?.uid || "guest_host",
        hostHandle: user?.handle || "@HOST",
        hostAvatar: user?.photoUrl || user?.photoURL,
        participantCount: 1,
        maxParticipants: capDef.max,
        isPublic,
        createdAt: now,
        expiresAt,
        whiteboardNotes: "",
        whiteboardDrawings: "",
        announcement: null,
        addons: selectedAddons,
        purposeTags: selectedPurposes,
      });

      if (onCreated) {
        onCreated(spaceId);
      } else {
        router.push(`/spaces/${spaceId}`);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to create space:", err);
      setError(err?.message || "Could not launch space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeArchetype = ARCHETYPES.find((a) => a.id === category) || ARCHETYPES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-neutral-900 bg-neutral-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
                  CREATE YOUR SPACE
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-[10px] font-mono text-cyan-300">
                  GATHER SURVEY
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Step {currentStep} of 5:{" "}
                {currentStep === 1 && "Choose Space Archetype"}
                {currentStep === 2 && "Identity & Purpose"}
                {currentStep === 3 && "Capacity & Scale"}
                {currentStep === 4 && "Addons & Amenities"}
                {currentStep === 5 && "Atmosphere & Avatar Persona"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="px-6 pt-3 pb-1 bg-neutral-950 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s < currentStep || (currentStep === 1 && name)) {
                  setCurrentStep(s);
                  spacesSfx.playKeyNote(s);
                }
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                s === currentStep
                  ? "w-8 bg-cyan-400"
                  : s < currentStep
                  ? "w-4 bg-neutral-600"
                  : "w-3 bg-neutral-800"
              }`}
              title={`Step ${s}`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: SPACE ARCHETYPE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white">
                  What kind of space do you want to create?
                </h3>
                <p className="text-xs text-neutral-400">
                  Select an archetype. You can customize furniture, add retro arcades, and re-arrange rooms anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ARCHETYPES.map((arch) => {
                  const isSelected = category === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => handleSelectArchetype(arch)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10"
                          : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{arch.icon}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-black">
                            ✓
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                          {arch.name}
                        </div>
                        <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                          {arch.tagline}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {arch.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: IDENTITY & PURPOSE */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white">
                  Tell us about your space
                </h3>
                <p className="text-xs text-neutral-400">
                  Give your world a name and tag what your community will be doing inside.
                </p>
              </div>

              {/* Space Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-neutral-300">
                  Space Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp Studio, Lo-Fi Study Room, Arcade Palace"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  maxLength={50}
                  autoFocus
                />
              </div>

              {/* Purpose Tags */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-neutral-300">
                  What activities will happen here? (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PURPOSE_TAGS.map((tag) => {
                    const isSelected = selectedPurposes.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => togglePurpose(tag.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                            : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span>{tag.icon}</span>
                        <span className="truncate text-[11px]">{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tagline / Welcome message */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-neutral-300">
                  Welcome Announcement / Description (Optional):
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Welcome to our space! Walk around, grab coffee at the barista bar, or play arcade games with friends."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors resize-none"
                  maxLength={140}
                />
              </div>
            </div>
          )}

          {/* STEP 3: CAPACITY & SCALE */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white">
                  How many people are you expecting?
                </h3>
                <p className="text-xs text-neutral-400">
                  We will optimize network proximity audio tick-rate and avatar synchronization for your space size.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAPACITY_TIERS.map((tier) => {
                  const isSelected = selectedCapacity === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setSelectedCapacity(tier.id);
                        spacesSfx.playKeyNote(3);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 text-white"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-cyan-300">
                          {tier.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-mono text-neutral-300 font-bold">
                          {tier.range}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">{tier.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex items-center gap-3">
                <Users className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="text-xs font-mono text-neutral-300">
                  💡 Proximity audio automatically mutes anyone beyond 160 pixels, keeping conversations crystal clear.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADDONS & AMENITIES */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white">
                  Choose your Space Addons & Amenities
                </h3>
                <p className="text-xs text-neutral-400">
                  User requested: &quot;and more addon on it&quot;. Toggle the interactive fixtures to populate your world.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ADDONS_CATALOG.map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-md"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{addon.icon}</span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-black ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400 text-black"
                              : "border-neutral-700"
                          }`}
                        >
                          {isSelected && "✓"}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-white">
                          {addon.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-snug mt-0.5 line-clamp-2">
                          {addon.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: ATMOSPHERE & AVATAR PERSONA */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white">
                  Atmosphere & Your Avatar Persona
                </h3>
                <p className="text-xs text-neutral-400">
                  Set the floor lighting and fine-tune your 2D avatar before stepping in.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Vibe & Lifespan */}
                <div className="space-y-3.5">
                  <label className="text-xs font-mono font-bold text-neutral-300 block">
                    Select World Vibe:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIBE_OPTIONS.map((v) => {
                      const isSelected = vibe === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVibe(v.id);
                            spacesSfx.playKeyNote(2);
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                              : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {v.icon}
                          <span className="truncate">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <label className="text-xs font-mono font-bold text-neutral-300 block pt-1">
                    Space Lifespan:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LIFESPAN_OPTIONS.map((life) => {
                      const isSelected = lifespanMinutes === life.minutes;
                      return (
                        <button
                          key={life.label}
                          type="button"
                          onClick={() => {
                            setLifespanMinutes(life.minutes);
                            spacesSfx.playKeyNote(1);
                          }}
                          className={`p-2 rounded-xl border text-center text-xs font-mono transition-all cursor-pointer ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 font-bold"
                              : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <div>{life.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-mono text-white font-bold">Public Space</div>
                        <div className="text-[10px] text-neutral-400">Discoverable in the Spaces Lobby</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right: Live 2D Avatar Preview */}
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center justify-between space-y-3">
                  <div className="text-xs font-mono font-bold text-neutral-300">
                    Avatar Live Persona
                  </div>

                  {/* 2D Canvas Simulated Preview */}
                  <div className="w-24 h-24 rounded-2xl bg-neutral-950 border border-cyan-500/30 flex items-center justify-center relative shadow-inner">
                    <div
                      className="w-12 h-14 rounded-xl relative flex flex-col items-center justify-center transition-all animate-bounce"
                      style={{
                        backgroundColor: avatarConfig.outfitColor || "#38bdf8",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      }}
                    >
                      {/* Head */}
                      <div
                        className="w-8 h-8 rounded-full absolute -top-4 border border-black/20"
                        style={{ backgroundColor: avatarConfig.skinTone || "#fed7aa" }}
                      >
                        {/* Eyes */}
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                          <div className="w-1 h-1 rounded-full bg-black" />
                          <div className="w-1 h-1 rounded-full bg-black" />
                        </div>
                      </div>
                    </div>

                    {/* Pet Icon Preview */}
                    {avatarConfig.pet && avatarConfig.pet !== "none" && (
                      <span className="absolute bottom-1 right-2 text-sm">
                        {avatarConfig.pet === "dog" && "🐕"}
                        {avatarConfig.pet === "cat" && "🐈"}
                        {avatarConfig.pet === "drone" && "🛸"}
                        {avatarConfig.pet === "duck" && "🦆"}
                      </span>
                    )}
                  </div>

                  {/* Quick Color Swatches */}
                  <div className="w-full space-y-2">
                    <div className="text-[10px] font-mono text-neutral-400 text-center">
                      Quick Hoodie Color:
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      {["#38bdf8", "#f43f5e", "#10b981", "#eab308", "#a855f7", "#ffffff"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setAvatarConfig((prev) => ({ ...prev, outfitColor: color }));
                            spacesSfx.playKeyNote(3);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            avatarConfig.outfitColor === color ? "scale-125 border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <div className="text-[10px] font-mono text-neutral-400 text-center pt-1">
                      Companion Pet:
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      {[
                        { id: "dog", icon: "🐕" },
                        { id: "cat", icon: "🐈" },
                        { id: "drone", icon: "🛸" },
                        { id: "duck", icon: "🦆" },
                        { id: "none", icon: "🚫" },
                      ].map((pet) => (
                        <button
                          key={pet.id}
                          type="button"
                          onClick={() => {
                            setAvatarConfig((prev) => ({ ...prev, pet: pet.id as any }));
                            spacesSfx.playKeyNote(2);
                          }}
                          className={`px-2 py-1 rounded-lg border text-xs cursor-pointer ${
                            avatarConfig.pet === pet.id
                              ? "border-cyan-400 bg-cyan-950/60"
                              : "border-neutral-800 bg-neutral-900"
                          }`}
                        >
                          {pet.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-neutral-900 bg-neutral-950/90 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-lg shadow-white/10"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateSpace}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-mono font-black flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xl shadow-cyan-500/20"
              >
                {loading ? (
                  <span>GENERATING WORLD...</span>
                ) : (
                  <>
                    <span>LAUNCH & STEP IN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
