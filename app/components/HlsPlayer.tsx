'use client';

import React from 'react';
import { Radio } from 'lucide-react';

type Props = {
  src?: string;
};

export default function HlsPlayer({ src }: Props) {
  const url = src ?? (process.env.NEXT_PUBLIC_HLS_URL as string) ?? '';

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
          <audio controls src={url} className="w-full h-10 accent-white" />
          <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
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
