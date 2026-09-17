import Link from "next/link";
import React from "react";

export function formatNum(n: number) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function formatRelativeTime(c: any) {
  if (!c?.seconds) return "now";
  const d = Math.floor(Date.now() / 1000 - c.seconds);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return `${Math.floor(d / 604800)}w`;
}

export function getAvatarGradient(handle: string) {
  const gradients = [
    "from-neutral-800 to-neutral-950",
    "from-zinc-800 to-zinc-950",
    "from-neutral-700 to-neutral-900",
    "from-stone-800 to-black",
    "from-zinc-900 to-black",
    "from-neutral-900 to-neutral-950",
  ];
  let hash = 0;
  const clean = handle.replace(/^@/, "");
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function parseCaption(caption: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(#\w+)|(@\w+)/g;
  let match;
  
  while ((match = regex.exec(caption)) !== null) {
    if (match.index > lastIndex) {
      parts.push(caption.slice(lastIndex, match.index));
    }
    
    const [fullMatch] = match;
    const isHashtag = fullMatch.startsWith('#');
    const isMention = fullMatch.startsWith('@');
    
    if (isHashtag) {
      parts.push(
        <Link
          key={match.index}
          href={`/hashtag/${encodeURIComponent(fullMatch.replace(/^#/, ''))}`}
          className="text-white hover:underline font-medium transition-colors inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    } else if (isMention) {
      parts.push(
        <Link
          key={match.index}
          href={`/${encodeURIComponent(fullMatch.replace(/^@/, ''))}`}
          className="text-white hover:underline font-semibold transition-colors inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < caption.length) {
    parts.push(caption.slice(lastIndex));
  }
  
  return parts;
}
