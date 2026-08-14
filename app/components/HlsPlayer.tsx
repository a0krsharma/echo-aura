'use client';

import React, { useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import Hls from 'hls.js';

type Props = {
  src?: string;
};

const DEFAULT_HLS_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export default function HlsPlayer({ src }: Props) {
  const url = src || (process.env.NEXT_PUBLIC_HLS_URL as string) || DEFAULT_HLS_STREAM;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url || !audioRef.current) return;

    let hls: Hls | null = null;
    const audio = audioRef.current;

    if (Hls.isSupported() && url.includes('.m3u8')) {
      hls = new Hls({
        autoStartLoad: true,
        startPosition: -1,
      });
      hls.loadSource(url);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
    } else {
      audio.src = url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <div className="border border-neutral-800 bg-neutral-950/80 p-6 space-y-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-white tracking-widest uppercase font-semibold">
            🎧 LIVE AUDIO PLAYER
          </span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 border border-emerald-950 bg-emerald-950/50 px-2 py-0.5 rounded tracking-widest uppercase font-mono">
          {url ? "BROADCAST ONLINE 🟢" : "OFFLINE"}
        </span>
      </div>

      {url ? (
        <div className="space-y-3">
          <audio ref={audioRef} controls autoPlay className="w-full h-11 accent-emerald-500 rounded" />
          <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
            STATUS: STREAMING LIVE • CLICK PLAY IF AUDIO DOES NOT AUTO-START
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-neutral-800 p-4 text-center">
          <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
            NO BROADCAST STREAM AVAILABLE RIGHT NOW.
          </p>
        </div>
      )}
    </div>
  );
}
