"use client";

/**
 * app/spaces/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: World-Class Social-Virtual Event & Hangout Hub
 * (Inspired by Remo, Gather, Topia):
 * - Live Event Discovery: See WHAT is being hosted and WHO is hosting
 * - Hero Live Stage Spotlight (Igniting Creativity Keynote & Abhishek's Birthday Party)
 * - Stage speakers preview tiles with speaking halos
 * - Numbered table social clusters (Tables 1-12)
 * - Category filters according to user needs:
 *   🎓 Webinars & Keynotes, 🎂 Birthday Bashes, 🍷 Dinners & Galas,
 *   💼 Co-Work & Strategy, ☕ Piazza & Cafe, 📚 Study, 🕹️ Game Nights
 * - 1-Click instant entry with zero-friction guest access
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import {
  SpaceCategory,
  SpaceVibe,
  SpaceDoc,
  AvatarConfig,
  subscribeToPublicSpaces,
  createSpaceDoc,
  DEFAULT_SPACES,
  SPACE_VIBES,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import CreateSpaceModal from "@/app/components/spaces/CreateSpaceModal";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
import {
  Sparkles,
  Plus,
  Users,
  Search,
  Compass,
  ArrowRight,
  Palette,
  Flame,
  Sun,
  CloudRain,
  Moon,
  Zap,
  Coffee,
  Wine,
  Ghost,
  PartyPopper,
  Leaf,
  Radio,
  Crown,
  Layers,
  MapPin,
  UtensilsCrossed,
  HelpCircle,
  BarChart2,
  Gift,
  Share2,
} from "lucide-react";

const CATEGORIES: { id: string; label: string; icon: string; badgeColor?: string }[] = [
  { id: "ALL", label: "All Live Events", icon: "🌐" },
  { id: "WEBINAR", label: "Webinars & Keynotes", icon: "🎓", badgeColor: "border-purple-500/40 text-purple-300 bg-purple-950/30" },
  { id: "CAFE", label: "Birthday Bashes & Parties", icon: "🎂", badgeColor: "border-pink-500/40 text-pink-300 bg-pink-950/30" },
  { id: "GALA_DINNER", label: "Dinners & Fireside Galas", icon: "🍷", badgeColor: "border-amber-500/40 text-amber-300 bg-amber-950/30" },
  { id: "OFFICE", label: "Co-Work & Strategy Sprints", icon: "💼", badgeColor: "border-cyan-500/40 text-cyan-300 bg-cyan-950/30" },
  { id: "PIAZZA", label: "Piazza & Cafe Mixers", icon: "☕", badgeColor: "border-emerald-500/40 text-emerald-300 bg-emerald-950/30" },
  { id: "LIBRARY", label: "Silent Study Sanctuaries", icon: "📚", badgeColor: "border-sky-500/40 text-sky-300 bg-sky-950/30" },
  { id: "ARCADE", label: "Game Nights & Tournaments", icon: "🕹️", badgeColor: "border-rose-500/40 text-rose-300 bg-rose-950/30" },
  { id: "CAMPUS", label: "Master Campuses", icon: "🏛️", badgeColor: "border-blue-500/40 text-blue-300 bg-blue-950/30" },
];

const VIBE_FILTERS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "All Vibes", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "PARTY_CLUB", label: "Party Club", icon: <PartyPopper className="w-3.5 h-3.5 text-pink-400" /> },
  { id: "DINNER_GALA", label: "Dinner Gala", icon: <Wine className="w-3.5 h-3.5 text-amber-400" /> },
  { id: "MIDNIGHT_NEON", label: "Midnight Neon", icon: <Moon className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: "SUKOON_ZEN", label: "Sukoon Zen", icon: <Leaf className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: "HORROR_NIGHT", label: "Horror Night", icon: <Ghost className="w-3.5 h-3.5 text-purple-400" /> },
  { id: "COZY_RAINY", label: "Cozy Rainy", icon: <CloudRain className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: "SUNSET_LOFI", label: "Sunset Lo-Fi", icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> },
  { id: "SUNNY_DAYLIGHT", label: "Sunny Daylight", icon: <Sun className="w-3.5 h-3.5 text-yellow-400" /> },
];

export default function SpacesLobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Initialized with full seed events inspired by all 5 reference images
  const [spaces, setSpaces] = useState<SpaceDoc[]>(DEFAULT_SPACES);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedVibe, setSelectedVibe] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [quickHosting, setQuickHosting] = useState<string | null>(null);

  // Avatar Config stored in localStorage
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    skinTone: "#fed7aa",
    hairStyle: "short",
    hairColor: "#fde047",
    outfit: "hoodie",
    outfitColor: "#38bdf8",
    accessory: "none",
    pet: "dog",
    isGhost: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_spaces_avatar");
      if (saved) setAvatarConfig(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSaveAvatar = (cfg: AvatarConfig) => {
    setAvatarConfig(cfg);
    try {
      localStorage.setItem("echo_spaces_avatar", JSON.stringify(cfg));
    } catch {}
  };

  // Real-time Firestore subscription merged with seed spaces
  useEffect(() => {
    const unsub = subscribeToPublicSpaces((loaded) => {
      const existingIds = new Set(loaded.map((s) => s.id));
      const merged = [...loaded, ...DEFAULT_SPACES.filter((s) => !existingIds.has(s.id))];
      setSpaces(merged);
    });
    return () => unsub();
  }, []);

  // 1-Click Instant Host for Friends
  const handle1ClickQuickHost = async (preset: {
    id: string;
    name: string;
    category: SpaceCategory;
    vibe: SpaceVibe;
    desc: string;
    floorPlanType?: "keynote_hall" | "fireside_lodge" | "ballroom" | "piazza_cafe";
  }) => {
    try {
      setQuickHosting(preset.id);
      spacesSfx.playKeyNote(4);
      const hostHandle = user?.handle || "@HOST";
      const hostUid = user?.uid || "guest_host";
      const spaceName = `${hostHandle}'s ${preset.name}`;

      const createdId = await createSpaceDoc({
        name: spaceName,
        category: preset.category,
        vibe: preset.vibe,
        hostUid,
        hostHandle,
        description: preset.desc,
        participantCount: 1,
        maxParticipants: 35,
        isPublic: true,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
        decorations: [],
        createdAt: Date.now(),
        floorPlanType: preset.floorPlanType || "ballroom",
      });

      spacesSfx.playZoneChime();
      router.push(`/spaces/${createdId}`);
    } catch (e) {
      console.error("Failed to quick host space:", e);
    } finally {
      setQuickHosting(null);
    }
  };

  // Filter spaces
  const filteredSpaces = spaces.filter((s) => {
    if (selectedCategory !== "ALL" && s.category !== selectedCategory) return false;
    if (selectedVibe !== "ALL" && s.vibe !== selectedVibe) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchHost = s.hostHandle.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchHost) return false;
    }
    return true;
  });

  // Featured Spotlight space (Defaults to Igniting Creativity Keynote or first space)
  const spotlightSpace =
    spaces.find((s) => s.id === "igniting_creativity_keynote") ||
    spaces[0] ||
    DEFAULT_SPACES[0];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* 1. Top Meta Bar */}
      <div className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
            >
              ← ECHO
            </Link>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <span className="font-mono font-bold text-sm tracking-tight text-white">
                SPACES METAVERSE
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
                SOCIAL EVENT & LIVING PLATFORM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                spacesSfx.playKeyNote(2);
                setAvatarModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-mono font-bold text-neutral-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">AVATAR STUDIO</span>
            </button>

            <button
              onClick={() => {
                spacesSfx.playKeyNote(4);
                setCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>HOST AN EVENT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Keynote / Spotlight Event Hero (Modeled directly after Image 1 & 3) */}
      <div className="relative border-b border-neutral-900 bg-gradient-to-b from-neutral-950 via-neutral-900/40 to-black py-10 px-4 sm:px-6 overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>FEATURED LIVE STAGE • WHO'S HOSTING NOW</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono">
                {spotlightSpace.name}
              </h1>

              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed font-mono">
                {spotlightSpace.description}
              </p>

              {/* Host Badge & Live Metrics */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-2xl">
                  {spotlightSpace.hostAvatar ? (
                    <img
                      src={spotlightSpace.hostAvatar}
                      alt={spotlightSpace.hostHandle}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
                    />
                  ) : (
                    <Crown className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-mono font-bold text-amber-300">
                    Host: {spotlightSpace.hostHandle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-2xl text-xs font-mono text-cyan-300">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{spotlightSpace.participantCount} Attending</span>
                </div>

                <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-2xl text-xs font-mono text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{spotlightSpace.activeTableCount || 8} Tables Seated</span>
                </div>
              </div>
            </div>

            {/* Quick Join Stage CTA Card */}
            <div className="w-full lg:w-auto p-5 rounded-3xl bg-neutral-950/90 border border-neutral-800 shadow-2xl space-y-3.5 min-w-[300px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-neutral-400">
                  Event Live Status
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {spotlightSpace.liveStageStatus || "🎙️ Live on Stage"}
                </span>
              </div>

              {/* Stage Presenters Preview Strip (Image 1 Fidelity) */}
              {spotlightSpace.activeStageSpeakers && spotlightSpace.activeStageSpeakers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
                    Keynote Presenters on Stage:
                  </div>
                  <div className="flex items-center gap-2">
                    {spotlightSpace.activeStageSpeakers.slice(0, 5).map((spk) => (
                      <div key={spk.uid} className="relative group/spk">
                        <div
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                            spk.isSpeaking
                              ? "border-emerald-400 ring-2 ring-emerald-400/50"
                              : "border-neutral-700"
                          }`}
                        >
                          <img
                            src={spk.avatarUrl}
                            alt={spk.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {spk.isSpeaking && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-black animate-ping" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  spacesSfx.playZoneChime();
                  router.push(`/spaces/${spotlightSpace.id}`);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>JOIN STAGE & TAKE A SEAT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. "Host Your Own Event" Instant Launch Presets (Matching All 5 Uploaded Images) */}
      <div className="border-b border-neutral-900 bg-neutral-950/40 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Radio className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-mono font-black tracking-wide text-white uppercase flex items-center gap-2">
                  <span>Host Your Own Event In 1-Click</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                    REMO & GATHER TEMPLATES
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Launch a live webinar hall, luxury fireside dinner, European piazza cafe, or birthday party with numbered tables
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              {
                id: "keynote_webinar",
                name: "Webinar Keynote Hall",
                icon: "🎓",
                category: "WEBINAR" as SpaceCategory,
                vibe: "MIDNIGHT_NEON" as SpaceVibe,
                floorPlanType: "keynote_hall" as const,
                desc: "Big presentation screen, presenter video tiles, Q&A with upvoting & numbered tables 1-12.",
                badge: "Image 1 & 5 Fidelity",
                border: "hover:border-purple-500/60",
                btnBg: "bg-purple-600 text-white hover:bg-purple-500",
              },
              {
                id: "bday_party_bash",
                name: "Birthday Party Bash",
                icon: "🎂",
                category: "CAFE" as SpaceCategory,
                vibe: "PARTY_CLUB" as SpaceVibe,
                floorPlanType: "ballroom" as const,
                desc: "Cake cutting ceremony, champagne toast, banquet dining table, Uno & party games.",
                badge: "Party & Games",
                border: "hover:border-pink-500/60",
                btnBg: "bg-pink-500 text-black hover:bg-pink-400",
              },
              {
                id: "fireside_gala",
                name: "Luxury Fireside Lodge",
                icon: "🎄",
                category: "GALA_DINNER" as SpaceCategory,
                vibe: "DINNER_GALA" as SpaceVibe,
                floorPlanType: "fireside_lodge" as const,
                desc: "Roaring fireplace, Christmas trees, plush velvet couches, gifts & mulled cider.",
                badge: "Image 2 Fidelity",
                border: "hover:border-amber-500/60",
                btnBg: "bg-amber-500 text-black hover:bg-amber-400",
              },
              {
                id: "auditorium_snack",
                name: "Keynote & Snack Bar",
                icon: "🍿",
                category: "WEBINAR" as SpaceCategory,
                vibe: "SUNNY_DAYLIGHT" as SpaceVibe,
                floorPlanType: "keynote_hall" as const,
                desc: "Auditorium stage, INFO reception counter, snack bar & numbered tables 1-20.",
                badge: "Image 3 Fidelity",
                border: "hover:border-yellow-500/60",
                btnBg: "bg-yellow-500 text-black hover:bg-yellow-400",
              },
              {
                id: "piazza_cafe",
                name: "European Piazza Cafe",
                icon: "⛲",
                category: "PIAZZA" as SpaceCategory,
                vibe: "SUNSET_LOFI" as SpaceVibe,
                floorPlanType: "piazza_cafe" as const,
                desc: "Cobblestone square with central marble fountain, cafe terrace & outdoor bistro tables.",
                badge: "Image 4 Fidelity",
                border: "hover:border-emerald-500/60",
                btnBg: "bg-emerald-500 text-black hover:bg-emerald-400",
              },
              {
                id: "focus_study",
                name: "Pomodoro Study Quad",
                icon: "📚",
                category: "LIBRARY" as SpaceCategory,
                vibe: "COZY_RAINY" as SpaceVibe,
                floorPlanType: "ballroom" as const,
                desc: "Silent sanctuary carrels, 25/5 Pomodoro timer, ambient lofi rain & whiteboard.",
                badge: "Deep Work",
                border: "hover:border-sky-500/60",
                btnBg: "bg-sky-500 text-white hover:bg-sky-400",
              },
            ].map((preset) => {
              const isLaunching = quickHosting === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 ${preset.border} transition-all flex flex-col justify-between group shadow-lg hover:shadow-cyan-500/5`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{preset.icon}</span>
                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-800">
                        {preset.badge}
                      </span>
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {preset.name}
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400 leading-snug mt-1 line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handle1ClickQuickHost(preset)}
                    disabled={!!quickHosting}
                    className={`mt-3 w-full py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 ${preset.btnBg}`}
                  >
                    {isLaunching ? (
                      <span className="animate-spin text-xs">⏳ Launching...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Launch & Invite</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Live Event Discovery Hub ("What is being hosted & Who is hosting") */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search live events by title, topic, or host..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Vibe Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {VIBE_FILTERS.map((vf) => {
                const isSelected = selectedVibe === vf.id;
                return (
                  <button
                    key={vf.id}
                    onClick={() => setSelectedVibe(vf.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {vf.icon}
                    <span>{vf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs (Matches User Needs) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-900 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    spacesSfx.playKeyNote(1);
                  }}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? "border-white bg-white text-black font-bold shadow-md"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Spaces & Events Directory Grid */}
        {filteredSpaces.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-3xl border border-neutral-900 bg-neutral-950/40">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono">No events found</h3>
              <p className="text-xs text-neutral-500 font-mono">
                No active spaces match your filters. Be the first to host one!
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs hover:bg-cyan-400 cursor-pointer"
            >
              + HOST NEW EVENT
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpaces.map((space) => {
              const catDef = CATEGORIES.find((c) => c.id === space.category);
              return (
                <div
                  key={space.id}
                  className="group relative p-5 rounded-3xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:shadow-2xl transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Category badge, Live Stage Indicator & Attendees */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold ${
                          catDef?.badgeColor || "border-neutral-800 bg-neutral-900 text-neutral-300"
                        }`}
                      >
                        {catDef?.label || space.category}
                      </span>

                      <div className="flex items-center gap-2">
                        {space.liveStageStatus && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold">
                            {space.liveStageStatus}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded-lg border border-cyan-800/40">
                          <Users className="w-3 h-3" />
                          <span>{space.participantCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white font-mono group-hover:text-cyan-400 transition-colors leading-snug">
                        {space.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">
                        {space.description}
                      </p>
                    </div>

                    {/* Host Profile Info & Floor Plan Type */}
                    <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-amber-400/80 bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-amber-300">
                          {space.hostAvatar ? (
                            <img
                              src={space.hostAvatar}
                              alt={space.hostHandle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{space.hostHandle.slice(1, 3).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            <span>{space.hostHandle}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-black font-black uppercase">
                              Host
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400">
                            {space.tableCount ? `${space.tableCount} Tables • Seating Open` : "Open Spatial Tables"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono font-bold uppercase text-neutral-400">
                          VIBE
                        </div>
                        <div className="text-[10px] font-mono text-neutral-300">
                          {space.vibe.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Seated Attendees Avatars (Green Halos) & Join Button */}
                  <div className="pt-4 mt-4 border-t border-neutral-900 flex items-center justify-between">
                    {/* Simulated circular attendee avatar bubbles with glowing green halos */}
                    <div className="flex items-center -space-x-2">
                      {[1, 2, 3, 4].map((aIdx) => (
                        <div
                          key={aIdx}
                          className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-emerald-400 shadow-sm shadow-emerald-400/30 overflow-hidden flex items-center justify-center text-[9px] font-mono font-bold text-neutral-300"
                        >
                          <span>{["AL", "MP", "JD", "SK"][aIdx - 1]}</span>
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                        +{space.participantCount}
                      </div>
                    </div>

                    <Link
                      href={`/spaces/${space.id}`}
                      onClick={() => spacesSfx.playZoneChime()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>JOIN SPACE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSpaceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(id) => router.push(`/spaces/${id}`)}
      />

      <AvatarStudioModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentConfig={avatarConfig}
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
