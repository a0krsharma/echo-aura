"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Flame, Mic2, Share, Share2, Repeat2,
  Loader2, Send, Trash2, ChevronDown, ChevronUp,
  Heart, AtSign, Music,
  Bot, Sparkles, Bookmark, BarChart2,
  Play, Pause, RotateCcw, RotateCw, Check, Plus,
  MessageCircle, Volume2, Sparkle, Radio
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  subscribeToPosts, togglePulsePost, createPost, deletePost,
  subscribeToPostReverbs, addPostReverb, togglePulsePostReverb,
  toggleReverbReaction, incrementPostViews,
  type PostReverbItem,
} from "@/lib/posts";
import {
  addBookmark, removeBookmark, subscribeToUserBookmarks,
} from "@/lib/bookmarks";
import { useRouter } from "next/navigation";
import { uploadAudio, getPlayableUrl } from "@/lib/cloudinary";
import { createNotification } from "@/lib/notifications";
import { followUser, unfollowUser, subscribeToFollowing } from "@/lib/follows";
import { audioManager } from "@/lib/audioManager";
import { subscribeToPostComments, createComment, toggleLikeComment, deleteComment, type CommentItem } from "@/lib/comments";
import { SOUND_CATALOG } from "@/lib/soundCatalog";
import { soundSynth } from "@/lib/soundSynthesizer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedPost {
  id: string; audioUrl: string; caption: string;
  authorHandle: string; authorUid: string;
  pulseCount: number; pulsedBy: string[];
  orbitedBy?: string[]; duration: string; durationSec: number;
  reverbCount: number; commentCount: number;
  viewsCount?: number; bookmarkCount?: number; createdAt: any;
  newsTopic?: string | null;
  newsHeadline?: string | null;
  newsLink?: string | null;
  tags?: string[];
  category?: string;
  isNeural?: boolean;
  isCloned?: boolean;
  audioTrackId?: string;
  audioTrackTitle?: string;
  audioTrackArtist?: string;
  isVoiceMeme?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n: number) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function formatRelativeTime(c: any) {
  if (!c?.seconds) return "now";
  const d = Math.floor(Date.now() / 1000 - c.seconds);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return `${Math.floor(d / 604800)}w`;
}

function getAvatarGradient(handle: string) {
  const gradients = [
    "from-purple-500 to-indigo-600",
    "from-cyan-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
    "from-blue-500 to-cyan-600",
  ];
  let hash = 0;
  const clean = handle.replace(/^@/, "");
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// ─── Hashtag & Mention Parser ─────────────────────────────────────────────────
function parseCaption(caption: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(#\w+)|(@\w+)/g;
  let match;
  
  while ((match = regex.exec(caption)) !== null) {
    if (match.index > lastIndex) {
      parts.push(caption.slice(lastIndex, match.index));
    }
    
    const [fullMatch] = match;
    const isHashtag = fullMatch.startsWith('#');
    const isMention = fullMatch.startsWith('@');
    
    if (isHashtag) {
      parts.push(
        <Link
          key={match.index}
          href={`/hashtag/${encodeURIComponent(fullMatch.replace(/^#/, ''))}`}
          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    } else if (isMention) {
      parts.push(
        <Link
          key={match.index}
          href={`/${encodeURIComponent(fullMatch.replace(/^@/, ''))}`}
          className="text-white hover:underline font-semibold transition-colors inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < caption.length) {
    parts.push(caption.slice(lastIndex));
  }
  
  return parts;
}

// ─── Waveform Visualizer ──────────────────────────────────────────────────────
const WAVE_H = [4, 10, 18, 24, 14, 28, 10, 22, 6, 26, 16, 20, 8, 28, 14, 22, 10, 26, 6, 18, 24, 12, 30, 8, 20];

function Waveform({ playing, small, audioRef }: { playing: boolean; small?: boolean; audioRef?: React.RefObject<HTMLAudioElement | null> }) {
  const [waveformData, setWaveformData] = useState<number[]>(WAVE_H);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef?.current || !playing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const audio = audioRef.current;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
    }
    
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioContext.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
      } catch (error) {
        // Source already connected, ignore
      }
    }
    
    const analyser = analyserRef.current;
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      const count = small ? 12 : 24;
      const newWaveform = Array.from({ length: count }, (_, i) => {
        const dataIndex = Math.floor(i * (bufferLength / count));
        const value = dataArray[dataIndex] || 0;
        return Math.max(3, Math.floor((value / 255) * (small ? 16 : 28)));
      });
      
      setWaveformData(newWaveform);
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playing, audioRef, small]);

  const bars = small ? waveformData.slice(0, 12) : waveformData;

  return (
    <div className={`flex items-center gap-[2.5px] ${small ? "h-4" : "h-7"}`} aria-hidden>
      {bars.map((h, i) => (
        <div 
          key={i} 
          style={{
            height: playing ? `${h}px` : `${Math.max(3, (WAVE_H[i % WAVE_H.length] || 10) * (small ? 0.45 : 0.75))}px`,
            width: small ? "2px" : "2.5px",
            transition: "height 0.06s ease-out",
          }} 
          className={`rounded-full transition-all duration-75 ${
            playing ? "bg-white" : "bg-neutral-700/60"
          }`} 
        />
      ))}
    </div>
  );
}

// ─── URL helpers ──────────────────────────────────────────────────────────────
function buildUrlVariants(rawUrl: string): string[] {
  if (!rawUrl) return [];
  const playable = getPlayableUrl(rawUrl);
  return [playable];
}

// ─── Audio Player (Modern, Tactile, Sleek) ───────────────────────────────────
function AudioPlayer({ audioUrl, fallbackDurationSec, isActive, onPlayToggle, small, onFirstPlay }: {
  audioUrl: string; fallbackDurationSec: number;
  isActive?: boolean; onPlayToggle?: (p: boolean) => void; small?: boolean; onFirstPlay?: () => void;
}) {
  const variants = buildUrlVariants(audioUrl);
  const [vi, setVi]           = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur]         = useState(Math.max(1, fallbackDurationSec));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed]   = useState(false);
  const [speed, setSpeed]     = useState(1);
  const audioRef              = useRef<HTMLAudioElement | null>(null);
  const instanceIdRef         = useRef<string | null>(null);
  const hasTriggeredPlayRef   = useRef(false);
  const src                   = variants[vi] || audioUrl;

  useEffect(() => {
    instanceIdRef.current = `audio-${audioUrl}-${Date.now()}`;
    return () => {
      if (instanceIdRef.current) {
        audioManager.unregister(instanceIdRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    setVi(0);
    setFailed(false);
    setPlaying(false);
    setCurrent(0);
    setDur(Math.max(1, fallbackDurationSec));
    setSpeed(1);
    hasTriggeredPlayRef.current = false;
  }, [audioUrl, fallbackDurationSec]);

  useEffect(() => {
    const a = audioRef.current;
    const id = instanceIdRef.current;
    if (!a || !id) return;
    audioManager.register(id, a, 1);
    return () => {
      if (id) audioManager.unregister(id);
    };
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.src !== src) {
      a.src = src;
      a.preload = "none";
    }
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !instanceIdRef.current) return;
    if (!isActive && playing) {
      a.pause();
      audioManager.pause(instanceIdRef.current);
      setPlaying(false);
    }
  }, [isActive]);

  const onErr = () => {
    setPlaying(false);
    setLoading(false);
    const next = vi + 1;
    if (next < variants.length) setVi(next);
    else setFailed(true);
  };

  const toggle = async () => {
    const a = audioRef.current; 
    const id = instanceIdRef.current;
    if (!a || !id) return;
    
    if (playing) { 
      a.pause();
      audioManager.pause(id);
      setPlaying(false); 
      onPlayToggle?.(false); 
    } else {
      if (!hasTriggeredPlayRef.current) {
        hasTriggeredPlayRef.current = true;
        onFirstPlay?.();
      }
      a.volume = 1;
      a.muted = false;
      setLoading(true);
      if (!a.src) a.src = src;
      try { 
        const granted = await audioManager.requestPlay(id);
        if (granted) {
          setPlaying(true);
          onPlayToggle?.(true);
        } else {
          await a.play();
          setPlaying(true);
          onPlayToggle?.(true);
        }
      } catch {
        try {
          await a.play();
          setPlaying(true);
          onPlayToggle?.(true);
        } catch {
          onErr();
        }
      } finally { 
        setLoading(false); 
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const target = pos * a.duration;
    a.currentTime = target;
    setCurrent(target);
  };

  const skip = (delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const target = Math.max(0, Math.min(a.duration, a.currentTime + delta));
    a.currentTime = target;
    setCurrent(target);
    soundSynth.playSubtlePop();
  };

  const changeSpeed = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    soundSynth.playSubtlePop();
  };

  if (failed) return (
    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
      <span className="text-neutral-500 font-medium">Audio unavailable</span>
      <button 
        onClick={() => { setVi(0); setFailed(false); }} 
        className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className={`bg-neutral-950/80 border border-neutral-850 rounded-2xl ${small ? "p-2.5" : "p-3.5 sm:p-4"} space-y-2.5 shadow-sm`}>
      <audio 
        key={src} 
        ref={audioRef} 
        src={src} 
        preload="metadata" 
        playsInline 
        crossOrigin="anonymous"
        onLoadedMetadata={e => {
          const el = e.currentTarget;
          if (isFinite(el.duration) && el.duration > 0) setDur(Math.ceil(el.duration));
        }}
        onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
        onPlaying={() => { setPlaying(true); setLoading(false); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); onPlayToggle?.(false); }}
        onError={onErr} 
        style={{ display: "none" }} 
      />
      
      <div className="flex items-center gap-3">
        {/* Tactile Play/Pause Button */}
        <button 
          type="button"
          onClick={toggle} 
          disabled={loading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 ${
            playing 
              ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
              : "bg-white text-black hover:bg-neutral-200"
          } disabled:opacity-50`}
          title={playing ? "Pause Audio" : "Play Audio"}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : playing ? (
            <Pause className="w-4 h-4 fill-black text-black" />
          ) : (
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
          )}
        </button>

        {/* Visualizer & Scrubber Wave */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer select-none py-1" onClick={seek} title="Click to seek">
          <div className="flex-1 flex items-center">
            <Waveform playing={playing} small={small} audioRef={audioRef} />
          </div>
        </div>

        {/* Controls: Skip, Speed & Time */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono select-none">
          {!small && (
            <>
              <button
                type="button"
                onClick={(e) => skip(-5, e)}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex items-center justify-center"
                title="Rewind 5 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => skip(5, e)}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex items-center justify-center"
                title="Skip 5 seconds"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                onClick={changeSpeed} 
                className="px-1.5 py-0.5 rounded text-[11px] text-neutral-400 hover:text-white hover:bg-neutral-900 font-semibold transition-colors"
                title="Change speed"
              >
                {speed}x
              </button>
            </>
          )}
          <span className="text-[11px] text-neutral-400 tabular-nums ml-1">
            {fmt(current)} / {fmt(dur)}
          </span>
        </div>
      </div>

      {/* Sleek Progress Scrubber Slider */}
      <div className="w-full relative flex items-center select-none pt-0.5">
        <input
          type="range"
          min={0}
          max={dur || 1}
          step={0.1}
          value={current}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            const a = audioRef.current;
            if (a && isFinite(a.duration)) {
              a.currentTime = val;
              setCurrent(val);
            }
          }}
          className="w-full h-1 bg-neutral-850 hover:bg-neutral-800 rounded-full appearance-none cursor-pointer accent-white transition-all focus:outline-none"
          title="Slide to seek audio"
        />
      </div>
    </div>
  );
}

// ─── Reply Record Modal ───────────────────────────────────────────────────────
function ReplyRecordModal({ postId, postCaption, postAuthorHandle, postAuthorUid, reverbOfReverbId, reverbOfHandle, currentUser, onClose }: {
  postId: string; postCaption: string; postAuthorHandle: string; postAuthorUid: string;
  reverbOfReverbId?: string; reverbOfHandle?: string; currentUser: any; onClose: () => void;
}) {
  const [state, setState]       = useState<"idle" | "recording" | "preview" | "uploading">("idle");
  const [ms, setMs]             = useState(0);
  const [caption, setCaption]   = useState(`@${(reverbOfHandle || postAuthorHandle).replace(/^@/, "")} `);
  const [blob, setBlob]         = useState<Blob | null>(null);
  const [previewUrl, setPrev]   = useState<string | null>(null);
  const [prevPlaying, setPP]    = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);
  const recRef                  = useRef<MediaRecorder | null>(null);
  const chunks                  = useRef<Blob[]>([]);
  const timer                   = useRef<any>(null);
  const t0                      = useRef(0);
  const prevAudio               = useRef<HTMLAudioElement | null>(null);
  const stream                  = useRef<MediaStream | null>(null);

  const fmtMs = (v: number) => `${Math.floor(v / 60000).toString().padStart(2, "0")}:${Math.floor((v % 60000) / 1000).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (state === "recording") {
      t0.current = Date.now() - ms;
      timer.current = setInterval(() => setMs(Date.now() - t0.current), 50);
    } else {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [state]);

  useEffect(() => () => {
    stream.current?.getTracks().forEach(t => t.stop());
    prevAudio.current?.pause();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, []);

  const startRec = async () => {
    chunks.current = []; setMs(0); setBlob(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPrev(null); }
    setMsg(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      let mime = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mime = "audio/mp4";
      const rec = new MediaRecorder(s, { mimeType: mime });
      recRef.current = rec;
      rec.ondataavailable = e => { if (e.data?.size > 0) chunks.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunks.current, { type: mime.split(";")[0] });
        if (b.size < 100) { setMsg("Audio take too short."); setState("idle"); s.getTracks().forEach(t => t.stop()); return; }
        setBlob(b);
        setPrev(URL.createObjectURL(b));
        s.getTracks().forEach(t => t.stop());
        setState("preview");
      };
      rec.start();
      setState("recording");
      soundSynth.playSubtlePop();
    } catch {
      setMsg("Microphone permission denied.");
      setState("idle");
    }
  };

  const stopRec = () => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  };

  const togglePrev = () => {
    if (!previewUrl) return;
    if (prevPlaying) { prevAudio.current?.pause(); setPP(false); return; }
    if (!prevAudio.current) {
      prevAudio.current = new Audio(previewUrl);
      prevAudio.current.onended = () => setPP(false);
    }
    prevAudio.current.play().then(() => setPP(true)).catch(() => {});
  };

  const publish = async () => {
    if (!blob || !currentUser) return;
    prevAudio.current?.pause(); setPP(false); setState("uploading"); setMsg("Uploading voice take...");
    try {
      const sec = Math.max(1, Math.floor(ms / 1000));
      const up = await uploadAudio(blob, `rev-${currentUser.uid}-${Date.now()}`);
      await addPostReverb(postId, {
        uid: currentUser.uid,
        handle: currentUser.handle || "@ANON",
        audioUrl: up.secureUrl,
        caption: caption.trim() || `@${postAuthorHandle} REPLY`,
        durationSec: sec,
        reverbOfReverbId,
        reverbOfHandle
      });
      await createNotification(postAuthorUid, {
        type: "reverb",
        fromUid: currentUser.uid,
        fromHandle: currentUser.handle || "@ANON",
        postId,
        postCaption,
        text: `${currentUser.handle} dropped a voice reply on your echo.`
      });
      soundSynth.playSubtlePop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onClose();
    } catch (e: any) {
      setMsg(`Upload failed: ${e?.message || "Error"}`);
      setState("preview");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {reverbOfHandle ? `Reply to ${reverbOfHandle}` : `Reply to ${postAuthorHandle}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors">
            ✕
          </button>
        </div>

        <p className="text-xs text-neutral-400 line-clamp-2 bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-850">
          "{postCaption}"
        </p>

        <div className="flex items-center gap-2 bg-neutral-900/60 border border-neutral-800 rounded-xl px-3 py-2">
          <AtSign className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <input 
            value={caption} 
            onChange={e => setCaption(e.target.value)} 
            maxLength={140}
            className="flex-1 bg-transparent outline-none text-xs text-white placeholder-neutral-600"
            placeholder="Add note or caption..."
          />
        </div>

        <div className="font-mono text-3xl font-bold text-white text-center tabular-nums py-2">
          {fmtMs(ms)}
        </div>

        <div className="space-y-3">
          {state === "idle" && (
            <>
              <button 
                onClick={startRec} 
                className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
              >
                <Mic2 className="w-4 h-4 fill-current" />
                <span>Tap to Record Voice Take</span>
              </button>

              {/* Instant Viral Voice Meme Soundboard */}
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <span className="text-[11px] text-neutral-400 font-semibold block">
                  Quick Voice Memes
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {SOUND_CATALOG.filter(s => s.isVoiceMeme).slice(0, 6).map((meme) => (
                    <button
                      key={meme.id}
                      type="button"
                      onClick={async () => {
                        if (!currentUser) return;
                        setState("uploading");
                        setMsg(`Dropping "${meme.title}"...`);
                        try {
                          await addPostReverb(postId, {
                            uid: currentUser.uid,
                            handle: currentUser.handle || "@ANON",
                            audioUrl: meme.audioUrl,
                            caption: caption.trim() || `[ V-MEME: "${meme.title}" ]`,
                            durationSec: meme.durationSec,
                            reverbOfReverbId,
                            reverbOfHandle,
                            isVoiceMeme: true,
                            audioTrackTitle: meme.title,
                          });
                          await createNotification(postAuthorUid, {
                            type: "reverb",
                            fromUid: currentUser.uid,
                            fromHandle: currentUser.handle || "@ANON",
                            postId,
                            postCaption,
                            text: `${currentUser.handle} dropped a voice meme on your echo.`,
                          });
                          onClose();
                        } catch (e: any) {
                          setMsg(`Error: ${e?.message || "Failed"}`);
                          setState("idle");
                        }
                      }}
                      className="p-2 bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 rounded-xl text-left text-xs text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{meme.title}</span>
                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                        {meme.durationSec}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {state === "recording" && (
            <button 
              onClick={stopRec} 
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3.5 rounded-2xl animate-pulse cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Stop Recording</span>
            </button>
          )}

          {state === "preview" && (
            <div className="flex gap-2.5">
              <button 
                onClick={togglePrev} 
                className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {prevPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{prevPlaying ? "Pause" : "Play"}</span>
              </button>
              <button 
                onClick={() => { setState("idle"); setBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPrev(null); setMs(0); }} 
                className="px-3.5 py-2.5 rounded-xl border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button 
                onClick={publish} 
                disabled={!caption.trim()} 
                className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Take</span>
              </button>
            </div>
          )}

          {state === "uploading" && (
            <div className="w-full py-4 flex items-center justify-center gap-2.5 text-xs text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Uploading voice take...</span>
            </div>
          )}
        </div>

        {msg && <p className="text-xs text-neutral-400 text-center">{msg}</p>}
      </div>
    </div>
  );
}

// ─── Post Reverb (Audio Comments) Section ─────────────────────────────────────
function PostReverbSection({ post, currentUser, onReplyClick, onProfileClick }: {
  post: FeedPost;
  currentUser: any;
  onReplyClick: (rid?: string, rh?: string) => void;
  onProfileClick: (h: string) => void;
}) {
  const [reverbs, setReverbs]   = useState<PostReverbItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  const REACTION_OPTIONS = ["😂", "🔥", "❤️", "👍", "⚡", "💀", "🧢", "💯"];

  useEffect(() => {
    if (!expanded) return;
    const unsub = subscribeToPostReverbs(post.id, setReverbs);
    return () => unsub();
  }, [post.id, expanded]);

  const handlePulse = async (rv: PostReverbItem) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    await togglePulsePostReverb(post.id, rv.id, currentUser.uid, !!(rv.pulsedBy || []).includes(currentUser.uid));
  };

  const handleReact = async (rv: PostReverbItem, emoji: string) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    try {
      await toggleReverbReaction(
        post.id,
        rv.id,
        { uid: currentUser.uid, handle: currentUser.handle || "@ANON" },
        emoji,
        rv.handle
      );
    } catch (err) {
      console.error("Failed to react to reverb:", err);
    }
  };

  const total = post.reverbCount || 0;

  return (
    <div className="pt-2">
      <button 
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer py-1 font-medium"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{total > 0 ? `${total} Voice Take${total !== 1 ? "s" : ""}` : "Add Voice Reply"}</span>
      </button>

      {expanded && (
        <div className="border-l-2 border-neutral-800/80 pl-3.5 space-y-3.5 mt-2.5">
          {reverbs.length === 0 && (
            <p className="text-xs text-neutral-500 py-2">No voice replies yet. Be the first!</p>
          )}
          {reverbs.map(rv => {
            const pulsed = currentUser ? (rv.pulsedBy || []).includes(currentUser.uid) : false;
            const reactionsMap = rv.reactions || {};
            const reactionList = Object.values(reactionsMap);
            
            const emojiCounts: Record<string, number> = {};
            reactionList.forEach((r) => {
              emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
            });
            const userReactedEmoji = currentUser ? reactionsMap[currentUser.uid]?.emoji : null;

            return (
              <div key={rv.id} className="space-y-2 bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onProfileClick(rv.handle)} 
                      className="text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
                    >
                      {rv.handle}
                    </button>
                    {rv.isVoiceMeme && (
                      <span className="text-[9px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-medium">
                        V-Meme
                      </span>
                    )}
                    {rv.reverbOfHandle && (
                      <span className="text-[11px] text-neutral-500">↩ {rv.reverbOfHandle}</span>
                    )}
                  </div>
                  {userReactedEmoji && (
                    <span className="text-xs bg-neutral-900 border border-neutral-800 rounded-full px-2 py-0.5">
                      {userReactedEmoji}
                    </span>
                  )}
                </div>

                {rv.caption && (
                  <p className="text-xs text-neutral-300 leading-relaxed">{rv.caption}</p>
                )}

                {rv.audioUrl && (
                  <AudioPlayer audioUrl={rv.audioUrl} fallbackDurationSec={rv.durationSec || 5} small />
                )}

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handlePulse(rv)} 
                      className={`flex items-center gap-1 text-xs cursor-pointer transition-colors ${
                        pulsed ? "text-rose-500 font-semibold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${pulsed ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span>{rv.pulseCount > 0 ? formatNum(rv.pulseCount) : ""}</span>
                    </button>
                    <button 
                      onClick={() => onReplyClick(rv.id, rv.handle)} 
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>

                  {/* Reaction Pills */}
                  <div className="flex items-center gap-1 bg-black/50 border border-neutral-850 rounded-full px-2 py-0.5">
                    {REACTION_OPTIONS.slice(0, 5).map((emoji) => {
                      const isSelected = userReactedEmoji === emoji;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(rv, emoji)}
                          className={`text-xs p-0.5 hover:scale-125 transition-transform cursor-pointer ${
                            isSelected ? "scale-110" : "opacity-75 hover:opacity-100"
                          }`}
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {currentUser && (
            <button 
              onClick={() => onReplyClick()} 
              className="flex items-center justify-center gap-2 text-xs text-neutral-300 hover:text-white py-2 px-3 bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 rounded-xl transition-all w-full cursor-pointer font-medium"
            >
              <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drop a Voice Take</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Text Comments Section ───────────────────────────────────────────────────
function TextCommentSection({ postId, postAuthorUid, currentUser, onClose }: {
  postId: string; postAuthorUid: string; currentUser: any; onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPostComments(postId, setComments);
    return () => unsub();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || loading) return;
    setLoading(true);
    try {
      await createComment({
        postId,
        parentId: null,
        authorUid: currentUser.uid,
        authorHandle: currentUser.handle || "@ANON",
        text: text.trim(),
      });
      if (postAuthorUid && postAuthorUid !== currentUser.uid) {
        try {
          await createNotification(postAuthorUid, {
            type: "reverb" as any,
            fromUid: currentUser.uid,
            fromHandle: currentUser.handle || "@ANON",
            postId,
            text: `${currentUser.handle || "@ANON"} commented on your echo.`,
          });
        } catch (notifErr) {
          console.warn("[TextCommentSection] Notification warning:", notifErr);
        }
      }
      setText("");
      soundSynth.playSubtlePop();
    } catch (err) {
      console.warn("[TextCommentSection] Warning creating comment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (c: CommentItem) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    const isLiked = (c.likedBy || []).includes(currentUser.uid);
    await toggleLikeComment(c.id, currentUser.uid, isLiked);
  };

  const handleDelete = async (cId: string) => {
    await deleteComment(cId, postId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-neutral-950 border-t sm:border border-neutral-800 sm:rounded-3xl h-[75vh] sm:h-[65vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Comments</h3>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-neutral-500">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p className="text-xs">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map(c => {
              const liked = currentUser ? (c.likedBy || []).includes(currentUser.uid) : false;
              const isOwn = currentUser?.uid === c.authorUid;
              return (
                <div key={c.id} className="space-y-1 bg-neutral-900/40 p-3 rounded-2xl border border-neutral-850">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{c.authorHandle}</span>
                    <span className="text-[10px] text-neutral-500">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">{c.text}</p>
                  <div className="flex items-center gap-4 pt-1">
                    <button 
                      onClick={() => handleLike(c)} 
                      className={`flex items-center gap-1 text-[11px] cursor-pointer transition-colors ${
                        liked ? "text-rose-500 font-semibold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span>{c.likeCount > 0 ? formatNum(c.likeCount) : ""}</span>
                    </button>
                    {isOwn && (
                      <button onClick={() => handleDelete(c.id)} className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3.5 border-t border-neutral-900 bg-neutral-950">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder={currentUser ? "Write a comment..." : "Sign in to comment"}
              disabled={!currentUser || loading}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-600 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!text.trim() || !currentUser || loading}
              className="px-4 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Post Skeleton Loading ───────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <article className="py-6 px-4 space-y-3.5 animate-pulse border-b border-neutral-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-900" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-neutral-900 rounded-md" />
          <div className="h-2.5 w-16 bg-neutral-900 rounded-md" />
        </div>
      </div>
      <div className="h-4 w-5/6 bg-neutral-900 rounded-md" />
      <div className="h-24 bg-neutral-900 rounded-2xl" />
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
      </div>
    </article>
  );
}

// ─── World-Class Post Card (Twitter / Instagram Inspired) ─────────────────────
function PostCard({ 
  post, user, orbitedPosts, activePostId, deletingId, 
  isBookmarked, onPulse, onOrbit, onShare, onBookmark, onDelete, 
  onReplyClick, onProfileClick, onActiveChange, setRef, 
  onFollow, onUnfollow, following, onComment, onFirstPlay
}: {
  post: FeedPost; user: any; orbitedPosts: Set<string>; activePostId: string | null;
  deletingId: string | null; isBookmarked: boolean;
  onPulse: (p: FeedPost) => void; onOrbit: (p: FeedPost) => void;
  onShare: (p: FeedPost) => void; onBookmark: (p: FeedPost) => void;
  onDelete: (id: string) => void; onReplyClick: (rid?: string, rh?: string) => void;
  onProfileClick: (h: string) => void; onActiveChange: (id: string | null) => void; 
  setRef: (id: string, el: HTMLElement | null) => void;
  onFollow: (uid: string, handle: string) => void; onUnfollow: (uid: string) => void; 
  following: Set<string>; onComment: (p: FeedPost) => void; onFirstPlay: (p: FeedPost) => void;
}) {
  const isPulsed = user ? post.pulsedBy.includes(user.uid) : false;
  const isOrbited = orbitedPosts.has(post.id) || (user ? (post.orbitedBy || []).includes(user.uid) : false);
  const isOwn = user?.uid === post.authorUid;
  const isDel = deletingId === post.id;
  const isFollowingAuthor = following.has(post.authorUid);

  // Deterministic avatar gradient
  const gradient = getAvatarGradient(post.authorHandle);
  const initial = post.authorHandle.replace(/^@/, "").charAt(0).toUpperCase() || "E";

  // Views display (calculated from metrics or viewsCount)
  const displayViews = Math.max(
    post.viewsCount || 0,
    (post.pulseCount * 14) + (post.reverbCount * 8) + (post.commentCount * 6) + 12
  );

  return (
    <article
      ref={el => setRef(post.id, el)}
      data-post-id={post.id}
      className="py-5 px-4 sm:px-6 hover:bg-neutral-950/40 transition-colors border-b border-neutral-900/80 space-y-3"
    >
      {/* Author Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <button 
            onClick={() => onProfileClick(post.authorHandle)}
            className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 hover:opacity-90 transition-opacity shadow-md`}
          >
            {initial}
          </button>

          {/* Handle & Time */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <button 
              onClick={() => onProfileClick(post.authorHandle)}
              className="font-bold text-sm text-white hover:underline truncate cursor-pointer"
            >
              {post.authorHandle}
            </button>
            <span className="text-neutral-500 text-xs">·</span>
            <span className="text-neutral-500 text-xs shrink-0">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>

        {/* Orbit / Follow / Delete Action */}
        <div className="flex items-center gap-2 shrink-0">
          {!isOwn && user && (
            <button
              onClick={() => isFollowingAuthor ? onUnfollow(post.authorUid) : onFollow(post.authorUid, post.authorHandle)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                isFollowingAuthor
                  ? "border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white bg-neutral-900/60"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              {isFollowingAuthor ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Orbiting</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Orbit</span>
                </>
              )}
            </button>
          )}

          {isOwn && (
            <button 
              onClick={() => onDelete(post.id)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isDel 
                  ? "text-rose-400 bg-rose-950/60 border border-rose-800" 
                  : "text-neutral-500 hover:text-rose-400 hover:bg-neutral-900"
              }`}
              title={isDel ? "Confirm Delete" : "Delete Echo"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* News Dispatch Header Badge (if linked to topic) */}
      {(post.newsTopic || post.newsHeadline) && (
        <div className="px-3 py-2 bg-neutral-900/60 border border-neutral-850 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            {post.newsTopic && (
              <Link
                href={`/hashtag/${encodeURIComponent(post.newsTopic.replace(/^#+/, ""))}`}
                className="font-bold text-white uppercase hover:underline shrink-0"
              >
                #{post.newsTopic.replace(/^#+/, "")}
              </Link>
            )}
            {post.newsHeadline && (
              <span className="text-neutral-400 truncate">
                "{post.newsHeadline}"
              </span>
            )}
          </div>
          {post.newsLink && post.newsLink !== "#" && (
            <a
              href={post.newsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400 hover:underline shrink-0 font-medium"
            >
              Dispatch ↗
            </a>
          )}
        </div>
      )}

      {/* Post Caption */}
      <div className="text-neutral-100 text-[15px] sm:text-base leading-relaxed break-words font-normal select-text">
        {parseCaption(post.caption)}
      </div>

      {/* Audio Stem / Track Attribution Chip */}
      <div className="flex items-center justify-between gap-2 py-1 text-xs text-neutral-400">
        <Link
          href={`/audio/${post.audioTrackId || post.id}`}
          className="flex items-center gap-1.5 hover:text-white transition-colors truncate max-w-[240px] sm:max-w-xs"
        >
          <Music className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate text-neutral-400 hover:text-white">
            {post.audioTrackTitle || "Original Voice Take"} • {post.audioTrackArtist || post.authorHandle}
          </span>
        </Link>
        <Link
          href={`/studio?soundId=${encodeURIComponent(post.audioTrackId || post.id)}&soundUrl=${encodeURIComponent(post.audioUrl)}&soundTitle=${encodeURIComponent(post.audioTrackTitle || post.caption.slice(0, 30) || "Original Voice Take")}&soundArtist=${encodeURIComponent(post.audioTrackArtist || post.authorHandle)}${post.isVoiceMeme ? "&isMeme=true" : ""}`}
          className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-[11px] font-medium text-neutral-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Use Audio</span>
        </Link>
      </div>

      {/* Modern Audio Player */}
      <AudioPlayer 
        audioUrl={post.audioUrl} 
        fallbackDurationSec={post.durationSec || 15}
        isActive={activePostId === post.id}
        onPlayToggle={p => {
          if (p) onActiveChange(post.id);
          else if (activePostId === post.id) onActiveChange(null);
        }}
        onFirstPlay={() => onFirstPlay(post)}
      />

      {/* World-Class Twitter / Instagram Icon Action Deck */}
      <div className="flex items-center justify-between pt-1 text-neutral-400 select-none">
        {/* 1. Comment / Reply */}
        <button
          type="button"
          onClick={() => onComment(post)}
          className="group flex items-center gap-1.5 text-neutral-400 hover:text-cyan-400 transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-cyan-500/10 cursor-pointer"
          title="Reply / Comment"
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs">{post.commentCount > 0 ? formatNum(post.commentCount) : ""}</span>
        </button>

        {/* 2. Re-Echo (Repost) */}
        {!isOwn ? (
          <button
            type="button"
            onClick={() => onOrbit(post)}
            disabled={isOrbited}
            className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-emerald-500/10 cursor-pointer ${
              isOrbited ? "text-emerald-400" : "text-neutral-400 hover:text-emerald-400"
            }`}
            title={isOrbited ? "Re-Echoed" : "Re-Echo to Followers"}
          >
            <Repeat2 className={`w-4 h-4 group-hover:scale-110 transition-transform ${isOrbited ? "text-emerald-400" : ""}`} />
            <span className={`text-xs ${isOrbited ? "text-emerald-400 font-semibold" : ""}`}>
              {(post.orbitedBy?.length || 0) > 0 ? formatNum(post.orbitedBy?.length || 0) : ""}
            </span>
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* 3. Pulse (Like) */}
        <button
          type="button"
          onClick={() => onPulse(post)}
          className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-rose-500/10 cursor-pointer ${
            isPulsed ? "text-rose-500" : "text-neutral-400 hover:text-rose-500"
          }`}
          title="Pulse / Like"
        >
          <Heart className={`w-4 h-4 group-hover:scale-110 transition-transform ${isPulsed ? "fill-rose-500 text-rose-500" : ""}`} />
          <span className={`text-xs ${isPulsed ? "text-rose-500 font-semibold" : ""}`}>
            {post.pulseCount > 0 ? formatNum(post.pulseCount) : ""}
          </span>
        </button>

        {/* 4. Bookmark (Save) */}
        <button
          type="button"
          onClick={() => onBookmark(post)}
          className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-amber-500/10 cursor-pointer ${
            isBookmarked ? "text-amber-400" : "text-neutral-400 hover:text-amber-400"
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark Echo"}
        >
          <Bookmark className={`w-4 h-4 group-hover:scale-110 transition-transform ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>

        {/* 5. Views Count */}
        <div 
          className="flex items-center gap-1.5 text-neutral-500 p-1.5"
          title={`${displayViews} views`}
        >
          <BarChart2 className="w-4 h-4" />
          <span className="text-xs">{formatNum(displayViews)}</span>
        </div>

        {/* 6. Share */}
        <button
          type="button"
          onClick={() => onShare(post)}
          className="group flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors p-1.5 -mr-1.5 rounded-full hover:bg-neutral-800 cursor-pointer"
          title="Share Echo"
        >
          <Share className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Voice Replies Accordion */}
      <PostReverbSection 
        post={post} 
        currentUser={user}
        onReplyClick={onReplyClick}
        onProfileClick={onProfileClick} 
      />
    </article>
  );
}

// ─── Home Feed Page ───────────────────────────────────────────────────────────
export default function HomeFeedPage() {
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth();
  const router                        = useRouter();
  const [posts, setPosts]             = useState<FeedPost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"for-you" | "following" | "bookmarks">("for-you");
  const [orbitedPosts, setOrbited]    = useState<Set<string>>(new Set());
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [activePostId, setActiveId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [replyModal, setReplyModal]   = useState<{ post: FeedPost; rid?: string; rh?: string } | null>(null);
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [following, setFollowing]     = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg]       = useState<string | null>(null);
  const [showStartAuthModal, setShowStartAuthModal] = useState(false);

  const articleRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const viewedPostsRef  = useRef<Set<string>>(new Set());

  // Show Start Modal (Sign In vs Skip) for first-time visitors
  useEffect(() => {
    if (!authLoading && !user) {
      try {
        const hasDismissed = localStorage.getItem("echo_start_dismissed");
        if (!hasDismissed) {
          setShowStartAuthModal(true);
        }
      } catch {}
    } else if (user) {
      setShowStartAuthModal(false);
    }
  }, [user, authLoading]);

  // 1. Subscribe to Live Frequency Posts
  useEffect(() => {
    const unsub = subscribeToPosts(live => {
      setPosts(live.map(p => ({
        id: p.id,
        audioUrl: p.audioUrl,
        caption: p.caption,
        authorHandle: p.authorHandle || "@ANON",
        authorUid: p.authorUid || "anon",
        pulseCount: p.pulseCount || 0,
        pulsedBy: p.pulsedBy || [],
        orbitedBy: (p as any).orbitedBy || [],
        duration: p.duration || "00:15",
        durationSec: p.durationSec || 15,
        reverbCount: p.reverbCount || 0,
        commentCount: (p as any).commentCount || 0,
        viewsCount: (p as any).viewsCount || 0,
        bookmarkCount: (p as any).bookmarkCount || 0,
        createdAt: p.createdAt,
        newsTopic: p.newsTopic,
        newsHeadline: p.newsHeadline,
        newsLink: p.newsLink,
        audioTrackId: p.audioTrackId,
        audioTrackTitle: p.audioTrackTitle,
        audioTrackArtist: p.audioTrackArtist,
        isVoiceMeme: p.isVoiceMeme,
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Following for authenticated user
  useEffect(() => {
    if (!user?.uid) {
      setFollowing(new Set());
      return;
    }
    const unsub = subscribeToFollowing(user.uid, (list) => {
      setFollowing(new Set(list.map((f) => f.followingUid)));
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Subscribe to Bookmarks for authenticated user
  useEffect(() => {
    if (!user?.uid) {
      setBookmarkedPostIds(new Set());
      return;
    }
    const unsub = subscribeToUserBookmarks(user.uid, (bookmarks) => {
      setBookmarkedPostIds(new Set(bookmarks.map(b => b.postId)));
    });
    return () => unsub();
  }, [user?.uid]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const setRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) articleRefs.current.set(id, el);
    else articleRefs.current.delete(id);
  }, []);

  // Mark view on impression / play
  const handleFirstPlay = useCallback((post: FeedPost) => {
    if (viewedPostsRef.current.has(post.id)) return;
    viewedPostsRef.current.add(post.id);
    incrementPostViews(post.id);
  }, []);

  const handlePulse = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    soundSynth.playSubtlePop();
    const pulsed = post.pulsedBy.includes(user.uid);
    await togglePulsePost(post.id, user.uid, pulsed);
    if (!pulsed) {
      await createNotification(post.authorUid, {
        type: "pulse",
        fromUid: user.uid,
        fromHandle: user.handle || "@ANON",
        postId: post.id,
        postCaption: post.caption,
        text: `${user.handle} pulsed your echo.`
      });
    }
  };

  const handleOrbit = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    if (orbitedPosts.has(post.id)) return;
    soundSynth.playSubtlePop();
    setOrbited(prev => new Set([...prev, post.id]));
    await createPost({
      audioUrl: post.audioUrl,
      caption: `[ RE-ECHO ] "${post.caption.slice(0, 60)}${post.caption.length > 60 ? "…" : ""}" — ${post.authorHandle}`,
      authorUid: user.uid,
      authorHandle: user.handle || "@ANON",
      duration: post.duration,
      durationSec: post.durationSec,
      orbitOf: post.id,
      orbitOfHandle: post.authorHandle
    } as any);
    await createNotification(post.authorUid, {
      type: "reverb",
      fromUid: user.uid,
      fromHandle: user.handle || "@ANON",
      postId: post.id,
      postCaption: post.caption,
      text: `${user.handle} re-echoed your post.`
    });
    showToast("Re-echoed to your profile!");
  };

  const handleBookmark = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    soundSynth.playSubtlePop();
    const isBookmarked = bookmarkedPostIds.has(post.id);

    // Optimistic UI state
    setBookmarkedPostIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    try {
      if (isBookmarked) {
        await removeBookmark(user.uid, post.id);
        showToast("Bookmark removed");
      } else {
        await addBookmark(
          user.uid,
          post.id,
          post.authorUid,
          post.authorHandle,
          post.caption,
          post.audioUrl,
          post.duration,
          post.durationSec,
          post.pulseCount
        );
        showToast("Saved to Bookmarks");
      }
    } catch (e) {
      console.error("Bookmark toggle failed:", e);
    }
  };

  const handleShare = async (post: FeedPost) => {
    soundSynth.playSubtlePop();
    const url = `${window.location.origin}/${post.authorHandle.replace(/^@/, "")}`;
    const d = { title: `Echo by ${post.authorHandle}`, text: `"${post.caption}"`, url };
    if (navigator.share && navigator.canShare?.(d)) {
      try { await navigator.share(d); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${d.text} ${d.url}`);
        showToast("Link copied to clipboard!");
      } catch {}
    }
  };

  const handleDelete = async (postId: string) => {
    if (deletingId === postId) {
      try {
        await deletePost(postId);
        setDeletingId(null);
        showToast("Echo deleted");
      } catch (e) {
        console.error(e);
        setDeletingId(null);
      }
    } else {
      setDeletingId(postId);
      setTimeout(() => setDeletingId(p => p === postId ? null : p), 3000);
    }
  };

  const handleFollow = async (uid: string, handle: string) => {
    if (!user) return;
    soundSynth.playSubtlePop();
    try {
      await followUser(user.uid, user.handle || "@ANON", uid, handle);
      setFollowing(prev => new Set([...prev, uid]));
      showToast(`Orbiting ${handle}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnfollow = async (uid: string) => {
    if (!user) return;
    soundSynth.playSubtlePop();
    try {
      await unfollowUser(user.uid, uid);
      setFollowing(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
      showToast("Stopped orbiting");
    } catch (e) {
      console.error(e);
    }
  };

  // Filter posts based on active tab
  const displayedPosts = useMemo(() => {
    if (activeTab === "following") {
      return posts.filter(p => following.has(p.authorUid) || p.authorUid === user?.uid);
    }
    if (activeTab === "bookmarks") {
      return posts.filter(p => bookmarkedPostIds.has(p.id));
    }
    return posts;
  }, [posts, activeTab, following, bookmarkedPostIds, user?.uid]);

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-16 flex flex-col font-sans selection:bg-neutral-800">
      
      {/* ── World-Class Sticky Header with Segment Control (Twitter / X Style) ── */}
      <header className="sticky top-0 z-40 w-full bg-black/85 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          
          {/* Feed Tabs: For You, Following, Bookmarks */}
          <div className="flex items-center gap-1 sm:gap-2 h-full">
            <button
              onClick={() => { setActiveTab("for-you"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "for-you" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span>For You</span>
              {activeTab === "for-you" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab("following"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "following" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span>Following</span>
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab("bookmarks"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center gap-1.5 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "bookmarks" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${activeTab === "bookmarks" ? "fill-white text-white" : ""}`} />
              <span className="hidden xs:inline">Bookmarks</span>
              {activeTab === "bookmarks" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Feed Container ── */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col border-x border-neutral-900/60">
        {loading ? (
          <div className="divide-y divide-neutral-900">
            {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shadow-inner">
              {activeTab === "bookmarks" ? (
                <Bookmark className="w-6 h-6" />
              ) : activeTab === "following" ? (
                <Radio className="w-6 h-6" />
              ) : (
                <Mic2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-lg font-bold text-white">
                {activeTab === "bookmarks" 
                  ? "No Bookmarks Yet" 
                  : activeTab === "following" 
                  ? "No Followed Echoes" 
                  : "The Stream is Silent"}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {activeTab === "bookmarks"
                  ? "Save interesting voice takes by tapping the bookmark icon to revisit them anytime."
                  : activeTab === "following"
                  ? "Orbit creators you love to see their latest voice takes directly in this feed."
                  : "Be the voice that starts the wave. Record your first unfiltered audio take."}
              </p>
            </div>

            {activeTab === "for-you" && (
              <Link 
                href="/studio" 
                className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-full hover:bg-neutral-200 transition-colors shadow-md"
              >
                Drop First Echo
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {displayedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                orbitedPosts={orbitedPosts}
                isBookmarked={bookmarkedPostIds.has(post.id)}
                activePostId={activePostId}
                deletingId={deletingId}
                onPulse={handlePulse}
                onOrbit={handleOrbit}
                onShare={handleShare}
                onBookmark={handleBookmark}
                onDelete={handleDelete}
                onReplyClick={(rid?: string, rh?: string) => {
                  if (!user) { router.push("/login"); return; }
                  setReplyModal({ post, rid, rh });
                }}
                onComment={(p: FeedPost) => {
                  if (!user) { router.push("/login"); return; }
                  setCommentPost(p);
                }}
                onProfileClick={h => router.push(`/${h.replace(/^@/, "")}`)}
                onActiveChange={setActiveId}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                following={following}
                setRef={setRef}
                onFirstPlay={handleFirstPlay}
              />
            ))}
          </div>
        )}

        {/* ── Footer Topic Discovery Chips ── */}
        <section className="p-6 border-t border-neutral-900 space-y-4 text-xs select-none">
          <div className="space-y-1">
            <h3 className="font-bold text-neutral-200 text-xs uppercase tracking-wider flex items-center gap-2">
              <Sparkle className="w-3.5 h-3.5 text-cyan-400" />
              Discover Topics & Channels
            </h3>
            <p className="text-neutral-500 text-xs">
              Explore unfiltered discussions, trending voice reels, and audio rooms across topics.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              "tech", "ai", "crypto", "startup", "music", "debates", "news",
              "philosophy", "gaming", "culture", "india", "global", "finance", "podcasts"
            ].map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${tag}`}
                className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-xs text-neutral-400 hover:text-white transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-3 border-t border-neutral-900">
            <span>© {new Date().getFullYear()} Echo Audio Network</span>
            <div className="flex items-center gap-3">
              <Link href="/waves" className="hover:text-white transition-colors">Waves</Link>
              <Link href="/clash" className="hover:text-white transition-colors">Stage</Link>
              <Link href="/rooms" className="hover:text-white transition-colors">Rooms</Link>
              <Link href="/arcade" className="hover:text-white transition-colors">Arcade</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Voice Reply Modal */}
      {replyModal && (
        <ReplyRecordModal
          postId={replyModal.post.id}
          postCaption={replyModal.post.caption}
          postAuthorHandle={replyModal.post.authorHandle}
          postAuthorUid={replyModal.post.authorUid}
          reverbOfReverbId={replyModal.rid}
          reverbOfHandle={replyModal.rh}
          currentUser={user}
          onClose={() => setReplyModal(null)}
        />
      )}

      {/* Text Comments Sheet */}
      {commentPost && (
        <TextCommentSection
          postId={commentPost.id}
          postAuthorUid={commentPost.authorUid}
          currentUser={user}
          onClose={() => setCommentPost(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-4 py-2 rounded-full text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Start Option Modal: Sign In or Skip ── */}
      {showStartAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl relative text-center">
            
            {/* Branding Header */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-white text-black font-mono font-black text-xl flex items-center justify-center mx-auto shadow-md">
                E
              </div>
              <h2 className="font-mono text-2xl font-black uppercase text-white tracking-tight">
                Echo.
              </h2>
              <p className="font-mono text-xs text-neutral-400 leading-relaxed">
                Audio-first. Unfiltered. Real.<br />
                Listen to live voice feeds, debate on stage, and share your frequency.
              </p>
            </div>

            {/* Action Buttons: Sign In or Skip */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  soundSynth.playSubtlePop();
                  try {
                    await signInWithGoogle();
                    setShowStartAuthModal(false);
                  } catch {}
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-white text-black hover:bg-neutral-200 font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth.playSubtlePop();
                  try {
                    localStorage.setItem("echo_start_dismissed", "true");
                    localStorage.setItem("echo_guest_mode", "true");
                  } catch {}
                  setShowStartAuthModal(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                <span>Skip & Explore as Guest →</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-600 font-mono">
              You can sign in anytime to record takes & debate on stage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
