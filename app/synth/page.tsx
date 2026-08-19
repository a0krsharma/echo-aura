"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Radio, Sparkles } from "lucide-react";
import NeuralSynthesisTerminal from "@/app/components/NeuralSynthesisTerminal";

export default function SynthPage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-4 sm:p-8 pb-32 md:pb-16 select-none">
      {/* ── Top Header Navigation ── */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-neutral-400 hover:text-white border border-neutral-800 px-2.5 py-1 text-xs uppercase font-bold hover:border-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>[ RETURN ]</span>
          </Link>
          <span className="text-neutral-700">//</span>
          <span className="text-white font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            STUDIO+ [ AI ENGINE ]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/studio"
            className="text-neutral-400 hover:text-white border border-neutral-800 px-2.5 py-1 text-xs uppercase font-bold hover:border-white transition-colors"
          >
            [ 🎙️ MIC STUDIO ]
          </Link>
        </div>
      </header>

      {/* ── Main Neural Terminal ── */}
      <main className="flex-1 w-full max-w-3xl mx-auto">
        <NeuralSynthesisTerminal />
      </main>
    </div>
  );
}
