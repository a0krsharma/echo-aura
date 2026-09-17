"use client";

import { useState, useRef, useEffect } from "react";
import { Mic2, Play, Pause, Trash2, Send, Loader2, AtSign } from "lucide-react";
import { uploadAudio } from "@/lib/cloudinary";
import { addPostReverb } from "@/lib/posts";
import { createNotification } from "@/lib/notifications";
import { soundSynth } from "@/lib/soundSynthesizer";

interface ReplyRecordModalProps {
  postId: string;
  postCaption: string;
  postAuthorHandle: string;
  postAuthorUid: string;
  reverbOfReverbId?: string;
  reverbOfHandle?: string;
  currentUser: any;
  onClose: () => void;
}

export default function ReplyRecordModal({ postId, postCaption, postAuthorHandle, postAuthorUid, reverbOfReverbId, reverbOfHandle, currentUser, onClose }: ReplyRecordModalProps) {
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
    prevAudio.current?.pause(); 
    setPP(false); 
    setState("uploading"); 
    setMsg("Uploading voice take...");
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
      <div className="w-full max-w-lg bg-black border border-white rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm text-white">
              {reverbOfHandle ? `Reply to ${reverbOfHandle}` : `Reply to ${postAuthorHandle}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors">
            ✕
          </button>
        </div>

        <p className="text-xs text-neutral-400 line-clamp-2 bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-800">
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
            <button 
              onClick={startRec} 
              className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
            >
              <Mic2 className="w-4 h-4 fill-current" />
              <span>Tap to Record Voice Take</span>
            </button>
          )}

          {state === "recording" && (
            <button 
              onClick={stopRec} 
              className="w-full bg-neutral-900 hover:bg-neutral-800 border border-white text-white font-bold text-xs py-3.5 rounded-2xl animate-pulse cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Stop Recording</span>
            </button>
          )}

          {state === "preview" && (
            <div className="flex gap-2.5">
              <button 
                onClick={togglePrev} 
                className="px-4 py-2.5 rounded-xl border border-white bg-black hover:bg-neutral-900 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {prevPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{prevPlaying ? "Pause" : "Play"}</span>
              </button>
              <button 
                onClick={() => { setState("idle"); setBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPrev(null); setMs(0); }} 
                className="px-3 py-2 rounded-xl text-neutral-400 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button 
                onClick={publish} 
                className="flex-1 bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4 fill-current" />
                <span>Publish Reply</span>
              </button>
            </div>
          )}

          {state === "uploading" && (
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{msg || "Uploading..."}</span>
            </div>
          )}

          {msg && state !== "uploading" && (
            <p className="text-xs text-neutral-400 text-center font-mono">{msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
