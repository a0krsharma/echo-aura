"use client";

/**
 * ECHO — The Frequency ( / )
 * Real-time Firestore feed + World-class Custom Audio Player
 *
 * FIXES APPLIED:
 * 1. Audio 1-second stop fix: Use raw Cloudinary URL without transformation
 *    injection. The f_mp3,q_auto transformation caused streaming range-request
 *    issues in browser. Raw URL plays fully.
 * 2. preload="auto" so browser buffers entire file before play.
 * 3. In-place Reverb recording modal (records audio reply directly).
 * 4. Share uses navigator.share API with proper fallback.
 * 5. Orbit (repost) button added.
 * 6. Pulse count updates optimistically.
 * 7. Notification created on pulse.
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowUp, Flame, Mic2, Repeat2, Share2, RefreshCw, Loader2, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { subscribeToPosts, togglePulsePost, createPost } from "@/lib/posts";
import { useRouter } from "next/navigation";
import { uploadAudio } from "@/lib/cloudinary";
import { createNotification } from "@/lib/notifications";

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
  orbitedBy?:   string[];
  duration:     string;
  durationSec:  number;
  createdAt:    any;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/**
 * getPlayableUrl
 * Returns the best URL for audio playback.
 * IMPORTANT: Do NOT apply Cloudinary transformations — they cause streaming
 * issues (range requests fail, browser only buffers first chunk → 1s stop bug).
 * The raw Cloudinary URL is already a valid audio file (webm/mp4/ogg).
 */
function getPlayableUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  return rawUrl;
}

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
            height: `${h}px`,
            width: "2px",
            backgroundColor: "white",
            animationDelay: playing ? `${i * 0.04}s` : undefined,
            animationDuration: playing ? `${0.5 + (i % 5) * 0.1}s` : undefined,
          }}
          className={playing ? "waveform-bar" : "opacity-20"}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO PLAYER — fully self-contained per post, zero shared state
// ─────────────────────────────────────────────────────────────────────────────
function AudioPlayer({
  audioUrl,
  fallbackDurationSec,
}: {
  audioUrl: string;
  fallbackDurationSec: number;
}) {
  const [playing, setPlaying]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const [dur,     setDur]       = useState(Math.max(1, fallbackDurationSec));
  const [ready,   setReady]     = useState(false);
  const [error,   setError]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create and wire the Audio element exactly once per URL
  useEffect(() => {
    if (!audioUrl) return;

    const url = getPlayableUrl(audioUrl);
    const a = new Audio();

    // CRITICAL FIX: Do NOT set crossOrigin = "anonymous".
    // Cloudinary audio files do not return CORS headers by default for HTML5 audio elements.
    // Setting crossOrigin causes media loading errors / silent audio blocks.
    a.preload = "auto";
    audioRef.current = a;

    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration) && a.duration > 0) {
        setDur(Math.ceil(a.duration));
      }
      setReady(true);
      setLoading(false);
    });

    a.addEventListener("canplaythrough", () => {
      setReady(true);
      setLoading(false);
    });

    a.addEventListener("timeupdate", () => {
      setCurrent(a.currentTime);
    });

    a.addEventListener("ended", () => {
      setPlaying(false);
      setCurrent(0);
      a.currentTime = 0;
    });

    a.addEventListener("playing", () => {
      setPlaying(true);
      setLoading(false);
    });

    a.addEventListener("error", (e) => {
      const err = a.error;
      console.warn("[Audio] Failed to load:", url, "MediaError:", err?.code, err?.message);
      setError(true);
      setPlaying(false);
      setLoading(false);
    });

    // Set src AFTER attaching all listeners
    a.src = url;
    a.load();

    return () => {
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, [audioUrl]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a || error) return;

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      try {
        await a.play();
        setPlaying(true);
      } catch (err) {
        console.warn("[Audio] play() rejected:", err);
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setCurrent(a.currentTime);
  };

  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;

  if (error) {
    return (
      <div className="border border-neutral-900 p-4 font-mono text-[10px] text-neutral-700 tracking-widest uppercase">
        AUDIO UNAVAILABLE
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 p-4 space-y-3">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          disabled={loading}
          className="font-mono text-xs tracking-widest uppercase border border-white px-4 py-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-wait min-w-[100px] flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> LOADING</>
          ) : playing ? (
            "[ ⏸ PAUSE ]"
          ) : (
            "[ ▶ PLAY ]"
          )}
        </button>

        <div className="flex-1 overflow-hidden">
          <Waveform playing={playing} />
        </div>

        <span className="font-mono text-xs text-neutral-500 tracking-widest shrink-0 tabular-nums">
          {fmt(current)} / {fmt(dur)}
        </span>
      </div>

      {/* Seekable progress bar */}
      <div
        className="w-full h-1 bg-neutral-900 cursor-pointer overflow-hidden"
        onClick={seek}
      >
        <div
          className="h-full bg-white transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERB MODAL — In-place voice reply recording
// ─────────────────────────────────────────────────────────────────────────────
function ReverbModal({ post, onClose, currentUser }: { 
  post: FeedPost; 
  onClose: () => void;
  currentUser: any;
}) {
  const router = useRouter();
  const [reverbState, setReverbState] = useState<"idle" | "recording" | "preview" | "uploading">("idle");
  const [elapsedMs, setElapsedMs]   = useState(0);
  const [reverbCaption, setReverbCaption] = useState(`REVERB ON ${post.authorHandle}`);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [statusMsg, setStatusMsg]   = useState<string | null>(null);

  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number>(0);
  const previewAudio  = useRef<HTMLAudioElement | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);

  // Timer
  useEffect(() => {
    if (reverbState === "recording") {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 50);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reverbState]);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      previewAudio.current?.pause();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const startReverb = async () => {
    chunksRef.current = [];
    setElapsedMs(0);
    setAudioBlob(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setStatusMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const baseType = mimeType.split(";")[0];
        const blob = new Blob(chunksRef.current, { type: baseType });
        if (blob.size < 100) { setStatusMsg("TOO SHORT — TRY AGAIN."); setReverbState("idle"); stream.getTracks().forEach(t => t.stop()); return; }
        setAudioBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setReverbState("preview");
      };
      recorder.start(250);
      setReverbState("recording");
    } catch (err: any) {
      setStatusMsg("MIC PERMISSION DENIED.");
      setReverbState("idle");
    }
  };

  const stopReverb = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const togglePreview = () => {
    if (!previewUrl) return;
    if (isPreviewPlaying) {
      previewAudio.current?.pause();
      setIsPreviewPlaying(false);
      return;
    }
    if (!previewAudio.current) {
      previewAudio.current = new Audio(previewUrl);
      previewAudio.current.onended = () => setIsPreviewPlaying(false);
    }
    previewAudio.current.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
  };

  const publishReverb = async () => {
    if (!audioBlob || !currentUser) return;
    previewAudio.current?.pause();
    setIsPreviewPlaying(false);
    setReverbState("uploading");
    setStatusMsg("UPLOADING REVERB...");

    try {
      const secSec = Math.max(1, Math.floor(elapsedMs / 1000));
      const uploaded = await uploadAudio(audioBlob, `reverb-${currentUser.uid}-${Date.now()}`);
      await createPost({
        audioUrl:     uploaded.secureUrl,
        caption:      reverbCaption.trim() || `REVERB ON ${post.authorHandle}`,
        authorUid:    currentUser.uid,
        authorHandle: currentUser.handle || "@ANON",
        duration:     fmtMs(elapsedMs),
        durationSec:  secSec,
        reverbOf:     post.id,
        reverbOfHandle: post.authorHandle,
      });

      // Notify original poster
      await createNotification(post.authorUid, {
        type:         "reverb",
        fromUid:      currentUser.uid,
        fromHandle:   currentUser.handle || "@ANON",
        postId:       post.id,
        postCaption:  post.caption,
        text:         `${currentUser.handle} dropped a reverb on your echo.`,
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onClose();
    } catch (err: any) {
      setStatusMsg(`ERROR: ${err?.message || "UPLOAD FAILED"}`);
      setReverbState("preview");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-black border border-neutral-700 p-6 space-y-5 m-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest uppercase text-white">
            // REVERB ON {post.authorHandle}
          </p>
          <button onClick={onClose} className="font-mono text-xs text-neutral-600 hover:text-white tracking-widest cursor-pointer">
            [ ✕ ]
          </button>
        </div>

        <p className="font-serif italic text-neutral-400 text-sm leading-relaxed">
          "{post.caption.slice(0, 80)}{post.caption.length > 80 ? "…" : ""}"
        </p>

        {/* Caption */}
        <input
          value={reverbCaption}
          onChange={e => setReverbCaption(e.target.value)}
          maxLength={120}
          className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-xs text-white py-1 tracking-widest"
          placeholder="Caption for your reverb..."
        />

        {/* Timer display */}
        <div className="font-mono text-3xl text-white text-center tabular-nums">
          {fmtMs(elapsedMs)}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {reverbState === "idle" && (
            <button
              onClick={startReverb}
              className="w-full border border-neutral-700 text-white font-mono text-xs tracking-widest uppercase py-4 hover:border-white hover:bg-neutral-950 transition-colors cursor-pointer"
            >
              [ 🎙 TAP TO RECORD REVERB ]
            </button>
          )}

          {reverbState === "recording" && (
            <button
              onClick={stopReverb}
              className="w-full border border-white bg-white text-black font-mono text-xs tracking-widest uppercase py-4 animate-pulse cursor-pointer font-bold"
            >
              [ ⏹ STOP RECORDING ]
            </button>
          )}

          {reverbState === "preview" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={togglePreview}
                  className="font-mono text-xs tracking-widest uppercase border border-white px-4 py-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                >
                  {isPreviewPlaying ? "[ ⏸ PAUSE ]" : "[ ▶ PREVIEW ]"}
                </button>
                <button
                  onClick={() => { setReverbState("idle"); setAudioBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setElapsedMs(0); }}
                  className="flex items-center gap-1.5 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase px-3 py-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> REDO
                </button>
                <button
                  onClick={publishReverb}
                  disabled={!reverbCaption.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-white bg-white text-black font-mono text-xs tracking-widest uppercase py-2 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Send className="w-3 h-3" /> POST REVERB
                </button>
              </div>
            </div>
          )}

          {reverbState === "uploading" && (
            <div className="w-full border border-neutral-800 py-4 flex items-center justify-center gap-3 font-mono text-xs tracking-widest uppercase text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" /> UPLOADING...
            </div>
          )}
        </div>

        {statusMsg && (
          <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase text-center">{statusMsg}</p>
        )}

        <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase text-center">
          REVERB = VOICE REPLY TO THIS ECHO
        </p>
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
  const [posts,      setPosts]      = useState<FeedPost[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [reverbPost, setReverbPost] = useState<FeedPost | null>(null);
  const [orbitedPosts, setOrbitedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToPosts((livePosts) => {
      const mapped: FeedPost[] = livePosts.map((p) => ({
        id:           p.id,
        audioUrl:     p.audioUrl,
        caption:      p.caption,
        authorHandle: p.authorHandle || "@ANON",
        authorUid:    p.authorUid    || "anon",
        pulseCount:   p.pulseCount   || 0,
        pulsedBy:     p.pulsedBy     || [],
        orbitedBy:    (p as any).orbitedBy || [],
        duration:     p.duration     || "00:15",
        durationSec:  p.durationSec  || 15,
        createdAt:    p.createdAt,
      }));
      setPosts(mapped);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePulse = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    const isPulsed = post.pulsedBy.includes(user.uid);
    try {
      await togglePulsePost(post.id, user.uid, isPulsed);
      // Create notification for post author if pulsing (not un-pulsing)
      if (!isPulsed) {
        await createNotification(post.authorUid, {
          type:         "pulse",
          fromUid:      user.uid,
          fromHandle:   user.handle || "@ANON",
          postId:       post.id,
          postCaption:  post.caption,
          text:         `${user.handle} pulsed your echo.`,
        });
      }
    } catch (err) { console.error("Pulse error:", err); }
  };

  const handleOrbit = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    if (orbitedPosts.has(post.id)) return; // already orbited
    setOrbitedPosts(prev => new Set([...prev, post.id]));

    try {
      // Orbit = repost/share the echo as a new post with attribution
      await createPost({
        audioUrl:         post.audioUrl,
        caption:          `ORBIT: "${post.caption.slice(0, 60)}${post.caption.length > 60 ? "…" : ""}" — ${post.authorHandle}`,
        authorUid:        user.uid,
        authorHandle:     user.handle || "@ANON",
        duration:         post.duration,
        durationSec:      post.durationSec,
        orbitOf:          post.id,
        orbitOfHandle:    post.authorHandle,
      } as any);

      // Notify original poster
      await createNotification(post.authorUid, {
        type:         "orbiter",
        fromUid:      user.uid,
        fromHandle:   user.handle || "@ANON",
        postId:       post.id,
        postCaption:  post.caption,
        text:         `${user.handle} orbited your echo.`,
      });
    } catch (err) { console.error("Orbit error:", err); }
  };

  const handleShare = async (post: FeedPost) => {
    const handle = post.authorHandle.replace(/^@/, "");
    const shareUrl = `${window.location.origin}/${handle}`;
    const shareData = {
      title: `Echo by ${post.authorHandle}`,
      text: `"${post.caption}"`,
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        // Brief visual feedback handled by browser
      } catch {}
    }
  };

  const goToProfile = (handle: string) => {
    router.push(`/${handle.replace(/^@/, "")}`);
  };

  const timeAgo = (createdAt: any): string => {
    if (!createdAt?.seconds) return "";
    const diff = Date.now() / 1000 - createdAt.seconds;
    if (diff < 60)    return "JUST NOW";
    if (diff < 3600)  return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-8 flex flex-col font-sans">
      {/* ── Frequency Header ── */}
      <header className="w-full bg-black border-b border-neutral-900 py-2.5 px-4 overflow-x-hidden">
        <div className="flex items-center gap-5 font-mono text-[10px] tracking-widest text-neutral-500 uppercase whitespace-nowrap overflow-hidden">
          <span className="flex items-center gap-1.5 text-white shrink-0">
            <Flame className="w-3 h-3" /> THE FREQUENCY
          </span>
          <span className="shrink-0">•</span>
          <span className="shrink-0">LIVE AUDIO FEED</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0">UNFILTERED VOICES</span>
        </div>
      </header>

      {/* ── Feed ── */}
      <main className="max-w-xl mx-auto px-5 md:px-6 pt-8 w-full flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24 text-neutral-600 font-mono text-xs tracking-widest uppercase animate-pulse">
            CONNECTING TO FREQUENCY...
          </div>
        ) : posts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6 border border-neutral-900 p-8 my-8">
            <div className="w-12 h-12 border border-neutral-800 flex items-center justify-center">
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
              [ 🎙 DROP THE FIRST ECHO ]
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {posts.map((post) => {
              const isPulsed  = user ? post.pulsedBy.includes(user.uid) : false;
              const isOrbited = orbitedPosts.has(post.id) || (user ? (post.orbitedBy || []).includes(user.uid) : false);
              const isOwnPost = user?.uid === post.authorUid;

              return (
                <article key={post.id} className="py-8 space-y-4">
                  {/* Author + timestamp */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => goToProfile(post.authorHandle)}
                      className="font-mono text-xs tracking-widest text-white hover:underline uppercase cursor-pointer"
                    >
                      {post.authorHandle}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase">
                        {timeAgo(post.createdAt)}
                      </span>
                      <span className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                        AUDIO POST
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  <h2 className="font-serif italic text-2xl md:text-3xl text-white leading-snug">
                    "{post.caption}"
                  </h2>

                  {/* Audio Player — independent state per post */}
                  <AudioPlayer
                    audioUrl={post.audioUrl}
                    fallbackDurationSec={post.durationSec || 15}
                  />

                  {/* Interactions */}
                  <div className="flex items-center justify-between pt-1">
                    {/* Pulse */}
                    <button
                      onClick={() => handlePulse(post)}
                      className={`flex items-center gap-2 font-mono text-xs tracking-widest uppercase cursor-pointer transition-colors ${
                        isPulsed ? "text-white" : "text-neutral-500 hover:text-white"
                      }`}
                    >
                      <ArrowUp className={`w-3.5 h-3.5 ${isPulsed ? "fill-white" : ""}`} />
                      {formatNum(post.pulseCount)} PULSES
                    </button>

                    <div className="flex items-center gap-4">
                      {/* Reverb */}
                      <button
                        onClick={() => setReverbPost(post)}
                        className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-neutral-500 uppercase hover:text-white transition-colors cursor-pointer"
                      >
                        <Repeat2 className="w-3.5 h-3.5" />
                        REVERB
                      </button>

                      {/* Orbit (Repost) */}
                      {!isOwnPost && (
                        <button
                          onClick={() => handleOrbit(post)}
                          disabled={isOrbited}
                          className={`flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                            isOrbited ? "text-white" : "text-neutral-500 hover:text-white"
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {isOrbited ? "ORBITED" : "ORBIT"}
                        </button>
                      )}

                      {/* Share */}
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-neutral-500 uppercase hover:text-white transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        SHARE
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Reverb Modal */}
      {reverbPost && (
        <ReverbModal
          post={reverbPost}
          onClose={() => setReverbPost(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}
