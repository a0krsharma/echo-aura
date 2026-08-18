"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Headphones,
  Plus,
  Zap,
  Play,
  Pause,
  Radio,
  MessageSquare,
  Heart,
  Share2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { ShareButton } from "@/app/components/ShareButton";
import {
  subscribeToEpisodes,
  type FrequencyPlusEpisode,
  logShareAction,
} from "@/lib/frequencyPlus";

export default function FrequencyPlusPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [episodes, setEpisodes] = useState<FrequencyPlusEpisode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const CATEGORIES = ["ALL", "TECH", "MARKETS", "STORYTELLING", "DEBATES", "CRICKET", "GENERAL"];

  useEffect(() => {
    const unsub = subscribeToEpisodes(selectedCategory, (list) => {
      setEpisodes(list);
    });
    return () => unsub();
  }, [selectedCategory]);

  const handleTogglePlay = (ep: FrequencyPlusEpisode, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingId === ep.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(ep.audioUrl);
    audio.play().catch((err) => console.warn("Audio play blocked:", err));
    audio.onended = () => setPlayingId(null);
    setAudioElement(audio);
    setPlayingId(ep.id);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8 w-full">
        {/* Top Telemetry Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="space-y-1">
            <p className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-white animate-pulse" />
              // FREQUENCY+ // LONG-FORM AUDIO TRANSMISSIONS
            </p>
            <h1 className="text-2xl font-bold tracking-widest text-white uppercase">
              [ FREQUENCY+ ]
            </h1>
            <p className="text-xs text-neutral-400 max-w-xl pt-1">
              15-minute proof-of-work podcasts, investigative deep dives, and episodic series. 100% free listening across all nodes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/frequency-plus/yield"
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-neutral-800 text-neutral-400 hover:border-yellow-400 hover:text-yellow-400 bg-neutral-950 uppercase tracking-wider transition-colors"
            >
              <Zap size={13} className="text-yellow-400 fill-yellow-400" />
              <span>[ VOLT YIELD ]</span>
            </Link>
            <Link
              href="/frequency-plus/create"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-white bg-white text-black hover:bg-neutral-200 uppercase tracking-wider transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>[ + STUDIO ]</span>
            </Link>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-[10px] tracking-widest uppercase scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "border-white bg-white text-black font-bold"
                  : "border-neutral-900 text-neutral-400 hover:border-neutral-700 bg-neutral-950"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Transmission Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
            <span>// LATEST TRANSMISSIONS ({episodes.length})</span>
            <span>PROOF-OF-TRANSMISSION GRID</span>
          </div>

          {episodes.length === 0 ? (
            <div className="border border-neutral-900 bg-neutral-950 p-12 text-center space-y-4">
              <Headphones className="w-8 h-8 text-neutral-700 mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                  NO TRANSMISSIONS LOGGED IN THIS CATEGORY
                </p>
                <p className="text-[10px] text-neutral-600 max-w-sm mx-auto">
                  Be the first verified creator to broadcast a 15-minute deep-dive series.
                </p>
              </div>
              <Link
                href="/frequency-plus/create"
                className="inline-block mt-2 px-4 py-2 border border-white bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200"
              >
                [ + BROADCAST FIRST TRANSMISSION ]
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {episodes.map((ep) => {
                const isPlaying = playingId === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => router.push(`/frequency-plus/${ep.id}`)}
                    className="border border-neutral-800 bg-neutral-950 p-4 space-y-3 hover:border-neutral-500 transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-neutral-500 uppercase tracking-wider font-bold">
                          {ep.creatorHandle} • [{ep.category}]
                        </span>
                        <span className="text-neutral-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatDuration(ep.durationSeconds)}
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-white group-hover:text-white uppercase tracking-tight line-clamp-2">
                        {ep.title}
                      </h2>

                      {ep.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2 font-serif italic">
                          "{ep.description}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Controls & Telemetry */}
                    <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[10px]">
                      {/* Play Button */}
                      <button
                        onClick={(e) => handleTogglePlay(ep, e)}
                        className={`px-3 py-1.5 border uppercase font-bold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isPlaying
                            ? "border-white bg-white text-black animate-pulse"
                            : "border-neutral-700 bg-black text-white hover:border-white"
                        }`}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        <span>{isPlaying ? "PAUSE" : "LISTEN"}</span>
                      </button>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-neutral-500">
                        <span className="flex items-center gap-1 text-yellow-500 font-bold">
                          <Zap size={11} className="fill-yellow-500" />
                          +{ep.totalVoltsGenerated}V
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} />
                          {ep.metrics.voiceReplies}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart size={11} />
                          {ep.metrics.pulses}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
