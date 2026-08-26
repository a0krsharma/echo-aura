"use client";

import React, { useState } from "react";
import RoboEchoMascot from "@/app/components/robo-echo/RoboEchoMascot";
import AIVoiceConsole from "@/app/components/robo-echo/AIVoiceConsole";
import AutonomousCompanionScene from "@/app/components/robo-echo/AutonomousCompanionScene";
import LeftSidebar from "@/app/components/LeftSidebar";
import BottomNav from "@/app/components/BottomNav";
import Link from "next/link";
import { ArrowLeft, Bot, Sparkles, Brain, Mic } from "lucide-react";

export default function EchoBotPage() {
  const [activeTab, setActiveTab] = useState<"mascot" | "voice" | "memory">("mascot");

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col md:flex-row select-none">
      {/* Sidebar on desktop */}
      <LeftSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-56 pb-24 md:pb-12 min-h-screen flex flex-col">
        {/* Top Header Navigation */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/arcade"
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                <h1 className="text-sm font-black uppercase tracking-wider text-white">
                  ROBO-ECHO
                </h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold uppercase">
                  3D COMPANION
                </span>
              </div>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="flex items-center gap-2">
            <Link
              href="/wardrobe"
              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-400 text-xs font-bold uppercase rounded-xl transition-all"
            >
              [ 🎨 WARDROBE ]
            </Link>
            <Link
              href="/arcade"
              className="px-3 py-1.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-all shadow-md"
            >
              [ 🎮 ARCADE ]
            </Link>
          </div>
        </header>

        {/* View Switcher Pills */}
        <div className="max-w-4xl w-full mx-auto px-4 pt-6 pb-2 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab("mascot")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "mascot"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3D MASCOT</span>
          </button>

          <button
            onClick={() => setActiveTab("voice")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "voice"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI VOICE CHAT</span>
          </button>

          <button
            onClick={() => setActiveTab("memory")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "memory"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>MEMORY GRAPH</span>
          </button>
        </div>

        {/* Main Stage */}
        <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-start max-w-4xl w-full mx-auto">
          {activeTab === "mascot" && <RoboEchoMascot />}
          {activeTab === "voice" && <AIVoiceConsole />}
          {activeTab === "memory" && <AutonomousCompanionScene />}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
