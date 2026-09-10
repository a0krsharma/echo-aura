"use client";

import React, { useState, useRef, useEffect } from "react";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  X,
  Edit3,
  Eraser,
  Trash2,
  Download,
  StickyNote,
  Maximize2,
  Check,
  Undo2,
} from "lucide-react";

interface WhiteboardCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDrawings?: string;
  onSave?: (serializedData: string) => void;
}

const PALETTE = [
  "#000000",
  "#ffffff",
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#fbbf24", // Amber
  "#a855f7", // Purple
];

const STROKE_SIZES = [
  { label: "Fine", size: 2 },
  { label: "Medium", size: 4 },
  { label: "Thick", size: 8 },
  { label: "Marker", size: 16 },
];

export default function WhiteboardCanvasModal({
  isOpen,
  onClose,
  initialDrawings,
  onSave,
}: WhiteboardCanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [stickyText, setStickyText] = useState("");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid dots
      ctx.fillStyle = "#e2e8f0";
      for (let x = 20; x < canvas.width; x += 24) {
        for (let y = 20; y < canvas.height; y += 24) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Restore initial data if any
      if (initialDrawings) {
        try {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            saveHistory();
          };
          img.src = initialDrawings;
        } catch (e) {
          saveHistory();
        }
      } else {
        saveHistory();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialDrawings]);

  if (!isOpen) return null;

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), snapshot]);
    } catch (e) {}
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextHistory = [...history];
    nextHistory.pop(); // Pop current
    const prevSnapshot = nextHistory[nextHistory.length - 1];
    ctx.putImageData(prevSnapshot, 0, 0);
    setHistory(nextHistory);
    spacesSfx.playKeyNote(2);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Drawing mouse/touch handlers
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const coords = getCanvasCoords(e);
    lastPoint.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const coords = getCanvasCoords(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPoint.current = coords;
  };

  const handleEndDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    saveHistory();
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e2e8f0";
    for (let x = 20; x < canvas.width; x += 24) {
      for (let y = 20; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    saveHistory();
    spacesSfx.playFountainSplash();
  };

  // Add Sticky Note
  const handleAddSticky = () => {
    if (!stickyText.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sX = 60 + Math.random() * 200;
    const sY = 60 + Math.random() * 150;
    const sW = 160;
    const sH = 100;

    // Sticky note shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(sX + 4, sY + 4, sW, sH);

    // Note paper
    ctx.fillStyle = "#fef08a"; // Yellow sticky
    ctx.fillRect(sX, sY, sW, sH);
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1;
    ctx.strokeRect(sX, sY, sW, sH);

    // Pin header
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(sX + sW / 2 - 12, sY - 4, 24, 8);

    // Note Text
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(stickyText.trim(), sX + 10, sY + 30, sW - 20);

    setStickyText("");
    saveHistory();
    spacesSfx.playSitPop();
  };

  // Save Whiteboard
  const handleSaveWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);
    setFeedback("Saved to room whiteboard!");
    spacesSfx.playZoneChime();
    setTimeout(() => setFeedback(null), 2500);
  };

  // Download Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `echo-space-whiteboard-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">SHARED TEAM WHITEBOARD</h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                Collaborative sketches, diagrams & sticky notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {feedback && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                {feedback}
              </span>
            )}
            <button
              onClick={handleSaveWhiteboard}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all cursor-pointer"
            >
              SYNC NOTE
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tools bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/40 gap-3">
          {/* Tool switchers */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTool("pen")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === "pen"
                  ? "bg-white text-black font-bold"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === "eraser"
                  ? "bg-white text-black font-bold"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 text-xs font-mono transition-all cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 text-rose-400 hover:bg-rose-950/40 text-xs font-mono transition-all cursor-pointer"
              title="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
                className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                  color === c && tool === "pen"
                    ? "scale-125 border-cyan-400 shadow-md ring-2 ring-white/30"
                    : "border-neutral-700 hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke sizes */}
          <div className="flex items-center gap-1">
            {STROKE_SIZES.map((s) => (
              <button
                key={s.size}
                onClick={() => setStrokeWidth(s.size)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  strokeWidth === s.size
                    ? "bg-cyan-500 text-black font-bold"
                    : "text-neutral-400 hover:text-white bg-neutral-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sticky note input */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={stickyText}
              onChange={(e) => setStickyText(e.target.value)}
              placeholder="Sticky note..."
              maxLength={40}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 outline-none w-28 focus:w-40 transition-all"
            />
            <button
              onClick={handleAddSticky}
              disabled={!stickyText.trim()}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
            >
              <StickyNote className="w-3 h-3" />
              <span>Stick</span>
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-neutral-900 p-4 flex items-center justify-center overflow-auto">
          <canvas
            ref={canvasRef}
            width={840}
            height={480}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className="bg-white rounded-2xl shadow-xl border border-neutral-300 cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
}
