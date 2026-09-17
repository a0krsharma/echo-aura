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

    // Check if permanently dismissed or dismissed in last 7 days
    if (localStorage.getItem("pwa_prompt_never") === "true") return;

    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hours < 168) return; // 7 days
    }

    // Native beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

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

  const handleNeverShow = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_prompt_never", "true");
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* ── Main PWA Banner (Mobile & Web) ── */}
      <aside
        className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-88 z-50 bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 p-3.5 shadow-2xl animate-fade-in font-mono text-xs text-white flex flex-col gap-2.5 rounded-2xl"
        aria-label="Install App Prompt"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-mono text-sm font-black flex items-center justify-center shrink-0 shadow-sm">
              E.
            </div>
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                INSTALL ECHO APP
              </div>
              <div className="font-mono text-[10px] text-neutral-400">
                Fullscreen audio experience
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

        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-white text-black hover:bg-neutral-200 py-2 px-3 font-mono text-xs font-bold rounded-xl tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Download size={13} />
            <span>INSTALL</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 font-mono text-[11px] uppercase transition-colors cursor-pointer"
          >
            LATER
          </button>
          <button
            onClick={handleNeverShow}
            className="py-2 px-2 text-neutral-500 hover:text-neutral-400 font-mono text-[10px] uppercase transition-colors cursor-pointer"
            title="Don't ask again"
          >
            NEVER
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
