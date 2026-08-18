/**
 * lib/radarAggregator.ts
 * ─────────────────────────────────────────────────────
 * Acoustic Velocity Trending Engine for Echo Radar.
 * Computes time-decayed velocity scores based on:
 *   - L (Live Listeners / Active Stage Nodes) * 10
 *   - V (Voice Replies / Reverbs) * 5
 *   - S (Shares / Orbits) * 3
 *   - P (Pulses / Likes) * 1
 * Divided by (T + 2)^G with gravity G = 1.6
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { RADAR_TRACKED_CATEGORIES, RadarCategoryId, RadarTopicItem, RadarFeedDoc } from '@/lib/categories';

// Gravity factor for time decay (1.5 to 1.8)
const GRAVITY = 1.6;

export function calculateVelocityScore(
  liveListeners: number,
  voiceReplies: number,
  shares: number,
  pulses: number,
  hoursElapsed: number
): number {
  const acousticEnergy =
    liveListeners * 10 +
    voiceReplies * 5 +
    shares * 3 +
    pulses * 1;

  const timeDecay = Math.pow(Math.max(0, hoursElapsed) + 2, GRAVITY);
  const rawScore = (acousticEnergy / timeDecay) * 100;
  return Math.max(1, Math.round(rawScore));
}

// Fallback high-signal topics per category when Firestore has fresh/sparse data
const DEFAULT_TOPICS_BY_CATEGORY: Record<RadarCategoryId, RadarTopicItem[]> = {
  trending: [
    {
      tag: '#AutonomousAgents',
      category: 'trending',
      velocity_score: 9420,
      live_rooms: 4,
      voice_replies: 184,
      total_pulses: 1420,
      shares: 98,
      headline: 'Multi-agent orchestration debate on voice latency',
    },
    {
      tag: '#IndiaTechSummit',
      category: 'trending',
      velocity_score: 8150,
      live_rooms: 2,
      voice_replies: 92,
      total_pulses: 980,
      shares: 45,
      headline: 'Bangalore & NCR founders live stage',
    },
    {
      tag: '#AudioFirstSocial',
      category: 'trending',
      velocity_score: 6200,
      live_rooms: 1,
      voice_replies: 64,
      total_pulses: 640,
      shares: 31,
      headline: 'Acoustic communication vs traditional text feeds',
    },
  ],
  sports: [
    {
      tag: '#ChampionsLeague',
      category: 'sports',
      velocity_score: 8900,
      live_rooms: 3,
      voice_replies: 142,
      total_pulses: 1200,
      shares: 80,
      headline: 'Post-match tactical audio breakdowns and fan clashes',
    },
    {
      tag: '#CricketWorldCup',
      category: 'sports',
      velocity_score: 7600,
      live_rooms: 2,
      voice_replies: 110,
      total_pulses: 850,
      shares: 55,
      headline: 'Live ball-by-ball stage commentary',
    },
  ],
  news: [
    {
      tag: '#GlobalMarketsBrief',
      category: 'news',
      velocity_score: 7800,
      live_rooms: 2,
      voice_replies: 88,
      total_pulses: 930,
      shares: 42,
      headline: 'Federal Reserve rate cut implications audio dispatch',
    },
    {
      tag: '#OpenSourceAI',
      category: 'news',
      velocity_score: 6950,
      live_rooms: 1,
      voice_replies: 74,
      total_pulses: 620,
      shares: 39,
      headline: 'New weights release triggers open stage debate',
    },
  ],
  music: [
    {
      tag: '#SynthesizerLab',
      category: 'music',
      velocity_score: 8400,
      live_rooms: 3,
      voice_replies: 156,
      total_pulses: 1100,
      shares: 72,
      headline: 'Producers sharing raw modular stems and patches',
    },
    {
      tag: '#LoFiJamSession',
      category: 'music',
      velocity_score: 5900,
      live_rooms: 1,
      voice_replies: 45,
      total_pulses: 510,
      shares: 28,
      headline: 'Late night ambient frequencies and beat jams',
    },
  ],
  tech: [
    {
      tag: '#EdgeCompute',
      category: 'tech',
      velocity_score: 9100,
      live_rooms: 3,
      voice_replies: 160,
      total_pulses: 1350,
      shares: 85,
      headline: 'Running quantized models locally on device',
    },
    {
      tag: '#WebRTCvsHLS',
      category: 'tech',
      velocity_score: 7200,
      live_rooms: 2,
      voice_replies: 95,
      total_pulses: 810,
      shares: 44,
      headline: 'Ultra-low latency audio streaming architectures',
    },
  ],
  markets: [
    {
      tag: '#Nifty50Options',
      category: 'markets',
      velocity_score: 8800,
      live_rooms: 2,
      voice_replies: 130,
      total_pulses: 1140,
      shares: 60,
      headline: 'Live trading floor audio debrief',
    },
    {
      tag: '#CryptoVolatility',
      category: 'markets',
      velocity_score: 6800,
      live_rooms: 1,
      voice_replies: 62,
      total_pulses: 590,
      shares: 33,
      headline: 'On-chain signals and liquidity pool stage',
    },
  ],
  startup: [
    {
      tag: '#SeedRound',
      category: 'startup',
      velocity_score: 8300,
      live_rooms: 2,
      voice_replies: 118,
      total_pulses: 990,
      shares: 50,
      headline: 'Early dilution vs revenue bootstrapping clash',
    },
    {
      tag: '#BuildInPublic',
      category: 'startup',
      velocity_score: 7500,
      live_rooms: 2,
      voice_replies: 84,
      total_pulses: 740,
      shares: 38,
      headline: 'Daily founder audio logs and MRR disclosures',
    },
  ],
  entertainment: [
    {
      tag: '#CinemaAesthetics',
      category: 'entertainment',
      velocity_score: 7100,
      live_rooms: 1,
      voice_replies: 89,
      total_pulses: 780,
      shares: 41,
      headline: 'Directing style, sound design and film scoring',
    },
    {
      tag: '#PodcastLore',
      category: 'entertainment',
      velocity_score: 5600,
      live_rooms: 1,
      voice_replies: 52,
      total_pulses: 490,
      shares: 20,
      headline: 'Deep dives into forgotten broadcast archives',
    },
  ],
};

/**
 * Aggregates posts and active rooms into radar_feeds document per category
 */
export async function aggregateRadarCategory(category: RadarCategoryId): Promise<RadarTopicItem[]> {
  try {
    const db = getFirebaseDb();
    const now = Date.now();

    // 1. Query active rooms
    const roomsRef = collection(db, 'rooms');
    const roomsSnap = await getDocs(query(roomsRef, limit(50)));
    const activeRooms: any[] = [];
    roomsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isLive || data.isActive || data.listenerCount > 0) {
        activeRooms.push({ id: docSnap.id, ...data });
      }
    });

    // 2. Query recent posts
    const postsRef = collection(db, 'posts');
    const postsSnap = await getDocs(query(postsRef, limit(100)));
    const recentPosts: any[] = [];
    postsSnap.forEach((docSnap) => {
      recentPosts.push({ id: docSnap.id, ...docSnap.data() });
    });

    // 3. Group by hashtag / topic
    const topicMap: Record<
      string,
      {
        tag: string;
        category: RadarCategoryId;
        liveRooms: number;
        activeRoomId?: string;
        activeRoomName?: string;
        voiceReplies: number;
        pulses: number;
        shares: number;
        newestTimestamp: number;
        headline?: string;
        audioUrl?: string;
      }
    > = {};

    // Helper to register topic
    const registerTopic = (
      rawTag: string,
      itemCat: RadarCategoryId,
      itemLive: number,
      roomId?: string,
      roomName?: string,
      replies = 0,
      pulses = 0,
      shares = 0,
      ts = now,
      headline?: string,
      audioUrl?: string
    ) => {
      const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
      if (!topicMap[tag]) {
        topicMap[tag] = {
          tag,
          category: itemCat,
          liveRooms: itemLive,
          activeRoomId: roomId,
          activeRoomName: roomName,
          voiceReplies: replies,
          pulses,
          shares,
          newestTimestamp: ts,
          headline,
          audioUrl,
        };
      } else {
        topicMap[tag].liveRooms += itemLive;
        topicMap[tag].voiceReplies += replies;
        topicMap[tag].pulses += pulses;
        topicMap[tag].shares += shares;
        if (roomId && !topicMap[tag].activeRoomId) {
          topicMap[tag].activeRoomId = roomId;
          topicMap[tag].activeRoomName = roomName;
        }
        if (ts > topicMap[tag].newestTimestamp) {
          topicMap[tag].newestTimestamp = ts;
        }
        if (headline && !topicMap[tag].headline) {
          topicMap[tag].headline = headline;
        }
        if (audioUrl && !topicMap[tag].audioUrl) {
          topicMap[tag].audioUrl = audioUrl;
        }
      }
    };

    // Scan rooms
    for (const room of activeRooms) {
      const roomCat = (room.category?.toLowerCase() || 'trending') as RadarCategoryId;
      const roomTags = Array.isArray(room.tags) ? room.tags : [room.name || 'Stage'];
      const listeners = Number(room.listenerCount || room.listeners || 1);
      const isCatMatch = category === 'trending' || roomCat === category;

      if (isCatMatch) {
        for (const t of roomTags) {
          registerTopic(
            t,
            category,
            1,
            room.id,
            room.name,
            0,
            listeners * 2,
            0,
            room.createdAt?.toMillis?.() || now,
            room.description || `Live audio room: ${room.name}`
          );
        }
      }
    }

    // Scan posts
    for (const post of recentPosts) {
      const postCat = (post.category?.toLowerCase() || 'trending') as RadarCategoryId;
      const postTags: string[] = [];
      
      // Extract from tags or hashtags in caption
      if (Array.isArray(post.tags)) {
        postTags.push(...post.tags);
      }
      if (post.caption) {
        const matches = post.caption.match(/#[a-zA-Z0-9_]+/g);
        if (matches) postTags.push(...matches);
      }

      if (postTags.length === 0 && post.category) {
        postTags.push(`#${post.category}`);
      }

      const isCatMatch = category === 'trending' || postCat === category;
      if (isCatMatch && postTags.length > 0) {
        const postTime = post.createdAt?.toMillis?.() || now;
        for (const t of postTags) {
          registerTopic(
            t,
            category,
            0,
            undefined,
            undefined,
            Number(post.reverbCount || post.voiceReplies || 0),
            Number(post.pulseCount || post.pulses || 0),
            Number(post.orbitCount || post.shares || 0),
            postTime,
            post.caption?.slice(0, 100),
            post.audioUrl
          );
        }
      }
    }

    // Convert to topics array and calculate velocity
    let computedTopics: RadarTopicItem[] = Object.values(topicMap).map((entry) => {
      const hoursElapsed = (now - entry.newestTimestamp) / (1000 * 60 * 60);
      const velocity = calculateVelocityScore(
        entry.liveRooms,
        entry.voiceReplies,
        entry.shares,
        entry.pulses,
        hoursElapsed
      );

      return {
        tag: entry.tag,
        category,
        velocity_score: velocity,
        live_rooms: entry.liveRooms,
        voice_replies: entry.voiceReplies,
        total_pulses: entry.pulses,
        shares: entry.shares,
        active_room_id: entry.activeRoomId,
        active_room_name: entry.activeRoomName,
        headline: entry.headline,
        sample_audio_url: entry.audioUrl,
        updated_at: now,
      };
    });

    // If no dynamic items exist yet in DB, merge default seed data for immediate high fidelity
    if (computedTopics.length === 0) {
      computedTopics = DEFAULT_TOPICS_BY_CATEGORY[category] || DEFAULT_TOPICS_BY_CATEGORY.trending;
    }

    // Sort descending by velocity score
    computedTopics.sort((a, b) => b.velocity_score - a.velocity_score);
    const top10 = computedTopics.slice(0, 10);

    // Save aggregated document to radar_feeds/{category}
    const feedRef = doc(db, 'radar_feeds', category);
    await setDoc(
      feedRef,
      {
        category,
        updated_at: now,
        topics: top10,
      },
      { merge: true }
    );

    return top10;
  } catch (error) {
    console.error(`[RadarAggregator] Error aggregating category ${category}:`, error);
    return DEFAULT_TOPICS_BY_CATEGORY[category] || DEFAULT_TOPICS_BY_CATEGORY.trending;
  }
}

/**
 * Aggregates all tracked categories in parallel
 */
export async function aggregateAllRadarFeeds(): Promise<Record<RadarCategoryId, RadarTopicItem[]>> {
  const results: Record<string, RadarTopicItem[]> = {};
  await Promise.all(
    RADAR_TRACKED_CATEGORIES.map(async (cat) => {
      results[cat] = await aggregateRadarCategory(cat);
    })
  );
  return results as Record<RadarCategoryId, RadarTopicItem[]>;
}
