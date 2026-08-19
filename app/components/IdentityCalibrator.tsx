"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, RotateCcw, Volume2, CheckCircle2, AlertCircle, Sparkles, Shield } from "lucide-react";

export default function IdentityCalibrator({
  onIdentityCaptured,
  onReset,
}: {
  onIdentityCaptured: (blob: Blob) => void;
  onReset?: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [statusLog, setStatusLog] = useState(">> MIC STANDBY. CLICK BELOW TO CALIBRATE.");
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ── Start 10-Second Mic Check ──────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setCapturedBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Audio visualizer analysis
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // MediaRecorder setup
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setAudioUrl(url);
        onIdentityCaptured(blob);
        setStatusLog(">> ACOUSTIC SIGNATURE CAPTURED (10.0s). VERIFY PLAYBACK BELOW.");

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setTimeLeft(10);
      setStatusLog(">> CALIBRATING... SPEAK CLEARLY INTO MIC IN YOUR NATURAL TIMBRE.");

      // Strict 10-second countdown
      let remaining = 10;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error("[IdentityCalibrator Error]:", err);
      setStatusLog(">> [ERROR]: MICROPHONE PERMISSION DENIED OR NOT AVAILABLE.");
    }
  };

  // ── Stop Recording Early ───────────────────────────────────────────────────
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ── Reset Signature ────────────────────────────────────────────────────────
  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setCapturedBlob(null);
    setTimeLeft(10);
    setStatusLog(">> MIC STANDBY. CLICK BELOW TO CALIBRATE.");
    if (onReset) onReset();
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 p-4 font-mono text-white space-y-3 shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white">
          <Shield className="w-3.5 h-3.5 text-white" />
          <span>// PERSONAL NODE: 10-SEC MIC CHECK</span>
        </div>
        <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.2 uppercase tracking-wider">
          ZERO-SHOT CLONING
        </span>
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Speak continuously for 10 seconds (read a couplet or introduce yourself). The zero-shot neural engine will extract your acoustic timbre, pitch, and resonance.
      </p>

      {/* Recording Monitor Box */}
      <div className="bg-black border border-neutral-900 p-3 flex items-center justify-between gap-3">
        <div className="overflow-hidden flex-1">
          <p className="text-xs text-white truncate font-bold">{statusLog}</p>
          {isRecording && (
            <div className="w-full bg-neutral-950 h-1.5 mt-2 border border-neutral-800 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-75"
                style={{ width: `${Math.max(10, audioLevel)}%` }}
              />
            </div>
          )}
        </div>

        {isRecording && (
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-white bg-neutral-900 border border-white px-2 py-1 uppercase tracking-widest animate-pulse">
              🔴 00:0{timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-white bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{capturedBlob ? "[ RE-CALIBRATE MIC CHECK ]" : "[ INITIATE 10s MIC CHECK ]"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-red-500 bg-red-950/80 text-white hover:bg-red-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
          >
            <Square className="w-3.5 h-3.5" />
            <span>[ FINISH CALIBRATION EARLY ]</span>
          </button>
        )}

        {capturedBlob && !isRecording && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2.5 text-xs font-bold uppercase border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer"
            title="Reset signature"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Captured Audio Playback Audition */}
      {audioUrl && !isRecording && (
        <div className="pt-2 border-t border-neutral-900 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-widest">
            <span className="flex items-center gap-1 text-white font-bold">
              <CheckCircle2 className="w-3 h-3 text-white" />
              VERIFY YOUR ACOUSTIC SIGNATURE:
            </span>
            <span>{(capturedBlob?.size ? capturedBlob.size / 1024 : 0).toFixed(1)} KB</span>
          </div>
          <audio src={audioUrl} controls className="w-full h-8 bg-neutral-950 border border-neutral-800" />
        </div>
      )}
    </div>
  );
}
