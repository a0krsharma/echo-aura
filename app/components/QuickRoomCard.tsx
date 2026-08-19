"use client";

import React from "react";
import { Radio, Users, Volume2, Trash2, Clock } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { useRoomAudio } from "@/lib/context/RoomAudioContext";

interface QuickRoomCardProps {
  room: Room;
  isHost?: boolean;
  onDelete?: () => void;
}

function formatRemainingTtl(expiresAt: any): string | null {
  if (!expiresAt) return null;
  try {
    const expireMs = typeof expiresAt.toDate === "function" 
      ? expiresAt.toDate().getTime() 
      : expiresAt.seconds 
        ? expiresAt.seconds * 1000 
        : new Date(expiresAt).getTime();
    
    const diffMs = expireMs - Date.now();
    if (diffMs <= 0) return "EXPIRED";
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}H ${remMins}M LEFT`;
    }
    return `${mins}M LEFT`;
  } catch {
    return null;
  }
}

export default function QuickRoomCard({ room, isHost, onDelete }: QuickRoomCardProps) {
  const { activeRoomId, tuneIn } = useRoomAudio();
  const isActive = activeRoomId === room.id;
  const ttlString = formatRemainingTtl(room.expiresAt);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tuneIn(room.id, room);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to end and delete "${room.name}"?`)) {
      if (onDelete) onDelete();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer border p-3.5 font-mono transition-all select-none space-y-2 ${
        isActive
          ? "border-white bg-neutral-900 shadow-xl"
          : "border-neutral-800 bg-neutral-950 hover:border-neutral-500 active:bg-neutral-900"
      }`}
    >
      {/* Top Telemetry Header */}
      <div className="flex justify-between items-center text-[10px] text-neutral-400 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="uppercase tracking-wider">
            [{room.category || "STAGE"}] • {room.hostHandle || "@ANON"}
          </span>
          {room.broadcastEngine === "SPOTIFY" && (
            <span className="bg-[#1DB954] text-black font-extrabold px-1.5 py-0.2 uppercase text-[9px]">
              SPOTIFY SYNC
            </span>
          )}
          {room.broadcastEngine === "NEURAL_RADIO" && (
            <span className="bg-amber-400 text-black font-extrabold px-1.5 py-0.2 uppercase text-[9px]">
              ⚡ NEURAL RADIO
            </span>
          )}
          {ttlString && (
            <span className="text-[9px] border border-neutral-800 bg-black px-1.5 py-0.2 text-neutral-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {ttlString}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isHost && onDelete && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-white border border-red-900/80 bg-red-950/40 hover:bg-red-900 px-1.5 py-0.5 uppercase tracking-wider transition-colors cursor-pointer"
              title="Delete and end this live frequency"
            >
              <Trash2 size={10} />
              <span>[ DELETE ]</span>
            </button>
          )}
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white animate-ping" : "bg-white"}`} />
            {room.participantCount || 1} NODES
          </span>
        </div>
      </div>

      {/* Room Title */}
      <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight line-clamp-1">
        {room.name}
      </h3>

      {/* Description if present */}
      {room.description && (
        <p className="text-[11px] text-neutral-400 line-clamp-1">
          {room.description}
        </p>
      )}

      {/* Bottom Status & Action Bar */}
      <div className="mt-2.5 flex justify-between items-center pt-2 border-t border-neutral-900 text-[10px]">
        <span className="text-neutral-500">
          {isActive ? ">> TUNED IN & STREAMING" : ">> 1-TAP INSTANT TUNE-IN"}
        </span>
        <span className={`font-bold uppercase tracking-wider ${isActive ? "text-white underline" : "text-neutral-300"}`}>
          {isActive ? "[ ACTIVE 🔊 ]" : "[ TUNE IN ]"}
        </span>
      </div>
    </div>
  );
}
