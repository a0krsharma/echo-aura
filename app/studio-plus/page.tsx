"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import NeuralSynthesisTerminal from "@/app/components/NeuralSynthesisTerminal";

function StudioPlusContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans pb-28 md:pb-12 flex flex-col justify-between">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
        <Link
          href="/"
          className="font-mono font-bold text-lg sm:text-xl tracking-tight text-white hover:text-neutral-400 transition-colors uppercase flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span>Echo. [ STUDIO+ ]</span>
        </Link>
        <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          // AI SYNTHESIS & 1-SHOT ENGINE
        </div>
      </header>

      {/* Main Terminal Box */}
      <main className="flex-1 w-full max-w-3xl mx-auto my-2">
        <NeuralSynthesisTerminal onPublishSuccess={() => router.push("/")} />
      </main>

      {/* Footer Navigation */}
      <footer className="border-t border-neutral-900 pt-4 mt-8 flex justify-between items-center font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          RETURN TO FREQUENCY
        </Link>
        <span>STUDIO+ // 1-SHOT AI ENGINE</span>
      </footer>
    </div>
  );
}

export default function StudioPlusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 font-mono text-xs tracking-widest uppercase">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          INITIALIZING STUDIO+ ENGINE...
        </div>
      }
    >
      <StudioPlusContent />
    </Suspense>
  );
}
