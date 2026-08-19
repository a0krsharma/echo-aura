"use client";

/**
 * app/search/components/LiveCricketScorecard.tsx
 * ─────────────────────────────────────────────────────
 * Twitter/X-Style Real-Time Live Cricket Scorecard & Match Stage Hub.
 * Features:
 *  - Automated 30s Live Polling from /api/cricket
 *  - Real-time Match Telemetry (India matches prioritized)
 *  - Batting, Bowling, CRR, and Lead/Target analysis
 *  - 1-Click "START LIVE MATCH AUDIO STAGE"
 *  - 1-Click "RECORD VOICE TAKE" on wickets/boundaries
 *  - Pure Monochrome High-Contrast aesthetic
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, Mic2, RefreshCw, Trophy, Activity, Zap } from "lucide-react";
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
    id: "ind-eng-test-live",
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
    id: "ind-aus-t20-live",
    tournament: "ICC T20 SUPER 8s",
    matchType: "T20",
    status: "LIVE",
    statusText: "2ND INNINGS • CHASE IN PROGRESS",
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
      score: "86/2",
      overs: "8.4",
      flag: "🇦🇺",
    },
    batsman1: { name: "T. Head", runs: 44, balls: 26, fours: 5, sixes: 2 },
    batsman2: { name: "G. Maxwell", runs: 18, balls: 11, fours: 2, sixes: 1 },
    bowler: { name: "J. Bumrah", figures: "2/14", overs: "2.4" },
    crr: "9.92",
    targetOrLead: "Australia require 120 runs in 68 balls",
    venue: "Melbourne Cricket Ground",
  },
  {
    id: "csk-mi-ipl-live",
    tournament: "TATA IPL 2026",
    matchType: "IPL",
    status: "LIVE",
    statusText: "MATCH 44 • 1ST INNINGS",
    team1: {
      name: "CHENNAI SUPER KINGS",
      shortName: "CSK",
      score: "168/4",
      overs: "16.2",
      flag: "🦁",
    },
    team2: {
      name: "MUMBAI INDIANS",
      shortName: "MI",
      score: "0/0",
      overs: "0.0",
      flag: "🔵",
    },
    batsman1: { name: "R. Gaikwad", runs: 72, balls: 44, fours: 7, sixes: 3 },
    batsman2: { name: "M.S. Dhoni", runs: 24, balls: 9, fours: 2, sixes: 2 },
    bowler: { name: "J. Archer", figures: "2/31", overs: "3.2" },
    crr: "10.28",
    targetOrLead: "CSK projected score: 215",
    venue: "Wankhede Stadium, Mumbai",
  },
];

export default function LiveCricketScorecard() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<CricketMatch[]>(DEFAULT_MATCHES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("JUST NOW");
  const [feedSource, setFeedSource] = useState<string>("LIVE FEED");

  const fetchLiveScores = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/cricket", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          setMatches(data.matches);
          setFeedSource(data.source || "LIVE FEED");
          const now = new Date();
          setLastSyncTime(
            now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      }
    } catch (err) {
      console.warn("[LiveCricketScorecard] Score fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll on Mount and every 25 seconds
  useEffect(() => {
    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, 25000);
    return () => clearInterval(interval);
  }, []);

  const activeMatch = matches[selectedIndex] || matches[0];

  const handleCreateMatchStage = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsCreatingStage(true);
    try {
      const roomTitle = `🏏 ${activeMatch.team1.shortName} vs ${activeMatch.team2.shortName} Match Arena`;
      const roomId = await createRoom({
        name: roomTitle,
        description: `Live ball-by-ball commentary & community debate for ${activeMatch.tournament} (${activeMatch.venue}).`,
        hostUid: user.uid,
        hostHandle: (user as any).handle || "@ANON",
        maxParticipants: 50,
        isPublic: true,
        category: "CRICKET",
        tags: [
          `${activeMatch.team1.shortName}vs${activeMatch.team2.shortName}`,
          "CricketLive",
          "MatchCenter",
          "IndVsEng",
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
    router.push(
      `/studio?category=CRICKET&topic=${encodeURIComponent(topicTag)}&headline=${encodeURIComponent(headline)}`
    );
  };

  return (
    <div className="border border-white/20 bg-neutral-950 p-4 space-y-4 shadow-2xl font-mono">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DB954] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DB954]"></span>
          </span>
          <span className="text-[11px] uppercase tracking-widest text-white font-bold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-white" /> CRICKET MATCH CENTER
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[9px] text-neutral-400">
          <span className="hidden sm:inline text-neutral-500 uppercase tracking-widest">
            {feedSource} · SYNCED {lastSyncTime}
          </span>
          <button
            onClick={fetchLiveScores}
            disabled={isRefreshing}
            className="border border-neutral-800 hover:border-white px-2 py-1 uppercase text-white tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
            title="Fetch Real-Time Cricket Scores"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#1DB954]" : ""}`} />
            <span>{isRefreshing ? "SYNCING..." : "LIVE SYNC"}</span>
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
              className={`px-2.5 py-1 text-[10px] whitespace-nowrap transition-colors border cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-bold border-white"
                  : "text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {m.team1.shortName} vs {m.team2.shortName}
              {m.status === "LIVE" && <span className="ml-1 text-[8px] text-[#1DB954]">●</span>}
            </button>
          );
        })}
      </div>

      {/* Main Scorecard Arena */}
      <div className="bg-black border border-neutral-900 p-3.5 space-y-3">
        {/* Tournament & Status */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-900 pb-2 flex-wrap gap-1">
          <span className="tracking-wider uppercase">{activeMatch.tournament}</span>
          <span className="px-1.5 py-0.5 bg-neutral-900 text-[#1DB954] font-bold tracking-wider uppercase border border-neutral-800">
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
            <div className="text-xl font-bold text-white tracking-tight">
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
            <div className="text-xl font-bold text-white tracking-tight">
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
          <div className="border-t border-neutral-900 pt-2.5 space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-neutral-300">
              <span>
                🏏 <strong className="text-white">{activeMatch.batsman1.name}</strong>{" "}
                <span className="text-white font-bold">{activeMatch.batsman1.runs}*</span> (
                {activeMatch.batsman1.balls}b, {activeMatch.batsman1.fours}x4, {activeMatch.batsman1.sixes}x6)
              </span>
              {activeMatch.crr && <span className="text-neutral-500">CRR: {activeMatch.crr}</span>}
            </div>

            {activeMatch.batsman2 && (
              <div className="flex justify-between items-center text-neutral-400">
                <span>
                  🏏 <strong className="text-white">{activeMatch.batsman2.name}</strong>{" "}
                  <span className="text-white font-bold">{activeMatch.batsman2.runs}*</span> (
                  {activeMatch.batsman2.balls}b, {activeMatch.batsman2.fours}x4, {activeMatch.batsman2.sixes}x6)
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
          <div className="text-[10px] text-neutral-400 pt-1">
            &gt;&gt; {activeMatch.targetOrLead}
          </div>
        )}
      </div>

      {/* Live Stage Launchpad Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
        <button
          onClick={handleCreateMatchStage}
          disabled={isCreatingStage}
          className="flex-1 bg-white hover:bg-neutral-200 text-black py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-red-600" />
          <span>{isCreatingStage ? "INITIALIZING ARENA..." : ">> START LIVE MATCH AUDIO STAGE"}</span>
        </button>

        <button
          onClick={handleRecordTake}
          className="border border-neutral-700 hover:border-white text-white py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Mic2 className="w-3.5 h-3.5" />
          <span>RECORD TAKE</span>
        </button>
      </div>
    </div>
  );
}
