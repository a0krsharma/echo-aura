"use client";

/**
 * app/components/spaces/MiniMapRadar.tsx
 * ─────────────────────────────────────────────────────
 * High-precision Birds-Eye Radar Mini-Map
 * - Schematic layout of Gather campus zones
 * - Real-time attendee radar blips
 * - Click-to-teleport navigator
 * - Collapsible glassmorphism HUD widget
 */

import React, { useState } from "react";
import { Compass, ChevronDown, ChevronUp, MapPin, Users } from "lucide-react";
import { SpatialAvatar, SPACES_ZONES, SpaceZoneId } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface MiniMapRadarProps {
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onTeleport: (x: number, y: number) => void;
}

const WORLD_W = 1600;
const WORLD_H = 1000;
const MAP_W = 160;
const MAP_H = 100;

export default function MiniMapRadar({
  localAvatar,
  remoteAvatars,
  onTeleport,
}: MiniMapRadarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Convert world (x, y) to map (x, y)
  const toMapCoord = (x: number, y: number) => ({
    x: Math.max(4, Math.min(MAP_W - 4, (x / WORLD_W) * MAP_W)),
    y: Math.max(4, Math.min(MAP_H - 4, (y / WORLD_H) * MAP_H)),
  });

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = Math.round((clickX / MAP_W) * WORLD_W);
    const worldY = Math.round((clickY / MAP_H) * WORLD_H);
    spacesSfx.playKeyNote(3);
    onTeleport(worldX, worldY);
  };

  const localPos = toMapCoord(localAvatar.x, localAvatar.y);

  return (
    <div className="fixed top-14 right-4 z-30 flex flex-col items-end gap-1 select-none pointer-events-auto">
      {/* Header Pill */}
      <button
        onClick={() => {
          spacesSfx.playSitPop();
          setIsExpanded(!isExpanded);
        }}
        className="px-2.5 py-1 rounded-xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
        title="Toggle Radar Mini-Map"
      >
        <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
        <span>RADAR</span>
        <span className="text-[9px] text-neutral-500 flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5" />
          {remoteAvatars.length + 1}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-neutral-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-400" />
        )}
      </button>

      {/* Mini-Map Canvas Box */}
      {isExpanded && (
        <div
          onClick={handleMapClick}
          className="relative bg-neutral-950/95 border border-neutral-800 rounded-2xl shadow-2xl p-1 backdrop-blur-md cursor-crosshair overflow-hidden group transition-all"
          style={{ width: MAP_W, height: MAP_H }}
          title="Click anywhere to fast-travel"
        >
          {/* Schematic Room Zones */}
          {/* Top Park */}
          <div
            className="absolute bg-emerald-950/30 border border-emerald-800/30 rounded"
            style={{ left: 5, top: 4, width: 80, height: 20 }}
            title="Outdoor Park & Campfire"
          >
            <span className="text-[8px] font-mono text-emerald-400 pl-1">Park</span>
          </div>

          {/* Fountain Room */}
          <div
            className="absolute bg-amber-950/30 border border-amber-800/30 rounded"
            style={{ left: 88, top: 4, width: 66, height: 48 }}
            title="Fountain Room"
          >
            <span className="text-[8px] font-mono text-amber-400 pl-1">⛲ Fountain</span>
          </div>

          {/* Workstation Pods */}
          <div
            className="absolute bg-cyan-950/30 border border-cyan-800/30 rounded"
            style={{ left: 5, top: 28, width: 80, height: 26 }}
            title="Workstation Pods"
          >
            <span className="text-[8px] font-mono text-cyan-400 pl-1">Desks</span>
          </div>

          {/* Arcade */}
          <div
            className="absolute bg-rose-950/30 border border-rose-800/30 rounded"
            style={{ left: 36, top: 38, width: 22, height: 14 }}
            title="Retro Arcade"
          >
            <span className="text-[7px] font-mono text-rose-400 pl-0.5">🕹️</span>
          </div>

          {/* Library */}
          <div
            className="absolute bg-purple-950/30 border border-purple-800/30 rounded"
            style={{ left: 110, top: 22, width: 36, height: 26 }}
            title="Silent Library"
          >
            <span className="text-[7px] font-mono text-purple-400 pl-1">📚</span>
          </div>

          {/* Concert & Debate */}
          <div
            className="absolute bg-indigo-950/30 border border-indigo-800/30 rounded"
            style={{ left: 5, top: 58, width: 148, height: 36 }}
            title="Amphitheater, Jam Studio & Debate"
          >
            <span className="text-[8px] font-mono text-indigo-400 pl-1">🎤 Stage & Arena</span>
          </div>

          {/* Remote Friends Dots */}
          {remoteAvatars.map((rem) => {
            const p = toMapCoord(rem.x, rem.y);
            return (
              <div
                key={rem.uid}
                className="absolute w-2 h-2 rounded-full bg-pink-500 border border-white transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
                style={{ left: p.x, top: p.y }}
                title={rem.handle}
              />
            );
          })}

          {/* Local Player Dot (Pulsing Cyan) */}
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white transform -translate-x-1/2 -translate-y-1/2 shadow-md shadow-cyan-500 animate-pulse z-10"
            style={{ left: localPos.x, top: localPos.y }}
            title="You"
          />

          {/* Crosshair on Hover */}
          <div className="absolute bottom-1 right-1 text-[8px] font-mono text-neutral-500 group-hover:text-cyan-400">
            Click to warp
          </div>
        </div>
      )}
    </div>
  );
}
