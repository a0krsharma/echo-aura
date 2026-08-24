"use client";

import React, { useEffect } from "react";
import ExpressiveAvatar from "./ExpressiveAvatar";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  GESTURE_CATALOG,
  type AvatarConfig,
  type AvatarGesture,
  DEFAULT_AVATAR_CONFIG,
} from "@/lib/avatarRig";
import { X, Sparkles, Send, Volume2 } from "lucide-react";

interface ExpressiveGreetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderHandle: string;
  senderAvatar?: string;
  avatarConfig?: AvatarConfig;
  gesture: AvatarGesture;
  text?: string;
  onQuickReply?: (replyGesture: AvatarGesture) => void;
}

export default function ExpressiveGreetingModal({
  isOpen,
  onClose,
  senderHandle,
  avatarConfig = DEFAULT_AVATAR_CONFIG,
  gesture,
  text,
  onQuickReply,
}: ExpressiveGreetingModalProps) {
  const meta = GESTURE_CATALOG[gesture] || GESTURE_CATALOG.GREETING_WAVE;

  useEffect(() => {
    if (!isOpen) return;

    // Trigger audio cues based on gesture type
    switch (meta.soundType) {
      case "fanfare":
        soundSynth.playFanfare();
        break;
      case "airhorn":
        soundSynth.playAirhorn();
        break;
      case "gong":
        soundSynth.playGong();
        break;
      case "cheer":
        soundSynth.playApplause();
        break;
      case "snare":
        soundSynth.playSnare();
        break;
      default:
        soundSynth.playSubtlePop();
        break;
    }
  }, [isOpen, gesture]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-sm bg-neutral-950 border-2 border-white p-6 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] font-mono text-white text-center space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white hover:border-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sender Header */}
        <div className="flex items-center justify-center gap-2 text-xs font-black uppercase text-neutral-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{senderHandle} SENT AN EXPRESSION</span>
        </div>

        {/* 2.5D Animated Avatar */}
        <div className="flex justify-center py-2 relative">
          <div className="w-36 h-36 rounded-full border-4 border-white bg-black/80 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] relative overflow-hidden">
            <ExpressiveAvatar config={avatarConfig} gesture={gesture} size={144} />
          </div>
          {/* Emotion Badge Pill */}
          <div className="absolute -bottom-1 bg-white text-black font-black text-[11px] px-3 py-1 rounded-full uppercase border border-black shadow-lg flex items-center gap-1">
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </div>
        </div>

        {/* Speech Bubble */}
        <div className="bg-black border-2 border-neutral-700 p-4 rounded-xl relative shadow-inner">
          <p className="text-sm font-bold text-white uppercase tracking-wide leading-relaxed">
            "{text || meta.tagline}"
          </p>
        </div>

        {/* Quick Reaction Buttons */}
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
            QUICK 1-TAP EXPRESSIVE REACTION:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {(["GREETING_WAVE", "LOVE_HEART", "LOL_LAUGH", "GG_CLAP"] as AvatarGesture[]).map((g) => {
              const gMeta = GESTURE_CATALOG[g];
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    if (onQuickReply) onQuickReply(g);
                    onClose();
                  }}
                  className="py-2 bg-neutral-900 border border-neutral-700 hover:border-white hover:bg-neutral-800 rounded-lg text-xs font-black uppercase flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">{gMeta.emoji}</span>
                  <span className="text-[8px] truncate">{gMeta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-white text-black font-black text-xs uppercase hover:bg-neutral-200 transition-all rounded-lg cursor-pointer"
        >
          [ CLOSE GREETING ]
        </button>
      </div>
    </div>
  );
}
