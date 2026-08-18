'use client';

/**
 * app/radar/components/LiveRadarFeed.tsx
 * ─────────────────────────────────────────────────────
 * Real-time terminal feed subscribing to aggregated category telemetry.
 * Displays acoustic velocity, active live stages, and reverb counts.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { RadarCategoryId, RadarTopicItem } from '@/lib/categories';
import { aggregateRadarCategory } from '@/lib/radarAggregator';
import { Radio, Play, Pause, Flame, Share2, Volume2, ArrowRight } from 'lucide-react';

interface LiveRadarFeedProps {
  category?: RadarCategoryId;
  searchQuery?: string;
}

export default function LiveRadarFeed({
  category = 'trending',
  searchQuery = '',
}: LiveRadarFeedProps) {
  const router = useRouter();
  const [feedData, setFeedData] = useState<RadarTopicItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingTag, setPlayingTag] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    const db = getFirebaseDb();
    const docRef = doc(db, 'radar_feeds', category);

    // Listen to the single aggregated category document in real-time
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.topics) && data.topics.length > 0) {
            setIsUpdating(true);
            setFeedData(data.topics);
            setLoading(false);
            setTimeout(() => setIsUpdating(false), 800);
            return;
          }
        }

        // Fallback: If document not populated yet, trigger background aggregation
        aggregateRadarCategory(category).then((topics) => {
          setFeedData(topics);
          setLoading(false);
        });
      },
      (error) => {
        console.error('[LiveRadarFeed] Error listening to radar feed:', error);
        // Fallback to local aggregation
        aggregateRadarCategory(category).then((topics) => {
          setFeedData(topics);
          setLoading(false);
        });
      }
    );

    return () => unsub();
  }, [category]);

  const handleInterceptFrequency = (topic: RadarTopicItem) => {
    if (topic.active_room_id) {
      router.push(`/room/${topic.active_room_id}`);
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
    <div className={`space-y-4 font-mono ${isUpdating ? 'animate-pulse' : ''}`}>
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTag(null)}
        className="hidden"
      />

      {/* Telemetry Header */}
      <div className="border-b border-neutral-900 pb-2.5 flex justify-between items-center text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold tracking-widest">
            &gt;&gt; TRACKING: [ {category.toUpperCase()} ]
          </span>
          <span className="text-[10px] text-neutral-600 hidden sm:inline">
            // ACOUSTIC VELOCITY ENGINE
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>● LIVE SOCKET</span>
        </div>
      </div>

      {loading && feedData.length === 0 ? (
        <div className="p-8 border border-neutral-900 bg-neutral-950 text-center space-y-2">
          <div className="text-neutral-500 text-xs animate-pulse tracking-widest">
            CALCULATING REAL-TIME ACOUSTIC VELOCITY...
          </div>
          <div className="text-[10px] text-neutral-700 font-mono">
            GRAVITY DECAY DEPLOYED // SCANNING ACTIVE NODES
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-8 border border-neutral-900 bg-neutral-950 text-center space-y-2">
          <div className="text-neutral-500 text-xs tracking-widest uppercase">
            NO FREQUENCIES MATCHED &quot;{searchQuery}&quot;
          </div>
          <p className="text-[10px] text-neutral-600">
            TRY SEARCHING FOR OTHER AUDIO HASHTAGS OR BROADCAST A NEW FREQUENCY
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredData.map((topic, index) => {
            const hasLiveNodes = (topic.live_rooms || 0) > 0;
            const isPlaying = playingTag === topic.tag;

            return (
              <div
                key={topic.tag}
                onClick={() => handleInterceptFrequency(topic)}
                className="border border-neutral-900 bg-black p-4 relative group hover:border-neutral-500 transition-all cursor-pointer"
              >
                {/* Live Audio Indicator Beacon */}
                {hasLiveNodes && (
                  <div className="absolute top-3.5 right-3.5 text-[10px] text-emerald-400 flex items-center gap-1.5 font-bold tracking-wider bg-emerald-950/40 border border-emerald-900 px-2 py-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    {topic.live_rooms} {topic.live_rooms === 1 ? 'LIVE NODE' : 'LIVE NODES'}
                  </div>
                )}

                {/* Index and Velocity Score */}
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                  <span className="font-bold text-neutral-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>//</span>
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-neutral-500 inline" />
                    VELOCITY: <strong className="text-white">{topic.velocity_score}</strong>
                  </span>
                </div>

                {/* Hashtag / Topic Title */}
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-neutral-200 transition-colors">
                    {topic.tag}
                  </h3>
                </div>

                {/* Topic Headline / Summary */}
                {topic.headline && (
                  <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed line-clamp-2">
                    {topic.headline}
                  </p>
                )}

                {/* Acoustic & Engagement Telemetry */}
                <div className="mt-3.5 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 border-t border-neutral-900/80 pt-2.5">
                  <span className="bg-neutral-950 px-2 py-0.5 border border-neutral-900 text-neutral-300">
                    [ {topic.voice_replies || 0} REVERBS ]
                  </span>
                  <span className="bg-neutral-950 px-2 py-0.5 border border-neutral-900 text-neutral-300">
                    [ {topic.total_pulses || 0} PULSES ]
                  </span>
                  {topic.shares !== undefined && topic.shares > 0 && (
                    <span className="bg-neutral-950 px-2 py-0.5 border border-neutral-900 text-neutral-400 hidden sm:inline">
                      [ {topic.shares} ORBITS ]
                    </span>
                  )}
                  {topic.sample_audio_url && (
                    <button
                      onClick={(e) => handlePlayAudio(e, topic)}
                      className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 border border-neutral-700 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPlaying ? 'PAUSE CLAMP' : 'PREVIEW CLIP'}</span>
                    </button>
                  )}
                </div>

                {/* Hover Action Trigger Bar */}
                <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {hasLiveNodes ? '>> ACTIVE AUDIO ROOM RUNNING' : '>> FREQUENCY ARCHIVES & DISPATCHES'}
                  </span>
                  <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    &gt;&gt; INTERCEPT FREQUENCY <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
