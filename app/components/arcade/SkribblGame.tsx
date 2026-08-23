"use client";

import React, { useRef, useEffect, useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { submitSkribblStroke, submitSkribblGuess, type ArcadeMatch } from "@/lib/arcade";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Paintbrush, Send } from "lucide-react";

interface SkribblGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 280;

export default function SkribblGame({ match, currentUid }: SkribblGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ss = match.skribblState;
  if (!ss) return <div className="text-white font-mono p-4">Loading Vector Canvas...</div>;

  const isDrawer = ss.currentDrawerUid === currentUid;

  // Render synced drawing paths onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const paths: { x0: number; y0: number; x1: number; y1: number; color?: string }[] = JSON.parse(
      ss.pathsStr || "[]"
    );

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    paths.forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(p.x0, p.y0);
      ctx.lineTo(p.x1, p.y1);
      ctx.stroke();
    });
  }, [ss.pathsStr]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || match.status === "FINISHED") return;
    setIsDrawing(true);
  };

  const handlePointerMove = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || match.status === "FINISHED") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x1 = e.clientX - rect.left;
    const y1 = e.clientY - rect.top;
    const x0 = x1 - e.movementX;
    const y0 = y1 - e.movementY;

    await submitSkribblStroke(match.id, { x0, y0, x1, y1 });
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleGuessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isDrawer || match.status === "FINISHED") return;

    const text = guessInput;
    setGuessInput("");

    try {
      const result = await submitSkribblGuess(match.id, currentUid, text);
      if (result.correct) soundSynth.playFanfare();
      else soundSynth.playSubtlePop();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
          <Paintbrush className="w-4 h-4 text-emerald-400" />
          // VECTOR CANVAS [ SKRIBBL ]
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2 py-0.5 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ INVITE 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold text-[10px]">
            {isDrawer ? "● YOU ARE DRAWING" : "GUESS THE WORD"}
          </span>
        </div>
      </div>

      {/* Secret Word or Hint Header */}
      <div className="border border-neutral-800 bg-neutral-950 p-2.5 text-center">
        {isDrawer ? (
          <span className="text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
            YOUR SECRET DRAW WORD: [{ss.secretWord}]
          </span>
        ) : (
          <span className="text-white font-mono font-black text-base tracking-widest">
            HINT: {ss.wordHint}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="border-2 border-neutral-700 flex justify-center bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`touch-none ${isDrawer ? "cursor-crosshair" : "cursor-default"}`}
        />
      </div>

      {/* Guess Input Form */}
      {!isDrawer && (
        <form onSubmit={handleGuessSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="TYPE WORD GUESS..."
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-700 px-3 py-2 text-white font-mono text-xs uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2 border-2 border-white bg-white text-black font-extrabold text-xs uppercase hover:bg-neutral-200 cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>GUESS</span>
          </button>
        </form>
      )}

      {/* Action Telemetry */}
      {ss.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ss.lastActionLog}</span>
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
