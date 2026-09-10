"use client";

/**
 * app/spaces/[spaceId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: Active Dynamic 2D Metaverse World
 * Full Gather.town fidelity: category living space,
 * proximity voice, private rugs, whiteboard, and host controls.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import EchoSpacesWorld from "@/app/components/spaces/EchoSpacesWorld";
import ZoneContextDock from "@/app/components/spaces/ZoneContextDock";
import SpatialVoiceManager from "@/app/components/spaces/SpatialVoiceManager";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
import HostSettingsModal from "@/app/components/spaces/HostSettingsModal";
import WhiteboardCanvasModal from "@/app/components/spaces/WhiteboardCanvasModal";
import ArcadeMiniGameModal from "@/app/components/spaces/ArcadeMiniGameModal";
import JukeboxModal from "@/app/components/spaces/JukeboxModal";
import {
  SpaceDoc,
  SpaceZoneId,
  SpatialAvatar,
  AvatarConfig,
  InteractiveObject,
  CustomDecoration,
  DEFAULT_SPACES,
  DEFAULT_AMBIENT_BOTS,
  SPACES_ZONES,
  getSpaceDoc,
  updateSpaceDoc,
  getZoneAtCoordinates,
  getPrivateRugAtCoordinates,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  ArrowLeft,
  Users,
  Settings,
  Palette,
  Edit3,
  Megaphone,
  Share2,
  Sparkles,
  Lock,
  Compass,
  ArrowRight,
  MapPin,
  Check,
} from "lucide-react";

export default function DynamicSpaceWorldPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const spaceId = (params?.spaceId as string) || "genesis_campus";

  // Space Doc State
  const [space, setSpace] = useState<SpaceDoc>(() => {
    return DEFAULT_SPACES.find((s) => s.id === spaceId) || DEFAULT_SPACES[0];
  });
  const [loading, setLoading] = useState(true);

  // Check-In / Welcome Entry Modal State
  const [hasEntered, setHasEntered] = useState(false);
  const [chosenSpawn, setChosenSpawn] = useState<{ name: string; x: number; y: number }>({
    name: "Central Courtyard Fountain",
    x: 800,
    y: 540,
  });

  // Modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);
  const [arcadeModalOpen, setArcadeModalOpen] = useState(false);
  const [jukeboxModalOpen, setJukeboxModalOpen] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());

  // Avatar Config
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

  // Local Avatar State
  const [localAvatar, setLocalAvatar] = useState<SpatialAvatar>({
    uid: user?.uid || "guest_player",
    handle: user?.handle || "@EXPLORER",
    avatarUrl: user?.photoUrl || user?.photoURL,
    x: 800,
    y: 540,
    direction: "down",
    isMoving: false,
    isSitting: false,
    activeZone: "courtyard",
    activeRugId: null,
    hoodieColor: "#38bdf8",
    avatarConfig,
    isSpeaking: false,
    lastUpdated: Date.now(),
  });

  // Remote Avatars (ambient bots + simulated room participants)
  const [remoteAvatars, setRemoteAvatars] = useState<SpatialAvatar[]>(DEFAULT_AMBIENT_BOTS);
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load avatar config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_spaces_avatar");
      if (saved) {
        const parsed = JSON.parse(saved);
        setAvatarConfig(parsed);
        setLocalAvatar((prev) => ({
          ...prev,
          avatarConfig: parsed,
          hoodieColor: parsed.outfitColor || prev.hoodieColor,
        }));
      }
    } catch (e) {}
  }, []);

  // Fetch Space Doc from Firestore
  useEffect(() => {
    let isMounted = true;
    getSpaceDoc(spaceId).then((loaded) => {
      if (!isMounted) return;
      if (loaded) {
        setSpace(loaded);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [spaceId]);

  // Sync user profile updates
  useEffect(() => {
    if (user) {
      setLocalAvatar((prev) => ({
        ...prev,
        uid: user.uid,
        handle: user.handle || prev.handle,
        avatarUrl: user.photoUrl || user.photoURL || prev.avatarUrl,
      }));
    }
  }, [user]);

  // Save Avatar updates
  const handleSaveAvatar = (cfg: AvatarConfig) => {
    setAvatarConfig(cfg);
    setLocalAvatar((prev) => ({
      ...prev,
      avatarConfig: cfg,
      hoodieColor: cfg.outfitColor,
    }));
    try {
      localStorage.setItem("echo_spaces_avatar", JSON.stringify(cfg));
    } catch (e) {}
  };

  // Toggle Ghost Mode [G]
  const handleToggleGhost = () => {
    setLocalAvatar((prev) => {
      const nextGhost = !prev.avatarConfig?.isGhost;
      const nextCfg: AvatarConfig = {
        ...(prev.avatarConfig || avatarConfig),
        isGhost: nextGhost,
      };
      return {
        ...prev,
        avatarConfig: nextCfg,
      };
    });
  };

  // Fast Travel Teleport
  const handleTeleport = (x: number, y: number) => {
    spacesSfx.playZoneChime();
    const nextZone = getZoneAtCoordinates(x, y);
    const nextRug = getPrivateRugAtCoordinates(x, y);
    setLocalAvatar((prev) => ({
      ...prev,
      x,
      y,
      activeZone: nextZone,
      activeRugId: nextRug ? nextRug.id : null,
      isMoving: false,
      lastUpdated: Date.now(),
    }));
  };

  // Confirm Enter Space from Check-In Gate
  const handleEnterSpaceNow = () => {
    spacesSfx.playZoneChime();
    setHasEntered(true);
    handleTeleport(chosenSpawn.x, chosenSpawn.y);
  };

  // Handle Movement
  const handleMove = (x: number, y: number, dir: "down" | "up" | "left" | "right", isMoving: boolean) => {
    setLocalAvatar((prev) => ({
      ...prev,
      x,
      y,
      direction: dir,
      isMoving,
      isSitting: isMoving ? false : prev.isSitting,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Sitting
  const handleSit = (isSitting: boolean, objectId?: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      isSitting,
      sittingObjectId: objectId,
      isMoving: false,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Zone Change
  const handleZoneChange = (newZone: SpaceZoneId) => {
    setLocalAvatar((prev) => ({
      ...prev,
      activeZone: newZone,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Private Rug Change
  const handleRugChange = (rugId: string | null) => {
    setLocalAvatar((prev) => ({
      ...prev,
      activeRugId: rugId,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Speech Bubble
  const handleSendSpeech = (text: string) => {
    setActiveSpeech(text);
    setLocalAvatar((prev) => ({
      ...prev,
      speechBubble: { text, expiresAt: Date.now() + 5500 },
      lastUpdated: Date.now(),
    }));
  };

  // Handle Emote
  const handleSendEmote = (emote: string) => {
    handleSendSpeech(emote);
  };

  // Handle Status text update
  const handleUpdateStatus = (status: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      statusText: status,
      lastUpdated: Date.now(),
    }));
  };

  // Toggle Hand Raise [H]
  const handleToggleHandRaise = () => {
    const nextHand = !localAvatar.isHandRaised;
    spacesSfx.playHandRaise();
    setLocalAvatar((prev) => ({
      ...prev,
      isHandRaised: nextHand,
      lastUpdated: Date.now(),
    }));
    if (nextHand) {
      handleSendSpeech("✋ Hand raised");
    }
  };

  // Toggle Holding Fresh Coffee Mug
  const handleToggleCoffee = () => {
    const nextCoffee = !localAvatar.hasCoffee;
    spacesSfx.playCoffeeBrew();
    setLocalAvatar((prev) => ({
      ...prev,
      hasCoffee: nextCoffee,
      lastUpdated: Date.now(),
    }));
    if (nextCoffee) {
      handleSendSpeech("☕ Brewing fresh barista espresso!");
    }
  };

  // Handle Object Interaction
  const handleInteractObject = (obj: InteractiveObject) => {
    if (obj.type === "whiteboard") {
      setWhiteboardModalOpen(true);
      spacesSfx.playSitPop();
    } else if (obj.type === "arcade" || obj.id === "office_arcade_cabinet") {
      setArcadeModalOpen(true);
      spacesSfx.playKeyNote(4);
    } else if (obj.type === "jukebox" || obj.id === "music_jukebox") {
      setJukeboxModalOpen(true);
      spacesSfx.playKeyNote(3);
    } else if (obj.type === "coffee" || obj.id === "office_coffee_bar") {
      handleToggleCoffee();
    } else if (obj.type === "fountain") {
      spacesSfx.playFountainSplash();
      handleSendSpeech("🪙 Tossed a coin into the Echo Fountain!");
    } else if (obj.type === "gavel") {
      spacesSfx.playGavelStrike();
      handleSendSpeech("🔨 Order in the court!");
    } else if (obj.type === "pomodoro") {
      spacesSfx.playFocusBell();
    } else if (obj.type === "piano") {
      spacesSfx.playKeyNote(1);
    } else if (obj.type === "drums") {
      spacesSfx.playDrumPad("kick");
    }
  };

  // Save Whiteboard drawings to Firestore
  const handleSaveWhiteboard = async (serialized: string) => {
    try {
      await updateSpaceDoc(space.id, { whiteboardDrawings: serialized });
      setSpace((prev) => ({ ...prev, whiteboardDrawings: serialized }));
    } catch (err) {
      console.error("Error saving whiteboard:", err);
    }
  };

  // Share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    spacesSfx.playKeyNote(5);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Custom Decorations Update & Firestore persistence
  const handleUpdateDecorations = async (decos: CustomDecoration[]) => {
    setSpace((prev) => ({ ...prev, decorations: decos }));
    try {
      await updateSpaceDoc(space.id, { decorations: decos });
    } catch (err) {
      console.warn("Failed syncing decorations:", err);
    }
  };

  const isHost = user?.uid === space.hostUid || space.hostUid === "guest_host" || space.hostUid === "echo_system";
  const activeZoneDef = SPACES_ZONES[localAvatar.activeZone];

  const SPAWN_PRESETS = [
    { name: "Courtyard Fountain", icon: "⛲", x: 800, y: 540 },
    { name: "Office", icon: "🏢", x: 400, y: 260 },
    { name: "Library", icon: "📚", x: 1200, y: 260 },
    { name: "Music", icon: "🎵", x: 260, y: 860 },
    { name: "Concert", icon: "🎤", x: 800, y: 860 },
    { name: "Debate", icon: "⚖️", x: 1320, y: 860 },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* 1. Global Announcement Ticker */}
      {space.announcement && space.announcement.expiresAt > Date.now() && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black px-4 py-1.5 font-mono text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
          <Megaphone className="w-4 h-4 animate-bounce" />
          <span>{space.announcement.text}</span>
        </div>
      )}

      {/* 2. Top World Navigation & Command Header (Clean & Icon-Driven) */}
      <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between z-30">
        {/* Left: Back, Space Name, Zone */}
        <div className="flex items-center gap-3">
          <Link
            href="/spaces"
            className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold font-mono text-white tracking-tight">
              {space.name}
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-800/40 text-[10px] font-mono text-cyan-300">
              {space.category}
            </span>
            {localAvatar.activeRugId && (
              <span className="text-cyan-400 font-bold flex items-center gap-1 text-[10px] font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                <Lock className="w-2.5 h-2.5" />
                <span>RUG</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Spatial Voice Proximity */}
        <div className="hidden md:block">
          <SpatialVoiceManager
            spaceId={space.id}
            localAvatar={localAvatar}
            remoteAvatars={remoteAvatars}
            onSpeakingUidsChange={setSpeakingUids}
          />
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-1.5">
          {/* Fast Doorway Jump Pills */}
          <div className="hidden lg:flex items-center gap-1 mr-2 bg-neutral-900/60 p-1 rounded-2xl border border-neutral-800">
            {SPAWN_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleTeleport(preset.x, preset.y)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer text-xs"
                title={`Jump to ${preset.name}`}
              >
                <span>{preset.icon}</span>
              </button>
            ))}
          </div>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-mono transition-all cursor-pointer"
            title="Copy Invite Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Whiteboard */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setWhiteboardModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-mono transition-all cursor-pointer"
            title="Open Team Whiteboard"
          >
            <Edit3 className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Avatar Studio */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setAvatarModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-amber-400 text-xs font-mono transition-all cursor-pointer"
            title="Edit Avatar & Pet"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Host Settings */}
          {isHost && (
            <button
              onClick={() => {
                spacesSfx.playKeyNote(4);
                setHostModalOpen(true);
              }}
              className="p-2 rounded-xl border border-amber-800/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Host Suite"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 3. Main 2D Spatial Canvas Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <EchoSpacesWorld
          localAvatar={localAvatar}
          remoteAvatars={remoteAvatars}
          vibe={space.vibe}
          decorations={space.decorations || []}
          speakingUids={speakingUids}
          onMove={handleMove}
          onSit={handleSit}
          onSendSpeech={handleSendSpeech}
          onSendEmote={handleSendEmote}
          onZoneChange={handleZoneChange}
          onRugChange={handleRugChange}
          onInteractObject={handleInteractObject}
          onToggleGhost={handleToggleGhost}
          onToggleHandRaise={handleToggleHandRaise}
          onToggleCoffee={handleToggleCoffee}
          onOpenArcade={() => setArcadeModalOpen(true)}
          onOpenJukebox={() => setJukeboxModalOpen(true)}
          onOpenWhiteboard={() => setWhiteboardModalOpen(true)}
          onTeleport={handleTeleport}
          onOpenAvatarStudio={() => setAvatarModalOpen(true)}
          onUpdateDecorations={handleUpdateDecorations}
        />
      </main>

      {/* 5. Bottom Context Dock */}
      <footer className="w-full max-w-7xl mx-auto px-4 pb-4">
        <ZoneContextDock
          currentZone={localAvatar.activeZone}
          onSendEmote={handleSendEmote}
          onUpdateStatus={handleUpdateStatus}
          onTossCoin={() => {
            spacesSfx.playFountainSplash();
            handleSendSpeech("🪙 Tossed a coin in the Fountain!");
          }}
        />
      </footer>

      {/* Check-In Welcome Gate Modal (Makes entering seamless & transparent) */}
      {!hasEntered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold font-mono text-white tracking-tight">
                ENTER {space.name.toUpperCase()}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                {space.description || "2D spatial living space with proximity voice & rugs."}
              </p>
            </div>

            {/* Spawn Point Choice */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                Choose Where To Spawn:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SPAWN_PRESETS.map((preset) => {
                  const isSelected = chosenSpawn.name === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setChosenSpawn(preset);
                        spacesSfx.playKeyNote(1);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="truncate">{preset.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enter Button */}
            <button
              onClick={handleEnterSpaceNow}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>STEP INTO SPACE</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick tips */}
            <div className="text-[10px] font-mono text-neutral-500 text-center space-y-1">
              <div>💡 Tip: Click anywhere on floor or use [W,A,S,D] to walk.</div>
              <div>Press [G] to activate Ghost Mode and walk through walls!</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AvatarStudioModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentConfig={avatarConfig}
        onSave={handleSaveAvatar}
      />

      <HostSettingsModal
        isOpen={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        space={space}
        onSpaceUpdated={(updates) => setSpace((prev) => ({ ...prev, ...updates }))}
      />

      <WhiteboardCanvasModal
        isOpen={whiteboardModalOpen}
        onClose={() => setWhiteboardModalOpen(false)}
        initialDrawings={space.whiteboardDrawings}
        onSave={handleSaveWhiteboard}
      />

      <ArcadeMiniGameModal
        isOpen={arcadeModalOpen}
        onClose={() => setArcadeModalOpen(false)}
      />

      <JukeboxModal
        isOpen={jukeboxModalOpen}
        onClose={() => setJukeboxModalOpen(false)}
      />
    </div>
  );
}
