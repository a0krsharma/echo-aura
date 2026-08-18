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
import { ShareButton } from "@/app/components/ShareButton";
import { FormattedText } from "@/app/components/FormattedText";
import BroadcastModal from "@/app/components/BroadcastModal";
import { AGORA_APP_ID } from "@/lib/agora";
import { getRoom, subscribeToRoom, subscribeToRoomParticipants, addParticipant, removeParticipant, sendRoomChatMessage, subscribeToRoomChat, raiseHand, lowerHand, promoteToSpeaker, demoteFromSpeaker, muteParticipant, unmuteParticipant, sendRoomReaction, subscribeToRoomReactions, bookmarkRoom, removeRoomBookmark, updateRoomOpenMic, updateRoomTransmit, hostOverrideBan, endRoom, type Room, type RoomParticipant } from "@/lib/rooms";
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
  const [micMuted, setMicMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const clientRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);      // VAD: 30s silence → auto-demote
  const isSpeakerRef = useRef(false);              // stale-closure-safe copy of isSpeaker
  const agoraInitializedRef = useRef(false);       // guard against double-init

  // Keep isSpeakerRef in sync so volume-indicator callback always sees latest value
  useEffect(() => {
    isSpeakerRef.current = isSpeaker;
  }, [isSpeaker]);

  // ── Initialize Agora for ALL users (listeners → audience, speakers → host) ──
  // Runs once when room channel is available. Role transitions handled in the
  // separate effect below.
  useEffect(() => {
    if (!user?.uid || !room?.agoraChannel) return;
    if (agoraInitializedRef.current) return; // guard double-init on re-renders
    agoraInitializedRef.current = true;

    let mounted = true;

    async function setupAgora() {
      try {
        console.log("[Room] Initialising Agora for channel:", room!.agoraChannel);

        // Create client in live mode (supports both host and audience roles)
        const client = AgoraRTC.createClient({ codec: "vp8", mode: "live" });
        clientRef.current = client;

        // Fetch Agora token
        let agoraToken: string | null = null;
        try {
          const res = await fetch(`/api/agora/token?channel=${room!.agoraChannel}&uid=${user!.uid}`);
          const data = await res.json();
          agoraToken = data.token || null;
        } catch (e) {
          console.warn("[Room] Token fetch failed, joining without token:", e);
        }

        // Set initial Agora role based on current speaker status
        const initialRole = isSpeakerRef.current ? "host" : "audience";
        try { await client.setClientRole(initialRole); } catch (e) {
          console.warn("[Room] setClientRole failed:", e);
        }

        // Join channel — ALL users join (listeners as audience, speakers as host)
        await client.join(AGORA_APP_ID, room!.agoraChannel, agoraToken || null, user!.uid);
        if (!mounted) { try { client.leave(); } catch(e){} return; }
        console.log("[Room] Joined Agora channel as", initialRole);

        // If entering as a speaker (host of room), request mic and publish immediately
        if (isSpeakerRef.current) {
          await publishLocalMic(client, mounted);
        }

        // Enable volume indicator for VAD (fires every 200ms)
        try { client.enableAudioVolumeIndicator(); } catch (e) { /* SDK version may differ */ }

        // ── Remote audio subscription ────────────────────────────────────
        client.on("user-published", async (remoteUser: any, mediaType: string) => {
          if (mediaType === "audio" && mounted) {
            try {
              await client.subscribe(remoteUser, mediaType);
              remoteUser.audioTrack?.play();
              console.log("[Room] Subscribed & playing remote audio:", remoteUser.uid);
            } catch (e) {
              console.warn("[Room] Subscribe error:", e);
            }
          }
        });

        // Autoplay policy fallback — resume WebRTC audio playback on user interaction
        const handleUserGesture = () => {
          if (!clientRef.current) return;
          clientRef.current.remoteUsers.forEach((remoteUser: any) => {
            if (remoteUser.audioTrack && !remoteUser.audioTrack.isPlaying) {
              try { remoteUser.audioTrack.play(); } catch (e) {}
            }
          });
        };
        window.addEventListener("click", handleUserGesture);
        window.addEventListener("touchstart", handleUserGesture);

        client.on("user-unpublished", (remoteUser: any) => {
          setSpeakingUsers(prev => {
            const s = new Set(prev); s.delete(String(remoteUser.uid)); return s;
          });
        });

        // ── VAD: volume-indicator → speaking display + 30s silence auto-demote ──
        client.on("volume-indicator", (volumes: Array<{uid: string|number; level: number}>) => {
          if (!mounted) return;

          // Update the speaking-users set for UI glows
          const speaking = new Set<string>();
          volumes.forEach(({ uid, level }) => { if (level > 5) speaking.add(String(uid)); });
          setSpeakingUsers(speaking);

          // Auto-demote: only for non-host speakers who go silent for 30s
          if (isSpeakerRef.current && user?.uid && room?.hostUid !== user?.uid) {
            const me = volumes.find(v => String(v.uid) === user!.uid);
            const isTalking = me && me.level > 5;

            if (!isTalking) {
              // Start silence countdown if not already running
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(async () => {
                  silenceTimerRef.current = null;
                  if (isSpeakerRef.current && user?.uid && mounted) {
                    console.log("[Room] VAD: 30s silence — auto-demoting to listener");
                    try { await demoteFromSpeaker(room!.id, user!.uid); } catch (e) {}
                  }
                }, 30000); // 30 seconds
              }
            } else {
              // User is talking — reset silence timer
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            }
          }
        });

      } catch (error) {
        console.error("[Room] Agora setup error:", error);
        agoraInitializedRef.current = false; // allow retry on next render
      }
    }

    // Helper: request mic permission and publish local audio track
    async function publishLocalMic(client: any, isMounted: boolean) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = await AgoraRTC.createMicrophoneAudioTrack();
        if (!isMounted) { track.close(); return; }
        localTrackRef.current = track;
        await client.publish([track]);
        console.log("[Room] Local mic published");
      } catch (e) {
        console.error("[Room] Mic publish error:", e);
        if (isMounted) alert("Microphone access required to speak. Please allow mic access.");
      }
    }

    setupAgora();

    return () => {
      mounted = false;
      // Cleanup on unmount
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (localTrackRef.current) {
        try { localTrackRef.current.stop?.(); localTrackRef.current.close?.(); } catch (e) {}
        localTrackRef.current = null;
      }
      if (clientRef.current) {
        try { clientRef.current.leave(); } catch (e) {}
        clientRef.current = null;
      }
      agoraInitializedRef.current = false;
    };
  }, [user?.uid, room?.agoraChannel]); // Only re-run if channel changes (e.g. room restart)

  // ── Switch Agora role when isSpeaker changes (promote/demote) ────────────
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return; // Agora not initialised yet; setupAgora will set initial role

    const switchRole = async () => {
      try {
        if (isSpeaker) {
          // Promoted to speaker → switch to host and publish mic
          await client.setClientRole("host");
          if (!localTrackRef.current) {
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true });
              const track = await AgoraRTC.createMicrophoneAudioTrack();
              localTrackRef.current = track;
              if (micMuted) {
                await track.setMuted(true);
                await track.setEnabled(false);
              }
              await client.publish([track]);
              console.log("[Room] Role → host: mic published");
            } catch (e) { console.error("[Room] Promote mic error:", e); }
          }
          // Clear any lingering silence timer when becoming speaker
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else {
          // Demoted / stopped speaking → unpublish, switch to audience
          if (localTrackRef.current) {
            try { await client.unpublish([localTrackRef.current]); } catch (e) {}
            try { localTrackRef.current.stop?.(); localTrackRef.current.close?.(); } catch (e) {}
            localTrackRef.current = null;
          }
          try { await client.setClientRole("audience"); } catch (e) {}
          // Clear silence timer on demotion
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
          console.log("[Room] Role → audience");
        }
      } catch (e) {
        console.error("[Room] Role switch error:", e);
      }
    };

    switchRole();
  }, [isSpeaker]); // Fires whenever Firestore promotes/demotes this user

  // Mute/unmute local track cleanly both in SDK track and Firestore
  useEffect(() => {
    if (localTrackRef.current) {
      localTrackRef.current.setMuted(micMuted).catch(() => {});
      localTrackRef.current.setEnabled(!micMuted).catch(() => {});
    }
    if (user?.uid && roomId) {
      if (micMuted) {
        muteParticipant(roomId, user.uid).catch(() => {});
      } else {
        unmuteParticipant(roomId, user.uid).catch(() => {});
      }
    }
  }, [micMuted, user?.uid, roomId]);

  // 5-Minute Host Expiry Auto-Close
  const hostMissingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!room?.hostUid || !room?.isActive) return;

    const hostPresent = participants.some((p) => p.uid === room.hostUid);

    if (hostPresent) {
      hostMissingSinceRef.current = null;
    } else {
      if (!hostMissingSinceRef.current) {
        hostMissingSinceRef.current = Date.now();
      }

      const interval = setInterval(() => {
        if (!hostMissingSinceRef.current) return;
        const elapsed = Date.now() - hostMissingSinceRef.current;
        if (elapsed >= 5 * 60 * 1000) { // 5 minutes
          clearInterval(interval);
          endRoom(roomId).catch(() => {});
          alert("This room was closed permanently because the host left for more than 5 minutes.");
          router.push("/rooms");
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [participants, room?.hostUid, room?.isActive, roomId, router]);

  const handleKickUser = async (targetUid: string) => {
    if (!user || user.uid !== room?.hostUid) return;
    try {
      await removeParticipant(roomId, targetUid);
      setProfileModal(null);
    } catch (e) {
      console.error("[Room] Kick user error:", e);
    }
  };

  const handleBanUser = async (targetUid: string) => {
    if (!user || user.uid !== room?.hostUid) return;
    if (!window.confirm("Are you sure you want to ban this user from the room?")) return;
    try {
      await hostOverrideBan(roomId, targetUid, user.uid, "Host moderation ban");
      setProfileModal(null);
    } catch (e) {
      console.error("[Room] Ban user error:", e);
    }
  };

  // ── Auto-join room as participant when entering ───────────────────────────
  // Host is added in createRoom(); guests are auto-added here as listeners.
  useEffect(() => {
    if (!user?.uid || !room?.id) return;
    const isHost = user.uid === room.hostUid;
    addParticipant(
      room.id,
      { uid: user.uid, handle: user.handle || "@ANON", isSpeaker: isHost },
      isHost
    ).catch(err => console.warn("[Room] Auto-join participant failed:", err));
  }, [user?.uid, room?.id]);

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

  // Auto-route listeners to HLS when host enables HLS broadcast
  useEffect(() => {
    if (!user) return;
    if (isSpeaker) return; // speakers remain on RTC

    const prevHlsRef = { current: false } as { current: boolean };

    // track previous state across renders
    if (typeof (prevHlsRef as any).initialized === 'undefined') {
      (prevHlsRef as any).initialized = true;
      prevHlsRef.current = !!room?.transmitEnabled;
    }

    // If [ TRANSMIT ] just became enabled, prompt the listener to switch
    if (room?.transmitEnabled && !prevHlsRef.current) {
      try {
        const switchToHls = window.confirm('Host has started [ TRANSMIT ]ing. Switch to low-bandwidth player for best listening experience?');
        if (switchToHls) {
          // Navigate to listen page with room context
          const hlsParam = room.transmitUrl ? `&hls=${encodeURIComponent(room.transmitUrl)}` : '';
          router.push(`/listen?room=${encodeURIComponent(roomId)}${hlsParam}`);
          return;
        }
      } catch (e) {
        console.warn('[Room] Auto-route to [ TRANSMIT ] prompt failed:', e);
      }
    }

    // update prev
    (prevHlsRef as any).current = !!room?.transmitEnabled;
  }, [room?.transmitEnabled, isSpeaker, user, roomId, router]);


  // Handle leaving room
  const handleLeave = async () => {
    if (user) {
      try {
        await removeParticipant(roomId, user.uid);
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    }

    // If connected to Agora client, leave cleanly
    if (clientRef.current) {
      try {
        // If local track exists, stop it
        if (localTrackRef.current) {
          try { localTrackRef.current.stop && localTrackRef.current.stop(); } catch(e){}
          try { localTrackRef.current.close && localTrackRef.current.close(); } catch(e){}
          localTrackRef.current = null;
        }
        await clientRef.current.leave();
      } catch (e) {
        console.warn('[Room] Error leaving Agora client during handleLeave:', e);
      }
      clientRef.current = null;
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

  // Inactivity auto-disconnect for non-speakers (30 min idle -> 60s confirm)
  useEffect(() => {
    if (!user) return;

    let idleTimer: any = null;

    // Only run inactivity checks for non-speakers (listeners)
    if (isSpeaker) return;

    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // 30 minutes = 30 * 60 * 1000 ms
      idleTimer = setTimeout(async () => {
        try {
          const keep = window.confirm('Are you still listening? Click OK to stay connected.');
          if (!keep) {
            // Leave the room if user doesn't confirm
            await handleLeave();
          }
        } catch (e) {
          // best effort
          await handleLeave();
        }
      }, 30 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdle));
    resetIdle();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [user, isSpeaker]);

  // Broadcast control (host) - start/stop RTMP push via /api/stream/*
  const [broadcastInfo, setBroadcastInfo] = useState<any | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState<string>("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);


  const handleStartBroadcast = async (opts?: { adminKey?: string; rtmpUrl?: string }) => {
    if (!user || !room) return;
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (opts?.adminKey && opts.adminKey.trim()) headers['x-admin-key'] = opts.adminKey.trim();
      const body: any = { channel: room.agoraChannel, uid: user.uid };
      if (opts?.rtmpUrl) body.rtmp = opts.rtmpUrl;

      const res = await fetch('/api/stream/start', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setBroadcastInfo(data);
      if (data.ok || data.start) {
        setBroadcasting(true);
        // Mark room as [ TRANSMIT ]-enabled so listeners can be auto-routed
        try {
          const transmitUrl = (process.env.NEXT_PUBLIC_HLS_URL as string) || (window as any)?.NEXT_PUBLIC_HLS_URL || null;
          await updateRoomTransmit(roomId, true, transmitUrl || undefined);
        } catch (e) {
          console.warn('Failed to update room [ TRANSMIT ] flag:', e);
        }
      }
      alert('Start broadcast response:\n' + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Start broadcast error:', err);
      alert('Start broadcast failed: ' + String(err));
    }
  };

  const handleStopBroadcast = async () => {
    if (!broadcastInfo) {
      alert('No broadcast info available to stop.');
      return;
    }
    try {
      const payload: any = {};
      // If start returned resourceId and sid, use them
      if (broadcastInfo.start && broadcastInfo.start.sid) {
        payload.resourceId = broadcastInfo.acquire?.resourceId || broadcastInfo.resourceId || null;
        payload.sid = broadcastInfo.start.sid || broadcastInfo.sid || null;
      } else if (broadcastInfo.resourceId && broadcastInfo.sid) {
        payload.resourceId = broadcastInfo.resourceId;
        payload.sid = broadcastInfo.sid;
      } else {
        alert('No resourceId/sid available in broadcast info; manual stop may be required.');
        return;
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (adminKeyInput && adminKeyInput.trim()) headers['x-admin-key'] = adminKeyInput.trim();
      const res = await fetch('/api/stream/stop', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setBroadcastInfo(null);
      setBroadcasting(false);
      // Clear [ TRANSMIT ] flag on room so listeners can be prompted to rejoin RTC if desired
      try {
        await updateRoomTransmit(roomId, false);
      } catch (e) {
        console.warn('Failed to clear room HLS flag:', e);
      }
      alert('Stop broadcast response:\n' + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Stop broadcast error:', err);
      alert('Stop broadcast failed: ' + String(err));
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
      <header className="flex items-center justify-between border-b border-neutral-900 p-3 sm:p-4 font-mono text-xs tracking-wider uppercase flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => router.push("/rooms")}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer border border-neutral-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase whitespace-nowrap shrink-0 flex items-center gap-1 font-bold"
            title="Minimize to persistent dock"
          >
            [v] DOCK
          </button>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white font-mono text-[10px] sm:text-[11px] font-bold">LIVE</span>
          </span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-400 truncate max-w-[140px] sm:max-w-xs">{room.name}</span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-500 flex items-center gap-1 text-[10px] sm:text-xs shrink-0">
            <Users size={12} /> {participants.length}/{room.maxParticipants} NODES
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {user && user.uid === room?.hostUid && pendingRequests > 0 && (
            <span className="flex items-center gap-1 text-white border border-white px-2 py-0.5 font-mono text-[10px] uppercase animate-pulse">
              <Hand size={10} /> {pendingRequests} REQ
            </span>
          )}
          {user && (
            <button
              onClick={handleBookmarkRoom}
              className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer text-sm"
              title={isBookmarked ? "Remove bookmark" : "Bookmark room"}
            >
              {isBookmarked ? "★" : "☆"}
            </button>
          )}
          <ShareButton
            title={`Live Frequency: ${room.name}`}
            text={`Tune in live on Echo: "${room.name}"`}
            label="SHARE"
            variant="button"
            className="px-2.5 py-1 text-[10px] sm:text-xs whitespace-nowrap"
          />
          <button
            onClick={handleLeave}
            className="text-neutral-400 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer border border-neutral-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase whitespace-nowrap shrink-0"
          >
            [!] LEAVE
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-3 sm:p-4 md:p-8 max-w-5xl mx-auto w-full gap-5 pb-28 md:pb-8">
        {/* Room Info & Pinned Signal Artifact */}
        <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-white text-black font-bold px-1.5 py-0.5 uppercase tracking-widest">
                  {room.category || "GENERAL"}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  HOST: {room.hostHandle}
                </span>
                {!room.isPublic && <Lock size={12} className="text-neutral-500" />}
              </div>
              <h1 className="font-mono text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
                <FormattedText text={room.name} />
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 border border-neutral-800 font-mono text-[10px] text-neutral-500 uppercase">
                {room.isPublic ? "PUBLIC FREQUENCY" : "PRIVATE"}
              </span>
            </div>
          </div>

          {/* Pinned Signal / Thesis Box */}
          <div className="border border-neutral-800 bg-black p-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span className="font-bold text-neutral-400 uppercase tracking-wider">// [ PINNED SIGNAL / ARTIFACT ]</span>
              <span>{room.hostHandle}</span>
            </div>
            <p className="font-mono text-xs text-neutral-300">
              {room.description ? <FormattedText text={room.description} /> : "Host has not pinned an active thesis for this room."}
            </p>
          </div>
        </div>

        {/* Active Transmitters Stage Matrix */}
        <div className="border border-white p-4 space-y-4 bg-neutral-950">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase flex justify-between border-b border-neutral-900 pb-2">
            <span className="flex items-center gap-2 text-white font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              // ACTIVE TRANSMITTERS ({participants.filter(p => p.isSpeaker).length})
            </span>
            {user && user.uid === room?.hostUid && pendingRequests > 0 && (
              <span className="text-white border border-white px-2 py-0.5 text-[9px] animate-pulse">
                {pendingRequests} REQUEST{pendingRequests > 1 ? "S" : ""} QUEUED
              </span>
            )}
          </div>
          {participants.filter(p => p.isSpeaker).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {participants.filter(p => p.isSpeaker).map((participant) => {
                const isHostUser = participant.uid === room?.hostUid;
                const isSpeaking = speakingUsers.has(participant.uid);
                return (
                  <div
                    key={participant.id || participant.uid}
                    className={`border p-3 flex flex-col items-center justify-center text-center transition-colors font-mono select-none ${
                      isSpeaking ? "border-white bg-neutral-900 shadow-lg" : "border-neutral-800 bg-black"
                    }`}
                  >
                    <div className="relative mb-2">
                      <button
                        onClick={() => setProfileModal({ uid: participant.uid, handle: participant.handle })}
                        className={`w-14 h-14 border-2 flex items-center justify-center font-mono text-base font-bold relative transition-all cursor-pointer ${
                          isSpeaking
                            ? "border-white text-white bg-neutral-800"
                            : "border-neutral-700 text-neutral-400 bg-neutral-950"
                        }`}
                      >
                        {participant.handle.slice(0, 2).toUpperCase()}
                        {isSpeaking && (
                          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-white text-black px-1 font-bold">
                            TX
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="text-center w-full">
                      <div className="font-mono text-xs font-bold text-white truncate w-full">
                        {participant.handle}
                      </div>
                      <div className="font-mono text-[9px] text-neutral-500 uppercase mt-0.5 tracking-wider">
                        {isHostUser ? "[ HOST ]" : "[ SPEAKER ]"}
                      </div>
                    </div>

                    {/* Audio Decibel Level Visualizer */}
                    <div className="w-full bg-neutral-900 h-1.5 mt-2 overflow-hidden border border-neutral-800">
                      <div
                        className="bg-white h-full transition-all duration-75"
                        style={{ width: `${isSpeaking ? "90%" : participant.isMuted ? "0%" : "15%"}` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-neutral-500 uppercase mt-1">
                      {isSpeaking ? "[||||||--] TX" : participant.isMuted ? "[ MUTE ]" : "[------] IDLE"}
                    </span>

                    {/* Moderator controls for host */}
                    {user && user.uid === room?.hostUid && participant.uid !== user.uid && (
                      <div className="flex items-center gap-1 flex-wrap justify-center mt-2 pt-2 border-t border-neutral-900 w-full">
                        <button
                          onClick={() => participant.isMuted ? handleUnmute(participant.uid) : handleMute(participant.uid)}
                          className={`font-mono text-[8px] px-1.5 py-0.5 border uppercase cursor-pointer transition-colors ${
                            participant.isMuted ? "border-neutral-600 text-neutral-300" : "border-neutral-800 text-neutral-500 hover:text-white"
                          }`}
                        >
                          {participant.isMuted ? "UNMUTE" : "MUTE"}
                        </button>

                        <button
                          onClick={() => handleDemoteSpeaker(participant.uid)}
                          className="font-mono text-[8px] px-1.5 py-0.5 border border-neutral-800 text-neutral-500 hover:text-white uppercase cursor-pointer transition-colors"
                        >
                          DEMOTE
                        </button>

                        <button
                          onClick={() => handleKickUser(participant.uid)}
                          className="font-mono text-[8px] px-1.5 py-0.5 border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-500 uppercase cursor-pointer transition-colors"
                        >
                          KICK
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 font-mono text-xs text-neutral-500 uppercase">
              NO ACTIVE SPEAKERS
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
                    <div className="flex items-center gap-1 flex-wrap justify-center mt-1">
                      <button
                        onClick={() => handlePromoteSpeaker(participant.uid)}
                        className={`font-mono text-[8px] px-1 py-0.5 border uppercase cursor-pointer transition-colors ${
                          participant.raisedHand ? "border-green-700 text-green-400 bg-green-950/40 animate-pulse" : "border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {participant.raisedHand ? "ACCEPT" : "PROMOTE"}
                      </button>

                      <button
                        onClick={() => handleKickUser(participant.uid)}
                        className="font-mono text-[8px] px-1 py-0.5 border border-red-900 text-red-400 hover:bg-red-950 uppercase cursor-pointer transition-colors"
                      >
                        KICK
                      </button>

                      <button
                        onClick={() => handleBanUser(participant.uid)}
                        className="font-mono text-[8px] px-1 py-0.5 border border-red-700 bg-red-950 text-red-400 hover:bg-red-900 font-bold uppercase cursor-pointer transition-colors"
                      >
                        BAN
                      </button>
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
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`px-3 sm:px-4 py-2 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-2 ${
                    micMuted
                      ? "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                      : "border-white text-white"
                  }`}
                >
                  {micMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  {micMuted ? "[ MUTED ]" : "[ LIVE ]"}
                </button>
                <span className="font-mono text-xs text-neutral-400 uppercase hidden sm:inline">YOU ARE SPEAKING</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
                >
                  [ 💬 CHAT ({chatMessages.length}) ]
                </button>
                <button
                  onClick={async () => {
                    if (user) {
                      try { await demoteFromSpeaker(roomId, user.uid); } catch (e) {}
                    }
                  }}
                  className="px-4 py-2 border border-emerald-800/60 bg-emerald-950/40 text-emerald-400 hover:border-emerald-400 font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Switch to low-cost listener mode"
                >
                  <Volume2 size={12} />
                  [ SWITCH TO LISTENER 🎧 ]
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between flex-wrap gap-3">
              <span className="font-mono text-xs text-emerald-400 uppercase flex items-center gap-2 font-medium">
                <Volume2 size={14} className="animate-pulse shrink-0" />
                <span className="leading-tight">LISTENING MODE 🟢</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
                >
                  [ 💬 CHAT ({chatMessages.length}) ]
                </button>
                {user?.uid === room?.hostUid ? (
                  <button
                    onClick={async () => {
                      if (user) {
                        try { await promoteToSpeaker(roomId, user.uid); } catch (e) {}
                      }
                    }}
                    className="px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    <Mic size={12} />
                    [ REJOIN STAGE AS HOST 🎙️ ]
                  </button>
                ) : hasRequestedToSpeak ? (
                  <button
                    onClick={handleCancelRequest}
                    className="px-4 py-2 border border-yellow-800 text-yellow-400 bg-yellow-950/40 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Hand size={12} />
                    [ LOWER HAND ]
                  </button>
                ) : (
                  <button
                    onClick={handleRequestToSpeak}
                    className="px-4 py-2 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5"
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
                    <p className="font-mono text-[10px] text-neutral-600 uppercase">[ TAGS ]</p>
                  </div>
                </div>

                {/* Badges */}
                {profileData.badges && profileData.badges.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-2">[ TAGS ]</p>
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

                {/* Host Moderation Controls */}
                {user && user.uid === room?.hostUid && profileModal.uid !== user.uid && (
                  <div className="border border-red-900/60 bg-red-950/20 p-3 space-y-2 rounded">
                    <p className="font-mono text-[10px] tracking-widest text-red-400 uppercase font-semibold">
                      // HOST MODERATION ACTIONS
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {participants.find(p => p.uid === profileModal.uid)?.isSpeaker ? (
                        <button
                          onClick={() => {
                            handleDemoteSpeaker(profileModal.uid);
                            setProfileModal(null);
                          }}
                          className="px-2 py-1.5 font-mono text-xs border border-yellow-800 text-yellow-400 hover:bg-yellow-950 uppercase"
                        >
                          🎧 DEMOTE
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handlePromoteSpeaker(profileModal.uid);
                            setProfileModal(null);
                          }}
                          className="px-2 py-1.5 font-mono text-xs border border-green-800 text-green-400 hover:bg-green-950 uppercase"
                        >
                          🎙️ PROMOTE
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const p = participants.find(p => p.uid === profileModal.uid);
                          if (p?.isMuted) handleUnmute(profileModal.uid);
                          else handleMute(profileModal.uid);
                          setProfileModal(null);
                        }}
                        className="px-2 py-1.5 font-mono text-xs border border-neutral-700 text-neutral-300 hover:border-white uppercase"
                      >
                        {participants.find(p => p.uid === profileModal.uid)?.isMuted ? '🔊 UNMUTE' : '🔇 MUTE'}
                      </button>

                      <button
                        onClick={() => handleKickUser(profileModal.uid)}
                        className="px-2 py-1.5 font-mono text-xs border border-red-800 text-red-400 hover:bg-red-950 uppercase"
                      >
                        🚪 KICK
                      </button>

                      <button
                        onClick={() => handleBanUser(profileModal.uid)}
                        className="px-2 py-1.5 font-mono text-xs bg-red-950 text-red-400 border border-red-700 hover:bg-red-900 uppercase font-bold"
                      >
                        ⛔ BAN
                      </button>
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
