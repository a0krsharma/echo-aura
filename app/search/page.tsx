"use client";

export const dynamic = "force-dynamic";

/**
 * app/search/page.tsx
 * Enhanced search with filters, history, Top 10 suggested profiles,
 * real-time ORBIT toggle buttons, and direct WIRE message launchers.
 */

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Mic2, Users, Play, Loader2, Clock, Filter, TrendingUp, MessageSquare, UserPlus, UserCheck, Sparkles } from "lucide-react";
import { collection, query, getDocs, limit, orderBy, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { type EchoUser } from "@/lib/userDoc";
import { type PostItem } from "@/lib/posts";
import { followUser, unfollowUser, subscribeToFollowStatus } from "@/lib/follows";
import { startOrGetConversation } from "@/lib/wire";
import { useAuth } from "@/app/components/AuthProvider";

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-neutral-950/60 border border-neutral-900 hover:border-neutral-800 transition-colors gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-900 overflow-hidden flex items-center justify-center font-mono text-sm text-white font-bold shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt={targetUser.handle} className="w-full h-full object-cover" />
          ) : (
            targetUser.handle?.charAt(1)?.toUpperCase() || "A"
          )}
        </div>
        <div className="space-y-0.5">
          <Link href={`/${targetUser.handle?.replace("@", "")}`} className="font-mono text-sm text-white hover:underline tracking-widest block font-bold">
            {targetUser.handle}
          </Link>
          {targetUser.displayName && (
            <p className="font-mono text-[10px] text-neutral-500">{targetUser.displayName}</p>
          )}
          <p className="font-mono text-[10px] text-neutral-600">
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
              className={`font-mono text-[10px] uppercase px-3 py-1.5 border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isFollowingState
                  ? "border-neutral-700 text-neutral-400 hover:border-red-800 hover:text-red-400"
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
              className="font-mono text-[10px] uppercase px-2.5 py-1.5 border border-neutral-800 text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Send direct audio wire message"
            >
              <MessageSquare className="w-3 h-3 text-neutral-300" />
              [ WIRE ]
            </button>
          </>
        )}

        <Link
          href={`/${targetUser.handle?.replace("@", "")}`}
          className="font-mono text-[10px] border border-neutral-800 px-2.5 py-1.5 text-neutral-500 hover:text-white uppercase transition-colors"
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
  const [audio] = useState(() => {
    if (typeof window === "undefined") return null;
    const a = new Audio(url);
    a.preload = "none";
    return a;
  });

  useEffect(() => {
    if (!audio) return;
    audio.onended = () => setPlaying(false);
    return () => { audio.pause(); };
  }, [audio]);

  const toggle = async () => {
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else {
      try { await audio.play(); setPlaying(true); } catch {}
    }
  };

  return (
    <button
      onClick={toggle}
      className="w-7 h-7 border border-neutral-700 flex items-center justify-center hover:border-white hover:bg-white hover:text-black transition-colors cursor-pointer shrink-0"
    >
      {playing ? "⏸" : <Play className="w-3 h-3" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH PAGE
// ─────────────────────────────────────────────────────────────────────────────
type SearchFilter = "all" | "recent" | "trending" | "long" | "short";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users,       setUsers]       = useState<EchoUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<EchoUser[]>([]);
  const [posts,       setPosts]       = useState<PostItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [activeTab,   setActiveTab]   = useState<"ALL" | "VOICES" | "ECHOES">("ALL");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState<SearchFilter>("all");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load search history & Top 10 suggested users on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("echo_search_history");
      if (saved) {
        try { setSearchHistory(JSON.parse(saved)); } catch {}
      }
    }

    async function loadSuggested() {
      try {
        const db = getFirebaseDb();
        const qSnap = await getDocs(query(collection(db, "users"), limit(10)));
        const list = qSnap.docs.map(d => d.data() as EchoUser);
        list.sort((a, b) => (b.auraScore || 0) - (a.auraScore || 0));
        setSuggestedUsers(list);
      } catch (e) {
        console.warn("[SearchPage] Failed loading suggested users:", e);
      }
    }
    loadSuggested();
  }, []);

  // Save search history to localStorage
  const saveToHistory = useCallback((queryStr: string) => {
    if (!queryStr.trim()) return;
    setSearchHistory(prev => {
      const newHistory = [queryStr, ...prev.filter(q => q !== queryStr)].slice(0, 10);
      localStorage.setItem("echo_search_history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  useEffect(() => {
    async function search() {
      if (!searchQuery.trim()) { 
        setUsers([]); 
        setPosts([]); 
        setSuggestions([]);
        return; 
      }

      setLoading(true);
      try {
        const db = getFirebaseDb();
        const q  = searchQuery.toLowerCase();

        // Generate autocomplete suggestions
        if (searchQuery.length >= 2) {
          const usersSnap = await getDocs(query(collection(db, "users"), limit(10)));
          const userSuggestions = usersSnap.docs
            .map((d) => d.data() as EchoUser)
            .filter((u) =>
              u.handle?.toLowerCase().startsWith(q) ||
              u.displayName?.toLowerCase().startsWith(q)
            )
            .map(u => u.handle || u.displayName || "")
            .slice(0, 5);
          
          setSuggestions(userSuggestions);
        }

        // Fetch users
        let usersQuery = query(collection(db, "users"), limit(30));
        const usersSnap = await getDocs(usersQuery);
        const matchedUsers = usersSnap.docs
          .map((d) => d.data() as EchoUser)
          .filter((u) =>
            u.handle?.toLowerCase().includes(q) ||
            u.displayName?.toLowerCase().includes(q)
          );

        // Build posts query with filters
        let postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
        
        if (timeFilter === "recent") {
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          postsQuery = query(
            collection(db, "posts"),
            where("createdAt", ">=", oneWeekAgo),
            orderBy("createdAt", "desc"),
            limit(50)
          );
        } else if (timeFilter === "trending") {
          postsQuery = query(
            collection(db, "posts"),
            orderBy("pulseCount", "desc"),
            limit(50)
          );
        }

        const postsSnap = await getDocs(postsQuery);
        let matchedPosts = postsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, "id">) }))
          .filter((p) =>
            p.caption?.toLowerCase().includes(q) ||
            p.authorHandle?.toLowerCase().includes(q)
          );

        if (timeFilter === "short") {
          matchedPosts = matchedPosts.filter(p => (p.durationSec || 0) <= 30);
        } else if (timeFilter === "long") {
          matchedPosts = matchedPosts.filter(p => (p.durationSec || 0) > 60);
        }

        setUsers(matchedUsers);
        setPosts(matchedPosts.slice(0, 50));
        
        if (matchedUsers.length > 0 || matchedPosts.length > 0) {
          saveToHistory(searchQuery);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [searchQuery, timeFilter, saveToHistory]);

  const totalResults = users.length + posts.length;

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("echo_search_history");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">SEARCH &amp; DISCOVER</span>
      </div>

      {/* Search Input — sticky */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-neutral-600 shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH ECHOES, VOICES, HANDLES..."
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs tracking-widest placeholder:text-neutral-700"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setUsers([]); setPosts([]); setSuggestions([]); }}
                className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-neutral-600 hover:text-white transition-colors cursor-pointer ${showFilters ? "text-white" : ""}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && searchQuery && (
            <div className="border border-neutral-800 bg-black">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
              <span className="font-mono text-[10px] text-neutral-600 uppercase">Filter:</span>
              {(["all", "recent", "trending", "short", "long"] as SearchFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`font-mono text-[10px] uppercase px-2 py-1 border transition-colors cursor-pointer ${
                    timeFilter === filter
                      ? "border-white text-white"
                      : "border-neutral-800 text-neutral-600 hover:border-white hover:text-white"
                  }`}
                >
                  {filter === "all" && "ALL"}
                  {filter === "recent" && <><Clock className="w-3 h-3 inline mr-1" />RECENT</>}
                  {filter === "trending" && <><TrendingUp className="w-3 h-3 inline mr-1" />TRENDING</>}
                  {filter === "short" && "≤30S"}
                  {filter === "long" && ">60S"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-6 space-y-8">
        {!searchQuery ? (
          /* Default discovery view with Top 10 Suggested Voices & History */
          <div className="space-y-8 pb-12">
            {/* Top 10 Suggested Voices to Orbit */}
            {suggestedUsers.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <span className="font-mono text-xs text-white tracking-widest uppercase font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    // TOP SUGGESTED VOICES TO ORBIT (TOP 10)
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase">
                    FEATURED PROFILES
                  </span>
                </div>

                <div className="space-y-2">
                  {suggestedUsers.map((targetUser) => (
                    <UserSearchResultCard key={targetUser.uid} targetUser={targetUser} />
                  ))}
                </div>
              </section>
            )}

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-neutral-900">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> RECENT SEARCHES
                  </p>
                  <button
                    onClick={clearHistory}
                    className="font-mono text-[10px] text-neutral-600 hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    CLEAR
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((queryStr, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchQuery(queryStr)}
                      className="px-3 py-1.5 border border-neutral-800 font-mono text-xs text-neutral-400 hover:border-white hover:text-white transition-colors cursor-pointer"
                    >
                      {queryStr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
            <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
              SEARCHING...
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
              NO RESULTS FOR "{searchQuery.toUpperCase()}"
            </p>
            <p className="font-serif italic text-neutral-700 text-sm">
              Try a different handle or keyword
            </p>
          </div>
        ) : (
          <>
            {/* Result count + tabs */}
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
                {totalResults} RESULT{totalResults !== 1 ? "S" : ""} FOUND
              </p>
              <div className="flex gap-4 font-mono text-[10px] tracking-widest">
                {(["ALL", "VOICES", "ECHOES"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`uppercase transition-colors cursor-pointer ${
                      activeTab === tab ? "text-white font-bold" : "text-neutral-600 hover:text-white"
                    }`}
                  >
                    {tab}
                    {tab === "ALL"    && ` (${totalResults})`}
                    {tab === "VOICES" && ` (${users.length})`}
                    {tab === "ECHOES" && ` (${posts.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Users */}
            {(activeTab === "ALL" || activeTab === "VOICES") && users.length > 0 && (
              <section className="space-y-3">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> MATCHING VOICES ({users.length})
                </p>
                <div className="space-y-2">
                  {users.map((targetUser) => (
                    <UserSearchResultCard key={targetUser.uid} targetUser={targetUser} />
                  ))}
                </div>
              </section>
            )}

            {/* Posts */}
            {(activeTab === "ALL" || activeTab === "ECHOES") && posts.length > 0 && (
              <section className="space-y-3">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                  <Mic2 className="w-3.5 h-3.5" /> MATCHING ECHOES ({posts.length})
                </p>
                <div className="border border-neutral-900 divide-y divide-neutral-900 bg-neutral-950/40">
                  {posts.map((p) => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <Link href={`/${p.authorHandle?.replace("@", "")}`} className="font-mono text-xs text-neutral-400 hover:text-white tracking-widest">
                            {p.authorHandle}
                          </Link>
                          <p className="font-serif italic text-white text-base leading-snug">
                            "{p.caption}"
                          </p>
                        </div>
                        {p.audioUrl && <MiniPlay url={p.audioUrl} />}
                      </div>
                      <div className="flex items-center gap-4 font-mono text-[10px] text-neutral-700 uppercase">
                        <span>{p.pulseCount || 0} PULSES</span>
                        <span>{p.duration || "0:00"}</span>
                        {p.reverbOf && <span className="text-neutral-600">[ REPLY ]</span>}
                        {p.orbitOf  && <span className="text-neutral-600">[ RE-ECHO ]</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
