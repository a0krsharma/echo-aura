"use client";

/**
 * app/components/spaces/StagePresentationBar.tsx
 * ─────────────────────────────────────────────────────
 * Top Stage Presentation & Speaker Spotlight Dock
 * Direct fidelity to Remo / Gather keynote halls:
 * - Stage speaker tiles with video/avatar, live audio halos, and nameplates
 * - "Start Presenting" / "Step onto Stage" broadcaster button
 * - Live screen share preview
 * - Floor elevator selector ("Floor 1 ˅") & Event Map trigger
 */

import React, { useState } from "react";
import {
  Tv,
  Mic,
  Radio,
  Layers,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StageSpeaker } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface StagePresentationBarProps {
  spaceTitle: string;
  isHost: boolean;
  currentFloor: string;
  onSelectFloor: (floor: string) => void;
  speakers?: StageSpeaker[];
  isPresenting?: boolean;
  onTogglePresenting?: () => void;
  activeScreenStream?: MediaStream | null;
  onOpenMap?: () => void;
}

export function StagePresentationBar({
  spaceTitle,
  isHost,
  currentFloor,
  onSelectFloor,
  speakers = [
    {
      uid: "samuel_lee",
      name: "Samuel Lee",
      roleTitle: "Head of Product",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      isSpeaking: true,
      isPresenting: true,
    },
    {
      uid: "sophia_gilbert",
      name: "Sophia Gilbert",
      roleTitle: "Creative Director",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      isSpeaking: false,
      isPresenting: true,
    },
    {
      uid: "mary_gilbert",
      name: "Mary Gilbert",
      roleTitle: "Visual Strategist",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      isSpeaking: false,
      isPresenting: true,
    },
    {
      uid: "william_jones",
      name: "William Jones",
      roleTitle: "Keynote Speaker",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      isSpeaking: false,
      isPresenting: true,
    },
    {
      uid: "matt_jordan",
      name: "Matt Jordan",
      roleTitle: "Panelist",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
      isSpeaking: false,
      isPresenting: true,
    },
  ],
  isPresenting = false,
  onTogglePresenting,
  activeScreenStream,
  onOpenMap,
}: StagePresentationBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  return (
    <div className="w-full bg-neutral-950/95 border-b border-neutral-800/80 backdrop-blur-xl transition-all z-20 shrink-0">
      {/* Top Bar Controls */}
      <div className="px-3 sm:px-6 py-2 flex items-center justify-between border-b border-neutral-900/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[11px] font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>STAGE LIVE</span>
          </div>

          <span className="font-mono text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md hidden md:inline">
            {spaceTitle}
          </span>
        </div>

        {/* Center/Right: Presenter Trigger & Floor Jumps */}
        <div className="flex items-center gap-2">
          {/* Start Presenting Broadcaster Button */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(5);
              onTogglePresenting?.();
            }}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isPresenting
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black shadow-cyan-500/20 active:scale-95"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isPresenting ? "Leave Stage" : "Start Presenting"}</span>
          </button>

          {/* Event Map Button */}
          <button
            onClick={() => {
              spacesSfx.playKeyNote(1);
              onOpenMap?.();
            }}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-mono text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Event Map</span>
          </button>

          {/* Floor Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFloorDropdownOpen(!floorDropdownOpen)}
              className="px-2.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Floor {currentFloor}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {floorDropdownOpen && (
              <div className="absolute top-10 right-0 w-36 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-in zoom-in-95 space-y-1">
                {["1st", "3rd", "4th", "ROOF"].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => {
                      onSelectFloor(fl);
                      setFloorDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono font-bold transition cursor-pointer flex items-center justify-between ${
                      currentFloor === fl
                        ? "bg-cyan-500 text-black"
                        : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    <span>Floor {fl}</span>
                    {currentFloor === fl && <span className="text-[10px]">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={collapsed ? "Expand Stage Speakers" : "Collapse Stage Speakers"}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Presenter Video Tiles Row (Image 1 Fidelity) */}
      {!collapsed && (
        <div className="px-3 sm:px-6 py-2.5 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {speakers.map((spk) => (
            <div
              key={spk.uid}
              className={`relative flex-shrink-0 w-36 sm:w-44 h-24 sm:h-28 rounded-2xl overflow-hidden border transition-all ${
                spk.isSpeaking
                  ? "border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10"
                  : "border-neutral-800 bg-neutral-900/60"
              }`}
            >
              {/* Speaker Video / Portrait */}
              {spk.avatarUrl ? (
                <img
                  src={spk.avatarUrl}
                  alt={spk.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950 to-neutral-900 text-xl font-bold font-mono text-cyan-300">
                  {spk.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Dim gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

              {/* Speaking audio wave indicator */}
              {spk.isSpeaking && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-emerald-950/80 border border-emerald-500/60 px-1.5 py-0.5 rounded-md text-[10px] text-emerald-300 font-mono">
                  <span className="w-1 h-2 bg-emerald-400 animate-pulse" />
                  <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                  <span className="w-1 h-1.5 bg-emerald-400 animate-pulse delay-150" />
                </div>
              )}

              {/* Presenter Name Tagplate */}
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                <div className="truncate">
                  <div className="text-[11px] font-mono font-bold text-white truncate leading-tight">
                    {spk.name}
                  </div>
                  {spk.roleTitle && (
                    <div className="text-[9px] font-mono text-neutral-400 truncate leading-tight">
                      {spk.roleTitle}
                    </div>
                  )}
                </div>
                <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-[9px] text-emerald-400 shrink-0">
                  <Mic className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Screen Share Tile if Active */}
          {activeScreenStream && (
            <div className="relative flex-shrink-0 w-44 sm:w-56 h-24 sm:h-28 rounded-2xl overflow-hidden border border-purple-500/60 bg-black shadow-lg shadow-purple-500/20">
              <video
                ref={(node) => {
                  if (node && activeScreenStream && node.srcObject !== activeScreenStream) {
                    node.srcObject = activeScreenStream;
                    node.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-500/60 text-purple-300 text-[9px] font-mono font-bold flex items-center gap-1">
                <Tv className="w-2.5 h-2.5" />
                <span>Screen Stream</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
