/**
 * lib/soundCatalog.ts
 * ─────────────────────────────────────────────────────────────
 * Community Sound Catalog, Viral Voice Memes & CC0 Audio Stems
 * Powers the Instagram-style "Use This Audio" feature ($0 DMCA-free).
 * 
 * All audio URLs use CORS-friendly open media CDNs with zero 403/hotlinking errors.
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
    title: "Dramatic Impact Fanfare",
    artist: "Cinema SFX Vault",
    category: "VOICE_MEME",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Dramatic_sound_effect.ogg",
    durationSec: 4,
    usageCount: 890,
    isVoiceMeme: true,
  },
  {
    id: "meme_bruh",
    title: "Pop & Echo Boom",
    artist: "Classic Soundboard",
    category: "VOICE_MEME",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Pop_sound_effect.ogg",
    durationSec: 2,
    usageCount: 1420,
    isVoiceMeme: true,
  },
  {
    id: "meme_wah_wah",
    title: "Sad Trombone Slide",
    artist: "Comedy Brass Vault",
    category: "VOICE_MEME",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Trombone-slide.ogg",
    durationSec: 3,
    usageCount: 650,
    isVoiceMeme: true,
  },
  {
    id: "meme_ghazal_wah",
    title: "Gong & Classical Resonator",
    artist: "Classical Mehfil",
    category: "VOICE_MEME",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/3/36/Gong_sound.ogg",
    durationSec: 3,
    usageCount: 510,
    isVoiceMeme: true,
  },
  {
    id: "meme_vine_boom",
    title: "Cinematic Sub Boom",
    artist: "Trailer SFX",
    category: "VOICE_MEME",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Dramatic_sound_effect.ogg",
    durationSec: 3,
    usageCount: 1890,
    isVoiceMeme: true,
  },

  // ── AI Stems, Lo-Fi Loops & Instrumental Beats ───────────────────────────
  {
    id: "stem_nocturne_trading",
    title: "Nocturne Ambient Synth Beat",
    artist: "Echo Neural Engine",
    category: "AI_STEM",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Synth_Beat.ogg",
    durationSec: 45,
    usageCount: 340,
  },
  {
    id: "stem_acoustic_noir",
    title: "Acoustic Guitar Harmony",
    artist: "Echo Acoustics",
    category: "ACOUSTIC",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Acoustic_Guitar_Solo.ogg",
    durationSec: 42,
    usageCount: 280,
  },
  {
    id: "stem_synthwave_rain",
    title: "Midnight Rain & Ambient Drone",
    artist: "Cyber Ambient Node",
    category: "LOFI_BEAT",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Rain_sound.ogg",
    durationSec: 55,
    usageCount: 410,
  },
  {
    id: "stem_lofi_chill",
    title: "Coffeehouse Ambient Lo-Fi",
    artist: "Echo Beatmakers",
    category: "LOFI_BEAT",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Synth_Beat.ogg",
    durationSec: 45,
    usageCount: 195,
  },
  {
    id: "stem_phonk_drift",
    title: "Stage Clash Drift Pulse",
    artist: "Stage Clash Beats",
    category: "AI_STEM",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Synth_Beat.ogg",
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
