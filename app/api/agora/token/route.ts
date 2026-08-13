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
      { error: "Missing channel or uid parameter", details: { channel, uid } },
      { status: 400 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId) {
    // Development-friendly fallback: return a 200 with a stubbed payload so the UI can still render
    // and show helpful guidance instead of breaking with a 500. This is safe because no token
    // or secret is returned.
    console.warn("[Agora Token] App ID not configured — returning dev stub payload");
    return NextResponse.json(
      {
        token: null,
        uid,
        channel,
        appId: null,
        expiresInSeconds: 0,
        mode: "dev_stub",
        warning: "Agora App ID not configured — set NEXT_PUBLIC_AGORA_APP_ID in environment to enable real tokens",
        hint: "This response is a development stub and contains no secrets."
      },
      { status: 200 }
    );
  }

  // Validate certificate configuration
  if (!appCertificate || appCertificate.trim() === "" || appCertificate === "YOUR_AGORA_CERTIFICATE_HERE") {
    console.warn("[Agora Token] App Certificate not configured, using App ID-only authentication");
    return NextResponse.json({
      token: null,
      uid,
      channel,
      appId,
      expiresInSeconds: 3600,
      warning: "Using App ID-only authentication (no certificate configured)",
      mode: "app_id_only",
      hint: "For production, set AGORA_APP_CERTIFICATE in .env.local"
    });
  }

  try {
    // Token expiration: 1 hour (3600 seconds)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    let token: string;
    let tokenType: string;

    // Try buildTokenWithAccount first (works with string UIDs)
    try {
      token = RtcTokenBuilder.buildTokenWithAccount(
        appId,
        appCertificate,
        channel,
        uid,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );
      tokenType = "account";
      console.log(`[Agora Token] Generated token for channel ${channel}, uid ${uid} using buildTokenWithAccount`);
    } catch (accountError) {
      console.warn(`[Agora Token] buildTokenWithAccount failed: ${accountError}, trying buildTokenWithUid`);
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
      tokenType = "uid_numeric";
      console.log(`[Agora Token] Generated token for channel ${channel}, uid ${uidNumber} using buildTokenWithUid`);
    }

    return NextResponse.json({
      token,
      uid,
      channel,
      appId,
      expiresInSeconds: expirationTimeInSeconds,
      mode: "token_authenticated",
      tokenType,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Agora Token] Token generation error:", error);
    
    // Determine error type for better debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isCertificateError = errorMessage.toLowerCase().includes('certificate') || 
                               errorMessage.toLowerCase().includes('invalid');
    
    if (isCertificateError) {
      return NextResponse.json({
        token: null,
        uid,
        channel,
        appId,
        expiresInSeconds: 3600,
        error: "Certificate validation failed",
        warning: "Using App ID-only authentication (certificate error)",
        mode: "app_id_only",
        details: errorMessage
      });
    }
    
    // Fallback: Return null token for App ID-only auth on other errors
    return NextResponse.json({
      token: null,
      uid,
      channel,
      appId,
      expiresInSeconds: 3600,
      error: "Token generation failed",
      warning: "Using App ID-only authentication (fallback)",
      mode: "app_id_only",
      details: errorMessage
    });
  }
}
