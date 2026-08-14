"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Radio, Volume2, Users, ShieldAlert } from 'lucide-react';
import HlsPlayer from '../components/HlsPlayer';
import { subscribeToPublicRooms, type Room } from '@/lib/rooms';

export default function ListenPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    const unsub = subscribeToPublicRooms((activeRooms) => {
      setRooms(activeRooms);
      if (activeRooms.length > 0 && !selectedRoom) {
        // Default to first room with transmitUrl if available
        const transmitting = activeRooms.find((r) => r.transmitEnabled && r.transmitUrl);
        if (transmitting) setSelectedRoom(transmitting);
      }
    });
    return () => unsub();
  }, [selectedRoom]);

  const activeStreamUrl = selectedRoom?.transmitUrl || undefined;

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span className="font-mono text-xs tracking-widest uppercase">FREQUENCY</span>
        </Link>
        <span className="font-mono text-xs tracking-widest uppercase text-white">[ LISTEN ]</span>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-8">
        <div>
          <p className="font-mono text-xs tracking-widest text-emerald-400 uppercase mb-2 flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce" /> // LIVE AUDIO CHANNELS
          </p>
          <h1 className="font-serif italic text-3xl text-white">
            Listen Live
          </h1>
          <p className="font-mono text-xs text-neutral-400 tracking-widest mt-2">
            Select any room below to listen instantly right here without leaving the page.
          </p>
        </div>

        {/* Selected Room Header if applicable */}
        {selectedRoom && (
          <div className="border border-emerald-800/60 bg-emerald-950/20 p-4 rounded-lg flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 font-semibold">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>NOW PLAYING: {selectedRoom.name}</span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400 mt-1 uppercase">
                HOST: {selectedRoom.hostHandle} • {selectedRoom.participantCount} LISTENERS IN ROOM
              </p>
            </div>
            <Link
              href={`/room/${selectedRoom.id}`}
              className="px-3 py-1.5 text-xs font-mono border border-neutral-700 bg-neutral-900 hover:border-white transition-colors rounded"
            >
              JOIN STAGE 🎙️
            </Link>
          </div>
        )}

        {/* Primary HLS Audio Player */}
        <HlsPlayer src={activeStreamUrl} />

        {/* Active Broadcast Channels Directory */}
        <div className="space-y-4 pt-4 border-t border-neutral-900">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-400 tracking-widest uppercase font-semibold">
              // ACTIVE ROOMS ({rooms.length})
            </span>
            <Link href="/rooms" className="font-mono text-xs text-neutral-400 hover:text-white underline uppercase">
              ALL ROOMS
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="border border-dashed border-neutral-900 p-6 text-center rounded-lg">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO LIVE ROOMS AT THE MOMENT.
              </p>
              <Link href="/rooms" className="inline-block mt-3 px-4 py-2 font-mono text-xs border border-neutral-800 hover:border-white rounded">
                START A ROOM ➔
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((r) => {
                const isSelected = selectedRoom?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoom(r)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 shadow-md'
                        : 'border-neutral-900 bg-neutral-950 hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white font-semibold">{r.name}</span>
                          {r.transmitEnabled && (
                            <span className="px-2 py-0.5 font-mono text-[9px] bg-red-950 text-red-400 border border-red-800 uppercase tracking-widest rounded">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-neutral-400">
                          {r.hostHandle} • {r.description || "Audio Lounge"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <div className="flex items-center gap-1 font-mono text-xs text-neutral-400 mr-2">
                          <Users size={13} />
                          <span>{r.participantCount}</span>
                        </div>

                        {/* In-place Listen Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoom(r);
                          }}
                          className={`px-3 py-1.5 text-xs font-mono border rounded transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-emerald-500 hover:text-emerald-400'
                          }`}
                        >
                          <Volume2 size={13} />
                          {isSelected ? 'PLAYING 🔊' : 'LISTEN LIVE 🎧'}
                        </button>

                        {/* Optional Join Stage Link */}
                        <Link
                          href={`/room/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 text-xs font-mono border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 rounded"
                          title="Join room as participant/speaker"
                        >
                          JOIN 🎙️
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
