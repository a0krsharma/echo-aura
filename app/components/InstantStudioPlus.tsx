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
  ArrowRight,
  Download,
  Sliders,
  Layers,
  Heart,
  VolumeX
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { mixVocalWithBackground } from "@/lib/audioMixer";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";
import type { SongSection } from "@/app/api/instant-generate/route";

const QUICK_GENRE_PROMPTS = [
  { label: "🌧️ Sad Acoustic Hindi Song", prompt: "Make a deeply emotional, sad acoustic song about lonely rainy nights and lost love", voice: "hi-IN-MadhurNeural" },
  { label: "🥀 Classical Urdu Ghazal", prompt: "Write a classical, soulful Urdu ghazal with rich poetic couplets and vintage harmonium cadence", voice: "ur-PK-AsadNeural" },
  { label: "☕ Midnight Lo-Fi Indie", prompt: "A dreamy, nostalgic late-night lo-fi pop song about quiet city streets and warm coffee", voice: "en-US-JennyNeural" },
  { label: "💔 Heartbreak Soul Ballad", prompt: "A powerful acoustic soul ballad about learning to let go and moving on", voice: "en-US-ChristopherNeural" },
  { label: "🚀 Cyberpunk / Trading Rap", prompt: "High-energy cyberpunk market debrief with punchy rhythm and rapid telemetry flow", voice: "en-US-GuyNeural" },
];

const VOCAL_PROFILES = [
  { id: "hi-IN-MadhurNeural", name: "Deep Ghazal Male", desc: "Soulful, emotive baritone for poetry & ballads", tag: "GHAZAL / SOUL" },
  { id: "en-US-JennyNeural", name: "Melodic Pop Female", desc: "Silky, warm indie tone for modern lo-fi & pop", tag: "INDIE / POP" },
  { id: "ur-PK-AsadNeural", name: "Classical Urdu Poet", desc: "Traditional mehfil cadence with classical rhythm", tag: "CLASSICAL URDU" },
  { id: "en-US-ChristopherNeural", name: "Deep Cinematic Voice", desc: "Rich, resonant narrator for dark noir & storytelling", tag: "CINEMATIC NOIR" },
];

export default function InstantStudioPlus({
  onPublishSuccess,
}: {
  onPublishSuccess?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Inputs
  const [prompt, setPrompt] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOCAL_PROFILES[0].id);
  const [songLength, setSongLength] = useState<"full" | "quick">("full");

  // Lifecycle
  const [loading, setLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusLog, setStatusLog] = useState(">> READY. TYPE A PROMPT OR PICK A GENRE TO CREATE A FULL SONG.");
  
  // Results
  const [generatedSong, setGeneratedSong] = useState<{
    title: string;
    genre: string;
    sections: SongSection[];
    fullLyrics: string;
    vocalVoice: string;
    masterAudioUrl: string;
    masterBlob: Blob;
    durationSec: number;
  } | null>(null);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (generatedSong?.masterAudioUrl) {
        URL.revokeObjectURL(generatedSong.masterAudioUrl);
      }
    };
  }, [generatedSong]);

  // ── Generation Trigger ─────────────────────────────────────────────────────
  const handleGenerate = async (customPrompt?: string, customVoice?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    const targetVoice = customVoice || selectedVoice;

    if (!targetPrompt || loading) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setLoading(true);
    setGeneratedSong(null);
    setCurrentTime(0);
    setStatusLog(">> [1/3] COMPOSING MULTI-STANZA LYRICS & MATCHING ACOUSTICS...");

    try {
      const res = await fetch("/api/instant-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: targetPrompt,
          length: songLength,
          voiceId: targetVoice,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Song generation failed");
      }

      const data = await res.json();
      setStatusLog(">> [2/3] SYNTHESIZING VOCAL STEM & MASTERING INSTRUMENTAL BEAT...");

      // Mix vocal with background loop in browser via Web Audio API ($0 compute)
      const mixedWavBlob = await mixVocalWithBackground(
        data.audioBase64,
        data.bgTrackUrl,
        data.defaultDucking || 0.22
      );

      const mixedUrl = URL.createObjectURL(mixedWavBlob);
      const estimatedSecs = Math.max(1, Math.round(mixedWavBlob.size / 176400));

      setGeneratedSong({
        title: data.title,
        genre: data.genre || "Acoustic AI",
        sections: data.sections || [],
        fullLyrics: data.fullLyrics || "",
        vocalVoice: data.vocalVoice || targetVoice,
        masterAudioUrl: mixedUrl,
        masterBlob: mixedWavBlob,
        durationSec: estimatedSecs,
      });

      setDuration(estimatedSecs);
      setStatusLog(`>> [3/3] FULL TRACK COMPILED: "${data.title}" (${estimatedSecs}s) • READY FOR AUDITION.`);
    } catch (err: any) {
      console.error("[Studio+ Error]:", err);
      setStatusLog(`>> [ERROR]: ${err?.message || "Failed to generate track"}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Play / Pause & Scrubbing ───────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !generatedSong) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleDownload = () => {
    if (!generatedSong) return;
    const a = document.createElement("a");
    a.href = generatedSong.masterAudioUrl;
    a.download = `${generatedSong.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── 1-Click Publish to Echo Frequency Feed ─────────────────────────────────
  const handlePublish = async () => {
    if (!generatedSong) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setIsPublishing(true);
    setStatusLog(">> TRANSMITTING MASTER TRACK TO FREQUENCY FEED...");

    try {
      const filename = `studio-plus-${user.uid}-${Date.now()}`;
      const uploadResult = await uploadAudio(generatedSong.masterBlob, filename);

      const minutes = Math.floor(generatedSong.durationSec / 60);
      const seconds = generatedSong.durationSec % 60;
      const formattedDuration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      await createPost({
        audioUrl: uploadResult.secureUrl,
        caption: `// ${generatedSong.title} — "${generatedSong.fullLyrics.split("\n")[1] || generatedSong.genre}"`,
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        duration: formattedDuration,
        durationSec: generatedSong.durationSec,
        category: "STUDIO_PLUS",
        tags: ["STUDIOPLUS", "AI_SONG", generatedSong.genre.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()],
        isNeural: true,
        audioTrackId: `studioplus_${Date.now()}`,
        audioTrackTitle: generatedSong.title,
        audioTrackArtist: user.handle || "@ANON",
      });

      setStatusLog(">> [SUCCESS]: MASTER BROADCAST PUBLISHED TO FREQUENCY!");

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
    <div className="bg-neutral-950 border border-white p-4 sm:p-7 font-mono text-white space-y-6 shadow-2xl">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span className="font-bold tracking-widest uppercase">// STUDIO+ · FULL AI SONG GENERATOR</span>
        </div>
        <span className="text-[10px] bg-white text-black font-extrabold px-2 py-0.5 uppercase tracking-widest">
          ZERO FRICTION • 100% ORIGINAL
        </span>
      </div>

      {/* ── STEP 1: Prompt Input Box ── */}
      <div className="space-y-2">
        <label className="block text-[11px] text-neutral-300 font-bold uppercase tracking-widest">
          1. WHAT DO YOU WANT TO CREATE? (TOPIC, MOOD, THEME)
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make a sad acoustic Hindi song about feeling lonely on rainy nights..."
          className="w-full bg-black border border-neutral-800 focus:border-white text-xs sm:text-sm p-3.5 text-white outline-none resize-none leading-relaxed transition-colors placeholder-neutral-600"
        />
      </div>

      {/* ── 1-Tap Genre Inspiration Chips ── */}
      <div className="space-y-1.5">
        <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-bold">
          [ 💡 1-TAP GENRE INSPIRATION ]
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {QUICK_GENRE_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setPrompt(item.prompt);
                setSelectedVoice(item.voice);
                handleGenerate(item.prompt, item.voice);
              }}
              className="p-2.5 border border-neutral-900 hover:border-white bg-black hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
            >
              <span className="font-bold truncate">{item.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* ── STEP 2: Vocal Style & Track Duration Pickers ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
        {/* Vocal Profile Cards */}
        <div className="space-y-2">
          <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            2. SELECT VOCAL ARTIST TONE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VOCAL_PROFILES.map((vp) => (
              <button
                key={vp.id}
                type="button"
                onClick={() => setSelectedVoice(vp.id)}
                className={`p-2.5 text-left border transition-all cursor-pointer ${
                  selectedVoice === vp.id
                    ? "border-white bg-white text-black font-bold shadow-md"
                    : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold">{vp.name}</span>
                </div>
                <p className={`text-[9px] mt-0.5 line-clamp-1 ${selectedVoice === vp.id ? "text-neutral-700" : "text-neutral-500"}`}>
                  {vp.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Track Duration Selection */}
        <div className="space-y-2">
          <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
            3. TRACK STRUCTURE & LENGTH
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSongLength("full")}
              className={`p-3 text-center border transition-all cursor-pointer ${
                songLength === "full"
                  ? "border-white bg-white text-black font-bold shadow-md"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              <span className="text-xs block font-bold uppercase">🎶 FULL SONG</span>
              <span className={`text-[9px] block mt-0.5 ${songLength === "full" ? "text-neutral-700 font-semibold" : "text-neutral-500"}`}>
                60–90s • Multi-Verse & Chorus
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSongLength("quick")}
              className={`p-3 text-center border transition-all cursor-pointer ${
                songLength === "quick"
                  ? "border-white bg-white text-black font-bold shadow-md"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              <span className="text-xs block font-bold uppercase">⚡ QUICK VERSE</span>
              <span className={`text-[9px] block mt-0.5 ${songLength === "quick" ? "text-neutral-700 font-semibold" : "text-neutral-500"}`}>
                25–30s • Single Hook Take
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Status Bar */}
      <div className="bg-black border border-neutral-900 p-2.5 text-[10px] text-neutral-400 flex items-center justify-between overflow-hidden">
        <span className="truncate pr-2 font-mono text-white">{statusLog}</span>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />}
      </div>

      {/* ── Master Action Button ── */}
      <button
        type="button"
        onClick={() => handleGenerate()}
        disabled={loading || !prompt.trim()}
        className={`w-full py-4 text-xs font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
          loading || !prompt.trim()
            ? "border-neutral-800 bg-black text-neutral-600 cursor-not-allowed"
            : "border-white bg-white text-black hover:bg-neutral-200 shadow-xl animate-pulse"
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{loading ? ">> COMPILING FULL MASTER SONG..." : ">> GENERATE FULL SONG & MASTER TRACK"}</span>
      </button>

      {/* ── Generated Master Song Audition & Live Karaoke Stage ── */}
      {generatedSong && (
        <div className="pt-6 border-t border-white space-y-4 animate-fade-in">
          {/* Hidden Master Audio */}
          <audio
            ref={audioRef}
            src={generatedSong.masterAudioUrl}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration || generatedSong.durationSec);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            className="hidden"
          />

          {/* Song Title & Meta Banner */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2 bg-neutral-900 p-3 border border-neutral-800">
            <div>
              <span className="font-bold text-white uppercase tracking-wider block text-sm">
                "{generatedSong.title}"
              </span>
              <span className="text-[10px] text-neutral-400 uppercase">
                GENRE: {generatedSong.genre} • {Math.round(duration || generatedSong.durationSec)}s MASTER
              </span>
            </div>
            <span className="text-[10px] bg-white text-black font-extrabold px-2 py-0.5 uppercase tracking-wider">
              [+] STUDIO+ MASTER READY
            </span>
          </div>

          {/* Live Karaoke / Synchronized Structured Lyrics Display */}
          <div className="bg-black border border-neutral-800 p-4 max-h-56 overflow-y-auto space-y-3 scrollbar-thin">
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-bold border-b border-neutral-900 pb-1">
              // STRUCTURED LYRICS & COMPOSITION
            </span>
            {generatedSong.sections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[9px] font-bold text-neutral-400 bg-neutral-900 px-1.5 py-0.2 uppercase inline-block">
                  [{section.type}]
                </span>
                <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-l-white italic font-serif">
                  {section.lines.join("\n")}
                </p>
              </div>
            ))}
          </div>

          {/* Master Audition Player Controls Bar */}
          <div className="bg-neutral-900 border border-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={togglePlay}
                className="px-5 py-2.5 border border-white bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                <span>{isPlaying ? "PAUSE" : "AUDITION FULL SONG"}</span>
              </button>

              {/* Time Indicators */}
              <div className="font-mono text-xs text-white font-bold tabular-nums">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, "0")} / {Math.floor((duration || generatedSong.durationSec) / 60)}:{(Math.floor((duration || generatedSong.durationSec) % 60)).toString().padStart(2, "0")}
              </div>

              {/* Download Master Audio */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download Master WAV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD WAV</span>
              </button>
            </div>

            {/* Interactive Timeline Scrub Bar */}
            <div className="flex items-center gap-2 w-full pt-1">
              <input
                type="range"
                min={0}
                max={duration || generatedSong.durationSec || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-neutral-800 accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* 1-Click Broadcast to Echo Frequency Feed */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className={`w-full py-4 text-xs font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isPublishing
                ? "border-neutral-700 bg-neutral-900 text-neutral-400 cursor-not-allowed"
                : "border-white bg-white text-black hover:bg-neutral-200 shadow-2xl"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? "TRANSMITTING TO FREQUENCY..." : ">> POST FULL SONG TO FREQUENCY FEED [+]"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
