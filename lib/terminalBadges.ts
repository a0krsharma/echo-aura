/**
 * lib/terminalBadges.ts
 * ─────────────────────────────────────────────────────────────
 * Terminal Winner Badges & Profile Flairs System.
 * Displays glowing neon badges on user profile handles, room headers,
 * arcade scorecards, and chat messages to reward elite players.
 */

import React from "react";

export interface TerminalBadge {
  code: string;
  tag: string;
  title: string;
  icon: string;
  color: string;
  borderColor: string;
  bgGlow: string;
  unlockCondition: string;
}

export const TERMINAL_BADGES: Record<string, TerminalBadge> = {
  GAUNTLET_SLAYER: {
    code: "GAUNTLET_SLAYER",
    tag: "[ 👑 GAUNTLET_SLAYER ]",
    title: "Gauntlet Slayer",
    icon: "👑",
    color: "text-amber-400",
    borderColor: "border-amber-400",
    bgGlow: "bg-amber-950/40 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
    unlockCondition: "Win 5 consecutive public Open Gauntlet duels.",
  },
  UNTOUCHABLE_5X: {
    code: "UNTOUCHABLE_5X",
    tag: "[ 🔥 UNTOUCHABLE_5X ]",
    title: "Grid Dominator",
    icon: "🔥",
    color: "text-rose-400",
    borderColor: "border-rose-500",
    bgGlow: "bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    unlockCondition: "Maintain a 5-game winning streak in Ludo or Carrom.",
  },
  ROAST_ARCHITECT: {
    code: "ROAST_ARCHITECT",
    tag: "[ 🎙️ ROAST_ARCHITECT ]",
    title: "Verbal Heavyweight",
    icon: "🎙️",
    color: "text-purple-400",
    borderColor: "border-purple-400",
    bgGlow: "bg-purple-950/40 shadow-[0_0_15px_rgba(192,132,252,0.3)]",
    unlockCondition: "Win 10 community-voted Voice Fight & Roast Ring arenas.",
  },
  BLUFF_DEITY: {
    code: "BLUFF_DEITY",
    tag: "[ 🃏 BLUFF_DEITY ]",
    title: "Shadow Player",
    icon: "🃏",
    color: "text-cyan-400",
    borderColor: "border-cyan-400",
    bgGlow: "bg-cyan-950/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]",
    unlockCondition: "Win 5 Teen Patti hands completely on 'Blind' stakes.",
  },
  GHOST_COMMANDER: {
    code: "GHOST_COMMANDER",
    tag: "[ 💀 GHOST_COMMANDER ]",
    title: "Midnight Node",
    icon: "💀",
    color: "text-emerald-400",
    borderColor: "border-emerald-400",
    bgGlow: "bg-emerald-950/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]",
    unlockCondition: "Log 25+ hours in time-locked 11:00 PM – 4:00 AM rooms.",
  },
  VOLT_TYCOON: {
    code: "VOLT_TYCOON",
    tag: "[ ⚡ VOLT_TYCOON ]",
    title: "Energy Whale",
    icon: "⚡",
    color: "text-yellow-300",
    borderColor: "border-yellow-300",
    bgGlow: "bg-yellow-950/40 shadow-[0_0_15px_rgba(253,224,71,0.3)]",
    unlockCondition: "Accumulate a balance of over 10,000 [ VOLTS ].",
  },
  ZERO_TRACE: {
    code: "ZERO_TRACE",
    tag: "[ 🕵️ ZERO_TRACE ]",
    title: "Master Impostor",
    icon: "🕵️",
    color: "text-indigo-400",
    borderColor: "border-indigo-400",
    bgGlow: "bg-indigo-950/40 shadow-[0_0_15px_rgba(129,140,248,0.3)]",
    unlockCondition: "Win 10 games of Saboteur / Raja Mantri undetected.",
  },
  CUE_SNIPER: {
    code: "CUE_SNIPER",
    tag: "[ 🎯 CUE_SNIPER ]",
    title: "Bank Shot Prodigy",
    icon: "🎯",
    color: "text-emerald-300",
    borderColor: "border-emerald-300",
    bgGlow: "bg-emerald-950/40 shadow-[0_0_15px_rgba(110,231,183,0.3)]",
    unlockCondition: "Clear 3 consecutive balls on the break in 8-Ball Pool.",
  },
  CHICKEN_NODE: {
    code: "CHICKEN_NODE",
    tag: "[ 🐔 CHICKEN_NODE ]",
    title: "Forfeit Penalty",
    icon: "🐔",
    color: "text-orange-400",
    borderColor: "border-orange-400",
    bgGlow: "bg-orange-950/40 shadow-[0_0_10px_rgba(251,146,60,0.3)]",
    unlockCondition: "Skipped a Voice Dare or Truth prompt in the Lounge.",
  },
};

export function getBadgeByCode(code: string): TerminalBadge | undefined {
  return TERMINAL_BADGES[code.toUpperCase()];
}

export function getAllBadges(): TerminalBadge[] {
  return Object.values(TERMINAL_BADGES);
}
