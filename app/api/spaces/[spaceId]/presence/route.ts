import { NextRequest, NextResponse } from "next/server";
import { SpatialAvatar, SpaceTableGameLiveState } from "@/lib/spaces";

export const runtime = "nodejs";

// Server-side in-memory registry for space participants and table games
// Persists across requests within the server process
declare global {
  // eslint-disable-next-line no-var
  var __spacesPresenceRegistry: Map<
    string,
    Map<string, { avatar: SpatialAvatar; lastSeen: number }>
  > | undefined;
  // eslint-disable-next-line no-var
  var __spacesTableGameRegistry: Map<string, SpaceTableGameLiveState> | undefined;
}

if (!globalThis.__spacesPresenceRegistry) {
  globalThis.__spacesPresenceRegistry = new Map();
}
if (!globalThis.__spacesTableGameRegistry) {
  globalThis.__spacesTableGameRegistry = new Map();
}

const presenceRegistry = globalThis.__spacesPresenceRegistry;
const tableGameRegistry = globalThis.__spacesTableGameRegistry;

// Clean up participants older than 20 seconds
function getActiveParticipants(spaceId: string, excludeUid?: string): SpatialAvatar[] {
  const spaceMap = presenceRegistry.get(spaceId);
  if (!spaceMap) return [];

  const now = Date.now();
  const active: SpatialAvatar[] = [];

  for (const [uid, record] of spaceMap.entries()) {
    if (now - record.lastSeen > 20000) {
      spaceMap.delete(uid);
    } else if (uid !== excludeUid) {
      active.push(record.avatar);
    }
  }

  return active;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const excludeUid = searchParams.get("excludeUid") || undefined;

  const participants = getActiveParticipants(spaceId, excludeUid);
  const tableGame = tableGameRegistry.get(spaceId) || null;

  return NextResponse.json({
    success: true,
    participants,
    tableGame,
    count: participants.length + (excludeUid ? 1 : 0),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { avatar, tableGame, action } = body;

    // Handle user leave
    if (action === "leave" && avatar?.uid) {
      const spaceMap = presenceRegistry.get(spaceId);
      if (spaceMap) {
        spaceMap.delete(avatar.uid);
      }
      return NextResponse.json({ success: true });
    }

    // Register/update participant avatar
    if (avatar && avatar.uid) {
      if (!presenceRegistry.has(spaceId)) {
        presenceRegistry.set(spaceId, new Map());
      }
      const spaceMap = presenceRegistry.get(spaceId)!;
      spaceMap.set(avatar.uid, {
        avatar: {
          ...avatar,
          lastUpdated: Date.now(),
        },
        lastSeen: Date.now(),
      });
    }

    // Register/update table game state
    if (tableGame) {
      const existing = tableGameRegistry.get(spaceId) || ({} as SpaceTableGameLiveState);
      tableGameRegistry.set(spaceId, {
        ...existing,
        ...tableGame,
        updatedAt: Date.now(),
      });
    }

    const currentCallerUid = avatar?.uid;
    const participants = getActiveParticipants(spaceId, currentCallerUid);
    const currentTableGame = tableGameRegistry.get(spaceId) || null;

    return NextResponse.json({
      success: true,
      participants,
      tableGame: currentTableGame,
      count: participants.length + (currentCallerUid ? 1 : 0),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Invalid payload" },
      { status: 400 }
    );
  }
}
