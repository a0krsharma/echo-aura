"use client";

import React, { useState, useRef, useEffect } from "react";
import { type ArcadeMatch } from "@/lib/arcade";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  X,
  Share2,
  Download,
  Flame,
  Swords,
  Trophy,
  Sparkles,
  QrCode,
  Smartphone,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";

interface ArcadeRevengeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ArcadeMatch;
  currentUid: string;
}

const GAME_NAMES: Record<string, string> = {
  hand_cricket: "Hand Cricket",
  raja_mantri: "Raja Mantri Chor Sipahi",
  uno: "Uno",
  ludo: "15x15 Cyber Ludo",
  chess: "Chess",
  rummy: "Indian 13-Card Rummy",
  call_break: "Call Break",
  teen_patti: "Teen Patti",
  satte_pe_satta: "Satte Pe Satta",
  bhabhi_thulla: "Bhabhi / Thulla",
  mendicot: "Mendicot",
  cheat_bluff: "Cheat / Bluff",
  solitaire: "Solitaire",
  poker: "Texas Hold'em Poker",
  blackjack: "Blackjack 21",
  connect4: "Connect 4",
  gomoku: "Gomoku",
  reversi: "Reversi",
  dots_and_boxes: "Dots & Boxes",
  snakes_and_ladders: "Snakes & Ladders",
  trivia: "Signal Trivia",
  skribbl: "Skribbl",
  bingo: "Bingo",
  book_cricket: "Book Cricket",
};

export default function ArcadeRevengeCardModal({
  isOpen,
  onClose,
  match,
  currentUid,
}: ArcadeRevengeCardModalProps) {
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const gameName = GAME_NAMES[match.gameType] || match.gameType.toUpperCase();
  const winnerHandle = match.winnerHandle || "@CHAMPION";
  
  // Find primary opponent / loser
  const loserPlayer = Object.values(match.players || {}).find(
    (p) => p.uid !== match.winnerUid
  );
  const loserHandle = loserPlayer?.handle || "@OPPONENT";

  // Formulate victory margin summary
  let marginSummary = `defeated ${loserHandle}`;
  if (match.gameType === "hand_cricket" && match.handCricketState) {
    const runs = Math.abs(match.handCricketState.innings1Score - match.handCricketState.innings2Score);
    marginSummary = `defeated ${loserHandle} by ${runs > 0 ? runs : "a thrilling"} run${runs === 1 ? "" : "s"}`;
  } else if (match.gameType === "chess") {
    marginSummary = `checkmated ${loserHandle}`;
  } else if (match.gameType === "uno") {
    marginSummary = `emptied their hand against ${loserHandle}`;
  } else if (match.gameType === "ludo") {
    marginSummary = `captured the central home against ${loserHandle}`;
  }

  // Deep link targeting rematch lobby with winner
  const rematchUrl = `${origin}/arcade?gameType=${match.gameType}&rematchAgainst=${match.winnerUid || currentUid}`;
  
  // WhatsApp Revenge Card Hook (Viral Growth Engine)
  const whatsappRevengeHook = `${winnerHandle} ${marginSummary} in ${gameName} on Echo! Tap to get revenge (Mic is on): ${rematchUrl}`;

  // Render High-Resolution Canvas Card for Insta/Snap/Story
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isStory = aspectRatio === "9:16";
    canvas.width = isStory ? 1080 : 1280;
    canvas.height = isStory ? 1920 : 720;

    // Background Cyberpunk Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#000000");
    bgGradient.addColorStop(0.5, "#080808");
    bgGradient.addColorStop(1, "#111111");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon Frame Border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Inner Emerald Glow Accent
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    // Header Branding
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ECHO ARCADE // SOCIAL VOICE GAMING", canvas.width / 2, isStory ? 160 : 100);

    // Game Title Badge
    ctx.fillStyle = "#10B981";
    ctx.font = "900 48px monospace";
    ctx.fillText(`🎮 ${gameName.toUpperCase()}`, canvas.width / 2, isStory ? 260 : 170);

    if (isStory) {
      // 9:16 Vertical Story Layout

      // Trophy Icon / Winner Halo
      ctx.fillStyle = "#F59E0B";
      ctx.font = "900 110px monospace";
      ctx.fillText("👑", canvas.width / 2, 460);

      // Winner Handle
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 72px monospace";
      ctx.fillText(winnerHandle.toUpperCase(), canvas.width / 2, 570);

      // "VICTORIOUS" Badge
      ctx.fillStyle = "#10B981";
      ctx.font = "900 34px monospace";
      ctx.fillText("★ MATCH WINNER ★", canvas.width / 2, 630);

      // Divider Line
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(140, 700);
      ctx.lineTo(canvas.width - 140, 700);
      ctx.stroke();

      // Revenge / Match Telemetry Box
      ctx.fillStyle = "#111111";
      ctx.fillRect(100, 760, canvas.width - 200, 340);
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 6;
      ctx.strokeRect(100, 760, canvas.width - 200, 340);

      // Margin Text
      ctx.fillStyle = "#EF4444";
      ctx.font = "900 44px monospace";
      ctx.fillText("⚔️ MATCH RESULT ⚔️", canvas.width / 2, 840);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 36px monospace";
      ctx.fillText(`${winnerHandle}`, canvas.width / 2, 920);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "700 32px monospace";
      ctx.fillText(`${marginSummary}`, canvas.width / 2, 980);

      ctx.fillStyle = "#FBBF24";
      ctx.font = "900 36px monospace";
      ctx.fillText(`+${match.stakes * 2 || 100} AURA POINTS WON`, canvas.width / 2, 1040);

      // Call to Action
      ctx.fillStyle = "#25D366";
      ctx.font = "900 48px monospace";
      ctx.fillText("🔥 TAP LINK TO GET REVENGE 🔥", canvas.width / 2, 1380);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "700 30px monospace";
      ctx.fillText("Live voice chat enabled • No app download needed", canvas.width / 2, 1440);

      // QR Code placeholder / URL tag
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 32px monospace";
      ctx.fillText(`🔗 ${rematchUrl.replace("https://", "")}`, canvas.width / 2, 1680);
    } else {
      // 16:9 Landscape Scorecard Layout
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 52px monospace";
      ctx.fillText(`🏆 ${winnerHandle} ${marginSummary.toUpperCase()}!`, canvas.width / 2, 320);

      ctx.fillStyle = "#10B981";
      ctx.font = "900 36px monospace";
      ctx.fillText(`+${match.stakes * 2 || 100} AURA POINTS CLAIMED`, canvas.width / 2, 400);

      ctx.fillStyle = "#25D366";
      ctx.font = "900 40px monospace";
      ctx.fillText("⚔️ TAP TO GET REVENGE (MIC IS ON) ⚔️", canvas.width / 2, 540);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "700 24px monospace";
      ctx.fillText(`🔗 ${rematchUrl.replace("https://", "")}`, canvas.width / 2, 620);
    }
  }, [isOpen, aspectRatio, match, winnerHandle, loserHandle, marginSummary, gameName, rematchUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    soundSynth.playSubtlePop();
    const link = document.createElement("a");
    link.download = `echo-revenge-${match.gameType}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleCopyHook = async () => {
    try {
      await navigator.clipboard.writeText(whatsappRevengeHook);
      setCopied(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-black border-2 border-white p-4 sm:p-5 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.3)] select-none max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 mb-4 border-b-2 border-white pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400">
            <Swords className="w-4 h-4 text-red-500 animate-bounce" />
            <span>// VIRAL REVENGE & STORY SCORECARD</span>
          </div>
          <h2 className="text-base font-black uppercase text-white truncate">
            {winnerHandle} DEFEATED {loserHandle}
          </h2>
        </div>

        {/* 1-TAP WHATSAPP REVENGE CHALLENGE BUTTON */}
        <div className="mb-4">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappRevengeHook)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundSynth.playAirhorn()}
            className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_30px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span className="text-xl">⚔️</span>
            <span>SEND REVENGE CHALLENGE ON WHATSAPP</span>
          </a>
          <p className="text-[10px] text-neutral-400 text-center mt-1.5 font-bold">
            Sends pre-filled rematch link dropping them straight into a revenge arena with mic on!
          </p>
        </div>

        {/* Format Selector: 9:16 Story vs 16:9 Landscape */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setAspectRatio("9:16")}
            className={`px-3 py-1.5 border-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
              aspectRatio === "9:16"
                ? "border-white bg-white text-black shadow-lg"
                : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            📱 9:16 INSTA / SNAP STORY
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("16:9")}
            className={`px-3 py-1.5 border-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
              aspectRatio === "16:9"
                ? "border-white bg-white text-black shadow-lg"
                : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            🖼️ 16:9 WHATSAPP / TWITTER
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="flex justify-center bg-neutral-950 p-2.5 border border-neutral-800 rounded-xl mb-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`rounded border border-neutral-700 shadow-2xl ${
              aspectRatio === "9:16" ? "h-64 sm:h-72 w-auto" : "w-full max-w-sm h-auto"
            }`}
          />
        </div>

        {/* Action Buttons: Download & Copy */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={handleDownload}
            className="py-2.5 px-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all rounded-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopyHook}
            className="py-2.5 px-3 border border-neutral-700 bg-neutral-950 hover:border-white text-white font-black text-xs uppercase transition-all rounded-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>COPIED HOOK!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>COPY HOOK TEXT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
