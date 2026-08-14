/**
 * lib/agoraChat.ts
 * ─────────────────────────────────────────────────────
 * Agora Chat SDK initialization and management.
 * TEMPORARILY DISABLED - SDK compatibility issues persist.
 * Will use Firestore wire (DM) collection for messaging instead.
 */

let chatConnection: any = null;

/**
 * Initialize Agora Chat connection with Firebase Auth UID
 * DISABLED - Using Firestore whispers instead
 */
export async function initializeChat(firebaseUid: string, handle: string): Promise<any> {
  console.log("[Chat] Agora Chat disabled - using Firestore 'wire' (DM) for messaging");
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
    await chatConnection.close();
    chatConnection = null;
  }
}

/**
 * Send text message to a user
 */
export async function sendDirectMessage(
  toUid: string,
  text: string
): Promise<void> {
  if (!chatConnection) {
    throw new Error("Chat connection not initialized");
  }

  try {
    const msg = chatConnection.message.create({
      type: "txt",
      to: toUid,
      msg: text,
    });

    await chatConnection.send(msg);
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

/**
 * Listen for incoming messages
 */
export function onMessageReceived(callback: (message: any) => void): void {
  if (!chatConnection) {
    console.warn("Chat connection not initialized");
    return;
  }

  chatConnection.addEventHandler("message", {
    onTextMessage: (message: any) => {
      callback(message);
    },
  });
}
