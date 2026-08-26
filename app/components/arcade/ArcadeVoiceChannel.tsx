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
import { soundSynth } from "@/lib/soundSynthesizer";

interface ArcadeVoiceChannelProps {
  matchId: string;
  isSpectator?: boolean;
  processedStream?: MediaStream | null;
}

export default function ArcadeVoiceChannel({
  matchId,
  isSpectator = false,
  processedStream,
}: ArcadeVoiceChannelProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | ILocalAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());

  // Join Channel & Manage RTC Lifecycle directly in useEffect
  useEffect(() => {
    if (typeof window === "undefined" || !user || !matchId) return;

    let isMounted = true;
    const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });
    clientRef.current = client;

    // Enable Volume Indicator
    try {
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        if (!isMounted) return;
        const speaking = new Set<string>();
        volumes.forEach((v) => {
          if (v.level > 10) {
            if (v.uid === 0 && user.uid) {
              speaking.add(user.uid);
            } else {
              speaking.add(String(v.uid));
            }
          }
        });
        setSpeakingUids(speaking);
      });
    } catch (e) {
      console.warn("[ArcadeVoice] Volume indicator error:", e);
    }

    // Handle Remote User Audio Publishing
    client.on("user-published", async (remoteUser, mediaType) => {
      if (mediaType === "audio") {
        try {
          await client.subscribe(remoteUser, mediaType);
          if (remoteUser.audioTrack && isMounted) {
            remoteTracksRef.current.set(String(remoteUser.uid), remoteUser.audioTrack);
            remoteUser.audioTrack.setVolume(100);
            try {
              remoteUser.audioTrack.play();
            } catch {
              setAutoplayBlocked(true);
            }
            setRemoteCount(remoteTracksRef.current.size);
          }
        } catch (subErr) {
          console.warn("[ArcadeVoice] Error subscribing to remote user:", subErr);
        }
      }
    });

    client.on("user-unpublished", (remoteUser, mediaType) => {
      if (mediaType === "audio") {
        remoteTracksRef.current.delete(String(remoteUser.uid));
        if (isMounted) {
          setRemoteCount(remoteTracksRef.current.size);
        }
      }
    });

    client.on("user-left", (remoteUser) => {
      remoteTracksRef.current.delete(String(remoteUser.uid));
      if (isMounted) {
        setRemoteCount(remoteTracksRef.current.size);
      }
    });

    // Join and publish mic
    const joinAndPublish = async () => {
      try {
        // Fetch Token
        let token: string | null = null;
        try {
          const res = await fetch(
            `/api/agora/token?channel=${encodeURIComponent(matchId)}&uid=${encodeURIComponent(user.uid)}`
          );
          if (res.ok) {
            const data = await res.json();
            token = data.token || null;
          }
        } catch {
          token = null;
        }

        if (!isMounted) return;

        // Join Agora RTC Channel
        await client.join(AGORA_APP_ID, matchId, token || null, user.uid);
        if (!isMounted) {
          await client.leave();
          return;
        }
        setIsConnected(true);

        // Publish Local Microphone (if not spectator)
        if (!isSpectator) {
          try {
            let track: IMicrophoneAudioTrack | ILocalAudioTrack;
            if (processedStream && processedStream.getAudioTracks()[0]) {
              track = AgoraRTC.createCustomAudioTrack({
                mediaStreamTrack: processedStream.getAudioTracks()[0],
              });
            } else {
              track = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: "speech_standard",
                AEC: true,
                ANS: true,
                AGC: true,
              });
            }

            if (!isMounted) {
              track.close();
              return;
            }

            localTrackRef.current = track;
            await track.setEnabled(!isMuted);
            await client.publish(track);
          } catch (micErr) {
            console.warn("[ArcadeVoice] Microphone capture error (muted fallback):", micErr);
          }
        }
      } catch (joinErr) {
        console.warn("[ArcadeVoice] Join channel error:", joinErr);
      }
    };

    joinAndPublish();

    return () => {
      isMounted = false;
      if (localTrackRef.current) {
        try {
          localTrackRef.current.stop();
          localTrackRef.current.close();
        } catch {}
        localTrackRef.current = null;
      }
      remoteTracksRef.current.forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      remoteTracksRef.current.clear();
      try {
        client.leave().catch(() => {});
      } catch {}
      setIsConnected(false);
    };
  }, [matchId, user?.uid, isSpectator]);

  // Handle Mute / Unmute
  const toggleMute = async () => {
    soundSynth.playSubtlePop();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localTrackRef.current) {
      try {
        await localTrackRef.current.setEnabled(!nextMuted);
      } catch (e) {
        console.warn("[ArcadeVoice] Error toggling mic track:", e);
      }
    }
  };

  const handleUnlockAudio = () => {
    remoteTracksRef.current.forEach((track) => {
      try {
        track.play();
      } catch {}
    });
    setAutoplayBlocked(false);
  };

  const isSelfSpeaking = Boolean(user && speakingUids.has(user.uid));

  return (
    <div className="space-y-2 font-mono text-white select-none">
      {/* Autoplay blocked banner */}
      {autoplayBlocked && (
        <button
          type="button"
          onClick={handleUnlockAudio}
          className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded flex items-center justify-center gap-2 cursor-pointer shadow-lg animate-pulse"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>[ 🔊 TAP TO UNMUTE GAME AUDIO ]</span>
        </button>
      )}

      {/* Main Voice Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs select-none shadow-md">
        {/* Left: Status & Connected Count */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSelfSpeaking
                  ? "bg-emerald-400 ring-4 ring-emerald-500/40 animate-pulse"
                  : isConnected
                  ? "bg-emerald-500"
                  : "bg-neutral-600"
              }`}
            />
          </div>
          <span className="font-black uppercase text-white tracking-wider">
            VOICE ARENA
          </span>
          <span className="text-[10px] text-neutral-400 font-bold border border-neutral-800 bg-neutral-900 px-2 py-0.5 rounded-md">
            {remoteCount > 0 ? `${remoteCount + 1} LIVE IN VOICE` : isConnected ? "VOICE ACTIVE" : "TUNING IN..."}
          </span>
        </div>

        {/* Right: Mic Toggle Control / Spectator Badge */}
        <div className="flex items-center gap-2">
          {isSpectator ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-300 text-[10px] font-bold uppercase rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>SPECTATOR (LIVE)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleMute}
              className={`px-3 py-1 text-[11px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                isMuted
                  ? "bg-red-950/80 border border-red-700 text-red-300 hover:bg-red-900"
                  : "bg-emerald-500 border border-emerald-400 text-black hover:bg-emerald-400"
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-red-300" />
                  <span>MIC MUTED</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-black animate-pulse" />
                  <span>MIC ON 🎙️</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
