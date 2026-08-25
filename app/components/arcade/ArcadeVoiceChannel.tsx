"use client";

import React, { useEffect, useState, useRef } from "react";
import AgoraRTC, {
  useJoin,
  useRemoteUsers,
  useRemoteAudioTracks,
  useRTCClient,
} from "agora-rtc-react";
import { useAuth } from "@/app/components/AuthProvider";
import { AGORA_APP_ID } from "@/lib/agora";
import { Mic, MicOff, Volume2, VolumeX, Radio, Sparkles } from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";

interface ArcadeVoiceChannelProps {
  matchId: string;
  isSpectator?: boolean;
  processedStream?: MediaStream | null;
}

export default function ArcadeVoiceChannel({ matchId, isSpectator = false, processedStream }: ArcadeVoiceChannelProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [speakingUids, setSpeakingUids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const localTrackRef = useRef<any>(null);
  const customTrackRef = useRef<any>(null);
  const client = useRTCClient();

  // 1. Fetch token with automatic fallback
  useEffect(() => {
    let isCancelled = false;
    async function fetchToken() {
      if (!user) return;
      try {
        const response = await fetch(`/api/agora/token?channel=${encodeURIComponent(matchId)}&uid=${encodeURIComponent(user.uid)}`);
        if (response.ok) {
          const data = await response.json();
          if (!isCancelled) {
            setToken(data.token || null);
            setTokenReady(true);
          }
        } else {
          if (!isCancelled) {
            setToken(null);
            setTokenReady(true);
          }
        }
      } catch (err) {
        console.warn("[ArcadeVoice] Token fetch fallback to App ID mode:", err);
        if (!isCancelled) {
          setToken(null);
          setTokenReady(true);
        }
      }
    }
    fetchToken();
    return () => {
      isCancelled = true;
    };
  }, [matchId, user]);

  // 2. Join Agora RTC channel
  useJoin(
    {
      appid: AGORA_APP_ID,
      channel: matchId,
      token: token || null,
      uid: user?.uid,
    },
    Boolean(user && tokenReady)
  );

  // 3. Enable Volume Indicator
  useEffect(() => {
    if (!client) return;
    try {
      client.enableAudioVolumeIndicator();
      const handleVolume = (volumes: Array<{ uid: string | number; level: number }>) => {
        const speaking = new Set<string>();
        volumes.forEach((v) => {
          if (v.level > 8) {
            if (v.uid === 0 && user?.uid) {
              speaking.add(user.uid);
            } else {
              speaking.add(String(v.uid));
            }
          }
        });
        setSpeakingUids(speaking);
      };
      client.on("volume-indicator", handleVolume);
      return () => {
        client.off("volume-indicator", handleVolume);
      };
    } catch (e) {
      console.warn("[ArcadeVoice] Volume indicator error:", e);
    }
  }, [client, user]);

  // 4. Play remote audio tracks automatically & detect autoplay blocks
  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);

  useEffect(() => {
    audioTracks.forEach((track) => {
      try {
        track.setVolume(100);
        track.play();
      } catch (e) {
        console.warn("[ArcadeVoice] Autoplay blocked for remote track:", e);
        setAutoplayBlocked(true);
      }
    });
    return () => {
      audioTracks.forEach((track) => {
        try { track.stop(); } catch {}
      });
    };
  }, [audioTracks]);

  // 5. Local Mic Publishing (Native Microphone or Processed Stream)
  useEffect(() => {
    if (!user || !tokenReady || !client) return;

    let isActive = true;

    const setupMicrophone = async () => {
      try {
        // Clean up previous tracks
        if (localTrackRef.current) {
          try {
            await client.unpublish(localTrackRef.current);
            localTrackRef.current.close();
            localTrackRef.current = null;
          } catch {}
        }
        if (customTrackRef.current) {
          try {
            await client.unpublish(customTrackRef.current);
            customTrackRef.current.close();
            customTrackRef.current = null;
          } catch {}
        }

        // Spectators only listen to game voice without broadcasting
        if (isSpectator) return;

        let trackToPublish: any = null;

        if (processedStream) {
          const audioTrack = processedStream.getAudioTracks()[0];
          if (audioTrack) {
            const customTrack = AgoraRTC.createCustomAudioTrack({
              mediaStreamTrack: audioTrack,
            });
            customTrackRef.current = customTrack;
            trackToPublish = customTrack;
          }
        }

        // Default to high-fidelity native mic track if no custom stream
        if (!trackToPublish) {
          const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "speech_standard",
            AEC: true,
            ANS: true,
            AGC: true,
          });
          localTrackRef.current = micTrack;
          trackToPublish = micTrack;
        }

        if (isActive && trackToPublish) {
          await trackToPublish.setEnabled(!isMuted);

          if (client.connectionState === "CONNECTED") {
            await client.publish(trackToPublish);
          } else {
            const onStateChange = async (curState: string) => {
              if (curState === "CONNECTED" && isActive && trackToPublish) {
                try {
                  await client.publish(trackToPublish);
                } catch {}
              }
            };
            client.on("connection-state-change", onStateChange);
          }
        }
      } catch (e: any) {
        console.error("[ArcadeVoice] Failed to initialize microphone:", e);
        setError("Mic permission needed");
      }
    };

    setupMicrophone();

    return () => {
      isActive = false;
      if (localTrackRef.current) {
        try {
          client.unpublish(localTrackRef.current);
          localTrackRef.current.close();
        } catch {}
        localTrackRef.current = null;
      }
      if (customTrackRef.current) {
        try {
          client.unpublish(customTrackRef.current);
          customTrackRef.current.close();
        } catch {}
        customTrackRef.current = null;
      }
    };
  }, [processedStream, user, tokenReady, client]);

  // 6. Mic Mute / Unmute Toggle
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
    if (customTrackRef.current) {
      try {
        await customTrackRef.current.setEnabled(!nextMuted);
      } catch (e) {
        console.warn("[ArcadeVoice] Error toggling custom track:", e);
      }
    }
  };

  // 7. Autoplay Unlock Handler
  const handleUnlockAudio = () => {
    soundSynth.playSubtlePop();
    audioTracks.forEach((track) => {
      try {
        track.setVolume(100);
        track.play();
      } catch {}
    });
    setAutoplayBlocked(false);
  };

  const isMeSpeaking = user && speakingUids.has(user.uid);

  return (
    <div className="space-y-2">
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
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono select-none shadow-md">
        {/* Left: Status & Connected Count */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMeSpeaking
                  ? "bg-emerald-400 ring-4 ring-emerald-500/40 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
          </div>
          <span className="font-extrabold uppercase text-white tracking-wider">
            VOICE ARENA
          </span>
          <span className="text-[10px] text-neutral-400 font-bold border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 rounded">
            {remoteUsers.length + 1} CONNECTED
          </span>
        </div>

        {/* Right: Mic Toggle Control / Spectator Badge */}
        <div className="flex items-center gap-2">
          {isSpectator ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-300 text-[10px] font-bold uppercase rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>SPECTATOR AUDIO (LIVE)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleMute}
              className={`px-3 py-1 text-[11px] font-black uppercase rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                isMuted
                  ? "bg-red-950/80 border border-red-700 text-red-300 hover:bg-red-900"
                  : "bg-emerald-500 border border-emerald-400 text-black hover:bg-emerald-400"
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-red-300" />
                  <span>[ MIC MUTED ]</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-black animate-pulse" />
                  <span>[ MIC ON 🎙️ ]</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
