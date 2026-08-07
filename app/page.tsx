"use client";

/**
 * ECHO — The Frequency ( / )
 * Real-time Firestore feed + Custom Audio Player
 * Bug-fixed: per-post audio state, waveform animation, reverb, profile links, dedup
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowUp, Flame, Mic2, Repeat2 } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { subscribeToPosts, togglePulsePost } from "@/lib/posts";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface FeedPost {
  id:           string;
  audioUrl:     string;
  caption:      string;
  authorHandle: string;
  authorUid:    string;
  pulseCount:   number;
  pulsedBy:     string[];
  duration:     string;
  durationSec:  number;
  createdAt:    any;
}

// Per-post playback state — keeps each post's timer fully independent
interface PlayState {
  currentSec:  number;
  durationSec: number;
  isPlaying:   boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function formatSecs(s: number): string {
  if (!s || isNaN(s) || s < 0) s = 0;
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/** Rewrite Cloudinary URL to always stream as MP3 for universal browser support */
function toMP3StreamUrl(url: string): string {
  if (!url) return "";
  // Already transformed or non-cloudinary
  if (!url.includes("res.cloudinary.com")) return url;
  // Remove existing transformation flags and inject f_mp3,q_auto
  const base = url.replace(/\/video\/upload\/[^/]*\//, "/video/upload/");
  return base.replace("/video/upload/", "/video/upload/f_mp3,q_auto/");
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVEFORM  — animated bars while playing, static while paused
// ─────────────────────────────────────────────────────────────────────────────
const WAVE_HEIGHTS = [4, 10, 18, 24, 14, 28, 10, 22, 6, 26, 16, 20, 8, 28, 14, 22, 10, 26, 6, 18, 24, 12, 30, 8, 20];

function Waveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-8" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}px`,
            width: "2px",
            backgroundColor: "white",
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
// AUDIO PLAYER COMPONENT  — fully self-contained, one per post
// ─────────────────────────────────────────────────────────────────────────────
function AudioPlayer({
  postId,
  audioUrl,
  fallbackDurationSec,
}: {
  postId: string;
  audioUrl: string;
  fallbackDurationSec: number;
}) {
  const [state, setState] = useState<PlayState>({
    currentSec:  0,
    durationSec: fallbackDurationSec || 15,
    isPlaying:   false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (state.isPlaying) {
      // ── Pause ──
      audioRef.current?.pause();
      setState(s => ({ ...s, isPlaying: false }));
      return;
    }

    // ── Play ──
    if (!audioUrl) return;

    // If we already have an audio element loaded for this post, just resume
    if (audioRef.current && audioRef.current.src) {
      audioRef.current
        .play()
        .then(() => setState(s => ({ ...s, isPlaying: true })))
        .catch(console.warn);
      return;
    }

    const streamUrl = toMP3StreamUrl(audioUrl);
    const audio = new Audio(streamUrl);
    audioRef.current = audio;

    // ── Event wiring ──
    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setState(s => ({ ...s, durationSec: Math.ceil(audio.duration) }));
      }
    };

    audio.ontimeupdate = () => {
      setState(s => ({
        ...s,
        currentSec: audio.currentTime,
        durationSec:
          audio.duration && isFinite(audio.duration)
            ? Math.ceil(audio.duration)
            : s.durationSec,
      }));
    };

    audio.onended = () => {
      setState(s => ({ ...s, isPlaying: false, currentSec: 0 }));
    };

    audio.onerror = () => {
      console.warn(`[Audio] Failed to load: ${audioUrl}`);
      setState(s => ({ ...s, isPlaying: false }));
    };

    // ── Start playback ──
    setState(s => ({ ...s, isPlaying: true, currentSec: 0 }));
    audio.play().catch((err) => {
      console.warn("[Audio] play() blocked:", err);
      setState(s => ({ ...s, isPlaying: false }));
    });
  };

  // Click on the progress bar to seek
  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !state.durationSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * state.durationSec;
    setState(s => ({ ...s, currentSec: audio.currentTime }));
  };

  const progress = state.durationSec > 0
    ? Math.min(100, (state.currentSec / state.durationSec) * 100)
    : 0;

  return (
    <div className="border border-neutral-800 p-4 space-y-3">
      {/* Top row: Play button + Waveform + Timer */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="font-mono text-xs tracking-widest uppercase border border-white px-4 py-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0"
        >
          {state.isPlaying ? "[ ⏸ PAUSE ]" : "[ ▶ PLAY ]"}
        </button>

        {/* Waveform animation */}
        <div className="flex-1 overflow-hidden">
          <Waveform playing={state.isPlaying} />
        </div>

        <span className="font-mono text-xs text-neutral-400 tracking-widest shrink-0">
          {formatSecs(state.currentSec)} / {formatSecs(state.durationSec)}
        </span>
      </div>

      {/* Seekable 1px progress bar */}
      <div
        className="w-full h-1 bg-neutral-900 relative overflow-hidden cursor-pointer"
        onClick={seekTo}
      >
        <div
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERB MODAL  — quick-record a voice reply
// ─────────────────────────────────────────────────────────────────────────────
function ReverbModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-black border border-neutral-800 p-6 space-y-5 m-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest uppercase text-white">
            // REVERB ON {post.authorHandle}
          </p>
          <button onClick={onClose} className="font-mono text-xs text-neutral-600 hover:text-white tracking-widest">[ ✕ ]</button>
        </div>

        <p className="font-serif italic text-neutral-400 text-sm leading-relaxed">
          "{post.caption.slice(0, 80)}{post.caption.length > 80 ? "..." : ""}"
        </p>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <p className="font-mono text-xs tracking-widest text-white uppercase">REVERB SENT ✓</p>
            <p className="font-mono text-xs text-neutral-600">YOUR VOICE IS IN THE FREQUENCY.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
              MAX 60S — UNFILTERED
            </p>
            <button
              onClick={() => {
                setRecording(r => !r);
                if (recording) setDone(true);
              }}
              className={`w-full py-4 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                recording
                  ? "border-white text-white animate-pulse"
                  : "border-neutral-700 text-neutral-400 hover:border-white hover:text-white"
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              {recording ? "[ ⏹ STOP & SEND REVERB ]" : "[ 🎙 HOLD TO RECORD REVERB ]"}
            </button>
            <p className="font-mono text-[10px] text-neutral-700 tracking-widest text-center">
              NAVIGATE TO STUDIO FOR FULL-LENGTH RECORDING
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeFeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverbPost, setReverbPost] = useState<FeedPost | null>(null);

  // Subscribe to real Firestore posts ONLY (echoes are a different collection
  // that may cause duplicates — posts from Studio go into "posts" collection)
  useEffect(() => {
    const unsub = subscribeToPosts((livePosts) => {
      const mapped: FeedPost[] = livePosts.map((p) => ({
        id:           p.id,
        audioUrl:     p.audioUrl,
        caption:      p.caption,
        authorHandle: p.authorHandle || "@ANON",
        authorUid:    p.authorUid || "anon",
        pulseCount:   p.pulseCount || 0,
        pulsedBy:     p.pulsedBy || [],
        duration:     p.duration || "00:15",
        durationSec:  p.durationSec || 15,
        createdAt:    p.createdAt,
      }));
      setPosts(mapped);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Handle Pulse / Upvote
  const handlePulse = async (post: FeedPost) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const isPulsed = (post.pulsedBy || []).includes(user.uid);
    try {
      await togglePulsePost(post.id, user.uid, isPulsed);
    } catch (err) {
      console.error("Pulse error:", err);
    }
  };

  // Navigate to user profile — handle the @ANON_LASJ → /ANON_LASJ routing
  const goToProfile = (handle: string) => {
    const slug = handle.replace(/^@/, "");
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-8 flex flex-col font-sans">
      {/* ── Frequency Ticker ── */}
      <header className="w-full bg-black border-b border-neutral-900 py-2.5 px-4 overflow-x-auto flex items-center">
        <div className="flex items-center gap-5 font-mono text-[10px] tracking-widest text-neutral-500 uppercase whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-white">
            <Flame className="w-3 h-3" /> THE FREQUENCY
          </span>
          <span>•</span>
          <span>LIVE AUDIO FEED</span>
          <span>•</span>
          <span>PURE MONOCHROME</span>
          <span>•</span>
          <span>UNFILTERED VOICES</span>
        </div>
      </header>

      {/* ── Feed ── */}
      <main className="max-w-xl mx-auto px-5 md:px-6 pt-8 w-full flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24 text-neutral-600 font-mono text-xs tracking-widest uppercase animate-pulse">
            CONNECTING TO FREQUENCY...
          </div>
        ) : posts.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6 border border-neutral-900 p-8 my-8">
            <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-neutral-500" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif italic text-2xl text-white">The stream is silent.</h2>
              <p className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                NO ECHOES IN THE FREQUENCY YET
              </p>
            </div>
            <Link
              href="/studio"
              className="px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
            >
              [ 🎙 START THE FREQUENCY ]
            </Link>
          </div>
        ) : (
          /* ── Posts ── */
          <div className="divide-y divide-neutral-900">
            {posts.map((post) => {
              const isPulsed = user ? (post.pulsedBy || []).includes(user.uid) : false;

              return (
                <article key={post.id} className="py-8 space-y-5">
                  {/* ── Author Row ── */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => goToProfile(post.authorHandle)}
                      className="font-mono text-xs tracking-widest text-white hover:underline uppercase cursor-pointer"
                    >
                      {post.authorHandle}
                    </button>
                    <span className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                      AUDIO POST
                    </span>
                  </div>

                  {/* ── Caption ── */}
                  <h2 className="font-serif italic text-2xl md:text-3xl text-white leading-snug">
                    "{post.caption}"
                  </h2>

                  {/* ── Self-Contained Audio Player (no shared state!) ── */}
                  <AudioPlayer
                    postId={post.id}
                    audioUrl={post.audioUrl}
                    fallbackDurationSec={post.durationSec || 15}
                  />

                  {/* ── Interaction Row ── */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handlePulse(post)}
                      className={`flex items-center gap-2 font-mono text-xs tracking-widest uppercase cursor-pointer transition-colors ${
                        isPulsed ? "text-white" : "text-neutral-500 hover:text-white"
                      }`}
                    >
                      <ArrowUp className={`w-3.5 h-3.5 ${isPulsed ? "fill-white" : ""}`} />
                      {formatNum(post.pulseCount)} PULSES
                    </button>

                    <button
                      onClick={() => setReverbPost(post)}
                      className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-neutral-500 uppercase hover:text-white transition-colors cursor-pointer"
                    >
                      <Repeat2 className="w-3.5 h-3.5" />
                      REVERB
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Reverb Modal ── */}
      {reverbPost && (
        <ReverbModal post={reverbPost} onClose={() => setReverbPost(null)} />
      )}
    </div>
  );
}
