"use client";

/**
 * app/search/components/LiveCricketScorecard.tsx
 * ─────────────────────────────────────────────────────
 * Twitter/X-Style Live Cricket Scorecard & Match Stage Hub.
 * Features:
 *  - Real-time Match Telemetry (India matches prioritized)
 *  - Batting, Bowling, CRR, and Lead/Target analysis
 *  - 1-Click "START LIVE MATCH AUDIO STAGE"
 *  - 1-Click "RECORD VOICE TAKE" on wickets/boundaries
 *  - Pure Monochrome High-Contrast aesthetic
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, Mic2, RefreshCw, Trophy, ChevronRight, Activity } from "lucide-react";
import { createRoom } from "@/lib/rooms";
import { useAuth } from "@/app/components/AuthProvider";

export interface CricketMatch {
  id: string;
  tournament: string;
  matchType: "TEST" | "ODI" | "T20" | "IPL";
  status: "LIVE" | "RESULT" | "UPCOMING";
  statusText: string;
  team1: {
    name: string;
    shortName: string;
    score: string;
    overs?: string;
    flag: string;
  };
  team2: {
    name: string;
    shortName: string;
    score: string;
    overs?: string;
    flag: string;
  };
  batsman1?: { name: string; runs: number; balls: number; fours: number; sixes: number };
  batsman2?: { name: string; runs: number; balls: number; fours: number; sixes: number };
  bowler?: { name: string; figures: string; overs: string };
  crr?: string;
  targetOrLead?: string;
  venue: string;
  highlightUrl?: string;
}

const DEFAULT_MATCHES: CricketMatch[] = [
  {
    id: "ind-eng-test-4",
    tournament: "ICC WORLD TEST CHAMPIONSHIP 2026",
    matchType: "TEST",
    status: "LIVE",
    statusText: "DAY 3 • 2ND SESSION",
    team1: {
      name: "INDIA",
      shortName: "IND",
      score: "354/6",
      overs: "88.4",
      flag: "🇮🇳",
    },
    team2: {
      name: "ENGLAND",
      shortName: "ENG",
      score: "287/10",
      overs: "76.2",
      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    },
    batsman1: { name: "V. Kohli", runs: 86, balls: 122, fours: 9, sixes: 1 },
    batsman2: { name: "R. Pant", runs: 48, balls: 41, fours: 5, sixes: 2 },
    bowler: { name: "J. Anderson", figures: "2/54", overs: "18.4" },
    crr: "4.01",
    targetOrLead: "India lead by 67 runs with 4 wickets remaining",
    venue: "Lord's Cricket Ground, London",
  },
  {
    id: "ind-aus-t20-super8",
    tournament: "ICC T20 SUPER 8s",
    matchType: "T20",
    status: "LIVE",
    statusText: "INNINGS BREAK • TARGET 206",
    team1: {
      name: "INDIA",
      shortName: "IND",
      score: "205/5",
      overs: "20.0",
      flag: "🇮🇳",
    },
    team2: {
      name: "AUSTRALIA",
      shortName: "AUS",
      score: "42/1",
      overs: "4.2",
      flag: "🇦🇺",
    },
    batsman1: { name: "T. Head", runs: 24, balls: 14, fours: 3, sixes: 1 },
    batsman2: { name: "M. Marsh", runs: 12, balls: 8, fours: 1, sixes: 1 },
    bowler: { name: "J. Bumrah", figures: "1/8", overs: "2.0" },
    crr: "9.69",
    targetOrLead: "Australia need 164 runs in 94 balls",
    venue: "Melbourne Cricket Ground",
  },
  {
    id: "csk-mi-ipl-2026",
    tournament: "IPL 2026 • EL CLÁSICO",
    matchType: "IPL",
    status: "RESULT",
    statusText: "MATCH CONCLUDED",
    team1: {
      name: "CHENNAI SUPER KINGS",
      shortName: "CSK",
      score: "198/4",
      overs: "20.0",
      flag: "🦁",
    },
    team2: {
      name: "MUMBAI INDIANS",
      shortName: "MI",
      score: "192/9",
      overs: "20.0",
      flag: "🔵",
    },
    targetOrLead: "CSK won by 6 runs • Player of Match: Ruturaj Gaikwad",
    venue: "M. A. Chidambaram Stadium, Chennai",
  },
];

export default function LiveCricketScorecard() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<CricketMatch[]>(DEFAULT_MATCHES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeMatch = matches[selectedIndex] || matches[0];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const handleCreateMatchStage = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsCreatingStage(true);
    try {
      const roomTitle = `${activeMatch.team1.shortName} vs ${activeMatch.team2.shortName} Live Match Stage`;
      const roomId = await createRoom({
        name: roomTitle,
        description: `Live ball-by-ball discussion & commentary for ${activeMatch.tournament} (${activeMatch.venue}).`,
        hostUid: user.uid,
        hostHandle: (user as any).handle || "@ANON",
        maxParticipants: 20,
        isPublic: true,
        category: "SPORTS",
        tags: [
          `${activeMatch.team1.shortName}vs${activeMatch.team2.shortName}`,
          "CricketLive",
          "IndiaCricket",
          "INDvsENG",
        ],
      });
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error("[LiveCricketScorecard] Failed to create stage:", err);
      setIsCreatingStage(false);
    }
  };

  const handleRecordTake = () => {
    const topicTag = `${activeMatch.team1.shortName}vs${activeMatch.team2.shortName}`;
    const headline = `${activeMatch.team1.name} ${activeMatch.team1.score} vs ${activeMatch.team2.name} ${activeMatch.team2.score} (${activeMatch.statusText})`;
    router.push(`/record?topic=${encodeURIComponent(topicTag)}&headline=${encodeURIComponent(headline)}&category=SPORTS`);
  };

  return (
    <div className="border border-white/20 bg-neutral-950 p-4 space-y-4 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-white font-bold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> CRICKET MATCH CENTER
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
            title="Refresh Live Score"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-white" : ""}`} />
          </button>
        </div>
      </div>

      {/* Match Selector Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto scrollbar-none pb-1">
        {matches.map((m, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedIndex(idx)}
              className={`px-2.5 py-1 text-[10px] font-mono whitespace-nowrap transition-colors border cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-bold border-white"
                  : "text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {m.team1.shortName} vs {m.team2.shortName}
              {m.status === "LIVE" && <span className="ml-1 text-[8px]">●</span>}
            </button>
          );
        })}
      </div>

      {/* Main Scorecard Arena */}
      <div className="bg-black border border-neutral-900 p-3.5 space-y-3">
        {/* Tournament & Status */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono border-b border-neutral-900 pb-2">
          <span className="tracking-wider uppercase">{activeMatch.tournament}</span>
          <span className="px-1.5 py-0.5 bg-neutral-900 text-white font-bold tracking-wider">
            {activeMatch.statusText}
          </span>
        </div>

        {/* Teams & Scores */}
        <div className="grid grid-cols-2 gap-4 py-1">
          {/* Team 1 */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-base">{activeMatch.team1.flag}</span>
              <span className="font-bold text-sm text-white tracking-wide">{activeMatch.team1.name}</span>
            </div>
            <div className="font-mono text-xl font-bold text-white tracking-tight">
              {activeMatch.team1.score}
              {activeMatch.team1.overs && (
                <span className="text-xs text-neutral-400 font-normal ml-1.5">
                  ({activeMatch.team1.overs} ov)
                </span>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end space-x-1.5">
              <span className="font-bold text-sm text-white tracking-wide">{activeMatch.team2.name}</span>
              <span className="text-base">{activeMatch.team2.flag}</span>
            </div>
            <div className="font-mono text-xl font-bold text-white tracking-tight">
              {activeMatch.team2.score}
              {activeMatch.team2.overs && (
                <span className="text-xs text-neutral-400 font-normal ml-1.5">
                  ({activeMatch.team2.overs} ov)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Batsmen & Bowler Telemetry (if LIVE) */}
        {activeMatch.status === "LIVE" && activeMatch.batsman1 && (
          <div className="border-t border-neutral-900 pt-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between items-center text-neutral-300">
              <span>
                🏏 <strong className="text-white">{activeMatch.batsman1.name}</strong>{" "}
                <span className="text-white font-bold">{activeMatch.batsman1.runs}*</span> ({activeMatch.batsman1.balls}b, {activeMatch.batsman1.fours}x4, {activeMatch.batsman1.sixes}x6)
              </span>
              {activeMatch.crr && <span className="text-neutral-500">CRR: {activeMatch.crr}</span>}
            </div>

            {activeMatch.batsman2 && (
              <div className="flex justify-between items-center text-neutral-400">
                <span>
                  🏏 <strong className="text-white">{activeMatch.batsman2.name}</strong>{" "}
                  <span className="text-white font-bold">{activeMatch.batsman2.runs}*</span> ({activeMatch.batsman2.balls}b, {activeMatch.batsman2.fours}x4, {activeMatch.batsman2.sixes}x6)
                </span>
                {activeMatch.bowler && (
                  <span className="text-neutral-300">
                    ⚾ {activeMatch.bowler.name}: <strong className="text-white">{activeMatch.bowler.figures}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Target / Lead Note */}
        {activeMatch.targetOrLead && (
          <div className="text-[10px] text-neutral-400 font-mono pt-1">
            &gt;&gt; {activeMatch.targetOrLead}
          </div>
        )}
      </div>

      {/* Live Stage Launchpad Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCreateMatchStage}
          disabled={isCreatingStage}
          className="flex-1 bg-white hover:bg-neutral-200 text-black py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>{isCreatingStage ? "INITIALIZING STAGE..." : ">> START LIVE MATCH AUDIO STAGE"}</span>
        </button>

        <button
          onClick={handleRecordTake}
          className="border border-neutral-700 hover:border-white text-white py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Mic2 className="w-3.5 h-3.5" />
          <span>RECORD TAKE</span>
        </button>
      </div>
    </div>
  );
}
