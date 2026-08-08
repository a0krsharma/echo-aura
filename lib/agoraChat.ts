/**
 * lib/agoraChat.ts
 * ─────────────────────────────────────────────────────
 * Agora Chat SDK initialization and management.
 * Integrates with Firebase Auth using Firebase Auth UID as Chat user ID.
 * 
 * NOTE: Chat integration temporarily disabled due to SDK compatibility issues.
 * Will be re-implemented once agora-chat SDK structure is properly understood.
 */

let chatConnection: any = null;

/**
 * Initialize Agora Chat connection with Firebase Auth UID
 * TEMPORARILY DISABLED - SDK compatibility issues
 */
export async function initializeChat(firebaseUid: string, handle: string): Promise<any> {
  console.log("[Chat] Initialization temporarily disabled due to SDK compatibility");
  return null;
}

/**
 * Get current Chat connection
 */
export function getChatConnection(): any {
  return chatConnection;
}

/**
 * Close Chat connection
 */
export async function closeChat(): Promise<void> {
  if (chatConnection) {
    chatConnection = null;
  }
}

/**
 * Send text message to a user
 * TEMPORARILY DISABLED
 */
export async function sendDirectMessage(
  toUid: string,
  text: string
): Promise<void> {
  console.log("[Chat] Messaging temporarily disabled");
}

/**
 * Listen for incoming messages
 * TEMPORARILY DISABLED
 */
export function onMessageReceived(callback: (message: any) => void): void {
  console.log("[Chat] Message listening temporarily disabled");
}
