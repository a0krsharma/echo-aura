"use client";

import React from "react";
import Link from "next/link";

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * FormattedText
 * Parses captions and messages to make @mentions and #hashtags clickable deep-links.
 * - @handle -> /[handle]
 * - #hashtag -> /hashtag/[tag]
 */
export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(#[\w-]+)|(@[\w-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const isHashtag = fullMatch.startsWith("#");
    const isMention = fullMatch.startsWith("@");

    if (isHashtag) {
      const tag = fullMatch.replace("#", "");
      parts.push(
        <Link
          key={`${match.index}-tag`}
          href={`/hashtag/${tag}`}
          className="text-neutral-400 hover:text-white font-semibold cursor-pointer underline decoration-neutral-700 underline-offset-2 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    } else if (isMention) {
      const handle = fullMatch.replace("@", "");
      parts.push(
        <Link
          key={`${match.index}-mention`}
          href={`/${handle}`}
          className="text-white font-semibold cursor-pointer underline decoration-neutral-600 underline-offset-2 hover:text-neutral-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
