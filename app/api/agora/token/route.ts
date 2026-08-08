import { NextRequest, NextResponse } from "next/server";
import * as AgoraToken from "agora-token";

/**
 * app/api/agora/token/route.ts
 * ─────────────────────────────────────────────────────
 * API route to generate Agora RTC tokens for secure audio connections.
 * 
 * Usage: GET /api/agora/token?channel=CHANNEL_NAME&uid=USER_ID
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channel = searchParams.get("channel");
  const uid = searchParams.get("uid");

  if (!channel || !uid) {
    return NextResponse.json(
      { error: "Missing channel or uid parameter" },
      { status: 400 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate || appCertificate === "YOUR_AGORA_CERTIFICATE_HERE") {
    return NextResponse.json(
      { error: "Agora App Certificate not configured" },
      { status: 500 }
    );
  }

  try {
    // Token expiration: 1 hour (3600 seconds)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Convert string UID to number for Agora
    const uidNumber = parseInt(uid.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000);

    // Generate RTC token for channel using agora-token package
    const token = AgoraToken.RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      uidNumber,
      AgoraToken.RtcRole.PUBLISHER,
      currentTimestamp,
      privilegeExpiredTs
    );

    return NextResponse.json({
      token,
      uid: uidNumber,
      channel,
      appId,
      expiresInSeconds: expirationTimeInSeconds,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
