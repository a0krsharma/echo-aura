"use client";

/**
 * WAVES — Audio Reel Feed (/waves)
 * Full-screen vertical scroll feed, like TikTok/Reels but pure audio.
 * Snap-scroll between cards, auto-play on snap, side action bar.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Repeat2, Share2, Volume2, VolumeX, Mic2, Loader2, ChevronUp, ChevronDown, Zap, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { subscribeToPosts, togglePulsePost, deletePost } from "@/lib/posts";
import { useAuth } from "@/app/components/AuthProvider";
import { createNotification } from "@/lib/notifications";

interface WavePost {
  id: string; audioUrl: string; caption: string;
  authorHandle: string; authorUid: string;
  pulseCount: number; pulsedBy: string[];
  durationSec: number; reverbCount: number; createdAt: any;
}

function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s/60).toString().padStart(2,"0")}:${Math.floor(s%60).toString().padStart(2,"0")}`;
}
function fmtNum(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }

// ── Big animated waveform ──────────────────────────────────────────────────────
const BARS = [12,22,36,48,28,56,20,44,12,52,32,40,16,56,28,44,20,52,12,36,48,24,60,16,40];

function BigWaveform({ playing, color }: { playing: boolean; color: string }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {BARS.map((h, i) => (
        <div key={i} style={{
          height: `${h}px`, width: "3px", backgroundColor: color,
          borderRadius: "2px", opacity: playing ? 1 : 0.25,
          animationDelay: playing ? `${i * 0.04}s` : undefined,
          animationDuration: playing ? `${0.5+(i%5)*0.12}s` : undefined,
          transition: "height 0.3s ease",
        }} className={playing ? "waveform-bar" : ""} />
      ))}
    </div>
  );
}

// ── Per-card audio engine ──────────────────────────────────────────────────────
function useWaveAudio(src: string, durationSec: number, active: boolean, muted: boolean) {
  const audioRef  = useRef<HTMLAudioElement|null>(null);
  const [playing, setPlaying]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const [dur,     setDur]       = useState(Math.max(1, durationSec));
  const [loading, setLoading]   = useState(false);
  const [failed,  setFailed]    = useState(false);

  // Build audio element once per src
  useEffect(() => {
    const a = new Audio(src);
    a.preload = "auto"; a.crossOrigin = "anonymous";
    a.onloadedmetadata = () => { if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration)); };
    a.ontimeupdate    = () => setCurrent(a.currentTime);
    a.onplaying       = () => { setPlaying(true); setLoading(false); };
    a.onpause         = () => setPlaying(false);
    a.onended         = () => { setPlaying(false); setCurrent(0); };
    a.onerror         = () => setFailed(true);
    audioRef.current  = a;
    return () => { a.pause(); a.src = ""; };
  }, [src]);

  // Sync mute
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  // Active = play, inactive = pause
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (active && !failed) {
      a.volume = 1; a.muted = muted; setLoading(true);
      a.play().catch(() => { setLoading(false); });
    } else {
      a.pause(); setCurrent(0);
    }
  }, [active, failed]);

  const toggle = async () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); }
    else { setLoading(true); a.play().catch(() => setLoading(false)); }
  };

  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;
  return { playing, current, dur, pct, loading, failed, toggle };
}

// ── Accent palette for cards ───────────────────────────────────────────────────
const ACCENTS = [
  { bg: "from-violet-950 via-black to-black",  wave: "#a78bfa", tag: "bg-violet-900/40 text-violet-300" },
  { bg: "from-blue-950 via-black to-black",    wave: "#60a5fa", tag: "bg-blue-900/40 text-blue-300"   },
  { bg: "from-rose-950 via-black to-black",    wave: "#fb7185", tag: "bg-rose-900/40 text-rose-300"   },
  { bg: "from-emerald-950 via-black to-black", wave: "#34d399", tag: "bg-emerald-900/40 text-emerald-300" },
  { bg: "from-amber-950 via-black to-black",   wave: "#fbbf24", tag: "bg-amber-900/40 text-amber-300" },
];

// ── Wave Card ─────────────────────────────────────────────────────────────────
function WaveCard({ post, index, active, muted, onPulse, onReverb, onShare, onProfile, onDelete, isPulsed, isOwner }: {
  post: WavePost; index: number; active: boolean; muted: boolean;
  onPulse: ()=>void; onReverb: ()=>void; onShare: ()=>void; onProfile: ()=>void; onDelete: ()=>void;
  isPulsed: boolean; isOwner: boolean;
}) {
  const { bg, wave, tag } = ACCENTS[index % ACCENTS.length];
  const { playing, pct, loading, failed, toggle } = useWaveAudio(post.audioUrl, post.durationSec, active, muted);

  return (
    <div className={`relative w-full h-screen flex-shrink-0 snap-start overflow-hidden bg-gradient-to-b ${bg}`}>
      {/* Tap to play/pause overlay */}
      <button
        onClick={toggle}
        className="absolute inset-0 w-full h-full z-10 cursor-pointer"
        aria-label={playing ? "Pause" : "Play"}
      />

      {/* Center waveform */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
        <BigWaveform playing={playing} color={wave} />

        {/* Play/pause indicator */}
        <div className={`transition-all duration-300 ${playing ? "opacity-0 scale-75" : "opacity-80 scale-100"}`}>
          {loading
            ? <Loader2 className="w-12 h-12 text-white animate-spin" />
            : failed
              ? <span className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">AUDIO UNAVAILABLE</span>
              : <div className="w-16 h-16 rounded-full border-2 border-white/40 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-0 h-0 border-t-8 border-b-8 border-l-14 border-t-transparent border-b-transparent border-l-white ml-1" style={{borderLeftWidth:"18px"}} />
                </div>
          }
        </div>
      </div>

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20 pointer-events-none">
        <div className="h-full transition-none" style={{ width: `${pct}%`, backgroundColor: wave }} />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-24 left-4 right-20 z-20 space-y-2 pointer-events-none">
        <button
          onClick={onProfile}
          className="font-mono text-xs tracking-widest text-white hover:underline uppercase pointer-events-auto"
        >
          {post.authorHandle}
        </button>
        <p className="font-serif italic text-white text-xl leading-snug drop-shadow-lg line-clamp-3">
          "{post.caption}"
        </p>
        <div className="flex items-center gap-2 pointer-events-none">
          <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${tag}`}>
            WAVE
          </span>
        </div>
      </div>

      {/* Right action bar */}
      <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-6">
        {/* Pulse */}
        <button onClick={onPulse} className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${isPulsed ? "bg-white border-white" : "border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm"}`}>
            <ArrowUp className={`w-5 h-5 ${isPulsed ? "text-black fill-black" : "text-white"}`} />
          </div>
          <span className="font-mono text-[9px] text-white/80 tracking-widest">{fmtNum(post.pulseCount)}</span>
        </button>

        {/* Reverb */}
        <button onClick={onReverb} className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto">
          <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm transition-all">
            <Repeat2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-mono text-[9px] text-white/80 tracking-widest">{fmtNum(post.reverbCount||0)}</span>
        </button>

        {/* Share */}
        <button onClick={onShare} className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto">
          <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/30 group-hover:border-white bg-black/40 backdrop-blur-sm transition-all">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-mono text-[9px] text-white/80 tracking-widest">SHARE</span>
        </button>

        {/* Delete (owner only) */}
        {isOwner && (
          <button onClick={onDelete} className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto">
            <div className="w-11 h-11 rounded-full flex items-center justify-center border border-red-500/30 group-hover:border-red-500 bg-black/40 backdrop-blur-sm transition-all">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <span className="font-mono text-[9px] text-red-500/80 tracking-widest">DELETE</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WavesPage() {
  const { user }   = useAuth();
  const router     = useRouter();
  const [posts, setPosts]       = useState<WavePost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted]       = useState(false);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const cardRefs     = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    const unsub = subscribeToPosts(live => {
      setPosts(live.map(p => ({
        id: p.id, audioUrl: p.audioUrl, caption: p.caption,
        authorHandle: p.authorHandle || "@ANON", authorUid: p.authorUid || "anon",
        pulseCount: p.pulseCount || 0, pulsedBy: p.pulsedBy || [],
        durationSec: p.durationSec || 15, reverbCount: p.reverbCount || 0,
        createdAt: p.createdAt,
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // IntersectionObserver to track which card is visible
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        const idx = Number(e.target.getAttribute("data-wave-idx"));
        if (e.isIntersecting && e.intersectionRatio >= 0.7) {
          setActiveIdx(idx);
        }
      }
    }, { threshold: 0.7 });
    cardRefs.current.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [posts]);

  const setCardRef = useCallback((i: number, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(i, el); else cardRefs.current.delete(i);
  }, []);

  const handlePulse = async (post: WavePost) => {
    if (!user) { router.push("/login"); return; }
    const pulsed = post.pulsedBy.includes(user.uid);
    await togglePulsePost(post.id, user.uid, pulsed);
    if (!pulsed) await createNotification(post.authorUid, {
      type:"pulse", fromUid:user.uid, fromHandle:user.handle||"@ANON",
      postId:post.id, postCaption:post.caption, text:`${user.handle} pulsed your wave.`
    });
  };

  const handleShare = async (post: WavePost) => {
    const url = `${window.location.origin}/${post.authorHandle.replace(/^@/,"")}`;
    const d = { title:`Wave by ${post.authorHandle}`, text:`"${post.caption}"`, url };
    if (navigator.share && navigator.canShare?.(d)) { try { await navigator.share(d); } catch {} }
    else { try { await navigator.clipboard.writeText(`${d.text} ${d.url}`); } catch {} }
  };

  const handleDelete = async (post: WavePost) => {
    if (!user || user.uid !== post.authorUid) return;
    if (!confirm("Delete this wave?")) return;
    try {
      await deletePost(post.id);
    } catch (error) {
      console.error("Error deleting wave:", error);
    }
  };

  const scrollTo = (dir: number) => {
    const c = containerRef.current; if (!c) return;
    c.scrollBy({ top: dir * window.innerHeight, behavior: "smooth" });
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Zap className="w-8 h-8 text-white animate-pulse" />
        <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">TUNING INTO WAVES...</span>
      </div>
    </div>
  );

  if (posts.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-center px-8">
      <Mic2 className="w-10 h-10 text-neutral-700" />
      <h1 className="font-serif italic text-3xl text-white">No waves yet.</h1>
      <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">Drop an echo in studio to start a wave.</p>
      <Link href="/studio" className="px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors">
        [ 🎙 GO TO STUDIO ]
      </Link>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="w-full h-screen overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
      >
        {posts.map((post, i) => (
          <div key={post.id} ref={el => setCardRef(i, el)} data-wave-idx={i}>
            <WaveCard
              post={post} index={i}
              active={activeIdx === i}
              muted={muted}
              isPulsed={user ? post.pulsedBy.includes(user.uid) : false}
              isOwner={user?.uid === post.authorUid}
              onPulse={() => handlePulse(post)}
              onReverb={() => router.push("/")}
              onShare={() => handleShare(post)}
              onProfile={() => router.push(`/${post.authorHandle.replace(/^@/,"")}`)}
              onDelete={() => handleDelete(post)}
            />
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-safe pt-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href="/" className="font-mono text-[10px] text-white/60 tracking-widest uppercase hover:text-white transition-colors">
            ← FREQ
          </Link>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="font-serif italic text-white text-lg drop-shadow-lg">Waves</span>
        </div>
        {/* Mute toggle */}
        <button
          onClick={() => setMuted(m => !m)}
          className="flex items-center gap-1 font-mono text-[10px] text-white/60 tracking-widest uppercase hover:text-white transition-colors pointer-events-auto"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav arrows (desktop) */}
      <div className="hidden md:flex absolute right-4 bottom-1/2 translate-y-1/2 z-30 flex-col gap-2">
        <button onClick={() => scrollTo(-1)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer">
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => scrollTo(1)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer">
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Card counter */}
      <div className="absolute bottom-24 left-4 z-30 pointer-events-none">
        <span className="font-mono text-[9px] text-white/30 tracking-widest">{activeIdx+1} / {posts.length}</span>
      </div>
    </div>
  );
}
