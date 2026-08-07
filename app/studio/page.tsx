"use client";

/**
 * ECHO — The Studio ( /studio )
 * ─────────────────────────────────────────────────────────────
 * Root cause of 1-sec audio fixed: MediaRecorder was getting
 * conflicting stop() calls. Now uses clean state machine:
 * IDLE → RECORDING → PREVIEW → POSTED
 *
 * Also adds a preview playback before posting so user can
 * hear what they recorded.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Play, Square, Trash2, Send } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";

type StudioState = "idle" | "recording" | "preview" | "uploading";

export default function StudioPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [studioState, setStudioState] = useState<StudioState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [caption, setCaption] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer tick
  useEffect(() => {
    if (studioState === "recording") {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 30);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [studioState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

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

  // ── START RECORDING ──────────────────────────────────────────
  const startRecording = async () => {
    // Clean up any previous state
    chunksRef.current = [];
    setAudioBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setElapsedMs(0);
    setStatusMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Pick best supported mime type for universal playback
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac";
      } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }
      setRecordedMimeType(mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      // Collect data every 250ms — critical: gives us proper audio segments
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // onstop fires AFTER all ondataavailable events have fired
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });

        if (finalBlob.size < 100) {
          setStatusMessage("RECORDING TOO SHORT. TRY AGAIN.");
          setStudioState("idle");
          stopStream();
          return;
        }

        // Create a local URL for preview playback
        const url = URL.createObjectURL(finalBlob);
        setAudioBlob(finalBlob);
        setPreviewUrl(url);
        stopStream();
        setStudioState("preview");
      };

      recorder.start();
      setStudioState("recording");
    } catch (err: any) {
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatusMessage("MICROPHONE PERMISSION DENIED. ALLOW MIC IN SETTINGS.");
      } else {
        setStatusMessage("MICROPHONE NOT AVAILABLE ON THIS DEVICE.");
      }
      setStudioState("idle");
    }
  };

  // ── STOP RECORDING ───────────────────────────────────────────
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    // Only call stop() if actively recording — prevents double-stop
    if (recorder.state === "recording" || recorder.state === "paused") {
      recorder.stop(); // triggers onstop after final ondataavailable
    }
    // Do NOT set state here — let onstop handle the state transition
  };

  // ── PREVIEW PLAYBACK ─────────────────────────────────────────
  const togglePreview = () => {
    if (!previewUrl) return;

    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    if (!previewAudioRef.current) {
      const a = new Audio(previewUrl);
      a.volume = 1.0;
      a.muted = false;
      a.onended = () => setIsPreviewPlaying(false);
      previewAudioRef.current = a;
    } else {
      previewAudioRef.current.volume = 1.0;
      previewAudioRef.current.muted = false;
    }

    previewAudioRef.current
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch((e) => {
        console.warn("Preview play failed:", e);
        setIsPreviewPlaying(false);
      });
  };

  // ── DISCARD RECORDING ────────────────────────────────────────
  const discardRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAudioBlob(null);
    setElapsedMs(0);
    setIsPreviewPlaying(false);
    chunksRef.current = [];
    setStudioState("idle");
    setStatusMessage(null);
  };

  // ── PUBLISH ──────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!caption.trim()) {
      setStatusMessage("ADD A CAPTION TO YOUR ECHO FIRST.");
      return;
    }
    if (!audioBlob || audioBlob.size < 100) {
      setStatusMessage("RECORD AN ECHO FIRST.");
      return;
    }

    // Stop preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    setStudioState("uploading");
    setStatusMessage("UPLOADING YOUR VOICE TO CLOUDINARY...");

    try {
      const secSec = Math.max(1, Math.floor(elapsedMs / 1000));
      const uploadResult = await uploadAudio(audioBlob, `echo-${user?.uid || "anon"}-${Date.now()}`);

      setStatusMessage("SAVING TO THE FREQUENCY...");

      await createPost({
        audioUrl: uploadResult.secureUrl,
        caption: caption.trim(),
        authorUid: user?.uid || "anon",
        authorHandle: user?.handle || "@ANON",
        duration: formatSeconds(elapsedMs),
        durationSec: secSec,
      });

      // Revoke blob URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      router.push("/");
    } catch (err: any) {
      console.error("Publish error:", err);
      setStatusMessage(`ERROR: ${err?.message?.toUpperCase() || "UPLOAD FAILED. TRY AGAIN."}`);
      setStudioState("preview");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 md:p-12 font-sans">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <Link
          href="/"
          className="font-serif italic text-2xl tracking-tight text-white hover:text-neutral-400 transition-colors"
        >
          Echo.
        </Link>
        <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
          // STUDIO ·{" "}
          {studioState === "idle"
            ? "READY"
            : studioState === "recording"
            ? "🔴 LIVE"
            : studioState === "preview"
            ? "PREVIEW"
            : "UPLOADING"}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full my-8 space-y-10">
        {/* Timer */}
        <div className="text-center">
          <div className="font-mono text-6xl md:text-7xl lg:text-8xl tracking-tighter text-white font-extralight select-none tabular-nums">
            {formatTimer(elapsedMs)}
          </div>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-600 mt-3">
            {studioState === "idle" && "TAP RECORD TO CAPTURE YOUR ECHO"}
            {studioState === "recording" && "🔴 CAPTURING YOUR VOICE — TAP STOP WHEN DONE"}
            {studioState === "preview" && "LISTEN BACK · ADD CAPTION · POST"}
            {studioState === "uploading" && "UPLOADING TO THE FREQUENCY..."}
          </p>
        </div>

        {/* Caption */}
        <div className="w-full">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={180}
            placeholder="What's on your mind?"
            rows={3}
            disabled={studioState === "uploading"}
            className="w-full bg-transparent border-b border-neutral-800 pb-4 font-serif italic text-2xl md:text-3xl text-white placeholder:text-neutral-700 placeholder:not-italic focus:outline-none focus:border-white transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex justify-between mt-1 font-mono text-[10px] text-neutral-600 tracking-widest">
            <span>UNFILTERED THOUGHT</span>
            <span>{caption.length}/180</span>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full space-y-3">

          {/* IDLE STATE */}
          {studioState === "idle" && (
            <button
              onClick={startRecording}
              className="w-full border border-neutral-800 text-white font-mono text-xs tracking-[0.2em] uppercase py-5 px-6 hover:border-white hover:bg-neutral-950 transition-colors cursor-pointer"
            >
              [ 🔴 TAP TO START RECORDING ]
            </button>
          )}

          {/* RECORDING STATE */}
          {studioState === "recording" && (
            <button
              onClick={stopRecording}
              className="w-full border border-white bg-white text-black font-mono text-xs tracking-[0.2em] uppercase py-5 px-6 animate-pulse cursor-pointer font-bold"
            >
              [ ⏹ TAP TO STOP RECORDING ]
            </button>
          )}

          {/* PREVIEW STATE */}
          {studioState === "preview" && (
            <div className="space-y-3">
              {/* Preview playback */}
              <div className="w-full border border-neutral-800 p-4 flex items-center gap-4">
                <button
                  onClick={togglePreview}
                  className="font-mono text-xs tracking-widest uppercase border border-white px-4 py-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0"
                >
                  {isPreviewPlaying ? "[ ⏸ PAUSE ]" : "[ ▶ PREVIEW ]"}
                </button>
                <div className="flex-1">
                  <div className="flex items-end gap-[2px] h-6">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={isPreviewPlaying ? "waveform-bar" : "opacity-20"}
                        style={{
                          height: `${6 + Math.sin(i * 0.7) * 12 + 6}px`,
                          width: "2px",
                          backgroundColor: "white",
                          animationDelay: isPreviewPlaying ? `${i * 0.05}s` : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="font-mono text-xs text-neutral-600 tracking-widest shrink-0">
                  {formatSeconds(elapsedMs)}
                </span>
              </div>

              {/* Post or Discard row */}
              <div className="flex gap-3">
                <button
                  onClick={discardRecording}
                  className="flex items-center justify-center gap-1.5 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase px-4 py-4 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  DISCARD
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!caption.trim()}
                  className="flex-1 flex items-center justify-center gap-2 border border-white bg-white text-black font-mono text-xs tracking-[0.2em] uppercase py-4 px-6 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  [ POST TO FREQUENCY ]
                </button>
              </div>
              {!caption.trim() && (
                <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase text-center">
                  ↑ ADD A CAPTION ABOVE FIRST
                </p>
              )}
            </div>
          )}

          {/* UPLOADING STATE */}
          {studioState === "uploading" && (
            <div className="w-full border border-neutral-800 py-5 flex items-center justify-center gap-3 font-mono text-xs tracking-widest uppercase text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              TRANSMITTING TO THE FREQUENCY...
            </div>
          )}
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="w-full border border-neutral-800 p-3 text-center font-mono text-xs text-neutral-400 tracking-widest uppercase">
            {statusMessage}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-900 pt-4 flex justify-between items-center font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
        <Link href="/" className="hover:text-white transition-colors">
          ← RETURN TO FREQUENCY
        </Link>
        <span>
          {studioState === "recording"
            ? `${formatSeconds(elapsedMs)} RECORDED`
            : "CLOUDINARY + FIRESTORE"}
        </span>
      </footer>
    </div>
  );
}
