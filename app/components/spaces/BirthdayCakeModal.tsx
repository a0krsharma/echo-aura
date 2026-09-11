"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Cake,
  Flame,
  Wind,
  PartyPopper,
  Wine,
  Gift,
  Heart,
  Music,
  Share2,
  Check,
  Crown
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";
import { TableDish, addCash } from "@/lib/spacesEconomy";

interface BirthdayCakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdayPersonName: string;
  isHost: boolean;
  onTriggerConfetti: () => void;
  onSendSpeech: (text: string) => void;
  onPopChampagne?: () => void;
  onOpenGifting?: () => void;
  onOpenGames?: () => void;
  onCakeCutSuccess?: () => void;
}

export default function BirthdayCakeModal({
  isOpen,
  onClose,
  birthdayPersonName,
  isHost,
  onTriggerConfetti,
  onSendSpeech,
  onPopChampagne,
  onOpenGifting,
  onOpenGames,
  onCakeCutSuccess,
}: BirthdayCakeModalProps) {
  const [candlesLit, setCandlesLit] = useState(true);
  const [isCakeCut, setIsCakeCut] = useState(false);
  const [slicesServed, setSlicesServed] = useState(0);
  const [knifeAnimating, setKnifeAnimating] = useState(false);
  const [smokePuffs, setSmokePuffs] = useState(false);
  const [champagnePopped, setChampagnePopped] = useState(false);
  const [showConfettiBurst, setShowConfettiBurst] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCandlesLit(true);
      setIsCakeCut(false);
      setSlicesServed(0);
      setSmokePuffs(false);
      setChampagnePopped(false);
      setShowConfettiBurst(true);
      const timer = setTimeout(() => setShowConfettiBurst(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Blow Out Candles
  const handleBlowCandles = () => {
    spacesSfx.playKeyNote(6);
    setCandlesLit(false);
    setSmokePuffs(true);
    spacesSfx.playFocusBell();
    onSendSpeech(`💨 ${birthdayPersonName} made a secret wish and blew out all the birthday candles! 🕯️✨`);
    setTimeout(() => setSmokePuffs(false), 3500);
  };

  // 2. Cut the Cake
  const handleCutCake = () => {
    setKnifeAnimating(true);
    spacesSfx.playKeyNote(3);

    setTimeout(() => {
      setKnifeAnimating(false);
      setIsCakeCut(true);
      spacesSfx.playPartyFanfare();
      onTriggerConfetti();
      setShowConfettiBurst(true);
      setTimeout(() => setShowConfettiBurst(false), 4000);

      // Award $25 birthday celebration bonus cash
      addCash(25, "Cut Birthday Cake Celebration 🎂");

      onSendSpeech(`🎂 CELEBRATION! ${birthdayPersonName} just cut the Birthday Cake! Happy Birthday! 🎉✨`);
      onCakeCutSuccess?.();
    }, 900);
  };

  // 3. Serve Cake Slices to Friends
  const handleServeSlices = () => {
    spacesSfx.playNomEating();
    setSlicesServed((prev) => prev + 1);
    onSendSpeech(`🍰 ${birthdayPersonName} served warm, delicious slices of triple-chocolate birthday cake to everyone! 😋`);
  };

  // 4. Pop Champagne
  const handlePopChampagne = () => {
    setChampagnePopped(true);
    spacesSfx.playChampagneCork();
    onTriggerConfetti();
    onSendSpeech(`🍾 *POP!* Champagne cork launched into the ceiling! Cheers to ${birthdayPersonName}! 🥂✨`);
    onPopChampagne?.();
  };

  // 5. Sing Happy Birthday
  const handleSingSong = () => {
    spacesSfx.playKeyNote(5);
    onSendSpeech("🎵 🎶 Happy Birthday to you! Happy Birthday to you! Happy Birthday dear " + birthdayPersonName + "! 🎶 🎂 🎉");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Floating Confetti Layer inside modal */}
      {showConfettiBurst && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 45 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                top: `${Math.random() * 80}%`,
                left: `${Math.random() * 95}%`,
                width: `${Math.random() * 12 + 6}px`,
                height: `${Math.random() * 16 + 6}px`,
                backgroundColor: ["#f43f5e", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#eab308"][
                  Math.floor(Math.random() * 7)
                ],
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.85,
                transition: "all 1s ease-out",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-950 via-slate-950 to-black border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/80 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-mono font-black text-white tracking-tight">
                  BIRTHDAY CAKE CEREMONY
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  VIP CELEBRATION
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400">
                Celebrating <span className="text-amber-300 font-bold">@{birthdayPersonName}</span> in Echo Spaces!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cake Ceremony Stage */}
        <div className="p-6 overflow-y-auto space-y-6 text-center">
          {/* Visual Cake Stage Card */}
          <div className="relative p-8 rounded-3xl bg-radial-at-c from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/30 overflow-hidden shadow-2xl flex flex-col items-center">
            {/* Knife Slicing Animation */}
            {knifeAnimating && (
              <div className="absolute top-10 z-40 text-5xl animate-bounce transform -rotate-45">
                🔪
              </div>
            )}

            {/* Smoke puffs from blown candles */}
            {smokePuffs && (
              <div className="absolute top-8 z-30 flex items-center gap-6 animate-pulse">
                <span className="text-2xl opacity-70">💨</span>
                <span className="text-3xl opacity-80">💨</span>
                <span className="text-2xl opacity-70">💨</span>
              </div>
            )}

            {/* 3 Lit Candles on Cake */}
            <div className="flex items-end justify-center gap-6 mb-2 z-20">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex flex-col items-center">
                  {candlesLit ? (
                    <div className="relative">
                      <Flame className="w-6 h-6 text-amber-400 animate-bounce drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                      <span className="absolute inset-0 text-rose-500 text-xs animate-ping font-bold">•</span>
                    </div>
                  ) : (
                    <div className="w-1.5 h-3 bg-neutral-600 rounded-t" />
                  )}
                  {/* Candle Stick */}
                  <div
                    className={`w-3.5 h-10 rounded-t-sm shadow-md ${
                      idx === 0
                        ? "bg-gradient-to-b from-rose-400 to-rose-600"
                        : idx === 1
                        ? "bg-gradient-to-b from-amber-300 to-amber-500"
                        : "bg-gradient-to-b from-cyan-400 to-blue-600"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Giant Tiered Celebration Cake */}
            <div className="relative flex flex-col items-center">
              {/* Top Tier */}
              <div className="w-36 h-14 rounded-t-2xl bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 border-2 border-pink-300 flex items-center justify-center text-xs font-mono font-black text-white shadow-lg relative">
                <span className="drop-shadow">🍓 STRAWBERRY CREAM 🍓</span>
                {/* Frosting dripping drops */}
                <div className="absolute -bottom-2 inset-x-2 flex justify-between px-2 text-[10px] text-pink-200">
                  <span>💧</span>
                  <span>💧</span>
                  <span>💧</span>
                </div>
              </div>

              {/* Middle Tier */}
              <div className="w-52 h-16 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 border-2 border-amber-400 flex items-center justify-center text-sm font-mono font-bold text-amber-100 shadow-md">
                <span>🍫 TRIPLE BELGIAN CHOCOLATE 🍫</span>
              </div>

              {/* Bottom Tier (Base) */}
              <div className="w-72 h-18 rounded-b-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 border-2 border-indigo-400 flex items-center justify-center text-sm font-mono font-bold text-indigo-200 shadow-2xl">
                <span>✨ HAPPY BIRTHDAY @{birthdayPersonName.toUpperCase()} ✨</span>
              </div>

              {/* Cut Mark line if cake is cut */}
              {isCakeCut && (
                <div className="absolute inset-y-0 w-1 bg-amber-300 shadow-[0_0_15px_#fde047] animate-pulse" />
              )}
            </div>

            {/* Gold Plate Stand */}
            <div className="w-80 h-3.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 shadow-xl mt-1" />

            {/* Status Prompt */}
            <div className="mt-5">
              {isCakeCut ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold animate-in zoom-in-95">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>The cake is cut! Time to serve slices & celebrate!</span>
                </div>
              ) : candlesLit ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-pulse">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Candles are burning bright! Make a wish and blow them out!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold animate-pulse">
                  <span>Candles extinguished! Ready to cut the cake! 🔪</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Ceremony Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Step 1: Blow Out Candles */}
            <button
              onClick={handleBlowCandles}
              disabled={!candlesLit}
              className={`p-3.5 rounded-2xl border font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                candlesLit
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-orange-500/20 active:scale-95"
                  : "bg-neutral-900/60 border-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <Wind className="w-4 h-4" />
              <span>1. Make A Wish & Blow Candles</span>
            </button>

            {/* Step 2: Cut The Cake */}
            <button
              onClick={handleCutCake}
              disabled={isCakeCut}
              className={`p-3.5 rounded-2xl border font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isCakeCut
                  ? "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-pink-500/20 active:scale-95"
                  : "bg-neutral-900/60 border-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>2. 🎂 Cut The Birthday Cake</span>
            </button>

            {/* Step 3: Serve Cake Slices */}
            <button
              onClick={handleServeSlices}
              className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <span>🍰</span>
              <span>Hand Out Cake Slices ({slicesServed} Served)</span>
            </button>

            {/* Step 4: Champagne Toast */}
            <button
              onClick={handlePopChampagne}
              className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-purple-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Wine className="w-4 h-4 text-purple-400" />
              <span>Pop Champagne Toast 🥂</span>
            </button>
          </div>

          {/* Sing-Along and Next Party Activities */}
          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-left">
            <div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sing Birthday Song</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                Broadcasts lyrics into the room chat for a live group chorus
              </div>
            </div>

            <button
              onClick={handleSingSong}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🎤 Sing Along</span>
            </button>
          </div>

          {/* Quick Party Add-ons Bar */}
          <div className="pt-2 border-t border-neutral-900 flex flex-wrap items-center justify-center gap-2.5">
            {onOpenGifting && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGifting();
                }}
                className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-pink-400" />
                <span>Gift @{birthdayPersonName}</span>
              </button>
            )}

            {onOpenGames && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGames();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <PartyPopper className="w-3.5 h-3.5 text-indigo-400" />
                <span>Play Party Games (UNO, Bottle, Dice)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
