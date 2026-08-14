'use client';

import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IRemoteAudioTrack } from 'agora-rtc-sdk-ng';
import { Volume2, VolumeX, Radio, Users } from 'lucide-react';
import HlsPlayer from './HlsPlayer';
import type { Room } from '@/lib/rooms';

type Props = {
  room: Room;
  onClose?: () => void;
};

export default function RoomLiveAudioPlayer({ room, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(0);
  const [statusText, setStatusText] = useState('CONNECTING TO LIVE STREAM...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'rtc_audience' | 'hls'>(
    room.transmitUrl ? 'hls' : 'rtc_audience'
  );

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());

  useEffect(() => {
    if (activeMode !== 'rtc_audience') return;

    let mounted = true;
    let client: IAgoraRTCClient | null = null;

    const connectAudience = async () => {
      try {
        setErrorText(null);
        setStatusText('CONNECTING LOW-COST AUDIENCE CHANNEL...');

        // 1. Fetch Agora App ID and token for room's channel
        const tokenRes = await fetch(
          `/api/agora/token?channel=${encodeURIComponent(room.agoraChannel)}&uid=0`
        );
        if (!tokenRes.ok) {
          throw new Error('Failed to fetch stream token');
        }
        const tokenData = await tokenRes.json();
        const appId = tokenData.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID;
        const token = tokenData.token || null;

        if (!appId) {
          throw new Error('Agora App ID not configured');
        }

        // 2. Initialize Agora Client in Live Audience Mode
        client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
        clientRef.current = client;

        await client.setClientRole('audience');

        // Handle remote speaker published audio tracks
        client.on('user-published', async (user, mediaType) => {
          if (!mounted || !client) return;
          if (mediaType === 'audio') {
            try {
              const track = await client.subscribe(user, 'audio');
              remoteTracksRef.current.set(String(user.uid), track);
              track.play();
              setIsPlaying(true);
              setSpeakerCount(remoteTracksRef.current.size);
              setStatusText(`LISTENING LIVE TO ${room.name} 🔊`);
            } catch (err) {
              console.error('[RoomLiveAudioPlayer] Subscribe error:', err);
            }
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'audio') {
            remoteTracksRef.current.delete(String(user.uid));
            setSpeakerCount(remoteTracksRef.current.size);
            if (remoteTracksRef.current.size === 0) {
              setStatusText(`CONNECTED TO ${room.name} • WAITING FOR SPEAKERS...`);
            }
          }
        });

        client.on('user-left', (user) => {
          remoteTracksRef.current.delete(String(user.uid));
          setSpeakerCount(remoteTracksRef.current.size);
        });

        // 3. Join the Agora Channel
        await client.join(appId, room.agoraChannel, token, null);

        if (mounted) {
          setIsPlaying(true);
          setStatusText(`CONNECTED TO ${room.name} (LOW-COST AUDIENCE MODE) 🟢`);
        }
      } catch (err: any) {
        console.error('[RoomLiveAudioPlayer] Connection error:', err);
        if (mounted) {
          setErrorText(err.message || 'Failed to connect to audio stream');
          setStatusText('CONNECTION ERROR');
        }
      }
    };

    connectAudience();

    return () => {
      mounted = false;
      remoteTracksRef.current.forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      remoteTracksRef.current.clear();

      if (client) {
        client.leave().catch(() => {});
        clientRef.current = null;
      }
    };
  }, [room.id, room.agoraChannel, activeMode]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    remoteTracksRef.current.forEach((track) => {
      try {
        if (nextMuted) track.stop();
        else track.play();
      } catch (e) {}
    });
  };

  return (
    <div className="border border-emerald-500/50 bg-neutral-950 p-6 space-y-4 rounded-xl shadow-2xl">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-white tracking-widest uppercase font-semibold">
            NOW LISTENING: {room.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-emerald-400 border border-emerald-950 bg-emerald-950/60 px-2 py-0.5 rounded tracking-widest uppercase">
            LOW-COST DECOUPLED MODE 🟢
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-white font-mono text-xs px-2 py-0.5 border border-neutral-800 rounded"
            >
              ✕ STOP
            </button>
          )}
        </div>
      </div>

      {/* Stream Type Switcher if room has HLS transmit URL */}
      {room.transmitUrl && (
        <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg font-mono text-xs">
          <button
            onClick={() => setActiveMode('rtc_audience')}
            className={`flex-1 py-1 px-3 rounded transition-all ${
              activeMode === 'rtc_audience'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            RTC LOW-COST AUDIENCE ⚡
          </button>
          <button
            onClick={() => setActiveMode('hls')}
            className={`flex-1 py-1 px-3 rounded transition-all ${
              activeMode === 'hls'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            HLS CDN BROADCAST 📡
          </button>
        </div>
      )}

      {/* Audio Player Controls */}
      {activeMode === 'hls' && room.transmitUrl ? (
        <HlsPlayer src={room.transmitUrl} />
      ) : (
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-emerald-400 font-medium">
                {statusText}
              </p>
              <p className="font-mono text-[10px] text-neutral-500 uppercase">
                HOST: {room.hostHandle} • {speakerCount} ACTIVE SPEAKER{speakerCount === 1 ? '' : 'S'}
              </p>
            </div>

            <button
              onClick={toggleMute}
              className={`px-4 py-2 font-mono text-xs rounded border transition-all flex items-center gap-2 ${
                isMuted
                  ? 'bg-red-950 text-red-400 border-red-800'
                  : 'bg-emerald-500 text-black border-emerald-400 font-bold hover:bg-emerald-400'
              }`}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isMuted ? 'UNMUTE AUDIO' : 'MUTED / PLAYING'}
            </button>
          </div>

          {errorText && (
            <p className="font-mono text-xs text-red-400 border border-red-900 bg-red-950/40 p-2 rounded">
              ⚠️ {errorText}
            </p>
          )}

          <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
            DECOUPLED LOW-COST SUBSCRIBER • NO MICROPHONE REQUIRED • ZERO REDIRECTS
          </p>
        </div>
      )}
    </div>
  );
}
