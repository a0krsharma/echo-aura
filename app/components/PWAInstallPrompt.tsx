"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWAInstallPrompt.tsx
 * ─────────────────────────────────────────────────────
 * Mobile web PWA Installation banner & prompt.
 * - Catches native beforeinstallprompt on Android Chrome, Edge, Desktop
 * - Provides iOS Safari "Add to Home Screen" instructions
 * - Allows users to install Echo as a native web app directly to home screen
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detect if already installed as PWA / standalone
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if dismissed in last 24 hours
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hours < 24) return;
    }

    // Native beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show prompt on iOS after a brief delay if not standalone
    if (isIosDevice && !dismissedAt) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* ── Main PWA Banner (Mobile & Web) ── */}
      <aside
        className="fixed bottom-16 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 p-4 shadow-2xl animate-fade-in font-mono text-xs text-white flex flex-col gap-3 rounded-none"
        aria-label="Install App Prompt"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-black font-serif italic text-lg font-bold flex items-center justify-center border border-neutral-700 shrink-0">
              E.
            </div>
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                INSTALL ECHO APP
              </div>
              <div className="font-mono text-[10px] text-neutral-400">
                Fast, offline-ready & fullscreen mobile audio experience
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            title="Dismiss prompt"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-white text-black hover:bg-neutral-200 py-2 px-3 font-mono text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Download size={14} />
            <span>[ INSTALL APP ]</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 font-mono text-xs uppercase transition-colors cursor-pointer"
          >
            LATER
          </button>
        </div>
      </aside>

      {/* ── iOS Step-by-Step Guide Modal ── */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full space-y-4 font-mono text-xs text-white">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <Share size={14} /> ADD TO HOME SCREEN
              </span>
              <button onClick={() => setShowIOSGuide(false)} className="text-neutral-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Install <strong className="text-white">Echo</strong> on your iPhone or iPad in 2 easy steps:
            </p>
            <ol className="space-y-3 text-neutral-400 list-decimal list-inside leading-relaxed">
              <li>
                Tap the <strong className="text-white inline-flex items-center gap-1"><Share size={12} /> Share</strong> button in Safari toolbar.
              </li>
              <li>
                Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>.
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-4 bg-white text-black py-2.5 font-bold uppercase tracking-widest cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
