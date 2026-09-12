"use client";

import React, { useEffect, useState, useRef } from "react";
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ILocalAudioTrack,
  type IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";
import { useAuth } from "@/app/components/AuthProvider";
import { AGORA_APP_ID } from "@/lib/agora";
import { Mic, MicOff, Radio } from "lucide-react";
import { SpatialAvatar } from "@/lib/spaces";

interface SpatialVoiceManagerProps {
  spaceId: string;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onSpeakingUidsChange?: (uids: Set<string>) => void;
}

export default function SpatialVoiceManager({
  spaceId,
  localAvatar,
  remoteAvatars,
  onSpeakingChange,
  onSpeakingUidsChange,
}: SpatialVoiceManagerProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | ILocalAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());
  const sessionUidRef = useRef<number | null>(null);

  // Derive stable, session-unique 32-bit integer UID to prevent Agora UID_CONFLICT
  if (!sessionUidRef.current) {
    const rawUid = user?.uid || `guest_${Math.random().toString(36).slice(2, 7)}`;
    let hash = 0;
    for (let i = 0; i < rawUid.length; i++) {
      hash = (hash << 5) - hash + rawUid.charCodeAt(i);
      hash |= 0;
    }
    const randomNonce = Math.floor(Math.random() * 100000);
    sessionUidRef.current = ((Math.abs(hash) + randomNonce) % 89999999) + 10000000;
  }
  const numericUid = sessionUidRef.current;

  // 1. Join Agora Channel & Manage Real-time Audio
  useEffect(() => {
    if (typeof window === "undefined" || !spaceId) return;

    let isMounted = true;
    const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });
    clientRef.current = client;

    // Volume indicator listener
    try {
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        if (!isMounted) return;
        const speaking = new Set<string>();
        let localIsSpeaking = false;

        volumes.forEach((v) => {
          if (v.level > 12) {
            if (v.uid === 0 || v.uid === numericUid || String(v.uid) === user?.uid) {
              if (user?.uid) speaking.add(user.uid);
              localIsSpeaking = true;
            } else {
              speaking.add(String(v.uid));
            }
          }
        });

        setSpeakingUids(speaking);
        onSpeakingChange?.(localIsSpeaking);
        onSpeakingUidsChange?.(speaking);
      });
    } catch (e) {
      console.warn("[SpatialVoice] Volume indicator error:", e);
    }

    // Remote Audio Track publishing
    client.on("user-published", async (remoteUser, mediaType) => {
      if (!isMounted) return;
      if (mediaType === "audio") {
        try {
          await client.subscribe(remoteUser, mediaType);
          if (!isMounted) return;
          if (remoteUser.audioTrack) {
            const uidStr = String(remoteUser.uid);
            remoteTracksRef.current.set(uidStr, remoteUser.audioTrack);
            remoteUser.audioTrack.play();
          }
        } catch (err) {
          console.warn("[SpatialVoice] Error subscribing remote audio:", err);
        }
      }
    });

    client.on("user-unpublished", (remoteUser, mediaType) => {
      if (mediaType === "audio") {
        const uidStr = String(remoteUser.uid);
        const track = remoteTracksRef.current.get(uidStr);
        if (track) {
          track.stop();
          remoteTracksRef.current.delete(uidStr);
        }
      }
    });

    const initAgora = async () => {
      try {
        if (!isMounted) return;
        const channelName = `echo_spaces_${spaceId}`;

        // Fetch valid dynamic AccessToken2 from backend
        let token: string | null = null;
        try {
          const res = await fetch(
            `/api/agora/token?channel=${encodeURIComponent(channelName)}&uid=${numericUid}`
          );
          if (!isMounted) return;
          if (res.ok) {
            const data = await res.json();
            token = data.token || null;
          }
        } catch (tokErr) {
          console.warn("[SpatialVoice] Token fetch error, falling back to static:", tokErr);
        }

        if (!isMounted) return;
        await client.join(AGORA_APP_ID, channelName, token, numericUid);
        if (!isMounted) {
          client.leave().catch(() => {});
          return;
        }

        // Create & publish local mic track if permissions granted and still connected
        try {
          if (!isMounted || client.connectionState !== "CONNECTED") return;

          const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "high_quality_stereo",
            AEC: true,
            ANS: true,
            AGC: true,
          });

          if (!isMounted || client.connectionState !== "CONNECTED") {
            micTrack.stop();
            micTrack.close();
            return;
          }

          localTrackRef.current = micTrack;
          await client.publish([micTrack]);
          if (isMounted) setIsConnected(true);
        } catch (micErr) {
          console.warn("[SpatialVoice] Microphone permission or publish error:", micErr);
          if (isMounted) setIsConnected(true); // Connected as listener
        }
      } catch (err: any) {
        if (err?.code === "UID_CONFLICT") {
          console.warn("[SpatialVoice] Retrying with fresh session UID due to temporary conflict...");
          sessionUidRef.current = Math.floor(Math.random() * 89999999) + 10000000;
        } else {
          console.warn("[SpatialVoice] Agora server unavailable, running in proximity mode:", err?.message || err);
        }
        if (isMounted) setIsConnected(false);
      }
    };

    initAgora();

    return () => {
      isMounted = false;
      if (localTrackRef.current) {
        try {
          localTrackRef.current.stop();
          localTrackRef.current.close();
        } catch {}
        localTrackRef.current = null;
      }
      try {
        client.leave().catch(() => {});
      } catch {}
      remoteTracksRef.current.clear();
    };
  }, [spaceId, user?.uid, numericUid]);

  // 2. Spatial Distance Volume Attenuation Engine
  useEffect(() => {
    if (remoteTracksRef.current.size === 0) return;

    remoteAvatars.forEach((remote) => {
      const track = remoteTracksRef.current.get(remote.uid);
      if (!track) return;

      const dist = Math.hypot(localAvatar.x - remote.x, localAvatar.y - remote.y);

      let volume = 100;

      // Proximity falloff: 100% at <= 120px, drops to 0 at 360px
      const maxDist = 360;
      const minDist = 120;
      if (dist <= minDist) {
        volume = 100;
      } else if (dist >= maxDist) {
        volume = 0;
      } else {
        const ratio = 1 - (dist - minDist) / (maxDist - minDist);
        volume = Math.round(ratio * 100);
      }

      try {
        track.setVolume(volume);
      } catch {}
    });
  }, [localAvatar.x, localAvatar.y, localAvatar.activeZone, remoteAvatars]);

  // Toggle Mic
  const handleToggleMic = () => {
    if (!localTrackRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    localTrackRef.current.setEnabled(!next);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={handleToggleMic}
        className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 ${
          isMuted
            ? "bg-rose-950/30 border-rose-800/40 text-rose-300 hover:bg-rose-900/40"
            : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40"
        }`}
        title={isMuted ? "Unmute Mic (Spatial 360° Proximity Audio)" : "Mute Mic (Spatial 360° Proximity Audio)"}
      >
        {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
        <span className="text-[11px] font-mono font-bold">
          {isMuted ? "Muted" : "Live"}
        </span>
      </button>

      <div className="hidden 2xl:flex items-center gap-1 text-[10px] font-mono text-neutral-400">
        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span>360° AUDIO</span>
      </div>
    </div>
  );
}
