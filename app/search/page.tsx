"use client";

/**
 * app/search/page.tsx
 * Searches BOTH "posts" and "echoes" collections.
 * Also searches users by handle / displayName.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Mic2, Users, Play, Loader2 } from "lucide-react";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { type EchoUser } from "@/lib/userDoc";
import { type PostItem } from "@/lib/posts";

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
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users,       setUsers]       = useState<EchoUser[]>([]);
  const [posts,       setPosts]       = useState<PostItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [activeTab,   setActiveTab]   = useState<"ALL" | "VOICES" | "ECHOES">("ALL");

  useEffect(() => {
    async function search() {
      if (!searchQuery.trim()) { setUsers([]); setPosts([]); return; }

      setLoading(true);
      try {
        const db = getFirebaseDb();
        const q  = searchQuery.toLowerCase();

        // Fetch users
        const usersSnap = await getDocs(query(collection(db, "users"), limit(30)));
        const matchedUsers = usersSnap.docs
          .map((d) => d.data() as EchoUser)
          .filter((u) =>
            u.handle?.toLowerCase().includes(q) ||
            u.displayName?.toLowerCase().includes(q)
          );

        // Fetch from posts collection
        const postsSnap = await getDocs(
          query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50))
        );
        const matchedPosts = postsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PostItem, "id">) }))
          .filter((p) =>
            p.caption?.toLowerCase().includes(q) ||
            p.authorHandle?.toLowerCase().includes(q)
          );

        setUsers(matchedUsers);
        setPosts(matchedPosts);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(search, 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const totalResults = users.length + posts.length;

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">SEARCH</span>
      </div>

      {/* Search Input — sticky */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
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
              onClick={() => { setSearchQuery(""); setUsers([]); setPosts([]); }}
              className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-6 space-y-8">
        {!searchQuery ? (
          /* Empty / discovery state */
          <div className="py-20 text-center space-y-6">
            <Search className="w-10 h-10 text-neutral-800 mx-auto" />
            <div className="space-y-2">
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                FIND VOICES &amp; ECHOES ON THE NETWORK
              </p>
              <p className="font-serif italic text-neutral-700 text-sm">
                Search by handle, name, or topic
              </p>
            </div>
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
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
                {totalResults} RESULT{totalResults !== 1 ? "S" : ""} FOUND
              </p>
              <div className="flex gap-4 font-mono text-[10px] tracking-widest">
                {(["ALL", "VOICES", "ECHOES"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`uppercase transition-colors cursor-pointer ${
                      activeTab === tab ? "text-white" : "text-neutral-600 hover:text-white"
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
                  <Users className="w-3.5 h-3.5" /> MATCHING VOICES
                </p>
                <div className="border border-neutral-900 divide-y divide-neutral-900">
                  {users.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <p className="font-mono text-sm text-white tracking-widest">{u.handle}</p>
                        {u.displayName && (
                          <p className="font-mono text-[10px] text-neutral-500">{u.displayName}</p>
                        )}
                        <p className="font-mono text-[10px] text-neutral-700">
                          AURA: {u.auraScore || 0}
                        </p>
                      </div>
                      <Link
                        href={`/${u.handle.replace("@", "")}`}
                        className="font-mono text-xs border border-neutral-800 px-3 py-1.5 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors"
                      >
                        VIEW →
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Posts */}
            {(activeTab === "ALL" || activeTab === "ECHOES") && posts.length > 0 && (
              <section className="space-y-3">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                  <Mic2 className="w-3.5 h-3.5" /> MATCHING ECHOES
                </p>
                <div className="border border-neutral-900 divide-y divide-neutral-900">
                  {posts.map((p) => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <p className="font-mono text-xs text-neutral-500 tracking-widest">
                            {p.authorHandle}
                          </p>
                          <p className="font-serif italic text-white text-base leading-snug">
                            "{p.caption}"
                          </p>
                        </div>
                        {p.audioUrl && <MiniPlay url={p.audioUrl} />}
                      </div>
                      <div className="flex items-center gap-4 font-mono text-[10px] text-neutral-700 uppercase">
                        <span>{p.pulseCount || 0} PULSES</span>
                        <span>{p.duration || "0:00"}</span>
                        {p.reverbOf && <span className="text-neutral-600">REVERB</span>}
                        {p.orbitOf  && <span className="text-neutral-600">ORBIT</span>}
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
