"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const RoomClient = dynamic(
  () => import("./RoomClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ CONNECTING TO ROOM... ]
        </div>
      </div>
    ),
  }
);

export default function RoomClientWrapper() {
  const params = useParams();
  const roomId = params.roomId as string;
  return <RoomClient roomId={roomId} />;
}
