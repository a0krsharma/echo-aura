/**
 * lib/searchEngine.ts
 * ─────────────────────────────────────────────────────
 * Multi-vector search engine for Echo:
 * Searches across:
 *  1. Verified Voices / Users (@handle, displayName)
 *  2. Trending Hashtags & Topics (#tag with velocity scores)
 *  3. Live Audio Rooms & Stage Debates (active rooms matching topic)
 *  4. Audio Echoes & Reverbs (posts matching caption/tags)
 *  5. Platform Terminology & Action Shortcuts
 */

import { collection, query, getDocs, limit, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { type EchoUser } from '@/lib/userDoc';
import { type PostItem } from '@/lib/posts';
import { RADAR_CATEGORIES, RadarCategoryId, RadarTopicItem } from '@/lib/categories';

export interface LiveRoomResult {
  id: string;
  name: string;
  description?: string;
  hostHandle: string;
  hostUid: string;
  listenerCount: number;
  tags?: string[];
  category?: string;
  isLive?: boolean;
}

export interface PlatformTermShortcut {
  term: string;
  type: 'category' | 'feature';
  label: string;
  href: string;
  description: string;
}

export interface SearchResultsMatrix {
  users: EchoUser[];
  hashtags: RadarTopicItem[];
  liveRooms: LiveRoomResult[];
  posts: PostItem[];
  shortcuts: PlatformTermShortcut[];
}

export const PLATFORM_TERMS: PlatformTermShortcut[] = [
  { term: 'trending', type: 'category', label: '[ TRENDING TELEMETRY ]', href: '/radar', description: 'Real-time acoustic velocity rankings across all frequencies' },
  { term: 'sports', type: 'category', label: '[ SPORTS FREQUENCIES ]', href: '/radar', description: 'Live match commentary, fan clashes, and tactical debates' },
  { term: 'news', type: 'category', label: '[ NEWS & DISPATCHES ]', href: '/radar', description: 'Global and local breaking audio news debriefs' },
  { term: 'tech', type: 'category', label: '[ TECH & HARDWARE ]', href: '/radar', description: 'Edge AI, engineering architecture, and developer stages' },
  { term: 'startup', type: 'category', label: '[ STARTUP & FOUNDERS ]', href: '/radar', description: 'Bootstrapping, venture capital, and build-in-public audio logs' },
  { term: 'markets', type: 'category', label: '[ MARKETS & FINANCE ]', href: '/radar', description: 'Live trading floor signals, options, and crypto telemetry' },
  { term: 'music', type: 'category', label: '[ MUSIC & FREQUENCIES ]', href: '/radar', description: 'Synthesizer jams, raw stems, and producer audio rooms' },
  { term: 'stage', type: 'feature', label: '[ THE STAGE / CLASH ]', href: '/clash', description: 'Live head-to-head audio debates and arena clashes' },
  { term: 'wire', type: 'feature', label: '[ THE WIRE / DIRECT ]', href: '/wire', description: 'Encrypted 1-on-1 direct audio messaging' },
  { term: 'radar', type: 'feature', label: '[ RADAR DISCOVERY ]', href: '/radar', description: 'Open node beacon scan and frequency interceptor' },
  { term: 'record', type: 'feature', label: '[ BROADCAST ECHO ]', href: '/record', description: 'Record and transmit an audio echo to the frequency' },
];

/**
 * Fast search across all platform entities
 */
export async function executeMultiVectorSearch(
  rawQuery: string,
  categoryFilter: string = 'ALL'
): Promise<SearchResultsMatrix> {
  const q = rawQuery.trim().toLowerCase();
  const isHashtagSearch = q.startsWith('#');
  const isMentionSearch = q.startsWith('@');
  const cleanQ = q.replace(/^[#@]/, '');

  const db = getFirebaseDb();

  const results: SearchResultsMatrix = {
    users: [],
    hashtags: [],
    liveRooms: [],
    posts: [],
    shortcuts: [],
  };

  if (!cleanQ && categoryFilter === 'ALL') {
    return results;
  }

  // 1. Search Platform Term Shortcuts
  if (cleanQ) {
    results.shortcuts = PLATFORM_TERMS.filter(
      (item) =>
        item.term.includes(cleanQ) ||
        item.label.toLowerCase().includes(cleanQ) ||
        item.description.toLowerCase().includes(cleanQ)
    );
  }

  // 2. Search Users (Voices)
  if (!isHashtagSearch) {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      results.users = usersSnap.docs
        .map((d) => d.data() as EchoUser)
        .filter((u) => {
          const handleMatch = u.handle?.toLowerCase().includes(cleanQ);
          const nameMatch = u.displayName?.toLowerCase().includes(cleanQ);
          const bioMatch = u.bio?.toLowerCase().includes(cleanQ);
          return handleMatch || nameMatch || bioMatch;
        })
        .slice(0, 15);
    } catch (e) {
      console.warn('[SearchEngine] Users search error:', e);
    }
  }

  // 3. Search Active Rooms (Live Nodes / Stages)
  try {
    const roomsSnap = await getDocs(
      query(
        collection(db, 'rooms'),
        where('isActive', '==', true),
        limit(50)
      )
    );

    const nowMs = Date.now();
    const hostRoomMap = new Map<string, LiveRoomResult>();

    roomsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      // Skip arcade match objects masquerading as rooms, ended rooms, or non-live
      if (data.isArcade || data.gameType || data.isActive === false || data.status === 'FINISHED') {
        return;
      }

      // Check TTL / freshness
      const createdAtMs = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : nowMs;
      const updatedAtMs = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : createdAtMs;
      if (nowMs - updatedAtMs > 8 * 60 * 60 * 1000) {
        return; // Stale room older than 8 hours
      }

      const name = data.name || '';
      const desc = data.description || '';
      const cat = data.category?.toLowerCase() || '';
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const hostUid = data.hostUid || docSnap.id;

      const matchesQuery =
        !cleanQ ||
        name.toLowerCase().includes(cleanQ) ||
        desc.toLowerCase().includes(cleanQ) ||
        cat.includes(cleanQ) ||
        tags.some((t: string) => t.toLowerCase().includes(cleanQ)) ||
        (data.hostHandle && data.hostHandle.toLowerCase().includes(cleanQ));

      const matchesCategory =
        categoryFilter === 'ALL' ||
        categoryFilter === 'TRENDING' ||
        cat === categoryFilter.toLowerCase() ||
        tags.some((t: string) => t.toUpperCase() === categoryFilter);

      if (matchesQuery && matchesCategory) {
        const roomObj: LiveRoomResult = {
          id: docSnap.id,
          name,
          description: desc,
          hostHandle: data.hostHandle || '@ANON',
          hostUid,
          listenerCount: Number(data.participantCount || data.listenerCount || data.listeners || 1),
          tags,
          category: data.category,
          isLive: true,
        };

        // Deduplicate: Keep only the single latest room per host
        if (!hostRoomMap.has(hostUid)) {
          hostRoomMap.set(hostUid, roomObj);
        }
      }
    });

    results.liveRooms = Array.from(hostRoomMap.values());
  } catch (e) {
    console.warn('[SearchEngine] Rooms search error:', e);
  }

  // 4. Search Trending Hashtags & Frequencies
  try {
    const categoriesToScan =
      categoryFilter !== 'ALL' && categoryFilter !== 'VOICES' && categoryFilter !== 'ECHOES'
        ? [categoryFilter.toLowerCase() as RadarCategoryId]
        : (['trending', 'tech', 'sports', 'news', 'startup', 'markets', 'music', 'entertainment'] as RadarCategoryId[]);

    for (const cat of categoriesToScan) {
      try {
        const feedSnap = await getDoc(doc(db, 'radar_feeds', cat));
        if (feedSnap.exists()) {
          const topics = (feedSnap.data()?.topics || []) as RadarTopicItem[];
          for (const t of topics) {
            const tagClean = t.tag.toLowerCase().replace('#', '');
            if (!cleanQ || tagClean.includes(cleanQ) || t.headline?.toLowerCase().includes(cleanQ)) {
              if (!results.hashtags.some((h) => h.tag.toLowerCase() === t.tag.toLowerCase())) {
                results.hashtags.push(t);
              }
            }
          }
        }
      } catch {
        // Fallback silently without throwing unhandled permission error
      }
    }

    // Sort hashtags by velocity score
    results.hashtags.sort((a, b) => b.velocity_score - a.velocity_score);
  } catch {
    // Silent fallback
  }

  // 5. Search Audio Posts (Echoes)
  if (!isMentionSearch) {
    try {
      const postsSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100)));
      results.posts = postsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, 'id'>) }) as PostItem)
        .filter((p: PostItem) => {
          const captionMatch = p.caption?.toLowerCase().includes(cleanQ);
          const authorMatch = p.authorHandle?.toLowerCase().includes(cleanQ);
          const postCat = p.category?.toLowerCase() || '';
          const tagMatch = Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(cleanQ));

          const matchesQuery = !cleanQ || captionMatch || authorMatch || tagMatch;
          const matchesCategory =
            categoryFilter === 'ALL' ||
            categoryFilter === 'ECHOES' ||
            postCat === categoryFilter.toLowerCase() ||
            (Array.isArray(p.tags) && p.tags.some((t: string) => t.toUpperCase() === categoryFilter));

          return matchesQuery && matchesCategory;
        })
        .slice(0, 50);
    } catch (e) {
      console.warn('[SearchEngine] Posts search error:', e);
    }
  }

  return results;
}
