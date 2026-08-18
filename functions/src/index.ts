/**
 * functions/src/index.ts
 * ─────────────────────────────────────────────────────
 * Firebase Cloud Functions for Echo.
 * Scheduled Acoustic Velocity Cruncher:
 * Runs every 5 minutes to compute time-decayed velocity scores across categories
 * and write aggregated top 10 documents to radar_feeds/{category}.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const RADAR_TRACKED_CATEGORIES = [
  'trending',
  'sports',
  'news',
  'music',
  'tech',
  'markets',
  'startup',
  'entertainment',
] as const;

type RadarCategoryId = (typeof RADAR_TRACKED_CATEGORIES)[number];

const GRAVITY = 1.6;

function calculateVelocity(
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
  return Math.max(1, Math.round((acousticEnergy / timeDecay) * 100));
}

export const aggregateRadarFeeds = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    console.log('[RadarAggregator] Starting acoustic velocity computation at', new Date().toISOString());

    // 1. Fetch active rooms
    const roomsSnap = await db.collection('rooms').limit(100).get();
    const activeRooms: any[] = [];
    roomsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.isLive || data.isActive || (data.listenerCount && data.listenerCount > 0)) {
        activeRooms.push({ id: doc.id, ...data });
      }
    });

    // 2. Fetch recent posts (last 48 hours)
    const postsSnap = await db.collection('posts').limit(200).get();
    const recentPosts: any[] = [];
    postsSnap.forEach((doc) => {
      recentPosts.push({ id: doc.id, ...doc.data() });
    });

    for (const category of RADAR_TRACKED_CATEGORIES) {
      const topicMap: Record<string, any> = {};

      const registerTopic = (
        rawTag: string,
        itemLive: number,
        roomId?: string,
        roomName?: string,
        replies = 0,
        pulses = 0,
        shares = 0,
        ts = now,
        headline?: string
      ) => {
        const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
        if (!topicMap[tag]) {
          topicMap[tag] = {
            tag,
            category,
            live_rooms: itemLive,
            active_room_id: roomId,
            active_room_name: roomName,
            voice_replies: replies,
            total_pulses: pulses,
            shares,
            newestTimestamp: ts,
            headline,
          };
        } else {
          topicMap[tag].live_rooms += itemLive;
          topicMap[tag].voice_replies += replies;
          topicMap[tag].total_pulses += pulses;
          topicMap[tag].shares += shares;
          if (roomId && !topicMap[tag].active_room_id) {
            topicMap[tag].active_room_id = roomId;
            topicMap[tag].active_room_name = roomName;
          }
          if (ts > topicMap[tag].newestTimestamp) {
            topicMap[tag].newestTimestamp = ts;
          }
          if (headline && !topicMap[tag].headline) {
            topicMap[tag].headline = headline;
          }
        }
      };

      // Process rooms
      for (const room of activeRooms) {
        const roomCat = (room.category?.toLowerCase() || 'trending') as RadarCategoryId;
        const isCatMatch = category === 'trending' || roomCat === category;
        if (isCatMatch) {
          const tags = Array.isArray(room.tags) ? room.tags : [room.name || 'Stage'];
          const listeners = Number(room.listenerCount || room.listeners || 1);
          for (const t of tags) {
            registerTopic(
              t,
              1,
              room.id,
              room.name,
              0,
              listeners * 2,
              0,
              room.createdAt?.toMillis?.() || now,
              room.description || `Live stage: ${room.name}`
            );
          }
        }
      }

      // Process posts
      for (const post of recentPosts) {
        const postCat = (post.category?.toLowerCase() || 'trending') as RadarCategoryId;
        const isCatMatch = category === 'trending' || postCat === category;
        if (isCatMatch) {
          const tags: string[] = [];
          if (Array.isArray(post.tags)) tags.push(...post.tags);
          if (post.caption) {
            const matches = post.caption.match(/#[a-zA-Z0-9_]+/g);
            if (matches) tags.push(...matches);
          }
          if (tags.length === 0 && post.category) {
            tags.push(`#${post.category}`);
          }

          const postTime = post.createdAt?.toMillis?.() || now;
          for (const t of tags) {
            registerTopic(
              t,
              0,
              undefined,
              undefined,
              Number(post.reverbCount || post.voiceReplies || 0),
              Number(post.pulseCount || post.pulses || 0),
              Number(post.orbitCount || post.shares || 0),
              postTime,
              post.caption?.slice(0, 100)
            );
          }
        }
      }

      // Score and rank
      const topics = Object.values(topicMap).map((t) => {
        const hoursElapsed = (now - t.newestTimestamp) / (1000 * 60 * 60);
        return {
          ...t,
          velocity_score: calculateVelocity(
            t.live_rooms,
            t.voice_replies,
            t.shares,
            t.total_pulses,
            hoursElapsed
          ),
          updated_at: now,
        };
      });

      topics.sort((a, b) => b.velocity_score - a.velocity_score);
      const top10 = topics.slice(0, 10);

      // Write single aggregated document per category with sanitized data
      const docPayload = JSON.parse(
        JSON.stringify(
          {
            category,
            updated_at: now,
            topics: top10,
          },
          (_, v) => (v === undefined ? null : v)
        )
      );

      await db.collection('radar_feeds').doc(category).set(docPayload, { merge: true });
    }

    console.log('[RadarAggregator] Completed aggregation for all categories');
    return null;
  });
