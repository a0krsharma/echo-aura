"use client";

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

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, Mic2, Lock, Plus, Search, X, Send, ChevronLeft, Loader2, Phone, PhoneOff, Play, Pause, Square } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import {
  startOrGetConversation,
  sendWhisper,
  subscribeToConversations,
  subscribeToMessages,
  markMessagesRead,
  searchUsersByHandle,
  addSignalingMessage,
  subscribeToSignaling,
  type WhisperConversation,
  type WhisperMessage,
} from "@/lib/whispers";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
  const stunUrl = process.env.NEXT_PUBLIC_STUN_URL || "stun:stun.l.google.com:19302";
  const iceServers: any[] = [{ urls: [stunUrl] }];

  const turnUrlsRaw = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD;

  if (turnUrlsRaw) {
    const urls = turnUrlsRaw.split(",").map(s => s.trim()).filter(Boolean);
    const turnConfig: any = { urls };
    if (turnUsername) turnConfig.username = turnUsername;
    if (turnCredential) turnConfig.credential = turnCredential;
    iceServers.push(turnConfig);
  }

  return iceServers;
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
    markMessagesRead(conv.id, myUid).catch(() => {});
    return () => unsub();
  }, [conv.id, myUid]);

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

      const uploadRes = await uploadAudio(blob, `wire_voice_${Date.now()}.webm`);
      const audioUrl = typeof uploadRes === "string" ? uploadRes : uploadRes?.secureUrl || "";
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
      if (!msg || msg.senderUid === myUid) return;
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
          <p className="font-mono text-xs text-white tracking-widest">{theirHandle}</p>
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderUid === myUid ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 space-y-1.5 ${
                  msg.senderUid === myUid
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
                <p className="font-mono text-[9px] text-neutral-500 tracking-widest uppercase">
                  {timeStr(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
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

      <form onSubmit={handleSend} className="p-4 border-t border-neutral-900 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a wire..."
          disabled={isRecording}
          className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors disabled:opacity-40"
        />

        {/* Voice Echo Mic Button */}
        {!isRecording && (
          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={sending}
            className="px-3 py-2 border border-neutral-700 text-neutral-300 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Record Voice Echo"
          >
            <Mic className="w-3.5 h-3.5 text-red-400" />
            [ 🎙 VOICE ]
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() || sending || isRecording}
          className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30 flex items-center gap-2 shrink-0 font-bold"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          SEND
        </button>
      </form>
    </div>
  );
}

function WirePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetConvId = searchParams.get("c");

  const [conversations, setConversations] = useState<WhisperConversation[]>([]);
  const [activeConv, setActiveConv] = useState<WhisperConversation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (convs) => setConversations(convs));
    return () => unsub && unsub();
  }, [user]);

  // Auto-select conversation from query param ?c=...
  useEffect(() => {
    if (!targetConvId) return;
    const found = conversations.find((c) => c.id === targetConvId);
    if (found) {
      setActiveConv(found);
    } else {
      const db = getFirebaseDb();
      getDoc(doc(db, "whispers", targetConvId)).then((snap) => {
        if (snap.exists()) {
          setActiveConv({ id: snap.id, ...snap.data() } as WhisperConversation);
        }
      });
    }
  }, [targetConvId, conversations]);

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
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        setActiveConv({ id: convSnap.id, ...convSnap.data() } as WhisperConversation);
      }
      setShowNew(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to start conversation:", err);
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
      <div className="max-w-4xl mx-auto h-screen flex flex-col md:flex-row">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r border-neutral-900 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-widest uppercase">[ WIRE ]</h2>
              <button
                onClick={() => setShowNew(!showNew)}
                className="text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> NEW
              </button>
            </div>

            {showNew && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by handle..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 px-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-2 py-1 border border-white text-white text-xs hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30"
                  >
                    {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-neutral-800 max-h-48 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => handleStartConversation(u.uid, u.handle)}
                        className="w-full text-left px-3 py-2 border-b border-neutral-900 hover:bg-neutral-950 transition-colors"
                      >
                        <p className="text-xs text-white">{u.handle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-neutral-600 tracking-widest uppercase">NO WIRES YET</p>
                <p className="text-[10px] text-neutral-700 mt-2">Start a new wire to begin</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  myUid={user.uid}
                  onClick={() => setActiveConv(conv)}
                  active={activeConv?.id === conv.id}
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
              onBack={() => setActiveConv(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Mic2 className="w-12 h-12 text-neutral-800 mx-auto" />
                <p className="text-xs text-neutral-600 tracking-widest uppercase">SELECT A WIRE</p>
                <p className="text-[10px] text-neutral-700">Choose a conversation or start a voice message</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WirePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs tracking-widest uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ LOADING WIRE CONSOLE... ]
        </div>
      </div>
    }>
      <WirePageContent />
    </Suspense>
  );
}
