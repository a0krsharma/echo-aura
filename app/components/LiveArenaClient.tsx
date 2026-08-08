"use client";

/**
 * app/components/LiveArenaClient.tsx
 * ─────────────────────────────────────────────────────
 * Agora RTC Live 1v1 Audio Arena + Real-time Firestore Tug-of-War & Vibe Chat.
 * Design: Utilitarian Canvas — pure black/white, monospace & serif, 1px borders.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Swords, Mic, MicOff, Send, Volume2, Shield, Flame, Heart, Laugh, ThumbsUp, Zap } from "lucide-react";
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useRemoteAudioTracks,
} from "agora-rtc-react";

import { useAuth } from "@/app/components/AuthProvider";
import { AGORA_APP_ID } from "@/lib/agora";
import { voteOnClash, subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { subscribeToVibeChat, sendVibeMessage, type VibeChatMessage } from "@/lib/stageChat";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

interface LiveArenaProps {
  clashId: string;
}

// ASCII Tug-of-War calculation
function renderAsciiMeter(votesA: number, votesB: number): string {
  const total = votesA + votesB;
  const pctA = total > 0 ? votesA / total : 0.5;
  const TOTAL_BARS = 24;
  const barsA = Math.round(pctA * TOTAL_BARS);
  const barsB = TOTAL_BARS - barsA;
  return `[${"=".repeat(barsA)}|${"-".repeat(barsB)}]`;
}

function LiveArenaContent({ clashId }: LiveArenaProps) {
  const { user } = useAuth();

  // Clash metadata state
  const [clash, setClash] = useState<ClashItem | null>(null);
  const [votedSide, setVotedSide] = useState<"A" | "B" | null>(null);

  // Speaker / Debater mode toggle
  const [isDebater, setIsDebater] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // Vibe Chat state
  const [chatMessages, setChatMessages] = useState<VibeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Live Reactions state
  const [reactions, setReactions] = useState<Array<{emoji: string; x: number; y: number; id: number}>>([]);
  const reactionIdRef = useRef(0);

  const REACTIONS = [
    { emoji: '🔥', icon: Flame, label: 'FIRE' },
    { emoji: '❤️', icon: Heart, label: 'LOVE' },
    { emoji: '😂', icon: Laugh, label: 'LOL' },
    { emoji: '👍', icon: ThumbsUp, label: 'AGREE' },
    { emoji: '⚡', icon: Zap, label: 'ENERGY' },
  ];

  const sendReaction = (emoji: string) => {
    const id = reactionIdRef.current++;
    const x = Math.random() * 80 + 10; // 10-90% horizontal
    const y = Math.random() * 60 + 20; // 20-80% vertical
    
    setReactions(prev => [...prev, { emoji, x, y, id }]);
    
    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  // ── AgoraRTC Join Channel ───────────────────────────────────────
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchToken() {
      if (!user) return;
      try {
        console.log("[Agora] Fetching token for channel:", clashId, "uid:", user.uid);
        const response = await fetch(
          `/api/agora/token?channel=${clashId}&uid=${user.uid}`
        );
        const data = await response.json();
        console.log("[Agora] Token response:", data);
        
        if (data.token) {
          setToken(data.token);
          setTokenError(null);
        } else if (data.warning) {
          console.warn("[Agora] Using fallback:", data.warning);
          setToken(data.token); // Will be null
          setTokenError(data.warning);
        } else {
          setTokenError("Failed to generate token");
        }
      } catch (error) {
        console.error("[Agora] Failed to fetch Agora token:", error);
        setTokenError("Token fetch failed");
      }
    }
    fetchToken();
  }, [clashId, user]);

  const client = useRTCClient();
  
  useEffect(() => {
    if (client) {
      console.log("[Agora] RTC Client created:", client);
      client.on("connection-state-change", (currentState, prevState, reason) => {
        console.log("[Agora] Connection state changed:", currentState, prevState, reason);
      });
    }
  }, [client]);

  useJoin(
    {
      appid: AGORA_APP_ID,
      channel: clashId,
      token: token,
    },
    !!token
  );

  // ── Local Audio Publishing (if Debater) ─────────────────────────
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isDebater);
  usePublish([isDebater ? localMicrophoneTrack : null]);

  // Manage mic mute state
  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setMuted(micMuted);
    }
  }, [localMicrophoneTrack, micMuted]);

  // ── Remote Audio Playback (Audience & Debaters) ──────────────────
  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);
  
  // Audio level detection for speakers
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    audioTracks.forEach((track) => {
      track.play();
      
      // Enable audio level monitoring
      track.setVolume(100);
      
      // Monitor audio levels
      const interval = setInterval(() => {
        const volume = track.getVolume();
        const uid = track.getUserId();
        
        if (volume > 10) { // Threshold for speaking detection
          setSpeakingUsers(prev => new Set([...prev, String(uid)]));
        } else {
          setSpeakingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(uid));
            return newSet;
          });
        }
      }, 100);
      
      return () => {
        clearInterval(interval);
      };
    });
    
    return () => {
      audioTracks.forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    };
  }, [audioTracks]);

  // Unmount cleanup for local mic track
  useEffect(() => {
    return () => {
      if (localMicrophoneTrack) {
        try {
          localMicrophoneTrack.stop();
          localMicrophoneTrack.close();
        } catch {}
      }
    };
  }, [localMicrophoneTrack]);

  // ── Fetch Clash metadata & subscribe to updates ─────────────────
  useEffect(() => {
    async function loadInitial() {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, "clashes", clashId));
        if (snap.exists()) {
          setClash({ id: snap.id, ...(snap.data() as Omit<ClashItem, "id">) });
        }
      } catch (e) {
        console.error("Error loading clash metadata:", e);
      }
    }
    loadInitial();

    const unsubClashes = subscribeToClashes((list) => {
      const current = list.find((c) => c.id === clashId);
      if (current) setClash(current);
    });

    const unsubChat = subscribeToVibeChat(clashId, (msgs) => {
      setChatMessages(msgs);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      unsubClashes();
      unsubChat();
    };
  }, [clashId]);

  // Vote handler
  const handleVote = async (side: "A" | "B") => {
    if (votedSide) return;
    setVotedSide(side);
    try {
      await voteOnClash(clashId, side);
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  // Vibe Chat handler
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;
    setIsSendingChat(true);
    const text = chatInput.trim();
    setChatInput("");

    try {
      await sendVibeMessage(clashId, user?.handle || "@ANON", text);
    } catch (err) {
      console.error("Failed to send chat:", err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const votesA = clash?.sideA?.votes || 0;
  const votesB = clash?.sideB?.votes || 0;
  const totalVotes = votesA + votesB;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-neutral-800 relative overflow-hidden">
      {/* ── Floating Reactions Layer ── */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-4xl animate-float-up"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* ── Header Bar ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4 font-mono text-xs tracking-widest uppercase relative z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" /> [ ● LIVE ]
          </span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-500">
            AUDIENCE: {clash?.listeners ? `${(clash.listeners * 12).toLocaleString()}` : "1.4K"}
          </span>
        </div>
        <Link
          href="/clash"
          className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
        >
          [ 🚪 EXIT STAGE ]
        </Link>
      </header>

      {/* ── Main Arena: Debate Topic + Tug-of-War ── */}
      <main className="flex-1 flex flex-col justify-center items-center space-y-8 relative z-10">
        {/* Speaker Profiles */}
        <div className="w-full max-w-4xl grid grid-cols-2 gap-6 mb-4">
          {/* Side A Speaker */}
          <div className="border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-neutral-700 flex items-center justify-center font-mono text-xs text-neutral-400">
                  {clash?.sideA?.handle?.charAt(1) || "A"}
                </div>
                <div>
                  <div className="font-mono text-xs text-white tracking-widest uppercase">{clash?.sideA?.handle || "SIDE A"}</div>
                  <div className="font-mono text-[10px] text-neutral-600 uppercase">SPEAKER</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg text-white">{votesA}</div>
                <div className="font-mono text-[10px] text-neutral-600 uppercase">VOTES</div>
              </div>
            </div>
            <p className="font-serif italic text-sm text-neutral-400 leading-relaxed">
              "{clash?.sideA?.position || "Position A"}"
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-[10px] text-neutral-600 uppercase">LIVE</span>
            </div>
          </div>

          {/* Side B Speaker */}
          <div className="border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-neutral-700 flex items-center justify-center font-mono text-xs text-neutral-400">
                  {clash?.sideB?.handle?.charAt(1) || "B"}
                </div>
                <div>
                  <div className="font-mono text-xs text-white tracking-widest uppercase">{clash?.sideB?.handle || "SIDE B"}</div>
                  <div className="font-mono text-[10px] text-neutral-600 uppercase">SPEAKER</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg text-white">{votesB}</div>
                <div className="font-mono text-[10px] text-neutral-600 uppercase">VOTES</div>
              </div>
            </div>
            <p className="font-serif italic text-sm text-neutral-400 leading-relaxed">
              "{clash?.sideB?.position || "Position B"}"
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-[10px] text-neutral-600 uppercase">LIVE</span>
            </div>
          </div>
        </div>

        {/* Debate Topic */}
        <div className="text-center space-y-4 max-w-2xl">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600">
            // DEBATE MOTION
          </div>
          <h1 className="font-serif italic text-2xl md:text-4xl text-white leading-tight">
            "{clash?.topic || "Loading debate..."}"
          </h1>
          <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
            {clash?.title || "LIVE STAGE DEBATE"}
          </div>
        </div>

        {/* ── ASCII Tug-of-War Engine ── */}
        <div className="space-y-4 text-center">
          <div className="flex justify-between font-mono text-xs tracking-widest text-neutral-500 uppercase">
            <span>SIDE A ({votesA})</span>
            <span>RATIO</span>
            <span>SIDE B ({votesB})</span>
          </div>

          {/* Raw ASCII Tug-of-War Meter */}
          <div className="font-mono text-sm md:text-base text-white tracking-widest select-none overflow-hidden py-1">
            {renderAsciiMeter(votesA, votesB)}
          </div>

          {/* Stark Voting Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => handleVote("A")}
              disabled={!!votedSide}
              className={`py-3.5 border font-mono text-xs tracking-[0.2em] uppercase transition-colors cursor-pointer ${
                votedSide === "A"
                  ? "border-white bg-white text-black font-bold"
                  : "border-neutral-800 text-white hover:border-white"
              }`}
            >
              {votedSide === "A" ? "[ VOTED SIDE A ]" : "[ VOTE A ]"}
            </button>

            <button
              onClick={() => handleVote("B")}
              disabled={!!votedSide}
              className={`py-3.5 border font-mono text-xs tracking-[0.2em] uppercase transition-colors cursor-pointer ${
                votedSide === "B"
                  ? "border-white bg-white text-black font-bold"
                  : "border-neutral-800 text-white hover:border-white"
              }`}
            >
              {votedSide === "B" ? "[ VOTED SIDE B ]" : "[ VOTE B ]"}
            </button>
          </div>
        </div>

        {/* ── Speaker Role Toggle (Join Audio Relay) ── */}
        <div className="flex justify-between items-center border-t border-b border-neutral-900 py-3 font-mono text-xs tracking-widest uppercase">
          <span className="text-neutral-600">// AUDIO RELAY ROLE</span>
          {isDebater ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMicMuted(!micMuted)}
                className="px-3 py-1.5 border border-neutral-700 text-white hover:border-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {micMuted ? <MicOff size={12} /> : <Mic size={12} />}
                {micMuted ? "[ UNMUTE MIC ]" : "[ MUTE MIC ]"}
              </button>
              <button
                onClick={() => setIsDebater(false)}
                className="px-3 py-1.5 border border-neutral-800 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                [ LEAVE STAGE ]
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDebater(true)}
              className="px-3 py-1.5 border border-white text-white hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Mic size={12} /> [ JOIN AS SPEAKER ]
            </button>
          )}
        </div>

        {/* ── Live Reactions Bar ── */}
        <div className="border border-neutral-900 p-4 space-y-3">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600">
            // LIVE REACTIONS
          </div>
          <div className="flex items-center justify-between gap-2">
            {REACTIONS.map((reaction) => {
              const Icon = reaction.icon;
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => sendReaction(reaction.emoji)}
                  className="flex-1 flex flex-col items-center gap-1 p-2 border border-neutral-800 hover:border-white hover:bg-neutral-950 transition-all cursor-pointer group"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">{reaction.emoji}</span>
                  <span className="font-mono text-[8px] tracking-widest text-neutral-600 group-hover:text-white transition-colors">{reaction.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Vibe Chat Stream ── */}
        <div className="border border-neutral-900 p-4 space-y-4">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 flex justify-between">
            <span>// REAL-TIME VIBE CHAT</span>
            <span>FIRESTORE SNAPSHOTS</span>
          </div>

          <div
            ref={chatScrollRef}
            className="h-44 overflow-y-auto no-scrollbar space-y-2 font-mono text-xs tracking-widest select-text"
          >
            {chatMessages.length === 0 ? (
              <div className="text-neutral-700 italic font-serif py-4 text-center">
                12:01:42 @ANON_8492: Wait let him cook.
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-neutral-300 leading-relaxed">
                  <span className="text-neutral-700">{msg.timeStr || "12:00:00"} </span>
                  <span className="text-white">{msg.handle}: </span>
                  <span className="text-neutral-400 font-serif italic">{msg.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-neutral-900">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="SAY SOMETHING..."
              className="flex-1 bg-transparent border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingChat}
              className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-900 pt-4 text-center font-mono text-[10px] text-neutral-700 tracking-[0.2em] uppercase">
        AGORA RTC ENGINE · WEBRTC REAL-TIME AUDIO RELAY
      </footer>
    </div>
  );
}

export default function LiveArenaClient({ clashId }: LiveArenaProps) {
  const rtcClient = useRTCClient(
    AgoraRTC.createClient({ codec: "vp8", mode: "rtc" })
  );

  return (
    <AgoraRTCProvider client={rtcClient}>
      <LiveArenaContent clashId={clashId} />
    </AgoraRTCProvider>
  );
}
