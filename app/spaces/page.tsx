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
  deleteSpaceDoc,
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
  Share2,
  Trash2,
  Check,
  Gamepad2,
  Mic,
  Music,
  Crown,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  { id: "ALL", label: "All Spaces", icon: "🌐" },
  { id: "ARCADE", label: "Games & Ludo", icon: "🎲" },
  { id: "MUSIC", label: "Spotify & Music", icon: "🎵" },
  { id: "PIAZZA", label: "Cafe & Chat", icon: "☕" },
  { id: "WEBINAR", label: "Stage & Events", icon: "🎙️" },
];

const STARTER_PRESETS = [
  {
    id: "game_lounge",
    name: "Banquet Game Lounge",
    icon: "🎲",
    category: "ARCADE" as SpaceCategory,
    vibe: "PARTY_CLUB" as SpaceVibe,
    floorPlanType: "ballroom" as const,
    desc: "Multiplayer table games: Ludo, UNO, Spin the Bottle & Rock Paper Scissors.",
    tag: "Ludo & Party Games",
    btnBg: "bg-pink-500 hover:bg-pink-400 text-black",
  },
  {
    id: "spotify_beats",
    name: "Spotify Beats & Co-Listen",
    icon: "🎵",
    category: "MUSIC" as SpaceCategory,
    vibe: "SUNSET_LOFI" as SpaceVibe,
    floorPlanType: "ballroom" as const,
    desc: "Synced Spotify party radio & music co-listening with friends.",
    tag: "Spotify Sync",
    btnBg: "bg-emerald-500 hover:bg-emerald-400 text-black",
  },
  {
    id: "cozy_hangout",
    name: "Sukoon Cafe Lounge",
    icon: "☕",
    category: "PIAZZA" as SpaceCategory,
    vibe: "SUKOON_ZEN" as SpaceVibe,
    floorPlanType: "piazza_cafe" as const,
    desc: "Cozy spatial lounge with proximity voice audio and relaxed seating.",
    tag: "Voice Chat",
    btnBg: "bg-cyan-500 hover:bg-cyan-400 text-black",
  },
];

export default function SpacesLobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [spaces, setSpaces] = useState<SpaceDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [quickHosting, setQuickHosting] = useState<string | null>(null);

  const [deletingSpaceId, setDeletingSpaceId] = useState<string | null>(null);
  const [copiedSpaceId, setCopiedSpaceId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

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

  // Real-time Firestore subscription (Real live spaces only)
  useEffect(() => {
    const unsub = subscribeToPublicSpaces((loaded) => {
      setSpaces(loaded);
    });
    return () => unsub();
  }, []);

  // ⚡ 1-Click Instant Host (Zero Friction, Instant Entry)
  const handle1ClickInstantHost = async (customName?: string) => {
    try {
      setQuickHosting("instant_host");
      spacesSfx.playKeyNote(4);
      const hostHandle = user?.handle || "@HOST";
      const hostUid = user?.uid || "guest_host";
      const spaceName = customName || `${hostHandle}'s Party & Game Lounge`;

      const createdId = await createSpaceDoc({
        name: spaceName,
        category: "ARCADE",
        vibe: "PARTY_CLUB",
        hostUid,
        hostHandle,
        description: "Live spatial lounge with table games (Ludo & UNO), mic proximity voice, and synced Spotify music.",
        participantCount: 1,
        maxParticipants: 50,
        isPublic: true,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
        decorations: [],
        createdAt: Date.now(),
        floorPlanType: "ballroom",
      });

      spacesSfx.playZoneChime();
      setStatusFeedback("🚀 Space created! Entering room...");
      router.push(`/spaces/${createdId}`);
    } catch (e) {
      console.error("Failed to 1-click host space:", e);
      setStatusFeedback("Failed to host space. Please try again.");
    } finally {
      setQuickHosting(null);
    }
  };

  // 1-Click Instant Host for Friends (Presets)
  const handle1ClickQuickHost = async (preset: (typeof STARTER_PRESETS)[0]) => {
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

  // Delete Space action
  const handleDeleteSpace = async (spaceId: string, spaceName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${spaceName}"? This space will be permanently removed.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingSpaceId(spaceId);
      spacesSfx.playGavelStrike();
      await deleteSpaceDoc(spaceId);
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      setStatusFeedback(`Space "${spaceName}" deleted.`);
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to delete space:", err);
      alert("Could not delete space. Please try again.");
    } finally {
      setDeletingSpaceId(null);
    }
  };

  // Copy Share Link
  const handleCopyLink = (spaceId: string) => {
    const url = `${window.location.origin}/spaces/${spaceId}`;
    navigator.clipboard.writeText(url);
    setCopiedSpaceId(spaceId);
    spacesSfx.playKeyNote(3);
    setStatusFeedback("Invite link copied to clipboard! Share it with friends.");
    setTimeout(() => {
      setCopiedSpaceId(null);
      setStatusFeedback(null);
    }, 2500);
  };

  // Filter spaces
  const filteredSpaces = spaces.filter((s) => {
    if (selectedCategory !== "ALL" && s.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchHost = s.hostHandle?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchHost) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black pb-28 md:pb-16">
      {/* Toast Feedback */}
      {statusFeedback && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2">
          {statusFeedback}
        </div>
      )}

      {/* 1. Header Bar */}
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
                SPACES
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
                LIVE SOCIAL ROOMS
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
              onClick={() => handle1ClickInstantHost()}
              disabled={!!quickHosting}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {quickHosting === "instant_host" ? (
                <span className="animate-spin text-xs">⏳ Launching...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-black" />
                  <span>1-CLICK HOST A SPACE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Essentials Hero Banner: Host, Invite, Gameplay, Mic, Spotify */}
      <div className="border-b border-neutral-900 bg-gradient-to-b from-neutral-950 via-neutral-900/30 to-black py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>ONLINE METAVERSE • 5 MUST-HAVES</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                Hangout, Play Games & Sync Music Live
              </h1>
              <p className="text-neutral-400 text-xs sm:text-sm font-mono max-w-2xl">
                Create a room in 1 click, share the invite link with friends, turn on your mic, play Ludo or UNO at banquet tables, and co-listen to Spotify in sync.
              </p>
            </div>

            <button
              onClick={() => handle1ClickInstantHost()}
              disabled={!!quickHosting}
              className="self-start md:self-center px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {quickHosting === "instant_host" ? (
                <span className="animate-spin text-xs">⏳ Launching Room...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Start My Space (1-Click)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick 5 Essentials Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
            {[
              { icon: <Crown className="w-4 h-4 text-amber-400" />, title: "1-Click Host", desc: "Start instantly" },
              { icon: <Share2 className="w-4 h-4 text-cyan-400" />, title: "Invite Friends", desc: "Direct join link" },
              { icon: <Gamepad2 className="w-4 h-4 text-pink-400" />, title: "Table Games", desc: "Ludo, UNO & Bottle" },
              { icon: <Mic className="w-4 h-4 text-emerald-400" />, title: "Mic Control", desc: "Spatial proximity" },
              { icon: <Music className="w-4 h-4 text-purple-400" />, title: "Spotify Sync", desc: "Party beats together" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-2.5"
              >
                <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">{item.title}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 1-Click Starter Presets */}
      <div className="border-b border-neutral-900 bg-neutral-950/40 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono font-black uppercase text-white tracking-wider">
              Quick 1-Click Starter Spaces
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STARTER_PRESETS.map((preset) => {
              const isLaunching = quickHosting === preset.id;
              return (
                <div
                  key={preset.id}
                  className="p-4 rounded-3xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{preset.icon}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                        {preset.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {preset.name}
                      </h3>
                      <p className="text-xs font-mono text-neutral-400 mt-1 leading-snug">
                        {preset.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handle1ClickQuickHost(preset)}
                    disabled={!!quickHosting}
                    className={`mt-4 w-full py-2.5 rounded-2xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 ${preset.btnBg}`}
                  >
                    {isLaunching ? (
                      <span className="animate-spin text-xs">⏳ Launching...</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Launch & Invite Friends</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Live Active Spaces Directory */}
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
                placeholder="Search live spaces by title or host..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/50 text-white font-bold"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Spaces Grid */}
        {filteredSpaces.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-3xl border border-neutral-900 bg-neutral-950/40 p-6">
            <div className="w-14 h-14 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono">No Live Spaces Right Now</h3>
              <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto leading-relaxed">
                Be the first to host! Launch a space above in 1-click, send your friend the invite link, and start playing Ludo or listening to music together.
              </p>
            </div>
            <button
              onClick={() => handle1ClickInstantHost()}
              disabled={!!quickHosting}
              className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {quickHosting === "instant_host" ? "⏳ Creating Space..." : "+ 1-CLICK HOST A SPACE"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpaces.map((space) => {
              const isDeleting = deletingSpaceId === space.id;
              const isCopied = copiedSpaceId === space.id;

              return (
                <div
                  key={space.id}
                  className="group relative p-5 rounded-3xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:shadow-2xl transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Category & Online Count & Delete Space Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-xl">
                        <Users className="w-3.5 h-3.5" />
                        <span>{space.participantCount || 1} online</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy Invite Link */}
                        <button
                          onClick={() => handleCopyLink(space.id)}
                          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Invite Link"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Space Delete Button */}
                        <button
                          onClick={() => handleDeleteSpace(space.id, space.name)}
                          disabled={isDeleting}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Space"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Space Name & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white font-mono group-hover:text-cyan-400 transition-colors leading-snug">
                        {space.name}
                      </h3>
                      {space.description && (
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">
                          {space.description}
                        </p>
                      )}
                    </div>

                    {/* Host Profile Info */}
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
                            <span>{space.hostHandle?.slice(1, 3).toUpperCase() || "HO"}</span>
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
                            Table Games & Mic Active
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono text-neutral-400 uppercase">VIBE</div>
                        <div className="text-[10px] font-mono text-neutral-300">
                          {space.vibe?.replace("_", " ") || "CASUAL"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Quick Join CTA */}
                  <div className="pt-4 mt-4 border-t border-neutral-900 flex items-center justify-between">
                    <button
                      onClick={() => handleCopyLink(space.id)}
                      className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{isCopied ? "Link Copied!" : "Invite Friends"}</span>
                    </button>

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
