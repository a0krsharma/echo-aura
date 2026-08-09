"use client";

/**
 * app/room/[roomId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Room participation page with Agora audio integration
 */

import RoomClientWrapper from "./RoomClientWrapper";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  return <RoomClientWrapper />;
}
