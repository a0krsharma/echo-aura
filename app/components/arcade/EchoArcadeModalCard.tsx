"use client";

import React, { useState, useEffect } from "react";
import { arcadeSfx } from "@/lib/arcadeSfx";
import { Star, X, Play, HelpCircle, Trophy, User, Bot, ArrowLeft, Zap } from "lucide-react";

export type BotDifficulty = "easy" | "medium" | "hard";

export interface EchoArcadeModalCardProps {
  title: string;
  subtitle?: string;
  categoryTag?: string;
  accentColor?: string; // e.g., "#4CAF50"
  objective: string;
  heroGraphic: React.ReactNode;
  howToPlaySteps: { title: string; desc: string; icon?: string }[];
  onPlayFriend: () => void;
  onPlayBot: (diff: BotDifficulty) => void;
  onRandomMatch?: () => void;
  onBack: () => void;
  hiScore?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function EchoArcadeModalCard({
  title,
  subtitle,
  categoryTag = "ARCADE",
  accentColor = "#1E88E5",
  objective,
  heroGraphic,
  howToPlaySteps,
  onPlayFriend,
  onPlayBot,
  onRandomMatch,
  onBack,
  hiScore,
  isFavorite = false,
  onToggleFavorite,
}: EchoArcadeModalCardProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");
  const [localFav, setLocalFav] = useState(isFavorite);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [randomCountdown, setRandomCountdown] = useState(5);

  // Random match search countdown: automatically falls back to bot if no player joins in 5s
  useEffect(() => {
    if (!isSearchingRandom) return;
    if (randomCountdown <= 0) {
      setIsSearchingRandom(false);
      arcadeSfx.playButtonTap();
      onPlayBot(botDifficulty);
      return;
    }
    const timer = setTimeout(() => {
      setRandomCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSearchingRandom, randomCountdown, botDifficulty, onPlayBot]);

  const handleToggleFav = (e: React.PointerEvent) => {
    e.stopPropagation();
    arcadeSfx.playButtonTap();
    setLocalFav(!localFav);
    onToggleFavorite?.();
  };

  const handleStartRandomMatch = () => {
    arcadeSfx.playButtonTap();
    if (onRandomMatch) {
      onRandomMatch();
    } else {
      setRandomCountdown(5);
      setIsSearchingRandom(true);
    }
  };

  const handleStartFriend = () => {
    arcadeSfx.playButtonTap();
    onPlayFriend();
  };

  const handleStartBot = () => {
    arcadeSfx.playButtonTap();
    onPlayBot(botDifficulty);
  };

  const handleBackClick = () => {
    arcadeSfx.playButtonTap();
    onBack();
  };

  return (
    <div className="relative w-full max-w-sm mx-auto bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center select-none font-sans text-neutral-900 border border-neutral-100">
      {/* Category Pill + Top Bar */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
          {categoryTag}
        </span>

        <div className="flex items-center gap-2">
          {hiScore !== undefined && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>HI: {hiScore}</span>
            </div>
          )}

          {/* Star / Favorite Badge */}
          <button
            type="button"
            onPointerDown={handleToggleFav}
            aria-label="Toggle Favorite"
            className="p-1 text-gray-300 hover:text-yellow-400 active:scale-125 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                localFav ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Game Hero: Vibrant 2D Vector Graphic + 3D Title */}
      <div className="w-full flex flex-col items-center my-2">
        <div className="w-44 h-44 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden transition-transform hover:scale-105 duration-300">
          {heroGraphic}
        </div>

        <h1
          className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-center mt-2 drop-shadow-sm text-neutral-900"
          style={{ textShadow: "0 2px 0 rgba(0,0,0,0.06)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Objective Instruction */}
      <p className="text-gray-700 font-extrabold text-center text-sm sm:text-base leading-snug mt-2 px-3">
        {objective}
      </p>

      {/* How to Play Video Trigger */}
      <button
        type="button"
        onPointerDown={() => {
          arcadeSfx.playButtonTap();
          setShowHowToPlay(true);
        }}
        className="mt-4 flex items-center space-x-2 bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
      >
        <span className="text-emerald-400 text-xs">▶</span>
        <span className="tracking-wide uppercase text-xs">How to Play</span>
      </button>

      {/* Game Mode Selection */}
      <div className="w-full space-y-3 mt-4">
        {/* 1. Play with Bot */}
        <div className="w-full bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-600" />
              <span>PLAY WITH BOT</span>
            </span>
            <div className="flex items-center gap-1">
              {(["easy", "medium", "hard"] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    arcadeSfx.playButtonTap();
                    setBotDifficulty(diff);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    botDifficulty === diff
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onPointerDown={handleStartBot}
            className="w-full bg-[#0288D1] hover:bg-[#0277BD] border-b-4 border-[#01579B] active:border-b-0 active:translate-y-1 text-white font-black text-base py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>START BOT ({botDifficulty.toUpperCase()})</span>
          </button>
        </div>

        {/* 2. Play with Friends */}
        <div className="w-full bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>PLAY WITH FRIENDS</span>
          </span>

          {isSearchingRandom ? (
            <div className="w-full bg-white border-2 border-amber-400 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>SEARCHING FOR OPPONENT... ({randomCountdown}s)</span>
              </div>
              <p className="text-[10px] text-neutral-500 text-center font-bold">
                Matching with Bot if no player joins in {randomCountdown}s...
              </p>
              <button
                type="button"
                onPointerDown={() => {
                  arcadeSfx.playButtonTap();
                  setIsSearchingRandom(false);
                }}
                className="px-3 py-1 text-[10px] font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer"
              >
                CANCEL SEARCH
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onPointerDown={handleStartRandomMatch}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>RANDOM MATCH</span>
              </button>

              <button
                type="button"
                onPointerDown={handleStartFriend}
                className="py-2.5 px-3 bg-[#1E88E5] hover:bg-[#1976D2] border-b-4 border-[#1565C0] active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>INVITE FRIENDS</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <button
        type="button"
        onPointerDown={handleBackClick}
        className="mt-6 bg-[#E07A5F] hover:bg-[#D46B50] border-b-4 border-[#B8543B] active:border-b-0 active:translate-y-1 text-white font-black text-base py-2.5 px-8 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-xs rounded-3xl z-50 p-6 flex flex-col justify-between animate-fadeIn text-white">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-lg tracking-wide uppercase">How To Play</h3>
              </div>
              <button
                type="button"
                onPointerDown={() => {
                  arcadeSfx.playButtonTap();
                  setShowHowToPlay(false);
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-3 mt-2">
              {howToPlaySteps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 border border-white/15 rounded-xl p-3 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                    {step.icon || idx + 1}
                  </div>
                  <div>
                    <div className="font-black text-xs text-emerald-300 uppercase">{step.title}</div>
                    <div className="text-xs text-neutral-300 leading-relaxed mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onPointerDown={() => {
              arcadeSfx.playButtonTap();
              setShowHowToPlay(false);
            }}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-black text-white uppercase rounded-xl tracking-wider text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Got It!
          </button>
        </div>
      )}
    </div>
  );
}
