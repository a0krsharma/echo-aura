/**
 * lib/agoraChat.ts
 * ─────────────────────────────────────────────────────
 * Agora Chat SDK initialization and management.
 * Integrates with Firebase Auth using Firebase Auth UID as Chat user ID.
 * 
 * NOTE: Agora Chat is browser-only SDK, must be loaded dynamically.
 */

let chatConnection: any = null;
let agoraChat: any = null;

/**
 * Initialize Agora Chat connection with Firebase Auth UID
 */
export async function initializeChat(firebaseUid: string, handle: string): Promise<any> {
  if (typeof window === 'undefined') {
    console.log("[Chat] Skipping initialization on server side");
    return null;
  }

  if (chatConnection) {
    return chatConnection;
  }

  const APP_KEY = process.env.NEXT_PUBLIC_AGORA_CHAT_APP_KEY;

  if (!APP_KEY) {
    throw new Error("Agora Chat credentials not configured");
  }

  try {
    // Dynamic import for browser-only SDK
    if (!agoraChat) {
      agoraChat = (await import("agora-chat")).default;
    }

    // Create connection using Firebase Auth UID as user ID
    const connection = new agoraChat.connection({
      appKey: APP_KEY,
    });

    // Set user profile with agoraToken for authentication
    const user = {
      user: firebaseUid, // Use Firebase Auth UID as Chat username
      agoraToken: await fetchChatToken(firebaseUid), // Use generated token
      nickname: handle || "@ANON",
    };

    // Open connection
    await connection.open(user);

    chatConnection = connection;
    return connection;
  } catch (error) {
    console.error("Failed to initialize Agora Chat:", error);
    throw error;
  }
}

/**
 * Fetch Chat token from API
 */
async function fetchChatToken(username: string): Promise<string> {
  try {
    const response = await fetch(`/api/agora/chat/token?username=${username}`);
    const data = await response.json();
    return data.token || "";
  } catch (error) {
    console.error("Failed to fetch chat token:", error);
    return "";
  }
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
