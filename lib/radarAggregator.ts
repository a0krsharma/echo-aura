/**
 * lib/radarAggregator.ts
 * ─────────────────────────────────────────────────────
 * Acoustic Velocity Trending Engine for Echo Radar (India & World Focused).
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
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import {
  RADAR_TRACKED_CATEGORIES,
  RadarCategoryId,
  RadarRegion,
  RadarTopicItem,
  getRadarFeedDocId,
} from '@/lib/categories';

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

// Curated seed data for INDIA and WORLD focus
const REGIONAL_SEEDS: Record<RadarRegion, Record<RadarCategoryId, RadarTopicItem[]>> = {
  india: {
    trending: [
      {
        tag: '#BiharStartups',
        category: 'trending',
        region: 'india',
        velocity_score: 9850,
        live_rooms: 4,
        voice_replies: 210,
        total_pulses: 1680,
        shares: 110,
        headline: 'Tier-2/3 founders debating early venture debt and profitability',
      },
      {
        tag: '#Nifty50Options',
        category: 'trending',
        region: 'india',
        velocity_score: 8900,
        live_rooms: 3,
        voice_replies: 165,
        total_pulses: 1320,
        shares: 78,
        headline: 'Weekly expiry live trading floor audio debrief',
      },
      {
        tag: '#BangaloreTech',
        category: 'trending',
        region: 'india',
        velocity_score: 7800,
        live_rooms: 2,
        voice_replies: 94,
        total_pulses: 890,
        shares: 42,
        headline: 'Engineers discussing open source AI models hosted on Indian cloud',
      },
      {
        tag: '#INDvsENG',
        category: 'trending',
        region: 'india',
        velocity_score: 7100,
        live_rooms: 2,
        voice_replies: 120,
        total_pulses: 950,
        shares: 60,
        headline: 'Live ball-by-ball stage banter and tactical clash',
      },
    ],
    sports: [
      {
        tag: '#INDvsENG',
        category: 'sports',
        region: 'india',
        velocity_score: 9400,
        live_rooms: 4,
        voice_replies: 190,
        total_pulses: 1450,
        shares: 88,
        headline: 'Live test match audio stage and bowling analysis',
      },
      {
        tag: '#IPL2026Auction',
        category: 'sports',
        region: 'india',
        velocity_score: 8200,
        live_rooms: 3,
        voice_replies: 130,
        total_pulses: 1100,
        shares: 55,
        headline: 'Franchise strategy and uncapped player scouting room',
      },
    ],
    news: [
      {
        tag: '#IndiaBudgetDebate',
        category: 'news',
        region: 'india',
        velocity_score: 8600,
        live_rooms: 3,
        voice_replies: 145,
        total_pulses: 1200,
        shares: 64,
        headline: 'Policy analysts breakdown capital expenditure and tax slabs',
      },
      {
        tag: '#ISROMission',
        category: 'news',
        region: 'india',
        velocity_score: 7900,
        live_rooms: 2,
        voice_replies: 98,
        total_pulses: 880,
        shares: 50,
        headline: 'Next-gen launch vehicle telemetry and payload updates',
      },
    ],
    music: [
      {
        tag: '#RagaFusion',
        category: 'music',
        region: 'india',
        velocity_score: 8100,
        live_rooms: 2,
        voice_replies: 110,
        total_pulses: 920,
        shares: 48,
        headline: 'Indian classical raag structures paired with analog synths',
      },
      {
        tag: '#IndianIndieFrequencies',
        category: 'music',
        region: 'india',
        velocity_score: 6900,
        live_rooms: 1,
        voice_replies: 72,
        total_pulses: 640,
        shares: 30,
        headline: 'Late night acoustic sessions and unreleased stems',
      },
    ],
    tech: [
      {
        tag: '#BangaloreDevs',
        category: 'tech',
        region: 'india',
        velocity_score: 9300,
        live_rooms: 3,
        voice_replies: 175,
        total_pulses: 1400,
        shares: 80,
        headline: 'Distributed systems and low-latency voice pipelines discussion',
      },
      {
        tag: '#UPIArchitecture',
        category: 'tech',
        region: 'india',
        velocity_score: 7600,
        live_rooms: 2,
        voice_replies: 95,
        total_pulses: 850,
        shares: 40,
        headline: 'High throughput transactional engineering debrief',
      },
    ],
    markets: [
      {
        tag: '#Nifty50Options',
        category: 'markets',
        region: 'india',
        velocity_score: 9500,
        live_rooms: 3,
        voice_replies: 185,
        total_pulses: 1500,
        shares: 90,
        headline: 'Live intraday options flow and volatility surface',
      },
      {
        tag: '#DalalStreetAudio',
        category: 'markets',
        region: 'india',
        velocity_score: 8300,
        live_rooms: 2,
        voice_replies: 120,
        total_pulses: 1020,
        shares: 52,
        headline: 'Quarterly earnings calls takeaways and sector rotation',
      },
    ],
    startup: [
      {
        tag: '#BiharStartups',
        category: 'startup',
        region: 'india',
        velocity_score: 9700,
        live_rooms: 4,
        voice_replies: 205,
        total_pulses: 1600,
        shares: 105,
        headline: 'Bharat-first business models and grassroots distribution',
      },
      {
        tag: '#BootstrappedIndia',
        category: 'startup',
        region: 'india',
        velocity_score: 8400,
        live_rooms: 2,
        voice_replies: 135,
        total_pulses: 1100,
        shares: 60,
        headline: 'Profitable SaaS builders sharing unvarnished MRR numbers',
      },
    ],
    entertainment: [
      {
        tag: '#RegionalCinemaDebate',
        category: 'entertainment',
        region: 'india',
        velocity_score: 8500,
        live_rooms: 2,
        voice_replies: 140,
        total_pulses: 1150,
        shares: 68,
        headline: 'Screenplay craft, sound mixing and cinematography breakdown',
      },
      {
        tag: '#BollywoodAudioLore',
        category: 'entertainment',
        region: 'india',
        velocity_score: 7200,
        live_rooms: 1,
        voice_replies: 88,
        total_pulses: 780,
        shares: 35,
        headline: 'Behind the scenes archives of iconic film scores',
      },
    ],
  },
  world: {
    trending: [
      {
        tag: '#AutonomousAgents',
        category: 'trending',
        region: 'world',
        velocity_score: 9420,
        live_rooms: 4,
        voice_replies: 184,
        total_pulses: 1420,
        shares: 98,
        headline: 'Multi-agent orchestration debate on voice latency',
      },
      {
        tag: '#EdgeCompute',
        category: 'trending',
        region: 'world',
        velocity_score: 8500,
        live_rooms: 3,
        voice_replies: 140,
        total_pulses: 1150,
        shares: 65,
        headline: 'Quantized neural models running locally on device',
      },
      {
        tag: '#AudioFirstSocial',
        category: 'trending',
        region: 'world',
        velocity_score: 6900,
        live_rooms: 2,
        voice_replies: 82,
        total_pulses: 720,
        shares: 40,
        headline: 'Acoustic communication vs traditional text feeds',
      },
    ],
    sports: [
      {
        tag: '#ChampionsLeague',
        category: 'sports',
        region: 'world',
        velocity_score: 9100,
        live_rooms: 3,
        voice_replies: 155,
        total_pulses: 1300,
        shares: 82,
        headline: 'Post-match tactical audio breakdowns and fan clashes',
      },
      {
        tag: '#F1GrandPrix',
        category: 'sports',
        region: 'world',
        velocity_score: 7800,
        live_rooms: 2,
        voice_replies: 105,
        total_pulses: 890,
        shares: 48,
        headline: 'Telemetry data, tire degradation, and team radio leaks',
      },
    ],
    news: [
      {
        tag: '#GlobalMarketsBrief',
        category: 'news',
        region: 'world',
        velocity_score: 8400,
        live_rooms: 2,
        voice_replies: 120,
        total_pulses: 1050,
        shares: 55,
        headline: 'Federal Reserve rate cut implications audio dispatch',
      },
      {
        tag: '#OpenSourceAI',
        category: 'news',
        region: 'world',
        velocity_score: 7500,
        live_rooms: 2,
        voice_replies: 88,
        total_pulses: 740,
        shares: 44,
        headline: 'New weights release triggers open stage debate',
      },
    ],
    music: [
      {
        tag: '#SynthesizerLab',
        category: 'music',
        region: 'world',
        velocity_score: 8600,
        live_rooms: 3,
        voice_replies: 160,
        total_pulses: 1150,
        shares: 75,
        headline: 'Producers sharing raw modular stems and patches',
      },
      {
        tag: '#LoFiJamSession',
        category: 'music',
        region: 'world',
        velocity_score: 6400,
        live_rooms: 1,
        voice_replies: 55,
        total_pulses: 580,
        shares: 30,
        headline: 'Late night ambient frequencies and beat jams',
      },
    ],
    tech: [
      {
        tag: '#EdgeCompute',
        category: 'tech',
        region: 'world',
        velocity_score: 9300,
        live_rooms: 3,
        voice_replies: 170,
        total_pulses: 1400,
        shares: 88,
        headline: 'Running quantized models locally on device',
      },
      {
        tag: '#WebRTCvsHLS',
        category: 'tech',
        region: 'world',
        velocity_score: 7600,
        live_rooms: 2,
        voice_replies: 98,
        total_pulses: 840,
        shares: 45,
        headline: 'Ultra-low latency audio streaming architectures',
      },
    ],
    markets: [
      {
        tag: '#FedRateDecision',
        category: 'markets',
        region: 'world',
        velocity_score: 8900,
        live_rooms: 2,
        voice_replies: 135,
        total_pulses: 1180,
        shares: 64,
        headline: 'Central banks liquidity updates and macro outlook',
      },
      {
        tag: '#CryptoVolatility',
        category: 'markets',
        region: 'world',
        velocity_score: 7200,
        live_rooms: 1,
        voice_replies: 70,
        total_pulses: 640,
        shares: 36,
        headline: 'On-chain signals and liquidity pool stage',
      },
    ],
    startup: [
      {
        tag: '#SeedRound',
        category: 'startup',
        region: 'world',
        velocity_score: 8700,
        live_rooms: 2,
        voice_replies: 125,
        total_pulses: 1050,
        shares: 55,
        headline: 'Early dilution vs revenue bootstrapping clash',
      },
      {
        tag: '#BuildInPublic',
        category: 'startup',
        region: 'world',
        velocity_score: 7900,
        live_rooms: 2,
        voice_replies: 90,
        total_pulses: 780,
        shares: 42,
        headline: 'Daily founder audio logs and MRR disclosures',
      },
    ],
    entertainment: [
      {
        tag: '#CinemaAesthetics',
        category: 'entertainment',
        region: 'world',
        velocity_score: 7700,
        live_rooms: 1,
        voice_replies: 95,
        total_pulses: 820,
        shares: 45,
        headline: 'Directing style, sound design and film scoring',
      },
      {
        tag: '#PodcastLore',
        category: 'entertainment',
        region: 'world',
        velocity_score: 6100,
        live_rooms: 1,
        voice_replies: 60,
        total_pulses: 540,
        shares: 25,
        headline: 'Deep dives into forgotten broadcast archives',
      },
    ],
  },
};

/**
 * Aggregates posts and active rooms into radar_feeds document per category & region
 */
export async function aggregateRadarCategory(
  category: RadarCategoryId,
  region: RadarRegion = 'india'
): Promise<RadarTopicItem[]> {
  try {
    const db = getFirebaseDb();
    const now = Date.now();

    // 1. Query active rooms
    const roomsRef = collection(db, 'rooms');
    const roomsSnap = await getDocs(query(roomsRef, limit(50)));
    const activeRooms: any[] = [];
    roomsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isLive || data.isActive || (data.listenerCount && data.listenerCount > 0)) {
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
        region: RadarRegion;
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

    const registerTopic = (
      rawTag: string,
      itemCat: RadarCategoryId,
      itemRegion: RadarRegion,
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
          region: itemRegion,
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
      const roomRegion = (room.region?.toLowerCase() || 'india') as RadarRegion;
      const roomTags = Array.isArray(room.tags) ? room.tags : [room.name || 'Stage'];
      const listeners = Number(room.listenerCount || room.listeners || 1);
      const isCatMatch = category === 'trending' || roomCat === category;
      const isRegionMatch = !room.region || roomRegion === region;

      if (isCatMatch && isRegionMatch) {
        for (const t of roomTags) {
          registerTopic(
            t,
            category,
            region,
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
      const postRegion = (post.region?.toLowerCase() || 'india') as RadarRegion;
      const postTags: string[] = [];

      if (Array.isArray(post.tags)) postTags.push(...post.tags);
      if (post.caption) {
        const matches = post.caption.match(/#[a-zA-Z0-9_]+/g);
        if (matches) postTags.push(...matches);
      }
      if (postTags.length === 0 && post.category) {
        postTags.push(`#${post.category}`);
      }

      const isCatMatch = category === 'trending' || postCat === category;
      const isRegionMatch = !post.region || postRegion === region;

      if (isCatMatch && isRegionMatch && postTags.length > 0) {
        const postTime = post.createdAt?.toMillis?.() || now;
        for (const t of postTags) {
          registerTopic(
            t,
            category,
            region,
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

    // Calculate velocity
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
        region,
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

    // Merge default regional seed data if dynamic is sparse
    const defaultSeedList = REGIONAL_SEEDS[region]?.[category] || REGIONAL_SEEDS.india[category];
    if (computedTopics.length === 0) {
      computedTopics = defaultSeedList;
    }

    computedTopics.sort((a, b) => b.velocity_score - a.velocity_score);
    const top10 = computedTopics.slice(0, 10);

    // Save regional doc e.g. radar_feeds/india_trending
    const regionalDocId = getRadarFeedDocId(region, category);
    await setDoc(
      doc(db, 'radar_feeds', regionalDocId),
      {
        category,
        region,
        updated_at: now,
        topics: top10,
      },
      { merge: true }
    );

    // Also write to default radar_feeds/{category} for backwards compatibility
    await setDoc(
      doc(db, 'radar_feeds', category),
      {
        category,
        updated_at: now,
        topics: top10,
      },
      { merge: true }
    );

    return top10;
  } catch (error) {
    console.error(`[RadarAggregator] Error aggregating category ${category} for region ${region}:`, error);
    return REGIONAL_SEEDS[region]?.[category] || REGIONAL_SEEDS.india[category];
  }
}

/**
 * Aggregates all tracked categories across both India and World regions in parallel
 */
export async function aggregateAllRadarFeeds(): Promise<Record<string, RadarTopicItem[]>> {
  const results: Record<string, RadarTopicItem[]> = {};
  const regions: RadarRegion[] = ['india', 'world'];

  for (const reg of regions) {
    await Promise.all(
      RADAR_TRACKED_CATEGORIES.map(async (cat) => {
        const key = getRadarFeedDocId(reg, cat);
        results[key] = await aggregateRadarCategory(cat, reg);
      })
    );
  }
  return results;
}
