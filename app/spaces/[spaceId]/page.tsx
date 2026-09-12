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

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import EchoSpacesWorld from "@/app/components/spaces/EchoSpacesWorld";
import SpatialVoiceManager from "@/app/components/spaces/SpatialVoiceManager";
import AvatarStudioModal from "@/app/components/spaces/AvatarStudioModal";
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
import SpaceGiftingModal from "@/app/components/spaces/SpaceGiftingModal";
import { UnoGameModal } from "@/app/components/spaces/UnoGameModal";
import BirthdayCakeModal from "@/app/components/spaces/BirthdayCakeModal";
import { PartyTableGamesModal, PartyGameTab } from "@/app/components/spaces/PartyTableGamesModal";
import { GuestAuthModal } from "@/app/components/spaces/GuestAuthModal";
import { StagePresentationBar } from "@/app/components/spaces/StagePresentationBar";
import TelepartyWatchModal, { TelepartySyncState } from "@/app/components/spaces/TelepartyWatchModal";
import { PartyMusicBar } from "@/app/components/spaces/PartyMusicBar";
import {
  getWalletState,
  TableDish,
  ChairReservation,
} from "@/lib/spacesEconomy";
import { playNomEating } from "@/lib/spacesSfx";
import {
  SpaceDoc,
  SpaceZoneId,
  SpatialAvatar,
  AvatarConfig,
  InteractiveObject,
  CustomDecoration,
  SPACES_ZONES,
  updateSpaceDoc,
  deleteSpaceDoc,
  subscribeToSpaceDoc,
  subscribeToSpaceParticipants,
  updateSpaceParticipant,
  removeSpaceParticipant,
  subscribeToSpaceTableGame,
  updateSpaceTableGame,
  SpaceTableGameLiveState,
  getZoneAtCoordinates,
  getPrivateRugAtCoordinates,
} from "@/lib/spaces";
import { partyMusicEngine } from "@/lib/partyMusicEngine";
import { spacesSfx } from "@/lib/spacesSfx";
import { handleSpotifyCallback } from "@/lib/spotify";
import {
  ArrowLeft,
  Users,
  Settings,
  Megaphone,
  Share2,
  Sparkles,
  Tv,
  UtensilsCrossed,
  Gift,
  Trash2,
  Radio,
  Music,
  MessageSquare,
} from "lucide-react";

export default function DynamicSpaceWorldPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const spaceId = (params?.spaceId as string) || "hangout_space";

  // Space Doc State with safe fallback to prevent undefined crashes
  const [space, setSpace] = useState<SpaceDoc>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("echo_local_spaces_cache");
        if (raw) {
          const list: SpaceDoc[] = JSON.parse(raw);
          const found = list.find((s) => s.id === spaceId);
          if (found) return found;
        }
      } catch {}
    }
    return {
      id: spaceId,
      name: "Live Hangout Lounge",
      description: "Live spatial room for table games, proximity voice, and synced Spotify music.",
      category: "ARCADE",
      vibe: "PARTY_CLUB",
      hostUid: "host",
      hostHandle: "@HOST",
      participantCount: 1,
      maxParticipants: 50,
      isPublic: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      floorPlanType: "ballroom",
      decorations: [],
    };
  });
  // Direct frictionless entry into space (No blocking gate)
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
  // Top Location Dropdown Menu State

  // Active Floor (Elevator Simulation)
  const [currentFloor, setCurrentFloor] = useState<string>("1st");

  // Right Drawer State
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState<"chat" | "participants">("chat");

  // Chat Messages History (Live, real-time only - zero fake bot messages)
  const [chatMessages, setChatMessages] = useState<SpaceChatMessage[]>([]);

  // Consolidated Header Hub Dropdowns
  const [hostHubDropdownOpen, setHostHubDropdownOpen] = useState(false);
  const [partyMusicOpen, setPartyMusicOpen] = useState(false);

  // Modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
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
  const [confettiBlastCount, setConfettiBlastCount] = useState(0);
  const [gatherToast, setGatherToast] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeScreenStream, setActiveScreenStream] = useState<MediaStream | null>(null);

  // Virtual Economy & Social Party States
  const [walletCash, setWalletCash] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return getWalletState().cash;
    }
    return 500;
  });
  const [giftingModalOpen, setGiftingModalOpen] = useState(false);
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

  // Stage Presentation (Only auto-active on Webinars)
  const [isStageActive, setIsStageActive] = useState(() => Boolean(space?.category === "WEBINAR"));
  const [isPresentingOnStage, setIsPresentingOnStage] = useState(false);

  // Teleparty YouTube Co-Watch
  const [telepartyModalOpen, setTelepartyModalOpen] = useState(false);
  const [telepartySyncState, setTelepartySyncState] = useState<TelepartySyncState | undefined>(undefined);

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


  const refreshWalletCash = () => {
    setWalletCash(getWalletState().cash);
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

  // Stable unique UID for session (guests receive a unique guest ID so multiple guests never collide)
  const [effectiveUid, setEffectiveUid] = useState<string>(() => {
    if (user?.uid) return user.uid;
    if (typeof window !== "undefined") {
      let saved = sessionStorage.getItem("echo_space_guest_uid");
      if (!saved) {
        saved = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        sessionStorage.setItem("echo_space_guest_uid", saved);
      }
      return saved;
    }
    return `guest_${Math.random().toString(36).slice(2, 8)}`;
  });

  // Local Avatar State
  const [localAvatar, setLocalAvatar] = useState<SpatialAvatar>({
    uid: user?.uid || effectiveUid,
    handle: user?.handle || `@Guest_${effectiveUid.slice(-4).toUpperCase()}`,
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

  // Live Table Game State synced from Firestore
  const [liveTableGame, setLiveTableGame] = useState<SpaceTableGameLiveState | null>(null);
  const [tableGameInviteToast, setTableGameInviteToast] = useState<{
    hostName: string;
    tab: PartyGameTab;
    text: string;
  } | null>(null);

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

  // Sync user profile updates & distinct UID
  useEffect(() => {
    if (user?.uid) {
      setEffectiveUid(user.uid);
      setLocalAvatar((prev) => ({
        ...prev,
        uid: user.uid,
        handle: user.handle || prev.handle,
        avatarUrl: user.photoUrl || user.photoURL || prev.avatarUrl,
      }));
    }
  }, [user]);

  // Handle Spotify OAuth Callback if redirected with ?code=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      handleSpotifyCallback(code).then((success) => {
        if (success) {
          setWelcomeToast("🟢 Spotify co-listening authenticated successfully!");
          setTimeout(() => setWelcomeToast(null), 4000);
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      });
    }
  }, []);

  // Real-time Space Doc Live Sync from Firestore (with automatic Spotify sync across participants)
  useEffect(() => {
    const unsub = subscribeToSpaceDoc(spaceId, (loaded) => {
      if (loaded) {
        setSpace(loaded);
        if (loaded.spotifySyncState && loaded.spotifySyncState.isPlaying && loaded.spotifySyncState.trackId) {
          // Play matching song for all room participants in background without interrupting games
          partyMusicEngine.playSpotifyTrack({
            id: loaded.spotifySyncState.trackId,
            title: loaded.spotifySyncState.trackName,
            artist: loaded.spotifySyncState.artistName,
            coverArt: loaded.spotifySyncState.albumArt || "🟢",
            bpm: 128,
          });
        }
      }

    });
    return () => {
      unsub();
    };
  }, [spaceId]);


  // ── 👥 REAL-TIME PARTICIPANT SPATIAL PRESENCE & HEARTBEAT ──────
  // 1. Subscribe to live participants in this space
  useEffect(() => {
    if (!spaceId || !effectiveUid) return;

    const unsub = subscribeToSpaceParticipants(spaceId, (participants) => {
      // Filter out local user
      const others = participants.filter((p) => p.uid !== effectiveUid);
      setRemoteAvatars(others);
    });

    return () => {
      unsub();
    };
  }, [spaceId, effectiveUid]);

  // 2. Broadcast local avatar presence with smooth movement throttling
  const lastBroadcastRef = useRef<number>(0);
  const localAvatarRef = useRef(localAvatar);
  localAvatarRef.current = localAvatar;

  const broadcastLocalAvatar = useCallback((immediate: boolean = false) => {
    if (!spaceId || !effectiveUid) return;
    const now = Date.now();
    if (!immediate && now - lastBroadcastRef.current < 120) return; // 120ms throttle during continuous movement
    lastBroadcastRef.current = now;

    updateSpaceParticipant(spaceId, {
      ...localAvatarRef.current,
      uid: effectiveUid,
      lastUpdated: now,
    });
  }, [spaceId, effectiveUid]);

  // Broadcast when local avatar moves or updates state
  useEffect(() => {
    broadcastLocalAvatar(false);
  }, [
    localAvatar.x,
    localAvatar.y,
    localAvatar.direction,
    localAvatar.isMoving,
    localAvatar.isSitting,
    localAvatar.activeZone,
    localAvatar.activeRugId,
    localAvatar.isHandRaised,
    localAvatar.hasCoffee,
    localAvatar.statusText,
    localAvatar.speechBubble,
    broadcastLocalAvatar,
  ]);

  // Periodic heartbeat every 4 seconds + cleanup on page exit
  useEffect(() => {
    if (!spaceId || !effectiveUid) return;

    // Send initial join presence immediately
    broadcastLocalAvatar(true);

    const interval = setInterval(() => {
      broadcastLocalAvatar(true);
    }, 4000);

    const handleBeforeUnload = () => {
      removeSpaceParticipant(spaceId, effectiveUid);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      removeSpaceParticipant(spaceId, effectiveUid);
    };
  }, [spaceId, effectiveUid, broadcastLocalAvatar]);

  // ── 🎲 REAL-TIME TABLE GAME MULTIPLAYER SYNC ─────────────────
  useEffect(() => {
    if (!spaceId) return;

    const unsub = subscribeToSpaceTableGame(spaceId, (incoming) => {
      if (incoming) {
        setLiveTableGame(incoming);
        // Show join prompt banner if someone else opened the table or took an action
        if (incoming.isOpen && incoming.hostUid !== effectiveUid && !partyTableGamesOpen) {
          setTableGameInviteToast({
            hostName: incoming.hostName,
            tab: incoming.activeTab,
            text: incoming.lastActionText || `Live ${incoming.activeTab.toUpperCase()} Table in progress!`,
          });
        }
      }
    });

    return () => unsub();
  }, [spaceId, effectiveUid, partyTableGamesOpen]);

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
    } else if (obj.type === "arcade") {
      setArcadeModalOpen(true);
      spacesSfx.playKeyNote(4);
    } else if (obj.type === "jukebox" || obj.id === "music_jukebox") {
      setJukeboxModalOpen(true);
      spacesSfx.playKeyNote(3);
    } else if (obj.type === "coffee") {
      handleToggleCoffee();
    } else if (obj.type === "fountain") {
      spacesSfx.playFountainSplash();
      handleSendSpeech("🪙 Tossed a coin into the Echo Fountain!");
    } else if (obj.type === "podium") {
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
      {/* 2. Simplified, Beginner-Friendly Top Navigation Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between z-30 shrink-0 gap-2">
        {/* Left: Back to Spaces, Space Name & Live Online Count */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/spaces"
            className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer shrink-0"
            title="Back to Spaces Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Space Title */}
          <div className="flex items-center gap-2 truncate">
            <h1 className="font-mono text-xs sm:text-sm font-black text-white truncate max-w-[120px] sm:max-w-[200px]">
              {space.name}
            </h1>
          </div>

          {/* Live Online Count */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-xl shrink-0">
            <Users className="w-3.5 h-3.5" />
            <span>{remoteAvatars.length + 1} online</span>
          </div>
        </div>

        {/* Center: The 3 Core Actions (Play Games, Spotify Music, Chat) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 🎲 Play Table Games Button */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(5);
              setPartyTableGameTab("ludo");
              setPartyTableGamesOpen(true);
            }}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Play Ludo, UNO, Spin the Bottle, RPS & Table Games"
          >
            <span className="text-sm">🎲</span>
            <span>Play Games</span>
          </button>

          {/* 🎵 Spotify & Music Button */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setPartyMusicOpen((v) => !v);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              space?.spotifySyncState?.isPlaying
                ? "border-emerald-500 bg-emerald-950/70 text-emerald-300 shadow-md shadow-emerald-500/20"
                : partyMusicOpen
                ? "border-pink-500 bg-pink-950/60 text-pink-300"
                : "border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-white"
            }`}
            title="Toggle Synchronized Music & Spotify Player"
          >
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {space?.spotifySyncState?.isPlaying ? "Spotify Playing" : "Music"}
            </span>
          </button>

          {/* 💬 Room Chat Toggle */}
          <button
            type="button"
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setRightDrawerOpen((prev) => !prev);
              setRightDrawerTab("chat");
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              rightDrawerOpen
                ? "border-cyan-400 bg-cyan-950/50 text-cyan-300"
                : "border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-white"
            }`}
            title="Toggle Room Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>

        {/* Right: Mic Control, Invite Friends & Room Settings / Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 🎙️ Spatial Voice Mic Control */}
          <div className="shrink-0">
            <SpatialVoiceManager
              spaceId={spaceId}
              localAvatar={localAvatar}
              remoteAvatars={remoteAvatars}
              onSpeakingUidsChange={setSpeakingUids}
            />
          </div>

          {/* 🔗 Invite Friends (1-Click Instant Copy) */}
          <button
            type="button"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              spacesSfx.playKeyNote(3);
              setWelcomeToast("🎉 Invite link copied! Share with friends to join.");
              setTimeout(() => setWelcomeToast(null), 3500);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Copy Direct Space Invite Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* ⚙️ Host Hub & Space Settings (With Delete Space) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                spacesSfx.playKeyNote(4);
                setHostHubDropdownOpen((v) => !v);
              }}
              className={`p-2 rounded-xl border text-xs font-mono font-bold flex items-center transition-all cursor-pointer ${
                hostHubDropdownOpen
                  ? "border-purple-400 bg-purple-950/60 text-purple-300"
                  : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white"
              }`}
              title="Space Settings & Controls"
            >
              <Settings className="w-4 h-4" />
            </button>

            {hostHubDropdownOpen && (
              <div className="absolute top-10 right-0 w-60 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 animate-in zoom-in-95">
                <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2.5 py-1">
                  Space Settings
                </div>

                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(3);
                    setHostEventModalOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Rename & Atmosphere</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playKeyNote(2);
                    setAvatarModalOpen(true);
                    setHostHubDropdownOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span>🎨</span>
                  <span>Avatar Studio</span>
                </button>

                <div className="h-px bg-neutral-800 my-1" />

                <button
                  type="button"
                  onClick={async () => {
                    const confirmDel = window.confirm(
                      `Are you sure you want to permanently delete "${space.name}"? This will close the room for all participants.`
                    );
                    if (!confirmDel) return;
                    try {
                      spacesSfx.playGavelStrike();
                      await deleteSpaceDoc(space.id);
                      router.push("/spaces");
                    } catch (e) {
                      console.error("Failed to delete space:", e);
                    }
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-900/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-bold">Delete Space</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Live Stage Presentation Bar (Image 1 & 3 Fidelity) */}
      {(space?.category === "WEBINAR" || isStageActive) && (
        <StagePresentationBar
          spaceTitle={space.name}
          isHost={isHost}
          currentFloor={currentFloor}
          onSelectFloor={() => {}}
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
            onMinimize={() => setPartyMusicOpen(false)}
          />
        </div>
      )}

      {/* Floating Spotify Mini-Pill when music is minimized (Never blocks gameplay) */}
      {space.spotifySyncState?.isPlaying && space.spotifySyncState?.trackId && !partyMusicOpen && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 animate-in slide-in-from-top-2 max-w-[92vw]">
          <div
            onClick={() => setPartyMusicOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-neutral-950/95 border border-emerald-500/60 text-emerald-300 font-mono text-xs shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-neutral-900 transition backdrop-blur-xl"
            title="Click to expand Spotify controls"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-white shrink-0">DJ @{space.spotifySyncState.djHandle || "Host"}:</span>
            <span className="truncate max-w-[140px] sm:max-w-[240px] text-emerald-200">
              {space.spotifySyncState.trackName} - {space.spotifySyncState.artistName}
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold shrink-0">
              Controls ▲
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateSpaceDoc(spaceId, { spotifySyncState: null });
              setSpace((prev) => ({ ...prev, spotifySyncState: null }));
              partyMusicEngine.setExternalAudio(false);
            }}
            className="p-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition cursor-pointer shadow-lg"
            title="Exit Spotify"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Table Games Activity Banner (Join live games with friends) */}
      {tableGameInviteToast && !partyTableGamesOpen && (
        <div
          onClick={() => {
            setPartyTableGameTab(tableGameInviteToast.tab);
            setPartyTableGamesOpen(true);
            setTableGameInviteToast(null);
          }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-rose-900/90 border border-pink-500/60 text-white font-mono text-xs shadow-2xl flex items-center gap-2 cursor-pointer hover:scale-105 transition backdrop-blur-md animate-bounce max-w-[92vw]"
        >
          <span className="text-sm shrink-0">🎲</span>
          <span className="font-bold text-pink-300 shrink-0">@{tableGameInviteToast.hostName}:</span>
          <span className="truncate text-pink-100 font-sans text-[11px]">
            {tableGameInviteToast.text}
          </span>
          <span className="text-[9px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 shadow">
            Join Table 🪑
          </span>
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
          onOpenAvatarStudio={() => setAvatarModalOpen(true)}
          onUpdateDecorations={handleUpdateDecorations}
          confettiTrigger={confettiBlastCount}

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
        spotifySyncState={space.spotifySyncState}
        onUpdateSpotifySync={(sync) => {
          updateSpaceDoc(spaceId, { spotifySyncState: sync });
          setSpace((prev) => ({ ...prev, spotifySyncState: sync }));
        }}
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
        spotifySyncState={space.spotifySyncState}
        onUpdateSpotifySync={(sync) => {
          updateSpaceDoc(spaceId, { spotifySyncState: sync });
          setSpace((prev) => ({ ...prev, spotifySyncState: sync }));
        }}
        onBroadcastSpeech={handleSendSpeech}
        liveTableState={liveTableGame}
        onUpdateTableGame={(updates) => {
          updateSpaceTableGame(spaceId, {
            ...updates,
            hostUid: effectiveUid,
            hostName: localAvatar.handle,
          });
        }}
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
