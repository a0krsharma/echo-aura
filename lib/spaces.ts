/**
 * lib/spaces.ts
 * ─────────────────────────────────────────────────────
 * Echo Spaces: 2D Spatial Living Space Metaverse System
 * Defines spaces, categories, vibes, avatar traits, private rugs,
 * interactive stations, and Firestore lifecycle persistence.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type SpaceCategory =
  | "OFFICE"
  | "LIBRARY"
  | "MUSIC"
  | "CONCERT"
  | "DEBATE"
  | "CAMPUS"
  | "ARCADE"
  | "CAFE"
  | "WEBINAR"
  | "GALA_DINNER"
  | "PIAZZA"
  | "CUSTOM";

export interface StageSpeaker {
  uid: string;
  name: string;
  roleTitle?: string;
  avatarUrl?: string;
  isSpeaking?: boolean;
  isPresenting?: boolean;
  screenShareActive?: boolean;
}

export interface EventQAQuestion {
  id: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  upvotes: number;
  hasUpvoted?: boolean;
  timestamp: number;
  isAnswered?: boolean;
}

export interface EventPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface EventPoll {
  id: string;
  question: string;
  options: EventPollOption[];
  totalVotes: number;
  userVotedId?: string;
  isClosed?: boolean;
}

export interface NumberedTable {
  id: string;
  number: number;
  label: string;
  x: number;
  y: number;
  radius: number;
  capacity: number;
  seatedHandles: string[];
}

export type SpaceVibe =
  | "MIDNIGHT_NEON"
  | "SUNNY_DAYLIGHT"
  | "COZY_RAINY"
  | "SUNSET_LOFI"
  | "HORROR_NIGHT"
  | "PARTY_CLUB"
  | "SUKOON_ZEN"
  | "DINNER_GALA";

export interface SpaceVibeDef {
  id: SpaceVibe;
  name: string;
  icon: string;
  description: string;
  accentColor: string;
  lightingOverlay: string;
}

export const SPACE_VIBES: Record<SpaceVibe, SpaceVibeDef> = {
  HORROR_NIGHT: {
    id: "HORROR_NIGHT",
    name: "Horror Night",
    icon: "🎃",
    description: "Eerie haunted fog, glowing jack-o'-lanterns & phantom wisps.",
    accentColor: "#a855f7",
    lightingOverlay: "rgba(30, 10, 45, 0.45)",
  },
  PARTY_CLUB: {
    id: "PARTY_CLUB",
    name: "Party Club & Rave",
    icon: "🪩",
    description: "Sweeping disco laser beams, neon strobe floor & bass party vibes.",
    accentColor: "#ec4899",
    lightingOverlay: "rgba(236, 72, 153, 0.15)",
  },
  DINNER_GALA: {
    id: "DINNER_GALA",
    name: "Candlelight Dinner Gala",
    icon: "🍷",
    description: "Warm candlelit banquet tables, fine dining ambiance & soft golden jazz.",
    accentColor: "#f59e0b",
    lightingOverlay: "rgba(245, 158, 11, 0.15)",
  },
  SUKOON_ZEN: {
    id: "SUKOON_ZEN",
    name: "Sukoon Zen Sanctuary",
    icon: "🍃",
    description: "Peaceful koi pond, floating lotus petals & calming meditation aura.",
    accentColor: "#10b981",
    lightingOverlay: "rgba(16, 185, 129, 0.12)",
  },
  MIDNIGHT_NEON: {
    id: "MIDNIGHT_NEON",
    name: "Midnight Cyberpunk",
    icon: "⚡",
    description: "Glowing cyan neon grid lines & midnight electric motes.",
    accentColor: "#06b6d4",
    lightingOverlay: "rgba(6, 182, 212, 0.08)",
  },
  SUNNY_DAYLIGHT: {
    id: "SUNNY_DAYLIGHT",
    name: "Sunny Daylight Atrium",
    icon: "☀️",
    description: "Crisp bright sunshine, sunbeams & lively coworking energy.",
    accentColor: "#facc15",
    lightingOverlay: "rgba(254, 240, 138, 0.08)",
  },
  COZY_RAINY: {
    id: "COZY_RAINY",
    name: "Cozy Lofi Rain",
    icon: "🌧️",
    description: "Gentle falling rain droplets, cozy indoor warmth & whisper sanctuary.",
    accentColor: "#38bdf8",
    lightingOverlay: "rgba(56, 189, 248, 0.1)",
  },
  SUNSET_LOFI: {
    id: "SUNSET_LOFI",
    name: "Golden Hour Sunset",
    icon: "🌅",
    description: "Warm amber dusk glow, floating dust particles & relaxed beats.",
    accentColor: "#f97316",
    lightingOverlay: "rgba(249, 115, 22, 0.12)",
  },
};

export type SpaceZoneId = "party" | "gamehub" | "study" | "gym" | "cafe" | "music" | "courtyard";

export interface SpaceZoneDef {
  id: SpaceZoneId;
  name: string;
  category: string;
  icon: string;
  color: string;
  bounds: { x: number; y: number; w: number; h: number };
  description: string;
  ambientSound?: string;
  broadcastPoint?: { x: number; y: number };
}

export interface PrivateRug {
  id: string;
  name: string;
  zoneId: SpaceZoneId;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  capacity: number;
}

export interface InteractiveObject {
  id: string;
  zoneId: SpaceZoneId;
  name: string;
  icon: string;
  type: "chair" | "whiteboard" | "piano" | "drums" | "gavel" | "pomodoro" | "podium" | "jukebox" | "fountain" | "coffee" | "arcade" | "treadmill" | "weights" | "coffeemachine" | "dj_deck" | "dance_floor" | "game_cab" | "bookshelf" | "zen_pond";
  x: number;
  y: number;
  w: number;
  h: number;
  prompt: string;
  data?: Record<string, any>;
}

export interface CollisionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AvatarConfig {
  skinTone: string; // Hex color
  hairStyle: "short" | "spiky" | "waves" | "ponytail" | "afro" | "beanie" | "cap" | "bald";
  hairColor: string; // Hex color
  outfit: "hoodie" | "suit" | "bomber" | "tshirt" | "robe" | "tuxedo" | "dress";
  outfitColor: string; // Hex color
  accessory: "none" | "glasses" | "headphones" | "shades" | "crown";
  headwear?: "none" | "crown" | "beret" | "cowboy" | "wizard" | "cyber_visor";
  aura?: "none" | "stardust" | "flame" | "electric" | "sakura";
  expression?: "smile" | "cool" | "wink" | "neutral";
  pet: "none" | "dog" | "cat" | "drone" | "duck";
  isGhost: boolean;
}

export interface CustomDecoration {
  id: string;
  catalogId: string;
  name: string;
  category: "seating" | "plants" | "tech" | "amenities" | "lighting";
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  placedBy: string;
  placedAt: number;
  color?: string;
  canSit?: boolean;
}

export interface DecorationItemDef {
  id: string;
  name: string;
  category: "seating" | "plants" | "tech" | "amenities" | "lighting";
  icon: string;
  w: number;
  h: number;
  color?: string;
  canSit?: boolean;
}

export const DECORATION_CATALOG: DecorationItemDef[] = [
  // 🪑 Seating
  { id: "chair_mesh", name: "Ergo Mesh Chair", category: "seating", icon: "🪑", w: 36, h: 36, canSit: true },
  { id: "sofa_velvet", name: "Velvet Loveseat", category: "seating", icon: "🛋️", w: 56, h: 38, canSit: true },
  { id: "bean_bag", name: "Cozy Beanbag", category: "seating", icon: "🟣", w: 38, h: 38, canSit: true },
  { id: "park_bench", name: "Park Wood Bench", category: "seating", icon: "🪵", w: 60, h: 32, canSit: true },

  // 🪴 Plants
  { id: "plant_monstera", name: "Monstera Deliciosa", category: "plants", icon: "🪴", w: 36, h: 40 },
  { id: "plant_bonsai", name: "Sakura Bonsai", category: "plants", icon: "🌸", w: 32, h: 34 },
  { id: "plant_palm", name: "Golden Palm", category: "plants", icon: "🌴", w: 40, h: 48 },
  { id: "plant_fig", name: "Fiddle-Leaf Fig", category: "plants", icon: "🌳", w: 38, h: 46 },

  // 💻 Tech & Desks
  { id: "tech_dual_monitor", name: "Dual Battlestation", category: "tech", icon: "🖥️", w: 54, h: 38 },
  { id: "tech_holoprojector", name: "Holo Projector", category: "tech", icon: "🛸", w: 36, h: 36 },
  { id: "tech_server_rack", name: "Server Rack", category: "tech", icon: "🗄️", w: 38, h: 46 },
  { id: "tech_standing_desk", name: "Standing Laptop Desk", category: "tech", icon: "💻", w: 48, h: 36 },

  // ☕ Amenities & Fun
  { id: "amenity_coffee", name: "Espresso Barista", category: "amenities", icon: "☕", w: 38, h: 36 },
  { id: "amenity_arcade", name: "Retro Arcade Cab", category: "amenities", icon: "🕹️", w: 36, h: 44 },
  { id: "amenity_firepit", name: "Campfire Firepit", category: "amenities", icon: "🔥", w: 44, h: 44 },
  { id: "amenity_vinyl", name: "Vinyl Turntable", category: "amenities", icon: "📻", w: 36, h: 36 },

  // 💡 Lighting
  { id: "light_streetlamp", name: "Ornate Streetlamp", category: "lighting", icon: "🏮", w: 30, h: 48 },
  { id: "light_neon_tube", name: "Cyan Neon Strip", category: "lighting", icon: "💡", w: 36, h: 22 },
  { id: "light_lava_lamp", name: "Lava Lamp", category: "lighting", icon: "🧪", w: 26, h: 36 },
];

export interface SpatialAvatar {
  uid: string;
  handle: string;
  avatarUrl?: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  direction: "down" | "up" | "left" | "right";
  isMoving: boolean;
  isSitting?: boolean;
  sittingObjectId?: string;
  isDancing?: boolean;
  danceType?: string;
  activeZone: SpaceZoneId;
  activeRugId?: string | null;
  statusText?: string;
  hoodieColor: string;
  avatarConfig?: AvatarConfig;
  isSpeaking: boolean;
  isHandRaised?: boolean;
  hasCoffee?: boolean;
  speechBubble?: { text: string; expiresAt: number };
  lastUpdated: number;
}

export interface SpaceDoc {
  id: string;
  name: string;
  description: string;
  category: SpaceCategory;
  vibe: SpaceVibe;
  hostUid: string;
  hostHandle: string;
  hostAvatar?: string;
  participantCount: number;
  maxParticipants: number;
  isPublic: boolean;
  createdAt: number;
  expiresAt: number | null; // Timestamp ms, null for persistent
  whiteboardNotes?: string;
  whiteboardDrawings?: string; // Serialized drawing JSON
  announcement?: { text: string; expiresAt: number } | null;
  decorations?: CustomDecoration[];
  addons?: string[];
  purposeTags?: string[];
  floorPlanType?: "keynote_hall" | "fireside_lodge" | "ballroom" | "piazza_cafe" | "campus" | "rooftop";
  liveStageStatus?: string;
  activeStageSpeakers?: StageSpeaker[];
  featuredBadge?: string;
  tableCount?: number;
  activeTableCount?: number;
  coverImage?: string;
  spotifySyncState?: SpaceSpotifySyncState | null;
}

export interface SpaceSpotifySyncState {
  trackId: string;
  trackUri: string;
  trackName: string;
  artistName: string;
  albumArt?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  startedAt: number;
  djHandle: string;
}

// ── WORLD MAP DIMENSIONS ──
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

// ── SPACE ZONES (World-Class Themed Zones) ──
export const SPACES_ZONES: Record<SpaceZoneId, SpaceZoneDef> = {
  courtyard: {
    id: "courtyard",
    name: "Central Plaza",
    category: "COMMUNITY",
    icon: "⛲",
    color: "#14b8a6",
    bounds: { x: 0, y: 0, w: 1600, h: 1200 },
    description: "Open plaza with fountain, tables & general hangout.",
  },
  party: {
    id: "party",
    name: "🪩 Party Floor",
    category: "PARTY & MUSIC",
    icon: "🪩",
    color: "#ec4899",
    bounds: { x: 50, y: 50, w: 500, h: 380 },
    description: "DJ booth, laser lights, dance floor & Spotify co-listen.",
  },
  gamehub: {
    id: "gamehub",
    name: "🎮 Game Hub",
    category: "GAMES & ARCADE",
    icon: "🎮",
    color: "#06b6d4",
    bounds: { x: 600, y: 50, w: 450, h: 380 },
    description: "Ludo, UNO, Spin the Bottle, RPS & retro arcade cabs.",
  },
  study: {
    id: "study",
    name: "📚 Study Library",
    category: "FOCUS & LEARNING",
    icon: "📚",
    color: "#f59e0b",
    bounds: { x: 1100, y: 50, w: 460, h: 380 },
    description: "Pomodoro timer, whiteboard, quiet focus & book nooks.",
  },
  gym: {
    id: "gym",
    name: "🏋️ Gym & Fitness",
    category: "FITNESS",
    icon: "🏋️",
    color: "#10b981",
    bounds: { x: 50, y: 490, w: 450, h: 360 },
    description: "Workout challenges, treadmill, weights & leaderboard.",
  },
  cafe: {
    id: "cafe",
    name: "☕ Sukoon Café",
    category: "CHILL & LOUNGE",
    icon: "☕",
    color: "#8b5cf6",
    bounds: { x: 560, y: 490, w: 480, h: 360 },
    description: "Lofi music, slow chat, barista coffee & cozy vibes.",
  },
  music: {
    id: "music",
    name: "🎵 Music Studio",
    category: "CREATIVE & AUDIO",
    icon: "🎵",
    color: "#f43f5e",
    bounds: { x: 1100, y: 490, w: 460, h: 360 },
    description: "Live piano synth, drum machine & vinyl jukebox.",
  },
};


// ── PRIVATE CONVERSATION RUGS ──
export const PRIVATE_RUGS: PrivateRug[] = [
  {
    id: "rug_music_greenroom",
    name: "Backstage Band Lounge",
    zoneId: "music",
    x: 1130,
    y: 730,
    w: 130,
    h: 100,
    color: "#be123c",
    capacity: 4,
  },
  {
    id: "rug_study_quiet",
    name: "Silent Study Corner",
    zoneId: "study",
    x: 1120,
    y: 70,
    w: 140,
    h: 110,
    color: "#d97706",
    capacity: 4,
  },
  {
    id: "rug_cafe_lounge",
    name: "Café Lounge Corner",
    zoneId: "cafe",
    x: 580,
    y: 510,
    w: 130,
    h: 100,
    color: "#7c3aed",
    capacity: 6,
  },
  {
    id: "rug_gym_cooldown",
    name: "Cooldown Stretch Zone",
    zoneId: "gym",
    x: 70,
    y: 700,
    w: 120,
    h: 100,
    color: "#059669",
    capacity: 4,
  },
];

// ── INTERACTIVE OBJECTS ──
export const INTERACTIVE_OBJECTS: InteractiveObject[] = [
  // 🪩 Party Floor
  {
    id: "party_dj",
    zoneId: "party",
    name: "DJ Booth",
    icon: "🎛️",
    type: "dj_deck",
    x: 80,
    y: 80,
    w: 90,
    h: 60,
    prompt: "Press [E] to Open Party Music & Spotify",
  },
  {
    id: "party_dance",
    zoneId: "party",
    name: "Dance Floor",
    icon: "💃",
    type: "dance_floor",
    x: 240,
    y: 200,
    w: 120,
    h: 120,
    prompt: "Press [E] to Dance! 🕺",
  },
  // 🎮 Game Hub
  {
    id: "gamehub_cab1",
    zoneId: "gamehub",
    name: "Ludo & UNO Table",
    icon: "🎲",
    type: "game_cab",
    x: 640,
    y: 100,
    w: 80,
    h: 70,
    prompt: "Press [E] to Open Game Hub",
  },
  {
    id: "gamehub_cab2",
    zoneId: "gamehub",
    name: "Retro Arcade Cab",
    icon: "🕹️",
    type: "arcade",
    x: 780,
    y: 100,
    w: 70,
    h: 70,
    prompt: "Press [E] to Play Arcade Games",
  },
  // 📚 Study Library
  {
    id: "study_whiteboard",
    zoneId: "study",
    name: "Collaboration Whiteboard",
    icon: "📋",
    type: "whiteboard",
    x: 1140,
    y: 80,
    w: 80,
    h: 60,
    prompt: "Press [E] to Open Whiteboard",
  },
  {
    id: "study_pomodoro",
    zoneId: "study",
    name: "Pomodoro Focus Timer",
    icon: "⏱️",
    type: "pomodoro",
    x: 1280,
    y: 80,
    w: 60,
    h: 60,
    prompt: "Press [E] to Start 25-min Focus Session",
  },
  {
    id: "study_bookshelf",
    zoneId: "study",
    name: "Reading Nook",
    icon: "📚",
    type: "bookshelf",
    x: 1420,
    y: 100,
    w: 60,
    h: 70,
    prompt: "Press [E] to Browse Reading List",
  },
  // 🏋️ Gym
  {
    id: "gym_treadmill",
    zoneId: "gym",
    name: "Treadmill Challenge",
    icon: "🏃",
    type: "treadmill",
    x: 100,
    y: 560,
    w: 80,
    h: 60,
    prompt: "Press [E] to Start Workout Challenge",
  },
  {
    id: "gym_weights",
    zoneId: "gym",
    name: "Weight Station",
    icon: "🏋️",
    type: "weights",
    x: 260,
    y: 560,
    w: 80,
    h: 60,
    prompt: "Press [E] to Start Strength Challenge",
  },
  // ☕ Sukoon Café
  {
    id: "cafe_coffee",
    zoneId: "cafe",
    name: "Barista Coffee Bar",
    icon: "☕",
    type: "coffeemachine",
    x: 620,
    y: 550,
    w: 70,
    h: 60,
    prompt: "Press [E] to Brew Coffee ☕",
  },
  {
    id: "cafe_zen",
    zoneId: "cafe",
    name: "Zen Koi Pond",
    icon: "🐟",
    type: "zen_pond",
    x: 780,
    y: 560,
    w: 80,
    h: 80,
    prompt: "Press [E] to Relax at the Koi Pond",
  },
  // 🎵 Music Studio
  {
    id: "music_piano",
    zoneId: "music",
    name: "Grand Synthesizer Piano",
    icon: "🎹",
    type: "piano",
    x: 1160,
    y: 560,
    w: 90,
    h: 56,
    prompt: "Press [E] to Play Grand Piano (Keys 1-8)",
  },
  {
    id: "music_drums",
    zoneId: "music",
    name: "4-Pad Drum Machine",
    icon: "🥁",
    type: "drums",
    x: 1310,
    y: 560,
    w: 70,
    h: 50,
    prompt: "Press [E] to Jam on Drum Machine",
  },
  {
    id: "music_jukebox",
    zoneId: "music",
    name: "Vintage Vinyl Jukebox",
    icon: "📻",
    type: "jukebox",
    x: 1430,
    y: 570,
    w: 50,
    h: 50,
    prompt: "Press [E] to Spin Jukebox Radio",
  },
  // ⛲ Central Plaza Fountain
  {
    id: "courtyard_fountain",
    zoneId: "courtyard",
    name: "Echo Marble Fountain",
    icon: "⛲",
    type: "fountain",
    x: 770,
    y: 920,
    w: 60,
    h: 60,
    prompt: "Press [E] to Toss Aura Coin (+5 Aura)",
  },
];

// ── ROOM DOORWAYS ──
export interface SpaceDoorway {
  zoneId: SpaceZoneId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: "horizontal" | "vertical";
  spawnInside: { x: number; y: number };
  spawnOutside: { x: number; y: number };
}

export const SPACE_DOORWAYS: SpaceDoorway[] = [];

// ── COLLISION WALLS (Outer Boundary Only — zones are open floor) ──
export const COLLISION_BOXES: CollisionBox[] = [
  // Outer map boundary walls
  { x: 0, y: 0, w: WORLD_WIDTH, h: 20 },
  { x: 0, y: WORLD_HEIGHT - 20, w: WORLD_WIDTH, h: 20 },
  { x: 0, y: 0, w: 20, h: WORLD_HEIGHT },
  { x: WORLD_WIDTH - 20, y: 0, w: 20, h: WORLD_HEIGHT },
];


// Zone check order: specific zones first, courtyard (catch-all) last
const ZONE_CHECK_ORDER: SpaceZoneId[] = ["party", "gamehub", "study", "gym", "cafe", "music", "courtyard"];

export function getZoneAtCoordinates(x: number, y: number): SpaceZoneId {
  for (const id of ZONE_CHECK_ORDER) {
    const zone = SPACES_ZONES[id];
    if (!zone) continue;
    const { bounds } = zone;
    if (
      x >= bounds.x &&
      x <= bounds.x + bounds.w &&
      y >= bounds.y &&
      y <= bounds.y + bounds.h
    ) {
      return id;
    }
  }
  return "courtyard";
}

export function getPrivateRugAtCoordinates(x: number, y: number): PrivateRug | null {
  for (const rug of PRIVATE_RUGS) {
    if (x >= rug.x && x <= rug.x + rug.w && y >= rug.y && y <= rug.y + rug.h) {
      return rug;
    }
  }
  return null;
}

export function checkCollision(x: number, y: number, radius = 10): boolean {
  for (const box of COLLISION_BOXES) {
    if (
      x + radius > box.x &&
      x - radius < box.x + box.w &&
      y + radius > box.y &&
      y - radius < box.y + box.h
    ) {
      return true;
    }
  }
  return false;
}

export function getNearbyInteractiveObject(
  x: number,
  y: number,
  reachDist = 75
): InteractiveObject | null {
  for (const obj of INTERACTIVE_OBJECTS) {
    const centerX = obj.x + obj.w / 2;
    const centerY = obj.y + obj.h / 2;
    const dist = Math.hypot(x - centerX, y - centerY);
    if (dist <= reachDist) {
      return obj;
    }
  }
  return null;
}

/// ── DEFAULT SEED SPACES (Empty: Real Online Live Spaces Only) ──
export const DEFAULT_SPACES: SpaceDoc[] = [];

// ── REAL LIVE PRESENCE (No Fake Ambient Bots) ──
export const DEFAULT_AMBIENT_BOTS: SpatialAvatar[] = [];

// ── FIRESTORE & LOCAL FALLBACK PERSISTENCE METHODS ──
const SPACES_COLLECTION = "spaces";
const LOCAL_SPACES_KEY = "echo_local_spaces_cache";

const KNOWN_MOCK_SPACE_IDS = new Set([
  "igniting_creativity_keynote",
  "abhishek_bday_bash",
  "holiday_fireside_lodge",
  "championx_townhall",
  "central_piazza_cafe",
  "genesis_campus",
  "virtual_office_hq",
  "lofi_study_sanctuary",
  "synthwave_jam_room",
  "town_hall_clash",
]);

export function isUnusedOrMockSpace(s: Partial<SpaceDoc>): boolean {
  if (!s || !s.id) return true;
  return KNOWN_MOCK_SPACE_IDS.has(s.id);
}

function getLocalSpacesCache(): SpaceDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_SPACES_KEY);
    if (!raw) return [];
    const parsed: SpaceDoc[] = JSON.parse(raw);
    // Automatically purge old mock/demo and unused preset spaces from client cache
    const cleaned = parsed.filter((s) => s && s.id && !isUnusedOrMockSpace(s));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(LOCAL_SPACES_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalSpace(space: SpaceDoc) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalSpacesCache().filter((s) => s.id !== space.id);
    existing.unshift(space);
    localStorage.setItem(LOCAL_SPACES_KEY, JSON.stringify(existing.slice(0, 30)));
  } catch {}
}

export async function createSpaceDoc(space: Omit<SpaceDoc, "id">): Promise<string> {
  const generatedId = `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newSpace: SpaceDoc = {
    ...space,
    id: generatedId,
  };

  // Always save locally first so user can enter immediately
  saveLocalSpace(newSpace);

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, SPACES_COLLECTION, generatedId);
    await setDoc(docRef, newSpace);
    return docRef.id;
  } catch (err: any) {
    if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
      console.info("[createSpaceDoc] Guest mode: space stored in local storage cache.");
    } else {
      console.warn("[createSpaceDoc] Firestore write skipped, using local space cache:", err);
    }
    return generatedId;
  }
}

export function subscribeToPublicSpaces(callback: (spaces: SpaceDoc[]) => void): () => void {
  const localSpaces = getLocalSpacesCache().filter((s) => !isUnusedOrMockSpace(s));
  callback(localSpaces);

  try {
    const db = getFirebaseDb();
    const q = query(collection(db, SPACES_COLLECTION), limit(60));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const firestoreDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SpaceDoc[];

        // Filter expired and mock spaces (read-only filtering, no destructive deletes)
        const valid = firestoreDocs.filter((s) => {
          if (!s.name) return false;
          if (isUnusedOrMockSpace(s)) return false;
          if (s.expiresAt && s.expiresAt < now) return false;
          return true;
        });

        const seenIds = new Set<string>();
        const combined: SpaceDoc[] = [];

        [...getLocalSpacesCache(), ...valid].forEach((s) => {
          if (!seenIds.has(s.id) && !isUnusedOrMockSpace(s)) {
            seenIds.add(s.id);
            combined.push(s);
          }
        });

        callback(combined);
      },
      (err: any) => {
        if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
          // Clean guest mode fallback
        } else {
          console.warn("[subscribeToPublicSpaces] Using local spaces fallback:", err?.message || err);
        }
        callback(localSpaces);
      }
    );

    return unsub;
  } catch (err) {
    return () => {};
  }
}

export async function getSpaceDoc(spaceId: string): Promise<SpaceDoc | null> {
  // 1. Check default seed spaces
  const defaultFound = DEFAULT_SPACES.find((s) => s.id === spaceId);
  if (defaultFound) return defaultFound;

  // 2. Check local spaces cache
  const localSpaces = getLocalSpacesCache();
  const localFound = localSpaces.find((s) => s.id === spaceId);
  if (localFound) return localFound;

  // 3. Query Firestore
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, SPACES_COLLECTION, spaceId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as SpaceDoc;
      saveLocalSpace(data);
      return data;
    }
  } catch (err) {
    // Falls back to local/default
  }

  return null;
}

export async function updateSpaceDoc(spaceId: string, updates: Partial<SpaceDoc>): Promise<void> {
  // Update local cache
  if (typeof window !== "undefined") {
    try {
      const local = getLocalSpacesCache();
      const idx = local.findIndex((s) => s.id === spaceId);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates };
        localStorage.setItem(LOCAL_SPACES_KEY, JSON.stringify(local));
      }
    } catch {}
  }

  try {
    const db = getFirebaseDb();
    // Using setDoc with merge:true ensures default and new spaces exist in Firestore
    await setDoc(doc(db, SPACES_COLLECTION, spaceId), updates, { merge: true });
  } catch (err: any) {
    if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
      // Clean guest mode fallback
    } else {
      console.warn("[updateSpaceDoc] Firestore update skipped, cached locally:", err);
    }
  }
}

export async function deleteSpaceDoc(spaceId: string): Promise<void> {
  // 1. Instantly purge from local storage cache
  if (typeof window !== "undefined") {
    try {
      const local = getLocalSpacesCache();
      const filtered = local.filter((s) => s.id !== spaceId);
      localStorage.setItem(LOCAL_SPACES_KEY, JSON.stringify(filtered));
    } catch {}
  }

  // 2. Delete from Firestore
  try {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, SPACES_COLLECTION, spaceId));
  } catch (err) {
    console.warn("[deleteSpaceDoc] Error deleting space:", err);
  }
}

export function subscribeToSpaceDoc(
  spaceId: string,
  callback: (space: SpaceDoc | null) => void
): () => void {
  const getFallback = () => getLocalSpacesCache().find((s) => s.id === spaceId) || null;

  try {
    const db = getFirebaseDb();
    const unsub = onSnapshot(
      doc(db, SPACES_COLLECTION, spaceId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as SpaceDoc;
          callback(data);
        } else {
          callback(getFallback());
        }
      },
      (err) => {
        console.warn("[subscribeToSpaceDoc] Live snapshot fallback to cache:", err);
        callback(getFallback());
      }
    );
    return unsub;
  } catch (err) {
    callback(getFallback());
    return () => {};
  }
}

// ── REAL-TIME PARTICIPANT SPATIAL PRESENCE ────────────────────

export function subscribeToSpaceParticipants(
  spaceId: string,
  callback: (participants: SpatialAvatar[]) => void
): () => void {
  if (!spaceId) return () => {};
  try {
    const db = getFirebaseDb();
    const participantsCol = collection(db, SPACES_COLLECTION, spaceId, "participants");
    const unsub = onSnapshot(
      participantsCol,
      (snap) => {
        const now = Date.now();
        const active: SpatialAvatar[] = [];
        snap.docs.forEach((d) => {
          const data = d.data() as SpatialAvatar;
          // Disregard heartbeats older than 30s (user closed tab / disconnected)
          if (data && (!data.lastUpdated || now - data.lastUpdated < 30000)) {
            active.push({ ...data, uid: d.id });
          }
        });
        callback(active);
      },
      (err) => {
        console.warn("[subscribeToSpaceParticipants] Snapshot error:", err);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("[subscribeToSpaceParticipants] Setup error:", err);
    return () => {};
  }
}

export async function updateSpaceParticipant(
  spaceId: string,
  avatar: SpatialAvatar
): Promise<void> {
  if (!spaceId || !avatar?.uid) return;
  try {
    const db = getFirebaseDb();
    const partRef = doc(db, SPACES_COLLECTION, spaceId, "participants", avatar.uid);
    // Strip undefined fields to ensure clean Firestore serialization
    const cleanAvatar = JSON.parse(JSON.stringify(avatar));
    await setDoc(partRef, cleanAvatar, { merge: true });
  } catch (err) {
    // Silent fallback
  }
}

export async function removeSpaceParticipant(
  spaceId: string,
  uid: string
): Promise<void> {
  if (!spaceId || !uid) return;
  try {
    const db = getFirebaseDb();
    const partRef = doc(db, SPACES_COLLECTION, spaceId, "participants", uid);
    await deleteDoc(partRef);
  } catch (err) {
    // Silent fallback
  }
}

// ── REAL-TIME PARTY TABLE GAME SYNC ──────────────────────────

export interface SpaceTableGameLiveState {
  activeTab: "ludo" | "bottle" | "rps" | "antakshari" | "raja_mantri" | "uno";
  isOpen: boolean;
  hostUid: string;
  hostName: string;
  updatedAt: number;
  lastActionText?: string;
  // Ludo sync
  ludoCurrentTurn?: "red" | "green" | "yellow" | "blue";
  ludoDiceValue?: number;
  ludoTurnTimer?: number;
  // Bottle sync
  bottleAngle?: number;
  isSpinningBottle?: boolean;
  bottleTargetName?: string;
  bottlePromptType?: "truth" | "dare" | null;
  bottlePromptText?: string;
  // Antakshari sync
  antakshariLetter?: string;
  antakshariChain?: Array<{ singer: string; song: string; letter: string; nextLetter: string }>;
  // Raja Mantri sync
  royalChits?: Array<"raja" | "mantri" | "chor" | "sipahi">;
  chitsRevealed?: boolean;
  roundResultText?: string | null;
  royalScores?: Record<string, number>;
  bluffToast?: { speaker: string; text: string } | null;
  // Seated players mapping
  seatedPlayers?: Array<{ id: string; name: string; avatar: string; isBot: boolean; position: string; color: string }>;
}

export function subscribeToSpaceTableGame(
  spaceId: string,
  callback: (gameState: SpaceTableGameLiveState | null) => void
): () => void {
  if (!spaceId) return () => {};
  try {
    const db = getFirebaseDb();
    const gameDocRef = doc(db, SPACES_COLLECTION, spaceId, "tableGame", "live");
    const unsub = onSnapshot(
      gameDocRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as SpaceTableGameLiveState);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn("[subscribeToSpaceTableGame] Error:", err);
      }
    );
    return unsub;
  } catch (err) {
    return () => {};
  }
}

export async function updateSpaceTableGame(
  spaceId: string,
  updates: Partial<SpaceTableGameLiveState>
): Promise<void> {
  if (!spaceId) return;
  try {
    const db = getFirebaseDb();
    const gameDocRef = doc(db, SPACES_COLLECTION, spaceId, "tableGame", "live");
    const cleanUpdates = JSON.parse(JSON.stringify({
      ...updates,
      updatedAt: Date.now(),
    }));
    await setDoc(gameDocRef, cleanUpdates, { merge: true });
  } catch (err) {
    // Silent fallback
  }
}

