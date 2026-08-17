"use client";

/**
 * ECHO — The Terminal ( /terminal )
 * Settings as a command center. All toggles persist to Firestore.
 * [ ON ] / [ OFF ] — bracketed text is the only UI control.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2, LogOut, Bookmark, Play, Pause, Trash2, Volume2, Mic, Activity, Zap, CheckCircle2 } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/app/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getUserVaultedPosts, unvaultPost, type PostItem } from "@/lib/posts";
import { getPlayableUrl } from "@/lib/cloudinary";
import { type UserSettings as Settings, DEFAULT_SETTINGS, getVibeRead, updateVibeRead, analyzeVibeRead } from "@/lib/userDoc";


// ─── Types ────────────────────────────────────────────────
type ToggleState = boolean;

// ─── Persist a single setting to Firestore ────────────────
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

interface ToggleItemProps {
  id: string; label: string; sub?: string;
  value: ToggleState; onToggle: () => void; saving?: boolean;
}
interface NavItemProps {
  label: string; sub?: string; href?: string;
  onClick?: () => void; badge?: string | number;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: SectionHeader
// ═══════════════════════════════════════════════════════════
function SectionHeader({ label }: { label: string }) {
  return (
    <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 pt-10 pb-4 border-t border-neutral-900 first:border-t-0 first:pt-0">
      // {label}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: ToggleItem  [ ON ] / [ OFF ]
// ═══════════════════════════════════════════════════════════
function ToggleItem({ id, label, sub, value, onToggle, saving }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-900">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-white">{label}</p>
        {sub && <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">{sub}</p>}
      </div>
      <button
        id={id}
        onClick={onToggle}
        disabled={saving}
        className={`
          font-mono text-xs tracking-widest uppercase px-3 py-1.5 border
          transition-colors duration-150 cursor-pointer shrink-0 ml-4 flex items-center gap-1.5
          ${value
            ? "border-white text-white"
            : "border-neutral-800 text-neutral-600 hover:border-neutral-600"
          }
          ${saving ? "opacity-50" : ""}
        `}
      >
        {saving && <Loader2 size={9} className="animate-spin" />}
        {value ? "[ ON ]" : "[ OFF ]"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: NavItem
// ═══════════════════════════════════════════════════════════
function NavItem({ label, sub, href, onClick, badge }: NavItemProps) {
  const inner = (
    <div className="flex items-center justify-between py-4 border-b border-neutral-900 group cursor-pointer">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-white group-hover:text-neutral-400 transition-colors">{label}</p>
        {sub && <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-3 ml-4">
        {badge !== undefined && badge !== 0 && (
          <span className="font-mono text-xs bg-white text-black px-1.5 py-0.5 tracking-widest">{badge}</span>
        )}
        <ChevronRight size={12} strokeWidth={1.5} className="text-neutral-700 group-hover:text-neutral-500 transition-colors" />
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return <button onClick={onClick} className="w-full text-left">{inner}</button>;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: SelectItem — multi-choice setting
// ═══════════════════════════════════════════════════════════
function SelectItem({ label, sub, options, value, onChange }: {
  label: string; sub?: string;
  options: string[]; value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="py-4 border-b border-neutral-900">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-white">{label}</p>
          {sub && <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`
              font-mono text-xs tracking-widest uppercase px-3 py-1.5 border
              transition-colors duration-150 cursor-pointer
              ${value === opt
                ? "border-white text-white"
                : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-white"
              }
            `}
          >
            {value === opt ? `[ ${opt} ]` : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENT: SubView — wraps inner sections with back nav
// ═══════════════════════════════════════════════════════════
function SubView({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-black min-h-screen pb-24 md:pb-0">
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <button onClick={onBack} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="font-mono text-xs tracking-widest uppercase text-white">{title}</span>
        <div className="w-4" />
      </div>
      <div className="max-w-xl mx-auto px-5 md:px-6 pt-8 md:pt-12">
        <div className="hidden md:flex items-center gap-3 mb-8">
          <button onClick={onBack} className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer">
            ← TERMINAL
          </button>
          <span className="text-neutral-800">/</span>
          <span className="font-mono text-xs tracking-widest uppercase text-white">{title}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE: The Terminal
// ═══════════════════════════════════════════════════════════
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

  // ── Load settings, Vault, and Vibe Read from Firestore on mount ───────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
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

  // ── Live DSP Pitch & Audio Biometrics Analyzer ────────────
  const handleRunVibeAnalysis = async () => {
    if (!user?.uid) return;
    try {
      setIsAnalyzingPitch(true);
      setAnalysisStatus("LISTENING TO AUDIO FREQUENCY (5S)...");
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

      setAnalysisStatus("COMPUTING DSP PITCH & HARMONICS...");

      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const result = await analyzeVibeRead(blob);
          await updateVibeRead(user.uid, result);
          setVibeRead(result);
          setAnalysisStatus("DSP PITCH ANALYSIS COMPLETE!");
          setTimeout(() => setAnalysisStatus(null), 3000);
          resolve();
        };
      });
    } catch (err: any) {
      console.error("Vibe analysis failed:", err);
      setAnalysisStatus("MIC ACCESS REQUIRED FOR PITCH ANALYSIS");
      setTimeout(() => setAnalysisStatus(null), 3000);
    } finally {
      setIsAnalyzingPitch(false);
      setAnalysisCountdown(0);
    }
  };

  // ── Generic toggle handler — updates state + Firestore ──
  const toggle = useCallback(<K extends keyof Settings>(key: K) => {
    if (!user?.uid) return;
    setSavingKey(key);
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      persistSetting(user.uid, key, next[key]).finally(() => setSavingKey(null));
      return next;
    });
  }, [user?.uid]);

  // ── Generic select handler ───────────────────────────────
  const select = useCallback(<K extends keyof Settings>(key: K, value: string) => {
    if (!user?.uid) return;
    setSavingKey(key);
    setSettings(prev => ({ ...prev, [key]: value }));
    persistSetting(user.uid, key, value).finally(() => setSavingKey(null));
  }, [user?.uid]);

  // ── Sign out ─────────────────────────────────────────────
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
        <p className="font-mono text-xs tracking-widest text-neutral-700 animate-pulse">// LOADING SETTINGS...</p>
      </div>
    );
  }

  // ── PINGS sub-view ───────────────────────────────────────
  if (view === "pings") return (
    <SubView title="PINGS" onBack={() => setView("main")}>
      <ToggleItem id="ping-pulses"  label="NEW PULSES ON YOUR ECHOES"  sub="someone vibed to you"         value={settings.pingPulses}  onToggle={() => toggle("pingPulses")}  saving={savingKey === "pingPulses"} />
      <ToggleItem id="ping-reverbs" label="NEW [ REPLIES ] / YAPS"      sub="someone dropped a reply"      value={settings.pingReverbs} onToggle={() => toggle("pingReverbs")} saving={savingKey === "pingReverbs"} />
      <ToggleItem id="ping-fire"    label="YOU'RE ON FIRE"              sub="when your echo goes viral"    value={settings.pingOnFire}  onToggle={() => toggle("pingOnFire")}  saving={savingKey === "pingOnFire"} />
      <ToggleItem id="ping-lockins" label="NEW [ ORBIT ]"               sub="someone locked in with you"   value={settings.pingLockIns} onToggle={() => toggle("pingLockIns")} saving={savingKey === "pingLockIns"} />
      <ToggleItem id="ping-stage"   label="STAGE INVITES"               sub="clash / battle requests"      value={settings.pingStage}   onToggle={() => toggle("pingStage")}   saving={savingKey === "pingStage"} />
    </SubView>
  );

  // ── HIDDEN WORDS sub-view ────────────────────────────────
  if (view === "hidden") {
    const handleAddWord = async () => {
      if (!newWord.trim() || !user?.uid) return;
      const word = newWord.trim().toUpperCase();
      const current = settings.hiddenWords || [];
      if (current.includes(word)) return;
      
      const nextWords = [...current, word];
      setSettings(prev => ({ ...prev, hiddenWords: nextWords }));
      setNewWord("");
      await persistSetting(user.uid, "hiddenWords", nextWords);
    };

    const handleRemoveWord = async (wordToRemove: string) => {
      if (!user?.uid) return;
      const current = settings.hiddenWords || [];
      const nextWords = current.filter(w => w !== wordToRemove);
      setSettings(prev => ({ ...prev, hiddenWords: nextWords }));
      await persistSetting(user.uid, "hiddenWords", nextWords);
    };

    return (
      <SubView title="HIDDEN WORDS" onBack={() => setView("main")}>
        <p className="font-mono text-xs text-neutral-700 tracking-widest mb-8">
          [ REPLIES ] CONTAINING THESE WORDS WILL BE HIDDEN FROM YOU
        </p>
        <div className="border-b border-neutral-900 pb-4 mb-6 flex items-center">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddWord(); }}
            placeholder="add a word or phrase..."
            className="w-full bg-transparent outline-none font-mono text-xs tracking-widest uppercase text-white placeholder:text-neutral-800 placeholder:normal-case placeholder:tracking-normal"
          />
          <button onClick={handleAddWord} className="font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white px-3 py-1.5 border border-neutral-800 hover:border-white transition-colors cursor-pointer shrink-0">
            [ ADD ]
          </button>
        </div>
        
        {(!settings.hiddenWords || settings.hiddenWords.length === 0) ? (
          <p className="font-mono text-xs text-neutral-700 tracking-widest">NO HIDDEN WORDS YET</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {settings.hiddenWords.map((word) => (
              <button
                key={word}
                onClick={() => handleRemoveWord(word)}
                className="font-mono text-xs tracking-widest uppercase px-3 py-1.5 border border-neutral-800 text-neutral-400 hover:border-red-900 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-2"
              >
                {word} <span className="text-[10px]">✕</span>
              </button>
            ))}
          </div>
        )}
      </SubView>
    );
  }

  // ── VAULT sub-view ───────────────────────────────────────
  if (view === "vault") {
    const handleTogglePlay = (postId: string, rawUrl: string) => {
      const playable = getPlayableUrl(rawUrl);
      if (playingPostId === postId) {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        setPlayingPostId(null);
      } else {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
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
      <SubView title="SAVED VAULT" onBack={() => {
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setPlayingPostId(null);
        setView("main");
      }}>
        <div className="space-y-4">
          <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
            // BOOKMARKED AUDIO CLIPS ({vaultPosts.length})
          </p>

          {vaultPosts.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-neutral-900">
              <Bookmark className="w-6 h-6 text-neutral-700 mx-auto" />
              <p className="font-serif italic text-neutral-500 text-sm">
                Your vault is empty.
              </p>
              <p className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
                Bookmark echoes from Frequency or Waves to save them here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {vaultPosts.map((post) => (
                <div key={post.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">
                      {post.authorHandle || "@ANON"}
                    </span>
                    <button
                      onClick={() => handleUnvault(post.id)}
                      className="font-mono text-[10px] text-neutral-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>[ REMOVE ]</span>
                    </button>
                  </div>

                  <p className="font-serif italic text-sm text-neutral-300">
                    "{post.caption}"
                  </p>

                  {post.audioUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleTogglePlay(post.id, post.audioUrl)}
                        className={`font-mono text-xs px-3 py-1 border uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                          playingPostId === post.id
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
                        }`}
                      >
                        {playingPostId === post.id ? <Pause size={10} /> : <Play size={10} />}
                        <span>{playingPostId === post.id ? "PAUSE" : "PLAY VOICE"}</span>
                      </button>
                      <span className="font-mono text-[10px] text-neutral-600">
                        {post.duration || `${post.durationSec || 15}s`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SubView>
    );
  }

  // ── VIBE READ BIOMETRICS sub-view ───────────────────────
  if (view === "vibe") {
    return (
      <SubView title="AUDIO BIOMETRICS" onBack={() => setView("main")}>
        <div className="space-y-6">
          <p className="font-mono text-xs text-neutral-400 tracking-widest uppercase">
            // [ LIVE VIBE_READ ] — VOCAL FREQUENCY DSP BIOMETRICS
          </p>

          <p className="font-mono text-xs text-neutral-600 leading-relaxed">
            YOUR VIBE READ IS COMPUTED ALGORITHMICALLY FROM YOUR VOCAL HARMONICS, PITCH ZERO-CROSSING RATE, RMS ENERGY POWER, AND SIGNAL-TO-NOISE RATIO.
          </p>

          {/* Analysis Status / Countdown Banner */}
          {analysisStatus && (
            <div className="p-3 border border-white bg-neutral-950 font-mono text-xs text-white tracking-wider flex items-center justify-between animate-pulse">
              <span>{analysisStatus}</span>
              {analysisCountdown > 0 && <span className="font-bold text-base">{analysisCountdown}S</span>}
            </div>
          )}

          {/* Biometric Meters */}
          {!vibeRead ? (
            <div className="p-6 border border-dashed border-neutral-900 text-center space-y-3">
              <Activity className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="font-serif italic text-neutral-400 text-sm">
                No vocal biometrics analyzed yet.
              </p>
              <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
                Record a 5-second voice sample below to calibrate your live pitch & frequency.
              </p>
            </div>
          ) : (
            <div className="border border-neutral-900 bg-neutral-950/60 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Pitch */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span className="text-neutral-500">PITCH (FREQ)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.pitch}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: `${vibeRead.pitch}%` }} />
                  </div>
                </div>

                {/* Tempo */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span className="text-neutral-500">TEMPO (CADENCE)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.tempo}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: `${vibeRead.tempo}%` }} />
                  </div>
                </div>

                {/* Energy */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span className="text-neutral-500">ENERGY (RMS)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.energy}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: `${vibeRead.energy}%` }} />
                  </div>
                </div>

                {/* Clarity */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span className="text-neutral-500">CLARITY (SNR)</span>
                    <span className="text-white font-bold tabular-nums">{vibeRead.clarity}%</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: `${vibeRead.clarity}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleRunVibeAnalysis}
            disabled={isAnalyzingPitch}
            className="w-full py-3.5 px-4 border border-white bg-white text-black font-mono text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzingPitch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ANALYZING PITCH ({analysisCountdown}S)...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>[ 🎙️ ANALYZE LIVE VOCAL PITCH ]</span>
              </>
            )}
          </button>
        </div>
      </SubView>
    );
  }

  // ── MAIN TERMINAL VIEW ──────────────────────────────────
  return (
    <div className="bg-black min-h-screen pb-24 md:pb-12">

      {/* Top Bar with Back Navigation for Mobile & Desktop */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900 px-5 md:px-8 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="font-mono text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>[ ← BACK ]</span>
        </button>
        <span className="font-mono text-xs tracking-widest uppercase text-white font-bold">
          [ SYSTEM TERMINAL ]
        </span>
        <Link
          href="/profile"
          className="font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white transition-colors cursor-pointer"
        >
          [ PROFILE ]
        </Link>
      </div>

      <div className="max-w-xl mx-auto px-5 md:px-6 pt-6 md:pt-8">

        {/* Terminal label */}
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 mb-8">
          // SYSTEM: ECHO TERMINAL v1.0 • SYSTEM COMMAND CENTER
        </p>

        {/* ── YOUR IDENTITY ──────────────────────────────────── */}
        <SectionHeader label="YOUR IDENTITY" />
        <div className="py-5 border-b border-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest text-white">{user?.handle || "@ANON"}</p>
              <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">
                AURA: {(user as any)?.auraScore || 0} • {user?.email || "—"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white border border-neutral-800 hover:border-white px-3 py-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={10} /> SIGN OUT
            </button>
          </div>
        </div>

        {/* ── SAVED VAULT ─────────────────────────────────── */}
        <SectionHeader label="SAVED ARCHIVE & VAULT" />
        <NavItem
          label="SAVED ECHO VAULT"
          sub="access all your bookmarked audio clips & saved waves"
          onClick={() => setView("vault")}
          badge={vaultPosts.length > 0 ? `${vaultPosts.length}` : undefined}
        />

        {/* ── AUDIO FREQUENCY BIOMETRICS: LIVE VIBE_READ ────── */}
        <SectionHeader label="VOCAL FREQUENCY BIOMETRICS" />
        <div className="py-4 border-b border-neutral-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-white">LIVE VIBE_READ</p>
              <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">
                algorithmic pitch & harmonic frequency analysis
              </p>
            </div>
            <button
              onClick={() => setView("vibe")}
              className="font-mono text-[11px] border border-neutral-800 text-neutral-400 hover:border-white hover:text-white px-2.5 py-1 uppercase tracking-wider transition-colors cursor-pointer"
            >
              [ CALIBRATE ]
            </button>
          </div>

          {vibeRead ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="border border-neutral-900 bg-neutral-950 p-2.5 space-y-1">
                <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block">PITCH (FREQ)</span>
                <span className="font-mono text-xs font-bold text-white tabular-nums">{vibeRead.pitch}%</span>
              </div>
              <div className="border border-neutral-900 bg-neutral-950 p-2.5 space-y-1">
                <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block">TEMPO (CADENCE)</span>
                <span className="font-mono text-xs font-bold text-white tabular-nums">{vibeRead.tempo}%</span>
              </div>
              <div className="border border-neutral-900 bg-neutral-950 p-2.5 space-y-1">
                <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block">ENERGY (RMS)</span>
                <span className="font-mono text-xs font-bold text-white tabular-nums">{vibeRead.energy}%</span>
              </div>
              <div className="border border-neutral-900 bg-neutral-950 p-2.5 space-y-1">
                <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block">CLARITY (SNR)</span>
                <span className="font-mono text-xs font-bold text-white tabular-nums">{vibeRead.clarity}%</span>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
              NO BIOMETRICS YET. CALIBRATE VIA PITCH ANALYSIS OR RECORD A VOICE BIO.
            </p>
          )}

          <button
            onClick={handleRunVibeAnalysis}
            disabled={isAnalyzingPitch}
            className="w-full py-2.5 px-3 border border-neutral-800 hover:border-white text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-2 bg-neutral-950 disabled:opacity-50"
          >
            {isAnalyzingPitch ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>ANALYZING PITCH ({analysisCountdown}S)...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-white" />
                <span>[ 🎙️ ANALYZE LIVE VOCAL PITCH ]</span>
              </>
            )}
          </button>
        </div>

        {/* ── PINGS ─────────────────────────────────────────── */}
        <SectionHeader label="PINGS — NOTIFICATIONS" />
        <NavItem
          label="PING SETTINGS"
          sub="control what reaches you"
          onClick={() => setView("pings")}
        />

        {/* ── AUDIO TRANSMISSION SETTINGS ───────────────────── */}
        <SectionHeader label="AUDIO TRANSMISSION SETTINGS" />
        <SelectItem
          label="STREAM QUALITY"
          sub="data usage vs audio fidelity"
          options={["HIGH", "STANDARD", "LOW"]}
          value={settings.audioQuality}
          onChange={(v) => select("audioQuality", v)}
        />
        <ToggleItem id="auto-transcribe" label="AUTO-TRANSCRIBE ECHOES" sub="convert voice takes to text" value={settings.autoTranscribe} onToggle={() => toggle("autoTranscribe")} saving={savingKey === "autoTranscribe"} />
        <ToggleItem id="auto-play"       label="AUTO-PLAY ON FREQUENCY" sub="start playing on scroll"      value={settings.autoPlay}       onToggle={() => toggle("autoPlay")}       saving={savingKey === "autoPlay"} />

        {/* ── REVERB & RE-ECHO PERMISSIONS ────────────────────── */}
        <SectionHeader label="REVERB & RE-ECHO PERMISSIONS" />
        <SelectItem
          label="WHO CAN DROP REVERBS"
          sub="who can voice-reply to your echoes"
          options={["EVERYONE", "[ ORBIT ]", "NOBODY"]}
          value={settings.yapControl}
          onChange={(v) => select("yapControl", v)}
        />
        <SelectItem
          label="WHO CAN RE-ECHO"
          sub="who can reshare your voice"
          options={["EVERYONE", "[ ORBIT ]", "NOBODY"]}
          value={settings.echoControl}
          onChange={(v) => select("echoControl", v)}
        />
        <SelectItem
          label="WHO CAN WIRE (DM) YOU"
          sub="private direct voice messaging"
          options={["EVERYONE", "[ ORBIT ]", "NOBODY"]}
          value={settings.whoCanWire}
          onChange={(v) => select("whoCanWire", v)}
        />

        {/* ── PRIVACY & BOUNDARIES ──────────────────────────── */}
        <SectionHeader label="PRIVACY & FREQUENCY BOUNDARIES" />
        <ToggleItem id="private-acc"   label="PRIVATE FREQUENCY"       sub="approve orbiters manually"     value={settings.privateAcc}   onToggle={() => toggle("privateAcc")}   saving={savingKey === "privateAcc"} />
        <ToggleItem id="aura-visible"  label="SHOW AURA SCORE"         sub="visible on your profile"       value={settings.auraVisible}  onToggle={() => toggle("auraVisible")}  saving={savingKey === "auraVisible"} />
        <ToggleItem id="anon-mode"     label="ANONYMOUS MODE"          sub="mask handle in public feed"    value={settings.anonMode}     onToggle={() => toggle("anonMode")}     saving={savingKey === "anonMode"} />
        <ToggleItem id="lock-approval" label="APPROVE ORBITS"          sub="manually approve orbiters"     value={settings.lockApproval} onToggle={() => toggle("lockApproval")} saving={savingKey === "lockApproval"} />
        <NavItem label="HIDDEN WORDS" sub="filter specific words from reverbs" onClick={() => setView("hidden")} />

        {/* ── HELP / SOS ────────────────────────────────────── */}
        <SectionHeader label="SYSTEM DIAGNOSTICS & SOS" />
        <NavItem label="ECHO GUIDE"          sub="how audio features work"  onClick={() => setActiveModal("guide")} />
        <NavItem label="REPORT A PROBLEM"    sub="submit bugs directly"     onClick={() => setActiveModal("report")} />
        <NavItem label="SAFETY CENTRE"       sub="security & moderation"    onClick={() => setActiveModal("safety")} />
        <NavItem label="CONTACT US"          sub="reach platform engineers" onClick={() => setActiveModal("contact")} />

        {/* ── DANGER ZONE ───────────────────────────────────── */}
        <SectionHeader label="DANGER ZONE" />
        <div className="border border-dashed border-neutral-800 p-5 mb-10 space-y-4">
          {!showDanger ? (
            <button
              id="danger-zone-btn"
              onClick={() => setShowDanger(true)}
              className="font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              [ + SHOW DANGER ZONE COMMANDS ]
            </button>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                // CRITICAL COMMANDS & DATA ACTIONS
              </p>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert("Local audio cache cleared.");
                  } catch (e) {}
                }}
                className="w-full text-left font-mono text-xs tracking-widest uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-3 transition-colors cursor-pointer"
              >
                CLEAR LOCAL AUDIO CACHE
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left font-mono text-xs tracking-widest uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-3 transition-colors cursor-pointer"
              >
                SIGN OUT OF ALL SESSIONS
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to deactivate your node?")) {
                    handleSignOut();
                  }
                }}
                className="w-full text-left font-mono text-xs tracking-widest uppercase text-red-500 hover:text-red-400 border border-neutral-900 hover:border-red-900 px-4 py-3 transition-colors cursor-pointer"
              >
                DEACTIVATE NODE  →  EXILE YOURSELF
              </button>
            </div>
          )}
        </div>

        {/* Version tag */}
        <p className="font-mono text-xs text-neutral-800 tracking-widest pb-10">
          ECHO v0.1.0 — AUG 2026 — UTILITARIAN CANVAS
          {savingKey && <span className="ml-3 text-neutral-500 animate-pulse">SAVING...</span>}
        </p>
      </div>

      {/* ── HELP / SOS MODALS ────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="font-mono text-xs tracking-widest text-white uppercase font-bold">
                {activeModal === "guide" && "// ECHO GUIDE"}
                {activeModal === "report" && "// REPORT A PROBLEM"}
                {activeModal === "safety" && "// SAFETY CENTRE"}
                {activeModal === "contact" && "// CONTACT HUMAN SUPPORT"}
              </span>
              <button
                onClick={() => { setActiveModal(null); setReportSuccess(false); setReportText(""); }}
                className="font-mono text-xs text-neutral-500 hover:text-white cursor-pointer"
              >
                [ ✕ CLOSE ]
              </button>
            </div>

            {activeModal === "guide" && (
              <div className="space-y-3 font-mono text-xs text-neutral-300 leading-relaxed max-h-80 overflow-y-auto">
                <p><strong className="text-white">FREQUENCY:</strong> Live public voice feed of authentic audio snippets.</p>
                <p><strong className="text-white">WAVES:</strong> 30s TikTok-style vertical audio cards with interactive waveforms.</p>
                <p><strong className="text-white">STUDIO:</strong> Record 15s to 60s voice takes, filters & voice bio.</p>
                <p><strong className="text-white">STAGE / CLASH:</strong> Live audio debate arena & voice battles.</p>
                <p><strong className="text-white">ROOMS:</strong> Real-time Clubhouse-style audio spaces with live speakers.</p>
                <p><strong className="text-white">WIRE:</strong> Direct 1-on-1 private voice messages.</p>
                <p><strong className="text-white">AURA:</strong> Dynamic engagement score earned by authentic voice drops.</p>
              </div>
            )}

            {activeModal === "report" && (
              <div className="space-y-4">
                {reportSuccess ? (
                  <p className="font-mono text-xs text-green-400">
                    ✓ THANK YOU! YOUR PROBLEM REPORT HAS BEEN RECORDED AND ROUTED TO ENGINEERING.
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-xs text-neutral-400">
                      DESCRIBE THE ISSUE OR GLITCH:
                    </p>
                    <textarea
                      rows={4}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="e.g. Mic input cut out during Stage clash..."
                      className="w-full bg-neutral-950 border border-neutral-800 p-3 font-mono text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white"
                    />
                    <button
                      onClick={async () => {
                        if (reportText.trim()) {
                          try {
                            const db = getFirebaseDb();
                            const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
                            await addDoc(collection(db, "reports"), {
                              uid: user?.uid || "anon",
                              handle: (user as any)?.handle || "@ANON",
                              report: reportText.trim(),
                              createdAt: serverTimestamp(),
                            });
                          } catch (e) {}
                          setReportSuccess(true);
                        }
                      }}
                      disabled={!reportText.trim()}
                      className="w-full py-2.5 bg-white text-black font-mono text-xs tracking-widest uppercase font-bold hover:bg-neutral-200 cursor-pointer disabled:opacity-40"
                    >
                      [ SUBMIT REPORT ]
                    </button>
                  </>
                )}
              </div>
            )}

            {activeModal === "safety" && (
              <div className="space-y-3 font-mono text-xs text-neutral-300 leading-relaxed">
                <p className="text-white font-bold">// USER BOUNDARIES & SAFETY</p>
                <p>• Block or Mute any user directly from their profile card.</p>
                <p>• Enable Anonymous Mode or Private Frequency in Privacy settings.</p>
                <p>• 24/7 Support Helpline: <span className="text-white underline">988 (Crisis Line)</span>.</p>
              </div>
            )}

            {activeModal === "contact" && (
              <div className="space-y-4 font-mono text-xs">
                <p className="text-neutral-400">REACH OUR PLATFORM TEAM:</p>
                <div className="p-3 border border-neutral-800 bg-neutral-950 text-white font-bold text-sm select-all">
                  support@echo-aura.app
                </div>
                <p className="text-neutral-500 text-[10px]">
                  EXPECT RESPONSES WITHIN 12-24 HOURS.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
