'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWakeWordDetector(onWake: () => void) {
  const [isListening, setIsListening] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWakeWordListener = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startWakeWordListener = useCallback(async () => {
    try {
      stopWakeWordListener();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.25;

      source.connect(analyser);

      audioCtxRef.current = ctx;
      streamRef.current = stream;
      setIsListening(true);

      const freqData = new Uint8Array(128);
      let syllableStreak = 0;
      let lastWakeTime = 0;

      pollIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(freqData);

        // Formant 1: 'Hey' (~500Hz-800Hz / Bins 3-5)
        const heyEnergy = (freqData[3] + freqData[4] + freqData[5]) / 3;
        // Formant 2: 'Echo' / 'k' burst (~2.2kHz-3.5kHz / Bins 13-20)
        const echoEnergy = (freqData[14] + freqData[16] + freqData[18]) / 3;

        // Two-syllable rhythmic impulse test
        if (heyEnergy > 110 && echoEnergy > 75) {
          syllableStreak += 1;
          const now = Date.now();

          if (syllableStreak >= 2 && now - lastWakeTime > 3000) {
            lastWakeTime = now;
            syllableStreak = 0;
            onWakeRef.current();
          }
        } else {
          syllableStreak = Math.max(0, syllableStreak - 1);
        }
      }, 80);
    } catch (err) {
      console.warn('Wake word mic access warning:', err);
      setIsListening(false);
    }
  }, [stopWakeWordListener]);

  useEffect(() => {
    return () => {
      stopWakeWordListener();
    };
  }, [stopWakeWordListener]);

  return { isListening, startWakeWordListener, stopWakeWordListener };
}
