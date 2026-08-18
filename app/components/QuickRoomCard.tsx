"use client";

import React from "react";
import { Radio, Users, Volume2, Trash2 } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { useRoomAudio } from "@/lib/context/RoomAudioContext";

interface QuickRoomCardProps {
  room: Room;
  isHost?: boolean;
  onDelete?: () => void;
}

export default function QuickRoomCard({ room, isHost, onDelete }: QuickRoomCardProps) {
  const { activeRoomId, tuneIn } = useRoomAudio();
  const isActive = activeRoomId === room.id;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tuneIn(room.id, room);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
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
      <div className="flex justify-between items-center text-[10px] text-neutral-400">
        <span className="uppercase tracking-wider">
          [{room.category || "STAGE"}] • {room.hostHandle || "@ANON"}
        </span>
        <div className="flex items-center gap-2">
          {isHost && onDelete && (
            <button
              onClick={handleDeleteClick}
              className="text-red-500 hover:text-red-300 p-0.5 transition-colors cursor-pointer"
              title="Delete Frequency"
            >
              <Trash2 size={12} />
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
