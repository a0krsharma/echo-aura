"use client";

/**
 * app/login/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo login — Google only, brutally minimalist.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, isLoading, error, signInWithGoogle, clearError } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Redirect once authenticated
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function handleGoogle() {
    clearError();
    setBusy(true);
    try {
      await signInWithGoogle();
      // Popup flow: user is set → useEffect above redirects.
      // Redirect flow: page navigates away entirely (no code runs after this).
    } finally {
      setBusy(false);
    }
  }

  // Full-screen loader while Firebase resolves initial auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <span className="font-serif text-4xl italic text-white">Echo.</span>
        <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      {/* ── Logotype ── */}
      <header className="mb-16 text-center select-none">
        <h1 className="font-serif text-7xl italic text-white leading-none tracking-tight">
          Echo.
        </h1>
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-600 mt-4">
          Audio-first. Unfiltered. Real.
        </p>
      </header>

      {/* ── Auth panel ── */}
      <div className="w-full max-w-xs flex flex-col gap-4">

        {/* Error banner */}
        {error && (
          <div className="border border-neutral-800 px-4 py-3">
            <p className="font-mono text-[10px] tracking-widest uppercase text-white leading-relaxed">
              ✕ {error}
            </p>
          </div>
        )}

        {/* Google button */}
        <button
          id="btn-google-signin"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 border border-white text-white font-mono text-[11px] tracking-[0.2em] uppercase py-4 px-6 hover:bg-white hover:text-black transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {busy ? "SIGNING IN…" : "[ CONTINUE WITH GOOGLE ]"}
        </button>

        <p className="font-serif italic text-neutral-700 text-[11px] text-center leading-relaxed mt-2">
          By continuing, you accept our terms and privacy policy.
        </p>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-6">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-neutral-800">
          ECHO — UNFILTERED VOICES
        </p>
      </footer>
    </div>
  );
}

// ── Google "G" icon ──────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
