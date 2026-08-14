"use client";

/**
 * ECHO — Dynamic User Profile ( /[handle] )
 * Loads real Firestore user data for any handle.
 * Falls back to KNOWN profiles or anonymous defaults.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, Volume2, Lock, Mic2, Users, MessageSquare, UserPlus, UserCheck } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { startOrGetConversation } from "@/lib/wire";
import { followUser, unfollowUser, subscribeToFollowStatus } from "@/lib/follows";
import { useAuth } from "@/app/components/AuthProvider";
import { ChatWidget } from "@/app/components/ChatWidget";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface FirestoreUser {
  uid: string;
  handle: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  auraScore?: number;
  badges?: string[];
  bio?: string;
  voiceBioUrl?: string;
  createdAt?: any;
}

interface UserPost {
  id: string;
  caption: string;
  audioUrl: string;
  duration: string;
  durationSec: number;
  pulseCount: number;
  createdAt: any;
}

const BADGE_NAMES: Record<string, string> = {
  "🐐": "THE GOAT", "👑": "ROYALTY", "💀": "ROASTER",
  "🔥": "ON FIRE",  "⚡": "FAST RISER", "🎙": "OG VOICE",
};

// ─────────────────────────────────────────────────────────────────────────────
// WAVEFORM
// ─────────────────────────────────────────────────────────────────────────────
const WAVE_H = [4,10,18,24,14,28,10,22,6,26,16,20,8,28,14,22,10,26,6,18,24,12,30,8,20];
function Waveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-8" aria-hidden>
      {WAVE_H.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}px`, width: "2px", backgroundColor: "white",
            animationDelay: playing ? `${i * 0.04}s` : undefined,
            animationDuration: playing ? `${0.5 + (i % 5) * 0.1}s` : undefined,
          }}
          className={playing ? "waveform-bar" : "opacity-30"}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI AUDIO PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function MiniPlayer({ audioUrl, duration, durationSec }: { audioUrl: string; duration: string; durationSec: number }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(Math.max(1, durationSec || 15));
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // CRITICAL FIX: create Audio on mount, set preload=auto, do NOT inject
  // Cloudinary transformations — they cause range-request streaming failures
  // that stop playback after ~1 second.
  useEffect(() => {
    if (!audioUrl) return;
    const a = new Audio();
    a.preload = "auto"; // buffer entire file upfront
    audioRef.current = a;
    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration));
    });
    a.addEventListener("timeupdate", () => setCurrent(a.currentTime));
    a.addEventListener("ended",       () => { setPlaying(false); setCurrent(0); a.currentTime = 0; });
    a.addEventListener("playing",     () => { setPlaying(true); setLoading(false); });
    a.addEventListener("error",       () => { setPlaying(false); setLoading(false); });
    a.src = audioUrl; // raw URL — no transformation injection
    a.load();
    return () => { a.pause(); a.src = ""; audioRef.current = null; };
  }, [audioUrl]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else {
      setLoading(true);
      try { await a.play(); }
      catch { setLoading(false); }
    }
  };

  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;
  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2,"00");
    const sec = Math.floor(s % 60).toString().padStart(2,"0");
    return `${m}:${sec}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          disabled={loading}
          className="font-mono text-xs tracking-widest uppercase text-white hover:opacity-50 transition-opacity cursor-pointer shrink-0 disabled:opacity-40"
        >
          {loading ? "..." : playing ? "⏸ PAUSE" : "▶ PLAY"}
        </button>
        <div className="flex-1 overflow-hidden"><Waveform playing={playing} /></div>
        <span className="font-mono text-xs text-neutral-600 tracking-widest shrink-0 tabular-nums">{fmt(current)} / {fmt(dur)}</span>
      </div>
      <div className="w-full h-px bg-neutral-900 relative overflow-hidden cursor-pointer" onClick={(e) => {
        const a = audioRef.current;
        if (!a || !isFinite(a.duration)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
        setCurrent(a.currentTime);
      }}>
        <div className="absolute left-0 top-0 h-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE PILL
// ─────────────────────────────────────────────────────────────────────────────
function BadgePill({ emoji }: { emoji: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative inline-block">
      <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="text-lg cursor-default select-none" aria-label={BADGE_NAMES[emoji] ?? "RARE"}>
        {emoji}
      </button>
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-black border border-neutral-800 px-3 py-1.5 whitespace-nowrap pointer-events-none">
          <p className="font-mono text-xs tracking-widest uppercase text-white">{BADGE_NAMES[emoji] ?? "RARE"}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST ITEM
// ─────────────────────────────────────────────────────────────────────────────
function PostItem({ post }: { post: UserPost }) {
  const [pulsed, setPulsed] = useState(false);
  const [pulses, setPulses] = useState(post.pulseCount || 0);
  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);

  const timeAgo = () => {
    if (!post.createdAt?.seconds) return "";
    const diff = Date.now() / 1000 - post.createdAt.seconds;
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
  };

  return (
    <article className="py-8 border-b border-neutral-900 space-y-4">
      <p className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase">{timeAgo()}</p>
      <p className="font-serif text-xl italic text-white leading-snug">"{post.caption}"</p>
      <MiniPlayer audioUrl={post.audioUrl} duration={post.duration} durationSec={post.durationSec} />
      <div className="flex items-center gap-5 pt-1">
        <button
          onClick={() => { setPulsed(p => !p); setPulses(n => pulsed ? n - 1 : n + 1); }}
          className="flex items-center gap-1.5 cursor-pointer transition-colors"
          style={{ color: pulsed ? "#fff" : "#737373" }}
        >
          <ArrowUp size={12} strokeWidth={1.5} />
          <span className="font-mono text-xs tracking-widest uppercase">{fmt(pulses)} PULSES</span>
        </button>
        <div className="flex items-center gap-1.5 text-neutral-600">
          <Volume2 size={12} strokeWidth={1.5} />
          <span className="font-mono text-xs tracking-widest uppercase">0 [ REPLIES ]</span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HandlePage({ params }: { params: { handle: string } }) {
  const { handle } = params;
  const { user } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<FirestoreUser | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [orbiting, setOrbiting] = useState(false);
  const [startingWire, setStartingWire] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const db = getFirebaseDb();
        const handleWithAt = handle.startsWith("@") ? handle : `@${handle}`;
        const handleWithoutAt = handle.replace(/^@/, "");

        // Query users collection by handle (try both with and without @)
        const q1 = query(
          collection(db, "users"),
          where("handle", "==", handleWithAt)
        );
        const q2 = query(
          collection(db, "users"),
          where("handle", "==", handleWithoutAt)
        );

        let snap = await getDocs(q1);
        if (snap.empty) snap = await getDocs(q2);

        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = { uid: doc.id, ...doc.data() } as FirestoreUser;
          setUserData(data);

          // Load their posts with client-side sorting to avoid missing composite index errors
          const postsQ = query(
            collection(db, "posts"),
            where("authorUid", "==", data.uid),
            limit(50)
          );
          const postsSnap = await getDocs(postsQ);
          const posts: UserPost[] = postsSnap.docs.map(d => ({
            id: d.id,
            caption: (d.data().caption as string) || "",
            audioUrl: (d.data().audioUrl as string) || "",
            duration: (d.data().duration as string) || "00:15",
            durationSec: (d.data().durationSec as number) || 15,
            pulseCount: (d.data().pulseCount as number) || 0,
            createdAt: d.data().createdAt,
          }));
          posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setUserPosts(posts);
        } else {
          // User not in Firestore — show anonymous shell
          setUserData({
            uid: "anon",
            handle: `@${handleWithoutAt}`,
            auraScore: 0,
            badges: [],
          });
        }
      } catch (err) {
        console.warn("[Profile] Could not load user data:", err);
        setUserData({
          uid: "anon",
          handle: `@${handle}`,
          auraScore: 0,
          badges: [],
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [handle]);

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <p className="font-mono text-xs tracking-widest text-neutral-700 uppercase animate-pulse">
          LOADING FREQUENCY...
        </p>
      </div>
    );
  }

  const profile = userData!;
  const displayHandle = profile ? (profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`) : "";
  const aura = profile?.auraScore ?? 0;
  const badges = profile?.badges ?? [];

  useEffect(() => {
    if (!user?.uid || !userData?.uid || userData.uid === "anon") return;
    const unsub = subscribeToFollowStatus(user.uid, userData.uid, setOrbiting);
    return () => unsub();
  }, [user?.uid, userData?.uid]);

  const handleToggleOrbit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!userData || userData.uid === "anon" || userData.uid === user.uid) return;
    try {
      if (orbiting) {
        await unfollowUser(user.uid, userData.uid);
      } else {
        await followUser(user.uid, user.handle || "@ANON", userData.uid, userData.handle);
      }
    } catch (err) {
      console.error("[Profile] Toggle orbit error:", err);
    }
  };

  const handleStartWire = async () => {
    if (!user || profile.uid === "anon" || profile.uid === user.uid) return;
    setStartingWire(true);
    try {
      const convId = await startOrGetConversation(
        user.uid,
        user.handle || "@ANON",
        profile.uid,
        profile.handle
      );
      router.push(`/wire?c=${convId}`);
    } catch (err) {
      console.error("Failed to start wire:", err);
    } finally {
      setStartingWire(false);
    }
  };

  const canStartWire = user && profile.uid !== "anon" && profile.uid !== user.uid;

  return (
    <div className="bg-black min-h-screen pb-28 md:pb-0 text-white">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <Link href="/" className="text-neutral-600 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
        <span className="font-mono text-xs tracking-widest uppercase text-white">PROFILE</span>
        <div className="w-4" />
      </div>

      <div className="max-w-xl mx-auto px-5 md:px-6 pt-8 md:pt-12">

        {/* Handle + Orbit */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="font-mono text-2xl tracking-widest text-white mb-2">{displayHandle}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {badges.map(b => <BadgePill key={b} emoji={b} />)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canStartWire && (
              <button
                onClick={handleStartWire}
                disabled={startingWire}
                className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase border border-neutral-800 px-3 py-2 hover:border-white hover:text-white transition-colors cursor-pointer shrink-0 text-neutral-500 disabled:opacity-30"
              >
                <MessageSquare size={10} strokeWidth={1.5} />
                {startingWire ? "STARTING..." : "[ WIRE ]"}
              </button>
            )}
            {user && profile.uid !== "anon" && profile.uid !== user.uid && (
              <button
                onClick={handleToggleOrbit}
                className={`flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase border px-3 py-2 transition-colors cursor-pointer shrink-0 ${
                  orbiting
                    ? "border-white text-white font-bold"
                    : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                }`}
              >
                {orbiting ? <UserCheck size={12} /> : <UserPlus size={12} />}
                {orbiting ? "[ ORBITING ]" : "[ ORBIT ]"}
              </button>
            )}
          </div>
        </div>

        {/* Aura Score */}
        <div className="mb-8">
          <p className="font-mono text-4xl text-white tracking-widest leading-none">
            {aura >= 1000 ? `${(aura / 1000).toFixed(1)}K` : aura}
          </p>
          <p className="font-mono text-xs text-neutral-700 tracking-widest uppercase mt-1">[ AURA ]</p>
        </div>

        {/* Bio */}
        {profile.bio ? (
          <p className="font-serif text-lg italic text-neutral-400 leading-relaxed mb-8 max-w-sm">
            {profile.bio}
          </p>
        ) : (
          <p className="font-serif text-lg italic text-neutral-700 leading-relaxed mb-8 max-w-sm">
            this voice hasn't spoken yet.
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 border border-neutral-900 mb-8">
          {[
            { label: "ECHOES", value: String(userPosts.length) },
            { label: "JOINED", value: profile.createdAt?.seconds
                ? new Date(profile.createdAt.seconds * 1000).toLocaleString("en", { month: "short", year: "numeric" }).toUpperCase()
                : "2026"
            },
          ].map(({ label, value }, i) => (
            <div key={label} className={`py-5 text-center ${i === 0 ? "border-r border-neutral-900" : ""}`}>
              <p className="font-mono text-base text-white tracking-widest">{value}</p>
              <p className="font-mono text-xs text-neutral-700 tracking-widest uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Echoes Feed */}
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 mb-2">// THEIR ECHOES</p>
        {userPosts.length > 0
          ? userPosts.map(p => <PostItem key={p.id} post={p} />)
          : (
            <div className="py-20 text-center">
              <p className="font-serif text-base italic text-neutral-700">
                this voice hasn't dropped anything yet.
              </p>
            </div>
          )
        }

      </div>
      {canStartWire && (
        <ChatWidget targetUid={profile.uid} targetHandle={displayHandle} />
      )}
    </div>
  );
}
