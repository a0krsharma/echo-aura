"use client";

/**
 * app/spaces/[spaceId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: Active Dynamic 2D Metaverse World
 * Full Gather.town fidelity: category living space,
 * proximity voice, private rugs, whiteboard, and host controls.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import EchoSpacesWorld from "@/app/components/spaces/EchoSpacesWorld";
import ZoneContextDock from "@/app/components/spaces/ZoneContextDock";
import SpatialVoiceManager from "@/app/components/spaces/SpatialVoiceManager";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
import HostSettingsModal from "@/app/components/spaces/HostSettingsModal";
import WhiteboardCanvasModal from "@/app/components/spaces/WhiteboardCanvasModal";
import {
  SpaceDoc,
  SpaceZoneId,
  SpatialAvatar,
  AvatarConfig,
  InteractiveObject,
  DEFAULT_SPACES,
  DEFAULT_AMBIENT_BOTS,
  SPACES_ZONES,
  getSpaceDoc,
  updateSpaceDoc,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  ArrowLeft,
  Users,
  Settings,
  Palette,
  Edit3,
  Megaphone,
  Radio,
  Share2,
  Sparkles,
  Lock,
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

  // Modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);

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
    x: 800, // Central spawn near fountain
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

  // Handle Object Interaction
  const handleInteractObject = (obj: InteractiveObject) => {
    if (obj.type === "whiteboard") {
      setWhiteboardModalOpen(true);
      spacesSfx.playSitPop();
    } else if (obj.type === "fountain") {
      spacesSfx.playFountainSplash();
      handleSendSpeech("🪙 Tossed a coin into the Echo Fountain!");
    } else if (obj.type === "gavel") {
      spacesSfx.playGavelStrike();
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

  const isHost = user?.uid === space.hostUid || space.hostUid === "guest_host" || space.hostUid === "echo_system";
  const activeZoneDef = SPACES_ZONES[localAvatar.activeZone];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* 1. Global Announcement Ticker */}
      {space.announcement && space.announcement.expiresAt > Date.now() && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black px-4 py-2 font-mono text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
          <Megaphone className="w-4 h-4 animate-bounce" />
          <span>BROADCAST: {space.announcement.text}</span>
        </div>
      )}

      {/* 2. Top World Navigation & Command Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between z-30">
        {/* Left: Back to lobby & Space details */}
        <div className="flex items-center gap-3">
          <Link
            href="/spaces"
            className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Return to Spaces Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono text-white tracking-tight">
                {space.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-800/40 text-[10px] font-mono text-cyan-300">
                {space.category}
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                {space.vibe.replace("_", " ")}
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-2 mt-0.5">
              <span>ZONE: {activeZoneDef?.name || "Courtyard"}</span>
              {localAvatar.activeRugId && (
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>ON PRIVATE RUG</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: WebRTC Proximity Spatial Audio Manager */}
        <div className="hidden lg:block">
          <SpatialVoiceManager
            spaceId={space.id}
            localAvatar={localAvatar}
            remoteAvatars={remoteAvatars}
          />
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-2">
          {/* Share Room Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Invite Link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copiedLink ? "COPIED!" : "INVITE"}</span>
          </button>

          {/* Whiteboard Modal Trigger */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setWhiteboardModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Team Whiteboard"
          >
            <Edit3 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">BOARD</span>
          </button>

          {/* Avatar Studio */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setAvatarModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            title="Edit Avatar & Pet"
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">AVATAR</span>
          </button>

          {/* Host Settings */}
          {isHost && (
            <button
              onClick={() => {
                spacesSfx.playKeyNote(4);
                setHostModalOpen(true);
              }}
              className="p-2 rounded-xl border border-amber-800/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Host Suite (Atmosphere, Lifespan, Delete)"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">HOST</span>
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
          onMove={handleMove}
          onSit={handleSit}
          onSendSpeech={handleSendSpeech}
          onSendEmote={handleSendEmote}
          onZoneChange={handleZoneChange}
          onRugChange={handleRugChange}
          onInteractObject={handleInteractObject}
          onToggleGhost={handleToggleGhost}
        />
      </main>

      {/* 4. Bottom Context Dock (Zone tools: Piano, Pomodoro, Whiteboard, Emotes, Gavel) */}
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
    </div>
  );
}
