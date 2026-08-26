'use client';

/**
 * app/radar/components/LiveRadarFeed.tsx
 * ─────────────────────────────────────────────────────
 * Real-time Acoustic Velocity Radar & Trending Hashtags Feed.
 * Clean, minimal, world-class luxury audio discovery.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, collection, onSnapshot, query, limit } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { RadarCategoryId, RadarRegion, RadarTopicItem, getRadarFeedDocId } from '@/lib/categories';
import { aggregateRadarCategory } from '@/lib/radarAggregator';
import { Play, Pause, Flame, ArrowRight, Radio, Volume2, Sparkles, MessageSquare, Heart } from 'lucide-react';

interface LiveRadarFeedProps {
  category?: RadarCategoryId;
  region?: RadarRegion;
  searchQuery?: string;
}

export default function LiveRadarFeed({
  category = 'trending',
  region = 'india',
  searchQuery = '',
}: LiveRadarFeedProps) {
  const router = useRouter();
  const [feedData, setFeedData] = useState<RadarTopicItem[]>([]);
  const [liveRoomsMap, setLiveRoomsMap] = useState<Record<string, { count: number; roomId?: string; roomName?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [playingTag, setPlayingTag] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Real-time Regional Category Telemetry Document Subscription
  useEffect(() => {
    setLoading(true);
    const db = getFirebaseDb();
    const docId = getRadarFeedDocId(region, category);
    const docRef = doc(db, 'radar_feeds', docId);

    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.topics) && data.topics.length > 0) {
            setFeedData(data.topics);
            setLoading(false);
            return;
          }
        }

        // Fallback: Trigger background aggregation
        aggregateRadarCategory(category, region).then((topics) => {
          setFeedData(topics);
          setLoading(false);
        });
      },
      (error) => {
        console.error('[LiveRadarFeed] Error listening to radar feed:', error);
        aggregateRadarCategory(category, region).then((topics) => {
          setFeedData(topics);
          setLoading(false);
        });
      }
    );

    return () => unsub();
  }, [category, region]);

  // 2. Real-time Active Rooms Subscription
  useEffect(() => {
    const db = getFirebaseDb();
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, limit(50));

    const unsubRooms = onSnapshot(
      q,
      (snapshot) => {
        const roomMap: Record<string, { count: number; roomId?: string; roomName?: string }> = {};

        snapshot.forEach((docSnap) => {
          const room = docSnap.data();
          if (room.isLive || room.isActive || (room.listenerCount && room.listenerCount > 0)) {
            const tags = Array.isArray(room.tags) ? room.tags : [room.name || 'Stage'];
            for (const t of tags) {
              const formattedTag = t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`;
              if (!roomMap[formattedTag]) {
                roomMap[formattedTag] = { count: 1, roomId: docSnap.id, roomName: room.name };
              } else {
                roomMap[formattedTag].count += 1;
              }
            }
          }
        });

        setLiveRoomsMap(roomMap);
      },
      (err) => {
        console.error('[LiveRadarFeed] Error listening to active rooms:', err);
      }
    );

    return () => unsubRooms();
  }, []);

  const handleInterceptFrequency = (topic: RadarTopicItem) => {
    const cleanTagLower = topic.tag.toLowerCase();
    const realTimeRoom = liveRoomsMap[cleanTagLower];

    if (realTimeRoom?.roomId || topic.active_room_id) {
      router.push(`/room/${realTimeRoom?.roomId || topic.active_room_id}`);
    } else {
      const cleanTag = topic.tag.replace('#', '');
      router.push(`/hashtag/${encodeURIComponent(cleanTag)}`);
    }
  };

  const handlePlayAudio = (e: React.MouseEvent, topic: RadarTopicItem) => {
    e.stopPropagation();
    if (!topic.sample_audio_url) {
      handleInterceptFrequency(topic);
      return;
    }

    if (playingTag === topic.tag) {
      audioRef.current?.pause();
      setPlayingTag(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = topic.sample_audio_url;
        audioRef.current.play().catch(console.error);
        setPlayingTag(topic.tag);
      }
    }
  };

  const filteredData = searchQuery.trim()
    ? feedData.filter(
        (t) =>
          t.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.headline?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : feedData;

  return (
    <div className="space-y-4 font-mono">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTag(null)}
        className="hidden"
      />

      {/* Telemetry Header */}
      <div className="flex justify-between items-center text-xs pb-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-black tracking-widest uppercase">
            LIVE ACOUSTIC RADAR
          </span>
          <span className="text-[10px] text-neutral-500 font-bold hidden sm:inline">
            • {region.toUpperCase()} • {category.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>REAL-TIME STREAM</span>
        </div>
      </div>

      {loading && feedData.length === 0 ? (
        <div className="p-12 border border-neutral-900 bg-neutral-950/60 rounded-3xl text-center space-y-2">
          <Radio className="w-6 h-6 text-neutral-600 animate-pulse mx-auto" />
          <div className="text-white text-xs font-black tracking-widest uppercase">
            SCANNING {region.toUpperCase()} FREQUENCIES...
          </div>
          <div className="text-[10px] text-neutral-500 font-sans">
            Calculating real-time acoustic velocity across active rooms
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 border border-neutral-900 bg-neutral-950/60 rounded-3xl text-center space-y-2">
          <div className="text-white text-xs font-bold tracking-widest uppercase">
            NO FREQUENCIES FOUND FOR &quot;{searchQuery}&quot;
          </div>
          <p className="text-[11px] text-neutral-500 font-sans">
            Try searching another topic or create an echo with this hashtag.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredData.map((topic, index) => {
            const cleanTagLower = topic.tag.toLowerCase();
            const realTimeLiveCount = liveRoomsMap[cleanTagLower]?.count || topic.live_rooms || 0;
            const hasLiveNodes = realTimeLiveCount > 0;
            const isPlaying = playingTag === topic.tag;

            return (
              <div
                key={topic.tag}
                onClick={() => handleInterceptFrequency(topic)}
                className="p-5 rounded-3xl border border-neutral-900 bg-neutral-950/80 hover:bg-neutral-950 hover:border-neutral-700 transition-all cursor-pointer space-y-3 shadow-md group relative overflow-hidden"
              >
                {/* Top Row: Rank Badge, Live Indicator & Velocity */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-400 transition-colors tracking-tight">
                      {topic.tag}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasLiveNodes && (
                      <span className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500 text-emerald-400 text-[10px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(52,211,153,0.3)] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{realTimeLiveCount} LIVE {realTimeLiveCount === 1 ? 'ROOM' : 'ROOMS'}</span>
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{topic.velocity_score.toLocaleString()} VELOCITY</span>
                    </span>
                  </div>
                </div>

                {/* Headline or Quote */}
                {topic.headline && (
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed line-clamp-2">
                    {topic.headline}
                  </p>
                )}

                {/* Bottom Row: Telemetry Pills & Audio Preview */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-900/80">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase">
                    <span className="px-2 py-0.5 bg-neutral-900/80 border border-neutral-800/80 rounded-md">
                      💬 {topic.voice_replies || 0} REVERBS
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-900/80 border border-neutral-800/80 rounded-md">
                      ⚡ {topic.total_pulses || 0} PULSES
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {topic.sample_audio_url && (
                      <button
                        onClick={(e) => handlePlayAudio(e, topic)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'PAUSE' : 'PREVIEW'}</span>
                      </button>
                    )}

                    <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1">
                      EXPLORE →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
