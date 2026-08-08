/**
 * lib/agoraChat.ts
 * ─────────────────────────────────────────────────────
 * Agora Chat SDK initialization and management.
 * Integrates with Firebase Auth using Firebase Auth UID as Chat user ID.
 */

import { Connection } from "agora-chat";

const APP_KEY = process.env.AGORA_CHAT_APP_KEY;
const ORG_NAME = process.env.AGORA_CHAT_ORG_NAME;
const APP_NAME = process.env.NEXT_PUBLIC_AGORA_CHAT_APP_ID;

let chatConnection: Connection | null = null;

/**
 * Initialize Agora Chat connection with Firebase Auth UID
 */
export async function initializeChat(firebaseUid: string, handle: string): Promise<Connection> {
  if (chatConnection) {
    return chatConnection;
  }

  if (!APP_KEY || !ORG_NAME || !APP_NAME) {
    throw new Error("Agora Chat credentials not configured");
  }

  try {
    // Create connection using Firebase Auth UID as user ID
    const connection = new Connection({
      appKey: APP_KEY,
      https: true,
    });

    // Set user profile
    const user = {
      username: firebaseUid, // Use Firebase Auth UID as Chat username
      password: firebaseUid, // Use Firebase Auth UID as password for simplicity
      nickname: handle || "@ANON",
      avatarUrl: "",
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
 * Get current Chat connection
 */
export function getChatConnection(): Connection | null {
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
