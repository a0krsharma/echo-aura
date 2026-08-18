"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileAudio,
  Radio,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  checkFrequencyPlusClearance,
  checkDailyQuota,
  createEpisode,
  CLEARANCE_GOALS,
  type UserMetrics,
} from "@/lib/frequencyPlus";
import { uploadAudio } from "@/lib/cloudinary";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export default function FrequencyPlusCreatePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<UserMetrics>({
    orbiters_count: 0,
    pulses_received: 0,
    total_shares: 0,
    rooms_and_stages_hosted: 0,
    own_room_shares: 0,
    is_verified_creator: false,
  });

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TECH");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [remainingQuota, setRemainingQuota] = useState(900);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const CATEGORIES = ["TECH", "MARKETS", "STORYTELLING", "DEBATES", "CRICKET", "GENERAL"];

  // Fetch User Telemetry Metrics
  useEffect(() => {
    if (!user) return;
    const fetchUserMetrics = async () => {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const userM: UserMetrics = {
            orbiters_count: data.followerCount || data.metrics?.orbiters_count || 0,
            pulses_received: data.metrics?.pulses_received || 0,
            total_shares: data.metrics?.total_shares || 0,
            rooms_and_stages_hosted: data.metrics?.rooms_and_stages_hosted || 0,
            own_room_shares: data.metrics?.own_room_shares || 0,
            is_verified_creator: Boolean(data.is_verified_creator || data.is_verified_podcaster || data.isVerified),
          };
          setMetrics(userM);
        }

        // Check daily quota
        const quota = await checkDailyQuota(user.uid, 0);
        setRemainingQuota(quota.remainingSeconds);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchUserMetrics();
  }, [user]);

  const clearance = checkFrequencyPlusClearance(metrics);

  // Audio File Selection & Duration Verification
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify audio type
    if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3") && !file.name.endsWith(".m4a") && !file.name.endsWith(".wav") && !file.name.endsWith(".webm")) {
      setErrorMsg("[ INVALID FILE TYPE ] Please upload a standard audio file (.mp3, .m4a, .wav, .webm).");
      return;
    }

    setAudioFile(file);

    // Calculate duration in browser
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration);
      setAudioDuration(dur);
      if (dur > 900) {
        setErrorMsg(`[ DURATION EXCEEDED ] File duration is ${Math.floor(dur / 60)}m ${dur % 60}s. Maximum allowed is 15m 00s (900s).`);
      } else if (dur > remainingQuota) {
        setErrorMsg(`[ QUOTA EXCEEDED ] File requires ${dur}s, but you have ${remainingQuota}s remaining in your 24h window.`);
      }
    };
  };

  // Submit & Upload Transmission
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !audioFile || !audioDuration) return;
    if (audioDuration > 900) {
      setErrorMsg("[ ERROR ] File exceeds 15-minute cap. Condense to 15m 00s maximum.");
      return;
    }

    setUploading(true);
    setErrorMsg("");

    try {
      // 1. Quota check
      const quota = await checkDailyQuota(user.uid, audioDuration);
      if (!quota.allowed) {
        setErrorMsg(quota.message || "[ DAILY QUOTA EXCEEDED ]");
        setUploading(false);
        return;
      }

      // 2. Upload to Cloudinary (video/upload endpoint for audio)
      const uploadResult = await uploadAudio(audioFile, `freq_${user.uid}_${Date.now()}`);

      // 3. Save to Firestore
      const newId = await createEpisode({
        creatorUid: user.uid,
        creatorHandle: user.handle || "@CREATOR",
        title: title.trim(),
        description: description.trim(),
        audioUrl: uploadResult.secureUrl,
        durationSeconds: audioDuration,
        sizeBytes: uploadResult.bytes || audioFile.size,
        category,
      });

      router.push(`/frequency-plus/${newId}`);
    } catch (err: any) {
      console.error("Publishing error:", err);
      setErrorMsg(err?.message || "Failed to broadcast transmission. Check connection.");
      setUploading(false);
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  if (loadingMetrics) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-500 mb-2" />
        <span>[ VERIFYING TELEMETRY CLEARANCE... ]</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-8 pb-4 border-b border-neutral-900 max-w-3xl mx-auto">
        <Link
          href="/frequency-plus"
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          <span>FREQUENCY+</span>
        </Link>
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
          // CREATOR STUDIO
        </span>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── CASE 1: ACCESS RESTRICTED // CLEARANCE CHECKLIST ── */}
        {!clearance.isEligible ? (
          <div className="border border-neutral-800 bg-neutral-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-900 pb-4">
              <div>
                <p className="text-[10px] text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                  <ShieldAlert size={14} />
                  [ ACCESS RESTRICTED: TIER 0 NODE ]
                </p>
                <h1 className="text-lg font-bold text-white uppercase mt-1">
                  FREQUENCY+ // UPLOAD CLEARANCE REQUIRED
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  15-minute transmissions are restricted to established network contributors. Complete your Proof-of-Work telemetry to unlock the Studio.
                </p>
              </div>
              <span className="text-xs text-white border border-neutral-800 px-3 py-1 bg-black font-bold">
                {clearance.progressPercent}% UNLOCKED
              </span>
            </div>

            {/* Telemetry Checklist */}
            <div className="space-y-4 text-xs">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">// TELEMETRY CHECKLIST</p>

              {/* 1. Orbit Command (50 Followers) */}
              <div className="border border-neutral-900 bg-black p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-300">[ ORBIT COMMAND ]: 50 ORBITERS</span>
                  <span className={clearance.goals.orbiters.met ? "text-white font-bold" : "text-neutral-500"}>
                    {clearance.goals.orbiters.current} / 50 {clearance.goals.orbiters.met && "[ CLEARED ]"}
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.min(100, (clearance.goals.orbiters.current / 50) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 2. Resonance (200 Pulses) */}
              <div className="border border-neutral-900 bg-black p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-300">[ RESONANCE ]: 200 PULSES RECEIVED</span>
                  <span className={clearance.goals.pulses.met ? "text-white font-bold" : "text-neutral-500"}>
                    {clearance.goals.pulses.current} / 200 {clearance.goals.pulses.met && "[ CLEARED ]"}
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.min(100, (clearance.goals.pulses.current / 200) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 3. Signal Booster (100 Shares) */}
              <div className="border border-neutral-900 bg-black p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-300">[ SIGNAL BOOSTER ]: 100 EXTERNAL SHARES</span>
                  <span className={clearance.goals.shares.met ? "text-white font-bold" : "text-neutral-500"}>
                    {clearance.goals.shares.current} / 100 {clearance.goals.shares.met && "[ CLEARED ]"}
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.min(100, (clearance.goals.shares.current / 100) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold pt-2">// HOSTING PROTOCOL</p>

              {/* 4. Hosting Protocol (20 Rooms) */}
              <div className="border border-neutral-900 bg-black p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-300">[ LIVE HOST ]: 20 ROOMS / STAGES HOSTED</span>
                  <span className={clearance.goals.hosted.met ? "text-white font-bold" : "text-neutral-500"}>
                    {clearance.goals.hosted.current} / 20 {clearance.goals.hosted.met && "[ CLEARED ]"}
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.min(100, (clearance.goals.hosted.current / 20) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 5. Own-Room Shares (20 Shares) */}
              <div className="border border-neutral-900 bg-black p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-300">[ PROMOTER ]: 20 OWN-ROOM SHARES</span>
                  <span className={clearance.goals.ownShares.met ? "text-white font-bold" : "text-neutral-500"}>
                    {clearance.goals.ownShares.current} / 20 {clearance.goals.ownShares.met && "[ CLEARED ]"}
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 border border-neutral-900 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.min(100, (clearance.goals.ownShares.current / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/rooms")}
              className="w-full py-3 bg-neutral-900 hover:bg-white hover:text-black border border-neutral-800 text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              [ CONTINUE BROADCASTING ON ECHO TO RANK UP ➔ ]
            </button>
          </div>
        ) : (
          /* ── CASE 2: ACCESS GRANTED // 15-MINUTE CREATOR STUDIO ── */
          <form onSubmit={handlePublish} className="border border-white bg-neutral-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-900 pb-4">
              <div>
                <p className="text-[10px] text-white uppercase tracking-widest flex items-center gap-1.5 font-bold">
                  <ShieldCheck size={14} className="text-white" />
                  [ CLEARANCE LEVEL: FREQUENCY+ CREATOR ]
                </p>
                <h1 className="text-lg font-bold text-white uppercase mt-1">
                  PUBLISH 15-MINUTE TRANSMISSION
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase block">DAILY BANDWIDTH</span>
                <span className="text-xs font-bold text-white font-mono">
                  {formatSecs(remainingQuota)} / 15m 00s
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 border border-red-800 bg-red-950/40 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Audio Dropzone */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-neutral-400 tracking-widest font-bold block">
                AUDIO MASTER FILE (.MP3 / .M4A / .WAV // MAX 15 MINS)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.webm"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  audioFile ? "border-white bg-neutral-900" : "border-neutral-800 hover:border-neutral-600 bg-black"
                }`}
              >
                {audioFile ? (
                  <div className="space-y-2">
                    <FileAudio className="w-8 h-8 text-white mx-auto animate-bounce" />
                    <p className="text-xs font-bold text-white uppercase">{audioFile.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      DURATION: {audioDuration !== null ? formatSecs(audioDuration) : "CALCULATING..."} • SIZE: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <span className="text-[9px] text-neutral-500 uppercase">[ CLICK TO CHANGE FILE ]</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs font-bold text-white uppercase">CLICK TO SELECT AUDIO FILE</p>
                    <p className="text-[10px] text-neutral-500">Universal Cloudinary audio CDN encoding</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transmission Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 tracking-widest font-bold block">
                TRANSMISSION TITLE
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. EPISODE 01: The Future of Terminal Audio Systems"
                required
                className="w-full bg-black border border-neutral-800 p-3 text-xs text-white placeholder-neutral-700 outline-none focus:border-white font-mono"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 tracking-widest font-bold block">
                CATEGORY BAND
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 border uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                      category === cat
                        ? "border-white bg-white text-black"
                        : "border-neutral-800 text-neutral-400 hover:border-neutral-600 bg-black"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Notes / Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 tracking-widest font-bold block">
                SHOW NOTES & TRANSCRIPT (OPTIONAL)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context, key discussion points, or links..."
                rows={4}
                className="w-full bg-black border border-neutral-800 p-3 text-xs text-white placeholder-neutral-700 outline-none focus:border-white font-mono resize-none"
              />
            </div>

            {/* Publish Button */}
            <button
              type="submit"
              disabled={uploading || !title.trim() || !audioFile || !audioDuration || audioDuration > 900}
              className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>ENCODING & BROADCASTING TO CDN...</span>
                </>
              ) : (
                <span>[ PUSH TRANSMISSION TO GRID (+50 VOLTS) ➔ ]</span>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
