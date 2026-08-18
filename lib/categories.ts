/**
 * lib/categories.ts
 * ─────────────────────────────────────────────────────
 * Category and Region configuration and types for Echo Radar & Trending Feeds.
 */

export const RADAR_REGIONS = [
  { id: 'india', label: 'INDIA' },
  { id: 'world', label: 'WORLD' },
] as const;

export type RadarRegion = typeof RADAR_REGIONS[number]['id'];

export const RADAR_CATEGORIES = [
  { id: 'trending', label: 'TRENDING' },
  { id: 'sports', label: 'SPORTS & CRICKET' },
  { id: 'news', label: 'NEWS' },
  { id: 'music', label: 'MUSIC / ENTERTAINMENT' },
  { id: 'tech', label: 'TECH' },
  { id: 'markets', label: 'MARKETS' },
  { id: 'startup', label: 'STARTUP' },
  { id: 'entertainment', label: 'ENTERTAINMENT' },
] as const;

export type RadarCategoryId = typeof RADAR_CATEGORIES[number]['id'];

export interface RadarTopicItem {
  tag: string;
  category: RadarCategoryId;
  region?: RadarRegion;
  velocity_score: number;
  live_rooms: number;
  voice_replies: number;
  total_pulses: number;
  shares?: number;
  active_room_id?: string;
  active_room_name?: string;
  headline?: string;
  sample_audio_url?: string;
  updated_at?: number;
}

export interface RadarFeedDoc {
  category: RadarCategoryId;
  region?: RadarRegion;
  updated_at: number;
  topics: RadarTopicItem[];
}

export const RADAR_TRACKED_CATEGORIES: RadarCategoryId[] = [
  'trending',
  'sports',
  'news',
  'music',
  'tech',
  'markets',
  'startup',
  'entertainment',
];

export function getRadarFeedDocId(region: RadarRegion, category: RadarCategoryId): string {
  return `${region}_${category}`;
}
