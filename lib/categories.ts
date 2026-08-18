/**
 * lib/categories.ts
 * ─────────────────────────────────────────────────────
 * Category configuration and types for Echo Radar & Trending Feeds.
 */

export const RADAR_CATEGORIES = [
  { id: 'trending', label: 'TRENDING' },
  { id: 'sports', label: 'SPORTS' },
  { id: 'news', label: 'NEWS' },
  { id: 'music', label: 'MUSIC' },
  { id: 'tech', label: 'TECH' },
  { id: 'markets', label: 'MARKETS' },
  { id: 'startup', label: 'STARTUP' },
  { id: 'entertainment', label: 'ENTERTAINMENT' },
] as const;

export type RadarCategoryId = typeof RADAR_CATEGORIES[number]['id'];

export interface RadarTopicItem {
  tag: string;
  category: RadarCategoryId;
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
