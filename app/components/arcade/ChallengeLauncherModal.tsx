"use client";

import React, { useState } from "react";
import {
  X,
  Swords,
  Share2,
  Send,
  Sparkles,
  Flame,
  Check,
  Zap,
} from "lucide-react";
import {
  getTrashTalkTaunts,
  generateWhatsAppTrashTalkLink,
  sendArcadeChallenge,
} from "@/lib/arcadeChallenges";
import { soundSynth } from "@/lib/soundSynthesizer";

interface ChallengeLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType?: string;
  gameName?: string;
  roomId?: string;
  matchId?: string;
  user: { uid: string; handle: string; photoUrl?: string };
}

export default function ChallengeLauncherModal({
  isOpen,
  onClose,
  gameType = "ludo",
  gameName = "Ludo Cyber Master",
  roomId = "room_8912",
  matchId = "match_8912",
  user,
}: ChallengeLauncherModalProps) {
  const presets = getTrashTalkTaunts(gameType);
  const [selectedTaunt, setSelectedTaunt] = useState<string>(presets[0] || "Betting you lose in 2 minutes.");
  const [customTaunt, setCustomTaunt] = useState<string>("");
  const [targetHandle, setTargetHandle] = useState<string>("");
  const [inAppSent, setInAppSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const finalTaunt = customTaunt.trim() || selectedTaunt;

  const handleSendWhatsApp = () => {
    soundSynth.playSnare();
    const waUrl = generateWhatsAppTrashTalkLink({
      gameType,
      gameName,
      roomId,
      challengerHandle: user.handle,
      taunt: finalTaunt,
    });
    window.open(waUrl, "_blank");
  };

  const handleSendInApp = async () => {
    if (!targetHandle.trim()) {
      soundSynth.playBuzzer();
      return;
    }
    soundSynth.playFanfare();
    try {
      await sendArcadeChallenge({
        challengerId: user.uid,
        challengerHandle: user.handle,
        challengerPhotoUrl: user.photoUrl,
        targetUserId: targetHandle.replace("@", "").trim(),
        targetHandle: targetHandle.startsWith("@") ? targetHandle : `@${targetHandle}`,
        gameType,
        gameName,
        roomId,
        matchId,
        trashTalkText: finalTaunt,
      });
      setInAppSent(true);
      setTimeout(() => setInAppSent(false), 3000);
    } catch (e) {
      console.error("In-app challenge failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-black border-2 border-white p-4 sm:p-6 font-mono text-white shadow-[0_0_50px_rgba(255,255,255,0.2)] max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer rounded"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1 border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-widest">
            <Swords className="w-4 h-4 animate-bounce" />
            <span>// 1v1 VIRAL TRASH-TALK DUEL LAUNCHER</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white">
            Challenge Rival in {gameName}
          </h2>
          <p className="text-xs text-neutral-400">
            Trigger ego-driven viral duels with randomized spicy trash-talk lines.
          </p>
        </div>

        {/* Taunt Presets */}
        <div className="space-y-3 mb-4">
          <label className="text-xs text-neutral-400 uppercase font-bold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>SELECT SPICY TRASH-TALK TAUNT:</span>
          </label>

          <div className="space-y-1.5">
            {presets.map((taunt, i) => {
              const isSelected = selectedTaunt === taunt && !customTaunt.trim();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedTaunt(taunt);
                    setCustomTaunt("");
                    soundSynth.playSubtlePop();
                  }}
                  className={`w-full text-left p-2.5 text-xs border rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-950/40 text-emerald-300 font-bold"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  "{taunt}"
                </button>
              );
            })}
          </div>

          {/* Custom Taunt Input */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-500 uppercase font-bold">
              OR WRITE YOUR OWN CUSTOM TAUNT:
            </label>
            <input
              type="text"
              value={customTaunt}
              onChange={(e) => setCustomTaunt(e.target.value)}
              placeholder="e.g. You won't even cross 10 runs against my spin..."
              maxLength={80}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-white px-3 py-2 text-xs font-mono text-white rounded outline-none"
            />
          </div>
        </div>

        {/* Channel A: 1-Tap WhatsApp "Trash-Talk" Launcher */}
        <div className="space-y-2 mb-4 bg-neutral-950 p-3 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase">
            <span>CHANNEL A: 1-TAP WHATSAPP TRASH-TALK</span>
            <span className="text-[9px] bg-emerald-950 px-1.5 py-0.5 border border-emerald-700 rounded">
              VIRAL HOOK
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>[ 📲 LAUNCH TRASH-TALK ON WHATSAPP ]</span>
          </button>
        </div>

        {/* Channel B: In-App Poke / Challenge */}
        <div className="space-y-2 bg-neutral-950 p-3 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase">
            <span>CHANNEL B: IN-APP DIRECT POKE / CHALLENGE</span>
            <span className="text-[9px] bg-rose-950 px-1.5 py-0.5 border border-rose-700 rounded">
              LIVE POPUP
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={targetHandle}
              onChange={(e) => setTargetHandle(e.target.value)}
              placeholder="ENTER USER HANDLE (e.g. @rohit)..."
              className="flex-1 bg-black border border-neutral-800 focus:border-white px-3 py-2 text-xs font-mono text-white rounded outline-none"
            />
            <button
              type="button"
              onClick={handleSendInApp}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{inAppSent ? "SENT!" : "POKE"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
