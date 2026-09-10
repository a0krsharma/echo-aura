/**
 * lib/spaces.ts
 * ─────────────────────────────────────────────────────
 * Echo Spaces: 2D Spatial Living Space Metaverse System
 * Defines zones, coordinates, interactive objects, collision boundaries,
 * and avatar presence sync.
 */

export type SpaceZoneId = "office" | "library" | "music" | "concert" | "debate" | "courtyard";

export interface SpaceZoneDef {
  id: SpaceZoneId;
  name: string;
  category: string;
  icon: string;
  color: string;
  bounds: { x: number; y: number; w: number; h: number };
  description: string;
  ambientSound?: string;
  broadcastPoint?: { x: number; y: number }; // E.g. Stage or Podium
}

export interface InteractiveObject {
  id: string;
  zoneId: SpaceZoneId;
  name: string;
  icon: string;
  type: "chair" | "whiteboard" | "piano" | "drums" | "gavel" | "pomodoro" | "podium" | "jukebox" | "fountain";
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
  statusText?: string;
  hoodieColor: string;
  isSpeaking: boolean;
  speechBubble?: { text: string; expiresAt: number };
  lastUpdated: number;
}

// ── WORLD MAP DIMENSIONS ──
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

// ── 5 THEMATIC ZONES DEFINITIONS ──
export const SPACES_ZONES: Record<SpaceZoneId, SpaceZoneDef> = {
  office: {
    id: "office",
    name: "Virtual Coworking Office",
    category: "PRODUCTIVITY",
    icon: "🏢",
    color: "#38bdf8", // Sky Blue
    bounds: { x: 50, y: 50, w: 680, h: 480 },
    description: "Desks, conference table, whiteboard & watercooler for casual team syncs.",
  },
  library: {
    id: "library",
    name: "Silent Sanctuary Library",
    category: "FOCUS & STUDY",
    icon: "📚",
    color: "#a78bfa", // Purple
    bounds: { x: 870, y: 50, w: 680, h: 480 },
    description: "Whisper sanctuary with 25/5 Pomodoro timer, lofi rain & cozy armchairs.",
  },
  music: {
    id: "music",
    name: "Music Academy & Jam Studio",
    category: "CREATIVE & AUDIO",
    icon: "🎵",
    color: "#f43f5e", // Rose
    bounds: { x: 50, y: 650, w: 460, h: 500 },
    description: "Live 8-key piano synthesizer, 4-pad drum machine & acoustic jam floor.",
  },
  concert: {
    id: "concert",
    name: "Concert Hall & Festival Stage",
    category: "ENTERTAINMENT",
    icon: "🎤",
    color: "#eab308", // Golden Yellow
    bounds: { x: 550, y: 650, w: 500, h: 500 },
    description: "Raised performance stage, stage broadcaster mic & audience dance floor.",
    broadcastPoint: { x: 800, y: 730 },
  },
  debate: {
    id: "debate",
    name: "Town Hall Debate Arena",
    category: "SPEECH & POLITICS",
    icon: "⚖️",
    color: "#10b981", // Emerald Green
    bounds: { x: 1090, y: 650, w: 460, h: 500 },
    description: "Proposition & Opposition podiums, Judge gavel & real-time audience voting.",
    broadcastPoint: { x: 1320, y: 730 },
  },
  courtyard: {
    id: "courtyard",
    name: "Central Courtyard & Garden",
    category: "COMMUNITY LOUNGE",
    icon: "⛲",
    color: "#14b8a6", // Teal
    bounds: { x: 700, y: 480, w: 200, h: 220 },
    description: "Open air atrium connecting all 5 wings with marble fountain and park benches.",
  },
};

// ── INTERACTIVE OBJECTS ACROSS ROOMS ──
export const INTERACTIVE_OBJECTS: InteractiveObject[] = [
  // 🏢 Virtual Office
  {
    id: "office_desk_1",
    zoneId: "office",
    name: "Workstation Alpha",
    icon: "🪑",
    type: "chair",
    x: 140,
    y: 180,
    w: 36,
    h: 36,
    prompt: "Press [E] to Sit at Desk Alpha",
  },
  {
    id: "office_desk_2",
    zoneId: "office",
    name: "Workstation Beta",
    icon: "🪑",
    type: "chair",
    x: 230,
    y: 180,
    w: 36,
    h: 36,
    prompt: "Press [E] to Sit at Desk Beta",
  },
  {
    id: "office_desk_3",
    zoneId: "office",
    name: "Workstation Gamma",
    icon: "🪑",
    type: "chair",
    x: 320,
    y: 180,
    w: 36,
    h: 36,
    prompt: "Press [E] to Sit at Desk Gamma",
  },
  {
    id: "office_whiteboard",
    zoneId: "office",
    name: "Team Conference Whiteboard",
    icon: "📋",
    type: "whiteboard",
    x: 480,
    y: 120,
    w: 120,
    h: 48,
    prompt: "Press [E] to Open Whiteboard & Scratchpad",
  },
  {
    id: "office_couch",
    zoneId: "office",
    name: "Breakout Watercooler Couch",
    icon: "🛋️",
    type: "chair",
    x: 220,
    y: 380,
    w: 100,
    h: 40,
    prompt: "Press [E] to Relax on Couch",
  },

  // 📚 Quiet Sanctuary Library
  {
    id: "library_pomodoro",
    zoneId: "library",
    name: "Sanctuary Focus Altar",
    icon: "⏱️",
    type: "pomodoro",
    x: 1200,
    y: 140,
    w: 64,
    h: 48,
    prompt: "Press [E] for 25-Min Focus Pomodoro (+50 Aura)",
  },
  {
    id: "library_chair_1",
    zoneId: "library",
    name: "Reading Armchair 1",
    icon: "🪑",
    type: "chair",
    x: 980,
    y: 220,
    w: 36,
    h: 36,
    prompt: "Press [E] to Read in Armchair",
  },
  {
    id: "library_chair_2",
    zoneId: "library",
    name: "Reading Armchair 2",
    icon: "🪑",
    type: "chair",
    x: 1080,
    y: 220,
    w: 36,
    h: 36,
    prompt: "Press [E] to Read in Armchair",
  },
  {
    id: "library_study_table",
    zoneId: "library",
    name: "Oak Study Table",
    icon: "📖",
    type: "chair",
    x: 1320,
    y: 300,
    w: 80,
    h: 40,
    prompt: "Press [E] to Study at Table",
  },

  // 🎵 Music Academy & Jam Studio
  {
    id: "music_piano",
    zoneId: "music",
    name: "Grand Synthesizer Piano",
    icon: "🎹",
    type: "piano",
    x: 200,
    y: 760,
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
    x: 340,
    y: 760,
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
    x: 130,
    y: 920,
    w: 50,
    h: 50,
    prompt: "Press [E] to Spin Jukebox Radio",
  },

  // 🎤 Concert & Festival Hall
  {
    id: "concert_stage_mic",
    zoneId: "concert",
    name: "Center Stage Mic",
    icon: "🎙️",
    type: "podium",
    x: 780,
    y: 720,
    w: 40,
    h: 40,
    prompt: "Press [E] to Take Stage Microphone (Hall-Wide Broadcast)",
  },

  // ⚖️ Town Hall Debate Arena
  {
    id: "debate_prop_podium",
    zoneId: "debate",
    name: "Proposition Podium",
    icon: "🗣️",
    type: "podium",
    x: 1180,
    y: 740,
    w: 40,
    h: 40,
    prompt: "Press [E] to Speak for Proposition",
  },
  {
    id: "debate_opp_podium",
    zoneId: "debate",
    name: "Opposition Podium",
    icon: "🗣️",
    type: "podium",
    x: 1420,
    y: 740,
    w: 40,
    h: 40,
    prompt: "Press [E] to Speak for Opposition",
  },
  {
    id: "debate_judge_gavel",
    zoneId: "debate",
    name: "Judge's Gavel Bench",
    icon: "🔨",
    type: "gavel",
    x: 1300,
    y: 700,
    w: 60,
    h: 40,
    prompt: "Press [E] to Strike Gavel (ORDER IN COURT!)",
  },

  // ⛲ Central Courtyard
  {
    id: "courtyard_fountain",
    zoneId: "courtyard",
    name: "Echo Marble Fountain",
    icon: "⛲",
    type: "fountain",
    x: 770,
    y: 560,
    w: 60,
    h: 60,
    prompt: "Press [E] to Toss Aura Coin (+5 Aura)",
  },
];

// ── COLLISION WALLS & ROOM PERIMETERS ──
export const COLLISION_BOXES: CollisionBox[] = [
  // Outer map boundary walls
  { x: 0, y: 0, w: WORLD_WIDTH, h: 40 }, // Top
  { x: 0, y: WORLD_HEIGHT - 40, w: WORLD_WIDTH, h: 40 }, // Bottom
  { x: 0, y: 0, w: 40, h: WORLD_HEIGHT }, // Left
  { x: WORLD_WIDTH - 40, y: 0, w: 40, h: WORLD_HEIGHT }, // Right

  // Office Room Walls (Doorway at x: 670, y: 280-360)
  { x: 50, y: 50, w: 680, h: 16 }, // Office Top
  { x: 50, y: 50, w: 16, h: 480 }, // Office Left
  { x: 50, y: 514, w: 680, h: 16 }, // Office Bottom
  { x: 714, y: 50, w: 16, h: 220 }, // Office Right (Top part)
  { x: 714, y: 350, w: 16, h: 180 }, // Office Right (Bottom part - leaves doorway at 270-350)

  // Library Room Walls (Doorway at x: 870, y: 280-360)
  { x: 870, y: 50, w: 680, h: 16 }, // Library Top
  { x: 1534, y: 50, w: 16, h: 480 }, // Library Right
  { x: 870, y: 514, w: 680, h: 16 }, // Library Bottom
  { x: 870, y: 50, w: 16, h: 220 }, // Library Left (Top part)
  { x: 870, y: 350, w: 16, h: 180 }, // Library Left (Bottom part - leaves doorway at 270-350)

  // Music Room Walls (Doorway at Top y: 650, x: 240-320)
  { x: 50, y: 650, w: 190, h: 16 }, // Music Top Left
  { x: 320, y: 650, w: 190, h: 16 }, // Music Top Right (Doorway at 240-320)
  { x: 50, y: 650, w: 16, h: 500 }, // Music Left
  { x: 494, y: 650, w: 16, h: 500 }, // Music Right
  { x: 50, y: 1134, w: 460, h: 16 }, // Music Bottom

  // Concert Hall Walls (Doorway at Top y: 650, x: 760-840)
  { x: 550, y: 650, w: 210, h: 16 }, // Concert Top Left
  { x: 840, y: 650, w: 210, h: 16 }, // Concert Top Right (Doorway at 760-840)
  { x: 550, y: 650, w: 16, h: 500 }, // Concert Left
  { x: 1034, y: 650, w: 16, h: 500 }, // Concert Right
  { x: 550, y: 1134, w: 500, h: 16 }, // Concert Bottom

  // Debate Arena Walls (Doorway at Top y: 650, x: 1280-1360)
  { x: 1090, y: 650, w: 190, h: 16 }, // Debate Top Left
  { x: 1360, y: 650, w: 190, h: 16 }, // Debate Top Right (Doorway at 1280-1360)
  { x: 1090, y: 650, w: 16, h: 500 }, // Debate Left
  { x: 1534, y: 650, w: 16, h: 500 }, // Debate Right
  { x: 1090, y: 1134, w: 460, h: 16 }, // Debate Bottom
];

// Helper to determine active zone from spatial coordinates
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

// Check if moving to (x, y) with radius collides with walls
export function checkCollision(x: number, y: number, radius = 14): boolean {
  for (const box of COLLISION_BOXES) {
    if (
      x + radius > box.x &&
      x - radius < box.x + box.w &&
      y + radius > box.y &&
      y - radius < box.y + box.h
    ) {
      return true; // Collision!
    }
  }
  return false;
}

// Check if player is near an interactive object
export function getNearbyInteractiveObject(
  x: number,
  y: number,
  reachDist = 55
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

// Sample Ambient Bots when solo
export const DEFAULT_AMBIENT_BOTS: SpatialAvatar[] = [
  {
    uid: "bot_colleague_1",
    handle: "Maya (Lead Dev)",
    x: 158,
    y: 198,
    direction: "down",
    isMoving: false,
    isSitting: true,
    activeZone: "office",
    statusText: "💻 Ship sprint v2.4",
    hoodieColor: "#38bdf8",
    isSpeaking: false,
    lastUpdated: Date.now(),
  },
  {
    uid: "bot_librarian",
    handle: "Archivist Ezra",
    x: 1220,
    y: 160,
    direction: "down",
    isMoving: false,
    isSitting: false,
    activeZone: "library",
    statusText: "📖 Researching AI ethics",
    hoodieColor: "#a78bfa",
    isSpeaking: false,
    lastUpdated: Date.now(),
  },
  {
    uid: "bot_musician",
    handle: "Leo (Composer)",
    x: 245,
    y: 788,
    direction: "up",
    isMoving: false,
    isSitting: false,
    activeZone: "music",
    statusText: "🎹 Improvising in D-Minor",
    hoodieColor: "#f43f5e",
    isSpeaking: false,
    lastUpdated: Date.now(),
  },
  {
    uid: "bot_debater",
    handle: "Senator Vance",
    x: 1200,
    y: 760,
    direction: "down",
    isMoving: false,
    isSitting: false,
    activeZone: "debate",
    statusText: "⚖️ Proposition: Web3 is the Future",
    hoodieColor: "#10b981",
    isSpeaking: true,
    speechBubble: { text: "The motion stands supported by empirical evidence!", expiresAt: Date.now() + 60000 },
    lastUpdated: Date.now(),
  },
];
