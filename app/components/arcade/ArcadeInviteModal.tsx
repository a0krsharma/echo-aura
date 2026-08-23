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
  ExternalLink,
} from "lucide-react";

interface ArcadeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ArcadeMatch;
}

export default function ArcadeInviteModal({
  isOpen,
  onClose,
  match,
}: ArcadeInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  
  // Link targets room if embedded, else arcade lounge
  const inviteUrl = match.roomId
    ? `${origin}/room/${match.roomId}?matchId=${match.id}`
    : `${origin}/arcade?matchId=${match.id}`;

  const shareTitle = `🎮 Play ${match.title} with me on Echo!`;
  const shareText = `🔥 Join my ${match.gameType.toUpperCase()} match on Echo Arena! Let's play and talk live on voice 🎙️:\n${inviteUrl}`;

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
          text: shareText,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyCard = async () => {
    const cardText = `🎮 ECHO ARENA // SOCIAL VOICE GAMING\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕹️ Game: ${match.gameType.toUpperCase()} BATTLE\n👑 Host: ${match.hostHandle}\n🎙️ Voice: LIVE AUDIO CHAT ENABLED\n⚡ Stakes: ${match.stakes} AURA\n🔗 Join & Play: ${inviteUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-black border-2 border-white p-5 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.2)] select-none">
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
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>// INVITE PLAYERS & TALK LIVE</span>
          </div>
          <h2 className="text-base font-extrabold uppercase text-white truncate">
            {match.title}
          </h2>
        </div>

        {/* Live Audio Badge */}
        <div className="mb-4 border border-white/30 bg-neutral-950 p-3 flex items-start gap-3">
          <Mic2 className="w-5 h-5 text-white shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs space-y-0.5">
            <p className="font-extrabold text-white uppercase tracking-wider">
              🎙️ INTEGRATED VOICE CHANNEL
            </p>
            <p className="text-neutral-400 text-[10px] leading-relaxed">
              Anyone who joins this link will automatically enter the arena to play and talk with zero latency.
            </p>
          </div>
        </div>

        {/* Match Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="p-2 border border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px] uppercase">SLOTS:</span>
            <span className="font-extrabold text-white">
              {currentCount}/{maxPlayers} PLAYERS
            </span>
          </div>
          <div className="p-2 border border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px] uppercase">AURA REWARD:</span>
            <span className="font-extrabold text-yellow-400">
              +{match.stakes * 2} AURA
            </span>
          </div>
        </div>

        {/* 1-Tap Copy Link Bar */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-widest">
            DIRECT ARENA INVITE URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-white select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold text-xs uppercase transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* WhatsApp Share */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-900 hover:border-white text-white font-bold text-[11px] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💬 WHATSAPP</span>
          </a>

          {/* Telegram Share */}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-900 hover:border-white text-white font-bold text-[11px] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>✈️ TELEGRAM</span>
          </a>

          {/* Twitter / X Share */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-900 hover:border-white text-white font-bold text-[11px] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🐦 X / TWITTER</span>
          </a>

          {/* Native Mobile Share */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="p-2.5 border-2 border-white bg-white text-black hover:bg-neutral-200 font-extrabold text-[11px] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>MORE APPS</span>
          </button>
        </div>

        {/* Copy Formatted Terminal Card */}
        <button
          type="button"
          onClick={handleCopyCard}
          className="w-full py-2.5 border border-dashed border-neutral-600 bg-neutral-950 hover:border-white text-neutral-300 hover:text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{copiedCard ? "✓ TERMINAL CARD COPIED!" : "[ COPY TERMINAL MATCH CARD ]"}</span>
        </button>
      </div>
    </div>
  );
}
