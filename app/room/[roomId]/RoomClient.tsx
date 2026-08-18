"use client";

/**
 * app/room/[roomId]/RoomClient.tsx
 * ─────────────────────────────────────────────────────
 * High-Contrast Terminal Live Audio Room Experience
 * Features:
 * - Single-source Agora WebRTC streaming via RoomAudioContext (zero UID conflicts)
 * - 1.5s Auto-expiring floating stage emoji reactions (not sticky)
 * - Floating sliding chat drawer (no full-window takeover)
 * - Guest Matrix (Roster) drawer with tabs (All, Speakers, Listeners, Requests)
 * - Active Transmitters with live CSS dB level visualizers
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Users,
  Radio,
  Send,
  X,
  Volume2,
  Hand,
  Lock,
  MessageSquare,
  Share2,
  Trash2,
  Shield,
  Heart,
} from "lucide-react";

import { useAuth } from "@/app/components/AuthProvider";
import { useRoomAudio } from "@/lib/context/RoomAudioContext";
import { ShareButton } from "@/app/components/ShareButton";
import { FormattedText } from "@/app/components/FormattedText";
import {
  getRoom,
  subscribeToRoom,
  subscribeToRoomParticipants,
  addParticipant,
  removeParticipant,
  sendRoomChatMessage,
  subscribeToRoomChat,
  raiseHand,
  lowerHand,
  promoteToSpeaker,
  demoteFromSpeaker,
  muteParticipant,
  unmuteParticipant,
  sendRoomReaction,
  subscribeToRoomReactions,
  bookmarkRoom,
  removeRoomBookmark,
  endRoom,
  deleteRoom,
  type Room,
  type RoomParticipant,
} from "@/lib/rooms";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { followUser, unfollowUser, isFollowing } from "@/lib/follows";

interface RoomClientProps {
  roomId: string;
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Audio Context
  const {
    activeRoomId,
    activeRoom,
    role,
    isMuted,
    handRaised,
    speakingUids,
    audioLevels,
    tuneIn,
    disconnect,
    toggleMic,
    toggleHandRaise,
  } = useRoomAudio();

  // Room state
  const [room, setRoom] = useState<Room | null>(activeRoom || null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  // Drawers / Modals
  const [showChat, setShowChat] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [rosterTab, setRosterTab] = useState<"ALL" | "SPEAKERS" | "LISTENERS" | "REQUESTS">("ALL");

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ handle: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 1.8-Second Auto-Expiring Floating Stage Reactions (Instant Non-Sticky)
  const [activeReactions, setActiveReactions] = useState<Record<string, { emoji: string; key: number }>>({});
  const [floatingParticles, setFloatingParticles] = useState<Array<{ id: string; emoji: string; left: number }>>([]);
  const reactionTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const REACTIONS = ["👏", "❤️", "🔥", "😂", "👍"];

  // Profile modal state
  const [profileModal, setProfileModal] = useState<{ uid: string; handle: string } | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Ensure Audio Engine is connected to this room
  useEffect(() => {
    if (activeRoomId !== roomId) {
      tuneIn(roomId, room || undefined);
    }
  }, [roomId, activeRoomId, room, tuneIn]);

  // Subscribe to Room Metadata
  useEffect(() => {
    const unsub = subscribeToRoom(roomId, (roomData) => {
      if (roomData) {
        setRoom(roomData);
      } else {
        // Room ended
        disconnect();
        router.push("/rooms");
      }
    });
    return () => unsub();
  }, [roomId, disconnect, router]);

  // Subscribe to Room Participants
  useEffect(() => {
    const unsub = subscribeToRoomParticipants(roomId, (list) => {
      setParticipants(list);
    });
    return () => unsub();
  }, [roomId]);

  // Subscribe to Live Room Chat
  useEffect(() => {
    const unsub = subscribeToRoomChat(roomId, (msgs) => {
      setChatMessages(msgs);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsub();
  }, [roomId]);

  // Trigger Reaction Display (Optimistic & Real-time)
  const triggerReactionDisplay = (uid: string, emoji: string) => {
    // 1. Clear any existing timer for this UID so emojis change INSTANTLY
    if (reactionTimersRef.current[uid]) {
      clearTimeout(reactionTimersRef.current[uid]);
    }

    // 2. Set new active reaction with unique key (re-triggers animation every single tap!)
    setActiveReactions((prev) => ({
      ...prev,
      [uid]: { emoji, key: Date.now() + Math.random() },
    }));

    // 3. Spawn floating upward particle on stage
    const particleId = `${uid}_${Date.now()}_${Math.random()}`;
    const left = Math.floor(Math.random() * 60) + 20; // 20% - 80% horizontal range
    setFloatingParticles((prev) => [...prev.slice(-15), { id: particleId, emoji, left }]);

    // Auto-remove particle after 1.8s
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 1800);

    // 4. Auto-clear avatar reaction after 1.8 seconds (Zero stickiness!)
    reactionTimersRef.current[uid] = setTimeout(() => {
      setActiveReactions((prev) => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
    }, 1800);
  };

  // Subscribe to Realtime Reactions
  useEffect(() => {
    const unsub = subscribeToRoomReactions(roomId, (reaction) => {
      triggerReactionDisplay(reaction.uid, reaction.emoji);
    });
    return () => unsub();
  }, [roomId]);

  // Send Floating Reaction (INSTANT local feedback + Broadcast)
  const handleSendReaction = (emoji: string) => {
    if (!user) return;

    // 1. Instant local optimistic trigger
    triggerReactionDisplay(user.uid, emoji);

    // 2. Broadcast to room via Firestore
    sendRoomReaction(roomId, {
      uid: user.uid,
      handle: user.handle || "@ANON",
      emoji,
    }).catch((err) => console.error("[Room] Error sending reaction:", err));
  };

  // Send Chat Message
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !user) return;

    try {
      await sendRoomChatMessage(roomId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        text: chatInput.trim(),
      });
      setChatInput("");
    } catch (err) {
      console.error("[Room] Error sending chat:", err);
    }
  };

  // Leave / Disconnect Room
  const handleLeave = async () => {
    await disconnect();
    router.push("/rooms");
  };

  // Host End & Delete Room
  const handleHostEndRoom = async () => {
    if (!confirm("Terminate live frequency and delete room for all nodes?")) return;
    try {
      await deleteRoom(roomId);
      await disconnect();
      router.push("/rooms");
    } catch (err) {
      console.error("Failed to delete room:", err);
      alert("Failed to terminate room.");
    }
  };

  // Moderator Handlers
  const handlePromoteSpeaker = async (uid: string) => {
    try {
      await promoteToSpeaker(roomId, uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemoteSpeaker = async (uid: string) => {
    try {
      await demoteFromSpeaker(roomId, uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMute = async (uid: string) => {
    try {
      await muteParticipant(roomId, uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnmute = async (uid: string) => {
    try {
      await unmuteParticipant(roomId, uid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickUser = async (uid: string) => {
    try {
      await removeParticipant(roomId, uid);
      setProfileModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Profile Modal
  useEffect(() => {
    if (!profileModal) {
      setProfileData(null);
      setProfilePosts([]);
      setIsOrbiting(false);
      return;
    }

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const db = getFirebaseDb();
        const userDoc = await getDoc(doc(db, "users", profileModal.uid));
        if (userDoc.exists()) {
          setProfileData({ uid: userDoc.id, ...userDoc.data() });
        }

        // Safe query for recent echoes (fallback if index missing)
        try {
          const postsQuery = query(
            collection(db, "posts"),
            where("authorUid", "==", profileModal.uid),
            limit(5)
          );
          const postsSnap = await getDocs(postsQuery);
          setProfilePosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          setProfilePosts([]);
        }

        if (user) {
          const following = await isFollowing(user.uid, profileModal.uid);
          setIsOrbiting(following);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [profileModal, user]);

  const handleOrbitToggle = async () => {
    if (!user || !profileModal) return;
    try {
      if (isOrbiting) {
        await unfollowUser(user.uid, profileModal.uid);
        setIsOrbiting(false);
      } else {
        await followUser(user.uid, user.handle || "@ANON", profileModal.uid, profileModal.handle);
        setIsOrbiting(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const speakers = participants.filter((p) => p.isSpeaker || (room && p.uid === room.hostUid));
  const listeners = participants.filter((p) => !p.isSpeaker && (room ? p.uid !== room.hostUid : true));
  const pendingRequests = participants.filter((p) => p.raisedHand);

  const isHost = Boolean(user && room && room.hostUid === user.uid);
  const isSpeaker = role === "host" || role === "speaker";

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ INITIALIZING FREQUENCY... ]
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono select-none">
      {/* ── Top Header Telemetry ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 px-4 py-3 text-xs tracking-wider uppercase flex-wrap gap-2 bg-neutral-950">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/rooms")}
            className="text-neutral-400 hover:text-white border border-neutral-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase font-bold hover:border-white transition-colors cursor-pointer"
            title="Minimize to persistent dock"
          >
            [v] DOCK
          </button>
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          <span className="text-neutral-700">//</span>
          <span className="text-neutral-300 truncate max-w-[180px] sm:max-w-xs font-bold">{room.name}</span>
          <span className="text-neutral-700">//</span>
          <span className="text-neutral-500 text-[10px] sm:text-xs">
            {participants.length} NODES
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ShareButton
            title={`Live Frequency: ${room.name}`}
            text={`Tune in live on Echo: "${room.name}"`}
            label="SHARE"
            variant="button"
            className="px-2.5 py-1 text-[10px] sm:text-xs uppercase"
          />
          {user?.uid === room.hostUid ? (
            <button
              onClick={handleHostEndRoom}
              className="text-red-400 hover:text-white hover:bg-red-950/80 border border-red-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase font-bold transition-colors cursor-pointer"
              title="Terminate and delete live room"
            >
              [!] END ROOM
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="text-neutral-400 hover:text-red-400 hover:border-red-500 border border-neutral-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase font-bold transition-colors cursor-pointer"
            >
              [!] LEAVE
            </button>
          )}
        </div>
      </header>

      {/* ── Main Stage Area ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-32">
        {/* Pinned Signal / Artifact Thesis Box */}
        <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-white" />
              // [ PINNED SIGNAL / ARTIFACT ]
            </span>
            <span className="text-neutral-500 uppercase tracking-wider">
              HOST: {room.hostHandle} • [{room.category || "GENERAL"}]
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
            <FormattedText text={room.name} />
          </h1>
          {room.description && (
            <p className="text-xs text-neutral-300 font-mono pt-1">
              "{room.description}"
            </p>
          )}
        </div>

        {/* Active Transmitters (Speakers Stage Matrix) */}
        <div className="border border-white bg-neutral-950 p-4 sm:p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5 text-[10px]">
            <span className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              // ACTIVE TRANSMITTERS ({speakers.length})
            </span>
            {pendingRequests.length > 0 && isHost && (
              <button
                onClick={() => {
                  setRosterTab("REQUESTS");
                  setShowRoster(true);
                }}
                className="text-black bg-white px-2 py-0.5 font-bold uppercase tracking-wider animate-pulse cursor-pointer"
              >
                {pendingRequests.length} QUEUED REQ ➔
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {speakers.map((s) => {
              const isSpeaking = speakingUids.has(s.uid) || (user && s.uid === user.uid && (speakingUids.has("0") || speakingUids.has(user.uid)));
              const level = audioLevels[s.uid] || (user && s.uid === user.uid ? audioLevels["0"] || audioLevels[user.uid] : 0) || (isSpeaking ? 80 : 0);
              const isHostUser = room && s.uid === room.hostUid;
              const floatingEmoji = activeReactions[s.uid];

              return (
                <div
                  key={s.uid}
                  className={`relative border p-3.5 flex flex-col items-center justify-center text-center transition-all ${
                    isSpeaking
                      ? "border-white bg-neutral-900 shadow-2xl ring-2 ring-white scale-[1.02]"
                      : "border-neutral-800 bg-black"
                  }`}
                >
                  {/* Instant 1.8s Floating Pop-Up Emoji Reaction (Non-Sticky!) */}
                  {floatingEmoji && (
                    <div
                      key={floatingEmoji.key}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 text-3xl animate-bounce drop-shadow-[0_4px_10px_rgba(255,255,255,0.4)] pointer-events-none transition-all"
                    >
                      {floatingEmoji.emoji}
                    </div>
                  )}

                  {/* Avatar Frame */}
                  <button
                    onClick={() => setProfileModal({ uid: s.uid, handle: s.handle })}
                    className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-bold relative transition-all cursor-pointer mb-2 ${
                      isSpeaking
                        ? "border-white bg-white text-black font-extrabold shadow-lg"
                        : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-white hover:text-white"
                    }`}
                  >
                    {s.handle.replace("@", "").slice(0, 2).toUpperCase()}
                    {isSpeaking && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-black text-white border border-white px-1 font-bold animate-pulse">
                        TX 🔊
                      </span>
                    )}
                  </button>

                  <p className="text-xs font-bold text-white truncate w-full">
                    {s.handle}
                  </p>
                  <span className={`text-[9px] uppercase mt-0.5 tracking-wider font-bold ${isSpeaking ? "text-white" : "text-neutral-500"}`}>
                    {isHostUser ? "[ HOST ]" : "[ SPEAKER ]"}
                  </span>

                  {/* Live ASCII / CSS Decibel Meter */}
                  <div className="w-full bg-neutral-950 h-2 mt-2 overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full transition-all duration-75 ${isSpeaking ? "bg-white" : "bg-neutral-800"}`}
                      style={{ width: `${isSpeaking ? Math.max(level, 50) : s.isMuted ? 0 : 15}%` }}
                    />
                  </div>
                  <span className={`text-[8px] uppercase mt-1 font-mono font-bold ${isSpeaking ? "text-white animate-pulse" : "text-neutral-500"}`}>
                    {isSpeaking ? `[||||||--] TX (${level || 75}dB)` : s.isMuted ? "[ MUTE ]" : "[------] IDLE"}
                  </span>

                  {/* Host Quick Moderation Controls */}
                  {isHost && s.uid !== user?.uid && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-neutral-900 w-full justify-center">
                      <button
                        onClick={() => (s.isMuted ? handleUnmute(s.uid) : handleMute(s.uid))}
                        className="text-[8px] border border-neutral-800 px-1 py-0.5 text-neutral-400 hover:text-white uppercase cursor-pointer"
                        title={s.isMuted ? "Unmute speaker" : "Mute speaker"}
                      >
                        {s.isMuted ? "UNMUTE" : "MUTE"}
                      </button>
                      <button
                        onClick={() => handleDemoteSpeaker(s.uid)}
                        className="text-[8px] border border-neutral-800 px-1 py-0.5 text-neutral-400 hover:text-white uppercase cursor-pointer"
                        title="Demote to listener"
                      >
                        DEMOTE
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── Real-Time Floating Stage Particle Stream (Listener & Speaker Reactions) ── */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floatingParticles.map((p) => (
          <div
            key={p.id}
            style={{ left: `${p.left}%` }}
            className="absolute bottom-20 text-3xl sm:text-4xl animate-float-up drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)]"
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* ── Fixed Bottom Command Bar ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-black border-t border-neutral-800 px-4 py-3 font-mono">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          {/* Left Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {isSpeaker ? (
              /* Speaker/Host Mic Toggle */
              <button
                onClick={toggleMic}
                className={`px-3 py-2 text-xs font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isMuted
                    ? "border-neutral-700 text-neutral-400 bg-neutral-950 hover:border-white hover:text-white"
                    : "border-white bg-white text-black animate-pulse"
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? "[ MIC: MUTED ]" : "[ LIVE TX ]"}</span>
              </button>
            ) : (
              /* Listener Hand Raise */
              <button
                onClick={toggleHandRaise}
                className={`px-3 py-2 text-xs font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  handRaised
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-950"
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>{handRaised ? "[ HAND RAISED ]" : "[ REQUEST MIC ]"}</span>
              </button>
            )}

            {/* Guest / Node Roster Button */}
            <button
              onClick={() => setShowRoster(true)}
              className="px-3 py-2 text-xs font-bold border border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-950 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>[ GUESTS ({participants.length}) ]</span>
            </button>

            {/* Floating Chat Button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-3 py-2 text-xs font-bold border uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                showChat
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-950"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>[ CHAT ({chatMessages.length}) ]</span>
            </button>
          </div>

          {/* Right: Realtime Stage Reactions */}
          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center text-sm hover:bg-neutral-800 transition-transform active:scale-125 cursor-pointer rounded"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Floating Sliding Chat Drawer (Positioned above footer with zero cutoff) ── */}
      {showChat && (
        <aside
          aria-label="Room live chat"
          className="fixed bottom-20 right-4 sm:right-8 z-50 w-[calc(100vw-32px)] sm:w-[380px] h-[460px] max-h-[70vh] bg-black border-2 border-white shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col font-mono animate-slide-up"
        >
          <div className="p-3 border-b border-neutral-900 flex items-center justify-between bg-neutral-950">
            <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              // FREQUENCY CHAT ({chatMessages.length})
            </span>
            <button
              onClick={() => setShowChat(false)}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
              title="Close Chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat message feed */}
          <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-neutral-600 text-center py-10 uppercase tracking-widest text-[10px]">
                NO CHAT MESSAGES YET
              </p>
            ) : (
              chatMessages.map((m, i) => (
                <div key={i} className="space-y-0.5 border-b border-neutral-900 pb-1.5">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="font-bold text-neutral-300">{m.handle}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="text-neutral-200">{m.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendChat} className="p-2.5 border-t border-neutral-900 flex gap-2 bg-neutral-950">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to stage..."
              className="flex-1 bg-black border border-neutral-800 px-2.5 py-1.5 text-xs text-white placeholder-neutral-700 outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 py-1.5 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
            >
              SEND
            </button>
          </form>
        </aside>
      )}

      {/* ── Guest / Node Matrix Modal (Roster) ── */}
      {showRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-w-md w-full bg-black border border-white p-5 space-y-4 font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">// NODE ROSTER</p>
                <h2 className="text-sm font-bold text-white uppercase mt-0.5">
                  PARTICIPANTS ({participants.length})
                </h2>
              </div>
              <button
                onClick={() => setShowRoster(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Roster Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
              {(["ALL", "SPEAKERS", "LISTENERS", "REQUESTS"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRosterTab(t)}
                  className={`px-2.5 py-1 border uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                    rosterTab === t
                      ? "border-white bg-white text-black"
                      : "border-neutral-800 text-neutral-500 hover:text-white bg-neutral-950"
                  }`}
                >
                  {t} (
                  {t === "ALL"
                    ? participants.length
                    : t === "SPEAKERS"
                    ? speakers.length
                    : t === "LISTENERS"
                    ? listeners.length
                    : pendingRequests.length}
                  )
                </button>
              ))}
            </div>

            {/* Member List */}
            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-neutral-900">
              {(rosterTab === "ALL"
                ? participants
                : rosterTab === "SPEAKERS"
                ? speakers
                : rosterTab === "LISTENERS"
                ? listeners
                : pendingRequests
              ).map((p) => {
                const isHostUser = room && p.uid === room.hostUid;
                return (
                  <div key={p.uid} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 border border-neutral-700 bg-neutral-900 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {p.handle.replace("@", "").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-white truncate">{p.handle}</p>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">
                          {isHostUser
                            ? "[ HOST ]"
                            : p.isSpeaker
                            ? "[ SPEAKER ]"
                            : p.raisedHand
                            ? "[ ✋ RAISED HAND ]"
                            : "[ LISTENER ]"}
                        </span>
                      </div>
                    </div>

                    {/* Host Moderation actions */}
                    {isHost && p.uid !== user?.uid && (
                      <div className="flex items-center gap-1 shrink-0">
                        {p.isSpeaker ? (
                          <button
                            onClick={() => handleDemoteSpeaker(p.uid)}
                            className="px-2 py-1 text-[9px] border border-neutral-800 text-neutral-400 hover:text-white uppercase cursor-pointer"
                          >
                            DEMOTE
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePromoteSpeaker(p.uid)}
                            className="px-2 py-1 text-[9px] border border-white bg-white text-black font-bold uppercase cursor-pointer hover:bg-neutral-200"
                          >
                            PROMOTE
                          </button>
                        )}
                        <button
                          onClick={() => handleKickUser(p.uid)}
                          className="px-2 py-1 text-[9px] border border-neutral-800 text-neutral-500 hover:text-red-400 uppercase cursor-pointer"
                        >
                          KICK
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── User Profile Drawer / Modal ── */}
      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-w-md w-full bg-black border border-white p-6 space-y-4 font-mono shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-900 pb-3">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">// NODE PROFILE</p>
                <h2 className="text-base font-bold text-white uppercase mt-0.5">{profileModal.handle}</h2>
              </div>
              <button
                onClick={() => setProfileModal(null)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingProfile ? (
              <p className="text-center py-6 text-xs text-neutral-500 tracking-widest uppercase animate-pulse">
                RETRIEVING NODE SIGNALS...
              </p>
            ) : profileData ? (
              <div className="space-y-4">
                {profileData.bio && (
                  <p className="text-xs text-neutral-300 font-mono">
                    "{profileData.bio}"
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="border border-neutral-800 p-2">
                    <p className="text-[10px] text-neutral-500 uppercase">ORBITERS</p>
                    <p className="font-bold text-white mt-0.5">{profileData.followerCount || 0}</p>
                  </div>
                  <div className="border border-neutral-800 p-2">
                    <p className="text-[10px] text-neutral-500 uppercase">AURA</p>
                    <p className="font-bold text-white mt-0.5">{profileData.auraScore || 0}</p>
                  </div>
                </div>

                {/* Orbit / Unorbit */}
                {user && user.uid !== profileModal.uid && (
                  <button
                    onClick={handleOrbitToggle}
                    className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                      isOrbiting
                        ? "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                        : "border-white bg-white text-black hover:bg-neutral-200"
                    }`}
                  >
                    {isOrbiting ? "[ UNORBIT ]" : "[ ORBIT ]"}
                  </button>
                )}

                {/* Full Profile Link */}
                <Link
                  href={`/${profileModal.handle.replace("@", "")}`}
                  onClick={() => setProfileModal(null)}
                  className="block text-center text-xs text-neutral-400 hover:text-white uppercase tracking-widest pt-2"
                >
                  VIEW FULL PROFILE ➔
                </Link>
              </div>
            ) : (
              <p className="text-center py-6 text-xs text-neutral-500 tracking-widest uppercase">
                PROFILE NOT FOUND
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
