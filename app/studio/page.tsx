"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  Play, 
  Square, 
  Trash2, 
  Send, 
  Radio, 
  Mic, 
  Music, 
  X,
  Pause,
  Headphones,
  CheckCircle2,
  Film,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";
import SoundPickerModal from "@/app/components/SoundPickerModal";
import { SoundItem, getSoundById } from "@/lib/soundCatalog";
import { useVoiceFilters, VOICE_MASKS } from "@/app/hooks/useVoiceFilters";
import CanvasStoryExporter from "@/app/components/studio/CanvasStoryExporter";
import { soundSynth } from "@/lib/soundSynthesizer";

type StudioState = "idle" | "recording" | "preview" | "uploading";

function StudioContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const topicParam = searchParams.get("topic") || "";
  const headlineParam = searchParams.get("headline") || "";
  const newsUrlParam = searchParams.get("url") || searchParams.get("link") || "";
  const categoryParam = searchParams.get("category") || "";

  // Community Sound / "Use This Audio" Query Params
  const soundIdParam = searchParams.get("soundId") || "";
  const soundUrlParam = searchParams.get("soundUrl") || "";
  const soundTitleParam = searchParams.get("soundTitle") || "";
  const soundArtistParam = searchParams.get("soundArtist") || "";
  const isMemeParam = searchParams.get("isMeme") === "true";

  const [studioState, setStudioState] = useState<StudioState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  // Attached Sound State
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [attachedSound, setAttachedSound] = useState<SoundItem | null>(() => {
    if (soundIdParam) {
      const catalogSound = getSoundById(soundIdParam);
      if (catalogSound) return catalogSound;
      if (soundUrlParam && soundTitleParam) {
        return {
          id: soundIdParam,
          title: soundTitleParam,
          artist: soundArtistParam || "@ANON",
          category: isMemeParam ? "VOICE_MEME" : "COMMUNITY",
          audioUrl: soundUrlParam,
          durationSec: 15,
          usageCount: 1,
          isVoiceMeme: isMemeParam,
        };
      }
    }
    return null;
  });

  const backingAudioRef = useRef<HTMLAudioElement | null>(null);

  const [caption, setCaption] = useState(() => {
    if (topicParam) {
      const clean = topicParam.replace(/^#+/, "");
      return `#${clean} `;
    }
    return "";
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");
  const [showStoryExporter, setShowStoryExporter] = useState(false);

  const { activeFilter, applyFilterToStream, setActiveFilter, cleanup } = useVoiceFilters();

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

  // Clean up media streams and audio on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (backingAudioRef.current) {
        backingAudioRef.current.pause();
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const formatSeconds = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Recording Actions ───────────────────────────────────────────────────────
  const startRecording = async () => {
    chunksRef.current = [];
    setElapsedMs(0);
    setAudioBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setStatusMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Apply Real-Time 0MB Client-Side DSP Voice Mask
      const processedStream = await applyFilterToStream(stream, activeFilter);

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }
      setRecordedMimeType(mimeType);

      const recorder = new MediaRecorder(processedStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const rawType = mimeType.split(";")[0];
        const blob = new Blob(chunksRef.current, { type: rawType });

        if (blob.size < 100) {
          setStatusMessage("ERROR: Recording too short or empty.");
          setStudioState("idle");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        setStudioState("preview");

        if (backingAudioRef.current) {
          backingAudioRef.current.pause();
          backingAudioRef.current.currentTime = 0;
        }
      };

      recorder.start();
      setStudioState("recording");

      // Play attached backing stem simultaneously in real-time
      if (attachedSound?.audioUrl) {
        if (!backingAudioRef.current) {
          backingAudioRef.current = new Audio(attachedSound.audioUrl);
          backingAudioRef.current.loop = true;
          backingAudioRef.current.volume = 0.35;
        } else {
          backingAudioRef.current.src = attachedSound.audioUrl;
          backingAudioRef.current.currentTime = 0;
        }
        backingAudioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("[Studio Error]: Microphone access denied:", err);
      setStatusMessage("MICROPHONE ACCESS DENIED. Check browser permissions.");
      setStudioState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
    }
  };

  const togglePreview = () => {
    if (!previewUrl) return;

    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(previewUrl);
      previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      previewAudioRef.current.onerror = () => setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.src = previewUrl;
    }

    previewAudioRef.current
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => setIsPreviewPlaying(false));
  };

  const resetRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setAudioBlob(null);
    setElapsedMs(0);
    setIsPreviewPlaying(false);
    setStatusMessage(null);
    setStudioState("idle");
  };

  // ── Publish Action ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!audioBlob) {
      setStatusMessage("No audio recorded to publish.");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }

    setStudioState("uploading");
    setStatusMessage("UPLOADING TO ECHO FREQUENCY...");

    try {
      const filename = `echo-${user.uid}-${Date.now()}`;
      const uploadResult = await uploadAudio(audioBlob, filename);

      const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedDuration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      // Extract tags
      const hashMatches = caption.match(/#[a-zA-Z0-9_]+/g) || [];
      const cleanedTags = hashMatches.map((tag) => tag.replace(/^#+/, "").toUpperCase());

      await createPost({
        audioUrl: uploadResult.secureUrl,
        caption: caption.trim() || `Transmission from ${user.handle || "@ANON"}`,
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        duration: formattedDuration,
        durationSec: totalSeconds,
        category: categoryParam || "MICROPHONE",
        newsTopic: topicParam ? topicParam.replace(/^#+/, "") : null,
        newsHeadline: headlineParam || null,
        newsLink: newsUrlParam || null,
        tags: cleanedTags,
        audioTrackId: attachedSound?.id || undefined,
        audioTrackTitle: attachedSound?.title || undefined,
        audioTrackArtist: attachedSound?.artist || undefined,
        isVoiceMeme: attachedSound?.isVoiceMeme || false,
      });

      setStatusMessage("TRANSMISSION BROADCAST SUCCESSFUL!");

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      console.error("[Studio Publish Error]:", err);
      setStatusMessage(`UPLOAD FAILED: ${err?.message || "Check network connection."}`);
      setStudioState("preview");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans pb-28 md:pb-12 flex flex-col justify-between max-w-2xl mx-auto">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <Link
          href="/"
          className="font-mono font-bold text-lg sm:text-xl tracking-tight text-white hover:text-neutral-400 transition-colors uppercase flex items-center gap-2"
        >
          <Radio className="w-5 h-5 text-white" />
          <span>Echo. [ STUDIO ]</span>
        </Link>
        <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
          {studioState === "idle"
            ? "// READY TO RECORD"
            : studioState === "recording"
            ? "🔴 RECORDING LIVE"
            : studioState === "preview"
            ? "// PREVIEW TAKE"
            : "// UPLOADING"}
        </div>
      </header>

      {/* ── Main Voice Recorder ── */}
      <main className="flex-1 flex flex-col items-center justify-center w-full my-8 space-y-8">
        {/* Tagged Wire News Dispatch Banner (if navigated from search/radar) */}
        {(topicParam || headlineParam) && (
          <div className="w-full p-4 border border-white bg-neutral-950 space-y-1.5 font-mono shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white font-bold tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                // TAGGED WIRE DISPATCH
              </span>
              <span className="text-[9px] text-neutral-400 uppercase tracking-widest border border-neutral-800 px-2 py-0.5">
                FREQUENCY FEED TAKE
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              #{topicParam.replace(/^#+/, "")} {headlineParam ? `— "${headlineParam}"` : ""}
            </p>
          </div>
        )}

        {/* Attached Sound / Voice Meme / Backing Track Bar */}
        <div className="w-full">
          {attachedSound ? (
            <div className="border border-white bg-neutral-950 p-3.5 flex items-center justify-between gap-3 font-mono shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Music className="w-4 h-4 text-white animate-pulse shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white uppercase truncate">
                      {attachedSound.title}
                    </span>
                    {attachedSound.isVoiceMeme && (
                      <span className="text-[9px] bg-white text-black font-extrabold px-1 uppercase shrink-0">
                        MEME
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {attachedSound.artist} • BACKING AUDIO SYNC ON
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSoundPicker(true)}
                  className="text-[10px] border border-neutral-700 hover:border-white px-2 py-1 uppercase text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  CHANGE
                </button>
                <button
                  type="button"
                  onClick={() => setAttachedSound(null)}
                  className="text-neutral-500 hover:text-white p-1 cursor-pointer"
                  title="Remove sound"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSoundPicker(true)}
              className="w-full border border-dashed border-neutral-800 hover:border-white bg-black/40 hover:bg-neutral-950 p-3 font-mono text-xs text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Music className="w-4 h-4 text-neutral-500" />
              <span className="uppercase tracking-wider">
                [ + ATTACH BACKING BEAT / VIRAL AUDIO MEME ]
              </span>
            </button>
          )}
        </div>

        {/* ── Real-Time Voice Masks Carousel (0MB Client-Side DSP) ── */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between font-mono text-xs px-1">
            <span className="text-neutral-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <span>// VOICE MASKS</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              0MB CLIENT-SIDE DSP
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {VOICE_MASKS.map((mask) => (
              <button
                key={mask.id}
                type="button"
                disabled={studioState === "recording"}
                onClick={() => {
                  soundSynth.playSubtlePop();
                  setActiveFilter(mask.id);
                }}
                className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 shrink-0 transition-all font-mono cursor-pointer ${
                  activeFilter === mask.id
                    ? "border-emerald-400 bg-emerald-950/80 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "border-neutral-800 bg-neutral-950/90 text-neutral-400 hover:border-neutral-700 hover:text-white"
                } disabled:opacity-50`}
                title={mask.description}
              >
                <span className="text-sm">{mask.icon}</span>
                <span className="truncate">{mask.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Clock & Waveform */}
        <div className="text-center space-y-3">
          <div className="font-mono text-5xl sm:text-7xl font-bold tracking-tight tabular-nums select-none text-white">
            {formatSeconds(elapsedMs)}
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            {studioState === "recording" ? (
              <span className="text-red-500 animate-pulse font-bold">
                ● TRANSMITTING MICROPHONE FEED
              </span>
            ) : studioState === "preview" ? (
              "TAKE RECORDED • READY FOR BROADCAST"
            ) : (
              "MAX BROADCAST DURATION: 180s"
            )}
          </div>
        </div>

        {/* Recording Visualizer Bar */}
        <div className="w-full max-w-md h-12 flex items-center justify-center gap-1.5 px-4 bg-neutral-950 border border-neutral-900">
          {Array.from({ length: 24 }).map((_, i) => {
            const isRec = studioState === "recording";
            const height = isRec ? Math.max(15, (Math.sin(i + elapsedMs / 80) + 1) * 45) : 8;
            return (
              <div
                key={i}
                className={`w-1 transition-all duration-75 ${
                  isRec ? "bg-white" : "bg-neutral-800"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Main Controls Bar */}
        <div className="flex items-center gap-4">
          {studioState === "idle" && (
            <button
              type="button"
              onClick={startRecording}
              className="px-8 py-5 border-2 border-white bg-white text-black font-mono font-bold text-sm tracking-widest uppercase hover:bg-neutral-200 transition-colors shadow-2xl flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>[ RECORD TAKE ]</span>
            </button>
          )}

          {studioState === "recording" && (
            <button
              type="button"
              onClick={stopRecording}
              className="px-8 py-5 border-2 border-red-500 bg-red-600 text-white font-mono font-bold text-sm tracking-widest uppercase hover:bg-red-700 transition-colors shadow-2xl animate-pulse flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-5 h-5 fill-white" />
              <span>[ STOP RECORDING ]</span>
            </button>
          )}

          {studioState === "preview" && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={togglePreview}
                className="px-6 py-3.5 border border-white bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPreviewPlaying ? "PAUSE" : "AUDITION TAKE"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth.playSubtlePop();
                  setShowStoryExporter(true);
                }}
                className="px-4 py-3.5 border border-emerald-500/70 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>9:16 STORY EXPORT</span>
              </button>

              <button
                type="button"
                onClick={resetRecording}
                className="px-4 py-3.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>RETAKE</span>
              </button>
            </div>
          )}
        </div>

        {/* Caption & Post Form */}
        {studioState === "preview" && (
          <div className="w-full space-y-4 pt-4 border-t border-neutral-900 animate-fade-in">
            <div className="space-y-1">
              <label className="font-mono text-xs text-neutral-400 tracking-widest uppercase block">
                [ ADD CAPTION / TAGS ]
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What is this transmission about? Add #topics..."
                rows={2}
                maxLength={280}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-white p-3 font-mono text-xs text-white outline-none resize-none transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handlePublish}
              className="w-full py-4 border-2 border-white bg-white text-black font-mono font-bold text-xs tracking-widest uppercase hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
            >
              <Send className="w-4 h-4" />
              <span>[ BROADCAST TO ECHO FREQUENCY ]</span>
            </button>
          </div>
        )}

        {/* Status Notification Message */}
        {statusMessage && (
          <div className="font-mono text-xs text-neutral-400 uppercase tracking-widest text-center animate-fade-in">
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
            : "AUDIO CLOUD ENGINE"}
        </span>
      </footer>

      {/* ── Sound Hub / Meme Picker Modal ── */}
      <SoundPickerModal
        isOpen={showSoundPicker}
        onClose={() => setShowSoundPicker(false)}
        onSelectSound={(s) => setAttachedSound(s)}
        activeSoundId={attachedSound?.id}
      />

      {/* ── 9:16 Canvas Story Video Exporter (WhatsApp & Instagram Loops) ── */}
      <CanvasStoryExporter
        isOpen={showStoryExporter}
        onClose={() => setShowStoryExporter(false)}
        audioBlob={audioBlob}
        audioUrl={previewUrl}
        caption={caption}
        userHandle={user?.handle || "@ANON"}
        voiceMaskLabel={VOICE_MASKS.find((m) => m.id === activeFilter)?.label}
        durationSec={Math.max(1, Math.floor(elapsedMs / 1000))}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 font-mono text-xs tracking-widest uppercase">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          INITIALIZING STUDIO ENGINE...
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
