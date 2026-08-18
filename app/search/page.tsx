"use client";

export const dynamic = "force-dynamic";

/**
 * app/search/page.tsx
 * ─────────────────────────────────────────────────────
 * Twitter/X-Style Enhanced Search & Real-Time Discovery Engine:
 *  - Real-time predictive autocomplete (#tags, @mentions, platform terms)
 *  - Twitter-style category filter tabs (Trending, Tech, Startup, News, Sports, etc.)
 *  - Real-Time World News Aggregator & Live Stage Debate creation
 *  - Live Acoustic Velocity telemetry
 *  - Active stage rooms, voices, and audio echoes in strict monochrome.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Mic2,
  Users,
  Play,
  Pause,
  Loader2,
  Clock,
  Filter,
  Flame,
  Radio,
  Hash,
  ArrowRight,
  MessageSquare,
  UserPlus,
  UserCheck,
  Sparkles,
  Globe,
} from "lucide-react";
import { collection, query, getDocs, limit, doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { type EchoUser } from "@/lib/userDoc";
import { type PostItem } from "@/lib/posts";
import { followUser, unfollowUser, subscribeToFollowStatus } from "@/lib/follows";
import { startOrGetConversation } from "@/lib/wire";
import { getPlayableUrl } from "@/lib/cloudinary";
import { useAuth } from "@/app/components/AuthProvider";
import { RadarCategoryId, RadarTopicItem } from "@/lib/categories";
import { executeMultiVectorSearch, SearchResultsMatrix, LiveRoomResult } from "@/lib/searchEngine";
import { NewsDispatch } from "@/lib/newsService";
import { aggregateRadarCategory } from "@/lib/radarAggregator";
import SearchAutocomplete from "./components/SearchAutocomplete";
import LiveNewsDispatches from "./components/LiveNewsDispatches";
import LiveCricketScorecard from "./components/LiveCricketScorecard";

// ─────────────────────────────────────────────────────────────────────────────
// User Card with Real-time ORBIT Toggle & Direct WIRE Trigger
// ─────────────────────────────────────────────────────────────────────────────
function UserSearchResultCard({ targetUser }: { targetUser: EchoUser }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    if (!user?.uid || !targetUser?.uid) return;
    const unsub = subscribeToFollowStatus(user.uid, targetUser.uid, setIsFollowingState);
    return () => unsub();
  }, [user?.uid, targetUser?.uid]);

  const handleToggleOrbit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    setLoadingFollow(true);
    try {
      if (isFollowingState) {
        await unfollowUser(user.uid, targetUser.uid);
      } else {
        await followUser(user.uid, user.handle || "@ANON", targetUser.uid, targetUser.handle);
      }
    } catch (err) {
      console.error("[UserCard] Orbit toggle error:", err);
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleOpenWire = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const convId = await startOrGetConversation(user.uid, user.handle || "@ANON", targetUser.uid, targetUser.handle);
      router.push(`/wire?c=${convId}`);
    } catch (err) {
      console.error("[UserCard] Wire open error:", err);
      router.push("/wire");
    }
  };

  const avatarSrc = targetUser.photoUrl || (targetUser as any).photoURL || (targetUser as any).avatarUrl;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-black border border-neutral-900 hover:border-neutral-700 transition-colors gap-3 font-mono">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center font-bold text-xs text-white shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt={targetUser.handle} className="w-full h-full object-cover" />
          ) : (
            targetUser.handle?.charAt(1)?.toUpperCase() || "V"
          )}
        </div>
        <div className="space-y-0.5">
          <Link href={`/${targetUser.handle?.replace("@", "")}`} className="text-xs text-white hover:underline tracking-wider block font-bold">
            {targetUser.handle}
          </Link>
          {targetUser.displayName && (
            <p className="text-[10px] text-neutral-500">{targetUser.displayName}</p>
          )}
          <p className="text-[10px] text-neutral-600">
            [ AURA ]: {targetUser.auraScore || 0}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {user && user.uid !== targetUser.uid && (
          <>
            <button
              onClick={handleToggleOrbit}
              disabled={loadingFollow}
              className={`text-[10px] uppercase px-2.5 py-1.5 border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isFollowingState
                  ? "border-neutral-700 text-neutral-400 hover:border-white hover:text-white"
                  : "border-white text-white hover:bg-white hover:text-black font-bold"
              }`}
            >
              {loadingFollow ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isFollowingState ? (
                <>
                  <UserCheck className="w-3 h-3" />
                  [ ORBITING ]
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  [ ORBIT ]
                </>
              )}
            </button>

            <button
              onClick={handleOpenWire}
              className="text-[10px] uppercase px-2.5 py-1.5 border border-neutral-800 text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Send direct audio wire message"
            >
              <MessageSquare className="w-3 h-3 text-neutral-300" />
              [ WIRE ]
            </button>
          </>
        )}

        <Link
          href={`/${targetUser.handle?.replace("@", "")}`}
          className="text-[10px] border border-neutral-800 px-2.5 py-1.5 text-neutral-500 hover:text-white uppercase transition-colors"
        >
          VIEW →
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini inline audio player for search results
// ─────────────────────────────────────────────────────────────────────────────
function MiniPlay({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;

    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlaying(false);
    } else {
      try {
        if (!audioRef.current) {
          const playable = getPlayableUrl(url);
          const a = new Audio(playable);
          a.preload = "auto";
          a.onended = () => setPlaying(false);
          a.onerror = () => {
            setPlaying(false);
            console.warn("[MiniPlay] Audio unavailable or removed");
          };
          audioRef.current = a;
        }
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      className="w-7 h-7 border border-neutral-700 flex items-center justify-center hover:border-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0"
    >
      {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH CATEGORIES TABS (Twitter/X Style)
// ─────────────────────────────────────────────────────────────────────────────
const SEARCH_CATEGORY_TABS = [
  { id: "ALL", label: "ALL" },
  { id: "TRENDING", label: "TRENDING" },
  { id: "NEWS", label: "WORLD NEWS" },
  { id: "SPORTS", label: "SPORTS & CRICKET" },
  { id: "MUSIC", label: "MUSIC / ENTERTAINMENT" },
  { id: "TECH", label: "TECH" },
  { id: "STARTUP", label: "STARTUP" },
  { id: "MARKETS", label: "MARKETS" },
  { id: "VOICES", label: "VOICES" },
  { id: "ECHOES", label: "ECHOES" },
] as const;

type SearchCategoryTabId = typeof SEARCH_CATEGORY_TABS[number]["id"];

export default function SearchPage() {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchCategoryTabId>("ALL");
  const [activeRegion, setActiveRegion] = useState<"all" | "india" | "world">("india");
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Multi-Vector Search Results
  const [results, setResults] = useState<SearchResultsMatrix>({
    users: [],
    hashtags: [],
    liveRooms: [],
    posts: [],
    shortcuts: [],
  });

  // World News Dispatches
  const [newsDispatches, setNewsDispatches] = useState<NewsDispatch[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Default Discovery State (Explore View)
  const [trendingFrequencies, setTrendingFrequencies] = useState<RadarTopicItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<EchoUser[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load Explore Defaults & History on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("echo_search_history");
      if (saved) {
        try { setSearchHistory(JSON.parse(saved)); } catch {}
      }
    }

    const db = getFirebaseDb();
    const regionKey = activeRegion === "world" ? "world" : "india";
    const docId = activeRegion === "world" ? "world_trending" : "india_trending";

    // 1. Subscribe to Regional Trending Feed with graceful fallback
    let unsubTrending: () => void = () => {};
    try {
      unsubTrending = onSnapshot(
        doc(db, "radar_feeds", docId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.topics) && data.topics.length > 0) {
              setTrendingFrequencies(data.topics.slice(0, 5));
              return;
            }
          }
          aggregateRadarCategory("trending", regionKey).then((list) => {
            setTrendingFrequencies(list.slice(0, 5));
          });
        },
        () => {
          aggregateRadarCategory("trending", regionKey).then((list) => {
            setTrendingFrequencies(list.slice(0, 5));
          });
        }
      );
    } catch {
      aggregateRadarCategory("trending", regionKey).then((list) => {
        setTrendingFrequencies(list.slice(0, 5));
      });
    }

    // 2. Load Top Voices to Orbit
    async function loadSuggested() {
      try {
        const qSnap = await getDocs(query(collection(db, "users"), limit(6)));
        const list = qSnap.docs.map((d) => d.data() as EchoUser);
        list.sort((a, b) => (b.auraScore || 0) - (a.auraScore || 0));
        setSuggestedUsers(list);
      } catch (e) {
        console.warn("[SearchPage] Failed loading suggested users:", e);
      }
    }
    loadSuggested();

    return () => unsubTrending();
  }, [activeRegion]);

  // Fetch Live World & India News Dispatches (Client Cache Friendly)
  useEffect(() => {
    async function loadNews() {
      setNewsLoading(true);
      try {
        const catParam = activeTab === "ALL" ? "all" : activeTab.toLowerCase();
        const res = await fetch(`/api/news?category=${encodeURIComponent(catParam)}&region=${encodeURIComponent(activeRegion)}&q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.dispatches)) {
            setNewsDispatches(data.dispatches);
          }
        }
      } catch (err) {
        console.warn("[SearchPage] Error loading news:", err);
      } finally {
        setNewsLoading(false);
      }
    }

    loadNews();
  }, [activeTab, activeRegion, searchQuery]);

  // Save query to localStorage
  const saveToHistory = useCallback((queryStr: string) => {
    if (!queryStr.trim()) return;
    setSearchHistory((prev) => {
      const newHistory = [queryStr, ...prev.filter((q) => q !== queryStr)].slice(0, 8);
      localStorage.setItem("echo_search_history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Handle Search Input & Execution
  useEffect(() => {
    if (!searchQuery.trim() && activeTab === "ALL") {
      setResults({ users: [], hashtags: [], liveRooms: [], posts: [], shortcuts: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await executeMultiVectorSearch(searchQuery, activeTab);
        setResults(data);
        if (searchQuery.trim().length >= 3) {
          saveToHistory(searchQuery.trim());
        }
      } catch (err) {
        console.error("[SearchPage] Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, saveToHistory]);

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("echo_search_history");
  };

  const handleClearHistoryItem = (term: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== term);
      localStorage.setItem("echo_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectSuggestion = (term: string) => {
    setSearchQuery(term);
    setIsFocused(false);
  };

  const totalResultsCount =
    results.users.length +
    results.hashtags.length +
    results.liveRooms.length +
    results.posts.length +
    newsDispatches.length;

  const isSearchActive = searchQuery.trim().length > 0 || activeTab !== "ALL";

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 bg-black border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2.5" ref={searchContainerRef}>
          
          {/* Main Search Input */}
          <div className="relative">
            <div className="flex items-center bg-neutral-950 border border-neutral-800 px-3 py-2 focus-within:border-white transition-colors">
              <span className="text-neutral-500 mr-2 text-xs font-mono">[?]</span>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH HASHTAGS (#), VOICES (@), OR WORLD NEWS..."
                className="w-full bg-transparent text-xs text-white placeholder-neutral-600 outline-none tracking-wider"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-600 hover:text-white transition-colors cursor-pointer ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Predictive Autocomplete Dropdown */}
            {isFocused && (
              <SearchAutocomplete
                query={searchQuery}
                hashtags={results.hashtags}
                users={results.users}
                shortcuts={results.shortcuts}
                history={searchHistory}
                onSelectSuggestion={handleSelectSuggestion}
                onClearHistoryItem={handleClearHistoryItem}
                onClose={() => setIsFocused(false)}
              />
            )}
          </div>

          {/* Regional Focus Selector */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-500">
            <span className="uppercase text-[9px] text-neutral-600 tracking-wider">REGION FOCUS:</span>
            <div className="flex items-center gap-1">
              {(["india", "world", "all"] as const).map((reg) => {
                const isSelected = activeRegion === reg;
                return (
                  <button
                    key={reg}
                    onClick={() => setActiveRegion(reg)}
                    className={`px-2 py-0.5 uppercase text-[10px] font-bold transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-white text-black border-white"
                        : "text-neutral-500 hover:text-white border-neutral-900"
                    }`}
                  >
                    [{reg.toUpperCase()}]
                  </button>
                );
              })}
            </div>
          </div>

          {/* Twitter-Style Horizontal Category Scroll */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-none pt-1">
            {SEARCH_CATEGORY_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-[11px] px-3 py-1.5 whitespace-nowrap transition-colors uppercase cursor-pointer ${
                    isActive
                      ? "bg-white text-black font-bold"
                      : "text-neutral-500 hover:text-white border border-neutral-900 hover:border-neutral-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* VIEW 1: DEFAULT DISCOVERY (TWITTER EXPLORE TELEMETRY)          */}
        {/* ───────────────────────────────────────────────────────────── */}
        {!isSearchActive ? (
          <div className="space-y-8 pb-12">
            
            {/* 0. Live Cricket Match Scorecard (Sports & Cricket Priority) */}
            {(activeTab === "ALL" || activeTab === "SPORTS") && (
              <LiveCricketScorecard />
            )}

            {/* 1. Real-time World News Wire Dispatches */}
            <LiveNewsDispatches
              dispatches={newsDispatches}
              loading={newsLoading}
              categoryTitle={`LIVE ${activeTab === 'ALL' ? 'BREAKING' : activeTab} DISPATCHES`}
            />

            {/* 2. Top Trending Audio Frequencies */}
            <section className="space-y-3">
              <div className="border-b border-neutral-900 pb-2.5 flex justify-between items-center text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-white" />
                  <span className="text-white font-bold tracking-widest uppercase">
                    &gt;&gt; REAL-TIME TRENDING FREQUENCIES
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>● LIVE SOCKET</span>
                </div>
              </div>

              {trendingFrequencies.length === 0 ? (
                <div className="p-6 border border-neutral-900 bg-neutral-950 text-center text-xs text-neutral-500 tracking-widest">
                  SYNCHRONIZING GLOBAL ACOUSTIC VELOCITY...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trendingFrequencies.map((topic, index) => (
                    <div
                      key={topic.tag}
                      onClick={() => {
                        const tagClean = topic.tag.replace("#", "");
                        router.push(`/hashtag/${encodeURIComponent(tagClean)}`);
                      }}
                      className="p-3.5 border border-neutral-900 bg-black hover:border-white transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                            <span>0{index + 1} // {topic.category?.toUpperCase() || "TRENDING"}</span>
                            <span>•</span>
                            <span className="text-neutral-400">VELOCITY: <strong className="text-white">{topic.velocity_score}</strong></span>
                          </div>
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {topic.tag}
                          </h3>
                          {topic.headline && (
                            <p className="text-xs text-neutral-400 line-clamp-1">
                              {topic.headline}
                            </p>
                          )}
                        </div>

                        {topic.live_rooms > 0 && (
                          <span className="text-[10px] bg-white text-black font-bold px-2 py-0.5 border border-white shrink-0">
                            {topic.live_rooms} LIVE NODE{topic.live_rooms > 1 ? "S" : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-neutral-900/80 flex justify-between items-center text-[10px] text-neutral-500">
                        <span>[ {topic.voice_replies || 0} REVERBS ] [ {topic.total_pulses || 0} PULSES ]</span>
                        <span className="text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          &gt;&gt; INTERCEPT <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Top Suggested Voices to Orbit */}
            {suggestedUsers.length > 0 && (
              <section className="space-y-3">
                <div className="border-b border-neutral-900 pb-2.5 flex justify-between items-center text-xs text-neutral-500">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span className="text-white font-bold tracking-widest uppercase">
                      // TOP VERIFIED VOICES TO ORBIT
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    HIGH AURA SIGNALS
                  </span>
                </div>

                <div className="space-y-2">
                  {suggestedUsers.map((targetUser) => (
                    <UserSearchResultCard key={targetUser.uid} targetUser={targetUser} />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Search History Chips */}
            {searchHistory.length > 0 && (
              <section className="space-y-2.5 pt-4 border-t border-neutral-900">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-white" /> RECENT QUERIES
                  </p>
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-neutral-600 hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    [ CLEAR ALL ]
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((queryStr) => (
                    <button
                      key={queryStr}
                      onClick={() => setSearchQuery(queryStr)}
                      className="px-3 py-1.5 border border-neutral-800 text-xs text-neutral-300 hover:border-white hover:text-white transition-colors cursor-pointer bg-neutral-950"
                    >
                      {queryStr}
                    </button>
                  ))}
                </div>
              </section>
            )}

          </div>
        ) : loading ? (
          /* Loading State */
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <p className="text-xs text-neutral-400 tracking-widest uppercase">
              SCANNING MULTI-VECTOR FREQUENCIES...
            </p>
          </div>
        ) : totalResultsCount === 0 ? (
          /* Empty Search Results */
          <div className="py-16 text-center space-y-3 border border-neutral-900 bg-neutral-950 p-8">
            <p className="text-xs text-neutral-400 tracking-widest uppercase font-bold">
              NO FREQUENCIES MATCHED &quot;{searchQuery.toUpperCase()}&quot;
            </p>
            <p className="text-[11px] text-neutral-600">
              TRY SEARCHING FOR TOPIC HASHTAGS (#TECH), CREATOR HANDLES (@HANDLE), OR WORLD NEWS HEADLINES
            </p>
          </div>
        ) : (
          /* ───────────────────────────────────────────────────────────── */
          /* VIEW 2: MULTI-VECTOR SEARCH RESULTS MATRIX                     */
          /* ───────────────────────────────────────────────────────────── */
          <div className="space-y-8">
            
            {/* Live Cricket Match Scorecard */}
            {(activeTab === "SPORTS" || searchQuery.toLowerCase().includes("cricket") || searchQuery.toLowerCase().includes("ind") || searchQuery.toLowerCase().includes("match") || searchQuery.toLowerCase().includes("score")) && (
              <LiveCricketScorecard />
            )}

            {/* 1. MATCHING ACTIVE LIVE ROOMS / STAGES */}
            {results.liveRooms.length > 0 && (
              <section className="space-y-3">
                <div className="border-b border-neutral-900 pb-2 flex justify-between items-center text-xs text-neutral-500">
                  <span className="text-white font-bold tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-white" />
                    LIVE AUDIO NODES &amp; DEBATES ({results.liveRooms.length})
                  </span>
                  <span className="text-white text-[10px] bg-white text-black font-bold px-1.5 py-0.5">
                    ● ACTIVE STREAM
                  </span>
                </div>

                <div className="space-y-2.5">
                  {results.liveRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => router.push(`/room/${room.id}`)}
                      className="p-4 border border-white bg-black hover:bg-neutral-950 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white text-black font-bold px-2 py-0.5">
                            LIVE STAGE
                          </span>
                          <span className="text-[10px] text-neutral-500">HOST: {room.hostHandle}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white tracking-wide truncate">
                          {room.name}
                        </h4>
                        {room.description && (
                          <p className="text-xs text-neutral-400 truncate">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <span className="text-xs text-neutral-400">
                          {room.listenerCount} LISTENERS
                        </span>
                        <button className="text-xs bg-white text-black font-bold px-3 py-1.5 hover:bg-neutral-200 transition-colors">
                          &gt;&gt; ENTER STAGE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. MATCHING WORLD NEWS WIRE DISPATCHES */}
            {newsDispatches.length > 0 && (
              <LiveNewsDispatches
                dispatches={newsDispatches.slice(0, 5)}
                loading={newsLoading}
                categoryTitle={`GLOBAL WIRE: ${activeTab === 'ALL' ? 'BREAKING' : activeTab}`}
              />
            )}

            {/* 3. MATCHING TRENDING HASHTAGS & ACOUSTIC VELOCITY */}
            {results.hashtags.length > 0 && (
              <section className="space-y-3">
                <div className="border-b border-neutral-900 pb-2 flex justify-between items-center text-xs text-neutral-500">
                  <span className="text-white font-bold tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-white" />
                    MATCHING HASHTAG FREQUENCIES ({results.hashtags.length})
                  </span>
                  <span className="text-[10px] text-neutral-500">ACOUSTIC VELOCITY</span>
                </div>

                <div className="space-y-2.5">
                  {results.hashtags.map((topic) => (
                    <div
                      key={topic.tag}
                      onClick={() => {
                        const cleanTag = topic.tag.replace("#", "");
                        router.push(`/hashtag/${encodeURIComponent(cleanTag)}`);
                      }}
                      className="p-3.5 border border-neutral-900 bg-black hover:border-white transition-colors cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {topic.tag}
                          </h4>
                          {topic.headline && (
                            <p className="text-xs text-neutral-400 line-clamp-1">
                              {topic.headline}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] border border-neutral-800 px-2 py-0.5 text-neutral-300 font-bold shrink-0">
                          VELOCITY: {topic.velocity_score}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-neutral-500">
                        <span>[ {topic.voice_replies || 0} REVERBS ] [ {topic.total_pulses || 0} PULSES ]</span>
                        <span className="text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          &gt;&gt; INTERCEPT FREQUENCY <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. MATCHING VERIFIED VOICES / CREATORS */}
            {results.users.length > 0 && (
              <section className="space-y-3">
                <div className="border-b border-neutral-900 pb-2 flex justify-between items-center text-xs text-neutral-500">
                  <span className="text-white font-bold tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-white" />
                    MATCHING VOICES &amp; HANDLES ({results.users.length})
                  </span>
                  <span className="text-[10px] text-neutral-500">AURA RANK</span>
                </div>

                <div className="space-y-2">
                  {results.users.map((targetUser) => (
                    <UserSearchResultCard key={targetUser.uid} targetUser={targetUser} />
                  ))}
                </div>
              </section>
            )}

            {/* 5. MATCHING AUDIO ECHOES / POSTS */}
            {results.posts.length > 0 && (
              <section className="space-y-3">
                <div className="border-b border-neutral-900 pb-2 flex justify-between items-center text-xs text-neutral-500">
                  <span className="text-white font-bold tracking-wider flex items-center gap-1.5">
                    <Mic2 className="w-3.5 h-3.5 text-white" />
                    MATCHING AUDIO ECHOES ({results.posts.length})
                  </span>
                  <span className="text-[10px] text-neutral-500">TRANSMISSIONS</span>
                </div>

                <div className="border border-neutral-900 divide-y divide-neutral-900 bg-black">
                  {results.posts.map((p) => (
                    <div key={p.id} className="p-4 space-y-2.5 hover:bg-neutral-950 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <Link
                            href={`/${p.authorHandle?.replace("@", "")}`}
                            className="text-xs text-neutral-400 hover:text-white tracking-widest font-bold"
                          >
                            {p.authorHandle}
                          </Link>
                          <p className="italic text-white text-sm leading-snug">
                            &quot;{p.caption}&quot;
                          </p>
                        </div>
                        {p.audioUrl && <MiniPlay url={p.audioUrl} />}
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-neutral-500 uppercase">
                        <span>{p.pulseCount || 0} PULSES</span>
                        <span>{p.duration || "0:00"}</span>
                        {p.category && <span className="border border-neutral-800 px-1.5 py-0.5 text-neutral-400">[{p.category.toUpperCase()}]</span>}
                        {p.reverbOf && <span className="text-neutral-400">[ VOICE REPLY ]</span>}
                        {p.orbitOf && <span className="text-neutral-400">[ RE-ECHO ]</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
