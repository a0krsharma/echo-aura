'use client';

import React, { useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import Hls from 'hls.js';

type Props = {
  src?: string;
};

export default function HlsPlayer({ src }: Props) {
  const url = src ?? (process.env.NEXT_PUBLIC_HLS_URL as string) ?? '';
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url || !audioRef.current) return;

    let hls: Hls | null = null;
    const audio = audioRef.current;

    if (Hls.isSupported() && url.endsWith('.m3u8')) {
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
    <div className="border border-neutral-900 bg-neutral-950/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-white animate-pulse" />
          <span className="font-mono text-xs text-white tracking-widest uppercase">
            // [ LISTEN_HLS ] — CDN STREAM
          </span>
        </div>
        <span className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
          {url ? "LIVE STREAM ACTIVE" : "OFFLINE"}
        </span>
      </div>

      {url ? (
        <div className="space-y-3">
          <audio ref={audioRef} controls className="w-full h-10 accent-white" />
          <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase break-all">
            STREAM URL: {url}
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-neutral-800 p-4 text-center">
          <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
            NO HLS STREAM CONFIGURED. SET NEXT_PUBLIC_HLS_URL IN .env.local TO ENABLE CDN LISTENERS.
          </p>
        </div>
      )}
    </div>
  );
}
