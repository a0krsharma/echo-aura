"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { IAgoraRTCClient, IRemoteAudioTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/app/components/AuthProvider";
import { addParticipant, removeParticipant, raiseHand as fbRaiseHand, lowerHand as fbLowerHand, type Room, type RoomParticipant } from "@/lib/rooms";

export type RoomRole = "host" | "speaker" | "listener";

interface RoomAudioContextType {
  activeRoomId: string | null;
  activeRoom: Room | null;
  role: RoomRole;
  isMuted: boolean;
  handRaised: boolean;
  speakerCount: number;
  speakingUids: Set<string>;
  audioLevels: Record<string, number>;
  isExpanded: boolean;
  tuneIn: (roomId: string, initialRoom?: Room) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleHandRaise: () => Promise<void>;
  setIsExpanded: (expanded: boolean) => void;
}

const RoomAudioContext = createContext<RoomAudioContextType | null>(null);

export function RoomAudioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [role, setRole] = useState<RoomRole>("listener");
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(0);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());
  const currentRoomIdRef = useRef<string | null>(null);

  // Sync currentRoomIdRef
  useEffect(() => {
    currentRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // Subscribe to room metadata changes in Firestore
  useEffect(() => {
    if (!activeRoomId) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, "rooms", activeRoomId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Room;
        setActiveRoom(data);
        if (user && data.hostUid === user.uid) {
          setRole("host");
        }
      } else {
        // Room ended by host
        disconnect();
      }
    });
    return () => unsub();
  }, [activeRoomId, user]);

  // Subscribe to user participant role in the room
  useEffect(() => {
    if (!activeRoomId || !user) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, "rooms", activeRoomId, "participants", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as RoomParticipant;
        if (data.isSpeaker) {
          setRole(prev => prev === "host" ? "host" : "speaker");
        } else {
          setRole(prev => prev === "host" ? "host" : "listener");
        }
        setHandRaised(Boolean(data.raisedHand));
      }
    });
    return () => unsub();
  }, [activeRoomId, user]);

  // ── 1-Tap Tune-In ───────────────────────────────────────────────────────────
  const tuneIn = useCallback(async (roomId: string, initialRoom?: Room) => {
    if (typeof window === "undefined") return;

    if (currentRoomIdRef.current === roomId) {
      // Already tuned in, simply expand view
      setIsExpanded(true);
      return;
    }

    // Disconnect any existing room session first
    if (currentRoomIdRef.current) {
      await disconnectInternal();
    }

    try {
      setActiveRoomId(roomId);
      if (initialRoom) setActiveRoom(initialRoom);

      // Dynamically load AgoraRTC in browser
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

      // Fetch room doc if not provided
      const db = getFirebaseDb();
      let roomData = initialRoom;
      if (!roomData) {
        const snap = await getDoc(doc(db, "rooms", roomId));
        if (snap.exists()) {
          roomData = { id: snap.id, ...snap.data() } as Room;
          setActiveRoom(roomData);
        }
      }

      if (!roomData) throw new Error("Room does not exist");

      const channelName = roomData.agoraChannel || `echo_${roomId}`;
      const uid = user ? user.uid : `anon_${Math.random().toString(36).slice(2, 6)}`;
      const isHost = Boolean(user && roomData.hostUid === user.uid);
      const initialRole: RoomRole = isHost ? "host" : "listener";
      setRole(initialRole);
      setIsMuted(true);

      // Fetch token
      let token: string | null = null;
      let appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || "9fc4c57053244c5b9f46211616b01c4c";

      try {
        const tokenRes = await fetch(`/api/agora/token?channel=${encodeURIComponent(channelName)}&uid=${encodeURIComponent(uid)}`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.appId) appId = tokenData.appId;
          token = tokenData.token || null;
        }
      } catch (err) {
        console.warn("[RoomAudio] Token fetch failed, attempting direct connect:", err);
      }

      if (!appId) throw new Error("Agora App ID is not configured");

      // Initialize Agora Client in Live Mode
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      // Enable Audio Volume Indicator for active speaking telemetry
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const newLevels: Record<string, number> = {};
        const speaking = new Set<string>();
        volumes.forEach((v) => {
          const level = Math.min(100, Math.round(v.level * 1.5));
          newLevels[String(v.uid)] = level;
          if (level > 8) {
            speaking.add(String(v.uid));
            // Local microphone volume in Agora returns v.uid === 0
            if (v.uid === 0 && user?.uid) {
              speaking.add(user.uid);
              newLevels[user.uid] = level;
            }
          }
        });
        setAudioLevels(newLevels);
        setSpeakingUids(speaking);
      });

      // Handle Remote Audio Streams
      client.on("user-published", async (remoteUser, mediaType) => {
        if (mediaType === "audio") {
          try {
            const track = await client.subscribe(remoteUser, "audio");
            remoteTracksRef.current.set(String(remoteUser.uid), track);
            track.play();
            setSpeakerCount(remoteTracksRef.current.size);
          } catch (err) {
            console.error("[RoomAudio] Failed to subscribe to remote audio:", err);
          }
        }
      });

      client.on("user-unpublished", (remoteUser, mediaType) => {
        if (mediaType === "audio") {
          remoteTracksRef.current.delete(String(remoteUser.uid));
          setSpeakerCount(remoteTracksRef.current.size);
        }
      });

      client.on("user-left", (remoteUser) => {
        remoteTracksRef.current.delete(String(remoteUser.uid));
        setSpeakerCount(remoteTracksRef.current.size);
      });

      // Set Agora client role: audience for listeners, host for room creators
      await client.setClientRole(isHost ? "host" : "audience");

      // Join Agora channel with automatic fallback if token expires or mismatches
      try {
        await client.join(appId, channelName, token, uid);
      } catch (joinErr: any) {
        const errMsg = joinErr?.message || String(joinErr);
        if (token && (errMsg.includes("dynamic key") || errMsg.includes("GATEWAY") || errMsg.includes("token timeout"))) {
          console.warn("[RoomAudio] Token rejected, joining in App ID direct mode (null token)...");
          await client.join(appId, channelName, null, uid);
        } else {
          throw joinErr;
        }
      }

      // Register participant in Firestore
      if (user) {
        try {
          await addParticipant(roomId, {
            uid: user.uid,
            handle: user.handle || "@ANON",
            isSpeaker: isHost,
          });
        } catch (e) {
          console.warn("[RoomAudio] Participant registration:", e);
        }
      }
    } catch (err) {
      console.error("[RoomAudio] 1-Tap Tune-In failed:", err);
      await disconnectInternal();
    }
  }, [user]);

  // Internal disconnect logic
  const disconnectInternal = async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      remoteTracksRef.current.forEach((track) => {
        try { track.stop(); } catch {}
      });
      remoteTracksRef.current.clear();

      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }

      if (currentRoomIdRef.current && user) {
        try {
          await removeParticipant(currentRoomIdRef.current, user.uid);
        } catch {}
      }
    } catch (err) {
      console.warn("[RoomAudio] Disconnect error:", err);
    } finally {
      setActiveRoomId(null);
      setActiveRoom(null);
      setRole("listener");
      setIsMuted(true);
      setHandRaised(false);
      setSpeakerCount(0);
      setSpeakingUids(new Set());
      setAudioLevels({});
      setIsExpanded(false);
    }
  };

  const disconnect = useCallback(async () => {
    await disconnectInternal();
  }, [user]);

  // ── 1-Click Mic Toggle ──────────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    const client = clientRef.current;
    if (!client || role === "listener" || typeof window === "undefined") return;

    try {
      if (isMuted) {
        // Unmute: create or enable local microphone audio track
        if (!localAudioTrackRef.current) {
          const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
          await client.setClientRole("host");
          const track = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "speech_standard",
            AEC: true,
            ANS: true,
          });
          localAudioTrackRef.current = track;
          await client.publish([track]);
        } else {
          await localAudioTrackRef.current.setEnabled(true);
        }
        setIsMuted(false);
      } else {
        // Mute track
        if (localAudioTrackRef.current) {
          await localAudioTrackRef.current.setEnabled(false);
        }
        setIsMuted(true);
      }
    } catch (err) {
      console.error("[RoomAudio] Mic toggle error:", err);
    }
  }, [role, isMuted]);

  // ── 1-Click Hand Raise ──────────────────────────────────────────────────────
  const toggleHandRaise = useCallback(async () => {
    if (!activeRoomId || !user) return;
    try {
      if (handRaised) {
        await fbLowerHand(activeRoomId, user.uid);
        setHandRaised(false);
      } else {
        await fbRaiseHand(activeRoomId, user.uid);
        setHandRaised(true);
      }
    } catch (err) {
      console.error("[RoomAudio] Toggle hand raise error:", err);
    }
  }, [activeRoomId, user, handRaised]);

  return (
    <RoomAudioContext.Provider
      value={{
        activeRoomId,
        activeRoom,
        role,
        isMuted,
        handRaised,
        speakerCount,
        speakingUids,
        audioLevels,
        isExpanded,
        tuneIn,
        disconnect,
        toggleMic,
        toggleHandRaise,
        setIsExpanded,
      }}
    >
      {children}
    </RoomAudioContext.Provider>
  );
}

export function useRoomAudio() {
  const context = useContext(RoomAudioContext);
  if (!context) {
    throw new Error("useRoomAudio must be used within a RoomAudioProvider");
  }
  return context;
}
