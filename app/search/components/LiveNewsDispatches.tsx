'use client';

/**
 * app/search/components/LiveNewsDispatches.tsx
 * ─────────────────────────────────────────────────────
 * Real-time World News Dispatches & Audio Debates for Echo Search.
 * Translates global news into interactive audio stages and voice replies.
 * Hardcore pure monochrome (Black & White).
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewsDispatch } from '@/lib/newsService';
import { useAuth } from '@/app/components/AuthProvider';
import { createRoom } from '@/lib/rooms';
import { Globe, Radio, Mic2, ExternalLink, ArrowRight, Loader2, Sparkles, Flame } from 'lucide-react';

interface LiveNewsDispatchesProps {
  dispatches: NewsDispatch[];
  loading?: boolean;
  categoryTitle?: string;
}

export default function LiveNewsDispatches({
  dispatches,
  loading = false,
  categoryTitle = 'GLOBAL WIRE DISPATCHES',
}: LiveNewsDispatchesProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [creatingRoomId, setCreatingRoomId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const handleStartLiveStage = async (e: React.MouseEvent, item: NewsDispatch) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }

    setCreatingRoomId(item.id);
    try {
      const roomId = await createRoom({
        name: item.title.slice(0, 60),
        description: `Live stage debate: ${item.description}`,
        hostUid: user.uid,
        hostHandle: user.handle || '@ANON',
        maxParticipants: 20,
        isPublic: true,
        category: item.category.toUpperCase(),
        tags: ['NEWS', item.category.toUpperCase(), item.topicTag.replace('#', '')],
      });
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error('[LiveNewsDispatches] Failed creating room:', err);
    } finally {
      setCreatingRoomId(null);
    }
  };

  const handleRecordAudioTake = (e: React.MouseEvent, item: NewsDispatch) => {
    e.stopPropagation();
    const cleanTag = item.topicTag.replace('#', '');
    router.push(`/record?topic=${encodeURIComponent(cleanTag)}&headline=${encodeURIComponent(item.title.slice(0, 80))}`);
  };

  const handleInterceptHashtag = (e: React.MouseEvent, item: NewsDispatch) => {
    e.stopPropagation();
    const cleanTag = item.topicTag.replace('#', '');
    router.push(`/hashtag/${encodeURIComponent(cleanTag)}`);
  };

  const displayedDispatches = dispatches.slice(0, visibleCount);
  const hasMore = visibleCount < dispatches.length;

  return (
    <section className="space-y-3 font-mono">
      {/* Telemetry Header */}
      <div className="border-b border-neutral-900 pb-2.5 flex justify-between items-center text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-white" />
          <span className="text-white font-bold tracking-widest uppercase">
            &gt;&gt; {categoryTitle} ({dispatches.length})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <span>● LIVE WIRE FEED</span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 border border-neutral-900 bg-neutral-950 text-center space-y-2">
          <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
          <div className="text-xs text-neutral-400 tracking-widest uppercase">
            FETCHING REAL-TIME GLOBAL WIRE SIGNALS...
          </div>
        </div>
      ) : dispatches.length === 0 ? (
        <div className="p-6 border border-neutral-900 bg-neutral-950 text-center text-xs text-neutral-500 tracking-widest">
          NO WIRE DISPATCHES FOUND FOR THIS CATEGORY
        </div>
      ) : (
        <div className="space-y-3">
          {displayedDispatches.map((item, index) => {
            const isCreating = creatingRoomId === item.id;

            return (
              <div
                key={item.id}
                className="border border-neutral-900 bg-black p-4 space-y-3 hover:border-neutral-700 transition-colors group"
              >
                {/* Wire Meta & Timestamp */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white bg-neutral-950 border border-neutral-800 px-1.5 py-0.5">
                      {item.source}
                    </span>
                    <span>•</span>
                    <span className="uppercase">{item.category}</span>
                    <span>•</span>
                    <span>{item.timeAgo}</span>
                  </div>
                  
                  <span
                    onClick={(e) => handleInterceptHashtag(e, item)}
                    className="text-white hover:underline cursor-pointer font-bold tracking-wider"
                  >
                    {item.topicTag}
                  </span>
                </div>

                {/* Headline */}
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Audio Launchpad Buttons (The Echo Differentiator) */}
                <div className="pt-2 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1-Click Live Stage Debate */}
                    <button
                      onClick={(e) => handleStartLiveStage(e, item)}
                      disabled={isCreating}
                      className="flex items-center gap-1.5 text-[11px] bg-white text-black font-bold px-3 py-1.5 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCreating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Radio className="w-3 h-3" />
                      )}
                      <span>&gt;&gt; START LIVE DEBATE</span>
                    </button>

                    {/* Record Voice Reply Take */}
                    <button
                      onClick={(e) => handleRecordAudioTake(e, item)}
                      className="flex items-center gap-1.5 text-[11px] border border-neutral-800 text-neutral-300 hover:border-white hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer"
                    >
                      <Mic2 className="w-3 h-3 text-neutral-400" />
                      <span>RECORD TAKE</span>
                    </button>
                  </div>

                  {/* External Link */}
                  {item.link && item.link !== '#' && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors"
                    >
                      <span>READ WIRE</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load More Dispatches Button */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="w-full py-3 border border-neutral-800 hover:border-white text-neutral-300 hover:text-white bg-neutral-950 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer"
            >
              [ + LOAD MORE SECTOR DISPATCHES ({dispatches.length - visibleCount} REMAINING) ]
            </button>
          )}
        </div>
      )}
    </section>
  );
}
