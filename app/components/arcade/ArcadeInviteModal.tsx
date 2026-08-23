"use client";

import React, { useState } from "react";
import { type ArcadeMatch } from "@/lib/arcade";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  X,
  Copy,
  Check,
  Share2,
  Mic2,
  Users,
  Trophy,
  MessageSquare,
  Sparkles,
  QrCode,
  Smartphone,
  ExternalLink,
  Flame,
} from "lucide-react";

interface ArcadeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ArcadeMatch;
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

export default function ArcadeInviteModal({
  isOpen,
  onClose,
  match,
}: ArcadeInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const gameDisplayName = (match?.gameType && GAME_NAMES[match.gameType]) || (match?.gameType ? match.gameType.toUpperCase() : "ARENA");
  
  // Direct frictionless join link
  const inviteUrl = match.roomId
    ? `${origin}/room/${match.roomId}?matchId=${match.id}`
    : `${origin}/arcade?matchId=${match.id}`;

  // WhatsApp "One-Tap Challenge" Hook (Viral Loop for hostel/friend group chats)
  const whatsappChallengeText = `Match me in ${gameDisplayName} right now (no download needed). Mic is on: ${inviteUrl}`;
  const shareTitle = `🎮 Challenge me in ${gameDisplayName} on Echo!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    soundSynth.playSubtlePop();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: whatsappChallengeText,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyCard = async () => {
    const cardText = `🔥 ECHO ARENA // ONE-TAP CHALLENGE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕹️ Game: ${gameDisplayName.toUpperCase()}\n👑 Host: ${match.hostHandle}\n🎙️ Audio: LIVE MIC CHAT ENABLED (NO APP DOWNLOAD NEEDED)\n⚡ Stakes: ${match.stakes} AURA\n🔗 Tap to Play & Talk: ${inviteUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    try {
      await navigator.clipboard.writeText(cardText);
      setCopiedCard(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      // Fallback
    }
  };

  const currentCount = Object.keys(match.players || {}).length;
  const maxPlayers = match.maxPlayers || 4;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}&color=ffffff&bgcolor=000000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-black border-2 border-white p-4 sm:p-5 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.25)] select-none max-h-[90vh] overflow-y-auto">
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#25D366]">
            <Flame className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>// ONE-TAP WHATSAPP CHALLENGE</span>
          </div>
          <h2 className="text-base font-black uppercase text-white truncate">
            {match.title}
          </h2>
        </div>

        {/* 1-TAP WHATSAPP VIRAL CHALLENGE BUTTON */}
        <div className="mb-4">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappChallengeText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundSynth.playAirhorn()}
            className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span className="text-lg">💬</span>
            <span>SHARE ON WHATSAPP (1-TAP)</span>
          </a>
          <p className="text-[10px] text-neutral-400 text-center mt-1.5 font-bold">
            Sends pre-filled invite directly to hostel & friends groups with zero sign-up friction!
          </p>
        </div>

        {/* Live Audio & Frictionless Badge */}
        <div className="mb-4 border border-white/30 bg-neutral-950 p-3 flex items-start gap-3 rounded-lg">
          <Mic2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs space-y-0.5">
            <p className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🎙️ LIVE MIC OPEN • NO APP DOWNLOAD NEEDED</span>
            </p>
            <p className="text-neutral-400 text-[10px] leading-relaxed">
              Recipients tap the link in WhatsApp/browser and drop straight into the arena with live microphone connected.
            </p>
          </div>
        </div>

        {/* Match Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="p-2 border border-neutral-800 bg-neutral-950 flex items-center justify-between rounded">
            <span className="text-neutral-400 text-[10px] uppercase font-bold">SLOTS:</span>
            <span className="font-black text-white">
              {currentCount}/{maxPlayers} PLAYERS
            </span>
          </div>
          <div className="p-2 border border-neutral-800 bg-neutral-950 flex items-center justify-between rounded">
            <span className="text-neutral-400 text-[10px] uppercase font-bold">REWARD:</span>
            <span className="font-black text-yellow-400">
              +{match.stakes * 2} AURA
            </span>
          </div>
        </div>

        {/* 1-Tap Copy Link Bar */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-widest">
            DIRECT ONE-TAP CHALLENGE LINK
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-white select-all rounded"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-black text-xs uppercase transition-all shrink-0 flex items-center gap-1.5 cursor-pointer rounded"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Share Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Telegram Share */}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(whatsappChallengeText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-neutral-800 bg-neutral-950 hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded"
          >
            <span>✈️ TELEGRAM</span>
          </a>

          {/* Twitter / X Share */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(whatsappChallengeText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-neutral-800 bg-neutral-950 hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded"
          >
            <span>🐦 X / TWITTER</span>
          </a>

          {/* QR Code Toggle for LAN/Hostel Room Play */}
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="p-2.5 border border-neutral-800 bg-neutral-950 hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>{showQr ? "HIDE QR" : "ROOM QR"}</span>
          </button>
        </div>

        {/* QR Code Card Display */}
        {showQr && (
          <div className="p-4 bg-neutral-950 border-2 border-white rounded-xl text-center space-y-2 mb-3 animate-in fade-in">
            <p className="text-[10px] text-neutral-400 uppercase font-black">
              SCAN WITH PHONE CAMERA TO JOIN INSTANTLY
            </p>
            <img
              src={qrUrl}
              alt="Arcade Match QR Code"
              className="w-40 h-40 mx-auto border-2 border-white rounded-lg p-1 bg-black"
            />
            <p className="text-[9px] text-emerald-400 uppercase font-bold">
              Perfect for hostel dorm gaming & campus tables!
            </p>
          </div>
        )}

        {/* Copy Formatted Terminal Card */}
        <button
          type="button"
          onClick={handleCopyCard}
          className="w-full py-2.5 border border-dashed border-neutral-700 bg-neutral-950 hover:border-white text-neutral-300 hover:text-white font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded-lg"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{copiedCard ? "✓ TERMINAL CARD COPIED!" : "[ COPY FORMATTED GROUP CHAT CARD ]"}</span>
        </button>
      </div>
    </div>
  );
}
