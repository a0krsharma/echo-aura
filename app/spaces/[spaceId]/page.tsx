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
import PartyToolsModal from "@/app/components/spaces/PartyToolsModal";
import AutoSeatingModal from "@/app/components/spaces/AutoSeatingModal";
import SpaceCateringModal from "@/app/components/spaces/SpaceCateringModal";
import SpaceGiftingModal from "@/app/components/spaces/SpaceGiftingModal";
import { UnoGameModal } from "@/app/components/spaces/UnoGameModal";
import BirthdayCakeModal from "@/app/components/spaces/BirthdayCakeModal";
import { PartyTableGamesModal, PartyGameTab } from "@/app/components/spaces/PartyTableGamesModal";
import { GuestAuthModal } from "@/app/components/spaces/GuestAuthModal";
import { StagePresentationBar } from "@/app/components/spaces/StagePresentationBar";
import { EventSocialPanel, EventPanelTab } from "@/app/components/spaces/EventSocialPanel";
import TelepartyWatchModal, { TelepartySyncState } from "@/app/components/spaces/TelepartyWatchModal";
import HostRoomControlsModal from "@/app/components/spaces/HostRoomControlsModal";
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
  subscribeToSpaceDoc,
  SpaceSpotifySyncState,
  getZoneAtCoordinates,
  getPrivateRugAtCoordinates,
} from "@/lib/spaces";
import { partyMusicEngine } from "@/lib/partyMusicEngine";
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
  Crown,
  Bell,
  HelpCircle,
  BarChart2,
  Radio,
  Music,
  MoreHorizontal,
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

  // Direct frictionless entry into space (No blocking gate)
  const [hasEntered, setHasEntered] = useState(true);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [guestAuthModalOpen, setGuestAuthModalOpen] = useState(false);
  const [guestAuthAction, setGuestAuthAction] = useState<{
    title: string;
    description: string;
    icon?: React.ReactNode;
  }>({
    title: "Host Your Own Party Table",
    description: "Sign in with Google to host banquet events, customize space themes, and save persistent friend invites.",
  });
  const [gatherDropdownOpen, setGatherDropdownOpen] = useState(false);
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

  // Chat Messages History (Live, real-time only - zero fake bot messages)
  const [chatMessages, setChatMessages] = useState<SpaceChatMessage[]>([]);

  // Consolidated Header Hub Dropdowns
  const [activitiesDropdownOpen, setActivitiesDropdownOpen] = useState(false);
  const [hospitalityDropdownOpen, setHospitalityDropdownOpen] = useState(false);
  const [hostHubDropdownOpen, setHostHubDropdownOpen] = useState(false);
  const [partyMusicOpen, setPartyMusicOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

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
  const [birthdayCakeModalOpen, setBirthdayCakeModalOpen] = useState(false);
  const [birthdayStar, setBirthdayStar] = useState<{ isBirthdayMode: boolean; name: string; gender: "boy" | "girl" }>({
    isBirthdayMode: false,
    name: "",
    gender: "boy",
  });
  const [screenConfettiActive, setScreenConfettiActive] = useState(false);
  const [giftReceivedToast, setGiftReceivedToast] = useState<{ from: string; giftName: string; icon: string } | null>(null);

  // Stage Presentation & Event Social Panel (Only auto-active on Webinars)
  const [isStageActive, setIsStageActive] = useState(() => space.category === "WEBINAR");
  const [isPresentingOnStage, setIsPresentingOnStage] = useState(false);
  const [eventSocialPanelOpen, setEventSocialPanelOpen] = useState(false);
  const [eventSocialPanelTab, setEventSocialPanelTab] = useState<EventPanelTab>("qa");

  // Teleparty YouTube Co-Watch & Host Room Controls Modal States
  const [telepartyModalOpen, setTelepartyModalOpen] = useState(false);
  const [telepartySyncState, setTelepartySyncState] = useState<TelepartySyncState | undefined>(undefined);
  const [hostRoomControlsOpen, setHostRoomControlsOpen] = useState(false);

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

  // Remote Avatars (Real live users only - zero fake bots)
  const [remoteAvatars, setRemoteAvatars] = useState<SpatialAvatar[]>([]);
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

  // Real-time Space Doc Live Sync from Firestore (with automatic Spotify sync across participants)
  useEffect(() => {
    const unsub = subscribeToSpaceDoc(spaceId, (loaded) => {
      if (loaded) {
        setSpace(loaded);
        if (loaded.spotifySyncState && loaded.spotifySyncState.isPlaying) {
          // Play matching song for all room participants
          partyMusicEngine.playSpotifyTrack({
            id: loaded.spotifySyncState.trackId,
            title: loaded.spotifySyncState.trackName,
            artist: loaded.spotifySyncState.artistName,
            coverArt: loaded.spotifySyncState.albumArt || "🟢",
            bpm: 128,
          });
        }
      }
      setLoading(false);
    });
    return () => {
      unsub();
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

  // Direct Invite & Event Link Auto-Join Handler (e.g. ?party=bday or ?event=birthday)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const partyParam = search.get("party") || search.get("event");
    const guestParam = search.get("guest");
    const tabParam = search.get("tab") as PartyGameTab | null;

    if (guestParam) {
      setLocalAvatar((prev) => ({
        ...prev,
        handle: guestParam,
      }));
    }

    if (partyParam === "bday" || partyParam === "birthday") {
      setBirthdayStar({
        isBirthdayMode: true,
        name: space.name.includes("'s") ? space.name.split("'s")[0].replace("@", "") : "Birthday Star",
        gender: "boy",
      });
      // Direct spawn at the Banquet Party Table
      handleTeleport(1200, 440);
      handleTriggerConfetti();
      setWelcomeToast("🎂 You're at the Birthday Party! Grab a chair or join the party games!");
      setTimeout(() => setWelcomeToast(null), 5000);
    } else if (partyParam === "dinner" || partyParam === "feast") {
      handleTeleport(1200, 440);
      setWelcomeToast("🫓 Welcome to the Dinner Feast! Grab a chair at the banquet table.");
      setTimeout(() => setWelcomeToast(null), 5000);
    } else if (partyParam === "study") {
      handleTeleport(1200, 260);
      setWelcomeToast("📚 Welcome to the Silent Library! 25/5 Pomodoro focus active.");
      setTimeout(() => setWelcomeToast(null), 5000);
    } else {
      setWelcomeToast(`👋 Welcome to ${space.name}! Walk with WASD or click anywhere.`);
      setTimeout(() => setWelcomeToast(null), 4000);
    }

    if (tabParam) {
      setPartyTableGameTab(tabParam);
      setPartyTableGamesOpen(true);
    }
  }, [space.name]);

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

  // High-Intent Action Auth Gate (Sign-up prompt when hosting, ordering, or gifting)
  const handleProtectedAction = (
    title: string,
    description: string,
    icon: React.ReactNode,
    action: () => void
  ) => {
    if (!user) {
      setGuestAuthAction({ title, description, icon });
      setGuestAuthModalOpen(true);
    } else {
      action();
    }
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
    } else if (obj.type === "podium" || obj.id === "concert_stage_mic" || obj.id === "debate_prop_podium" || obj.id === "debate_opp_podium") {
      const nextStage = !isPresentingOnStage;
      setIsPresentingOnStage(nextStage);
      spacesSfx.playPartyFanfare();
      handleSendSpeech(
        nextStage
          ? "🎤 Stepped up to the Stage Microphone! Broadcasting live to the whole room!"
          : "👋 Stepped down from the stage microphone."
      );
    } else if (obj.type === "piano" || obj.id === "music_piano") {
      const nextSitting = !localAvatar.isSitting;
      handleSit(nextSitting, nextSitting ? "music_piano_stool" : undefined);
      if (nextSitting) {
        handleMove(245, 825, "up", false);
        spacesSfx.playKeyNote(1);
        setTimeout(() => spacesSfx.playKeyNote(3), 120);
        setTimeout(() => spacesSfx.playKeyNote(5), 240);
        setTimeout(() => spacesSfx.playKeyNote(8), 360);
        handleSendSpeech("🎹 Playing live Grand Synthesizer Piano at the Jam Studio!");
      }
    } else if (obj.type === "drums" || obj.id === "music_drums") {
      const nextSitting = !localAvatar.isSitting;
      handleSit(nextSitting, nextSitting ? "music_drum_stool" : undefined);
      if (nextSitting) {
        handleMove(375, 820, "up", false);
        spacesSfx.playDrumPad("kick");
        setTimeout(() => spacesSfx.playDrumPad("snare"), 140);
        setTimeout(() => spacesSfx.playDrumPad("hihat"), 280);
        handleSendSpeech("🥁 Jamming on the Drum Kit at the Music Academy!");
      }
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

                {/* Elevator Floors inside Room Dropdown */}
                <div className="pt-2 mt-1 border-t border-neutral-800 px-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-neutral-500 mb-1">
                    Elevator Floors
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {["1st", "3rd", "4th", "ROOF"].map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => handleElevatorFloor(fl)}
                        className={`py-1 rounded text-[10px] font-mono font-bold text-center transition cursor-pointer ${
                          currentFloor === fl
                            ? "bg-cyan-500 text-black"
                            : "bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {fl}
                      </button>
                    ))}
                  </div>
                </div>
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

        {/* Center: Curated Hangout & Banquet Experience Hubs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Activities Hub Dropdown (Party Games, Uno, Arcade, Whiteboard, Jukebox, Q&A, Polls) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                spacesSfx.playKeyNote(5);
                setActivitiesDropdownOpen((v) => !v);
                setHospitalityDropdownOpen(false);
                setHostHubDropdownOpen(false);
                setRoomDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                activitiesDropdownOpen
                  ? "border-amber-400 bg-amber-950/50 text-amber-300"
                  : "border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 text-amber-300"
              }`}
              title="Interactive Activities, Games & Canvas"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Activities</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${activitiesDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {activitiesDropdownOpen && (
              <div className="absolute top-10 left-0 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                  Space Activities & Games
                </div>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(5);
                    setPartyTableGameTab("ludo");
                    setPartyTableGamesOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎲</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Party Games Suite</span>
                    <span className="text-[10px] text-neutral-400">Ludo, Bottle, RPS, Antakshari</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setUnoModalOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🃏</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Uno Table Game</span>
                    <span className="text-[10px] text-neutral-400">Classic Uno card battle</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(3);
                    setArcadeModalOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🕹️</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Retro Arcade Cabinet</span>
                    <span className="text-[10px] text-neutral-400">Pixel jump & space invaders</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playSitPop();
                    setWhiteboardModalOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎨</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Collaborative Whiteboard</span>
                    <span className="text-[10px] text-neutral-400">Brainstorm, sketch & draw</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(2);
                    setEventSocialPanelTab("qa");
                    setEventSocialPanelOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">❓</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Live Speaker Q&A</span>
                    <span className="text-[10px] text-neutral-400">Submit & upvote questions</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setTelepartyModalOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">📺</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-red-400">Teleparty YouTube Co-Watch</span>
                    <span className="text-[10px] text-neutral-400">Synced video & music watch party</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(3);
                    setEventSocialPanelTab("polls");
                    setEventSocialPanelOpen(true);
                    setActivitiesDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">📊</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Interactive Polls</span>
                    <span className="text-[10px] text-neutral-400">Real-time room polling</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 🎵 Party Music Bar Toggle */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setPartyMusicOpen((v) => !v);
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 ${
              partyMusicOpen
                ? "border-pink-500 bg-pink-950/60 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)] animate-pulse"
                : "border-pink-500/30 bg-neutral-900/90 text-pink-300 hover:bg-neutral-800"
            }`}
            title="Toggle Synchronized Party Music Bar (Spotify / Party Beats)"
          >
            <span>🎵</span>
            <span className="hidden sm:inline">Music</span>
          </button>

          {/* 2. Hospitality Hub Dropdown (Feast, Seating, Gifting, Cake Ceremony) - Desktop */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => {
                spacesSfx.playKeyNote(1);
                setHospitalityDropdownOpen((v) => !v);
                setActivitiesDropdownOpen(false);
                setHostHubDropdownOpen(false);
                setRoomDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                hospitalityDropdownOpen
                  ? "border-sky-400 bg-sky-950/50 text-sky-300"
                  : "border-sky-500/30 bg-neutral-900/90 text-sky-300 hover:bg-neutral-800"
              }`}
              title="Hospitality: Feasts, Table Seating, Gifting & Cake"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-sky-400" />
              <span>Hospitality</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${hospitalityDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {hospitalityDropdownOpen && (
              <div className="absolute top-10 left-0 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                  Banquet Hospitality & Dining
                </div>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(1);
                    setCateringModalOpen(true);
                    setHospitalityDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🫓</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Gourmet Catering Feast</span>
                    <span className="text-[10px] text-neutral-400">Naan, pasta, champagne & dishes</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(3);
                    setSeatingModalOpen(true);
                    setHospitalityDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🪑</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Smart Banquet Seating</span>
                    <span className="text-[10px] text-neutral-400">Auto-assign 2 to 16 chairs</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(2);
                    setGiftingModalOpen(true);
                    setHospitalityDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎁</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Boutique Outfits & Gifts</span>
                    <span className="text-[10px] text-neutral-400">Send gifts to attendees</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleServeCake();
                    setHospitalityDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎂</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Birthday Cake Ceremony</span>
                    <span className="text-[10px] text-neutral-400">Serve celebration cake to table</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setHostRoomControlsOpen(true);
                    setHospitalityDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎛️</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-300">Room Chair & Cake Designer</span>
                    <span className="text-[10px] text-neutral-400">Manage 16 chairs & table decor</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. Stage Toggle (Webinar/Stage Presenter Dock) - Desktop */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(4);
              setIsStageActive(!isStageActive);
            }}
            className={`hidden md:flex px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isStageActive
                ? "border-rose-500/50 bg-rose-950/40 text-rose-300"
                : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white"
            }`}
            title="Toggle Stage Presenters Dock"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>Stage</span>
          </button>

          {/* 4. Walk to Desk Shortcut - Desktop */}
          <button
            type="button"
            onClick={handleWalkToDesk}
            className="hidden md:flex p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-cyan-400 text-neutral-300 hover:text-cyan-300 text-xs font-mono font-bold items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            title="Automatically walk to your workstation desk"
          >
            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
            <span>Desk</span>
          </button>

          {/* 5. Mobile Quick "..." More Menu (Hospitality, Stage, Desk, Vibe) */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                spacesSfx.playKeyNote(1);
                setMobileMoreOpen((v) => !v);
              }}
              className={`p-1.5 rounded-xl border text-xs font-mono font-bold flex items-center transition-all cursor-pointer ${
                mobileMoreOpen
                  ? "border-cyan-400 bg-cyan-950/50 text-cyan-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              title="More Space Features"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {mobileMoreOpen && (
              <div className="absolute top-10 right-0 w-56 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setCateringModalOpen(true);
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>🫓</span>
                  <span>Gourmet Catering</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeatingModalOpen(true);
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>🪑</span>
                  <span>Auto-Seating</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleServeCake();
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>🎂</span>
                  <span>Cake Ceremony</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsStageActive(!isStageActive);
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>🎤</span>
                  <span>{isStageActive ? "Hide Stage" : "Show Stage"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleWalkToDesk();
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>💻</span>
                  <span>Walk to Desk</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHostEventModalOpen(true);
                    setMobileMoreOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>👑</span>
                  <span>Host & Theme Vibe</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Host Hub, Invite, Cash Wallet, Voice & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Host Hub Dropdown (Theme/Vibe, Summon Gather Bell, Space Settings) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                handleProtectedAction(
                  "Host Your Own Event & Theme",
                  "Sign in with Google to host birthday parties, dinner feasts, ghost dating, or customize space vibes permanently.",
                  <Crown className="w-7 h-7" />,
                  () => {
                    spacesSfx.playKeyNote(4);
                    setHostHubDropdownOpen((v) => !v);
                    setActivitiesDropdownOpen(false);
                    setHospitalityDropdownOpen(false);
                    setRoomDropdownOpen(false);
                  }
                );
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                hostHubDropdownOpen
                  ? "border-purple-400 bg-purple-950/60 text-purple-300"
                  : "border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300"
              }`}
              title="Host Controls, Event Themes & Summon Bell"
            >
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Host Hub</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${hostHubDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {hostHubDropdownOpen && (
              <div className="absolute top-10 right-0 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                  Host Command Center
                </div>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setHostEventModalOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">✨</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Change Event Theme & Vibe</span>
                    <span className="text-[10px] text-neutral-400">Birthday, Dinner, Ghost Dating, Gala</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGatherDropdownOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🔔</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Summon Everyone ("Gather All")</span>
                    <span className="text-[10px] text-neutral-400">Ring the bell to bring guests together</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setHostModalOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">⚙️</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Space Suite Settings</span>
                    <span className="text-[10px] text-neutral-400">Capacities, announcements & privacy</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(5);
                    setHostRoomControlsOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">🎛️</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-300">Room Chair, Cake & Decor Suite</span>
                    <span className="text-[10px] text-neutral-400">Manage 16 chairs, design cakes & table decor</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(4);
                    setTelepartyModalOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2.5 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">📺</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-red-400">Teleparty YouTube Co-Watch</span>
                    <span className="text-[10px] text-neutral-400">Synchronized video & music party</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Gather All Preset Modal Dropdown */}
          {gatherDropdownOpen && (
            <div className="absolute top-14 right-24 w-56 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                Summon Everyone To:
              </div>
              {[
                { name: "Banquet Feast Table", x: 1200, y: 350, icon: "🫓" },
                { name: "Campfire Patio", x: 800, y: 150, icon: "🪵" },
                { name: "Retro Pixel Arcade", x: 410, y: 420, icon: "🕹️" },
                { name: "Concert Amphitheater", x: 800, y: 860, icon: "🎤" },
              ].map((pt) => (
                <button
                  key={pt.name}
                  onClick={() => {
                    handleGatherFriends(pt.name, pt.x, pt.y);
                    setGatherDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-base">{pt.icon}</span>
                  <span className="truncate">{pt.name}</span>
                </button>
              ))}
            </div>
          )}

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

          {/* Spatial Voice Proximity Audio Manager */}
          <div className="hidden sm:block shrink-0">
            <SpatialVoiceManager
              spaceId={spaceId}
              localAvatar={localAvatar}
              remoteAvatars={remoteAvatars}
              onSpeakingUidsChange={setSpeakingUids}
            />
          </div>

          {/* Invite Friends Modal Trigger */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(5);
              setInviteModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Invite Friends (WhatsApp, Telegram, Link)"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-xs font-mono font-bold">Invite</span>
          </button>

          {/* Avatar Studio */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setAvatarModalOpen(true);
            }}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-amber-400 transition-colors cursor-pointer"
            title="Edit Avatar & Outfit"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Live Stage Presentation Bar (Image 1 & 3 Fidelity) */}
      {(space.category === "WEBINAR" || isStageActive) && (
        <StagePresentationBar
          spaceTitle={space.name}
          isHost={isHost}
          currentFloor={currentFloor}
          onSelectFloor={handleElevatorFloor}
          speakers={space.activeStageSpeakers}
          isPresenting={isPresentingOnStage}
          onTogglePresenting={() => {
            handleProtectedAction(
              "Step Onto Presentation Stage",
              "Sign in with Google to take the stage microphone, broadcast to all tables, and share your screen live.",
              <Radio className="w-7 h-7" />,
              () => {
                setIsPresentingOnStage(!isPresentingOnStage);
                spacesSfx.playPartyFanfare();
                handleSendSpeech(
                  !isPresentingOnStage
                    ? "🎤 Stepped onto the Presentation Stage! Broadcasting to all tables."
                    : "👋 Stepped down from stage to table seating."
                );
              }
            );
          }}
          activeScreenStream={activeScreenStream}
          onOpenMap={() => setActivityMapOpen(true)}
        />
      )}

      {/* 🎵 Synchronized Space Party Music Bar (Spotify & Continuous Bollywood/Punjabi/EDM/LoFi) */}
      {partyMusicOpen && (
        <div className="relative z-30 px-2 sm:px-4 py-1.5 bg-neutral-950/95 border-b border-pink-500/30 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2">
          <PartyMusicBar
            userHandle={localAvatar.handle}
            compact={false}
            spotifySyncState={space.spotifySyncState}
            onUpdateSpotifySync={(sync) => {
              updateSpaceDoc(spaceId, { spotifySyncState: sync });
              setSpace((prev) => ({ ...prev, spotifySyncState: sync }));
            }}
            onOpenTeleparty={() => setTelepartyModalOpen(true)}
          />
        </div>
      )}

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
          onOpenUno={() => setUnoModalOpen(true)}
          onOpenPartyGames={() => setPartyTableGamesOpen(true)}
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

      {/* Floating Welcome Toast for Instant Guest Access */}
      {welcomeToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-neutral-900/95 border border-amber-500/50 text-white font-mono text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{welcomeToast}</span>
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
          handleProtectedAction(
            "Order Banquet Food & Drinks",
            "Sign in with Google to order catering feasts, customize party dishes, and charge your table tab.",
            <UtensilsCrossed className="w-7 h-7" />,
            () => {
              setTableDishes((prev) => [...prev, dish]);
              refreshWalletCash();
            }
          );
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
          handleProtectedAction(
            "Send Special Gift",
            "Sign in with Google to send boutique outfits, champagnes, and gifts to your friends in the space.",
            <Gift className="w-7 h-7" />,
            () => {
              handleSendGift(targetHandle, gift.name, gift.icon);
              refreshWalletCash();
            }
          );
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
        onOpenTeleparty={() => setTelepartyModalOpen(true)}
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
        onOpenTeleparty={() => setTelepartyModalOpen(true)}
      />

      {/* Frictionless Guest Auth Gate Modal */}
      <GuestAuthModal
        isOpen={guestAuthModalOpen}
        onClose={() => setGuestAuthModalOpen(false)}
        actionTitle={guestAuthAction.title}
        actionDescription={guestAuthAction.description}
        actionIcon={guestAuthAction.icon}
      />

      {/* Synchronized Teleparty & YouTube Co-Watch Modal */}
      <TelepartyWatchModal
        isOpen={telepartyModalOpen}
        onClose={() => setTelepartyModalOpen(false)}
        userHandle={localAvatar.handle}
        isHost={isHost}
        syncState={telepartySyncState}
        onUpdateSyncState={(next) => setTelepartySyncState(next)}
        onBroadcastSpeech={(msg) => handleSendSpeech(msg)}
        onOpenInviteFriends={() => setInviteModalOpen(true)}
        spaceId={space.id}
      />

      {/* Full Host Room Controls Modal (16-Seat Chairs, Cake Designer & Table Decor) */}
      <HostRoomControlsModal
        isOpen={hostRoomControlsOpen}
        onClose={() => setHostRoomControlsOpen(false)}
        space={space}
        onUpdateSpace={async (updates) => {
          setSpace((prev) => ({ ...prev, ...updates }));
          try {
            await updateSpaceDoc(space.id, updates);
          } catch (e) {
            console.error("Failed to update space doc:", e);
          }
        }}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        chairReservations={chairReservations}
        onUpdateChairReservations={(res) => setChairReservations(res)}
        tableDishes={tableDishes}
        onPlaceCakeOnTable={(cakeDish) => {
          setTableDishes((prev) => {
            const filtered = prev.filter((d) => !d.itemId.includes("cake"));
            return [...filtered, cakeDish];
          });
        }}
        onTeleportToSeat={(x, y) => handleTeleport(x, y)}
        onBroadcastSpeech={(text) => handleSendSpeech(text)}
        onTriggerConfetti={handleTriggerConfetti}
      />

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

      {/* Interactive Social Side Panel (Image 1 Fidelity: Q&A with Upvoting, Polls, Chat, Attendees) */}
      <EventSocialPanel
        isOpen={eventSocialPanelOpen}
        onClose={() => setEventSocialPanelOpen(false)}
        currentTab={eventSocialPanelTab}
        onTabChange={(t) => setEventSocialPanelTab(t)}
        localAvatar={localAvatar}
        remoteAvatars={remoteAvatars}
        isHost={isHost}
        onSendChat={(msg) => handleSendSpeech(msg)}
      />
    </div>
  );
}
