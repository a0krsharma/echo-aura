"use client";

/**
 * ECHO — Echo Rooms ( /rooms )
 * Live group audio listening sessions & stage relays.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mic2, Volume2, Users, Lock, Radio, Swords } from "lucide-react";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";

export default function RoomsPage() {
  const [liveClashes, setLiveClashes] = useState<ClashItem[]>([]);

  useEffect(() => {
    const unsub = subscribeToClashes((list) => {
      setLiveClashes(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 flex flex-col font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">LIVE ROOMS</span>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-10 w-full flex-1">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">// LIVE AUDIO ROOMS & RELAYS</p>
          <h1 className="font-serif italic text-3xl text-white">
            Listen in. Zero filter.
          </h1>
        </div>

        {liveClashes.length === 0 ? (
          <div className="border border-neutral-900 p-8 text-center space-y-4">
            <Radio className="w-8 h-8 text-neutral-700 mx-auto" />
            <div className="space-y-1">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO LIVE ROOMS ACTIVE RIGHT NOW.
              </p>
              <p className="font-serif italic text-neutral-700 text-sm">
                Launch a debate on The Stage or start a stream to open a live frequency.
              </p>
            </div>
            <Link
              href="/clash"
              className="inline-block px-5 py-2.5 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
            >
              [ ⚔ LAUNCH STAGE ROOM ]
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-900 border border-neutral-900 p-4 space-y-4">
            {liveClashes.map((c) => (
              <div key={c.id} className="py-4 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span className="text-white font-bold">{c.title}</span>
                  </div>
                  <span className="text-neutral-500">
                    {c.listeners ? `${c.listeners * 12} AUDIENCE` : "1.4K AUDIENCE"}
                  </span>
                </div>
                <p className="font-serif italic text-neutral-300">"{c.topic}"</p>
                <div className="pt-2">
                  <Link
                    href={`/stage/${c.id}`}
                    className="font-mono text-xs border border-white px-3 py-1.5 text-white hover:bg-white hover:text-black uppercase transition-colors inline-block"
                  >
                    [ 🎧 JOIN ROOM RELAY ]
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
