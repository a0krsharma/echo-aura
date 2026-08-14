"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HlsPlayer from '../components/HlsPlayer';

export default function ListenPage() {
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
          <p className="font-mono text-xs tracking-widest text-neutral-700 uppercase mb-2">
            // LOW-COST AUDIENCE BROADCAST
          </p>
          <h1 className="font-serif italic text-3xl text-white">
            Passive Listener Channel
          </h1>
          <p className="font-mono text-xs text-neutral-500 tracking-widest mt-2">
            Listeners use HLS stream delivery via CDN to optimize RTC bandwidth.
          </p>
        </div>

        <HlsPlayer />
      </main>
    </div>
  );
}
