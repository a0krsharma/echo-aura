"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio, Volume2 } from "lucide-react";
import { subscribeToPublicRooms, type Room } from "@/lib/rooms";
import QuickRoomCard from "@/app/components/QuickRoomCard";

export default function ListenPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsub = subscribeToPublicRooms((activeRooms) => {
      setRooms(activeRooms);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <Link href="/" className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span className="text-xs tracking-widest uppercase">FREQUENCY</span>
        </Link>
        <span className="text-xs tracking-widest uppercase text-white font-bold">[ 1-TAP LISTEN ]</span>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-8">
        <div>
          <p className="text-[10px] tracking-widest text-neutral-500 uppercase mb-1 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" /> // REALTIME AUDIO RELAYS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            [ TUNE-IN CHANNELS ]
          </h1>
          <p className="text-xs text-neutral-400 tracking-wider mt-2">
            Tap any frequency to intercept audio immediately in the background dock while continuing to browse.
          </p>
        </div>

        {/* Active Broadcast Channels Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 tracking-widest uppercase font-bold">
              // LIVE FREQUENCIES ({rooms.length})
            </span>
            <Link href="/rooms" className="text-[10px] text-neutral-400 hover:text-white uppercase tracking-widest">
              VIEW DIRECTORY ➔
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="border border-neutral-900 bg-neutral-950 p-8 text-center space-y-3">
              <Radio className="w-6 h-6 text-neutral-700 mx-auto animate-pulse" />
              <p className="text-xs text-neutral-500 tracking-widest uppercase">
                NO ACTIVE AUDIO FREQUENCIES BROADCASTING RIGHT NOW.
              </p>
              <Link href="/rooms" className="inline-block mt-2 px-4 py-2 border border-white text-white text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                [ + LAUNCH FREQUENCY ]
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((r) => (
                <QuickRoomCard key={r.id} room={r} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
