"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Crown,
  ShieldCheck,
  Gift,
  ArrowRight,
  UserCheck,
  UtensilsCrossed,
  Dices,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { spacesSfx } from "@/lib/spacesSfx";

interface GuestAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  actionDescription?: string;
  actionIcon?: React.ReactNode;
  onSuccess?: () => void;
}

export function GuestAuthModal({
  isOpen,
  onClose,
  actionTitle = "Unlock Host & Permanent Features",
  actionDescription = "Create your free Echo account to host tables, save custom outfits, order banquet feasts, and invite friends anytime!",
  actionIcon,
  onSuccess,
}: GuestAuthModalProps) {
  const { signInWithGoogle, isLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setErrorMsg(null);
      spacesSfx.playKeyNote(5);
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setErrorMsg(err?.message || "Google sign-in was interrupted. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/40 p-6 sm:p-7 space-y-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-amber-500/20">
            {actionIcon || <Crown className="w-7 h-7" />}
          </div>
          <h2 className="text-xl font-black font-mono text-white tracking-tight">
            {actionTitle}
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto font-mono">
            {actionDescription}
          </p>
        </div>

        {/* Perks Checklist */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-2.5 text-xs text-neutral-300">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>Host unlimited Birthday & Dinner parties</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>Save personalized avatars, outfits & companion pets</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>Keep your $500 starter wallet cash & game earnings</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>Permanent VIP seat reservations at party tables</span>
          </div>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn || isLoading}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>{signingIn ? "Connecting with Google..." : "Continue with Google (1-Click)"}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            Continue exploring as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
