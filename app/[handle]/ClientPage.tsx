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
  Play, Pause, Flame, X, Sparkles, Shield, Check,
  Grid, Repeat2, Heart, Swords
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
import { isThoughtActive, getThoughtRemainingHours } from "@/lib/userDoc";
import ChallengeModal from "@/app/components/ChallengeModal";
import ExpressiveAvatar from "@/app/components/avatar/ExpressiveAvatar";
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from "@/lib/avatarRig";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface FirestoreUser {
  uid: string;
  handle: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  photoURL?: string;
  avatarUrl?: string;
  avatarConfig?: AvatarConfig;
  equipped?: Record<string, string>;
  auraScore?: number;
  badges?: string[];
  bio?: string;
  voiceBioUrl?: string;
  voiceBioDuration?: string;
  thoughtText?: string | null;
  thoughtAudioUrl?: string | null;
  thoughtDuration?: string | null;
  thoughtExpiresAt?: number | null;
  thoughtCreatedAt?: number | null;
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
      <p className="font-mono text-sm sm:text-base font-bold text-white leading-snug">"{post.caption}"</p>
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
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Followers & Following Lists
  const [followersList, setFollowersList] = useState<Follow[]>([]);
  const [followingList, setFollowingList] = useState<Follow[]>([]);
  const [followsModal, setFollowsModal] = useState<"ORBITERS" | "ORBITING" | null>(null);

  // Live Room Presence
  const [liveRoom, setLiveRoom] = useState<LiveRoomInfo | null>(null);

  // Voice Bio playback
  const [playingVoiceBio, setPlayingVoiceBio] = useState(false);
  const voiceBioAudioRef = useRef<HTMLAudioElement | null>(null);

  // 24-Hour Expiring Thought playback (Orbiters Only)
  const [playingThoughtAudio, setPlayingThoughtAudio] = useState(false);
  const thoughtAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleThoughtAudio = () => {
    if (!profile?.thoughtAudioUrl) return;
    const playableUrl = getPlayableUrl(profile.thoughtAudioUrl);
    if (!thoughtAudioRef.current) {
      const a = new Audio(playableUrl);
      a.onended = () => setPlayingThoughtAudio(false);
      a.onerror = () => setPlayingThoughtAudio(false);
      thoughtAudioRef.current = a;
    }
    if (playingThoughtAudio) {
      thoughtAudioRef.current.pause();
      setPlayingThoughtAudio(false);
    } else {
      thoughtAudioRef.current.play().catch(() => setPlayingThoughtAudio(false));
      setPlayingThoughtAudio(true);
    }
  };

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
      {/* ── Instagram-Style Top Header Bar ── */}
      <header className="px-4 py-3 md:px-6 flex items-center justify-between border-b border-neutral-900 w-full bg-black/90 backdrop-blur sticky top-0 z-30">
        <Link href="/" className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer" title="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Center Handle */}
        <div className="flex items-center gap-1.5">
          <h1 className="font-mono text-sm sm:text-base font-bold tracking-wider text-white">
            {displayHandle}
          </h1>
          {isPrivate && (
            <span className="flex items-center gap-1 font-mono text-[9px] text-neutral-400 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 uppercase tracking-widest" title="Private Profile">
              <Lock size={9} />
            </span>
          )}
        </div>

        {/* Top Right Share */}
        <button
          onClick={handleShareProfile}
          className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Share Profile"
        >
          {copiedShare ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5">
        {/* Live Room Banner (Clubhouse style) */}
        {liveRoom && (
          <Link
            href={`/room/${liveRoom.id}`}
            className="mb-5 p-3 border border-red-900 bg-red-950/40 hover:bg-red-900/30 transition-colors flex items-center justify-between font-mono text-xs text-white group cursor-pointer"
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

        {/* ── Instagram Profile Top Section: Avatar + 4 Stat Counts ── */}
        <div className="space-y-4 mb-5">
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            {/* Left: Avatar with 24-Hour Expiring Thought Speech Bubble (Orbiters Only) */}
            <div className="relative flex flex-col items-center shrink-0">
              {/* 24-Hour Expiring Thought Speech Bubble */}
              {isThoughtActive(profile) && (
                isOwnProfile || orbiting ? (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-white text-white font-mono text-[9px] px-2.5 py-0.5 whitespace-nowrap flex items-center gap-1.5 z-10 shadow-lg">
                    <span>💭</span>
                    <span className="font-bold max-w-[110px] sm:max-w-[150px] truncate">
                      "{profile.thoughtText}"
                    </span>
                    {profile.thoughtAudioUrl && (
                      <button
                        onClick={handleToggleThoughtAudio}
                        className="text-[8px] bg-white text-black font-bold px-1 py-0.2 hover:bg-neutral-200 cursor-pointer"
                      >
                        {playingThoughtAudio ? "PAUSE ∿" : "PLAY 🎙️"}
                      </button>
                    )}
                    <span className="text-[8px] text-neutral-500">
                      • {getThoughtRemainingHours(profile)}H
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleToggleOrbit}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-dashed border-neutral-600 hover:border-white text-neutral-300 hover:text-white font-mono text-[9px] px-2.5 py-0.5 whitespace-nowrap flex items-center gap-1.5 z-10 shadow-lg cursor-pointer transition-colors"
                    title="Orbit to unlock this creator's 24H thought"
                  >
                    <Lock size={9} />
                    <span className="font-bold">ORBIT TO UNLOCK 24H THOUGHT</span>
                  </button>
                )
              )}

              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 overflow-hidden flex items-center justify-center text-2xl font-mono bg-black relative mt-2 transition-all ${
                profile.equipped?.border === "cosmetic_neon_border"
                  ? "border-emerald-400 ring-4 ring-emerald-400/80 ring-offset-2 ring-offset-black shadow-[0_0_35px_rgba(52,211,153,0.7)] animate-pulse"
                  : "border-neutral-700"
              }`}>
                {profile.avatarUrl && !profile.avatarConfig ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayHandle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ExpressiveAvatar
                    config={{
                      skinTone: profile.avatarConfig?.skinTone || "ALMOND",
                      hairStyle: profile.avatarConfig?.hairStyle || "CYBER_FADE",
                      hairColor: profile.avatarConfig?.hairColor || "CYAN",
                      eyewear:
                        profile.equipped?.eyewear === "item_cyber_visor"
                          ? "CYBER_VISOR"
                          : profile.avatarConfig?.eyewear || "CYBER_VISOR",
                      outfitColor:
                        profile.equipped?.suit === "suit_neon_crimson"
                          ? "CRIMSON"
                          : profile.equipped?.suit === "suit_emerald_tux"
                          ? "EMERALD"
                          : profile.equipped?.suit === "suit_gold_champion"
                          ? "AMBER"
                          : profile.equipped?.suit === "suit_cyan_runner"
                          ? "CYAN"
                          : profile.equipped?.suit === "suit_cyber_obsidian"
                          ? "OBSIDIAN"
                          : profile.avatarConfig?.outfitColor || "OBSIDIAN",
                    }}
                    gesture="IDLE"
                    size={96}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* Right: 4 Stat Columns */}
            <div className="flex-1 grid grid-cols-4 text-center">
              {/* 1. Echoes */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-base sm:text-lg font-bold text-white">
                  {isLocked ? "—" : userPosts.length}
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  echoes
                </span>
              </div>

              {/* 2. Orbiters */}
              <button
                onClick={() => setFollowsModal("ORBITERS")}
                className="flex flex-col items-center cursor-pointer group"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {followersList.length}
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  orbiters
                </span>
              </button>

              {/* 3. Orbiting */}
              <button
                onClick={() => setFollowsModal("ORBITING")}
                className="flex flex-col items-center cursor-pointer group"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {followingList.length}
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  orbiting
                </span>
              </button>

              {/* 4. Aura */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-base sm:text-lg font-bold text-white">
                  {aura >= 1000 ? `${(aura / 1000).toFixed(1)}K` : aura}
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  aura
                </span>
              </div>
            </div>
          </div>

          {/* User Bio Details & Equipped Titles */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-mono text-xs sm:text-sm font-bold text-white">
                {profile.displayName || displayHandle}
              </h2>
              {profile.equipped?.title === "title_shadow_broker" && (
                <span className="px-2 py-0.5 bg-purple-950 border border-purple-500 text-purple-300 font-mono text-[9px] uppercase font-black rounded-md shadow-sm">
                  🕵️ SHADOW BROKER
                </span>
              )}
              {profile.equipped?.title === "title_grandmaster" && (
                <span className="px-2 py-0.5 bg-amber-950 border border-amber-400 text-yellow-400 font-mono text-[9px] uppercase font-black rounded-md shadow-sm">
                  👑 GRANDMASTER TYCOON
                </span>
              )}
              {profile.equipped?.suit && (
                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-white font-mono text-[9px] uppercase font-bold rounded-md shadow-sm">
                  🥋 {profile.equipped.suit.replace('suit_', '').replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
              {profile.bio || "Voice creator on Echo"}
            </p>
            {badges.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {badges.map((b) => (
                  <BadgePill key={b} emoji={b} />
                ))}
              </div>
            )}
          </div>

          {/* Action Row: [ ORBIT / ORBITING ], [ WIRE ], [ CHALLENGE ] */}
          {!isOwnProfile && profile.uid !== "anon" && (
            <div className="flex items-center gap-2 pt-2 flex-wrap sm:flex-nowrap">
              {user && (
                <button
                  onClick={handleToggleOrbit}
                  className={`flex-1 py-2 px-3 border font-mono text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-w-[100px] ${
                    orbiting
                      ? "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
                      : "border-white bg-white text-black hover:bg-neutral-200"
                  }`}
                >
                  {orbiting ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  <span>{orbiting ? "ORBITING" : "ORBIT"}</span>
                </button>
              )}

              {canStartWire && (
                <button
                  onClick={handleStartWire}
                  disabled={startingWire}
                  className="flex-1 py-2 px-3 border border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800 font-mono text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer text-white disabled:opacity-30 flex items-center justify-center gap-1.5 min-w-[90px]"
                >
                  <MessageSquare size={14} />
                  <span>{startingWire ? "CONNECTING..." : "WIRE"}</span>
                </button>
              )}

              {user && (
                <button
                  onClick={() => setShowChallengeModal(true)}
                  className="flex-1 py-2 px-3 border border-red-800 hover:border-red-500 bg-red-950/40 hover:bg-red-900/60 font-mono text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer text-red-400 hover:text-white flex items-center justify-center gap-1.5 min-w-[110px]"
                  title={`Challenge ${displayHandle} to a live 1v1 debate clash`}
                >
                  <Swords size={14} />
                  <span>CHALLENGE</span>
                </button>
              )}
            </div>
          )}

          {/* Permanent Voice Bio (Public to Everyone) */}
          {profile.voiceBioUrl && (
            <div className="pt-2">
              <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white uppercase tracking-widest flex items-center gap-1.5 font-bold">
                    <Mic2 size={12} className="text-white" /> PERMANENT VOICE BIO ({profile.voiceBioDuration || "15S"})
                  </span>
                  <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest">
                    ● PUBLIC INTRO
                  </span>
                </div>
                <MiniPlayer audioUrl={profile.voiceBioUrl} duration={profile.voiceBioDuration || "00:15"} durationSec={15} />
              </div>
            </div>
          )}
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
          /* Echoes Feed with Instagram Grid Tabs Bar */
          <div className="space-y-4">
            <div className="grid grid-cols-2 border-t border-b border-neutral-900 mb-4">
              <button
                className="py-3 flex items-center justify-center gap-2 cursor-pointer border-b-2 border-white text-white font-bold transition-colors font-mono text-xs tracking-wider"
              >
                <Grid className="w-4 h-4" />
                <span>ECHOES ({userPosts.length})</span>
              </button>
              <button
                className="py-3 flex items-center justify-center gap-2 cursor-pointer border-b-2 border-transparent text-neutral-600 hover:text-neutral-400 transition-colors font-mono text-xs tracking-wider"
              >
                <Repeat2 className="w-4 h-4" />
                <span>REPOSTS</span>
              </button>
            </div>

            {userPosts.length > 0 ? (
              userPosts.map(p => <PostItem key={p.id} post={p} />)
            ) : (
              <div className="py-16 text-center border border-neutral-900 p-8 space-y-2">
                <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                  NO ECHOES DROPPED YET
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

      {/* 1v1 Stage Debate Challenge Modal */}
      <ChallengeModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        defaultOpponentHandle={profile.handle || displayHandle}
        defaultOpponentUid={profile.uid}
      />
    </div>
  );
}
