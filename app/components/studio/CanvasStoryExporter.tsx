'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, 
  Share2, 
  X, 
  Loader2, 
  Play, 
  Pause, 
  Film, 
  Sparkles, 
  Check,
  Radio,
  Music
} from 'lucide-react';
import { soundSynth } from '@/lib/soundSynthesizer';

interface CanvasStoryExporterProps {
  isOpen: boolean;
  onClose: () => void;
  audioBlob: Blob | null;
  audioUrl: string | null;
  caption: string;
  userHandle: string;
  voiceMaskLabel?: string;
  durationSec: number;
}

export default function CanvasStoryExporter({
  isOpen,
  onClose,
  audioBlob,
  audioUrl,
  caption,
  userHandle,
  voiceMaskLabel,
  durationSec,
}: CanvasStoryExporterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  // Wrap text cleanly on canvas
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  };

  // ── Render 9:16 Canvas Animation Frame ─────────────────────────────────────
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      dataArray: Uint8Array,
      timeMs: number
    ) => {
      // 1. Clear background & draw space gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        50,
        width / 2,
        height / 2,
        height * 0.7
      );
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#050814');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Retro CRT Scanlines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // 3. Header Branding Pill
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      const pillW = 380;
      const pillH = 46;
      const pillX = (width - pillW) / 2;
      const pillY = 90;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 23);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pillX + 28, pillY + 23, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 16px "Courier New", monospace, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('ECHO FREQUENCY • LIVE VOICE', pillX + 44, pillY + 29);
      ctx.restore();

      // 4. Center Audio Spectrum Visualizer (Circular Core + Bouncing Spectrum Bars)
      const centerX = width / 2;
      const centerY = height * 0.46;
      const radius = 110;

      // Average volume energy
      let totalEnergy = 0;
      for (let i = 0; i < dataArray.length; i++) {
        totalEnergy += dataArray[i];
      }
      const avgEnergy = totalEnergy / dataArray.length;
      const scaleFactor = 1 + (avgEnergy / 255) * 0.35;

      // Outer Pulsing Glow Ring
      ctx.save();
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.8,
        centerX,
        centerY,
        radius * 2.2 * scaleFactor
      );
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      glowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 2.2 * scaleFactor, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * scaleFactor, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mic Icon & Mask Label in Center
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🎙️', centerX, centerY - 6);

      if (voiceMaskLabel && voiceMaskLabel !== 'Studio Mic') {
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(voiceMaskLabel.toUpperCase(), centerX, centerY + 28);
      }
      ctx.restore();

      // 5. Circular Audio Reactive Bars around Center
      const barCount = 48;
      ctx.save();
      ctx.translate(centerX, centerY);
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const dataIdx = Math.floor(i * (dataArray.length / barCount));
        const val = dataArray[dataIdx] || 0;
        const barHeight = Math.max(6, (val / 255) * 85);

        const x1 = Math.cos(angle) * (radius * scaleFactor + 12);
        const y1 = Math.sin(angle) * (radius * scaleFactor + 12);
        const x2 = Math.cos(angle) * (radius * scaleFactor + 12 + barHeight);
        const y2 = Math.sin(angle) * (radius * scaleFactor + 12 + barHeight);

        ctx.strokeStyle = `hsl(${(i * 7 + timeMs * 0.05) % 360}, 85%, 65%)`;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 6. User Handle Badge
      ctx.save();
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(userHandle, centerX, height * 0.69);

      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('UNFILTERED AUDIO TRANSMISSION', centerX, height * 0.72);
      ctx.restore();

      // 7. Caption Text Box
      ctx.save();
      const cardW = width - 100;
      const cardX = 50;
      const cardY = height * 0.75;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 145, 20);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const cleanCaption = caption.trim() ? `"${caption.slice(0, 140)}"` : '"Live voice take on Echo."';
      wrapText(ctx, cleanCaption, centerX, cardY + 45, cardW - 40, 26);
      ctx.restore();

      // 8. Footer Call to Action (Instagram / WhatsApp Link Prompt)
      ctx.save();
      const footerY = height - 90;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(width / 2 - 220, footerY - 26, 440, 52, 26);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();

      ctx.font = 'black 16px "Courier New", monospace, sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('🔊 LISTEN LIVE ON ECHO APP', centerX, footerY + 6);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('echo-aura.vercel.app', centerX, height - 32);
      ctx.restore();
    },
    [caption, userHandle, voiceMaskLabel]
  );

  // ── Render & Record Story Video ────────────────────────────────────────────
  const generateVideo = useCallback(async () => {
    if (!audioBlob || !canvasRef.current) return;
    setIsExporting(true);
    setExportProgress(0);
    setIsDone(false);

    const canvas = canvasRef.current;
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Setup Audio Element & Web Audio Analyser
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioElemRef.current = audio;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioContextRef.current = audioCtx;
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaElementSource(audio);
    sourceNodeRef.current = source;

    const dest = audioCtx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(dest);
    analyser.connect(audioCtx.destination); // For monitoring

    // 2. Combine Canvas Stream + Audio Stream into Master Stream
    const canvasStream = canvas.captureStream(30); // 30 FPS
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }

    // 3. MediaRecorder with cross-browser video mime fallback
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        mimeType = 'video/webm';
      }
    }

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps crisp 720p
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const finalVideoBlob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(finalVideoBlob);
      setVideoBlob(finalVideoBlob);
      setVideoBlobUrl(url);
      setIsExporting(false);
      setIsDone(true);
      soundSynth.playSubtlePop();

      // Cleanup
      URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    // 4. Start recording & playback loop
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let startTime = Date.now();

    const renderLoop = () => {
      analyser.getByteFrequencyData(dataArray);
      const elapsed = Date.now() - startTime;
      drawFrame(ctx, 720, 1280, dataArray, elapsed);

      if (audio.duration && isFinite(audio.duration)) {
        const progress = Math.min(100, Math.floor((audio.currentTime / audio.duration) * 100));
        setExportProgress(progress);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    mediaRecorder.start();

    audio.onended = () => {
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 400);
    };

    audio.play().catch((err) => {
      console.error('Audio play error in export:', err);
      if (mediaRecorder.state === 'recording') mediaRecorder.stop();
    });
  }, [audioBlob, drawFrame]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioElemRef.current) audioElemRef.current.pause();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      setIsExporting(false);
      setIsDone(false);
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (!videoBlobUrl) return;
    soundSynth.playSubtlePop();
    const a = document.createElement('a');
    a.href = videoBlobUrl;
    a.download = `echo-story-${userHandle.replace(/^@/, '')}-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!videoBlob) return;
    soundSynth.playSubtlePop();
    const file = new File([videoBlob], `echo-story-${Date.now()}.mp4`, { type: videoBlob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Echo Voice Story by ${userHandle}`,
          text: `Listen to "${caption.slice(0, 80)}" on Echo!`,
        });
      } catch {}
    } else {
      // Fallback: Copy link
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              9:16 Video Story Exporter
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 9:16 Visual Canvas Preview Box */}
        <div className="relative w-full aspect-[9/16] max-h-[380px] mx-auto bg-black rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />

          {!isExporting && !isDone && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                <Film className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Insta & WhatsApp 9:16 Story Clip
                </p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Generates an animated audio visualizer reel with scanlines & your handle.
                </p>
              </div>
              <button
                type="button"
                onClick={generateVideo}
                className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-full hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate 9:16 Story</span>
              </button>
            </div>
          )}

          {isExporting && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Rendering Video Story ({exportProgress}%)
                </p>
                <p className="text-[10px] text-neutral-400">
                  Synthesizing audio spectrum & scanlines...
                </p>
              </div>
              <div className="w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {isDone && (
          <div className="space-y-2.5 pt-1 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="py-3 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Video</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? 'Link Copied!' : 'Share to Story'}</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 text-center">
              Compatible with Instagram Stories, WhatsApp Status & TikTok.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
