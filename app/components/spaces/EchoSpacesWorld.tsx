"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SpaceZoneId,
  SpaceVibe,
  SpatialAvatar,
  SPACES_ZONES,
  INTERACTIVE_OBJECTS,
  InteractiveObject,
  CustomDecoration,
  DecorationItemDef,
  DECORATION_CATALOG,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getZoneAtCoordinates,
  getPrivateRugAtCoordinates,
  checkCollision,
  getNearbyInteractiveObject,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import { TableDish, ChairReservation } from "@/lib/spacesEconomy";
import { useAuth } from "@/app/components/AuthProvider";
import ProximityAttendeesBar from "@/app/components/spaces/ProximityAttendeesBar";
import {
  Sparkles,
  Send,
  MessageSquare,
  Ghost,
  Lock,
  Maximize2,
  Minimize2,
  Compass,
  Palette,
  Wrench,
  Trash2,
  Smile,
  X,
  Plus,
  Minus,
  Hand,
  Coffee,
  Gamepad2,
  Disc3,
  Edit3,
} from "lucide-react";

interface EchoSpacesWorldProps {
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  vibe?: SpaceVibe;
  decorations?: CustomDecoration[];
  speakingUids?: Set<string>;
  onMove: (x: number, y: number, dir: "down" | "up" | "left" | "right", isMoving: boolean) => void;
  onSit: (isSitting: boolean, objectId?: string) => void;
  onSendSpeech: (text: string) => void;
  onSendEmote: (emote: string) => void;
  onZoneChange: (newZone: SpaceZoneId) => void;
  onRugChange?: (rugId: string | null) => void;
  onInteractObject: (obj: InteractiveObject) => void;
  onToggleGhost?: () => void;
  onToggleHandRaise?: () => void;
  onToggleCoffee?: () => void;
  onOpenArcade?: () => void;
  onOpenJukebox?: () => void;
  onOpenWhiteboard?: () => void;
  onOpenAvatarStudio?: () => void;
  onUpdateDecorations?: (decorations: CustomDecoration[]) => void;
  confettiTrigger?: number;
  onGetCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
  tableDishes?: TableDish[];
  chairReservations?: ChairReservation[];
  onBiteDish?: (dishId: string) => void;
  onOpenUno?: () => void;
  onOpenPartyGames?: () => void;
}

const EMOTE_REACTIONS = ["💖", "🔥", "🎉", "👏", "💡", "☕", "🚀", "👋"];

export interface TableChairDef {
  id: string;
  name: string;
  tableName: string;
  x: number;
  y: number;
  faceDirection: "up" | "down" | "left" | "right";
}

export const NUMBERED_TABLES = [
  { id: "tbl_1", num: 1, label: "Party Table 1", x: 670, y: 780, r: 38, cap: 6 },
  { id: "tbl_2", num: 2, label: "Party Table 2", x: 910, y: 780, r: 38, cap: 6 },
  { id: "tbl_3", num: 3, label: "Party Table 3", x: 670, y: 920, r: 38, cap: 6 },
  { id: "tbl_4", num: 4, label: "Party Table 4", x: 910, y: 920, r: 38, cap: 6 },
  { id: "tbl_5", num: 5, label: "Party Table 5", x: 670, y: 1060, r: 38, cap: 6 },
  { id: "tbl_6", num: 6, label: "Party Table 6", x: 910, y: 1060, r: 38, cap: 6 },
];

export const BANQUET_CHAIRS: TableChairDef[] = [
  // 7 Top chairs (y: 307, face down towards table)
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({
    id: `banquet_chair_top_${i + 1}`,
    name: `Banquet Chair #${i + 1}`,
    tableName: "Grand Banquet Dinner Table",
    x: 1060 + i * 44 + 11,
    y: 307,
    faceDirection: "down" as const,
  })),
  // 7 Bottom chairs (y: 401, face up towards table)
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({
    id: `banquet_chair_bottom_${i + 8}`,
    name: `Banquet Chair #${i + 8}`,
    tableName: "Grand Banquet Dinner Table",
    x: 1060 + i * 44 + 11,
    y: 401,
    faceDirection: "up" as const,
  })),
  // Left head chair (x: 1025, y: 355, face right towards table)
  {
    id: "banquet_chair_head_left",
    name: "Banquet Host Chair (Left)",
    tableName: "Grand Banquet Dinner Table",
    x: 1025,
    y: 355,
    faceDirection: "right" as const,
  },
  // Right head chair (x: 1385, y: 355, face left towards table)
  {
    id: "banquet_chair_head_right",
    name: "Banquet Head Chair (Right)",
    tableName: "Grand Banquet Dinner Table",
    x: 1385,
    y: 355,
    faceDirection: "left" as const,
  },
];

export const ROUND_TABLE_CHAIRS: TableChairDef[] = NUMBERED_TABLES.flatMap((tbl) =>
  [0, 1, 2, 3, 4, 5].map((j) => {
    const angle = (j * Math.PI * 2) / tbl.cap;
    const cx = tbl.x + Math.cos(angle) * (tbl.r + 14);
    const cy = tbl.y + Math.sin(angle) * (tbl.r + 14);
    const dx = tbl.x - cx;
    const dy = tbl.y - cy;
    let face: "up" | "down" | "left" | "right" = "down";
    if (Math.abs(dx) > Math.abs(dy)) {
      face = dx > 0 ? "right" : "left";
    } else {
      face = dy > 0 ? "down" : "up";
    }
    return {
      id: `${tbl.id}_chair_${j + 1}`,
      name: `${tbl.label} Chair #${j + 1}`,
      tableName: tbl.label,
      x: Math.round(cx),
      y: Math.round(cy),
      faceDirection: face,
    };
  })
);


// 🎵 7 Music Studio Jam & Instrument Seating
export const MUSIC_JAM_CHAIRS: TableChairDef[] = [
  {
    id: "music_piano_bench",
    name: "Grand Synthesizer Piano Bench",
    tableName: "Music Studio Piano",
    x: 245,
    y: 825,
    faceDirection: "up",
  },
  {
    id: "music_drum_throne",
    name: "4-Pad Drum Machine Throne",
    tableName: "Music Studio Drums",
    x: 375,
    y: 820,
    faceDirection: "up",
  },
  // 5 Acoustic Jam Circle Chairs around the rug (x: 230, y: 950)
  {
    id: "music_jam_chair_1",
    name: "Acoustic Jam Chair (North)",
    tableName: "Music Jam Circle",
    x: 230,
    y: 910,
    faceDirection: "down",
  },
  {
    id: "music_jam_chair_2",
    name: "Acoustic Jam Chair (South)",
    tableName: "Music Jam Circle",
    x: 230,
    y: 990,
    faceDirection: "up",
  },
  {
    id: "music_jam_chair_3",
    name: "Acoustic Jam Chair (West)",
    tableName: "Music Jam Circle",
    x: 180,
    y: 950,
    faceDirection: "right",
  },
  {
    id: "music_jam_chair_4",
    name: "Acoustic Jam Chair (East)",
    tableName: "Music Jam Circle",
    x: 280,
    y: 950,
    faceDirection: "left",
  },
  {
    id: "music_jam_chair_5",
    name: "Acoustic Jam Chair (Bass)",
    tableName: "Music Jam Circle",
    x: 270,
    y: 985,
    faceDirection: "left",
  },
];


// ⛲ 4 Echo Marble Fountain Garden Benches
export const COURTYARD_BENCHES: TableChairDef[] = [
  {
    id: "courtyard_bench_north",
    name: "Fountain Garden Bench (North)",
    tableName: "Echo Marble Fountain Courtyard",
    x: 800,
    y: 535,
    faceDirection: "down",
  },
  {
    id: "courtyard_bench_south",
    name: "Fountain Garden Bench (South)",
    tableName: "Echo Marble Fountain Courtyard",
    x: 800,
    y: 645,
    faceDirection: "up",
  },
  {
    id: "courtyard_bench_west",
    name: "Fountain Garden Bench (West)",
    tableName: "Echo Marble Fountain Courtyard",
    x: 745,
    y: 590,
    faceDirection: "right",
  },
  {
    id: "courtyard_bench_east",
    name: "Fountain Garden Bench (East)",
    tableName: "Echo Marble Fountain Courtyard",
    x: 855,
    y: 590,
    faceDirection: "left",
  },
];

export const ALL_TABLE_CHAIRS: TableChairDef[] = [...BANQUET_CHAIRS, ...ROUND_TABLE_CHAIRS];
export const ALL_WORLD_SEATS: TableChairDef[] = [
  ...ALL_TABLE_CHAIRS,
  ...MUSIC_JAM_CHAIRS,
  ...COURTYARD_BENCHES,
];

export default function EchoSpacesWorld({
  localAvatar,
  remoteAvatars,
  vibe = "MIDNIGHT_NEON",
  decorations: externalDecorations = [],
  speakingUids = new Set(),
  onMove,
  onSit,
  onSendSpeech,
  onSendEmote,
  onZoneChange,
  onRugChange,
  onInteractObject,
  onToggleGhost,
  onToggleHandRaise,
  onToggleCoffee,
  onOpenArcade,
  onOpenJukebox,
  onOpenWhiteboard,
  onOpenAvatarStudio,
  onUpdateDecorations,
  confettiTrigger = 0,
  onGetCanvasRef,
  tableDishes = [],
  chairReservations = [],
  onBiteDish,
  onOpenUno,
  onOpenPartyGames,
}: EchoSpacesWorldProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tableDishesRef = useRef(tableDishes);
  useEffect(() => { tableDishesRef.current = tableDishes; }, [tableDishes]);

  const chairReservationsRef = useRef(chairReservations);
  useEffect(() => { chairReservationsRef.current = chairReservations; }, [chairReservations]);

  // Viewport dimensions & fullscreen
  const [viewportDim, setViewportDim] = useState({ w: 1024, h: 680 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  // Camera tracking
  const cameraRef = useRef<{ x: number; y: number }>({ x: localAvatar.x, y: localAvatar.y });

  // Click-to-Move / Path Target
  const clickTargetRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Input states
  const keysPressed = useRef<Record<string, boolean>>({});
  const nearbyObjectRef = useRef<InteractiveObject | null>(null);
  const nearbyTableChairRef = useRef<TableChairDef | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);
  const [activeRugPrompt, setActiveRugPrompt] = useState<string | null>(null);

  // Chat message input & Emote Picker
  const [chatInput, setChatInput] = useState("");
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [emotePickerOpen, setEmotePickerOpen] = useState(false);

  // Floating Physics Emotes Queue
  const floatingEmotesRef = useRef<
    Array<{ id: string; x: number; y: number; text: string; vy: number; alpha: number }>
  >([]);

  // ── SPACE DECORATION / BUILD MODE STATE ──
  const [isDecorateMode, setIsDecorateMode] = useState(false);
  const [selectedDeco, setSelectedDeco] = useState<DecorationItemDef | null>(null);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [activeDecoCategory, setActiveDecoCategory] = useState<string>("seating");
  const [localDecorations, setLocalDecorations] = useState<CustomDecoration[]>(externalDecorations);
  const mouseWorldPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (externalDecorations) {
      setLocalDecorations(externalDecorations);
    }
  }, [externalDecorations]);

  // Touch virtual joystick state
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Particles: rain, sakura, ambient motes, fountain water spray
  const particlesRef = useRef<
    Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }>
  >([]);
  const waterSprayRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>
  >([]);
  const celebrationConfettiRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number; vRot: number; life: number; maxLife: number }>
  >([]);

  // Expose Canvas Ref for Photo Booth snapshots
  useEffect(() => {
    if (canvasRef.current) {
      onGetCanvasRef?.(canvasRef.current);
    }
  }, [onGetCanvasRef]);

  // Trigger celebration confetti blast
  useEffect(() => {
    if (confettiTrigger && confettiTrigger > 0) {
      const colors = ["#f43f5e", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#eab308"];
      const newConfetti = [];
      for (let i = 0; i < 140; i++) {
        newConfetti.push({
          x: localAvatar.x + (Math.random() - 0.5) * 120,
          y: localAvatar.y - 30 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 14,
          vy: -7 - Math.random() * 9,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 5,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          life: 0,
          maxLife: 100 + Math.floor(Math.random() * 60),
        });
      }
      celebrationConfettiRef.current.push(...newConfetti);
    }
  }, [confettiTrigger]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewportDim({
        w: Math.max(640, Math.floor(rect.width)),
        h: Math.max(540, Math.floor(rect.height || 680)),
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  // Initialize atmospheric particles
  useEffect(() => {
    const pts: Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }> = [];
    const count =
      vibe === "COZY_RAINY"
        ? 180
        : vibe === "HORROR_NIGHT"
        ? 80
        : vibe === "PARTY_CLUB"
        ? 85
        : vibe === "SUKOON_ZEN"
        ? 70
        : vibe === "DINNER_GALA"
        ? 55
        : vibe === "SUNSET_LOFI"
        ? 60
        : 40;
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        speed:
          vibe === "COZY_RAINY"
            ? 12 + Math.random() * 8
            : vibe === "PARTY_CLUB"
            ? 2.5 + Math.random() * 4
            : 1 + Math.random() * 2,
        size:
          vibe === "COZY_RAINY"
            ? 16 + Math.random() * 12
            : vibe === "HORROR_NIGHT"
            ? 12 + Math.random() * 16
            : 3 + Math.random() * 4,
        alpha: 0.25 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = pts;

    const sprays: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }> = [];
    for (let i = 0; i < 30; i++) {
      sprays.push({
        x: 800,
        y: 590,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -Math.random() * 2.5 - 1.5,
        life: Math.random() * 30,
        maxLife: 35,
      });
    }
    waterSprayRef.current = sprays;
  }, [vibe]);

  // 1. Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        clickTargetRef.current = null;
      }

      if (key === "x" || key === "e") {
        e.preventDefault();
        if (nearbyObjectRef.current) {
          handleInteract(nearbyObjectRef.current);
        } else if (nearbyTableChairRef.current) {
          const chair = nearbyTableChairRef.current;
          if (localAvatar.isSitting) {
            // If already seated, pressing E opens Party Table Games
            if (onOpenPartyGames) onOpenPartyGames();
          } else {
            // Sit down at this table chair
            clickTargetRef.current = { x: chair.x, y: chair.y, time: Date.now() };
            onMove(chair.x, chair.y, chair.faceDirection, false);
            onSit(true, chair.id);
            spacesSfx.playSitPop();
            onSendSpeech(`🪑 Seated at ${chair.name}!`);
          }
        }
      }

      if (key === "g") {
        e.preventDefault();
        onToggleGhost?.();
        spacesSfx.playKeyNote(6);
      }

      if (key === "h") {
        e.preventDefault();
        onToggleHandRaise?.();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onToggleGhost, onToggleHandRaise]);

  // Handle Object Interaction
  const handleInteract = useCallback(
    (obj: InteractiveObject) => {
      spacesSfx.playSitPop();
      if (obj.type === "chair") {
        const nextSitting = !localAvatar.isSitting;
        onSit(nextSitting, nextSitting ? obj.id : undefined);
        if (nextSitting && (obj.id === "office_arcade_stool_1" || obj.id === "office_arcade_stool_2")) {
          if (onOpenArcade) onOpenArcade();
        }
      } else if (obj.type === "arcade" || obj.id === "office_arcade_cabinet") {
        if (onOpenArcade) onOpenArcade();
        else onInteractObject(obj);
      } else if (obj.type === "jukebox" || obj.id === "music_jukebox") {
        if (onOpenJukebox) onOpenJukebox();
        else onInteractObject(obj);
      } else if (obj.type === "whiteboard") {
        if (onOpenWhiteboard) onOpenWhiteboard();
        else onInteractObject(obj);
      } else if (obj.type === "coffee" || obj.id === "office_coffee_bar") {
        if (onToggleCoffee) onToggleCoffee();
        else onInteractObject(obj);
      } else {
        onInteractObject(obj);
      }
    },
    [localAvatar.isSitting, onSit, onInteractObject, onOpenArcade, onOpenJukebox, onOpenWhiteboard, onToggleCoffee]
  );

  // 2. Chat Bubble Send
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendSpeech(chatInput.trim());
    setActiveSpeech(chatInput.trim());
    setChatInput("");
    setTimeout(() => setActiveSpeech(null), 5500);
  };

  // Trigger floating reaction emote
  const triggerEmote = (emote: string) => {
    spacesSfx.playEmotePop();
    onSendEmote(emote);
    floatingEmotesRef.current.push({
      id: Math.random().toString(),
      x: localAvatar.x,
      y: localAvatar.y - 30,
      text: emote,
      vy: -2.2,
      alpha: 1,
    });
    setEmotePickerOpen(false);
  };

  // 3. Canvas Mouse Move (Tracks world pos for decoration ghost preview)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;
    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;
    mouseWorldPosRef.current = {
      x: (clickScreenX - viewportDim.w / 2) / zoom + camX,
      y: (clickScreenY - viewportDim.h / 2) / zoom + camY,
    };
  };

  // 4. Click/Touch-to-Move or Place/Remove Decoration Handler
  const processPointerClick = (clickScreenX: number, clickScreenY: number) => {
    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;
    const worldClickX = Math.max(40, Math.min(WORLD_WIDTH - 40, (clickScreenX - viewportDim.w / 2) / zoom + camX));
    const worldClickY = Math.max(40, Math.min(WORLD_HEIGHT - 40, (clickScreenY - viewportDim.h / 2) / zoom + camY));

    // If in Decoration Build Mode:
    if (isDecorateMode) {
      if (isEraserMode) {
        // Remove decoration nearest to click
        const toRemove = localDecorations.find((d) => {
          return (
            worldClickX >= d.x - 10 &&
            worldClickX <= d.x + d.w + 10 &&
            worldClickY >= d.y - 10 &&
            worldClickY <= d.y + d.h + 10
          );
        });
        if (toRemove) {
          spacesSfx.playRemoveSound();
          const next = localDecorations.filter((d) => d.id !== toRemove.id);
          setLocalDecorations(next);
          onUpdateDecorations?.(next);
        }
        return;
      }

      if (selectedDeco) {
        // Place new decoration
        spacesSfx.playPlaceSound();
        const newDeco: CustomDecoration = {
          id: `deco_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          catalogId: selectedDeco.id,
          name: selectedDeco.name,
          category: selectedDeco.category,
          icon: selectedDeco.icon,
          x: Math.round(worldClickX - selectedDeco.w / 2),
          y: Math.round(worldClickY - selectedDeco.h / 2),
          w: selectedDeco.w,
          h: selectedDeco.h,
          placedBy: user?.handle || "@EXPLORER",
          placedAt: Date.now(),
          color: selectedDeco.color,
          canSit: selectedDeco.canSit,
        };
        const next = [...localDecorations, newDeco];
        setLocalDecorations(next);
        onUpdateDecorations?.(next);
        return;
      }
    }

    // Normal Click-to-Walk:
    // Check if clicked directly on an interactive object (walk to & interact)
    for (const obj of INTERACTIVE_OBJECTS) {
      if (
        worldClickX >= obj.x - 14 &&
        worldClickX <= obj.x + obj.w + 14 &&
        worldClickY >= obj.y - 14 &&
        worldClickY <= obj.y + obj.h + 14
      ) {
        clickTargetRef.current = { x: obj.x + obj.w / 2, y: obj.y + obj.h + 10, time: Date.now() };
        handleInteract(obj);
        return;
      }
    }

    // Check if clicked directly on placed custom seating
    for (const d of localDecorations) {
      if (
        d.canSit &&
        worldClickX >= d.x - 10 &&
        worldClickX <= d.x + d.w + 10 &&
        worldClickY >= d.y - 10 &&
        worldClickY <= d.y + d.h + 10
      ) {
        clickTargetRef.current = { x: d.x + d.w / 2, y: d.y + d.h / 2, time: Date.now() };
        onSit(true, d.id);
        spacesSfx.playSitPop();
        return;
      }
    }

    // Check if clicked directly on any chair across all active zones (Music, Courtyard, Tables)
    for (const chair of ALL_WORLD_SEATS) {
      if (Math.hypot(worldClickX - chair.x, worldClickY - chair.y) <= 24) {
        clickTargetRef.current = { x: chair.x, y: chair.y, time: Date.now() };
        onMove(chair.x, chair.y, chair.faceDirection, false);
        onSit(true, chair.id);
        spacesSfx.playSitPop();
        onSendSpeech(`🪑 Seated at ${chair.name}!`);
        return;
      }
    }

    // Check if clicked on Banquet Table body (x: 1040..1370, y: 320..386)
    if (worldClickX >= 1040 && worldClickX <= 1370 && worldClickY >= 320 && worldClickY <= 386) {
      const closestChair = BANQUET_CHAIRS.reduce((prev, curr) =>
        Math.hypot(worldClickX - curr.x, worldClickY - curr.y) < Math.hypot(worldClickX - prev.x, worldClickY - prev.y) ? curr : prev
      );
      clickTargetRef.current = { x: closestChair.x, y: closestChair.y, time: Date.now() };
      onMove(closestChair.x, closestChair.y, closestChair.faceDirection, false);
      onSit(true, closestChair.id);
      spacesSfx.playSitPop();
      onSendSpeech(`🪑 Seated at ${closestChair.name}!`);
      return;
    }

    // Check if clicked on any of the 6 Round Tables (Courtyard/Party)
    for (const tbl of NUMBERED_TABLES) {
      if (Math.hypot(worldClickX - tbl.x, worldClickY - tbl.y) <= tbl.r + 8) {
        const tableChairs = ROUND_TABLE_CHAIRS.filter((c) => c.id.startsWith(tbl.id));
        const closestChair = tableChairs.reduce((prev, curr) =>
          Math.hypot(worldClickX - curr.x, worldClickY - curr.y) < Math.hypot(worldClickX - prev.x, worldClickY - prev.y) ? curr : prev
        );
        clickTargetRef.current = { x: closestChair.x, y: closestChair.y, time: Date.now() };
        onMove(closestChair.x, closestChair.y, closestChair.faceDirection, false);
        onSit(true, closestChair.id);
        spacesSfx.playSitPop();
        onSendSpeech(`🪑 Seated at ${closestChair.name}!`);
        return;
      }
    }

    // Check if clicked directly on a catering table dish
    if (tableDishesRef.current && onBiteDish) {
      for (const dish of tableDishesRef.current) {
        if (Math.hypot(worldClickX - dish.x, worldClickY - dish.y) < 22) {
          onBiteDish(dish.id);
          return;
        }
      }
    }

    clickTargetRef.current = { x: worldClickX, y: worldClickY, time: Date.now() };
    spacesSfx.playFootstep();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    processPointerClick(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    processPointerClick(touch.clientX - rect.left, touch.clientY - rect.top);
  };

  const handleMobileDpadStep = (dir: "up" | "down" | "left" | "right") => {
    const step = 45;
    let nextX = localAvatar.x;
    let nextY = localAvatar.y;
    if (dir === "up") nextY -= step;
    if (dir === "down") nextY += step;
    if (dir === "left") nextX -= step;
    if (dir === "right") nextX += step;

    nextX = Math.max(40, Math.min(WORLD_WIDTH - 40, nextX));
    nextY = Math.max(40, Math.min(WORLD_HEIGHT - 40, nextY));

    if (checkCollision(nextX, nextY)) {
      spacesSfx.playFootstep();
      return;
    }

    if (localAvatar.isSitting) {
      onSit(false);
    }

    onMove(nextX, nextY, dir, true);
    spacesSfx.playFootstep();

    setTimeout(() => {
      onMove(nextX, nextY, dir, false);
    }, 180);
  };

  const handleMobileSitToggle = () => {
    if (localAvatar.isSitting) {
      onSit(false);
      spacesSfx.playSitPop();
      onSendSpeech("🚶 Stood up");
      return;
    }

    // Find closest chair within 90px
    let closest: TableChairDef | null = null;
    let minDist = 90;
    for (const chair of ALL_WORLD_SEATS) {
      const dist = Math.hypot(localAvatar.x - chair.x, localAvatar.y - chair.y);
      if (dist < minDist) {
        minDist = dist;
        closest = chair;
      }
    }

    if (closest) {
      onMove(closest.x, closest.y, closest.faceDirection, false);
      onSit(true, closest.id);
      spacesSfx.playSitPop();
      onSendSpeech(`🪑 Seated at ${closest.name}!`);
    } else {
      onSendSpeech("⚠️ Walk closer to a chair or table to sit!");
    }
  };

  // 5. 60 FPS Render Engine Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let posX = localAvatar.x;
    let posY = localAvatar.y;
    let currentDir = localAvatar.direction;
    let currentZone = localAvatar.activeZone;
    let currentRugId = localAvatar.activeRugId || null;
    const speed = 4.4;

    const isGhostMode = !!localAvatar.avatarConfig?.isGhost;

    const render = () => {
      const canvasW = viewportDim.w;
      const canvasH = viewportDim.h;

      // ── Movement calculation ──
      let dx = 0;
      let dy = 0;

      if (!localAvatar.isSitting) {
        if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= 1;
        if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += 1;
        if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= 1;
        if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += 1;

        if (isJoystickActive) {
          dx += joystickVector.current.x;
          dy += joystickVector.current.y;
        }

        if (clickTargetRef.current && dx === 0 && dy === 0) {
          const targetDist = Math.hypot(clickTargetRef.current.x - posX, clickTargetRef.current.y - posY);
          if (targetDist > 6) {
            const angle = Math.atan2(clickTargetRef.current.y - posY, clickTargetRef.current.x - posX);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
          } else {
            clickTargetRef.current = null;
          }
        }
      }

      const isMoving = Math.hypot(dx, dy) > 0.1;

      if (isMoving) {
        const angle = Math.atan2(dy, dx);
        const nextX = posX + Math.cos(angle) * speed;
        const nextY = posY + Math.sin(angle) * speed;

        if (isGhostMode) {
          posX = Math.max(30, Math.min(WORLD_WIDTH - 30, nextX));
          posY = Math.max(30, Math.min(WORLD_HEIGHT - 30, nextY));
        } else {
          if (!checkCollision(nextX, posY, 10)) posX = nextX;
          if (!checkCollision(posX, nextY, 10)) posY = nextY;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          currentDir = dx > 0 ? "right" : "left";
        } else {
          currentDir = dy > 0 ? "down" : "up";
        }

        const newZone = getZoneAtCoordinates(posX, posY);
        if (newZone !== currentZone) {
          currentZone = newZone;
          onZoneChange(newZone);
          spacesSfx.playZoneChime();
        }

        const activeRug = getPrivateRugAtCoordinates(posX, posY);
        const nextRugId = activeRug ? activeRug.id : null;
        if (nextRugId !== currentRugId) {
          currentRugId = nextRugId;
          onRugChange?.(nextRugId);
          if (activeRug) {
            spacesSfx.playSitPop();
            setActiveRugPrompt(`🔒 Joined ${activeRug.name}`);
          } else {
            setActiveRugPrompt(null);
          }
        }

        onMove(posX, posY, currentDir, true);
      } else if (localAvatar.isMoving) {
        onMove(posX, posY, currentDir, false);
      }

      const nearby = getNearbyInteractiveObject(posX, posY);
      nearbyObjectRef.current = nearby;

      const nearbyTableChair = ALL_WORLD_SEATS.find(
        (c) => Math.hypot(posX - c.x, posY - c.y) <= 38
      );
      nearbyTableChairRef.current = nearbyTableChair || null;

      if (nearby) {
        setNearbyPrompt(nearby.prompt.replace("[E]", "[X]"));
      } else if (nearbyTableChair) {
        if (localAvatar.isSitting) {
          setNearbyPrompt(`🪑 Seated at ${nearbyTableChair.name} • Press [E]/[X] to Play Games or Toast`);
        } else {
          setNearbyPrompt(`🪑 Press [E]/[X] or Click to Sit at ${nearbyTableChair.name} & Play Table Games`);
        }
      } else {
        setNearbyPrompt(null);
      }

      // Smooth camera tracking
      cameraRef.current.x += (posX - cameraRef.current.x) * 0.12;
      cameraRef.current.y += (posY - cameraRef.current.y) * 0.12;

      // ── RENDERING ──
      ctx.save();
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Floor cobblestones
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1;
      for (let px = 0; px < WORLD_WIDTH; px += 36) {
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let py = 0; py < WORLD_HEIGHT; py += 36) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(WORLD_WIDTH, py);
        ctx.stroke();
      }

      // Neon grid
      if (vibe === "MIDNIGHT_NEON") {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
        ctx.lineWidth = 1.2;
        for (let gx = 0; gx < WORLD_WIDTH; gx += 48) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, WORLD_HEIGHT);
          ctx.stroke();
        }
      }

      // ═════════════════════════════════════════════════════════════════════
      // ── AUTHENTIC GATHER.TOWN MAP GRAPHICS (Matching reference photos) ──
      // ═════════════════════════════════════════════════════════════════════
      const timeMs = performance.now();

      // ── 1. TOP OUTDOOR PARK (x: 50 to 865, y: 35 to 220) ──
      ctx.save();
      // Lush Green Lawn Grass
      ctx.fillStyle = "#225324";
      ctx.fillRect(50, 35, 815, 185);

      // Subtle grass blade flecks
      ctx.fillStyle = "rgba(74, 222, 128, 0.12)";
      for (let gx = 65; gx < 850; gx += 28) {
        for (let gy = 45; gy < 210; gy += 24) {
          ctx.fillRect(gx + ((gy * 7) % 15), gy, 2, 4);
        }
      }

      // Wooden Post-and-Rail Fence along North, West, East edges
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 3;
      // North rails
      ctx.beginPath();
      ctx.moveTo(50, 38);
      ctx.lineTo(865, 38);
      ctx.moveTo(50, 44);
      ctx.lineTo(865, 44);
      // West rails
      ctx.moveTo(52, 35);
      ctx.lineTo(52, 220);
      // East rails
      ctx.moveTo(863, 35);
      ctx.lineTo(863, 220);
      ctx.stroke();

      // Fence wooden posts every 48px
      ctx.fillStyle = "#713f12";
      for (let fx = 50; fx <= 865; fx += 48) {
        ctx.fillRect(fx - 3, 34, 6, 14);
      }

      // ── Tiki Bar on Sand Patch (x: 160, y: 125) ──
      // Sand circle patch
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(160, 125, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bamboo round bar counter
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.arc(160, 125, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Drinks on bar
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(152, 118, 4, 6);
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(164, 118, 4, 6);

      // Thatch Umbrella Cone Canopy
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.arc(160, 125, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Radiating thatch spokes & center pole top
      ctx.strokeStyle = "rgba(254, 240, 138, 0.4)";
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(160, 125);
        ctx.lineTo(160 + Math.cos(a) * 36, 125 + Math.sin(a) * 36);
        ctx.stroke();
      }
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.arc(160, 125, 4, 0, Math.PI * 2);
      ctx.fill();

      // 3 Wooden Tiki Stools
      const stoolPositions = [
        { x: 132, y: 142 },
        { x: 160, y: 160 },
        { x: 188, y: 142 },
      ];
      stoolPositions.forEach((st) => {
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.arc(st.x, st.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(st.x, st.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Yellow/Black Hazard Utility Box (x: 270, y: 70) ──
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(270, 70, 28, 22);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(270, 70, 28, 22);

      // 45° Diagonal Zebra Hazard Stripes
      ctx.save();
      ctx.beginPath();
      ctx.rect(271, 71, 26, 20);
      ctx.clip();
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 3;
      for (let zx = 250; zx < 310; zx += 7) {
        ctx.beginPath();
        ctx.moveTo(zx, 70);
        ctx.lineTo(zx + 20, 92);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#000000";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("⚡", 284, 84);
      ctx.restore();

      // ── Campfire Firepit with 4 Benches (x: 430, y: 130) ──
      // Cobblestone stone ring
      for (let s = 0; s < 10; s++) {
        const stoneAngle = (s * Math.PI * 2) / 10;
        const stX = 430 + Math.cos(stoneAngle) * 22;
        const stY = 130 + Math.sin(stoneAngle) * 22;
        ctx.fillStyle = s % 2 === 0 ? "#64748b" : "#94a3b8";
        ctx.beginPath();
        ctx.arc(stX, stY, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Charcoal ash bed
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(430, 130, 16, 0, Math.PI * 2);
      ctx.fill();

      // Glowing hot embers
      const emberPulse = Math.sin(timeMs * 0.005) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(220, 38, 38, ${emberPulse})`;
      ctx.beginPath();
      ctx.arc(430, 130, 11, 0, Math.PI * 2);
      ctx.fill();

      // Leaping animated flame particles
      const flameColors = ["#facc15", "#f97316", "#ef4444", "#fbbf24"];
      for (let f = 0; f < 5; f++) {
        const fAngle = (f * Math.PI * 2) / 5 + timeMs * 0.003;
        const fDist = Math.sin(timeMs * 0.008 + f) * 5 + 3;
        const flameY = 130 - 3 - Math.sin(timeMs * 0.01 + f) * 8;
        ctx.fillStyle = flameColors[f % flameColors.length];
        ctx.beginPath();
        ctx.arc(430 + Math.cos(fAngle) * fDist, flameY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4 Rustic Wooden Bench Logs (North, South, West, East)
      // North Bench
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(405, 88, 50, 14, 4);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // South Bench
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(405, 158, 50, 14, 4);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // West Bench
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(382, 105, 14, 50, 4);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // East Bench
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(464, 105, 14, 50, 4);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Circular Pink Cushion Lounge (x: 610, y: 130) ──
      // Center round oak coffee table
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.arc(610, 130, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(607, 126, 3, 5);
      ctx.fillRect(612, 128, 3, 5);

      // 4 Curved Plush Hot Pink Cushions
      const cushionArcs = [
        { start: -Math.PI * 0.75, end: -Math.PI * 0.25 }, // Top
        { start: Math.PI * 0.25, end: Math.PI * 0.75 },   // Bottom
        { start: Math.PI * 0.75, end: Math.PI * 1.25 },   // Left
        { start: -Math.PI * 0.25, end: Math.PI * 0.25 },  // Right
      ];
      cushionArcs.forEach((cArc) => {
        ctx.strokeStyle = "#be185d";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(610, 130, 29, cArc.start + 0.15, cArc.end - 0.15);
        ctx.stroke();

        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(610, 130, 29, cArc.start + 0.15, cArc.end - 0.15);
        ctx.stroke();
      });

      // ── DJ Sound Station & Acoustic Wave Speakers (x: 760, y: 130) ──
      // Left speaker tower
      ctx.fillStyle = "#18181b";
      ctx.fillRect(706, 106, 22, 46);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(706, 106, 22, 46);
      // Woofers
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(717, 120, 6, 0, Math.PI * 2);
      ctx.arc(717, 138, 7, 0, Math.PI * 2);
      ctx.fill();

      // Right speaker tower
      ctx.fillStyle = "#18181b";
      ctx.fillRect(792, 106, 22, 46);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(792, 106, 22, 46);
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(803, 120, 6, 0, Math.PI * 2);
      ctx.arc(803, 138, 7, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing cyan acoustic sound rings radiating out
      const soundPulse = (timeMs * 0.006) % 3;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.8 - soundPulse * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(717, 129, 14 + soundPulse * 10, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.arc(803, 129, 14 + soundPulse * 10, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();

      // DJ Console Table
      ctx.fillStyle = "#09090b";
      ctx.fillRect(734, 116, 52, 28);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(734, 116, 52, 28);

      // Twin Vinyl Platters
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(746, 130, 8, 0, Math.PI * 2);
      ctx.arc(774, 130, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(746, 130, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(774, 130, 3, 0, Math.PI * 2);
      ctx.fill();

      // LED Mixer meters
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(758, 122, 4, 3);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(758, 127, 4, 3);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(758, 132, 4, 3);

      // ── Victorian Streetlamps with Warm Glow ──
      const streetlamps = [
        { x: 95, y: 65 },
        { x: 520, y: 65 },
        { x: 830, y: 65 },
      ];
      streetlamps.forEach((lamp) => {
        // Soft yellow halo
        const haloGrad = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 28);
        haloGrad.addColorStop(0, "rgba(254, 240, 138, 0.35)");
        haloGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 28, 0, Math.PI * 2);
        ctx.fill();

        // Cast iron post & lantern
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 16);
        ctx.fillRect(lamp.x - 5, lamp.y + 12, 10, 3);
        // Lantern head
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y - 7, 6, Math.PI, Math.PI * 2);
        ctx.fill();
      });

      // Potted Tropical Palms along park boundary
      [ { x: 75, y: 195 }, { x: 840, y: 195 } ].forEach((plm) => {
        ctx.font = "24px sans-serif";
        ctx.fillText("🌴", plm.x - 12, plm.y);
      });
      ctx.restore();


      // ── 3. FOUNTAIN ROOM (RIGHT WING, x: 875 to 1545, y: 50 to 520) ──
      ctx.save();
      // Checkered Sand / Beige Tile Floor
      for (let tx = 875; tx < 1545; tx += 40) {
        for (let ty = 50; ty < 520; ty += 40) {
          const isAlt = ((tx - 875) / 40 + (ty - 50) / 40) % 2 === 0;
          ctx.fillStyle = isAlt ? "#ded0b3" : "#ece2cc";
          ctx.fillRect(tx, ty, 40, 40);
          ctx.strokeStyle = "rgba(180, 160, 130, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(tx, ty, 40, 40);
        }
      }

      // Room Header Tag
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(1110, 60, 200, 26, 8);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.font = "900 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("📍 Fountain Room", 1210, 77);

      // 3 Bubbling Water Fountains (in a row at x: 1060, 1200, 1340, y: 170)
      const fountainXs = [1060, 1200, 1340];
      const fountainY = 170;
      const rippleT = timeMs * 0.004;

      fountainXs.forEach((fX, idx) => {
        // Outer carved marble ring
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(fX, fountainY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Azure water pool
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(fX, fountainY, 24, 0, Math.PI * 2);
        ctx.fill();

        // Concentric undulating water ripples
        ctx.strokeStyle = "rgba(186, 230, 253, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(fX, fountainY, 15 + Math.sin(rippleT + idx) * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Center marble spout
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(fX, fountainY, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Water spray motes for 3 fountains
      waterSprayRef.current.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life += 1;
        if (sp.life > sp.maxLife) {
          const chosenF = fountainXs[Math.floor(Math.random() * fountainXs.length)];
          sp.x = chosenF + (Math.random() - 0.5) * 30;
          sp.y = fountainY;
          sp.vx = (Math.random() - 0.5) * 2;
          sp.vy = -Math.random() * 2.8 - 1.2;
          sp.life = 0;
        }
        ctx.fillStyle = `rgba(186, 230, 253, ${1 - sp.life / sp.maxLife})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Long Executive Banquet Conference Table (x: 1040, y: 320, w: 330, h: 66)
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.roundRect(1040, 320, 330, 66, 12);
      ctx.fill();
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Table finish inlay
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.roundRect(1048, 328, 314, 50, 8);
      ctx.fill();

      // Notepads & Laptops on table
      for (let n = 1065; n <= 1345; n += 44) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(n, 334, 12, 10);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(n, 356, 14, 10);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(n + 1, 357, 12, 5);
      }

      // 16 Banquet Chairs (7 along top, 7 along bottom, 1 left, 1 right)
      // Top row chairs (y: 298)
      for (let c = 1060; c <= 1340; c += 44) {
        const i = Math.round((c - 1060) / 44);
        const chairId = `banquet_chair_top_${i + 1}`;
        const isSeatedHere = localAvatar.isSitting && localAvatar.sittingObjectId === chairId;
        ctx.fillStyle = isSeatedHere ? "#0f766e" : "#1e293b";
        ctx.beginPath();
        ctx.roundRect(c, 298, 22, 18, 5);
        ctx.fill();
        ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#64748b";
        ctx.lineWidth = isSeatedHere ? 2.5 : 1.2;
        ctx.stroke();
      }
      // Bottom row chairs (y: 392)
      for (let c = 1060; c <= 1340; c += 44) {
        const i = Math.round((c - 1060) / 44);
        const chairId = `banquet_chair_bottom_${i + 8}`;
        const isSeatedHere = localAvatar.isSitting && localAvatar.sittingObjectId === chairId;
        ctx.fillStyle = isSeatedHere ? "#0f766e" : "#1e293b";
        ctx.beginPath();
        ctx.roundRect(c, 392, 22, 18, 5);
        ctx.fill();
        ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#64748b";
        ctx.lineWidth = isSeatedHere ? 2.5 : 1.2;
        ctx.stroke();
      }
      // Left head chair
      const leftSeated = localAvatar.isSitting && localAvatar.sittingObjectId === "banquet_chair_head_left";
      ctx.fillStyle = leftSeated ? "#0f766e" : "#1e293b";
      ctx.beginPath();
      ctx.roundRect(1016, 344, 18, 22, 5);
      ctx.fill();
      ctx.strokeStyle = leftSeated ? "#f59e0b" : "#64748b";
      ctx.lineWidth = leftSeated ? 2.5 : 1.2;
      ctx.stroke();

      // Right head chair
      const rightSeated = localAvatar.isSitting && localAvatar.sittingObjectId === "banquet_chair_head_right";
      ctx.fillStyle = rightSeated ? "#0f766e" : "#1e293b";
      ctx.beginPath();
      ctx.roundRect(1376, 344, 18, 22, 5);
      ctx.fill();
      ctx.strokeStyle = rightSeated ? "#f59e0b" : "#64748b";
      ctx.lineWidth = rightSeated ? 2.5 : 1.2;
      ctx.stroke();

      // ── Render Active Catering Dishes on Banquet Table ──
      const curDishes = tableDishesRef.current;
      if (curDishes && curDishes.length > 0) {
        curDishes.forEach((dish) => {
          ctx.save();
          // Plate / Dish base
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.beginPath();
          ctx.arc(dish.x, dish.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Dish Icon
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(dish.icon, dish.x, dish.y);

          // Bites Taglet
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.roundRect(dish.x - 22, dish.y + 13, 44, 12, 3);
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 8px monospace";
          ctx.fillText(`${dish.bitesLeft} left`, dish.x, dish.y + 19);

          // Rising Steam Curls
          const steamT = timeMs * 0.006 + dish.x;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dish.x, dish.y - 12);
          ctx.quadraticCurveTo(dish.x - 3, dish.y - 18, dish.x + Math.sin(steamT) * 3, dish.y - 24);
          ctx.stroke();
          ctx.restore();
        });
      }

      // ── Render Smart Chair Reservations & Seat Nametags ──
      const curReservations = chairReservationsRef.current;
      if (curReservations && curReservations.length > 0) {
        curReservations.forEach((res) => {
          ctx.save();
          const pulse = Math.sin(timeMs * 0.005 + res.chairIndex) * 0.25 + 0.65;
          ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(res.x - 12, res.y - 10, 24, 20);

          if (res.reservedForHandle) {
            ctx.fillStyle = "#09090b";
            ctx.beginPath();
            ctx.roundRect(res.x - 28, res.y - 24, 56, 14, 4);
            ctx.fill();
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "#e0f2fe";
            ctx.font = "bold 8px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`@${res.reservedForHandle.slice(0, 8)}`, res.x, res.y - 14);
          } else {
            ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
            ctx.beginPath();
            ctx.roundRect(res.x - 14, res.y - 20, 28, 12, 3);
            ctx.fill();
            ctx.fillStyle = "#94a3b8";
            ctx.font = "bold 7px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`#${res.chairIndex + 1}`, res.x, res.y - 11);
          }
          ctx.restore();
        });
      }

      // Decorated Christmas Holiday Tree in bottom-right corner (x: 1460, y: 435)
      // Layered pine boughs
      const treeLayers = [
        { y: 480, w: 50, h: 26 },
        { y: 456, w: 42, h: 24 },
        { y: 434, w: 32, h: 22 },
        { y: 414, w: 22, h: 20 },
      ];
      ctx.fillStyle = "#15803d";
      treeLayers.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(1460, l.y - l.h);
        ctx.lineTo(1460 - l.w / 2, l.y);
        ctx.lineTo(1460 + l.w / 2, l.y);
        ctx.closePath();
        ctx.fill();
      });

      // Animated multi-colored baubles
      const baubleColors = ["#ef4444", "#3b82f6", "#eab308", "#ec4899", "#a855f7"];
      for (let b = 0; b < 10; b++) {
        const bX = 1460 + Math.sin(b * 1.7) * (14 - (b * 1.1));
        const bY = 422 + b * 6.5;
        const bGlow = Math.sin(timeMs * 0.007 + b) > 0;
        ctx.fillStyle = bGlow ? baubleColors[b % baubleColors.length] : "#ffffff";
        ctx.beginPath();
        ctx.arc(bX, bY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Star Topper on Tree
      ctx.fillStyle = "#eab308";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐", 1460, 404);

      // Green planter boxes along top wall
      for (let px = 900; px < 1520; px += 75) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(px, 52, 60, 10);
        ctx.font = "12px sans-serif";
        ctx.fillText("🌿", px + 16, 58);
      }
      ctx.restore();

      // ── 4. OPEN SOCIAL PARTY & TABLE GAMES FLOOR ──
      ctx.save();
      ctx.fillStyle = vibe === "SUNNY_DAYLIGHT" ? "#292524" : "#18181b";
      ctx.fillRect(50, 275, 815, 245);
      ctx.restore();

      // ── 5. RETRO ARCADE LOUNGE FLOOR TAG (x: 320, y: 360) ──
      ctx.save();
      ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
      ctx.beginPath();
      ctx.roundRect(310, 360, 200, 110, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 63, 94, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🕹️ Retro Arcade Lounge", 410, 460);
      ctx.restore();

      // Interactive Station Objects
      INTERACTIVE_OBJECTS.forEach((obj) => {
        ctx.save();
        const { x, y, w, h, type, icon } = obj;
        if (type === "chair") {
          const isArcadeStool = obj.id.includes("arcade_stool");
          ctx.fillStyle = isArcadeStool ? "#312e81" : "#334155";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, isArcadeStool ? 16 : 8);
          ctx.fill();
          ctx.strokeStyle = isArcadeStool ? "#818cf8" : "#64748b";
          ctx.lineWidth = 2;
          ctx.stroke();
          if (isArcadeStool) {
            ctx.fillStyle = "#818cf8";
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (type === "whiteboard") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3.5;
          ctx.strokeRect(x, y, w, h);
        } else if (type === "piano") {
          ctx.fillStyle = "#09090b";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#ffffff";
          for (let k = 0; k < w - 10; k += 9) {
            ctx.fillRect(x + 5 + k, y + h - 18, 7, 14);
          }
        } else if (type === "drums") {
          ctx.fillStyle = "#18181b";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        } else if (type === "arcade") {
          // Retro arcade cabinet
          ctx.fillStyle = "#1e1b4b";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#818cf8";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Glowing Marquee
          ctx.fillStyle = "#06b6d4";
          ctx.fillRect(x + 4, y + 4, w - 8, 8);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 6px monospace";
          ctx.textAlign = "center";
          ctx.fillText("ARCADE", x + w / 2, y + 10);

          // CRT Screen (animated scanline glow)
          const screenGlow = Math.sin(performance.now() * 0.005) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(6, 182, 212, ${screenGlow})`;
          ctx.fillRect(x + 5, y + 14, w - 10, 16);

          // Controls & Joystick
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(x + 4, y + 32, w - 8, 10);
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(x + 12, y + 36, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#eab308";
          ctx.beginPath();
          ctx.arc(x + 22, y + 36, 1.5, 0, Math.PI * 2);
          ctx.arc(x + 28, y + 36, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === "coffee") {
          // Barista Espresso Counter
          ctx.fillStyle = "#451a03";
          ctx.beginPath();
          ctx.roundRect(x, y + 12, w, h - 12, 4);
          ctx.fill();
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Espresso Machine & Chrome Steam Tower
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 2, w - 12, 16, 3);
          ctx.fill();
          ctx.fillStyle = "#334155";
          ctx.fillRect(x + 10, y + 8, w - 20, 6);

          // Rising steam curls
          const sT = performance.now() * 0.004;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 14, y);
          ctx.quadraticCurveTo(x + 12, y - 4, x + 14 + Math.sin(sT) * 2, y - 8);
          ctx.stroke();
        } else if (type === "jukebox") {
          // Vintage Wurlitzer Arch Jukebox
          ctx.fillStyle = "#7f1d1d";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, [16, 16, 4, 4]);
          ctx.fill();
          ctx.strokeStyle = "#e11d48";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner grill
          ctx.fillStyle = "#18181b";
          ctx.beginPath();
          ctx.arc(x + w / 2, y + 20, 14, Math.PI, 0);
          ctx.fill();

          // Center vinyl record
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(x + w / 2, y + 24, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.arc(x + w / 2, y + 24, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === "podium") {
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 8, w - 8, h - 8, 4);
          ctx.fill();
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.font = "15px sans-serif";
        ctx.fillText(icon, x + w / 2 - 8, y - 8);
        ctx.restore();
      });

      // ── RENDER NUMBERED BANQUET & KEYNOTE ROUND TABLES (Image 1, 3, 4, 5 Fidelity) ──
      NUMBERED_TABLES.forEach((tbl) => {
        ctx.save();
        // Drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(tbl.x, tbl.y + 6, tbl.r + 4, tbl.r * 0.7 + 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6 Surrounding Circular Chairs
        for (let i = 0; i < tbl.cap; i++) {
          const angle = (i * Math.PI * 2) / tbl.cap;
          const chairX = tbl.x + Math.cos(angle) * (tbl.r + 14);
          const chairY = tbl.y + Math.sin(angle) * (tbl.r + 14);
          const chairId = `${tbl.id}_chair_${i + 1}`;
          const isSeatedHere = localAvatar.isSitting && localAvatar.sittingObjectId === chairId;

          // Chair seat
          ctx.fillStyle = isSeatedHere ? "#0f766e" : "#1e293b";
          ctx.beginPath();
          ctx.arc(chairX, chairY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#475569";
          ctx.lineWidth = isSeatedHere ? 2.5 : 1.5;
          ctx.stroke();

          // Center cushion dot
          ctx.fillStyle = isSeatedHere ? "#fef08a" : "#38bdf8";
          ctx.beginPath();
          ctx.arc(chairX, chairY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Table surface (warm golden wood / polished amber)
        const tableGrad = ctx.createRadialGradient(tbl.x - 8, tbl.y - 8, 4, tbl.x, tbl.y, tbl.r);
        tableGrad.addColorStop(0, "#fef08a");
        tableGrad.addColorStop(0.4, "#f59e0b");
        tableGrad.addColorStop(1, "#b45309");
        ctx.fillStyle = tableGrad;
        ctx.beginPath();
        ctx.arc(tbl.x, tbl.y, tbl.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Center Table Number Badge (Image 3 yellow round table fidelity)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(tbl.x, tbl.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.font = "900 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(tbl.num), tbl.x, tbl.y);

        // Center Floral or Snack Centerpiece
        ctx.font = "11px sans-serif";
        ctx.fillText("🪻", tbl.x, tbl.y - 20);

        ctx.restore();
      });


      // ── RENDER MUSIC JAM STUDIO CHAIRS & INSTRUMENT BENCHES ──
      MUSIC_JAM_CHAIRS.forEach((chair) => {
        ctx.save();
        const isSeatedHere = localAvatar.isSitting && localAvatar.sittingObjectId === chair.id;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(chair.x, chair.y + 6, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isSeatedHere) {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(chair.x, chair.y, 18, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (chair.id === "music_piano_bench") {
          // Grand Synthesizer Piano Bench (Leather padded long stool)
          ctx.fillStyle = isSeatedHere ? "#0f766e" : "#27272a";
          ctx.beginPath();
          ctx.roundRect(chair.x - 18, chair.y - 7, 36, 14, 4);
          ctx.fill();
          ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#f43f5e";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Buttons tufting
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(chair.x - 8, chair.y - 1, 2, 2);
          ctx.fillRect(chair.x + 6, chair.y - 1, 2, 2);
        } else if (chair.id === "music_drum_throne") {
          // Drum Throne (Round swivel stool)
          ctx.fillStyle = isSeatedHere ? "#0f766e" : "#18181b";
          ctx.beginPath();
          ctx.arc(chair.x, chair.y, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#a1a1aa";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(chair.x, chair.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Acoustic Jam Circle Chair
          ctx.fillStyle = isSeatedHere ? "#0f766e" : "#78350f";
          ctx.beginPath();
          ctx.roundRect(chair.x - 11, chair.y - 11, 22, 22, 5);
          ctx.fill();
          ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#b45309";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Teal cushion center
          ctx.fillStyle = isSeatedHere ? "#fef08a" : "#0284c7";
          ctx.beginPath();
          ctx.roundRect(chair.x - 7, chair.y - 7, 14, 14, 3);
          ctx.fill();
        }

        ctx.restore();
      });

      // ── RENDER 4 COURTYARD MARBLE FOUNTAIN BENCHES ──
      COURTYARD_BENCHES.forEach((bench) => {
        ctx.save();
        const isSeatedHere = localAvatar.isSitting && localAvatar.sittingObjectId === bench.id;

        // Drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        const isHoriz = bench.faceDirection === "up" || bench.faceDirection === "down";
        ctx.ellipse(bench.x, bench.y + 4, isHoriz ? 24 : 8, isHoriz ? 8 : 24, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isSeatedHere) {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(bench.x, bench.y, 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Garden bench wood planks
        ctx.fillStyle = isSeatedHere ? "#0f766e" : "#78350f";
        ctx.beginPath();
        if (isHoriz) {
          ctx.roundRect(bench.x - 22, bench.y - 9, 44, 18, 4);
        } else {
          ctx.roundRect(bench.x - 9, bench.y - 22, 18, 44, 4);
        }
        ctx.fill();
        ctx.strokeStyle = isSeatedHere ? "#f59e0b" : "#334155";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Bench Slats Detail
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1;
        if (isHoriz) {
          ctx.beginPath();
          ctx.moveTo(bench.x - 20, bench.y - 3);
          ctx.lineTo(bench.x + 20, bench.y - 3);
          ctx.moveTo(bench.x - 20, bench.y + 3);
          ctx.lineTo(bench.x + 20, bench.y + 3);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(bench.x - 3, bench.y - 20);
          ctx.lineTo(bench.x - 3, bench.y + 20);
          ctx.moveTo(bench.x + 3, bench.y - 20);
          ctx.lineTo(bench.x + 3, bench.y + 20);
          ctx.stroke();
        }

        ctx.restore();
      });

      // ── RENDER PLACED CUSTOM DECORATIONS (Build Mode Items) ──
      localDecorations.forEach((d) => {
        ctx.save();
        // Drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(d.x + d.w / 2, d.y + d.h - 4, d.w * 0.45, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Object frame
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(d.x, d.y, d.w, d.h, 8);
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon
        ctx.font = `${Math.min(d.w, d.h) * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.icon, d.x + d.w / 2, d.y + d.h / 2);

        // Nameplate tag on hover in decoration mode
        if (isDecorateMode) {
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 8px monospace";
          ctx.fillText(d.name.split(" ")[0], d.x + d.w / 2, d.y - 4);
        }
        ctx.restore();
      });

      // Ghost preview when placing in build mode
      if (isDecorateMode && selectedDeco && !isEraserMode) {
        ctx.save();
        const mX = mouseWorldPosRef.current.x - selectedDeco.w / 2;
        const mY = mouseWorldPosRef.current.y - selectedDeco.h / 2;

        ctx.globalAlpha = 0.65;
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(mX, mY, selectedDeco.w, selectedDeco.h, 8);
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.font = `${Math.min(selectedDeco.w, selectedDeco.h) * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(selectedDeco.icon, mX + selectedDeco.w / 2, mY + selectedDeco.h / 2);
        ctx.restore();
      }

      // Click-to-Move Target
      if (clickTargetRef.current) {
        ctx.save();
        const targetRadius = ((Date.now() - clickTargetRef.current.time) * 0.008 % 3) * 6 + 6;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(clickTargetRef.current.x, clickTargetRef.current.y, targetRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Proximity Hearing Radius
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(posX, posY, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── RENDER ALL AVATARS WITH ADVANCED GRAPHICS ──
      const allAvatars = [...remoteAvatars, localAvatar].sort((a, b) => a.y - b.y);

      allAvatars.forEach((av) => {
        const isSelf = av.uid === localAvatar.uid;
        const aX = isSelf ? posX : av.x;
        const aY = isSelf ? posY : av.y;
        const dir = isSelf ? currentDir : av.direction;
        const isSit = isSelf ? localAvatar.isSitting : av.isSitting;

        const cfg = av.avatarConfig;
        const skinTone = cfg?.skinTone || "#fed7aa";
        const hairStyle = cfg?.hairStyle || "short";
        const hairColor = cfg?.hairColor || "#fde047";
        const outfit = cfg?.outfit || "hoodie";
        const outfitColor = cfg?.outfitColor || av.hoodieColor || "#38bdf8";
        const accessory = cfg?.accessory || "none";
        const headwear = cfg?.headwear || "none";
        const aura = cfg?.aura || "none";
        const pet = cfg?.pet || "none";
        const isGhost = cfg?.isGhost || false;

        ctx.save();
        ctx.translate(aX, aY);

        if (isGhost) {
          ctx.globalAlpha = 0.5;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#38bdf8";
        }

        // Animated Particle Aura around avatar
        if (aura && aura !== "none") {
          const aTime = performance.now() * 0.003;
          for (let i = 0; i < 6; i++) {
            const angle = aTime + (i * Math.PI * 2) / 6;
            const aXpos = Math.cos(angle) * 22;
            const aYpos = Math.sin(angle) * 12 - 8;
            ctx.save();
            if (aura === "stardust") {
              ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#38bdf8";
              ctx.beginPath();
              ctx.arc(aXpos, aYpos, 2, 0, Math.PI * 2);
              ctx.fill();
            } else if (aura === "flame") {
              ctx.fillStyle = i % 2 === 0 ? "#f97316" : "#ef4444";
              ctx.beginPath();
              ctx.arc(aXpos, aYpos, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (aura === "electric") {
              ctx.fillStyle = "#38bdf8";
              ctx.fillRect(aXpos - 1.5, aYpos - 1.5, 3, 3);
            } else if (aura === "sakura") {
              ctx.fillStyle = "#fb7185";
              ctx.beginPath();
              ctx.ellipse(aXpos, aYpos, 3, 2, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }

        // Ground shadow
        const shadowGrad = ctx.createRadialGradient(0, 8, 2, 0, 8, 16);
        shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.5)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 8, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Proximity Audio Green Halo Ring (Exact match to Reference Images 1, 2, 3, 4, 5)
        ctx.save();
        const haloPulse = av.isSpeaking ? Math.sin(performance.now() * 0.01) * 3 + 22 : (isSit ? 20 : 18);
        ctx.strokeStyle = av.isSpeaking ? "#22c55e" : (isSit ? "rgba(34, 197, 94, 0.75)" : "rgba(56, 189, 248, 0.35)");
        ctx.lineWidth = av.isSpeaking ? 3 : 2;
        ctx.shadowColor = av.isSpeaking ? "#22c55e" : "#38bdf8";
        ctx.shadowBlur = av.isSpeaking ? 12 : (isSit ? 8 : 0);
        ctx.beginPath();
        ctx.arc(0, -14, haloPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const breathe = !isMoving ? Math.sin(performance.now() * 0.003) * 1 : 0;

        // Torso
        ctx.fillStyle = outfitColor;
        if (isSit) {
          ctx.beginPath();
          ctx.roundRect(-10, -16 + breathe, 20, 18, 5);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-11, -22 + breathe, 22, 22, 6);
          ctx.fill();

          const stride = isSelf && isMoving ? Math.sin(performance.now() * 0.016) * 4 : 0;
          ctx.fillStyle = outfit === "suit" ? "#0f172a" : "#1e293b";
          ctx.fillRect(-8, 0, 6, 8 + stride);
          ctx.fillRect(2, 0, 6, 8 - stride);
        }

        // Outfit accents
        if (outfit === "suit") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-2, -22 + breathe, 4, 6);
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(-1, -16 + breathe, 2, 8);
        } else if (outfit === "bomber") {
          ctx.fillStyle = "#d97706";
          ctx.fillRect(-1, -22 + breathe, 2, 20);
        }

        // Head & Hair
        if (hairStyle !== "bald") {
          ctx.fillStyle = hairColor;
          ctx.beginPath();
          ctx.arc(0, -27 + breathe, 11, 0, Math.PI * 2);
          ctx.fill();
        }

        // Face
        ctx.fillStyle = skinTone;
        ctx.beginPath();
        ctx.arc(0, -24 + breathe, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Hairstyles
        ctx.fillStyle = hairColor;
        if (hairStyle === "spiky") {
          ctx.beginPath();
          ctx.moveTo(-8, -32 + breathe);
          ctx.lineTo(-4, -38 + breathe);
          ctx.lineTo(0, -32 + breathe);
          ctx.lineTo(4, -38 + breathe);
          ctx.lineTo(8, -32 + breathe);
          ctx.fill();
        } else if (hairStyle === "afro") {
          ctx.beginPath();
          ctx.arc(0, -28 + breathe, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = skinTone;
          ctx.beginPath();
          ctx.arc(0, -24 + breathe, 7.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "beanie") {
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.roundRect(-9, -36 + breathe, 18, 12, 4);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, -38 + breathe, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "cap") {
          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.arc(0, -29 + breathe, 9, Math.PI, Math.PI * 2);
          ctx.fill();
          if (dir === "right") ctx.fillRect(2, -28 + breathe, 12, 3);
          else if (dir === "left") ctx.fillRect(-14, -28 + breathe, 12, 3);
          else ctx.fillRect(-8, -28 + breathe, 16, 3);
        }

        // Blinking eyes
        const blink = Math.sin(performance.now() * 0.002 + aX) > 0.98;
        ctx.fillStyle = "#0f172a";
        if (!blink) {
          if (dir === "down") {
            ctx.fillRect(-3, -24 + breathe, 2, 2);
            ctx.fillRect(2, -24 + breathe, 2, 2);
          } else if (dir === "left") {
            ctx.fillRect(-5, -24 + breathe, 2, 2);
          } else if (dir === "right") {
            ctx.fillRect(3, -24 + breathe, 2, 2);
          }
        } else {
          ctx.fillRect(-4, -23 + breathe, 3, 1);
          ctx.fillRect(2, -23 + breathe, 3, 1);
        }

        // Speaking animated mouth
        if (av.isSpeaking) {
          ctx.fillStyle = "#dc2626";
          const openMouth = Math.sin(performance.now() * 0.015) > 0;
          if (openMouth) {
            ctx.beginPath();
            ctx.arc(0, -20 + breathe, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Headwear
        if (headwear && headwear !== "none") {
          ctx.save();
          if (headwear === "crown") {
            ctx.fillStyle = "#eab308";
            ctx.beginPath();
            ctx.moveTo(-8, -36 + breathe);
            ctx.lineTo(-8, -42 + breathe);
            ctx.lineTo(-4, -38 + breathe);
            ctx.lineTo(0, -44 + breathe);
            ctx.lineTo(4, -38 + breathe);
            ctx.lineTo(8, -42 + breathe);
            ctx.lineTo(8, -36 + breathe);
            ctx.closePath();
            ctx.fill();
          } else if (headwear === "beret") {
            ctx.fillStyle = "#1e1b4b";
            ctx.beginPath();
            ctx.ellipse(2, -36 + breathe, 12, 5, -Math.PI / 10, 0, Math.PI * 2);
            ctx.fill();
          } else if (headwear === "cowboy") {
            ctx.fillStyle = "#78350f";
            ctx.beginPath();
            ctx.ellipse(0, -35 + breathe, 16, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(-7, -42 + breathe, 14, 8, 2);
            ctx.fill();
          } else if (headwear === "wizard") {
            ctx.fillStyle = "#4c1d95";
            ctx.beginPath();
            ctx.moveTo(-10, -35 + breathe);
            ctx.lineTo(0, -50 + breathe);
            ctx.lineTo(10, -35 + breathe);
            ctx.closePath();
            ctx.fill();
          } else if (headwear === "cyber_visor") {
            ctx.fillStyle = "#06b6d4";
            ctx.fillRect(-8, -26 + breathe, 16, 4);
          }
          ctx.restore();
        }

        // Accessories
        if (accessory === "glasses") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-5, -26 + breathe, 4, 3);
          ctx.strokeRect(1, -26 + breathe, 4, 3);
        } else if (accessory === "shades") {
          ctx.fillStyle = "#000000";
          ctx.fillRect(-6, -26 + breathe, 12, 4);
        } else if (accessory === "headphones") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -27 + breathe, 10, Math.PI, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(-11, -28 + breathe, 3, 8);
          ctx.fillRect(8, -28 + breathe, 3, 8);
        }

        // Pet
        if (pet !== "none") {
          const petBob = isMoving ? Math.sin(performance.now() * 0.02) * 2 : 0;
          const pX = dir === "left" ? 18 : -18;
          const pY = 2 + petBob;

          ctx.save();
          ctx.translate(pX, pY);
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.beginPath();
          ctx.ellipse(0, 4, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          if (pet === "dog") {
            ctx.fillStyle = "#d97706";
            ctx.beginPath();
            ctx.roundRect(-6, -6, 12, 8, 3);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(4, -8, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (pet === "cat") {
            ctx.fillStyle = "#71717a";
            ctx.beginPath();
            ctx.roundRect(-5, -5, 10, 7, 3);
            ctx.fill();
          } else if (pet === "drone") {
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(0, -10 + petBob, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 1;
            ctx.strokeRect(-8, -11 + petBob, 16, 2);
          } else if (pet === "duck") {
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(0, -4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.fillRect(3, -5, 3, 2);
          }
          ctx.restore();
        }

        // Raised Hand Badge (Gather Style)
        const isHandUp = isSelf ? !!localAvatar.isHandRaised : !!av.isHandRaised;
        if (isHandUp) {
          ctx.save();
          const handBob = Math.sin(performance.now() * 0.008) * 3;
          ctx.fillStyle = "#f59e0b";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#f59e0b";
          ctx.beginPath();
          ctx.arc(14, -38 + handBob, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✋", 14, -38 + handBob);
          ctx.restore();
        }

        // Steaming Coffee Mug in Hand (Gather Barista Amenity)
        const isHoldingCoffee = isSelf ? !!localAvatar.hasCoffee : !!av.hasCoffee;
        if (isHoldingCoffee) {
          ctx.save();
          const cX = dir === "left" ? -14 : 14;
          const cY = -12;
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.roundRect(cX - 4, cY - 4, 8, 8, 2);
          ctx.fill();
          ctx.strokeStyle = "#92400e";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cX + (dir === "left" ? -4 : 4), cY, 3, 0, Math.PI);
          ctx.stroke();

          // Steam wisps
          const sTime = performance.now() * 0.005;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cX - 1, cY - 5);
          ctx.quadraticCurveTo(cX - 3, cY - 9, cX - 1 + Math.sin(sTime) * 2, cY - 13);
          ctx.stroke();
          ctx.restore();
        }

        // Self Indicator Pointer
        if (isSelf) {
          ctx.fillStyle = isGhost ? "#818cf8" : "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-4, -42);
          ctx.lineTo(4, -42);
          ctx.lineTo(0, -36);
          ctx.closePath();
          ctx.fill();
        }

        // Status dot and Nameplate Tag
        const status = isSelf ? localAvatar.statusText : av.statusText;
        const isBusy = status?.includes("Busy");
        const isAway = status?.includes("Away");

        // Online Status Dot
        ctx.fillStyle = isBusy ? "#f59e0b" : isAway ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(-22, -47, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isSelf ? (isGhost ? "#a5b4fc" : "#38bdf8") : "#ffffff";
        ctx.fillText(isSelf ? `YOU (${av.handle})` : av.handle, 0, -44);

        if (status) {
          const isPlayingGame = status.includes("🎮");
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = isPlayingGame ? "#38bdf8" : isBusy ? "#f59e0b" : "#a1a1aa";
          ctx.fillText(status, 0, -54);

          // If avatar is actively playing an arcade game, render floating controller badge!
          if (isPlayingGame) {
            ctx.save();
            const gameBob = Math.sin(performance.now() * 0.008) * 3;
            ctx.fillStyle = "#0284c7";
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#38bdf8";
            ctx.beginPath();
            ctx.arc(-14, -40 + gameBob, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🎮", -14, -40 + gameBob);
            ctx.restore();
          }
        }

        // Speech Bubble
        const speech = isSelf ? activeSpeech : av.speechBubble?.text;
        if (speech) {
          ctx.save();
          ctx.font = "bold 10px sans-serif";
          const textW = ctx.measureText(speech).width;
          const bW = Math.max(48, textW + 16);
          const bH = 22;
          const bY = -70;

          ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-bW / 2, bY, bW, bH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(speech, 0, bY + 14);
          ctx.restore();
        }

        ctx.restore();
      });

      // ── RENDER FLOATING PHYSICS EMOTES ──
      floatingEmotesRef.current.forEach((em, idx) => {
        em.y += em.vy;
        em.alpha -= 0.015;
        ctx.save();
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.max(0, em.alpha);
        ctx.fillText(em.text, em.x, em.y);
        ctx.restore();
      });
      floatingEmotesRef.current = floatingEmotesRef.current.filter((em) => em.alpha > 0);

      // ── DYNAMIC LIGHTING PASS ──
      ctx.save();
      const playerLight = ctx.createRadialGradient(posX, posY, 10, posX, posY, 140);
      playerLight.addColorStop(0, "rgba(56, 189, 248, 0.12)");
      playerLight.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = playerLight;
      ctx.fillRect(posX - 140, posY - 140, 280, 280);

      const fountainLight = ctx.createRadialGradient(800, 590, 20, 800, 590, 180);
      fountainLight.addColorStop(0, "rgba(2, 132, 199, 0.16)");
      fountainLight.addColorStop(1, "rgba(2, 132, 199, 0)");
      ctx.fillStyle = fountainLight;
      ctx.fillRect(800 - 180, 590 - 180, 360, 360);
      ctx.restore();

      // ── Atmospheric Particles for All 8 Vibes ──
      particlesRef.current.forEach((p) => {
        ctx.save();
        if (vibe === "COZY_RAINY") {
          p.y += p.speed;
          p.x += 1.6;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 3, p.y + p.size);
          ctx.stroke();
        } else if (vibe === "HORROR_NIGHT") {
          // Floating purple/green phantom fog wisps
          p.y -= p.speed * 0.4;
          p.x += Math.sin(timeMs * 0.002 + p.y * 0.015) * 2;
          if (p.y < 0) {
            p.y = WORLD_HEIGHT;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.fillStyle = `rgba(192, 132, 252, ${p.alpha * 0.45})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (vibe === "PARTY_CLUB") {
          // Falling colorful confetti flakes
          p.y += p.speed * 0.8;
          p.x += Math.sin(timeMs * 0.004 + p.y) * 2.5;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          const confettiColors = ["#f43f5e", "#eab308", "#06b6d4", "#a855f7", "#22c55e"];
          ctx.fillStyle = confettiColors[Math.floor(p.size) % confettiColors.length];
          ctx.fillRect(p.x, p.y, p.size * 0.9, p.size * 0.5);
        } else if (vibe === "DINNER_GALA") {
          // Warm golden candlelight embers & motes
          p.y -= p.speed * 0.3;
          p.x += Math.sin(timeMs * 0.002 + p.x) * 1.2;
          if (p.y < 0) {
            p.y = WORLD_HEIGHT;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (vibe === "SUKOON_ZEN") {
          // Floating sakura petals & fireflies
          p.y += p.speed * 0.4;
          p.x += Math.cos(timeMs * 0.003 + p.y * 0.02) * 2;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.fillStyle = `rgba(244, 114, 182, ${p.alpha * 0.7})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.7, p.size * 0.4, Math.PI / 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (vibe === "SUNSET_LOFI") {
          p.y += p.speed * 0.5;
          p.x += Math.sin(timeMs * 0.002 + p.y * 0.01) * 1.5;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.fillStyle = `rgba(251, 113, 133, ${p.alpha})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (vibe === "SUNNY_DAYLIGHT") {
          p.y -= p.speed * 0.2;
          if (p.y < 0) p.y = WORLD_HEIGHT;
          ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // ── Dynamic Atmosphere Lighting & Decorative Overlays ──
      if (vibe === "HORROR_NIGHT") {
        ctx.save();
        // Eerie purple fog tint
        ctx.fillStyle = "rgba(45, 10, 60, 0.22)";
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Jack-o'-Lantern pumpkins with flickering yellow eyes
        const pumpkins = [
          { x: 260, y: 155 },
          { x: 640, y: 155 },
          { x: 1040, y: 310 },
          { x: 1360, y: 310 },
        ];
        pumpkins.forEach((pk) => {
          ctx.font = "20px sans-serif";
          ctx.fillText("🎃", pk.x, pk.y);
          // Glowing eye halo
          const eyePulse = Math.sin(timeMs * 0.01 + pk.x) * 0.2 + 0.3;
          ctx.fillStyle = `rgba(234, 179, 8, ${eyePulse})`;
          ctx.beginPath();
          ctx.arc(pk.x + 10, pk.y - 6, 8, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else if (vibe === "PARTY_CLUB") {
        ctx.save();
        // Sweeping Disco Lasers
        const laserTime = timeMs * 0.001;
        ctx.lineWidth = 2.5;
        // Pink laser
        ctx.strokeStyle = "rgba(236, 72, 153, 0.4)";
        ctx.beginPath();
        ctx.moveTo(800, 720);
        ctx.lineTo(800 + Math.cos(laserTime) * 600, 720 + Math.sin(laserTime) * 600);
        ctx.stroke();
        // Cyan laser
        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
        ctx.beginPath();
        ctx.moveTo(800, 720);
        ctx.lineTo(800 + Math.cos(-laserTime * 1.3) * 600, 720 + Math.sin(-laserTime * 1.3) * 600);
        ctx.stroke();

        // Strobe Floor Pulse
        const strobe = Math.sin(timeMs * 0.008) > 0.85;
        if (strobe) {
          ctx.fillStyle = "rgba(236, 72, 153, 0.08)";
          ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        }
        ctx.restore();
      } else if (vibe === "DINNER_GALA") {
        ctx.save();
        // Warm chandelier candlelight glow over banquet table
        const candleGlow = ctx.createRadialGradient(1205, 350, 10, 1205, 350, 240);
        candleGlow.addColorStop(0, "rgba(245, 158, 11, 0.28)");
        candleGlow.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = candleGlow;
        ctx.beginPath();
        ctx.arc(1205, 350, 240, 0, Math.PI * 2);
        ctx.fill();

        // Candles with flickering flames along table
        [1080, 1150, 1220, 1290, 1360].forEach((cx) => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(cx, 346, 4, 8);
          const fPulse = Math.sin(timeMs * 0.012 + cx) * 1.2;
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(cx + 2, 342, 3 + fPulse, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else if (vibe === "SUKOON_ZEN") {
        ctx.save();
        // Soft tranquil teal/emerald ambiance
        ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Lotus pads floating in the 3 fountains
        [1060, 1200, 1340].forEach((fx) => {
          ctx.font = "16px sans-serif";
          ctx.fillText("🪷", fx - 8, 172);
        });
        ctx.restore();
      }

      // ── UNIVERSAL DYNAMIC LIGHTING & WATER SHIMMER ──
      ctx.save();
      // Campfire firelight radial glow
      const campGlow = ctx.createRadialGradient(800, 150, 6, 800, 150, 140);
      const campFlicker = Math.sin(timeMs * 0.007) * 0.04 + 0.16;
      campGlow.addColorStop(0, `rgba(249, 115, 22, ${campFlicker})`);
      campGlow.addColorStop(0.4, `rgba(234, 179, 8, ${campFlicker * 0.5})`);
      campGlow.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = campGlow;
      ctx.beginPath();
      ctx.arc(800, 150, 140, 0, Math.PI * 2);
      ctx.fill();

      // Victorian streetlamp warm halos
      [{ x: 100, y: 120 }, { x: 820, y: 120 }].forEach((lamp) => {
        const lampGlow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 75);
        lampGlow.addColorStop(0, "rgba(254, 240, 138, 0.22)");
        lampGlow.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = lampGlow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 75, 0, Math.PI * 2);
        ctx.fill();
      });

      // Water ripples in 3 fountain basins
      [1060, 1200, 1340].forEach((fx, fIdx) => {
        const rippleR = ((timeMs * 0.02 + fIdx * 10) % 25) + 5;
        const rippleAlpha = Math.max(0, 1 - rippleR / 30) * 0.35;
        ctx.strokeStyle = `rgba(186, 230, 253, ${rippleAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(fx, 170, rippleR, rippleR * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      // ── CELEBRATION CONFETTI SHOWER ──
      if (celebrationConfettiRef.current.length > 0) {
        ctx.save();
        celebrationConfettiRef.current = celebrationConfettiRef.current.filter((c) => {
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.25; // gravity
          c.rot += c.vRot;
          c.life++;
          const progress = c.life / c.maxLife;
          const alpha = Math.max(0, 1 - progress);

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.fillStyle = c.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
          ctx.restore();

          return c.life < c.maxLife && c.y < WORLD_HEIGHT + 50;
        });
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    localAvatar,
    remoteAvatars,
    vibe,
    localDecorations,
    isDecorateMode,
    selectedDeco,
    isEraserMode,
    onMove,
    onZoneChange,
    onRugChange,
    isJoystickActive,
    activeSpeech,
    viewportDim,
    zoom,
  ]);

  // Touch Virtual Joystick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsJoystickActive(true);
    clickTargetRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      joystickVector.current = {
        x: dx / Math.max(1, dist),
        y: dy / Math.max(1, dist),
      };
    }
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
    joystickVector.current = { x: 0, y: 0 };
    setIsJoystickActive(false);
  };

  const isGhost = !!localAvatar.avatarConfig?.isGhost;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl select-none transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen border-none" : "h-[calc(100dvh-54px)] md:h-[680px] lg:h-[720px]"
      }`}
    >
      {/* 60 FPS HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        width={viewportDim.w}
        height={viewportDim.h}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onTouchStart={handleCanvasTouchStart}
        className="w-full h-full cursor-crosshair touch-none"
      />


      {/* TOP CENTER: Gather Proximity Attendees Floating Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-2 pointer-events-none flex justify-center">
        <ProximityAttendeesBar
          localAvatar={localAvatar}
          remoteAvatars={remoteAvatars}
          speakingUids={speakingUids}
          onWalkTo={(wx, wy) => {
            clickTargetRef.current = { x: wx, y: wy, time: Date.now() };
            spacesSfx.playFootstep();
          }}
          onSendWave={(targetHandle) => {
            triggerEmote("👋");
          }}
        />
      </div>

      {/* Nearby Interaction Prompt Banner */}
      {nearbyPrompt && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-amber-400 text-amber-300 font-mono text-xs font-bold shadow-2xl animate-in fade-in zoom-in-95 flex items-center gap-2 z-30 pointer-events-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>{nearbyPrompt}</span>
        </div>
      )}

      {/* Private Rug Alert Banner */}
      {activeRugPrompt && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-cyan-950/90 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-cyan-400 text-cyan-200 font-mono text-[11px] font-bold shadow-2xl animate-in fade-in flex items-center gap-2 z-30 pointer-events-auto">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeRugPrompt}</span>
        </div>
      )}

      {/* TOP LEFT: Minimalist Icon Dock */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        {/* Avatar Studio Icon */}
        <button
          onClick={onOpenAvatarStudio}
          className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-amber-400 hover:scale-105 transition-all cursor-pointer shadow-lg"
          title="Open Avatar Studio"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Space Decoration / Build Mode Icon */}
        <button
          onClick={() => {
            setIsDecorateMode(!isDecorateMode);
            spacesSfx.playKeyNote(2);
          }}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-lg flex items-center gap-1.5 ${
            isDecorateMode
              ? "border-cyan-400 bg-cyan-950/90 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white"
          }`}
          title={isDecorateMode ? "Exit Decorate Mode" : "Decorate Space (Add Furniture)"}
        >
          <Wrench className="w-4 h-4" />
          {isDecorateMode && <span className="text-[10px] font-mono font-bold">BUILD MODE</span>}
        </button>

        {/* Ghost Mode Toggle */}
        <button
          onClick={onToggleGhost}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-lg ${
            isGhost
              ? "border-indigo-400 bg-indigo-950/80 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
              : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white"
          }`}
          title="Ghost Mode [G] (Walk through walls)"
        >
          <Ghost className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white hover:scale-105 transition-all cursor-pointer shadow-lg"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>


      {/* BOTTOM DRAWER: SPACE DECORATION PALETTE (Build Mode) */}
      {isDecorateMode && (
        <div className="absolute bottom-16 left-4 right-4 max-w-2xl mx-auto z-40 bg-neutral-950/95 backdrop-blur-md p-3 rounded-3xl border border-cyan-500/40 shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>BUILD PALETTE:</span>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { id: "seating", icon: "🪑" },
                  { id: "plants", icon: "🪴" },
                  { id: "tech", icon: "💻" },
                  { id: "amenities", icon: "☕" },
                  { id: "lighting", icon: "💡" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveDecoCategory(cat.id);
                      setIsEraserMode(false);
                      spacesSfx.playKeyNote(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                      activeDecoCategory === cat.id && !isEraserMode
                        ? "bg-cyan-500 text-black font-bold"
                        : "text-neutral-400 hover:text-white bg-neutral-900"
                    }`}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Eraser Tool */}
              <button
                onClick={() => {
                  setIsEraserMode(!isEraserMode);
                  setSelectedDeco(null);
                  spacesSfx.playKeyNote(5);
                }}
                className={`p-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                  isEraserMode
                    ? "border-rose-400 bg-rose-950/80 text-rose-300 font-bold"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
                title="Eraser: Click any placed item to remove"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px]">ERASER</span>
              </button>

              <button
                onClick={() => setIsDecorateMode(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Placeable Items Swatches */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
            {isEraserMode ? (
              <div className="text-xs font-mono text-rose-300 py-1 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Eraser active: click any placed furniture item on the floor to remove it.</span>
              </div>
            ) : (
              DECORATION_CATALOG.filter((d) => d.category === activeDecoCategory).map((item) => {
                const isSelected = selectedDeco?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedDeco(item);
                      setIsEraserMode(false);
                      spacesSfx.playKeyNote(2);
                    }}
                    className={`px-3 py-1.5 rounded-2xl border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold scale-105 shadow-md"
                        : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px]">{item.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SEATED AT DINNER / PARTY TABLE FLOATING ACTION BAR */}
      {localAvatar.isSitting && (() => {
        const curSeat = ALL_WORLD_SEATS.find((c) => c.id === localAvatar.sittingObjectId);
        const seatName = curSeat?.name || "Seated in World";
        const tableName = curSeat?.tableName || "Interactive Space";
        const isPiano = curSeat?.id.includes("piano");
        const isDrums = curSeat?.id.includes("drum");
        const isCourtyard = curSeat?.id.includes("courtyard");

        return (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-neutral-950/95 border-2 border-amber-500/60 rounded-3xl px-4 py-2.5 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 max-w-[95vw] overflow-x-auto custom-scrollbar pointer-events-auto">
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-800 shrink-0">
              <span className="text-xl">
                {isPiano ? "🎹" : isDrums ? "🥁" : isCourtyard ? "⛲" : "🪑"}
              </span>
              <div>
                <div className="text-[11px] font-black uppercase text-amber-400 font-mono">
                  {seatName}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  {tableName}
                </div>
              </div>
            </div>

            {isPiano && (
              <button
                type="button"
                onClick={() => {
                  [1, 3, 5, 6, 8].forEach((note, i) => {
                    setTimeout(() => spacesSfx.playKeyNote(note), i * 150);
                  });
                  onSendSpeech("🎹 Playing live melodic arpeggios on the Grand Synthesizer Piano! ✨");
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shrink-0"
              >
                <span>🎹</span>
                <span>Play Live Arpeggio</span>
              </button>
            )}

            {isDrums && (
              <button
                type="button"
                onClick={() => {
                  [1, 2, 1, 2, 4].forEach((pad, i) => {
                    setTimeout(() => spacesSfx.playKeyNote(pad + 1), i * 110);
                  });
                  onSendSpeech("🥁 Laid down a heavy 4-pad drum roll beat! 💥");
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shrink-0"
              >
                <span>🥁</span>
                <span>Drum Solo</span>
              </button>
            )}

            {isCourtyard && (
              <button
                type="button"
                onClick={() => {
                  spacesSfx.playChampagneCork();
                  onSendSpeech("🪙 Tossed an Aura coin into the Echo Fountain! (+5 Aura) ✨");
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shrink-0"
              >
                <span>🪙</span>
                <span>Toss Fountain Coin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenUno?.()}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-red-600/30 shrink-0"
            >
              <span>🃏</span>
              <span>Play UNO</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPartyGames?.()}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/30 shrink-0"
            >
              <span>🎲</span>
              <span>Party Table Games</span>
            </button>

            <button
              type="button"
              onClick={() => {
                spacesSfx.playChampagneCork();
                onSendSpeech("🥂 Raised a toast to everyone in the room! Cheers! ✨");
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
            >
              <span>🥂</span>
              <span>Toast Room</span>
            </button>

            <button
              type="button"
              onClick={() => {
                spacesSfx.playSitPop();
                onSit(false);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-xs font-semibold transition cursor-pointer shrink-0"
              title="Stand Up"
            >
              <span>Stand Up 🚶</span>
            </button>
          </div>
        );
      })()}

      {/* FLOATING ACTION & CHAT BAR (Icon-First Gather Dock) */}
      <div className="absolute bottom-4 left-4 right-4 max-w-xl mx-auto z-30 flex items-center gap-1.5 pointer-events-auto">
        {/* Quick Reaction Emote Wheel Trigger */}
        <div className="relative">
          <button
            onClick={() => setEmotePickerOpen(!emotePickerOpen)}
            className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-neutral-300 hover:text-white hover:scale-105 transition-all shadow-xl cursor-pointer"
            title="Reaction Emotes"
          >
            <Smile className="w-4 h-4 text-amber-400" />
          </button>

          {/* Floating Emote Picker Popup */}
          {emotePickerOpen && (
            <div className="absolute bottom-12 left-0 bg-neutral-950/95 backdrop-blur-md p-2 rounded-2xl border border-neutral-800 shadow-2xl flex items-center gap-1.5 animate-in zoom-in-95">
              {EMOTE_REACTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => triggerEmote(em)}
                  className="p-1.5 rounded-xl hover:bg-neutral-800 hover:scale-125 transition-all text-lg cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hand Raise Toggle [H] */}
        <button
          type="button"
          onClick={onToggleHandRaise}
          className={`p-2.5 rounded-2xl border transition-all shadow-xl cursor-pointer ${
            localAvatar.isHandRaised
              ? "border-amber-400 bg-amber-950/90 text-amber-300 shadow-[0_0_12px_#f59e0b] scale-105"
              : "border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:text-amber-300"
          }`}
          title="Raise / Lower Hand [H]"
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Coffee Mug Toggle */}
        <button
          type="button"
          onClick={onToggleCoffee}
          className={`p-2.5 rounded-2xl border transition-all shadow-xl cursor-pointer ${
            localAvatar.hasCoffee
              ? "border-amber-600 bg-amber-950/90 text-amber-200 shadow-[0_0_12px_#b45309] scale-105"
              : "border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:text-amber-500"
          }`}
          title="Hold Warm Coffee"
        >
          <Coffee className="w-4 h-4" />
        </button>

        {/* Retro Space Arcade Launcher */}
        <button
          type="button"
          onClick={onOpenArcade}
          className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:text-cyan-400 hover:scale-105 transition-all shadow-xl cursor-pointer"
          title="Play Retro Space Arcade"
        >
          <Gamepad2 className="w-4 h-4" />
        </button>

        {/* Vinyl Jukebox Launcher */}
        <button
          type="button"
          onClick={onOpenJukebox}
          className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:text-rose-400 hover:scale-105 transition-all shadow-xl cursor-pointer"
          title="Spin Vinyl Jukebox"
        >
          <Disc3 className="w-4 h-4" />
        </button>

        {/* Whiteboard Launcher */}
        <button
          type="button"
          onClick={onOpenWhiteboard}
          className="p-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:text-sky-400 hover:scale-105 transition-all shadow-xl cursor-pointer"
          title="Open Whiteboard"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Chat input */}
        <form
          onSubmit={handleSendChat}
          className="flex-1 flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-neutral-800 shadow-2xl min-w-[120px]"
        >
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type message or click floor..."
            maxLength={60}
            className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-1.5 rounded-xl bg-white text-black font-black hover:bg-neutral-200 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* BOTTOM RIGHT: Gather Map Zoom Controls (+, -, Compass/re-center) */}
      <div className="hidden sm:flex absolute bottom-20 right-4 z-30 flex-col items-center bg-neutral-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-800 shadow-2xl space-y-1">
        <button
          type="button"
          onClick={() => {
            setZoom((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))));
            spacesSfx.playKeyNote(2);
          }}
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-neutral-400 select-none font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))));
            spacesSfx.playKeyNote(1);
          }}
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px w-4 bg-neutral-800 my-0.5" />
        <button
          type="button"
          onClick={() => {
            setZoom(1.0);
            cameraRef.current = { x: localAvatar.x, y: localAvatar.y };
            spacesSfx.playKeyNote(4);
          }}
          className="p-2 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800 transition-all cursor-pointer"
          title="Reset Zoom & Center on Avatar"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Touch Virtual Joystick */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="sm:hidden absolute inset-0 z-20 pointer-events-auto"
      >
        {isJoystickActive && (
          <div className="absolute bottom-16 left-8 w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div
              className="w-8 h-8 rounded-full bg-white shadow-lg transition-transform"
              style={{
                transform: `translate(${joystickVector.current.x * 24}px, ${
                  joystickVector.current.y * 24
                }px)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
