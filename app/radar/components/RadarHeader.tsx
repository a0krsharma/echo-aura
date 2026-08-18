'use client';

/**
 * app/radar/components/RadarHeader.tsx
 * ─────────────────────────────────────────────────────
 * Tab navigation, regional focus switcher, and search for Echo Radar.
 */

import React from 'react';
import { RADAR_CATEGORIES, RadarCategoryId, RADAR_REGIONS, RadarRegion } from '@/lib/categories';
import { Search, X, Radio, Users, Globe } from 'lucide-react';

interface RadarHeaderProps {
  activeTab: RadarCategoryId;
  onSelectTab: (tab: RadarCategoryId) => void;
  activeRegion: RadarRegion;
  onSelectRegion: (region: RadarRegion) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'trending' | 'open_users';
  onToggleViewMode: (mode: 'trending' | 'open_users') => void;
}

export default function RadarHeader({
  activeTab,
  onSelectTab,
  activeRegion,
  onSelectRegion,
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

      {/* Mode & Regional Focus Switcher */}
      <div className="flex flex-wrap border-b border-neutral-900 px-3 py-1.5 justify-between items-center text-[10px] text-neutral-500 gap-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onToggleViewMode('trending')}
            className={`flex items-center gap-1.5 px-2 py-1 transition-colors uppercase cursor-pointer ${
              viewMode === 'trending'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Radio className="w-3 h-3" />
            [ TELEMETRY &amp; VELOCITY ]
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

        {/* Regional Focus Toggle: INDIA vs WORLD */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-neutral-600 uppercase mr-1 hidden sm:inline">FOCUS:</span>
          {RADAR_REGIONS.map((reg) => {
            const isSelected = activeRegion === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => onSelectRegion(reg.id)}
                className={`px-2 py-0.5 text-[10px] uppercase font-bold transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-white text-black border-white'
                    : 'text-neutral-500 hover:text-white border-neutral-900'
                }`}
              >
                [{reg.label}]
              </button>
            );
          })}
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
