"use client";

/**
 * app/components/ChatProvider.tsx
 * ─────────────────────────────────────────────────────
 * Agora Chat context provider for real-time messaging.
 * Provides chat connection and message handling to components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getChatConnection, onMessageReceived, sendDirectMessage } from "@/lib/agoraChat";

interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

interface ChatContextValue {
  isConnected: boolean;
  messages: ChatMessage[];
  sendMessage: (toUid: string, text: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const connection = getChatConnection();
    setIsConnected(!!connection);

    if (connection) {
      onMessageReceived((message) => {
        const newMessage: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          from: message.from || message.ext?.from || "unknown",
          to: message.to || "me",
          text: message.data || message.msg || "",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, newMessage]);
      });
    }
  }, []);

  const sendMessage = useCallback(async (toUid: string, text: string) => {
    try {
      await sendDirectMessage(toUid, text);
      // Add sent message to local state
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        from: "me",
        to: toUid,
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider value={{ isConnected, messages, sendMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
