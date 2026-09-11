"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Volume2,
  VolumeX,
  Share2,
  ArrowRight,
  ChevronDown,
  PartyPopper,
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";

export type LiveExperienceType = "space" | "stage" | "room";

export interface LiveExperienceItem {
  id: string;
  type: LiveExperienceType;
  title: string;
  subtitle?: string;
  description?: string;
  vibe?: string;
  hostName: string;
  hostHandle: string;
  hostAvatar?: string;
  participantCount: number;
  categoryBadge: string;
  categoryIcon: string;
  targetUrl: string;
  activeSpeakers?: Array<{ name: string; avatarUrl?: string }>;
  themeColor?: string;
}

interface LiveSpaceWaveCardProps {
  item: LiveExperienceItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onShare: (item: LiveExperienceItem) => void;
}

export function LiveSpaceWaveCard({
  item,
  isActive,
  isMuted,
  onToggleMute,
  onShare,
}: LiveSpaceWaveCardProps) {
  const router = useRouter();
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [cheered, setCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(12);

  // 30-Second Live Preview Countdown
  useEffect(() => {
    if (!isActive) {
      setSecondsRemaining(30);
      return;
    }

    setSecondsRemaining(30);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Audio synthesizer preview when active & not muted
  useEffect(() => {
    if (!isActive || isMuted || secondsRemaining <= 0) return;

    try {
      spacesSfx.playKeyNote(3);
    } catch {}
  }, [isActive, isMuted, secondsRemaining]);

  const handle1ClickJoin = () => {
    spacesSfx.playPartyFanfare();
    router.push(item.targetUrl);
  };

  const handleCheer = () => {
    spacesSfx.playCheerFanfare();
    setCheered(true);
    setCheerCount((c) => c + 1);
    setTimeout(() => setCheered(false), 2000);
  };

  // Progress for circular countdown ring (30 seconds)
  const progressPercent = (secondsRemaining / 30) * 100;
  const strokeDashoffset = 100 - progressPercent;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden bg-neutral-950">
      {/* Dynamic Ambiance Background Glow */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none transition-all duration-1000"
        style={{
          background:
            item.type === "stage"
              ? "radial-gradient(circle at 50% 30%, #ef4444 0%, #7f1d1d 50%, #000 100%)"
              : item.vibe === "PARTY_CLUB"
              ? "radial-gradient(circle at 50% 30%, #ec4899 0%, #831843 50%, #000 100%)"
              : item.vibe === "DINNER_GALA"
              ? "radial-gradient(circle at 50% 30%, #f59e0b 0%, #78350f 50%, #000 100%)"
              : item.vibe === "SUKOON_ZEN"
              ? "radial-gradient(circle at 50% 30%, #10b981 0%, #064e3b 50%, #000 100%)"
              : "radial-gradient(circle at 50% 30%, #06b6d4 0%, #164e63 50%, #000 100%)",
        }}
      />

      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-20 flex items-center justify-between pt-12 sm:pt-4">
        <div className="flex items-center gap-2">
          {/* Live Pulsing Badge */}
          <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-black flex items-center gap-2 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="tracking-wider">LIVE NOW</span>
          </div>

          {/* Category Pill */}
          <div className="px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-300 font-mono text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <span>{item.categoryIcon}</span>
            <span className="capitalize">{item.categoryBadge}</span>
          </div>
        </div>

        {/* Live Participants Count */}
        <div className="px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-300 font-mono text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{item.participantCount} inside</span>
        </div>
      </div>

      {/* Center Main Stage Showcase */}
      <div className="relative z-20 max-w-xl mx-auto w-full my-auto space-y-5 text-center px-2">
        {/* Host Identity Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-xl">
          {item.hostAvatar ? (
            <img
              src={item.hostAvatar}
              alt={item.hostName}
              className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] text-black font-bold">
              👑
            </div>
          )}
          <span className="font-mono text-xs font-bold text-neutral-300">
            Hosted by <strong className="text-white">{item.hostHandle}</strong>
          </span>
        </div>

        {/* Experience Title */}
        <h1 className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight leading-tight uppercase drop-shadow-2xl">
          {item.title}
        </h1>

        {/* Description / Status */}
        <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto font-mono leading-relaxed line-clamp-2">
          {item.description || item.subtitle || "Live spatial living space with proximity voice, games & celebration."}
        </p>

        {/* Active Stage Speakers / Seated Table Preview */}
        {item.activeSpeakers && item.activeSpeakers.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-neutral-400">On Stage:</span>
            <div className="flex items-center -space-x-2">
              {item.activeSpeakers.slice(0, 4).map((sp, idx) => (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-full border-2 border-neutral-950 bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-md"
                  title={sp.name}
                >
                  {sp.avatarUrl ? (
                    <img src={sp.avatarUrl} alt={sp.name} className="w-full h-full object-cover" />
                  ) : (
                    sp.name.charAt(0)
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 ml-1">
              {item.activeSpeakers[0].name}
              {item.activeSpeakers.length > 1 && ` +${item.activeSpeakers.length - 1} more`}
            </span>
          </div>
        )}

        {/* 30-Second Live Audio Preview Ring & Waveform */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG Countdown Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 transition-all duration-1000"
                strokeDasharray="100, 100"
                strokeDashoffset={strokeDashoffset}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-white">
              {secondsRemaining}s
            </span>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>30s Live Preview</span>
            </div>
            <p className="text-[10px] font-mono text-neutral-400">
              {secondsRemaining > 0 ? "Streaming live audio preview..." : "Preview ended • Step inside live!"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions Stack */}
      <div className="relative z-20 max-w-md mx-auto w-full space-y-3 pb-8 sm:pb-4 text-center">
        {/* 1-Click Join Button */}
        <button
          onClick={handle1ClickJoin}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-mono font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer group"
        >
          <span>🚀 STEP INSIDE LIVE (1-Click)</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-[10px] font-mono text-neutral-400">
          Instant teleport with avatar • Grab a chair or step on stage
        </p>

        {/* Swipe Up Prompt */}
        <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-neutral-500 pt-1 animate-bounce">
          <span>Swipe up for next live space</span>
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
        </div>
      </div>

      {/* Right Side Floating Social Actions Stack (Waves Fidelity) */}
      <div className="absolute right-4 bottom-28 z-30 flex flex-col items-center gap-4">
        {/* Cheer / Fanfare */}
        <button
          onClick={handleCheer}
          className="flex flex-col items-center gap-1 cursor-pointer group"
          title="Send Live Cheer"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
              cheered
                ? "bg-amber-400 border-amber-300 text-black scale-125"
                : "border-white/20 group-hover:border-amber-400 bg-neutral-900/80 backdrop-blur-md text-amber-400"
            }`}
          >
            <PartyPopper className="w-5 h-5" />
          </div>
          <span className="font-mono text-[10px] font-bold text-neutral-300">
            {cheerCount}
          </span>
        </button>

        {/* Share Invite */}
        <button
          onClick={() => onShare(item)}
          className="flex flex-col items-center gap-1 cursor-pointer group"
          title="Share Invite Link"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 group-hover:border-cyan-400 bg-neutral-900/80 backdrop-blur-md text-cyan-400 transition-all">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="font-mono text-[9px] text-neutral-400">SHARE</span>
        </button>

        {/* Mute Preview Toggle */}
        <button
          onClick={onToggleMute}
          className="flex flex-col items-center gap-1 cursor-pointer group"
          title={isMuted ? "Unmute Live Audio" : "Mute Live Audio"}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 group-hover:border-white bg-neutral-900/80 backdrop-blur-md text-white transition-all">
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <span className="font-mono text-[9px] text-neutral-400">
            {isMuted ? "MUTED" : "SOUND"}
          </span>
        </button>
      </div>
    </div>
  );
}
