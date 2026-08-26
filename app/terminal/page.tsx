"use client";

/**
 * ECHO — The Terminal & Settings ( /terminal )
 * Minimalist, neat, clean, and world-class command center.
 * All toggles & preferences synchronize with Firestore.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Bookmark,
  Play,
  Pause,
  Trash2,
  Volume2,
  Mic,
  Activity,
  Zap,
  CheckCircle2,
  Shield,
  Sliders,
  Bell,
  Lock,
  HelpCircle,
  AlertTriangle,
  Radio,
  Sparkles,
} from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/app/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getUserVaultedPosts, unvaultPost, type PostItem } from "@/lib/posts";
import { getPlayableUrl } from "@/lib/cloudinary";
import {
  type UserSettings as Settings,
  DEFAULT_SETTINGS,
  getVibeRead,
  updateVibeRead,
  analyzeVibeRead,
} from "@/lib/userDoc";

// ─── Persist setting to Firestore ─────────────────────────────
async function persistSetting(uid: string, key: keyof Settings, value: any) {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", uid);
    const updates: Record<string, any> = { [`settings.${key}`]: value };
    if (key === "privateAcc") {
      updates.isPrivate = value;
    }
    await updateDoc(ref, updates);
  } catch (e) {
    console.error("[Terminal] Failed to persist setting:", key, e);
  }
}

// ─── Modern Minimalist Cyberpunk Toggle Switch ────────────────
function ModernToggle({
  label,
  sub,
  value,
  onToggle,
  saving,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onToggle: () => void;
  saving?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center justify-between py-3.5 px-4 bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-2xl transition-all cursor-pointer select-none group"
    >
      <div className="space-y-0.5 pr-4">
        <p className="font-mono text-xs font-bold uppercase text-white tracking-wide group-hover:text-amber-400 transition-colors">
          {label}
        </p>
        {sub && <p className="text-[11px] text-neutral-500 font-sans">{sub}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
        <div
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
            value
              ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
              : "bg-neutral-900 border border-neutral-800"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full transition-transform ${
              value ? "translate-x-5 bg-black" : "translate-x-0 bg-neutral-600"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Segmented Option Selector ────────────────────────────────
function SegmentedSelect({
  label,
  sub,
  options,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-2xl space-y-2.5">
      <div>
        <p className="font-mono text-xs font-bold uppercase text-white tracking-wide">{label}</p>
        {sub && <p className="text-[11px] text-neutral-500 font-sans mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 p-1 bg-black rounded-xl border border-neutral-900 overflow-x-auto">
        {options.map((opt) => {
          const isSelected = value.toLowerCase() === opt.id.toLowerCase() || value === opt.label;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer text-center ${
                isSelected
                  ? "bg-white text-black font-black shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <Icon className="w-3.5 h-3.5 text-neutral-500" />
      <span className="font-mono text-xs font-black uppercase tracking-widest text-neutral-400">
        {title}
      </span>
    </div>
  );
}

export default function TerminalPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showDanger, setShowDanger] = useState(false);
  const [view, setView] = useState<"main" | "pings" | "hidden" | "vault" | "vibe">("main");
  const [newWord, setNewWord] = useState("");
  const [vaultPosts, setVaultPosts] = useState<PostItem[]>([]);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"guide" | "report" | "safety" | "contact" | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Vibe Read Biometrics & DSP Pitch Analyzer
  const [vibeRead, setVibeRead] = useState<{
    pitch: number;
    tempo: number;
    energy: number;
    clarity: number;
  } | null>(null);
  const [isAnalyzingPitch, setIsAnalyzingPitch] = useState(false);
  const [analysisCountdown, setAnalysisCountdown] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const saved = data.settings || {};
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
        }
        const vaulted = await getUserVaultedPosts(user.uid);
        setVaultPosts(vaulted);
        const liveVibe = await getVibeRead(user.uid);
        setVibeRead(liveVibe);
      } catch (e) {
        console.error("[Terminal] Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  const handleRunVibeAnalysis = async () => {
    if (!user?.uid) return;
    try {
      setIsAnalyzingPitch(true);
      setAnalysisStatus("LISTENING TO AUDIO (5S)...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      let remaining = 5;
      setAnalysisCountdown(remaining);
      const interval = setInterval(() => {
        remaining -= 1;
        setAnalysisCountdown(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 1000);

      mediaRecorder.start();

      await new Promise((resolve) => setTimeout(resolve, 5000));
      mediaRecorder.stop();
      stream.getTracks().forEach((t) => t.stop());

      setAnalysisStatus("COMPUTING DSP HARMONICS...");

      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const result = await analyzeVibeRead(blob);
          await updateVibeRead(user.uid, result);
          setVibeRead(result);
          setAnalysisStatus("CALIBRATION COMPLETE!");
          setTimeout(() => setAnalysisStatus(null), 3000);
          resolve();
        };
      });
    } catch (err: any) {
      console.error("Vibe analysis failed:", err);
      setAnalysisStatus("MIC ACCESS REQUIRED");
      setTimeout(() => setAnalysisStatus(null), 3000);
    } finally {
      setIsAnalyzingPitch(false);
      setAnalysisCountdown(0);
    }
  };

  const toggle = useCallback(
    <K extends keyof Settings>(key: K) => {
      if (!user?.uid) return;
      setSavingKey(key);
      setSettings((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persistSetting(user.uid, key, next[key]).finally(() => setSavingKey(null));
        return next;
      });
    },
    [user?.uid]
  );

  const select = useCallback(
    <K extends keyof Settings>(key: K, value: string) => {
      if (!user?.uid) return;
      setSavingKey(key);
      setSettings((prev) => ({ ...prev, [key]: value }));
      persistSetting(user.uid, key, value).finally(() => setSavingKey(null));
    },
    [user?.uid]
  );

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  // ── VAULT SUB-VIEW ──────────────────────────────────────────
  if (view === "vault") {
    const handleTogglePlay = (postId: string, rawUrl: string) => {
      const playable = getPlayableUrl(rawUrl);
      if (playingPostId === postId) {
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setPlayingPostId(null);
      } else {
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        const audio = new Audio(playable);
        audio.onended = () => setPlayingPostId(null);
        audioPlayerRef.current = audio;
        audio.play().catch(console.error);
        setPlayingPostId(postId);
      }
    };

    const handleUnvault = async (postId: string) => {
      if (!user) return;
      try {
        await unvaultPost(user.uid, postId);
        setVaultPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        console.error("Failed to unvault post:", err);
      }
    };

    return (
      <div className="bg-black min-h-screen text-white font-mono selection:bg-amber-500/30 pb-24">
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              setPlayingPostId(null);
              setView("main");
            }}
            className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TERMINAL</span>
          </button>
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            SAVED ECHO VAULT ({vaultPosts.length})
          </span>
          <div className="w-6" />
        </header>

        <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
          {vaultPosts.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-neutral-800 rounded-3xl p-6">
              <Bookmark className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="font-bold text-xs uppercase text-neutral-400">YOUR VAULT IS EMPTY</p>
              <p className="text-[11px] text-neutral-600 font-sans">
                Bookmark audio snippets from Frequency or Waves to access them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vaultPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-neutral-950/80 border border-neutral-900 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-white">
                      {post.authorHandle || "@ANON"}
                    </span>
                    <button
                      onClick={() => handleUnvault(post.id)}
                      className="text-[10px] text-neutral-500 hover:text-red-400 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>REMOVE</span>
                    </button>
                  </div>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    &ldquo;{post.caption}&rdquo;
                  </p>
                  {post.audioUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleTogglePlay(post.id, post.audioUrl)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          playingPostId === post.id
                            ? "bg-white text-black shadow-md"
                            : "bg-neutral-900 text-white hover:bg-neutral-800"
                        }`}
                      >
                        {playingPostId === post.id ? <Pause size={12} /> : <Play size={12} />}
                        <span>{playingPostId === post.id ? "PAUSE" : "PLAY VOICE"}</span>
                      </button>
                      <span className="text-[11px] text-neutral-500 tabular-nums">
                        {post.duration || `${post.durationSec || 15}s`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── VOCAL BIOMETRICS SUB-VIEW ───────────────────────────────
  if (view === "vibe") {
    return (
      <div className="bg-black min-h-screen text-white font-mono selection:bg-amber-500/30 pb-24">
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setView("main")}
            className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TERMINAL</span>
          </button>
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            AUDIO BIOMETRICS
          </span>
          <div className="w-6" />
        </header>

        <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
          <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-2">
            <p className="text-xs font-black uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>LIVE VIBE READ BIOMETRICS</span>
            </p>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Vibe Read is calculated from harmonic pitch resonance, cadence zero-crossing rate, RMS
              energy power, and signal-to-noise ratio.
            </p>
          </div>

          {analysisStatus && (
            <div className="p-3.5 bg-neutral-950 border border-emerald-500 text-emerald-400 text-xs font-bold uppercase rounded-2xl flex items-center justify-between animate-pulse">
              <span>{analysisStatus}</span>
              {analysisCountdown > 0 && <span className="text-sm font-black">{analysisCountdown}S</span>}
            </div>
          )}

          {vibeRead ? (
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] uppercase">
                    <span className="text-neutral-500">PITCH (FREQ)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.pitch}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${vibeRead.pitch}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] uppercase">
                    <span className="text-neutral-500">TEMPO (CADENCE)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.tempo}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${vibeRead.tempo}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] uppercase">
                    <span className="text-neutral-500">ENERGY (RMS)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.energy}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${vibeRead.energy}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] uppercase">
                    <span className="text-neutral-500">CLARITY (SNR)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.clarity}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${vibeRead.clarity}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-neutral-800 rounded-3xl text-center space-y-2">
              <Activity className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="font-bold text-xs uppercase text-neutral-400">NO BIOMETRICS YET</p>
              <p className="text-[11px] text-neutral-600 font-sans">
                Record a 5-second sample to compute your vocal frequency.
              </p>
            </div>
          )}

          <button
            onClick={handleRunVibeAnalysis}
            disabled={isAnalyzingPitch}
            className="w-full py-3 px-4 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isAnalyzingPitch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>CALIBRATING ({analysisCountdown}S)...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>ANALYZE LIVE VOCAL PITCH 🎙️</span>
              </>
            )}
          </button>
        </main>
      </div>
    );
  }

  // ── PINGS SUB-VIEW ──────────────────────────────────────────
  if (view === "pings") {
    return (
      <div className="bg-black min-h-screen text-white font-mono selection:bg-amber-500/30 pb-24">
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setView("main")}
            className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TERMINAL</span>
          </button>
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            NOTIFICATION PINGS
          </span>
          <div className="w-6" />
        </header>

        <main className="max-w-xl mx-auto px-4 py-6 space-y-3">
          <ModernToggle
            label="NEW PULSES ON ECHOES"
            sub="Notify when someone pulses your voice drops"
            value={settings.pingPulses}
            onToggle={() => toggle("pingPulses")}
            saving={savingKey === "pingPulses"}
          />
          <ModernToggle
            label="NEW REVERB REPLIES"
            sub="Notify when someone drops a voice reply"
            value={settings.pingReverbs}
            onToggle={() => toggle("pingReverbs")}
            saving={savingKey === "pingReverbs"}
          />
          <ModernToggle
            label="VIRAL ECHO ALERTS"
            sub="Notify when your voice reaches trending orbit"
            value={settings.pingOnFire}
            onToggle={() => toggle("pingOnFire")}
            saving={savingKey === "pingOnFire"}
          />
          <ModernToggle
            label="NEW ORBITERS"
            sub="Notify when someone follows/orbits your profile"
            value={settings.pingLockIns}
            onToggle={() => toggle("pingLockIns")}
            saving={savingKey === "pingLockIns"}
          />
          <ModernToggle
            label="STAGE CLASH INVITES"
            sub="Notify for live stage battles and debate challenges"
            value={settings.pingStage}
            onToggle={() => toggle("pingStage")}
            saving={savingKey === "pingStage"}
          />
        </main>
      </div>
    );
  }

  // ── HIDDEN WORDS SUB-VIEW ───────────────────────────────────
  if (view === "hidden") {
    const handleAddWord = async () => {
      if (!newWord.trim() || !user?.uid) return;
      const word = newWord.trim().toUpperCase();
      const current = settings.hiddenWords || [];
      if (current.includes(word)) return;
      const nextWords = [...current, word];
      setSettings((prev) => ({ ...prev, hiddenWords: nextWords }));
      setNewWord("");
      await persistSetting(user.uid, "hiddenWords", nextWords);
    };

    const handleRemoveWord = async (wordToRemove: string) => {
      if (!user?.uid) return;
      const current = settings.hiddenWords || [];
      const nextWords = current.filter((w) => w !== wordToRemove);
      setSettings((prev) => ({ ...prev, hiddenWords: nextWords }));
      await persistSetting(user.uid, "hiddenWords", nextWords);
    };

    return (
      <div className="bg-black min-h-screen text-white font-mono selection:bg-amber-500/30 pb-24">
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setView("main")}
            className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TERMINAL</span>
          </button>
          <span className="font-bold text-xs uppercase tracking-wider text-white">HIDDEN WORDS</span>
          <div className="w-6" />
        </header>

        <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddWord();
              }}
              placeholder="Enter word to filter..."
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white uppercase"
            />
            <button
              onClick={handleAddWord}
              className="px-4 py-2 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              ADD
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(!settings.hiddenWords || settings.hiddenWords.length === 0) ? (
              <p className="text-xs text-neutral-600 font-sans">No hidden words added yet.</p>
            ) : (
              settings.hiddenWords.map((word) => (
                <button
                  key={word}
                  onClick={() => handleRemoveWord(word)}
                  className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 hover:border-red-500 hover:text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{word}</span>
                  <span className="text-[10px] text-neutral-500">✕</span>
                </button>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── MAIN TERMINAL VIEW ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-amber-500/30 pb-28">
      {/* ── Minimal Sticky Navigation Header ── */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3 sm:px-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 border border-neutral-800 rounded-xl hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          title="Return"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">BACK</span>
        </button>

        <div className="text-center">
          <h1 className="font-black text-sm uppercase tracking-widest text-white">
            SETTINGS &amp; TERMINAL
          </h1>
        </div>

        <Link
          href="/profile"
          className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-600 transition-all"
        >
          PROFILE
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* ── Account Identity Card ── */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900/60 to-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-between flex-wrap gap-3 shadow-lg">
          <div className="space-y-0.5">
            <h2 className="font-black text-sm text-white tracking-wide">
              {user?.handle || "@ANON"}
            </h2>
            <p className="text-[11px] text-neutral-400 font-sans">{user?.email || "No email"}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2 py-0.5 bg-neutral-900 border border-amber-400/50 text-yellow-400 font-black text-[10px] rounded-md shadow-sm">
                🏆 {(user as any)?.auraScore || 0} AURA
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 border border-neutral-800 hover:border-red-500 text-neutral-400 hover:text-red-400 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 bg-neutral-950"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT</span>
          </button>
        </div>

        {/* ── Quick Action Hub (3 Minimal Pods) ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => setView("vault")}
            className="p-3 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-700 rounded-2xl text-center space-y-1 transition-all cursor-pointer group"
          >
            <Bookmark className="w-4 h-4 mx-auto text-neutral-400 group-hover:text-white" />
            <p className="text-[10px] font-black uppercase text-white truncate">VAULT</p>
            <p className="text-[9px] text-neutral-500 tabular-nums">({vaultPosts.length})</p>
          </button>

          <button
            onClick={() => setView("vibe")}
            className="p-3 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-700 rounded-2xl text-center space-y-1 transition-all cursor-pointer group"
          >
            <Activity className="w-4 h-4 mx-auto text-emerald-400 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase text-white truncate">BIOMETRICS</p>
            <p className="text-[9px] text-emerald-400 font-bold">LIVE VIBE</p>
          </button>

          <button
            onClick={() => setView("pings")}
            className="p-3 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-700 rounded-2xl text-center space-y-1 transition-all cursor-pointer group"
          >
            <Bell className="w-4 h-4 mx-auto text-neutral-400 group-hover:text-white" />
            <p className="text-[10px] font-black uppercase text-white truncate">PINGS</p>
            <p className="text-[9px] text-neutral-500">ALERTS</p>
          </button>
        </div>

        {/* ── 1. Audio & Transmission ── */}
        <div className="space-y-2">
          <SectionTitle icon={Sliders} title="AUDIO & TRANSMISSION" />
          <SegmentedSelect
            label="STREAM QUALITY"
            sub="Balance audio fidelity vs data usage"
            options={[
              { id: "HIGH", label: "HIGH" },
              { id: "STANDARD", label: "STANDARD" },
              { id: "LOW", label: "LOW" },
            ]}
            value={settings.audioQuality}
            onChange={(v) => select("audioQuality", v)}
          />
          <ModernToggle
            label="AUTO-PLAY ON FEED"
            sub="Automatically start playing audio takes on scroll"
            value={settings.autoPlay}
            onToggle={() => toggle("autoPlay")}
            saving={savingKey === "autoPlay"}
          />
          <ModernToggle
            label="AUTO-TRANSCRIBE ECHOES"
            sub="Generate real-time captions for voice takes"
            value={settings.autoTranscribe}
            onToggle={() => toggle("autoTranscribe")}
            saving={savingKey === "autoTranscribe"}
          />
        </div>

        {/* ── 2. Reach & Voice Permissions ── */}
        <div className="space-y-2">
          <SectionTitle icon={Radio} title="VOICE & REVERB PERMISSIONS" />
          <SegmentedSelect
            label="WHO CAN DROP REVERBS"
            sub="Control who can voice-reply to your echoes"
            options={[
              { id: "EVERYONE", label: "EVERYONE" },
              { id: "ORBIT", label: "ORBITERS" },
              { id: "NOBODY", label: "NOBODY" },
            ]}
            value={settings.yapControl}
            onChange={(v) => select("yapControl", v)}
          />
          <SegmentedSelect
            label="WHO CAN RE-ECHO"
            sub="Control who can reshare your voice posts"
            options={[
              { id: "EVERYONE", label: "EVERYONE" },
              { id: "ORBIT", label: "ORBITERS" },
              { id: "NOBODY", label: "NOBODY" },
            ]}
            value={settings.echoControl}
            onChange={(v) => select("echoControl", v)}
          />
          <SegmentedSelect
            label="WHO CAN WIRE (DM)"
            sub="Private 1-on-1 audio messaging permissions"
            options={[
              { id: "EVERYONE", label: "EVERYONE" },
              { id: "ORBIT", label: "ORBITERS" },
              { id: "NOBODY", label: "NOBODY" },
            ]}
            value={settings.whoCanWire}
            onChange={(v) => select("whoCanWire", v)}
          />
        </div>

        {/* ── 3. Privacy & Safety ── */}
        <div className="space-y-2">
          <SectionTitle icon={Lock} title="PRIVACY & SAFETY" />
          <ModernToggle
            label="PRIVATE FREQUENCY"
            sub="Require manual approval for new orbiters"
            value={settings.privateAcc}
            onToggle={() => toggle("privateAcc")}
            saving={savingKey === "privateAcc"}
          />
          <ModernToggle
            label="SHOW AURA SCORE"
            sub="Display your Aura score on your profile"
            value={settings.auraVisible}
            onToggle={() => toggle("auraVisible")}
            saving={savingKey === "auraVisible"}
          />
          <ModernToggle
            label="ANONYMOUS MODE"
            sub="Mask your handle on public feeds"
            value={settings.anonMode}
            onToggle={() => toggle("anonMode")}
            saving={savingKey === "anonMode"}
          />
          <button
            onClick={() => setView("hidden")}
            className="w-full p-4 bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-900 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-bold uppercase text-white group-hover:text-amber-400 transition-colors">
                HIDDEN WORDS FILTER
              </p>
              <p className="text-[11px] text-neutral-500 font-sans">
                Filter specific keywords from voice replies
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* ── 4. Diagnostics & Support ── */}
        <div className="space-y-2">
          <SectionTitle icon={HelpCircle} title="SUPPORT & DIAGNOSTICS" />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveModal("guide")}
              className="p-3.5 bg-neutral-950/60 hover:bg-neutral-900 border border-neutral-900 rounded-2xl text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold uppercase text-white">ECHO GUIDE</p>
              <p className="text-[10px] text-neutral-500 font-sans">How audio works</p>
            </button>
            <button
              onClick={() => setActiveModal("report")}
              className="p-3.5 bg-neutral-950/60 hover:bg-neutral-900 border border-neutral-900 rounded-2xl text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold uppercase text-white">REPORT BUG</p>
              <p className="text-[10px] text-neutral-500 font-sans">Submit glitch</p>
            </button>
            <button
              onClick={() => setActiveModal("safety")}
              className="p-3.5 bg-neutral-950/60 hover:bg-neutral-900 border border-neutral-900 rounded-2xl text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold uppercase text-white">SAFETY</p>
              <p className="text-[10px] text-neutral-500 font-sans">Moderation</p>
            </button>
            <button
              onClick={() => setActiveModal("contact")}
              className="p-3.5 bg-neutral-950/60 hover:bg-neutral-900 border border-neutral-900 rounded-2xl text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold uppercase text-white">CONTACT US</p>
              <p className="text-[10px] text-neutral-500 font-sans">Human support</p>
            </button>
          </div>
        </div>

        {/* ── 5. Danger Zone ── */}
        <div className="pt-2">
          {!showDanger ? (
            <button
              onClick={() => setShowDanger(true)}
              className="w-full py-3 border border-dashed border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              + ADVANCED SYSTEM COMMANDS
            </button>
          ) : (
            <div className="p-4 border border-red-950/60 bg-red-950/10 rounded-2xl space-y-2">
              <p className="text-[11px] font-bold text-red-400 uppercase">ADVANCED DATA ACTIONS</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                      alert("Local audio cache cleared.");
                    } catch {}
                  }}
                  className="w-full py-2 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  CLEAR LOCAL AUDIO CACHE
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  SIGN OUT OF ALL SESSIONS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version Footer */}
        <p className="text-[10px] text-neutral-700 text-center uppercase tracking-widest pt-4">
          ECHO PROTOCOL v0.1.0 • AURA SECURE
        </p>
      </main>

      {/* ── Modals ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                {activeModal === "guide" && "ECHO PLATFORM GUIDE"}
                {activeModal === "report" && "REPORT A PROBLEM"}
                {activeModal === "safety" && "SAFETY & MODERATION"}
                {activeModal === "contact" && "CONTACT ENGINEERING"}
              </span>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setReportSuccess(false);
                  setReportText("");
                }}
                className="text-xs text-neutral-500 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {activeModal === "guide" && (
              <div className="space-y-2.5 text-xs text-neutral-300 font-sans leading-relaxed max-h-80 overflow-y-auto">
                <p><strong className="text-white font-mono">FREQUENCY:</strong> Live public voice feed of authentic audio snippets.</p>
                <p><strong className="text-white font-mono">WAVES:</strong> 30s TikTok-style vertical audio cards with interactive waveforms.</p>
                <p><strong className="text-white font-mono">STUDIO:</strong> Record 15s to 60s voice takes, filters & voice bio.</p>
                <p><strong className="text-white font-mono">STAGE:</strong> Live audio debate arena & voice battles.</p>
                <p><strong className="text-white font-mono">ROOMS:</strong> Real-time Clubhouse-style audio spaces with live speakers.</p>
                <p><strong className="text-white font-mono">ECHO CLUB:</strong> 39 real-time multiplayer board & voice games.</p>
              </div>
            )}

            {activeModal === "report" && (
              <div className="space-y-3 font-sans">
                {reportSuccess ? (
                  <p className="text-xs text-emerald-400 font-bold">
                    ✓ Thank you! Your report has been submitted to the engineering team.
                  </p>
                ) : (
                  <>
                    <textarea
                      rows={4}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Describe the issue or bug..."
                      className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
                    />
                    <button
                      onClick={async () => {
                        if (reportText.trim()) {
                          try {
                            const db = getFirebaseDb();
                            const { addDoc, collection, serverTimestamp } = await import(
                              "firebase/firestore"
                            );
                            await addDoc(collection(db, "reports"), {
                              uid: user?.uid || "anon",
                              handle: (user as any)?.handle || "@ANON",
                              report: reportText.trim(),
                              createdAt: serverTimestamp(),
                            });
                          } catch {}
                          setReportSuccess(true);
                        }
                      }}
                      disabled={!reportText.trim()}
                      className="w-full py-2.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      SUBMIT REPORT
                    </button>
                  </>
                )}
              </div>
            )}

            {activeModal === "safety" && (
              <div className="space-y-2 text-xs text-neutral-300 font-sans leading-relaxed">
                <p>• Block or mute any profile directly from their user card.</p>
                <p>• Enable Anonymous Mode or Private Frequency in settings.</p>
                <p>• 24/7 Crisis Helpline: <strong className="text-white">988</strong>.</p>
              </div>
            )}

            {activeModal === "contact" && (
              <div className="space-y-3 text-xs font-sans">
                <p className="text-neutral-400">Reach the platform support team:</p>
                <div className="p-3 bg-black border border-neutral-800 rounded-xl text-white font-mono font-bold select-all">
                  support@echo-aura.app
                </div>
                <p className="text-[11px] text-neutral-500">
                  Responses typically arrive within 12-24 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
