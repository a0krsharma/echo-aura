'use client';

import React from 'react';
import { RADAR_CATEGORIES, RadarCategoryId, RADAR_REGIONS, RadarRegion } from '@/lib/categories';
import { Search, X, Radio, Users, Sparkles, Globe } from 'lucide-react';

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
    <div className="w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md font-mono">
      {/* Search Input */}
      <div className="p-3 border-b border-neutral-900">
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 py-2.5 focus-within:border-white transition-all shadow-inner">
          <Search className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search trending hashtags, voices, or topics..."
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none font-mono tracking-wide"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-neutral-500 hover:text-white transition-colors cursor-pointer ml-2"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode & Region Selector Bar */}
      <div className="flex flex-wrap border-b border-neutral-900 px-4 py-2 justify-between items-center text-xs gap-3">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-900 rounded-xl">
          <button
            onClick={() => onToggleViewMode('trending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'trending'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>TRENDING HASHTAGS</span>
          </button>
          <button
            onClick={() => onToggleViewMode('open_users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'open_users'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>LIVE AUDIO NODES</span>
          </button>
        </div>

        {/* Region Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-900 rounded-xl">
          {RADAR_REGIONS.map((reg) => {
            const isSelected = activeRegion === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => onSelectRegion(reg.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {reg.id === 'india' ? '🇮🇳 INDIA' : '🌐 GLOBAL'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex space-x-1.5 overflow-x-auto px-4 py-2.5 scrollbar-none">
        {RADAR_CATEGORIES.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`text-xs px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all uppercase cursor-pointer font-bold ${
                isActive
                  ? 'bg-white text-black font-black shadow-md scale-105'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
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
