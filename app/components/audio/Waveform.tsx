"use client";

import { useState, useEffect, useRef } from "react";

// Static initial waveform heights
const WAVE_H = [4, 10, 18, 24, 14, 28, 10, 22, 6, 26, 16, 20, 8, 28, 14, 22, 10, 26, 6, 18, 24, 12, 30, 8, 20];

export default function Waveform({ playing, small, audioRef }: { playing: boolean; small?: boolean; audioRef?: React.RefObject<HTMLAudioElement | null> }) {
  const [waveformData, setWaveformData] = useState<number[]>(WAVE_H);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCounterRef = useRef(0);

  useEffect(() => {
    if (!audioRef?.current || !playing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const audio = audioRef.current;
    
    if (!audio.crossOrigin) {
      audio.crossOrigin = "anonymous";
    }
    
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
        // Source already connected or CORS blocked — fall back to CSS animation
        return;
      }
    }
    
    const analyser = analyserRef.current;
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current) return;
      
      // Throttle to ~15fps to prevent excessive React re-renders
      frameCounterRef.current++;
      if (frameCounterRef.current % 4 !== 0) {
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
        return;
      }
      
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

    frameCounterRef.current = 0;
    updateWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playing, audioRef, small]);

  // Clean up AudioContext on unmount to prevent browser AudioContext limit
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

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
