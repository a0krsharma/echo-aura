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
 * getAgoraConfig
 * Returns the Agora App ID and channel details for initializing RTC client.
 */
export function getAgoraConfig(channelName: string, uid: string | number): AgoraRoomConfig {
  return {
    appId: AGORA_APP_ID,
    channelName,
    token: null, // Testing / Testing Mode without token requirement
    uid,
  };
}
