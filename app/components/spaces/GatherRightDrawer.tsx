"use client";

/**
 * app/components/spaces/GatherRightDrawer.tsx
 * ─────────────────────────────────────────────────────
 * Gather.town Slide-Out Drawer Panel
 * Exact replica of the right drawer panel from Gather:
 * - Room Chat ("Chats here are not saved", room proximity header)
 * - Participants Directory ("Nearby", "In this room", "All in space", Follow/Locate)
 */

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  MessageSquare,
  Users,
  Search,
  Send,
  Smile,
  MapPin,
  Compass,
  ArrowRight,
  UserCheck,
  Radio,
  Eye,
  AtSign,
  ChevronRight,
} from "lucide-react";
import { SpatialAvatar, SpaceZoneDef, SPACES_ZONES } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

export interface SpaceChatMessage {
  id: string;
  senderUid: string;
  senderHandle: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  roomName: string;
}

interface GatherRightDrawerProps {
  isOpen: boolean;
  activeTab: "chat" | "participants";
  onClose: () => void;
  onTabChange: (tab: "chat" | "participants") => void;
  currentZone: string;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  messages: SpaceChatMessage[];
  onSendMessage: (text: string) => void;
  onFollowAvatar?: (target: SpatialAvatar) => void;
  onLocateAvatar?: (target: SpatialAvatar) => void;
  onWaveAvatar?: (target: SpatialAvatar) => void;
  onDirectMessageAvatar?: (target: SpatialAvatar) => void;
}

const QUICK_EMOJIS = ["👋", "👍", "❤️", "😂", "🎉", "🔥", "☕", "👏"];

export default function GatherRightDrawer({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
  currentZone,
  localAvatar,
  remoteAvatars,
  messages,
  onSendMessage,
  onFollowAvatar,
  onLocateAvatar,
  onWaveAvatar,
  onDirectMessageAvatar,
}: GatherRightDrawerProps) {
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const zoneDef = SPACES_ZONES[localAvatar.activeZone] || {
    name: "Courtyard Fountain Room",
    icon: "⛲",
  };

  // Calculate distances to remote avatars
  const avatarsWithDistance = remoteAvatars.map((av) => {
    const dx = av.x - localAvatar.x;
    const dy = av.y - localAvatar.y;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
    return { avatar: av, dist };
  });

  // Nearby avatars (within 240px proximity)
  const nearbyAvatars = avatarsWithDistance
    .filter((a) => a.dist <= 240)
    .sort((a, b) => a.dist - b.dist);

  // In this room
  const inThisRoomAvatars = avatarsWithDistance.filter(
    (a) => a.avatar.activeZone === localAvatar.activeZone
  );

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
    spacesSfx.playKeyNote(3);
  };

  const handleAddEmoji = (emoji: string) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Filtered participants
  const filteredAvatars = avatarsWithDistance.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.avatar.handle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed top-14 bottom-0 right-0 w-80 sm:w-96 bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-800 shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTabChange("chat")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "chat"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onTabChange("participants")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "participants"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People ({remoteAvatars.length + 1})</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode 1: ROOM CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Room Banner Header (Gather detail from photo) */}
          <div className="px-4 py-2.5 bg-neutral-900/40 border-b border-neutral-800/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{zoneDef.name}</span>
              </div>
            </div>

            {/* Proximity Pill (From user's screenshot: "Amit Bhatt, Nivedha, Lokesh, and 4 more are here >") */}
            <div
              onClick={() => onTabChange("participants")}
              className="mt-1 flex items-center justify-between text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
            >
              <div className="truncate">
                {nearbyAvatars.length > 0 ? (
                  <span>
                    {nearbyAvatars.slice(0, 2).map((a) => a.avatar.handle).join(", ")}
                    {nearbyAvatars.length > 2 && ` and ${nearbyAvatars.length - 2} more are here`}
                  </span>
                ) : (
                  <span>No one else nearby. Move around to hear voices!</span>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xl">
                  💬
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold font-mono text-white">
                    Start a conversation!
                  </div>
                  <div className="text-xs text-neutral-400 font-mono max-w-[220px]">
                    Messages sent here will reach everyone in {zoneDef.name}.
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.senderUid === localAvatar.uid;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 mb-1">
                      <span className="font-bold text-neutral-300">{msg.senderHandle}</span>
                      <span>•</span>
                      <span>{timeStr}</span>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs font-mono max-w-[85%] break-words ${
                        isSelf
                          ? "bg-cyan-600 text-white rounded-br-xs"
                          : "bg-neutral-800 text-neutral-100 rounded-bl-xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Bar */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-950/90 shrink-0 space-y-2">
            {/* Authentic Gather Disclaimer (From user photo: "Chats here are not saved") */}
            <div className="text-[10px] font-mono text-neutral-500 text-center flex items-center justify-center gap-1">
              <span>🔒 Chats here are not saved</span>
            </div>

            {/* Floating Quick Emoji Row */}
            {showEmojiPicker && (
              <div className="flex items-center justify-center gap-1 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 animate-in zoom-in-95">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => handleAddEmoji(em)}
                    className="p-1 hover:scale-125 transition-transform text-base cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-2 focus-within:border-cyan-500 transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${zoneDef.name.split(" ")[0]}...`}
                  className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 outline-none"
                  maxLength={120}
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Insert Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mode 2: PARTICIPANTS DIRECTORY */}
      {activeTab === "participants" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Search Box */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/40 shrink-0">
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-2 text-xs font-mono text-white">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people in space..."
                className="w-full bg-transparent outline-none placeholder-neutral-500 text-xs"
              />
            </div>
          </div>

          {/* Directory Sections */}
          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            {/* You (Self) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider px-1">
                You
              </div>
              <div className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
                      }}
                    >
                      {localAvatar.handle.charAt(1) || "U"}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-950" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span>{localAvatar.handle}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        YOU
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {localAvatar.statusText || "Available"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Group */}
            {nearbyAvatars.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-wider px-1 flex items-center justify-between">
                  <span>Nearby Audio ({nearbyAvatars.length})</span>
                  <span className="text-[9px] text-neutral-500 font-normal">&lt; 240px</span>
                </div>
                <div className="space-y-1.5">
                  {nearbyAvatars.map(({ avatar, dist }) => (
                    <div
                      key={avatar.uid}
                      className="p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-900/40 hover:border-cyan-500/40 flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                            style={{ backgroundColor: avatar.hoodieColor || "#f43f5e" }}
                          >
                            {avatar.handle.charAt(1) || "P"}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-950" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-white">
                            {avatar.handle}
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                            <span>{avatar.activeZone}</span>
                            <span>•</span>
                            <span className="text-cyan-400">{dist}px away</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onWaveAvatar && (
                          <button
                            onClick={() => onWaveAvatar(avatar)}
                            className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 text-[10px] font-mono transition-colors cursor-pointer"
                            title="Wave Them Over [Image 4]"
                          >
                            👋
                          </button>
                        )}
                        {onDirectMessageAvatar && (
                          <button
                            onClick={() => onDirectMessageAvatar(avatar)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono transition-colors cursor-pointer"
                            title="Start Direct Chat & Video"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                        )}
                        {onFollowAvatar && (
                          <button
                            onClick={() => onFollowAvatar(avatar)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-cyan-500 hover:text-black text-neutral-300 text-[10px] font-mono transition-colors cursor-pointer"
                            title="Walk to & Follow"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onLocateAvatar && (
                          <button
                            onClick={() => onLocateAvatar(avatar)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono transition-colors cursor-pointer"
                            title="Locate on Canvas"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All In Space */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 tracking-wider px-1">
                All In Space ({filteredAvatars.length})
              </div>
              <div className="space-y-1">
                {filteredAvatars.map(({ avatar }) => (
                  <div
                    key={avatar.uid}
                    className="p-2 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white"
                        style={{ backgroundColor: avatar.hoodieColor || "#64748b" }}
                      >
                        {avatar.handle.charAt(1) || "P"}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-white font-medium flex items-center gap-1.5">
                          <span>{avatar.handle}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {avatar.activeZone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onWaveAvatar && (
                        <button
                          onClick={() => onWaveAvatar(avatar)}
                          className="p-1 text-xs hover:scale-125 transition-transform cursor-pointer"
                          title="Wave"
                        >
                          👋
                        </button>
                      )}
                      {onDirectMessageAvatar && (
                        <button
                          onClick={() => onDirectMessageAvatar(avatar)}
                          className="p-1 text-neutral-400 hover:text-cyan-400 cursor-pointer"
                          title="Direct Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onLocateAvatar && (
                        <button
                          onClick={() => onLocateAvatar(avatar)}
                          className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                          title="Locate"
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
