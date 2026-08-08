/**
 * lib/agora.ts
 * ─────────────────────────────────────────────────────
 * Agora Live Audio Configuration Helper.
 * App ID: 9fc4c57053244c5b9f46211616b01c4c
 */

export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "9fc4c57053244c5b9f46211616b01c4c";

export interface AgoraRoomConfig {
  appId: string;
  channelName: string;
  token: string | null;
  uid: number | string;
}

/**
 * fetchAgoraToken
 * Fetches a secure token from the API route for a given channel and user.
 */
export async function fetchAgoraToken(channelName: string, uid: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/agora/token?channel=${channelName}&uid=${uid}`);
    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error("Failed to fetch Agora token:", error);
    return null;
  }
}

/**
 * getAgoraConfig
 * Returns the Agora App ID and channel details for initializing RTC client.
 * Note: Token is now fetched dynamically via fetchAgoraToken for security.
 */
export function getAgoraConfig(channelName: string, uid: string | number): AgoraRoomConfig {
  return {
    appId: AGORA_APP_ID,
    channelName,
    token: null, // Token fetched dynamically for security
    uid,
  };
}
