"use client";

/**
 * app/room/[roomId]/RoomClient.tsx
 * ─────────────────────────────────────────────────────
 * Room participation with Agora audio integration
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Users, Radio, Send, X, Volume2, Hand, Lock } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";

import { useAuth } from "@/app/components/AuthProvider";
import { AGORA_APP_ID } from "@/lib/agora";
import { getRoom, subscribeToRoom, subscribeToRoomParticipants, removeParticipant, sendRoomChatMessage, subscribeToRoomChat, type Room, type RoomParticipant } from "@/lib/rooms";

interface RoomClientProps {
  roomId: string;
}

function RoomContent({ roomId }: RoomClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Room state
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [hasRequestedToSpeak, setHasRequestedToSpeak] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{handle: string; text: string; time: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Agora setup (raw SDK)
  const [token, setToken] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const clientRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);

  // Initialize Agora client and join channel
  useEffect(() => {
    if (!user || !room?.agoraChannel) return;

    let mounted = true;

    async function setupAgora() {
      try {
        if (!room?.agoraChannel || !user?.uid) return;
        
        console.log("[Room] Setting up Agora for channel:", room.agoraChannel);
        
        // Create client
        const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });
        clientRef.current = client;

        // Fetch token
        const response = await fetch(
          `/api/agora/token?channel=${room.agoraChannel}&uid=${user.uid}`
        );
        const data = await response.json();
        const agoraToken = data.token || null;

        // Join channel
        await client.join(AGORA_APP_ID, room.agoraChannel, agoraToken || undefined, user.uid);
        console.log("[Room] Joined Agora channel");

        // Create and publish local audio track
        const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTrackRef.current = localAudioTrack;
        
        await client.publish([localAudioTrack]);
        console.log("[Room] Published local audio track");

        // Subscribe to remote users
        client.on("user-published", async (remoteUser: any, mediaType: string) => {
          if (mediaType === "audio") {
            await client.subscribe(remoteUser, mediaType);
            console.log("[Room] Subscribed to remote user:", remoteUser.uid);
            // Play the remote audio track
            remoteUser.audioTrack.play();
            console.log("[Room] Playing remote audio for:", remoteUser.uid);
            
            // Track speaking users
            remoteUser.audioTrack.on("volume-indicator", (volume: number) => {
              if (volume > 5 && mounted) {
                setSpeakingUsers(prev => new Set([...prev, remoteUser.uid]));
              }
            });
          }
        });

        client.on("user-unpublished", (remoteUser: any) => {
          console.log("[Room] Remote user unpublished:", remoteUser.uid);
          setSpeakingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(remoteUser.uid);
            return newSet;
          });
        });

      } catch (error) {
        console.error("[Room] Agora setup error:", error);
      }
    }

    setupAgora();

    return () => {
      mounted = false;
      // Cleanup
      if (localTrackRef.current) {
        try {
          localTrackRef.current.close();
        } catch (e) {
          console.log("[Room] Error closing local track:", e);
        }
      }
      if (clientRef.current) {
        try {
          clientRef.current.leave();
        } catch (e) {
          console.log("[Room] Error leaving Agora channel:", e);
        }
      }
    };
  }, [user, room?.agoraChannel]);

  // Mute/unmute local track
  useEffect(() => {
    if (localTrackRef.current) {
      if (micMuted) {
        localTrackRef.current.setMuted(true);
      } else {
        localTrackRef.current.setMuted(false);
      }
    }
  }, [micMuted]);

  // Fetch room details
  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
    });

    const unsubParticipants = subscribeToRoomParticipants(roomId, (participantsData) => {
      setParticipants(participantsData);
      // Check if current user is a speaker
      const currentUser = participantsData.find(p => p.uid === user?.uid);
      setIsSpeaker(currentUser?.isSpeaker || false);
    });

    // Subscribe to real-time chat
    const unsubChat = subscribeToRoomChat(roomId, (messages) => {
      setChatMessages(messages);
    });

    return () => {
      unsubRoom();
      unsubParticipants();
      unsubChat();
    };
  }, [roomId, user?.uid]);

  // Handle leaving room
  const handleLeave = async () => {
    if (user) {
      try {
        await removeParticipant(roomId, user.uid);
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    }
    router.push("/rooms");
  };

  // Request to speak
  const handleRequestToSpeak = () => {
    setHasRequestedToSpeak(true);
    // In a real implementation, this would send a request to the host
    // For now, we'll auto-approve after 2 seconds for demo
    setTimeout(() => {
      setHasRequestedToSpeak(false);
      setIsSpeaker(true);
    }, 2000);
  };

  // Send chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    try {
      await sendRoomChatMessage(roomId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        text: chatInput.trim(),
      });
      setChatInput("");
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          [ LOADING ROOM... ]
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-900 p-4 font-mono text-xs tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" /> [ ● LIVE ]
          </span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-500">{room.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-neutral-500 flex items-center gap-1">
            <Users size={12} /> {participants.length}/{room.maxParticipants}
          </span>
          <button
            onClick={handleLeave}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            [ 🚪 LEAVE ]
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-6">
        {/* Room Info */}
        <div className="border border-neutral-800 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                // ROOM
              </div>
              <h1 className="font-serif italic text-2xl text-white">
                "{room.name}"
              </h1>
              {room.description && (
                <p className="font-serif italic text-neutral-400 text-sm">
                  {room.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-neutral-600 font-mono text-xs">
                <span>{room.category}</span>
                <span>•</span>
                <span>HOSTED BY {room.hostHandle}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!room.isPublic && <Lock size={16} className="text-neutral-600" />}
              <span className="px-2 py-1 border border-neutral-800 font-mono text-[10px] text-neutral-600 uppercase">
                {room.isPublic ? "PUBLIC" : "PRIVATE"}
              </span>
            </div>
          </div>

          {/* Tags */}
          {room.tags && room.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {room.tags.map((tag, i) => (
                <span key={i} className="px-2 py-1 border border-neutral-900 font-mono text-[10px] text-neutral-600 uppercase">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="border border-neutral-800 p-4 space-y-3">
          <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase flex justify-between">
            <span>// PARTICIPANTS ({participants.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {participants.map((participant) => (
              <div
                key={participant.uid}
                className={`border p-3 space-y-2 ${
                  participant.isSpeaker ? "border-white" : "border-neutral-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 border border-neutral-700 flex items-center justify-center font-mono text-xs text-neutral-400 relative">
                    {participant.handle.charAt(1)}
                    {speakingUsers.has(participant.uid) && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-xs text-white">{participant.handle}</div>
                    <div className="font-mono text-[10px] text-neutral-600 uppercase">
                      {participant.isSpeaker ? "SPEAKER" : "LISTENER"}
                    </div>
                  </div>
                </div>
                {participant.isSpeaker && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="font-mono text-[10px] text-neutral-600 uppercase">LIVE</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Audio Controls */}
        <div className="border border-neutral-800 p-4 space-y-4">
          <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
            // AUDIO CONTROLS
          </div>
          
          {isSpeaker ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`px-4 py-2 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2 ${
                    micMuted
                      ? "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                      : "border-white text-white"
                  }`}
                >
                  {micMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  {micMuted ? "[ MUTED ]" : "[ LIVE ]"}
                </button>
                <span className="font-mono text-xs text-neutral-600 uppercase">YOU ARE SPEAKING</span>
              </div>
              <button
                onClick={() => setIsSpeaker(false)}
                className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
              >
                [ STOP SPEAKING ]
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-600 uppercase">LISTENING MODE</span>
              <button
                onClick={handleRequestToSpeak}
                disabled={hasRequestedToSpeak}
                className="px-4 py-2 border border-white text-white hover:bg-white hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Hand size={12} />
                {hasRequestedToSpeak ? "[ REQUESTED ]" : "[ REQUEST TO SPEAK ]"}
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="border border-neutral-800 p-4 space-y-4">
          <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
            // ROOM CHAT
          </div>
          
          <div
            ref={chatScrollRef}
            className="h-48 overflow-y-auto no-scrollbar space-y-2 font-mono text-xs tracking-widest select-text border border-neutral-900 p-3"
          >
            {chatMessages.length === 0 ? (
              <div className="text-neutral-700 italic font-serif py-4 text-center">
                No messages yet. Start the conversation.
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="text-neutral-300 leading-relaxed">
                  <span className="text-neutral-700">{msg.time} </span>
                  <span className="text-white">{msg.handle}: </span>
                  <span className="text-neutral-400 font-serif italic">{msg.text}</span>
                </div>
              ))
            )}
          </div>

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
              disabled={!chatInput.trim()}
              className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30 flex items-center gap-2"
            >
              <Send size={12} /> SEND
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function RoomClient({ roomId }: RoomClientProps) {
  return <RoomContent roomId={roomId} />;
}
