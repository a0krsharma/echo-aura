'use client';

import React from 'react';

type Props = {
  src?: string;
};

export default function HlsPlayer({ src }: Props) {
  const url = src ?? (process.env.NEXT_PUBLIC_HLS_URL as string) ?? '';

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>HLS Listener</h2>
      {url ? (
        <audio controls src={url} style={{ width: '100%' }} />
      ) : (
        <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ margin: 0 }}>
            No HLS URL configured. Set NEXT_PUBLIC_HLS_URL in your environment (.env.local) to an HLS
            playback URL (eg. https://stream.example.com/live.m3u8).
          </p>
        </div>
      )}
    </div>
  );
}
