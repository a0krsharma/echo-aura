"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic2,
  Settings,
  Flame,
  Zap,
  Share2,
  X,
  Lock,
  Play,
  Square,
  Copy,
  Check,
  Loader2,
  ArrowUp
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio } from "@/lib/cloudinary";
import { subscribeToEchoes, type EchoPost } from "@/lib/echoes";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ECHOES" | "REVERBS" | "PULSED" | "DRAFTS">("ECHOES");
  const [userEchoes, setUserEchoes] = useState<EchoPost[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Voice Bio states
  const [bioState, setBioState] = useState<"idle" | "recording" | "preview" | "saved">("idle");
  const [bioDuration, setBioDuration] = useState(30); // 30s or 60s max
  const [bioElapsed, setBioElapsed] = useState(0);
  const [bioBlob, setBioBlob] = useState<Blob | null>(null);
  const [bioAudioUrl, setBioAudioUrl] = useState<string | null>(null);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to real Firestore echoes for this user
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToEchoes((allEchoes) => {
      const myEchoes = allEchoes.filter((e) => e.uid === user.uid);
      setUserEchoes(myEchoes);
    });
    return () => unsub();
  }, [user]);

  // Voice Bio recording timer
  useEffect(() => {
    if (bioState === "recording") {
      bioTimerRef.current = setInterval(() => {
        setBioElapsed((prev) => {
          if (prev >= bioDuration) {
            stopBioRecording();
            return bioDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    }
    return () => {
      if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    };
  }, [bioState, bioDuration]);

  // Handle Mic recording for Voice Bio
  const startBioRecording = async () => {
    setBioElapsed(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBioBlob(blob);
        setBioAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setBioState("recording");
    } catch {
      setBioState("recording");
    }
  };

  const stopBioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setBioState("preview");
  };

  // Save Voice Bio to Cloudinary & Firestore User doc
  const saveVoiceBio = async () => {
    if (!user || !bioBlob) return;
    setIsSavingBio(true);
    try {
      const uploaded = await uploadAudio(bioBlob, `voice-bio-${user.uid}`);
      const db = getFirebaseDb();
      await updateDoc(doc(db, "users", user.uid), {
        voiceBioUrl: uploaded.secureUrl,
        voiceBioDuration: `${bioElapsed}s`,
      });
      setBioState("saved");
    } catch (err) {
      console.error("Failed to save voice bio:", err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCopyLink = () => {
    const handle = user?.handle || "@ANON";
    navigator.clipboard.writeText(`https://echo.fm/${handle.replace("@", "")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleBioPlay = () => {
    if (!bioAudioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(bioAudioUrl);
      audioRef.current.onended = () => setIsPlayingBio(false);
    }

    if (isPlayingBio) {
      audioRef.current.pause();
      setIsPlayingBio(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlayingBio(true);
    }
  };

  const handle = user?.handle || "@ANON_0000";
  const auraScore = user?.auraScore || 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 flex flex-col font-sans">
      {/* Top Header */}
      <header className="p-6 flex items-center justify-between border-b border-neutral-900">
        <span className="font-serif italic text-lg text-white">Echo.</span>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShareModalOpen(true)}
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Share profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-6 pt-8 w-full flex-1">
        {/* User Handle & Aura Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="font-mono text-2xl font-bold tracking-widest text-white">
                  {handle}
                </h1>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                AUTHENTICATED PROFILE
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-xs text-neutral-500 tracking-widest uppercase mb-1">
                Aura Score
              </div>
              <div className="font-serif italic text-3xl text-white">
                {auraScore.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Voice Bio Section */}
        <div className="p-6 border border-neutral-900 bg-neutral-950/40 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
              // VOICE BIO (30S / 60S)
            </span>
            {bioState === "saved" && (
              <span className="font-mono text-[10px] tracking-widest text-white border border-neutral-700 px-2 py-0.5 uppercase">
                LIVE ON PROFILE
              </span>
            )}
          </div>

          {bioState === "idle" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBioDuration(30)}
                  className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                    bioDuration === 30 ? "border-white text-white" : "border-neutral-800 text-neutral-600"
                  }`}
                >
                  [30S]
                </button>
                <button
                  onClick={() => setBioDuration(60)}
                  className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                    bioDuration === 60 ? "border-white text-white" : "border-neutral-800 text-neutral-600"
                  }`}
                >
                  [60S]
                </button>
              </div>

              <button
                onClick={startBioRecording}
                className="w-full sm:w-auto px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Mic2 className="w-3.5 h-3.5" /> [ RECORD VOICE BIO ]
              </button>
            </div>
          )}

          {bioState === "recording" && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2 font-mono text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>00:{bioElapsed.toString().padStart(2, "0")} / 00:{bioDuration}</span>
              </div>
              <button
                onClick={stopBioRecording}
                className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                [ STOP & PREVIEW ]
              </button>
            </div>
          )}

          {(bioState === "preview" || bioState === "saved") && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleToggleBioPlay}
                  className="w-10 h-10 rounded-full border border-neutral-700 flex items-center justify-center hover:border-white transition-colors cursor-pointer"
                >
                  {isPlayingBio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 flex items-center space-x-1 h-6 opacity-60">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white rounded-full"
                      style={{ height: `${Math.max(20, (i % 5) * 20 + 20)}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                {bioState === "preview" && (
                  <button
                    onClick={saveVoiceBio}
                    disabled={isSavingBio}
                    className="px-4 py-2 bg-white text-black font-mono text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSavingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "[ SAVE AS VOICE BIO ]"}
                  </button>
                )}
                <button
                  onClick={() => setBioState("idle")}
                  className="px-4 py-2 border border-neutral-800 text-neutral-500 font-mono text-xs tracking-widest uppercase hover:border-neutral-600 hover:text-white transition-colors cursor-pointer"
                >
                  RE-RECORD
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-900 mb-6 font-mono text-xs tracking-widest">
          {(["ECHOES", "REVERBS", "PULSED", "DRAFTS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 uppercase transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-b-2 border-white text-white font-bold"
                  : "text-neutral-600 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feed Tab Content */}
        {activeTab === "ECHOES" && (
          <div>
            {userEchoes.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <p className="font-serif italic text-neutral-500 text-lg">
                  You haven't dropped any voice echoes yet.
                </p>
                <Link
                  href="/record"
                  className="inline-block px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
                >
                  [ 🎙 RECORD FIRST ECHO ]
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-900">
                {userEchoes.map((echo) => (
                  <article key={echo.id} className="py-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-neutral-500 uppercase">
                        {echo.vibeTag || "ECHO"}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-600">
                        {echo.duration}
                      </span>
                    </div>

                    <h3 className="font-serif italic text-xl text-white">
                      "{echo.title}"
                    </h3>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 font-mono text-xs text-neutral-500">
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>{echo.pulses || 0} PULSES</span>
                      </div>
                      <span className="font-mono text-xs text-neutral-600 uppercase">
                        {echo.listeners || 0} LISTENS
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab !== "ECHOES" && (
          <div className="py-16 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
            NO {activeTab} FOUND.
          </div>
        )}
      </main>

      {/* Share Profile Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
                // SHARE PROFILE
              </span>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-2 py-4">
              <p className="font-mono text-2xl font-bold tracking-widest text-white">
                {handle}
              </p>
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                ECHO AUDIO NETWORK
              </p>
            </div>

            <div className="p-3 border border-neutral-900 flex items-center justify-between font-mono text-xs text-neutral-400">
              <span className="truncate">echo.fm/{handle.replace("@", "")}</span>
              <button
                onClick={handleCopyLink}
                className="ml-2 text-white hover:underline cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
