/**
 * lib/soundCatalog.ts
 * ─────────────────────────────────────────────────────────────
 * Community Sound Catalog, Viral Voice Memes & CC0 Audio Stems
 * Powers the Instagram-style "Use This Audio" feature ($0 DMCA-free).
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
    title: "Emotional Damage",
    artist: "Steven He / Meme Vault",
    category: "VOICE_MEME",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_245e3f16d7.mp3",
    durationSec: 4,
    usageCount: 890,
    isVoiceMeme: true,
  },
  {
    id: "meme_bruh",
    title: "Bruh Sound Effect",
    artist: "Classic Soundboard",
    category: "VOICE_MEME",
    audioUrl: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3",
    durationSec: 2,
    usageCount: 1420,
    isVoiceMeme: true,
  },
  {
    id: "meme_wah_wah",
    title: "Sad Trombone (Wah Wah Wah)",
    artist: "Comedy Vault",
    category: "VOICE_MEME",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_73147814b6.mp3",
    durationSec: 3,
    usageCount: 650,
    isVoiceMeme: true,
  },
  {
    id: "meme_ghazal_wah",
    title: "Wah Bhai Wah (Shayari Cheer)",
    artist: "Classical Mehfil",
    category: "VOICE_MEME",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3527e30ec.mp3",
    durationSec: 3,
    usageCount: 510,
    isVoiceMeme: true,
  },
  {
    id: "meme_vine_boom",
    title: "Dramatic Impact (Dun Dun Dun)",
    artist: "Cinema SFX",
    category: "VOICE_MEME",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
    durationSec: 2,
    usageCount: 1890,
    isVoiceMeme: true,
  },

  // ── AI Stems, Lo-Fi Loops & Instrumental Beats ───────────────────────────
  {
    id: "stem_nocturne_trading",
    title: "Nocturne Trading Beat #4",
    artist: "Echo Neural Engine",
    category: "AI_STEM",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    durationSec: 64,
    usageCount: 340,
  },
  {
    id: "stem_acoustic_noir",
    title: "Acoustic Noir Guitar Loop",
    artist: "Studio+ Acoustics",
    category: "ACOUSTIC",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
    durationSec: 58,
    usageCount: 280,
  },
  {
    id: "stem_synthwave_rain",
    title: "Midnight Rain & Ambient Drone",
    artist: "Cyber Ambient Node",
    category: "LOFI_BEAT",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/24/audio_024b42b87f.mp3",
    durationSec: 72,
    usageCount: 410,
  },
  {
    id: "stem_lofi_chill",
    title: "Coffeehouse Lo-Fi Rhodes",
    artist: "Echo Beatmakers",
    category: "LOFI_BEAT",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3",
    durationSec: 52,
    usageCount: 195,
  },
  {
    id: "stem_phonk_drift",
    title: "Midnight Phonk Pulse",
    artist: "Stage Clash Beats",
    category: "AI_STEM",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3",
    durationSec: 48,
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
