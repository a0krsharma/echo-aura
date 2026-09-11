"use client";

/**
 * app/components/spaces/InviteFriendsModal.tsx
 * ─────────────────────────────────────────────────────
 * "Invite Friends to Virtual Space" Modal
 * Makes inviting friends fast, simple, and frictionless:
 * - 1-Click Shareable Link with instant clipboard copy
 * - Mode selection: "Join Public" or "Join Ghost Mode"
 * - Activity invites: "Play Arcade Games", "Sing & Jam", "Study in Sanctuary"
 * - QR Code display for mobile camera quick-join
 */

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  Users,
  QrCode,
  Sparkles,
  Gamepad2,
  Music,
  BookOpen,
  Ghost,
  Globe,
  ExternalLink,
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  spaceId: string;
}

export default function InviteFriendsModal({
  isOpen,
  onClose,
  spaceName,
  spaceId,
}: InviteFriendsModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteMode, setInviteMode] = useState<"public" | "ghost">("public");
  const [selectedActivity, setSelectedActivity] = useState<string>("play");

  if (!isOpen) return null;

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/spaces/${spaceId}${
        inviteMode === "ghost" ? "?mode=ghost" : ""
      }`;
    }
    return `https://echo-aura.vercel.app/spaces/${spaceId}`;
  };

  const getShareText = () => {
    const messages: Record<string, string> = {
      birthday: `🎂 You're invited to my Virtual Birthday Party in ${spaceName}! Come join me to cut the cake, pop champagne, play UNO & Spin the Bottle, and celebrate!`,
      dinner: `🫓 Join our Dinner Feast in ${spaceName}! Fresh tandoori butter naan, Italian pasta, Hakka noodles, and champagne at the banquet table!`,
      uno: `🃏 UNO tournament happening right now in ${spaceName}! Winner takes $50 cash! Jump in to play!`,
      play: `Hey! I'm in ${spaceName}. Come hang out, play Super Mario co-op, jam music, or study together!`,
      sing: `🎵 Jam and sing with me in ${spaceName}!`,
      study: `📚 Join my cozy study session in ${spaceName}!`,
    };
    return messages[selectedActivity] || messages.play;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    spacesSfx.playKeyNote(5);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join me in ${spaceName} on Echo Spaces!`,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch (e) {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-white tracking-tight">
                INVITE FRIENDS
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                {spaceName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Joining Preference: Public vs Ghost Mode (User requested: "going ghost or public") */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
            Invite Joining Mode:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInviteMode("public");
                spacesSfx.playKeyNote(2);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                inviteMode === "public"
                  ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold shadow-sm"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-mono">Public Avatar</div>
                <div className="text-[9px] text-neutral-500">Solid avatar on map</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setInviteMode("ghost");
                spacesSfx.playKeyNote(6);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                inviteMode === "ghost"
                  ? "border-indigo-400 bg-indigo-950/50 text-indigo-300 font-bold shadow-sm"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
              }`}
            >
              <Ghost className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-xs font-mono">Ghost Mode</div>
                <div className="text-[9px] text-neutral-500">Phase through walls</div>
              </div>
            </button>
          </div>
        </div>

        {/* Activity Tag: Play, Sing, Read, Study (User requested: "play,sing,read,study") */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
            Invite To Activity:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
            {[
              { id: "birthday", label: "🎂 Birthday Party" },
              { id: "dinner", label: "🫓 Dinner Feast" },
              { id: "uno", label: "🃏 UNO Match" },
              { id: "play", label: "🕹️ Play Games" },
              { id: "sing", label: "🎵 Jam / Sing" },
              { id: "study", label: "📚 Read / Study" },
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setSelectedActivity(act.id);
                  spacesSfx.playKeyNote(3);
                }}
                className={`p-2 rounded-xl border text-center transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  selectedActivity === act.id
                    ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 font-bold"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
            <span className="truncate flex-1 text-neutral-300 text-[11px]">
              {getShareUrl()}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-cyan-500/20 shrink-0"
              title="Copy Link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copied ? "COPIED" : "COPY"}</span>
            </button>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleNativeShare}
            className="flex-1 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Invite Link</span>
          </button>
        </div>

        {/* Info tips */}
        <div className="text-[10px] font-mono text-neutral-500 text-center space-y-0.5">
          <div>💡 Friends can join immediately in any web browser without signup!</div>
          <div>Proximity audio activates automatically as you approach each other.</div>
        </div>
      </div>
    </div>
  );
}
