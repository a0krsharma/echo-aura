import React from "react";
import RoboEchoMascot from "@/app/components/robo-echo/RoboEchoMascot";
import AIVoiceConsole from "@/app/components/robo-echo/AIVoiceConsole";
import LeftSidebar from "@/app/components/LeftSidebar";
import BottomNav from "@/app/components/BottomNav";
import Link from "next/link";
import { ArrowLeft, Sparkles, Bot, Zap, Volume2 } from "lucide-react";

export const metadata = {
  title: "Robo-Echo Mascot // 01 | Echo Audio Platform",
  description: "Interactive 3D Droid Mascot with OLED Visor, Talking Tom Voice Mimicry, and 5 AI Personalities.",
};

export default function EchoBotPage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col md:flex-row select-none">
      {/* Sidebar on desktop */}
      <LeftSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-56 pb-24 md:pb-12 min-h-screen flex flex-col">
        {/* Top Header Navigation */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 md:px-8 py-4 flex items-center justify-between">
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
                  ROBO-ECHO COMPANION // 01
                </h1>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold uppercase">
                  LIVE 3D RIG
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Interactive Voice Companion • Talking Tom Physics • Web Audio 60 FPS Lip-Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/wardrobe"
              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-400 text-xs font-bold uppercase rounded-xl transition-all"
            >
              [ 🎨 WARDROBE ]
            </Link>
            <Link
              href="/rooms"
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold uppercase rounded-xl transition-all"
            >
              [ 🎙️ ROOMS ]
            </Link>
            <Link
              href="/arcade"
              className="px-3 py-1.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-all shadow-md"
            >
              [ 🎮 ARCADE ]
            </Link>
          </div>
        </header>

        {/* Mascot Simulator Canvas & Interactive Arena */}
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center gap-8 max-w-6xl w-full mx-auto">
          <RoboEchoMascot />

          {/* Gemini 2.5 Flash Echo-Proof Voice Chat Console */}
          <div className="w-full max-w-4xl">
            <AIVoiceConsole />
          </div>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
