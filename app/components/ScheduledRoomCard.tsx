"use client";

import React, { useState } from "react";
import { Calendar, Bell, Share2, Check, Clock } from "lucide-react";
import type { Room } from "@/lib/rooms";

interface ScheduledRoomCardProps {
  room: Room;
  isHost?: boolean;
  onDelete?: () => void;
  onStartNow?: () => void;
}

export function ScheduledRoomCard({ room, isHost, onDelete, onStartNow }: ScheduledRoomCardProps) {
  const [alarmSet, setAlarmSet] = useState(false);
  const [shared, setShared] = useState(false);

  const formattedTime = (() => {
    if (!room.scheduledFor) return "UPCOMING TRANSMISSION";
    try {
      const s = room.scheduledFor as any;
      const date = typeof s?.toDate === "function" ? s.toDate() : s?.seconds ? new Date(s.seconds * 1000) : new Date(String(s));
      return date.toUTCString().replace(":00 GMT", " UTC");
    } catch {
      return "SCHEDULED TRANSMISSION";
    }
  })();

  const handleSetAlarm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAlarmSet(!alarmSet);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/room/${room.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Echo Scheduled Room: ${room.name}`,
          text: `Scheduled live transmission by ${room.hostHandle} on Echo`,
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {}
    }
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-4 font-mono space-y-3 hover:border-neutral-600 transition-colors">
      <div className="flex justify-between items-start text-[10px] text-neutral-400">
        <span className="uppercase tracking-wider">
          HOST: {room.hostHandle || "@ANON"} // [{room.category || "GENERAL"}]
        </span>
        <span className="text-white font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-neutral-500" />
          {formattedTime}
        </span>
      </div>

      <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight line-clamp-1">
        {room.name}
      </h3>

      {room.description && (
        <p className="text-[11px] text-neutral-400 line-clamp-2">
          {room.description}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between pt-2.5 border-t border-neutral-900 text-xs">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
          {room.participantCount || 1} NODES SUBSCRIBED
        </span>
        <div className="flex items-center gap-2">
          {isHost && (
            <>
              {onStartNow && (
                <button
                  onClick={onStartNow}
                  className="px-2.5 py-1 text-[10px] font-bold border border-white bg-white text-black hover:bg-neutral-200 uppercase tracking-wider transition-colors cursor-pointer"
                  title="Launch Scheduled Room Live"
                >
                  [ GO LIVE NOW ]
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1 text-[10px] border border-red-900 text-red-400 hover:border-red-500 hover:text-red-300 transition-colors cursor-pointer"
                  title="Delete Scheduled Room"
                >
                  DELETE
                </button>
              )}
            </>
          )}
          <button
            onClick={handleShare}
            className="p-1.5 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Share scheduled frequency"
          >
            {shared ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleSetAlarm}
            className={`px-3 py-1 text-[10px] font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
              alarmSet
                ? "border-white bg-white text-black"
                : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-black"
            }`}
          >
            <Bell className="w-3 h-3" />
            <span>{alarmSet ? "[ ALARM SET ]" : "[+] SET ALARM"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
