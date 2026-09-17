"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { getPlayableUrl } from "@/lib/cloudinary";
import { audioManager } from "@/lib/audioManager";
import { soundSynth } from "@/lib/soundSynthesizer";
import { fmt } from "@/app/utils/formatters";
import Waveform from "@/app/components/audio/Waveform";

// ─── URL helpers ──────────────────────────────────────────────────────────────
function buildUrlVariants(rawUrl: string): string[] {
  if (!rawUrl) return [];
  const playable = getPlayableUrl(rawUrl);
  return [playable];
}

// ─── Audio Player (Modern, Tactile, Sleek) ───────────────────────────────────
export default function AudioPlayer({ audioUrl, fallbackDurationSec, isActive, onPlayToggle, small, onFirstPlay }: {
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
          className="w-full h-2 bg-neutral-800 hover:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white transition-all focus:outline-none"
          title="Slide to seek audio"
        />
      </div>
    </div>
  );
}
