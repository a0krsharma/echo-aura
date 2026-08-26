'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomInteractionEvent, RoomPeer } from '../types/roboRoom';

interface UseRoboRoomSyncProps {
  roomId: string;
  currentUser: RoomPeer;
  dataChannels: { [peerId: string]: RTCDataChannel };
  onRemoteEvent: (event: RoomInteractionEvent) => void;
}

export function useRoboRoomSync({
  roomId,
  currentUser,
  dataChannels,
  onRemoteEvent,
}: UseRoboRoomSyncProps) {
  const [activityFeed, setActivityFeed] = useState<string[]>([]);
  const onRemoteEventRef = useRef(onRemoteEvent);
  onRemoteEventRef.current = onRemoteEvent;

  const pushActivity = useCallback((msg: string) => {
    setActivityFeed(prev => [msg, ...prev.slice(0, 4)]);
  }, []);

  // Inbound DataChannel listener
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const event: RoomInteractionEvent = JSON.parse(e.data);
        onRemoteEventRef.current(event);
        if (event.type === 'POKE')    pushActivity(`👉 @${(event as any).senderName} poked Robo-Echo's ${(event as any).zone}!`);
        if (event.type === 'SNEEZE')  pushActivity(`💨 @${(event as any).senderName} blew on the mic! Sneeze triggered!`);
        if (event.type === 'INTERRUPT') pushActivity(`🛑 @${(event as any).senderId} interrupted Robo-Echo!`);
      } catch {}
    };

    Object.values(dataChannels).forEach(ch => {
      if (ch.readyState === 'open') ch.addEventListener('message', handleMessage);
    });
    return () => {
      Object.values(dataChannels).forEach(ch => ch.removeEventListener('message', handleMessage));
    };
  }, [dataChannels, pushActivity]);

  // Outbound broadcast dispatcher
  const broadcastEvent = useCallback((event: RoomInteractionEvent) => {
    const payload = JSON.stringify(event);
    Object.values(dataChannels).forEach(ch => {
      if (ch.readyState === 'open') ch.send(payload);
    });
    if (event.type === 'POKE')   pushActivity(`👉 You poked Robo-Echo's ${(event as any).zone}!`);
    if (event.type === 'SNEEZE') pushActivity(`💨 You blew air! Sneeze triggered!`);
    if (event.type === 'AI_SPEECH_START') pushActivity(`🎙️ You asked Echo to speak.`);
  }, [dataChannels, pushActivity]);

  return { activityFeed, broadcastEvent };
}
