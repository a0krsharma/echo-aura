"use client";

// Copy of app/whispers/page.tsx adapted to /wire route and Wire naming

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
  type WireConversation,
  type WireMessage,
} from "@/lib/wire";

// Keep the rest of the code identical to whispers page but label as WIRE in UI

function timeStr(ts: any): string {
  if (!ts?.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "YESTERDAY";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function WirePage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (convs) => setConversations(convs));
    return () => unsub && unsub();
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">[ WIRE ]</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 border border-neutral-800 p-2 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-neutral-600">Conversations</div>
              <button className="text-xs text-neutral-500">New</button>
            </div>
            <div>
              {conversations.map((c) => (
                <button key={c.id} onClick={() => setActiveConv(c)} className="w-full text-left p-2 border-b border-neutral-900 hover:bg-neutral-950">
                  <div className="text-sm">{Object.values(c.handles || {})[0]}</div>
                  <div className="text-xs text-neutral-600">{c.lastMessage}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 border border-neutral-800 p-2 rounded">
            {activeConv ? (
              <div>
                <div className="font-mono text-sm mb-2">Conversation with {Object.values(activeConv.handles || {})[0]}</div>
                {/* Placeholder for messages and input (reuse whispers UI later) */}
                <div className="h-64 bg-neutral-900 rounded mb-2 p-2">Messages will appear here.</div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-neutral-900 p-2 rounded" placeholder="Send a wire..." />
                  <button className="px-3 py-2 bg-white text-black rounded">Send</button>
                </div>
              </div>
            ) : (
              <div className="text-neutral-600">Select a conversation to view messages.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
