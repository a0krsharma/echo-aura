import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

/**
 * app/api/agora/token/route.ts
 * ─────────────────────────────────────────────────────
 * API route to generate Agora RTC tokens using agora-access-token library.
 * This is the proper library for Agora token generation.
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

  if (!appId) {
    return NextResponse.json(
      { error: "Agora App ID not configured" },
      { status: 500 }
    );
  }

  // If certificate is not configured, use App ID-only authentication
  if (!appCertificate || appCertificate === "YOUR_AGORA_CERTIFICATE_HERE") {
    console.log("Agora App Certificate not configured, using App ID-only authentication");
    return NextResponse.json({
      token: null,
      uid,
      channel,
      appId,
      expiresInSeconds: 3600,
      warning: "Using App ID-only authentication (no certificate configured)",
    });
  }

  try {
    // Token expiration: 1 hour (3600 seconds)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Try buildTokenWithAccount first (works with string UIDs)
    let token: string;
    try {
      token = RtcTokenBuilder.buildTokenWithAccount(
        appId,
        appCertificate,
        channel,
        uid,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );
    } catch (accountError) {
      console.log("buildTokenWithAccount failed, trying buildTokenWithUid");
      // Fallback to buildTokenWithUid with numeric UID
      const uidNumber = parseInt(uid.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000);
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        uidNumber,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );
    }

    return NextResponse.json({
      token,
      uid,
      channel,
      appId,
      expiresInSeconds: expirationTimeInSeconds,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    
    // Fallback: Return null token for App ID-only auth
    return NextResponse.json({
      token: null,
      uid,
      channel,
      appId,
      expiresInSeconds: 3600,
      warning: "Using App ID-only authentication (token generation failed)",
    });
  }
}
