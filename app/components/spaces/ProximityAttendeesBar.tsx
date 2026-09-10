"use client";

import React, { useState } from "react";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import { Users, Volume2, Hand, Coffee, MapPin, Smile, MessageCircle } from "lucide-react";

interface ProximityAttendeesBarProps {
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  speakingUids?: Set<string>;
  onWalkTo?: (x: number, y: number) => void;
  onSendWave?: (handle: string) => void;
}

export default function ProximityAttendeesBar({
  localAvatar,
  remoteAvatars,
  speakingUids = new Set(),
  onWalkTo,
  onSendWave,
}: ProximityAttendeesBarProps) {
  // Filter attendees within spatial hearing range (<= 280px) or in the same private rug
  const nearbyAttendees = remoteAvatars.filter((av) => {
    if (localAvatar.activeRugId && av.activeRugId === localAvatar.activeRugId) {
      return true;
    }
    const dist = Math.hypot(localAvatar.x - av.x, localAvatar.y - av.y);
    return dist <= 280;
  });

  if (nearbyAttendees.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-neutral-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center gap-1.5 shadow-lg select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>PROXIMITY: 0 NEARBY</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-500">WALK NEAR TO CHAT</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 select-none pointer-events-auto">
      {/* Attendee Cards Row */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full p-1 scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
        {nearbyAttendees.map((peer) => {
          const distPx = Math.round(Math.hypot(localAvatar.x - peer.x, localAvatar.y - peer.y));
          const distMeters = Math.max(1, Math.round(distPx / 35));
          const isPeerSpeaking = speakingUids.has(peer.uid) || !!peer.isSpeaking;
          const outfitColor = peer.avatarConfig?.outfitColor || peer.hoodieColor || "#38bdf8";

          return (
            <div
              key={peer.uid}
              className={`relative group flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border backdrop-blur-md transition-all shadow-xl ${
                isPeerSpeaking
                  ? "bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_16px_rgba(52,211,153,0.3)]"
                  : "bg-neutral-950/85 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {/* Avatar Head with Audio Pulse Ring */}
              <div className="relative shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all border-2 ${
                    isPeerSpeaking
                      ? "border-emerald-400 scale-105 shadow-[0_0_8px_#34d399]"
                      : "border-neutral-700"
                  }`}
                  style={{ backgroundColor: outfitColor }}
                >
                  <span className="text-black text-[10px]">
                    {peer.handle.slice(1, 3).toUpperCase()}
                  </span>
                </div>

                {/* Hand Raise Badge */}
                {peer.isHandRaised && (
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md animate-bounce"
                    title="Hand Raised"
                  >
                    ✋
                  </span>
                )}

                {/* Coffee Badge */}
                {peer.hasCoffee && (
                  <span
                    className="absolute -bottom-1 -right-1 bg-amber-900 border border-amber-500 text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    title="Holding Coffee"
                  >
                    ☕
                  </span>
                )}
              </div>

              {/* Info: Handle & Proximity Distance */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-bold text-white truncate max-w-[80px]">
                    {peer.handle}
                  </span>
                  {isPeerSpeaking && (
                    <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono text-neutral-400">
                  <span>~{distMeters}m</span>
                  {peer.activeRugId && (
                    <span className="text-cyan-400 font-bold">🔒 RUG</span>
                  )}
                </div>
              </div>

              {/* Quick Action Buttons (Icon-First) */}
              <div className="flex items-center gap-1 border-l border-neutral-800 pl-1.5">
                {/* Wave Action */}
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playEmotePop();
                    onSendWave?.(peer.handle);
                  }}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title={`Wave at ${peer.handle}`}
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>

                {/* Walk to / Locate */}
                <button
                  type="button"
                  onClick={() => {
                    spacesSfx.playFootstep();
                    onWalkTo?.(peer.x, peer.y);
                  }}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-cyan-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title={`Walk to ${peer.handle}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
