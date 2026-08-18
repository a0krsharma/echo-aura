"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Mic, MicOff, Hand, X, Radio, Volume2 } from "lucide-react";
import { useRoomAudio } from "@/lib/context/RoomAudioContext";

export default function PersistentRoomDock() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeRoomId,
    activeRoom,
    role,
    isMuted,
    handRaised,
    speakerCount,
    toggleMic,
    toggleHandRaise,
    disconnect,
  } = useRoomAudio();

  // Hide the dock if no active room or if user is already on the dedicated room page
  if (!activeRoomId || pathname === `/room/${activeRoomId}`) {
    return null;
  }

  const roomTitle = activeRoom?.name || "LIVE AUDIO FREQUENCY";
  const hostHandle = activeRoom?.hostHandle || "@ANON";
  const category = activeRoom?.category || "STAGE";

  const handleExpand = () => {
    router.push(`/room/${activeRoomId}`);
  };

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMic();
  };

  const handleHandRaiseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleHandRaise();
  };

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnect();
  };

  return (
    <aside
      aria-label="Active Live Audio Stream"
      className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 px-3 font-mono animate-slide-up select-none pointer-events-auto"
    >
      <div
        onClick={handleExpand}
        className="max-w-xl mx-auto bg-black border border-white p-2.5 flex items-center justify-between shadow-2xl hover:border-neutral-400 transition-colors cursor-pointer"
      >
        {/* Left: Live Beacon Telemetry & Room Info */}
        <div className="flex items-center gap-2.5 overflow-hidden mr-2">
          <div className="flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-white text-black font-bold px-1 py-0.2 uppercase tracking-widest shrink-0">
                {category}
              </span>
              <p className="text-xs font-bold text-white truncate uppercase tracking-tight">
                {roomTitle}
              </p>
            </div>
            <p className="text-[10px] text-neutral-400 truncate mt-0.5">
              HOST: {hostHandle} // {role.toUpperCase()} • {speakerCount} ON STAGE
            </p>
          </div>
        </div>

        {/* Right: 1-Click Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {role === "listener" ? (
            /* Listener: 1-Tap Request to Speak */
            <button
              onClick={handleHandRaiseClick}
              className={`px-2.5 py-1 text-[10px] font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                handRaised
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-950"
              }`}
              title={handRaised ? "Cancel hand raise" : "Request mic to speak"}
            >
              <Hand className="w-3 h-3" />
              <span>{handRaised ? "[ QUEUED ]" : "[ MIC + ]"}</span>
            </button>
          ) : (
            /* Speaker/Host: 1-Tap Mute / Unmute */
            <button
              onClick={handleMicClick}
              className={`px-2.5 py-1 text-[10px] font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                isMuted
                  ? "border-neutral-700 text-neutral-400 bg-neutral-950 hover:border-white hover:text-white"
                  : "border-white bg-white text-black animate-pulse"
              }`}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{isMuted ? "[ UNMUTE ]" : "[ LIVE TX ]"}</span>
            </button>
          )}

          {/* 1-Tap Disconnect */}
          <button
            onClick={handleLeaveClick}
            className="px-2.5 py-1 text-[10px] font-bold border border-neutral-800 text-neutral-400 hover:border-red-500 hover:text-red-400 hover:bg-neutral-950 transition-colors cursor-pointer"
            title="Leave room"
          >
            [ X ]
          </button>
        </div>
      </div>
    </aside>
  );
}
