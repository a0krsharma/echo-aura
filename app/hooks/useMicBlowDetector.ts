"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface BlowDetectorOptions {
  onBlow?: () => void;
  cooldownMs?: number;
}

/**
 * Detects mic-blow events by analysing sub-bass rumble + high-frequency
 * air hiss — the signature of breath turbulence rather than speech.
 */
export function useMicBlowDetector({
  onBlow,
  cooldownMs = 2500,
}: BlowDetectorOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [blowLevel, setBlowLevel] = useState(0);     // 0..1

  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const lastTriggerRef   = useRef(0);
  const consecutiveRef   = useRef(0);
  const onBlowCallbackRef = useRef(onBlow);

  useEffect(() => { onBlowCallbackRef.current = onBlow; }, [onBlow]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;
      streamRef.current    = stream;
      setIsListening(true);
      setHasPermission(true);
    } catch (err) {
      console.warn("[MicBlowDetector] Mic error:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current   = null;
    setIsListening(false);
    setBlowLevel(0);
  }, []);

  useEffect(() => {
    if (!isListening) return;

    const dataArray = new Uint8Array(128);

    const interval = setInterval(() => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      // Low-frequency wind rumble: bins 0–2 (~0–350 Hz)
      const lowRumble = (dataArray[0] + dataArray[1] + dataArray[2]) / 3;

      // High-frequency air hiss: bins 15–35 (~2.5–6 kHz)
      let highHiss = 0;
      for (let i = 15; i <= 35; i++) highHiss += dataArray[i];
      highHiss /= 21;

      // Mid speech bands: bins 5–12 (~800 Hz–2 kHz) — should NOT dominate on blow
      let midSpeech = 0;
      for (let i = 5; i <= 12; i++) midSpeech += dataArray[i];
      midSpeech /= 8;

      const isBlow = lowRumble > 150 && highHiss > 45 && (lowRumble + highHiss) > midSpeech * 1.3;
      const score  = Math.min(1.0, (lowRumble + highHiss) / 300);
      setBlowLevel(score);

      const now = Date.now();
      if (isBlow) {
        consecutiveRef.current++;
        // Require 3 consecutive frames (~90ms) to avoid false clicks
        if (consecutiveRef.current >= 3 && now - lastTriggerRef.current > cooldownMs) {
          lastTriggerRef.current   = now;
          consecutiveRef.current   = 0;
          onBlowCallbackRef.current?.();
        }
      } else {
        consecutiveRef.current = Math.max(0, consecutiveRef.current - 1);
      }
    }, 30); // 33 FPS analysis

    return () => clearInterval(interval);
  }, [isListening, cooldownMs]);

  return { isListening, hasPermission, blowLevel, startListening, stopListening };
}
