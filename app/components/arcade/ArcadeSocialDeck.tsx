"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  sendArcadeChatMessage,
  subscribeArcadeChat,
  sendArcadeReaction,
  subscribeArcadeReactions,
  type ArcadeMatch,
  type ArcadeChatMessage,
  type ArcadeReaction,
} from "@/lib/arcade";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  Mic,
  MicOff,
  MessageSquare,
  Send,
  Sparkles,
  Flame,
  Heart,
  Laugh,
  Zap,
  Volume2,
  Bell,
  Radio,
  X,
  Smile,
} from "lucide-react";

interface ArcadeSocialDeckProps {
  match: ArcadeMatch;
  currentUid: string;
}

const QUICK_EMOJIS = [
  { emoji: "🔥", label: "FIRE", sound: () => soundSynth.playAirhorn() },
  { emoji: "❤️", label: "LOVE", sound: () => soundSynth.playSubtlePop() },
  { emoji: "😂", label: "LOL", sound: () => soundSynth.playGong() },
  { emoji: "⚡", label: "HYPED", sound: () => soundSynth.playSnare() },
  { emoji: "💀", label: "REKT", sound: () => soundSynth.playBuzzer() },
  { emoji: "🎲", label: "LUCK", sound: () => soundSynth.playGong() },
  { emoji: "👑", label: "KING", sound: () => soundSynth.playFanfare() },
];

const QUICK_CHATS = [
  "GG! 🤝",
  "WHAT A MOVE! 🤯",
  "ROLL A 6 PLEASE! 🎲",
  "NICE TRY! 😂",
  "AURA LOCKED IN! ⚡",
];

interface FloatingParticle {
  id: string;
  emoji: string;
  sender: string;
  left: number; // percentage across screen
}

export default function ArcadeSocialDeck({ match, currentUid }: ArcadeSocialDeckProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ArcadeChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeArcadeChat(match.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsub();
  }, [match.id]);

  // Subscribe to floating stage reactions
  useEffect(() => {
    const unsub = subscribeArcadeReactions(match.id, (reaction) => {
      // Spawn floating emoji particle
      const p: FloatingParticle = {
        id: `${reaction.id}_${Date.now()}_${Math.random()}`,
        emoji: reaction.emoji,
        sender: reaction.handle,
        left: 15 + Math.random() * 70, // 15% to 85%
      };
      setParticles((prev) => [...prev.slice(-15), p]);

      // Remove after 2 seconds
      setTimeout(() => {
        setParticles((prev) => prev.filter((item) => item.id !== p.id));
      }, 2000);
    });
    return () => unsub();
  }, [match.id]);

  // Send reaction
  const handleTriggerReaction = async (item: typeof QUICK_EMOJIS[0]) => {
    if (!user) return;
    item.sound();
    try {
      await sendArcadeReaction(
        match.id,
        { uid: user.uid, handle: user.handle || "@ANON" },
        item.emoji
      );
    } catch (e) {
      console.warn("Failed to send reaction:", e);
    }
  };

  // Send chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !user) return;

    soundSynth.playSubtlePop();
    setInputText("");
    try {
      await sendArcadeChatMessage(
        match.id,
        {
          uid: user.uid,
          handle: user.handle || "@ANON",
          avatar: user.photoUrl || user.photoURL,
        },
        text
      );
    } catch (e) {
      console.warn("Failed to send chat:", e);
    }
  };

  // Toggle Mic
  const handleToggleMic = () => {
    soundSynth.playSubtlePop();
    setMicActive(!micActive);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto space-y-3 font-mono select-none">
      {/* ── Floating Stage Reactions Surge Overlay ── */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{ left: `${p.left}%` }}
            className="absolute bottom-28 animate-in fade-in slide-in-from-bottom-24 duration-1000 flex flex-col items-center gap-1 transition-all"
          >
            <span className="text-3xl sm:text-4xl animate-bounce drop-shadow-[0_4px_10px_rgba(255,255,255,0.4)]">
              {p.emoji}
            </span>
            <span className="text-[9px] font-bold bg-black/90 text-white px-1.5 py-0.5 border border-white/40">
              {p.sender}
            </span>
          </div>
        ))}
      </div>

      {/* ── Social Gaming Control Bar ── */}
      <div className="border-2 border-white bg-black p-3 flex items-center justify-between flex-wrap gap-2 shadow-[0_0_25px_rgba(255,255,255,0.1)]">
        {/* Voice Chat Controls */}
        <div className="flex items-center gap-2">
          {match.enableVoice ? (
            <button
              type="button"
              onClick={handleToggleMic}
              className={`px-3 py-1.5 border-2 text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                micActive
                  ? "border-emerald-400 bg-emerald-950/60 text-emerald-300 ring-2 ring-emerald-400 animate-pulse"
                  : "border-white bg-black text-white hover:bg-neutral-900"
              }`}
            >
              {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{micActive ? "[ 🎙️ LIVE ON AUDIO ]" : "[ 🔇 MIC OFF ]"}</span>
            </button>
          ) : (
            <span className="text-[10px] text-neutral-500 border border-neutral-800 px-2 py-1">
              VOICE DISABLED
            </span>
          )}

          {micActive && (
            <div className="flex items-center gap-1 px-2 py-1 bg-neutral-950 border border-emerald-900 text-[10px] text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-1 bg-emerald-400 h-2 animate-ping" />
                <span className="w-1 bg-emerald-400 h-3 animate-pulse" />
                <span className="w-1 bg-emerald-400 h-1.5" />
              </div>
            </div>
          )}
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          {/* Chat Toggle Button */}
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setChatOpen(!chatOpen);
            }}
            className={`px-3 py-1.5 border text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              chatOpen
                ? "border-white bg-white text-black font-extrabold"
                : "border-neutral-700 bg-neutral-950 text-white hover:border-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>[ CHAT ({messages.length}) ]</span>
          </button>
        </div>
      </div>

      {/* ── Stage-Style Reaction Surge Bar ── */}
      <div className="border border-neutral-800 bg-neutral-950 p-2 flex items-center justify-between gap-1 overflow-x-auto">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
          REACTIONS:
        </span>
        <div className="flex items-center gap-1.5 w-full justify-around">
          {QUICK_EMOJIS.map((item) => (
            <button
              key={item.emoji}
              type="button"
              onClick={() => handleTriggerReaction(item)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-none border border-neutral-800 hover:border-white bg-black hover:bg-neutral-900 active:scale-90 transition-all text-sm sm:text-base flex items-center gap-1 cursor-pointer"
              title={`Send ${item.label}`}
            >
              <span>{item.emoji}</span>
              <span className="text-[9px] text-neutral-400 font-bold uppercase hidden md:inline">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sliding Real-Time Chat Drawer ── */}
      {chatOpen && (
        <div className="border-2 border-white bg-black p-3 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[10px]">
            <span className="text-white font-bold uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-white" />
              // IN-GAME ARENA CHAT CHANNEL
            </span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div
            ref={chatScrollRef}
            className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs divide-y divide-neutral-900"
          >
            {messages.length === 0 ? (
              <p className="text-[10px] text-neutral-600 uppercase text-center py-4">
                NO CHAT MESSAGES YET. DROP A MESSAGE OR QUICK TAUNT!
              </p>
            ) : (
              messages.map((m) => {
                const isYou = m.uid === currentUid;
                const isHost = m.uid === match.hostUid;
                return (
                  <div key={m.id} className="pt-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-extrabold flex items-center gap-1">
                        <span className={isYou ? "text-white underline" : "text-neutral-300"}>
                          {m.handle}
                        </span>
                        {isHost && (
                          <span className="text-[8px] bg-neutral-800 text-white px-1 font-bold">
                            HOST
                          </span>
                        )}
                        {isYou && <span className="text-neutral-500">(YOU)</span>}
                      </span>
                      <span className="text-neutral-600">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-neutral-200 font-mono text-[11px] break-words">{m.text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Taunt / Chat Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {QUICK_CHATS.map((qc) => (
              <button
                key={qc}
                type="button"
                onClick={() => handleSendMessage(qc)}
                className="px-2 py-1 text-[9px] font-bold border border-neutral-800 bg-neutral-950 hover:border-white text-neutral-300 hover:text-white shrink-0 uppercase transition-all cursor-pointer"
              >
                {qc}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type in-game chat message..."
              className="w-full bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-1.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-xs uppercase disabled:opacity-40 transition-all shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>SEND</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
