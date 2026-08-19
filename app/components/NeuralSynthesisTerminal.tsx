"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Cpu, 
  Play, 
  Pause, 
  Radio, 
  Send, 
  Music, 
  Volume2, 
  RefreshCw, 
  Layers, 
  Sliders, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Shield,
  Fingerprint,
  Mic
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { BG_PRESETS, mixVocalWithBackground } from "@/lib/audioMixer";
import { uploadAudio } from "@/lib/cloudinary";
import { createPost } from "@/lib/posts";
import IdentityCalibrator from "@/app/components/IdentityCalibrator";
import { CURATED_STYLE_VAULT } from "@/lib/cloneStyles";
import InstantStudioPlus from "@/app/components/InstantStudioPlus";

export const ACOUSTIC_VOICES = [
  { id: "hi-IN-MadhurNeural", label: "HINDI // MASCULINE (GHAZAL / SHAYARI)", lang: "HI", style: "EMOTIVE" },
  { id: "hi-IN-SwaraNeural", label: "HINDI // FEMININE (EXPRESSIVE NOIR)", lang: "HI", style: "WARM" },
  { id: "ur-PK-AsadNeural", label: "URDU // CLASSICAL CADENCE (POETRY)", lang: "UR", style: "POETIC" },
  { id: "ur-PK-UzmaNeural", label: "URDU // FEMININE ELEGANCE", lang: "UR", style: "GENTLE" },
  { id: "en-US-ChristopherNeural", label: "ENGLISH // DEEP INTENSE MONOLOGUE", lang: "EN", style: "CINEMATIC" },
  { id: "en-US-JennyNeural", label: "ENGLISH // AMBIENT LO-FI WHISPER", lang: "EN", style: "WHISPER" },
  { id: "en-US-GuyNeural", label: "ENGLISH // DOCUMENTARY & DISPATCH", lang: "EN", style: "AUTHORITATIVE" },
  { id: "en-GB-RyanNeural", label: "ENGLISH // NOIR STUDIO NARRATOR", lang: "EN", style: "VINTAGE" },
];

const TEMPLATES = [
  {
    title: "SHAYARI / GHAZAL",
    voice: "hi-IN-MadhurNeural",
    styleId: "vintage_baritone",
    bg: "acoustic_noir",
    rate: -6,
    pitch: -2,
    ducking: 22,
    text: "ख़ामोशियों की अपनी एक ज़ुबान होती है,\nजो लफ़्ज़ों में ना आए वो बात बयां होती है।\nइस शहर के शोर में कभी खुद को भी सुन लेना,\nहर गूंज के पीछे एक अनकही दास्तान होती है।",
  },
  {
    title: "NOIR MONOLOGUE",
    voice: "en-US-ChristopherNeural",
    styleId: "noir_whisper",
    bg: "synthwave_ambient",
    rate: -8,
    pitch: -2,
    ducking: 20,
    text: "Midnight in the terminal. The neon flickers against rain-slicked glass. We build architectures out of pure thought, broadcasting echoes into the void, waiting for a signal to bounce back.",
  },
  {
    title: "TRADING PIT DISPATCH",
    voice: "en-US-GuyNeural",
    styleId: "trading_pit",
    bg: "lofi_chill",
    rate: 10,
    pitch: 1,
    ducking: 25,
    text: "Frequency Node 047 online. Telemetry verified. Zero cloud overhead achieved through client-side browser synthesis. The future of decentralized audio is streaming live.",
  },
];

export default function NeuralSynthesisTerminal({
  onPublishSuccess,
  embedded = false,
}: {
  onPublishSuccess?: () => void;
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Engine Mode: One-Shot vs Clone Protocol vs Pro Acoustic Presets
  const [engineMode, setEngineMode] = useState<"ONE_SHOT" | "CLONE" | "PRESETS">("ONE_SHOT");
  
  // Clone Identity Source: Personal Node vs Curated Archetypes
  const [cloneIdentitySource, setCloneIdentitySource] = useState<"PERSONAL" | "CURATED">("PERSONAL");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("vintage_baritone");
  const [calibratedIdentityBlob, setCalibratedIdentityBlob] = useState<Blob | null>(null);

  // Form State
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(ACOUSTIC_VOICES[0].id);
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0].id);
  
  // Advanced Acoustic Sliders
  const [pitch, setPitch] = useState<number>(0);     // -20Hz to +20Hz
  const [rate, setRate] = useState<number>(-5);      // -50% to +50%
  const [ducking, setDucking] = useState<number>(22); // 5% to 50%
  
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("STUDIO_PLUS");

  // Processing & Audio State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusLog, setStatusLog] = useState(">> SYSTEM READY. STUDIO+ ENGINE ACTIVE.");
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [masterBlob, setMasterBlob] = useState<Blob | null>(null);
  const [durationSec, setDurationSec] = useState(0);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (masterAudioUrl) {
        URL.revokeObjectURL(masterAudioUrl);
      }
    };
  }, [masterAudioUrl]);

  // Handle Template Insertion
  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setText(tmpl.text);
    setSelectedVoice(tmpl.voice);
    setSelectedStyleId(tmpl.styleId);
    setSelectedBg(tmpl.bg);
    setRate(tmpl.rate);
    setPitch(tmpl.pitch);
    setDucking(tmpl.ducking);
    setCaption(`// ${tmpl.title} [SYNTHESIS]`);
    setStatusLog(`>> TEMPLATE APPLIED: ${tmpl.title}`);
  };

  // ── Step 1 & 2: Synthesize Voice & Mix Locally ─────────────────────────────
  const handleGenerateAndMix = async () => {
    if (!text.trim()) {
      setStatusLog(">> [ERROR]: PLEASE ENTER SCRIPT OR TEXT TO SYNTHESIZE.");
      return;
    }

    if (engineMode === "CLONE" && cloneIdentitySource === "PERSONAL" && !calibratedIdentityBlob) {
      setStatusLog(">> [CALIBRATION REQUIRED]: INITIATE 10s MIC CHECK ABOVE OR SELECT CURATED STYLE.");
      return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setIsProcessing(true);
    setStatusLog(
      engineMode === "CLONE"
        ? ">> [1/2] TRANSMITTING TO ZERO-SHOT VOICE CLONING ENGINE..."
        : ">> [1/2] TRANSMITTING TO EDGE-TTS NEURAL ENGINE ($0 COMPUTE)..."
    );

    try {
      let ttsResponse: Response;

      if (engineMode === "CLONE") {
        // Route to Clone Endpoint
        const formData = new FormData();
        formData.append("text", text.trim());
        formData.append("styleId", cloneIdentitySource === "CURATED" ? selectedStyleId : "custom_personal");
        formData.append("rate", `${rate >= 0 ? "+" : ""}${rate}%`);
        formData.append("pitch", `${pitch >= 0 ? "+" : ""}${pitch}Hz`);
        
        if (calibratedIdentityBlob && cloneIdentitySource === "PERSONAL") {
          formData.append("referenceAudio", calibratedIdentityBlob, "acoustic_signature.webm");
        }

        ttsResponse = await fetch("/api/synthesize/clone", {
          method: "POST",
          body: formData,
        });
      } else {
        // Route to Standard Preset Synthesis Endpoint
        ttsResponse = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            voice: selectedVoice,
            rate: `${rate >= 0 ? "+" : ""}${rate}%`,
            pitch: `${pitch >= 0 ? "+" : ""}${pitch}Hz`,
          }),
        });
      }

      if (!ttsResponse.ok) {
        const errJson = await ttsResponse.json().catch(() => ({}));
        throw new Error(errJson.error || "Neural speech synthesis failed");
      }

      const vocalBlob = await ttsResponse.blob();
      const vocalUrl = URL.createObjectURL(vocalBlob);

      // 2. Client-Side Browser Audio Mixing with OfflineAudioContext
      setStatusLog(">> [2/2] BROWSER MULTI-TRACK MIXING & DUCKING ($0 CLOUD COMPUTE)...");
      const targetBg = BG_PRESETS.find((bg) => bg.id === selectedBg);
      const bgUrl = targetBg && targetBg.id !== "none" ? targetBg.url : "";

      const duckingRatio = ducking / 100;
      const mixedWavBlob = await mixVocalWithBackground(vocalUrl, bgUrl, duckingRatio);
      URL.revokeObjectURL(vocalUrl); // Clean up temp vocal blob

      // 3. HARD QUOTA CHECK: 180 Seconds Max
      const estimatedSecs = mixedWavBlob.size / 176400;
      if (estimatedSecs > 180) {
        throw new Error(`[ QUOTA EXCEEDED ] Audio duration (${Math.round(estimatedSecs)}s) exceeds 180-second limit.`);
      }

      const mixedUrl = URL.createObjectURL(mixedWavBlob);

      // Calculate exact duration
      const tempAudio = new Audio(mixedUrl);
      tempAudio.onloadedmetadata = () => {
        const secs = Math.round(tempAudio.duration) || Math.max(1, Math.round(estimatedSecs));
        setDurationSec(secs);
      };

      if (!caption.trim()) {
        const firstLine = text.trim().split("\n")[0].slice(0, 60);
        setCaption(firstLine);
      }

      setMasterBlob(mixedWavBlob);
      setMasterAudioUrl(mixedUrl);
      setStatusLog(`>> MASTER COMPILED (${(mixedWavBlob.size / 1024).toFixed(1)} KB). READY FOR AUDITION.`);
    } catch (err: any) {
      console.error("[Synthesis Error]:", err);
      setStatusLog(`>> [ERROR]: ${err?.message || "Synthesis pipeline failed"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Toggle Audition Playback ──────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !masterAudioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("Play blocked:", e);
          setIsPlaying(false);
        });
    }
  };

  // ── Step 3: Publish Master Audio to Frequency Feed with isNeural / isCloned ──
  const handlePublish = async () => {
    if (!masterBlob) {
      setStatusLog(">> [ERROR]: COMPILE A MASTER TRACK FIRST.");
      return;
    }

    if (!user) {
      setStatusLog(">> [AUTH REQUIRED]: LOG IN TO BROADCAST TO THE FREQUENCY.");
      router.push("/login");
      return;
    }

    setIsPublishing(true);
    setStatusLog(">> [UPLOADING]: TRANSMITTING MASTER TRACK TO FREQUENCY ARCHIVE...");

    try {
      const finalCaption = caption.trim() || text.trim().slice(0, 80);
      const filename = `studio-plus-${user.uid}-${Date.now()}`;
      
      // Upload master WAV to Cloudinary audio pipeline
      const uploadResult = await uploadAudio(masterBlob, filename);

      setStatusLog(">> [SAVING]: REGISTERING ECHO TO FREQUENCY TIMELINE...");

      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const formattedDuration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      await createPost({
        audioUrl: uploadResult.secureUrl,
        caption: finalCaption,
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        duration: formattedDuration,
        durationSec: Math.max(1, durationSec),
        category: category || "STUDIO_PLUS",
        tags: ["STUDIOPLUS", "SYNTHESIS", engineMode === "CLONE" ? "VOICE_CLONE" : "AI_VOICE"],
        isNeural: true,
        isCloned: engineMode === "CLONE",
      });

      setStatusLog(">> [SUCCESS]: TRANSMISSION PUBLISHED TO FREQUENCY!");
      
      if (onPublishSuccess) {
        onPublishSuccess();
      } else {
        setTimeout(() => {
          router.push("/");
        }, 800);
      }
    } catch (err: any) {
      console.error("[Publish Error]:", err);
      setStatusLog(`>> [PUBLISH FAILED]: ${err?.message || "Upload failed. Try again."}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={`bg-black border border-white p-4 sm:p-6 font-mono text-white select-none ${embedded ? "w-full" : "max-w-3xl mx-auto shadow-2xl my-4"}`}>
      {/* ── Terminal Telemetry Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-5 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span className="font-bold tracking-widest uppercase">// STUDIO+ · AI ACOUSTIC ENGINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5 uppercase tracking-widest">
            $0 ZERO-COST COMPUTE
          </span>
          <span className="text-[10px] border border-neutral-700 text-neutral-400 px-1.5 py-0.5 uppercase tracking-widest hidden sm:inline-block">
            180S MAX QUOTA
          </span>
        </div>
      </div>

      {/* ── Engine Mode Switcher Tabs (3 Modes) ── */}
      <div className="grid grid-cols-3 gap-1.5 mb-5">
        <button
          type="button"
          onClick={() => setEngineMode("ONE_SHOT")}
          className={`py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            engineMode === "ONE_SHOT"
              ? "border-white bg-white text-black shadow-lg"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>[ ⚡ ONE-SHOT ]</span>
        </button>

        <button
          type="button"
          onClick={() => setEngineMode("CLONE")}
          className={`py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            engineMode === "CLONE"
              ? "border-white bg-white text-black shadow-lg"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-white"
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>[ 🧬 CLONE ]</span>
        </button>

        <button
          type="button"
          onClick={() => setEngineMode("PRESETS")}
          className={`py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            engineMode === "PRESETS"
              ? "border-white bg-white text-black shadow-lg"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>[ 🎛️ PRO BOARD ]</span>
        </button>
      </div>

      {/* ── Mode 1: One-Shot AI Music & Shayari Generator ── */}
      {engineMode === "ONE_SHOT" && (
        <InstantStudioPlus onPublishSuccess={onPublishSuccess} />
      )}

      {/* ── Clone Protocol Settings ── */}
      {engineMode === "CLONE" && (
        <div className="border border-neutral-800 bg-neutral-950 p-4 mb-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-white" />
              // ACOUSTIC IDENTITY SOURCE
            </span>
            <span className="text-[10px] text-neutral-500 uppercase">ZERO-SHOT EXTRACTION</span>
          </div>

          {/* Sub-Tabs: Personal Node vs Curated Vault */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCloneIdentitySource("PERSONAL")}
              className={`py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                cloneIdentitySource === "PERSONAL"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>[ PERSONAL 10s MIC CHECK ]</span>
            </button>

            <button
              type="button"
              onClick={() => setCloneIdentitySource("CURATED")}
              className={`py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                cloneIdentitySource === "CURATED"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>[ CURATED STYLISTIC VAULT ]</span>
            </button>
          </div>

          {/* Personal Node: 10-Second Mic Check Calibrator */}
          {cloneIdentitySource === "PERSONAL" ? (
            <IdentityCalibrator
              onIdentityCaptured={(blob) => {
                setCalibratedIdentityBlob(blob);
                setStatusLog(">> ACOUSTIC SIGNATURE REGISTERED. READY FOR CLONE SYNTHESIS.");
              }}
              onReset={() => {
                setCalibratedIdentityBlob(null);
                setStatusLog(">> MIC STANDBY. CLICK TO CALIBRATE.");
              }}
            />
          ) : (
            /* Curated Archetypes Vault */
            <div className="space-y-2">
              <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1">
                SELECT STYLISTIC ARCHETYPE (LEGAL ALIASES)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(CURATED_STYLE_VAULT).map(([id, style]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedStyleId(id);
                      setRate(Number(style.defaultRate.replace("%", "")));
                      setPitch(Number(style.defaultPitch.replace("Hz", "")));
                      setStatusLog(`>> SELECTED STYLISTIC PROFILE: ${style.name}`);
                    }}
                    className={`p-3 text-left border transition-all cursor-pointer ${
                      selectedStyleId === id
                        ? "border-white bg-white text-black font-bold shadow-md"
                        : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase">{style.name}</p>
                    <p className={`text-[10px] mt-1 ${selectedStyleId === id ? "text-neutral-700" : "text-neutral-500"}`}>
                      {style.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mode 2 & 3: Manual Clone & Pro Acoustic Board Controls ── */}
      {engineMode !== "ONE_SHOT" && (
        <>
          {/* ── Quick Templates ── */}
          <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-white" />
            // PRESET ARCHETYPES (1-CLICK TEMPLATES)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.title}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="border border-neutral-800 hover:border-white p-2.5 text-left bg-neutral-950 hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <p className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                <span>{tmpl.title}</span>
                <Flame className="w-3 h-3 text-neutral-400" />
              </p>
              <p className="text-[9px] text-neutral-500 truncate mt-0.5">{tmpl.text.replace(/\n/g, " ")}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Acoustic Voice (Standard Mode) & Ambient Backing Selectors ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Voice Selector (Shown in Standard Mode) */}
        {engineMode === "PRESETS" ? (
          <div>
            <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-white" />
              1. ACOUSTIC VOICE PROFILE
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-white text-xs p-2.5 text-white outline-none cursor-pointer uppercase"
            >
              {ACOUSTIC_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Fingerprint className="w-3 h-3 text-white" />
              1. CLONED VOICE IDENTITY
            </label>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 text-xs text-white font-bold uppercase truncate">
              {cloneIdentitySource === "PERSONAL"
                ? (calibratedIdentityBlob ? "✅ PERSONAL NODE (CALIBRATED)" : "⚠️ AWAITING 10s MIC CHECK")
                : (CURATED_STYLE_VAULT[selectedStyleId]?.name || "CUSTOM")}
            </div>
          </div>
        )}

        {/* Ambient Backing Stem */}
        <div>
          <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-white" />
            2. AMBIENT BACKING STEM
          </label>
          <select
            value={selectedBg}
            onChange={(e) => setSelectedBg(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-white text-xs p-2.5 text-white outline-none cursor-pointer uppercase"
          >
            {BG_PRESETS.map((bg) => (
              <option key={bg.id} value={bg.id}>
                {bg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Advanced Acoustic Control Board (Sliders) ── */}
      <div className="border border-neutral-800 bg-neutral-950 p-4 mb-5 space-y-3.5">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-widest border-b border-neutral-900 pb-2">
          <span className="flex items-center gap-1.5 text-white font-bold">
            <Sliders className="w-3.5 h-3.5 text-white" />
            // ADVANCED ACOUSTIC CONTROLS
          </span>
          <span className="text-[9px] text-neutral-500">GRANULAR TUNING</span>
        </div>

        {/* Pitch Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>PITCH ADJUSTMENT</span>
            <span className="font-bold text-white">{pitch >= 0 ? "+" : ""}{pitch}Hz</span>
          </div>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
        </div>

        {/* Tempo / Cadence Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>TEMPO (CADENCE / SPEED)</span>
            <span className="font-bold text-white">{rate >= 0 ? "+" : ""}{rate}%</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
        </div>

        {/* Background Ducking Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>BACKGROUND DUCKING (INSTRUMENTAL VOLUME)</span>
            <span className="font-bold text-white">{ducking}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={ducking}
            onChange={(e) => setDucking(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
        </div>
      </div>

      {/* ── Script Input Area ── */}
      <div className="mb-4">
        <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-white" />
            3. TRANSMISSION SCRIPT / SHAYARI / MONOLOGUE
          </span>
          <span className={text.length > 550 ? "text-red-400 font-bold" : "text-neutral-500"}>
            {text.length}/600 CHARS
          </span>
        </label>
        <textarea
          rows={5}
          value={text}
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste couplets, poetry, philosophical thesis, or monologue notes..."
          className="w-full bg-neutral-950 border border-neutral-800 focus:border-white text-xs p-3 text-white outline-none resize-none leading-relaxed"
        />
      </div>

      {/* ── Status Telemetry Log ── */}
      <div className="mb-4 bg-neutral-950 border border-neutral-900 p-2.5 text-[10px] text-neutral-400 flex items-center justify-between overflow-hidden">
        <span className="truncate pr-2 font-mono text-white">{statusLog}</span>
        {isProcessing && <RefreshCw className="w-3.5 h-3.5 text-white animate-spin shrink-0" />}
      </div>

      {/* ── Synthesize & Master Trigger Button ── */}
      <button
        type="button"
        onClick={handleGenerateAndMix}
        disabled={isProcessing || !text.trim()}
        className={`w-full py-3 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
          isProcessing || !text.trim()
            ? "border-neutral-800 bg-neutral-950 text-neutral-600 cursor-not-allowed"
            : "border-white bg-white text-black hover:bg-neutral-200 shadow-lg animate-pulse"
        }`}
      >
        <Cpu className="w-4 h-4" />
        <span>
          {isProcessing
            ? "[ 1/2 COMPILING MASTER CLONED AUDIO... ]"
            : engineMode === "CLONE"
            ? "[ 🧬 EXECUTE ZERO-SHOT CLONE & MASTER ($0) ]"
            : "[ SYNTHESIZE & MASTER TRACK ($0) ]"}
        </span>
      </button>

      {/* ── Audition Player & Broadcast Dock ── */}
      {masterAudioUrl && (
        <div className="mt-6 pt-5 border-t border-neutral-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-white" />
              // MASTER CLONED TRACK AUDITION READY
            </span>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              {durationSec}s • 16-BIT PCM WAV
            </span>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            src={masterAudioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* Audition Player Visualizer Bar */}
          <div className="border border-neutral-800 bg-neutral-950 p-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-2 border border-white bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "PAUSE" : "AUDITION"}</span>
            </button>

            <div className="flex-1 flex items-center gap-1 overflow-hidden h-6 px-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 bg-white transition-all duration-150 ${
                    isPlaying ? "animate-pulse" : "opacity-30"
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (i * 17) % 100)}%` : "20%",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Post Caption Field */}
          <div>
            <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
              4. POST CAPTION / TITLE FOR FEED
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Give your neural transmission a caption..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-white text-xs p-2.5 text-white outline-none uppercase"
            />
          </div>

          {/* Publish Action */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className={`w-full py-3 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isPublishing
                ? "border-neutral-700 bg-neutral-900 text-neutral-400 cursor-not-allowed"
                : "border-white bg-white text-black hover:bg-neutral-200 font-extrabold"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? "[ TRANSMITTING TO FREQUENCY... ]" : "[ >> PUBLISH TO FREQUENCY FEED ]"}</span>
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
