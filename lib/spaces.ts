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

export type SpaceZoneId = "courtyard";

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
  type: "chair" | "whiteboard" | "piano" | "drums" | "gavel" | "pomodoro" | "podium" | "jukebox" | "fountain" | "coffee" | "arcade";
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

// ── SPACE ZONES (Single Unified Dinner Feast & Games Lounge) ──
export const SPACES_ZONES: Record<SpaceZoneId, SpaceZoneDef> = {
  courtyard: {
    id: "courtyard",
    name: "Dinner Feast & Games Lounge",
    category: "HOLIDAY & PARTY",
    icon: "🎄",
    color: "#e11d48",
    bounds: { x: 40, y: 40, w: 1520, h: 1120 },
    description: "Grand banquet dinner table with chairs, glowing Christmas tree, and party games.",
  },
};

// ── PRIVATE CONVERSATION RUGS ──
export const PRIVATE_RUGS: PrivateRug[] = [
  {
    id: "rug_fireplace",
    name: "Fireside Hearth Lounge",
    zoneId: "courtyard",
    x: 180,
    y: 310,
    w: 160,
    h: 120,
    color: "#b91c1c",
    capacity: 6,
  },
];

// ── INTERACTIVE OBJECTS ──
export const INTERACTIVE_OBJECTS: InteractiveObject[] = [
  {
    id: "holiday_christmas_tree",
    zoneId: "courtyard",
    name: "Holiday Christmas Tree",
    icon: "🎄",
    type: "fountain",
    x: 1460,
    y: 435,
    w: 60,
    h: 80,
    prompt: "Press [E] to Make a Holiday Wish under Tree ⭐",
  },
  {
    id: "cozy_fireplace",
    zoneId: "courtyard",
    name: "Roaring Fireplace Hearth",
    icon: "🔥",
    type: "coffee",
    x: 230,
    y: 340,
    w: 80,
    h: 50,
    prompt: "Press [E] to Warm by the Fire (+Warm Cider)",
  },
];

// ── ROOM DOORWAYS (None: Single Open Room) ──
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

// ── COLLISION WALLS (Outer Room Perimeter Only - 100% Open Space) ──
export const COLLISION_BOXES: CollisionBox[] = [
  // Outer map boundary walls
  { x: 0, y: 0, w: WORLD_WIDTH, h: 40 },
  { x: 0, y: WORLD_HEIGHT - 40, w: WORLD_WIDTH, h: 40 },
  { x: 0, y: 0, w: 40, h: WORLD_HEIGHT },
  { x: WORLD_WIDTH - 40, y: 0, w: 40, h: WORLD_HEIGHT },
];

export function getZoneAtCoordinates(x: number, y: number): SpaceZoneId {
  for (const [id, zone] of Object.entries(SPACES_ZONES)) {
    const { bounds } = zone;
    if (
      x >= bounds.x &&
      x <= bounds.x + bounds.w &&
      y >= bounds.y &&
      y <= bounds.y + bounds.h
    ) {
      return id as SpaceZoneId;
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

