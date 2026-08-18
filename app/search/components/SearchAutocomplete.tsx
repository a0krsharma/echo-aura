'use client';

/**
 * app/search/components/SearchAutocomplete.tsx
 * ─────────────────────────────────────────────────────
 * Multi-section predictive autocomplete dropdown for Echo Search:
 *  - Trending Hashtags with Velocity Scores (#tag)
 *  - User Mentions (@handle)
 *  - Platform Terminology & Shortcuts
 *  - Recent History
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hash, User, Flame, ArrowRight, Radio, Sparkles, Clock, X } from 'lucide-react';
import { RadarTopicItem } from '@/lib/categories';
import { EchoUser } from '@/lib/userDoc';
import { PlatformTermShortcut } from '@/lib/searchEngine';

interface SearchAutocompleteProps {
  query: string;
  hashtags: RadarTopicItem[];
  users: EchoUser[];
  shortcuts: PlatformTermShortcut[];
  history: string[];
  onSelectSuggestion: (term: string) => void;
  onClearHistoryItem: (term: string) => void;
  onClose: () => void;
}

export default function SearchAutocomplete({
  query,
  hashtags,
  users,
  shortcuts,
  history,
  onSelectSuggestion,
  onClearHistoryItem,
  onClose,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const cleanQ = query.trim().toLowerCase();

  const hasHashtags = hashtags.length > 0;
  const hasUsers = users.length > 0;
  const hasShortcuts = shortcuts.length > 0;
  const hasHistory = !cleanQ && history.length > 0;

  if (!cleanQ && !hasHistory) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-black border border-neutral-800 shadow-2xl mt-1 max-h-[70vh] overflow-y-auto font-mono divide-y divide-neutral-900">
      
      {/* 1. HASHTAGS & TRENDING FREQUENCIES */}
      {hasHashtags && (
        <div className="p-2">
          <div className="px-3 py-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Hash className="w-3 h-3 text-white" />
              TRENDING HASHTAGS
            </span>
            <span>VELOCITY RANKING</span>
          </div>

          <div className="space-y-1">
            {hashtags.slice(0, 4).map((topic) => (
              <div
                key={topic.tag}
                onClick={() => {
                  onSelectSuggestion(topic.tag);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 hover:bg-neutral-900 transition-colors cursor-pointer border border-transparent hover:border-neutral-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 border border-neutral-800 bg-neutral-950 flex items-center justify-center shrink-0">
                    <Hash className="w-3 h-3 text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white tracking-wider truncate">
                      {topic.tag}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {topic.category.toUpperCase()} • {topic.voice_replies || 0} REVERBS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {topic.live_rooms > 0 && (
                    <span className="text-[9px] bg-white text-black font-bold px-1.5 py-0.5">
                      LIVE STAGE
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 border border-neutral-800 px-2 py-0.5">
                    VELOCITY: {topic.velocity_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. VERIFIED VOICES & USERS */}
      {hasUsers && (
        <div className="p-2">
          <div className="px-3 py-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5 text-neutral-400">
            <User className="w-3 h-3 text-white" />
            VOICES &amp; HANDLES
          </div>

          <div className="space-y-1">
            {users.slice(0, 4).map((u) => {
              const avatar = u.photoUrl || (u as any).photoURL;
              return (
                <div
                  key={u.uid}
                  onClick={() => {
                    router.push(`/${u.handle.replace('@', '')}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 hover:bg-neutral-900 transition-colors cursor-pointer border border-transparent hover:border-neutral-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 text-white">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.handle?.charAt(1)?.toUpperCase() || 'V'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white tracking-wider truncate">
                        {u.handle}
                      </p>
                      {u.displayName && (
                        <p className="text-[10px] text-neutral-500 truncate">
                          {u.displayName}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-500 border border-neutral-800 px-2 py-0.5">
                    AURA: {u.auraScore || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PLATFORM CHANNELS & TERMINOLOGY */}
      {hasShortcuts && (
        <div className="p-2">
          <div className="px-3 py-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5 text-neutral-400">
            <Radio className="w-3 h-3 text-white" />
            PLATFORM FREQUENCIES &amp; ACTIONS
          </div>

          <div className="space-y-1">
            {shortcuts.slice(0, 3).map((item) => (
              <div
                key={item.term}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 hover:bg-neutral-900 transition-colors cursor-pointer border border-transparent hover:border-neutral-800"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white tracking-widest">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. RECENT SEARCHES (When query is empty) */}
      {hasHistory && (
        <div className="p-3 space-y-2">
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
            <Clock className="w-3 h-3 text-neutral-400" />
            RECENT QUERIES
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((term) => (
              <div
                key={term}
                className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:border-white transition-colors cursor-pointer"
              >
                <span onClick={() => { onSelectSuggestion(term); onClose(); }}>
                  {term}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearHistoryItem(term);
                  }}
                  className="text-neutral-600 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
