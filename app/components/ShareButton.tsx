"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: "button" | "icon" | "minimal";
  label?: string;
}

/**
 * ShareButton
 * Native deep-linking share system with clipboard fallback.
 * Generates custom invite links e.g., "Join this room right now on Echo!"
 */
export function ShareButton({
  title,
  text = "Check this out on Echo — Audio-First, Unfiltered.",
  url,
  className = "",
  variant = "button",
  label = "[ SHARE ]",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData = {
      title,
      text: `${text}\n${shareUrl}`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    // Clipboard Fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={`p-2 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer ${className}`}
        title="Share link"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
      </button>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={handleShare}
        className={`font-mono text-xs text-neutral-500 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer ${className}`}
      >
        {copied ? (
          <span className="text-green-400 flex items-center gap-1">
            <Check size={12} /> COPIED LINK
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Share2 size={12} /> {label}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`font-mono text-xs tracking-widest uppercase border border-neutral-800 px-3.5 py-2 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2 ${className}`}
    >
      {copied ? (
        <>
          <Check size={14} className="text-green-400" />
          <span className="text-green-400 font-bold">LINK COPIED!</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
