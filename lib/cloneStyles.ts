/**
 * lib/cloneStyles.ts
 * ─────────────────────────────────────────────────────────────
 * Curated Legendary Voice Archetypes & Stylistic Aliases
 * for the Zero-Shot Clone Protocol.
 */

export interface CloneStyleProfile {
  name: string;
  description: string;
  baseVoice: string;
  defaultRate: string;
  defaultPitch: string;
}

export const CURATED_STYLE_VAULT: Record<string, CloneStyleProfile> = {
  vintage_baritone: {
    name: "SOULFUL GHAZAL // VINTAGE BARITONE",
    description: "Deep, resonant, soulful baritone cadence for ghazals and classical poetry",
    baseVoice: "hi-IN-MadhurNeural",
    defaultRate: "-8%",
    defaultPitch: "-2Hz",
  },
  breathy_tenor: {
    name: "ACOUSTIC INDIE // NOSTALGIC TENOR",
    description: "Warm, airy, nostalgic indie singer timbre for lo-fi loops and ballads",
    baseVoice: "hi-IN-SwaraNeural",
    defaultRate: "-4%",
    defaultPitch: "+1Hz",
  },
  urdu_narrator: {
    name: "INTENSE POETRY // URDU NARRATOR",
    description: "Dramatic classical Urdu cadence with expressive pauses",
    baseVoice: "ur-PK-AsadNeural",
    defaultRate: "-5%",
    defaultPitch: "-1Hz",
  },
  trading_pit: {
    name: "TRADING PIT // HIGH-ENERGY DISPATCH",
    description: "Rapid-fire, sharp, authoritative cadence for market analysis and tech setups",
    baseVoice: "en-US-GuyNeural",
    defaultRate: "+12%",
    defaultPitch: "+1Hz",
  },
  noir_whisper: {
    name: "NOCTURNE // DEEP CYBERPUNK WHISPER",
    description: "Intense, cinematic, quiet atmospheric narration for midnight thoughts",
    baseVoice: "en-US-ChristopherNeural",
    defaultRate: "-10%",
    defaultPitch: "-3Hz",
  },
};
