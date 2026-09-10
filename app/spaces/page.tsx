"use client";

/**
 * app/spaces/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: Gather-Style 2D Metaverse Lobby Hub
 * Discover, filter, and create category-based living spaces
 * with real-time lifespans, vibes, and 1-click entry.
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
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import CreateSpaceModal from "@/app/components/spaces/CreateSpaceModal";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
import {
  Sparkles,
  Plus,
  Users,
  Clock,
  Search,
  Compass,
  ArrowRight,
  Shield,
  Palette,
  Flame,
  Sun,
  CloudRain,
  Moon,
  Zap,
} from "lucide-react";

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "ALL", label: "All Spaces", icon: "🌐" },
  { id: "CAMPUS", label: "Campuses", icon: "🎓" },
  { id: "OFFICE", label: "Offices", icon: "🏢" },
  { id: "LIBRARY", label: "Libraries", icon: "📚" },
  { id: "MUSIC", label: "Music Studios", icon: "🎵" },
  { id: "CONCERT", label: "Concert Halls", icon: "🎤" },
  { id: "DEBATE", label: "Debate Arenas", icon: "⚖️" },
  { id: "CUSTOM", label: "Custom", icon: "✨" },
];

const VIBE_FILTERS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "All Vibes", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "MIDNIGHT_NEON", label: "Midnight Neon", icon: <Moon className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: "SUNNY_DAYLIGHT", label: "Sunny Daylight", icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
  { id: "COZY_RAINY", label: "Cozy Rainy", icon: <CloudRain className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: "SUNSET_LOFI", label: "Sunset Lo-Fi", icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> },
];

export default function SpacesLobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [spaces, setSpaces] = useState<SpaceDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedVibe, setSelectedVibe] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

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

  // Load avatar config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_spaces_avatar");
      if (saved) {
        setAvatarConfig(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const handleSaveAvatar = (cfg: AvatarConfig) => {
    setAvatarConfig(cfg);
    try {
      localStorage.setItem("echo_spaces_avatar", JSON.stringify(cfg));
    } catch (e) {}
  };

  // Real-time Firestore subscription to public spaces
  useEffect(() => {
    const unsub = subscribeToPublicSpaces((loaded) => {
      setSpaces(loaded);
    });
    return () => unsub();
  }, []);

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

  // Format expiry remaining string
  const formatExpiry = (expiresAt: number | null) => {
    if (!expiresAt) return "♾️ Permanent";
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `⏳ ${hours}h ${mins}m left`;
    return `⏳ ${mins}m left`;
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* Top Meta Bar */}
      <div className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
                2D SPATIAL LIVING ROOMS
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
              <span>BUILD SPACE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative border-b border-neutral-900 bg-gradient-to-b from-neutral-950 via-black to-black py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>GATHER.TOWN FIDELITY • PROXIMITY VOICE • PRIVATE RUGS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              INTERACTIVE 2D LIVING SPACES
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed font-mono">
              Walk into virtual offices with agile desks, study sanctuaries with 25m Pomodoro,
              music academies with live 8-key piano synths, or town hall debate stages.
            </p>
          </div>

          {/* Quick Launch Card */}
          <div className="w-full md:w-auto p-5 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl flex flex-col sm:flex-row md:flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">Featured Master World</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-white">Echo Genesis Campus</div>
            <p className="text-xs text-neutral-500 leading-snug">
              All 5 living spaces combined in an expansive open-air atrium with central fountain.
            </p>
            <button
              onClick={() => {
                spacesSfx.playZoneChime();
                router.push("/spaces/genesis_campus");
              }}
              className="mt-1 w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>QUICK JOIN CAMPUS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Filters & Room Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search & Category Pills */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spaces by name, topic or host..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Vibe Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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

          {/* Category Tabs */}
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

        {/* Spaces Directory Grid */}
        {filteredSpaces.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-3xl border border-neutral-900 bg-neutral-950/40">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono">No spaces found</h3>
              <p className="text-xs text-neutral-500 font-mono">
                No active living rooms match your filters. Be the first to build one!
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs hover:bg-cyan-400 cursor-pointer"
            >
              + SPAWN FIRST SPACE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpaces.map((space) => {
              return (
                <div
                  key={space.id}
                  className="group relative p-5 rounded-3xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:shadow-2xl transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Category & Vibe & Expiry */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300 font-bold">
                        {space.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-400">
                          {formatExpiry(space.expiresAt)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded-lg border border-cyan-800/40">
                          <Users className="w-3 h-3" />
                          <span>{space.participantCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
                        {space.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1 leading-snug line-clamp-2">
                        {space.description}
                      </p>
                    </div>

                    {/* Vibe Tag */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                      <span>VIBE:</span>
                      <span className="text-neutral-200">{space.vibe.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Bottom Footer: Host & Enter Button */}
                  <div className="pt-4 mt-4 border-t border-neutral-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-neutral-300">
                        {space.hostHandle.substring(1, 3).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {space.hostHandle}
                      </span>
                    </div>

                    <Link
                      href={`/spaces/${space.id}`}
                      onClick={() => spacesSfx.playZoneChime()}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-cyan-500 hover:text-black border border-neutral-800 hover:border-cyan-400 text-xs font-mono font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>JOIN</span>
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
