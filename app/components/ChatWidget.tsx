"use client";

/**
 * app/components/ChatWidget.tsx
 * ─────────────────────────────────────────────────────
 * Simple Chat UI component for real-time messaging.
 * Can be used in profile pages or other locations.
 */

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { useChat } from "./ChatProvider";
import { useAuth } from "./AuthProvider";

interface ChatWidgetProps {
  targetUid: string;
  targetHandle: string;
}

export function ChatWidget({ targetUid, targetHandle }: ChatWidgetProps) {
  const { user } = useAuth();
  const { isConnected, messages, sendMessage } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredMessages = messages.filter(
    (msg) => msg.from === targetUid || (msg.from === "me" && msg.to === targetUid)
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !user) return;
    setSending(true);
    try {
      await sendMessage(targetUid, input.trim());
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-mono text-xs tracking-widest uppercase hover:opacity-80 transition-opacity cursor-pointer"
        >
          <MessageSquare size={16} />
          Chat with {targetHandle}
        </button>
      ) : (
        <div className="w-80 bg-black border-standard overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-standard bg-secondary">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span className="font-mono text-xs text-white">{targetHandle}</span>
              {isConnected && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-64 overflow-y-auto p-4 space-y-2 no-scrollbar"
          >
            {filteredMessages.length === 0 ? (
              <div className="text-center text-neutral-600 font-mono text-xs py-8">
                Start the conversation...
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${
                      msg.from === "me"
                        ? "bg-white text-black"
                        : "bg-tertiary text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-neutral-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border border-neutral-700 px-3 py-2 rounded font-mono text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-3 py-2 bg-white text-black rounded hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
