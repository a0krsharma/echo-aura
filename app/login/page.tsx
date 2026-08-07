"use client";

/**
 * app/login/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo login screen — brutally minimalist.
 * Two authentication paths:
 *   1. Google OAuth popup
 *   2. Email / Password (sign-in + sign-up toggle)
 *
 * Design: pure black background, serif logotype, 1px-border
 * monospace buttons. No gradients. No drop shadows. No colour.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { Loader2 } from "lucide-react";

type Mode = "choose" | "email";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isLoading, error, user } = useAuth();
  const router = useRouter();

  const [mode,       setMode]       = useState<Mode>("choose");
  const [isSignUp,   setIsSignUp]   = useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [busy,       setBusy]       = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError ?? error;

  // ── Auto-redirect when auth state resolves (handles mobile redirect return) ─
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);
  // ── Google ──────────────────────────────────────────────────────
  async function handleGoogle() {
    setBusy(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      // For desktop popup: redirect immediately after sign-in resolves.
      // For mobile redirect: signInWithRedirect navigates away — this line never runs.
      // The useEffect above handles the redirect when the page reloads.
      router.replace("/");
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  // ── Email ───────────────────────────────────────────────────────
  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError("EMAIL AND PASSWORD REQUIRED.");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace("/");
    } catch {
      // error surfaced from context
    } finally {
      setBusy(false);
    }
  }

  if (isLoading && !busy) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      {/* ── Logotype ── */}
      <header className="mb-16 text-center">
        <h1 className="font-serif text-7xl italic text-white leading-none tracking-tight">
          Echo.
        </h1>
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-600 mt-4">
          Audio-first. Unfiltered. Real.
        </p>
      </header>

      {/* ── Auth panel ── */}
      <div className="w-full max-w-xs">

        {mode === "choose" && (
          <div className="flex flex-col gap-3">
            {/* Google */}
            <button
              id="btn-google"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 border border-white text-white font-mono text-[11px] tracking-[0.2em] uppercase py-4 px-6 hover:bg-white hover:text-black transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              [ CONTINUE WITH GOOGLE ]
            </button>

            {/* Email */}
            <button
              id="btn-email"
              onClick={() => setMode("email")}
              disabled={busy}
              className="w-full flex items-center justify-center border border-neutral-800 text-neutral-500 font-mono text-[11px] tracking-[0.2em] uppercase py-4 px-6 hover:border-white hover:text-white transition-colors duration-150 cursor-pointer disabled:opacity-40"
            >
              [ CONTINUE WITH EMAIL ]
            </button>

            <p className="font-serif italic text-neutral-700 text-xs text-center mt-4 leading-relaxed">
              By continuing, you accept our terms and privacy policy.
            </p>
          </div>
        )}

        {mode === "email" && (
          <form onSubmit={handleEmail} className="flex flex-col gap-4">
            {/* Header */}
            <div className="mb-4">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neutral-600">
                {isSignUp ? "// CREATE ACCOUNT" : "// SIGN IN"}
              </p>
            </div>

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-mono text-[10px] tracking-widest uppercase text-neutral-600"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-sm text-white py-2 tracking-widest placeholder:text-neutral-700 transition-colors"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-mono text-[10px] tracking-widest uppercase text-neutral-600"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-sm text-white py-2 tracking-widest placeholder:text-neutral-700 transition-colors"
              />
            </div>

            {/* Error */}
            {displayError && (
              <p className="font-mono text-[10px] tracking-widest uppercase text-white border border-neutral-800 px-3 py-2">
                ✕ {displayError}
              </p>
            )}

            {/* Submit */}
            <button
              id="btn-submit-email"
              type="submit"
              disabled={busy}
              className="w-full border border-white text-white font-mono text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-white hover:text-black transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSignUp ? "[ CREATE ACCOUNT ]" : "[ SIGN IN ]"}
            </button>

            {/* Toggle sign-up / sign-in */}
            <button
              type="button"
              onClick={() => { setIsSignUp(s => !s); setLocalError(null); }}
              className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer text-center"
            >
              {isSignUp
                ? "ALREADY HAVE AN ACCOUNT — SIGN IN"
                : "NEW TO ECHO — CREATE ACCOUNT"}
            </button>

            {/* Back */}
            <button
              type="button"
              onClick={() => { setMode("choose"); setLocalError(null); }}
              className="font-mono text-[10px] tracking-widest uppercase text-neutral-700 hover:text-neutral-500 transition-colors cursor-pointer text-center"
            >
              ← BACK
            </button>
          </form>
        )}
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

// ── Google "G" icon (no colours, just shape) ──────────────────────
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
