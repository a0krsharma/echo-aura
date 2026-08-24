"use client";

import React, { useState, useMemo } from "react";
import {
  Smile,
  Heart,
  Flame,
  Gamepad2,
  Coffee,
  Sparkles,
  Search,
  X,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";

interface EmojiCategory {
  id: string;
  name: string;
  icon: any;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "SMILEYS",
    name: "Smileys & Emotion",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥹", "😊",
      "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙",
      "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎",
      "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
      "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤",
      "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰",
      "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🫢", "🫡", "🤫", "🫠",
      "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮",
      "😲", "🥱", "😴", "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢",
    ],
  },
  {
    id: "GESTURES",
    name: "Gestures & Hands",
    icon: ThumbsUp,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "🫷",
      "🫸", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊",
      "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️",
      "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃",
      "👀", "👁️", "👅", "👄", "🫦", "🙇", "🙋", "💁", "🙆", "🙅",
    ],
  },
  {
    id: "HEARTS",
    name: "Hearts & Love",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "💟", "💌", "💋", "💍", "💎", "💐", "🌹", "🥀", "🌺", "🌸",
    ],
  },
  {
    id: "REACTIONS",
    name: "Trending & Hype",
    icon: Flame,
    emojis: [
      "🔥", "💯", "💀", "⚡", "✨", "🌟", "⭐", "🎉", "🎊", "🏆",
      "👑", "🚀", "💥", "🎯", "🎲", "🎪", "🎭", "🎨", "🎬", "🎤",
      "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🚨",
      "⚠️", "⛔", "🛑", "🔔", "📣", "📢", "💬", "💭", "🗯️", "💫",
    ],
  },
  {
    id: "TECH",
    name: "Cyber & Gaming",
    icon: Gamepad2,
    emojis: [
      "🎮", "🕹️", "👾", "🤖", "💻", "🖥️", "📱", "📲", "💾", "💿",
      "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛜", "🌐", "🛰️",
      "🛸", "🪐", "🌌", "🦾", "🦿", "🕹️", "♟️", "🧩", "🔮", "🧿",
    ],
  },
  {
    id: "VIBES",
    name: "Food & Vibes",
    icon: Coffee,
    emojis: [
      "☕", "🍵", "🧋", "🥤", "🧃", "🍺", "🍻", "🥂", "🍷", "🥃",
      "🍸", "🍹", "🧉", "🍾", "🍕", "🍔", "🍟", "🌭", "🍿", "🍩",
      "🍪", "🎂", "🍰", "🧁", "🍫", "🍬", "🍭", "🍡", "🍧", "🍨",
    ],
  },
];

const TOP_REACTIONS = ["👍", "❤️", "😂", "🔥", "👏", "🎉", "😮", "🙏", "💀", "💯"];

interface WorldClassEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onQuickSend?: (emoji: string) => void;
}

export default function WorldClassEmojiPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  onQuickSend,
}: WorldClassEmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<string>("SMILEYS");
  const [search, setSearch] = useState("");

  const displayCategories = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(q) || cat.name.toLowerCase().includes(q)),
      })).filter((cat) => cat.emojis.length > 0);
    }
    // If no search, filter by active tab so clicking Heart/Flame/etc immediately shows them
    return EMOJI_CATEGORIES.filter((c) => c.id === activeTab);
  }, [search, activeTab]);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    soundSynth.playSubtlePop();
    onSelectEmoji(emoji);
  };

  const handleTopReactionClick = (emoji: string) => {
    soundSynth.playFanfare();
    if (onQuickSend) {
      onQuickSend(emoji);
    } else {
      onSelectEmoji(emoji);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 sm:left-auto right-0 sm:right-0 z-50 w-full sm:w-[360px] bg-black border border-white rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] font-mono text-white select-none overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* Top Bar: Search & Close */}
      <div className="p-2.5 border-b border-neutral-800 bg-neutral-950 flex items-center gap-2">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all emojis..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-white pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 rounded outline-none"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded border border-neutral-800 hover:border-white bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Pinned Top Reactions (1-Tap Fast Insert / Burst) */}
      {!search && (
        <div className="px-2.5 py-1.5 bg-neutral-950/90 border-b border-neutral-900 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[9px] text-neutral-400 font-bold uppercase shrink-0 flex items-center gap-0.5">
            <Flame className="w-3 h-3 text-white" /> 1-TAP:
          </span>
          <div className="flex items-center gap-1">
            {TOP_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleTopReactionClick(emoji)}
                className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 hover:border-white flex items-center justify-center text-sm transition-all hover:scale-125 active:scale-95 cursor-pointer shrink-0"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="h-60 overflow-y-auto p-2.5 space-y-3 bg-black">
        {displayCategories.map((cat) => (
          <div key={cat.id} className="space-y-1.5">
            <div className="text-[10px] text-neutral-300 font-black uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-1">
              <cat.icon className="w-3.5 h-3.5 text-white" />
              <span>{cat.name}</span>
            </div>
            <div className="grid grid-cols-8 gap-1 pt-1">
              {cat.emojis.map((emoji, idx) => (
                <button
                  key={`${cat.id}-${idx}`}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 rounded hover:bg-neutral-900 hover:border hover:border-neutral-700 hover:scale-125 flex items-center justify-center text-lg transition-all cursor-pointer active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {displayCategories.length === 0 && (
          <div className="py-8 text-center text-neutral-500 text-xs">
            NO EMOJIS MATCHING "{search}"
          </div>
        )}
      </div>

      {/* Bottom Category Selector Bar */}
      <div className="grid grid-cols-6 border-t border-neutral-800 bg-neutral-950 p-1">
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id && !search;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveTab(cat.id);
                setSearch("");
                soundSynth.playSubtlePop();
              }}
              className={`py-2 flex items-center justify-center rounded transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-black font-black shadow"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
              title={cat.name}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
