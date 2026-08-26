'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Opens a getUserMedia stream with hardware AEC constraints.
 * Holding an active stream forces Chrome/Android/iOS into VoiceProcessingIO mode,
 * applying DSP echo cancellation across the entire browser audio context.
 */
export function useAECMicrophone() {
  const [hasAECStream, setHasAECStream] = useState(false);
  const aecStreamRef = useRef<MediaStream | null>(null);

  const startAECSession = async (): Promise<MediaStream | null> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl:  { ideal: true },
          sampleRate: 48000,
          channelCount: 1,
          // Chromium / Android legacy hardware DSP flags
          ...({
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googAutoGainControl: true,
          } as any),
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      aecStreamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      const settings   = audioTrack?.getSettings();
      console.log('// HARDWARE AEC STATUS:', settings?.echoCancellation ? 'ACTIVE' : 'SOFTWARE FALLBACK');

      setHasAECStream(true);
      return stream;
    } catch (err) {
      console.warn('[useAECMicrophone] AEC stream failed:', err);
      return null;
    }
  };

  const stopAECSession = () => {
    aecStreamRef.current?.getTracks().forEach(t => t.stop());
    aecStreamRef.current = null;
    setHasAECStream(false);
  };

  useEffect(() => () => stopAECSession(), []);

  return { hasAECStream, startAECSession, stopAECSession };
}
