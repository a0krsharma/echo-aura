"use client";

/**
 * ECHO — The Terminal ( /terminal )
 * Settings as a command center. Text-based. No bubbly toggles.
 * [ ON ] / [ OFF ] — bracketed text is the only UI control.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Volume2, ArrowUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
type ToggleState = boolean;

interface ToggleItemProps {
  id: string;
  label: string;
  sub?: string;
  value: ToggleState;
  onToggle: () => void;
}

interface NavItemProps {
  label: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
}

const STASH_ITEMS: { id: string; handle: string; title: string; timeAgo: string }[] = [];
const TIME_CAPSULE_ITEMS: { id: string; title: string; duration: string; archived: string }[] = [];
const EXILED: string[] = [];
const DAY_ONES: string[] = [];

// ═══════════════════════════════════════════════════════════════
// COMPONENT: SectionHeader  // SECTION_NAME
// ═══════════════════════════════════════════════════════════════
function SectionHeader({ label }: { label: string }) {
  return (
    <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 pt-10 pb-4 border-t border-neutral-900 first:border-t-0 first:pt-0">
      // {label}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: ToggleItem  [ ON ] / [ OFF ]
// ═══════════════════════════════════════════════════════════════
function ToggleItem({ id, label, sub, value, onToggle }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-900">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-white">{label}</p>
        {sub && <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">{sub}</p>}
      </div>
      <button
        id={id}
        onClick={onToggle}
        className={`
          font-mono text-xs tracking-widest uppercase px-3 py-1.5 border
          transition-colors duration-150 cursor-pointer shrink-0 ml-4
          ${value
            ? "border-white text-white"
            : "border-neutral-800 text-neutral-600 hover:border-neutral-600"
          }
        `}
      >
        {value ? "[ ON ]" : "[ OFF ]"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: NavItem  — links to sub-pages / sections
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// COMPONENT: SelectItem  — multi-choice setting
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// PAGE: The Terminal
// ═══════════════════════════════════════════════════════════════
export default function TerminalPage() {

  // ── Ping settings ──────────────────────────────────────────
  const [pingPulses,    setPingPulses]    = useState(true);
  const [pingReverbs,   setPingReverbs]   = useState(true);
  const [pingOnFire,    setPingOnFire]    = useState(true);
  const [pingLockIns,   setPingLockIns]   = useState(false);
  const [pingStage,     setPingStage]     = useState(true);

  // ── Privacy settings ────────────────────────────────────────
  const [privateAcc,    setPrivateAcc]    = useState(false);
  const [auraVisible,   setAuraVisible]   = useState(true);
  const [anonMode,      setAnonMode]      = useState(false);
  const [lockApproval,  setLockApproval]  = useState(false);

  // ── Yap control ─────────────────────────────────────────────
  const [yapControl,    setYapControl]    = useState("EVERYONE");
  const [echoControl,   setEchoControl]   = useState("EVERYONE");
  const [whoCanWhisper, setWhoCanWhisper] = useState("ORBITERS");

  // ── Audio settings ──────────────────────────────────────────
  const [audioQuality,  setAudioQuality]  = useState("HIGH");
  const [autoTranscribe, setAutoTranscribe] = useState(false);
  const [autoPlay,      setAutoPlay]      = useState(true);

  // ── Danger zone state ────────────────────────────────────────
  const [showDanger, setShowDanger] = useState(false);

  // ── Stash view ──────────────────────────────────────────────
  const [view, setView] = useState<"main" | "stash" | "capsule" | "exiled" | "dayones" | "pings" | "hidden">("main");

  // ── Sub-views ───────────────────────────────────────────────
  if (view === "stash") return (
    <SubView title="THE STASH" onBack={() => setView("main")}>
      {STASH_ITEMS.length === 0 ? (
        <p className="font-serif text-base italic text-neutral-700 py-10 text-center">nothing stashed yet.</p>
      ) : STASH_ITEMS.map((item) => (
        <div key={item.id} className="py-6 border-b border-neutral-900">
          <p className="font-mono text-xs text-neutral-700 tracking-widest mb-2">{item.handle} • {item.timeAgo}</p>
          <p className="font-serif text-lg italic text-white leading-snug">{item.title}</p>
          <button className="font-mono text-xs text-neutral-600 tracking-widest uppercase hover:text-white transition-colors cursor-pointer mt-3">
            UNSTASH
          </button>
        </div>
      ))}
    </SubView>
  );

  if (view === "capsule") return (
    <SubView title="TIME CAPSULE" onBack={() => setView("main")}>
      <p className="font-mono text-xs text-neutral-700 tracking-widest mb-6">
        ARCHIVED ECHOES — ONLY YOU CAN SEE THESE
      </p>
      {TIME_CAPSULE_ITEMS.length === 0 ? (
        <p className="font-serif text-base italic text-neutral-700 text-center py-10">capsule is empty.</p>
      ) : TIME_CAPSULE_ITEMS.map((item) => (
        <div key={item.id} className="py-6 border-b border-neutral-900">
          <p className="font-mono text-xs text-neutral-700 tracking-widest mb-2">ARCHIVED {item.archived}</p>
          <p className="font-serif text-lg italic text-white leading-snug mb-4">{item.title}</p>
          <div className="flex gap-4">
            <button className="font-mono text-xs text-neutral-600 tracking-widest uppercase hover:text-white transition-colors cursor-pointer">RESTORE</button>
            <button className="font-mono text-xs text-neutral-600 tracking-widest uppercase hover:text-white transition-colors cursor-pointer">DELETE</button>
          </div>
        </div>
      ))}
    </SubView>
  );

  if (view === "exiled") return (
    <SubView title="EXILED" onBack={() => setView("main")}>
      <p className="font-mono text-xs text-neutral-700 tracking-widest mb-6">
        THESE VOICES CANNOT REACH YOU
      </p>
      {EXILED.length === 0 ? (
        <p className="font-serif text-base italic text-neutral-700 text-center py-10">no one exiled yet.</p>
      ) : EXILED.map((handle) => (
        <div key={handle} className="flex items-center justify-between py-4 border-b border-neutral-900">
          <span className="font-mono text-xs tracking-widest text-neutral-500">{handle}</span>
          <button className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white border border-neutral-900 hover:border-neutral-700 px-3 py-1.5 transition-colors cursor-pointer">
            UN-EXILE
          </button>
        </div>
      ))}
    </SubView>
  );

  if (view === "dayones") return (
    <SubView title="DAY ONES" onBack={() => setView("main")}>
      <p className="font-mono text-xs text-neutral-700 tracking-widest mb-6">
        YOUR INNER CIRCLE — SEES EXCLUSIVE SPARKS
      </p>
      {DAY_ONES.length === 0 ? (
        <p className="font-serif text-base italic text-neutral-700 text-center py-10">
          no day ones yet. lock in with someone first.
        </p>
      ) : null}
    </SubView>
  );

  if (view === "hidden") return (
    <SubView title="HIDDEN WORDS" onBack={() => setView("main")}>
      <p className="font-mono text-xs text-neutral-700 tracking-widest mb-8">
        REVERBS CONTAINING THESE WORDS WILL BE HIDDEN FROM YOU
      </p>
      <div className="border-b border-neutral-900 pb-4 mb-6">
        <input
          type="text"
          placeholder="add a word or phrase..."
          className="w-full bg-transparent outline-none font-mono text-xs tracking-widest uppercase text-white placeholder:text-neutral-800 placeholder:normal-case placeholder:tracking-normal"
        />
      </div>
      <p className="font-mono text-xs text-neutral-700 tracking-widest">NO HIDDEN WORDS YET</p>
    </SubView>
  );

  if (view === "pings") return (
    <SubView title="PINGS" onBack={() => setView("main")}>
      <ToggleItem id="ping-pulses"  label="NEW PULSES ON YOUR ECHOES"  sub="someone vibed to you"         value={pingPulses}  onToggle={() => setPingPulses(p => !p)} />
      <ToggleItem id="ping-reverbs" label="NEW REVERBS / YAPS"          sub="someone dropped a reverb"    value={pingReverbs} onToggle={() => setPingReverbs(p => !p)} />
      <ToggleItem id="ping-fire"    label="YOU'RE ON FIRE"              sub="when your echo goes viral"   value={pingOnFire}  onToggle={() => setPingOnFire(p => !p)} />
      <ToggleItem id="ping-lockins" label="NEW ORBITERS"                sub="someone locked in with you"  value={pingLockIns} onToggle={() => setPingLockIns(p => !p)} />
      <ToggleItem id="ping-stage"   label="STAGE INVITES"               sub="clash / battle requests"     value={pingStage}   onToggle={() => setPingStage(p => !p)} />
    </SubView>
  );

  // ── MAIN TERMINAL VIEW ──────────────────────────────────────
  return (
    <div className="bg-black min-h-screen pb-24 md:pb-0">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <Link href="/" className="text-neutral-600 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
        <span className="font-mono text-xs tracking-widest uppercase text-white">THE TERMINAL</span>
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
              <p className="font-mono text-xs tracking-widest text-white">@ANON_0000</p>
              <p className="font-mono text-xs text-neutral-700 tracking-widest mt-0.5">AURA: 0 • JOINED AUG 2026</p>
            </div>
            <button className="font-mono text-xs tracking-widest uppercase text-black bg-white px-3 py-1.5 hover:opacity-80 transition-opacity cursor-pointer">
              CLAIM HANDLE
            </button>
          </div>
        </div>

        {/* ── THE STASH ─────────────────────────────────────── */}
        <SectionHeader label="THE STASH" />
        <NavItem
          label="STASHED ECHOES"
          sub="your saved posts"
          badge={STASH_ITEMS.length}
          onClick={() => setView("stash")}
        />

        {/* ── TIME CAPSULE ──────────────────────────────────── */}
        <SectionHeader label="TIME CAPSULE" />
        <NavItem
          label="ARCHIVED ECHOES"
          sub="only you can see these"
          badge={TIME_CAPSULE_ITEMS.length}
          onClick={() => setView("capsule")}
        />

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
          value={audioQuality}
          onChange={setAudioQuality}
        />
        <ToggleItem id="auto-transcribe" label="AUTO-TRANSCRIBE REVERBS"  sub="convert yaps to text"          value={autoTranscribe} onToggle={() => setAutoTranscribe(p => !p)} />
        <ToggleItem id="auto-play"       label="AUTO-PLAY ON FREQUENCY"   sub="start playing on scroll"       value={autoPlay}       onToggle={() => setAutoPlay(p => !p)} />

        {/* ── YAP CONTROL ───────────────────────────────────── */}
        <SectionHeader label="YAP CONTROL — REVERB PERMISSIONS" />
        <SelectItem
          label="WHO CAN DROP REVERB"
          sub="who can voice-reply to your echoes"
          options={["EVERYONE", "ORBITERS", "DAY ONES", "NOBODY"]}
          value={yapControl}
          onChange={setYapControl}
        />
        <SelectItem
          label="WHO CAN PUT ON / ECHO"
          sub="who can repost your voice"
          options={["EVERYONE", "ORBITERS", "NOBODY"]}
          value={echoControl}
          onChange={setEchoControl}
        />
        <SelectItem
          label="WHO CAN WHISPER YOU"
          sub="private audio messages"
          options={["EVERYONE", "ORBITERS", "DAY ONES"]}
          value={whoCanWhisper}
          onChange={setWhoCanWhisper}
        />

        {/* ── PRIVACY & BOUNDARIES ──────────────────────────── */}
        <SectionHeader label="PRIVACY & BOUNDARIES" />
        <ToggleItem id="private-acc"  label="PRIVATE FREQUENCY"         sub="approve orbiters manually"       value={privateAcc}   onToggle={() => setPrivateAcc(p => !p)} />
        <ToggleItem id="aura-visible" label="SHOW AURA SCORE"           sub="visible on your profile"         value={auraVisible}  onToggle={() => setAuraVisible(p => !p)} />
        <ToggleItem id="anon-mode"    label="ANONYMOUS MODE"            sub="mask handle in public feed"      value={anonMode}     onToggle={() => setAnonMode(p => !p)} />
        <ToggleItem id="lock-approval" label="APPROVE LOCK-INS"         sub="manually approve orbiters"       value={lockApproval} onToggle={() => setLockApproval(p => !p)} />
        <NavItem label="DAY ONES"       sub="your inner circle"           badge={DAY_ONES.length || undefined} onClick={() => setView("dayones")} />
        <NavItem label="EXILED"         sub="voices you have silenced"    badge={EXILED.length || undefined}   onClick={() => setView("exiled")} />
        <NavItem label="HIDDEN WORDS"   sub="words filtered from reverbs"                                      onClick={() => setView("hidden")} />

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
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: SubView — wraps inner sections with back nav
// ═══════════════════════════════════════════════════════════════
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
