"use client";

export const dynamic = "force-dynamic";

/**
 * WAVES — Audio Reel Feed (/waves)
 * Full-screen vertical scroll feed inspired by Instagram Reels / TikTok, but 100% pure voice.
 * Snap-scroll between cards, auto-play on snap, side action stack with heart, comments,
 * re-echo, share, save, 3-dots more menu, and expandable descriptions.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Mic2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Zap,
  Trash2,
  Play,
  Pause,
  Plus,
  Check,
  Flag,
  Share2,
  Music2,
  X,
  MessageSquare,
  Sparkles,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  subscribeToPosts,
  togglePulsePost,
  deletePost,
  vaultPost,
  unvaultPost,
  isPostVaulted,
  createPost,
  subscribeToPostReverbs,
  addPostReverb,
  toggleReverbReaction,
  type PostReverbItem,
  type ReverbReactionRecord,
} from "@/lib/posts";
import { followUser, unfollowUser, subscribeToFollowing } from "@/lib/follows";
import { useAuth } from "@/app/components/AuthProvider";
import { createNotification } from "@/lib/notifications";
import { audioManager } from "@/lib/audioManager";
import { getPlayableUrl } from "@/lib/cloudinary";
import { FormattedText } from "@/app/components/FormattedText";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface WavePost {
  id: string;
  audioUrl: string;
  caption: string;
  authorHandle: string;
  authorUid: string;
  pulseCount: number;
  pulsedBy: string[];
  durationSec: number;
  reverbCount: number;
  createdAt: any;
  isNeural?: boolean;
  isCloned?: boolean;
  category?: string;
  audioTrackId?: string;
  audioTrackTitle?: string;
  audioTrackArtist?: string;
  isVoiceMeme?: boolean;
}

function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function fmtNum(n: number) {
  if (!n) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── Big animated waveform ──────────────────────────────────────────────────────
const BARS = [12, 22, 36, 48, 28, 56, 20, 44, 12, 52, 32, 40, 16, 56, 28, 44, 20, 52, 12, 36, 48, 24, 60, 16, 40];

function BigWaveform({ playing, color }: { playing: boolean; color: string }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {BARS.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}px`,
            width: "3px",
            backgroundColor: color,
            borderRadius: "2px",
            opacity: playing ? 1 : 0.25,
            animationDelay: playing ? `${i * 0.04}s` : undefined,
            animationDuration: playing ? `${0.5 + (i % 5) * 0.12}s` : undefined,
            transition: "height 0.3s ease",
          }}
          className={playing ? "waveform-bar" : ""}
        />
      ))}
    </div>
  );
}

// ── Per-card audio engine ──────────────────────────────────────────────────────
function useWaveAudio(src: string, durationSec: number, active: boolean, muted: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const instanceIdRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(Math.max(1, durationSec));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Generate unique instance ID for this audio player
  useEffect(() => {
    instanceIdRef.current = `wave-${src}-${Date.now()}`;
    return () => {
      if (instanceIdRef.current) {
        audioManager.unregister(instanceIdRef.current);
      }
    };
  }, [src]);

  // Build audio element once per src with URL fix
  useEffect(() => {
    const playableUrl = getPlayableUrl(src);
    if (!playableUrl) return;

    const a = new Audio(playableUrl);
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.onloadedmetadata = () => {
      if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration));
    };
    a.ontimeupdate = () => setCurrent(a.currentTime);
    a.onplaying = () => {
      setPlaying(true);
      setLoading(false);
    };
    a.onpause = () => setPlaying(false);
    a.onended = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.onerror = () => setFailed(true);
    audioRef.current = a;

    // Register with audio manager
    const id = instanceIdRef.current;
    if (id) {
      audioManager.register(id, a, 2); // Priority 2 for waves
    }

    return () => {
      a.pause();
      a.src = "";
      try {
        a.load();
      } catch {}
      if (audioRef.current === a) {
        audioRef.current = null;
      }
      if (id) {
        audioManager.unregister(id);
      }
    };
  }, [src]);

  // Sync mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // Active = auto play current wave on display, inactive = auto pause previous wave
  useEffect(() => {
    const a = audioRef.current;
    const id = instanceIdRef.current;
    if (!a || !id) return;

    if (active && !failed) {
      const playableUrl = getPlayableUrl(src);
      if (a.src !== playableUrl && playableUrl) {
        a.src = playableUrl;
        a.load();
      }
      a.volume = 1;
      a.muted = muted;
      setLoading(true);
      audioManager
        .requestPlay(id)
        .then(() => {
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      audioManager.pause(id);
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      setPlaying(false);
    }
  }, [active, failed, muted, src]);

  const toggle = async () => {
    const a = audioRef.current;
    const id = instanceIdRef.current;
    if (!a || !id) return;
    if (playing) {
      audioManager.pause(id);
      a.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      const playableUrl = getPlayableUrl(src);
      if (a.src !== playableUrl && playableUrl) {
        a.src = playableUrl;
      }
      audioManager
        .requestPlay(id)
        .then(() => {
          setLoading(false);
          setPlaying(true);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  };

  const seek = (time: number) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const target = Math.max(0, Math.min(a.duration, time));
    a.currentTime = target;
    setCurrent(target);
  };

  const skip = (seconds: number) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const target = Math.max(0, Math.min(a.duration, a.currentTime + seconds));
    a.currentTime = target;
    setCurrent(target);
  };

  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;
  return { playing, current, dur, pct, loading, failed, toggle, seek, skip };
}

// ── Accent palette for cards ───────────────────────────────────────────────────
const ACCENTS = [
  { bg: "from-neutral-950 via-black to-black", wave: "#ffffff", tag: "border-neutral-800 text-neutral-400" },
  { bg: "from-zinc-950 via-black to-black", wave: "#e4e4e7", tag: "border-neutral-800 text-neutral-400" },
  { bg: "from-stone-950 via-black to-black", wave: "#f5f5f4", tag: "border-neutral-800 text-neutral-400" },
  { bg: "from-neutral-900 via-black to-black", wave: "#d4d4d8", tag: "border-neutral-800 text-neutral-400" },
];

// ── Wave Card ─────────────────────────────────────────────────────────────────
function WaveCard({
  post,
  index,
  active,
  muted,
  onPulse,
  onOpenComments,
  onReEcho,
  onShare,
  onSaveToggle,
  onOpenMore,
  onProfile,
  onToggleOrbit,
  isPulsed,
  isSaved,
  isOrbiting,
  isOwner,
  isReEchoed,
}: {
  post: WavePost;
  index: number;
  active: boolean;
  muted: boolean;
  onPulse: () => void;
  onOpenComments: () => void;
  onReEcho: () => void;
  onShare: () => void;
  onSaveToggle: () => void;
  onOpenMore: () => void;
  onProfile: () => void;
  onToggleOrbit: () => void;
  isPulsed: boolean;
  isSaved: boolean;
  isOrbiting: boolean;
  isOwner: boolean;
  isReEchoed: boolean;
}) {
  const { bg, wave, tag } = ACCENTS[index % ACCENTS.length];
  const { playing, current, dur, pct, loading, failed, toggle, seek, skip } = useWaveAudio(post.audioUrl, post.durationSec, active, muted);
  const [expandedDesc, setExpandedDesc] = useState(false);

  // Derive short title vs full description
  const cleanCaption = post.caption.trim();
  const isLong = cleanCaption.length > 60 || cleanCaption.includes("\n");
  const shortTitle = isLong ? `${cleanCaption.slice(0, 55)}...` : cleanCaption;

  return (
    <div className={`relative w-full h-[calc(100dvh-4rem)] md:h-screen flex-shrink-0 snap-start overflow-hidden bg-gradient-to-b ${bg} select-none`}>
      {/* Center waveform & Interactive Play/Pause + Fast Forward/Rewind Controls */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 sm:gap-6 pointer-events-none">
        <BigWaveform playing={playing} color={wave} />

        {/* Center Playback Controls with 5s Skip */}
        <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto z-20">
          <button
            onClick={(e) => { e.stopPropagation(); skip(-5); }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/30 bg-black/60 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 text-white/80 hover:text-white hover:border-white transition-all cursor-pointer shadow-xl"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={toggle}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/40 bg-black/60 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xl hover:border-white"
            aria-label={playing ? "Pause" : "Play"}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
            ) : playing ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white ml-1" />
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); skip(5); }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/30 bg-black/60 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 text-white/80 hover:text-white hover:border-white transition-all cursor-pointer shadow-xl"
            title="Forward 5 seconds"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {failed && (
          <span className="font-mono text-[10px] text-red-400 tracking-widest uppercase bg-black/80 px-3 py-1 border border-red-500/30">
            AUDIO FORMAT UNAVAILABLE
          </span>
        )}
      </div>

      {/* ── BOTTOM CREATOR INFO & EXPANDABLE DESCRIPTION ── */}
      <div className="absolute bottom-20 sm:bottom-6 left-3 right-16 sm:left-6 sm:right-20 z-20 space-y-2 pointer-events-none max-w-[calc(100%-4.5rem)]">
        {/* Creator Row: Avatar, Handle, and Orbit Follow Button */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          <button
            onClick={onProfile}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/60 bg-neutral-900 flex items-center justify-center text-white font-mono text-xs font-bold shrink-0 hover:border-white transition-colors cursor-pointer"
          >
            {post.authorHandle.replace("@", "").slice(0, 1).toUpperCase()}
          </button>
          
          <button
            onClick={onProfile}
            className="font-mono text-xs font-bold tracking-wider text-white hover:underline uppercase cursor-pointer truncate max-w-[130px] sm:max-w-none"
          >
            {post.authorHandle}
          </button>

          {!isOwner && (
            <button
              onClick={onToggleOrbit}
              className={`px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] tracking-widest uppercase border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                isOrbiting
                  ? "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-white hover:text-white"
                  : "border-white bg-white text-black font-bold hover:bg-neutral-200"
              }`}
            >
              {isOrbiting ? (
                <>
                  <Check className="w-2.5 h-2.5" /> ORBITING
                </>
              ) : (
                <>
                  <Plus className="w-2.5 h-2.5" /> ORBIT
                </>
              )}
            </button>
          )}
        </div>

        {/* Caption / Description Box */}
        <div className="pointer-events-auto bg-black/60 backdrop-blur-md p-2.5 rounded-none border border-white/20 space-y-1">
          {!expandedDesc ? (
            <div className="space-y-1">
              <p className="font-mono font-bold text-white text-xs sm:text-sm leading-snug drop-shadow line-clamp-2">
                "{shortTitle}"
              </p>
              {isLong && (
                <button
                  onClick={() => setExpandedDesc(true)}
                  className="font-mono text-[9px] text-neutral-400 hover:text-white uppercase tracking-widest underline decoration-neutral-600 transition-colors cursor-pointer"
                >
                  ... [ VIEW DESCRIPTION ]
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              <p className="font-mono font-bold text-white text-xs sm:text-sm leading-snug drop-shadow">
                "<FormattedText text={cleanCaption} />"
              </p>
              <button
                onClick={() => setExpandedDesc(false)}
                className="font-mono text-[9px] text-neutral-400 hover:text-white uppercase tracking-widest underline decoration-neutral-600 transition-colors cursor-pointer"
              >
                [ LESS ]
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 pt-0.5">
            <span className="font-mono text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-none border border-neutral-700 bg-neutral-900 text-white font-bold uppercase tracking-wider">
              [ WAVES ]
            </span>
            <span className="font-mono text-[9px] text-neutral-400">
              {post.durationSec || 15}s
            </span>
          </div>
        </div>

        {/* Audio Track Tag & Use This Audio button */}
        <div className="flex items-center justify-between font-mono text-[9px] text-neutral-300 tracking-wider uppercase pointer-events-auto gap-2">
          <Link
            href={`/audio/${post.audioTrackId || post.id}`}
            className="flex items-center gap-1.5 hover:text-white truncate"
          >
            <Music2 className="w-3 h-3 text-white animate-pulse shrink-0" />
            <span className="truncate">{post.audioTrackTitle || "ORIGINAL VOICE ECHO"} — {post.audioTrackArtist || post.authorHandle}</span>
          </Link>
          <Link
            href={`/studio?soundId=${encodeURIComponent(post.audioTrackId || post.id)}&soundUrl=${encodeURIComponent(post.audioUrl)}&soundTitle=${encodeURIComponent(post.audioTrackTitle || post.caption.slice(0, 30) || "Original Sound")}&soundArtist=${encodeURIComponent(post.audioTrackArtist || post.authorHandle)}`}
            className="border border-white/40 bg-black/60 hover:bg-white text-white hover:text-black px-2 py-0.5 font-bold uppercase transition-colors shrink-0"
          >
            [ 🎵 USE AUDIO ]
          </Link>
        </div>

        {/* ── Instagram Reels Inspired Interactive Scrub Line below Title ── */}
        <div className="pt-1 pointer-events-auto w-full select-none">
          <div className="flex items-center gap-2 group relative">
            <div className="relative flex-1 flex items-center h-4 cursor-pointer">
              <input
                type="range"
                min={0}
                max={dur || 15}
                step={0.1}
                value={current}
                onChange={(e) => {
                  seek(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-white/20 hover:bg-white/40 group-hover:h-1.5 rounded-full appearance-none cursor-pointer accent-white transition-all focus:outline-none"
                title="Slide to scrub audio"
              />
            </div>
            <span className="font-mono text-[9px] text-white/80 tabular-nums shrink-0 uppercase tracking-widest bg-black/60 px-1.5 py-0.5 border border-white/20 rounded">
              {Math.floor(current)}s / {dur}s
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT ACTION STACK (INSTAGRAM REELS INSPIRED) ── */}
      <div className="absolute bottom-20 sm:bottom-6 right-2 sm:right-4 z-20 flex flex-col items-center gap-2.5 sm:gap-3 pointer-events-auto">
        {/* 1. Heart / Pulse (Like) */}
        <button
          onClick={onPulse}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title="Pulse / Like"
        >
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all ${
              isPulsed
                ? "bg-white border-white scale-110 shadow-lg"
                : "border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm group-active:scale-90"
            }`}
          >
            <Heart
              className={`w-4.5 h-4.5 transition-transform ${
                isPulsed ? "text-black fill-black" : "text-white group-hover:scale-110"
              }`}
            />
          </div>
          <span className="font-mono text-[9px] text-white/90 font-bold tracking-widest drop-shadow">
            {fmtNum(post.pulseCount)}
          </span>
        </button>

        {/* 2. Comments / Reverb */}
        <button
          onClick={onOpenComments}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title="View Reverbs / Comments"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm transition-all group-active:scale-90">
            <MessageCircle className="w-4.5 h-4.5 text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-mono text-[9px] text-white/90 font-bold tracking-widest drop-shadow">
            {fmtNum(post.reverbCount || 0)}
          </span>
        </button>

        {/* 3. Re-Echo / Repost */}
        <button
          onClick={onReEcho}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title="Re-Echo Post"
        >
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all ${
              isReEchoed
                ? "bg-white border-white text-black"
                : "border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm"
            } group-active:scale-90`}
          >
            <Repeat2 className={`w-4.5 h-4.5 ${isReEchoed ? "text-black" : "text-white"} group-hover:scale-110 transition-transform`} />
          </div>
          <span className="font-mono text-[8px] sm:text-[9px] text-white/80 tracking-widest">
            {isReEchoed ? "ECHOED" : "REPOST"}
          </span>
        </button>

        {/* 4. Share */}
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title="Share Wave"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm transition-all group-active:scale-90">
            <Send className="w-4 h-4 text-white ml-0.5 group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-mono text-[8px] sm:text-[9px] text-white/80 tracking-widest">SHARE</span>
        </button>

        {/* 5. Bookmark / Save */}
        <button
          onClick={onSaveToggle}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title={isSaved ? "Saved to Vault" : "Save to Vault"}
        >
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all ${
              isSaved
                ? "bg-white border-white"
                : "border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm"
            } group-active:scale-90`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "text-black fill-black" : "text-white"} group-hover:scale-110 transition-transform`} />
          </div>
          <span className="font-mono text-[8px] sm:text-[9px] text-white/80 tracking-widest">
            {isSaved ? "SAVED" : "SAVE"}
          </span>
        </button>

        {/* 6. Three Dots (More Options) */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
          title="More Options"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm transition-all group-active:scale-90">
            <MoreHorizontal className="w-4.5 h-4.5 text-white group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Slide-up Comments / Reverbs Drawer with Emoji Reaction Log ───────────────
function CommentsDrawer({
  post,
  onClose,
  currentUser,
}: {
  post: WavePost;
  onClose: () => void;
  currentUser: any;
}) {
  const [reverbs, setReverbs] = useState<PostReverbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedReverbForLog, setSelectedReverbForLog] = useState<PostReverbItem | null>(null);

  const REACTION_OPTIONS = ["😂", "🔥", "❤️", "👍", "⚡", "💀", "🧢", "💯"];

  useEffect(() => {
    const unsub = subscribeToPostReverbs(post.id, (list) => {
      setReverbs(list);
      setLoading(false);
    });
    return () => unsub();
  }, [post.id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      await addPostReverb(post.id, {
        uid: currentUser.uid,
        handle: currentUser.handle || "@ANON",
        caption: newText.trim(),
        audioUrl: "",
        durationSec: 0,
      });
      setNewText("");
      if (post.authorUid !== currentUser.uid) {
        await createNotification(post.authorUid, {
          type: "reverb",
          fromUid: currentUser.uid,
          fromHandle: currentUser.handle || "@ANON",
          postId: post.id,
          postCaption: post.caption,
          text: `${currentUser.handle} commented on your wave: "${newText.trim().slice(0, 40)}"`,
        });
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (reverb: PostReverbItem, emoji: string) => {
    if (!currentUser) return;
    try {
      await toggleReverbReaction(
        post.id,
        reverb.id,
        { uid: currentUser.uid, handle: currentUser.handle || "@ANON" },
        emoji,
        reverb.handle
      );
    } catch (err) {
      console.error("Failed to react to comment:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-neutral-950 border-t border-neutral-800 rounded-t-2xl flex flex-col max-h-[80vh] z-10 animate-slide-up shadow-2xl">
        {/* Handle Bar & Header */}
        <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-white" />
            <span className="font-mono text-xs tracking-widest text-white uppercase font-bold">
              REVERBS & COMMENTS ({reverbs.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          ) : reverbs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO REVERBS YET
              </p>
              <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
                Be the first to echo back.
              </p>
            </div>
          ) : (
            reverbs.map((rev) => {
              const reactionsMap = rev.reactions || {};
              const reactionList = Object.values(reactionsMap);
              
              // Group reactions by emoji
              const emojiCounts: Record<string, number> = {};
              reactionList.forEach((r) => {
                emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
              });

              const userReactedEmoji = currentUser ? reactionsMap[currentUser.uid]?.emoji : null;

              return (
                <div key={rev.id} className="border-b border-neutral-900 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/${rev.handle.replace("@", "")}`}
                      className="font-mono text-xs font-bold text-white hover:underline flex items-center gap-1.5"
                    >
                      <span>{rev.handle}</span>
                      {userReactedEmoji && (
                        <span className="text-xs bg-neutral-900 border border-neutral-800 rounded px-1 py-0.2">
                          {userReactedEmoji}
                        </span>
                      )}
                    </Link>
                    <span className="font-mono text-[9px] text-neutral-600 uppercase">
                      {rev.createdAt?.toDate ? new Date(rev.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-neutral-300 leading-snug">
                    "<FormattedText text={rev.caption} />"
                  </p>

                  {/* Emoji Reactions & Reaction Log Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    {/* Quick Emojis to React */}
                    <div className="flex items-center gap-1 bg-black/60 border border-neutral-900 rounded-full px-2 py-0.5">
                      {REACTION_OPTIONS.map((emoji) => {
                        const isSelected = userReactedEmoji === emoji;
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(rev, emoji)}
                            className={`text-xs hover:scale-130 transition-transform p-0.5 cursor-pointer ${
                              isSelected ? "scale-125 bg-neutral-800 rounded" : "opacity-70 hover:opacity-100"
                            }`}
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>

                    {/* Summary Badge & Log Trigger */}
                    {reactionList.length > 0 && (
                      <button
                        onClick={() => setSelectedReverbForLog(rev)}
                        className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-full px-2.5 py-0.5 transition-all cursor-pointer"
                        title="View who reacted"
                      >
                        {Object.entries(emojiCounts).map(([emoji, count]) => (
                          <span key={emoji} className="flex items-center gap-0.5">
                            <span>{emoji}</span>
                            <span className="font-bold text-white">{count}</span>
                          </span>
                        ))}
                        <span className="text-neutral-500 text-[9px] uppercase ml-1">• LOG</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendComment} className="p-3 border-t border-neutral-900 flex items-center gap-2 bg-black">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Write an echo reply..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
          />
          <button
            type="submit"
            disabled={!newText.trim() || submitting}
            className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "SEND"}
          </button>
        </form>
      </div>

      {/* ── Reaction Log Modal: Shows who laughed / reacted at whom ── */}
      {selectedReverbForLog && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-700 p-5 space-y-4 font-mono text-xs shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-white font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span>📜 REACTION LOG</span>
              </span>
              <button
                onClick={() => setSelectedReverbForLog(null)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="p-2 border border-neutral-900 bg-black/60 rounded">
              <p className="font-mono text-[9px] text-neutral-500 uppercase">// VOICE TAKE</p>
              <p className="font-mono text-xs text-neutral-300">
                "{selectedReverbForLog.caption}"
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {Object.values(selectedReverbForLog.reactions || {}).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border border-neutral-900 bg-neutral-900/40 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <span className="text-white font-bold">{item.userHandle}</span>
                      <p className="text-[10px] text-neutral-400">
                        {item.emoji === "😂"
                          ? `laughed at ${item.targetHandle}'s voice take`
                          : item.emoji === "🔥"
                          ? `dropped fire on ${item.targetHandle}'s take`
                          : item.emoji === "🧢"
                          ? `called cap on ${item.targetHandle}'s take`
                          : item.emoji === "💯"
                          ? `agreed 100% with ${item.targetHandle}`
                          : item.emoji === "💀"
                          ? `found ${item.targetHandle}'s take dead funny`
                          : `reacted ${item.emoji} to ${item.targetHandle}'s take`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] text-neutral-600">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedReverbForLog(null)}
              className="w-full py-2 border border-neutral-800 hover:border-white text-neutral-300 hover:text-white uppercase transition-colors rounded cursor-pointer"
            >
              [ CLOSE LOG ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Instagram-style 3-Dots More Options Modal ─────────────────────────────────
function MoreOptionsMenu({
  post,
  isSaved,
  isOwner,
  onClose,
  onSaveToggle,
  onShare,
  onDelete,
  onReport,
  router,
}: {
  post: WavePost;
  isSaved: boolean;
  isOwner: boolean;
  onClose: () => void;
  onSaveToggle: () => void;
  onShare: () => void;
  onDelete: () => void;
  onReport: () => void;
  router: any;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden z-10 shadow-2xl divide-y divide-neutral-900">
        {/* Report */}
        <button
          onClick={() => {
            onReport();
            onClose();
          }}
          className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs font-bold text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer uppercase tracking-widest"
        >
          <Flag className="w-4 h-4" /> [ REPORT THIS ECHO ]
        </button>

        {/* Save / Unsave */}
        <button
          onClick={() => {
            onSaveToggle();
            onClose();
          }}
          className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs text-white hover:bg-neutral-900 transition-colors cursor-pointer uppercase tracking-widest"
        >
          <Bookmark className="w-4 h-4" /> {isSaved ? "[ REMOVE FROM SAVED ]" : "[ SAVE TO VAULT ]"}
        </button>

        {/* Copy Link */}
        <button
          onClick={() => {
            onShare();
            onClose();
          }}
          className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs text-white hover:bg-neutral-900 transition-colors cursor-pointer uppercase tracking-widest"
        >
          <Share2 className="w-4 h-4" /> [ SHARE / COPY LINK ]
        </button>

        {/* Direct Wire Message */}
        <button
          onClick={() => {
            onClose();
            router.push(`/wire?with=${post.authorUid}`);
          }}
          className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs text-white hover:bg-neutral-900 transition-colors cursor-pointer uppercase tracking-widest"
        >
          <Send className="w-4 h-4" /> [ DIRECT WIRE CREATOR ]
        </button>

        {/* Creator Profile */}
        <button
          onClick={() => {
            onClose();
            router.push(`/${post.authorHandle.replace(/^@/, "")}`);
          }}
          className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs text-white hover:bg-neutral-900 transition-colors cursor-pointer uppercase tracking-widest"
        >
          [ VIEW CREATOR PROFILE ]
        </button>

        {/* Delete (Owner only) */}
        {isOwner && (
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-mono text-xs font-bold text-red-500 hover:bg-red-950/40 transition-colors cursor-pointer uppercase tracking-widest"
          >
            <Trash2 className="w-4 h-4" /> [ DELETE THIS ECHO ]
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 font-mono text-xs text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer uppercase tracking-widest font-bold"
        >
          [ CANCEL ]
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WavesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<WavePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followingUids, setFollowingUids] = useState<Set<string>>(new Set());
  const [reEchoedIds, setReEchoedIds] = useState<Set<string>>(new Set());
  const [commentsDrawerPost, setCommentsDrawerPost] = useState<WavePost | null>(null);
  const [moreMenuPost, setMoreMenuPost] = useState<WavePost | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to real-time posts
  useEffect(() => {
    const unsub = subscribeToPosts((live) => {
      setPosts(
        live.map((p) => ({
          id: p.id,
          audioUrl: p.audioUrl,
          caption: p.caption,
          authorHandle: p.authorHandle || "@ANON",
          authorUid: p.authorUid || "anon",
          pulseCount: p.pulseCount || 0,
          pulsedBy: p.pulsedBy || [],
          durationSec: p.durationSec || 15,
          reverbCount: p.reverbCount || 0,
          createdAt: p.createdAt,
        }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to following list
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToFollowing(user.uid, (list) => {
      setFollowingUids(new Set(list.map((f) => f.followingUid)));
    });
    return () => unsub();
  }, [user]);

  // Load saved state for posts
  useEffect(() => {
    if (!user || posts.length === 0) return;
    async function checkSaves() {
      const savedSet = new Set<string>();
      for (const p of posts) {
        const isSaved = await isPostVaulted(p.id, user!.uid);
        if (isSaved) savedSet.add(p.id);
      }
      setSavedPostIds(savedSet);
    }
    checkSaves();
  }, [user, posts]);

  // IntersectionObserver to track active visible card
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number(e.target.getAttribute("data-wave-idx"));
          if (e.isIntersecting && e.intersectionRatio >= 0.7) {
            setActiveIdx(idx);
          }
        }
      },
      { threshold: 0.7 }
    );
    cardRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [posts]);

  const setCardRef = useCallback((i: number, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(i, el);
    else cardRefs.current.delete(i);
  }, []);

  const handlePulse = async (post: WavePost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const pulsed = post.pulsedBy.includes(user.uid);
    await togglePulsePost(post.id, user.uid, pulsed);
    if (!pulsed) {
      await createNotification(post.authorUid, {
        type: "pulse",
        fromUid: user.uid,
        fromHandle: user.handle || "@ANON",
        postId: post.id,
        postCaption: post.caption,
        text: `${user.handle} pulsed your wave.`,
      });
    }
  };

  const handleReEcho = async (post: WavePost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (reEchoedIds.has(post.id)) {
      showToast("Already re-echoed to your profile!");
      return;
    }
    try {
      await createPost({
        audioUrl: post.audioUrl,
        caption: `[ RE-ECHO ] "${post.caption.slice(0, 60)}${post.caption.length > 60 ? "…" : ""}" — ${post.authorHandle}`,
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        duration: "00:15",
        durationSec: post.durationSec || 15,
        orbitOf: post.id,
        orbitOfHandle: post.authorHandle,
      } as any);

      setReEchoedIds((prev) => new Set([...prev, post.id]));
      showToast("✨ Re-echoed to your profile & followers!");

      if (post.authorUid !== user.uid) {
        await createNotification(post.authorUid, {
          type: "reverb",
          fromUid: user.uid,
          fromHandle: user.handle || "@ANON",
          postId: post.id,
          postCaption: post.caption,
          text: `${user.handle} re-echoed your wave.`,
        });
      }
    } catch (err) {
      console.error("Failed to re-echo:", err);
      showToast("Failed to re-echo wave.");
    }
  };

  const handleSaveToggle = async (post: WavePost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const isSaved = savedPostIds.has(post.id);
    try {
      if (isSaved) {
        await unvaultPost(post.id, user.uid);
        setSavedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
        showToast("Removed from your saved vault.");
      } else {
        await vaultPost(post.id, user.uid);
        setSavedPostIds((prev) => new Set([...prev, post.id]));
        showToast("🔖 Saved to your vault!");
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  const handleToggleOrbit = async (post: WavePost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const isOrb = followingUids.has(post.authorUid);
    try {
      if (isOrb) {
        await unfollowUser(user.uid, post.authorUid);
        showToast(`Stopped orbiting ${post.authorHandle}`);
      } else {
        await followUser(user.uid, post.authorUid, user.handle || "@ANON", post.authorHandle);
        showToast(`💫 Orbiting ${post.authorHandle}!`);
      }
    } catch (err) {
      console.error("Failed to toggle orbit:", err);
    }
  };

  const handleShare = async (post: WavePost) => {
    const url = `${window.location.origin}/${post.authorHandle.replace(/^@/, "")}`;
    const d = { title: `Wave by ${post.authorHandle}`, text: `"${post.caption}"`, url };
    if (navigator.share && navigator.canShare?.(d)) {
      try {
        await navigator.share(d);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${d.text} ${d.url}`);
        showToast("🔗 Link copied to clipboard!");
      } catch {}
    }
  };

  const handleReportPost = async (post: WavePost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const db = getFirebaseDb();
      await addDoc(collection(db, "reports"), {
        postId: post.id,
        postCaption: post.caption,
        authorUid: post.authorUid,
        authorHandle: post.authorHandle,
        reportedByUid: user.uid,
        reportedByHandle: user.handle || "@ANON",
        createdAt: serverTimestamp(),
      });
      showToast("🚩 Echo reported. Our team will review it.");
    } catch (err) {
      showToast("Failed to submit report.");
    }
  };

  const handleDelete = async (post: WavePost) => {
    if (!user || user.uid !== post.authorUid) return;
    if (!confirm("Delete this wave?")) return;
    try {
      await deletePost(post.id);
      showToast("Wave deleted.");
    } catch (error) {
      console.error("Error deleting wave:", error);
    }
  };

  const scrollTo = (dir: number) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollBy({ top: dir * window.innerHeight, behavior: "smooth" });
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-8 h-8 text-white animate-pulse" />
          <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
            TUNING INTO WAVES...
          </span>
        </div>
      </div>
    );

  if (posts.length === 0)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-center px-8">
        <Mic2 className="w-10 h-10 text-neutral-700" />
        <h1 className="font-mono font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">NO WAVES YET</h1>
        <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
          Drop an echo in studio to start a wave.
        </p>
        <Link
          href="/studio"
          className="px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
        >
          [ 🎙 GO TO STUDIO ]
        </Link>
      </div>
    );

  return (
    <div className="relative w-full h-[calc(100dvh-4.5rem)] md:h-screen overflow-hidden bg-black">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-mono text-xs px-4 py-2 rounded-full shadow-2xl tracking-widest uppercase animate-slide-down">
          {toastMessage}
        </div>
      )}

      {/* Snap Scroll Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll no-scrollbar"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {posts.map((post, i) => (
          <div key={post.id} ref={(el) => setCardRef(i, el)} data-wave-idx={i} className="w-full h-full snap-start">
            <WaveCard
              post={post}
              index={i}
              active={activeIdx === i}
              muted={muted}
              isPulsed={user ? post.pulsedBy.includes(user.uid) : false}
              isSaved={savedPostIds.has(post.id)}
              isOrbiting={followingUids.has(post.authorUid)}
              isOwner={user?.uid === post.authorUid}
              isReEchoed={reEchoedIds.has(post.id)}
              onPulse={() => handlePulse(post)}
              onOpenComments={() => setCommentsDrawerPost(post)}
              onReEcho={() => handleReEcho(post)}
              onShare={() => handleShare(post)}
              onSaveToggle={() => handleSaveToggle(post)}
              onOpenMore={() => setMoreMenuPost(post)}
              onProfile={() => router.push(`/${post.authorHandle.replace(/^@/, "")}`)}
              onToggleOrbit={() => handleToggleOrbit(post)}
            />
          </div>
        ))}
      </div>

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-safe pt-3 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/"
            className="font-mono text-[10px] text-white/70 tracking-widest uppercase hover:text-white transition-colors bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10"
          >
            ← [ FREQUENCY ]
          </Link>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="font-mono font-bold text-white text-sm sm:text-base tracking-widest uppercase drop-shadow-lg">[ WAVES ]</span>
        </div>
        {/* Mute toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          className="flex items-center gap-1 font-mono text-[10px] text-white/70 tracking-widest uppercase hover:text-white transition-colors pointer-events-auto bg-black/40 backdrop-blur-sm p-2 rounded-full border border-white/10"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Arrows (Desktop) */}
      <div className="hidden md:flex absolute right-4 bottom-1/2 translate-y-1/2 z-30 flex-col gap-2">
        <button
          onClick={() => scrollTo(-1)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scrollTo(1)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Card Counter */}
      <div className="absolute bottom-20 left-4 z-30 pointer-events-none">
        <span className="font-mono text-[9px] text-white/40 tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
          {activeIdx + 1} / {posts.length}
        </span>
      </div>

      {/* ── Slide-up Comments Sheet ── */}
      {commentsDrawerPost && (
        <CommentsDrawer
          post={commentsDrawerPost}
          onClose={() => setCommentsDrawerPost(null)}
          currentUser={user}
        />
      )}

      {/* ── 3-Dots More Options Menu Sheet ── */}
      {moreMenuPost && (
        <MoreOptionsMenu
          post={moreMenuPost}
          isSaved={savedPostIds.has(moreMenuPost.id)}
          isOwner={user?.uid === moreMenuPost.authorUid}
          onClose={() => setMoreMenuPost(null)}
          onSaveToggle={() => handleSaveToggle(moreMenuPost)}
          onShare={() => handleShare(moreMenuPost)}
          onDelete={() => handleDelete(moreMenuPost)}
          onReport={() => handleReportPost(moreMenuPost)}
          router={router}
        />
      )}
    </div>
  );
}
