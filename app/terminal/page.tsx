"use client";

/**
 * ECHO — The Terminal ( /terminal )
 * Settings as a command center. All toggles persist to Firestore.
 * [ ON ] / [ OFF ] — bracketed text is the only UI control.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2, LogOut } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/app/components/AuthProvider";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────
type ToggleState = boolean;

import { type UserSettings as Settings, DEFAULT_SETTINGS } from "@/lib/userDoc";


// ─── Persist a single setting to Firestore ────────────────
async function persistSetting(uid: string, key: keyof Settings, value: any) {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { [`settings.${key}`]: value });
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
  const [view, setView] = useState<"main" | "pings" | "hidden">("main");
  const [newWord, setNewWord] = useState("");

  // ── Load settings from Firestore on mount ───────────────
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
      } catch (e) {
        console.error("[Terminal] Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

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

  // ── MAIN TERMINAL VIEW ──────────────────────────────────
  return (
    <div className="bg-black min-h-screen pb-24 md:pb-0">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <Link href="/" className="text-neutral-600 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
        <span className="font-mono text-xs tracking-widest uppercase text-white">[ TERMINAL ]</span>
        <div className="w-4" />
      </div>

      <div className="max-w-xl mx-auto px-5 md:px-6 pt-8 md:pt-12">

        {/* Terminal label */}
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 mb-8">
          // SYSTEM: ECHO TERMINAL v1.0
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

        {/* ── PINGS ─────────────────────────────────────────── */}
        <SectionHeader label="PINGS — NOTIFICATIONS" />
        <NavItem
          label="PING SETTINGS"
          sub="control what reaches you"
          onClick={() => setView("pings")}
        />

        {/* ── AUDIO SETTINGS ────────────────────────────────── */}
        <SectionHeader label="AUDIO SETTINGS" />
        <SelectItem
          label="STREAM QUALITY"
          sub="data usage vs fidelity"
          options={["HIGH", "STANDARD", "LOW"]}
          value={settings.audioQuality}
          onChange={(v) => select("audioQuality", v)}
        />
        <ToggleItem id="auto-transcribe" label="AUTO-TRANSCRIBE [ REPLIES ]"  sub="convert yaps to text"         value={settings.autoTranscribe} onToggle={() => toggle("autoTranscribe")} saving={savingKey === "autoTranscribe"} />
        <ToggleItem id="auto-play"       label="AUTO-PLAY ON FREQUENCY"   sub="start playing on scroll"       value={settings.autoPlay}       onToggle={() => toggle("autoPlay")}       saving={savingKey === "autoPlay"} />

        {/* ── YAP CONTROL ───────────────────────────────────── */}
        <SectionHeader label="YAP CONTROL — [ REPLY ] PERMISSIONS" />
        <SelectItem
          label="WHO CAN DROP [ REPLY ]"
          sub="who can voice-reply to your echoes"
          options={["EVERYONE", "[ ORBIT ]", "DAY ONES", "NOBODY"]}
          value={settings.yapControl}
          onChange={(v) => select("yapControl", v)}
        />
        <SelectItem
          label="WHO CAN PUT ON / ECHO"
          sub="who can repost your voice"
          options={["EVERYONE", "[ ORBIT ]", "NOBODY"]}
          value={settings.echoControl}
          onChange={(v) => select("echoControl", v)}
        />
        <SelectItem
          label="WHO CAN [ WIRE ] YOU"
          sub="private audio messages"
          options={["EVERYONE", "[ ORBIT ]", "DAY ONES"]}
          value={settings.whoCanWire}
          onChange={(v) => select("whoCanWire", v)}
        />

        {/* ── PRIVACY & BOUNDARIES ──────────────────────────── */}
        <SectionHeader label="PRIVACY & BOUNDARIES" />
        <ToggleItem id="private-acc"   label="PRIVATE FREQUENCY"       sub="approve orbiters manually"     value={settings.privateAcc}   onToggle={() => toggle("privateAcc")}   saving={savingKey === "privateAcc"} />
        <ToggleItem id="aura-visible"  label="SHOW AURA SCORE"         sub="visible on your profile"       value={settings.auraVisible}  onToggle={() => toggle("auraVisible")}  saving={savingKey === "auraVisible"} />
        <ToggleItem id="anon-mode"     label="ANONYMOUS MODE"          sub="mask handle in public feed"    value={settings.anonMode}     onToggle={() => toggle("anonMode")}     saving={savingKey === "anonMode"} />
        <ToggleItem id="lock-approval" label="APPROVE LOCK-INS"        sub="manually approve orbiters"     value={settings.lockApproval} onToggle={() => toggle("lockApproval")} saving={savingKey === "lockApproval"} />
        <NavItem label="HIDDEN WORDS" sub="words filtered from reverbs" onClick={() => setView("hidden")} />

        {/* ── HELP / SOS ────────────────────────────────────── */}
        <SectionHeader label="HELP / SOS" />
        <NavItem label="ECHO GUIDE"          sub="how everything works"     href="#" />
        <NavItem label="REPORT A PROBLEM"    sub="bugs, crashes, weirdness" href="#" />
        <NavItem label="SAFETY CENTRE"       sub="mental health & support"  href="#" />
        <NavItem label="CONTACT US"          sub="reach the humans behind echo" href="#" />

        {/* ── DANGER ZONE ───────────────────────────────────── */}
        <SectionHeader label="DANGER ZONE" />
        <div className="border border-dashed border-neutral-800 p-5 mb-10">
          {!showDanger ? (
            <button
              id="danger-zone-btn"
              onClick={() => setShowDanger(true)}
              className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer"
            >
              [ SHOW DANGER ZONE ]
            </button>
          ) : (
            <div className="space-y-4">
              <p className="font-mono text-xs text-neutral-700 tracking-widest">
                THESE ACTIONS ARE IRREVERSIBLE.
              </p>
              <button className="w-full text-left font-mono text-xs tracking-widest uppercase text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-3 transition-colors cursor-pointer">
                DEACTIVATE ACCOUNT  →  EXILE YOURSELF
              </button>
              <button className="w-full text-left font-mono text-xs tracking-widest uppercase text-red-900 hover:text-red-500 border border-neutral-900 hover:border-red-900 px-4 py-3 transition-colors cursor-pointer">
                DELETE ACCOUNT  →  PURGE EVERYTHING
              </button>
            </div>
          )}
        </div>

        {/* Version tag */}
        <p className="font-mono text-xs text-neutral-800 tracking-widest pb-10">
          ECHO v0.1.0 — AUG 2026 — UTILITARIAN CANVAS
          {savingKey && <span className="ml-3 text-neutral-600 animate-pulse">SAVING...</span>}
        </p>
      </div>
    </div>
  );
}
