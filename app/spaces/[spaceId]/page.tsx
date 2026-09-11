"use client";

/**
 * app/spaces/[spaceId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: Active Dynamic 2D Metaverse World
 * Complete Gather.town fidelity:
 * - Top Location Dropdown ("📍 Fountain Room ˅")
 * - "Walk to desk" shortcut button & floor elevator jumps (1st, 3rd, 4th, ROOF)
 * - Bottom-Left Floating Gather Pill (Portrait, Name, Status, Mic, Cam, Reactions)
 * - Bottom-Right Floating Toolbar (Build Hammer, Whiteboard, Arcade, Chat, Attendees)
 * - Right Slide-out Drawer Panel (Room Chat & Participants Directory)
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import EchoSpacesWorld from "@/app/components/spaces/EchoSpacesWorld";
import SpatialVoiceManager from "@/app/components/spaces/SpatialVoiceManager";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
import HostSettingsModal from "@/app/components/spaces/HostSettingsModal";
import WhiteboardCanvasModal from "@/app/components/spaces/WhiteboardCanvasModal";
import SpaceArcadeModal from "@/app/components/spaces/SpaceArcadeModal";
import JukeboxModal from "@/app/components/spaces/JukeboxModal";
import GatherBottomDock from "@/app/components/spaces/GatherBottomDock";
import GatherRightDrawer, { SpaceChatMessage } from "@/app/components/spaces/GatherRightDrawer";
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
  Laptop,
  ChevronDown,
  Volume2,
  Tv,
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
    name: "Fountain Room",
    x: 800,
    y: 540,
  });

  // Top Location Dropdown Menu State
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);

  // Active Floor (Elevator Simulation)
  const [currentFloor, setCurrentFloor] = useState<string>("1st");

  // Right Drawer State
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState<"chat" | "participants">("chat");

  // Chat Messages History
  const [chatMessages, setChatMessages] = useState<SpaceChatMessage[]>([
    {
      id: "init_1",
      senderUid: "bot_breno",
      senderHandle: "Breno",
      text: "Hey everyone! Welcome to our Gather space.",
      timestamp: Date.now() - 1000 * 60 * 12,
      roomName: "Fountain Room",
    },
    {
      id: "init_2",
      senderUid: "bot_dalton",
      senderHandle: "Dalton",
      text: "Grabbing a coffee before sync! Let's play Super Mario after.",
      timestamp: Date.now() - 1000 * 60 * 4,
      roomName: "Fountain Room",
    },
  ]);

  // Modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);
  const [arcadeModalOpen, setArcadeModalOpen] = useState(false);
  const [jukeboxModalOpen, setJukeboxModalOpen] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());

  // Space Decoration Mode
  const [isDecorateMode, setIsDecorateMode] = useState(false);

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
    statusText: "Available",
    hoodieColor: "#38bdf8",
    avatarConfig,
    isSpeaking: false,
    lastUpdated: Date.now(),
  });

  // Remote Avatars (ambient bots + simulated room participants)
  const [remoteAvatars, setRemoteAvatars] = useState<SpatialAvatar[]>(DEFAULT_AMBIENT_BOTS);
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
    setRoomDropdownOpen(false);
  };

  // Walk to Desk Shortcut (Authentic Gather button from photo!)
  const handleWalkToDesk = () => {
    spacesSfx.playFootstep();
    // Desk in Strategy&Ops zone
    handleTeleport(270, 280);
    handleSit(true, "strategy_desk");
    handleSendSpeech("🪑 Arrived and seated at my desk in Strategy&Ops!");
  };

  // Elevator Floor Switcher
  const handleElevatorFloor = (floor: string) => {
    spacesSfx.playFocusBell();
    setCurrentFloor(floor);
    handleTeleport(800, 70);
    handleSendSpeech(`🛗 Took elevator to ${floor} Floor!`);
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

  // Handle Speech Bubble & Chat Log
  const handleSendSpeech = (text: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      speechBubble: { text, expiresAt: Date.now() + 5500 },
      lastUpdated: Date.now(),
    }));

    // Add to right drawer room messages
    const newMsg: SpaceChatMessage = {
      id: Math.random().toString(),
      senderUid: localAvatar.uid,
      senderHandle: localAvatar.handle,
      senderAvatar: localAvatar.avatarUrl,
      text,
      timestamp: Date.now(),
      roomName: SPACES_ZONES[localAvatar.activeZone]?.name || "Fountain Room",
    };
    setChatMessages((prev) => [...prev, newMsg]);
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

  // Handle User Handle Edit
  const handleUpdateHandle = (newHandle: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      handle: newHandle,
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

  // Room teleport presets (Matching Gather floor labels)
  const ROOM_PRESETS = [
    { name: "Fountain Room", icon: "⛲", x: 800, y: 560 },
    { name: "Strategy & Ops", icon: "🏢", x: 270, y: 280 },
    { name: "CW Balance", icon: "💻", x: 540, y: 280 },
    { name: "Retro Pixel Arcade", icon: "🕹️", x: 410, y: 420 },
    { name: "Silent Library", icon: "📚", x: 1200, y: 260 },
    { name: "Music Jam Studio", icon: "🎵", x: 260, y: 860 },
    { name: "Concert Amphitheater", icon: "🎤", x: 800, y: 860 },
    { name: "Debate Arena", icon: "⚖️", x: 1320, y: 860 },
    { name: "Campfire Patio", icon: "🪵", x: 800, y: 150 },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      {/* 1. Global Announcement Ticker */}
      {space.announcement && space.announcement.expiresAt > Date.now() && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black px-4 py-1 font-mono text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top z-50">
          <Megaphone className="w-3.5 h-3.5 animate-bounce" />
          <span>{space.announcement.text}</span>
        </div>
      )}

      {/* 2. Top World Navigation & Command Header (Gather.town exact layout) */}
      <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back & Room Dropdown Selector ("📍 Fountain Room ˅") */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/spaces"
            className="p-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Back to Spaces Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Gather Room Selector Pill ("📍 Fountain Room ˅") */}
          <div className="relative">
            <button
              onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeZoneDef?.name || "Fountain Room"}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Room Dropdown Fast-Travel Menu */}
            {roomDropdownOpen && (
              <div className="absolute top-10 left-0 w-60 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                  Teleport To Room
                </div>
                {ROOM_PRESETS.map((rm) => (
                  <button
                    key={rm.name}
                    onClick={() => handleTeleport(rm.x, rm.y)}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="text-base">{rm.icon}</span>
                    <span>{rm.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Private Rug Indicator */}
          {localAvatar.activeRugId && (
            <span className="hidden sm:flex text-cyan-400 font-bold items-center gap-1 text-[10px] font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 animate-pulse">
              <Lock className="w-2.5 h-2.5" />
              <span>PRIVATE AUDIO</span>
            </span>
          )}
        </div>

        {/* Center: Gather "Walk to desk" Button & Floor Elevators */}
        <div className="flex items-center gap-2">
          {/* Authentic Gather "Walk to desk" Button from reference photo */}
          <button
            onClick={handleWalkToDesk}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-cyan-400 hover:bg-cyan-950/40 text-neutral-200 hover:text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Automatically walk to your assigned workstation desk"
          >
            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Walk to desk</span>
          </button>

          {/* Floor Elevator Jump Buttons (1st, 3rd, 4th, ROOF) */}
          <div className="hidden md:flex items-center gap-1 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800 text-[11px] font-mono">
            <span className="text-neutral-500 text-[9px] px-1 font-bold">FLOOR:</span>
            {["1st", "3rd", "4th", "ROOF"].map((floor) => (
              <button
                key={floor}
                onClick={() => handleElevatorFloor(floor)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer font-bold ${
                  currentFloor === floor
                    ? "bg-cyan-500 text-black shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
                title={`Take elevator to ${floor} floor`}
              >
                {floor}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Jukebox, Whiteboard, Studio, Share, Settings */}
        <div className="flex items-center gap-1.5">
          {/* Spatial Voice Proximity Audio Manager */}
          <div className="hidden xl:block mr-2">
            <SpatialVoiceManager
              spaceId={space.id}
              localAvatar={localAvatar}
              remoteAvatars={remoteAvatars}
              onSpeakingUidsChange={setSpeakingUids}
            />
          </div>

          {/* Vinyl Jukebox */}
          <button
            onClick={() => setJukeboxModalOpen(true)}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Vinyl Jukebox"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
            title="Copy Invite Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Avatar Studio */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setAvatarModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-amber-400 transition-colors cursor-pointer"
            title="Edit Avatar & Companion Pet"
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
              className="p-2 rounded-xl border border-amber-800/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 transition-colors cursor-pointer"
              title="Host Suite"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 3. Main 2D Spatial Canvas Viewport (Fullscreen Immersive) */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
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

      {/* 4. Gather Bottom-Left Pill & Bottom-Right Toolbar */}
      <GatherBottomDock
        localAvatar={localAvatar}
        participantCount={remoteAvatars.length + 1}
        isDecorateMode={isDecorateMode}
        onToggleDecorateMode={() => setIsDecorateMode(!isDecorateMode)}
        isRightDrawerOpen={rightDrawerOpen}
        rightDrawerTab={rightDrawerTab}
        onToggleRightDrawer={(tab) => {
          if (rightDrawerOpen && rightDrawerTab === tab) {
            setRightDrawerOpen(false);
          } else {
            setRightDrawerOpen(true);
            setRightDrawerTab(tab);
          }
          spacesSfx.playKeyNote(2);
        }}
        onOpenArcade={() => setArcadeModalOpen(true)}
        onOpenWhiteboard={() => setWhiteboardModalOpen(true)}
        onSendEmote={handleSendEmote}
        onToggleHandRaise={handleToggleHandRaise}
        onUpdateStatus={handleUpdateStatus}
        onUpdateHandle={handleUpdateHandle}
      />

      {/* 5. Gather Right Slide-Out Drawer (Chat & Participants) */}
      <GatherRightDrawer
        isOpen={rightDrawerOpen}
        activeTab={rightDrawerTab}
        onClose={() => setRightDrawerOpen(false)}
        onTabChange={(t) => setRightDrawerTab(t)}
        currentZone={activeZoneDef?.name || "Fountain Room"}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        messages={chatMessages}
        onSendMessage={handleSendSpeech}
        onFollowAvatar={(target) => {
          handleTeleport(target.x - 30, target.y);
          handleSendSpeech(`👣 Walking with ${target.handle}`);
        }}
        onLocateAvatar={(target) => {
          handleTeleport(target.x, target.y);
        }}
      />

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
                {space.description || "2D spatial living space with proximity voice, rugs & arcades."}
              </p>
            </div>

            {/* Spawn Point Choice */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                Choose Where To Spawn:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_PRESETS.slice(0, 6).map((preset) => {
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
              <div>Press [X] near any desk or arcade to interact!</div>
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

      <SpaceArcadeModal
        isOpen={arcadeModalOpen}
        onClose={() => setArcadeModalOpen(false)}
        spaceId={space.id}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onUpdateStatus={handleUpdateStatus}
        onSendSpeech={handleSendSpeech}
      />

      <JukeboxModal
        isOpen={jukeboxModalOpen}
        onClose={() => setJukeboxModalOpen(false)}
      />
    </div>
  );
}
