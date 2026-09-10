"use client";

import React, { useEffect, useState, useRef } from "react";
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type IRemoteAudioTrack,
  type ILocalAudioTrack,
} from "agora-rtc-sdk-ng";
import { useAuth } from "@/app/components/AuthProvider";
import { AGORA_APP_ID } from "@/lib/agora";
import { Mic, MicOff, Volume2, VolumeX, Radio, Sparkles } from "lucide-react";
import { SpatialAvatar, SPACES_ZONES, SpaceZoneId } from "@/lib/spaces";

interface SpatialVoiceManagerProps {
  spaceId: string;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onSpeakingChange: (isSpeaking: boolean) => void;
}

export default function SpatialVoiceManager({
  spaceId,
  localAvatar,
  remoteAvatars,
  onSpeakingChange,
}: SpatialVoiceManagerProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | ILocalAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());

  // 1. Join Agora Channel & Manage Real-time Audio
  useEffect(() => {
    if (typeof window === "undefined" || !user || !spaceId) return;

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
            if (v.uid === 0 || String(v.uid) === user.uid) {
              speaking.add(user.uid);
              localIsSpeaking = true;
            } else {
              speaking.add(String(v.uid));
            }
          }
        });

        setSpeakingUids(speaking);
        onSpeakingChange(localIsSpeaking);
      });
    } catch (e) {
      console.warn("[SpatialVoice] Volume indicator error:", e);
    }

    // Remote Audio Track publishing
    client.on("user-published", async (remoteUser, mediaType) => {
      if (mediaType === "audio") {
        try {
          await client.subscribe(remoteUser, mediaType);
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
        const channelName = `echo_spaces_${spaceId}`;
        await client.join(AGORA_APP_ID, channelName, null, user.uid);

        // Create & publish local mic track
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "high_quality_stereo",
          AEC: true,
          ANS: true,
          AGC: true,
        });

        localTrackRef.current = micTrack;
        await client.publish([micTrack]);
        if (isMounted) setIsConnected(true);
      } catch (err) {
        console.warn("[SpatialVoice] Failed joining Agora room:", err);
      }
    };

    initAgora();

    return () => {
      isMounted = false;
      if (localTrackRef.current) {
        localTrackRef.current.stop();
        localTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave().catch(() => {});
      }
      remoteTracksRef.current.clear();
    };
  }, [spaceId, user]);

  // 2. Spatial Distance Volume Attenuation Engine
  useEffect(() => {
    if (remoteTracksRef.current.size === 0) return;

    remoteAvatars.forEach((remote) => {
      const track = remoteTracksRef.current.get(remote.uid);
      if (!track) return;

      const dist = Math.hypot(localAvatar.x - remote.x, localAvatar.y - remote.y);

      // Check if speaker is on a broadcast stage (Concert or Debate)
      const isConcertStage =
        remote.activeZone === "concert" &&
        remote.y < 760 &&
        localAvatar.activeZone === "concert";

      const isDebatePodium =
        remote.activeZone === "debate" &&
        remote.y < 780 &&
        localAvatar.activeZone === "debate";

      let volume = 100;

      if (isConcertStage || isDebatePodium) {
        // Full room broadcast!
        volume = 100;
      } else if (localAvatar.activeZone !== remote.activeZone) {
        // Walls isolate different rooms!
        volume = 0;
      } else {
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggleMic}
        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-black uppercase transition-all active:scale-95 cursor-pointer shadow-md ${
          isMuted
            ? "bg-red-500/20 border-red-500 text-red-300"
            : "bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse"
        }`}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        <span>{isMuted ? "MIC MUTED" : "MIC LIVE"}</span>
      </button>

      <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-neutral-400">
        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span>SPATIAL AUDIO: <strong>360° PROXIMITY</strong></span>
      </div>
    </div>
  );
}
