"use client";

/**
 * app/components/ChatWidget.tsx
 * ─────────────────────────────────────────────────────
 * Floating Wire Chat widget for real-time DMs on profile pages.
 * Powered directly by Firestore Wire backend.
 */

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import {
  startOrGetConversation,
  sendWhisper,
  subscribeToMessages,
  type WhisperMessage,
} from "@/lib/whispers";

interface ChatWidgetProps {
  targetUid: string;
  targetHandle: string;
}

export function ChatWidget({ targetUid, targetHandle }: ChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhisperMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch conversation ID when widget is opened
  useEffect(() => {
    if (!isOpen || !user || !targetUid || targetUid === "anon" || targetUid === user.uid) return;

    let unsub: (() => void) | undefined;
    let isMounted = true;
    const currentUser = user;

    async function initConv() {
      try {
        const id = await startOrGetConversation(
          currentUser.uid,
          currentUser.handle || "@ANON",
          targetUid,
          targetHandle
        );
        if (!isMounted) return;
        setConvId(id);

        unsub = subscribeToMessages(id, (msgs) => {
          if (isMounted) setMessages(msgs);
        });
      } catch (err) {
        console.warn("[ChatWidget] Failed to initialize Wire conversation:", err);
      }
    }

    initConv();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [isOpen, user, targetUid, targetHandle]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !user || targetUid === "anon") return;
    setSending(true);

    try {
      let activeConvId = convId;
      if (!activeConvId) {
        activeConvId = await startOrGetConversation(
          user.uid,
          user.handle || "@ANON",
          targetUid,
          targetHandle
        );
        setConvId(activeConvId);
      }

      await sendWhisper(activeConvId, user.uid, user.handle || "@ANON", text);
      setInput("");
    } catch (error) {
      console.error("[ChatWidget] Failed to send wire message:", error);
    } finally {
      setSending(false);
    }
  };

  if (!user || targetUid === "anon" || targetUid === user.uid) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 font-mono">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg border border-neutral-800"
        >
          <MessageSquare size={16} />
          Wire with {targetHandle}
        </button>
      ) : (
        <div className="w-80 bg-black border border-neutral-800 overflow-hidden shadow-2xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-white" />
              <span className="text-xs text-white tracking-widest">{targetHandle}</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Wire Online" />
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
            className="h-64 overflow-y-auto p-4 space-y-2.5 no-scrollbar bg-black"
          >
            {messages.length === 0 ? (
              <div className="text-center text-neutral-600 text-xs py-8 tracking-widest uppercase">
                [ NO MESSAGES YET ]<br />
                <span className="text-[10px] text-neutral-700">Start the wire conversation...</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderUid === user.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                        isMe
                          ? "bg-white text-black font-semibold"
                          : "bg-neutral-900 text-white border border-neutral-800"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-neutral-800 bg-neutral-950">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a wire..."
              className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-3 py-2 bg-white text-black font-bold hover:bg-neutral-200 transition-opacity cursor-pointer disabled:opacity-30 flex items-center justify-center shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
