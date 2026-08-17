"use client";

/**
 * ECHO — Dynamic User Profile ( /[handle] )
 * Comprehensive public profile with:
 * - Direct [ WIRE ], [ SHARE PROFILE ], [ ORBIT / ORBITING ] actions
 * - Private vs. Public account access wall (Instagram/Twitter style)
 * - Clickable [ ORBITERS ] and [ ORBITING ] lists modal
 * - Voice Bio intro player (Instagram/Snap style)
 * - Clubhouse-style live room presence banner
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUp, Volume2, Lock, Mic2, Users,
  MessageSquare, UserPlus, UserCheck, Share2, Radio,
  Play, Pause, Flame, X, Sparkles, Shield, Check
} from "lucide-react";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { startOrGetConversation } from "@/lib/wire";
import {
  followUser, unfollowUser, subscribeToFollowStatus,
  subscribeToFollowers, subscribeToFollowing, type Follow
} from "@/lib/follows";
import { useAuth } from "@/app/components/AuthProvider";
import { ChatWidget } from "@/app/components/ChatWidget";
import { getPlayableUrl } from "@/lib/cloudinary";

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
  isPrivate?: boolean;
  settings?: {
    privateAcc?: boolean;
    auraVisible?: boolean;
  };
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

interface LiveRoomInfo {
  id: string;
  name: string;
  isLive: boolean;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !audioUrl) return;
    const playableUrl = getPlayableUrl(audioUrl);
    const a = new Audio(playableUrl);
    a.preload = "auto";
    audioRef.current = a;
    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration));
    });
    a.addEventListener("timeupdate", () => setCurrent(a.currentTime));
    a.addEventListener("ended", () => {
      setPlaying(false);
      setCurrent(0);
    });
    return () => {
      a.pause();
      a.src = "";
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(console.error);
      setPlaying(true);
    }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s/60).toString().padStart(2,"0")}:${Math.floor(s%60).toString().padStart(2,"0")}`;
  };

  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;

  return (
    <div className="border border-neutral-900 bg-neutral-950 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 border border-white text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0"
        >
          {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex-1 overflow-hidden"><Waveform playing={playing} /></div>
        <span className="font-mono text-xs text-neutral-600 tracking-widest shrink-0 tabular-nums">
          {fmt(current)} / {fmt(dur)}
        </span>
      </div>
      <div
        className="w-full h-1 bg-neutral-900 relative overflow-hidden cursor-pointer"
        onClick={(e) => {
          const a = audioRef.current;
          if (!a || !isFinite(a.duration)) return;
          const rect = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
          setCurrent(a.currentTime);
        }}
      >
        <div className="absolute left-0 top-0 h-full bg-white transition-all duration-100" style={{ width: `${pct}%` }} />
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
    <article className="py-6 border-b border-neutral-900 space-y-3">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
        <span>{timeAgo()}</span>
        <span>[ ECHO ]</span>
      </div>
      <p className="font-serif text-lg italic text-white leading-snug">"{post.caption}"</p>
      <MiniPlayer audioUrl={post.audioUrl} duration={post.duration} durationSec={post.durationSec} />
      <div className="flex items-center gap-5 pt-1">
        <button
          onClick={() => { setPulsed(p => !p); setPulses(n => pulsed ? n - 1 : n + 1); }}
          className="flex items-center gap-1.5 cursor-pointer transition-colors font-mono text-xs tracking-widest uppercase"
          style={{ color: pulsed ? "#fff" : "#737373" }}
        >
          <ArrowUp size={12} strokeWidth={1.5} />
          <span>{fmt(pulses)} PULSES</span>
        </button>
        <div className="flex items-center gap-1.5 text-neutral-600 font-mono text-xs tracking-widest uppercase">
          <Volume2 size={12} strokeWidth={1.5} />
          <span>[ AUDIO ]</span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HandlePage({ params }: { params?: { handle?: string } }) {
  const routeParams = useParams();
  const rawHandle = (params?.handle || (routeParams?.handle as string) || "").trim();
  const handle = rawHandle ? decodeURIComponent(rawHandle) : "";
  const { user } = useAuth();
  const router = useRouter();

  const [userData, setUserData] = useState<FirestoreUser | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [orbiting, setOrbiting] = useState(false);
  const [startingWire, setStartingWire] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Followers & Following Lists
  const [followersList, setFollowersList] = useState<Follow[]>([]);
  const [followingList, setFollowingList] = useState<Follow[]>([]);
  const [followsModal, setFollowsModal] = useState<"ORBITERS" | "ORBITING" | null>(null);

  // Live Room Presence
  const [liveRoom, setLiveRoom] = useState<LiveRoomInfo | null>(null);

  // Voice Bio playback
  const [playingVoiceBio, setPlayingVoiceBio] = useState(false);
  const voiceBioAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!handle) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        const handleWithAt = handle.startsWith("@") ? handle : `@${handle}`;
        const handleWithoutAt = handle.replace(/^@/, "");

        // Query users collection by handle
        const q1 = query(collection(db, "users"), where("handle", "==", handleWithAt));
        const q2 = query(collection(db, "users"), where("handle", "==", handleWithoutAt));

        let snap = await getDocs(q1);
        if (snap.empty) snap = await getDocs(q2);

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = { uid: docSnap.id, ...docSnap.data() } as FirestoreUser;
          setUserData(data);

          // Load their posts
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

          // Check if user is currently live hosting an active audio room
          const roomsQ = query(
            collection(db, "rooms"),
            where("hostUid", "==", data.uid),
            where("isLive", "==", true),
            limit(1)
          );
          const roomSnap = await getDocs(roomsQ);
          if (!roomSnap.empty) {
            const rDoc = roomSnap.docs[0];
            setLiveRoom({
              id: rDoc.id,
              name: rDoc.data().name || "Live Room",
              isLive: true,
            });
          }
        } else {
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

  // Real-time follow status
  useEffect(() => {
    if (!user?.uid || !userData?.uid || userData.uid === "anon") return;
    const unsub = subscribeToFollowStatus(user.uid, userData.uid, setOrbiting);
    return () => unsub();
  }, [user?.uid, userData?.uid]);

  // Real-time followers and following lists
  useEffect(() => {
    if (!userData?.uid || userData.uid === "anon") return;
    const unsubFollowers = subscribeToFollowers(userData.uid, setFollowersList);
    const unsubFollowing = subscribeToFollowing(userData.uid, setFollowingList);
    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [userData?.uid]);

  // Voice bio audio handler
  useEffect(() => {
    if (!userData?.voiceBioUrl) return;
    const playableUrl = getPlayableUrl(userData.voiceBioUrl);
    const a = new Audio(playableUrl);
    voiceBioAudioRef.current = a;
    a.addEventListener("ended", () => setPlayingVoiceBio(false));
    return () => {
      a.pause();
      a.src = "";
    };
  }, [userData?.voiceBioUrl]);

  const toggleVoiceBio = () => {
    const a = voiceBioAudioRef.current;
    if (!a) return;
    if (playingVoiceBio) {
      a.pause();
      setPlayingVoiceBio(false);
    } else {
      a.play().catch(console.error);
      setPlayingVoiceBio(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <p className="font-mono text-xs tracking-widest text-neutral-700 uppercase animate-pulse">
          [ LOADING FREQUENCY... ]
        </p>
      </div>
    );
  }

  const profile = userData!;
  const displayHandle = profile ? (profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`) : "";
  const aura = profile?.auraScore ?? 0;
  const badges = profile?.badges ?? [];
  const isOwnProfile = user?.uid === profile.uid;
  const isPrivate = Boolean(profile.isPrivate || profile.settings?.privateAcc);
  const isLocked = isPrivate && !isOwnProfile && !orbiting;

  const handleToggleOrbit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!userData || userData.uid === "anon" || isOwnProfile) return;
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
    if (!user) {
      router.push("/login");
      return;
    }
    if (profile.uid === "anon" || isOwnProfile) return;
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

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/${profile.handle.replace(/^@/, "")}`;
    const shareData = {
      title: `Echo Profile: ${displayHandle}`,
      text: `Listen to audio drops and live takes from ${displayHandle} on Echo`,
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {}
    }
  };

  const canStartWire = user && profile.uid !== "anon" && !isOwnProfile;

  return (
    <div className="bg-black min-h-screen pb-28 md:pb-8 text-white font-sans">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-4 border-b border-neutral-900">
        <Link href="/" className="text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </Link>
        <span className="font-mono text-xs tracking-widest uppercase text-white">PROFILE</span>
        <button
          onClick={handleShareProfile}
          className="text-neutral-500 hover:text-white transition-colors"
          title="Share Profile"
        >
          {copiedShare ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
        </button>
      </div>

      <div className="max-w-xl mx-auto px-5 md:px-6 pt-6 md:pt-10">

        {/* Live Room Banner (Clubhouse style) */}
        {liveRoom && (
          <Link
            href={`/room/${liveRoom.id}`}
            className="mb-6 p-3 border border-red-900 bg-red-950/40 hover:bg-red-900/30 transition-colors flex items-center justify-between font-mono text-xs text-white group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold tracking-widest uppercase text-red-400">[ 🔴 LIVE NOW ]</span>
              <span className="text-neutral-300 truncate max-w-[200px] sm:max-w-none">"{liveRoom.name}"</span>
            </div>
            <span className="text-[10px] text-neutral-400 group-hover:text-white border border-neutral-800 px-2 py-0.5 uppercase tracking-widest">
              JOIN ROOM ➔
            </span>
          </Link>
        )}

        {/* Profile Header: Avatar, Handle, Badges, & Action Row */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono text-2xl font-bold tracking-wider text-white">{displayHandle}</h1>
                {isPrivate && (
                  <span className="flex items-center gap-1 font-mono text-[9px] text-neutral-400 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 uppercase tracking-widest" title="Private Profile">
                    <Lock size={9} /> PRIVATE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {badges.map(b => <BadgePill key={b} emoji={b} />)}
              </div>
            </div>

            {/* Quick Share Button (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleShareProfile}
                className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer"
                title="Share Profile Link"
              >
                {copiedShare ? <Check size={12} className="text-green-400" /> : <Share2 size={12} />}
                <span>{copiedShare ? "COPIED" : "SHARE"}</span>
              </button>
            </div>
          </div>

          {/* Action Row: [ WIRE ], [ ORBIT / ORBITING ], [ SHARE ] */}
          {!isOwnProfile && profile.uid !== "anon" && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {canStartWire && (
                <button
                  onClick={handleStartWire}
                  disabled={startingWire}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 font-mono text-xs tracking-widest uppercase border border-neutral-800 bg-neutral-950 px-4 py-2.5 hover:border-white hover:text-white transition-colors cursor-pointer text-white disabled:opacity-30 font-bold"
                >
                  <MessageSquare size={12} />
                  <span>{startingWire ? "CONNECTING..." : "[ 💬 WIRE ]"}</span>
                </button>
              )}

              {user && (
                <button
                  onClick={handleToggleOrbit}
                  className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 font-mono text-xs tracking-widest uppercase border px-4 py-2.5 transition-colors cursor-pointer ${
                    orbiting
                      ? "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-white hover:text-white"
                      : "border-white bg-white text-black font-bold hover:bg-neutral-200"
                  }`}
                >
                  {orbiting ? <UserCheck size={13} /> : <UserPlus size={13} />}
                  <span>{orbiting ? "[ ORBITING ]" : "[ ORBIT ]"}</span>
                </button>
              )}

              <button
                onClick={handleShareProfile}
                className="md:hidden flex items-center justify-center gap-1.5 font-mono text-xs tracking-widest uppercase border border-neutral-800 px-3 py-2.5 text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer"
              >
                {copiedShare ? <Check size={12} className="text-green-400" /> : <Share2 size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* Voice Bio (Instagram / Snap style note) */}
        {profile.voiceBioUrl && (
          <div className="mb-6 border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <Mic2 size={12} className="text-red-400" /> VOICE BIO NOTE
              </span>
              <span className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
                AUDIO INTRO
              </span>
            </div>
            <MiniPlayer audioUrl={profile.voiceBioUrl} duration="00:15" durationSec={15} />
          </div>
        )}

        {/* Bio text */}
        {profile.bio ? (
          <p className="font-serif text-base italic text-neutral-300 leading-relaxed mb-6">
            "{profile.bio}"
          </p>
        ) : (
          <p className="font-serif text-sm italic text-neutral-700 leading-relaxed mb-6">
            this voice hasn't spoken yet.
          </p>
        )}

        {/* Stats Grid: AURA, ORBITERS, ORBITING, ECHOES */}
        <div className="grid grid-cols-4 border border-neutral-900 mb-8 bg-neutral-950/40">
          {/* AURA */}
          <div className="py-4 text-center border-r border-neutral-900">
            <p className="font-mono text-lg font-bold text-white tracking-widest leading-none">
              {aura >= 1000 ? `${(aura / 1000).toFixed(1)}K` : aura}
            </p>
            <p className="font-mono text-[9px] text-neutral-600 tracking-widest uppercase mt-1">[ AURA ]</p>
          </div>

          {/* ORBITERS (Followers) */}
          <button
            onClick={() => setFollowsModal("ORBITERS")}
            className="py-4 text-center border-r border-neutral-900 hover:bg-neutral-900 transition-colors cursor-pointer group"
          >
            <p className="font-mono text-lg font-bold text-white tracking-widest leading-none group-hover:text-amber-300">
              {followersList.length}
            </p>
            <p className="font-mono text-[9px] text-neutral-600 group-hover:text-neutral-400 tracking-widest uppercase mt-1">ORBITERS</p>
          </button>

          {/* ORBITING (Following) */}
          <button
            onClick={() => setFollowsModal("ORBITING")}
            className="py-4 text-center border-r border-neutral-900 hover:bg-neutral-900 transition-colors cursor-pointer group"
          >
            <p className="font-mono text-lg font-bold text-white tracking-widest leading-none group-hover:text-amber-300">
              {followingList.length}
            </p>
            <p className="font-mono text-[9px] text-neutral-600 group-hover:text-neutral-400 tracking-widest uppercase mt-1">ORBITING</p>
          </button>

          {/* ECHOES */}
          <div className="py-4 text-center">
            <p className="font-mono text-lg font-bold text-white tracking-widest leading-none">
              {isLocked ? "—" : userPosts.length}
            </p>
            <p className="font-mono text-[9px] text-neutral-600 tracking-widest uppercase mt-1">ECHOES</p>
          </div>
        </div>

        {/* Private Profile Wall (Instagram / Twitter style) */}
        {isLocked ? (
          <div className="border border-neutral-800 bg-neutral-950 p-8 text-center space-y-4 my-8">
            <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
              <Lock size={20} />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-sm font-bold tracking-widest uppercase text-white">
                [ 🔒 THIS VOICE IS PRIVATE ]
              </p>
              <p className="font-mono text-xs text-neutral-500 max-w-xs mx-auto">
                Orbit this account to unlock their echoes, audio drops, and live activity.
              </p>
            </div>
            <button
              onClick={handleToggleOrbit}
              className="px-6 py-2.5 border border-white bg-white text-black font-mono text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              [ 💫 ORBIT TO UNLOCK ]
            </button>
          </div>
        ) : (
          /* Echoes Feed */
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest uppercase text-neutral-600 mb-2">// THEIR ECHOES</p>
            {userPosts.length > 0 ? (
              userPosts.map(p => <PostItem key={p.id} post={p} />)
            ) : (
              <div className="py-16 text-center border border-neutral-900 p-8 space-y-2">
                <p className="font-serif text-base italic text-neutral-600">
                  this voice hasn't dropped anything yet.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Orbiters & Orbiting Modal List */}
      {followsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-neutral-800 w-full max-w-md max-h-[80vh] flex flex-col font-mono">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest uppercase text-white">
                // {followsModal} ({followsModal === "ORBITERS" ? followersList.length : followingList.length})
              </h3>
              <button
                onClick={() => setFollowsModal(null)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-neutral-900">
              {(followsModal === "ORBITERS" ? followersList : followingList).length === 0 ? (
                <div className="text-center py-10 text-neutral-600 text-xs">
                  NO {followsModal} FOUND
                </div>
              ) : (
                (followsModal === "ORBITERS" ? followersList : followingList).map((f) => {
                  const targetHandle = followsModal === "ORBITERS" ? f.followerHandle : f.followingHandle;
                  const cleanHandle = targetHandle?.replace(/^@/, "") || "anon";
                  return (
                    <div key={f.id} className="pt-2 pb-2 flex items-center justify-between">
                      <Link
                        href={`/${cleanHandle}`}
                        onClick={() => setFollowsModal(null)}
                        className="flex items-center gap-2.5 hover:text-amber-300 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center text-xs text-neutral-400 font-bold">
                          {cleanHandle.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-white tracking-wider">{targetHandle}</span>
                      </Link>
                      <Link
                        href={`/${cleanHandle}`}
                        onClick={() => setFollowsModal(null)}
                        className="text-[10px] border border-neutral-800 px-2 py-1 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors"
                      >
                        VIEW ➔
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {canStartWire && (
        <ChatWidget targetUid={profile.uid} targetHandle={displayHandle} />
      )}
    </div>
  );
}
