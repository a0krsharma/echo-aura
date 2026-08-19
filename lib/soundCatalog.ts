/**
 * lib/soundCatalog.ts
 * ─────────────────────────────────────────────────────────────
 * Community Sound Vault, Viral Audio Memes & CC0 Audio Stems.
 * Powers zero-friction audio attachments and acoustic soundboards.
 */

export interface SoundItem {
  id: string;
  title: string;
  artist: string;
  category: "VOICE_MEME" | "AI_STEM" | "LOFI_BEAT" | "ACOUSTIC" | "COMMUNITY";
  audioUrl: string;
  durationSec: number;
  usageCount: number;
  coverArt?: string;
  isVoiceMeme?: boolean;
}

export const SOUND_CATALOG: SoundItem[] = [
  // ── Viral Voice Memes (3–6s micro-reactions) ──────────────────────────────
  {
    id: "meme_emotional_damage",
    title: "Dramatic Impact Sub-Boom",
    artist: "Cinema SFX Vault",
    category: "VOICE_MEME",
    audioUrl: "",
    durationSec: 3,
    usageCount: 890,
    isVoiceMeme: true,
  },
  {
    id: "meme_bruh",
    title: "Pop & Harmonic Boing",
    artist: "Classic Soundboard",
    category: "VOICE_MEME",
    audioUrl: "",
    durationSec: 2,
    usageCount: 1420,
    isVoiceMeme: true,
  },
  {
    id: "meme_wah_wah",
    title: "Sad Slide (Wah Wah Wah)",
    artist: "Comedy Brass Vault",
    category: "VOICE_MEME",
    audioUrl: "",
    durationSec: 3,
    usageCount: 650,
    isVoiceMeme: true,
  },
  {
    id: "meme_ghazal_wah",
    title: "Mehfil Gong & Resonator",
    artist: "Classical Mehfil",
    category: "VOICE_MEME",
    audioUrl: "",
    durationSec: 3,
    usageCount: 510,
    isVoiceMeme: true,
  },
  {
    id: "meme_vine_boom",
    title: "Cinematic Sub Bass Impact",
    artist: "Trailer SFX",
    category: "VOICE_MEME",
    audioUrl: "",
    durationSec: 3,
    usageCount: 1890,
    isVoiceMeme: true,
  },

  // ── AI Stems, Lo-Fi Loops & Instrumental Beats ───────────────────────────
  {
    id: "stem_nocturne_trading",
    title: "Nocturne Ambient Synth Drone",
    artist: "Echo Neural Engine",
    category: "AI_STEM",
    audioUrl: "",
    durationSec: 45,
    usageCount: 340,
  },
  {
    id: "stem_acoustic_noir",
    title: "Acoustic Harmony Chords",
    artist: "Echo Acoustics",
    category: "ACOUSTIC",
    audioUrl: "",
    durationSec: 42,
    usageCount: 280,
  },
  {
    id: "stem_synthwave_rain",
    title: "Midnight Rain & Ambient Drone",
    artist: "Cyber Ambient Node",
    category: "LOFI_BEAT",
    audioUrl: "",
    durationSec: 55,
    usageCount: 410,
  },
  {
    id: "stem_lofi_chill",
    title: "Coffeehouse Ambient Lo-Fi",
    artist: "Echo Beatmakers",
    category: "LOFI_BEAT",
    audioUrl: "",
    durationSec: 45,
    usageCount: 195,
  },
  {
    id: "stem_phonk_drift",
    title: "Stage Clash Drift Pulse",
    artist: "Stage Clash Beats",
    category: "AI_STEM",
    audioUrl: "",
    durationSec: 45,
    usageCount: 160,
  },
];

export function getTrendingSounds(category?: string): SoundItem[] {
  if (!category || category === "ALL") {
    return [...SOUND_CATALOG].sort((a, b) => b.usageCount - a.usageCount);
  }
  return SOUND_CATALOG.filter((s) => s.category === category).sort(
    (a, b) => b.usageCount - a.usageCount
  );
}

export function searchSounds(query: string): SoundItem[] {
  if (!query.trim()) return getTrendingSounds();
  const q = query.toLowerCase();
  return SOUND_CATALOG.filter(
    (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
  );
}

export function getSoundById(id: string): SoundItem | undefined {
  return SOUND_CATALOG.find((s) => s.id === id);
}
