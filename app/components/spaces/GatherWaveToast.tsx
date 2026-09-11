"use client";

/**
 * app/components/spaces/GatherWaveToast.tsx
 * ─────────────────────────────────────────────────────
 * "👋 Wave Them Over" Interactive Toast (Image 4)
 * When a colleague waves at you, this notification appears with:
 * - Waving hand animation
 * - Colleague name & room
 * - 1-Click "Walk Over" button that automatically navigates to them!
 */

import React from "react";
import { Hand, ArrowRight, X } from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";

export interface WaveInvitation {
  id: string;
  senderHandle: string;
  targetX: number;
  targetY: number;
  roomName: string;
  timestamp: number;
}

interface GatherWaveToastProps {
  wave: WaveInvitation | null;
  onDismiss: () => void;
  onWalkOver: (x: number, y: number) => void;
}

export default function GatherWaveToast({
  wave,
  onDismiss,
  onWalkOver,
}: GatherWaveToastProps) {
  if (!wave) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-200">
      <div className="bg-neutral-950/95 backdrop-blur-xl border border-amber-400/60 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-sm ring-2 ring-amber-400/20">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl animate-bounce">
          👋
        </div>

        <div>
          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
            <span>{wave.senderHandle}</span>
            <span className="text-amber-400 font-normal">waved you over!</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            Join them in {wave.roomName}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={() => {
              spacesSfx.playFootstep();
              onWalkOver(wave.targetX, wave.targetY);
              onDismiss();
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-md shadow-amber-400/20"
          >
            <span>Walk Over</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
