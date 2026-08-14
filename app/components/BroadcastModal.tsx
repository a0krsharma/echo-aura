"use client";

import React, { useState } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (opts: { adminKey?: string; rtmpUrl?: string }) => Promise<void>;
}

export default function BroadcastModal({ visible, onClose, onStart }: Props) {
  const [adminKey, setAdminKey] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md p-6 bg-[#070707] border border-neutral-800 rounded">
        <h3 className="font-mono text-sm mb-3">Start Broadcast</h3>
        <p className="text-xs text-neutral-400 mb-4">Provide optional admin key or RTMP ingest URL to start a broadcast. If server requires verification, supply ADMIN key.</p>

        <label className="block text-xs text-neutral-500">RTMP Ingest URL</label>
        <input value={rtmpUrl} onChange={(e) => setRtmpUrl(e.target.value)} placeholder="rtmp://live.example.com/app/STREAMKEY" className="w-full mb-3 p-2 bg-black border border-neutral-800 text-sm" />

        <label className="block text-xs text-neutral-500">Admin Key (optional)</label>
        <input value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="x-admin-key" className="w-full mb-4 p-2 bg-black border border-neutral-800 text-sm" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost btn-small">Cancel</button>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                await onStart({ adminKey: adminKey || undefined, rtmpUrl: rtmpUrl || undefined });
                onClose();
              } catch (e) {
                alert('Start failed: ' + String(e));
              } finally {
                setLoading(false);
              }
            }}
            className="btn-primary btn-small"
            disabled={loading}
          >{loading ? 'Starting...' : 'Start Broadcast'}</button>
        </div>
      </div>
    </div>
  );
}
