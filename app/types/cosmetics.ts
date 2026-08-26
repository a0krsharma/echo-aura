export type CosmeticSlot   = 'skin' | 'headwear' | 'ears';
export type CosmeticRarity = 'common' | 'rare' | 'legendary';

export interface SkinProperties {
  bodyColor: string;
  metalness: number;
  roughness: number;
  emissiveColor?: string;
  wireframe?: boolean;
}

export interface CosmeticItem {
  id: string;
  name: string;
  slot: CosmeticSlot;
  cost: number;
  rarity: CosmeticRarity;
  description: string;
  skinProps?: SkinProperties;
}

export interface EquippedCosmetics {
  skin: string;
  headwear: string | null;
  ears: string | null;
}

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // ── SKINS ────────────────────────────────────────────────────────────────
  {
    id: 'skin_default',
    name: 'Ceramic White',
    slot: 'skin', cost: 0, rarity: 'common',
    description: 'Factory-standard aerospace ceramic gloss.',
    skinProps: { bodyColor: '#f8fafc', metalness: 0.1, roughness: 0.15 },
  },
  {
    id: 'skin_obsidian',
    name: 'Stealth Obsidian',
    slot: 'skin', cost: 250, rarity: 'rare',
    description: 'Matte carbon nanotech coating for night runs.',
    skinProps: { bodyColor: '#09090b', metalness: 0.85, roughness: 0.25 },
  },
  {
    id: 'skin_cyber_gold',
    name: 'Midas 24K Plating',
    slot: 'skin', cost: 600, rarity: 'legendary',
    description: 'High-conductivity pure gold alloy armor.',
    skinProps: { bodyColor: '#eab308', metalness: 0.95, roughness: 0.15, emissiveColor: '#713f12' },
  },
  {
    id: 'skin_synthwave',
    name: 'Neon Wireframe',
    slot: 'skin', cost: 400, rarity: 'rare',
    description: 'Cyber matrix wireframe overlay.',
    skinProps: { bodyColor: '#064e3b', metalness: 0.2, roughness: 0.8, wireframe: true },
  },
  {
    id: 'skin_galaxy',
    name: 'Galaxy Nebula',
    slot: 'skin', cost: 350, rarity: 'rare',
    description: 'Deep space iridescent coating.',
    skinProps: { bodyColor: '#312e81', metalness: 0.7, roughness: 0.3, emissiveColor: '#4f46e5' },
  },

  // ── HEADWEAR ────────────────────────────────────────────────────────────
  {
    id: 'head_cyber_shades',
    name: 'Cyberpunk Visor Shades',
    slot: 'headwear', cost: 150, rarity: 'common',
    description: 'Tinted angular shades with neon laser edges.',
  },
  {
    id: 'head_vr_halo',
    name: 'Holographic Crown Halo',
    slot: 'headwear', cost: 500, rarity: 'legendary',
    description: 'Levitating gold energy halo powered by VOLTS.',
  },
  {
    id: 'head_party_hat',
    name: 'Party Cone Hat',
    slot: 'headwear', cost: 80, rarity: 'common',
    description: 'Festive polka-dot party hat. For when Echo needs to celebrate.',
  },

  // ── EARS ────────────────────────────────────────────────────────────────
  {
    id: 'ears_rgb_headphones',
    name: 'DJ Chroma Studio Cans',
    slot: 'ears', cost: 300, rarity: 'rare',
    description: 'Over-ear headphones with pulsing RGB status rings.',
  },
  {
    id: 'ears_gold_horns',
    name: 'Tesla Coil Antennas',
    slot: 'ears', cost: 450, rarity: 'legendary',
    description: 'Dual high-voltage electrical discharge horns.',
  },
  {
    id: 'ears_cat_ears',
    name: 'Kawaii Neko Ears',
    slot: 'ears', cost: 200, rarity: 'common',
    description: 'Fluffy pastel cat ears. Very cute, very deadly.',
  },
];
