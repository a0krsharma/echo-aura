import { NextRequest, NextResponse } from "next/server";

/**
 * app/api/agora/chat/token/route.ts
 * ─────────────────────────────────────────────────────
 * API route to generate Agora Chat tokens for secure messaging.
 * 
 * Usage: GET /api/agora/chat/token?username=USERNAME
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Missing username parameter" },
      { status: 400 }
    );
  }

  const APP_NAME = process.env.NEXT_PUBLIC_AGORA_CHAT_APP_ID;
  const ORG_NAME = process.env.AGORA_CHAT_ORG_NAME;
  const APP_KEY = process.env.NEXT_PUBLIC_AGORA_CHAT_APP_KEY;

  if (!APP_NAME || !ORG_NAME || !APP_KEY) {
    return NextResponse.json(
      { error: "Agora Chat credentials not configured" },
      { status: 500 }
    );
  }

  try {
    // For now, return a simple token format
    // In production, this should use proper token generation
    const tokenData = `${APP_NAME}#${username}`;
    
    return NextResponse.json({
      token: tokenData,
      username,
      appName: APP_NAME,
      orgName: ORG_NAME,
    });
  } catch (error) {
    console.error("Chat token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate chat token" },
      { status: 500 }
    );
  }
}
