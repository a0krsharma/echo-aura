"use client";

/**
 * app/whispers/page.tsx
 * ─────────────────────────────────────────────────────
 * Full real-time Firestore-backed private DM system.
 * - Start a wire with any handle
 * - Send text messages in real-time
 * - Conversation list with last message preview
 * - Unread indicator
 */

import { useState, useEffect, useRef } from "react";
import { Mic2, Lock, Plus, Search, X, Send, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  startOrGetConversation,
  sendWhisper,
  subscribeToConversations,
  subscribeToMessages,
  markMessagesRead,
  searchUsersByHandle,
  type WhisperConversation,
  type WhisperMessage,
} from "@/lib/whispers";

// ─── Time helper ─────────────────────────────────────────────────────────────
function timeStr(ts: any): string {
  if (!ts?.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "YESTERDAY";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Conversation list item ───────────────────────────────────────────────────
function ConversationItem({
  conv,
  myUid,
  onClick,
  active,
}: {
  conv: WhisperConversation;
  myUid: string;
  onClick: () => void;
  active: boolean;
}) {
  const theirHandle = Object.entries(conv.handles || {})
    .find(([uid]) => uid !== myUid)?.[1] || "UNKNOWN";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 border-b border-neutral-900 flex items-center gap-4 hover:bg-neutral-950 transition-colors ${
        active ? "bg-neutral-950 border-l-2 border-l-white" : ""
      }`}
    >
      {/* Avatar placeholder */}
      <div className="w-9 h-9 border border-neutral-700 flex items-center justify-center shrink-0 font-mono text-xs text-neutral-500">
        {theirHandle.replace("@", "").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-white tracking-widest truncate">{theirHandle}</p>
          <span className="font-mono text-[10px] text-neutral-700 shrink-0 ml-2">
            {timeStr(conv.lastAt)}
          </span>
        </div>
        <p className="font-mono text-[10px] text-neutral-600 truncate mt-0.5">
          {conv.lastMessage || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

// ─── Chat window ─────────────────────────────────────────────────────────────
function ChatWindow({
  conv,
  myUid,
  myHandle,
  onBack,
}: {
  conv: WhisperConversation;
  myUid: string;
  myHandle: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<WhisperMessage[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const theirHandle = Object.entries(conv.handles || {})
    .find(([uid]) => uid !== myUid)?.[1] || "UNKNOWN";

  useEffect(() => {
    const unsub = subscribeToMessages(conv.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 80);
    });
    // Mark as read
    markMessagesRead(conv.id, myUid).catch(() => {});
    return () => unsub();
  }, [conv.id, myUid]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendWhisper(conv.id, myUid, myHandle, text);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-900 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 border border-neutral-700 flex items-center justify-center font-mono text-xs text-neutral-500">
          {theirHandle.replace("@", "").charAt(0)}
        </div>
        <div>
          <p className="font-mono text-xs text-white tracking-widest">{theirHandle}</p>
          <p className="font-mono text-[10px] text-neutral-600">[ PRIVATE WIRE ]</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Lock className="w-6 h-6 text-neutral-700 mx-auto" />
              <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase">
                [ END-TO-END PRIVATE WIRE ]
              </p>
              <p className="font-serif italic text-neutral-600 text-sm">
                Start the conversation
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === myUid;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs md:max-w-sm space-y-1 ${
                    isMe ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  {!isMe && (
                    <p className="font-mono text-[10px] text-neutral-700 tracking-widest px-1">
                      {msg.senderHandle}
                    </p>
                  )}
                  <div
                    className={`px-4 py-2.5 font-mono text-xs leading-relaxed ${
                      isMe
                        ? "bg-white text-black"
                        : "border border-neutral-800 text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <p className="font-mono text-[9px] text-neutral-700 px-1">
                    {timeStr(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 flex gap-2 p-4 border-t border-neutral-900"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="TYPE A WIRE..."
          className="flex-1 bg-transparent border border-neutral-800 focus:border-white outline-none font-mono text-xs text-white placeholder:text-neutral-700 px-3 py-2.5 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-2.5 border border-white text-white font-mono text-xs hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
}

// ─── New Wire Modal ────────────────────────────────────────────────────────
function NewWhisperModal({
  myUid,
  myHandle,
  onClose,
  onStarted,
}: {
  myUid: string;
  myHandle: string;
  onClose: () => void;
  onStarted: (convId: string) => void;
}) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<Array<{ uid: string; handle: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting]   = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const found = await searchUsersByHandle(query);
      setResults(found.filter((u) => u.uid !== myUid));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, myUid]);

  const startWith = async (user: { uid: string; handle: string }) => {
    setStarting(true);
    try {
      const convId = await startOrGetConversation(myUid, myHandle, user.uid, user.handle);
      onStarted(convId);
      onClose();
    } catch (err) {
      console.error("Start wire failed:", err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
            // START PRIVATE WIRE
          </p>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-neutral-800 py-2">
          <Search className="w-4 h-4 text-neutral-600 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="TYPE @HANDLE TO FIND..."
            autoFocus
            className="w-full bg-transparent border-none outline-none font-mono text-xs text-white placeholder:text-neutral-700 tracking-widest"
          />
          {searching && <Loader2 className="w-3 h-3 text-neutral-600 animate-spin shrink-0" />}
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {results.length === 0 && query.trim() && !searching && (
            <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase text-center py-4">
              NO MATCHING VOICES FOUND
            </p>
          )}
          {results.map((u) => (
            <button
              key={u.uid}
              onClick={() => startWith(u)}
              disabled={starting}
              className="w-full flex items-center gap-3 p-3 border border-neutral-900 hover:border-white hover:bg-neutral-950 transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 border border-neutral-700 flex items-center justify-center font-mono text-[10px] text-neutral-500">
                {u.handle.replace("@", "").charAt(0)}
              </div>
              <p className="font-mono text-xs text-white tracking-widest">{u.handle}</p>
            </button>
          ))}
        </div>

        {!query.trim() && (
          <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase text-center">
            SEARCH FOR AN AUTHENTICATED HANDLE
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function WhispersPage() {
  const { user } = useAuth();
  const [conversations,   setConversations]   = useState<WhisperConversation[]>([]);
  const [activeConvId,    setActiveConvId]    = useState<string | null>(null);
  const [showNewWire,  setShowNewWire]  = useState(false);
  const [mobileView,      setMobileView]      = useState<"list" | "chat">("list");

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

  // Subscribe to conversations
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
    });
    return () => unsub();
  }, [user]);

  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("list");
  };

  const handleNewWireStarted = (convId: string) => {
    setActiveConvId(convId);
    setMobileView("chat");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row pb-16 md:pb-0">
      {/* New Wire Modal */}
      {showNewWire && (
        <NewWhisperModal
          myUid={user.uid}
          myHandle={user.handle || "@ANON"}
          onClose={() => setShowNewWire(false)}
          onStarted={handleNewWireStarted}
        />
      )}

      {/* ── Conversation List (left panel on desktop, full on mobile) ── */}
      <div
        className={`
          w-full md:w-72 lg:w-80 border-r border-neutral-900 flex flex-col shrink-0
          ${mobileView === "chat" ? "hidden md:flex" : "flex"}
        `}
        style={{ height: "calc(100vh - 64px)", position: "sticky", top: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-900 shrink-0">
          <div>
            <h1 className="font-mono text-xs tracking-widest text-white uppercase">[ WIRE ]</h1>
            <p className="font-mono text-[10px] text-neutral-600 mt-0.5">PRIVATE FREQUENCY</p>
          </div>
          <button
            onClick={() => setShowNewWire(true)}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase border border-neutral-800 px-3 py-1.5 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> NEW
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-4 py-12">
              <Lock className="w-8 h-8 text-neutral-700" />
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                NO WIRES YET
              </p>
              <button
                onClick={() => setShowNewWire(true)}
                className="px-5 py-2.5 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                [ + START A WIRE ]
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                myUid={user.uid}
                onClick={() => handleSelectConv(conv.id)}
                active={conv.id === activeConvId}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Window (right panel on desktop, full on mobile) ── */}
      <div
        className={`
          flex-1 flex flex-col
          ${mobileView === "list" ? "hidden md:flex" : "flex"}
        `}
        style={{ height: "calc(100vh - 64px)" }}
      >
        {activeConv ? (
          <ChatWindow
            conv={activeConv}
            myUid={user.uid}
            myHandle={user.handle || "@ANON"}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 px-6">
            <Mic2 className="w-10 h-10 text-neutral-700" />
            <div className="space-y-2">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                SELECT A WIRE TO READ
              </p>
              <p className="font-serif italic text-neutral-700 text-sm">
                Or start a new private frequency
              </p>
            </div>
            <button
              onClick={() => setShowNewWire(true)}
              className="px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
            >
              [ + NEW WIRE ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
