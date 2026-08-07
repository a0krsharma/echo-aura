"use client";

import dynamic from "next/dynamic";

const LiveArenaClient = dynamic(
  () => import("@/app/components/LiveArenaClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ CONNECTING TO AUDIO RELAY... ]
        </div>
      </div>
    ),
  }
);

export default function StageClientWrapper({ clashId }: { clashId: string }) {
  return <LiveArenaClient clashId={clashId} />;
}
