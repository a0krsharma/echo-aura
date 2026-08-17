"use client";

export const dynamic = "force-dynamic";

/**
 * app/wire/page.tsx
 * ─────────────────────────────────────────────────────
 * Full real-time Firestore-backed private DM system (Wire).
 * - Start a wire with any handle
 * - Send text messages in real-time
 * - Conversation list with last message preview
 * - Unread indicator
 * - P2P audio calls via WebRTC
 */

import { useState, useEffect, useRef } from "react";
import { Mic, Mic2, Lock, Plus, Search, X, Send, ChevronLeft, Loader2, Phone, PhoneOff, Play, Pause, Square, Trash2 } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import {
  startOrGetConversation,
  sendWhisper,
  deleteWhisperMessage,
  subscribeToConversations,
  subscribeToMessages,
  markMessagesRead,
  updateThreadLastRead,
  getTelemetryStatus,
  searchUsersByHandle,
  addSignalingMessage,
  subscribeToSignaling,
  type WhisperConversation,
  type WhisperMessage,
} from "@/lib/whispers";
import { subscribeToUserPresence, type UserPresence } from "@/lib/presence";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, limit } from "firebase/firestore";
import { subscribeToFollowing, type Follow } from "@/lib/follows";

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

// ─── ICE servers helper (STUN + optional TURN) ───────────────────────────────
function getIceServers() {
  return [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
  ];
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

  const otherUid = (conv.participants || conv.id.split("__")).find((uid) => uid !== myUid) || "";
  const rawHandle = Object.entries(conv.handles || {}).find(([uid]) => uid !== myUid)?.[1];
  const [theirHandle, setTheirHandle] = useState<string>(rawHandle && rawHandle !== "UNKNOWN" ? rawHandle : `@ANON_${otherUid.slice(0, 4).toUpperCase()}`);

  useEffect(() => {
    if (rawHandle && rawHandle !== "UNKNOWN") {
      setTheirHandle(rawHandle);
      return;
    }
    if (otherUid) {
      const db = getFirebaseDb();
      getDoc(doc(db, "users", otherUid)).then((snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          if (uData.handle) setTheirHandle(uData.handle);
        }
      }).catch(() => {});
    }
  }, [conv.id, rawHandle, otherUid]);

  useEffect(() => {
    const unsub = subscribeToMessages(conv.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 80);
    });
    markMessagesRead(conv.id, myUid).catch(() => {});
    updateThreadLastRead(conv.id, myUid).catch(() => {});
    return () => unsub();
  }, [conv.id, myUid]);

  const [peerPresence, setPeerPresence] = useState<UserPresence>({ state: "offline" });

  useEffect(() => {
    if (!otherUid) return;
    const unsub = subscribeToUserPresence(otherUid, setPeerPresence);
    return () => unsub();
  }, [otherUid]);

  useEffect(() => {
    if (messages.length > 0) {
      updateThreadLastRead(conv.id, myUid).catch(() => {});
    }
  }, [messages.length, conv.id, myUid]);

  const [callActive, setCallActive] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Voice Echo Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.start(100);
      setIsRecording(true);
      setRecordElapsed(0);

      timerRef.current = setInterval(() => {
        setRecordElapsed((prev) => {
          if (prev >= 30) {
            stopAndSendVoice();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[Wire] Microphone recording error:", err);
    }
  };

  const stopAndSendVoice = async () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setSending(true);

    try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

      await new Promise((res) => setTimeout(res, 200));

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (blob.size < 100) return;

      let audioUrl = "";
      try {
        const uploadRes = await uploadAudio(blob, `wire_voice_${Date.now()}.webm`);
        audioUrl = typeof uploadRes === "string" ? uploadRes : uploadRes?.secureUrl || "";
      } catch (err) {
        console.warn("[Wire] Audio upload fallback to blob URL:", err);
      }

      if (!audioUrl && blob.size > 0) {
        audioUrl = URL.createObjectURL(blob);
      }

      await sendWhisper(conv.id, myUid, myHandle, "🎙 Voice Message", audioUrl);
    } catch (err) {
      console.error("[Wire] Failed to send voice message:", err);
    } finally {
      setSending(false);
      setRecordElapsed(0);
      mediaRecorderRef.current = null;
    }
  };

  const cancelVoiceRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    setIsRecording(false);
    setRecordElapsed(0);
    mediaRecorderRef.current = null;
  };

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

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteWhisperMessage(conv.id, msgId);
    } catch (err) {
      console.error("[Wire] Delete message error:", err);
    }
  };

  const startCall = async () => {
    if (callActive) return;
    try {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const remoteAudio = document.createElement("audio");
      remoteAudio.autoplay = true;
      remoteAudio.controls = false;
      pc.ontrack = (ev) => {
        try {
          remoteAudio.srcObject = ev.streams[0];
        } catch (e) {}
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          addSignalingMessage(conv.id, myUid, "ice", ev.candidate.toJSON());
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await addSignalingMessage(conv.id, myUid, "offer", offer);

      setCallActive(true);
    } catch (err) {
      console.error("startCall error:", err);
      cleanupCall();
    }
  };

  const cleanupCall = async () => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    } catch (e) {}
    setCallActive(false);
  };

  useEffect(() => {
    const unsubSig = subscribeToSignaling(conv.id, async (msg: any) => {
      if (!msg || msg.fromUid === myUid) return;
      try {
        const pc = pcRef.current || new RTCPeerConnection({ iceServers: getIceServers() });
        if (!pcRef.current) pcRef.current = pc;

        if (msg.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = localStream;
          localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

          pc.ontrack = (ev) => {
            const remoteAudio = document.createElement("audio");
            remoteAudio.autoplay = true;
            remoteAudio.srcObject = ev.streams[0];
          };

          pc.onicecandidate = (ev) => {
            if (ev.candidate) addSignalingMessage(conv.id, myUid, "ice", ev.candidate.toJSON());
          };

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await addSignalingMessage(conv.id, myUid, "answer", answer);

          setCallActive(true);
        } else if (msg.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        } else if (msg.type === "ice") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
          } catch (e) {
            console.warn('addIceCandidate failed:', e);
          }
        } else if (msg.type === "hangup") {
          cleanupCall();
        }
      } catch (e) {
        console.error('Signaling handler error:', e);
      }
    });

    return () => {
      unsubSig();
      cleanupCall();
    };
  }, [conv.id, myUid]);

  const hangUp = async () => {
    try { await addSignalingMessage(conv.id, myUid, 'hangup', {}); } catch (e) {}
    cleanupCall();
  };

  return (
    <div className="flex flex-col h-full">
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
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-white tracking-widest">{theirHandle}</p>
            {peerPresence.state === "online" ? (
              <span className="flex items-center gap-1 font-mono text-[9px] text-green-400 bg-green-950/60 border border-green-900/80 px-1.5 py-0.5 uppercase tracking-widest shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                ONLINE
              </span>
            ) : (
              <span className="font-mono text-[9px] text-neutral-600 bg-neutral-950 border border-neutral-900 px-1.5 py-0.5 uppercase tracking-widest shrink-0">
                OFFLINE
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-neutral-600">[ PRIVATE WIRE ]</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!callActive ? (
            <button
              onClick={startCall}
              className="px-3 py-1 border border-white text-white font-mono text-xs hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center gap-2"
            >
              <Phone className="w-3 h-3" /> [ CALL ]
            </button>
          ) : (
            <button
              onClick={hangUp}
              className="px-3 py-1 border border-red-500 text-red-500 font-mono text-xs hover:bg-red-500 hover:text-black transition-colors cursor-pointer flex items-center gap-2"
            >
              <PhoneOff className="w-3 h-3" /> [ HANG UP ]
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs text-neutral-600">
            NO MESSAGES YET. START THE CONVERSATION.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === myUid;
            const peerLastReadTS = conv.lastRead?.[otherUid];
            const teleStatus = isMe ? getTelemetryStatus(msg, peerLastReadTS) : null;
            return (
              <div
                key={msg.id}
                className={`flex items-center gap-2 group ${isMe ? "justify-end" : "justify-start"}`}
              >
                {isMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Delete message"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-neutral-600 hover:text-red-400 p-1.5 transition-opacity cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 space-y-1.5 ${
                    isMe
                      ? "bg-white text-black"
                      : "bg-neutral-900 text-white border border-neutral-800"
                  }`}
                >
                  {msg.audioUrl ? (
                    <div className="space-y-1.5 min-w-[200px]">
                      <p className="font-mono text-xs font-bold flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5" /> VOICE ECHO
                      </p>
                      <audio src={msg.audioUrl} controls className="w-full h-8 accent-black" />
                    </div>
                  ) : (
                    <p className="font-mono text-xs">{msg.text}</p>
                  )}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <p className="font-mono text-[9px] text-neutral-500 tracking-widest uppercase">
                      {timeStr(msg.createdAt)}
                    </p>
                    {isMe && (
                      <p className="font-mono text-[9px] text-neutral-500 tracking-widest uppercase">
                        {`>> [ ${teleStatus} ]`}
                      </p>
                    )}
                  </div>
                </div>
              {msg.senderUid !== myUid && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Delete message"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-neutral-600 hover:text-red-400 p-1.5 transition-opacity cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })
      )}
      </div>

      {/* Voice Echo Recording Indicator Bar */}
      {isRecording && (
        <div className="p-3 bg-red-950/60 border-t border-red-900/60 flex items-center justify-between font-mono text-xs text-red-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">RECORDING VOICE ECHO... {recordElapsed}s / 30s</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelVoiceRecording}
              className="px-2 py-1 border border-neutral-800 text-neutral-400 hover:text-white uppercase"
            >
              CANCEL
            </button>
            <button
              onClick={stopAndSendVoice}
              className="px-3 py-1 bg-red-600 text-white font-bold uppercase hover:bg-red-500"
            >
              STOP &amp; SEND
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="p-2.5 sm:p-4 border-t border-neutral-900 flex items-center gap-1.5 sm:gap-2 bg-black shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a wire..."
          disabled={isRecording}
          className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors disabled:opacity-40 min-w-0"
        />

        {/* Voice Echo Mic Button */}
        {!isRecording && (
          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={sending}
            className="px-2.5 py-2 border border-neutral-700 text-neutral-300 hover:border-white hover:text-white font-mono text-[11px] sm:text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
            title="Record Voice Echo"
          >
            <Mic className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden xs:inline">[ 🎙 VOICE ]</span>
            <span className="xs:hidden">VOICE</span>
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() || sending || isRecording}
          className="px-3 sm:px-4 py-2 border border-white text-white font-mono text-[11px] sm:text-xs tracking-wider uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30 flex items-center gap-1.5 shrink-0 font-bold whitespace-nowrap"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>SEND</span>
        </button>
      </form>
    </div>
  );
}

export default function WirePage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<WhisperConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draftConv, setDraftConv] = useState<WhisperConversation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Orbiting & Suggested Accounts state
  const [followingList, setFollowingList] = useState<Follow[]>([]);
  const [suggestedVoices, setSuggestedVoices] = useState<{ uid: string; handle: string; auraScore?: number }[]>([]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || (draftConv?.id === activeConvId ? draftConv : null);

  useEffect(() => {
    if (!user) return;
    const currentUid = user.uid;
    const unsub = subscribeToConversations(currentUid, (convs) => setConversations(convs));
    
    // Subscribe to accounts user is orbiting
    const unsubFollowing = subscribeToFollowing(currentUid, (follows) => {
      setFollowingList(follows);
    });

    // Fetch top suggested accounts from Firestore
    async function loadSuggested() {
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(query(collection(db, "users"), limit(10)));
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as any))
          .filter((u) => u.uid !== currentUid)
          .map((u) => ({ uid: u.uid, handle: u.handle || "@ANON", auraScore: u.auraScore || 0 }));
        setSuggestedVoices(list);
      } catch (err) {
        console.warn("[Wire] Load suggested error:", err);
      }
    }
    loadSuggested();

    return () => {
      unsub && unsub();
      unsubFollowing && unsubFollowing();
    };
  }, [user]);

  // Read URL query parameters ?c=... or ?with=... safely on client side ONCE
  const initializedUrlRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !user || initializedUrlRef.current) return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetConvId = urlParams.get("c");
    const targetWith = urlParams.get("with");
    const targetHandle = urlParams.get("handle");

    if (targetConvId) {
      initializedUrlRef.current = true;
      setActiveConvId(targetConvId);
      const found = conversations.find((c) => c.id === targetConvId);
      if (!found) {
        const db = getFirebaseDb();
        getDoc(doc(db, "whispers", targetConvId)).then((snap) => {
          if (snap.exists()) {
            setDraftConv({ id: snap.id, ...snap.data() } as WhisperConversation);
          }
        });
      }
    } else if (targetWith) {
      initializedUrlRef.current = true;
      handleStartConversation(targetWith, targetHandle || "@ANON");
    }
  }, [user, conversations]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    try {
      const results = await searchUsersByHandle(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleStartConversation = async (targetUid: string, targetHandle: string) => {
    if (!user) return;
    try {
      const convId = await startOrGetConversation(user.uid, user.handle || "@ANON", targetUid, targetHandle);
      const db = getFirebaseDb();
      const convRef = doc(db, "whispers", convId);
      const convSnap = await getDoc(convRef).catch(() => null);

      const conversationData: WhisperConversation = convSnap && convSnap.exists()
        ? ({ id: convSnap.id, ...convSnap.data() } as WhisperConversation)
        : {
            id: convId,
            participants: [user.uid, targetUid],
            handles: {
              [user.uid]: user.handle || "@ANON",
              [targetUid]: targetHandle || "@ANON",
            },
            lastMessage: "",
            lastAt: null,
            createdAt: null,
          };

      setDraftConv(conversationData);
      setActiveConvId(convId);
      setShowNew(false);
      setSearchQuery("");
      setSearchResults([]);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", `/wire?c=${convId}`);
      }
    } catch (err) {
      console.warn("Failed to start conversation:", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs tracking-widest uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ AUTHENTICATING... ]
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="max-w-4xl mx-auto h-[calc(100dvh-3.5rem-4rem)] md:h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r border-neutral-900 flex flex-col h-full ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 sm:p-4 border-b border-neutral-900 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold tracking-widest uppercase flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" /> [ WIRE ]
              </h2>
              <button
                onClick={() => setShowNew(!showNew)}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-neutral-800 px-2 py-0.5"
              >
                <Plus className="w-3 h-3" /> NEW WIRE
              </button>
            </div>

            {/* Quick Suggestions Bar for Orbiting / Top Voices */}
            <div className="pt-2">
              <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">
                [ 💫 QUICK WIRE — ACCOUNTS YOU ORBIT ]
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(followingList.length > 0
                  ? followingList.map((f) => ({ uid: f.followingUid, handle: f.followingHandle }))
                  : suggestedVoices
                ).slice(0, 6).map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => handleStartConversation(u.uid, u.handle)}
                    className="px-2 py-1 bg-neutral-900 hover:bg-white hover:text-black border border-neutral-800 text-[10px] text-neutral-300 font-mono transition-colors cursor-pointer shrink-0 flex items-center gap-1 rounded-sm"
                  >
                    <span>{u.handle}</span>
                  </button>
                ))}
              </div>
            </div>

            {showNew && (
              <div className="mt-3 space-y-2 pt-2 border-t border-neutral-900">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search handle..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-2.5 py-1 border border-white text-white text-xs hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30"
                  >
                    {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-neutral-800 max-h-48 overflow-y-auto bg-neutral-950">
                    {searchResults.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => handleStartConversation(u.uid, u.handle)}
                        className="w-full text-left px-3 py-2 border-b border-neutral-900 hover:bg-neutral-900 transition-colors flex items-center justify-between"
                      >
                        <p className="text-xs text-white font-mono">{u.handle}</p>
                        <span className="text-[9px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5">[ 💬 WIRE ]</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 space-y-4">
                <div className="p-3 border border-neutral-900 bg-neutral-950 text-center space-y-1">
                  <p className="text-xs text-neutral-400 tracking-widest uppercase font-bold">[ NO ACTIVE WIRES ]</p>
                  <p className="text-[10px] text-neutral-600">Tap any user below to start a private voice DM</p>
                </div>

                {/* Rich Suggested Voices List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    {followingList.length > 0 ? "ACCOUNTS YOU ORBIT:" : "TOP SUGGESTED VOICES:"}
                  </p>
                  <div className="space-y-1.5">
                    {(followingList.length > 0
                      ? followingList.map((f) => ({ uid: f.followingUid, handle: f.followingHandle }))
                      : suggestedVoices
                    ).map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => handleStartConversation(u.uid, u.handle)}
                        className="w-full p-2.5 border border-neutral-900 hover:border-neutral-700 bg-neutral-950/60 hover:bg-neutral-900 flex items-center justify-between transition-colors cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400 group-hover:text-white group-hover:border-white">
                            {u.handle.replace("@", "").charAt(0)}
                          </div>
                          <span className="text-xs font-mono text-white group-hover:text-amber-300">{u.handle}</span>
                        </div>
                        <span className="text-[9px] font-mono border border-neutral-800 px-2 py-0.5 text-neutral-400 group-hover:border-white group-hover:text-white uppercase transition-colors">
                          [ 💬 WIRE ]
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  myUid={user.uid}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setDraftConv(null);
                    if (typeof window !== "undefined") {
                      window.history.replaceState({}, "", `/wire?c=${conv.id}`);
                    }
                  }}
                  active={activeConvId === conv.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${activeConv ? 'flex' : 'hidden md:flex'}`}>
          {activeConv ? (
            <ChatWindow
              conv={activeConv}
              myUid={user.uid}
              myHandle={user.handle || "@ANON"}
              onBack={() => setActiveConvId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-sm">
                <Mic2 className="w-12 h-12 text-neutral-800 mx-auto animate-pulse" />
                <div>
                  <p className="text-xs text-neutral-400 tracking-widest uppercase font-bold">[ SELECT A WIRE ]</p>
                  <p className="text-[11px] text-neutral-600 mt-1">Choose a conversation or tap a suggested voice to start private audio messaging.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
