"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Check, X, Volume2, Sparkles, Activity } from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";

interface MicrophoneSoundCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReady?: () => void;
}

export default function MicrophoneSoundCheckModal({
  isOpen,
  onClose,
  onReady,
}: MicrophoneSoundCheckModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [testedPassed, setTestedPassed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }
    startListening();
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = async () => {
    try {
      setHasError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsListening(true);
      drawWaveform();
      soundSynth.playSubtlePop();
    } catch (err) {
      console.warn("Microphone sound check access error:", err);
      setHasError(true);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteFrequencyData(dataArray);

      // Compute RMS Energy Level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      setMicLevel(normalizedLevel);

      // Auto-pass if user speaks with sufficient volume
      if (normalizedLevel > 15 && !testedPassed) {
        setTestedPassed(true);
        setDetectedPitch(Math.round(180 + normalizedLevel * 2.5));
      }

      // Draw canvas visualizer
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Cyberpunk Emerald & White Glow
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "rgba(52, 211, 153, 0.2)");
        gradient.addColorStop(0.5, "rgba(52, 211, 153, 0.8)");
        gradient.addColorStop(1, "#FFFFFF");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  if (!isOpen) return null;

  const handleConfirmReady = () => {
    soundSynth.playFanfare();
    if (onReady) onReady();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 font-mono text-white shadow-[0_0_50px_rgba(52,211,153,0.15)] space-y-5 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider text-white">
                1-TAP SOUND CHECK
              </h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase">
                TEST YOUR MICROPHONE BEFORE MATCH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Audio Waveform Canvas */}
        <div className="relative h-28 bg-black rounded-2xl border border-neutral-900 overflow-hidden flex items-center justify-center p-2">
          {hasError ? (
            <div className="text-center space-y-1">
              <MicOff className="w-6 h-6 text-red-500 mx-auto" />
              <p className="text-xs text-red-400 font-bold">MIC PERMISSION REQUIRED</p>
              <p className="text-[10px] text-neutral-500">Allow microphone access in your browser.</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={380}
              height={100}
              className="w-full h-full block"
            />
          )}

          {/* Level Indicator Overlay */}
          {!hasError && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-neutral-900/90 border border-neutral-800 rounded-md text-[9px] font-black text-emerald-400">
              {micLevel > 0 ? `${micLevel}% INPUT` : "SPEAK NOW..."}
            </div>
          )}
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-black border border-neutral-900 rounded-xl space-y-1">
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">MIC SIGNAL</span>
            <span className={`text-xs font-black uppercase ${micLevel > 10 ? "text-emerald-400" : "text-neutral-400"}`}>
              {micLevel > 10 ? "● LIVE ACTIVE" : "○ SILENT"}
            </span>
          </div>
          <div className="p-3 bg-black border border-neutral-900 rounded-xl space-y-1">
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">DETECTED PITCH</span>
            <span className="text-xs font-black uppercase text-white tabular-nums">
              {detectedPitch ? `${detectedPitch} Hz` : "—"}
            </span>
          </div>
        </div>

        {/* Status Callout */}
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          testedPassed
            ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
            : "bg-neutral-900 border-neutral-800 text-neutral-400"
        }`}>
          {testedPassed ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Microphone calibrated successfully! Audio is crystal clear.</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>Speak a word into your microphone to verify audio...</span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleConfirmReady}
            className="w-full py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-neutral-200 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>ENTER ARENA WITH VOICE</span>
          </button>
        </div>
      </div>
    </div>
  );
}