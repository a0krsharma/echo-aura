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
import GatherMeetingGrid from "@/app/components/spaces/GatherMeetingGrid";
import GatherActivityMapModal from "@/app/components/spaces/GatherActivityMapModal";
import GatherWaveToast, { WaveInvitation } from "@/app/components/spaces/GatherWaveToast";
import GatherDirectDock from "@/app/components/spaces/GatherDirectDock";
import InviteFriendsModal from "@/app/components/spaces/InviteFriendsModal";
import HostEventModal from "@/app/components/spaces/HostEventModal";
import MiniMapRadar from "@/app/components/spaces/MiniMapRadar";
import HostQuickControlBar from "@/app/components/spaces/HostQuickControlBar";
import PartyToolsModal from "@/app/components/spaces/PartyToolsModal";
import AutoSeatingModal from "@/app/components/spaces/AutoSeatingModal";
import SpaceCateringModal from "@/app/components/spaces/SpaceCateringModal";
import SpaceGiftingModal from "@/app/components/spaces/SpaceGiftingModal";
import { UnoGameModal } from "@/app/components/spaces/UnoGameModal";
import BirthdayCakeModal from "@/app/components/spaces/BirthdayCakeModal";
import { PartyTableGamesModal, PartyGameTab } from "@/app/components/spaces/PartyTableGamesModal";
import { PartyMusicBar } from "@/app/components/spaces/PartyMusicBar";
import {
  getWalletState,
  canClaimDailyReward,
  claimDailyReward,
  TableDish,
  ChairReservation,
  BoutiqueOutfit,
} from "@/lib/spacesEconomy";
import { playNomEating, playCashRegister } from "@/lib/spacesSfx";
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
  Edit2,
  Wine,
  UtensilsCrossed,
  Gift,
  Armchair,
  Dices,
  Coins,
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
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [activityMapOpen, setActivityMapOpen] = useState(false);
  const [activeWave, setActiveWave] = useState<WaveInvitation | null>(null);
  const [directDockTarget, setDirectDockTarget] = useState<SpatialAvatar | null>(null);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [hostEventModalOpen, setHostEventModalOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [confettiBlastCount, setConfettiBlastCount] = useState(0);
  const [gatherToast, setGatherToast] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeScreenStream, setActiveScreenStream] = useState<MediaStream | null>(null);
  const canvasElementRef = React.useRef<HTMLCanvasElement | null>(null);

  // Virtual Economy & Social Party States
  const [walletCash, setWalletCash] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return getWalletState().cash;
    }
    return 500;
  });
  const [cateringModalOpen, setCateringModalOpen] = useState(false);
  const [giftingModalOpen, setGiftingModalOpen] = useState(false);
  const [seatingModalOpen, setSeatingModalOpen] = useState(false);
  const [unoModalOpen, setUnoModalOpen] = useState(false);
  const [partyTableGamesOpen, setPartyTableGamesOpen] = useState(false);
  const [partyTableGameTab, setPartyTableGameTab] = useState<PartyGameTab>("ludo");
  const [partyMusicDockExpanded, setPartyMusicDockExpanded] = useState(false);
  const [birthdayCakeModalOpen, setBirthdayCakeModalOpen] = useState(false);
  const [birthdayStar, setBirthdayStar] = useState<{ isBirthdayMode: boolean; name: string; gender: "boy" | "girl" }>({
    isBirthdayMode: false,
    name: "",
    gender: "boy",
  });
  const [screenConfettiActive, setScreenConfettiActive] = useState(false);
  const [giftReceivedToast, setGiftReceivedToast] = useState<{ from: string; giftName: string; icon: string } | null>(null);

  // Table dishes placed on Banquet Table
  const [tableDishes, setTableDishes] = useState<TableDish[]>([
    {
      id: "init_naan",
      itemId: "butter_naan_feast",
      name: "Butter Naan & Dal Makhani Feast",
      icon: "🫓",
      x: 1120,
      y: 350,
      orderedBy: "Gather Chef",
      orderedAt: Date.now(),
      bitesLeft: 6,
    },
    {
      id: "init_pasta",
      itemId: "creamy_pasta",
      name: "Truffle Alfredo Italian Pasta",
      icon: "🍝",
      x: 1200,
      y: 350,
      orderedBy: "Gather Chef",
      orderedAt: Date.now(),
      bitesLeft: 4,
    },
    {
      id: "init_champagne",
      itemId: "vintage_champagne",
      name: "Vintage Sparkling Champagne",
      icon: "🍾",
      x: 1280,
      y: 350,
      orderedBy: "Gather Chef",
      orderedAt: Date.now(),
      bitesLeft: 5,
    },
  ]);

  // Smart Banquet Chair Reservations
  const [chairReservations, setChairReservations] = useState<ChairReservation[]>([]);

  // Handlers for Dish bites & Daily Reward
  const handleBiteDish = (dishId: string) => {
    playNomEating();
    setTableDishes((prev) => {
      return prev
        .map((d) => {
          if (d.id === dishId) {
            const nextBites = d.bitesLeft - 1;
            if (nextBites <= 0) {
              handleSendSpeech(`😋 Finished every bite of ${d.name}! So satisfying.`);
              return null;
            }
            handleSendSpeech(`🍽️ Took a delicious bite of ${d.name}! (${nextBites} bites left)`);
            return { ...d, bitesLeft: nextBites };
          }
          return d;
        })
        .filter(Boolean) as TableDish[];
    });
  };

  const handleClaimDailyAllowance = () => {
    const success = claimDailyReward();
    if (success) {
      playCashRegister();
      setWalletCash(getWalletState().cash);
      handleSendSpeech("💵 Claimed daily +$100 Echo Cash reward!");
    }
  };

  const refreshWalletCash = () => {
    setWalletCash(getWalletState().cash);
  };

  const handleEquipOutfit = (outfit: BoutiqueOutfit) => {
    const updated = {
      ...avatarConfig,
      outfit: outfit.outfitType as any,
      outfitColor: outfit.color,
      accessory: (outfit.accessory || avatarConfig.accessory) as any,
    };
    setAvatarConfig(updated);
    setLocalAvatar((prev) => ({
      ...prev,
      avatarConfig: updated,
      hoodieColor: outfit.color,
    }));
    try {
      localStorage.setItem("echo_spaces_avatar", JSON.stringify(updated));
    } catch {}
    handleSendSpeech(`✨ Swapped into fresh boutique fit: ${outfit.name}!`);
  };

  const handleSendGift = (recipient: string, giftName: string, icon: string) => {
    setGiftReceivedToast({ from: localAvatar.handle, giftName, icon });
    setTimeout(() => setGiftReceivedToast(null), 5000);
    handleSendSpeech(`🎁 ${localAvatar.handle} sent ${giftName} (${icon}) to ${recipient}!`);
  };

  // Screen Confetti Explosion Watcher
  useEffect(() => {
    if (confettiBlastCount > 0) {
      setScreenConfettiActive(true);
      const timer = setTimeout(() => setScreenConfettiActive(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [confettiBlastCount]);

  // Handle Serving Birthday Cake directly to table
  const handleServeCake = () => {
    const cakeExists = tableDishes.some((d) => d.itemId === "birthday_cake");
    if (!cakeExists) {
      const cakeDish: TableDish = {
        id: `cake_${Date.now()}`,
        itemId: "birthday_cake",
        name: "Triple Chocolate Birthday Celebration Cake",
        icon: "🎂",
        x: 1200,
        y: 350,
        orderedBy: localAvatar.handle,
        orderedAt: Date.now(),
        bitesLeft: 8,
      };
      setTableDishes((prev) => [...prev, cakeDish]);
    }
    setBirthdayCakeModalOpen(true);
    spacesSfx.playPartyFanfare();
    handleTriggerConfetti();
    handleSendSpeech(`🎂 The Grand Birthday Celebration Cake is served on the Banquet Table! Gather round! ✨`);
  };

  // Handle Dressing as Birthday Boy or Girl
  const handleDressBirthday = (gender: "boy" | "girl") => {
    const updated: AvatarConfig = {
      ...avatarConfig,
      outfit: gender === "boy" ? "tuxedo" : "dress",
      outfitColor: gender === "boy" ? "#38bdf8" : "#f43f5e",
      accessory: "crown",
      headwear: "crown",
      aura: gender === "boy" ? "stardust" : "flame",
      expression: "smile",
    };
    setAvatarConfig(updated);
    setLocalAvatar((prev) => ({
      ...prev,
      avatarConfig: updated,
      hoodieColor: updated.outfitColor,
      statusText: gender === "boy" ? "🎂 Birthday Boy! VIP Star" : "👑 Birthday Queen! Celebrating Today 🎂",
    }));

    setBirthdayStar({
      isBirthdayMode: true,
      name: localAvatar.handle,
      gender,
    });

    try {
      localStorage.setItem("echo_spaces_avatar", JSON.stringify(updated));
    } catch {}

    setSpace((prev) => ({ ...prev, vibe: "PARTY_CLUB" }));

    spacesSfx.playPartyFanfare();
    handleTriggerConfetti();
    handleSendSpeech(
      gender === "boy"
        ? `👑 @${localAvatar.handle} is dressed up as the Birthday Boy! Come give wishes & gifts! 🎉🎂`
        : `👑 @${localAvatar.handle} is dressed up as the Birthday Girl! Come give wishes & gifts! 🎉🎂`
    );
  };

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
      // Check URL query parameters for ?mode=ghost (from invite link)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("mode") === "ghost") {
          setAvatarConfig((prev) => ({ ...prev, isGhost: true }));
          setLocalAvatar((prev) => ({
            ...prev,
            avatarConfig: {
              ...(prev.avatarConfig || avatarConfig),
              isGhost: true,
            },
          }));
        }
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

  // Wave Them Over [Image 4]
  const handleWaveAvatar = (target: SpatialAvatar) => {
    spacesSfx.playHandRaise();
    handleSendSpeech(`👋 Waved at ${target.handle}!`);
    setTimeout(() => {
      setActiveWave({
        id: Math.random().toString(),
        senderHandle: target.handle,
        targetX: target.x,
        targetY: target.y,
        roomName: SPACES_ZONES[target.activeZone]?.name || "Virtual Pod",
        timestamp: Date.now(),
      });
      spacesSfx.playKeyNote(5);
    }, 1000);
  };

  // Direct 1-on-1 Chat & Video [Image 3]
  const handleDirectMessage = (target: SpatialAvatar) => {
    setDirectDockTarget(target);
    spacesSfx.playKeyNote(2);
  };

  // Join Pod in 1-Click [Image 2 & 4]
  const handleTeleportToPod = (x: number, y: number, podName: string) => {
    handleTeleport(x, y);
    handleSendSpeech(`🚀 Joined ${podName}!`);
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

  // Handle Gathering Friends to a location
  const handleGatherFriends = (destinationName: string, x: number, y: number) => {
    handleTeleport(x, y);
    setGatherToast({ text: `Gather at ${destinationName}!`, x, y });
    handleSendSpeech(`🔔 GATHERING BELL: Please join me at ${destinationName}!`);
    setTimeout(() => setGatherToast(null), 12000);
  };

  // Handle Confetti Blast
  const handleTriggerConfetti = () => {
    setConfettiBlastCount((prev) => prev + 1);
  };

  // Capture Photo Booth image
  const handleCapturePhoto = async (): Promise<string | null> => {
    if (!canvasElementRef.current) return null;
    try {
      return canvasElementRef.current.toDataURL("image/png");
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // Screen Share Handler
  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setActiveScreenStream(stream);
      stream.getVideoTracks()[0].onended = () => {
        setActiveScreenStream(null);
      };
      handleSendSpeech("📺 Started sharing screen in space!");
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  };

  const handleStopScreenShare = () => {
    if (activeScreenStream) {
      activeScreenStream.getTracks().forEach((t) => t.stop());
      setActiveScreenStream(null);
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
      {/* Screen-Wide Celebration Confetti Explosion */}
      {screenConfettiActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {Array.from({ length: 90 }).map((_, idx) => (
            <div
              key={idx}
              className="absolute animate-bounce"
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 98}%`,
                width: `${Math.random() * 14 + 6}px`,
                height: `${Math.random() * 20 + 8}px`,
                backgroundColor: ["#f43f5e", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#eab308"][
                  Math.floor(Math.random() * 8)
                ],
                borderRadius: Math.random() > 0.5 ? "50%" : "3px",
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.95,
                transition: "all 1.2s ease-out",
              }}
            />
          ))}
        </div>
      )}

      {/* Birthday Party Meetup & Wish Greeting Bar */}
      {birthdayStar.isBirthdayMode && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white px-3 sm:px-6 py-2 flex items-center justify-between z-40 shadow-xl border-b border-amber-400/40 animate-in slide-in-from-top">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">🎂</span>
            <div className="font-mono">
              <span className="text-xs font-black uppercase tracking-wider text-black bg-amber-300 px-2 py-0.5 rounded-full mr-2">
                BIRTHDAY VIP
              </span>
              <span className="text-xs font-bold">
                Celebrating {birthdayStar.name || localAvatar.handle}'s Birthday Party!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                spacesSfx.playKeyNote(5);
                handleSendSpeech(`🎉 Happy Birthday ${birthdayStar.name || localAvatar.handle}! 🎂 May your year be filled with happiness & victory! ✨`);
                handleTriggerConfetti();
              }}
              className="px-3 py-1 rounded-xl bg-white text-black font-mono text-xs font-black hover:bg-neutral-100 transition shadow-sm active:scale-95 cursor-pointer"
            >
              🎈 Wish Happy Birthday!
            </button>

            <button
              onClick={handleServeCake}
              className="px-3 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-white/40 text-white font-mono text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            >
              🎂 Cut Cake Ceremony
            </button>

            <button
              onClick={() => setGiftingModalOpen(true)}
              className="hidden sm:inline-flex px-3 py-1 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-mono text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            >
              🎁 Give Gift
            </button>
          </div>
        </div>
      )}

      {/* 1. Global Announcement Ticker */}
      {space.announcement && space.announcement.expiresAt > Date.now() && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black px-4 py-1 font-mono text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top z-50">
          <Megaphone className="w-3.5 h-3.5 animate-bounce" />
          <span>{space.announcement.text}</span>
        </div>
      )}

      {/* 2. Top World Navigation & Command Header (Gather.town exact layout) */}
      <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back, Space Name with 1-click rename & Room Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/spaces"
            className="p-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Back to Spaces Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Space Name & 1-Click Rename */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setHostEventModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/50 text-left flex items-center gap-1.5 transition-all cursor-pointer group shadow-sm"
            title="Click to Rename Space or Change Atmosphere"
          >
            <span className="font-mono text-xs font-black text-white group-hover:text-cyan-300 truncate max-w-[110px] sm:max-w-[180px]">
              {space.name}
            </span>
            <Edit2 className="w-3 h-3 text-neutral-500 group-hover:text-cyan-400 shrink-0" />
          </button>

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

        {/* Center: Host Event, Gather "Walk to desk" Button & Floor Elevators */}
        <div className="flex items-center gap-2">
          {/* Host Event / Vibe Trigger */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(4);
              setHostEventModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Host Dinner, Party, Horror Night, Sukoon or Customize Theme"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden lg:inline">Host Event / Vibe</span>
          </button>

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

          {/* Virtual Paper Money (Echo Cash) Wallet */}
          <button
            onClick={handleClaimDailyAllowance}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 font-mono text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer group"
            title="Click to claim Daily +$100 Cash allowance!"
          >
            <span>💵</span>
            <span>${walletCash}</span>
            {canClaimDailyReward() && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Catering Feasts (Butter Naan, Pasta, Cake, Champagne, Chinese, Chills) */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(1);
              setCateringModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-neutral-900/80 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Order Catering: Butter Naan, Pasta, Cake, Champagne, Chinese, Chills"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Catering</span>
          </button>

          {/* Boutique Wardrobe & Gifting */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setGiftingModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-pink-500/30 bg-neutral-900/80 hover:bg-neutral-800 text-pink-300 hover:text-pink-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Boutique Wardrobe & Friend Gifting"
          >
            <Gift className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden xl:inline">Gifts & Fits</span>
          </button>

          {/* Smart Auto-Seating */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setSeatingModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-sky-500/30 bg-neutral-900/80 hover:bg-neutral-800 text-sky-300 hover:text-sky-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Auto-Assign Banquet Table Chairs (2 to 16 guests)"
          >
            <Armchair className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">Seating</span>
          </button>

          {/* Party Games Suite (Ludo, Bottle, RPS, Antakshari, Raja Mantri) */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(5);
              setPartyTableGameTab("ludo");
              setPartyTableGamesOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Play Banquet Table Games (Ludo, Spin Bottle, Antakshari, Raja Mantri, RPS)"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Party Games</span>
          </button>

          {/* Multiplayer Uno Card Table */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(4);
              setUnoModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-rose-300 hover:text-rose-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Play Multiplayer Uno Card Game (Prize: $50)"
          >
            <span className="text-xs">🃏</span>
            <span className="hidden sm:inline">Uno Table</span>
          </button>
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

          {/* Invite Friends Modal Trigger */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(5);
              setInviteModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-cyan-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Invite Friends (Play, Sing, Study, Ghost Mode)"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-mono font-bold">Invite</span>
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
          confettiTrigger={confettiBlastCount}
          onGetCanvasRef={(canvas) => {
            canvasElementRef.current = canvas;
          }}
          tableDishes={tableDishes}
          chairReservations={chairReservations}
          onBiteDish={handleBiteDish}
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
        onOpenMeetingModal={() => setMeetingModalOpen(true)}
        onOpenActivityMap={() => setActivityMapOpen(true)}
        onOpenInvite={() => setInviteModalOpen(true)}
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
        onWaveAvatar={handleWaveAvatar}
        onDirectMessageAvatar={handleDirectMessage}
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

      {/* Image 1: Video Meeting Grid Overlay */}
      <GatherMeetingGrid
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        meetingTitle="Design Review"
        isPrivate={true}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onSendEmote={handleSendEmote}
      />

      {/* Image 2: Birds-Eye Activity Map */}
      <GatherActivityMapModal
        isOpen={activityMapOpen}
        onClose={() => setActivityMapOpen(false)}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onTeleportToPod={handleTeleportToPod}
      />

      {/* Image 4: Wave Them Over Notification Toast */}
      <GatherWaveToast
        wave={activeWave}
        onDismiss={() => setActiveWave(null)}
        onWalkOver={(x, y) => handleTeleport(x, y)}
      />

      {/* Image 3: Direct 1-on-1 Mini-Dock */}
      <GatherDirectDock
        isOpen={!!directDockTarget}
        onClose={() => setDirectDockTarget(null)}
        targetAvatar={directDockTarget}
        localAvatar={localAvatar}
        onOpenFullMeeting={() => {
          setDirectDockTarget(null);
          setMeetingModalOpen(true);
        }}
        onOpenChat={() => {
          setRightDrawerOpen(true);
          setRightDrawerTab("chat");
        }}
      />

      {/* Invite Friends Modal (Play, Sing, Study, Public or Ghost mode) */}
      <InviteFriendsModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        spaceName={space.name}
        spaceId={space.id}
      />

      {/* Host Event / Vibe & Customization Modal */}
      <HostEventModal
        isOpen={hostEventModalOpen}
        onClose={() => setHostEventModalOpen(false)}
        space={space}
        onUpdateSpace={async (updates) => {
          setSpace((prev) => ({ ...prev, ...updates }));
          try {
            await updateSpaceDoc(space.id, updates);
          } catch (e) {
            console.error("Failed to update space doc:", e);
          }
        }}
        onTeleportTo={(x, y) => handleTeleport(x, y)}
      />

      {/* Birds-Eye Radar Mini-Map Widget */}
      <MiniMapRadar
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onTeleport={handleTeleport}
      />

      {/* Floating Host Quick-Action Hub */}
      <HostQuickControlBar
        space={space}
        isHost={isHost}
        onOpenPartyTools={() => setPartyModalOpen(true)}
        onOpenHostSettings={() => setHostEventModalOpen(true)}
        onOpenInvite={() => setInviteModalOpen(true)}
        onGatherFriends={handleGatherFriends}
        onQuickSnapPhoto={() => setPartyModalOpen(true)}
      />

      {/* Gather Bell Alert Toast */}
      {gatherToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 bg-amber-950/95 border-2 border-amber-500 text-amber-100 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top">
          <span className="text-xl">🔔</span>
          <span className="font-mono text-xs font-bold">{gatherToast.text}</span>
          <button
            onClick={() => {
              handleTeleport(gatherToast.x, gatherToast.y);
              setGatherToast(null);
            }}
            className="px-3 py-1 rounded-xl bg-amber-400 text-black font-mono text-xs font-black hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Teleport Now
          </button>
        </div>
      )}

      {/* Floating Picture-in-Picture Screen Share Stream */}
      {activeScreenStream && (
        <div className="fixed bottom-24 left-4 z-40 w-72 sm:w-96 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="px-3 py-1.5 bg-neutral-900 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-purple-400" />
              <span>Live Screen Share</span>
            </span>
            <button
              onClick={handleStopScreenShare}
              className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              Stop
            </button>
          </div>
          <video
            ref={(node) => {
              if (node && activeScreenStream && node.srcObject !== activeScreenStream) {
                node.srcObject = activeScreenStream;
                node.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video bg-black object-contain"
          />
        </div>
      )}

      {/* Virtual Friend Hosting & Party Suite Modal */}
      <PartyToolsModal
        isOpen={partyModalOpen}
        onClose={() => setPartyModalOpen(false)}
        spaceName={space.name}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onTriggerConfetti={handleTriggerConfetti}
        onSendSpeech={handleSendSpeech}
        onCapturePhoto={handleCapturePhoto}
        onStartScreenShare={handleStartScreenShare}
        onServeCake={handleServeCake}
        onDressBirthday={handleDressBirthday}
        onOpenCatering={() => {
          setPartyModalOpen(false);
          setCateringModalOpen(true);
        }}
        onOpenSeating={() => {
          setPartyModalOpen(false);
          setSeatingModalOpen(true);
        }}
        onOpenUno={() => {
          setPartyModalOpen(false);
          setUnoModalOpen(true);
        }}
        onOpenGifting={() => {
          setPartyModalOpen(false);
          setGiftingModalOpen(true);
        }}
        onOpenPartyTableGames={(tab) => {
          setPartyModalOpen(false);
          if (tab) setPartyTableGameTab(tab);
          setPartyTableGamesOpen(true);
        }}
      />

      {/* Interactive Birthday Cake Ceremony Modal (Blow Candles, Cut Cake, Pop Champagne, Hand Out Slices) */}
      <BirthdayCakeModal
        isOpen={birthdayCakeModalOpen}
        onClose={() => setBirthdayCakeModalOpen(false)}
        birthdayPersonName={birthdayStar.name || localAvatar.handle}
        isHost={isHost}
        onTriggerConfetti={handleTriggerConfetti}
        onSendSpeech={handleSendSpeech}
        onPopChampagne={() => {
          handleTriggerConfetti();
        }}
        onOpenGifting={() => {
          setBirthdayCakeModalOpen(false);
          setGiftingModalOpen(true);
        }}
        onOpenGames={() => {
          setBirthdayCakeModalOpen(false);
          setPartyTableGamesOpen(true);
        }}
        onCakeCutSuccess={() => {
          refreshWalletCash();
        }}
      />

      {/* Dinner Party Catering & Table Food Menu (Butter Naan, Pasta, Cake, Champagne, Chinese, Chills) */}
      <SpaceCateringModal
        isOpen={cateringModalOpen}
        onClose={() => {
          setCateringModalOpen(false);
          refreshWalletCash();
        }}
        userHandle={localAvatar.handle}
        activeDishes={tableDishes}
        onOrderDish={(dish) => {
          setTableDishes((prev) => [...prev, dish]);
          refreshWalletCash();
        }}
        onEatBite={handleBiteDish}
        onBroadcastSpeech={handleSendSpeech}
      />

      {/* Boutique Wardrobe & Virtual Gifting to Friends */}
      <SpaceGiftingModal
        isOpen={giftingModalOpen}
        onClose={() => {
          setGiftingModalOpen(false);
          refreshWalletCash();
        }}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onSendGift={(targetHandle, gift, note) => {
          handleSendGift(targetHandle, gift.name, gift.icon);
          refreshWalletCash();
        }}
        onEquipOutfit={(newConfig) => {
          const updated = {
            ...avatarConfig,
            ...newConfig,
          };
          setAvatarConfig(updated);
          setLocalAvatar((prev) => ({
            ...prev,
            avatarConfig: updated,
            hoodieColor: updated.outfitColor || prev.hoodieColor,
          }));
          try {
            localStorage.setItem("echo_spaces_avatar", JSON.stringify(updated));
          } catch {}
          refreshWalletCash();
        }}
      />

      {/* Smart Banquet Chair Auto-Seating (2 to 16 guests) */}
      <AutoSeatingModal
        isOpen={seatingModalOpen}
        onClose={() => setSeatingModalOpen(false)}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        onApplySeating={(reservations) => {
          setChairReservations(reservations);
        }}
        onTeleportToSeat={(x, y) => handleTeleport(x, y)}
        onBroadcastSpeech={handleSendSpeech}
      />

      {/* Multiplayer Uno Card Table (You, Left, Across, Right) */}
      <UnoGameModal
        isOpen={unoModalOpen}
        onClose={() => {
          setUnoModalOpen(false);
          refreshWalletCash();
        }}
        spaceTitle={space.name}
        localUserName={localAvatar.handle}
        localUserAvatar={localAvatar.avatarUrl || "👑"}
        onlineParticipants={remoteAvatars.map((r) => ({
          uid: r.uid,
          displayName: r.handle,
          photoURL: r.avatarUrl,
        }))}
      />

      {/* Banquet Table Games Lounge (Ludo, Spin the Bottle, RPS, Antakshari, Raja Mantri, UNO) */}
      <PartyTableGamesModal
        isOpen={partyTableGamesOpen}
        onClose={() => {
          setPartyTableGamesOpen(false);
          refreshWalletCash();
        }}
        spaceTitle={space.name}
        localUserName={localAvatar.handle}
        localUserAvatar={localAvatar.avatarUrl || "👑"}
        onlineParticipants={remoteAvatars.map((r) => ({
          uid: r.uid,
          displayName: r.handle,
          photoURL: r.avatarUrl,
        }))}
        initialTab={partyTableGameTab}
        onOpenUno={() => {
          setPartyTableGamesOpen(false);
          setUnoModalOpen(true);
        }}
      />

      {/* Floating Synced Spotify Party DJ Music Dock (Bottom-Left) */}
      <div className="fixed bottom-20 left-4 z-40 max-w-sm sm:max-w-md w-full pointer-events-auto transition-all">
        {partyMusicDockExpanded ? (
          <div className="relative">
            <button
              onClick={() => setPartyMusicDockExpanded(false)}
              className="absolute -top-3 -right-2 z-50 p-1 rounded-full bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 shadow-md cursor-pointer"
              title="Minimize Party Music Dock"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <PartyMusicBar
              userHandle={localAvatar.handle}
              compact={false}
              onSongChanged={(newTrack) => {
                handleSendSpeech(`⏭️ Switched party track to "${newTrack.title}" 🎵`);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPartyMusicDockExpanded(true)}
              className="px-3.5 py-2 rounded-full bg-neutral-950/95 hover:bg-neutral-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-xl transition-all cursor-pointer group hover:scale-105"
              title="Expand Synced Party DJ Player & Song Controls"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-base">🎵</span>
              <span className="font-mono text-[11px] max-w-[140px] truncate text-white">Party Music DJ</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                LIVE
              </span>
            </button>

            <button
              onClick={() => {
                spacesSfx.playKeyNote(5);
                setPartyTableGameTab("ludo");
                setPartyTableGamesOpen(true);
              }}
              className="px-3.5 py-2 rounded-full bg-neutral-950/95 hover:bg-neutral-900 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all cursor-pointer hover:scale-105"
              title="Play Party Table Games (Ludo, Spin Bottle, RPS, Antakshari, Raja Mantri)"
            >
              <span>🎲</span>
              <span className="font-mono text-[11px]">Table Games</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Gift Received Toast */}
      {giftReceivedToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <span className="text-3xl animate-bounce">{giftReceivedToast.icon}</span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-pink-200">Special Gift Received!</div>
            <div className="text-sm font-bold">{giftReceivedToast.from} sent {giftReceivedToast.giftName}</div>
          </div>
        </div>
      )}
    </div>
  );
}
