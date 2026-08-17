import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * app/api/wire/telemetry/route.ts
 * ─────────────────────────────────────────────────────
 * API route to update telemetry status for messages
 * e.g., DELIVERED, IGNORED/DISMISSED, or SEEN.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messageId, threadId, status } = body;

    if (!messageId || !threadId || !status) {
      return NextResponse.json({ error: "MALFORMED_TELEMETRY_PAYLOAD" }, { status: 400 });
    }

    const db = getFirebaseDb();
    const statusUpper = String(status).toUpperCase();

    try {
      const msgRef = doc(db, "whispers", threadId, "messages", messageId);
      await updateDoc(msgRef, {
        status: statusUpper,
        telemetryStatus: statusUpper,
        updatedAt: serverTimestamp(),
      });
    } catch {
      const wireMsgRef = doc(db, "wire", threadId, "messages", messageId);
      await updateDoc(wireMsgRef, {
        status: statusUpper,
        telemetryStatus: statusUpper,
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true, status: statusUpper });
  } catch (error) {
    console.error("[TELEMETRY SYNC ERROR]:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
