"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUp, Flame, Mic2, Share2, RefreshCw,
  Loader2, Send, Trash2, ChevronDown, ChevronUp,
  Heart, AtSign, Repeat2, MessageSquare
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  subscribeToPosts, togglePulsePost, createPost, deletePost,
  subscribeToPostReverbs, addPostReverb, togglePulsePostReverb,
  toggleReverbReaction,
  type PostReverbItem,
} from "@/lib/posts";
import { useRouter } from "next/navigation";
import { uploadAudio, getPlayableUrl } from "@/lib/cloudinary";
import { createNotification } from "@/lib/notifications";
import { followUser, unfollowUser, isFollowing, subscribeToFollowing } from "@/lib/follows";
import { audioManager } from "@/lib/audioManager";
import { subscribeToPostComments, createComment, toggleLikeComment, deleteComment, type CommentItem } from "@/lib/comments";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedPost {
  id: string; audioUrl: string; caption: string;
  authorHandle: string; authorUid: string;
  pulseCount: number; pulsedBy: string[];
  orbitedBy?: string[]; duration: string; durationSec: number;
  reverbCount: number; commentCount: number; createdAt: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s/60).toString().padStart(2,"0")}:${Math.floor(s%60).toString().padStart(2,"0")}`;
}
function timeAgo(c: any) {
  if (!c?.seconds) return "";
  const d = Date.now() / 1000 - c.seconds;
  if (d < 60) return "JUST NOW";
  if (d < 3600) return `${Math.floor(d / 60)}M AGO`;
  if (d < 86400) return `${Math.floor(d / 3600)}H AGO`;
  return `${Math.floor(d / 86400)}D AGO`;
}

// ─── Hashtag & Mention Parser ─────────────────────────────────────────────────
function parseCaption(caption: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Regex for hashtags (#hashtag) and mentions (@handle)
  const regex = /(#\w+)|(@\w+)/g;
  let match;
  
  while ((match = regex.exec(caption)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(caption.slice(lastIndex, match.index));
    }
    
    const [fullMatch] = match;
    const isHashtag = fullMatch.startsWith('#');
    const isMention = fullMatch.startsWith('@');
    
    if (isHashtag) {
      parts.push(
        <span key={match.index} className="text-neutral-400 hover:text-white cursor-pointer transition-colors">
          {fullMatch}
        </span>
      );
    } else if (isMention) {
      parts.push(
        <span key={match.index} className="text-white hover:underline cursor-pointer transition-colors">
          {fullMatch}
        </span>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < caption.length) {
    parts.push(caption.slice(lastIndex));
  }
  
  return parts;
}

// ─── Advanced Waveform with Web Audio API ──────────────────────────────────
const WAVE_H = [4,10,18,24,14,28,10,22,6,26,16,20,8,28,14,22,10,26,6,18,24,12,30,8,20];
function Waveform({ playing, small, audioRef }: { playing: boolean; small?: boolean; audioRef?: React.RefObject<HTMLAudioElement | null> }) {
  const [waveformData, setWaveformData] = useState<number[]>(WAVE_H);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef?.current || !playing) {
      // Always cleanup animation frame when not playing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const audio = audioRef.current;
    
    // Initialize Audio Context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    
    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Create analyser only once
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
    }
    
    // Only create source if we haven't already connected this specific audio element
    // Check if the current source is connected to the same audio element
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioContext.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
      } catch (error) {
        // If the audio element is already connected, skip source creation
        console.warn('Audio element already connected, skipping source creation');
      }
    }
    
    const analyser = analyserRef.current;
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Convert frequency data to waveform heights
      const newWaveform = Array.from({ length: small ? 14 : 25 }, (_, i) => {
        const dataIndex = Math.floor(i * (bufferLength / (small ? 14 : 25)));
        const value = dataArray[dataIndex] || 0;
        return Math.max(2, Math.floor((value / 255) * 30));
      });
      
      setWaveformData(newWaveform);
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();

    return () => {
      // Cleanup animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cleanup audio nodes to prevent memory leaks
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = null;
      }
      
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        analyserRef.current = null;
      }
      
      // Close AudioContext if no longer needed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Ignore close errors
        }
        audioContextRef.current = null;
      }
    };
  }, [playing, audioRef, small]);

  const bars = small ? waveformData.slice(0, 14) : waveformData;

  return (
    <div className={`flex items-end gap-[2px] ${small ? "h-5" : "h-8"}`} aria-hidden>
      {bars.map((h, i) => (
        <div 
          key={i} 
          style={{
            height: `${small ? Math.max(2, h * 0.6) : h}px`,
            width: "2px",
            backgroundColor: "white",
            transition: "height 0.05s ease-out",
          }} 
          className={playing ? "waveform-bar" : "opacity-20"} 
        />
      ))}
    </div>
  );
}

// ─── URL helpers ──────────────────────────────────────────────────────────────
function buildUrlVariants(rawUrl: string): string[] {
  if (!rawUrl) return [];
  const playable = getPlayableUrl(rawUrl);
  if (playable.startsWith("blob:")) return [playable];
  const v: string[] = [playable];
  if (playable.includes(".webm")) {
    v.push(playable.replace(/\.webm$/, ""));
    v.push(playable.replace(/\.webm$/, ".mp3"));
  } else if (!playable.endsWith(".mp3")) {
    v.push(`${playable}.mp3`);
  }
  if (rawUrl !== playable) v.push(rawUrl);
  return Array.from(new Set(v));
}

// ─── Audio Player ─────────────────────────────────────────────────────────────
function AudioPlayer({ audioUrl, fallbackDurationSec, isActive, onPlayToggle, small }: {
  audioUrl: string; fallbackDurationSec: number;
  isActive?: boolean; onPlayToggle?: (p: boolean) => void; small?: boolean;
}) {
  const variants = buildUrlVariants(audioUrl);
  const [vi, setVi]         = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur]         = useState(Math.max(1, fallbackDurationSec));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed]   = useState(false);
  const [speed, setSpeed]     = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const instanceIdRef = useRef<string | null>(null);
  const src = variants[vi] || audioUrl;

  // Generate unique instance ID for this audio player
  useEffect(() => {
    instanceIdRef.current = `audio-${audioUrl}-${Date.now()}`;
    return () => {
      if (instanceIdRef.current) {
        audioManager.unregister(instanceIdRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => { setVi(0); setFailed(false); setPlaying(false); setCurrent(0); setDur(Math.max(1,fallbackDurationSec)); setSpeed(1); }, [audioUrl]);

  // Register audio element with global manager
  useEffect(() => {
    const a = audioRef.current;
    const id = instanceIdRef.current;
    if (!a || !id) return;

    audioManager.register(id, a, 1); // Priority 1 for main feed audio

    return () => {
      if (id) {
        audioManager.unregister(id);
      }
    };
  }, [src]);

  // Ensure src is always attached to audio element
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.src !== src) {
      a.src = src;
      a.preload = "metadata";
    }
  }, [src]);

  useEffect(() => {
    const a = audioRef.current; if (!a || !instanceIdRef.current) return;
    if (isActive && !playing) {
      a.volume = 1; a.muted = false;
      if (!a.src) a.src = src;
      audioManager.requestPlay(instanceIdRef.current).then(granted => {
        if (granted) {
          setPlaying(true);
          onPlayToggle?.(true);
        }
      }).catch(() => {});
    } else if (!isActive && playing) {
      audioManager.pause(instanceIdRef.current);
      setPlaying(false);
      onPlayToggle?.(false);
    }
  }, [isActive]);

  const onErr = () => {
    setPlaying(false); setLoading(false);
    const next = vi+1;
    if (next < variants.length) setVi(next); else setFailed(true);
  };

  const toggle = async () => {
    const a = audioRef.current; 
    const id = instanceIdRef.current;
    if (!a || !id) return;
    
    if (playing) { 
      audioManager.pause(id);
      setPlaying(false); 
      onPlayToggle?.(false); 
    }
    else {
      a.volume = 1; a.muted = false; setLoading(true);
      if (!a.src) a.src = src;
      try { 
        const granted = await audioManager.requestPlay(id);
        if (granted) {
          setPlaying(true);
          onPlayToggle?.(true);
        } else {
          setLoading(false);
        }
      }
      catch { onErr(); } finally { setLoading(false); }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !isFinite(a.duration)) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)) * a.duration;
    setCurrent(a.currentTime);
  };

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  if (failed) return (
    <div className="border border-neutral-900 p-3 flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">AUDIO UNAVAILABLE</span>
      <button onClick={()=>{setVi(0);setFailed(false);}} className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase border border-neutral-800 px-2 py-1 hover:border-white hover:text-white transition-colors cursor-pointer">RETRY</button>
    </div>
  );

  return (
    <div className={`border border-neutral-800 ${small?"p-3":"p-4"} space-y-2`}>
      <audio key={src} ref={audioRef} src={src} preload="auto" playsInline crossOrigin="anonymous"
        onLoadedMetadata={e=>{const el=e.currentTarget;if(isFinite(el.duration)&&el.duration>0)setDur(Math.ceil(el.duration));}}
        onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)}
        onPlaying={()=>{setPlaying(true);setLoading(false);}}
        onPause={()=>setPlaying(false)}
        onEnded={()=>{setPlaying(false);setCurrent(0);}}
        onError={onErr} style={{display:"none"}} />
      <div className="flex items-center gap-3">
        <button onClick={toggle} disabled={loading}
          className={`font-mono text-xs tracking-widest uppercase border border-white px-3 py-1.5 text-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${small?"min-w-[80px]":"min-w-[100px]"} flex items-center justify-center gap-1.5`}>
          {loading?<><Loader2 className="w-3 h-3 animate-spin"/>LOADING</>:playing?"[ ⏸ PAUSE ]":"[ ▶ PLAY ]"}
        </button>
        <div className="flex-1 overflow-hidden"><Waveform playing={playing} small={small} audioRef={audioRef}/></div>
        {!small && (
          <button onClick={changeSpeed} className="font-mono text-[10px] text-neutral-500 hover:text-white tracking-widest uppercase transition-colors cursor-pointer">
            {speed}x
          </button>
        )}
        <span className="font-mono text-[10px] text-neutral-500 tracking-widest shrink-0 tabular-nums">{fmt(current)}/{fmt(dur)}</span>
      </div>
      <div className="w-full h-[2px] bg-neutral-900 cursor-pointer overflow-hidden" onClick={seek}>
        <div className="h-full bg-white transition-none" style={{width:`${dur>0?Math.min(100,(current/dur)*100):0}%`}}/>
      </div>
    </div>
  );
}

// ─── Reply Record Modal ───────────────────────────────────────────────────────
function ReplyRecordModal({ postId, postCaption, postAuthorHandle, postAuthorUid, reverbOfReverbId, reverbOfHandle, currentUser, onClose }: {
  postId: string; postCaption: string; postAuthorHandle: string; postAuthorUid: string;
  reverbOfReverbId?: string; reverbOfHandle?: string; currentUser: any; onClose: ()=>void;
}) {
  const [state, setState]       = useState<"idle"|"recording"|"preview"|"uploading">("idle");
  const [ms, setMs]             = useState(0);
  const [caption, setCaption]   = useState(`@${(reverbOfHandle||postAuthorHandle).replace(/^@/,"")} `);
  const [blob, setBlob]         = useState<Blob|null>(null);
  const [previewUrl, setPrev]   = useState<string|null>(null);
  const [prevPlaying, setPP]    = useState(false);
  const [msg, setMsg]           = useState<string|null>(null);
  const recRef   = useRef<MediaRecorder|null>(null);
  const chunks   = useRef<Blob[]>([]);
  const timer    = useRef<any>(null);
  const t0       = useRef(0);
  const prevAudio= useRef<HTMLAudioElement|null>(null);
  const stream   = useRef<MediaStream|null>(null);

  const fmtMs = (v:number)=>`${Math.floor(v/60000).toString().padStart(2,"0")}:${Math.floor((v%60000)/1000).toString().padStart(2,"0")}`;

  useEffect(()=>{
    if(state==="recording"){t0.current=Date.now()-ms;timer.current=setInterval(()=>setMs(Date.now()-t0.current),50);}
    else{if(timer.current){clearInterval(timer.current);timer.current=null;}}
    return()=>{if(timer.current)clearInterval(timer.current);};
  },[state]);
  useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());prevAudio.current?.pause();if(previewUrl)URL.revokeObjectURL(previewUrl);},[]);

  const startRec = async()=>{
    chunks.current=[];setMs(0);setBlob(null);if(previewUrl){URL.revokeObjectURL(previewUrl);setPrev(null);}setMsg(null);
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      stream.current=s;
      let mime="audio/webm";
      if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))mime="audio/webm;codecs=opus";
      else if(MediaRecorder.isTypeSupported("audio/mp4"))mime="audio/mp4";
      const rec=new MediaRecorder(s,{mimeType:mime});recRef.current=rec;
      rec.ondataavailable=e=>{if(e.data?.size>0)chunks.current.push(e.data);};
      rec.onstop=()=>{
        const b=new Blob(chunks.current,{type:mime.split(";")[0]});
        if(b.size<100){setMsg("TOO SHORT.");setState("idle");s.getTracks().forEach(t=>t.stop());return;}
        setBlob(b);setPrev(URL.createObjectURL(b));s.getTracks().forEach(t=>t.stop());setState("preview");
      };
      rec.start();setState("recording");
    }catch{setMsg("MIC DENIED.");setState("idle");}
  };
  const stopRec=()=>{if(recRef.current?.state==="recording")recRef.current.stop();};
  const togglePrev=()=>{
    if(!previewUrl)return;
    if(prevPlaying){prevAudio.current?.pause();setPP(false);return;}
    if(!prevAudio.current){prevAudio.current=new Audio(previewUrl);prevAudio.current.onended=()=>setPP(false);}
    prevAudio.current.play().then(()=>setPP(true)).catch(()=>{});
  };
  const publish=async()=>{
    if(!blob||!currentUser)return;
    prevAudio.current?.pause();setPP(false);setState("uploading");setMsg("UPLOADING...");
    try{
      const sec=Math.max(1,Math.floor(ms/1000));
      const up=await uploadAudio(blob,`rev-${currentUser.uid}-${Date.now()}`);
      await addPostReverb(postId,{uid:currentUser.uid,handle:currentUser.handle||"@ANON",audioUrl:up.secureUrl,caption:caption.trim()||`@${postAuthorHandle} REPLY`,durationSec:sec,reverbOfReverbId,reverbOfHandle});
      await createNotification(postAuthorUid,{type:"reverb",fromUid:currentUser.uid,fromHandle:currentUser.handle||"@ANON",postId,postCaption,text:`${currentUser.handle} dropped a reply on your echo.`});
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      onClose();
    }catch(e:any){setMsg(`ERROR: ${e?.message||"FAILED"}`);setState("preview");}
  };

  return(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full max-w-md bg-black border border-neutral-700 p-6 space-y-5 m-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest uppercase text-white">
            {reverbOfHandle?`↩ REPLY ON ${reverbOfHandle}`:`// REPLY ON ${postAuthorHandle}`}
          </p>
          <button onClick={onClose} className="font-mono text-xs text-neutral-600 hover:text-white cursor-pointer">[ ✕ ]</button>
        </div>
        <p className="font-serif italic text-neutral-400 text-sm">"{postCaption.slice(0,80)}{postCaption.length>80?"…":""}"</p>
        <div className="flex items-center gap-2 border-b border-neutral-800">
          <AtSign className="w-3 h-3 text-neutral-500 shrink-0"/>
          <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={140}
            className="flex-1 bg-transparent outline-none font-mono text-xs text-white py-1 tracking-widest"
            placeholder="Caption or @tag..."/>
        </div>
        <div className="font-mono text-3xl text-white text-center tabular-nums">{fmtMs(ms)}</div>
        <div className="space-y-3">
          {state==="idle"&&<button onClick={startRec} className="w-full border border-neutral-700 text-white font-mono text-xs tracking-widest uppercase py-4 hover:border-white hover:bg-neutral-950 transition-colors cursor-pointer">[ 🎙 TAP TO RECORD REPLY ]</button>}
          {state==="recording"&&<button onClick={stopRec} className="w-full border border-white bg-white text-black font-mono text-xs tracking-widest uppercase py-4 animate-pulse cursor-pointer font-bold">[ ⏹ STOP RECORDING ]</button>}
          {state==="preview"&&(
            <div className="flex gap-3">
              <button onClick={togglePrev} className="font-mono text-xs tracking-widest uppercase border border-white px-4 py-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer">{prevPlaying?"[ ⏸ ]":"[ ▶ ]"}</button>
              <button onClick={()=>{setState("idle");setBlob(null);if(previewUrl)URL.revokeObjectURL(previewUrl);setPrev(null);setMs(0);}} className="flex items-center gap-1 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase px-3 py-2 transition-colors cursor-pointer"><Trash2 className="w-3 h-3"/>REDO</button>
              <button onClick={publish} disabled={!caption.trim()} className="flex-1 flex items-center justify-center gap-1.5 border border-white bg-white text-black font-mono text-xs tracking-widest uppercase py-2 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30"><Send className="w-3 h-3"/>POST</button>
            </div>
          )}
          {state==="uploading"&&<div className="w-full border border-neutral-800 py-4 flex items-center justify-center gap-3 font-mono text-xs tracking-widest uppercase text-neutral-400"><Loader2 className="w-4 h-4 animate-spin"/>UPLOADING...</div>}
        </div>
        {msg&&<p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase text-center">{msg}</p>}
        <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase text-center">[ REPLIES ] = VOICE COMMENTS • SHOWS INLINE UNDER POST</p>
      </div>
    </div>
  );
}

// ─── Post Reverb (Audio Comments) Section with Emoji Reaction Log ─────────────
function PostReverbSection({ post, currentUser, onReplyClick, onProfileClick }: {
  post: FeedPost;
  currentUser: any;
  onReplyClick: (rid?: string, rh?: string) => void;
  onProfileClick: (h: string) => void;
}) {
  const [reverbs, setReverbs]   = useState<PostReverbItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedReverbForLog, setSelectedReverbForLog] = useState<PostReverbItem | null>(null);

  const REACTION_OPTIONS = ["😂", "🔥", "❤️", "👍", "⚡", "💀", "🧢", "💯"];

  useEffect(()=>{
    if(!expanded)return;
    const unsub=subscribeToPostReverbs(post.id,setReverbs);
    return()=>unsub();
  },[post.id,expanded]);

  const handlePulse=async(rv:PostReverbItem)=>{
    if(!currentUser)return;
    await togglePulsePostReverb(post.id,rv.id,currentUser.uid,!!(rv.pulsedBy||[]).includes(currentUser.uid));
  };

  const handleReact = async (rv: PostReverbItem, emoji: string) => {
    if (!currentUser) return;
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

  const total=post.reverbCount||0;

  return(
    <div className="space-y-1 pt-1">
      <button onClick={()=>setExpanded(v=>!v)}
        className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-600 tracking-widest uppercase hover:text-neutral-400 transition-colors cursor-pointer">
        {expanded?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
        {total>0?`${total} REPLY${total!==1?"S":""}`:expanded?"[ REPLIES ]":"[ + ADD REPLY ]"}
      </button>

      {expanded&&(
        <div className="border-l-2 border-neutral-900 pl-4 space-y-5 mt-2">
          {reverbs.length===0&&(
            <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase animate-pulse">LOADING [ REPLIES ]...</p>
          )}
          {reverbs.map(rv=>{
            const pulsed=currentUser?(rv.pulsedBy||[]).includes(currentUser.uid):false;
            const reactionsMap = rv.reactions || {};
            const reactionList = Object.values(reactionsMap);
            
            // Group counts
            const emojiCounts: Record<string, number> = {};
            reactionList.forEach((r) => {
              emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
            });
            const userReactedEmoji = currentUser ? reactionsMap[currentUser.uid]?.emoji : null;

            return(
              <div key={rv.id} className="space-y-2 border-b border-neutral-900/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>onProfileClick(rv.handle)} className="font-mono text-[10px] tracking-widest text-neutral-400 hover:text-white uppercase cursor-pointer">
                      {rv.handle}
                    </button>
                    {rv.reverbOfHandle&&<span className="font-mono text-[10px] text-neutral-700">↩ {rv.reverbOfHandle}</span>}
                  </div>
                  {userReactedEmoji && (
                    <span className="text-[10px] bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.2">
                      {userReactedEmoji}
                    </span>
                  )}
                </div>

                {rv.caption&&<p className="font-mono text-[10px] text-neutral-500 tracking-wide">{rv.caption}</p>}

                {rv.audioUrl && (
                  <AudioPlayer audioUrl={rv.audioUrl} fallbackDurationSec={rv.durationSec||5} small/>
                )}

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button onClick={()=>handlePulse(rv)} className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${pulsed?"text-white":"text-neutral-600 hover:text-white"}`}>
                      <Heart className={`w-3 h-3 ${pulsed?"fill-white":""}`}/>
                      {rv.pulseCount>0?formatNum(rv.pulseCount):"[ PULSE ]"}
                    </button>
                    <button onClick={()=>onReplyClick(rv.id,rv.handle)} className="flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase text-neutral-600 hover:text-white cursor-pointer transition-colors">
                      <Repeat2 className="w-3 h-3"/>[ REPLY ]
                    </button>
                  </div>

                  {/* Emoji Reactions Bar */}
                  <div className="flex items-center gap-1 bg-black/60 border border-neutral-900 rounded-full px-2 py-0.5">
                    {REACTION_OPTIONS.map((emoji) => {
                      const isSelected = userReactedEmoji === emoji;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(rv, emoji)}
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
                </div>

                {/* Reaction Log Trigger */}
                {reactionList.length > 0 && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReverbForLog(rv)}
                      className="flex items-center gap-1.5 font-mono text-[9px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-full px-2.5 py-0.5 transition-all cursor-pointer"
                    >
                      {Object.entries(emojiCounts).map(([emoji, count]) => (
                        <span key={emoji} className="flex items-center gap-0.5">
                          <span>{emoji}</span>
                          <span className="font-bold text-white">{count}</span>
                        </span>
                      ))}
                      <span className="text-neutral-500 text-[8px] uppercase ml-1">• WHO REACTED</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {currentUser&&(
            <button onClick={()=>onReplyClick()} className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-neutral-700 tracking-widest uppercase hover:text-neutral-400 transition-colors cursor-pointer border border-neutral-900 px-3 py-2 w-full">
              <Mic2 className="w-3 h-3"/>[ + ADD YOUR REPLY ]
            </button>
          )}
        </div>
      )}

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
              <p className="font-serif italic text-xs text-neutral-300">
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
    } catch (err) {
      console.warn("[TextCommentSection] Warning creating comment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (c: CommentItem) => {
    if (!currentUser) return;
    const isLiked = (c.likedBy || []).includes(currentUser.uid);
    await toggleLikeComment(c.id, currentUser.uid, isLiked);
  };

  const handleDelete = async (cId: string) => {
    await deleteComment(cId, postId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-black border-t border-neutral-700 h-[70vh] flex flex-col m-0 md:mb-0 md:border md:rounded-t-lg">
        <div className="flex items-center justify-between p-4 border-b border-neutral-900">
          <p className="font-mono text-xs tracking-widest uppercase text-white">[ TEXT COMMENTS ]</p>
          <button onClick={onClose} className="font-mono text-xs text-neutral-600 hover:text-white cursor-pointer">[ ✕ ]</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase text-center py-8">NO COMMENTS YET</p>
          ) : (
            comments.map(c => {
              const liked = currentUser ? (c.likedBy || []).includes(currentUser.uid) : false;
              const isOwn = currentUser?.uid === c.authorUid;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">{c.authorHandle}</span>
                    <span className="font-mono text-[8px] text-neutral-700">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="font-mono text-sm text-neutral-200">{c.text}</p>
                  <div className="flex items-center gap-4 pt-1">
                    <button onClick={() => handleLike(c)} className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${liked ? "text-white" : "text-neutral-600 hover:text-white"}`}>
                      <Heart className={`w-3 h-3 ${liked ? "fill-white" : ""}`} />
                      {c.likeCount > 0 ? formatNum(c.likeCount) : ""} [ LIKE ]
                    </button>
                    {isOwn && (
                      <button onClick={() => handleDelete(c.id)} className="font-mono text-[10px] text-neutral-700 hover:text-red-500 uppercase tracking-widest cursor-pointer">
                        <Trash2 className="w-3 h-3 inline mr-1"/>DELETE
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-neutral-900">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder={currentUser ? "ADD A COMMENT..." : "LOGIN TO COMMENT"}
              disabled={!currentUser || loading}
              className="flex-1 bg-transparent border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-700 outline-none focus:border-neutral-500 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!text.trim() || !currentUser || loading}
              className="px-4 border border-white bg-white text-black font-mono text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "POST"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loading State ─────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <article className="py-8 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-neutral-900 rounded" />
        <div className="h-3 w-16 bg-neutral-900 rounded" />
      </div>
      <div className="h-8 w-3/4 bg-neutral-900 rounded" />
      <div className="border border-neutral-800 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-6 w-20 bg-neutral-900 rounded" />
          <div className="flex-1 h-5 bg-neutral-900 rounded" />
        </div>
        <div className="w-full h-[2px] bg-neutral-900" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="h-4 w-20 bg-neutral-900 rounded" />
        <div className="flex gap-4">
          <div className="h-4 w-16 bg-neutral-900 rounded" />
          <div className="h-4 w-16 bg-neutral-900 rounded" />
        </div>
      </div>
    </article>
  );
}

// ─── Swipe Gesture Hook ───────────────────────────────────────────────────────
function useSwipeGesture(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
  };

  return { onTouchStart, onTouchEnd };
}

// ─── Post Card Component (for proper hook usage) ───────────────────────────────
function PostCard({ post, user, orbitedPosts, activePostId, deletingId, onPulse, onOrbit, onShare, onDelete, onReplyClick, onProfileClick, onActiveChange, setRef, onFollow, onUnfollow, following, onComment }: {
  post: FeedPost; user: any; orbitedPosts: Set<string>; activePostId: string | null;
  deletingId: string | null; onPulse: (p: FeedPost) => void; onOrbit: (p: FeedPost) => void;
  onShare: (p: FeedPost) => void; onDelete: (id: string) => void; onReplyClick: (rid?: string, rh?: string) => void;
  onProfileClick: (h: string) => void; onActiveChange: (id: string | null) => void; setRef: (id: string, el: HTMLElement | null) => void;
  onFollow: (uid: string, handle: string) => void; onUnfollow: (uid: string) => void; following: Set<string>; onComment: (p: FeedPost) => void;
}) {
  const swipeHandlers = useSwipeGesture(
    () => onPulse(post), // Swipe left = pulse
    () => onShare(post)  // Swipe right = share
  );

  const isPulsed = user ? post.pulsedBy.includes(user.uid) : false;
  const isOrbited = orbitedPosts.has(post.id) || (user ? (post.orbitedBy || []).includes(user.uid) : false);
  const isOwn = user?.uid === post.authorUid;
  const isDel = deletingId === post.id;

  return (
    <article
      ref={el => setRef(post.id, el)}
      data-post-id={post.id}
      className="py-8 space-y-4 animate-fade-in"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onProfileClick(post.authorHandle)}
            className="font-mono text-xs tracking-widest text-white hover:underline uppercase cursor-pointer">
            {post.authorHandle}
          </button>
          {!isOwn && user && (
            <button
              onClick={() => following.has(post.authorUid) ? onUnfollow(post.authorUid) : onFollow(post.authorUid, post.authorHandle)}
              className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 border transition-colors cursor-pointer ${
                following.has(post.authorUid)
                  ? "border-neutral-700 text-neutral-500 hover:border-white hover:text-white"
                  : "border-white text-white hover:bg-white hover:text-black"
              }`}
            >
              {following.has(post.authorUid) ? "[ ORBITING ]" : "[ ORBIT ]"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-neutral-700 uppercase">{timeAgo(post.createdAt)}</span>
          {isOwn && (
            <button onClick={() => onDelete(post.id)}
              className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase transition-colors cursor-pointer ${isDel ? "text-white border border-white px-2 py-0.5 animate-pulse" : "text-neutral-700 hover:text-red-500"}`}>
              <Trash2 className="w-3 h-3" />{isDel ? "CONFIRM?" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Caption */}
      <h2 className="font-mono text-sm md:text-base font-bold text-white tracking-wide leading-relaxed">
        "{parseCaption(post.caption)}"
      </h2>

      {/* Player */}
      <AudioPlayer audioUrl={post.audioUrl} fallbackDurationSec={post.durationSec || 15}
        isActive={activePostId === post.id}
        onPlayToggle={p => { if (p) onActiveChange(post.id); else if (activePostId === post.id) onActiveChange(null); }} />

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 flex-wrap sm:flex-nowrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button onClick={() => onPulse(post)}
            className={`flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-widest uppercase cursor-pointer transition-colors whitespace-nowrap shrink-0 ${isPulsed ? "text-white font-bold" : "text-neutral-400 hover:text-white"}`}>
            <Heart className={`w-3.5 h-3.5 ${isPulsed ? "fill-white text-white" : ""}`} />
            <span>{formatNum(post.pulseCount)} PULSE</span>
          </button>
          <button onClick={() => onComment(post)}
            className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-widest uppercase cursor-pointer transition-colors text-neutral-400 hover:text-white whitespace-nowrap shrink-0">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.commentCount > 0 ? formatNum(post.commentCount) : ""} COMMENT</span>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {!isOwn && (
            <button onClick={() => onOrbit(post)} disabled={isOrbited}
              className={`flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-widest uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 ${isOrbited ? "text-white font-bold" : "text-neutral-400 hover:text-white"}`}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isOrbited ? "RE-ECHOED" : "RE-ECHO"}</span>
            </button>
          )}
          <button onClick={() => onShare(post)}
            className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-widest text-neutral-400 uppercase hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0">
            <Share2 className="w-3.5 h-3.5" />
            <span>SHARE</span>
          </button>
        </div>
      </div>

      {/* Inline reply thread */}
      <PostReverbSection post={post} currentUser={user}
        onReplyClick={onReplyClick}
        onProfileClick={onProfileClick} />
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomeFeedPage() {
  const { user }     = useAuth();
  const router       = useRouter();
  const [posts, setPosts]           = useState<FeedPost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [orbitedPosts, setOrbited]  = useState<Set<string>>(new Set());
  const [activePostId, setActiveId] = useState<string|null>(null);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [replyModal, setReplyModal] = useState<{post:FeedPost;rid?:string;rh?:string}|null>(null);
  const [commentPost, setCommentPost] = useState<FeedPost|null>(null);
  const [following, setFollowing]  = useState<Set<string>>(new Set());
  const userInteracted = useRef(false);
  const articleRefs    = useRef<Map<string,HTMLElement>>(new Map());
  const observerRef    = useRef<IntersectionObserver|null>(null);

  useEffect(()=>{
    const mark=()=>{userInteracted.current=true;};
    window.addEventListener("click",mark,{once:true});
    window.addEventListener("touchstart",mark,{once:true});
    return()=>{window.removeEventListener("click",mark);window.removeEventListener("touchstart",mark);};
  },[]);

  useEffect(()=>{
    const unsub=subscribeToPosts(live=>{
      setPosts(live.map(p=>({
        id:p.id, audioUrl:p.audioUrl, caption:p.caption,
        authorHandle:p.authorHandle||"@ANON", authorUid:p.authorUid||"anon",
        pulseCount:p.pulseCount||0, pulsedBy:p.pulsedBy||[],
        orbitedBy:(p as any).orbitedBy||[], duration:p.duration||"00:15",
        durationSec:p.durationSec||15, reverbCount:p.reverbCount||0, commentCount: (p as any).commentCount || 0, createdAt:p.createdAt,
      })));
      setLoading(false);
    });
    return()=>unsub();
  },[]);

  useEffect(()=>{
    if (!user?.uid) {
      setFollowing(new Set());
      return;
    }
    const unsub = subscribeToFollowing(user.uid, (list) => {
      setFollowing(new Set(list.map((f) => f.followingUid)));
    });
    return () => unsub();
  }, [user?.uid]);

  const setRef=useCallback((id:string,el:HTMLElement|null)=>{
    if(el)articleRefs.current.set(id,el);else articleRefs.current.delete(id);
  },[]);

  useEffect(()=>{
    observerRef.current=new IntersectionObserver(entries=>{
      if(!userInteracted.current)return;
      for(const e of entries){
        const id=e.target.getAttribute("data-post-id");
        if(id&&e.isIntersecting&&e.intersectionRatio>=0.6){setActiveId(id);return;}
      }
    },{threshold:[0,0.6]});
    const obs=observerRef.current;
    articleRefs.current.forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[posts]);

  const handlePulse=async(post:FeedPost)=>{
    if(!user){router.push("/login");return;}
    const pulsed=post.pulsedBy.includes(user.uid);
    await togglePulsePost(post.id,user.uid,pulsed);
    if(!pulsed)await createNotification(post.authorUid,{type:"pulse",fromUid:user.uid,fromHandle:user.handle||"@ANON",postId:post.id,postCaption:post.caption,text:`${user.handle} pulsed your echo.`});
  };

  const handleOrbit=async(post:FeedPost)=>{
    if(!user){router.push("/login");return;}
    if(orbitedPosts.has(post.id))return;
    setOrbited(prev=>new Set([...prev,post.id]));
    await createPost({audioUrl:post.audioUrl,caption:`[ RE-ECHO ] "${post.caption.slice(0,60)}${post.caption.length>60?"…":""}" — ${post.authorHandle}`,authorUid:user.uid,authorHandle:user.handle||"@ANON",duration:post.duration,durationSec:post.durationSec,orbitOf:post.id,orbitOfHandle:post.authorHandle} as any);
    await createNotification(post.authorUid,{type:"reverb",fromUid:user.uid,fromHandle:user.handle||"@ANON",postId:post.id,postCaption:post.caption,text:`${user.handle} re-echoed your post.`});
  };

  const handleShare=async(post:FeedPost)=>{
    const url=`${window.location.origin}/${post.authorHandle.replace(/^@/,"")}`;
    const d={title:`Echo by ${post.authorHandle}`,text:`"${post.caption}"`,url};
    if(navigator.share&&navigator.canShare?.(d)){try{await navigator.share(d);}catch{}}
    else{try{await navigator.clipboard.writeText(`${d.text} ${d.url}`);}catch{}}
  };

  const handleDelete=async(postId:string)=>{
    if(deletingId===postId){
      try{await deletePost(postId);setDeletingId(null);}
      catch(e){console.error(e);setDeletingId(null);}
    }else{
      setDeletingId(postId);
      setTimeout(()=>setDeletingId(p=>p===postId?null:p),3000);
    }
  };

  const handleFollow=async(uid:string, handle:string)=>{
    if(!user)return;
    try{
      await followUser(user.uid, user.handle||"@ANON", uid, handle);
      setFollowing(prev=>new Set([...prev, uid]));
    }catch(e){console.error(e);}
  };

  const handleUnfollow=async(uid:string)=>{
    if(!user)return;
    try{
      await unfollowUser(user.uid, uid);
      setFollowing(prev=>{const next=new Set(prev);next.delete(uid);return next;});
    }catch(e){console.error(e);}
  };

  return(
    <div className="min-h-screen bg-black text-white pb-28 md:pb-8 flex flex-col font-sans"
      onClick={()=>{userInteracted.current=true;}}>
      <header className="w-full bg-black border-b border-neutral-900 py-2.5 px-4 overflow-x-hidden">
        <div className="flex items-center gap-5 font-mono text-[10px] tracking-widest text-neutral-500 uppercase whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-white shrink-0"><Flame className="w-3 h-3"/>[ FREQUENCY ]</span>
          <span className="shrink-0">•</span><span className="shrink-0">LIVE AUDIO FEED</span>
          <span className="shrink-0">•</span><span className="shrink-0">UNFILTERED VOICES</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 md:px-6 pt-8 w-full flex-1 flex flex-col">
        {loading?(
          <div className="divide-y divide-neutral-900">
            {[1,2,3].map(i=><PostSkeleton key={i}/>)}
          </div>
        ):posts.length===0?(
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6 border border-neutral-900 p-8 my-8">
            <div className="w-12 h-12 border border-neutral-800 flex items-center justify-center"><Mic2 className="w-5 h-5 text-neutral-500"/></div>
            <div className="space-y-2">
              <h2 className="font-serif italic text-2xl text-white">The stream is silent.</h2>
              <p className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">NO ECHOES IN THE FREQUENCY YET</p>
            </div>
            <Link href="/studio" className="px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors">[ 🎙 DROP THE FIRST ECHO ]</Link>
          </div>
        ):(
          <div className="divide-y divide-neutral-900">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                orbitedPosts={orbitedPosts}
                activePostId={activePostId}
                deletingId={deletingId}
                onPulse={handlePulse}
                onOrbit={handleOrbit}
                onShare={handleShare}
                onDelete={handleDelete}
                onReplyClick={(rid?: string, rh?: string) => {
                  if (!user) { router.push("/login"); return; }
                  setReplyModal({ post, rid, rh });
                }}
                onComment={(post: FeedPost) => {
                  if (!user) { router.push("/login"); return; }
                  setCommentPost(post);
                }}
                onProfileClick={h => router.push(`/${h.replace(/^@/, "")}`)}
                onActiveChange={setActiveId}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                following={following}
                setRef={setRef}
              />
            ))}
          </div>
        )}
      </main>

      {replyModal&&(
        <ReplyRecordModal
          postId={replyModal.post.id}
          postCaption={replyModal.post.caption}
          postAuthorHandle={replyModal.post.authorHandle}
          postAuthorUid={replyModal.post.authorUid}
          reverbOfReverbId={replyModal.rid}
          reverbOfHandle={replyModal.rh}
          currentUser={user}
          onClose={()=>setReplyModal(null)}/>
      )}
      {commentPost&&(
        <TextCommentSection
          postId={commentPost.id}
          postAuthorUid={commentPost.authorUid}
          currentUser={user}
          onClose={()=>setCommentPost(null)}/>
      )}
    </div>
  );
}
