import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

/**
 * app/api/agora/token/route.ts
 * ─────────────────────────────────────────────────────
 * API route to generate Agora RTC tokens using agora-token library (AccessToken2 format).
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

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || "9fc4c57053244c5b9f46211616b01c4c";
  const appCertificate = (process.env.AGORA_APP_CERTIFICATE && process.env.AGORA_APP_CERTIFICATE.trim() !== "" && process.env.AGORA_APP_CERTIFICATE !== "YOUR_AGORA_CERTIFICATE_HERE")
    ? process.env.AGORA_APP_CERTIFICATE.trim()
    : "05c34a7a3e5c45678fdb54ca24cbe910";

  try {
    // Token expiration: 24 hours (86400 seconds)
    const expirationInSeconds = 86400;

    let token: string;
    let tokenType: string;

    // Try buildTokenWithUserAccount (works with string UIDs)
    try {
      token = RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate,
        channel,
        uid,
        RtcRole.PUBLISHER,
        expirationInSeconds,
        expirationInSeconds
      );
      tokenType = "account";
      console.log(`[Engine Token] Generated token for channel ${channel}, uid ${uid}`);
    } catch (accountError) {
      console.warn(`[Engine Token] Fallback token attempt with numeric uid for ${channel}`);
      const uidNumber = parseInt(uid.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000);
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        uidNumber,
        RtcRole.PUBLISHER,
        expirationInSeconds,
        expirationInSeconds
      );
      tokenType = "uid_numeric";
      console.log(`[Engine Token] Generated token for channel ${channel}, uid ${uidNumber}`);
    }

    return NextResponse.json({
      token,
      uid,
      channel,
      appId,
      expiresInSeconds: expirationInSeconds,
      mode: "token_authenticated",
      tokenType,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Engine Token] Token generation error:", error);
    
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
