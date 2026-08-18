'use client';

/**
 * app/radar/components/RadarHeader.tsx
 * ─────────────────────────────────────────────────────
 * Tab navigation and search component for Echo Radar.
 */

import React from 'react';
import { RADAR_CATEGORIES, RadarCategoryId } from '@/lib/categories';
import { Search, X, Radio, Users } from 'lucide-react';

interface RadarHeaderProps {
  activeTab: RadarCategoryId;
  onSelectTab: (tab: RadarCategoryId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'trending' | 'open_users';
  onToggleViewMode: (mode: 'trending' | 'open_users') => void;
}

export default function RadarHeader({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
}: RadarHeaderProps) {
  return (
    <div className="w-full border-b border-neutral-900 bg-black font-mono">
      {/* Search Bar */}
      <div className="p-3 border-b border-neutral-900">
        <div className="flex items-center bg-neutral-950 border border-neutral-800 px-3 py-2">
          <span className="text-neutral-500 mr-2 text-xs font-mono">[?]</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SEARCH FREQUENCIES, USERS, TAGS..."
            className="w-full bg-transparent text-xs text-white placeholder-neutral-600 outline-none font-mono tracking-wider"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-neutral-600 hover:text-white transition-colors cursor-pointer ml-2"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher: Live Trending vs Open Nodes */}
      <div className="flex border-b border-neutral-900 px-3 py-1.5 justify-between items-center text-[10px] text-neutral-500">
        <div className="flex gap-2">
          <button
            onClick={() => onToggleViewMode('trending')}
            className={`flex items-center gap-1.5 px-2 py-1 transition-colors uppercase cursor-pointer ${
              viewMode === 'trending'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Radio className="w-3 h-3" />
            [ TELEMETRY & VELOCITY ]
          </button>
          <button
            onClick={() => onToggleViewMode('open_users')}
            className={`flex items-center gap-1.5 px-2 py-1 transition-colors uppercase cursor-pointer ${
              viewMode === 'open_users'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Users className="w-3 h-3" />
            [ OPEN NODES ]
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-neutral-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <span>AUDIO FREQUENCY ENGINE</span>
        </div>
      </div>

      {/* Ordered Category Scroll */}
      <div className="flex space-x-1 overflow-x-auto px-3 py-2 scrollbar-none">
        {RADAR_CATEGORIES.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`text-xs px-3 py-1.5 whitespace-nowrap transition-colors uppercase cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-500 hover:text-white border border-neutral-900 hover:border-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
