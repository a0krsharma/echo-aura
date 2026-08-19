"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Play, 
  Pause, 
  Send, 
  RefreshCw, 
  Flame, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  Music, 
  Radio, 
  Zap,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { mixVocalWithBackground } from "@/lib/audioMixer";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";

const INSPIRATION_CHIPS = [
  { label: "🌧️ Sad Acoustic Shayari", prompt: "Write a sad 4-line acoustic shayari about rain and empty rooms in Hindi" },
  { label: "☕ Midnight Lo-Fi Whisper", prompt: "Create a peaceful lo-fi midnight poem about finding stillness in code" },
  { label: "📈 High-Energy Trading Update", prompt: "Generate an authoritative, sharp market debrief on tech volatility and order flow" },
  { label: "🥀 Romantic Urdu Ghazal", prompt: "Write a deep, emotional classical Urdu couplet about distant memories" },
];

export default function InstantStudioPlus({
  onPublishSuccess,
}: {
  onPublishSuccess?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusLog, setStatusLog] = useState(">> READY. ENTER A 1-LINE PROMPT TO GENERATE AN ORIGINAL TRACK.");
  
  const [generatedTrack, setGeneratedTrack] = useState<{
    title: string;
    lyrics: string;
    mood: string;
    masterAudioUrl: string;
    masterBlob: Blob;
    durationSec: number;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (generatedTrack?.masterAudioUrl) {
        URL.revokeObjectURL(generatedTrack.masterAudioUrl);
      }
    };
  }, [generatedTrack]);

  // ── Single-Turn Generation Trigger ─────────────────────────────────────────
  const handleInstantGenerate = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt || loading) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setLoading(true);
    setGeneratedTrack(null);
    setStatusLog(">> [1/3] COMPOSING 100% ORIGINAL LYRICS & MATCHING ACOUSTICS...");

    try {
      const res = await fetch("/api/instant-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: targetPrompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation request failed");
      }

      const data = await res.json();
      setStatusLog(">> [2/3] MULTI-TRACK BROWSER MIXING & DUCKING ($0 COMPUTE)...");

      // Mix vocal base64 stem with matched ambient backing loop
      const mixedWavBlob = await mixVocalWithBackground(
        data.audioBase64,
        data.bgTrackUrl,
        data.defaultDucking || 0.22
      );

      const mixedUrl = URL.createObjectURL(mixedWavBlob);
      const estimatedSecs = Math.max(1, Math.round(mixedWavBlob.size / 176400));

      setGeneratedTrack({
        title: data.title,
        lyrics: data.lyrics,
        mood: data.mood,
        masterAudioUrl: mixedUrl,
        masterBlob: mixedWavBlob,
        durationSec: estimatedSecs,
      });

      setStatusLog(`>> [3/3] MASTER TRACK READY: "${data.title}" • AUDITION BELOW.`);
    } catch (err: any) {
      console.error("[Instant Studio Error]:", err);
      setStatusLog(`>> [ERROR]: ${err?.message || "Failed to generate track"}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Play / Pause Audition ──────────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !generatedTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // ── 1-Click Publish to Frequency Feed ──────────────────────────────────────
  const handlePublish = async () => {
    if (!generatedTrack) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setIsPublishing(true);
    setStatusLog(">> TRANSMITTING MASTER TRACK TO FREQUENCY FEED...");

    try {
      const filename = `studio-plus-${user.uid}-${Date.now()}`;
      const uploadResult = await uploadAudio(generatedTrack.masterBlob, filename);

      const minutes = Math.floor(generatedTrack.durationSec / 60);
      const seconds = generatedTrack.durationSec % 60;
      const formattedDuration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      await createPost({
        audioUrl: uploadResult.secureUrl,
        caption: `// ${generatedTrack.title} — "${generatedTrack.lyrics.split("\n")[0].slice(0, 70)}"`,
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        duration: formattedDuration,
        durationSec: generatedTrack.durationSec,
        category: "STUDIO_PLUS",
        tags: ["STUDIOPLUS", "AI_SONG", "ONESHOT", generatedTrack.mood.toUpperCase()],
        isNeural: true,
      });

      setStatusLog(">> [SUCCESS]: BROADCAST LIVE ON THE FREQUENCY FEED!");

      if (onPublishSuccess) {
        onPublishSuccess();
      } else {
        setTimeout(() => {
          router.push("/");
        }, 800);
      }
    } catch (err: any) {
      console.error("[Publish Error]:", err);
      setStatusLog(`>> [PUBLISH FAILED]: ${err?.message || "Upload failed"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-neutral-950 border border-white p-4 sm:p-6 font-mono text-white space-y-4 shadow-2xl">
      {/* Header Telemetry */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span className="font-bold tracking-widest uppercase">// 1-SHOT AI MUSIC & SHAYARI STUDIO</span>
        </div>
        <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5 uppercase tracking-widest">
          ZERO CONFIG • 1-TAP
        </span>
      </div>

      {/* Prompt Input Box */}
      <div className="space-y-2">
        <label className="block text-[10px] text-neutral-400 uppercase tracking-widest">
          DESCRIBE WHAT YOU WANT TO CREATE (THEME, MOOD, GENRE)
        </label>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Write a sad acoustic shayari about rain and empty rooms..."
          className="w-full bg-black border border-neutral-800 focus:border-white text-xs p-3 text-white outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Inspiration Quick Chips */}
      <div className="space-y-1.5">
        <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-bold">
          [ 💡 QUICK INSPIRATION PROMPTS ]
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {INSPIRATION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setPrompt(chip.prompt);
                handleInstantGenerate(chip.prompt);
              }}
              className="p-2 border border-neutral-900 hover:border-white bg-black hover:bg-neutral-900 text-left text-[10px] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>{chip.label}</span>
              <ArrowRight className="w-3 h-3 text-neutral-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Log */}
      <div className="bg-black border border-neutral-900 p-2.5 text-[10px] text-neutral-400 flex items-center justify-between overflow-hidden">
        <span className="truncate pr-2 font-mono text-white">{statusLog}</span>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />}
      </div>

      {/* Master Action Button */}
      <button
        type="button"
        onClick={() => handleInstantGenerate()}
        disabled={loading || !prompt.trim()}
        className={`w-full py-3.5 text-xs font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
          loading || !prompt.trim()
            ? "border-neutral-800 bg-black text-neutral-600 cursor-not-allowed"
            : "border-white bg-white text-black hover:bg-neutral-200 shadow-xl animate-pulse"
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{loading ? ">> COMPILING 100% ORIGINAL AUDIO..." : ">> GENERATE SONG / SHAYARI TRACK"}</span>
      </button>

      {/* Generated Track Audition & Broadcast Dock */}
      {generatedTrack && (
        <div className="pt-4 border-t border-neutral-800 space-y-3 animate-fade-in">
          {/* Hidden Audio */}
          <audio
            ref={audioRef}
            src={generatedTrack.masterAudioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              "{generatedTrack.title}"
            </span>
            <span className="text-[10px] bg-white text-black font-black px-1.5 py-0.2 uppercase">
              [+] STUDIO+ READY
            </span>
          </div>

          {/* Lyrics Box */}
          <div className="bg-black border border-neutral-900 p-3 text-xs text-neutral-300 whitespace-pre-line leading-relaxed italic border-l-2 border-l-white">
            {generatedTrack.lyrics}
          </div>

          {/* Audition Player Bar */}
          <div className="bg-black border border-neutral-800 p-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-2 border border-white bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "PAUSE" : "AUDITION"}</span>
            </button>

            <div className="flex-1 flex items-center gap-1 overflow-hidden h-6 px-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 bg-white transition-all duration-150 ${
                    isPlaying ? "animate-pulse" : "opacity-30"
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (i * 19) % 100)}%` : "20%",
                  }}
                />
              ))}
            </div>

            <span className="text-[10px] text-neutral-400 tabular-nums shrink-0">
              {generatedTrack.durationSec}s WAV
            </span>
          </div>

          {/* Broadcast to Frequency */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className={`w-full py-3 text-xs font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isPublishing
                ? "border-neutral-700 bg-neutral-900 text-neutral-400 cursor-not-allowed"
                : "border-white bg-white text-black hover:bg-neutral-200"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? "TRANSMITTING TO FREQUENCY..." : ">> POST TO FREQUENCY FEED [+]"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
