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

interface ArcadeVoiceChannelProps {
  matchId: string;
  processedStream: MediaStream | null;
}

export default function ArcadeVoiceChannel({ matchId, processedStream }: ArcadeVoiceChannelProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customTrackRef = useRef<any>(null);

  // 1. Fetch token
  useEffect(() => {
    async function fetchToken() {
      if (!user) return;
      try {
        const response = await fetch(`/api/agora/token?channel=${matchId}&uid=${user.uid}`);
        const data = await response.json();
        if (data.token) {
          setToken(data.token);
        }
      } catch (err) {
        console.error("Failed to fetch Agora token", err);
        setError("Voice unavailable");
      }
    }
    fetchToken();
  }, [matchId, user]);

  // 2. Join channel
  useJoin(
    {
      appid: AGORA_APP_ID,
      channel: matchId,
      token: token || null,
      uid: user?.uid,
    },
    Boolean(user && token)
  );

  // 3. Play remote audio tracks automatically
  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);
  
  useEffect(() => {
    audioTracks.forEach((track) => {
      try {
        track.play();
      } catch (e) {
        console.warn("Autoplay blocked for remote track", e);
      }
    });
    return () => {
      audioTracks.forEach((track) => track.stop());
    };
  }, [audioTracks]);

  // 4. Publish custom processed stream
  const client = useRTCClient();
  
  useEffect(() => {
    if (!processedStream || !user || !token || !client) return;

    let isActive = true;

    const publishCustomTrack = async () => {
      try {
        // Unpublish existing if we are replacing
        if (customTrackRef.current) {
          try {
            await client.unpublish(customTrackRef.current);
            customTrackRef.current.close();
            customTrackRef.current = null;
          } catch(e) {}
        }

        const audioTrack = processedStream.getAudioTracks()[0];
        if (!audioTrack) return;

        const agoraTrack = AgoraRTC.createCustomAudioTrack({
          mediaStreamTrack: audioTrack,
        });

        customTrackRef.current = agoraTrack;
        
        // Wait until connected to publish
        if (client.connectionState === "CONNECTED") {
             await client.publish(agoraTrack);
        } else {
             client.on("connection-state-change", (curState) => {
                 if (curState === "CONNECTED" && isActive && customTrackRef.current) {
                     try {
                         client.publish(customTrackRef.current);
                     } catch(e) {}
                 }
             });
        }
      } catch (e) {
        console.error("Failed to publish custom processed audio track", e);
      }
    };

    publishCustomTrack();

    return () => {
      isActive = false;
      if (client && customTrackRef.current) {
        try {
            client.unpublish(customTrackRef.current);
        } catch(e) {}
        customTrackRef.current.close();
        customTrackRef.current = null;
      }
    };
  }, [processedStream, user, token, client]);

  if (error) {
    return <div className="text-[9px] text-red-500 font-bold uppercase">{error}</div>;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-[9px] font-bold uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>VOICE LIVE ({remoteUsers.length} CHATTING)</span>
    </div>
  );
}
