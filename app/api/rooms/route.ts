/**
 * app/api/rooms/route.ts
 * ─────────────────────────────────────────────────────
 * API endpoint for room management
 * POST: Create a new room
 * GET: List public rooms
 */

import { NextRequest, NextResponse } from "next/server";
import { createRoom, getPublicRooms } from "@/lib/rooms";
import { Timestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("API received room creation request:", body);
    const { name, description, hostUid, hostHandle, maxParticipants, isPublic, category, tags, scheduledFor, openMic, broadcastEngine, lifespanHours } = body;

    // Validation
    if (!name || !hostUid || !hostHandle) {
      console.error("Missing required fields:", { name, hostUid, hostHandle });
      return NextResponse.json(
        { error: "Missing required fields: name, hostUid, hostHandle" },
        { status: 400 }
      );
    }

    if (name.length < 3 || name.length > 50) {
      console.error("Invalid name length:", name.length);
      return NextResponse.json(
        { error: "Room name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    if (description && description.length > 200) {
      console.error("Invalid description length:", description.length);
      return NextResponse.json(
        { error: "Description must be less than 200 characters" },
        { status: 400 }
      );
    }

    console.log("Calling createRoom function...");
    const roomId = await createRoom({
      name: name.trim(),
      description: description?.trim() || "",
      hostUid,
      hostHandle,
      maxParticipants: maxParticipants || 50,
      isPublic: isPublic !== false,
      category: category || "GENERAL",
      tags: tags || [],
      scheduledFor: scheduledFor ? Timestamp.fromDate(new Date(scheduledFor)) : null,
      openMic: openMic || false,
      broadcastEngine: broadcastEngine || "STAGE",
      lifespanHours: Number(lifespanHours) || 2,
    });

    console.log("Room created successfully:", roomId);
    return NextResponse.json({ roomId, success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rooms = await getPublicRooms();
    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
