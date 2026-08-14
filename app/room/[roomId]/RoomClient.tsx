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
import { getRoom, subscribeToRoom, subscribeToRoomParticipants, removeParticipant, sendRoomChatMessage, subscribeToRoomChat, raiseHand, lowerHand, promoteToSpeaker, demoteFromSpeaker, muteParticipant, unmuteParticipant, sendRoomReaction, subscribeToRoomReactions, bookmarkRoom, removeRoomBookmark, updateRoomOpenMic, type Room, type RoomParticipant } from "@/lib/rooms";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { followUser, unfollowUser, isFollowing } from "@/lib/follows";
import { createNotification } from "@/lib/notifications";

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
  const [showChat, setShowChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Reactions state
  const [reactions, setReactions] = useState<Array<{uid: string; handle: string; emoji: string; timestamp: any}>>([]);
  const REACTIONS = ["👏", "❤️", "🔥", "😂", "👍"];

  // Profile modal state
  const [profileModal, setProfileModal] = useState<{uid: string; handle: string} | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [previousPendingRequests, setPreviousPendingRequests] = useState(0);

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
        
        // Request microphone permission first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("[Room] Microphone permission granted");
        } catch (permError) {
          console.error("[Room] Microphone permission denied:", permError);
          alert("Microphone permission is required for audio in rooms. Please allow microphone access and refresh.");
          return;
        }
        
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
      // Count pending raise hand requests for host
      if (user && room?.hostUid === user.uid) {
        const raisedHands = participantsData.filter(p => p.raisedHand && p.uid !== user.uid);
        setPendingRequests(raisedHands.length);
        
        // Send notification when new requests come in
        if (raisedHands.length > previousPendingRequests && room) {
          const newRequests = raisedHands.length - previousPendingRequests;
          raisedHands.slice(-newRequests).forEach(participant => {
            createNotification(user.uid, {
              type: "raise_hand",
              fromUid: participant.uid,
              fromHandle: participant.handle,
              roomId: roomId,
              roomName: room.name,
              text: `${participant.handle} raised hand in "${room.name}"`,
            });
          });
        }
        setPreviousPendingRequests(raisedHands.length);
      }
      // Check if current user has raised hand
      setHasRequestedToSpeak(currentUser?.raisedHand || false);
    });

    // Subscribe to real-time chat
    const unsubChat = subscribeToRoomChat(roomId, (messages) => {
      setChatMessages(messages);
    });

    // Subscribe to reactions
    const unsubReactions = subscribeToRoomReactions(roomId, (reactionData) => {
      setReactions(reactionData);
      // Auto-remove reactions after 3 seconds
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.timestamp !== reactionData[reactionData.length - 1]?.timestamp));
      }, 3000);
    });

    return () => {
      unsubRoom();
      unsubParticipants();
      unsubChat();
      unsubReactions();
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
  const handleRequestToSpeak = async () => {
    if (!user) return;
    try {
      await raiseHand(roomId, user.uid);
      setHasRequestedToSpeak(true);
    } catch (error) {
      console.error("Error raising hand:", error);
    }
  };

  // Cancel request to speak
  const handleCancelRequest = async () => {
    if (!user) return;
    try {
      await lowerHand(roomId, user.uid);
      setHasRequestedToSpeak(false);
    } catch (error) {
      console.error("Error lowering hand:", error);
    }
  };

  // Moderator: Promote to speaker
  const handlePromoteSpeaker = async (uid: string) => {
    try {
      await promoteToSpeaker(roomId, uid);
    } catch (error) {
      console.error("Error promoting speaker:", error);
    }
  };

  // Moderator: Demote from speaker
  const handleDemoteSpeaker = async (uid: string) => {
    try {
      await demoteFromSpeaker(roomId, uid);
    } catch (error) {
      console.error("Error demoting speaker:", error);
    }
  };

  // Moderator: Mute participant
  const handleMute = async (uid: string) => {
    try {
      await muteParticipant(roomId, uid);
    } catch (error) {
      console.error("Error muting participant:", error);
    }
  };

  // Moderator: Unmute participant
  const handleUnmute = async (uid: string) => {
    try {
      await unmuteParticipant(roomId, uid);
    } catch (error) {
      console.error("Error unmuting participant:", error);
    }
  };

  // Send reaction
  const handleSendReaction = async (emoji: string) => {
    if (!user) return;
    try {
      await sendRoomReaction(roomId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        emoji,
      });
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  };

  // Load profile data
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
        
        // Load user data
        const userDoc = await getDoc(doc(db, "users", profileModal.uid));
        if (userDoc.exists()) {
          setProfileData({ uid: userDoc.id, ...userDoc.data() });
        }

        // Load user posts
        const postsQuery = query(
          collection(db, "posts"),
          where("authorUid", "==", profileModal.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const postsSnap = await getDocs(postsQuery);
        setProfilePosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Check if current user is orbiting
        if (user) {
          const following = await isFollowing(user.uid, profileModal.uid);
          setIsOrbiting(following);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [profileModal, user]);

  // Handle orbit/unorbit
  const handleOrbitUser = async () => {
    if (!user || !profileModal) return;
    try {
      if (isOrbiting) {
        await unfollowUser(user.uid, profileModal.uid);
        setIsOrbiting(false);
      } else {
        await followUser(user.uid, user.handle || "@ANON", profileModal.uid, profileModal.handle);
        setIsOrbiting(true);
      }
    } catch (error) {
      console.error("Error orbiting user:", error);
    }
  };

  // Handle room bookmark
  const handleBookmarkRoom = async () => {
    if (!user) return;
    try {
      if (isBookmarked) {
        await removeRoomBookmark(user.uid, roomId);
        setIsBookmarked(false);
      } else {
        await bookmarkRoom(user.uid, roomId);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Error bookmarking room:", error);
    }
  };

  // Handle open mic toggle
  const handleToggleOpenMic = async () => {
    if (!user || !room || user.uid !== room.hostUid) return;
    try {
      const newOpenMic = !room.openMic;
      await updateRoomOpenMic(roomId, newOpenMic);
    } catch (error) {
      console.error("Error toggling open mic:", error);
    }
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
          {user && user.uid === room?.hostUid && pendingRequests > 0 && (
            <span className="flex items-center gap-1 text-yellow-500 font-mono text-[10px] uppercase animate-pulse">
              <Hand size={10} /> {pendingRequests} REQUEST{pendingRequests > 1 ? "S" : ""}
            </span>
          )}
          {user && user.uid === room?.hostUid && (
            <button
              onClick={handleToggleOpenMic}
              className={`font-mono text-[10px] uppercase px-2 py-1 border transition-colors cursor-pointer ${
                room.openMic ? "border-white text-white" : "border-neutral-800 text-neutral-500"
              }`}
              title={room.openMic ? "Switch to raise hand mode" : "Switch to open mic mode"}
            >
              {room.openMic ? "OPEN MIC" : "RAISE HAND"}
            </button>
          )}
          {user && (
            <button
              onClick={handleBookmarkRoom}
              className="text-neutral-500 hover:text-yellow-500 transition-colors cursor-pointer"
              title={isBookmarked ? "Remove bookmark" : "Bookmark room"}
            >
              {isBookmarked ? "★" : "☆"}
            </button>
          )}
          <button
            onClick={handleLeave}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            [ 🚪 LEAVE ]
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6">
        {/* Room Info - Compact Header */}
        <div className="border border-neutral-800 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-mono text-xl tracking-widest text-white uppercase">
                "{room.name}"
              </h1>
              {room.description && (
                <p className="font-mono text-neutral-400 text-sm">
                  {room.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-neutral-600 font-mono text-xs">
                <span>{room.category}</span>
                <span>•</span>
                <span>{room.hostHandle}</span>
                {!room.isPublic && <Lock size={12} className="text-neutral-600" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 border border-neutral-800 font-mono text-[10px] text-neutral-600 uppercase">
                {room.isPublic ? "PUBLIC" : "PRIVATE"}
              </span>
              {user && (
                <button
                  onClick={handleBookmarkRoom}
                  className="text-neutral-500 hover:text-yellow-500 transition-colors cursor-pointer"
                  title={isBookmarked ? "Remove bookmark" : "Bookmark room"}
                >
                  {isBookmarked ? "★" : "☆"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Speakers - Prominent Top Section */}
        <div className="border border-white p-4 space-y-3 bg-white/5">
          <div className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase flex justify-between">
            <span>// SPEAKERS ({participants.filter(p => p.isSpeaker).length})</span>
            {user && user.uid === room?.hostUid && pendingRequests > 0 && (
              <span className="text-yellow-500 animate-pulse">{pendingRequests} REQUEST{pendingRequests > 1 ? "S" : ""}</span>
            )}
          </div>
          {participants.filter(p => p.isSpeaker).length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {participants.filter(p => p.isSpeaker).map((participant) => (
                <div
                  key={participant.id || participant.uid}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    <button
                      onClick={() => setProfileModal({ uid: participant.uid, handle: participant.handle })}
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-mono text-lg relative hover:border-white hover:text-white transition-all cursor-pointer ${
                        speakingUsers.has(participant.uid) 
                          ? "border-green-500 text-green-400 bg-green-500/20" 
                          : "border-white text-neutral-400 bg-neutral-900"
                      }`}
                    >
                      {participant.handle.charAt(1)}
                      {speakingUsers.has(participant.uid) && (
                        <div className="absolute inset-0 bg-green-500/30 rounded-full animate-pulse" />
                      )}
                    </button>
                    {speakingUsers.has(participant.uid) && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-xs text-white">{participant.handle}</div>
                    <div className="font-mono text-[10px] text-neutral-600 uppercase">
                      {speakingUsers.has(participant.uid) ? "SPEAKING" : participant.isMuted ? "MUTED" : "SPEAKER"}
                    </div>
                  </div>
                  {/* Moderator controls for host */}
                  {user && user.uid === room?.hostUid && participant.uid !== user.uid && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => participant.isMuted ? handleUnmute(participant.uid) : handleMute(participant.uid)}
                        className={`font-mono text-[8px] uppercase cursor-pointer transition-colors ${
                          participant.isMuted ? "text-red-500 hover:text-red-400" : "text-neutral-500 hover:text-white"
                        }`}
                      >
                        [{participant.isMuted ? "UNMUTE" : "MUTE"}]
                      </button>
                      <button
                        onClick={() => handleDemoteSpeaker(participant.uid)}
                        className="font-mono text-[8px] text-red-500 hover:text-red-400 uppercase cursor-pointer transition-colors"
                      >
                        [DEMOTE]
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 font-mono text-xs text-neutral-500 uppercase">
              NO SPEAKERS YET
            </div>
          )}
        </div>

        {/* Listeners */}
        <div className="border border-neutral-800 p-4 space-y-3">
          <div className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase">
            // LISTENERS ({participants.filter(p => !p.isSpeaker).length})
          </div>
          {participants.filter(p => !p.isSpeaker).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {participants.filter(p => !p.isSpeaker).map((participant) => (
                <div
                  key={participant.id || participant.uid}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative">
                    <button
                      onClick={() => setProfileModal({ uid: participant.uid, handle: participant.handle })}
                      className="w-12 h-12 rounded-full border border-neutral-700 flex items-center justify-center font-mono text-sm text-neutral-400 hover:border-white hover:text-white transition-all cursor-pointer bg-neutral-900"
                    >
                      {participant.handle.charAt(1)}
                      {participant.raisedHand && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce">
                          <Hand size={10} className="text-black" />
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-[10px] text-neutral-400">{participant.handle}</div>
                    {participant.raisedHand && (
                      <div className="font-mono text-[8px] text-yellow-500 uppercase">HAND RAISED</div>
                    )}
                  </div>
                  {/* Moderator controls for host */}
                  {user && user.uid === room?.hostUid && participant.uid !== user.uid && (
                    <div className="flex items-center gap-1">
                      {participant.raisedHand ? (
                        <button
                          onClick={() => handlePromoteSpeaker(participant.uid)}
                          className="font-mono text-[8px] text-green-500 hover:text-green-400 uppercase cursor-pointer transition-colors"
                        >
                          [ACCEPT]
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromoteSpeaker(participant.uid)}
                          className="font-mono text-[8px] text-neutral-500 hover:text-white uppercase cursor-pointer transition-colors"
                        >
                          [PROMOTE]
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 font-mono text-xs text-neutral-500 uppercase">
              NO LISTENERS YET
            </div>
          )}
        </div>

        {/* Audio Controls */}
        <div className="border border-neutral-800 p-4 space-y-4">
          <div className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
                >
                  [ 💬 CHAT ({chatMessages.length}) ]
                </button>
                <button
                  onClick={() => setIsSpeaker(false)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
                >
                  [ STOP SPEAKING ]
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-600 uppercase">LISTENING MODE</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
                >
                  [ 💬 CHAT ({chatMessages.length}) ]
                </button>
                {room.openMic ? (
                  <button
                    onClick={handleRequestToSpeak}
                    className="px-4 py-2 border border-white text-white hover:bg-white hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Mic size={12} />
                    [ JOIN AS SPEAKER ]
                  </button>
                ) : hasRequestedToSpeak ? (
                  <button
                    onClick={handleCancelRequest}
                    className="px-4 py-2 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Hand size={12} />
                    [ CANCEL REQUEST ]
                  </button>
                ) : (
                  <button
                    onClick={handleRequestToSpeak}
                    className="px-4 py-2 border border-white text-white hover:bg-white hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Hand size={12} />
                    [ REQUEST TO SPEAK ]
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Bottom Sheet */}
        {showChat && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black border-t border-neutral-800 animate-slide-up">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-900">
              <div className="font-mono text-xs tracking-widest text-neutral-700 uppercase">
                // ROOM CHAT ({chatMessages.length})
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs tracking-widest select-text"
            >
              {/* Floating reactions overlay */}
              {reactions.length > 0 && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
                  {reactions.slice(-5).map((r, i) => (
                    <div
                      key={i}
                      className="absolute text-4xl animate-bounce"
                      style={{
                        left: `${20 + i * 15}%`,
                        top: `${20 + (i % 3) * 20}%`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>
              )}
              
              {chatMessages.length === 0 ? (
                <div className="text-neutral-700 font-mono py-8 text-center">
                  NO MESSAGES YET. START THE CONVERSATION.
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="text-neutral-300 leading-relaxed">
                    <span className="text-neutral-700">{msg.time} </span>
                    <span className="text-white">{msg.handle}: </span>
                    <span className="text-neutral-400 font-mono">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-neutral-900 space-y-3">
              {/* Reactions bar */}
              <div className="flex items-center gap-2">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="px-3 py-1 border border-neutral-800 hover:border-white text-neutral-500 hover:text-white font-mono text-[10px] uppercase transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
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
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-black border border-neutral-700 p-6 md:p-8 animate-slide-up space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="font-mono text-xs tracking-widest text-neutral-500 mb-1">// PARTICIPANT PROFILE</p>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif italic text-xl text-white">{profileModal.handle}</h2>
                  {profileData?.verified && (
                    <span className="text-yellow-500 text-sm">✓</span>
                  )}
                </div>
              </div>
              <button onClick={() => setProfileModal(null)} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {loadingProfile ? (
              <div className="py-8 text-center">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase animate-pulse">LOADING PROFILE...</p>
              </div>
            ) : profileData ? (
              <div className="space-y-4">
                {/* Bio */}
                {profileData.bio && (
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">BIO</p>
                    <p className="font-mono text-neutral-300 text-sm">{profileData.bio}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 border border-neutral-900 p-3">
                  <div className="text-center">
                    <p className="font-mono text-lg text-white">{profilePosts.length}</p>
                    <p className="font-mono text-[10px] text-neutral-600 uppercase">ECHOES</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-white">{profileData.auraScore || 0}</p>
                    <p className="font-mono text-[10px] text-neutral-600 uppercase">[ AURA ]</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg text-white">{profileData.badges?.length || 0}</p>
                    <p className="font-mono text-[10px] text-neutral-600 uppercase">BADGES</p>
                  </div>
                </div>

                {/* Badges */}
                {profileData.badges && profileData.badges.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-2">BADGES</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {profileData.badges.map((badge: string, i: number) => (
                        <span key={i} className="px-2 py-1 border border-neutral-800 font-mono text-xs text-neutral-400">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Echoes */}
                {profilePosts.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-2">RECENT ECHOES</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profilePosts.map((post) => (
                        <div key={post.id} className="border border-neutral-900 p-2">
                          <p className="font-mono text-neutral-300 text-sm truncate">"{post.caption}"</p>
                          <p className="font-mono text-[10px] text-neutral-600 mt-1">{post.pulseCount || 0} PULSES</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orbit Button */}
                {user && user.uid !== profileModal.uid && (
                  <button
                    onClick={handleOrbitUser}
                    className={`w-full font-mono text-xs tracking-widest uppercase px-4 py-3 transition-colors cursor-pointer ${
                      isOrbiting
                        ? "border border-neutral-700 text-neutral-500 hover:border-white hover:text-white"
                        : "border border-white text-white hover:bg-white hover:text-black"
                    }`}
                  >
                    {isOrbiting ? "[ UNORBIT ]" : "[ ORBIT ]"}
                  </button>
                )}

                {/* View Full Profile */}
                <Link
                  href={`/${profileModal.handle.replace(/^@/, "")}`}
                  onClick={() => setProfileModal(null)}
                  className="block text-center font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  VIEW FULL PROFILE →
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">PROFILE NOT FOUND</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomClient({ roomId }: RoomClientProps) {
  return <RoomContent roomId={roomId} />;
}
