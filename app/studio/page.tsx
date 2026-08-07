"use client";

/**
 * ECHO — The Studio ( /studio )
 * ─────────────────────────────────────────────────────────────
 * Phase 2 Audio Recording Interface
 * Aesthetics: Utilitarian Canvas — pure black/white, monospace & serif, 1px borders.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";

export default function StudioPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Timer loop for ultra-light monospace timer (00:00.00)
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 30);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Explicit unmount cleanup for MediaRecorder & MediaStream tracks
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks()?.forEach((t) => t.stop());
        } catch {}
      }
    };
  }, []);

  // Format milliseconds into 00:00.00
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    const hundredths = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
    return `${mins}:${secs}.${hundredths}`;
  };

  const formatSeconds = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Start MediaRecorder
  const startRecording = async () => {
    setStatusMessage(null);
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        }
      }
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone permission error:", err);
      setStatusMessage("MICROPHONE ACCESS DENIED OR NOT SUPPORTED.");
    }
  };

  // Stop MediaRecorder
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Toggle or Hold handlers
  const handlePressStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isRecording && !isUploading) {
      startRecording();
    }
  };

  const handlePressEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  const handleToggleClick = () => {
    if (isUploading) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Upload to Cloudinary & Save to Firestore
  const handlePublish = async () => {
    if (!caption.trim()) {
      setStatusMessage("CAPTION REQUIRED.");
      return;
    }

    setIsUploading(true);
    setStatusMessage("UPLOADING AUDIO TO CLOUDINARY...");

    try {
      let secureUrl = "";
      const sec = Math.max(1, Math.floor(elapsedMs / 1000));

      const targetBlob = audioBlob && audioBlob.size > 0 ? audioBlob : new Blob([], { type: "audio/webm" });
      const uploadResult = await uploadAudio(targetBlob, `echo-${user?.uid || "anon"}`);
      secureUrl = uploadResult.secureUrl;

      setStatusMessage("SAVING TO FIRESTORE POSTS...");

      await createPost({
        audioUrl:     secureUrl,
        caption:      caption.trim(),
        authorUid:    user?.uid || "anon",
        authorHandle: user?.handle || "@ANON_GUEST",
        duration:     formatSeconds(elapsedMs || 5000),
        durationSec:  sec,
      });

      // Redirect to feed
      router.push("/");
    } catch (err: unknown) {
      console.error("Publishing error:", err);
      const msg = err instanceof Error ? err.message : "UPLOAD FAILED";
      setStatusMessage(`ERROR: ${msg.toUpperCase()}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 md:p-12 font-sans">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <Link href="/" className="font-serif italic text-2xl tracking-tight text-white hover:text-neutral-400 transition-colors">
          Echo.
        </Link>
        <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
          // STUDIO · AUDIO CAPTURE
        </div>
      </header>

      {/* ── Main Stark Studio Center ── */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full my-8 space-y-12">
        {/* Massive Ultra-Light Monospace Timer */}
        <div className="text-center">
          <div className="font-mono text-6xl md:text-7xl lg:text-8xl tracking-tighter text-white font-extralight select-none">
            {formatTimer(elapsedMs)}
          </div>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-600 mt-2">
            {isRecording ? "🔴 RECORDING LIVE AUDIO" : audioBlob ? "AUDIO CAPTURED · READY TO POST" : "HOLD OR TAP BUTTON TO RECORD"}
          </p>
        </div>

        {/* Caption Input in Elegant Large Serif */}
        <div className="w-full">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={180}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full bg-transparent border-b border-neutral-800 pb-4 font-serif italic text-2xl md:text-3xl text-white placeholder:text-neutral-700 placeholder:not-italic focus:outline-none focus:border-white transition-colors resize-none"
          />
          <div className="flex justify-between items-center mt-2 font-mono text-[10px] text-neutral-600 tracking-widest">
            <span>UNFILTERED THOUGHT</span>
            <span>{caption.length}/180</span>
          </div>
        </div>

        {/* Single Interaction Area: [ 🔴 TAP TO RECORD ] */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleToggleClick}
            disabled={isUploading}
            className={`flex-1 w-full border font-mono text-xs tracking-[0.2em] uppercase py-5 px-6 transition-colors duration-150 cursor-pointer select-none text-center ${
              isRecording
                ? "border-white bg-white text-black font-bold animate-pulse"
                : "border-neutral-800 text-white hover:border-white hover:bg-neutral-950"
            }`}
          >
            {isRecording ? "[ ⏹ TAP TO STOP & PREVIEW ]" : "[ 🔴 TAP TO START RECORDING ]"}
          </button>

          {(audioBlob || elapsedMs > 0) && (
            <button
              onClick={handlePublish}
              disabled={isUploading || !caption.trim()}
              className="w-full sm:w-auto border border-white bg-white text-black font-mono text-xs tracking-[0.2em] uppercase py-5 px-8 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  POSTING...
                </>
              ) : (
                "[ PUBLISH POST ]"
              )}
            </button>
          )}
        </div>

        {/* Status / Error feedback */}
        {statusMessage && (
          <div className="w-full border border-neutral-800 p-3 text-center font-mono text-xs text-neutral-400 tracking-widest uppercase">
            {statusMessage}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-900 pt-4 flex justify-between items-center font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
        <Link href="/" className="hover:text-white transition-colors">
          ← CANCEL & RETURN TO FREQUENCY
        </Link>
        <span>CLOUDINARY + FIRESTORE POSTS</span>
      </footer>
    </div>
  );
}
