"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  Video,
  Image as ImageIcon,
  Sparkles,
  Radio,
  Check,
  Disc,
  Play,
  Pause,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";

interface ViralStoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName?: string;
  userHandle?: string;
  scoreText?: string;
  roomId?: string;
}

export default function ViralStoryGeneratorModal({
  isOpen,
  onClose,
  gameName = "ARCADE ARENA",
  userHandle = "@PLAYER",
  scoreText = "Crushed the lobby with high aura!",
  roomId = "8912",
}: ViralStoryGeneratorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [caption, setCaption] = useState<string>(
    "Made on Echo in 4 seconds. Tap to listen & reply 🔥"
  );
  const [customTaunt, setCustomTaunt] = useState<string>(scoreText);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const roomUrl = `${origin}/arcade?join=${roomId}`;

  // Canvas drawing loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isVertical = aspectRatio === "9:16";
    const width = isVertical ? 720 : 1280;
    const height = isVertical ? 1280 : 720;
    canvas.width = width;
    canvas.height = height;

    let time = 0;

    const render = () => {
      time += 0.04;

      // 1. Background Gradient (Cyber Noir)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#050505");
      grad.addColorStop(0.5, "#0d0d18");
      grad.addColorStop(1, "#020202");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. CRT Scanline Mesh
      ctx.fillStyle = "rgba(255, 255, 255, 0.018)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // 3. Glowing Ambient Cyber Aura Particles
      for (let i = 0; i < 16; i++) {
        const x = (Math.sin(time * 0.4 + i * 1.3) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.5 + i * 1.7) * 0.5 + 0.5) * height;
        const rad = 15 + Math.sin(time + i) * 8;
        const pGrad = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
        pGrad.addColorStop(0, i % 2 === 0 ? "rgba(0, 255, 200, 0.15)" : "rgba(255, 0, 128, 0.12)");
        pGrad.addColorStop(1, "transparent");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(x, y, rad * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Header Badge
      const centerY = isVertical ? 380 : 250;
      ctx.textAlign = "center";
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 20px monospace";
      ctx.fillText("⚡ ECHO CYBER AUDIO LOUNGE // VIRAL STATUS", width / 2, isVertical ? 120 : 60);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 42px monospace";
      ctx.fillText(gameName.toUpperCase(), width / 2, isVertical ? 180 : 110);

      // 5. Glowing Retro Cassette Tape
      const tapeW = isVertical ? 460 : 540;
      const tapeH = isVertical ? 280 : 310;
      const tapeX = (width - tapeW) / 2;
      const tapeY = centerY;

      // Outer Tape Shell
      ctx.fillStyle = "#111115";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(tapeX, tapeY, tapeW, tapeH, 24);
      ctx.fill();
      ctx.stroke();

      // Tape Label Insert
      ctx.fillStyle = "#1a1a24";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tapeX + 24, tapeY + 24, tapeW - 48, tapeH - 48, 14);
      ctx.fill();
      ctx.stroke();

      // Cassette Center Window
      const winW = tapeW - 120;
      const winH = 90;
      const winX = tapeX + 60;
      const winY = tapeY + (tapeH - winH) / 2;
      ctx.fillStyle = "#050508";
      ctx.strokeStyle = "#404040";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, winH, 10);
      ctx.fill();
      ctx.stroke();

      // Spinning Cassette Spools (Left & Right)
      const spoolRadius = 28;
      const spoolY = winY + winH / 2;
      const leftSpoolX = winX + 50;
      const rightSpoolX = winX + winW - 50;

      [leftSpoolX, rightSpoolX].forEach((sx) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, spoolY, spoolRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(sx, spoolY, 14, 0, Math.PI * 2);
        ctx.fill();

        // Spinning Teeth
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        for (let a = 0; a < 6; a++) {
          const angle = time * 3 + (a * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(angle) * 14, spoolY + Math.sin(angle) * 14);
          ctx.lineTo(sx + Math.cos(angle) * spoolRadius, spoolY + Math.sin(angle) * spoolRadius);
          ctx.stroke();
        }
      });

      // Cassette Tape Label Text
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`SIDE A: ${userHandle.toUpperCase()}`, width / 2, tapeY + 60);

      // 6. Dynamic Audio Waveform Spectrum
      const waveY = isVertical ? 740 : 610;
      const numBars = 32;
      const barW = (tapeW - 20) / numBars;
      ctx.fillStyle = "#10b981";

      for (let b = 0; b < numBars; b++) {
        const barH = 10 + Math.abs(Math.sin(time * 3 + b * 0.4) * 45) + Math.cos(b * 0.3) * 12;
        const bx = (width - (tapeW - 20)) / 2 + b * barW;
        ctx.fillRect(bx, waveY - barH / 2, barW - 3, barH);
      }

      // 7. Taunt & Score Box
      const boxY = isVertical ? 820 : 480;
      const boxW = width - (isVertical ? 100 : 400);
      const boxH = isVertical ? 180 : 130;
      const boxX = (width - boxW) / 2;

      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`"${customTaunt}"`, width / 2, boxY + 45);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px monospace";
      ctx.fillText(caption, width / 2, boxY + 80);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 16px monospace";
      ctx.fillText(`👉 TAP TO DUEL: echo.app/arcade?join=${roomId}`, width / 2, boxY + 120);

      // 8. Footer Watermark & Live Pulse
      ctx.fillStyle = "#6ee7b7";
      ctx.font = "bold 14px monospace";
      ctx.fillText(
        "🎙️ MIC IS ON • NO APP DOWNLOAD REQUIRED • ZERO LAG",
        width / 2,
        isVertical ? 1160 : 680
      );

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, aspectRatio, gameName, userHandle, customTaunt, caption, roomId]);

  if (!isOpen) return null;

  // Export as PNG image
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundSynth.playSnare();
    const link = document.createElement("a");
    link.download = `echo_${gameName.toLowerCase()}_story.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Record 6-second animated WebM / MP4 video directly in browser
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      setIsRecording(true);
      setRecordProgress(0);
      soundSynth.playFanfare();

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `echo_${gameName.toLowerCase()}_status.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordProgress(100);
      };

      recorder.start();

      const durationMs = 6000;
      const interval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        setRecordProgress(Math.min(99, Math.round((elapsed / durationMs) * 100)));
        if (elapsed >= durationMs) {
          clearInterval(timer);
          recorder.stop();
        }
      }, interval);
    } catch (err) {
      console.error("Video recording failed:", err);
      setIsRecording(false);
    }
  };

  // 1-Tap WhatsApp Story Launcher
  const handleShareWhatsApp = () => {
    soundSynth.playSnare();
    const message = `🎙️ *Made on Echo in 4 seconds!*

"${customTaunt}"
Arena: *${gameName}*

🔥 *Tap to listen & reply live:* ${roomUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    soundSynth.playApplause();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl bg-black border-2 border-white p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1 border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>// VIRAL STATUS & STORY GENERATOR [ GROWTH ENGINE ]</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black uppercase text-white">
            1-Tap WhatsApp & Instagram Story Studio
          </h2>
          <p className="text-xs text-neutral-400">
            Generate animated cassette story cards & 15-second status videos directly in browser.
          </p>
        </div>

        {/* Controls & Canvas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Interactive Canvas Preview */}
          <div className="flex flex-col items-center justify-center bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
            <div
              className={`relative overflow-hidden border-2 border-white rounded-lg shadow-2xl transition-all ${
                aspectRatio === "9:16" ? "w-[240px] h-[426px]" : "w-[380px] h-[214px]"
              }`}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>

            {isRecording && (
              <div className="w-full mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-emerald-400 font-bold">
                  <span>RECORDING STATUS VIDEO...</span>
                  <span>{recordProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Customization Controls & Export Actions */}
          <div className="space-y-4">
            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase font-bold">STORY FORMAT:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`py-2 px-3 border rounded text-xs font-bold uppercase transition-all ${
                    aspectRatio === "9:16"
                      ? "border-emerald-400 bg-emerald-950/40 text-emerald-400 font-black"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  📱 9:16 Vertical Story (IG / WA)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`py-2 px-3 border rounded text-xs font-bold uppercase transition-all ${
                    aspectRatio === "16:9"
                      ? "border-emerald-400 bg-emerald-950/40 text-emerald-400 font-black"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  🖥️ 16:9 Landscape Status
                </button>
              </div>
            </div>

            {/* Custom Punchline / Taunt */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase font-bold">
                PUNCHLINE / SCORECARD TAUNT:
              </label>
              <input
                type="text"
                value={customTaunt}
                onChange={(e) => setCustomTaunt(e.target.value)}
                maxLength={60}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-white px-3 py-2 text-xs font-mono text-white rounded outline-none"
              />
            </div>

            {/* Sub-caption */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase font-bold">SUB-CAPTION:</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={70}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-white px-3 py-2 text-xs font-mono text-white rounded outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {typeof navigator !== "undefined" && navigator.share ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      
                      canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        
                        const file = new File([blob], `echo_victory.png`, { type: "image/png" });
                        
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: `${gameName} VICTORY!`,
                            text: `Tap to Duel me LIVE: ${roomUrl}`,
                          });
                        } else {
                          // Fallback to link only
                          await navigator.share({
                            title: `${gameName} VICTORY!`,
                            text: `I just dominated ${gameName}!\n\n"${customTaunt}"\n\n${caption}\n\nTap to Duel me LIVE:`,
                            url: roomUrl,
                          });
                        }
                        soundSynth.playApplause();
                      }, "image/png");
                    } catch (err) {
                      console.error("Share failed:", err);
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-90 text-white font-black text-xs uppercase rounded-lg transition-all shadow-[0_0_20px_rgba(236,72,153,0.5)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>[ 📸 SHARE TO INSTAGRAM / OS ]</span>
                </button>
              ) : null}
              
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>[ 📲 1-TAP SHARE ON WHATSAPP ]</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRecordVideo}
                  disabled={isRecording}
                  className="py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-rose-400" />
                  <span>{isRecording ? "RECORDING..." : "EXPORT MP4 VIDEO"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>DOWNLOAD PNG</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 bg-black border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? "COPIED DUEL LINK TO CLIPBOARD!" : "COPY DIRECT ROOM LINK"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
