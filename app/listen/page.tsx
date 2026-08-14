"use client";

import React from 'react';
import HlsPlayer from '../components/HlsPlayer';

export default function ListenPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Listen (HLS)</h1>
      <p style={{ color: '#6b7280' }}>
        Listeners should use the HLS player to avoid staying on the low-latency Agora RTC channel.
        Ensure NEXT_PUBLIC_HLS_URL is set in .env.local.
      </p>
      <HlsPlayer />
    </main>
  );
}
